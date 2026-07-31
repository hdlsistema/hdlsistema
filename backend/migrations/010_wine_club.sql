begin;

create table if not exists public.membership_plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  price numeric(12,2) not null default 0 check (price >= 0),
  billing_period text not null,
  benefits jsonb not null default '{}'::jsonb,
  daily_sommelier_limit integer not null default 10 check (daily_sommelier_limit >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.memberships (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  plan_id uuid not null references public.membership_plans(id) on delete restrict,
  membership_number text not null unique,
  status public.membership_status not null default 'pending',
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  auto_renew boolean not null default true,
  points_balance integer not null default 0 check (points_balance >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or ends_at > starts_at)
);

create table if not exists public.loyalty_transactions (
  id uuid primary key default gen_random_uuid(),
  membership_id uuid not null references public.memberships(id) on delete cascade,
  transaction_type text not null,
  points integer not null,
  reference_type text,
  reference_id uuid,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.membership_benefits (
  id uuid primary key default gen_random_uuid(),
  membership_id uuid not null references public.memberships(id) on delete cascade,
  benefit_code text not null,
  usage_limit integer check (usage_limit is null or usage_limit >= 0),
  used_count integer not null default 0 check (used_count >= 0),
  valid_from timestamptz,
  valid_until timestamptz,
  created_at timestamptz not null default now(),
  check (usage_limit is null or used_count <= usage_limit),
  check (valid_until is null or valid_from is null or valid_until > valid_from)
);

create index if not exists idx_memberships_customer_id on public.memberships(customer_id);
create index if not exists idx_memberships_status on public.memberships(status);
create index if not exists idx_loyalty_transactions_membership_id on public.loyalty_transactions(membership_id);
create index if not exists idx_membership_benefits_membership_id on public.membership_benefits(membership_id);

commit;
