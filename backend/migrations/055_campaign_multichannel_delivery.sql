begin;

-- Métricas por canal para campañas reales de email, push y buzón dentro de App.
create table if not exists public.campaign_recipient_deliveries (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  notification_id uuid references public.notifications(id) on delete set null,
  channel text not null check (channel in ('email', 'push', 'in_app')),
  status text not null default 'pending' check (
    status in ('pending', 'sent', 'delivered', 'failed', 'skipped', 'pending_configuration', 'read')
  ),
  provider_reference text,
  error_code text,
  delivered_at timestamptz,
  opened_at timestamptz,
  clicked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (campaign_id, customer_id, channel)
);

create index if not exists idx_campaign_recipient_deliveries_metrics
  on public.campaign_recipient_deliveries(campaign_id, channel, status);
create index if not exists idx_campaign_recipient_deliveries_notification
  on public.campaign_recipient_deliveries(notification_id)
  where notification_id is not null;

alter table public.campaign_recipient_deliveries enable row level security;

drop policy if exists admin_all on public.campaign_recipient_deliveries;
create policy admin_all on public.campaign_recipient_deliveries
for all to authenticated using (public.is_admin()) with check (public.is_admin());

commit;
