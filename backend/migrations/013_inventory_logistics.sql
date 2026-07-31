begin;

create table if not exists public.inventory_locations (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  type text not null,
  address text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  wine_id uuid not null references public.wines(id) on delete cascade,
  location_id uuid not null references public.inventory_locations(id) on delete cascade,
  quantity integer not null default 0 check (quantity >= 0),
  reserved_quantity integer not null default 0 check (reserved_quantity >= 0),
  reorder_point integer not null default 0 check (reorder_point >= 0),
  updated_at timestamptz not null default now(),
  unique (wine_id, location_id),
  check (reserved_quantity <= quantity)
);

create table if not exists public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  inventory_item_id uuid not null references public.inventory_items(id) on delete cascade,
  movement_type text not null,
  quantity integer not null,
  reference_type text,
  reference_id uuid,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  check (quantity <> 0)
);

create table if not exists public.shipments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  carrier text,
  tracking_number text,
  status public.content_status not null default 'draft',
  shipped_at timestamptz,
  delivered_at timestamptz,
  delivery_evidence_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (delivered_at is null or shipped_at is null or delivered_at >= shipped_at)
);

create table if not exists public.distributors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_name text,
  email citext,
  phone text,
  address text,
  tax_id text,
  status public.content_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.distributor_orders (
  id uuid primary key default gen_random_uuid(),
  distributor_id uuid not null references public.distributors(id) on delete cascade,
  order_number text not null unique,
  status public.order_status not null default 'draft',
  total numeric(12,2) not null default 0 check (total >= 0),
  currency char(3) not null default 'MXN',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_inventory_items_wine_id on public.inventory_items(wine_id);
create index if not exists idx_inventory_items_location_id on public.inventory_items(location_id);
create index if not exists idx_inventory_movements_inventory_item_id on public.inventory_movements(inventory_item_id);
create index if not exists idx_shipments_order_id on public.shipments(order_id);
create index if not exists idx_distributors_status on public.distributors(status);
create index if not exists idx_distributor_orders_distributor_id on public.distributor_orders(distributor_id);

commit;
