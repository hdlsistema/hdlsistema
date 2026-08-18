begin;

create table if not exists public.executive_ai_access (
  user_id uuid primary key references auth.users(id) on delete cascade,
  feature_code text not null default 'executive_ai_assistant',
  active boolean not null default true,
  granted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint executive_ai_access_feature_valid
    check (feature_code = 'executive_ai_assistant')
);

create table if not exists public.executive_ai_queries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  query_mode text not null,
  status text not null default 'started',
  model text,
  error_code text,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint executive_ai_query_mode_valid check (query_mode in ('text', 'voice')),
  constraint executive_ai_query_status_valid check (status in ('started', 'completed', 'failed'))
);

create index if not exists executive_ai_queries_user_created_idx
  on public.executive_ai_queries(user_id, created_at desc);

alter table public.executive_ai_access enable row level security;
alter table public.executive_ai_queries enable row level security;

drop policy if exists executive_ai_access_own_read on public.executive_ai_access;
create policy executive_ai_access_own_read
on public.executive_ai_access for select to authenticated
using (auth.uid() = user_id);

drop policy if exists executive_ai_queries_own_read on public.executive_ai_queries;
create policy executive_ai_queries_own_read
on public.executive_ai_queries for select to authenticated
using (auth.uid() = user_id);

-- Acceso explícito por identidades reales. Nunca se habilita por nombre visible.
insert into public.executive_ai_access (user_id, feature_code, active)
values
  ('5d816bfe-1ff3-40ae-ab45-5f0e7ef9a62b', 'executive_ai_assistant', true),
  ('630902da-1ade-4ce1-935d-9a534caaf5cd', 'executive_ai_assistant', true),
  ('26f0de80-f99d-4f16-b071-c5d5199f100e', 'executive_ai_assistant', true)
on conflict (user_id) do update
set feature_code = excluded.feature_code,
    active = true,
    updated_at = now();

commit;
