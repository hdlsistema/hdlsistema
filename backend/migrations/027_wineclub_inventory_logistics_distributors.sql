begin;

alter table public.memberships add column if not exists renewal_date timestamptz;
alter table public.memberships add column if not exists expires_at timestamptz;
alter table public.memberships add column if not exists activated_at timestamptz;
alter table public.memberships add column if not exists paused_at timestamptz;
alter table public.memberships add column if not exists cancelled_at timestamptz;
alter table public.memberships add column if not exists cancellation_reason text;
alter table public.memberships add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.memberships add column if not exists updated_by uuid references auth.users(id) on delete set null;
alter table public.memberships add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.loyalty_transactions add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.loyalty_transactions add column if not exists idempotency_key text;
alter table public.loyalty_transactions add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.membership_benefits add column if not exists description text;
alter table public.membership_benefits add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.inventory_locations add column if not exists code text;
alter table public.inventory_locations add column if not exists updated_at timestamptz not null default now();
alter table public.inventory_locations add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.inventory_locations add column if not exists updated_by uuid references auth.users(id) on delete set null;
alter table public.inventory_locations add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.inventory_items add column if not exists sku text;
alter table public.inventory_items add column if not exists product_name text;
alter table public.inventory_items add column if not exists lot_code text;
alter table public.inventory_items add column if not exists unit_of_measure text not null default 'bottle';
alter table public.inventory_items add column if not exists minimum_quantity integer not null default 0;
alter table public.inventory_items add column if not exists maximum_quantity integer;
alter table public.inventory_items add column if not exists unit_cost numeric(12,2);
alter table public.inventory_items add column if not exists status text not null default 'active';
alter table public.inventory_items add column if not exists created_at timestamptz not null default now();
alter table public.inventory_items add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.inventory_items add column if not exists updated_by uuid references auth.users(id) on delete set null;
alter table public.inventory_items add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.inventory_movements add column if not exists from_location_id uuid references public.inventory_locations(id) on delete set null;
alter table public.inventory_movements add column if not exists to_location_id uuid references public.inventory_locations(id) on delete set null;
alter table public.inventory_movements add column if not exists reason text;
alter table public.inventory_movements add column if not exists idempotency_key text;
alter table public.inventory_movements add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.shipments add column if not exists shipment_number text;
alter table public.shipments add column if not exists carrier_id uuid;
alter table public.shipments add column if not exists service_level text;
alter table public.shipments add column if not exists origin text;
alter table public.shipments add column if not exists destination text;
alter table public.shipments add column if not exists shipping_cost numeric(12,2) not null default 0;
alter table public.shipments add column if not exists status_text text not null default 'pending';
alter table public.shipments add column if not exists estimated_delivery_at timestamptz;
alter table public.shipments add column if not exists delivered_by uuid references auth.users(id) on delete set null;
alter table public.shipments add column if not exists cancelled_at timestamptz;
alter table public.shipments add column if not exists cancellation_reason text;
alter table public.shipments add column if not exists incident_count integer not null default 0;
alter table public.shipments add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.shipments add column if not exists updated_by uuid references auth.users(id) on delete set null;
alter table public.shipments add column if not exists metadata jsonb not null default '{}'::jsonb;

create table if not exists public.carriers (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  carrier_type text not null default 'manual',
  contact_name text,
  phone text,
  email citext,
  active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'shipments_carrier_id_fkey') then
    alter table public.shipments
      add constraint shipments_carrier_id_fkey
      foreign key (carrier_id) references public.carriers(id) on delete set null
      not valid;
  end if;
end $$;

alter table public.shipments validate constraint shipments_carrier_id_fkey;

create table if not exists public.shipment_events (
  id uuid primary key default gen_random_uuid(),
  shipment_id uuid not null references public.shipments(id) on delete cascade,
  event_type text not null,
  status_text text,
  notes text,
  evidence_storage_path text,
  occurred_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.distributors add column if not exists distributor_number text;
alter table public.distributors add column if not exists zone text;
alter table public.distributors add column if not exists distributor_type text not null default 'wholesale';
alter table public.distributors add column if not exists operational_status text not null default 'prospect';
alter table public.distributors add column if not exists commercial_terms text;
alter table public.distributors add column if not exists price_list_name text;
alter table public.distributors add column if not exists credit_limit numeric(12,2);
alter table public.distributors add column if not exists notes text;
alter table public.distributors add column if not exists archived_at timestamptz;
alter table public.distributors add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.distributors add column if not exists updated_by uuid references auth.users(id) on delete set null;
alter table public.distributors add column if not exists metadata jsonb not null default '{}'::jsonb;

create table if not exists public.distributor_contacts (
  id uuid primary key default gen_random_uuid(),
  distributor_id uuid not null references public.distributors(id) on delete cascade,
  name text not null,
  role_title text,
  email citext,
  phone text,
  is_primary boolean not null default false,
  active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.distributor_orders add column if not exists order_status_text text not null default 'draft';
alter table public.distributor_orders add column if not exists submitted_at timestamptz;
alter table public.distributor_orders add column if not exists approved_at timestamptz;
alter table public.distributor_orders add column if not exists rejected_at timestamptz;
alter table public.distributor_orders add column if not exists prepared_at timestamptz;
alter table public.distributor_orders add column if not exists shipped_at timestamptz;
alter table public.distributor_orders add column if not exists delivered_at timestamptz;
alter table public.distributor_orders add column if not exists cancelled_at timestamptz;
alter table public.distributor_orders add column if not exists rejected_reason text;
alter table public.distributor_orders add column if not exists cancellation_reason text;
alter table public.distributor_orders add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.distributor_orders add column if not exists updated_by uuid references auth.users(id) on delete set null;
alter table public.distributor_orders add column if not exists metadata jsonb not null default '{}'::jsonb;

create table if not exists public.distributor_order_items (
  id uuid primary key default gen_random_uuid(),
  distributor_order_id uuid not null references public.distributor_orders(id) on delete cascade,
  wine_id uuid references public.wines(id) on delete set null,
  sku_snapshot text,
  name_snapshot text not null,
  quantity integer not null check (quantity > 0),
  unit_price numeric(12,2) not null check (unit_price >= 0),
  subtotal numeric(12,2) not null check (subtotal >= 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'memberships_dates_valid') then
    alter table public.memberships add constraint memberships_dates_valid
    check (
      (expires_at is null or expires_at > starts_at)
      and (renewal_date is null or renewal_date >= starts_at)
    );
  end if;

  if not exists (select 1 from pg_constraint where conname = 'inventory_items_quantities_valid') then
    alter table public.inventory_items add constraint inventory_items_quantities_valid
    check (
      quantity >= 0
      and reserved_quantity >= 0
      and reserved_quantity <= quantity
      and minimum_quantity >= 0
      and (maximum_quantity is null or maximum_quantity >= minimum_quantity)
      and (unit_cost is null or unit_cost >= 0)
      and status in ('active','inactive','archived')
    );
  end if;

  if not exists (select 1 from pg_constraint where conname = 'inventory_movements_type_valid') then
    alter table public.inventory_movements add constraint inventory_movements_type_valid
    check (movement_type in (
      'purchase','production','transfer_in','transfer_out','reservation','release','sale','return',
      'adjustment_in','adjustment_out','damage','loss','sample','event_consumption'
    ));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'shipments_status_text_valid') then
    alter table public.shipments add constraint shipments_status_text_valid
    check (status_text in ('pending','preparing','ready','shipped','in_transit','delivered','failed','returned','cancelled'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'shipments_shipping_cost_valid') then
    alter table public.shipments add constraint shipments_shipping_cost_valid
    check (shipping_cost >= 0 and incident_count >= 0);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'distributors_operational_status_valid') then
    alter table public.distributors add constraint distributors_operational_status_valid
    check (operational_status in ('prospect','active','inactive','suspended','archived'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'distributors_credit_limit_valid') then
    alter table public.distributors add constraint distributors_credit_limit_valid
    check (credit_limit is null or credit_limit >= 0);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'distributor_orders_status_text_valid') then
    alter table public.distributor_orders add constraint distributor_orders_status_text_valid
    check (order_status_text in ('draft','submitted','approved','rejected','preparing','shipped','delivered','cancelled'));
  end if;
end $$;

update public.memberships set expires_at = ends_at where expires_at is null and ends_at is not null;
update public.inventory_items set minimum_quantity = reorder_point where minimum_quantity = 0 and reorder_point > 0;
update public.shipments
set shipment_number = 'SHP-' || to_char(created_at, 'YYYYMMDD') || '-' || upper(substr(replace(id::text, '-', ''), 1, 8))
where shipment_number is null;
update public.distributors
set distributor_number = 'DIST-' || to_char(created_at, 'YYYYMMDD') || '-' || upper(substr(replace(id::text, '-', ''), 1, 8))
where distributor_number is null;
update public.distributor_orders set order_status_text = status::text where order_status_text = 'draft' and status::text <> 'draft';

create unique index if not exists idx_memberships_one_live_per_customer
on public.memberships(customer_id)
where status in ('pending','active','paused');

create unique index if not exists idx_loyalty_order_once
on public.loyalty_transactions(membership_id, reference_type, reference_id, transaction_type)
where reference_type = 'order' and reference_id is not null;

create unique index if not exists idx_loyalty_idempotency_actor
on public.loyalty_transactions(created_by, idempotency_key)
where idempotency_key is not null;

create unique index if not exists idx_inventory_locations_code
on public.inventory_locations(code)
where code is not null;

create index if not exists idx_inventory_items_sku on public.inventory_items(sku);
create index if not exists idx_inventory_items_low_stock on public.inventory_items(minimum_quantity, quantity, reserved_quantity);
create unique index if not exists idx_inventory_movements_idempotency_actor
on public.inventory_movements(created_by, idempotency_key)
where idempotency_key is not null;

create unique index if not exists idx_shipments_number
on public.shipments(shipment_number)
where shipment_number is not null;
create index if not exists idx_shipments_status_text on public.shipments(status_text);
create index if not exists idx_shipments_carrier_id on public.shipments(carrier_id);
create unique index if not exists idx_shipments_idempotency_actor
on public.shipments(created_by, ((metadata ->> 'idempotencyKey')))
where metadata ? 'idempotencyKey';
create index if not exists idx_shipment_events_shipment_id on public.shipment_events(shipment_id);

create unique index if not exists idx_distributors_number
on public.distributors(distributor_number)
where distributor_number is not null;
create index if not exists idx_distributors_operational_status on public.distributors(operational_status);
create index if not exists idx_distributors_zone on public.distributors(zone);
create index if not exists idx_distributor_contacts_distributor_id on public.distributor_contacts(distributor_id);
create index if not exists idx_distributor_orders_status_text on public.distributor_orders(order_status_text);
create index if not exists idx_distributor_order_items_order_id on public.distributor_order_items(distributor_order_id);

do $$
declare
  item text;
begin
  foreach item in array array[
    'carriers',
    'shipment_events',
    'distributor_contacts',
    'distributor_order_items'
  ]
  loop
    execute format('alter table public.%I enable row level security', item);
    execute format('drop policy if exists admin_all on public.%I', item);
    execute format(
      'create policy admin_all on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())',
      item
    );
  end loop;
end $$;

create or replace function public.assign_membership(
  p_customer_id uuid,
  p_plan_id uuid,
  p_start_date timestamptz default now(),
  p_idempotency_key text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid;
  v_membership_id uuid;
  v_number text;
  v_plan public.membership_plans%rowtype;
  v_period text;
  v_expires_at timestamptz;
  v_benefit text;
begin
  v_actor_id := public.current_transaction_operator(array['super_admin','admin','finance']);

  if p_idempotency_key is not null then
    select id into v_membership_id
    from public.memberships
    where metadata ->> 'idempotencyKey' = p_idempotency_key
    limit 1;
    if v_membership_id is not null then
      return v_membership_id;
    end if;
  end if;

  select * into v_plan from public.membership_plans where id = p_plan_id and active = true;
  if v_plan.id is null then
    raise exception 'PLAN_NOT_FOUND' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.customers where id = p_customer_id and archived_at is null) then
    raise exception 'CUSTOMER_NOT_FOUND' using errcode = 'P0001';
  end if;
  if exists (
    select 1 from public.memberships
    where customer_id = p_customer_id and status in ('pending','active','paused')
  ) then
    raise exception 'MEMBERSHIP_DUPLICATE' using errcode = 'P0001';
  end if;

  v_period := lower(v_plan.billing_period);
  v_expires_at := case
    when v_period in ('monthly','mensual') then p_start_date + interval '1 month'
    when v_period in ('quarterly','trimestral') then p_start_date + interval '3 months'
    when v_period in ('annual','yearly','anual') then p_start_date + interval '1 year'
    else p_start_date + interval '1 year'
  end;
  v_number := 'MEM-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

  insert into public.memberships (
    customer_id, plan_id, membership_number, status, starts_at, ends_at, renewal_date, expires_at,
    auto_renew, points_balance, created_by, updated_by, metadata
  )
  values (
    p_customer_id, p_plan_id, v_number, 'pending', p_start_date, v_expires_at, v_expires_at, v_expires_at,
    true, 0, v_actor_id, v_actor_id, jsonb_build_object('idempotencyKey', p_idempotency_key)
  )
  returning id into v_membership_id;

  if jsonb_typeof(coalesce(v_plan.benefits, '{}'::jsonb)) = 'object' then
    for v_benefit in select jsonb_object_keys(v_plan.benefits)
    loop
      insert into public.membership_benefits (membership_id, benefit_code, description, valid_from, valid_until)
      values (v_membership_id, v_benefit, v_plan.benefits ->> v_benefit, p_start_date, v_expires_at);
    end loop;
  end if;

  perform public.write_transaction_audit(v_actor_id, 'membership_assigned', 'memberships', v_membership_id, null, jsonb_build_object('membership_number', v_number));
  return v_membership_id;
end;
$$;

create or replace function public.transition_membership(
  p_membership_id uuid,
  p_next_status public.membership_status,
  p_reason text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid;
  v_membership public.memberships%rowtype;
  v_allowed boolean;
begin
  v_actor_id := public.current_transaction_operator(array['super_admin','admin','finance']);
  select * into v_membership from public.memberships where id = p_membership_id for update;
  if v_membership.id is null then
    raise exception 'MEMBERSHIP_NOT_FOUND' using errcode = 'P0001';
  end if;
  if v_membership.status = p_next_status then
    return p_membership_id;
  end if;

  v_allowed := (v_membership.status = 'pending' and p_next_status = 'active')
    or (v_membership.status = 'active' and p_next_status in ('paused','cancelled','expired'))
    or (v_membership.status = 'paused' and p_next_status in ('active','cancelled','expired'));

  if not v_allowed then
    raise exception 'INVALID_STATUS_TRANSITION' using errcode = 'P0001';
  end if;

  update public.memberships
  set status = p_next_status,
      activated_at = case when p_next_status = 'active' then coalesce(activated_at, now()) else activated_at end,
      paused_at = case when p_next_status = 'paused' then now() else paused_at end,
      cancelled_at = case when p_next_status = 'cancelled' then now() else cancelled_at end,
      cancellation_reason = case when p_next_status = 'cancelled' then coalesce(nullif(p_reason, ''), cancellation_reason) else cancellation_reason end,
      updated_by = v_actor_id,
      updated_at = now()
  where id = p_membership_id;

  perform public.write_transaction_audit(v_actor_id, 'membership_status_updated', 'memberships', p_membership_id, jsonb_build_object('status', v_membership.status), jsonb_build_object('status', p_next_status, 'reason', p_reason));
  return p_membership_id;
end;
$$;

create or replace function public.activate_membership(p_membership_id uuid)
returns uuid language sql security definer set search_path = public
as $$ select public.transition_membership(p_membership_id, 'active'::public.membership_status, null); $$;

create or replace function public.pause_membership(p_membership_id uuid, p_reason text default null)
returns uuid language sql security definer set search_path = public
as $$ select public.transition_membership(p_membership_id, 'paused'::public.membership_status, p_reason); $$;

create or replace function public.resume_membership(p_membership_id uuid)
returns uuid language sql security definer set search_path = public
as $$ select public.transition_membership(p_membership_id, 'active'::public.membership_status, null); $$;

create or replace function public.cancel_membership(p_membership_id uuid, p_reason text)
returns uuid language sql security definer set search_path = public
as $$ select public.transition_membership(p_membership_id, 'cancelled'::public.membership_status, p_reason); $$;

create or replace function public.renew_membership(
  p_membership_id uuid,
  p_idempotency_key text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid;
  v_membership public.memberships%rowtype;
  v_plan public.membership_plans%rowtype;
  v_base timestamptz;
  v_next timestamptz;
begin
  v_actor_id := public.current_transaction_operator(array['super_admin','admin','finance']);
  select * into v_membership from public.memberships where id = p_membership_id for update;
  if v_membership.id is null then
    raise exception 'MEMBERSHIP_NOT_FOUND' using errcode = 'P0001';
  end if;
  if v_membership.status <> 'active' then
    raise exception 'INVALID_STATUS_TRANSITION' using errcode = 'P0001';
  end if;
  if p_idempotency_key is not null and v_membership.metadata ->> 'lastRenewalIdempotencyKey' = p_idempotency_key then
    return p_membership_id;
  end if;

  select * into v_plan from public.membership_plans where id = v_membership.plan_id;
  v_base := greatest(coalesce(v_membership.expires_at, v_membership.ends_at, now()), now());
  v_next := case
    when lower(v_plan.billing_period) in ('monthly','mensual') then v_base + interval '1 month'
    when lower(v_plan.billing_period) in ('quarterly','trimestral') then v_base + interval '3 months'
    else v_base + interval '1 year'
  end;

  update public.memberships
  set renewal_date = v_next,
      expires_at = v_next,
      ends_at = v_next,
      metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('lastRenewalIdempotencyKey', p_idempotency_key, 'lastRenewedAt', now()),
      updated_by = v_actor_id,
      updated_at = now()
  where id = p_membership_id;

  perform public.write_transaction_audit(v_actor_id, 'membership_renewed', 'memberships', p_membership_id, null, jsonb_build_object('expires_at', v_next));
  return p_membership_id;
end;
$$;

create or replace function public.adjust_loyalty_points(
  p_membership_id uuid,
  p_points integer,
  p_reason text,
  p_idempotency_key text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid;
  v_membership public.memberships%rowtype;
  v_transaction_id uuid;
begin
  v_actor_id := public.current_transaction_operator(array['super_admin','admin','finance']);
  if p_points = 0 or nullif(trim(coalesce(p_reason, '')), '') is null then
    raise exception 'INVALID_LOYALTY_ADJUSTMENT' using errcode = 'P0001';
  end if;
  if p_idempotency_key is not null then
    select id into v_transaction_id from public.loyalty_transactions where created_by = v_actor_id and idempotency_key = p_idempotency_key limit 1;
    if v_transaction_id is not null then
      return v_transaction_id;
    end if;
  end if;

  select * into v_membership from public.memberships where id = p_membership_id for update;
  if v_membership.id is null then
    raise exception 'MEMBERSHIP_NOT_FOUND' using errcode = 'P0001';
  end if;
  if v_membership.points_balance + p_points < 0 then
    raise exception 'LOYALTY_NEGATIVE_BALANCE' using errcode = 'P0001';
  end if;

  update public.memberships
  set points_balance = points_balance + p_points,
      updated_by = v_actor_id,
      updated_at = now()
  where id = p_membership_id;

  insert into public.loyalty_transactions (membership_id, transaction_type, points, description, created_by, idempotency_key)
  values (p_membership_id, case when p_points > 0 then 'adjustment_in' else 'adjustment_out' end, p_points, trim(p_reason), v_actor_id, nullif(p_idempotency_key, ''))
  returning id into v_transaction_id;

  perform public.write_transaction_audit(v_actor_id, 'loyalty_points_adjusted', 'loyalty_transactions', v_transaction_id, null, jsonb_build_object('membership_id', p_membership_id, 'points', p_points));
  return v_transaction_id;
end;
$$;

create or replace function public.grant_order_loyalty_points(
  p_membership_id uuid,
  p_order_id uuid,
  p_points integer default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid;
  v_order public.orders%rowtype;
  v_membership public.memberships%rowtype;
  v_points integer;
  v_transaction_id uuid;
begin
  v_actor_id := public.current_transaction_operator(array['super_admin','admin','finance']);
  select * into v_membership from public.memberships where id = p_membership_id for update;
  if v_membership.id is null then
    raise exception 'MEMBERSHIP_NOT_FOUND' using errcode = 'P0001';
  end if;
  select * into v_order from public.orders where id = p_order_id;
  if v_order.id is null then
    raise exception 'ORDER_NOT_FOUND' using errcode = 'P0001';
  end if;
  if v_order.customer_id <> v_membership.customer_id or v_order.status not in ('paid','processing','fulfilled') then
    raise exception 'INVALID_LOYALTY_ORDER' using errcode = 'P0001';
  end if;
  select id into v_transaction_id
  from public.loyalty_transactions
  where membership_id = p_membership_id and reference_type = 'order' and reference_id = p_order_id and transaction_type = 'order_grant'
  limit 1;
  if v_transaction_id is not null then
    return v_transaction_id;
  end if;

  v_points := coalesce(p_points, floor(v_order.total)::integer);
  if v_points <= 0 then
    raise exception 'INVALID_LOYALTY_ADJUSTMENT' using errcode = 'P0001';
  end if;

  update public.memberships
  set points_balance = points_balance + v_points,
      updated_by = v_actor_id,
      updated_at = now()
  where id = p_membership_id;

  insert into public.loyalty_transactions (membership_id, transaction_type, points, reference_type, reference_id, description, created_by)
  values (p_membership_id, 'order_grant', v_points, 'order', p_order_id, 'Puntos por orden pagada', v_actor_id)
  returning id into v_transaction_id;

  perform public.write_transaction_audit(v_actor_id, 'loyalty_points_granted', 'loyalty_transactions', v_transaction_id, null, jsonb_build_object('order_id', p_order_id, 'points', v_points));
  return v_transaction_id;
end;
$$;

create or replace function public.record_inventory_movement(
  p_item_id uuid,
  p_type text,
  p_quantity integer,
  p_reason text default null,
  p_reference_type text default null,
  p_reference_id uuid default null,
  p_from_location_id uuid default null,
  p_to_location_id uuid default null,
  p_idempotency_key text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid;
  v_movement_id uuid;
begin
  v_actor_id := public.current_transaction_operator(array['super_admin','admin','operations']);
  if p_idempotency_key is not null then
    select id into v_movement_id from public.inventory_movements where created_by = v_actor_id and idempotency_key = p_idempotency_key limit 1;
    if v_movement_id is not null then
      return v_movement_id;
    end if;
  end if;

  insert into public.inventory_movements (
    inventory_item_id, movement_type, quantity, reference_type, reference_id, notes, reason,
    from_location_id, to_location_id, created_by, idempotency_key, metadata
  )
  values (
    p_item_id, p_type, p_quantity, p_reference_type, p_reference_id, p_reason, p_reason,
    p_from_location_id, p_to_location_id, v_actor_id, nullif(p_idempotency_key, ''), coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_movement_id;
  return v_movement_id;
end;
$$;

create or replace function public.create_inventory_item(
  p_wine_id uuid,
  p_location_id uuid,
  p_sku text default null,
  p_product_name text default null,
  p_minimum_quantity integer default 0,
  p_maximum_quantity integer default null,
  p_unit_cost numeric default null,
  p_lot_code text default null,
  p_unit_of_measure text default 'bottle'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid;
  v_item_id uuid;
begin
  v_actor_id := public.current_transaction_operator(array['super_admin','admin','operations']);
  if not exists (select 1 from public.wines where id = p_wine_id) then
    raise exception 'WINE_NOT_FOUND' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.inventory_locations where id = p_location_id and active = true) then
    raise exception 'LOCATION_NOT_FOUND' using errcode = 'P0001';
  end if;

  insert into public.inventory_items (
    wine_id, location_id, sku, product_name, reorder_point, minimum_quantity, maximum_quantity,
    unit_cost, lot_code, unit_of_measure, created_by, updated_by
  )
  values (
    p_wine_id, p_location_id, nullif(p_sku, ''), nullif(p_product_name, ''), greatest(coalesce(p_minimum_quantity, 0), 0),
    greatest(coalesce(p_minimum_quantity, 0), 0), p_maximum_quantity, p_unit_cost, nullif(p_lot_code, ''),
    coalesce(nullif(p_unit_of_measure, ''), 'bottle'), v_actor_id, v_actor_id
  )
  on conflict (wine_id, location_id) do update
    set sku = coalesce(excluded.sku, public.inventory_items.sku),
        product_name = coalesce(excluded.product_name, public.inventory_items.product_name),
        minimum_quantity = excluded.minimum_quantity,
        reorder_point = excluded.reorder_point,
        maximum_quantity = excluded.maximum_quantity,
        unit_cost = excluded.unit_cost,
        lot_code = coalesce(excluded.lot_code, public.inventory_items.lot_code),
        unit_of_measure = excluded.unit_of_measure,
        updated_by = v_actor_id,
        updated_at = now()
  returning id into v_item_id;

  perform public.write_transaction_audit(v_actor_id, 'inventory_item_saved', 'inventory_items', v_item_id, null, jsonb_build_object('sku', p_sku));
  return v_item_id;
end;
$$;

create or replace function public.receive_inventory(
  p_inventory_item_id uuid,
  p_quantity integer,
  p_reason text,
  p_idempotency_key text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid;
  v_item public.inventory_items%rowtype;
  v_movement_id uuid;
begin
  v_actor_id := public.current_transaction_operator(array['super_admin','admin','operations']);
  if p_quantity <= 0 or nullif(trim(coalesce(p_reason, '')), '') is null then
    raise exception 'INVALID_INVENTORY_MOVEMENT' using errcode = 'P0001';
  end if;
  if p_idempotency_key is not null then
    select id into v_movement_id from public.inventory_movements where created_by = v_actor_id and idempotency_key = p_idempotency_key limit 1;
    if v_movement_id is not null then
      return v_movement_id;
    end if;
  end if;
  select * into v_item from public.inventory_items where id = p_inventory_item_id for update;
  if v_item.id is null then
    raise exception 'INVENTORY_ITEM_NOT_FOUND' using errcode = 'P0001';
  end if;
  update public.inventory_items set quantity = quantity + p_quantity, updated_by = v_actor_id, updated_at = now() where id = p_inventory_item_id;
  v_movement_id := public.record_inventory_movement(p_inventory_item_id, 'purchase', p_quantity, p_reason, null, null, null, v_item.location_id, p_idempotency_key);
  perform public.write_transaction_audit(v_actor_id, 'inventory_received', 'inventory_items', p_inventory_item_id, null, jsonb_build_object('quantity', p_quantity));
  return v_movement_id;
end;
$$;

create or replace function public.reserve_inventory(
  p_inventory_item_id uuid,
  p_quantity integer,
  p_reference_type text default null,
  p_reference_id uuid default null,
  p_idempotency_key text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid;
  v_item public.inventory_items%rowtype;
  v_movement_id uuid;
begin
  v_actor_id := public.current_transaction_operator(array['super_admin','admin','operations']);
  if p_quantity <= 0 then
    raise exception 'INVALID_INVENTORY_MOVEMENT' using errcode = 'P0001';
  end if;
  if p_idempotency_key is not null then
    select id into v_movement_id from public.inventory_movements where created_by = v_actor_id and idempotency_key = p_idempotency_key limit 1;
    if v_movement_id is not null then
      return v_movement_id;
    end if;
  end if;
  select * into v_item from public.inventory_items where id = p_inventory_item_id for update;
  if v_item.id is null then
    raise exception 'INVENTORY_ITEM_NOT_FOUND' using errcode = 'P0001';
  end if;
  if v_item.quantity - v_item.reserved_quantity < p_quantity then
    raise exception 'STOCK_NEGATIVE' using errcode = 'P0001';
  end if;
  update public.inventory_items set reserved_quantity = reserved_quantity + p_quantity, updated_by = v_actor_id, updated_at = now() where id = p_inventory_item_id;
  v_movement_id := public.record_inventory_movement(p_inventory_item_id, 'reservation', p_quantity, 'Reserva de inventario', p_reference_type, p_reference_id, v_item.location_id, null, p_idempotency_key);
  return v_movement_id;
end;
$$;

create or replace function public.release_inventory(
  p_inventory_item_id uuid,
  p_quantity integer,
  p_reason text default 'Liberación de inventario',
  p_idempotency_key text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid;
  v_item public.inventory_items%rowtype;
  v_movement_id uuid;
begin
  v_actor_id := public.current_transaction_operator(array['super_admin','admin','operations']);
  if p_quantity <= 0 then
    raise exception 'INVALID_INVENTORY_MOVEMENT' using errcode = 'P0001';
  end if;
  if p_idempotency_key is not null then
    select id into v_movement_id from public.inventory_movements where created_by = v_actor_id and idempotency_key = p_idempotency_key limit 1;
    if v_movement_id is not null then
      return v_movement_id;
    end if;
  end if;
  select * into v_item from public.inventory_items where id = p_inventory_item_id for update;
  if v_item.id is null then
    raise exception 'INVENTORY_ITEM_NOT_FOUND' using errcode = 'P0001';
  end if;
  if v_item.reserved_quantity < p_quantity then
    raise exception 'STOCK_NEGATIVE' using errcode = 'P0001';
  end if;
  update public.inventory_items set reserved_quantity = reserved_quantity - p_quantity, updated_by = v_actor_id, updated_at = now() where id = p_inventory_item_id;
  v_movement_id := public.record_inventory_movement(p_inventory_item_id, 'release', -p_quantity, p_reason, null, null, v_item.location_id, null, p_idempotency_key);
  return v_movement_id;
end;
$$;

create or replace function public.fulfill_inventory(
  p_inventory_item_id uuid,
  p_quantity integer,
  p_reason text default 'Salida por cumplimiento',
  p_idempotency_key text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid;
  v_item public.inventory_items%rowtype;
  v_movement_id uuid;
begin
  v_actor_id := public.current_transaction_operator(array['super_admin','admin','operations']);
  if p_quantity <= 0 then
    raise exception 'INVALID_INVENTORY_MOVEMENT' using errcode = 'P0001';
  end if;
  if p_idempotency_key is not null then
    select id into v_movement_id from public.inventory_movements where created_by = v_actor_id and idempotency_key = p_idempotency_key limit 1;
    if v_movement_id is not null then
      return v_movement_id;
    end if;
  end if;
  select * into v_item from public.inventory_items where id = p_inventory_item_id for update;
  if v_item.id is null then
    raise exception 'INVENTORY_ITEM_NOT_FOUND' using errcode = 'P0001';
  end if;
  if v_item.reserved_quantity < p_quantity or v_item.quantity < p_quantity then
    raise exception 'STOCK_NEGATIVE' using errcode = 'P0001';
  end if;
  update public.inventory_items set quantity = quantity - p_quantity, reserved_quantity = reserved_quantity - p_quantity, updated_by = v_actor_id, updated_at = now() where id = p_inventory_item_id;
  v_movement_id := public.record_inventory_movement(p_inventory_item_id, 'sale', -p_quantity, p_reason, null, null, v_item.location_id, null, p_idempotency_key);
  return v_movement_id;
end;
$$;

create or replace function public.transfer_inventory(
  p_inventory_item_id uuid,
  p_to_location_id uuid,
  p_quantity integer,
  p_reason text,
  p_idempotency_key text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid;
  v_source public.inventory_items%rowtype;
  v_target_id uuid;
  v_movement_id uuid;
begin
  v_actor_id := public.current_transaction_operator(array['super_admin','admin','operations']);
  if p_quantity <= 0 or nullif(trim(coalesce(p_reason, '')), '') is null then
    raise exception 'INVALID_INVENTORY_MOVEMENT' using errcode = 'P0001';
  end if;
  if p_idempotency_key is not null then
    select id into v_movement_id from public.inventory_movements where created_by = v_actor_id and idempotency_key = p_idempotency_key limit 1;
    if v_movement_id is not null then
      return v_movement_id;
    end if;
  end if;
  select * into v_source from public.inventory_items where id = p_inventory_item_id for update;
  if v_source.id is null then
    raise exception 'INVENTORY_ITEM_NOT_FOUND' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.inventory_locations where id = p_to_location_id and active = true) then
    raise exception 'LOCATION_NOT_FOUND' using errcode = 'P0001';
  end if;
  if v_source.quantity - v_source.reserved_quantity < p_quantity then
    raise exception 'STOCK_NEGATIVE' using errcode = 'P0001';
  end if;

  update public.inventory_items set quantity = quantity - p_quantity, updated_by = v_actor_id, updated_at = now() where id = p_inventory_item_id;
  insert into public.inventory_items (
    wine_id, location_id, quantity, sku, product_name, lot_code, unit_of_measure, minimum_quantity, maximum_quantity, unit_cost, created_by, updated_by
  )
  values (
    v_source.wine_id, p_to_location_id, p_quantity, v_source.sku, v_source.product_name, v_source.lot_code, v_source.unit_of_measure,
    v_source.minimum_quantity, v_source.maximum_quantity, v_source.unit_cost, v_actor_id, v_actor_id
  )
  on conflict (wine_id, location_id) do update
    set quantity = public.inventory_items.quantity + excluded.quantity,
        updated_by = v_actor_id,
        updated_at = now()
  returning id into v_target_id;

  v_movement_id := public.record_inventory_movement(p_inventory_item_id, 'transfer_out', -p_quantity, p_reason, 'inventory_transfer', v_target_id, v_source.location_id, p_to_location_id, p_idempotency_key);
  perform public.record_inventory_movement(v_target_id, 'transfer_in', p_quantity, p_reason, 'inventory_transfer', p_inventory_item_id, v_source.location_id, p_to_location_id, nullif(p_idempotency_key, '') || '_in');
  return v_movement_id;
end;
$$;

create or replace function public.adjust_inventory(
  p_inventory_item_id uuid,
  p_quantity_delta integer,
  p_reason text,
  p_idempotency_key text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid;
  v_item public.inventory_items%rowtype;
  v_type text;
  v_movement_id uuid;
begin
  v_actor_id := public.current_transaction_operator(array['super_admin','admin','operations']);
  if p_quantity_delta = 0 or nullif(trim(coalesce(p_reason, '')), '') is null then
    raise exception 'INVALID_INVENTORY_MOVEMENT' using errcode = 'P0001';
  end if;
  if p_idempotency_key is not null then
    select id into v_movement_id from public.inventory_movements where created_by = v_actor_id and idempotency_key = p_idempotency_key limit 1;
    if v_movement_id is not null then
      return v_movement_id;
    end if;
  end if;
  select * into v_item from public.inventory_items where id = p_inventory_item_id for update;
  if v_item.id is null then
    raise exception 'INVENTORY_ITEM_NOT_FOUND' using errcode = 'P0001';
  end if;
  if v_item.quantity + p_quantity_delta < v_item.reserved_quantity then
    raise exception 'STOCK_NEGATIVE' using errcode = 'P0001';
  end if;
  v_type := case when p_quantity_delta > 0 then 'adjustment_in' else 'adjustment_out' end;
  update public.inventory_items set quantity = quantity + p_quantity_delta, updated_by = v_actor_id, updated_at = now() where id = p_inventory_item_id;
  v_movement_id := public.record_inventory_movement(p_inventory_item_id, v_type, p_quantity_delta, p_reason, null, null, v_item.location_id, null, p_idempotency_key);
  return v_movement_id;
end;
$$;

create or replace function public.create_shipment(
  p_order_id uuid,
  p_carrier_id uuid default null,
  p_carrier text default null,
  p_service_level text default null,
  p_tracking_number text default null,
  p_origin text default null,
  p_destination text default null,
  p_estimated_delivery_at timestamptz default null,
  p_shipping_cost numeric default 0,
  p_idempotency_key text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid;
  v_shipment_id uuid;
  v_number text;
begin
  v_actor_id := public.current_transaction_operator(array['super_admin','admin','operations']);
  if p_idempotency_key is not null then
    select id into v_shipment_id
    from public.shipments
    where created_by = v_actor_id and metadata ->> 'idempotencyKey' = p_idempotency_key
    limit 1;
    if v_shipment_id is not null then
      return v_shipment_id;
    end if;
  end if;
  if not exists (select 1 from public.orders where id = p_order_id) then
    raise exception 'ORDER_NOT_FOUND' using errcode = 'P0001';
  end if;
  if p_carrier_id is not null and not exists (select 1 from public.carriers where id = p_carrier_id and active = true) then
    raise exception 'CARRIER_NOT_FOUND' using errcode = 'P0001';
  end if;
  if p_shipping_cost < 0 then
    raise exception 'INVALID_SHIPMENT' using errcode = 'P0001';
  end if;

  v_number := 'SHP-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  insert into public.shipments (
    order_id, carrier_id, carrier, service_level, tracking_number, origin, destination,
    estimated_delivery_at, shipping_cost, status_text, shipment_number, created_by, updated_by, metadata
  )
  values (
    p_order_id, p_carrier_id, nullif(p_carrier, ''), nullif(p_service_level, ''), nullif(p_tracking_number, ''),
    nullif(p_origin, ''), nullif(p_destination, ''), p_estimated_delivery_at, coalesce(p_shipping_cost, 0), 'pending',
    v_number, v_actor_id, v_actor_id, coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object('idempotencyKey', p_idempotency_key)
  )
  returning id into v_shipment_id;

  insert into public.shipment_events (shipment_id, event_type, status_text, notes, created_by)
  values (v_shipment_id, 'created', 'pending', 'Envío creado', v_actor_id);
  perform public.write_transaction_audit(v_actor_id, 'shipment_created', 'shipments', v_shipment_id, null, jsonb_build_object('shipment_number', v_number));
  return v_shipment_id;
end;
$$;

create or replace function public.update_shipment_status(
  p_shipment_id uuid,
  p_status text,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid;
  v_shipment public.shipments%rowtype;
  v_allowed boolean;
begin
  v_actor_id := public.current_transaction_operator(array['super_admin','admin','operations']);
  select * into v_shipment from public.shipments where id = p_shipment_id for update;
  if v_shipment.id is null then
    raise exception 'SHIPMENT_NOT_FOUND' using errcode = 'P0001';
  end if;
  if v_shipment.status_text = p_status then
    return p_shipment_id;
  end if;
  v_allowed := (v_shipment.status_text = 'pending' and p_status in ('preparing','cancelled'))
    or (v_shipment.status_text = 'preparing' and p_status in ('ready','cancelled'))
    or (v_shipment.status_text = 'ready' and p_status in ('shipped','cancelled'))
    or (v_shipment.status_text = 'shipped' and p_status in ('in_transit','delivered','failed','returned'))
    or (v_shipment.status_text = 'in_transit' and p_status in ('delivered','failed','returned'))
    or (v_shipment.status_text = 'failed' and p_status in ('returned','cancelled'));
  if not v_allowed then
    raise exception 'INVALID_STATUS_TRANSITION' using errcode = 'P0001';
  end if;
  update public.shipments
  set status_text = p_status,
      shipped_at = case when p_status in ('shipped','in_transit') then coalesce(shipped_at, now()) else shipped_at end,
      delivered_at = case when p_status = 'delivered' then coalesce(delivered_at, now()) else delivered_at end,
      cancelled_at = case when p_status = 'cancelled' then coalesce(cancelled_at, now()) else cancelled_at end,
      cancellation_reason = case when p_status = 'cancelled' then coalesce(p_notes, cancellation_reason) else cancellation_reason end,
      updated_by = v_actor_id,
      updated_at = now()
  where id = p_shipment_id;
  insert into public.shipment_events (shipment_id, event_type, status_text, notes, created_by)
  values (p_shipment_id, 'status', p_status, p_notes, v_actor_id);
  perform public.write_transaction_audit(v_actor_id, 'shipment_status_updated', 'shipments', p_shipment_id, jsonb_build_object('status', v_shipment.status_text), jsonb_build_object('status', p_status));
  return p_shipment_id;
end;
$$;

create or replace function public.register_shipment_incident(
  p_shipment_id uuid,
  p_notes text,
  p_evidence_storage_path text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid;
  v_event_id uuid;
begin
  v_actor_id := public.current_transaction_operator(array['super_admin','admin','operations']);
  if nullif(trim(coalesce(p_notes, '')), '') is null then
    raise exception 'INVALID_SHIPMENT' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.shipments where id = p_shipment_id) then
    raise exception 'SHIPMENT_NOT_FOUND' using errcode = 'P0001';
  end if;
  insert into public.shipment_events (shipment_id, event_type, notes, evidence_storage_path, created_by)
  values (p_shipment_id, 'incident', trim(p_notes), nullif(p_evidence_storage_path, ''), v_actor_id)
  returning id into v_event_id;
  update public.shipments set incident_count = incident_count + 1, updated_by = v_actor_id, updated_at = now() where id = p_shipment_id;
  perform public.write_transaction_audit(v_actor_id, 'shipment_incident_registered', 'shipment_events', v_event_id, null, jsonb_build_object('shipment_id', p_shipment_id));
  return v_event_id;
end;
$$;

create or replace function public.mark_shipment_delivered(
  p_shipment_id uuid,
  p_evidence_storage_path text default null,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid;
begin
  v_actor_id := public.current_transaction_operator(array['super_admin','admin','operations']);
  perform public.update_shipment_status(p_shipment_id, 'delivered', p_notes);
  update public.shipments
  set delivered_by = v_actor_id,
      delivery_evidence_url = nullif(p_evidence_storage_path, ''),
      updated_by = v_actor_id,
      updated_at = now()
  where id = p_shipment_id;
  return p_shipment_id;
end;
$$;

create or replace function public.create_distributor_order(
  p_distributor_id uuid,
  p_items jsonb default '[]'::jsonb,
  p_idempotency_key text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid;
  v_order_id uuid;
  v_order_number text;
  v_item jsonb;
  v_quantity integer;
  v_unit_price numeric(12,2);
  v_total numeric(12,2) := 0;
begin
  v_actor_id := public.current_transaction_operator(array['super_admin','admin','operations','finance']);
  if p_idempotency_key is not null then
    select id into v_order_id
    from public.distributor_orders
    where created_by = v_actor_id and metadata ->> 'idempotencyKey' = p_idempotency_key
    limit 1;
    if v_order_id is not null then
      return v_order_id;
    end if;
  end if;
  if not exists (select 1 from public.distributors where id = p_distributor_id and operational_status in ('prospect','active')) then
    raise exception 'DISTRIBUTOR_NOT_FOUND' using errcode = 'P0001';
  end if;
  if jsonb_typeof(coalesce(p_items, '[]'::jsonb)) <> 'array' or jsonb_array_length(coalesce(p_items, '[]'::jsonb)) = 0 then
    raise exception 'ORDER_ITEMS_REQUIRED' using errcode = 'P0001';
  end if;
  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_quantity := coalesce((v_item ->> 'quantity')::integer, 0);
    v_unit_price := coalesce((v_item ->> 'unitPrice')::numeric, -1);
    if v_quantity < 1 or v_unit_price < 0 or nullif(trim(coalesce(v_item ->> 'nameSnapshot', '')), '') is null then
      raise exception 'INVALID_ORDER_ITEM' using errcode = 'P0001';
    end if;
    v_total := v_total + (v_quantity * v_unit_price);
  end loop;
  v_order_number := 'DORD-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  insert into public.distributor_orders (
    distributor_id, order_number, status, order_status_text, total, currency, created_by, updated_by, metadata
  )
  values (p_distributor_id, v_order_number, 'draft', 'submitted', v_total, 'MXN', v_actor_id, v_actor_id, coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object('idempotencyKey', p_idempotency_key))
  returning id into v_order_id;
  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_quantity := (v_item ->> 'quantity')::integer;
    v_unit_price := (v_item ->> 'unitPrice')::numeric;
    insert into public.distributor_order_items (
      distributor_order_id, wine_id, sku_snapshot, name_snapshot, quantity, unit_price, subtotal, metadata
    )
    values (
      v_order_id, nullif(v_item ->> 'wineId', '')::uuid, nullif(v_item ->> 'skuSnapshot', ''),
      trim(v_item ->> 'nameSnapshot'), v_quantity, v_unit_price, v_quantity * v_unit_price,
      coalesce(v_item -> 'metadata', '{}'::jsonb)
    );
  end loop;
  perform public.write_transaction_audit(v_actor_id, 'distributor_order_created', 'distributor_orders', v_order_id, null, jsonb_build_object('order_number', v_order_number, 'total', v_total));
  return v_order_id;
end;
$$;

create or replace function public.approve_distributor_order(p_order_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid;
  v_order public.distributor_orders%rowtype;
begin
  v_actor_id := public.current_transaction_operator(array['super_admin','admin','operations','finance']);
  select * into v_order from public.distributor_orders where id = p_order_id for update;
  if v_order.id is null then
    raise exception 'DISTRIBUTOR_ORDER_NOT_FOUND' using errcode = 'P0001';
  end if;
  if v_order.order_status_text <> 'submitted' then
    raise exception 'INVALID_STATUS_TRANSITION' using errcode = 'P0001';
  end if;
  update public.distributor_orders
  set order_status_text = 'approved', approved_at = now(), updated_by = v_actor_id, updated_at = now()
  where id = p_order_id;
  perform public.write_transaction_audit(v_actor_id, 'distributor_order_approved', 'distributor_orders', p_order_id, jsonb_build_object('status', v_order.order_status_text), jsonb_build_object('status', 'approved'));
  return p_order_id;
end;
$$;

create or replace function public.reject_distributor_order(p_order_id uuid, p_reason text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid;
  v_order public.distributor_orders%rowtype;
begin
  v_actor_id := public.current_transaction_operator(array['super_admin','admin','operations','finance']);
  if nullif(trim(coalesce(p_reason, '')), '') is null then
    raise exception 'INVALID_STATUS_TRANSITION' using errcode = 'P0001';
  end if;
  select * into v_order from public.distributor_orders where id = p_order_id for update;
  if v_order.id is null then
    raise exception 'DISTRIBUTOR_ORDER_NOT_FOUND' using errcode = 'P0001';
  end if;
  if v_order.order_status_text not in ('draft','submitted') then
    raise exception 'INVALID_STATUS_TRANSITION' using errcode = 'P0001';
  end if;
  update public.distributor_orders
  set order_status_text = 'rejected', rejected_at = now(), rejected_reason = trim(p_reason), updated_by = v_actor_id, updated_at = now()
  where id = p_order_id;
  perform public.write_transaction_audit(v_actor_id, 'distributor_order_rejected', 'distributor_orders', p_order_id, jsonb_build_object('status', v_order.order_status_text), jsonb_build_object('status', 'rejected'));
  return p_order_id;
end;
$$;

create or replace function public.fulfill_distributor_order(p_order_id uuid, p_next_status text default 'preparing')
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid;
  v_order public.distributor_orders%rowtype;
  v_allowed boolean;
begin
  v_actor_id := public.current_transaction_operator(array['super_admin','admin','operations']);
  select * into v_order from public.distributor_orders where id = p_order_id for update;
  if v_order.id is null then
    raise exception 'DISTRIBUTOR_ORDER_NOT_FOUND' using errcode = 'P0001';
  end if;
  v_allowed := (v_order.order_status_text = 'approved' and p_next_status = 'preparing')
    or (v_order.order_status_text = 'preparing' and p_next_status = 'shipped')
    or (v_order.order_status_text = 'shipped' and p_next_status = 'delivered');
  if not v_allowed then
    raise exception 'INVALID_STATUS_TRANSITION' using errcode = 'P0001';
  end if;
  update public.distributor_orders
  set order_status_text = p_next_status,
      prepared_at = case when p_next_status = 'preparing' then now() else prepared_at end,
      shipped_at = case when p_next_status = 'shipped' then now() else shipped_at end,
      delivered_at = case when p_next_status = 'delivered' then now() else delivered_at end,
      updated_by = v_actor_id,
      updated_at = now()
  where id = p_order_id;
  perform public.write_transaction_audit(v_actor_id, 'distributor_order_fulfillment_updated', 'distributor_orders', p_order_id, jsonb_build_object('status', v_order.order_status_text), jsonb_build_object('status', p_next_status));
  return p_order_id;
end;
$$;

revoke all on function public.assign_membership(uuid, uuid, timestamptz, text) from public, anon;
revoke all on function public.activate_membership(uuid) from public, anon;
revoke all on function public.pause_membership(uuid, text) from public, anon;
revoke all on function public.resume_membership(uuid) from public, anon;
revoke all on function public.cancel_membership(uuid, text) from public, anon;
revoke all on function public.renew_membership(uuid, text) from public, anon;
revoke all on function public.adjust_loyalty_points(uuid, integer, text, text) from public, anon;
revoke all on function public.grant_order_loyalty_points(uuid, uuid, integer) from public, anon;
revoke all on function public.create_inventory_item(uuid, uuid, text, text, integer, integer, numeric, text, text) from public, anon;
revoke all on function public.receive_inventory(uuid, integer, text, text) from public, anon;
revoke all on function public.reserve_inventory(uuid, integer, text, uuid, text) from public, anon;
revoke all on function public.release_inventory(uuid, integer, text, text) from public, anon;
revoke all on function public.fulfill_inventory(uuid, integer, text, text) from public, anon;
revoke all on function public.transfer_inventory(uuid, uuid, integer, text, text) from public, anon;
revoke all on function public.adjust_inventory(uuid, integer, text, text) from public, anon;
revoke all on function public.create_shipment(uuid, uuid, text, text, text, text, text, timestamptz, numeric, text, jsonb) from public, anon;
revoke all on function public.update_shipment_status(uuid, text, text) from public, anon;
revoke all on function public.register_shipment_incident(uuid, text, text) from public, anon;
revoke all on function public.mark_shipment_delivered(uuid, text, text) from public, anon;
revoke all on function public.create_distributor_order(uuid, jsonb, text, jsonb) from public, anon;
revoke all on function public.approve_distributor_order(uuid) from public, anon;
revoke all on function public.reject_distributor_order(uuid, text) from public, anon;
revoke all on function public.fulfill_distributor_order(uuid, text) from public, anon;

grant execute on function public.assign_membership(uuid, uuid, timestamptz, text) to authenticated;
grant execute on function public.activate_membership(uuid) to authenticated;
grant execute on function public.pause_membership(uuid, text) to authenticated;
grant execute on function public.resume_membership(uuid) to authenticated;
grant execute on function public.cancel_membership(uuid, text) to authenticated;
grant execute on function public.renew_membership(uuid, text) to authenticated;
grant execute on function public.adjust_loyalty_points(uuid, integer, text, text) to authenticated;
grant execute on function public.grant_order_loyalty_points(uuid, uuid, integer) to authenticated;
grant execute on function public.create_inventory_item(uuid, uuid, text, text, integer, integer, numeric, text, text) to authenticated;
grant execute on function public.receive_inventory(uuid, integer, text, text) to authenticated;
grant execute on function public.reserve_inventory(uuid, integer, text, uuid, text) to authenticated;
grant execute on function public.release_inventory(uuid, integer, text, text) to authenticated;
grant execute on function public.fulfill_inventory(uuid, integer, text, text) to authenticated;
grant execute on function public.transfer_inventory(uuid, uuid, integer, text, text) to authenticated;
grant execute on function public.adjust_inventory(uuid, integer, text, text) to authenticated;
grant execute on function public.create_shipment(uuid, uuid, text, text, text, text, text, timestamptz, numeric, text, jsonb) to authenticated;
grant execute on function public.update_shipment_status(uuid, text, text) to authenticated;
grant execute on function public.register_shipment_incident(uuid, text, text) to authenticated;
grant execute on function public.mark_shipment_delivered(uuid, text, text) to authenticated;
grant execute on function public.create_distributor_order(uuid, jsonb, text, jsonb) to authenticated;
grant execute on function public.approve_distributor_order(uuid) to authenticated;
grant execute on function public.reject_distributor_order(uuid, text) to authenticated;
grant execute on function public.fulfill_distributor_order(uuid, text) to authenticated;

commit;
