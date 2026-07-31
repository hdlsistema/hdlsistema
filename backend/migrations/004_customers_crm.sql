begin;

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete set null,
  customer_number text not null unique,
  first_name text not null,
  last_name text not null,
  email citext,
  phone text,
  birth_date date,
  source text,
  segment text,
  total_spend numeric(12,2) not null default 0 check (total_spend >= 0),
  total_visits integer not null default 0 check (total_visits >= 0),
  last_visit_at timestamptz,
  notes text,
  status public.content_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.customer_tags (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.customer_tag_assignments (
  customer_id uuid not null references public.customers(id) on delete cascade,
  tag_id uuid not null references public.customer_tags(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (customer_id, tag_id)
);

create table if not exists public.customer_notes (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  author_user_id uuid references auth.users(id) on delete set null,
  note text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_customers_user_id on public.customers(user_id);
create index if not exists idx_customers_email on public.customers(email);
create index if not exists idx_customers_status on public.customers(status);
create index if not exists idx_customers_created_at on public.customers(created_at);
create index if not exists idx_customer_notes_customer_id on public.customer_notes(customer_id);

commit;
