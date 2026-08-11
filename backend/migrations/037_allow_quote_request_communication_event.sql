begin;

alter table public.communication_events
  drop constraint if exists communication_events_type_check;

alter table public.communication_events
  add constraint communication_events_type_check check (
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
      'security.password_changed',
      'quote.request.created'
    )
  );

commit;
