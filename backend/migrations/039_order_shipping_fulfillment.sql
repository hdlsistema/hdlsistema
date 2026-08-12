-- Order shipping fulfillment for V1 customer purchases.
-- Non-destructive: keeps existing orders, payments and shipments data.

alter table if exists public.orders
  add column if not exists requires_shipping boolean not null default false,
  add column if not exists shipping_status text not null default 'not_required';

do $$
begin
  if exists (
    select 1 from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'orders'
      and constraint_name = 'orders_shipping_status_check'
  ) then
    alter table public.orders drop constraint orders_shipping_status_check;
  end if;

  alter table public.orders
    add constraint orders_shipping_status_check
    check (shipping_status in (
      'not_required',
      'pending_preparation',
      'preparing',
      'awaiting_tracking',
      'tracking_assigned',
      'shipped',
      'delivered',
      'cancelled'
    ));
end $$;

create table if not exists public.customer_addresses (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  label text not null default 'Principal',
  recipient_name text not null,
  phone text,
  email citext,
  line1 text not null,
  line2 text,
  neighborhood text,
  city text not null,
  state text not null,
  postal_code text not null,
  country text not null default 'MX',
  "references" text,
  is_default boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_shipping_addresses (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete restrict,
  user_id uuid references auth.users(id) on delete set null,
  label text not null default 'Dirección de envío',
  recipient_name text not null,
  phone text,
  email citext,
  line1 text not null,
  line2 text,
  neighborhood text,
  city text not null,
  state text not null,
  postal_code text not null,
  country text not null default 'MX',
  "references" text,
  created_at timestamptz not null default now(),
  constraint order_shipping_addresses_order_unique unique (order_id)
);

create index if not exists idx_customer_addresses_customer on public.customer_addresses(customer_id);
create index if not exists idx_customer_addresses_user on public.customer_addresses(user_id);
create index if not exists idx_customer_addresses_default on public.customer_addresses(customer_id, is_default) where deleted_at is null;
create index if not exists idx_order_shipping_addresses_order on public.order_shipping_addresses(order_id);
create index if not exists idx_orders_shipping_status on public.orders(shipping_status) where requires_shipping = true;

alter table if exists public.shipments
  add column if not exists tracking_url text,
  add column if not exists tracking_assigned_at timestamptz,
  add column if not exists handed_to_carrier_at timestamptz,
  add column if not exists customer_notified_at timestamptz,
  add column if not exists address_snapshot_id uuid;

do $$
begin
  if exists (
    select 1 from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'shipments'
      and constraint_name = 'shipments_status_text_valid'
  ) then
    alter table public.shipments drop constraint shipments_status_text_valid;
  end if;

  alter table public.shipments
    add constraint shipments_status_text_valid
    check (status_text in (
      'pending',
      'preparing',
      'ready',
      'shipped',
      'in_transit',
      'delivered',
      'failed',
      'returned',
      'cancelled',
      'not_required',
      'pending_preparation',
      'awaiting_tracking',
      'tracking_assigned'
    ));

  if not exists (
    select 1 from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'shipments'
      and constraint_name = 'shipments_address_snapshot_id_fkey'
  ) then
    alter table public.shipments
      add constraint shipments_address_snapshot_id_fkey
      foreign key (address_snapshot_id) references public.order_shipping_addresses(id) on delete set null;
  end if;
end $$;

create index if not exists idx_shipments_order_id_status on public.shipments(order_id, status_text);
create index if not exists idx_shipments_tracking_assigned_at on public.shipments(tracking_assigned_at);

alter table if exists public.communication_events
  drop constraint if exists communication_events_type_check;

alter table if exists public.communication_events
  add constraint communication_events_type_check check (
    event_type in (
      'customer.welcome',
      'reservation.created',
      'reservation.rescheduled',
      'reservation.cancelled',
      'order.created',
      'order.pending_payment',
      'order.paid',
      'order.shipped',
      'membership.activated',
      'membership.renewed',
      'membership.expiring',
      'security.password_changed',
      'quote.request.created',
      'quote.sent',
      'campaign.marketing'
    )
  );

alter table public.customer_addresses enable row level security;
alter table public.order_shipping_addresses enable row level security;

drop policy if exists customer_addresses_own_select on public.customer_addresses;
create policy customer_addresses_own_select on public.customer_addresses
  for select
  using (user_id = auth.uid());

drop policy if exists customer_addresses_own_write on public.customer_addresses;
create policy customer_addresses_own_write on public.customer_addresses
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists order_shipping_addresses_own_select on public.order_shipping_addresses;
create policy order_shipping_addresses_own_select on public.order_shipping_addresses
  for select
  using (user_id = auth.uid());

insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, after_data)
values (
  null,
  'migration_039_order_shipping_fulfillment',
  'system',
  gen_random_uuid(),
  jsonb_build_object('status', 'applied', 'scope', 'orders_shipping_fulfillment')
)
on conflict do nothing;
