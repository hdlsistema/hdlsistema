begin;

create table if not exists public.map_pois (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  category text not null default 'general',
  latitude numeric(10, 7),
  longitude numeric(10, 7),
  address text,
  search_keywords text[] not null default '{}'::text[],
  metadata jsonb not null default '{}'::jsonb,
  status public.content_status not null default 'draft',
  visible_in_app boolean not null default false,
  visible_in_control boolean not null default true,
  sort_order integer not null default 0,
  publish_at timestamptz,
  unpublish_at timestamptz,
  published_at timestamptz,
  archived_at timestamptz,
  deleted_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint map_pois_coordinates_pair check (
    (latitude is null and longitude is null)
    or (latitude is not null and longitude is not null)
  ),
  constraint map_pois_latitude_range check (latitude is null or (latitude >= -90 and latitude <= 90)),
  constraint map_pois_longitude_range check (longitude is null or (longitude >= -180 and longitude <= 180)),
  constraint map_pois_slug_not_blank check (length(trim(slug)) > 0),
  constraint map_pois_name_not_blank check (length(trim(name)) > 0),
  constraint map_pois_sort_order_non_negative check (sort_order >= 0),
  constraint map_pois_publication_window_valid check (
    unpublish_at is null or publish_at is null or unpublish_at > publish_at
  )
);

create index if not exists idx_map_pois_live
  on public.map_pois(status, visible_in_app, publish_at, unpublish_at)
  where deleted_at is null and archived_at is null;

create index if not exists idx_map_pois_sort_order on public.map_pois(sort_order);
create index if not exists idx_map_pois_category on public.map_pois(category);
create index if not exists idx_customer_app_events_session_started
  on public.customer_app_events(session_id, occurred_at desc)
  where event_name = 'app_session_started';

alter table public.map_pois enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'map_pois'
      and policyname = 'map_pois_admin_read'
  ) then
    create policy map_pois_admin_read on public.map_pois
    for select to authenticated using (
      exists (
        select 1
        from public.user_roles ur
        join public.roles r on r.id = ur.role_id
        where ur.user_id = auth.uid()
          and r.name in ('super_admin', 'admin', 'operations', 'marketing', 'viewer')
      )
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'map_pois'
      and policyname = 'map_pois_admin_write'
  ) then
    create policy map_pois_admin_write on public.map_pois
    for all to authenticated using (
      exists (
        select 1
        from public.user_roles ur
        join public.roles r on r.id = ur.role_id
        where ur.user_id = auth.uid()
          and r.name in ('super_admin', 'admin', 'operations', 'marketing')
      )
    ) with check (
      exists (
        select 1
        from public.user_roles ur
        join public.roles r on r.id = ur.role_id
        where ur.user_id = auth.uid()
          and r.name in ('super_admin', 'admin', 'operations', 'marketing')
      )
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'set_map_pois_updated_at'
      and tgrelid = 'public.map_pois'::regclass
  ) then
    create trigger set_map_pois_updated_at
    before update on public.map_pois
    for each row execute function public.set_updated_at();
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'audit_map_pois_changes'
      and tgrelid = 'public.map_pois'::regclass
  ) then
    create trigger audit_map_pois_changes
    after insert or update or delete on public.map_pois
    for each row execute function public.write_admin_audit_log();
  end if;
end $$;

insert into public.system_settings (key, value, description)
values
  ('sommelier.daily_limit', '10'::jsonb, 'Límite diario de interacciones del Sommelier IA por cliente.'),
  ('customer_app.default_language', '{"locale":"es-MX"}'::jsonb, 'Idioma base de la App Hacienda de Letras.'),
  ('customer_app.cart_abandonment', '{"thresholdMinutes":45}'::jsonb, 'Umbral operativo para carritos abandonados.'),
  ('communications.preferences', '{"transactionalEmail":true,"transactionalPush":true,"marketingPush":false}'::jsonb, 'Preferencias administrables de comunicaciones no sensibles.')
on conflict (key) do nothing;

commit;
