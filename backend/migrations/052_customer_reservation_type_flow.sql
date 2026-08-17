begin;

-- La cancelacion del cliente debe liberar el mismo inventario operativo que usa
-- el Centro de Control, incluida una retencion de hospedaje.
create or replace function public.cancel_customer_reservation(
  p_reservation_id uuid,
  p_reason text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_customer_id uuid;
  v_reservation public.reservations%rowtype;
begin
  if v_user_id is null then
    raise exception 'FORBIDDEN' using errcode = 'P0001';
  end if;

  select id into v_customer_id from public.customers where user_id = v_user_id;
  if v_customer_id is null then
    raise exception 'CUSTOMER_PROFILE_REQUIRED' using errcode = 'P0001';
  end if;

  select * into v_reservation
  from public.reservations
  where id = p_reservation_id
    and customer_id = v_customer_id
    and user_id = v_user_id
  for update;

  if v_reservation.id is null then
    raise exception 'RESERVATION_NOT_FOUND' using errcode = 'P0001';
  end if;
  if v_reservation.status not in ('pending', 'confirmed') then
    raise exception 'INVALID_STATUS_TRANSITION' using errcode = 'P0001';
  end if;

  if v_reservation.reservation_type = 'cabin' then
    update public.lodging_calendar_entries
    set status = 'cancelled',
        released_by = v_user_id,
        released_at = now(),
        updated_at = now()
    where reservation_id = p_reservation_id
      and status = 'active';

    update public.lodging_stays
    set status = 'cancelled',
        updated_at = now()
    where reservation_id = p_reservation_id;
  elsif v_reservation.reservation_type = 'experience'
    and v_reservation.status = 'confirmed'
    and v_reservation.experience_slot_id is not null then
    update public.experience_slots
    set reserved_count = greatest(reserved_count - v_reservation.people_count, 0),
        confirmed_count = greatest(confirmed_count - v_reservation.people_count, 0),
        updated_at = now()
    where id = v_reservation.experience_slot_id;
  end if;

  update public.reservations
  set status = 'cancelled',
      cancelled_at = now(),
      cancellation_reason = nullif(trim(coalesce(p_reason, '')), ''),
      cancelled_by = v_user_id,
      operational_status = 'cancelled',
      updated_at = now()
  where id = p_reservation_id;

  insert into public.reservation_status_history (
    reservation_id,
    previous_status,
    new_status,
    changed_by,
    notes
  ) values (
    p_reservation_id,
    v_reservation.status,
    'cancelled',
    v_user_id,
    coalesce(nullif(trim(coalesce(p_reason, '')), ''), 'Cancelada por el cliente')
  );

  insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, after_data)
  values (
    v_user_id,
    'customer_reservation_cancelled',
    'reservations',
    p_reservation_id,
    jsonb_build_object('source', 'app', 'reservationType', v_reservation.reservation_type)
  );

  return p_reservation_id;
end;
$$;

-- La reprogramacion publica es exclusiva de experiencias y solo permite otro
-- horario vivo de la misma experiencia.
create or replace function public.reschedule_customer_reservation(
  p_reservation_id uuid,
  p_new_slot_id uuid,
  p_idempotency_key text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_customer_id uuid;
  v_reservation public.reservations%rowtype;
  v_old_slot public.experience_slots%rowtype;
  v_new_slot public.experience_slots%rowtype;
  v_experience public.experiences%rowtype;
  v_total numeric(12,2);
begin
  if v_user_id is null then
    raise exception 'FORBIDDEN' using errcode = 'P0001';
  end if;

  select id into v_customer_id from public.customers where user_id = v_user_id;
  if v_customer_id is null then
    raise exception 'CUSTOMER_PROFILE_REQUIRED' using errcode = 'P0001';
  end if;

  select * into v_reservation
  from public.reservations
  where id = p_reservation_id
    and customer_id = v_customer_id
    and user_id = v_user_id
  for update;

  if v_reservation.id is null then
    raise exception 'RESERVATION_NOT_FOUND' using errcode = 'P0001';
  end if;
  if v_reservation.reservation_type <> 'experience' then
    raise exception 'INVALID_RESERVATION_TYPE' using errcode = 'P0001';
  end if;
  if v_reservation.status not in ('pending', 'confirmed') then
    raise exception 'INVALID_STATUS_TRANSITION' using errcode = 'P0001';
  end if;
  if v_reservation.metadata ->> 'lastRescheduleIdempotencyKey' = nullif(trim(coalesce(p_idempotency_key, '')), '') then
    return p_reservation_id;
  end if;
  if v_reservation.experience_slot_id = p_new_slot_id then
    return p_reservation_id;
  end if;

  select * into v_new_slot
  from public.experience_slots
  where id = p_new_slot_id
  for update;

  if v_new_slot.id is null then
    raise exception 'SLOT_NOT_FOUND' using errcode = 'P0001';
  end if;
  if v_new_slot.experience_id <> v_reservation.experience_id then
    raise exception 'RESERVATION_EXPERIENCE_MISMATCH' using errcode = 'P0001';
  end if;

  select * into v_experience
  from public.experiences
  where id = v_new_slot.experience_id;

  if v_experience.id is null
    or not v_new_slot.is_bookable
    or v_new_slot.operational_status <> 'open'
    or v_new_slot.status <> 'published'
    or v_new_slot.start_at <= now()
    or not public.is_content_live(
      v_new_slot.status::text,
      v_new_slot.visible_in_app,
      v_new_slot.publish_at,
      v_new_slot.unpublish_at,
      v_new_slot.archived_at,
      v_new_slot.deleted_at
    )
    or not public.is_content_live(
      v_experience.status::text,
      v_experience.visible_in_app,
      v_experience.publish_at,
      v_experience.unpublish_at,
      v_experience.archived_at,
      v_experience.deleted_at
    )
    or exists (
      select 1
      from public.experience_blockouts blockout
      where (blockout.applies_to_all_experiences = true or blockout.experience_id = v_new_slot.experience_id)
        and blockout.start_at < v_new_slot.end_at
        and blockout.end_at > v_new_slot.start_at
    ) then
    raise exception 'SLOT_NOT_BOOKABLE' using errcode = 'P0001';
  end if;
  if v_new_slot.confirmed_count + v_reservation.people_count > v_new_slot.capacity then
    raise exception 'CAPACITY_EXCEEDED' using errcode = 'P0001';
  end if;

  v_total := coalesce(v_new_slot.price_override, v_experience.base_price, 0) * v_reservation.people_count;

  if v_reservation.status = 'confirmed' and v_reservation.experience_slot_id is not null then
    select * into v_old_slot
    from public.experience_slots
    where id = v_reservation.experience_slot_id
    for update;

    update public.experience_slots
    set reserved_count = greatest(reserved_count - v_reservation.people_count, 0),
        confirmed_count = greatest(confirmed_count - v_reservation.people_count, 0),
        updated_at = now()
    where id = v_old_slot.id;

    update public.experience_slots
    set reserved_count = reserved_count + v_reservation.people_count,
        confirmed_count = confirmed_count + v_reservation.people_count,
        updated_at = now()
    where id = v_new_slot.id;
  end if;

  update public.reservations
  set experience_slot_id = p_new_slot_id,
      subtotal = v_total,
      total = v_total,
      rescheduled_from_reservation_id = coalesce(rescheduled_from_reservation_id, id),
      rescheduled_at = now(),
      metadata = metadata || jsonb_build_object(
        'lastRescheduleIdempotencyKey',
        nullif(trim(coalesce(p_idempotency_key, '')), '')
      ),
      updated_at = now()
  where id = p_reservation_id;

  insert into public.reservation_status_history (
    reservation_id,
    previous_status,
    new_status,
    changed_by,
    notes
  ) values (
    p_reservation_id,
    v_reservation.status,
    v_reservation.status,
    v_user_id,
    'Reprogramacion solicitada por cliente'
  );

  insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, after_data)
  values (
    v_user_id,
    'customer_reservation_rescheduled',
    'reservations',
    p_reservation_id,
    jsonb_build_object('source', 'app', 'experienceSlotId', p_new_slot_id)
  );

  return p_reservation_id;
end;
$$;

revoke all on function public.cancel_customer_reservation(uuid, text) from public, anon;
revoke all on function public.reschedule_customer_reservation(uuid, uuid, text) from public, anon;
grant execute on function public.cancel_customer_reservation(uuid, text) to authenticated;
grant execute on function public.reschedule_customer_reservation(uuid, uuid, text) to authenticated;

commit;
