begin;

create extension if not exists pgcrypto;
create extension if not exists citext;

do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'vector') then
    create extension if not exists vector;
  end if;
end $$;

do $$
begin
  create type public.user_role as enum (
    'super_admin', 'admin', 'operations', 'marketing', 'finance', 'viewer', 'customer'
  );
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.content_status as enum ('draft', 'published', 'archived', 'inactive');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.reservation_status as enum (
    'pending', 'confirmed', 'cancelled', 'completed', 'no_show'
  );
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.payment_status as enum (
    'pending', 'processing', 'paid', 'failed', 'refunded', 'partially_refunded', 'cancelled'
  );
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.order_status as enum (
    'draft', 'pending_payment', 'paid', 'processing', 'fulfilled', 'cancelled', 'refunded'
  );
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.event_status as enum (
    'draft', 'published', 'sold_out', 'cancelled', 'completed'
  );
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.membership_status as enum (
    'pending', 'active', 'paused', 'expired', 'cancelled'
  );
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.notification_status as enum ('pending', 'sent', 'failed', 'read');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.campaign_status as enum (
    'draft', 'scheduled', 'active', 'paused', 'completed', 'cancelled'
  );
exception when duplicate_object then null;
end $$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

commit;
