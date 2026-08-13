begin;

-- Ubicaciones oficiales: se publican con coordenadas exactas para evitar que
-- Maps/Waze resuelvan solamente la calle o el código postal.
insert into public.map_pois (
  slug, name, description, category, latitude, longitude, address,
  search_keywords, metadata, status, visible_in_app, visible_in_control,
  sort_order, publish_at, published_at, archived_at, deleted_at
)
values
  (
    'vinedos-bodegas-hacienda-de-letras',
    'Viñedos y Bodegas Hacienda de Letras',
    'Viñedo, bodega y restaurante de Hacienda de Letras.',
    'hacienda', 22.1395015, -102.2945108,
    'Teodoro Olivares S/N, 20668 San Luis de Letras, Ags.',
    array['hacienda','vino','viñedo','bodega','restaurante','san luis de letras','teodoro olivares'],
    jsonb_build_object('official', true, 'placeType', 'estate_restaurant', 'coordinateSource', 'verified_poi_2026_08_13'),
    'published', true, true, 10, null, now(), null, null
  ),
  (
    'cabanas-hacienda-de-letras',
    'Cabañas Hacienda de Letras',
    'Hospedaje dentro de Hacienda de Letras.',
    'lodging', 22.1356581, -102.2947807,
    'Teodoro Olivares S/N, 20668 San Luis de Letras, Ags.',
    array['cabañas','hospedaje','hacienda','san luis de letras','teodoro olivares'],
    jsonb_build_object('official', true, 'placeType', 'lodging', 'coordinateSource', 'verified_poi_2026_08_13'),
    'published', true, true, 20, null, now(), null, null
  ),
  (
    'restaurante-centro-aguascalientes',
    'Restaurante Hacienda de Letras Centro',
    'Restaurante de Hacienda de Letras en el Centro de Aguascalientes.',
    'restaurant', 21.8799798, -102.2965412,
    'Nieto 106, Zona Centro, 20000 Aguascalientes, Ags.',
    array['restaurante','centro','nieto','hacienda de letras','aguascalientes'],
    jsonb_build_object('official', true, 'placeType', 'restaurant', 'coordinateSource', 'verified_address_2026_08_13'),
    'published', true, true, 30, null, now(), null, null
  )
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  category = excluded.category,
  latitude = excluded.latitude,
  longitude = excluded.longitude,
  address = excluded.address,
  search_keywords = excluded.search_keywords,
  metadata = coalesce(public.map_pois.metadata, '{}'::jsonb) || excluded.metadata,
  status = excluded.status,
  visible_in_app = excluded.visible_in_app,
  visible_in_control = excluded.visible_in_control,
  sort_order = excluded.sort_order,
  publish_at = null,
  unpublish_at = null,
  archived_at = null,
  deleted_at = null,
  published_at = coalesce(public.map_pois.published_at, now()),
  updated_at = now();

update public.restaurant_locations
set full_address = 'Teodoro Olivares S/N, 20668 San Luis de Letras, Ags.',
    city = 'Pabellón de Arteaga',
    state = 'Aguascalientes',
    reservation_enabled = true,
    status = 'published',
    visible_in_app = true,
    visible_in_control = true,
    verification_status = 'verified',
    publish_at = null,
    unpublish_at = null,
    archived_at = null,
    deleted_at = null,
    metadata = coalesce(metadata, '{}'::jsonb)
      || jsonb_build_object(
        'coordinates', jsonb_build_array(-102.2945108, 22.1395015),
        'officialAddress', true,
        'translations', coalesce(metadata->'translations', '{}'::jsonb)
          || jsonb_build_object(
            'en-US', jsonb_build_object(
              'name', 'Hacienda de Letras Restaurant',
              'title', 'Hacienda de Letras Restaurant',
              'description', 'The restaurant at Hacienda de Letras, with bookings available through the app.',
              'address', 'Teodoro Olivares S/N, 20668 San Luis de Letras, Aguascalientes'
            ),
            'en', jsonb_build_object(
              'name', 'Hacienda de Letras Restaurant',
              'title', 'Hacienda de Letras Restaurant',
              'description', 'The restaurant at Hacienda de Letras, with bookings available through the app.',
              'address', 'Teodoro Olivares S/N, 20668 San Luis de Letras, Aguascalientes'
            )
          )
      ),
    updated_at = now()
where slug = 'restaurante-hacienda-de-letras';

update public.restaurant_locations
set name = 'Restaurante Hacienda de Letras Centro',
    description = 'Restaurante de Hacienda de Letras en el Centro de Aguascalientes, con reservación disponible desde la app.',
    full_address = 'Nieto 106, Zona Centro, 20000 Aguascalientes, Ags.',
    city = 'Aguascalientes',
    state = 'Aguascalientes',
    reservation_enabled = true,
    status = 'published',
    visible_in_app = true,
    visible_in_control = true,
    verification_status = 'verified',
    publish_at = null,
    unpublish_at = null,
    archived_at = null,
    deleted_at = null,
    metadata = (coalesce(metadata, '{}'::jsonb) - 'pendingFields')
      || jsonb_build_object(
        'coordinates', jsonb_build_array(-102.2965412, 21.8799798),
        'officialAddress', true,
        'translations', coalesce(metadata->'translations', '{}'::jsonb)
          || jsonb_build_object(
            'en-US', jsonb_build_object(
              'name', 'Hacienda de Letras Downtown Restaurant',
              'title', 'Hacienda de Letras Downtown Restaurant',
              'description', 'Hacienda de Letras restaurant in downtown Aguascalientes, with bookings available through the app.',
              'address', 'Nieto 106, Downtown, 20000 Aguascalientes, Aguascalientes'
            ),
            'en', jsonb_build_object(
              'name', 'Hacienda de Letras Downtown Restaurant',
              'title', 'Hacienda de Letras Downtown Restaurant',
              'description', 'Hacienda de Letras restaurant in downtown Aguascalientes, with bookings available through the app.',
              'address', 'Nieto 106, Downtown, 20000 Aguascalientes, Aguascalientes'
            )
          )
      ),
    updated_at = now()
where slug = 'restaurante-centro-aguascalientes';

commit;
