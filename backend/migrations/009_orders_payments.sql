begin;

create table if not exists public.carts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  session_token text,
  currency char(3) not null default 'MXN',
  status public.order_status not null default 'draft',
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references public.carts(id) on delete cascade,
  item_type text not null,
  item_id uuid not null,
  quantity integer not null check (quantity > 0),
  unit_price_snapshot numeric(12,2) not null check (unit_price_snapshot >= 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  user_id uuid references auth.users(id) on delete set null,
  customer_id uuid not null references public.customers(id) on delete restrict,
  reservation_id uuid references public.reservations(id) on delete set null,
  subtotal numeric(12,2) not null default 0 check (subtotal >= 0),
  discount_total numeric(12,2) not null default 0 check (discount_total >= 0),
  tax_total numeric(12,2) not null default 0 check (tax_total >= 0),
  shipping_total numeric(12,2) not null default 0 check (shipping_total >= 0),
  total numeric(12,2) not null default 0 check (total >= 0),
  currency char(3) not null default 'MXN',
  status public.order_status not null default 'draft',
  billing_address jsonb,
  shipping_address jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'promotion_redemptions_order_id_fkey'
  ) then
    alter table public.promotion_redemptions
      add constraint promotion_redemptions_order_id_fkey
      foreign key (order_id) references public.orders(id) on delete set null
      not valid;
  end if;
end $$;

alter table public.promotion_redemptions
  validate constraint promotion_redemptions_order_id_fkey;

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  item_type text not null,
  item_id uuid not null,
  name_snapshot text not null,
  sku_snapshot text,
  quantity integer not null check (quantity > 0),
  unit_price numeric(12,2) not null check (unit_price >= 0),
  subtotal numeric(12,2) not null check (subtotal >= 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  provider text not null,
  provider_payment_id text,
  amount numeric(12,2) not null check (amount >= 0),
  currency char(3) not null default 'MXN',
  status public.payment_status not null default 'pending',
  payment_method_type text,
  provider_response jsonb,
  paid_at timestamptz,
  failed_at timestamptz,
  refunded_amount numeric(12,2) not null default 0 check (refunded_amount >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payment_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_event_id text not null unique,
  event_type text not null,
  payload_hash text not null,
  processed boolean not null default false,
  processed_at timestamptz,
  error_code text,
  created_at timestamptz not null default now()
);

create table if not exists public.access_passes (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid references public.reservations(id) on delete cascade,
  order_id uuid references public.orders(id) on delete cascade,
  event_ticket_type_id uuid references public.event_ticket_types(id) on delete set null,
  qr_token_hash text not null unique,
  status public.content_status not null default 'published',
  valid_from timestamptz,
  valid_until timestamptz,
  used_at timestamptz,
  created_at timestamptz not null default now(),
  check (valid_until is null or valid_from is null or valid_until > valid_from)
);

create table if not exists public.checkins (
  id uuid primary key default gen_random_uuid(),
  access_pass_id uuid not null references public.access_passes(id) on delete cascade,
  checked_in_by uuid references auth.users(id) on delete set null,
  checked_in_at timestamptz not null default now(),
  device_info jsonb not null default '{}'::jsonb,
  notes text
);

create index if not exists idx_carts_user_id on public.carts(user_id);
create index if not exists idx_carts_customer_id on public.carts(customer_id);
create index if not exists idx_cart_items_cart_id on public.cart_items(cart_id);
create index if not exists idx_orders_customer_id on public.orders(customer_id);
create index if not exists idx_orders_user_id on public.orders(user_id);
create index if not exists idx_orders_status on public.orders(status);
create index if not exists idx_order_items_order_id on public.order_items(order_id);
create index if not exists idx_payments_order_id on public.payments(order_id);
create index if not exists idx_payments_status on public.payments(status);
create index if not exists idx_access_passes_reservation_id on public.access_passes(reservation_id);
create index if not exists idx_access_passes_order_id on public.access_passes(order_id);
create index if not exists idx_checkins_access_pass_id on public.checkins(access_pass_id);

commit;
