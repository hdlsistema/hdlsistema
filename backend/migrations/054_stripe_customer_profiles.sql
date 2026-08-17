begin;

-- Vincula cada cliente con el objeto Customer de Stripe sin almacenar datos
-- de tarjeta. Los PAN/CVC permanecen exclusivamente tokenizados en Stripe.
create table if not exists public.customer_payment_profiles (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  provider text not null default 'stripe',
  provider_customer_id text not null,
  provider_environment text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (customer_id, provider, provider_environment),
  unique (provider, provider_customer_id, provider_environment)
);

create index if not exists idx_customer_payment_profiles_user
  on public.customer_payment_profiles(user_id, provider_environment);

alter table public.customer_payment_profiles enable row level security;

drop policy if exists admin_all on public.customer_payment_profiles;
create policy admin_all on public.customer_payment_profiles
for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists customer_payment_profiles_own_read on public.customer_payment_profiles;
create policy customer_payment_profiles_own_read on public.customer_payment_profiles
for select to authenticated using (
  user_id = auth.uid() and customer_id = public.current_customer_id()
);

commit;
