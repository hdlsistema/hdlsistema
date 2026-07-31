begin;

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  channel text not null,
  audience_definition jsonb not null default '{}'::jsonb,
  content jsonb not null default '{}'::jsonb,
  scheduled_at timestamptz,
  sent_at timestamptz,
  status public.campaign_status not null default 'draft',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.campaign_recipients (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  delivery_status public.notification_status not null default 'pending',
  delivered_at timestamptz,
  opened_at timestamptz,
  clicked_at timestamptz,
  error_code text,
  created_at timestamptz not null default now(),
  unique (campaign_id, customer_id)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete cascade,
  channel text not null,
  title text not null,
  body text not null,
  data jsonb not null default '{}'::jsonb,
  status public.notification_status not null default 'pending',
  sent_at timestamptz,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.notification_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  firebase_token text not null unique,
  platform text not null,
  active boolean not null default true,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_campaigns_status on public.campaigns(status);
create index if not exists idx_campaigns_scheduled_at on public.campaigns(scheduled_at);
create index if not exists idx_campaign_recipients_campaign_id on public.campaign_recipients(campaign_id);
create index if not exists idx_campaign_recipients_customer_id on public.campaign_recipients(customer_id);
create index if not exists idx_notifications_user_id on public.notifications(user_id);
create index if not exists idx_notifications_customer_id on public.notifications(customer_id);
create index if not exists idx_notifications_status on public.notifications(status);
create index if not exists idx_notification_devices_user_id on public.notification_devices(user_id);

commit;
