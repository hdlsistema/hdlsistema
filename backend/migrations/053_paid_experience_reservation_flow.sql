begin;

-- Las reservaciones de experiencias creadas por la App requieren una orden
-- pagada antes de confirmarse y emitir su acceso. reserved_count representa
-- todo cupo comprometido (pendiente o confirmado); confirmed_count solo pago.
alter table public.reservations
  add column if not exists payment_status text not null default 'not_required';

alter table public.reservations
  add column if not exists payment_expires_at timestamptz;

alter table public.reservations
  drop constraint if exists reservations_payment_status_valid;

alter table public.reservations
  add constraint reservations_payment_status_valid check (
    payment_status in ('not_required', 'pending', 'paid', 'cancelled', 'refunded')
  );

create index if not exists idx_reservations_payment_status
  on public.reservations(payment_status, created_at desc);

create index if not exists idx_reservations_payment_expiration
  on public.reservations(payment_expires_at)
  where status = 'pending' and payment_status = 'pending';

create unique index if not exists uq_app_reservation_payment_order
  on public.orders(reservation_id)
  where reservation_id is not null and source = 'app_reservation';

create or replace function public.release_expired_experience_payment_holds()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reservation record;
  v_order_id uuid;
  v_released integer := 0;
begin
  for v_reservation in
    select r.id, r.experience_slot_id, r.people_count
    from public.reservations r
    where r.reservation_type = 'experience'
      and r.status = 'pending'
      and r.payment_status = 'pending'
      and r.payment_expires_at is not null
      and r.payment_expires_at <= now()
      and not exists (
        select 1 from public.orders paid_order
        where paid_order.reservation_id = r.id
          and paid_order.status in ('paid', 'processing', 'fulfilled')
      )
    order by r.payment_expires_at
    for update skip locked
  loop
    v_order_id := null;
    select o.id into v_order_id
    from public.orders o
    where o.reservation_id = v_reservation.id
      and o.status in ('draft', 'pending_payment')
    order by o.created_at desc
    limit 1
    for update;

    if v_order_id is not null then
      -- El trigger de orden libera el cupo y cancela la reservacion una sola vez.
      update public.orders
      set status = 'cancelled', updated_at = now()
      where id = v_order_id;
    else
      update public.experience_slots
      set reserved_count = greatest(reserved_count - v_reservation.people_count, 0),
          updated_at = now()
      where id = v_reservation.experience_slot_id;

      update public.reservations
      set status = 'cancelled',
          payment_status = 'cancelled',
          payment_expires_at = null,
          cancelled_at = coalesce(cancelled_at, now()),
          cancellation_reason = coalesce(cancellation_reason, 'Tiempo de pago vencido'),
          operational_status = 'cancelled',
          updated_at = now()
      where id = v_reservation.id;
    end if;

    v_released := v_released + 1;
  end loop;

  return v_released;
end;
$$;

create or replace function public.get_bookable_experience_slots(
  p_experience_id uuid default null,
  p_from timestamptz default now(),
  p_to timestamptz default (now() + interval '45 days')
)
returns table (
  id uuid,
  experience_id uuid,
  experience_title text,
  experience_slug text,
  location text,
  duration_minutes integer,
  cover_image_url text,
  start_at timestamptz,
  end_at timestamptz,
  available integer,
  price numeric,
  is_bookable boolean
)
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.release_expired_experience_payment_holds();

  return query
  select
    s.id,
    s.experience_id,
    e.title as experience_title,
    e.slug as experience_slug,
    e.location,
    e.duration_minutes,
    e.cover_image_url,
    s.start_at,
    s.end_at,
    greatest(s.capacity - s.reserved_count, 0) as available,
    coalesce(s.price_override, e.base_price, 0) as price,
    (
      s.is_bookable
      and s.operational_status = 'open'
      and s.status = 'published'
      and s.start_at > now()
      and greatest(s.capacity - s.reserved_count, 0) > 0
    ) as is_bookable
  from public.experience_slots s
  join public.experiences e on e.id = s.experience_id
  where (p_experience_id is null or s.experience_id = p_experience_id)
    and s.start_at >= greatest(coalesce(p_from, now()), now())
    and s.start_at <= coalesce(p_to, now() + interval '45 days')
    and s.is_bookable = true
    and s.operational_status = 'open'
    and s.status = 'published'
    and public.is_content_live(s.status::text, s.visible_in_app, s.publish_at, s.unpublish_at, s.archived_at, s.deleted_at)
    and public.is_content_live(e.status::text, e.visible_in_app, e.publish_at, e.unpublish_at, e.archived_at, e.deleted_at)
    and greatest(s.capacity - s.reserved_count, 0) > 0
    and not exists (
      select 1
      from public.experience_blockouts b
      where (b.applies_to_all_experiences = true or b.experience_id = s.experience_id)
        and b.start_at < s.end_at
        and b.end_at > s.start_at
    )
  order by s.start_at asc;
end;
$$;

create or replace function public.create_customer_reservation(
  p_experience_slot_id uuid,
  p_people_count integer,
  p_customer_notes text default null,
  p_language text default 'es',
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
  v_existing_id uuid;
  v_slot public.experience_slots%rowtype;
  v_experience public.experiences%rowtype;
  v_reservation_id uuid;
  v_order_id uuid;
  v_total numeric(12,2);
  v_unit_price numeric(12,2);
  v_key text := nullif(trim(coalesce(p_idempotency_key, '')), '');
begin
  if v_user_id is null then
    raise exception 'FORBIDDEN' using errcode = 'P0001';
  end if;
  if p_people_count < 1 then
    raise exception 'INVALID_PEOPLE_COUNT' using errcode = 'P0001';
  end if;
  if v_key is null then
    raise exception 'IDEMPOTENCY_KEY_REQUIRED' using errcode = 'P0001';
  end if;

  perform public.release_expired_experience_payment_holds();

  select id into v_customer_id from public.customers where user_id = v_user_id;
  if v_customer_id is null then
    raise exception 'CUSTOMER_PROFILE_REQUIRED' using errcode = 'P0001';
  end if;

  select id into v_existing_id
  from public.reservations
  where user_id = v_user_id and idempotency_key = v_key
  limit 1;
  if v_existing_id is not null then
    return v_existing_id;
  end if;

  select * into v_slot
  from public.experience_slots
  where id = p_experience_slot_id
  for update;

  if v_slot.id is null then
    raise exception 'SLOT_NOT_FOUND' using errcode = 'P0001';
  end if;
  if not v_slot.is_bookable
    or v_slot.operational_status <> 'open'
    or v_slot.status <> 'published'
    or v_slot.start_at <= now() then
    raise exception 'SLOT_NOT_BOOKABLE' using errcode = 'P0001';
  end if;
  if v_slot.reserved_count + p_people_count > v_slot.capacity then
    raise exception 'CAPACITY_EXCEEDED' using errcode = 'P0001';
  end if;

  select * into v_experience
  from public.experiences
  where id = v_slot.experience_id;

  if v_experience.id is null
    or not public.is_content_live(
      v_experience.status::text,
      v_experience.visible_in_app,
      v_experience.publish_at,
      v_experience.unpublish_at,
      v_experience.archived_at,
      v_experience.deleted_at
    ) then
    raise exception 'SLOT_NOT_BOOKABLE' using errcode = 'P0001';
  end if;

  v_unit_price := coalesce(v_slot.price_override, v_experience.base_price, 0);
  v_total := v_unit_price * p_people_count;

  insert into public.reservations (
    reservation_number,
    customer_id,
    user_id,
    reservation_type,
    experience_id,
    experience_slot_id,
    people_count,
    subtotal,
    total,
    status,
    payment_status,
    payment_expires_at,
    customer_notes,
    source,
    booking_channel,
    confirmed_at,
    operational_status,
    idempotency_key,
    metadata
  ) values (
    'RES-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
    v_customer_id,
    v_user_id,
    'experience',
    v_slot.experience_id,
    v_slot.id,
    p_people_count,
    v_total,
    v_total,
    case when v_total > 0 then 'pending'::public.reservation_status else 'confirmed'::public.reservation_status end,
    case when v_total > 0 then 'pending' else 'not_required' end,
    case when v_total > 0 then now() + interval '30 minutes' else null end,
    nullif(trim(coalesce(p_customer_notes, '')), ''),
    'app',
    'native_app',
    case when v_total > 0 then null else now() end,
    'active',
    v_key,
    jsonb_build_object(
      'language', case when p_language = 'en' then 'en' else 'es' end,
      'paymentRequired', v_total > 0,
      'holdCreatedAt', now()
    )
  ) returning id into v_reservation_id;

  update public.experience_slots
  set reserved_count = reserved_count + p_people_count,
      confirmed_count = confirmed_count + case when v_total > 0 then 0 else p_people_count end,
      updated_at = now()
  where id = v_slot.id;

  if v_total > 0 then
  insert into public.orders (
    order_number,
    user_id,
    customer_id,
    reservation_id,
    subtotal,
    discount_total,
    tax_total,
    shipping_total,
    total,
    currency,
    status,
    source,
    idempotency_key,
    created_by,
    updated_by,
    metadata
  ) values (
    'ORD-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
    v_user_id,
    v_customer_id,
    v_reservation_id,
    v_total,
    0,
    0,
    0,
    v_total,
    'MXN',
    'pending_payment',
    'app_reservation',
    'reservation-order:' || v_key,
    v_user_id,
    v_user_id,
    jsonb_build_object(
      'checkoutMode', 'experience_reservation',
      'paymentAvailable', true,
      'paymentStatus', 'pending_payment',
      'fulfillmentMode', 'onsite_experience',
      'reservationId', v_reservation_id
    )
  ) returning id into v_order_id;

  insert into public.order_items (
    order_id,
    item_type,
    item_id,
    name_snapshot,
    sku_snapshot,
    quantity,
    unit_price,
    subtotal,
    metadata
  ) values (
    v_order_id,
    'experience_reservation',
    v_reservation_id,
    v_experience.title,
    null,
    p_people_count,
    v_unit_price,
    v_total,
    jsonb_build_object(
      'experienceId', v_experience.id,
      'experienceSlotId', v_slot.id,
      'startsAt', v_slot.start_at,
      'endsAt', v_slot.end_at,
      'reservationId', v_reservation_id
    )
  );

  update public.reservations
  set metadata = metadata || jsonb_build_object('paymentOrderId', v_order_id),
      updated_at = now()
  where id = v_reservation_id;
  end if;

  insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, after_data)
  values (
    v_user_id,
    case when v_total > 0 then 'customer_reservation_pending_payment' else 'customer_reservation_confirmed_free' end,
    'reservations',
    v_reservation_id,
    jsonb_build_object('source', 'app', 'orderId', v_order_id, 'total', v_total)
  );

  return v_reservation_id;
end;
$$;

create or replace function public.sync_paid_experience_reservation_from_order()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reservation public.reservations%rowtype;
begin
  if new.reservation_id is null or old.status = new.status then
    return new;
  end if;

  select * into v_reservation
  from public.reservations
  where id = new.reservation_id
  for update;

  if v_reservation.id is null
    or v_reservation.reservation_type <> 'experience'
    or v_reservation.payment_status = 'not_required' then
    return new;
  end if;

  if new.status in ('paid', 'fulfilled') then
    if v_reservation.status = 'pending' then
      perform 1
      from public.experience_slots
      where id = v_reservation.experience_slot_id
      for update;

      update public.experience_slots
      set confirmed_count = confirmed_count + v_reservation.people_count,
          updated_at = now()
      where id = v_reservation.experience_slot_id
        and confirmed_count + v_reservation.people_count <= reserved_count
        and confirmed_count + v_reservation.people_count <= capacity;

      if not found then
        raise exception 'CAPACITY_EXCEEDED' using errcode = 'P0001';
      end if;

      update public.reservations
      set status = 'confirmed',
          payment_status = 'paid',
          payment_expires_at = null,
          confirmed_at = coalesce(confirmed_at, now()),
          operational_status = 'active',
          updated_at = now()
      where id = v_reservation.id;
    else
      update public.reservations
      set payment_status = 'paid', payment_expires_at = null, updated_at = now()
      where id = v_reservation.id;
    end if;
  elsif new.status in ('cancelled', 'refunded') then
    if v_reservation.status in ('pending', 'confirmed') then
      update public.experience_slots
      set reserved_count = greatest(reserved_count - v_reservation.people_count, 0),
          confirmed_count = case
            when v_reservation.status = 'confirmed'
              then greatest(confirmed_count - v_reservation.people_count, 0)
            else confirmed_count
          end,
          updated_at = now()
      where id = v_reservation.experience_slot_id;

      update public.reservations
      set status = 'cancelled',
          payment_status = case when new.status = 'refunded' then 'refunded' else 'cancelled' end,
          payment_expires_at = null,
          cancelled_at = coalesce(cancelled_at, now()),
          cancellation_reason = coalesce(cancellation_reason, 'Orden ' || new.status::text),
          operational_status = 'cancelled',
          updated_at = now()
      where id = v_reservation.id;
    else
      update public.reservations
      set payment_status = case when new.status = 'refunded' then 'refunded' else 'cancelled' end,
          payment_expires_at = null,
          updated_at = now()
      where id = v_reservation.id;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists sync_paid_experience_reservation_after_order on public.orders;
create trigger sync_paid_experience_reservation_after_order
after update of status on public.orders
for each row execute function public.sync_paid_experience_reservation_from_order();

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
  v_order public.orders%rowtype;
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

  select * into v_order
  from public.orders
  where reservation_id = v_reservation.id
  order by created_at desc
  limit 1
  for update;

  if v_reservation.payment_status = 'paid' or v_order.status in ('paid', 'processing', 'fulfilled') then
    raise exception 'PAID_RESERVATION_REFUND_REQUIRED' using errcode = 'P0001';
  end if;

  if v_reservation.reservation_type = 'cabin' then
    update public.lodging_calendar_entries
    set status = 'cancelled', released_by = v_user_id, released_at = now(), updated_at = now()
    where reservation_id = p_reservation_id and status = 'active';
    update public.lodging_stays set status = 'cancelled', updated_at = now()
    where reservation_id = p_reservation_id;
  elsif v_reservation.reservation_type = 'experience' and v_reservation.experience_slot_id is not null then
    update public.experience_slots
    set reserved_count = greatest(reserved_count - v_reservation.people_count, 0),
        confirmed_count = case
          when v_reservation.status = 'confirmed'
            then greatest(confirmed_count - v_reservation.people_count, 0)
          else confirmed_count
        end,
        updated_at = now()
    where id = v_reservation.experience_slot_id;
  end if;

  update public.reservations
  set status = 'cancelled',
      payment_status = case when payment_status = 'pending' then 'cancelled' else payment_status end,
      payment_expires_at = null,
      cancelled_at = now(),
      cancellation_reason = nullif(trim(coalesce(p_reason, '')), ''),
      cancelled_by = v_user_id,
      operational_status = 'cancelled',
      updated_at = now()
  where id = p_reservation_id;

  if v_order.id is not null and v_order.status in ('draft', 'pending_payment') then
    update public.orders
    set status = 'cancelled', updated_at = now()
    where id = v_order.id;
  end if;

  insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, after_data)
  values (v_user_id, 'customer_reservation_cancelled', 'reservations', p_reservation_id, jsonb_build_object('source', 'app'));

  return p_reservation_id;
end;
$$;

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
  v_order public.orders%rowtype;
  v_new_unit_price numeric(12,2);
  v_new_total numeric(12,2);
  v_payment_count integer := 0;
  v_key text := nullif(trim(coalesce(p_idempotency_key, '')), '');
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
  if v_reservation.reservation_type <> 'experience'
    or v_reservation.status not in ('pending', 'confirmed') then
    raise exception 'INVALID_STATUS_TRANSITION' using errcode = 'P0001';
  end if;
  if v_reservation.metadata ->> 'lastRescheduleIdempotencyKey' = v_key and v_key is not null then
    return p_reservation_id;
  end if;
  if v_reservation.experience_slot_id = p_new_slot_id then
    return p_reservation_id;
  end if;

  select * into v_old_slot
  from public.experience_slots
  where id = v_reservation.experience_slot_id
  for update;

  select * into v_new_slot
  from public.experience_slots
  where id = p_new_slot_id
  for update;

  if v_new_slot.id is null or v_new_slot.experience_id <> v_reservation.experience_id then
    raise exception 'SLOT_NOT_FOUND' using errcode = 'P0001';
  end if;
  if not v_new_slot.is_bookable
    or v_new_slot.operational_status <> 'open'
    or v_new_slot.status <> 'published'
    or v_new_slot.start_at <= now() then
    raise exception 'SLOT_NOT_BOOKABLE' using errcode = 'P0001';
  end if;
  if v_new_slot.reserved_count + v_reservation.people_count > v_new_slot.capacity then
    raise exception 'CAPACITY_EXCEEDED' using errcode = 'P0001';
  end if;

  select coalesce(v_new_slot.price_override, e.base_price, 0)
  into v_new_unit_price
  from public.experiences e
  where e.id = v_reservation.experience_id;
  v_new_total := v_new_unit_price * v_reservation.people_count;

  select * into v_order
  from public.orders
  where reservation_id = v_reservation.id
  order by created_at desc
  limit 1
  for update;

  if v_order.id is not null then
    select count(*) into v_payment_count from public.payments where order_id = v_order.id;
    if v_new_total <> v_order.total
      and (v_order.status in ('paid', 'processing', 'fulfilled') or v_payment_count > 0) then
      raise exception 'PRICE_CHANGE_REQUIRES_NEW_RESERVATION' using errcode = 'P0001';
    end if;
  end if;

  if v_old_slot.id is not null then
    update public.experience_slots
    set reserved_count = greatest(reserved_count - v_reservation.people_count, 0),
        confirmed_count = case
          when v_reservation.status = 'confirmed'
            then greatest(confirmed_count - v_reservation.people_count, 0)
          else confirmed_count
        end,
        updated_at = now()
    where id = v_old_slot.id;
  end if;

  update public.experience_slots
  set reserved_count = reserved_count + v_reservation.people_count,
      confirmed_count = case
        when v_reservation.status = 'confirmed'
          then confirmed_count + v_reservation.people_count
        else confirmed_count
      end,
      updated_at = now()
  where id = v_new_slot.id;

  update public.reservations
  set experience_slot_id = v_new_slot.id,
      subtotal = v_new_total,
      total = v_new_total,
      rescheduled_at = now(),
      rescheduled_from_reservation_id = coalesce(rescheduled_from_reservation_id, id),
      metadata = metadata || jsonb_build_object('lastRescheduleIdempotencyKey', v_key),
      updated_at = now()
  where id = p_reservation_id;

  if v_order.id is not null and v_order.status in ('draft', 'pending_payment') and v_payment_count = 0 then
    update public.orders
    set subtotal = v_new_total,
        total = v_new_total,
        updated_at = now()
    where id = v_order.id;

    update public.order_items
    set unit_price = v_new_unit_price,
        subtotal = v_new_total,
        metadata = metadata || jsonb_build_object(
          'experienceSlotId', v_new_slot.id,
          'startsAt', v_new_slot.start_at,
          'endsAt', v_new_slot.end_at
        )
    where order_id = v_order.id and item_type = 'experience_reservation';
  end if;

  insert into public.reservation_status_history (
    reservation_id, previous_status, new_status, changed_by, notes
  ) values (
    p_reservation_id, v_reservation.status, v_reservation.status, v_user_id,
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

revoke all on function public.sync_paid_experience_reservation_from_order() from public, anon;
revoke all on function public.release_expired_experience_payment_holds() from public, anon;
revoke all on function public.get_bookable_experience_slots(uuid, timestamptz, timestamptz) from public, anon;
revoke all on function public.create_customer_reservation(uuid, integer, text, text, text) from public, anon;
revoke all on function public.cancel_customer_reservation(uuid, text) from public, anon;
revoke all on function public.reschedule_customer_reservation(uuid, uuid, text) from public, anon;
grant execute on function public.release_expired_experience_payment_holds() to authenticated, service_role;
grant execute on function public.get_bookable_experience_slots(uuid, timestamptz, timestamptz) to authenticated;
grant execute on function public.create_customer_reservation(uuid, integer, text, text, text) to authenticated;
grant execute on function public.cancel_customer_reservation(uuid, text) to authenticated;
grant execute on function public.reschedule_customer_reservation(uuid, uuid, text) to authenticated;

commit;
