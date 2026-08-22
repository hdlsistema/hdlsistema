begin;

alter table if exists public.events
  add column if not exists metadata jsonb not null default '{}'::jsonb;

do $$
begin
  if exists (
    select 1
    from pg_trigger
    where tgrelid = 'public.events'::regclass
      and tgname = 'set_events_editorial_metadata'
  ) then
    execute 'alter table public.events disable trigger set_events_editorial_metadata';
  end if;

  if exists (
    select 1
    from pg_trigger
    where tgrelid = 'public.events'::regclass
      and tgname = 'version_events_changes'
  ) then
    execute 'alter table public.events disable trigger version_events_changes';
  end if;

  if exists (
    select 1
    from pg_trigger
    where tgrelid = 'public.events'::regclass
      and tgname = 'audit_events_changes'
  ) then
    execute 'alter table public.events disable trigger audit_events_changes';
  end if;
end $$;

update public.events e
set created_by = null
where e.created_by is not null
  and not exists (select 1 from auth.users u where u.id = e.created_by);

update public.events e
set updated_by = null
where e.updated_by is not null
  and not exists (select 1 from auth.users u where u.id = e.updated_by);

update public.events e
set published_by = null
where e.published_by is not null
  and not exists (select 1 from auth.users u where u.id = e.published_by);

update public.events
set metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('event_scope', 'grand')
where deleted_at is null
  and coalesce(metadata->>'event_scope', '') = '';

update public.events
set metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
  'event_kind',
  case
    when concat_ws(' ', title, subtitle, description, short_description) ilike '%atardecer%' then 'sunset'
    when concat_ws(' ', title, subtitle, description, short_description) ilike '%vendimia%' then 'harvest'
    when concat_ws(' ', title, subtitle, description, short_description) ilike '%festival%' then 'festival'
    when concat_ws(' ', title, subtitle, description, short_description) ilike '%maridaje%'
      or concat_ws(' ', title, subtitle, description, short_description) ilike '%gastronom%'
      or concat_ws(' ', title, subtitle, description, short_description) ilike '%cena%' then 'gastronomy'
    else 'special'
  end
)
where deleted_at is null
  and metadata->>'event_scope' = 'grand'
  and coalesce(metadata->>'event_kind', '') = '';

do $$
begin
  if exists (
    select 1
    from pg_trigger
    where tgrelid = 'public.events'::regclass
      and tgname = 'set_events_editorial_metadata'
  ) then
    execute 'alter table public.events enable trigger set_events_editorial_metadata';
  end if;

  if exists (
    select 1
    from pg_trigger
    where tgrelid = 'public.events'::regclass
      and tgname = 'version_events_changes'
  ) then
    execute 'alter table public.events enable trigger version_events_changes';
  end if;

  if exists (
    select 1
    from pg_trigger
    where tgrelid = 'public.events'::regclass
      and tgname = 'audit_events_changes'
  ) then
    execute 'alter table public.events enable trigger audit_events_changes';
  end if;
end $$;

create index if not exists idx_events_metadata_event_scope
  on public.events ((metadata->>'event_scope'));

insert into public.control_permissions (code, module, page, action, label, description, financial, sort_order)
values (
  'content.events.manage',
  'Contenido',
  'Eventos magnos',
  'Gestionar',
  'Eventos magnos',
  'Crear y publicar eventos magnos, boletos y tipos de acceso.',
  false,
  160
)
on conflict (code) do update
set module = excluded.module,
    page = excluded.page,
    action = excluded.action,
    label = excluded.label,
    description = excluded.description,
    financial = excluded.financial,
    sort_order = excluded.sort_order;

commit;
