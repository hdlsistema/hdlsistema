begin;

alter table public.reservations add column if not exists source text not null default 'app';
alter table public.reservations add column if not exists booking_channel text;
alter table public.reservations add column if not exists created_by_admin uuid references auth.users(id) on delete set null;
alter table public.reservations add column if not exists updated_by_admin uuid references auth.users(id) on delete set null;
alter table public.reservations add column if not exists rescheduled_from_reservation_id uuid references public.reservations(id) on delete set null;
alter table public.reservations add column if not exists rescheduled_at timestamptz;
alter table public.reservations add column if not exists cancelled_by uuid references auth.users(id) on delete set null;
alter table public.reservations add column if not exists operational_status text not null default 'active';
alter table public.reservations add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.experience_slots add column if not exists is_bookable boolean not null default true;
alter table public.experience_slots add column if not exists operational_status text not null default 'open';
alter table public.experience_slots add column if not exists blocked_reason text;
alter table public.experience_slots add column if not exists confirmed_count integer not null default 0;
alter table public.experience_slots add column if not exists waitlist_count integer not null default 0;
alter table public.experience_slots add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.experience_slots add column if not exists updated_by uuid references auth.users(id) on delete set null;
alter table public.experience_slots add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.experience_blockouts add column if not exists block_type text not null default 'manual';
alter table public.experience_blockouts add column if not exists applies_to_all_experiences boolean not null default false;
alter table public.experience_blockouts add column if not exists updated_by uuid references auth.users(id) on delete set null;
alter table public.experience_blockouts add column if not exists updated_at timestamptz not null default now();
alter table public.experience_blockouts add column if not exists metadata jsonb not null default '{}'::jsonb;

update public.experience_slots
set confirmed_count = reserved_count
where confirmed_count = 0 and reserved_count > 0;

create index if not exists idx_reservations_source on public.reservations(source);
create index if not exists idx_reservations_created_at_desc on public.reservations(created_at desc);
create index if not exists idx_reservations_rescheduled_from on public.reservations(rescheduled_from_reservation_id);
create index if not exists idx_experience_slots_operational_status on public.experience_slots(operational_status);
create index if not exists idx_experience_slots_bookable_range on public.experience_slots(experience_id, start_at, operational_status, is_bookable);
create index if not exists idx_experience_blockouts_range on public.experience_blockouts(start_at, end_at);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'reservations_people_positive') then
    alter table public.reservations add constraint reservations_people_positive check (people_count > 0);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'reservations_operational_status_valid') then
    alter table public.reservations add constraint reservations_operational_status_valid
    check (operational_status in ('active', 'cancelled', 'completed', 'no_show'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'experience_slots_confirmed_count_check') then
    alter table public.experience_slots add constraint experience_slots_confirmed_count_check
    check (confirmed_count >= 0 and confirmed_count <= capacity);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'experience_slots_waitlist_count_check') then
    alter table public.experience_slots add constraint experience_slots_waitlist_count_check
    check (waitlist_count >= 0);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'experience_slots_operational_status_valid') then
    alter table public.experience_slots add constraint experience_slots_operational_status_valid
    check (operational_status in ('open', 'blocked', 'closed'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'experience_blockouts_block_type_valid') then
    alter table public.experience_blockouts add constraint experience_blockouts_block_type_valid
    check (block_type in ('manual', 'maintenance', 'private_event', 'weather', 'operations', 'other'));
  end if;
end $$;

create or replace function public.can_operate_reservations(p_actor_id uuid, p_allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = p_actor_id
      and r.code::text = any(p_allowed_roles)
  );
$$;

create or replace function public.current_reservation_operator(p_allowed_roles text[])
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := auth.uid();
begin
  if v_actor_id is null or not public.can_operate_reservations(v_actor_id, p_allowed_roles) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  return v_actor_id;
end;
$$;

create or replace function public.ensure_admin_customer(
  p_customer_id uuid,
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_source text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_id uuid;
  v_name text := nullif(trim(coalesce(p_customer_name, '')), '');
  v_email text := nullif(trim(lower(coalesce(p_customer_email, ''))), '');
  v_phone text := nullif(trim(coalesce(p_customer_phone, '')), '');
  v_first_name text;
  v_last_name text;
begin
  if p_customer_id is not null then
    select id into v_customer_id from public.customers where id = p_customer_id;
    if v_customer_id is null then
      raise exception 'CUSTOMER_NOT_FOUND' using errcode = 'P0001';
    end if;
    return v_customer_id;
  end if;

  if v_email is not null then
    select id into v_customer_id from public.customers where lower(email::text) = v_email limit 1;
    if v_customer_id is not null then
      update public.customers
      set phone = coalesce(v_phone, phone),
          source = coalesce(nullif(p_source, ''), source),
          updated_at = now()
      where id = v_customer_id;
      return v_customer_id;
    end if;
  end if;

  if v_name is null or v_email is null then
    raise exception 'CUSTOMER_REQUIRED' using errcode = 'P0001';
  end if;

  v_first_name := split_part(v_name, ' ', 1);
  v_last_name := nullif(trim(replace(v_name, v_first_name, '')), '');

  insert into public.customers (
    customer_number,
    first_name,
    last_name,
    email,
    phone,
    source,
    status
  )
  values (
    'CUST-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
    v_first_name,
    coalesce(v_last_name, 'Sin apellido'),
    v_email,
    v_phone,
    coalesce(nullif(p_source, ''), 'Centro de control'),
    'published'
  )
  returning id into v_customer_id;

  return v_customer_id;
end;
$$;

create or replace function public.log_reservation_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.reservation_status_history (
      reservation_id,
      previous_status,
      new_status,
      changed_by,
      notes
    )
    values (
      new.id,
      null,
      new.status,
      coalesce(new.updated_by_admin, new.created_by_admin),
      'Creación de reservación'
    );
  elsif new.status is distinct from old.status then
    insert into public.reservation_status_history (
      reservation_id,
      previous_status,
      new_status,
      changed_by,
      notes
    )
    values (
      new.id,
      old.status,
      new.status,
      coalesce(new.updated_by_admin, new.created_by_admin),
      'Cambio de estado'
    );
  end if;
  return new;
end;
$$;

create or replace function public.create_experience_slot(
  p_experience_id uuid,
  p_start_at timestamptz,
  p_end_at timestamptz,
  p_capacity integer,
  p_price_override numeric default null,
  p_notes text default null,
  p_is_bookable boolean default true,
  p_operational_status text default 'open',
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slot_id uuid;
  v_actor_id uuid;
begin
  v_actor_id := public.current_reservation_operator(array['super_admin','admin','operations']);

  if p_capacity < 1 or p_end_at <= p_start_at then
    raise exception 'INVALID_SLOT' using errcode = 'P0001';
  end if;

  if not exists (select 1 from public.experiences where id = p_experience_id and deleted_at is null) then
    raise exception 'EXPERIENCE_NOT_FOUND' using errcode = 'P0001';
  end if;

  insert into public.experience_slots (
    experience_id,
    start_at,
    end_at,
    capacity,
    price_override,
    status,
    notes,
    is_bookable,
    operational_status,
    created_by,
    updated_by,
    metadata
  )
  values (
    p_experience_id,
    p_start_at,
    p_end_at,
    p_capacity,
    p_price_override,
    case when p_operational_status = 'open' and p_is_bookable then 'published'::public.content_status else 'inactive'::public.content_status end,
    p_notes,
    p_is_bookable,
    p_operational_status,
    v_actor_id,
    v_actor_id,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_slot_id;

  return v_slot_id;
end;
$$;

create or replace function public.update_experience_slot(
  p_slot_id uuid,
  p_start_at timestamptz default null,
  p_end_at timestamptz default null,
  p_capacity integer default null,
  p_price_override numeric default null,
  p_notes text default null,
  p_is_bookable boolean default null,
  p_operational_status text default null,
  p_metadata jsonb default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slot public.experience_slots%rowtype;
  v_capacity integer;
  v_start_at timestamptz;
  v_end_at timestamptz;
  v_status text;
  v_bookable boolean;
  v_actor_id uuid;
begin
  v_actor_id := public.current_reservation_operator(array['super_admin','admin','operations']);

  select * into v_slot from public.experience_slots where id = p_slot_id for update;
  if v_slot.id is null then
    raise exception 'SLOT_NOT_FOUND' using errcode = 'P0001';
  end if;

  v_capacity := coalesce(p_capacity, v_slot.capacity);
  v_start_at := coalesce(p_start_at, v_slot.start_at);
  v_end_at := coalesce(p_end_at, v_slot.end_at);
  v_status := coalesce(p_operational_status, v_slot.operational_status);
  v_bookable := coalesce(p_is_bookable, v_slot.is_bookable);

  if v_capacity < 1 or v_capacity < v_slot.confirmed_count or v_end_at <= v_start_at then
    raise exception 'INVALID_SLOT' using errcode = 'P0001';
  end if;

  update public.experience_slots
  set start_at = v_start_at,
      end_at = v_end_at,
      capacity = v_capacity,
      price_override = p_price_override,
      notes = p_notes,
      is_bookable = v_bookable,
      operational_status = v_status,
      status = case when v_status = 'open' and v_bookable then 'published'::public.content_status else 'inactive'::public.content_status end,
      updated_by = v_actor_id,
      metadata = coalesce(p_metadata, metadata),
      updated_at = now()
  where id = p_slot_id;

  return p_slot_id;
end;
$$;

create or replace function public.block_experience_slot(
  p_slot_id uuid,
  p_reason text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid;
begin
  v_actor_id := public.current_reservation_operator(array['super_admin','admin','operations']);

  update public.experience_slots
  set is_bookable = false,
      operational_status = 'blocked',
      blocked_reason = p_reason,
      status = 'inactive',
      updated_by = v_actor_id,
      updated_at = now()
  where id = p_slot_id;

  if not found then
    raise exception 'SLOT_NOT_FOUND' using errcode = 'P0001';
  end if;

  return p_slot_id;
end;
$$;

create or replace function public.unblock_experience_slot(
  p_slot_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid;
begin
  v_actor_id := public.current_reservation_operator(array['super_admin','admin','operations']);

  update public.experience_slots
  set is_bookable = true,
      operational_status = 'open',
      blocked_reason = null,
      status = 'published',
      updated_by = v_actor_id,
      updated_at = now()
  where id = p_slot_id;

  if not found then
    raise exception 'SLOT_NOT_FOUND' using errcode = 'P0001';
  end if;

  return p_slot_id;
end;
$$;

create or replace function public.create_reservation_admin(
  p_customer_id uuid default null,
  p_customer_name text default null,
  p_customer_email text default null,
  p_customer_phone text default null,
  p_experience_slot_id uuid default null,
  p_people_count integer default 1,
  p_status public.reservation_status default 'pending',
  p_customer_notes text default null,
  p_internal_notes text default null,
  p_source text default 'Centro de control',
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slot public.experience_slots%rowtype;
  v_experience public.experiences%rowtype;
  v_customer_id uuid;
  v_reservation_id uuid;
  v_total numeric(12,2);
  v_actor_id uuid;
begin
  v_actor_id := public.current_reservation_operator(array['super_admin','admin','operations']);

  if p_people_count < 1 then
    raise exception 'INVALID_PEOPLE_COUNT' using errcode = 'P0001';
  end if;

  if p_status not in ('pending', 'confirmed') then
    raise exception 'INVALID_INITIAL_STATUS' using errcode = 'P0001';
  end if;

  select * into v_slot
  from public.experience_slots
  where id = p_experience_slot_id
  for update;

  if v_slot.id is null then
    raise exception 'SLOT_NOT_FOUND' using errcode = 'P0001';
  end if;

  select * into v_experience from public.experiences where id = v_slot.experience_id;

  if p_status = 'confirmed' then
    if not v_slot.is_bookable or v_slot.operational_status <> 'open' or v_slot.status <> 'published' then
      raise exception 'SLOT_NOT_BOOKABLE' using errcode = 'P0001';
    end if;

    if v_slot.confirmed_count + p_people_count > v_slot.capacity then
      raise exception 'CAPACITY_EXCEEDED' using errcode = 'P0001';
    end if;
  end if;

  v_customer_id := public.ensure_admin_customer(
    p_customer_id,
    p_customer_name,
    p_customer_email,
    p_customer_phone,
    p_source
  );

  v_total := coalesce(v_slot.price_override, v_experience.base_price, 0) * p_people_count;

  insert into public.reservations (
    reservation_number,
    customer_id,
    reservation_type,
    experience_id,
    experience_slot_id,
    people_count,
    subtotal,
    total,
    status,
    customer_notes,
    internal_notes,
    source,
    booking_channel,
    created_by_admin,
    updated_by_admin,
    confirmed_at,
    operational_status,
    metadata
  )
  values (
    'RES-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
    v_customer_id,
    'experience',
    v_slot.experience_id,
    v_slot.id,
    p_people_count,
    v_total,
    v_total,
    p_status,
    p_customer_notes,
    p_internal_notes,
    coalesce(nullif(p_source, ''), 'Centro de control'),
    coalesce(nullif(p_source, ''), 'Centro de control'),
    v_actor_id,
    v_actor_id,
    case when p_status = 'confirmed' then now() else null end,
    'active',
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_reservation_id;

  if p_status = 'confirmed' then
    update public.experience_slots
    set reserved_count = reserved_count + p_people_count,
        confirmed_count = confirmed_count + p_people_count,
        updated_by = v_actor_id,
        updated_at = now()
    where id = v_slot.id;
  end if;

  return v_reservation_id;
end;
$$;

create or replace function public.confirm_reservation(
  p_reservation_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reservation public.reservations%rowtype;
  v_slot public.experience_slots%rowtype;
  v_actor_id uuid;
begin
  v_actor_id := public.current_reservation_operator(array['super_admin','admin','operations']);

  select * into v_reservation from public.reservations where id = p_reservation_id for update;
  if v_reservation.id is null then
    raise exception 'RESERVATION_NOT_FOUND' using errcode = 'P0001';
  end if;

  if v_reservation.status = 'confirmed' then
    return p_reservation_id;
  end if;

  if v_reservation.status <> 'pending' then
    raise exception 'INVALID_STATUS_TRANSITION' using errcode = 'P0001';
  end if;

  select * into v_slot from public.experience_slots where id = v_reservation.experience_slot_id for update;
  if v_slot.id is null then
    raise exception 'SLOT_NOT_FOUND' using errcode = 'P0001';
  end if;

  if not v_slot.is_bookable or v_slot.operational_status <> 'open' or v_slot.confirmed_count + v_reservation.people_count > v_slot.capacity then
    raise exception 'CAPACITY_EXCEEDED' using errcode = 'P0001';
  end if;

  update public.experience_slots
  set reserved_count = reserved_count + v_reservation.people_count,
      confirmed_count = confirmed_count + v_reservation.people_count,
      updated_by = v_actor_id,
      updated_at = now()
  where id = v_slot.id;

  update public.reservations
  set status = 'confirmed',
      confirmed_at = coalesce(confirmed_at, now()),
      updated_by_admin = v_actor_id,
      operational_status = 'active',
      updated_at = now()
  where id = p_reservation_id;

  return p_reservation_id;
end;
$$;

create or replace function public.cancel_reservation(
  p_reservation_id uuid,
  p_reason text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reservation public.reservations%rowtype;
  v_actor_id uuid;
begin
  v_actor_id := public.current_reservation_operator(array['super_admin','admin','operations']);

  select * into v_reservation from public.reservations where id = p_reservation_id for update;
  if v_reservation.id is null then
    raise exception 'RESERVATION_NOT_FOUND' using errcode = 'P0001';
  end if;

  if v_reservation.status = 'cancelled' then
    return p_reservation_id;
  end if;

  if v_reservation.status not in ('pending', 'confirmed') then
    raise exception 'INVALID_STATUS_TRANSITION' using errcode = 'P0001';
  end if;

  if v_reservation.status = 'confirmed' and v_reservation.experience_slot_id is not null then
    update public.experience_slots
    set reserved_count = greatest(reserved_count - v_reservation.people_count, 0),
        confirmed_count = greatest(confirmed_count - v_reservation.people_count, 0),
        updated_by = v_actor_id,
        updated_at = now()
    where id = v_reservation.experience_slot_id;
  end if;

  update public.reservations
  set status = 'cancelled',
      cancelled_at = coalesce(cancelled_at, now()),
      cancellation_reason = coalesce(p_reason, cancellation_reason),
      cancelled_by = v_actor_id,
      updated_by_admin = v_actor_id,
      operational_status = 'cancelled',
      updated_at = now()
  where id = p_reservation_id;

  return p_reservation_id;
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
  v_delta integer;
  v_unit_price numeric(12,2);
  v_total numeric(12,2);
  v_actor_id uuid;
begin
  v_actor_id := public.current_reservation_operator(array['super_admin','admin','operations']);

  if p_people_count < 1 then
    raise exception 'INVALID_PEOPLE_COUNT' using errcode = 'P0001';
  end if;

  select * into v_reservation from public.reservations where id = p_reservation_id for update;
  if v_reservation.id is null then
    raise exception 'RESERVATION_NOT_FOUND' using errcode = 'P0001';
  end if;

  if v_reservation.status not in ('pending', 'confirmed') then
    raise exception 'INVALID_STATUS_TRANSITION' using errcode = 'P0001';
  end if;

  select * into v_slot from public.experience_slots where id = v_reservation.experience_slot_id for update;
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

  insert into public.reservation_status_history (reservation_id, previous_status, new_status, changed_by, notes)
  values (p_reservation_id, v_reservation.status, v_reservation.status, v_actor_id, 'Cambio de número de personas');

  return p_reservation_id;
end;
$$;

create or replace function public.reschedule_reservation(
  p_reservation_id uuid,
  p_new_slot_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reservation public.reservations%rowtype;
  v_old_slot public.experience_slots%rowtype;
  v_new_slot public.experience_slots%rowtype;
  v_actor_id uuid;
begin
  v_actor_id := public.current_reservation_operator(array['super_admin','admin','operations']);

  select * into v_reservation from public.reservations where id = p_reservation_id for update;
  if v_reservation.id is null then
    raise exception 'RESERVATION_NOT_FOUND' using errcode = 'P0001';
  end if;

  if v_reservation.status not in ('pending', 'confirmed') then
    raise exception 'INVALID_STATUS_TRANSITION' using errcode = 'P0001';
  end if;

  if v_reservation.experience_slot_id = p_new_slot_id then
    return p_reservation_id;
  end if;

  select * into v_new_slot from public.experience_slots where id = p_new_slot_id for update;
  if v_new_slot.id is null then
    raise exception 'SLOT_NOT_FOUND' using errcode = 'P0001';
  end if;

  if not v_new_slot.is_bookable or v_new_slot.operational_status <> 'open' or v_new_slot.status <> 'published' then
    raise exception 'SLOT_NOT_BOOKABLE' using errcode = 'P0001';
  end if;

  if v_reservation.status = 'confirmed' and v_new_slot.confirmed_count + v_reservation.people_count > v_new_slot.capacity then
    raise exception 'CAPACITY_EXCEEDED' using errcode = 'P0001';
  end if;

  if v_reservation.status = 'confirmed' and v_reservation.experience_slot_id is not null then
    select * into v_old_slot from public.experience_slots where id = v_reservation.experience_slot_id for update;

    update public.experience_slots
    set reserved_count = greatest(reserved_count - v_reservation.people_count, 0),
        confirmed_count = greatest(confirmed_count - v_reservation.people_count, 0),
        updated_by = v_actor_id,
        updated_at = now()
    where id = v_old_slot.id;

    update public.experience_slots
    set reserved_count = reserved_count + v_reservation.people_count,
        confirmed_count = confirmed_count + v_reservation.people_count,
        updated_by = v_actor_id,
        updated_at = now()
    where id = v_new_slot.id;
  end if;

  update public.reservations
  set experience_slot_id = p_new_slot_id,
      experience_id = v_new_slot.experience_id,
      rescheduled_from_reservation_id = coalesce(rescheduled_from_reservation_id, id),
      rescheduled_at = now(),
      updated_by_admin = v_actor_id,
      updated_at = now()
  where id = p_reservation_id;

  insert into public.reservation_status_history (reservation_id, previous_status, new_status, changed_by, notes)
  values (p_reservation_id, v_reservation.status, v_reservation.status, v_actor_id, 'Reprogramación de reservación');

  return p_reservation_id;
end;
$$;

drop policy if exists reservation_status_history_customer_read on public.reservation_status_history;
create policy reservation_status_history_customer_read on public.reservation_status_history
for select to authenticated using (
  exists (
    select 1 from public.reservations r
    where r.id = reservation_id
      and (r.user_id = auth.uid() or r.customer_id = public.current_customer_id())
  )
);

revoke all on function public.current_reservation_operator(text[]) from public, anon;
revoke all on function public.create_experience_slot(uuid, timestamptz, timestamptz, integer, numeric, text, boolean, text, jsonb) from public, anon;
revoke all on function public.update_experience_slot(uuid, timestamptz, timestamptz, integer, numeric, text, boolean, text, jsonb) from public, anon;
revoke all on function public.block_experience_slot(uuid, text) from public, anon;
revoke all on function public.unblock_experience_slot(uuid) from public, anon;
revoke all on function public.create_reservation_admin(uuid, text, text, text, uuid, integer, public.reservation_status, text, text, text, jsonb) from public, anon;
revoke all on function public.confirm_reservation(uuid) from public, anon;
revoke all on function public.cancel_reservation(uuid, text) from public, anon;
revoke all on function public.update_reservation_people(uuid, integer) from public, anon;
revoke all on function public.reschedule_reservation(uuid, uuid) from public, anon;

grant execute on function public.current_reservation_operator(text[]) to authenticated;
grant execute on function public.create_experience_slot(uuid, timestamptz, timestamptz, integer, numeric, text, boolean, text, jsonb) to authenticated;
grant execute on function public.update_experience_slot(uuid, timestamptz, timestamptz, integer, numeric, text, boolean, text, jsonb) to authenticated;
grant execute on function public.block_experience_slot(uuid, text) to authenticated;
grant execute on function public.unblock_experience_slot(uuid) to authenticated;
grant execute on function public.create_reservation_admin(uuid, text, text, text, uuid, integer, public.reservation_status, text, text, text, jsonb) to authenticated;
grant execute on function public.confirm_reservation(uuid) to authenticated;
grant execute on function public.cancel_reservation(uuid, text) to authenticated;
grant execute on function public.update_reservation_people(uuid, integer) to authenticated;
grant execute on function public.reschedule_reservation(uuid, uuid) to authenticated;

commit;
