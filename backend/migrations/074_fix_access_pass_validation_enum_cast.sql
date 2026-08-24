begin;

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
  v_effective_valid_until timestamptz;
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

  v_effective_valid_until := public.access_pass_effective_valid_until(v_pass.id, v_pass.valid_until);

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
    and (v_effective_valid_until is null or v_effective_valid_until >= now())
    and coalesce(v_pass.reservation_status::text, '') not in ('cancelled', 'no_show')
    and coalesce(v_pass.order_status::text, '') not in ('cancelled', 'refunded');

  v_reason := case
    when v_pass.status <> 'published' or v_pass.revoked_at is not null then 'revoked'
    when coalesce(v_pass.reservation_status::text, '') in ('cancelled', 'no_show')
      or coalesce(v_pass.order_status::text, '') in ('cancelled', 'refunded') then 'revoked'
    when v_pass.used_at is not null then 'used'
    when v_pass.valid_from is not null and v_pass.valid_from > now() then 'not_yet_valid'
    when v_effective_valid_until is not null and v_effective_valid_until < now() then 'expired'
    else null
  end;

  perform public.write_transaction_audit(
    v_actor_id,
    'access_pass_validated',
    'access_passes',
    v_pass.id,
    null,
    jsonb_build_object('valid', v_valid, 'reason', v_reason, 'accessType', v_access_type, 'validUntil', v_effective_valid_until)
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
    'validUntil', v_effective_valid_until,
    'usedAt', v_pass.used_at
  );
end;
$$;

revoke all on function public.validate_access_pass(text) from public, anon;
grant execute on function public.validate_access_pass(text) to authenticated;

commit;
