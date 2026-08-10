begin;

create table if not exists public.customer_app_events (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete set null,
  session_id text not null,
  event_name text not null,
  entity_type text,
  entity_id text,
  source text not null default 'mobile_app',
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  idempotency_key text,
  event_key text,
  dedupe_key text,
  module text,
  status text,
  result text
);

alter table public.customer_app_events add column if not exists customer_id uuid references public.customers(id) on delete set null;
alter table public.customer_app_events add column if not exists session_id text;
alter table public.customer_app_events add column if not exists event_name text;
alter table public.customer_app_events add column if not exists entity_type text;
alter table public.customer_app_events add column if not exists entity_id text;
alter table public.customer_app_events add column if not exists source text not null default 'mobile_app';
alter table public.customer_app_events add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.customer_app_events add column if not exists occurred_at timestamptz not null default now();
alter table public.customer_app_events add column if not exists created_at timestamptz not null default now();
alter table public.customer_app_events add column if not exists idempotency_key text;
alter table public.customer_app_events add column if not exists event_key text;
alter table public.customer_app_events add column if not exists dedupe_key text;
alter table public.customer_app_events add column if not exists module text;
alter table public.customer_app_events add column if not exists status text;
alter table public.customer_app_events add column if not exists result text;

-- Conserva compatibilidad con instalaciones que ya tenían eventos antes de
-- que la sesión se volviera un dato obligatorio de trazabilidad.
update public.customer_app_events
set session_id = concat('legacy-', id::text)
where session_id is null;

alter table public.customer_app_events alter column session_id set not null;

create or replace function public.record_customer_signup_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.source = 'public_signup' then
    insert into public.customer_app_events (
      customer_id, session_id, event_name, entity_type, entity_id, source,
      metadata, occurred_at, idempotency_key, event_key, dedupe_key, module, status, result
    ) values (
      new.id,
      concat('signup-', coalesce(new.user_id::text, new.id::text)),
      'customer_signup_completed',
      'customer',
      new.id::text,
      'mobile_app',
      jsonb_build_object('result', 'succeeded'),
      now(),
      concat('customer-signup-', new.id::text),
      concat('customer-signup-', new.id::text),
      concat('customer-signup-', new.id::text),
      'account',
      'succeeded',
      'succeeded'
    ) on conflict do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists on_customer_created_app_activity on public.customers;
create trigger on_customer_created_app_activity
after insert on public.customers
for each row execute function public.record_customer_signup_activity();

create unique index if not exists customer_app_events_idempotency_key_unique
  on public.customer_app_events(idempotency_key)
  where idempotency_key is not null;
create index if not exists customer_app_events_customer_occurred_idx
  on public.customer_app_events(customer_id, occurred_at desc);
create index if not exists customer_app_events_entity_occurred_idx
  on public.customer_app_events(entity_type, entity_id, occurred_at desc);
create index if not exists customer_app_events_module_occurred_idx
  on public.customer_app_events(module, occurred_at desc);

alter table public.customer_app_events enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'customer_app_events' and policyname = 'customer_app_events_admin_read'
  ) then
    create policy customer_app_events_admin_read on public.customer_app_events
      for select to authenticated
      using (public.has_any_role(array['super_admin', 'admin', 'operations', 'marketing', 'finance', 'viewer']));
  end if;
end $$;

commit;
