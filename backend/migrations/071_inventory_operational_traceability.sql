begin;

insert into public.inventory_locations (name, code, type, address, active, metadata)
values
  ('Bodega Hacienda', 'BODEGA-HDL', 'warehouse', 'Hacienda de Letras', true, jsonb_build_object('operationalCategory', 'bodega')),
  ('Cava principal', 'CAVA-HDL', 'cellar', 'Hacienda de Letras', true, jsonb_build_object('operationalCategory', 'cava')),
  ('Boutique Hacienda', 'BOUTIQUE-HDL', 'store', 'Hacienda de Letras', true, jsonb_build_object('operationalCategory', 'boutique')),
  ('Restaurante Hacienda', 'REST-HDL', 'restaurant', 'Hacienda de Letras', true, jsonb_build_object('operationalCategory', 'restaurante')),
  ('Restaurante Centro', 'REST-CENTRO', 'restaurant', 'Aguascalientes Centro', true, jsonb_build_object('operationalCategory', 'restaurante')),
  ('Sede eventos Hacienda', 'EVENTOS-HDL', 'event_venue', 'Hacienda de Letras', true, jsonb_build_object('operationalCategory', 'sede')),
  ('Almacen general', 'ALM-GRAL', 'warehouse', 'Hacienda de Letras', true, jsonb_build_object('operationalCategory', 'almacen'))
on conflict (name) do update
set code = coalesce(public.inventory_locations.code, excluded.code),
    type = excluded.type,
    address = coalesce(public.inventory_locations.address, excluded.address),
    active = true,
    metadata = coalesce(public.inventory_locations.metadata, '{}'::jsonb) || excluded.metadata,
    updated_at = now();

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
  v_item public.inventory_items%rowtype;
  v_before_quantity integer;
  v_before_reserved integer;
  v_after_quantity integer;
  v_after_reserved integer;
  v_metadata jsonb;
begin
  v_actor_id := public.current_transaction_operator(array['super_admin','admin','operations']);

  if p_idempotency_key is not null then
    select id
    into v_movement_id
    from public.inventory_movements
    where created_by = v_actor_id
      and idempotency_key = p_idempotency_key
    limit 1;

    if v_movement_id is not null then
      return v_movement_id;
    end if;
  end if;

  select *
  into v_item
  from public.inventory_items
  where id = p_item_id;

  if v_item.id is null then
    raise exception 'INVENTORY_ITEM_NOT_FOUND' using errcode = 'P0001';
  end if;

  v_after_quantity := coalesce(v_item.quantity, 0);
  v_after_reserved := coalesce(v_item.reserved_quantity, 0);
  v_before_quantity := v_after_quantity;
  v_before_reserved := v_after_reserved;

  if p_type in (
    'purchase',
    'production',
    'transfer_in',
    'transfer_out',
    'sale',
    'return',
    'adjustment_in',
    'adjustment_out',
    'damage',
    'loss',
    'sample',
    'event_consumption'
  ) then
    v_before_quantity := v_after_quantity - p_quantity;
  end if;

  if p_type = 'reservation' then
    v_before_reserved := v_after_reserved - p_quantity;
  elsif p_type in ('release', 'sale') then
    v_before_reserved := v_after_reserved - p_quantity;
  end if;

  v_metadata := coalesce(p_metadata, '{}'::jsonb)
    || jsonb_build_object(
      'origin', coalesce(nullif(p_metadata ->> 'origin', ''), 'control_center'),
      'module', coalesce(nullif(p_metadata ->> 'module', ''), 'Inventario'),
      'actorId', v_actor_id,
      'fromLocationId', p_from_location_id,
      'toLocationId', p_to_location_id,
      'referenceType', p_reference_type,
      'referenceId', p_reference_id,
      'stateBefore', jsonb_build_object(
        'quantity', greatest(v_before_quantity, 0),
        'reservedQuantity', greatest(v_before_reserved, 0),
        'available', greatest(v_before_quantity - v_before_reserved, 0)
      ),
      'stateAfter', jsonb_build_object(
        'quantity', greatest(v_after_quantity, 0),
        'reservedQuantity', greatest(v_after_reserved, 0),
        'available', greatest(v_after_quantity - v_after_reserved, 0)
      )
    );

  insert into public.inventory_movements (
    inventory_item_id,
    movement_type,
    quantity,
    reference_type,
    reference_id,
    notes,
    reason,
    from_location_id,
    to_location_id,
    created_by,
    idempotency_key,
    metadata
  )
  values (
    p_item_id,
    p_type,
    p_quantity,
    p_reference_type,
    p_reference_id,
    p_reason,
    p_reason,
    p_from_location_id,
    p_to_location_id,
    v_actor_id,
    nullif(p_idempotency_key, ''),
    v_metadata
  )
  returning id into v_movement_id;

  return v_movement_id;
end;
$$;

insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, after_data)
values (
  null,
  'migration_071_inventory_operational_traceability',
  'system',
  gen_random_uuid(),
  jsonb_build_object(
    'status', 'prepared',
    'scope', 'inventory_locations_and_movement_state_metadata',
    'note', 'Historical records keep null actor/state and must be displayed as No registrado when data is absent.'
  )
);

commit;
