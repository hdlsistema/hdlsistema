begin;

create table if not exists public.communication_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  aggregate_type text not null,
  aggregate_id uuid,
  customer_id uuid references public.customers(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  locale text not null default 'es-MX',
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'queued',
  idempotency_key text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint communication_events_status_check check (
    status in ('queued', 'processing', 'sent', 'failed', 'blocked', 'pending_configuration')
  ),
  constraint communication_events_type_check check (
    event_type in (
      'customer.welcome',
      'reservation.created',
      'reservation.rescheduled',
      'reservation.cancelled',
      'order.created',
      'order.pending_payment',
      'order.paid',
      'membership.activated',
      'membership.renewed',
      'membership.expiring',
      'security.password_changed'
    )
  )
);

create table if not exists public.email_templates (
  id uuid primary key default gen_random_uuid(),
  template_key text not null,
  locale text not null default 'es-MX',
  subject text not null,
  preheader text,
  status text not null default 'draft',
  copy_status text not null default 'pending_hacienda_approval',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (template_key, locale),
  constraint email_templates_status_check check (status in ('draft', 'active', 'archived'))
);

create table if not exists public.email_outbox (
  id uuid primary key default gen_random_uuid(),
  communication_event_id uuid not null references public.communication_events(id) on delete cascade,
  template_key text not null,
  recipient_customer_id uuid references public.customers(id) on delete set null,
  recipient_user_id uuid references auth.users(id) on delete set null,
  recipient_email citext not null,
  locale text not null default 'es-MX',
  subject text not null,
  preheader text,
  html_body text not null,
  text_body text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'queued',
  attempts integer not null default 0,
  max_attempts integer not null default 3,
  scheduled_at timestamptz not null default now(),
  locked_at timestamptz,
  sent_at timestamptz,
  delivered_at timestamptz,
  failed_at timestamptz,
  provider text not null default 'resend',
  provider_message_id text,
  error_code text,
  idempotency_key text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint email_outbox_status_check check (
    status in ('queued', 'processing', 'sent', 'delivered', 'bounced', 'complained', 'failed', 'blocked', 'pending_configuration')
  ),
  constraint email_outbox_attempts_check check (attempts >= 0 and max_attempts between 1 and 10)
);

create table if not exists public.email_deliveries (
  id uuid primary key default gen_random_uuid(),
  email_outbox_id uuid references public.email_outbox(id) on delete set null,
  provider text not null default 'resend',
  provider_message_id text,
  provider_event_id text not null,
  event_type text not null,
  status text not null,
  payload jsonb not null default '{}'::jsonb,
  provider_created_at timestamptz,
  created_at timestamptz not null default now(),
  unique (provider, provider_event_id)
);

create table if not exists public.communication_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete cascade,
  locale text not null default 'es-MX',
  transactional_email boolean not null default true,
  marketing_email boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint communication_preferences_owner_check check (user_id is not null or customer_id is not null),
  unique (user_id, customer_id)
);

create index if not exists idx_communication_events_type on public.communication_events(event_type);
create index if not exists idx_communication_events_customer on public.communication_events(customer_id);
create index if not exists idx_communication_events_status on public.communication_events(status, created_at);
create index if not exists idx_email_outbox_status on public.email_outbox(status, scheduled_at);
create index if not exists idx_email_outbox_customer on public.email_outbox(recipient_customer_id);
create index if not exists idx_email_outbox_provider_message on public.email_outbox(provider, provider_message_id);
create index if not exists idx_email_deliveries_outbox on public.email_deliveries(email_outbox_id);
create index if not exists idx_communication_preferences_user on public.communication_preferences(user_id);
create index if not exists idx_communication_preferences_customer on public.communication_preferences(customer_id);

alter table public.communication_events enable row level security;
alter table public.email_templates enable row level security;
alter table public.email_outbox enable row level security;
alter table public.email_deliveries enable row level security;
alter table public.communication_preferences enable row level security;

drop policy if exists admin_all on public.communication_events;
create policy admin_all on public.communication_events
for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists admin_all on public.email_templates;
create policy admin_all on public.email_templates
for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists admin_all on public.email_outbox;
create policy admin_all on public.email_outbox
for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists admin_all on public.email_deliveries;
create policy admin_all on public.email_deliveries
for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists admin_all on public.communication_preferences;
create policy admin_all on public.communication_preferences
for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists communication_preferences_own on public.communication_preferences;
create policy communication_preferences_own on public.communication_preferences
for all to authenticated using (
  user_id = auth.uid() or customer_id = public.current_customer_id()
) with check (
  user_id = auth.uid() or customer_id = public.current_customer_id()
);

drop policy if exists communication_events_own_read on public.communication_events;
create policy communication_events_own_read on public.communication_events
for select to authenticated using (
  user_id = auth.uid() or customer_id = public.current_customer_id()
);

drop policy if exists email_outbox_own_read on public.email_outbox;
create policy email_outbox_own_read on public.email_outbox
for select to authenticated using (
  recipient_user_id = auth.uid() or recipient_customer_id = public.current_customer_id()
);

insert into public.email_templates (template_key, locale, subject, preheader, status)
values
  ('customer.welcome', 'es-MX', 'Bienvenida a Hacienda de Letras', 'Tu cuenta ya está lista.', 'active'),
  ('reservation.created', 'es-MX', 'Reservación recibida', 'Recibimos tu solicitud de reservación.', 'active'),
  ('reservation.rescheduled', 'es-MX', 'Reservación reprogramada', 'Actualizamos el horario de tu reservación.', 'active'),
  ('reservation.cancelled', 'es-MX', 'Reservación cancelada', 'Tu reservación fue cancelada correctamente.', 'active'),
  ('order.created', 'es-MX', 'Orden creada', 'Tu orden fue registrada.', 'active'),
  ('order.pending_payment', 'es-MX', 'Orden pendiente de pago', 'Tu orden está pendiente de pago.', 'active'),
  ('order.paid', 'es-MX', 'Pago confirmado', 'Tu pago fue confirmado.', 'draft'),
  ('membership.activated', 'es-MX', 'Membresía activada', 'Tu membresía Wine Club ya está activa.', 'active'),
  ('membership.renewed', 'es-MX', 'Membresía renovada', 'Tu membresía Wine Club fue renovada.', 'active'),
  ('membership.expiring', 'es-MX', 'Tu membresía está por expirar', 'Te avisamos antes del vencimiento de tu membresía.', 'draft'),
  ('security.password_changed', 'es-MX', 'Contraseña actualizada', 'Tu contraseña fue actualizada.', 'draft'),
  ('customer.welcome', 'en-US', 'Welcome to Hacienda de Letras', 'Your account is ready.', 'draft'),
  ('reservation.created', 'en-US', 'Reservation received', 'We received your reservation request.', 'draft'),
  ('reservation.rescheduled', 'en-US', 'Reservation rescheduled', 'Your reservation time was updated.', 'draft'),
  ('reservation.cancelled', 'en-US', 'Reservation cancelled', 'Your reservation was cancelled.', 'draft'),
  ('order.created', 'en-US', 'Order created', 'Your order was registered.', 'draft'),
  ('order.pending_payment', 'en-US', 'Order pending payment', 'Your order is pending payment.', 'draft'),
  ('order.paid', 'en-US', 'Payment confirmed', 'Your payment was confirmed.', 'draft'),
  ('membership.activated', 'en-US', 'Membership activated', 'Your Wine Club membership is active.', 'draft'),
  ('membership.renewed', 'en-US', 'Membership renewed', 'Your Wine Club membership was renewed.', 'draft'),
  ('membership.expiring', 'en-US', 'Your membership is expiring soon', 'We are notifying you before your membership expires.', 'draft'),
  ('security.password_changed', 'en-US', 'Password updated', 'Your password was updated.', 'draft')
on conflict (template_key, locale) do nothing;

commit;
