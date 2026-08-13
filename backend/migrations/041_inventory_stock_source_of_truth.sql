begin;

-- El inventario operativo pasa a ser la fuente de verdad del stock que consume la app.
insert into public.inventory_locations (name, code, type, address, active)
values ('Inventario principal', 'MAIN', 'warehouse', 'Hacienda de Letras', true)
on conflict (name) do update
set active = true,
    code = coalesce(public.inventory_locations.code, excluded.code),
    updated_at = now();

insert into public.inventory_items (
  wine_id,
  location_id,
  quantity,
  reserved_quantity,
  reorder_point,
  sku,
  product_name,
  unit_of_measure,
  minimum_quantity,
  status,
  metadata
)
select
  w.id,
  l.id,
  greatest(w.stock_quantity, 0),
  0,
  0,
  w.sku,
  w.name,
  'bottle',
  0,
  'active',
  jsonb_build_object('migratedFromCommercialStock', true)
from public.wines w
cross join lateral (
  select id from public.inventory_locations where name = 'Inventario principal' limit 1
) l
where not exists (
  select 1 from public.inventory_items ii where ii.wine_id = w.id
)
on conflict (wine_id, location_id) do nothing;

create or replace function public.sync_wine_commercial_stock(p_wine_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_available integer;
begin
  select coalesce(sum(greatest(quantity - reserved_quantity, 0)), 0)::integer
  into v_available
  from public.inventory_items
  where wine_id = p_wine_id
    and status = 'active';

  update public.wines
  set stock_quantity = v_available,
      updated_at = now()
  where id = p_wine_id
    and stock_quantity is distinct from v_available;
end;
$$;

create or replace function public.sync_wine_stock_inventory_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.sync_wine_commercial_stock(old.wine_id);
    return old;
  end if;

  perform public.sync_wine_commercial_stock(new.wine_id);
  if tg_op = 'UPDATE' and old.wine_id is distinct from new.wine_id then
    perform public.sync_wine_commercial_stock(old.wine_id);
  end if;
  return new;
end;
$$;

drop trigger if exists sync_wine_stock_after_inventory_change on public.inventory_items;
create trigger sync_wine_stock_after_inventory_change
after insert or update of quantity, reserved_quantity, status, wine_id or delete
on public.inventory_items
for each row execute function public.sync_wine_stock_inventory_trigger();

do $$
declare
  v_wine_id uuid;
begin
  for v_wine_id in select distinct wine_id from public.inventory_items loop
    perform public.sync_wine_commercial_stock(v_wine_id);
  end loop;
end;
$$;

create or replace function public.reserve_order_wine_inventory()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_remaining integer;
  v_take integer;
  v_item public.inventory_items%rowtype;
begin
  if new.item_type <> 'wine' or not exists (select 1 from public.wines where id = new.item_id) then
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

drop trigger if exists reserve_inventory_after_order_item on public.order_items;
create trigger reserve_inventory_after_order_item
after insert on public.order_items
for each row execute function public.reserve_order_wine_inventory();

create or replace function public.settle_order_wine_inventory()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_allocation record;
  v_target_state text;
begin
  if old.status = new.status or new.status not in ('cancelled', 'refunded', 'fulfilled') then
    return new;
  end if;

  if not exists (
    select 1 from public.order_items
    where order_id = new.id
      and item_type = 'wine'
      and metadata ->> 'inventoryState' = 'reserved'
  ) then
    return new;
  end if;

  v_target_state := case when new.status = 'fulfilled' then 'fulfilled' else 'released' end;

  for v_allocation in
    select im.inventory_item_id, sum(im.quantity)::integer as quantity
    from public.inventory_movements im
    where im.reference_type = 'order'
      and im.reference_id = new.id
      and im.movement_type = 'reservation'
    group by im.inventory_item_id
  loop
    if new.status = 'fulfilled' then
      update public.inventory_items
      set quantity = quantity - v_allocation.quantity,
          reserved_quantity = reserved_quantity - v_allocation.quantity,
          updated_at = now()
      where id = v_allocation.inventory_item_id
        and quantity >= v_allocation.quantity
        and reserved_quantity >= v_allocation.quantity;

      insert into public.inventory_movements (
        inventory_item_id, movement_type, quantity, reference_type, reference_id,
        notes, reason, created_by, metadata
      ) values (
        v_allocation.inventory_item_id, 'sale', -v_allocation.quantity, 'order', new.id,
        'Salida automática por orden completada', 'Cumplimiento de venta', auth.uid(),
        jsonb_build_object('orderStatus', new.status)
      );
    else
      update public.inventory_items
      set reserved_quantity = reserved_quantity - v_allocation.quantity,
          updated_at = now()
      where id = v_allocation.inventory_item_id
        and reserved_quantity >= v_allocation.quantity;

      insert into public.inventory_movements (
        inventory_item_id, movement_type, quantity, reference_type, reference_id,
        notes, reason, created_by, metadata
      ) values (
        v_allocation.inventory_item_id, 'release', -v_allocation.quantity, 'order', new.id,
        'Liberación automática por orden cerrada', new.status::text, auth.uid(),
        jsonb_build_object('orderStatus', new.status)
      );
    end if;
  end loop;

  update public.order_items
  set metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('inventoryState', v_target_state)
  where order_id = new.id
    and item_type = 'wine'
    and metadata ->> 'inventoryState' = 'reserved';

  return new;
end;
$$;

drop trigger if exists settle_inventory_after_order_status on public.orders;
create trigger settle_inventory_after_order_status
after update of status on public.orders
for each row execute function public.settle_order_wine_inventory();

revoke all on function public.sync_wine_commercial_stock(uuid) from public, anon;
revoke all on function public.sync_wine_stock_inventory_trigger() from public, anon;
revoke all on function public.reserve_order_wine_inventory() from public, anon;
revoke all on function public.settle_order_wine_inventory() from public, anon;
grant execute on function public.sync_wine_commercial_stock(uuid) to authenticated, service_role;

commit;
