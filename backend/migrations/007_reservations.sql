begin;

create table if not exists public.reservations (
  id uuid primary key default gen_random_uuid(),
  reservation_number text not null unique,
  customer_id uuid not null references public.customers(id) on delete restrict,
  user_id uuid references auth.users(id) on delete set null,
  reservation_type text not null,
  experience_id uuid references public.experiences(id) on delete set null,
  experience_slot_id uuid references public.experience_slots(id) on delete set null,
  event_id uuid references public.events(id) on delete set null,
  event_ticket_type_id uuid references public.event_ticket_types(id) on delete set null,
  people_count integer not null check (people_count > 0),
  subtotal numeric(12,2) not null default 0 check (subtotal >= 0),
  discount_total numeric(12,2) not null default 0 check (discount_total >= 0),
  tax_total numeric(12,2) not null default 0 check (tax_total >= 0),
  total numeric(12,2) not null default 0 check (total >= 0),
  currency char(3) not null default 'MXN',
  status public.reservation_status not null default 'pending',
  customer_notes text,
  internal_notes text,
  confirmed_at timestamptz,
  cancelled_at timestamptz,
  cancellation_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reservation_guests (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references public.reservations(id) on delete cascade,
  full_name text not null,
  email citext,
  phone text,
  dietary_notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.reservation_status_history (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references public.reservations(id) on delete cascade,
  previous_status public.reservation_status,
  new_status public.reservation_status not null,
  changed_by uuid references auth.users(id) on delete set null,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_reservations_customer_id on public.reservations(customer_id);
create index if not exists idx_reservations_user_id on public.reservations(user_id);
create index if not exists idx_reservations_status on public.reservations(status);
create index if not exists idx_reservations_experience_slot_id on public.reservations(experience_slot_id);
create index if not exists idx_reservations_event_ticket_type_id on public.reservations(event_ticket_type_id);
create index if not exists idx_reservation_guests_reservation_id on public.reservation_guests(reservation_id);
create index if not exists idx_reservation_status_history_reservation_id on public.reservation_status_history(reservation_id);

create or replace function public.log_reservation_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.reservation_status_history (reservation_id, previous_status, new_status)
    values (new.id, null, new.status);
  elsif new.status is distinct from old.status then
    insert into public.reservation_status_history (reservation_id, previous_status, new_status)
    values (new.id, old.status, new.status);
  end if;
  return new;
end;
$$;

drop trigger if exists reservation_status_history_insert on public.reservations;
create trigger reservation_status_history_insert
after insert on public.reservations
for each row execute function public.log_reservation_status_change();

drop trigger if exists reservation_status_history_update on public.reservations;
create trigger reservation_status_history_update
after update of status on public.reservations
for each row execute function public.log_reservation_status_change();

create or replace function public.reserve_experience_slot(
  p_slot_id uuid,
  p_people_count integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.experience_slots
  set reserved_count = reserved_count + p_people_count
  where id = p_slot_id
    and status = 'published'
    and reserved_count + p_people_count <= capacity;

  return found;
end;
$$;

commit;
