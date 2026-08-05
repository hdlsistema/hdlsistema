begin;

create unique index if not exists idx_payments_stripe_provider_payment_id
on public.payments(provider, provider_payment_id)
where provider = 'stripe' and provider_payment_id is not null;

create index if not exists idx_payments_stripe_order_status
on public.payments(order_id, status, created_at desc)
where provider = 'stripe';

create index if not exists idx_payment_webhook_events_stripe_provider_event
on public.payment_webhook_events(provider, provider_event_id)
where provider = 'stripe';

create index if not exists idx_orders_customer_pending_payment
on public.orders(customer_id, user_id, status, created_at desc)
where status in ('pending_payment', 'processing');

commit;
