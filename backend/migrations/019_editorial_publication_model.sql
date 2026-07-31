begin;

alter type public.content_status add value if not exists 'scheduled';
alter type public.event_status add value if not exists 'scheduled';
alter type public.event_status add value if not exists 'inactive';
alter type public.event_status add value if not exists 'archived';

create or replace function public.is_content_live(
  status_value text,
  visible_value boolean,
  publish_at_value timestamptz,
  unpublish_at_value timestamptz,
  archived_at_value timestamptz,
  deleted_at_value timestamptz
)
returns boolean
language sql
stable
as $$
  select
    status_value = 'published'
    and coalesce(visible_value, true) = true
    and archived_at_value is null
    and deleted_at_value is null
    and (publish_at_value is null or publish_at_value <= now())
    and (unpublish_at_value is null or unpublish_at_value > now());
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
    execute format('alter table public.%I add column if not exists visible_in_control boolean not null default true', table_name);
    execute format('alter table public.%I add column if not exists visible_in_app boolean not null default true', table_name);
    execute format('alter table public.%I add column if not exists sort_order integer not null default 0', table_name);
    execute format('alter table public.%I add column if not exists publish_at timestamptz', table_name);
    execute format('alter table public.%I add column if not exists unpublish_at timestamptz', table_name);
    execute format('alter table public.%I add column if not exists created_by uuid references auth.users(id) on delete set null', table_name);
    execute format('alter table public.%I add column if not exists updated_by uuid references auth.users(id) on delete set null', table_name);
    execute format('alter table public.%I add column if not exists published_by uuid references auth.users(id) on delete set null', table_name);
    execute format('alter table public.%I add column if not exists published_at timestamptz', table_name);
    execute format('alter table public.%I add column if not exists archived_at timestamptz', table_name);
    execute format('alter table public.%I add column if not exists deleted_at timestamptz', table_name);
    execute format('alter table public.%I add column if not exists version integer not null default 1', table_name);
    execute format('alter table public.%I add column if not exists locale text not null default ''es-MX''', table_name);
    execute format('alter table public.%I add column if not exists metadata jsonb not null default ''{}''::jsonb', table_name);

    if not exists (
      select 1 from pg_constraint
      where conname = format('%s_version_positive', table_name)
        and conrelid = format('public.%I', table_name)::regclass
    ) then
      execute format('alter table public.%I add constraint %I check (version > 0)', table_name, format('%s_version_positive', table_name));
    end if;

    if not exists (
      select 1 from pg_constraint
      where conname = format('%s_publication_window_valid', table_name)
        and conrelid = format('public.%I', table_name)::regclass
    ) then
      execute format(
        'alter table public.%I add constraint %I check (unpublish_at is null or publish_at is null or unpublish_at > publish_at)',
        table_name,
        format('%s_publication_window_valid', table_name)
      );
    end if;

    if not exists (
      select 1 from pg_constraint
      where conname = format('%s_sort_order_non_negative', table_name)
        and conrelid = format('public.%I', table_name)::regclass
    ) then
      execute format('alter table public.%I add constraint %I check (sort_order >= 0)', table_name, format('%s_sort_order_non_negative', table_name));
    end if;

    if not exists (
      select 1 from pg_constraint
      where conname = format('%s_locale_not_blank', table_name)
        and conrelid = format('public.%I', table_name)::regclass
    ) then
      execute format('alter table public.%I add constraint %I check (length(trim(locale)) > 0)', table_name, format('%s_locale_not_blank', table_name));
    end if;

    if not exists (
      select 1 from pg_constraint
      where conname = format('%s_deleted_after_archive', table_name)
        and conrelid = format('public.%I', table_name)::regclass
    ) then
      execute format(
        'alter table public.%I add constraint %I check (deleted_at is null or archived_at is null or deleted_at >= archived_at)',
        table_name,
        format('%s_deleted_after_archive', table_name)
      );
    end if;

    execute format('create index if not exists idx_%I_sort_order on public.%I (sort_order)', table_name, table_name);
    execute format('create index if not exists idx_%I_deleted_at on public.%I (deleted_at)', table_name, table_name);
    execute format('create index if not exists idx_%I_locale on public.%I (locale)', table_name, table_name);
  end loop;
end $$;

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'event_ticket_types'
      and column_name = 'status'
  ) then
    alter table public.event_ticket_types add column status public.content_status not null default 'draft';
    update public.event_ticket_types
    set status = case when active then 'published'::public.content_status else 'inactive'::public.content_status end;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'membership_plans'
      and column_name = 'status'
  ) then
    alter table public.membership_plans add column status public.content_status not null default 'draft';
    update public.membership_plans
    set status = case when active then 'published'::public.content_status else 'inactive'::public.content_status end;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'documents'
      and column_name = 'status'
  ) then
    alter table public.documents add column status public.content_status not null default 'draft';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'system_settings'
      and column_name = 'status'
  ) then
    alter table public.system_settings add column status public.content_status not null default 'published';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'wine_images'
      and column_name = 'status'
  ) then
    alter table public.wine_images add column status public.content_status not null default 'published';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'experience_images'
      and column_name = 'status'
  ) then
    alter table public.experience_images add column status public.content_status not null default 'published';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'event_images'
      and column_name = 'status'
  ) then
    alter table public.event_images add column status public.content_status not null default 'published';
  end if;
end $$;

update public.campaigns set visible_in_app = false where visible_in_app = true;
update public.documents set visible_in_app = false where visible_in_app = true;
update public.system_settings set visible_in_app = false where visible_in_app = true;

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
    if not exists (
      select 1 from pg_constraint
      where conname = format('%s_published_fields_coherent', table_name)
        and conrelid = format('public.%I', table_name)::regclass
    ) then
      execute format(
        'alter table public.%I add constraint %I check (published_at is null or status::text in (''published'', ''scheduled'', ''active'', ''inactive'', ''archived'', ''completed'', ''cancelled''))',
        table_name,
        format('%s_published_fields_coherent', table_name)
      );
    end if;

    execute format('create index if not exists idx_%I_publication on public.%I (status, visible_in_app, publish_at, unpublish_at) where deleted_at is null', table_name, table_name);
  end loop;
end $$;

drop policy if exists published_wines_public_read on public.wines;
create policy published_wines_public_read on public.wines
for select to anon, authenticated using (
  public.is_content_live(status::text, visible_in_app, publish_at, unpublish_at, archived_at, deleted_at)
);

drop policy if exists published_wine_images_public_read on public.wine_images;
create policy published_wine_images_public_read on public.wine_images
for select to anon, authenticated using (
  public.is_content_live(status::text, visible_in_app, publish_at, unpublish_at, archived_at, deleted_at)
  and exists (
    select 1 from public.wines w
    where w.id = wine_id
      and public.is_content_live(w.status::text, w.visible_in_app, w.publish_at, w.unpublish_at, w.archived_at, w.deleted_at)
  )
);

drop policy if exists published_wine_pairings_public_read on public.wine_pairings;
create policy published_wine_pairings_public_read on public.wine_pairings
for select to anon, authenticated using (
  exists (
    select 1 from public.wines w
    where w.id = wine_id
      and public.is_content_live(w.status::text, w.visible_in_app, w.publish_at, w.unpublish_at, w.archived_at, w.deleted_at)
  )
);

drop policy if exists published_wine_service_notes_public_read on public.wine_service_notes;
create policy published_wine_service_notes_public_read on public.wine_service_notes
for select to anon, authenticated using (
  exists (
    select 1 from public.wines w
    where w.id = wine_id
      and public.is_content_live(w.status::text, w.visible_in_app, w.publish_at, w.unpublish_at, w.archived_at, w.deleted_at)
  )
);

drop policy if exists published_experiences_public_read on public.experiences;
create policy published_experiences_public_read on public.experiences
for select to anon, authenticated using (
  public.is_content_live(status::text, visible_in_app, publish_at, unpublish_at, archived_at, deleted_at)
);

drop policy if exists published_experience_images_public_read on public.experience_images;
create policy published_experience_images_public_read on public.experience_images
for select to anon, authenticated using (
  public.is_content_live(status::text, visible_in_app, publish_at, unpublish_at, archived_at, deleted_at)
  and exists (
    select 1 from public.experiences e
    where e.id = experience_id
      and public.is_content_live(e.status::text, e.visible_in_app, e.publish_at, e.unpublish_at, e.archived_at, e.deleted_at)
  )
);

drop policy if exists published_experience_slots_public_read on public.experience_slots;
create policy published_experience_slots_public_read on public.experience_slots
for select to anon, authenticated using (
  public.is_content_live(status::text, visible_in_app, publish_at, unpublish_at, archived_at, deleted_at)
);

drop policy if exists published_events_public_read on public.events;
create policy published_events_public_read on public.events
for select to anon, authenticated using (
  public.is_content_live(status::text, visible_in_app, publish_at, unpublish_at, archived_at, deleted_at)
);

drop policy if exists published_event_images_public_read on public.event_images;
create policy published_event_images_public_read on public.event_images
for select to anon, authenticated using (
  public.is_content_live(status::text, visible_in_app, publish_at, unpublish_at, archived_at, deleted_at)
  and exists (
    select 1 from public.events e
    where e.id = event_id
      and public.is_content_live(e.status::text, e.visible_in_app, e.publish_at, e.unpublish_at, e.archived_at, e.deleted_at)
  )
);

drop policy if exists active_event_ticket_types_public_read on public.event_ticket_types;
create policy active_event_ticket_types_public_read on public.event_ticket_types
for select to anon, authenticated using (
  active = true
  and public.is_content_live(status::text, visible_in_app, publish_at, unpublish_at, archived_at, deleted_at)
  and exists (
    select 1 from public.events e
    where e.id = event_id
      and e.sales_enabled = true
      and public.is_content_live(e.status::text, e.visible_in_app, e.publish_at, e.unpublish_at, e.archived_at, e.deleted_at)
  )
);

drop policy if exists active_promotions_public_read on public.promotions;
create policy active_promotions_public_read on public.promotions
for select to anon, authenticated using (
  public.is_content_live(status::text, visible_in_app, publish_at, unpublish_at, archived_at, deleted_at)
  and (starts_at is null or starts_at <= now())
  and (ends_at is null or ends_at >= now())
  and (usage_limit is null or used_count <= usage_limit)
);

drop policy if exists membership_plans_public_read on public.membership_plans;
create policy membership_plans_public_read on public.membership_plans
for select to anon, authenticated using (
  active = true
  and public.is_content_live(status::text, visible_in_app, publish_at, unpublish_at, archived_at, deleted_at)
);

commit;
