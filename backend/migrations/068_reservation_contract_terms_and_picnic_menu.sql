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

with picnic_menu as (
  select jsonb_build_object(
    'enabled', true,
    'required', true,
    'label', 'Menú para picnic',
    'priceMode', 'per_person',
    'options', jsonb_build_array(
      jsonb_build_object('value', 'lasagna-bolonesa', 'label', 'Lasagna boloñesa', 'category', 'Pastas', 'price', 220, 'currency', 'MXN', 'description', 'Clásica lasagna italiana de salsa boloñesa tradicional.'),
      jsonb_build_object('value', 'espagueti-rosa-camarones', 'label', 'Espagueti rosa con camarones', 'category', 'Pastas', 'price', 165, 'currency', 'MXN', 'description', 'Espagueti con mantequilla, camarones, champiñones, parmesano y crema.'),
      jsonb_build_object('value', 'espagueti-bolonesa', 'label', 'Espagueti boloñesa', 'category', 'Pastas', 'price', 140, 'currency', 'MXN', 'description', 'Carne molida con echalote y puré de tomate sobre pasta al dente.'),
      jsonb_build_object('value', 'espagueti-carbonara', 'label', 'Espagueti carbonara', 'category', 'Pastas', 'price', 140, 'currency', 'MXN', 'description', 'Preparada con tocino, huevo, aceite de oliva y queso parmesano.'),
      jsonb_build_object('value', 'espagueti-al-burro', 'label', 'Espagueti al burro', 'category', 'Pastas', 'price', 125, 'currency', 'MXN', 'description', 'Pasta con mantequilla y queso parmesano.'),
      jsonb_build_object('value', 'pasta-4-quesos', 'label', 'Pasta 4 quesos', 'category', 'Pastas', 'price', 140, 'currency', 'MXN', 'description', 'Pasta corta bañada en salsa de cuatro quesos.'),
      jsonb_build_object('value', 'pasta-alfredo', 'label', 'Pasta Alfredo', 'category', 'Pastas', 'price', 140, 'currency', 'MXN', 'description', 'Pasta con mantequilla, jamón, champiñones, parmesano y crema.'),
      jsonb_build_object('value', 'pechuga-el-greco', 'label', 'Pechuga El Greco', 'category', 'Pollo y pescado', 'price', 165, 'currency', 'MXN', 'description', 'Suprema de pechuga con chimichurri, acompañada con puré de papa y verduras al vapor.'),
      jsonb_build_object('value', 'pollo-chilindron', 'label', 'Pollo chilindrón', 'category', 'Pollo y pescado', 'price', 220, 'currency', 'MXN', 'description', 'Pechuga con salsa española, jamón serrano, salsa de tomate con vino tinto y pimientos.'),
      jsonb_build_object('value', 'pollo-saltimboca', 'label', 'Pollo saltimboca', 'category', 'Pollo y pescado', 'price', 220, 'currency', 'MXN', 'description', 'Suprema de pechuga con queso blanco y jamón serrano, bañada en salsa de tomate y reducción de vino.'),
      jsonb_build_object('value', 'lomo-de-salmon', 'label', 'Lomo de salmón', 'category', 'Pollo y pescado', 'price', 315, 'currency', 'MXN', 'description', 'Lomo de salmón con verduras al vapor, puré de papa, salsa de lima, alcaparras, aceituna manzanilla y finas hierbas.'),
      jsonb_build_object('value', 'filete-de-pescado', 'label', 'Filete de pescado', 'category', 'Pollo y pescado', 'price', 175, 'currency', 'MXN', 'description', 'Filete de tilapia a la plancha, empanizado o al mojo de ajo, acompañado con arroz y ensalada.'),
      jsonb_build_object('value', 'pescado-empapelado', 'label', 'Pescado empapelado', 'category', 'Pollo y pescado', 'price', 185, 'currency', 'MXN', 'description', 'Filete de pescado sazonado con aderezo de chipotle, verduras y queso cheddar envuelto en aluminio.')
    )
  ) as payload
), common_experience_contract as (
  select jsonb_build_object(
    'required', true,
    'requiresAcceptance', true,
    'title', 'Condiciones de reservación',
    'confirmationMessage', 'Acepto las condiciones de reservación.',
    'version', 'reservation-terms-2026-08-22',
    'terms', jsonb_build_array(
      'La reservación queda sujeta a disponibilidad y confirmación operativa de Hacienda de Letras.',
      'Los horarios, accesos y servicios se atienden conforme a las condiciones publicadas al momento de reservar.',
      'Cualquier cambio debe solicitarse con anticipación al equipo de atención.'
    )
  ) as payload
), picnic_contract as (
  select jsonb_build_object(
    'required', true,
    'requiresAcceptance', true,
    'title', 'Condiciones de picnic',
    'confirmationMessage', 'Acepto las condiciones y el menú seleccionado.',
    'version', 'picnic-terms-2026-08-22',
    'terms', jsonb_build_array(
      'El menú se prepara de acuerdo con la opción seleccionada y el número de personas registradas.',
      'Cualquier cambio de menú debe solicitarse con anticipación a Hacienda de Letras.',
      'La reservación queda sujeta a confirmación operativa y disponibilidad del servicio.'
    )
  ) as payload
)
update public.experiences e
set metadata = coalesce(e.metadata, '{}'::jsonb) || jsonb_build_object(
  'contractTerms', picnic_contract.payload,
  'operationalRules', jsonb_build_object(
    'suggestedWindow', '15:00-17:00',
    'minimumNoticeHours', 5,
    'kitchenNotice', 'El menú requiere confirmación operativa de cocina.'
  ),
  'romanticSign', jsonb_build_object(
    'enabled', true,
    'label', 'Letrero luminoso',
    'serviceLabel', 'Picnic',
    'price', 500,
    'currency', 'MXN',
    'options', jsonb_build_array(
      jsonb_build_object('code', 'proposal', 'label', 'Te quieres casar conmigo'),
      jsonb_build_object('code', 'girlfriend', 'label', 'Quieres ser mi novia')
    )
  ),
  'menuConfig', picnic_menu.payload
)
from picnic_menu, picnic_contract
where e.slug = 'picnic-entre-vinedos';

with common_experience_contract as (
  select jsonb_build_object(
    'required', true,
    'requiresAcceptance', true,
    'title', 'Condiciones de reservación',
    'confirmationMessage', 'Acepto las condiciones de reservación.',
    'version', 'reservation-terms-2026-08-22',
    'terms', jsonb_build_array(
      'La reservación queda sujeta a disponibilidad y confirmación operativa de Hacienda de Letras.',
      'Los horarios, accesos y servicios se atienden conforme a las condiciones publicadas al momento de reservar.',
      'Cualquier cambio debe solicitarse con anticipación al equipo de atención.'
    )
  ) as payload
)
update public.experiences e
set metadata = coalesce(e.metadata, '{}'::jsonb) || jsonb_build_object(
  'contractTerms', common_experience_contract.payload,
  'operationalRules', jsonb_build_object(
    'dinnerTime', '19:00',
    'dinnerDurationMinutes', 180,
    'minimumNoticeHours', 5,
    'kitchenNotice', 'Cocina y montaje requieren confirmación operativa.'
  ),
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
  ),
  'mainCourse', jsonb_build_object(
    'enabled', true,
    'required', true,
    'label', 'Plato fuerte',
    'serviceLabel', 'Cena romántica',
    'noticeHours', 5,
    'options', jsonb_build_array(
      jsonb_build_object('value', 'filete-res', 'label', 'Filete de res'),
      jsonb_build_object('value', 'pechuga-rellena', 'label', 'Pechuga rellena'),
      jsonb_build_object('value', 'pasta-cremosa', 'label', 'Pasta cremosa'),
      jsonb_build_object('value', 'opcion-vegetariana', 'label', 'Opción vegetariana')
    )
  )
)
from common_experience_contract
where e.slug = 'cena-romantica-cava';

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

with cabin_contract as (
  select jsonb_build_object(
    'required', true,
    'requiresAcceptance', true,
    'title', 'Condiciones de cabaña',
    'confirmationMessage', 'Acepto las condiciones de la reservación.',
    'version', 'cabin-terms-2026-08-22',
    'terms', jsonb_build_array(
      'La solicitud queda sujeta a disponibilidad y confirmación operativa de Hacienda de Letras.',
      'Entrada, salida, desayuno y servicios adicionales se atienden conforme a las condiciones publicadas al momento de reservar.',
      'Cualquier cambio debe solicitarse con anticipación al equipo de atención.'
    )
  ) as payload
)
update public.cabin_packages c
set metadata = coalesce(c.metadata, '{}'::jsonb) || jsonb_build_object(
  'contractTerms', cabin_contract.payload,
  'operationalRules', jsonb_build_object(
    'checkInTime', '15:00',
    'checkOutTime', '13:00',
    'breakfastWindow', '09:00-11:00',
    'minimumNoticeHours', 5,
    'vineyardTourTime', case when c.slug = 'paquete-vino' then '16:00' else null end,
    'tastingTime', case when c.slug = 'paquete-vino' then '17:00' else null end,
    'dinnerTime', case when c.slug = 'paquete-romantico' then '19:00' else null end,
    'dinnerDurationMinutes', case when c.slug = 'paquete-romantico' then 180 else null end
  )
)
from cabin_contract
where c.slug in ('paquete-cabana', 'paquete-vino', 'paquete-romantico');

with restaurant_contract as (
  select jsonb_build_object(
    'required', true,
    'requiresAcceptance', true,
    'title', 'Condiciones de restaurante',
    'confirmationMessage', 'Acepto las condiciones de la reservación.',
    'version', 'restaurant-terms-2026-08-22',
    'terms', jsonb_build_array(
      'La solicitud queda sujeta a confirmación operativa de Hacienda de Letras.',
      'El horario de llegada, disponibilidad de mesa y condiciones de servicio se confirman por el contacto registrado.',
      'Cualquier cambio debe solicitarse con anticipación al equipo del restaurante.'
    )
  ) as payload
)
update public.restaurant_locations r
set metadata = coalesce(r.metadata, '{}'::jsonb) || jsonb_build_object('contractTerms', restaurant_contract.payload)
from restaurant_contract
where r.slug in ('restaurante-hacienda-de-letras', 'restaurante-centro-aguascalientes');

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
  v_menu_request jsonb := case
    when jsonb_typeof(coalesce(p_metadata, '{}'::jsonb) -> 'menuSelection') = 'object'
      then coalesce(p_metadata, '{}'::jsonb) -> 'menuSelection'
    else '{}'::jsonb
  end;
  v_main_course_request jsonb := case
    when jsonb_typeof(coalesce(p_metadata, '{}'::jsonb) -> 'mainCourse') = 'object'
      then coalesce(p_metadata, '{}'::jsonb) -> 'mainCourse'
    else '{}'::jsonb
  end;
  v_romantic_sign_required boolean := false;
  v_romantic_sign_enabled boolean := false;
  v_romantic_sign_message text;
  v_romantic_sign_price numeric(12,2) := 500;
  v_addon_total numeric(12,2) := 0;
  v_price_text text;
  v_menu_has_request boolean := false;
  v_menu_enabled boolean := false;
  v_menu_required boolean := false;
  v_menu_price_mode text := 'per_person';
  v_menu_label text;
  v_menu_option text;
  v_menu_value text;
  v_menu_category text;
  v_menu_description text;
  v_menu_unit_price numeric(12,2) := 0;
  v_menu_quantity integer := 0;
  v_menu_total numeric(12,2) := 0;
  v_main_course_enabled boolean := false;
  v_main_course_required boolean := false;
  v_main_course_has_request boolean := false;
  v_main_course_label text;
  v_main_course_option text;
  v_main_course_value text;
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

  v_menu_value := nullif(trim(coalesce(v_menu_request ->> 'value', '')), '');
  v_menu_has_request := v_menu_value is not null
    or nullif(trim(coalesce(v_menu_request ->> 'option', '')), '') is not null;
  v_menu_enabled := lower(coalesce(v_experience.metadata #>> '{menuConfig,enabled}', 'false')) in ('true','1','yes','si','sí');
  v_menu_required := lower(coalesce(v_experience.metadata #>> '{menuConfig,required}', 'false')) in ('true','1','yes','si','sí');
  v_menu_price_mode := case when v_experience.metadata #>> '{menuConfig,priceMode}' = 'flat' then 'flat' else 'per_person' end;

  if v_menu_required and not v_menu_has_request then
    raise exception 'MENU_SELECTION_REQUIRED' using errcode = 'P0001';
  end if;

  if v_menu_has_request then
    if not v_menu_enabled then
      raise exception 'MENU_NOT_AVAILABLE' using errcode = 'P0001';
    end if;
    if v_menu_value is null then
      raise exception 'MENU_SELECTION_INVALID' using errcode = 'P0001';
    end if;

    select
      menu_option ->> 'label',
      menu_option ->> 'value',
      menu_option ->> 'category',
      menu_option ->> 'description',
      case when menu_option ->> 'price' ~ '^[0-9]+([.][0-9]{1,2})?$' then (menu_option ->> 'price')::numeric(12,2) else 0 end
    into
      v_menu_option,
      v_menu_value,
      v_menu_category,
      v_menu_description,
      v_menu_unit_price
    from jsonb_array_elements(coalesce(v_experience.metadata #> '{menuConfig,options}', '[]'::jsonb)) as menu_options(menu_option)
    where menu_option ->> 'value' = v_menu_value
    limit 1;

    if v_menu_option is null then
      raise exception 'MENU_SELECTION_INVALID' using errcode = 'P0001';
    end if;

    v_menu_label := coalesce(nullif(trim(v_experience.metadata #>> '{menuConfig,label}'), ''), 'Menú');
    v_menu_quantity := case when v_menu_price_mode = 'flat' then 1 else p_people_count end;
    v_menu_total := v_menu_unit_price * v_menu_quantity;
  end if;

  v_main_course_value := nullif(trim(coalesce(v_main_course_request ->> 'value', '')), '');
  v_main_course_has_request := v_main_course_value is not null
    or nullif(trim(coalesce(v_main_course_request ->> 'option', '')), '') is not null;
  v_main_course_enabled := lower(coalesce(v_experience.metadata #>> '{mainCourse,enabled}', 'false')) in ('true','1','yes','si','sí');
  v_main_course_required := lower(coalesce(v_experience.metadata #>> '{mainCourse,required}', 'false')) in ('true','1','yes','si','sí');

  if v_main_course_required and not v_main_course_has_request then
    raise exception 'MAIN_COURSE_REQUIRED' using errcode = 'P0001';
  end if;

  if v_main_course_has_request then
    if not v_main_course_enabled then
      raise exception 'MAIN_COURSE_NOT_AVAILABLE' using errcode = 'P0001';
    end if;
    if v_main_course_value is null then
      raise exception 'MAIN_COURSE_INVALID' using errcode = 'P0001';
    end if;

    select
      main_course_option ->> 'label',
      main_course_option ->> 'value'
    into
      v_main_course_option,
      v_main_course_value
    from jsonb_array_elements(coalesce(v_experience.metadata #> '{mainCourse,options}', '[]'::jsonb)) as main_course_options(main_course_option)
    where main_course_option ->> 'value' = v_main_course_value
    limit 1;

    if v_main_course_option is null then
      raise exception 'MAIN_COURSE_INVALID' using errcode = 'P0001';
    end if;

    v_main_course_label := coalesce(nullif(trim(v_experience.metadata #>> '{mainCourse,label}'), ''), 'Plato fuerte');
  end if;

  v_unit_price := coalesce(v_slot.price_override, v_experience.base_price, 0);
  v_base_total := v_unit_price * p_people_count;
  v_total := v_base_total + v_addon_total + v_menu_total;

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
      'addonsTotal', v_addon_total + v_menu_total,
      'menuTotal', v_menu_total,
      'baseReservationTotal', v_base_total
    ) || case when v_romantic_sign_required then jsonb_build_object(
      'romanticSign', jsonb_build_object(
        'required', true,
        'label', 'Letrero luminoso',
        'message', v_romantic_sign_message,
        'price', v_romantic_sign_price,
        'currency', 'MXN'
      )
    ) else '{}'::jsonb end || case when v_menu_has_request then jsonb_build_object(
      'menuSelection', jsonb_build_object(
        'label', v_menu_label,
        'option', v_menu_option,
        'value', v_menu_value,
        'category', v_menu_category,
        'description', v_menu_description,
        'price', v_menu_unit_price,
        'quantity', v_menu_quantity,
        'subtotal', v_menu_total,
        'currency', 'MXN',
        'priceMode', v_menu_price_mode
      )
    ) else '{}'::jsonb end || case when v_main_course_has_request then jsonb_build_object(
      'mainCourse', jsonb_build_object(
        'label', v_main_course_label,
        'option', v_main_course_option,
        'value', v_main_course_value
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
      'addonsTotal', v_addon_total + v_menu_total,
      'menuTotal', v_menu_total
    ) || case when v_romantic_sign_required then jsonb_build_object(
      'romanticSign', jsonb_build_object(
        'required', true,
        'label', 'Letrero luminoso',
        'message', v_romantic_sign_message,
        'price', v_romantic_sign_price,
        'currency', 'MXN'
      )
    ) else '{}'::jsonb end || case when v_menu_has_request then jsonb_build_object(
      'menuSelection', jsonb_build_object(
        'label', v_menu_label,
        'option', v_menu_option,
        'value', v_menu_value,
        'category', v_menu_category,
        'price', v_menu_unit_price,
        'quantity', v_menu_quantity,
        'subtotal', v_menu_total,
        'currency', 'MXN',
        'priceMode', v_menu_price_mode
      )
    ) else '{}'::jsonb end || case when v_main_course_has_request then jsonb_build_object(
      'mainCourse', jsonb_build_object(
        'label', v_main_course_label,
        'option', v_main_course_option,
        'value', v_main_course_value
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

  if v_menu_has_request and v_menu_total > 0 then
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
      'experience_menu',
      v_reservation_id,
      v_menu_label || ': ' || v_menu_option,
      'EXPERIENCE-MENU',
      v_menu_quantity,
      v_menu_unit_price,
      v_menu_total,
      jsonb_build_object(
        'addonCode', 'experience_menu',
      'reservationId', v_reservation_id,
      'option', v_menu_option,
      'value', v_menu_value,
      'category', v_menu_category
      )
    );
  end if;

  if v_main_course_has_request then
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
      'experience_note',
      v_reservation_id,
      v_main_course_label || ': ' || v_main_course_option,
      'MAIN-COURSE',
      1,
      0,
      0,
      jsonb_build_object(
        'noteCode', 'main_course',
        'reservationId', v_reservation_id,
        'option', v_main_course_option,
        'value', v_main_course_value
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
    jsonb_build_object('source', 'app', 'orderId', v_order_id, 'total', v_total, 'addonsTotal', v_addon_total + v_menu_total, 'menuTotal', v_menu_total)
  );

  return v_reservation_id;
end;
$$;

revoke all on function public.create_customer_reservation(uuid, integer, text, text, text, jsonb) from public, anon;
grant execute on function public.create_customer_reservation(uuid, integer, text, text, text, jsonb) to authenticated;

commit;
