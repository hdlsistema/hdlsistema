begin;

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
  v_has_wine boolean := false;
  v_has_event_ticket boolean := false;
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

  select exists(select 1 from public.cart_items where cart_id = v_cart.id and item_type = 'wine')
  into v_has_wine;

  select exists(select 1 from public.cart_items where cart_id = v_cart.id and item_type = 'event_ticket')
  into v_has_event_ticket;

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
      'paymentAvailable', v_has_event_ticket or v_has_wine,
      'paymentMessage', case
        when v_has_event_ticket and v_has_wine then 'Tu orden incluye accesos y productos; se puede pagar en línea con logística registrada.'
        when v_has_event_ticket then 'Tu orden de boletos se puede pagar en línea.'
        when v_has_wine then 'Tu orden se puede pagar en línea con envío registrado.'
        else 'Tu orden fue creada. El pago en línea estará disponible próximamente.'
      end,
      'fulfillmentMode', case
        when v_has_event_ticket and v_has_wine then 'mixed'
        when v_has_event_ticket then 'event_access'
        when v_has_wine then 'shipping_or_pickup'
        else 'pending'
      end
    ),
    'createdAt', v_cart.created_at,
    'updatedAt', v_cart.updated_at
  );
end;
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
  v_has_wine boolean := false;
  v_has_event_ticket boolean := false;
  v_fulfillment_mode text;
  v_payment_available boolean;
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

  select exists(select 1 from public.cart_items where cart_id = v_cart_id and item_type = 'wine')
  into v_has_wine;

  select exists(select 1 from public.cart_items where cart_id = v_cart_id and item_type = 'event_ticket')
  into v_has_event_ticket;

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
  v_fulfillment_mode := case
    when v_has_event_ticket and v_has_wine then 'mixed'
    when v_has_event_ticket then 'event_access'
    when v_has_wine then 'shipping_or_pickup'
    else 'pickup_at_hacienda'
  end;
  v_payment_available := v_has_event_ticket or v_has_wine;

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
      'paymentAvailable', v_payment_available,
      'paymentStatus', 'pending_payment',
      'fulfillmentMode', v_fulfillment_mode,
      'requiresTicketAccess', v_has_event_ticket,
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
    jsonb_build_object('source', 'app', 'status', 'pending_payment', 'paymentCreated', v_payment_available, 'hasEventTicket', v_has_event_ticket)
  );

  return v_order_id;
end;
$$;

revoke all on function public.get_customer_cart() from public, anon;
revoke all on function public.create_customer_order_from_cart(text, text) from public, anon;
grant execute on function public.get_customer_cart() to authenticated;
grant execute on function public.create_customer_order_from_cart(text, text) to authenticated;

commit;
