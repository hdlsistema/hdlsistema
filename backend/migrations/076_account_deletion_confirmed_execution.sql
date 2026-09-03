begin;

alter table public.account_deletion_requests
  add column if not exists confirmation_token_hash text,
  add column if not exists confirmation_sent_at timestamptz,
  add column if not exists confirmation_expires_at timestamptz,
  add column if not exists confirmation_used_at timestamptz,
  add column if not exists confirmed_at timestamptz,
  add column if not exists processing_started_at timestamptz,
  add column if not exists processing_due_at timestamptz,
  add column if not exists technical_error_at timestamptz,
  add column if not exists technical_error_code text,
  add column if not exists sessions_revoked_at timestamptz,
  add column if not exists auth_deleted_at timestamptz,
  add column if not exists apple_token_revoked_at timestamptz,
  add column if not exists apple_token_revoke_status text,
  add column if not exists personal_data_erased_at timestamptz,
  add column if not exists completion_email_sent_at timestamptz,
  add column if not exists session_token_ciphertext text,
  add column if not exists deletion_summary jsonb not null default '{}'::jsonb;

update public.account_deletion_requests
set status = case
  when status in ('requested', 'identity_verification') then 'awaiting_email_confirmation'
  when status = 'confirmed' then 'pending_processing'
  when status in ('rejected', 'cancelled') then 'completed'
  else status
end,
  completed_at = case
    when status in ('rejected', 'cancelled') then coalesce(completed_at, cancelled_at, reviewed_at, updated_at, now())
    else completed_at
  end,
  completed_by = case
    when status in ('rejected', 'cancelled') then coalesce(completed_by, cancelled_by, reviewed_by)
    else completed_by
  end,
  deletion_summary = case
    when status in ('rejected', 'cancelled') then
      coalesce(deletion_summary, '{}'::jsonb)
      || jsonb_build_object('legacyClosedStatus', status, 'legacyClosedAt', now())
    else deletion_summary
  end
where status in ('requested', 'identity_verification', 'confirmed', 'rejected', 'cancelled');

update public.account_deletion_request_history
set from_status = case
    when from_status in ('requested', 'identity_verification') then 'awaiting_email_confirmation'
    when from_status = 'confirmed' then 'pending_processing'
    when from_status in ('rejected', 'cancelled') then 'completed'
    else from_status
  end,
  to_status = case
    when to_status in ('requested', 'identity_verification') then 'awaiting_email_confirmation'
    when to_status = 'confirmed' then 'pending_processing'
    when to_status in ('rejected', 'cancelled') then 'completed'
    else to_status
  end
where from_status in ('requested', 'identity_verification', 'confirmed', 'rejected', 'cancelled')
   or to_status in ('requested', 'identity_verification', 'confirmed', 'rejected', 'cancelled');

alter table public.account_deletion_requests
  drop constraint if exists account_deletion_status_valid;

alter table public.account_deletion_requests
  add constraint account_deletion_status_valid check (
    status in ('awaiting_email_confirmation','pending_processing','in_progress','completed','technical_error')
  );

alter table public.account_deletion_request_history
  drop constraint if exists account_deletion_history_status_valid;

alter table public.account_deletion_request_history
  add constraint account_deletion_history_status_valid check (
    to_status in ('awaiting_email_confirmation','pending_processing','in_progress','completed','technical_error')
  );

drop index if exists public.uq_account_deletion_active_email;

create unique index if not exists uq_account_deletion_active_email
  on public.account_deletion_requests(lower(email::text))
  where status in ('awaiting_email_confirmation','pending_processing','in_progress','technical_error');

create index if not exists idx_account_deletion_token_hash
  on public.account_deletion_requests(confirmation_token_hash)
  where confirmation_token_hash is not null;

create index if not exists idx_account_deletion_processing
  on public.account_deletion_requests(status, processing_due_at)
  where status in ('pending_processing','in_progress','technical_error');

create table if not exists public.apple_sign_in_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider_user_id text,
  refresh_token_ciphertext text,
  access_token_ciphertext text,
  last_authorization_code_hash text,
  token_type text,
  expires_at timestamptz,
  revocation_status text not null default 'stored',
  revoked_at timestamptz,
  last_error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id),
  constraint apple_sign_in_tokens_revocation_status_check check (
    revocation_status in ('stored','revoked','failed','not_available','configuration_missing')
  )
);

create index if not exists idx_apple_sign_in_tokens_user
  on public.apple_sign_in_tokens(user_id);

drop trigger if exists set_apple_sign_in_tokens_updated_at on public.apple_sign_in_tokens;
create trigger set_apple_sign_in_tokens_updated_at
before update on public.apple_sign_in_tokens
for each row execute function public.set_updated_at();

alter table public.apple_sign_in_tokens enable row level security;

drop policy if exists apple_sign_in_tokens_service_only on public.apple_sign_in_tokens;
create policy apple_sign_in_tokens_service_only on public.apple_sign_in_tokens
for all to service_role
using (true)
with check (true);

revoke all on table public.apple_sign_in_tokens from anon, authenticated;
grant all on table public.apple_sign_in_tokens to service_role;

alter table if exists public.communication_events
  drop constraint if exists communication_events_type_check;

alter table if exists public.communication_events
  add constraint communication_events_type_check check (
    event_type in (
      'customer.welcome',
      'reservation.created',
      'reservation.rescheduled',
      'reservation.cancelled',
      'order.created',
      'order.pending_payment',
      'order.paid',
      'order.tracking_assigned',
      'order.shipped',
      'membership.activated',
      'membership.renewed',
      'membership.expiring',
      'security.password_changed',
      'quote.request.created',
      'quote.sent',
      'campaign.marketing',
      'account_deletion.confirmation',
      'account_deletion.completed'
    )
  );

insert into public.email_templates (template_key, locale, subject, preheader, status, copy_status)
values
  ('account_deletion.confirmation', 'es-MX', 'Confirma la eliminación de tu cuenta de Hacienda de Letras', 'Confirma desde este correo para iniciar el procesamiento de eliminación.', 'active', 'approved'),
  ('account_deletion.confirmation', 'en-US', 'Confirm deletion of your Hacienda de Letras account', 'Confirm from this email to start account deletion processing.', 'active', 'approved'),
  ('account_deletion.completed', 'es-MX', 'Tu cuenta de Hacienda de Letras ha sido eliminada', 'La eliminación de tu cuenta fue completada.', 'active', 'approved'),
  ('account_deletion.completed', 'en-US', 'Your Hacienda de Letras account has been deleted', 'Your account deletion has been completed.', 'active', 'approved')
on conflict (template_key, locale) do update set
  subject = excluded.subject,
  preheader = excluded.preheader,
  status = excluded.status,
  copy_status = excluded.copy_status,
  updated_at = now();

comment on table public.apple_sign_in_tokens is
  'Server-only storage for Sign in with Apple refresh/access tokens used exclusively for account deletion revocation.';

comment on column public.account_deletion_requests.status is
  'awaiting_email_confirmation is pre-order. pending_processing, in_progress, completed and technical_error are execution-only states.';

commit;
