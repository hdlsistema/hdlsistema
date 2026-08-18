-- Keep logistics transitions aligned with the shipping states introduced in 039.
-- Delivery is an explicit audited action and may close any active shipment even
-- when intermediate operational states were not recorded manually.

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

  select *
  into v_shipment
  from public.shipments
  where id = p_shipment_id
  for update;

  if v_shipment.id is null then
    raise exception 'SHIPMENT_NOT_FOUND' using errcode = 'P0001';
  end if;

  if v_shipment.status_text = p_status then
    return p_shipment_id;
  end if;

  v_allowed :=
    (
      p_status = 'delivered'
      and v_shipment.status_text in (
        'pending',
        'pending_preparation',
        'preparing',
        'ready',
        'awaiting_tracking',
        'tracking_assigned',
        'shipped',
        'in_transit',
        'failed'
      )
    )
    or (
      p_status = 'cancelled'
      and v_shipment.status_text in (
        'pending',
        'pending_preparation',
        'preparing',
        'ready',
        'awaiting_tracking',
        'tracking_assigned',
        'shipped',
        'in_transit',
        'failed'
      )
    )
    or (v_shipment.status_text in ('pending', 'pending_preparation') and p_status = 'preparing')
    or (v_shipment.status_text = 'preparing' and p_status in ('ready', 'awaiting_tracking'))
    or (v_shipment.status_text = 'ready' and p_status in ('awaiting_tracking', 'tracking_assigned', 'shipped'))
    or (v_shipment.status_text = 'awaiting_tracking' and p_status in ('tracking_assigned', 'shipped'))
    or (v_shipment.status_text = 'tracking_assigned' and p_status in ('shipped', 'in_transit', 'failed', 'returned'))
    or (v_shipment.status_text = 'shipped' and p_status in ('in_transit', 'failed', 'returned'))
    or (v_shipment.status_text = 'in_transit' and p_status in ('failed', 'returned'))
    or (v_shipment.status_text = 'failed' and p_status in ('in_transit', 'returned'));

  if not v_allowed then
    raise exception 'INVALID_STATUS_TRANSITION' using errcode = 'P0001';
  end if;

  update public.shipments
  set status_text = p_status,
      shipped_at = case
        when p_status in ('shipped', 'in_transit', 'delivered') then coalesce(shipped_at, now())
        else shipped_at
      end,
      delivered_at = case when p_status = 'delivered' then coalesce(delivered_at, now()) else delivered_at end,
      cancelled_at = case when p_status = 'cancelled' then coalesce(cancelled_at, now()) else cancelled_at end,
      cancellation_reason = case when p_status = 'cancelled' then coalesce(p_notes, cancellation_reason) else cancellation_reason end,
      updated_by = v_actor_id,
      updated_at = now()
  where id = p_shipment_id;

  insert into public.shipment_events (shipment_id, event_type, status_text, notes, created_by)
  values (p_shipment_id, 'status', p_status, p_notes, v_actor_id);

  perform public.write_transaction_audit(
    v_actor_id,
    'shipment_status_updated',
    'shipments',
    p_shipment_id,
    jsonb_build_object('status', v_shipment.status_text),
    jsonb_build_object('status', p_status)
  );

  return p_shipment_id;
end;
$$;

revoke all on function public.update_shipment_status(uuid, text, text) from public, anon;
grant execute on function public.update_shipment_status(uuid, text, text) to authenticated;
