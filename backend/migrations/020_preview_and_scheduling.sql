begin;

create table if not exists public.content_preview_tokens (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  entity_type text not null,
  entity_id uuid not null,
  locale text not null default 'es-MX',
  expires_at timestamptz not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  used_at timestamptz,
  revoked_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  check (expires_at > created_at),
  check (entity_type in (
    'wine',
    'experience',
    'experience_slot',
    'event',
    'event_ticket_type',
    'promotion',
    'membership_plan',
    'campaign',
    'system_setting',
    'document'
  ))
);

create table if not exists public.content_publication_jobs (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  action text not null,
  run_at timestamptz not null,
  timezone text not null default 'America/Mexico_City',
  status text not null default 'pending',
  attempts integer not null default 0 check (attempts >= 0),
  max_attempts integer not null default 5 check (max_attempts > 0),
  locked_at timestamptz,
  locked_by text,
  processed_at timestamptz,
  last_error_code text,
  last_error text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  check (action in ('publish', 'unpublish', 'archive', 'restore')),
  check (status in ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  check (entity_type in (
    'wine',
    'experience',
    'experience_slot',
    'event',
    'event_ticket_type',
    'promotion',
    'membership_plan',
    'campaign',
    'system_setting',
    'document'
  ))
);

create table if not exists public.content_publication_requirements (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  requirement_key text not null,
  label text not null,
  severity text not null default 'error',
  active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (entity_type, requirement_key),
  check (severity in ('error', 'warning'))
);

create index if not exists idx_content_preview_tokens_entity on public.content_preview_tokens(entity_type, entity_id);
create index if not exists idx_content_preview_tokens_expires_at on public.content_preview_tokens(expires_at);
create index if not exists idx_content_preview_tokens_active on public.content_preview_tokens(expires_at) where revoked_at is null;

create index if not exists idx_content_publication_jobs_due on public.content_publication_jobs(run_at, status);
create index if not exists idx_content_publication_jobs_entity on public.content_publication_jobs(entity_type, entity_id);
create index if not exists idx_content_publication_jobs_status on public.content_publication_jobs(status);
create unique index if not exists idx_content_publication_jobs_one_active
on public.content_publication_jobs(entity_type, entity_id, action)
where status in ('pending', 'processing');

alter table public.content_preview_tokens enable row level security;
alter table public.content_publication_jobs enable row level security;
alter table public.content_publication_requirements enable row level security;

drop policy if exists admin_all on public.content_preview_tokens;
create policy admin_all on public.content_preview_tokens
for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists admin_all on public.content_publication_jobs;
create policy admin_all on public.content_publication_jobs
for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists admin_all on public.content_publication_requirements;
create policy admin_all on public.content_publication_requirements
for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop trigger if exists set_content_publication_jobs_updated_at on public.content_publication_jobs;
create trigger set_content_publication_jobs_updated_at
before update on public.content_publication_jobs
for each row execute function public.set_updated_at();

drop trigger if exists set_content_publication_requirements_updated_at on public.content_publication_requirements;
create trigger set_content_publication_requirements_updated_at
before update on public.content_publication_requirements
for each row execute function public.set_updated_at();

insert into public.content_publication_requirements (entity_type, requirement_key, label, severity)
values
  ('wine', 'name', 'Nombre requerido', 'error'),
  ('wine', 'slug', 'Slug requerido', 'error'),
  ('wine', 'price', 'Precio requerido', 'error'),
  ('experience', 'title', 'Titulo requerido', 'error'),
  ('experience', 'duration_minutes', 'Duracion requerida', 'error'),
  ('event', 'title', 'Titulo requerido', 'error'),
  ('event', 'start_at', 'Fecha de inicio requerida', 'error'),
  ('event', 'ticket_types', 'Al menos un tipo de boleto activo', 'warning'),
  ('promotion', 'discount_value', 'Descuento requerido', 'error'),
  ('membership_plan', 'price', 'Precio requerido', 'error')
on conflict (entity_type, requirement_key) do update
set label = excluded.label,
    severity = excluded.severity,
    active = true,
    updated_at = now();

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'content_publication_jobs'
    ) then
      alter publication supabase_realtime add table public.content_publication_jobs;
    end if;
  end if;
end $$;

commit;
