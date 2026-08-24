begin;

create or replace function public.reserve_order_wine_inventory()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_stock_control_enabled boolean;
  v_remaining integer;
  v_take integer;
  v_item public.inventory_items%rowtype;
  v_before_reserved integer;
begin
  if new.item_type <> 'wine' then
    return new;
  end if;

  select stock_control_enabled
  into v_stock_control_enabled
  from public.wines
  where id = new.item_id;

  if not found or not coalesce(v_stock_control_enabled, false) then
    return new;
  end if;

  v_remaining := new.quantity;
  for v_item in
    select *
    from public.inventory_items
    where wine_id = new.item_id
      and status = 'active'
      and quantity > reserved_quantity
    order by (quantity - reserved_quantity) desc, created_at asc
    for update
  loop
    exit when v_remaining <= 0;
    v_take := least(v_remaining, v_item.quantity - v_item.reserved_quantity);
    v_before_reserved := coalesce(v_item.reserved_quantity, 0);

    update public.inventory_items
    set reserved_quantity = reserved_quantity + v_take,
        updated_at = now()
    where id = v_item.id;

    insert into public.inventory_movements (
      inventory_item_id, movement_type, quantity, reference_type, reference_id,
      notes, reason, from_location_id, created_by, metadata
    ) values (
      v_item.id,
      'reservation',
      v_take,
      'order',
      new.order_id,
      'Reserva automática por orden',
      'Orden de venta',
      v_item.location_id,
      auth.uid(),
      jsonb_build_object(
        'origin', 'orders',
        'module', 'Ordenes',
        'actorId', auth.uid(),
        'orderItemId', new.id,
        'orderId', new.order_id,
        'stateBefore', jsonb_build_object(
          'quantity', coalesce(v_item.quantity, 0),
          'reservedQuantity', v_before_reserved,
          'available', greatest(coalesce(v_item.quantity, 0) - v_before_reserved, 0)
        ),
        'stateAfter', jsonb_build_object(
          'quantity', coalesce(v_item.quantity, 0),
          'reservedQuantity', v_before_reserved + v_take,
          'available', greatest(coalesce(v_item.quantity, 0) - v_before_reserved - v_take, 0)
        )
      )
    );

    v_remaining := v_remaining - v_take;
  end loop;

  if v_remaining > 0 then
    raise exception 'STOCK_NEGATIVE' using errcode = 'P0001';
  end if;

  update public.order_items
  set metadata = coalesce(metadata, '{}'::jsonb)
    || jsonb_build_object('inventoryState', 'reserved', 'inventoryReservedAt', now())
  where id = new.id;

  return new;
end;
$$;

create or replace function public.settle_order_wine_inventory()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_allocation record;
  v_item public.inventory_items%rowtype;
  v_target_state text;
  v_before_quantity integer;
  v_before_reserved integer;
begin
  if old.status = new.status or new.status not in ('paid', 'cancelled', 'refunded', 'fulfilled') then
    return new;
  end if;

  if new.status = 'fulfilled' and not exists (
    select 1 from public.order_items
    where order_id = new.id
      and item_type = 'wine'
      and metadata ->> 'inventoryState' = 'reserved'
  ) then
    update public.order_items
    set metadata = coalesce(metadata, '{}'::jsonb)
      || jsonb_build_object('inventoryState', 'fulfilled', 'inventoryFulfilledAt', now())
    where order_id = new.id
      and item_type = 'wine'
      and metadata ->> 'inventoryState' = 'sold';
    return new;
  end if;

  if new.status in ('paid', 'fulfilled') then
    v_target_state := case when new.status = 'fulfilled' then 'fulfilled' else 'sold' end;

    for v_allocation in
      select im.inventory_item_id, sum(im.quantity)::integer as quantity
      from public.inventory_movements im
      join public.order_items oi on oi.id::text = im.metadata ->> 'orderItemId'
      where oi.order_id = new.id
        and oi.item_type = 'wine'
        and oi.metadata ->> 'inventoryState' = 'reserved'
        and im.reference_type = 'order'
        and im.reference_id = new.id
        and im.movement_type = 'reservation'
      group by im.inventory_item_id
    loop
      select * into v_item
      from public.inventory_items
      where id = v_allocation.inventory_item_id
      for update;

      if v_item.id is null then
        raise exception 'INVENTORY_ITEM_NOT_FOUND' using errcode = 'P0001';
      end if;

      v_before_quantity := coalesce(v_item.quantity, 0);
      v_before_reserved := coalesce(v_item.reserved_quantity, 0);

      update public.inventory_items
      set quantity = quantity - v_allocation.quantity,
          reserved_quantity = reserved_quantity - v_allocation.quantity,
          updated_at = now()
      where id = v_allocation.inventory_item_id
        and quantity >= v_allocation.quantity
        and reserved_quantity >= v_allocation.quantity;

      if not found then
        raise exception 'STOCK_NEGATIVE' using errcode = 'P0001';
      end if;

      insert into public.inventory_movements (
        inventory_item_id, movement_type, quantity, reference_type, reference_id,
        notes, reason, from_location_id, created_by, metadata
      ) values (
        v_allocation.inventory_item_id,
        'sale',
        -v_allocation.quantity,
        'order',
        new.id,
        case when new.status = 'paid' then 'Salida automática por compra pagada' else 'Salida automática por orden completada' end,
        case when new.status = 'paid' then 'Compra pagada' else 'Cumplimiento de venta' end,
        v_item.location_id,
        auth.uid(),
        jsonb_build_object(
          'origin', 'orders',
          'module', 'Ordenes',
          'actorId', auth.uid(),
          'orderId', new.id,
          'orderStatus', new.status,
          'stateBefore', jsonb_build_object(
            'quantity', v_before_quantity,
            'reservedQuantity', v_before_reserved,
            'available', greatest(v_before_quantity - v_before_reserved, 0)
          ),
          'stateAfter', jsonb_build_object(
            'quantity', v_before_quantity - v_allocation.quantity,
            'reservedQuantity', v_before_reserved - v_allocation.quantity,
            'available', greatest(v_before_quantity - v_before_reserved, 0)
          )
        )
      );
    end loop;

    update public.order_items
    set metadata = coalesce(metadata, '{}'::jsonb)
      || jsonb_build_object('inventoryState', v_target_state, 'inventorySettledAt', now())
    where order_id = new.id
      and item_type = 'wine'
      and metadata ->> 'inventoryState' = 'reserved';

    return new;
  end if;

  if new.status in ('cancelled', 'refunded') then
    for v_allocation in
      select im.inventory_item_id, sum(im.quantity)::integer as quantity
      from public.inventory_movements im
      join public.order_items oi on oi.id::text = im.metadata ->> 'orderItemId'
      where oi.order_id = new.id
        and oi.item_type = 'wine'
        and oi.metadata ->> 'inventoryState' = 'reserved'
        and im.reference_type = 'order'
        and im.reference_id = new.id
        and im.movement_type = 'reservation'
      group by im.inventory_item_id
    loop
      select * into v_item
      from public.inventory_items
      where id = v_allocation.inventory_item_id
      for update;

      if v_item.id is null then
        raise exception 'INVENTORY_ITEM_NOT_FOUND' using errcode = 'P0001';
      end if;

      v_before_quantity := coalesce(v_item.quantity, 0);
      v_before_reserved := coalesce(v_item.reserved_quantity, 0);

      update public.inventory_items
      set reserved_quantity = reserved_quantity - v_allocation.quantity,
          updated_at = now()
      where id = v_allocation.inventory_item_id
        and reserved_quantity >= v_allocation.quantity;

      if not found then
        raise exception 'STOCK_NEGATIVE' using errcode = 'P0001';
      end if;

      insert into public.inventory_movements (
        inventory_item_id, movement_type, quantity, reference_type, reference_id,
        notes, reason, from_location_id, created_by, metadata
      ) values (
        v_allocation.inventory_item_id,
        'release',
        -v_allocation.quantity,
        'order',
        new.id,
        'Liberación automática por orden cancelada',
        new.status::text,
        v_item.location_id,
        auth.uid(),
        jsonb_build_object(
          'origin', 'orders',
          'module', 'Ordenes',
          'actorId', auth.uid(),
          'orderId', new.id,
          'orderStatus', new.status,
          'stateBefore', jsonb_build_object(
            'quantity', v_before_quantity,
            'reservedQuantity', v_before_reserved,
            'available', greatest(v_before_quantity - v_before_reserved, 0)
          ),
          'stateAfter', jsonb_build_object(
            'quantity', v_before_quantity,
            'reservedQuantity', v_before_reserved - v_allocation.quantity,
            'available', greatest(v_before_quantity - v_before_reserved + v_allocation.quantity, 0)
          )
        )
      );
    end loop;

    update public.order_items
    set metadata = coalesce(metadata, '{}'::jsonb)
      || jsonb_build_object('inventoryState', 'released', 'inventoryReleasedAt', now())
    where order_id = new.id
      and item_type = 'wine'
      and metadata ->> 'inventoryState' = 'reserved';

    for v_allocation in
      select im.inventory_item_id, sum(im.quantity)::integer as quantity
      from public.inventory_movements im
      join public.order_items oi on oi.id::text = im.metadata ->> 'orderItemId'
      where oi.order_id = new.id
        and oi.item_type = 'wine'
        and oi.metadata ->> 'inventoryState' in ('sold', 'fulfilled')
        and im.reference_type = 'order'
        and im.reference_id = new.id
        and im.movement_type = 'reservation'
      group by im.inventory_item_id
    loop
      select * into v_item
      from public.inventory_items
      where id = v_allocation.inventory_item_id
      for update;

      if v_item.id is null then
        raise exception 'INVENTORY_ITEM_NOT_FOUND' using errcode = 'P0001';
      end if;

      v_before_quantity := coalesce(v_item.quantity, 0);
      v_before_reserved := coalesce(v_item.reserved_quantity, 0);

      update public.inventory_items
      set quantity = quantity + v_allocation.quantity,
          updated_at = now()
      where id = v_allocation.inventory_item_id;

      insert into public.inventory_movements (
        inventory_item_id, movement_type, quantity, reference_type, reference_id,
        notes, reason, from_location_id, created_by, metadata
      ) values (
        v_allocation.inventory_item_id,
        'return',
        v_allocation.quantity,
        'order',
        new.id,
        'Devolución automática por orden cancelada o reembolsada',
        new.status::text,
        v_item.location_id,
        auth.uid(),
        jsonb_build_object(
          'origin', 'orders',
          'module', 'Ordenes',
          'actorId', auth.uid(),
          'orderId', new.id,
          'orderStatus', new.status,
          'stateBefore', jsonb_build_object(
            'quantity', v_before_quantity,
            'reservedQuantity', v_before_reserved,
            'available', greatest(v_before_quantity - v_before_reserved, 0)
          ),
          'stateAfter', jsonb_build_object(
            'quantity', v_before_quantity + v_allocation.quantity,
            'reservedQuantity', v_before_reserved,
            'available', greatest(v_before_quantity + v_allocation.quantity - v_before_reserved, 0)
          )
        )
      );
    end loop;

    update public.order_items
    set metadata = coalesce(metadata, '{}'::jsonb)
      || jsonb_build_object('inventoryState', 'returned', 'inventoryReturnedAt', now())
    where order_id = new.id
      and item_type = 'wine'
      and metadata ->> 'inventoryState' in ('sold', 'fulfilled');
  end if;

  return new;
end;
$$;

revoke all on function public.reserve_order_wine_inventory() from public, anon;
revoke all on function public.settle_order_wine_inventory() from public, anon;
grant execute on function public.reserve_order_wine_inventory() to authenticated;
grant execute on function public.settle_order_wine_inventory() to authenticated;

insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, after_data)
values (
  null,
  'migration_072_order_inventory_purchase_lifecycle',
  'system',
  gen_random_uuid(),
  jsonb_build_object(
    'status', 'prepared',
    'scope', 'order_wine_inventory_paid_sale_release_return',
    'note', 'Paid wine orders reduce on-hand stock; cancelled or refunded orders release reserved stock or return sold stock.'
  )
);

commit;
