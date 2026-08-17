begin;

-- Las ventas de boletos necesitan separar cupo apartado por una orden pendiente
-- del cupo ya pagado. La asignacion se hace en la misma transaccion que crea la orden.
alter table public.events
  add column if not exists reserved_count integer not null default 0;

alter table public.event_ticket_types
  add column if not exists reserved_count integer not null default 0;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'events_reserved_count_nonnegative') then
    alter table public.events
      add constraint events_reserved_count_nonnegative check (reserved_count >= 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'events_committed_capacity_valid') then
    alter table public.events
      add constraint events_committed_capacity_valid check (sold_count + reserved_count <= capacity);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'event_ticket_types_reserved_count_nonnegative') then
    alter table public.event_ticket_types
      add constraint event_ticket_types_reserved_count_nonnegative check (reserved_count >= 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'event_ticket_types_committed_capacity_valid') then
    alter table public.event_ticket_types
      add constraint event_ticket_types_committed_capacity_valid check (sold_count + reserved_count <= capacity);
  end if;
end $$;

create table if not exists public.event_ticket_allocations (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  order_item_id uuid not null unique references public.order_items(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete restrict,
  event_ticket_type_id uuid not null references public.event_ticket_types(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  allocation_status text not null default 'reserved'
    check (allocation_status in ('reserved', 'sold', 'released')),
  release_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_event_ticket_allocations_order
  on public.event_ticket_allocations(order_id, allocation_status);
create index if not exists idx_event_ticket_allocations_ticket
  on public.event_ticket_allocations(event_ticket_type_id, allocation_status);

alter table public.event_ticket_allocations enable row level security;

create or replace function public.reserve_order_event_ticket_inventory()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ticket public.event_ticket_types%rowtype;
  v_event public.events%rowtype;
  v_order_status text;
  v_allocation_status text;
begin
  if new.item_type <> 'event_ticket' then
    return new;
  end if;

  select * into v_ticket
  from public.event_ticket_types
  where id = new.item_id
  for update;

  if v_ticket.id is null
    or not v_ticket.active
    or not public.is_content_live(
      v_ticket.status::text,
      v_ticket.visible_in_app,
      v_ticket.publish_at,
      v_ticket.unpublish_at,
      v_ticket.archived_at,
      v_ticket.deleted_at
    )
    or (v_ticket.sales_start_at is not null and v_ticket.sales_start_at > now())
    or (v_ticket.sales_end_at is not null and v_ticket.sales_end_at < now()) then
    raise exception 'ITEM_NOT_AVAILABLE' using errcode = 'P0001';
  end if;

  select * into v_event
  from public.events
  where id = v_ticket.event_id
  for update;

  if v_event.id is null
    or not v_event.sales_enabled
    or not public.is_content_live(
      v_event.status::text,
      v_event.visible_in_app,
      v_event.publish_at,
      v_event.unpublish_at,
      v_event.archived_at,
      v_event.deleted_at
    )
    or v_event.end_at <= now() then
    raise exception 'ITEM_NOT_AVAILABLE' using errcode = 'P0001';
  end if;

  if v_ticket.sold_count + v_ticket.reserved_count + new.quantity > v_ticket.capacity
    or v_event.sold_count + v_event.reserved_count + new.quantity > v_event.capacity then
    raise exception 'STOCK_UNAVAILABLE' using errcode = 'P0001';
  end if;

  select status into v_order_status from public.orders where id = new.order_id;
  v_allocation_status := case when v_order_status in ('paid', 'fulfilled') then 'sold' else 'reserved' end;

  if v_allocation_status = 'sold' then
    update public.event_ticket_types
    set sold_count = sold_count + new.quantity,
        updated_at = now()
    where id = v_ticket.id;
    update public.events
    set sold_count = sold_count + new.quantity,
        updated_at = now()
    where id = v_event.id;
  else
    update public.event_ticket_types
    set reserved_count = reserved_count + new.quantity,
        updated_at = now()
    where id = v_ticket.id;
    update public.events
    set reserved_count = reserved_count + new.quantity,
        updated_at = now()
    where id = v_event.id;
  end if;

  insert into public.event_ticket_allocations (
    order_id,
    order_item_id,
    event_id,
    event_ticket_type_id,
    quantity,
    allocation_status
  ) values (
    new.order_id,
    new.id,
    v_event.id,
    v_ticket.id,
    new.quantity,
    v_allocation_status
  );

  update public.order_items
  set metadata = coalesce(metadata, '{}'::jsonb)
    || jsonb_build_object('ticketInventoryState', v_allocation_status)
  where id = new.id;

  return new;
end;
$$;

drop trigger if exists reserve_event_ticket_after_order_item on public.order_items;
create trigger reserve_event_ticket_after_order_item
after insert on public.order_items
for each row execute function public.reserve_order_event_ticket_inventory();

create or replace function public.settle_order_event_ticket_inventory()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_allocation public.event_ticket_allocations%rowtype;
begin
  if old.status = new.status
    or new.status not in ('paid', 'fulfilled', 'cancelled', 'refunded') then
    return new;
  end if;

  for v_allocation in
    select *
    from public.event_ticket_allocations
    where order_id = new.id
      and allocation_status in ('reserved', 'sold')
    order by event_ticket_type_id
    for update
  loop
    perform 1 from public.event_ticket_types where id = v_allocation.event_ticket_type_id for update;
    perform 1 from public.events where id = v_allocation.event_id for update;

    if new.status in ('paid', 'fulfilled') and v_allocation.allocation_status = 'reserved' then
      update public.event_ticket_types
      set reserved_count = greatest(reserved_count - v_allocation.quantity, 0),
          sold_count = sold_count + v_allocation.quantity,
          updated_at = now()
      where id = v_allocation.event_ticket_type_id;
      update public.events
      set reserved_count = greatest(reserved_count - v_allocation.quantity, 0),
          sold_count = sold_count + v_allocation.quantity,
          updated_at = now()
      where id = v_allocation.event_id;
      update public.event_ticket_allocations
      set allocation_status = 'sold',
          updated_at = now()
      where id = v_allocation.id;
    elsif new.status in ('cancelled', 'refunded') then
      if v_allocation.allocation_status = 'reserved' then
        update public.event_ticket_types
        set reserved_count = greatest(reserved_count - v_allocation.quantity, 0),
            updated_at = now()
        where id = v_allocation.event_ticket_type_id;
        update public.events
        set reserved_count = greatest(reserved_count - v_allocation.quantity, 0),
            updated_at = now()
        where id = v_allocation.event_id;
      else
        update public.event_ticket_types
        set sold_count = greatest(sold_count - v_allocation.quantity, 0),
            updated_at = now()
        where id = v_allocation.event_ticket_type_id;
        update public.events
        set sold_count = greatest(sold_count - v_allocation.quantity, 0),
            updated_at = now()
        where id = v_allocation.event_id;
      end if;
      update public.event_ticket_allocations
      set allocation_status = 'released',
          release_reason = new.status,
          updated_at = now()
      where id = v_allocation.id;
    end if;
  end loop;

  if new.status in ('paid', 'fulfilled', 'cancelled', 'refunded') then
    update public.order_items oi
    set metadata = coalesce(oi.metadata, '{}'::jsonb)
      || jsonb_build_object(
        'ticketInventoryState',
        case when new.status in ('paid', 'fulfilled') then 'sold' else 'released' end
      )
    where oi.order_id = new.id
      and oi.item_type = 'event_ticket';
  end if;

  return new;
end;
$$;

drop trigger if exists settle_event_ticket_after_order_status on public.orders;
create trigger settle_event_ticket_after_order_status
after update of status on public.orders
for each row execute function public.settle_order_event_ticket_inventory();

create or replace function public.release_deleted_order_event_ticket_inventory()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_allocation public.event_ticket_allocations%rowtype;
begin
  if old.item_type <> 'event_ticket' then
    return old;
  end if;

  select * into v_allocation
  from public.event_ticket_allocations
  where order_item_id = old.id
  for update;

  if v_allocation.id is null or v_allocation.allocation_status = 'released' then
    return old;
  end if;

  perform 1 from public.event_ticket_types where id = v_allocation.event_ticket_type_id for update;
  perform 1 from public.events where id = v_allocation.event_id for update;

  if v_allocation.allocation_status = 'reserved' then
    update public.event_ticket_types
    set reserved_count = greatest(reserved_count - v_allocation.quantity, 0), updated_at = now()
    where id = v_allocation.event_ticket_type_id;
    update public.events
    set reserved_count = greatest(reserved_count - v_allocation.quantity, 0), updated_at = now()
    where id = v_allocation.event_id;
  else
    update public.event_ticket_types
    set sold_count = greatest(sold_count - v_allocation.quantity, 0), updated_at = now()
    where id = v_allocation.event_ticket_type_id;
    update public.events
    set sold_count = greatest(sold_count - v_allocation.quantity, 0), updated_at = now()
    where id = v_allocation.event_id;
  end if;

  return old;
end;
$$;

drop trigger if exists release_event_ticket_before_order_item_delete on public.order_items;
create trigger release_event_ticket_before_order_item_delete
before delete on public.order_items
for each row execute function public.release_deleted_order_event_ticket_inventory();

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
    if v_wine.id is null
      or not public.is_content_live(v_wine.status::text, v_wine.visible_in_app, v_wine.publish_at, v_wine.unpublish_at, v_wine.archived_at, v_wine.deleted_at) then
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
    if v_ticket.id is null
      or not v_ticket.active
      or not public.is_content_live(v_ticket.status::text, v_ticket.visible_in_app, v_ticket.publish_at, v_ticket.unpublish_at, v_ticket.archived_at, v_ticket.deleted_at) then
      raise exception 'ITEM_NOT_AVAILABLE' using errcode = 'P0001';
    end if;

    select * into v_event from public.events where id = v_ticket.event_id;
    if v_event.id is null
      or not v_event.sales_enabled
      or not public.is_content_live(v_event.status::text, v_event.visible_in_app, v_event.publish_at, v_event.unpublish_at, v_event.archived_at, v_event.deleted_at)
      or v_event.end_at <= now() then
      raise exception 'ITEM_NOT_AVAILABLE' using errcode = 'P0001';
    end if;
    if (v_ticket.sales_start_at is not null and v_ticket.sales_start_at > now())
      or (v_ticket.sales_end_at is not null and v_ticket.sales_end_at < now()) then
      raise exception 'ITEM_NOT_AVAILABLE' using errcode = 'P0001';
    end if;

    v_available := greatest(least(
      v_ticket.capacity - v_ticket.sold_count - v_ticket.reserved_count,
      v_event.capacity - v_event.sold_count - v_event.reserved_count
    ), 0);
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
        'eventStartsAt', v_event.start_at,
        'eventEndsAt', v_event.end_at
      )
    );
  end if;

  if p_item_type = 'experience' then
    raise exception 'USE_RESERVATIONS_FLOW' using errcode = 'P0001';
  end if;

  raise exception 'ITEM_TYPE_NOT_ALLOWED' using errcode = 'P0001';
end;
$$;

revoke all on function public.reserve_order_event_ticket_inventory() from public, anon;
revoke all on function public.settle_order_event_ticket_inventory() from public, anon;
revoke all on function public.release_deleted_order_event_ticket_inventory() from public, anon;
revoke all on function public.resolve_customer_cart_item(text, uuid, integer) from public, anon;
grant execute on function public.resolve_customer_cart_item(text, uuid, integer) to authenticated;

commit;
