begin;

alter table public.carts add column if not exists cart_status text not null default 'active';
alter table public.carts add column if not exists discount_code text;
alter table public.carts add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.cart_items add column if not exists name_snapshot text;
alter table public.cart_items add column if not exists sku_snapshot text;
alter table public.cart_items add column if not exists currency char(3) not null default 'MXN';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'carts_cart_status_valid') then
    alter table public.carts add constraint carts_cart_status_valid
    check (cart_status in ('active', 'converted', 'abandoned'));
  end if;
end $$;

create unique index if not exists idx_carts_active_customer
on public.carts(customer_id)
where cart_status = 'active';

create index if not exists idx_carts_customer_cart_status on public.carts(customer_id, cart_status);
create index if not exists idx_cart_items_item_lookup on public.cart_items(item_type, item_id);
create index if not exists idx_orders_customer_created on public.orders(customer_id, created_at desc);

alter table public.carts enable row level security;
alter table public.cart_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'carts' and policyname = 'carts_customer_select'
  ) then
    create policy carts_customer_select on public.carts
    for select to authenticated using (
      customer_id = public.current_customer_id() and user_id = auth.uid()
    );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'carts' and policyname = 'carts_customer_insert'
  ) then
    create policy carts_customer_insert on public.carts
    for insert to authenticated with check (
      customer_id = public.current_customer_id() and user_id = auth.uid()
    );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'carts' and policyname = 'carts_customer_update'
  ) then
    create policy carts_customer_update on public.carts
    for update to authenticated using (
      customer_id = public.current_customer_id() and user_id = auth.uid()
    ) with check (
      customer_id = public.current_customer_id() and user_id = auth.uid()
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'cart_items' and policyname = 'cart_items_customer_select'
  ) then
    create policy cart_items_customer_select on public.cart_items
    for select to authenticated using (
      exists (
        select 1 from public.carts c
        where c.id = cart_items.cart_id
          and c.customer_id = public.current_customer_id()
          and c.user_id = auth.uid()
      )
    );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'cart_items' and policyname = 'cart_items_customer_insert'
  ) then
    create policy cart_items_customer_insert on public.cart_items
    for insert to authenticated with check (
      exists (
        select 1 from public.carts c
        where c.id = cart_items.cart_id
          and c.customer_id = public.current_customer_id()
          and c.user_id = auth.uid()
          and c.cart_status = 'active'
      )
    );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'cart_items' and policyname = 'cart_items_customer_update'
  ) then
    create policy cart_items_customer_update on public.cart_items
    for update to authenticated using (
      exists (
        select 1 from public.carts c
        where c.id = cart_items.cart_id
          and c.customer_id = public.current_customer_id()
          and c.user_id = auth.uid()
          and c.cart_status = 'active'
      )
    ) with check (
      exists (
        select 1 from public.carts c
        where c.id = cart_items.cart_id
          and c.customer_id = public.current_customer_id()
          and c.user_id = auth.uid()
          and c.cart_status = 'active'
      )
    );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'cart_items' and policyname = 'cart_items_customer_delete'
  ) then
    create policy cart_items_customer_delete on public.cart_items
    for delete to authenticated using (
      exists (
        select 1 from public.carts c
        where c.id = cart_items.cart_id
          and c.customer_id = public.current_customer_id()
          and c.user_id = auth.uid()
          and c.cart_status = 'active'
      )
    );
  end if;
end $$;

create or replace function public.get_active_customer_cart_id()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_customer_id uuid;
  v_cart_id uuid;
begin
  if v_user_id is null then
    raise exception 'FORBIDDEN' using errcode = 'P0001';
  end if;

  select id into v_customer_id from public.customers where user_id = v_user_id;
  if v_customer_id is null then
    raise exception 'CUSTOMER_PROFILE_REQUIRED' using errcode = 'P0001';
  end if;

  select id into v_cart_id
  from public.carts
  where customer_id = v_customer_id
    and user_id = v_user_id
    and cart_status = 'active'
  order by updated_at desc
  limit 1;

  if v_cart_id is null then
    insert into public.carts (
      user_id,
      customer_id,
      currency,
      status,
      cart_status,
      expires_at,
      metadata
    )
    values (
      v_user_id,
      v_customer_id,
      'MXN',
      'draft',
      'active',
      now() + interval '14 days',
      jsonb_build_object('source', 'app')
    )
    returning id into v_cart_id;
  end if;

  return v_cart_id;
end;
$$;

create or replace function public.resolve_customer_cart_item(
  p_item_type text,
  p_item_id uuid,
  p_quantity integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_wine public.wines%rowtype;
  v_ticket public.event_ticket_types%rowtype;
  v_event public.events%rowtype;
  v_available integer;
begin
  if p_quantity < 1 then
    raise exception 'INVALID_QUANTITY' using errcode = 'P0001';
  end if;

  if p_item_type = 'wine' then
    select * into v_wine from public.wines where id = p_item_id;

    if v_wine.id is null or not public.is_content_live(v_wine.status::text, v_wine.visible_in_app, v_wine.publish_at, v_wine.unpublish_at, v_wine.archived_at, v_wine.deleted_at) then
      raise exception 'ITEM_NOT_AVAILABLE' using errcode = 'P0001';
    end if;

    if v_wine.price < 0 then
      raise exception 'INVALID_PRICE' using errcode = 'P0001';
    end if;

    if v_wine.stock_control_enabled and v_wine.stock_quantity < p_quantity then
      raise exception 'STOCK_UNAVAILABLE' using errcode = 'P0001';
    end if;

    return jsonb_build_object(
      'itemType', 'wine',
      'itemId', v_wine.id,
      'name', v_wine.name,
      'sku', v_wine.sku,
      'unitPrice', v_wine.price,
      'currency', 'MXN',
      'availableQuantity', case when v_wine.stock_control_enabled then v_wine.stock_quantity else null end,
      'metadata', jsonb_build_object(
        'slug', v_wine.slug,
        'imageUrl', v_wine.cover_image_url,
        'stockControlEnabled', v_wine.stock_control_enabled
      )
    );
  end if;

  if p_item_type = 'event_ticket' then
    select * into v_ticket from public.event_ticket_types where id = p_item_id;

    if v_ticket.id is null or not v_ticket.active or not public.is_content_live(v_ticket.status::text, v_ticket.visible_in_app, v_ticket.publish_at, v_ticket.unpublish_at, v_ticket.archived_at, v_ticket.deleted_at) then
      raise exception 'ITEM_NOT_AVAILABLE' using errcode = 'P0001';
    end if;

    select * into v_event from public.events where id = v_ticket.event_id;
    if v_event.id is null or not v_event.sales_enabled or not public.is_content_live(v_event.status::text, v_event.visible_in_app, v_event.publish_at, v_event.unpublish_at, v_event.archived_at, v_event.deleted_at) then
      raise exception 'ITEM_NOT_AVAILABLE' using errcode = 'P0001';
    end if;

    if (v_ticket.sales_start_at is not null and v_ticket.sales_start_at > now()) or (v_ticket.sales_end_at is not null and v_ticket.sales_end_at < now()) then
      raise exception 'ITEM_NOT_AVAILABLE' using errcode = 'P0001';
    end if;

    v_available := greatest(v_ticket.capacity - v_ticket.sold_count, 0);
    if v_available < p_quantity then
      raise exception 'STOCK_UNAVAILABLE' using errcode = 'P0001';
    end if;

    return jsonb_build_object(
      'itemType', 'event_ticket',
      'itemId', v_ticket.id,
      'name', v_event.title || ' - ' || v_ticket.name,
      'sku', null,
      'unitPrice', v_ticket.price,
      'currency', 'MXN',
      'availableQuantity', v_available,
      'metadata', jsonb_build_object(
        'eventId', v_event.id,
        'eventSlug', v_event.slug,
        'eventStartsAt', v_event.start_at
      )
    );
  end if;

  if p_item_type = 'experience' then
    raise exception 'USE_RESERVATIONS_FLOW' using errcode = 'P0001';
  end if;

  raise exception 'ITEM_TYPE_NOT_ALLOWED' using errcode = 'P0001';
end;
$$;

create or replace function public.calculate_customer_cart_totals(
  p_cart_id uuid,
  p_discount_code text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_subtotal numeric(12,2) := 0;
  v_discount numeric(12,2) := 0;
  v_tax numeric(12,2) := 0;
  v_shipping numeric(12,2) := 0;
  v_total numeric(12,2) := 0;
  v_promotion public.promotions%rowtype;
  v_code text := upper(nullif(trim(coalesce(p_discount_code, '')), ''));
begin
  select coalesce(sum(quantity * unit_price_snapshot), 0)
  into v_subtotal
  from public.cart_items
  where cart_id = p_cart_id;

  if v_code is not null then
    select * into v_promotion
    from public.promotions
    where upper(code) = v_code
      and public.is_content_live(status::text, visible_in_app, publish_at, unpublish_at, archived_at, deleted_at)
      and (starts_at is null or starts_at <= now())
      and (ends_at is null or ends_at >= now())
      and (usage_limit is null or used_count < usage_limit)
      and minimum_amount <= v_subtotal
    order by sort_order asc, created_at desc
    limit 1;

    if v_promotion.id is not null then
      if v_promotion.discount_type in ('percentage', 'percent') then
        v_discount := round(v_subtotal * (v_promotion.discount_value / 100), 2);
      elsif v_promotion.discount_type in ('fixed_amount', 'fixed', 'amount') then
        v_discount := v_promotion.discount_value;
      end if;

      if v_promotion.maximum_discount is not null then
        v_discount := least(v_discount, v_promotion.maximum_discount);
      end if;
      v_discount := least(greatest(v_discount, 0), v_subtotal);
    end if;
  end if;

  v_total := greatest(v_subtotal - v_discount + v_tax + v_shipping, 0);

  return jsonb_build_object(
    'subtotal', v_subtotal,
    'discountTotal', v_discount,
    'taxTotal', v_tax,
    'shippingTotal', v_shipping,
    'total', v_total,
    'currency', 'MXN',
    'discountCode', v_code,
    'discountApplied', v_discount > 0,
    'shippingMode', 'pickup_at_hacienda',
    'paymentStatus', 'pending_payment'
  );
end;
$$;

create or replace function public.get_customer_cart()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cart_id uuid;
  v_cart public.carts%rowtype;
  v_items jsonb;
  v_totals jsonb;
begin
  v_cart_id := public.get_active_customer_cart_id();
  select * into v_cart from public.carts where id = v_cart_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', ci.id,
    'cartId', ci.cart_id,
    'itemType', ci.item_type,
    'itemId', ci.item_id,
    'name', coalesce(ci.name_snapshot, ci.metadata ->> 'name'),
    'sku', ci.sku_snapshot,
    'quantity', ci.quantity,
    'unitPrice', ci.unit_price_snapshot,
    'subtotal', ci.quantity * ci.unit_price_snapshot,
    'currency', trim(ci.currency),
    'metadata', ci.metadata,
    'createdAt', ci.created_at,
    'updatedAt', ci.updated_at
  ) order by ci.created_at asc), '[]'::jsonb)
  into v_items
  from public.cart_items ci
  where ci.cart_id = v_cart.id;

  v_totals := public.calculate_customer_cart_totals(v_cart.id, v_cart.discount_code);

  return jsonb_build_object(
    'id', v_cart.id,
    'status', v_cart.cart_status,
    'legacyStatus', v_cart.status,
    'currency', trim(v_cart.currency),
    'expiresAt', v_cart.expires_at,
    'items', v_items,
    'totals', v_totals,
    'checkout', jsonb_build_object(
      'canCheckout', jsonb_array_length(v_items) > 0,
      'paymentAvailable', false,
      'paymentMessage', 'Tu orden fue creada. El pago en línea estará disponible próximamente.',
      'fulfillmentMode', 'pickup_at_hacienda'
    ),
    'createdAt', v_cart.created_at,
    'updatedAt', v_cart.updated_at
  );
end;
$$;

create or replace function public.add_customer_cart_item(
  p_item_type text,
  p_item_id uuid,
  p_quantity integer,
  p_idempotency_key text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cart_id uuid;
  v_cart public.carts%rowtype;
  v_item jsonb;
  v_existing public.cart_items%rowtype;
  v_next_quantity integer;
  v_key text := nullif(trim(coalesce(p_idempotency_key, '')), '');
begin
  v_cart_id := public.get_active_customer_cart_id();
  select * into v_cart from public.carts where id = v_cart_id for update;

  if v_key is not null and v_cart.metadata ->> 'lastCartMutationKey' = v_key then
    return public.get_customer_cart();
  end if;

  select * into v_existing
  from public.cart_items
  where cart_id = v_cart_id
    and item_type = p_item_type
    and item_id = p_item_id
  for update;

  v_next_quantity := coalesce(v_existing.quantity, 0) + p_quantity;
  v_item := public.resolve_customer_cart_item(p_item_type, p_item_id, v_next_quantity);

  if v_existing.id is null then
    insert into public.cart_items (
      cart_id,
      item_type,
      item_id,
      quantity,
      unit_price_snapshot,
      name_snapshot,
      sku_snapshot,
      currency,
      metadata
    )
    values (
      v_cart_id,
      p_item_type,
      p_item_id,
      p_quantity,
      (v_item ->> 'unitPrice')::numeric,
      v_item ->> 'name',
      nullif(v_item ->> 'sku', ''),
      coalesce(nullif(v_item ->> 'currency', ''), 'MXN'),
      (v_item -> 'metadata') || jsonb_build_object('name', v_item ->> 'name')
    );
  else
    update public.cart_items
    set quantity = v_next_quantity,
        unit_price_snapshot = (v_item ->> 'unitPrice')::numeric,
        name_snapshot = v_item ->> 'name',
        sku_snapshot = nullif(v_item ->> 'sku', ''),
        currency = coalesce(nullif(v_item ->> 'currency', ''), 'MXN'),
        metadata = coalesce(metadata, '{}'::jsonb) || (v_item -> 'metadata') || jsonb_build_object('name', v_item ->> 'name'),
        updated_at = now()
    where id = v_existing.id;
  end if;

  update public.carts
  set updated_at = now(),
      expires_at = now() + interval '14 days',
      metadata = metadata || jsonb_build_object('lastCartMutationKey', v_key)
  where id = v_cart_id;

  insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, after_data)
  values (auth.uid(), 'customer_cart_item_added', 'carts', v_cart_id, jsonb_build_object('itemType', p_item_type));

  return public.get_customer_cart();
end;
$$;

create or replace function public.update_customer_cart_item(
  p_cart_item_id uuid,
  p_quantity integer,
  p_idempotency_key text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cart_id uuid;
  v_cart public.carts%rowtype;
  v_existing public.cart_items%rowtype;
  v_item jsonb;
  v_key text := nullif(trim(coalesce(p_idempotency_key, '')), '');
begin
  if p_quantity < 1 then
    raise exception 'INVALID_QUANTITY' using errcode = 'P0001';
  end if;

  v_cart_id := public.get_active_customer_cart_id();
  select * into v_cart from public.carts where id = v_cart_id for update;

  if v_key is not null and v_cart.metadata ->> 'lastCartMutationKey' = v_key then
    return public.get_customer_cart();
  end if;

  select * into v_existing
  from public.cart_items
  where id = p_cart_item_id
    and cart_id = v_cart_id
  for update;

  if v_existing.id is null then
    raise exception 'CART_ITEM_NOT_FOUND' using errcode = 'P0001';
  end if;

  v_item := public.resolve_customer_cart_item(v_existing.item_type, v_existing.item_id, p_quantity);

  update public.cart_items
  set quantity = p_quantity,
      unit_price_snapshot = (v_item ->> 'unitPrice')::numeric,
      name_snapshot = v_item ->> 'name',
      sku_snapshot = nullif(v_item ->> 'sku', ''),
      currency = coalesce(nullif(v_item ->> 'currency', ''), 'MXN'),
      metadata = coalesce(metadata, '{}'::jsonb) || (v_item -> 'metadata') || jsonb_build_object('name', v_item ->> 'name'),
      updated_at = now()
  where id = v_existing.id;

  update public.carts
  set updated_at = now(),
      metadata = metadata || jsonb_build_object('lastCartMutationKey', v_key)
  where id = v_cart_id;

  insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, after_data)
  values (auth.uid(), 'customer_cart_item_updated', 'carts', v_cart_id, jsonb_build_object('itemId', p_cart_item_id, 'quantity', p_quantity));

  return public.get_customer_cart();
end;
$$;

create or replace function public.remove_customer_cart_item(
  p_cart_item_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cart_id uuid;
begin
  v_cart_id := public.get_active_customer_cart_id();

  delete from public.cart_items
  where id = p_cart_item_id
    and cart_id = v_cart_id;

  if not found then
    raise exception 'CART_ITEM_NOT_FOUND' using errcode = 'P0001';
  end if;

  update public.carts set updated_at = now() where id = v_cart_id;

  insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, after_data)
  values (auth.uid(), 'customer_cart_item_removed', 'carts', v_cart_id, jsonb_build_object('itemId', p_cart_item_id));

  return public.get_customer_cart();
end;
$$;

create or replace function public.clear_customer_cart()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cart_id uuid;
begin
  v_cart_id := public.get_active_customer_cart_id();
  delete from public.cart_items where cart_id = v_cart_id;
  update public.carts
  set discount_code = null,
      updated_at = now()
  where id = v_cart_id;

  insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, after_data)
  values (auth.uid(), 'customer_cart_cleared', 'carts', v_cart_id, jsonb_build_object('source', 'app'));

  return public.get_customer_cart();
end;
$$;

create or replace function public.get_customer_order_detail(
  p_order_id uuid
)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select coalesce((
    select jsonb_build_object(
      'id', o.id,
      'orderNumber', o.order_number,
      'status', o.status,
      'subtotal', o.subtotal,
      'discountTotal', o.discount_total,
      'taxTotal', o.tax_total,
      'shippingTotal', o.shipping_total,
      'total', o.total,
      'currency', trim(o.currency),
      'paymentStatus', case when exists (
        select 1 from public.payments p where p.order_id = o.id and p.status in ('paid', 'partially_refunded', 'refunded')
      ) then 'recorded' else 'pending_payment' end,
      'paymentAvailable', false,
      'source', o.source,
      'createdAt', o.created_at,
      'updatedAt', o.updated_at,
      'items', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', oi.id,
          'itemType', oi.item_type,
          'itemId', oi.item_id,
          'name', oi.name_snapshot,
          'sku', oi.sku_snapshot,
          'quantity', oi.quantity,
          'unitPrice', oi.unit_price,
          'subtotal', oi.subtotal,
          'metadata', oi.metadata,
          'createdAt', oi.created_at
        ) order by oi.created_at asc)
        from public.order_items oi
        where oi.order_id = o.id
      ), '[]'::jsonb),
      'checkout', jsonb_build_object(
        'message', 'Tu orden fue creada. El pago en línea estará disponible próximamente.',
        'fulfillmentMode', coalesce(o.metadata ->> 'fulfillmentMode', 'pickup_at_hacienda'),
        'shippingPolicy', coalesce(o.metadata ->> 'shippingPolicy', 'pending')
      )
    )
    from public.orders o
    where o.id = p_order_id
      and o.customer_id = public.current_customer_id()
      and o.user_id = auth.uid()
  ), 'null'::jsonb);
$$;

create or replace function public.get_customer_orders()
returns jsonb
language sql
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(public.get_customer_order_detail(o.id) order by o.created_at desc), '[]'::jsonb)
  from public.orders o
  where o.customer_id = public.current_customer_id()
    and o.user_id = auth.uid();
$$;

create or replace function public.create_customer_order_from_cart(
  p_idempotency_key text,
  p_discount_code text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_customer_id uuid;
  v_cart_id uuid;
  v_order_id uuid;
  v_order_number text;
  v_item public.cart_items%rowtype;
  v_resolved jsonb;
  v_totals jsonb;
  v_key text := nullif(trim(coalesce(p_idempotency_key, '')), '');
  v_discount_code text := upper(nullif(trim(coalesce(p_discount_code, '')), ''));
  v_item_count integer;
begin
  if v_user_id is null then
    raise exception 'FORBIDDEN' using errcode = 'P0001';
  end if;
  if v_key is null then
    raise exception 'IDEMPOTENCY_KEY_REQUIRED' using errcode = 'P0001';
  end if;

  select id into v_customer_id from public.customers where user_id = v_user_id;
  if v_customer_id is null then
    raise exception 'CUSTOMER_PROFILE_REQUIRED' using errcode = 'P0001';
  end if;

  select id into v_order_id
  from public.orders
  where created_by = v_user_id
    and idempotency_key = v_key
    and customer_id = v_customer_id
  limit 1;
  if v_order_id is not null then
    return v_order_id;
  end if;

  v_cart_id := public.get_active_customer_cart_id();

  select count(*) into v_item_count from public.cart_items where cart_id = v_cart_id;
  if v_item_count = 0 then
    raise exception 'CART_EMPTY' using errcode = 'P0001';
  end if;

  if v_discount_code is not null then
    update public.carts
    set discount_code = v_discount_code,
        updated_at = now()
    where id = v_cart_id;
  end if;

  for v_item in
    select * from public.cart_items where cart_id = v_cart_id order by created_at asc for update
  loop
    v_resolved := public.resolve_customer_cart_item(v_item.item_type, v_item.item_id, v_item.quantity);
    update public.cart_items
    set unit_price_snapshot = (v_resolved ->> 'unitPrice')::numeric,
        name_snapshot = v_resolved ->> 'name',
        sku_snapshot = nullif(v_resolved ->> 'sku', ''),
        currency = coalesce(nullif(v_resolved ->> 'currency', ''), 'MXN'),
        metadata = coalesce(metadata, '{}'::jsonb) || (v_resolved -> 'metadata') || jsonb_build_object('name', v_resolved ->> 'name'),
        updated_at = now()
    where id = v_item.id;
  end loop;

  select discount_code into v_discount_code from public.carts where id = v_cart_id;
  v_totals := public.calculate_customer_cart_totals(v_cart_id, v_discount_code);
  v_order_number := 'ORD-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

  insert into public.orders (
    order_number,
    user_id,
    customer_id,
    subtotal,
    discount_total,
    tax_total,
    shipping_total,
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
    v_user_id,
    v_customer_id,
    (v_totals ->> 'subtotal')::numeric,
    (v_totals ->> 'discountTotal')::numeric,
    (v_totals ->> 'taxTotal')::numeric,
    (v_totals ->> 'shippingTotal')::numeric,
    (v_totals ->> 'total')::numeric,
    'MXN',
    'pending_payment',
    'app',
    v_key,
    v_user_id,
    v_user_id,
    jsonb_build_object(
      'checkoutMode', 'base',
      'paymentAvailable', false,
      'paymentStatus', 'pending_payment',
      'fulfillmentMode', 'pickup_at_hacienda',
      'shippingPolicy', 'pickup_only_until_rules_are_approved',
      'discountCode', v_discount_code
    )
  )
  returning id into v_order_id;

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
  select
    v_order_id,
    ci.item_type,
    ci.item_id,
    coalesce(ci.name_snapshot, ci.metadata ->> 'name'),
    ci.sku_snapshot,
    ci.quantity,
    ci.unit_price_snapshot,
    ci.quantity * ci.unit_price_snapshot,
    coalesce(ci.metadata, '{}'::jsonb)
  from public.cart_items ci
  where ci.cart_id = v_cart_id;

  if (v_totals ->> 'discountApplied')::boolean then
    insert into public.promotion_redemptions (
      promotion_id,
      customer_id,
      order_id,
      amount
    )
    select p.id, v_customer_id, v_order_id, (v_totals ->> 'discountTotal')::numeric
    from public.promotions p
    where upper(p.code) = v_discount_code
    limit 1;

    update public.promotions
    set used_count = used_count + 1,
        updated_at = now()
    where upper(code) = v_discount_code;
  end if;

  update public.carts
  set cart_status = 'converted',
      status = 'pending_payment',
      updated_at = now(),
      metadata = metadata || jsonb_build_object('convertedOrderId', v_order_id, 'lastOrderIdempotencyKey', v_key)
  where id = v_cart_id;

  insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, after_data)
  values (
    v_user_id,
    'customer_order_created',
    'orders',
    v_order_id,
    jsonb_build_object('source', 'app', 'status', 'pending_payment', 'paymentCreated', false)
  );

  return v_order_id;
end;
$$;

revoke all on function public.get_active_customer_cart_id() from public, anon;
revoke all on function public.resolve_customer_cart_item(text, uuid, integer) from public, anon;
revoke all on function public.calculate_customer_cart_totals(uuid, text) from public, anon;
revoke all on function public.get_customer_cart() from public, anon;
revoke all on function public.add_customer_cart_item(text, uuid, integer, text) from public, anon;
revoke all on function public.update_customer_cart_item(uuid, integer, text) from public, anon;
revoke all on function public.remove_customer_cart_item(uuid) from public, anon;
revoke all on function public.clear_customer_cart() from public, anon;
revoke all on function public.create_customer_order_from_cart(text, text) from public, anon;
revoke all on function public.get_customer_orders() from public, anon;
revoke all on function public.get_customer_order_detail(uuid) from public, anon;

grant execute on function public.get_active_customer_cart_id() to authenticated;
grant execute on function public.resolve_customer_cart_item(text, uuid, integer) to authenticated;
grant execute on function public.calculate_customer_cart_totals(uuid, text) to authenticated;
grant execute on function public.get_customer_cart() to authenticated;
grant execute on function public.add_customer_cart_item(text, uuid, integer, text) to authenticated;
grant execute on function public.update_customer_cart_item(uuid, integer, text) to authenticated;
grant execute on function public.remove_customer_cart_item(uuid) to authenticated;
grant execute on function public.clear_customer_cart() to authenticated;
grant execute on function public.create_customer_order_from_cart(text, text) to authenticated;
grant execute on function public.get_customer_orders() to authenticated;
grant execute on function public.get_customer_order_detail(uuid) to authenticated;

commit;
