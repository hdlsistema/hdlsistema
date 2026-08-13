begin;

create table if not exists public.account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  request_number text not null unique,
  user_id uuid references auth.users(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  email citext not null,
  requested_name text,
  source text not null,
  status text not null default 'requested',
  explicit_confirmation_at timestamptz not null,
  legal_retention_acknowledged_at timestamptz not null,
  identity_verified_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  completed_at timestamptz,
  completed_by uuid references auth.users(id) on delete set null,
  cancelled_at timestamptz,
  cancelled_by uuid references auth.users(id) on delete set null,
  admin_notes text,
  retention_notes text,
  deletion_scope jsonb not null default jsonb_build_object(
    'account', true,
    'profile', true,
    'preferences', true,
    'savedAddresses', true,
    'deviceRegistrations', true,
    'nonRequiredActivity', true
  ),
  request_context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint account_deletion_source_valid check (source in ('public_web','mobile_app','admin')),
  constraint account_deletion_status_valid check (
    status in ('requested','identity_verification','confirmed','in_progress','completed','rejected','cancelled')
  ),
  constraint account_deletion_email_present check (length(trim(email::text)) > 3)
);

create table if not exists public.account_deletion_request_history (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.account_deletion_requests(id) on delete cascade,
  from_status text,
  to_status text not null,
  notes text,
  actor_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint account_deletion_history_status_valid check (
    to_status in ('requested','identity_verification','confirmed','in_progress','completed','rejected','cancelled')
  )
);

create index if not exists idx_account_deletion_status_created
  on public.account_deletion_requests(status, created_at desc);
create index if not exists idx_account_deletion_user
  on public.account_deletion_requests(user_id, created_at desc);
create index if not exists idx_account_deletion_customer
  on public.account_deletion_requests(customer_id, created_at desc);
create index if not exists idx_account_deletion_email
  on public.account_deletion_requests(lower(email::text), created_at desc);
create unique index if not exists uq_account_deletion_active_email
  on public.account_deletion_requests(lower(email::text))
  where status not in ('completed','rejected','cancelled');
create index if not exists idx_account_deletion_history_request
  on public.account_deletion_request_history(request_id, created_at desc);

drop trigger if exists set_account_deletion_requests_updated_at on public.account_deletion_requests;
create trigger set_account_deletion_requests_updated_at
before update on public.account_deletion_requests
for each row execute function public.set_updated_at();

create or replace function public.track_account_deletion_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.account_deletion_request_history (
      request_id, from_status, to_status, actor_user_id
    ) values (
      new.id, null, new.status, coalesce(new.reviewed_by, new.user_id)
    );
  elsif old.status is distinct from new.status then
    insert into public.account_deletion_request_history (
      request_id, from_status, to_status, actor_user_id
    ) values (
      new.id, old.status, new.status,
      coalesce(new.completed_by, new.cancelled_by, new.reviewed_by, new.user_id)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists track_account_deletion_status on public.account_deletion_requests;
create trigger track_account_deletion_status
after insert or update of status on public.account_deletion_requests
for each row execute function public.track_account_deletion_status();

alter table public.account_deletion_requests enable row level security;
alter table public.account_deletion_request_history enable row level security;

drop policy if exists account_deletion_admin_read on public.account_deletion_requests;
create policy account_deletion_admin_read on public.account_deletion_requests
for select to authenticated
using (public.has_any_role(array['super_admin','admin','operations','finance']));

drop policy if exists account_deletion_admin_write on public.account_deletion_requests;
create policy account_deletion_admin_write on public.account_deletion_requests
for all to authenticated
using (public.has_any_role(array['super_admin','admin','operations']))
with check (public.has_any_role(array['super_admin','admin','operations']));

drop policy if exists account_deletion_own_read on public.account_deletion_requests;
create policy account_deletion_own_read on public.account_deletion_requests
for select to authenticated
using (user_id = auth.uid());

drop policy if exists account_deletion_history_admin_read on public.account_deletion_request_history;
create policy account_deletion_history_admin_read on public.account_deletion_request_history
for select to authenticated
using (public.has_any_role(array['super_admin','admin','operations','finance']));

drop policy if exists account_deletion_history_admin_write on public.account_deletion_request_history;
create policy account_deletion_history_admin_write on public.account_deletion_request_history
for all to authenticated
using (public.has_any_role(array['super_admin','admin','operations']))
with check (public.has_any_role(array['super_admin','admin','operations']));

drop policy if exists account_deletion_history_own_read on public.account_deletion_request_history;
create policy account_deletion_history_own_read on public.account_deletion_request_history
for select to authenticated
using (
  exists (
    select 1
    from public.account_deletion_requests request
    where request.id = account_deletion_request_history.request_id
      and request.user_id = auth.uid()
  )
);

revoke all on table public.account_deletion_requests from anon;
revoke all on table public.account_deletion_request_history from anon;
revoke all on function public.track_account_deletion_status() from public, anon;

grant select on table public.account_deletion_requests to authenticated;
grant select on table public.account_deletion_request_history to authenticated;
grant all on table public.account_deletion_requests to service_role;
grant all on table public.account_deletion_request_history to service_role;

commit;
