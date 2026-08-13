begin;

-- Una solicitud de hospedaje bloquea la unidad hasta resolución operativa.
-- El rango [llegada, salida) permite una nueva entrada el mismo día de salida.
create or replace function public.create_lodging_reservation_core(
  p_customer_id uuid,
  p_user_id uuid,
  p_cabin_package_id uuid,
  p_unit_id uuid,
  p_check_in date,
  p_check_out date,
  p_people_count integer,
  p_status public.reservation_status,
  p_source text,
  p_customer_notes text,
  p_internal_notes text,
  p_idempotency_key text,
  p_actor_id uuid,
  p_hold_minutes integer default 120,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reservation_id uuid;
  v_entry_id uuid;
  v_unit public.lodging_units%rowtype;
  v_package public.cabin_packages%rowtype;
  v_candidate public.lodging_units%rowtype;
  v_requested_nights integer;
  v_package_units integer;
  v_total numeric(12,2);
  v_entry_type text;
begin
  if p_check_in is null or p_check_out is null or p_check_out <= p_check_in then
    raise exception 'INVALID_LODGING_DATES' using errcode = 'P0001';
  end if;
  if p_people_count < 1 then
    raise exception 'INVALID_PEOPLE_COUNT' using errcode = 'P0001';
  end if;
  if p_status not in ('pending','confirmed') then
    raise exception 'INVALID_STATUS_TRANSITION' using errcode = 'P0001';
  end if;

  perform public.release_expired_lodging_holds();

  select * into v_package
  from public.cabin_packages
  where id = p_cabin_package_id
    and deleted_at is null
    and status not in ('archived','inactive');

  if v_package.id is null then
    raise exception 'CABIN_PACKAGE_NOT_FOUND' using errcode = 'P0001';
  end if;
  if p_people_count < v_package.min_guests or p_people_count > v_package.max_guests then
    raise exception 'INVALID_PEOPLE_COUNT' using errcode = 'P0001';
  end if;

  if p_idempotency_key is not null then
    select id into v_reservation_id
    from public.reservations
    where user_id is not distinct from p_user_id
      and idempotency_key = p_idempotency_key
    limit 1;
    if v_reservation_id is not null then
      return v_reservation_id;
    end if;
  end if;

  v_requested_nights := p_check_out - p_check_in;
  v_package_units := ceil(v_requested_nights::numeric / greatest(coalesce(v_package.nights, 1), 1))::integer;
  v_total := coalesce(v_package.price, 0) * v_package_units;

  insert into public.reservations (
    reservation_number, customer_id, user_id, reservation_type, cabin_package_id,
    people_count, subtotal, total, currency, status, operational_status,
    source, booking_channel, check_in, check_out, customer_notes, internal_notes,
    idempotency_key, created_by_admin, updated_by_admin, confirmed_at, metadata
  ) values (
    'CAB-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
    p_customer_id, p_user_id, 'cabin', p_cabin_package_id,
    p_people_count, v_total, v_total, coalesce(v_package.currency, 'MXN'), p_status, 'active',
    coalesce(nullif(p_source, ''), 'Centro de control'), coalesce(nullif(p_source, ''), 'Centro de control'),
    p_check_in, p_check_out, p_customer_notes, p_internal_notes,
    p_idempotency_key, p_actor_id, p_actor_id,
    case when p_status = 'confirmed' then now() else null end,
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
      'lodgingInventory', true,
      'bookingMode', 'CONFIRMATION_HOLD',
      'requestedNights', v_requested_nights,
      'packageNights', greatest(coalesce(v_package.nights, 1), 1),
      'packageUnits', v_package_units,
      'unitPackagePrice', coalesce(v_package.price, 0)
    )
  ) returning id into v_reservation_id;

  v_entry_type := case when p_status = 'confirmed' then 'reservation' else 'hold' end;

  for v_candidate in
    select unit.*
    from public.lodging_units unit
    where unit.operational_status = 'active'
      and unit.housekeeping_status <> 'out_of_service'
      and unit.capacity >= p_people_count
      and (unit.cabin_package_id = p_cabin_package_id or unit.cabin_package_id is null)
      and (p_unit_id is null or unit.id = p_unit_id)
    order by case when unit.id = p_unit_id then 0 else 1 end, unit.code
    for update skip locked
  loop
    begin
      insert into public.lodging_calendar_entries (
        unit_id, reservation_id, entry_type, start_date, end_date, status,
        expires_at, reason, metadata, created_by
      ) values (
        v_candidate.id, v_reservation_id, v_entry_type, p_check_in, p_check_out, 'active',
        null,
        case when v_entry_type = 'hold' then 'Solicitud pendiente de confirmación' else 'Reservación confirmada' end,
        jsonb_build_object('source', p_source, 'requestedNights', v_requested_nights),
        p_actor_id
      ) returning id into v_entry_id;
      v_unit := v_candidate;
      exit;
    exception when exclusion_violation then
      v_entry_id := null;
    end;
  end loop;

  if v_entry_id is null then
    raise exception 'LODGING_UNAVAILABLE' using errcode = 'P0001';
  end if;

  insert into public.lodging_stays (
    reservation_id, calendar_entry_id, unit_id, planned_check_in, planned_check_out,
    status, assigned_by
  ) values (
    v_reservation_id, v_entry_id, v_unit.id, p_check_in, p_check_out,
    case when p_status = 'confirmed' then 'reserved' else 'held' end, p_actor_id
  );

  return v_reservation_id;
end;
$$;

create or replace function public.reschedule_lodging_reservation(
  p_reservation_id uuid,
  p_check_in date,
  p_check_out date,
  p_unit_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid;
  v_reservation public.reservations%rowtype;
  v_stay public.lodging_stays%rowtype;
  v_package public.cabin_packages%rowtype;
  v_unit public.lodging_units%rowtype;
  v_candidate public.lodging_units%rowtype;
  v_requested_nights integer;
  v_package_units integer;
  v_total numeric(12,2);
begin
  v_actor_id := public.current_reservation_operator(array['super_admin','admin','operations']);

  if p_check_in is null or p_check_out is null or p_check_out <= p_check_in then
    raise exception 'INVALID_LODGING_DATES' using errcode = 'P0001';
  end if;

  perform public.release_expired_lodging_holds();

  select * into v_reservation
  from public.reservations
  where id = p_reservation_id
  for update;

  if v_reservation.id is null then
    raise exception 'RESERVATION_NOT_FOUND' using errcode = 'P0001';
  end if;
  if v_reservation.reservation_type <> 'cabin' then
    raise exception 'INVALID_RESERVATION_TYPE' using errcode = 'P0001';
  end if;
  if v_reservation.status not in ('pending','confirmed') then
    raise exception 'INVALID_STATUS_TRANSITION' using errcode = 'P0001';
  end if;

  select * into v_stay
  from public.lodging_stays
  where reservation_id = p_reservation_id
  for update;

  if v_stay.id is null or v_stay.status not in ('held','reserved') then
    raise exception 'INVALID_LODGING_STAY' using errcode = 'P0001';
  end if;

  select * into v_package
  from public.cabin_packages
  where id = v_reservation.cabin_package_id;

  if v_package.id is null then
    raise exception 'CABIN_PACKAGE_NOT_FOUND' using errcode = 'P0001';
  end if;

  for v_candidate in
    select unit.*
    from public.lodging_units unit
    where unit.operational_status = 'active'
      and unit.housekeeping_status <> 'out_of_service'
      and unit.capacity >= v_reservation.people_count
      and (unit.cabin_package_id = v_reservation.cabin_package_id or unit.cabin_package_id is null)
      and (p_unit_id is null or unit.id = p_unit_id)
      and not exists (
        select 1
        from public.lodging_calendar_entries entry
        where entry.unit_id = unit.id
          and entry.status = 'active'
          and entry.id <> v_stay.calendar_entry_id
          and daterange(entry.start_date, entry.end_date, '[)') && daterange(p_check_in, p_check_out, '[)')
      )
    order by case when unit.id = coalesce(p_unit_id, v_stay.unit_id) then 0 else 1 end, unit.code
    for update skip locked
  loop
    v_unit := v_candidate;
    exit;
  end loop;

  if v_unit.id is null then
    raise exception 'LODGING_UNAVAILABLE' using errcode = 'P0001';
  end if;

  v_requested_nights := p_check_out - p_check_in;
  v_package_units := ceil(v_requested_nights::numeric / greatest(coalesce(v_package.nights, 1), 1))::integer;
  v_total := coalesce(v_package.price, 0) * v_package_units;

  update public.lodging_calendar_entries
  set unit_id = v_unit.id,
      start_date = p_check_in,
      end_date = p_check_out,
      expires_at = null,
      reason = case when v_reservation.status = 'pending' then 'Solicitud pendiente de confirmación' else 'Reservación confirmada' end,
      metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('requestedNights', v_requested_nights),
      updated_at = now()
  where id = v_stay.calendar_entry_id;

  update public.lodging_stays
  set unit_id = v_unit.id,
      planned_check_in = p_check_in,
      planned_check_out = p_check_out,
      assigned_by = v_actor_id,
      updated_at = now()
  where id = v_stay.id;

  update public.reservations
  set check_in = p_check_in,
      check_out = p_check_out,
      subtotal = v_total,
      total = v_total,
      metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
        'lodgingInventory', true,
        'bookingMode', 'CONFIRMATION_HOLD',
        'requestedNights', v_requested_nights,
        'packageNights', greatest(coalesce(v_package.nights, 1), 1),
        'packageUnits', v_package_units,
        'unitPackagePrice', coalesce(v_package.price, 0)
      ),
      rescheduled_at = now(),
      updated_by_admin = v_actor_id,
      updated_at = now()
  where id = p_reservation_id;

  insert into public.reservation_status_history (
    reservation_id, previous_status, new_status, changed_by, notes
  ) values (
    p_reservation_id,
    v_reservation.status,
    v_reservation.status,
    v_actor_id,
    'Estancia reprogramada del ' || v_stay.planned_check_in || ' al ' || v_stay.planned_check_out
      || ' para ' || p_check_in || ' al ' || p_check_out || ' en unidad ' || v_unit.code
  );

  return v_stay.id;
end;
$$;

revoke all on function public.create_lodging_reservation_core(uuid,uuid,uuid,uuid,date,date,integer,public.reservation_status,text,text,text,text,uuid,integer,jsonb) from public, anon, authenticated;
grant execute on function public.create_lodging_reservation_customer(uuid,uuid,date,date,integer,text,text,jsonb) to service_role;
revoke all on function public.reschedule_lodging_reservation(uuid,date,date,uuid) from public, anon;
grant execute on function public.reschedule_lodging_reservation(uuid,date,date,uuid) to authenticated;

comment on constraint lodging_calendar_no_overlap on public.lodging_calendar_entries
  is 'Impide reservas, holds y bloqueos activos traslapados para una misma cabaña física.';

comment on function public.create_lodging_reservation_core(uuid,uuid,uuid,uuid,date,date,integer,public.reservation_status,text,text,text,text,uuid,integer,jsonb)
  is 'Crea la reserva, asigna cabaña física y bloquea [llegada,salida) de forma atómica.';

commit;
