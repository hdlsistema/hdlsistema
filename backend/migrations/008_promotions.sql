begin;

create table if not exists public.promotions (
  id uuid primary key default gen_random_uuid(),
  code text unique,
  name text not null,
  description text,
  promotion_type text not null,
  discount_type text not null,
  discount_value numeric(12,2) not null check (discount_value >= 0),
  minimum_amount numeric(12,2) not null default 0 check (minimum_amount >= 0),
  maximum_discount numeric(12,2) check (maximum_discount is null or maximum_discount >= 0),
  starts_at timestamptz,
  ends_at timestamptz,
  usage_limit integer check (usage_limit is null or usage_limit >= 0),
  usage_per_customer integer check (usage_per_customer is null or usage_per_customer >= 0),
  used_count integer not null default 0 check (used_count >= 0),
  target_segment text,
  status public.content_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at > starts_at),
  check (usage_limit is null or used_count <= usage_limit)
);

create table if not exists public.promotion_targets (
  id uuid primary key default gen_random_uuid(),
  promotion_id uuid not null references public.promotions(id) on delete cascade,
  target_type text not null,
  target_id uuid not null,
  created_at timestamptz not null default now()
);

create table if not exists public.promotion_redemptions (
  id uuid primary key default gen_random_uuid(),
  promotion_id uuid not null references public.promotions(id) on delete restrict,
  customer_id uuid not null references public.customers(id) on delete restrict,
  reservation_id uuid references public.reservations(id) on delete set null,
  order_id uuid,
  amount numeric(12,2) not null default 0 check (amount >= 0),
  created_at timestamptz not null default now()
);

create index if not exists idx_promotions_code on public.promotions(code);
create index if not exists idx_promotions_status on public.promotions(status);
create index if not exists idx_promotions_dates on public.promotions(starts_at, ends_at);
create index if not exists idx_promotion_targets_promotion_id on public.promotion_targets(promotion_id);
create index if not exists idx_promotion_redemptions_promotion_id on public.promotion_redemptions(promotion_id);
create index if not exists idx_promotion_redemptions_customer_id on public.promotion_redemptions(customer_id);

commit;
