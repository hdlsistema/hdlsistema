begin;

create extension if not exists btree_gist;

insert into storage.buckets (id, name, public)
values
  ('cabins', 'cabins', true),
  ('restaurants', 'restaurants', true),
  ('venues', 'venues', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists public_bucket_read on storage.objects;
create policy public_bucket_read on storage.objects
for select to anon, authenticated
using (bucket_id in ('brand', 'wines', 'events', 'experiences', 'promotions', 'cabins', 'restaurants', 'venues'));

create table if not exists public.lodging_units (
  id uuid primary key default gen_random_uuid(),
  cabin_package_id uuid references public.cabin_packages(id) on delete set null,
  code text not null unique,
  name text not null,
  description text,
  capacity integer not null default 2,
  base_rate numeric(12,2) not null default 0,
  currency char(3) not null default 'MXN',
  operational_status text not null default 'active',
  housekeeping_status text not null default 'clean',
  cover_image_url text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lodging_units_capacity_positive check (capacity > 0),
  constraint lodging_units_rate_non_negative check (base_rate >= 0),
  constraint lodging_units_operational_status_valid check (operational_status in ('active','inactive','maintenance')),
  constraint lodging_units_housekeeping_status_valid check (housekeeping_status in ('clean','dirty','inspection','out_of_service'))
);

create table if not exists public.lodging_calendar_entries (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references public.lodging_units(id) on delete cascade,
  reservation_id uuid references public.reservations(id) on delete cascade,
  entry_type text not null,
  start_date date not null,
  end_date date not null,
  status text not null default 'active',
  expires_at timestamptz,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  released_by uuid references auth.users(id) on delete set null,
  released_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lodging_calendar_dates_valid check (end_date > start_date),
  constraint lodging_calendar_type_valid check (entry_type in ('hold','reservation','maintenance','owner_block','private_event','operations','other')),
  constraint lodging_calendar_status_valid check (status in ('active','released','expired','cancelled'))
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'lodging_calendar_no_overlap') then
    alter table public.lodging_calendar_entries
      add constraint lodging_calendar_no_overlap
      exclude using gist (
        unit_id with =,
        daterange(start_date, end_date, '[)') with &&
      ) where (status = 'active');
  end if;
end $$;

create table if not exists public.lodging_stays (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null unique references public.reservations(id) on delete cascade,
  calendar_entry_id uuid not null unique references public.lodging_calendar_entries(id) on delete cascade,
  unit_id uuid not null references public.lodging_units(id) on delete restrict,
  planned_check_in date not null,
  planned_check_out date not null,
  status text not null default 'held',
  guest_manifest jsonb not null default '[]'::jsonb,
  actual_check_in_at timestamptz,
  actual_check_out_at timestamptz,
  check_in_notes text,
  check_out_notes text,
  assigned_by uuid references auth.users(id) on delete set null,
  checked_in_by uuid references auth.users(id) on delete set null,
  checked_out_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lodging_stays_dates_valid check (planned_check_out > planned_check_in),
  constraint lodging_stays_status_valid check (status in ('held','reserved','checked_in','checked_out','cancelled','no_show','expired'))
);

create index if not exists idx_lodging_units_package on public.lodging_units(cabin_package_id);
create index if not exists idx_lodging_units_operation on public.lodging_units(operational_status, housekeeping_status);
create index if not exists idx_lodging_calendar_range on public.lodging_calendar_entries(unit_id, start_date, end_date) where status = 'active';
create index if not exists idx_lodging_calendar_reservation on public.lodging_calendar_entries(reservation_id);
create index if not exists idx_lodging_stays_status on public.lodging_stays(status, planned_check_in, planned_check_out);

drop trigger if exists set_lodging_units_updated_at on public.lodging_units;
create trigger set_lodging_units_updated_at before update on public.lodging_units
for each row execute function public.set_updated_at();

drop trigger if exists set_lodging_calendar_updated_at on public.lodging_calendar_entries;
create trigger set_lodging_calendar_updated_at before update on public.lodging_calendar_entries
for each row execute function public.set_updated_at();

drop trigger if exists set_lodging_stays_updated_at on public.lodging_stays;
create trigger set_lodging_stays_updated_at before update on public.lodging_stays
for each row execute function public.set_updated_at();

alter table public.lodging_units enable row level security;
alter table public.lodging_calendar_entries enable row level security;
alter table public.lodging_stays enable row level security;

drop policy if exists lodging_units_admin_all on public.lodging_units;
drop policy if exists lodging_units_read on public.lodging_units;
drop policy if exists lodging_units_write on public.lodging_units;
create policy lodging_units_read on public.lodging_units for select to authenticated
using (public.can_operate_reservations(auth.uid(), array['super_admin','admin','operations','marketing','finance','viewer']));
create policy lodging_units_write on public.lodging_units for all to authenticated
using (public.can_operate_reservations(auth.uid(), array['super_admin','admin','operations']))
with check (public.can_operate_reservations(auth.uid(), array['super_admin','admin','operations']));

drop policy if exists lodging_calendar_admin_all on public.lodging_calendar_entries;
drop policy if exists lodging_calendar_read on public.lodging_calendar_entries;
drop policy if exists lodging_calendar_write on public.lodging_calendar_entries;
create policy lodging_calendar_read on public.lodging_calendar_entries for select to authenticated
using (public.can_operate_reservations(auth.uid(), array['super_admin','admin','operations','marketing','finance','viewer']));
create policy lodging_calendar_write on public.lodging_calendar_entries for all to authenticated
using (public.can_operate_reservations(auth.uid(), array['super_admin','admin','operations']))
with check (public.can_operate_reservations(auth.uid(), array['super_admin','admin','operations']));

drop policy if exists lodging_stays_admin_all on public.lodging_stays;
drop policy if exists lodging_stays_read on public.lodging_stays;
drop policy if exists lodging_stays_write on public.lodging_stays;
create policy lodging_stays_read on public.lodging_stays for select to authenticated
using (public.can_operate_reservations(auth.uid(), array['super_admin','admin','operations','marketing','finance','viewer']));
create policy lodging_stays_write on public.lodging_stays for all to authenticated
using (public.can_operate_reservations(auth.uid(), array['super_admin','admin','operations']))
with check (public.can_operate_reservations(auth.uid(), array['super_admin','admin','operations']));

create or replace function public.release_expired_lodging_holds()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  with expired as (
    update public.lodging_calendar_entries
    set status = 'expired', released_at = now(), updated_at = now()
    where status = 'active' and entry_type = 'hold' and expires_at is not null and expires_at <= now()
    returning id
  )
  select count(*) into v_count from expired;

  update public.lodging_stays s
  set status = 'expired', updated_at = now()
  from public.lodging_calendar_entries e
  where s.calendar_entry_id = e.id and e.status = 'expired' and s.status = 'held';

  return v_count;
end;
$$;

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
  v_total numeric(12,2);
  v_entry_type text;
  v_expires_at timestamptz;
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

  select * into v_package from public.cabin_packages
  where id = p_cabin_package_id and deleted_at is null and status not in ('archived','inactive');
  if v_package.id is null then
    raise exception 'CABIN_PACKAGE_NOT_FOUND' using errcode = 'P0001';
  end if;
  if p_people_count < v_package.min_guests or p_people_count > v_package.max_guests then
    raise exception 'INVALID_PEOPLE_COUNT' using errcode = 'P0001';
  end if;

  if p_idempotency_key is not null then
    select id into v_reservation_id from public.reservations
    where user_id is not distinct from p_user_id and idempotency_key = p_idempotency_key
    limit 1;
    if v_reservation_id is not null then return v_reservation_id; end if;
  end if;

  v_total := coalesce(v_package.price, 0);
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
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object('lodgingInventory', true)
  ) returning id into v_reservation_id;

  v_entry_type := case when p_status = 'confirmed' then 'reservation' else 'hold' end;
  v_expires_at := case when p_status = 'pending' then now() + make_interval(mins => greatest(coalesce(p_hold_minutes, 120), 15)) else null end;

  for v_candidate in
    select u.* from public.lodging_units u
    where u.operational_status = 'active'
      and u.housekeeping_status <> 'out_of_service'
      and u.capacity >= p_people_count
      and (u.cabin_package_id = p_cabin_package_id or u.cabin_package_id is null)
      and (p_unit_id is null or u.id = p_unit_id)
    order by case when u.id = p_unit_id then 0 else 1 end, u.code
    for update skip locked
  loop
    begin
      insert into public.lodging_calendar_entries (
        unit_id, reservation_id, entry_type, start_date, end_date, status,
        expires_at, reason, metadata, created_by
      ) values (
        v_candidate.id, v_reservation_id, v_entry_type, p_check_in, p_check_out, 'active',
        v_expires_at, case when v_entry_type = 'hold' then 'Reserva pendiente de confirmación' else 'Reservación confirmada' end,
        jsonb_build_object('source', p_source), p_actor_id
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

create or replace function public.create_lodging_reservation_admin(
  p_customer_id uuid,
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_cabin_package_id uuid,
  p_unit_id uuid,
  p_check_in date,
  p_check_out date,
  p_people_count integer,
  p_status public.reservation_status default 'pending',
  p_source text default 'Centro de control',
  p_customer_notes text default null,
  p_internal_notes text default null,
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
  v_customer_id uuid;
begin
  v_actor_id := public.current_reservation_operator(array['super_admin','admin','operations']);
  v_customer_id := public.ensure_admin_customer(p_customer_id, p_customer_name, p_customer_email, p_customer_phone, p_source);
  return public.create_lodging_reservation_core(
    v_customer_id, null, p_cabin_package_id, p_unit_id, p_check_in, p_check_out,
    p_people_count, p_status, p_source, p_customer_notes, p_internal_notes,
    p_idempotency_key, v_actor_id, 120, p_metadata
  );
end;
$$;

create or replace function public.create_lodging_reservation_customer(
  p_user_id uuid,
  p_cabin_package_id uuid,
  p_check_in date,
  p_check_out date,
  p_people_count integer,
  p_customer_notes text,
  p_idempotency_key text,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_id uuid;
begin
  select id into v_customer_id from public.customers where user_id = p_user_id;
  if v_customer_id is null then raise exception 'CUSTOMER_PROFILE_REQUIRED' using errcode = 'P0001'; end if;
  return public.create_lodging_reservation_core(
    v_customer_id, p_user_id, p_cabin_package_id, null, p_check_in, p_check_out,
    p_people_count, 'pending', 'app', p_customer_notes, null,
    p_idempotency_key, null, 120, p_metadata || jsonb_build_object('bookingMode', 'TIMED_HOLD')
  );
end;
$$;

create or replace function public.block_lodging_unit(
  p_unit_id uuid,
  p_start_date date,
  p_end_date date,
  p_entry_type text,
  p_reason text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid;
  v_entry_id uuid;
begin
  v_actor_id := public.current_reservation_operator(array['super_admin','admin','operations']);
  perform public.release_expired_lodging_holds();
  if p_entry_type not in ('maintenance','owner_block','private_event','operations','other') then
    raise exception 'INVALID_BLOCK_TYPE' using errcode = 'P0001';
  end if;
  insert into public.lodging_calendar_entries (
    unit_id, entry_type, start_date, end_date, reason, status, created_by
  ) values (p_unit_id, p_entry_type, p_start_date, p_end_date, p_reason, 'active', v_actor_id)
  returning id into v_entry_id;
  return v_entry_id;
exception when exclusion_violation then
  raise exception 'LODGING_UNAVAILABLE' using errcode = 'P0001';
end;
$$;

create or replace function public.check_in_lodging_stay(
  p_reservation_id uuid,
  p_guest_manifest jsonb default '[]'::jsonb,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid;
  v_stay public.lodging_stays%rowtype;
begin
  v_actor_id := public.current_reservation_operator(array['super_admin','admin','operations']);
  perform public.release_expired_lodging_holds();
  select * into v_stay from public.lodging_stays where reservation_id = p_reservation_id for update;
  if v_stay.id is null then raise exception 'LODGING_STAY_NOT_FOUND' using errcode = 'P0001'; end if;
  if v_stay.status not in ('held','reserved') then raise exception 'INVALID_STATUS_TRANSITION' using errcode = 'P0001'; end if;
  if current_date < v_stay.planned_check_in or current_date >= v_stay.planned_check_out then
    raise exception 'LODGING_CHECKIN_NOT_DUE' using errcode = 'P0001';
  end if;

  update public.lodging_calendar_entries set entry_type = 'reservation', expires_at = null, updated_at = now()
  where id = v_stay.calendar_entry_id and status = 'active';
  update public.lodging_stays set status = 'checked_in', guest_manifest = coalesce(p_guest_manifest, '[]'::jsonb),
    actual_check_in_at = now(), check_in_notes = p_notes, checked_in_by = v_actor_id, updated_at = now()
  where id = v_stay.id;
  update public.reservations set status = 'confirmed', confirmed_at = coalesce(confirmed_at, now()), updated_by_admin = v_actor_id, updated_at = now()
  where id = p_reservation_id;
  update public.lodging_units set housekeeping_status = 'clean', updated_by = v_actor_id, updated_at = now() where id = v_stay.unit_id;
  return v_stay.id;
end;
$$;

create or replace function public.check_out_lodging_stay(
  p_reservation_id uuid,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid;
  v_stay public.lodging_stays%rowtype;
begin
  v_actor_id := public.current_reservation_operator(array['super_admin','admin','operations']);
  select * into v_stay from public.lodging_stays where reservation_id = p_reservation_id for update;
  if v_stay.id is null then raise exception 'LODGING_STAY_NOT_FOUND' using errcode = 'P0001'; end if;
  if v_stay.status <> 'checked_in' then raise exception 'INVALID_STATUS_TRANSITION' using errcode = 'P0001'; end if;

  update public.lodging_calendar_entries set status = 'released', released_by = v_actor_id, released_at = now(), updated_at = now()
  where id = v_stay.calendar_entry_id;
  update public.lodging_stays set status = 'checked_out', actual_check_out_at = now(), check_out_notes = p_notes,
    checked_out_by = v_actor_id, updated_at = now() where id = v_stay.id;
  update public.reservations set status = 'completed', operational_status = 'completed', updated_by_admin = v_actor_id, updated_at = now()
  where id = p_reservation_id;
  update public.lodging_units set housekeeping_status = 'dirty', updated_by = v_actor_id, updated_at = now() where id = v_stay.unit_id;
  return v_stay.id;
end;
$$;

create or replace function public.confirm_reservation(p_reservation_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reservation public.reservations%rowtype;
  v_slot public.experience_slots%rowtype;
  v_stay public.lodging_stays%rowtype;
  v_entry public.lodging_calendar_entries%rowtype;
  v_actor_id uuid;
begin
  v_actor_id := public.current_reservation_operator(array['super_admin','admin','operations']);
  select * into v_reservation from public.reservations where id = p_reservation_id for update;
  if v_reservation.id is null then raise exception 'RESERVATION_NOT_FOUND' using errcode = 'P0001'; end if;
  if v_reservation.status = 'confirmed' then return p_reservation_id; end if;
  if v_reservation.status <> 'pending' then raise exception 'INVALID_STATUS_TRANSITION' using errcode = 'P0001'; end if;

  if v_reservation.reservation_type = 'cabin' then
    perform public.release_expired_lodging_holds();
    select * into v_stay from public.lodging_stays where reservation_id = p_reservation_id for update;
    if v_stay.id is null or v_stay.status = 'expired' then raise exception 'LODGING_HOLD_EXPIRED' using errcode = 'P0001'; end if;
    select * into v_entry from public.lodging_calendar_entries where id = v_stay.calendar_entry_id for update;
    if v_entry.status <> 'active' then raise exception 'LODGING_UNAVAILABLE' using errcode = 'P0001'; end if;
    update public.lodging_calendar_entries set entry_type = 'reservation', expires_at = null, updated_at = now() where id = v_entry.id;
    update public.lodging_stays set status = 'reserved', updated_at = now() where id = v_stay.id;
  elsif v_reservation.experience_slot_id is not null then
    select * into v_slot from public.experience_slots where id = v_reservation.experience_slot_id for update;
    if v_slot.id is null then raise exception 'SLOT_NOT_FOUND' using errcode = 'P0001'; end if;
    if not v_slot.is_bookable or v_slot.operational_status <> 'open' or v_slot.confirmed_count + v_reservation.people_count > v_slot.capacity then
      raise exception 'CAPACITY_EXCEEDED' using errcode = 'P0001';
    end if;
    update public.experience_slots set reserved_count = reserved_count + v_reservation.people_count,
      confirmed_count = confirmed_count + v_reservation.people_count, updated_by = v_actor_id, updated_at = now()
    where id = v_slot.id;
  end if;

  update public.reservations set status = 'confirmed', confirmed_at = coalesce(confirmed_at, now()),
    updated_by_admin = v_actor_id, operational_status = 'active', updated_at = now()
  where id = p_reservation_id;
  return p_reservation_id;
end;
$$;

create or replace function public.cancel_reservation(p_reservation_id uuid, p_reason text default null)
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
  if v_reservation.id is null then raise exception 'RESERVATION_NOT_FOUND' using errcode = 'P0001'; end if;
  if v_reservation.status = 'cancelled' then return p_reservation_id; end if;
  if v_reservation.status not in ('pending','confirmed') then raise exception 'INVALID_STATUS_TRANSITION' using errcode = 'P0001'; end if;

  if v_reservation.reservation_type = 'cabin' then
    update public.lodging_calendar_entries set status = 'cancelled', released_by = v_actor_id, released_at = now(), updated_at = now()
    where reservation_id = p_reservation_id and status = 'active';
    update public.lodging_stays set status = 'cancelled', updated_at = now() where reservation_id = p_reservation_id;
  elsif v_reservation.status = 'confirmed' and v_reservation.experience_slot_id is not null then
    update public.experience_slots set reserved_count = greatest(reserved_count - v_reservation.people_count, 0),
      confirmed_count = greatest(confirmed_count - v_reservation.people_count, 0), updated_by = v_actor_id, updated_at = now()
    where id = v_reservation.experience_slot_id;
  end if;

  update public.reservations set status = 'cancelled', cancelled_at = coalesce(cancelled_at, now()),
    cancellation_reason = coalesce(p_reason, cancellation_reason), cancelled_by = v_actor_id,
    updated_by_admin = v_actor_id, operational_status = 'cancelled', updated_at = now()
  where id = p_reservation_id;
  return p_reservation_id;
end;
$$;

revoke all on function public.create_lodging_reservation_core(uuid,uuid,uuid,uuid,date,date,integer,public.reservation_status,text,text,text,text,uuid,integer,jsonb) from public, anon, authenticated;
revoke all on function public.create_lodging_reservation_customer(uuid,uuid,date,date,integer,text,text,jsonb) from public, anon, authenticated;
revoke all on function public.release_expired_lodging_holds() from public, anon;
grant execute on function public.create_lodging_reservation_customer(uuid,uuid,date,date,integer,text,text,jsonb) to service_role;
grant execute on function public.release_expired_lodging_holds() to authenticated, service_role;
grant execute on function public.create_lodging_reservation_admin(uuid,text,text,text,uuid,uuid,date,date,integer,public.reservation_status,text,text,text,text,jsonb) to authenticated;
grant execute on function public.block_lodging_unit(uuid,date,date,text,text) to authenticated;
grant execute on function public.check_in_lodging_stay(uuid,jsonb,text) to authenticated;
grant execute on function public.check_out_lodging_stay(uuid,text) to authenticated;

commit;
