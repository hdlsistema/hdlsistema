-- Customer-visible order tracking, push delivery state and transactional email event.
-- Additive and backward compatible with existing orders, shipments and notifications.

begin;

alter table if exists public.notifications
  add column if not exists push_status text not null default 'pending',
  add column if not exists push_sent_at timestamptz,
  add column if not exists push_error_code text,
  add column if not exists updated_at timestamptz not null default now();

alter table if exists public.notifications
  drop constraint if exists notifications_push_status_check;

alter table if exists public.notifications
  add constraint notifications_push_status_check check (
    push_status in ('pending', 'sent', 'failed', 'skipped', 'pending_configuration')
  );

create index if not exists idx_notifications_customer_created
  on public.notifications(customer_id, created_at desc);

create index if not exists idx_notifications_push_pending
  on public.notifications(push_status, created_at)
  where push_status in ('pending', 'failed', 'pending_configuration');

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
      'campaign.marketing'
    )
  );

insert into public.email_templates (template_key, locale, subject, preheader, status)
values
  ('order.tracking_assigned', 'es-MX', 'La guía de tu pedido está lista', 'Ya puedes consultar y rastrear tu envío.', 'active'),
  ('order.tracking_assigned', 'en-US', 'Your tracking details are ready', 'You can now review and track your shipment.', 'active'),
  ('order.shipped', 'es-MX', 'Tu pedido va en camino', 'La guía de tu pedido ya está disponible.', 'active'),
  ('order.shipped', 'en-US', 'Your order is on its way', 'Your tracking details are now available.', 'active')
on conflict (template_key, locale) do update set
  subject = excluded.subject,
  preheader = excluded.preheader,
  status = excluded.status,
  updated_at = now();

insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, after_data)
values (
  null,
  'migration_044_customer_tracking_communications',
  'system',
  gen_random_uuid(),
  jsonb_build_object('status', 'applied', 'scope', 'tracking_email_push_preview')
)
on conflict do nothing;

commit;
