begin;

do $$
begin
  if exists (
    select 1
    from pg_trigger
    where tgrelid = 'public.experiences'::regclass
      and tgname = 'set_experiences_editorial_metadata'
  ) then
    execute 'alter table public.experiences disable trigger set_experiences_editorial_metadata';
  end if;

  if exists (
    select 1
    from pg_trigger
    where tgrelid = 'public.experiences'::regclass
      and tgname = 'version_experiences_changes'
  ) then
    execute 'alter table public.experiences disable trigger version_experiences_changes';
  end if;

  if exists (
    select 1
    from pg_trigger
    where tgrelid = 'public.experiences'::regclass
      and tgname = 'audit_experiences_changes'
  ) then
    execute 'alter table public.experiences disable trigger audit_experiences_changes';
  end if;
end $$;

update public.experiences e
set created_by = null
where e.created_by is not null
  and not exists (select 1 from auth.users u where u.id = e.created_by);

update public.experiences e
set updated_by = null
where e.updated_by is not null
  and not exists (select 1 from auth.users u where u.id = e.updated_by);

update public.experiences e
set published_by = null
where e.published_by is not null
  and not exists (select 1 from auth.users u where u.id = e.published_by);

update public.experiences
set metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
  'romanticDinner', true,
  'romanticSign', jsonb_build_object(
    'enabled', true,
    'label', 'Letrero luminoso',
    'price', 500,
    'currency', 'MXN',
    'options', jsonb_build_array(
      jsonb_build_object('code', 'proposal', 'label', 'Te quieres casar conmigo'),
      jsonb_build_object('code', 'girlfriend', 'label', 'Quieres ser mi novia')
    )
  )
)
where slug = 'cena-romantica-cava';

do $$
begin
  if exists (
    select 1
    from pg_trigger
    where tgrelid = 'public.experiences'::regclass
      and tgname = 'set_experiences_editorial_metadata'
  ) then
    execute 'alter table public.experiences enable trigger set_experiences_editorial_metadata';
  end if;

  if exists (
    select 1
    from pg_trigger
    where tgrelid = 'public.experiences'::regclass
      and tgname = 'version_experiences_changes'
  ) then
    execute 'alter table public.experiences enable trigger version_experiences_changes';
  end if;

  if exists (
    select 1
    from pg_trigger
    where tgrelid = 'public.experiences'::regclass
      and tgname = 'audit_experiences_changes'
  ) then
    execute 'alter table public.experiences enable trigger audit_experiences_changes';
  end if;
end $$;

create or replace function public.create_reservation_admin(
  p_customer_id uuid default null,
  p_customer_name text default null,
  p_customer_email text default null,
  p_customer_phone text default null,
  p_experience_slot_id uuid default null,
  p_people_count integer default 1,
  p_status public.reservation_status default 'pending',
  p_customer_notes text default null,
  p_internal_notes text default null,
  p_source text default 'Centro de control',
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slot public.experience_slots%rowtype;
  v_experience public.experiences%rowtype;
  v_customer_id uuid;
  v_reservation_id uuid;
  v_base_total numeric(12,2);
  v_total numeric(12,2);
  v_actor_id uuid;
  v_request_metadata jsonb := coalesce(p_metadata, '{}'::jsonb);
  v_romantic_sign_request jsonb := case
    when jsonb_typeof(coalesce(p_metadata, '{}'::jsonb) -> 'romanticSign') = 'object'
      then coalesce(p_metadata, '{}'::jsonb) -> 'romanticSign'
    else '{}'::jsonb
  end;
  v_romantic_sign_required boolean := false;
  v_romantic_sign_enabled boolean := false;
  v_romantic_sign_message text;
  v_romantic_sign_price numeric(12,2) := 500;
  v_addon_total numeric(12,2) := 0;
  v_price_text text;
begin
  v_actor_id := public.current_reservation_operator(array['super_admin','admin','operations']);

  if p_people_count < 1 then
    raise exception 'INVALID_PEOPLE_COUNT' using errcode = 'P0001';
  end if;

  if p_status not in ('pending', 'confirmed') then
    raise exception 'INVALID_INITIAL_STATUS' using errcode = 'P0001';
  end if;

  select * into v_slot
  from public.experience_slots
  where id = p_experience_slot_id
  for update;

  if v_slot.id is null then
    raise exception 'SLOT_NOT_FOUND' using errcode = 'P0001';
  end if;

  select * into v_experience from public.experiences where id = v_slot.experience_id;

  if p_status = 'confirmed' then
    if not v_slot.is_bookable or v_slot.operational_status <> 'open' or v_slot.status <> 'published' then
      raise exception 'SLOT_NOT_BOOKABLE' using errcode = 'P0001';
    end if;

    if v_slot.confirmed_count + p_people_count > v_slot.capacity then
      raise exception 'CAPACITY_EXCEEDED' using errcode = 'P0001';
    end if;
  end if;

  v_customer_id := public.ensure_admin_customer(
    p_customer_id,
    p_customer_name,
    p_customer_email,
    p_customer_phone,
    p_source
  );

  v_romantic_sign_required := lower(coalesce(v_romantic_sign_request ->> 'required', 'false')) in ('true','1','yes');
  v_romantic_sign_enabled := v_experience.slug = 'cena-romantica-cava'
    or lower(coalesce(v_experience.metadata ->> 'romanticDinner', 'false')) in ('true','1','yes')
    or lower(coalesce(v_experience.metadata -> 'romanticSign' ->> 'enabled', 'false')) in ('true','1','yes');
  v_price_text := v_experience.metadata #>> '{romanticSign,price}';

  if v_price_text ~ '^[0-9]+([.][0-9]{1,2})?$' then
    v_romantic_sign_price := v_price_text::numeric(12,2);
  end if;

  if v_romantic_sign_required then
    v_romantic_sign_message := nullif(trim(coalesce(v_romantic_sign_request ->> 'message', '')), '');
    if not v_romantic_sign_enabled then
      raise exception 'ROMANTIC_SIGN_NOT_AVAILABLE' using errcode = 'P0001';
    end if;
    if v_romantic_sign_message not in ('Te quieres casar conmigo', 'Quieres ser mi novia') then
      raise exception 'ROMANTIC_SIGN_MESSAGE_REQUIRED' using errcode = 'P0001';
    end if;
    v_addon_total := v_romantic_sign_price;
  end if;

  v_base_total := coalesce(v_slot.price_override, v_experience.base_price, 0) * p_people_count;
  v_total := v_base_total + v_addon_total;

  insert into public.reservations (
    reservation_number,
    customer_id,
    reservation_type,
    experience_id,
    experience_slot_id,
    people_count,
    subtotal,
    total,
    status,
    customer_notes,
    internal_notes,
    source,
    booking_channel,
    created_by_admin,
    updated_by_admin,
    confirmed_at,
    operational_status,
    metadata
  )
  values (
    'RES-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
    v_customer_id,
    'experience',
    v_slot.experience_id,
    v_slot.id,
    p_people_count,
    v_total,
    v_total,
    p_status,
    p_customer_notes,
    p_internal_notes,
    coalesce(nullif(p_source, ''), 'Centro de control'),
    coalesce(nullif(p_source, ''), 'Centro de control'),
    v_actor_id,
    v_actor_id,
    case when p_status = 'confirmed' then now() else null end,
    'active',
    v_request_metadata || jsonb_build_object(
      'addonsTotal', v_addon_total,
      'baseReservationTotal', v_base_total
    ) || case when v_romantic_sign_required then jsonb_build_object(
      'romanticSign', jsonb_build_object(
        'required', true,
        'label', 'Letrero luminoso',
        'message', v_romantic_sign_message,
        'price', v_romantic_sign_price,
        'currency', 'MXN'
      )
    ) else '{}'::jsonb end
  )
  returning id into v_reservation_id;

  if p_status = 'confirmed' then
    update public.experience_slots
    set reserved_count = reserved_count + p_people_count,
        confirmed_count = confirmed_count + p_people_count,
        updated_by = v_actor_id,
        updated_at = now()
    where id = v_slot.id;
  end if;

  return v_reservation_id;
end;
$$;

drop function if exists public.create_customer_reservation(uuid, integer, text, text, text);

create or replace function public.create_customer_reservation(
  p_experience_slot_id uuid,
  p_people_count integer,
  p_customer_notes text default null,
  p_language text default 'es',
  p_idempotency_key text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_customer_id uuid;
  v_existing_id uuid;
  v_slot public.experience_slots%rowtype;
  v_experience public.experiences%rowtype;
  v_reservation_id uuid;
  v_order_id uuid;
  v_total numeric(12,2);
  v_base_total numeric(12,2);
  v_unit_price numeric(12,2);
  v_key text := nullif(trim(coalesce(p_idempotency_key, '')), '');
  v_request_metadata jsonb := coalesce(p_metadata, '{}'::jsonb);
  v_romantic_sign_request jsonb := case
    when jsonb_typeof(coalesce(p_metadata, '{}'::jsonb) -> 'romanticSign') = 'object'
      then coalesce(p_metadata, '{}'::jsonb) -> 'romanticSign'
    else '{}'::jsonb
  end;
  v_romantic_sign_required boolean := false;
  v_romantic_sign_enabled boolean := false;
  v_romantic_sign_message text;
  v_romantic_sign_price numeric(12,2) := 500;
  v_addon_total numeric(12,2) := 0;
  v_price_text text;
begin
  if v_user_id is null then
    raise exception 'FORBIDDEN' using errcode = 'P0001';
  end if;
  if p_people_count < 1 then
    raise exception 'INVALID_PEOPLE_COUNT' using errcode = 'P0001';
  end if;
  if v_key is null then
    raise exception 'IDEMPOTENCY_KEY_REQUIRED' using errcode = 'P0001';
  end if;

  perform public.release_expired_experience_payment_holds();

  select id into v_customer_id from public.customers where user_id = v_user_id;
  if v_customer_id is null then
    raise exception 'CUSTOMER_PROFILE_REQUIRED' using errcode = 'P0001';
  end if;

  select id into v_existing_id
  from public.reservations
  where user_id = v_user_id and idempotency_key = v_key
  limit 1;
  if v_existing_id is not null then
    return v_existing_id;
  end if;

  select * into v_slot
  from public.experience_slots
  where id = p_experience_slot_id
  for update;

  if v_slot.id is null then
    raise exception 'SLOT_NOT_FOUND' using errcode = 'P0001';
  end if;
  if not v_slot.is_bookable
    or v_slot.operational_status <> 'open'
    or v_slot.status <> 'published'
    or v_slot.start_at <= now() then
    raise exception 'SLOT_NOT_BOOKABLE' using errcode = 'P0001';
  end if;
  if v_slot.reserved_count + p_people_count > v_slot.capacity then
    raise exception 'CAPACITY_EXCEEDED' using errcode = 'P0001';
  end if;

  select * into v_experience
  from public.experiences
  where id = v_slot.experience_id;

  if v_experience.id is null
    or not public.is_content_live(
      v_experience.status::text,
      v_experience.visible_in_app,
      v_experience.publish_at,
      v_experience.unpublish_at,
      v_experience.archived_at,
      v_experience.deleted_at
    ) then
    raise exception 'SLOT_NOT_BOOKABLE' using errcode = 'P0001';
  end if;

  v_romantic_sign_required := lower(coalesce(v_romantic_sign_request ->> 'required', 'false')) in ('true','1','yes');
  v_romantic_sign_enabled := v_experience.slug = 'cena-romantica-cava'
    or lower(coalesce(v_experience.metadata ->> 'romanticDinner', 'false')) in ('true','1','yes')
    or lower(coalesce(v_experience.metadata -> 'romanticSign' ->> 'enabled', 'false')) in ('true','1','yes');
  v_price_text := v_experience.metadata #>> '{romanticSign,price}';

  if v_price_text ~ '^[0-9]+([.][0-9]{1,2})?$' then
    v_romantic_sign_price := v_price_text::numeric(12,2);
  end if;

  if v_romantic_sign_required then
    v_romantic_sign_message := nullif(trim(coalesce(v_romantic_sign_request ->> 'message', '')), '');
    if not v_romantic_sign_enabled then
      raise exception 'ROMANTIC_SIGN_NOT_AVAILABLE' using errcode = 'P0001';
    end if;
    if v_romantic_sign_message not in ('Te quieres casar conmigo', 'Quieres ser mi novia') then
      raise exception 'ROMANTIC_SIGN_MESSAGE_REQUIRED' using errcode = 'P0001';
    end if;
    v_addon_total := v_romantic_sign_price;
  end if;

  v_unit_price := coalesce(v_slot.price_override, v_experience.base_price, 0);
  v_base_total := v_unit_price * p_people_count;
  v_total := v_base_total + v_addon_total;

  insert into public.reservations (
    reservation_number,
    customer_id,
    user_id,
    reservation_type,
    experience_id,
    experience_slot_id,
    people_count,
    subtotal,
    total,
    status,
    payment_status,
    payment_expires_at,
    customer_notes,
    source,
    booking_channel,
    confirmed_at,
    operational_status,
    idempotency_key,
    metadata
  ) values (
    'RES-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
    v_customer_id,
    v_user_id,
    'experience',
    v_slot.experience_id,
    v_slot.id,
    p_people_count,
    v_total,
    v_total,
    case when v_total > 0 then 'pending'::public.reservation_status else 'confirmed'::public.reservation_status end,
    case when v_total > 0 then 'pending' else 'not_required' end,
    case when v_total > 0 then now() + interval '30 minutes' else null end,
    nullif(trim(coalesce(p_customer_notes, '')), ''),
    'app',
    'native_app',
    case when v_total > 0 then null else now() end,
    'active',
    v_key,
    v_request_metadata || jsonb_build_object(
      'language', case when p_language = 'en' then 'en' else 'es' end,
      'paymentRequired', v_total > 0,
      'holdCreatedAt', now(),
      'addonsTotal', v_addon_total,
      'baseReservationTotal', v_base_total
    ) || case when v_romantic_sign_required then jsonb_build_object(
      'romanticSign', jsonb_build_object(
        'required', true,
        'label', 'Letrero luminoso',
        'message', v_romantic_sign_message,
        'price', v_romantic_sign_price,
        'currency', 'MXN'
      )
    ) else '{}'::jsonb end
  ) returning id into v_reservation_id;

  update public.experience_slots
  set reserved_count = reserved_count + p_people_count,
      confirmed_count = confirmed_count + case when v_total > 0 then 0 else p_people_count end,
      updated_at = now()
  where id = v_slot.id;

  if v_total > 0 then
  insert into public.orders (
    order_number,
    user_id,
    customer_id,
    reservation_id,
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
  ) values (
    'ORD-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
    v_user_id,
    v_customer_id,
    v_reservation_id,
    v_total,
    0,
    0,
    0,
    v_total,
    'MXN',
    'pending_payment',
    'app_reservation',
    'reservation-order:' || v_key,
    v_user_id,
    v_user_id,
    jsonb_build_object(
      'checkoutMode', 'experience_reservation',
      'paymentAvailable', true,
      'paymentStatus', 'pending_payment',
      'fulfillmentMode', 'onsite_experience',
      'reservationId', v_reservation_id,
      'addonsTotal', v_addon_total
    ) || case when v_romantic_sign_required then jsonb_build_object(
      'romanticSign', jsonb_build_object(
        'required', true,
        'label', 'Letrero luminoso',
        'message', v_romantic_sign_message,
        'price', v_romantic_sign_price,
        'currency', 'MXN'
      )
    ) else '{}'::jsonb end
  ) returning id into v_order_id;

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
  ) values (
    v_order_id,
    'experience_reservation',
    v_reservation_id,
    v_experience.title,
    null,
    p_people_count,
    v_unit_price,
    v_base_total,
    jsonb_build_object(
      'experienceId', v_experience.id,
      'experienceSlotId', v_slot.id,
      'startsAt', v_slot.start_at,
      'endsAt', v_slot.end_at,
      'reservationId', v_reservation_id
    )
  );

  if v_addon_total > 0 then
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
    ) values (
      v_order_id,
      'experience_addon',
      v_reservation_id,
      'Letrero luminoso',
      'ROMANTIC-SIGN',
      1,
      v_romantic_sign_price,
      v_addon_total,
      jsonb_build_object(
        'addonCode', 'romantic_luminous_sign',
        'reservationId', v_reservation_id,
        'message', v_romantic_sign_message
      )
    );
  end if;

  update public.reservations
  set metadata = metadata || jsonb_build_object('paymentOrderId', v_order_id),
      updated_at = now()
  where id = v_reservation_id;
  end if;

  insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, after_data)
  values (
    v_user_id,
    case when v_total > 0 then 'customer_reservation_pending_payment' else 'customer_reservation_confirmed_free' end,
    'reservations',
    v_reservation_id,
    jsonb_build_object('source', 'app', 'orderId', v_order_id, 'total', v_total, 'addonsTotal', v_addon_total)
  );

  return v_reservation_id;
end;
$$;

revoke all on function public.create_customer_reservation(uuid, integer, text, text, text, jsonb) from public, anon;
grant execute on function public.create_customer_reservation(uuid, integer, text, text, text, jsonb) to authenticated;

commit;
