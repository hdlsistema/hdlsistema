begin;

create or replace function public.normalize_content_entity_type(raw_entity_type text)
returns text
language sql
immutable
as $$
  select case raw_entity_type
    when 'wines' then 'wine'
    when 'wine_images' then 'wine_image'
    when 'experiences' then 'experience'
    when 'experience_images' then 'experience_image'
    when 'experience_slots' then 'experience_slot'
    when 'events' then 'event'
    when 'event_images' then 'event_image'
    when 'event_ticket_types' then 'event_ticket_type'
    when 'promotions' then 'promotion'
    when 'membership_plans' then 'membership_plan'
    when 'campaigns' then 'campaign'
    when 'system_settings' then 'system_setting'
    when 'documents' then 'document'
    else raw_entity_type
  end;
$$;

create or replace function public.can_manage_content(entity_type text, action text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  with normalized as (
    select public.normalize_content_entity_type(entity_type) as entity_type
  )
  select
    public.has_role('super_admin')
    or (
      action in ('read', 'preview')
      and public.has_any_role(array['admin', 'operations', 'marketing', 'finance', 'viewer'])
    )
    or (
      action in ('create', 'update', 'publish', 'unpublish', 'schedule', 'archive', 'restore', 'delete', 'duplicate')
      and public.has_role('admin')
    )
    or (
      normalized.entity_type in ('experience', 'experience_image', 'experience_slot', 'event', 'event_image', 'event_ticket_type', 'reservation')
      and action in ('create', 'update', 'schedule', 'archive', 'restore', 'duplicate')
      and public.has_role('operations')
    )
    or (
      normalized.entity_type in ('promotion', 'campaign', 'banner', 'system_setting', 'document')
      and action in ('create', 'update', 'publish', 'unpublish', 'schedule', 'archive', 'restore', 'duplicate')
      and public.has_role('marketing')
    )
    or (
      normalized.entity_type in ('wine', 'wine_image', 'membership_plan', 'order', 'payment')
      and action in ('read', 'update')
      and public.has_role('finance')
    )
  from normalized;
$$;

create or replace function public.can_manage_content(entity_type text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.can_manage_content(entity_type, 'update');
$$;

create or replace function public.can_publish_content(entity_type text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.can_manage_content(entity_type, 'publish');
$$;

create or replace function public.can_restore_content(entity_type text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.can_manage_content(entity_type, 'restore');
$$;

create table if not exists public.content_versions (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  version integer not null check (version > 0),
  action text not null,
  reason text,
  request_id text,
  snapshot jsonb not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  restored_from_version_id uuid references public.content_versions(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  check (action in ('insert', 'update', 'delete', 'publish', 'unpublish', 'archive', 'restore'))
);

alter table public.content_versions add column if not exists reason text;
alter table public.content_versions add column if not exists request_id text;

create index if not exists idx_content_versions_entity on public.content_versions(entity_type, entity_id, version desc);
create index if not exists idx_content_versions_created_at on public.content_versions(created_at desc);
create index if not exists idx_content_versions_created_by on public.content_versions(created_by);

alter table public.content_versions enable row level security;

drop policy if exists admin_all on public.content_versions;
drop policy if exists content_versions_read on public.content_versions;
create policy content_versions_read on public.content_versions
for select to authenticated using (public.can_manage_content(entity_type, 'read'));

drop policy if exists content_versions_insert on public.content_versions;
create policy content_versions_insert on public.content_versions
for insert to authenticated with check (public.can_manage_content(entity_type, 'update'));

do $$
declare
  item record;
begin
  for item in
    select * from (values
      ('wines', 'wine'),
      ('wine_images', 'wine_image'),
      ('experiences', 'experience'),
      ('experience_images', 'experience_image'),
      ('experience_slots', 'experience_slot'),
      ('events', 'event'),
      ('event_images', 'event_image'),
      ('event_ticket_types', 'event_ticket_type'),
      ('promotions', 'promotion'),
      ('membership_plans', 'membership_plan'),
      ('campaigns', 'campaign'),
      ('system_settings', 'system_setting'),
      ('documents', 'document')
    ) as content_tables(table_name, entity_type)
  loop
    execute format('drop policy if exists admin_all on public.%I', item.table_name);

    execute format('drop policy if exists %I on public.%I', item.table_name || '_content_read', item.table_name);
    execute format(
      'create policy %I on public.%I for select to authenticated using (public.can_manage_content(%L, ''read''))',
      item.table_name || '_content_read',
      item.table_name,
      item.entity_type
    );

    execute format('drop policy if exists %I on public.%I', item.table_name || '_content_insert', item.table_name);
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (public.can_manage_content(%L, ''create''))',
      item.table_name || '_content_insert',
      item.table_name,
      item.entity_type
    );

    execute format('drop policy if exists %I on public.%I', item.table_name || '_content_update', item.table_name);
    execute format(
      'create policy %I on public.%I for update to authenticated using (public.can_manage_content(%L, ''update'')) with check (public.can_manage_content(%L, ''update''))',
      item.table_name || '_content_update',
      item.table_name,
      item.entity_type,
      item.entity_type
    );

    execute format('drop policy if exists %I on public.%I', item.table_name || '_content_delete', item.table_name);
    execute format(
      'create policy %I on public.%I for delete to authenticated using (public.can_manage_content(%L, ''delete''))',
      item.table_name || '_content_delete',
      item.table_name,
      item.entity_type
    );
  end loop;
end $$;

drop policy if exists admin_all on public.content_preview_tokens;
drop policy if exists content_preview_tokens_read on public.content_preview_tokens;
create policy content_preview_tokens_read on public.content_preview_tokens
for select to authenticated using (public.can_manage_content(entity_type, 'preview'));

drop policy if exists content_preview_tokens_insert on public.content_preview_tokens;
create policy content_preview_tokens_insert on public.content_preview_tokens
for insert to authenticated with check (public.can_manage_content(entity_type, 'preview'));

drop policy if exists content_preview_tokens_update on public.content_preview_tokens;
create policy content_preview_tokens_update on public.content_preview_tokens
for update to authenticated using (public.can_manage_content(entity_type, 'preview')) with check (public.can_manage_content(entity_type, 'preview'));

drop policy if exists admin_all on public.content_publication_jobs;
drop policy if exists content_publication_jobs_read on public.content_publication_jobs;
create policy content_publication_jobs_read on public.content_publication_jobs
for select to authenticated using (public.can_manage_content(entity_type, 'read'));

drop policy if exists content_publication_jobs_insert on public.content_publication_jobs;
create policy content_publication_jobs_insert on public.content_publication_jobs
for insert to authenticated with check (public.can_manage_content(entity_type, 'schedule'));

drop policy if exists content_publication_jobs_update on public.content_publication_jobs;
create policy content_publication_jobs_update on public.content_publication_jobs
for update to authenticated using (public.can_manage_content(entity_type, 'schedule')) with check (public.can_manage_content(entity_type, 'schedule'));

drop policy if exists admin_all on public.content_publication_requirements;
drop policy if exists content_publication_requirements_read on public.content_publication_requirements;
create policy content_publication_requirements_read on public.content_publication_requirements
for select to authenticated using (public.can_manage_content(entity_type, 'read'));

drop policy if exists content_publication_requirements_update on public.content_publication_requirements;
create policy content_publication_requirements_update on public.content_publication_requirements
for update to authenticated using (public.can_manage_content(entity_type, 'update')) with check (public.can_manage_content(entity_type, 'update'));

create or replace function public.set_editorial_metadata()
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
    if new.status::text = 'published' then
      new.published_at = coalesce(new.published_at, now());
      new.published_by = coalesce(new.published_by, new.updated_by, auth.uid());
    end if;
    return new;
  end if;

  if tg_op = 'UPDATE' then
    new.updated_by = coalesce(new.updated_by, auth.uid(), old.updated_by);
    new.version = greatest(coalesce(old.version, 1) + 1, coalesce(new.version, 1));

    if new.status::text = 'published' and old.status::text is distinct from 'published' then
      new.published_at = coalesce(new.published_at, now());
      new.published_by = coalesce(new.published_by, new.updated_by, auth.uid());
    end if;

    if new.status::text = 'archived' and old.status::text is distinct from 'archived' then
      new.archived_at = coalesce(new.archived_at, now());
    end if;

    return new;
  end if;

  return new;
end;
$$;

create or replace function public.capture_content_version()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  snapshot_row jsonb;
  snapshot_version integer;
begin
  snapshot_row = case
    when tg_op = 'INSERT' then to_jsonb(new)
    else to_jsonb(old)
  end;
  snapshot_version = coalesce((snapshot_row ->> 'version')::integer, 1);

  insert into public.content_versions (
    entity_type,
    entity_id,
	    version,
	    action,
	    reason,
	    request_id,
	    snapshot,
	    created_by
	  )
  values (
    tg_table_name,
	    coalesce(new.id, old.id),
	    snapshot_version,
	    lower(tg_op),
	    null,
	    current_setting('request.headers', true)::jsonb ->> 'x-request-id',
	    snapshot_row,
	    auth.uid()
	  );

  return coalesce(new, old);
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'wines',
    'wine_images',
    'experiences',
    'experience_images',
    'experience_slots',
    'events',
    'event_images',
    'event_ticket_types',
    'promotions',
    'membership_plans',
    'campaigns',
    'system_settings',
    'documents'
  ]
  loop
    execute format('drop trigger if exists set_%I_editorial_metadata on public.%I', table_name, table_name);
    execute format(
      'create trigger set_%I_editorial_metadata before insert or update on public.%I for each row execute function public.set_editorial_metadata()',
      table_name,
      table_name
    );

    execute format('drop trigger if exists version_%I_changes on public.%I', table_name, table_name);
    execute format(
      'create trigger version_%I_changes after insert or update or delete on public.%I for each row execute function public.capture_content_version()',
      table_name,
      table_name
    );

    execute format('drop trigger if exists audit_%I_changes on public.%I', table_name, table_name);
    execute format(
      'create trigger audit_%I_changes after insert or update or delete on public.%I for each row execute function public.write_admin_audit_log()',
      table_name,
      table_name
    );
  end loop;
end $$;

do $$
declare
  table_name text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach table_name in array array[
      'wines',
      'wine_images',
      'experiences',
      'experience_images',
      'experience_slots',
      'events',
      'event_images',
      'event_ticket_types',
      'promotions',
      'membership_plans',
      'campaigns',
      'system_settings',
      'documents',
      'content_versions'
    ]
    loop
      execute format('alter table public.%I replica identity full', table_name);

      if not exists (
        select 1 from pg_publication_tables
        where pubname = 'supabase_realtime'
          and schemaname = 'public'
          and tablename = table_name
      ) then
        execute format('alter publication supabase_realtime add table public.%I', table_name);
      end if;
    end loop;
  end if;
end $$;

commit;
