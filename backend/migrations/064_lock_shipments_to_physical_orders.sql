begin;

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
  v_order public.orders%rowtype;
  v_has_wine boolean := false;
  v_shipment_id uuid;
  v_number text;
begin
  v_actor_id := public.current_transaction_operator(array['super_admin','admin','operations']);

  select *
  into v_order
  from public.orders
  where id = p_order_id
  for update;

  if v_order.id is null then
    raise exception 'ORDER_NOT_FOUND' using errcode = 'P0001';
  end if;

  select exists (
    select 1
    from public.order_items oi
    where oi.order_id = p_order_id
      and oi.item_type = 'wine'
  )
  into v_has_wine;

  if not coalesce(v_order.requires_shipping, false) and not v_has_wine then
    raise exception 'SHIPMENT_NOT_REQUIRED' using errcode = 'P0001';
  end if;

  if p_idempotency_key is not null then
    select id into v_shipment_id
    from public.shipments
    where order_id = p_order_id
      and created_by = v_actor_id
      and metadata ->> 'idempotencyKey' = p_idempotency_key
    limit 1;
    if v_shipment_id is not null then
      return v_shipment_id;
    end if;
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

insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, after_data)
values (
  null,
  'migration_064_lock_shipments_to_physical_orders',
  'system',
  gen_random_uuid(),
  jsonb_build_object('status', 'applied', 'scope', 'shipments_only_for_physical_orders')
);

commit;
