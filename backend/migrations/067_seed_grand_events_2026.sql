begin;

with seed_events as (
  select
    'vendimia-2026'::text as slug,
    'Gran Festival Vendimia 2026'::text as title,
    'La tradicion que nos une'::text as subtitle,
    $$Vive la magia de Vendimia 2026 en Hacienda de Letras, un festival donde el vino, la gastronomia y nuestras tradiciones se unen para crear una experiencia inolvidable. Se parte de la Gran Pisa de Uvas y disfruta catas, degustaciones, recorridos por los vinedos, gastronomia local, musica en vivo y espacios para crear recuerdos memorables.$$::text as description,
    'Festival de vendimia con pisa de uvas, vino de casa, gastronomia, musica en vivo y recorridos por vinedos.'::text as short_description,
    'Hacienda de Letras, San Luis de Letras, Aguascalientes'::text as venue,
    '2026-08-01 11:00:00-06'::timestamptz as start_at,
    '2026-08-02 22:00:00-06'::timestamptz as end_at,
    1200::integer as capacity,
    10::integer as sort_order,
    true::boolean as featured,
    true::boolean as sales_enabled,
    '/events/vendimia-2026.webp'::text as cover_image_url,
    jsonb_build_object(
      'event_scope', 'grand',
      'event_kind', 'harvest',
      'location_kind', 'estate',
      'reservation_phone', '449 279 5020 / 449 142 9640',
      'seed_group', 'grand_events_2026',
      'includes', jsonb_build_array(
        'Acceso al festival',
        'Copa con degustacion de vino de la casa',
        'Pisa de uvas',
        'Catas y degustaciones',
        'Recorridos por vinedos',
        'Gastronomia local',
        'Musica en vivo'
      ),
      'variant_schema', jsonb_build_array(
        jsonb_build_object(
          'id', 'day',
          'key', 'day',
          'label', 'Dia de asistencia',
          'input_type', 'select',
          'required', true,
          'options', jsonb_build_array(
            jsonb_build_object('id', '2026-08-01', 'label', 'Sabado 1 de agosto', 'value', '2026-08-01', 'capacity', 600),
            jsonb_build_object('id', '2026-08-02', 'label', 'Domingo 2 de agosto', 'value', '2026-08-02', 'capacity', 600)
          )
        )
      )
    ) as metadata
  union all
  select
    'concierto-80s-90s-mas-vendimia-2026',
    'Concierto 80s, 90s y Mas - Vendimia 2026',
    'Musica en vivo entre vinedos',
    $$Las mejores canciones nunca pasan de moda y las mejores experiencias se viven en Hacienda de Letras. Este 8 y 9 de agosto disfruta un concierto con exitos de los 80, 90 y mas dentro del Gran Festival Vendimia 2026. Vive un atardecer entre vinedos con gastronomia, vino de la casa, musica en vivo y la Gran Pisa de Uvas.$$,
    'Concierto de grandes exitos en el marco de Vendimia 2026, con vino de casa, gastronomia y musica en vivo.',
    'Hacienda de Letras, San Luis de Letras, Aguascalientes',
    '2026-08-08 11:00:00-06'::timestamptz,
    '2026-08-09 22:00:00-06'::timestamptz,
    1200,
    20,
    true,
    true,
    '/events/concierto-vendimia-2026.webp',
    jsonb_build_object(
      'event_scope', 'grand',
      'event_kind', 'concert',
      'location_kind', 'estate',
      'source_url', 'https://www.haciendadeletras.com/producto/concierto-80s-90s-mas-vendimia-2026/',
      'seed_group', 'grand_events_2026',
      'program', jsonb_build_array(
        jsonb_build_object('label', 'DJ', 'from', '11:00', 'to', '17:00'),
        jsonb_build_object('label', 'Los de la Feria', 'from', '17:00', 'to', '19:00'),
        jsonb_build_object('label', 'Show musical en vivo', 'from', '19:00', 'to', '22:00')
      ),
      'includes', jsonb_build_array(
        'Acceso al festival',
        'Musica en vivo',
        'Vino de la casa',
        'Gastronomia',
        'Pisa de uvas'
      ),
      'variant_schema', jsonb_build_array(
        jsonb_build_object(
          'id', 'day',
          'key', 'day',
          'label', 'Dia de asistencia',
          'input_type', 'select',
          'required', true,
          'options', jsonb_build_array(
            jsonb_build_object('id', '2026-08-08', 'label', 'Sabado 8 de agosto', 'value', '2026-08-08', 'capacity', 600),
            jsonb_build_object('id', '2026-08-09', 'label', 'Domingo 9 de agosto', 'value', '2026-08-09', 'capacity', 600)
          )
        )
      )
    )
  union all
  select
    'la-gran-carrera-del-vino-2026',
    'La Gran Carrera del Vino',
    'Una experiencia unica en cada kilometro',
    $$No es llegar primero, sino disfrutarlo mas. Unete a una experiencia unica entre los vinedos de Hacienda de Letras. Al cruzar la meta, celebra tu logro con la magia del vinedo. Incluye kit de corredor oficial, estaciones de degustacion en ruta, copa conmemorativa, hidratacion y premios en especie. Las degustaciones de vino son exclusivas para mayores de edad; los menores reciben degustacion de jugo.$$,
    'Carrera entre vinedos con distancias 3K, 5K y 8K, kit de corredor, degustaciones y copa conmemorativa.',
    'Hacienda de Letras, Aguascalientes',
    '2026-07-12 06:40:00-06'::timestamptz,
    '2026-07-12 12:00:00-06'::timestamptz,
    900,
    30,
    true,
    true,
    '/events/carrera-del-vino-2026.png',
    jsonb_build_object(
      'event_scope', 'grand',
      'event_kind', 'race',
      'location_kind', 'estate',
      'seed_group', 'grand_events_2026',
      'includes', jsonb_build_array(
        'Kit de corredor oficial',
        'Estaciones de degustacion en ruta',
        'Copa conmemorativa',
        'Hidratacion',
        'Premios en especie'
      ),
      'variant_schema', jsonb_build_array(
        jsonb_build_object(
          'id', 'distance',
          'key', 'distance',
          'label', 'Distancia',
          'input_type', 'select',
          'required', true,
          'options', jsonb_build_array(
            jsonb_build_object('id', '3k', 'label', '3K', 'value', '3K', 'capacity', 250),
            jsonb_build_object('id', '5k', 'label', '5K', 'value', '5K', 'capacity', 300),
            jsonb_build_object('id', '8k', 'label', '8K', 'value', '8K', 'capacity', 350)
          )
        ),
        jsonb_build_object(
          'id', 'participant_type',
          'key', 'participant_type',
          'label', 'Tipo de participante',
          'input_type', 'select',
          'required', true,
          'options', jsonb_build_array(
            jsonb_build_object('id', 'adult', 'label', 'Adulto', 'value', 'adulto'),
            jsonb_build_object('id', 'child', 'label', 'Niño', 'value', 'nino')
          )
        )
      )
    )
  union all
  select
    'festival-espuma-y-vino-2026',
    'Festival de Espuma y Vino 2026',
    'Diversion, vino y musica entre vinedos',
    $$Disfruta una experiencia entre vinedos donde la diversion, el vino y la musica se unen en un ambiente familiar. Vive la zona de espuma, brinda con una copa de vino y disfruta DJ en vivo en una jornada pensada para compartir con amigos, familia o pareja.$$,
    'Festival familiar con zona de espuma, copa de vino, recorrido por vinedos y DJ en vivo.',
    'Hacienda de Letras, San Luis de Letras, Aguascalientes',
    '2026-04-04 11:00:00-06'::timestamptz,
    '2026-04-04 20:00:00-06'::timestamptz,
    800,
    40,
    false,
    true,
    '/events/festival-espuma-vino-2026.png',
    jsonb_build_object(
      'event_scope', 'grand',
      'event_kind', 'festival',
      'location_kind', 'estate',
      'seed_group', 'grand_events_2026',
      'includes', jsonb_build_array(
        'Acceso general',
        'Copa de vino',
        'Recorrido',
        'DJ en vivo',
        'Zona de espuma'
      ),
      'variant_schema', jsonb_build_array(
        jsonb_build_object(
          'id', 'access_type',
          'key', 'access_type',
          'label', 'Tipo de acceso',
          'input_type', 'select',
          'required', true,
          'options', jsonb_build_array(
            jsonb_build_object('id', 'general', 'label', 'Acceso general', 'value', 'general', 'price', 150, 'capacity', 800)
          )
        )
      )
    )
  union all
  select
    'atardeceres-de-salsa-restaurante-centro-2026',
    'Atardeceres de Salsa',
    'Vino, musica y terraza en Restaurante Centro',
    $$Primero brindamos, despues bailamos. Los Atardeceres de Salsa llegan a la terraza de Hacienda de Letras Restaurante Centro con una noche para disfrutar del atardecer, vino, musica y baile en pleno corazon de Aguascalientes. Ellas brindan sin limite con barra libre de clericot de 6:00 p.m. a 9:00 p.m. Reservaciones al 449 192 2876.$$,
    'Noche de salsa, vino y terraza en Restaurante Centro. Reservacion por telefono.',
    'Calle Nieto 106, Zona Centro, Aguascalientes',
    '2026-08-21 19:00:00-06'::timestamptz,
    '2026-08-22 01:00:00-06'::timestamptz,
    120,
    50,
    true,
    false,
    '/hacienda 2.jpg',
    jsonb_build_object(
      'event_scope', 'grand',
      'event_kind', 'sunset',
      'location_kind', 'restaurant_center',
      'reservation_phone', '449 192 2876',
      'seed_group', 'grand_events_2026',
      'includes', jsonb_build_array(
        'Terraza',
        'Musica para bailar',
        'Vino',
        'Barra libre de clericot de 6:00 p.m. a 9:00 p.m.'
      ),
      'variant_schema', jsonb_build_array(
        jsonb_build_object(
          'id', 'reservation',
          'key', 'reservation',
          'label', 'Reservacion',
          'input_type', 'text',
          'required', false,
          'options', jsonb_build_array()
        )
      )
    )
)
insert into public.events (
  slug,
  title,
  subtitle,
  description,
  short_description,
  venue,
  start_at,
  end_at,
  capacity,
  sold_count,
  reserved_count,
  featured,
  status,
  visible_in_app,
  visible_in_control,
  sales_enabled,
  cover_image_url,
  sort_order,
  publish_at,
  unpublish_at,
  published_at,
  archived_at,
  deleted_at,
  locale,
  metadata
)
select
  slug,
  title,
  subtitle,
  description,
  short_description,
  venue,
  start_at,
  end_at,
  capacity,
  0,
  0,
  featured,
  'published'::event_status,
  true,
  true,
  sales_enabled,
  cover_image_url,
  sort_order,
  now() - interval '1 minute',
  null,
  now(),
  null,
  null,
  'es-MX',
  metadata
from seed_events
on conflict (slug) do update
set
  title = excluded.title,
  subtitle = excluded.subtitle,
  description = excluded.description,
  short_description = excluded.short_description,
  venue = excluded.venue,
  start_at = excluded.start_at,
  end_at = excluded.end_at,
  capacity = greatest(public.events.capacity, excluded.capacity),
  featured = excluded.featured,
  status = excluded.status,
  visible_in_app = excluded.visible_in_app,
  visible_in_control = excluded.visible_in_control,
  sales_enabled = excluded.sales_enabled,
  cover_image_url = excluded.cover_image_url,
  sort_order = excluded.sort_order,
  publish_at = excluded.publish_at,
  unpublish_at = excluded.unpublish_at,
  published_at = coalesce(public.events.published_at, excluded.published_at),
  archived_at = null,
  deleted_at = null,
  locale = excluded.locale,
  metadata = public.events.metadata || excluded.metadata,
  updated_at = now();

delete from public.event_ticket_types
where metadata->>'seed_group' = 'grand_events_2026'
  and event_id in (
    select id
    from public.events
    where slug in (
      'vendimia-2026',
      'concierto-80s-90s-mas-vendimia-2026',
      'la-gran-carrera-del-vino-2026',
      'festival-espuma-y-vino-2026',
      'atardeceres-de-salsa-restaurante-centro-2026'
    )
  );

with ticket_seed as (
  select 'vendimia-2026'::text as event_slug, 'Preventa'::text as name, 'Boleto en preventa para Vendimia 2026.'::text as description, 150::numeric as price, 600::integer as capacity, 10::integer as sort_order, jsonb_build_object('seed_group', 'grand_events_2026', 'ticket_kind', 'preventa') as metadata
  union all select 'vendimia-2026', 'Dia del evento', 'Boleto comprado el dia del evento.', 200, 600, 20, jsonb_build_object('seed_group', 'grand_events_2026', 'ticket_kind', 'dia_evento')
  union all select 'concierto-80s-90s-mas-vendimia-2026', 'Preventa', 'Boleto en preventa para concierto dentro de Vendimia 2026.', 150, 600, 10, jsonb_build_object('seed_group', 'grand_events_2026', 'ticket_kind', 'preventa')
  union all select 'concierto-80s-90s-mas-vendimia-2026', 'Dia del evento', 'Boleto comprado el dia del evento.', 200, 600, 20, jsonb_build_object('seed_group', 'grand_events_2026', 'ticket_kind', 'dia_evento')
  union all select 'la-gran-carrera-del-vino-2026', 'Adulto 3K', 'Inscripcion adulto para distancia 3K.', 300, 150, 10, jsonb_build_object('seed_group', 'grand_events_2026', 'distance', '3K', 'participant_type', 'adulto')
  union all select 'la-gran-carrera-del-vino-2026', 'Niño 3K', 'Inscripción infantil para distancia 3K.', 180, 80, 20, jsonb_build_object('seed_group', 'grand_events_2026', 'distance', '3K', 'participant_type', 'nino')
  union all select 'la-gran-carrera-del-vino-2026', 'Adulto 5K', 'Inscripcion adulto para distancia 5K.', 350, 180, 30, jsonb_build_object('seed_group', 'grand_events_2026', 'distance', '5K', 'participant_type', 'adulto')
  union all select 'la-gran-carrera-del-vino-2026', 'Niño 5K', 'Inscripción infantil para distancia 5K.', 220, 80, 40, jsonb_build_object('seed_group', 'grand_events_2026', 'distance', '5K', 'participant_type', 'nino')
  union all select 'la-gran-carrera-del-vino-2026', 'Adulto 8K', 'Inscripcion adulto para distancia 8K.', 400, 220, 50, jsonb_build_object('seed_group', 'grand_events_2026', 'distance', '8K', 'participant_type', 'adulto')
  union all select 'la-gran-carrera-del-vino-2026', 'Niño 8K', 'Inscripción infantil para distancia 8K.', 250, 90, 60, jsonb_build_object('seed_group', 'grand_events_2026', 'distance', '8K', 'participant_type', 'nino')
  union all select 'festival-espuma-y-vino-2026', 'Acceso general', 'Entrada general al Festival de Espuma y Vino.', 150, 800, 10, jsonb_build_object('seed_group', 'grand_events_2026', 'ticket_kind', 'general')
)
insert into public.event_ticket_types (
  event_id,
  name,
  description,
  price,
  capacity,
  sold_count,
  reserved_count,
  sales_start_at,
  sales_end_at,
  active,
  status,
  visible_in_control,
  visible_in_app,
  sort_order,
  publish_at,
  unpublish_at,
  published_at,
  archived_at,
  deleted_at,
  locale,
  metadata
)
select
  events.id,
  ticket_seed.name,
  ticket_seed.description,
  ticket_seed.price,
  ticket_seed.capacity,
  0,
  0,
  null,
  null,
  true,
  'published'::content_status,
  true,
  true,
  ticket_seed.sort_order,
  now() - interval '1 minute',
  null,
  now(),
  null,
  null,
  'es-MX',
  ticket_seed.metadata
from ticket_seed
join public.events on events.slug = ticket_seed.event_slug;

delete from public.event_images
where metadata->>'seed_group' = 'grand_events_2026'
  and event_id in (
    select id
    from public.events
    where slug in (
      'vendimia-2026',
      'concierto-80s-90s-mas-vendimia-2026',
      'la-gran-carrera-del-vino-2026',
      'festival-espuma-y-vino-2026',
      'atardeceres-de-salsa-restaurante-centro-2026'
    )
  );

with image_seed as (
  select 'vendimia-2026'::text as event_slug, '/events/vendimia-2026.webp'::text as url, 'Gran Festival Vendimia 2026'::text as alt_text, 10::integer as sort_order
  union all select 'concierto-80s-90s-mas-vendimia-2026', '/events/concierto-vendimia-2026.webp', 'Concierto 80s 90s y Mas Vendimia 2026', 10
  union all select 'la-gran-carrera-del-vino-2026', '/events/carrera-del-vino-2026.png', 'La Gran Carrera del Vino 2026', 10
  union all select 'festival-espuma-y-vino-2026', '/events/festival-espuma-vino-2026.png', 'Festival de Espuma y Vino 2026', 10
  union all select 'atardeceres-de-salsa-restaurante-centro-2026', '/hacienda 2.jpg', 'Restaurante Hacienda de Letras Centro', 10
)
insert into public.event_images (
  event_id,
  url,
  alt_text,
  sort_order,
  visible_in_control,
  visible_in_app,
  publish_at,
  unpublish_at,
  published_at,
  archived_at,
  deleted_at,
  locale,
  metadata,
  status
)
select
  events.id,
  image_seed.url,
  image_seed.alt_text,
  image_seed.sort_order,
  true,
  true,
  now() - interval '1 minute',
  null,
  now(),
  null,
  null,
  'es-MX',
  jsonb_build_object('seed_group', 'grand_events_2026'),
  'published'::content_status
from image_seed
join public.events on events.slug = image_seed.event_slug;

commit;
