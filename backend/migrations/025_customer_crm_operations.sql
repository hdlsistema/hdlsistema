begin;

alter table public.customers add column if not exists display_name text;
alter table public.customers add column if not exists phone_normalized text;
alter table public.customers add column if not exists marketing_email_consent boolean not null default false;
alter table public.customers add column if not exists marketing_push_consent boolean not null default false;
alter table public.customers add column if not exists consent_updated_at timestamptz;
alter table public.customers add column if not exists consent_source text;
alter table public.customers add column if not exists consent_updated_by uuid references auth.users(id) on delete set null;
alter table public.customers add column if not exists preferred_language text not null default 'es';
alter table public.customers add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.customers add column if not exists updated_by uuid references auth.users(id) on delete set null;
alter table public.customers add column if not exists archived_at timestamptz;
alter table public.customers add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.customer_tags add column if not exists color text not null default '#681126';
alter table public.customer_tags add column if not exists status public.content_status not null default 'published';
alter table public.customer_tags add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.customer_tags add column if not exists updated_by uuid references auth.users(id) on delete set null;
alter table public.customer_tags add column if not exists updated_at timestamptz not null default now();
alter table public.customer_tags add column if not exists deleted_at timestamptz;
alter table public.customer_tags add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.customer_tag_assignments add column if not exists assigned_by uuid references auth.users(id) on delete set null;

alter table public.customer_notes add column if not exists updated_at timestamptz not null default now();
alter table public.customer_notes add column if not exists updated_by uuid references auth.users(id) on delete set null;
alter table public.customer_notes add column if not exists deleted_at timestamptz;
alter table public.customer_notes add column if not exists metadata jsonb not null default '{}'::jsonb;

update public.customers
set
  email = nullif(lower(trim(email::text)), '')::citext,
  phone_normalized = nullif(regexp_replace(coalesce(phone, ''), '[^0-9+]', '', 'g'), ''),
  display_name = nullif(trim(coalesce(display_name, '')), ''),
  preferred_language = coalesce(nullif(preferred_language, ''), 'es')
where true;

update public.customers
set display_name = nullif(trim(concat_ws(' ', first_name, last_name)), '')
where display_name is null;

create index if not exists idx_customers_segment on public.customers(segment);
create index if not exists idx_customers_source on public.customers(source);
create index if not exists idx_customers_preferred_language on public.customers(preferred_language);
create index if not exists idx_customers_archived_at on public.customers(archived_at);
create index if not exists idx_customers_last_visit_at on public.customers(last_visit_at desc);
create index if not exists idx_customers_total_spend on public.customers(total_spend desc);
create index if not exists idx_customers_total_visits on public.customers(total_visits desc);
create index if not exists idx_customers_phone_normalized on public.customers(phone_normalized);
create index if not exists idx_customers_marketing_email_consent on public.customers(marketing_email_consent);
create index if not exists idx_customer_tags_status on public.customer_tags(status, deleted_at);
create index if not exists idx_customer_notes_customer_active on public.customer_notes(customer_id, deleted_at, created_at desc);
create index if not exists idx_customer_tag_assignments_tag_id on public.customer_tag_assignments(tag_id);

create unique index if not exists idx_customers_email_unique_active
on public.customers (lower(email::text))
where email is not null and archived_at is null;

create unique index if not exists idx_customers_phone_unique_active
on public.customers (phone_normalized)
where phone_normalized is not null and archived_at is null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'customers_preferred_language_valid') then
    alter table public.customers add constraint customers_preferred_language_valid
    check (preferred_language in ('es', 'en'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'customers_segment_valid') then
    alter table public.customers add constraint customers_segment_valid
    check (segment is null or segment in (
      'customer',
      'new',
      'recurrente',
      'vip',
      'alto_valor',
      'inactivo',
      'en_riesgo',
      'wine_club',
      'corporativo'
    ));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'customer_tags_color_hex_valid') then
    alter table public.customer_tags add constraint customer_tags_color_hex_valid
    check (color ~ '^#[0-9A-Fa-f]{6}$');
  end if;
end $$;

drop trigger if exists set_customers_updated_at on public.customers;
create trigger set_customers_updated_at
before update on public.customers
for each row execute function public.set_updated_at();

drop trigger if exists set_customer_tags_updated_at on public.customer_tags;
create trigger set_customer_tags_updated_at
before update on public.customer_tags
for each row execute function public.set_updated_at();

drop trigger if exists set_customer_notes_updated_at on public.customer_notes;
create trigger set_customer_notes_updated_at
before update on public.customer_notes
for each row execute function public.set_updated_at();

drop policy if exists customer_tags_authenticated_read on public.customer_tags;

drop policy if exists customer_tags_admin_read on public.customer_tags;
create policy customer_tags_admin_read
on public.customer_tags
for select to authenticated
using (public.is_admin());

commit;
