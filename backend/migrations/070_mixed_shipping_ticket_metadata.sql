begin;

create or replace function public.create_customer_shipping_order_from_cart(
  p_idempotency_key text,
  p_shipping_address jsonb,
  p_discount_code text default null,
  p_save_address boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_customer_id uuid;
  v_order_id uuid;
  v_saved_address_id uuid;
  v_has_event_ticket boolean := false;
  v_address jsonb := coalesce(p_shipping_address, '{}'::jsonb);
  v_label text := btrim(coalesce(v_address ->> 'label', ''));
  v_recipient_name text := btrim(coalesce(v_address ->> 'recipientName', ''));
  v_phone text := btrim(coalesce(v_address ->> 'phone', ''));
  v_email text := lower(btrim(coalesce(v_address ->> 'email', '')));
  v_line1 text := btrim(coalesce(v_address ->> 'line1', ''));
  v_line2 text := btrim(coalesce(v_address ->> 'line2', ''));
  v_neighborhood text := btrim(coalesce(v_address ->> 'neighborhood', ''));
  v_city text := btrim(coalesce(v_address ->> 'city', ''));
  v_state text := btrim(coalesce(v_address ->> 'state', ''));
  v_postal_code text := btrim(coalesce(v_address ->> 'postalCode', ''));
  v_country text := upper(btrim(coalesce(v_address ->> 'country', '')));
  v_references text := btrim(coalesce(v_address ->> 'references', ''));
  v_is_default boolean := case
    when lower(coalesce(v_address ->> 'isDefault', 'false')) = 'true' then true
    else false
  end;
begin
  if v_user_id is null then
    raise exception 'FORBIDDEN' using errcode = 'P0001';
  end if;

  if jsonb_typeof(v_address) <> 'object'
    or length(v_label) < 1
    or length(v_recipient_name) < 2
    or length(v_phone) < 7
    or position('@' in v_email) <= 1
    or length(v_line1) < 4
    or length(v_line2) < 1
    or length(v_neighborhood) < 1
    or length(v_city) < 2
    or length(v_state) < 2
    or length(v_postal_code) < 4
    or length(v_country) < 2
    or length(v_references) < 1 then
    raise exception 'SHIPPING_ADDRESS_INCOMPLETE' using errcode = 'P0001';
  end if;

  select id
  into v_customer_id
  from public.customers
  where user_id = v_user_id;

  if v_customer_id is null then
    raise exception 'CUSTOMER_PROFILE_REQUIRED' using errcode = 'P0001';
  end if;

  v_order_id := public.create_customer_order_from_cart(p_idempotency_key, p_discount_code);

  select exists (
    select 1
    from public.order_items oi
    where oi.order_id = v_order_id
      and oi.item_type = 'event_ticket'
  )
  into v_has_event_ticket;

  insert into public.order_shipping_addresses (
    order_id,
    customer_id,
    user_id,
    label,
    recipient_name,
    phone,
    email,
    line1,
    line2,
    neighborhood,
    city,
    state,
    postal_code,
    country,
    "references"
  )
  values (
    v_order_id,
    v_customer_id,
    v_user_id,
    v_label,
    v_recipient_name,
    v_phone,
    v_email,
    v_line1,
    v_line2,
    v_neighborhood,
    v_city,
    v_state,
    v_postal_code,
    v_country,
    v_references
  )
  on conflict (order_id) do update
  set label = excluded.label,
      recipient_name = excluded.recipient_name,
      phone = excluded.phone,
      email = excluded.email,
      line1 = excluded.line1,
      line2 = excluded.line2,
      neighborhood = excluded.neighborhood,
      city = excluded.city,
      state = excluded.state,
      postal_code = excluded.postal_code,
      country = excluded.country,
      "references" = excluded."references";

  if coalesce(p_save_address, false) then
    select id
    into v_saved_address_id
    from public.customer_addresses
    where customer_id = v_customer_id
      and user_id = v_user_id
      and deleted_at is null
      and label = v_label
      and recipient_name = v_recipient_name
      and phone = v_phone
      and email = v_email
      and line1 = v_line1
      and line2 = v_line2
      and neighborhood = v_neighborhood
      and city = v_city
      and state = v_state
      and postal_code = v_postal_code
      and country = v_country
      and "references" = v_references
    limit 1;

    if v_is_default then
      update public.customer_addresses
      set is_default = false,
          updated_at = now()
      where customer_id = v_customer_id
        and user_id = v_user_id
        and deleted_at is null
        and (v_saved_address_id is null or id <> v_saved_address_id);
    end if;

    if v_saved_address_id is null then
      insert into public.customer_addresses (
        customer_id,
        user_id,
        label,
        recipient_name,
        phone,
        email,
        line1,
        line2,
        neighborhood,
        city,
        state,
        postal_code,
        country,
        "references",
        is_default
      )
      values (
        v_customer_id,
        v_user_id,
        v_label,
        v_recipient_name,
        v_phone,
        v_email,
        v_line1,
        v_line2,
        v_neighborhood,
        v_city,
        v_state,
        v_postal_code,
        v_country,
        v_references,
        v_is_default
      );
    elsif v_is_default then
      update public.customer_addresses
      set is_default = true,
          updated_at = now()
      where id = v_saved_address_id;
    end if;
  end if;

  update public.orders
  set requires_shipping = true,
      shipping_status = 'pending_preparation',
      metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
        'checkoutMode', 'mobile',
        'paymentAvailable', true,
        'paymentStatus', 'pending_payment',
        'fulfillmentMode', case when v_has_event_ticket then 'mixed' else 'shipping' end,
        'requiresTicketAccess', v_has_event_ticket,
        'shippingPolicy', 'customer_address',
        'discountCode', nullif(btrim(coalesce(p_discount_code, '')), '')
      ),
      updated_at = now()
  where id = v_order_id
    and customer_id = v_customer_id
    and user_id = v_user_id;

  return v_order_id;
end;
$$;

revoke all on function public.create_customer_shipping_order_from_cart(text, jsonb, text, boolean) from public;
grant execute on function public.create_customer_shipping_order_from_cart(text, jsonb, text, boolean) to authenticated;
grant execute on function public.create_customer_shipping_order_from_cart(text, jsonb, text, boolean) to service_role;

commit;
