begin;

create table if not exists public.experiences (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  subtitle text,
  description text,
  short_description text,
  duration_minutes integer not null check (duration_minutes > 0),
  base_price numeric(12,2) not null default 0 check (base_price >= 0),
  min_people integer not null default 1 check (min_people > 0),
  max_people integer not null default 1 check (max_people > 0),
  capacity integer not null default 1 check (capacity > 0),
  location text,
  featured boolean not null default false,
  status public.content_status not null default 'draft',
  cover_image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (max_people >= min_people)
);

create table if not exists public.experience_images (
  id uuid primary key default gen_random_uuid(),
  experience_id uuid not null references public.experiences(id) on delete cascade,
  url text not null,
  alt_text text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.experience_slots (
  id uuid primary key default gen_random_uuid(),
  experience_id uuid not null references public.experiences(id) on delete cascade,
  start_at timestamptz not null,
  end_at timestamptz not null,
  capacity integer not null check (capacity > 0),
  reserved_count integer not null default 0 check (reserved_count >= 0),
  price_override numeric(12,2) check (price_override is null or price_override >= 0),
  status public.content_status not null default 'published',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_at > start_at),
  check (reserved_count <= capacity)
);

create table if not exists public.experience_blockouts (
  id uuid primary key default gen_random_uuid(),
  experience_id uuid references public.experiences(id) on delete cascade,
  start_at timestamptz not null,
  end_at timestamptz not null,
  reason text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  check (end_at > start_at)
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  subtitle text,
  description text,
  short_description text,
  venue text,
  start_at timestamptz not null,
  end_at timestamptz not null,
  capacity integer not null check (capacity > 0),
  sold_count integer not null default 0 check (sold_count >= 0),
  featured boolean not null default false,
  status public.event_status not null default 'draft',
  visible_in_app boolean not null default true,
  sales_enabled boolean not null default false,
  cover_image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_at > start_at),
  check (sold_count <= capacity)
);

create table if not exists public.event_images (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  url text not null,
  alt_text text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.event_ticket_types (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null,
  description text,
  price numeric(12,2) not null default 0 check (price >= 0),
  capacity integer not null check (capacity > 0),
  sold_count integer not null default 0 check (sold_count >= 0),
  sales_start_at timestamptz,
  sales_end_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (sold_count <= capacity),
  check (sales_end_at is null or sales_start_at is null or sales_end_at > sales_start_at)
);

create index if not exists idx_experiences_status on public.experiences(status);
create index if not exists idx_experience_slots_experience_id on public.experience_slots(experience_id);
create index if not exists idx_experience_slots_start_at on public.experience_slots(start_at);
create index if not exists idx_events_status on public.events(status);
create index if not exists idx_events_start_at on public.events(start_at);
create index if not exists idx_event_ticket_types_event_id on public.event_ticket_types(event_id);

commit;
