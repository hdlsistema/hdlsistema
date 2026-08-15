begin;

-- Los vinos con control de existencias desactivado pueden venderse sin reservar
-- inventario operativo. Esta función no modifica cantidades ni contenido existente.
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

    update public.inventory_items
    set reserved_quantity = reserved_quantity + v_take,
        updated_at = now()
    where id = v_item.id;

    insert into public.inventory_movements (
      inventory_item_id, movement_type, quantity, reference_type, reference_id,
      notes, reason, from_location_id, created_by, metadata
    ) values (
      v_item.id, 'reservation', v_take, 'order', new.order_id,
      'Reserva automática por orden', 'Orden de venta', v_item.location_id, auth.uid(),
      jsonb_build_object('orderItemId', new.id)
    );
    v_remaining := v_remaining - v_take;
  end loop;

  if v_remaining > 0 then
    raise exception 'STOCK_NEGATIVE' using errcode = 'P0001';
  end if;

  update public.order_items
  set metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('inventoryState', 'reserved')
  where id = new.id;

  return new;
end;
$$;

revoke all on function public.reserve_order_wine_inventory() from public, anon;

commit;

