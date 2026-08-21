begin;

-- Las compras de vino y comprobantes de pago se atienden desde pedidos,
-- envios y logistica. No deben producir ni consumir QR de entrada.
update public.access_passes
set status = 'archived',
    revoked_at = coalesce(revoked_at, now()),
    revocation_reason = coalesce(
      revocation_reason,
      'Migracion 062: las compras y ordenes sin entrada no generan QR de acceso'
    ),
    metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
      'accessDisabledReason', 'purchase_is_logistics_not_access',
      'accessDisabledAt', now()
    )
where (
    metadata ->> 'accessType' in ('wine_order', 'paid_order')
    or (order_id is not null and reservation_id is null and event_ticket_type_id is null)
  )
  and (status <> 'archived' or revoked_at is null);

create or replace function public.issue_access_pass(
  p_reservation_id uuid default null,
  p_order_id uuid default null,
  p_event_ticket_type_id uuid default null,
  p_qr_token_hash text default null,
  p_valid_from timestamptz default null,
  p_valid_until timestamptz default null,
  p_idempotency_key text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid;
  v_pass_id uuid;
  v_pass_number text;
  v_order public.orders%rowtype;
begin
  v_actor_id := public.current_transaction_operator(array['super_admin','admin','operations']);

  if p_qr_token_hash is null or length(trim(p_qr_token_hash)) < 32 then
    raise exception 'INVALID_QR_TOKEN' using errcode = 'P0001';
  end if;

  if coalesce(p_metadata ->> 'accessType', '') in ('wine_order', 'paid_order') then
    raise exception 'PASS_NOT_ACCESS' using errcode = 'P0001';
  end if;

  if p_reservation_id is null and p_order_id is null then
    raise exception 'PASS_OWNER_REQUIRED' using errcode = 'P0001';
  end if;

  if p_reservation_id is null and p_event_ticket_type_id is null then
    raise exception 'ORDER_ACCESS_PASS_NOT_ALLOWED' using errcode = 'P0001';
  end if;

  if p_idempotency_key is not null then
    select id into v_pass_id
    from public.access_passes
    where metadata ->> 'idempotencyKey' = p_idempotency_key
      and (reservation_id is not null or event_ticket_type_id is not null)
      and coalesce(metadata ->> 'accessType', '') not in ('wine_order', 'paid_order')
    limit 1;
    if v_pass_id is not null then
      return v_pass_id;
    end if;
  end if;

  if p_order_id is not null then
    select * into v_order from public.orders where id = p_order_id for update;
    if v_order.id is null then
      raise exception 'ORDER_NOT_FOUND' using errcode = 'P0001';
    end if;
    if v_order.status not in ('paid','processing','fulfilled') then
      raise exception 'ORDER_NOT_PAID' using errcode = 'P0001';
    end if;
  end if;

  if p_reservation_id is not null and not exists (
    select 1
    from public.reservations
    where id = p_reservation_id
      and status in ('pending','confirmed','completed')
  ) then
    raise exception 'RESERVATION_NOT_FOUND' using errcode = 'P0001';
  end if;

  v_pass_number := 'PASS-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

  insert into public.access_passes (
    reservation_id,
    order_id,
    event_ticket_type_id,
    qr_token_hash,
    pass_number,
    status,
    valid_from,
    valid_until,
    issued_at,
    metadata
  )
  values (
    p_reservation_id,
    p_order_id,
    p_event_ticket_type_id,
    trim(p_qr_token_hash),
    v_pass_number,
    'published',
    p_valid_from,
    p_valid_until,
    now(),
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object('idempotencyKey', p_idempotency_key)
  )
  returning id into v_pass_id;

  perform public.write_transaction_audit(
    v_actor_id,
    'access_pass_issued',
    'access_passes',
    v_pass_id,
    null,
    jsonb_build_object('pass_number', v_pass_number)
  );
  return v_pass_id;
end;
$$;

create or replace function public.validate_access_pass(p_qr_token_hash text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid;
  v_pass record;
  v_access_type text;
  v_valid boolean;
  v_reason text;
begin
  v_actor_id := public.current_transaction_operator(array['super_admin','admin','operations']);

  select ap.id, ap.pass_number, ap.status, ap.valid_from, ap.valid_until, ap.used_at, ap.revoked_at, ap.metadata,
         ap.event_ticket_type_id,
         r.id as reservation_id, r.reservation_number, r.reservation_type, r.people_count, r.status as reservation_status,
         c.display_name, c.first_name, c.last_name,
         e.title as experience_title, ev.title as event_name,
         cp.name as cabin_name, rl.name as restaurant_name,
         o.order_number, o.status as order_status, ett.name as ticket_type_name,
         coalesce(tev.title, ev.title) as ticket_event_name
  into v_pass
  from public.access_passes ap
  left join public.reservations r on r.id = ap.reservation_id
  left join public.customers c on c.id = r.customer_id
  left join public.experiences e on e.id = r.experience_id
  left join public.events ev on ev.id = r.event_id
  left join public.cabin_packages cp on cp.id = r.cabin_package_id
  left join public.restaurant_locations rl on rl.id = r.restaurant_location_id
  left join public.orders o on o.id = ap.order_id
  left join public.event_ticket_types ett on ett.id = ap.event_ticket_type_id
  left join public.events tev on tev.id = ett.event_id
  where ap.qr_token_hash = trim(p_qr_token_hash)
  limit 1;

  if v_pass.id is null then
    raise exception 'PASS_NOT_FOUND' using errcode = 'P0001';
  end if;

  v_access_type := coalesce(
    v_pass.reservation_type,
    v_pass.metadata ->> 'accessType',
    case when v_pass.ticket_type_name is not null then 'event_ticket' else 'access' end
  );

  if v_access_type in ('wine_order', 'paid_order')
    or (v_pass.reservation_id is null and v_pass.event_ticket_type_id is null) then
    raise exception 'PASS_NOT_ACCESS' using errcode = 'P0001';
  end if;

  v_valid := v_pass.status = 'published'
    and v_pass.revoked_at is null
    and v_pass.used_at is null
    and (v_pass.valid_from is null or v_pass.valid_from <= now())
    and (v_pass.valid_until is null or v_pass.valid_until >= now())
    and coalesce(v_pass.reservation_status, '') not in ('cancelled', 'no_show')
    and coalesce(v_pass.order_status, '') not in ('cancelled', 'refunded');

  v_reason := case
    when v_pass.status <> 'published' or v_pass.revoked_at is not null then 'revoked'
    when coalesce(v_pass.reservation_status, '') in ('cancelled', 'no_show') or coalesce(v_pass.order_status, '') in ('cancelled', 'refunded') then 'revoked'
    when v_pass.used_at is not null then 'used'
    when v_pass.valid_from is not null and v_pass.valid_from > now() then 'not_yet_valid'
    when v_pass.valid_until is not null and v_pass.valid_until < now() then 'expired'
    else null
  end;

  perform public.write_transaction_audit(
    v_actor_id,
    'access_pass_validated',
    'access_passes',
    v_pass.id,
    null,
    jsonb_build_object('valid', v_valid, 'reason', v_reason, 'accessType', v_access_type)
  );

  return jsonb_build_object(
    'valid', v_valid,
    'reason', v_reason,
    'accessPassId', v_pass.id,
    'passNumber', v_pass.pass_number,
    'reservationNumber', v_pass.reservation_number,
    'orderNumber', v_pass.order_number,
    'guestName', coalesce(v_pass.display_name, trim(coalesce(v_pass.first_name, '') || ' ' || coalesce(v_pass.last_name, ''))),
    'peopleCount', coalesce(v_pass.people_count, case when v_pass.event_ticket_type_id is not null then 1 else null end, nullif(v_pass.metadata ->> 'itemCount', '')::integer),
    'status', v_pass.status,
    'reservationStatus', v_pass.reservation_status,
    'accessType', v_access_type,
    'experienceTitle', coalesce(v_pass.cabin_name, v_pass.restaurant_name, v_pass.experience_title, v_pass.event_name, v_pass.ticket_event_name, v_pass.metadata ->> 'title'),
    'ticketTypeName', v_pass.ticket_type_name,
    'usedAt', v_pass.used_at
  );
end;
$$;

create or replace function public.register_checkin(
  p_access_pass_id uuid,
  p_request_id text default null,
  p_notes text default null,
  p_device_info jsonb default '{}'::jsonb,
  p_evidence_storage_path text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid;
  v_pass public.access_passes%rowtype;
  v_reservation_type text;
  v_reservation_status text;
  v_order_status text;
  v_access_type text;
  v_checkin_id uuid;
begin
  v_actor_id := public.current_transaction_operator(array['super_admin','admin','operations']);

  if p_request_id is not null then
    select id into v_checkin_id from public.checkins where request_id = p_request_id limit 1;
    if v_checkin_id is not null then return v_checkin_id; end if;
  end if;

  select * into v_pass from public.access_passes where id = p_access_pass_id for update;
  if v_pass.id is null then raise exception 'PASS_NOT_FOUND' using errcode = 'P0001'; end if;
  if v_pass.status <> 'published' or v_pass.revoked_at is not null then raise exception 'PASS_REVOKED' using errcode = 'P0001'; end if;
  if v_pass.used_at is not null or exists (select 1 from public.checkins where access_pass_id = p_access_pass_id and reversed_at is null) then
    raise exception 'PASS_ALREADY_USED' using errcode = 'P0001';
  end if;
  if (v_pass.valid_from is not null and v_pass.valid_from > now()) or (v_pass.valid_until is not null and v_pass.valid_until < now()) then
    raise exception 'PASS_NOT_VALID' using errcode = 'P0001';
  end if;

  if v_pass.reservation_id is not null then
    select reservation_type, status into v_reservation_type, v_reservation_status
    from public.reservations where id = v_pass.reservation_id for update;
    if v_reservation_status in ('cancelled', 'no_show') then raise exception 'PASS_REVOKED' using errcode = 'P0001'; end if;
  end if;
  if v_pass.order_id is not null then
    select status into v_order_status from public.orders where id = v_pass.order_id for update;
    if v_order_status in ('cancelled', 'refunded') then raise exception 'PASS_REVOKED' using errcode = 'P0001'; end if;
  end if;
  v_access_type := coalesce(v_reservation_type, v_pass.metadata ->> 'accessType', 'access');

  if v_access_type in ('wine_order', 'paid_order')
    or (v_pass.reservation_id is null and v_pass.event_ticket_type_id is null) then
    raise exception 'PASS_NOT_ACCESS' using errcode = 'P0001';
  end if;

  -- El QR de hospedaje confirma sólo el check-in. El checkout sigue siendo una
  -- operacion posterior e independiente en el Centro de Control.
  if v_reservation_type = 'cabin' then
    perform public.check_in_lodging_stay(v_pass.reservation_id, '[]'::jsonb, coalesce(p_notes, 'Check-in confirmado por QR'));
  elsif v_reservation_type = 'restaurant' then
    update public.reservations
    set metadata = jsonb_set(coalesce(metadata, '{}'::jsonb), '{arrivalCheckin}',
      jsonb_build_object('confirmedAt', now(), 'confirmedBy', v_actor_id), true),
      updated_by_admin = v_actor_id,
      updated_at = now()
    where id = v_pass.reservation_id;
  elsif v_pass.reservation_id is not null then
    update public.reservations
    set metadata = jsonb_set(coalesce(metadata, '{}'::jsonb), '{accessCheckin}',
      jsonb_build_object('confirmedAt', now(), 'confirmedBy', v_actor_id, 'type', v_access_type), true),
      updated_by_admin = v_actor_id,
      updated_at = now()
    where id = v_pass.reservation_id;
  end if;

  insert into public.checkins (
    access_pass_id, checked_in_by, checked_in_at, device_info, notes,
    request_id, evidence_storage_path, metadata
  ) values (
    p_access_pass_id, v_actor_id, now(), coalesce(p_device_info, '{}'::jsonb), p_notes,
    nullif(p_request_id, ''), nullif(p_evidence_storage_path, ''),
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object('accessType', v_access_type)
  ) returning id into v_checkin_id;

  update public.access_passes set used_at = now() where id = p_access_pass_id;
  perform public.write_transaction_audit(v_actor_id, 'checkin_registered', 'checkins', v_checkin_id, null,
    jsonb_build_object('pass_number', v_pass.pass_number, 'accessType', v_access_type));
  return v_checkin_id;
end;
$$;

revoke all on function public.issue_access_pass(uuid, uuid, uuid, text, timestamptz, timestamptz, text, jsonb) from public, anon;
revoke all on function public.validate_access_pass(text) from public, anon;
revoke all on function public.register_checkin(uuid, text, text, jsonb, text, jsonb) from public, anon;
grant execute on function public.issue_access_pass(uuid, uuid, uuid, text, timestamptz, timestamptz, text, jsonb) to authenticated;
grant execute on function public.validate_access_pass(text) to authenticated;
grant execute on function public.register_checkin(uuid, text, text, jsonb, text, jsonb) to authenticated;

commit;
