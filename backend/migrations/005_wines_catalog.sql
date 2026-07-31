begin;

create table if not exists public.wine_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  description text,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.wines (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique,
  slug text not null unique,
  name text not null,
  subtitle text,
  description text,
  category_id uuid references public.wine_categories(id) on delete set null,
  vintage integer,
  grape_variety text,
  alcohol_percentage numeric(5,2) check (alcohol_percentage is null or alcohol_percentage >= 0),
  volume_ml integer check (volume_ml is null or volume_ml > 0),
  origin text,
  tasting_notes text,
  pairing_notes text,
  serving_temperature text,
  price numeric(12,2) not null default 0 check (price >= 0),
  compare_at_price numeric(12,2) check (compare_at_price is null or compare_at_price >= 0),
  cost numeric(12,2) check (cost is null or cost >= 0),
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  stock_control_enabled boolean not null default true,
  featured boolean not null default false,
  status public.content_status not null default 'draft',
  cover_image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.wine_images (
  id uuid primary key default gen_random_uuid(),
  wine_id uuid not null references public.wines(id) on delete cascade,
  url text not null,
  alt_text text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.wine_pairings (
  id uuid primary key default gen_random_uuid(),
  wine_id uuid not null references public.wines(id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.wine_service_notes (
  id uuid primary key default gen_random_uuid(),
  wine_id uuid not null unique references public.wines(id) on delete cascade,
  decanting_minutes integer check (decanting_minutes is null or decanting_minutes >= 0),
  storage_notes text,
  opening_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_wines_category_id on public.wines(category_id);
create index if not exists idx_wines_status on public.wines(status);
create index if not exists idx_wines_featured on public.wines(featured);
create index if not exists idx_wine_images_wine_id on public.wine_images(wine_id);
create index if not exists idx_wine_pairings_wine_id on public.wine_pairings(wine_id);

commit;
