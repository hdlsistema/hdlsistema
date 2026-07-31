begin;

create table if not exists public.content_translations (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  locale text not null,
  slug text,
  title text,
  subtitle text,
  short_description text,
  description text,
  notes text,
  benefits jsonb,
  promotional_message text,
  seo jsonb not null default '{}'::jsonb,
  translation_status text not null default 'draft',
  publication_status public.content_status not null default 'draft',
  visible_in_app boolean not null default true,
  publish_at timestamptz,
  unpublish_at timestamptz,
  published_by uuid references auth.users(id) on delete set null,
  published_at timestamptz,
  archived_at timestamptz,
  deleted_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1,
  metadata jsonb not null default '{}'::jsonb,
  unique (entity_type, entity_id, locale),
  check (entity_type in ('wine', 'experience', 'event', 'promotion', 'membership_plan', 'campaign', 'banner', 'system_setting', 'document')),
  check (locale in ('es', 'en', 'es-MX', 'en-US')),
  check (translation_status in ('draft', 'ready', 'pending_translation', 'published_es', 'published_bilingual')),
  check (version >= 1),
  check (unpublish_at is null or publish_at is null or unpublish_at > publish_at),
  check (deleted_at is null or archived_at is null or deleted_at >= archived_at),
  check (published_at is null or publication_status in ('published', 'scheduled', 'archived', 'inactive'))
);

create unique index if not exists idx_content_translations_slug_locale
on public.content_translations(entity_type, locale, slug)
where slug is not null and deleted_at is null;

create index if not exists idx_content_translations_entity
on public.content_translations(entity_type, entity_id);

create index if not exists idx_content_translations_live
on public.content_translations(entity_type, locale, publication_status, visible_in_app, publish_at, unpublish_at)
where deleted_at is null and archived_at is null;

alter table public.content_translations enable row level security;

drop policy if exists content_translations_public_read on public.content_translations;
create policy content_translations_public_read on public.content_translations
for select to anon, authenticated using (
  public.is_content_live(publication_status::text, visible_in_app, publish_at, unpublish_at, archived_at, deleted_at)
  and translation_status in ('ready', 'published_es', 'published_bilingual')
);

drop policy if exists content_translations_admin_read on public.content_translations;
create policy content_translations_admin_read on public.content_translations
for select to authenticated using (public.can_manage_content(entity_type, 'read'));

drop policy if exists content_translations_admin_insert on public.content_translations;
create policy content_translations_admin_insert on public.content_translations
for insert to authenticated with check (public.can_manage_content(entity_type, 'update'));

drop policy if exists content_translations_admin_update on public.content_translations;
create policy content_translations_admin_update on public.content_translations
for update to authenticated using (public.can_manage_content(entity_type, 'update')) with check (public.can_manage_content(entity_type, 'update'));

drop policy if exists content_translations_admin_delete on public.content_translations;
create policy content_translations_admin_delete on public.content_translations
for delete to authenticated using (public.can_manage_content(entity_type, 'delete'));

drop trigger if exists set_content_translations_updated_at on public.content_translations;
create trigger set_content_translations_updated_at
before update on public.content_translations
for each row execute function public.set_updated_at();

create or replace function public.set_content_translation_editorial_metadata()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.created_by = coalesce(new.created_by, auth.uid());
    new.updated_by = coalesce(new.updated_by, new.created_by, auth.uid());
    new.version = greatest(coalesce(new.version, 1), 1);

    if new.publication_status = 'published' then
      new.published_at = coalesce(new.published_at, now());
      new.published_by = coalesce(new.published_by, new.updated_by, auth.uid());
    end if;

    return new;
  end if;

  if tg_op = 'UPDATE' then
    new.updated_by = coalesce(new.updated_by, auth.uid(), old.updated_by);
    new.version = greatest(coalesce(old.version, 1) + 1, coalesce(new.version, 1));

    if new.publication_status = 'published' and old.publication_status is distinct from 'published' then
      new.published_at = coalesce(new.published_at, now());
      new.published_by = coalesce(new.published_by, new.updated_by, auth.uid());
    end if;

    if new.publication_status = 'archived' and old.publication_status is distinct from 'archived' then
      new.archived_at = coalesce(new.archived_at, now());
    end if;

    return new;
  end if;

  return new;
end;
$$;

drop trigger if exists set_content_translations_editorial_metadata on public.content_translations;
create trigger set_content_translations_editorial_metadata
before insert or update on public.content_translations
for each row execute function public.set_content_translation_editorial_metadata();

drop trigger if exists version_content_translations_changes on public.content_translations;
create trigger version_content_translations_changes
after insert or update or delete on public.content_translations
for each row execute function public.capture_content_version();

drop trigger if exists audit_content_translations_changes on public.content_translations;
create trigger audit_content_translations_changes
after insert or update or delete on public.content_translations
for each row execute function public.write_admin_audit_log();

create or replace function public.translation_publication_state(target_entity_type text, target_entity_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  with states as (
    select
      bool_or(locale in ('es', 'es-MX') and translation_status in ('ready', 'published_es', 'published_bilingual')) as es_ready,
      bool_or(locale in ('en', 'en-US') and translation_status in ('ready', 'published_bilingual')) as en_ready,
      bool_or(locale in ('es', 'es-MX') and public.is_content_live(publication_status::text, visible_in_app, publish_at, unpublish_at, archived_at, deleted_at)) as es_live,
      bool_or(locale in ('en', 'en-US') and public.is_content_live(publication_status::text, visible_in_app, publish_at, unpublish_at, archived_at, deleted_at)) as en_live
    from public.content_translations
    where entity_type = public.normalize_content_entity_type(target_entity_type)
      and entity_id = target_entity_id
      and deleted_at is null
  )
  select case
    when coalesce(es_live, false) and coalesce(en_live, false) then 'published_bilingual'
    when coalesce(es_live, false) then 'published_es'
    when coalesce(es_ready, false) and coalesce(en_ready, false) then 'ready_bilingual'
    when coalesce(es_ready, false) then 'ready_es'
    else 'pending_translation'
  end
  from states;
$$;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter table public.content_translations replica identity full;

    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'content_translations'
    ) then
      alter publication supabase_realtime add table public.content_translations;
    end if;
  end if;
end $$;

commit;
