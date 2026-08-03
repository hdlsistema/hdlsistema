begin;

alter table public.orders add column if not exists source text not null default 'Centro de control';
alter table public.orders add column if not exists idempotency_key text;
alter table public.orders add column if not exists paid_at timestamptz;
alter table public.orders add column if not exists cancelled_at timestamptz;
alter table public.orders add column if not exists cancellation_reason text;
alter table public.orders add column if not exists fulfilled_at timestamptz;
alter table public.orders add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.orders add column if not exists updated_by uuid references auth.users(id) on delete set null;
alter table public.orders add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.payments add column if not exists payment_reference text;
alter table public.payments add column if not exists receipt_storage_path text;
alter table public.payments add column if not exists recorded_by uuid references auth.users(id) on delete set null;
alter table public.payments add column if not exists refund_reason text;
alter table public.payments add column if not exists refunded_at timestamptz;
alter table public.payments add column if not exists idempotency_key text;
alter table public.payments add column if not exists provider_environment text not null default 'manual';
alter table public.payments add column if not exists notes text;
alter table public.payments add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.payment_webhook_events add column if not exists provider_environment text not null default 'provider';
alter table public.payment_webhook_events add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.access_passes add column if not exists pass_number text;
alter table public.access_passes add column if not exists issued_at timestamptz not null default now();
alter table public.access_passes add column if not exists revoked_at timestamptz;
alter table public.access_passes add column if not exists revoked_by uuid references auth.users(id) on delete set null;
alter table public.access_passes add column if not exists revocation_reason text;
alter table public.access_passes add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.checkins add column if not exists reversed_at timestamptz;
alter table public.checkins add column if not exists reversed_by uuid references auth.users(id) on delete set null;
alter table public.checkins add column if not exists reversal_reason text;
alter table public.checkins add column if not exists evidence_storage_path text;
alter table public.checkins add column if not exists request_id text;
alter table public.checkins add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.checkins add column if not exists created_at timestamptz not null default now();

update public.access_passes
set pass_number = 'PASS-' || to_char(created_at, 'YYYYMMDD') || '-' || upper(substr(replace(id::text, '-', ''), 1, 8))
where pass_number is null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'orders_total_components_valid') then
    alter table public.orders add constraint orders_total_components_valid
    check (subtotal >= 0 and discount_total >= 0 and tax_total >= 0 and shipping_total >= 0 and total >= 0);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'payments_amount_refund_valid') then
    alter table public.payments add constraint payments_amount_refund_valid
    check (amount >= 0 and refunded_amount >= 0 and refunded_amount <= amount);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'payments_provider_environment_valid') then
    alter table public.payments add constraint payments_provider_environment_valid
    check (provider_environment in ('manual', 'sandbox', 'provider'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'payment_webhook_provider_environment_valid') then
    alter table public.payment_webhook_events add constraint payment_webhook_provider_environment_valid
    check (provider_environment in ('sandbox', 'provider'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'access_passes_pass_number_key') then
    alter table public.access_passes add constraint access_passes_pass_number_key unique (pass_number);
  end if;
end $$;

create unique index if not exists idx_orders_idempotency_actor
on public.orders(created_by, idempotency_key)
where idempotency_key is not null;

create index if not exists idx_orders_created_at_desc on public.orders(created_at desc);
create index if not exists idx_orders_source on public.orders(source);
create index if not exists idx_orders_reservation_id on public.orders(reservation_id);
create index if not exists idx_orders_paid_at on public.orders(paid_at);

create unique index if not exists idx_payments_idempotency_actor
on public.payments(recorded_by, idempotency_key)
where idempotency_key is not null;

create index if not exists idx_payments_reference on public.payments(payment_reference);
create index if not exists idx_payments_provider_environment on public.payments(provider_environment);
create index if not exists idx_payments_paid_at on public.payments(paid_at);

create index if not exists idx_payment_webhook_provider_event
on public.payment_webhook_events(provider, provider_event_id);

create index if not exists idx_access_passes_pass_number on public.access_passes(pass_number);
create index if not exists idx_access_passes_status on public.access_passes(status);
create index if not exists idx_access_passes_valid_window on public.access_passes(valid_from, valid_until);

create unique index if not exists idx_checkins_access_pass_active_unique
on public.checkins(access_pass_id)
where reversed_at is null;

create unique index if not exists idx_checkins_request_id
on public.checkins(request_id)
where request_id is not null;

create index if not exists idx_checkins_checked_in_at on public.checkins(checked_in_at desc);

alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
alter table public.payment_webhook_events enable row level security;
alter table public.access_passes enable row level security;
alter table public.checkins enable row level security;

create or replace function public.can_operate_transactions(p_actor_id uuid, p_allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = p_actor_id
      and r.code::text = any(p_allowed_roles)
  );
$$;

create or replace function public.current_transaction_operator(p_allowed_roles text[])
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := auth.uid();
begin
  if v_actor_id is null or not public.can_operate_transactions(v_actor_id, p_allowed_roles) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  return v_actor_id;
end;
$$;

create or replace function public.write_transaction_audit(
  p_actor_id uuid,
  p_action text,
  p_entity_type text,
  p_entity_id uuid,
  p_before jsonb default null,
  p_after jsonb default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, before_data, after_data)
  values (p_actor_id, p_action, p_entity_type, p_entity_id, p_before, p_after);
end;
$$;

create or replace function public.create_order_admin(
  p_customer_id uuid,
  p_reservation_id uuid default null,
  p_items jsonb default '[]'::jsonb,
  p_source text default 'Centro de control',
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
  v_item_id uuid;
  v_quantity integer;
  v_unit_price numeric(12,2);
  v_subtotal numeric(12,2) := 0;
begin
  v_actor_id := public.current_transaction_operator(array['super_admin','admin','operations','finance']);

  if p_idempotency_key is not null then
    select id into v_order_id
    from public.orders
    where idempotency_key = p_idempotency_key and created_by = v_actor_id
    limit 1;
    if v_order_id is not null then
      return v_order_id;
    end if;
  end if;

  if not exists (select 1 from public.customers where id = p_customer_id) then
    raise exception 'CUSTOMER_NOT_FOUND' using errcode = 'P0001';
  end if;

  if p_reservation_id is not null and not exists (select 1 from public.reservations where id = p_reservation_id and customer_id = p_customer_id) then
    raise exception 'RESERVATION_NOT_FOUND' using errcode = 'P0001';
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

    v_subtotal := v_subtotal + (v_quantity * v_unit_price);
  end loop;

  v_order_number := 'ORD-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

  insert into public.orders (
    order_number,
    customer_id,
    reservation_id,
    subtotal,
    total,
    currency,
    status,
    source,
    idempotency_key,
    created_by,
    updated_by,
    metadata
  )
  values (
    v_order_number,
    p_customer_id,
    p_reservation_id,
    v_subtotal,
    v_subtotal,
    'MXN',
    'pending_payment',
    coalesce(nullif(p_source, ''), 'Centro de control'),
    nullif(p_idempotency_key, ''),
    v_actor_id,
    v_actor_id,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_order_id;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_item_id := coalesce(nullif(v_item ->> 'itemId', '')::uuid, gen_random_uuid());
    v_quantity := (v_item ->> 'quantity')::integer;
    v_unit_price := (v_item ->> 'unitPrice')::numeric;

    insert into public.order_items (
      order_id,
      item_type,
      item_id,
      name_snapshot,
      sku_snapshot,
      quantity,
      unit_price,
      subtotal,
      metadata
    )
    values (
      v_order_id,
      coalesce(nullif(v_item ->> 'itemType', ''), 'manual'),
      v_item_id,
      trim(v_item ->> 'nameSnapshot'),
      nullif(v_item ->> 'skuSnapshot', ''),
      v_quantity,
      v_unit_price,
      v_quantity * v_unit_price,
      coalesce(v_item -> 'metadata', '{}'::jsonb)
    );
  end loop;

  perform public.write_transaction_audit(v_actor_id, 'order_created', 'orders', v_order_id, null, jsonb_build_object('order_number', v_order_number, 'total', v_subtotal));
  return v_order_id;
end;
$$;

create or replace function public.update_order_status(
  p_order_id uuid,
  p_status public.order_status,
  p_reason text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid;
  v_order public.orders%rowtype;
  v_allowed boolean := false;
begin
  v_actor_id := public.current_transaction_operator(array['super_admin','admin','operations','finance']);

  select * into v_order from public.orders where id = p_order_id for update;
  if v_order.id is null then
    raise exception 'ORDER_NOT_FOUND' using errcode = 'P0001';
  end if;

  if v_order.status = p_status then
    return p_order_id;
  end if;

  v_allowed := (v_order.status = 'draft' and p_status in ('pending_payment','cancelled'))
    or (v_order.status = 'pending_payment' and p_status in ('paid','cancelled'))
    or (v_order.status = 'paid' and p_status in ('processing','refunded','cancelled'))
    or (v_order.status = 'processing' and p_status in ('fulfilled','refunded','cancelled'));

  if not v_allowed then
    raise exception 'INVALID_STATUS_TRANSITION' using errcode = 'P0001';
  end if;

  update public.orders
  set status = p_status,
      paid_at = case when p_status = 'paid' then coalesce(paid_at, now()) else paid_at end,
      cancelled_at = case when p_status = 'cancelled' then coalesce(cancelled_at, now()) else cancelled_at end,
      cancellation_reason = case when p_status = 'cancelled' then coalesce(p_reason, cancellation_reason) else cancellation_reason end,
      fulfilled_at = case when p_status = 'fulfilled' then coalesce(fulfilled_at, now()) else fulfilled_at end,
      updated_by = v_actor_id,
      updated_at = now()
  where id = p_order_id;

  perform public.write_transaction_audit(
    v_actor_id,
    'order_status_updated',
    'orders',
    p_order_id,
    jsonb_build_object('status', v_order.status),
    jsonb_build_object('status', p_status, 'reason', p_reason)
  );

  return p_order_id;
end;
$$;

create or replace function public.record_manual_payment(
  p_order_id uuid,
  p_amount numeric,
  p_payment_method_type text,
  p_payment_reference text,
  p_receipt_storage_path text default null,
  p_paid_at timestamptz default null,
  p_notes text default null,
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
  v_order public.orders%rowtype;
  v_payment_id uuid;
  v_paid_total numeric(12,2);
begin
  v_actor_id := public.current_transaction_operator(array['super_admin','admin','finance']);

  if p_idempotency_key is not null then
    select id into v_payment_id
    from public.payments
    where idempotency_key = p_idempotency_key and recorded_by = v_actor_id
    limit 1;
    if v_payment_id is not null then
      return v_payment_id;
    end if;
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if v_order.id is null then
    raise exception 'ORDER_NOT_FOUND' using errcode = 'P0001';
  end if;

  if v_order.status in ('cancelled','refunded','fulfilled') then
    raise exception 'INVALID_STATUS_TRANSITION' using errcode = 'P0001';
  end if;

  if p_amount <= 0 or nullif(trim(coalesce(p_payment_method_type, '')), '') is null or nullif(trim(coalesce(p_payment_reference, '')), '') is null then
    raise exception 'INVALID_PAYMENT' using errcode = 'P0001';
  end if;

  select coalesce(sum(amount - refunded_amount), 0) into v_paid_total
  from public.payments
  where order_id = p_order_id
    and status in ('paid','partially_refunded','refunded');

  if v_paid_total + p_amount > v_order.total then
    raise exception 'PAYMENT_EXCEEDS_TOTAL' using errcode = 'P0001';
  end if;

  insert into public.payments (
    order_id,
    provider,
    amount,
    currency,
    status,
    payment_method_type,
    payment_reference,
    receipt_storage_path,
    paid_at,
    recorded_by,
    idempotency_key,
    provider_environment,
    notes,
    metadata
  )
  values (
    p_order_id,
    'manual',
    p_amount,
    v_order.currency,
    'paid',
    trim(p_payment_method_type),
    trim(p_payment_reference),
    nullif(p_receipt_storage_path, ''),
    coalesce(p_paid_at, now()),
    v_actor_id,
    nullif(p_idempotency_key, ''),
    'manual',
    p_notes,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_payment_id;

  update public.orders
  set status = case when v_paid_total + p_amount >= total then 'paid'::public.order_status else 'pending_payment'::public.order_status end,
      paid_at = case when v_paid_total + p_amount >= total then coalesce(paid_at, now()) else paid_at end,
      updated_by = v_actor_id,
      updated_at = now()
  where id = p_order_id;

  perform public.write_transaction_audit(v_actor_id, 'manual_payment_recorded', 'payments', v_payment_id, null, jsonb_build_object('order_id', p_order_id, 'amount', p_amount, 'method', p_payment_method_type));
  return v_payment_id;
end;
$$;

create or replace function public.register_refund(
  p_payment_id uuid,
  p_amount numeric,
  p_reason text,
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
  v_payment public.payments%rowtype;
  v_order public.orders%rowtype;
  v_total_refunded numeric(12,2);
begin
  v_actor_id := public.current_transaction_operator(array['super_admin','admin','finance']);

  select * into v_payment from public.payments where id = p_payment_id for update;
  if v_payment.id is null then
    raise exception 'PAYMENT_NOT_FOUND' using errcode = 'P0001';
  end if;

  if p_idempotency_key is not null and v_payment.metadata ->> 'lastRefundIdempotencyKey' = p_idempotency_key then
    return p_payment_id;
  end if;

  if p_amount <= 0 or p_amount > (v_payment.amount - v_payment.refunded_amount) then
    raise exception 'REFUND_EXCEEDS_PAYMENT' using errcode = 'P0001';
  end if;

  update public.payments
  set refunded_amount = refunded_amount + p_amount,
      status = case when refunded_amount + p_amount >= amount then 'refunded'::public.payment_status else 'partially_refunded'::public.payment_status end,
      refund_reason = coalesce(nullif(p_reason, ''), refund_reason),
      refunded_at = now(),
      metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('lastRefundIdempotencyKey', p_idempotency_key),
      updated_at = now()
  where id = p_payment_id
  returning * into v_payment;

  select * into v_order from public.orders where id = v_payment.order_id for update;
  select coalesce(sum(refunded_amount), 0) into v_total_refunded
  from public.payments
  where order_id = v_payment.order_id;

  if v_total_refunded >= v_order.total then
    update public.orders
    set status = 'refunded',
        updated_by = v_actor_id,
        updated_at = now()
    where id = v_order.id;
  end if;

  perform public.write_transaction_audit(v_actor_id, 'payment_refunded', 'payments', p_payment_id, null, jsonb_build_object('amount', p_amount, 'reason', p_reason));
  return p_payment_id;
end;
$$;

create or replace function public.process_payment_webhook(
  p_provider text,
  p_provider_event_id text,
  p_event_type text,
  p_payload_hash text,
  p_provider_environment text default 'provider',
  p_metadata jsonb default '{}'::jsonb
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
  v_actor_id := public.current_transaction_operator(array['super_admin','admin','finance']);

  insert into public.payment_webhook_events (
    provider,
    provider_event_id,
    event_type,
    payload_hash,
    processed,
    processed_at,
    provider_environment,
    metadata
  )
  values (
    trim(p_provider),
    trim(p_provider_event_id),
    trim(p_event_type),
    trim(p_payload_hash),
    false,
    null,
    coalesce(nullif(p_provider_environment, ''), 'provider'),
    coalesce(p_metadata, '{}'::jsonb)
  )
  on conflict (provider_event_id) do update
    set metadata = public.payment_webhook_events.metadata || jsonb_build_object('duplicate_seen_at', now())
  returning id into v_event_id;

  perform public.write_transaction_audit(v_actor_id, 'payment_webhook_recorded', 'payment_webhook_events', v_event_id, null, jsonb_build_object('provider', p_provider, 'event_type', p_event_type));
  return v_event_id;
end;
$$;

create or replace function public.issue_access_pass(
  p_reservation_id uuid default null,
  p_order_id uuid default null,
  p_event_ticket_type_id uuid default null,
  p_qr_token_hash text default null,
  p_valid_from timestamptz default null,
  p_valid_until timestamptz default null,
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
  v_pass_id uuid;
  v_pass_number text;
  v_order public.orders%rowtype;
begin
  v_actor_id := public.current_transaction_operator(array['super_admin','admin','operations']);

  if p_qr_token_hash is null or length(trim(p_qr_token_hash)) < 32 then
    raise exception 'INVALID_QR_TOKEN' using errcode = 'P0001';
  end if;

  if p_idempotency_key is not null then
    select id into v_pass_id
    from public.access_passes
    where metadata ->> 'idempotencyKey' = p_idempotency_key
    limit 1;
    if v_pass_id is not null then
      return v_pass_id;
    end if;
  end if;

  if p_reservation_id is null and p_order_id is null then
    raise exception 'PASS_OWNER_REQUIRED' using errcode = 'P0001';
  end if;

  if p_order_id is not null then
    select * into v_order from public.orders where id = p_order_id for update;
    if v_order.id is null then
      raise exception 'ORDER_NOT_FOUND' using errcode = 'P0001';
    end if;
    if v_order.status not in ('paid','processing','fulfilled') then
      raise exception 'ORDER_NOT_PAID' using errcode = 'P0001';
    end if;
  end if;

  if p_reservation_id is not null and not exists (select 1 from public.reservations where id = p_reservation_id and status in ('pending','confirmed','completed')) then
    raise exception 'RESERVATION_NOT_FOUND' using errcode = 'P0001';
  end if;

  v_pass_number := 'PASS-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

  insert into public.access_passes (
    reservation_id,
    order_id,
    event_ticket_type_id,
    qr_token_hash,
    pass_number,
    status,
    valid_from,
    valid_until,
    issued_at,
    metadata
  )
  values (
    p_reservation_id,
    p_order_id,
    p_event_ticket_type_id,
    trim(p_qr_token_hash),
    v_pass_number,
    'published',
    p_valid_from,
    p_valid_until,
    now(),
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object('idempotencyKey', p_idempotency_key)
  )
  returning id into v_pass_id;

  perform public.write_transaction_audit(v_actor_id, 'access_pass_issued', 'access_passes', v_pass_id, null, jsonb_build_object('pass_number', v_pass_number));
  return v_pass_id;
end;
$$;

create or replace function public.revoke_access_pass(
  p_access_pass_id uuid,
  p_reason text default null
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

  update public.access_passes
  set status = 'archived',
      revoked_at = coalesce(revoked_at, now()),
      revoked_by = v_actor_id,
      revocation_reason = coalesce(p_reason, revocation_reason)
  where id = p_access_pass_id;

  if not found then
    raise exception 'PASS_NOT_FOUND' using errcode = 'P0001';
  end if;

  perform public.write_transaction_audit(v_actor_id, 'access_pass_revoked', 'access_passes', p_access_pass_id, null, jsonb_build_object('reason', p_reason));
  return p_access_pass_id;
end;
$$;

create or replace function public.validate_access_pass(
  p_qr_token_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid;
  v_pass record;
  v_valid boolean;
  v_reason text;
begin
  v_actor_id := public.current_transaction_operator(array['super_admin','admin','operations']);

  select ap.id, ap.pass_number, ap.status, ap.valid_from, ap.valid_until, ap.used_at, ap.revoked_at,
         r.reservation_number, r.people_count, r.status as reservation_status,
         c.display_name, c.first_name, c.last_name,
         e.title as experience_title,
         ev.title as event_name
  into v_pass
  from public.access_passes ap
  left join public.reservations r on r.id = ap.reservation_id
  left join public.customers c on c.id = r.customer_id
  left join public.experiences e on e.id = r.experience_id
  left join public.events ev on ev.id = r.event_id
  where ap.qr_token_hash = trim(p_qr_token_hash)
  limit 1;

  if v_pass.id is null then
    raise exception 'PASS_NOT_FOUND' using errcode = 'P0001';
  end if;

  v_valid := v_pass.status = 'published'
    and v_pass.revoked_at is null
    and v_pass.used_at is null
    and (v_pass.valid_from is null or v_pass.valid_from <= now())
    and (v_pass.valid_until is null or v_pass.valid_until >= now());

  v_reason := case
    when v_pass.status <> 'published' or v_pass.revoked_at is not null then 'revoked'
    when v_pass.used_at is not null then 'used'
    when v_pass.valid_from is not null and v_pass.valid_from > now() then 'not_yet_valid'
    when v_pass.valid_until is not null and v_pass.valid_until < now() then 'expired'
    else null
  end;

  perform public.write_transaction_audit(v_actor_id, 'access_pass_validated', 'access_passes', v_pass.id, null, jsonb_build_object('valid', v_valid, 'reason', v_reason));

  return jsonb_build_object(
    'valid', v_valid,
    'reason', v_reason,
    'accessPassId', v_pass.id,
    'passNumber', v_pass.pass_number,
    'reservationNumber', v_pass.reservation_number,
    'guestName', coalesce(v_pass.display_name, trim(coalesce(v_pass.first_name, '') || ' ' || coalesce(v_pass.last_name, ''))),
    'peopleCount', v_pass.people_count,
    'status', v_pass.status,
    'reservationStatus', v_pass.reservation_status,
    'experienceTitle', coalesce(v_pass.experience_title, v_pass.event_name),
    'usedAt', v_pass.used_at
  );
end;
$$;

create or replace function public.register_checkin(
  p_access_pass_id uuid,
  p_request_id text default null,
  p_notes text default null,
  p_device_info jsonb default '{}'::jsonb,
  p_evidence_storage_path text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid;
  v_pass public.access_passes%rowtype;
  v_checkin_id uuid;
begin
  v_actor_id := public.current_transaction_operator(array['super_admin','admin','operations']);

  if p_request_id is not null then
    select id into v_checkin_id from public.checkins where request_id = p_request_id limit 1;
    if v_checkin_id is not null then
      return v_checkin_id;
    end if;
  end if;

  select * into v_pass from public.access_passes where id = p_access_pass_id for update;
  if v_pass.id is null then
    raise exception 'PASS_NOT_FOUND' using errcode = 'P0001';
  end if;

  if v_pass.status <> 'published' or v_pass.revoked_at is not null then
    raise exception 'PASS_REVOKED' using errcode = 'P0001';
  end if;

  if v_pass.used_at is not null or exists (select 1 from public.checkins where access_pass_id = p_access_pass_id and reversed_at is null) then
    raise exception 'PASS_ALREADY_USED' using errcode = 'P0001';
  end if;

  if (v_pass.valid_from is not null and v_pass.valid_from > now()) or (v_pass.valid_until is not null and v_pass.valid_until < now()) then
    raise exception 'PASS_NOT_VALID' using errcode = 'P0001';
  end if;

  insert into public.checkins (
    access_pass_id,
    checked_in_by,
    checked_in_at,
    device_info,
    notes,
    request_id,
    evidence_storage_path,
    metadata
  )
  values (
    p_access_pass_id,
    v_actor_id,
    now(),
    coalesce(p_device_info, '{}'::jsonb),
    p_notes,
    nullif(p_request_id, ''),
    nullif(p_evidence_storage_path, ''),
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_checkin_id;

  update public.access_passes
  set used_at = now()
  where id = p_access_pass_id;

  perform public.write_transaction_audit(v_actor_id, 'checkin_registered', 'checkins', v_checkin_id, null, jsonb_build_object('pass_number', v_pass.pass_number));
  return v_checkin_id;
end;
$$;

create or replace function public.reverse_checkin(
  p_checkin_id uuid,
  p_reason text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid;
  v_checkin public.checkins%rowtype;
begin
  v_actor_id := public.current_transaction_operator(array['super_admin','admin','operations']);

  select * into v_checkin from public.checkins where id = p_checkin_id for update;
  if v_checkin.id is null then
    raise exception 'CHECKIN_NOT_FOUND' using errcode = 'P0001';
  end if;

  if v_checkin.reversed_at is not null then
    raise exception 'CHECKIN_ALREADY_REVERSED' using errcode = 'P0001';
  end if;

  update public.checkins
  set reversed_at = now(),
      reversed_by = v_actor_id,
      reversal_reason = coalesce(nullif(p_reason, ''), 'Reversión autorizada')
  where id = p_checkin_id;

  update public.access_passes
  set used_at = null
  where id = v_checkin.access_pass_id;

  perform public.write_transaction_audit(v_actor_id, 'checkin_reversed', 'checkins', p_checkin_id, null, jsonb_build_object('reason', p_reason));
  return p_checkin_id;
end;
$$;

revoke all on function public.can_operate_transactions(uuid, text[]) from public, anon;
revoke all on function public.current_transaction_operator(text[]) from public, anon;
revoke all on function public.write_transaction_audit(uuid, text, text, uuid, jsonb, jsonb) from public, anon;
revoke all on function public.create_order_admin(uuid, uuid, jsonb, text, text, jsonb) from public, anon;
revoke all on function public.update_order_status(uuid, public.order_status, text) from public, anon;
revoke all on function public.record_manual_payment(uuid, numeric, text, text, text, timestamptz, text, text, jsonb) from public, anon;
revoke all on function public.register_refund(uuid, numeric, text, text, jsonb) from public, anon;
revoke all on function public.process_payment_webhook(text, text, text, text, text, jsonb) from public, anon;
revoke all on function public.issue_access_pass(uuid, uuid, uuid, text, timestamptz, timestamptz, text, jsonb) from public, anon;
revoke all on function public.revoke_access_pass(uuid, text) from public, anon;
revoke all on function public.validate_access_pass(text) from public, anon;
revoke all on function public.register_checkin(uuid, text, text, jsonb, text, jsonb) from public, anon;
revoke all on function public.reverse_checkin(uuid, text) from public, anon;

grant execute on function public.can_operate_transactions(uuid, text[]) to authenticated;
grant execute on function public.current_transaction_operator(text[]) to authenticated;
grant execute on function public.write_transaction_audit(uuid, text, text, uuid, jsonb, jsonb) to authenticated;
grant execute on function public.create_order_admin(uuid, uuid, jsonb, text, text, jsonb) to authenticated;
grant execute on function public.update_order_status(uuid, public.order_status, text) to authenticated;
grant execute on function public.record_manual_payment(uuid, numeric, text, text, text, timestamptz, text, text, jsonb) to authenticated;
grant execute on function public.register_refund(uuid, numeric, text, text, jsonb) to authenticated;
grant execute on function public.process_payment_webhook(text, text, text, text, text, jsonb) to authenticated;
grant execute on function public.issue_access_pass(uuid, uuid, uuid, text, timestamptz, timestamptz, text, jsonb) to authenticated;
grant execute on function public.revoke_access_pass(uuid, text) to authenticated;
grant execute on function public.validate_access_pass(text) to authenticated;
grant execute on function public.register_checkin(uuid, text, text, jsonb, text, jsonb) to authenticated;
grant execute on function public.reverse_checkin(uuid, text) to authenticated;

commit;
