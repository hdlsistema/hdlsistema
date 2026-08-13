-- Hacienda de Letras OS
-- 043: ciclo operativo de reservaciones hoteleras
-- Requiere 040_lodging_operations.sql.

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
  v_unit public.lodging_units%rowtype;
  v_candidate public.lodging_units%rowtype;
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

  for v_candidate in
    select u.*
    from public.lodging_units u
    where u.operational_status = 'active'
      and u.housekeeping_status <> 'out_of_service'
      and u.capacity >= v_reservation.people_count
      and (u.cabin_package_id = v_reservation.cabin_package_id or u.cabin_package_id is null)
      and (p_unit_id is null or u.id = p_unit_id)
      and not exists (
        select 1
        from public.lodging_calendar_entries e
        where e.unit_id = u.id
          and e.status = 'active'
          and e.id <> v_stay.calendar_entry_id
          and daterange(e.start_date, e.end_date, '[)') && daterange(p_check_in, p_check_out, '[)')
      )
    order by case when u.id = coalesce(p_unit_id, v_stay.unit_id) then 0 else 1 end, u.code
    for update skip locked
  loop
    v_unit := v_candidate;
    exit;
  end loop;

  if v_unit.id is null then
    raise exception 'LODGING_UNAVAILABLE' using errcode = 'P0001';
  end if;

  update public.lodging_calendar_entries
  set unit_id = v_unit.id,
      start_date = p_check_in,
      end_date = p_check_out,
      expires_at = case when v_reservation.status = 'pending' then now() + interval '120 minutes' else null end,
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
    'Estancia reprogramada del ' || v_stay.planned_check_in || ' al ' || v_stay.planned_check_out ||
      ' para ' || p_check_in || ' al ' || p_check_out || ' en unidad ' || v_unit.code
  );

  return v_stay.id;
end;
$$;

create or replace function public.update_reservation_people(
  p_reservation_id uuid,
  p_people_count integer
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reservation public.reservations%rowtype;
  v_slot public.experience_slots%rowtype;
  v_stay public.lodging_stays%rowtype;
  v_unit public.lodging_units%rowtype;
  v_package public.cabin_packages%rowtype;
  v_delta integer;
  v_unit_price numeric(12,2);
  v_total numeric(12,2);
  v_actor_id uuid;
begin
  v_actor_id := public.current_reservation_operator(array['super_admin','admin','operations']);

  if p_people_count < 1 then
    raise exception 'INVALID_PEOPLE_COUNT' using errcode = 'P0001';
  end if;

  select * into v_reservation
  from public.reservations
  where id = p_reservation_id
  for update;

  if v_reservation.id is null then
    raise exception 'RESERVATION_NOT_FOUND' using errcode = 'P0001';
  end if;
  if v_reservation.status not in ('pending','confirmed') then
    raise exception 'INVALID_STATUS_TRANSITION' using errcode = 'P0001';
  end if;

  if v_reservation.reservation_type = 'cabin' then
    select * into v_stay from public.lodging_stays where reservation_id = p_reservation_id for update;
    select * into v_unit from public.lodging_units where id = v_stay.unit_id for update;
    select * into v_package from public.cabin_packages where id = v_reservation.cabin_package_id;

    if v_stay.id is null or v_unit.id is null then
      raise exception 'INVALID_LODGING_STAY' using errcode = 'P0001';
    end if;
    if p_people_count > v_unit.capacity
      or (v_package.id is not null and (p_people_count < v_package.min_guests or p_people_count > v_package.max_guests)) then
      raise exception 'CAPACITY_EXCEEDED' using errcode = 'P0001';
    end if;

    update public.reservations
    set people_count = p_people_count,
        updated_by_admin = v_actor_id,
        updated_at = now()
    where id = p_reservation_id;
  else
    select * into v_slot
    from public.experience_slots
    where id = v_reservation.experience_slot_id
    for update;

    if v_slot.id is null then
      raise exception 'SLOT_NOT_FOUND' using errcode = 'P0001';
    end if;

    v_delta := p_people_count - v_reservation.people_count;
    if v_reservation.status = 'confirmed' and v_delta > 0 and v_slot.confirmed_count + v_delta > v_slot.capacity then
      raise exception 'CAPACITY_EXCEEDED' using errcode = 'P0001';
    end if;

    if v_reservation.status = 'confirmed' and v_delta <> 0 then
      update public.experience_slots
      set reserved_count = greatest(reserved_count + v_delta, 0),
          confirmed_count = greatest(confirmed_count + v_delta, 0),
          updated_by = v_actor_id,
          updated_at = now()
      where id = v_slot.id;
    end if;

    v_unit_price := case when v_reservation.people_count > 0 then v_reservation.subtotal / v_reservation.people_count else 0 end;
    v_total := v_unit_price * p_people_count;

    update public.reservations
    set people_count = p_people_count,
        subtotal = v_total,
        total = v_total,
        updated_by_admin = v_actor_id,
        updated_at = now()
    where id = p_reservation_id;
  end if;

  insert into public.reservation_status_history (
    reservation_id, previous_status, new_status, changed_by, notes
  ) values (
    p_reservation_id,
    v_reservation.status,
    v_reservation.status,
    v_actor_id,
    'Cambio de personas: ' || v_reservation.people_count || ' a ' || p_people_count
  );

  return p_reservation_id;
end;
$$;

revoke all on function public.reschedule_lodging_reservation(uuid,date,date,uuid) from public, anon;
grant execute on function public.reschedule_lodging_reservation(uuid,date,date,uuid) to authenticated;

revoke all on function public.update_reservation_people(uuid,integer) from public, anon;
grant execute on function public.update_reservation_people(uuid,integer) to authenticated;

comment on function public.reschedule_lodging_reservation(uuid,date,date,uuid)
  is 'Reprograma una estancia y reasigna unidad de forma atomica, respetando exclusiones hoteleras.';
