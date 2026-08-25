begin;

create table if not exists public.control_scope_catalog (
  code text primary key,
  label text not null,
  scope_type text not null default 'site',
  description text,
  sort_order integer not null default 0,
  active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint control_scope_catalog_type_valid
    check (scope_type in ('site', 'estate', 'restaurant', 'boutique', 'lodging'))
);

create table if not exists public.user_control_scopes (
  user_id uuid not null references auth.users(id) on delete cascade,
  scope_code text not null references public.control_scope_catalog(code) on delete cascade,
  assigned_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (user_id, scope_code)
);

create index if not exists idx_user_control_scopes_scope_code
  on public.user_control_scopes(scope_code);

drop trigger if exists set_control_scope_catalog_updated_at on public.control_scope_catalog;
create trigger set_control_scope_catalog_updated_at
before update on public.control_scope_catalog
for each row execute function public.set_updated_at();

insert into public.control_scope_catalog (code, label, scope_type, description, sort_order, active, metadata)
values
  (
    'all_sites',
    'Todas las sedes',
    'site',
    'Acceso operativo a Hacienda, restaurantes y puntos de servicio.',
    0,
    true,
    jsonb_build_object('covers', jsonb_build_array('hacienda_teodoro', 'restaurante_teodoro', 'restaurante_nieto'))
  ),
  (
    'hacienda_teodoro',
    'Hacienda en Teodoro',
    'estate',
    'Viñedo, bodega, boutique y operación general en Teodoro Olivares.',
    10,
    true,
    jsonb_build_object(
      'locationKind', 'estate',
      'mapSlug', 'vinedos-bodegas-hacienda-de-letras',
      'address', 'Teodoro Olivares S/N, 20668 San Luis de Letras, Ags.'
    )
  ),
  (
    'restaurante_teodoro',
    'Restaurante Teodoro',
    'restaurant',
    'Restaurante dentro de Hacienda de Letras en Teodoro Olivares.',
    20,
    true,
    jsonb_build_object(
      'locationKind', 'restaurant_estate',
      'restaurantSlug', 'restaurante-hacienda-de-letras',
      'mapSlug', 'restaurante-hacienda-de-letras',
      'address', 'Teodoro Olivares S/N, 20668 San Luis de Letras, Ags.'
    )
  ),
  (
    'restaurante_nieto',
    'Restaurante Nieto',
    'restaurant',
    'Restaurante Hacienda de Letras en Calle Nieto 106.',
    30,
    true,
    jsonb_build_object(
      'locationKind', 'restaurant_center',
      'restaurantSlug', 'restaurante-centro-aguascalientes',
      'mapSlug', 'restaurante-centro-aguascalientes',
      'address', 'Calle Nieto #106, Zona Centro, Aguascalientes, Ags.',
      'legacyName', 'Restaurante Centro'
    )
  )
on conflict (code) do update
set label = excluded.label,
    scope_type = excluded.scope_type,
    description = excluded.description,
    sort_order = excluded.sort_order,
    active = excluded.active,
    metadata = excluded.metadata,
    updated_at = now();

alter table public.control_scope_catalog enable row level security;
alter table public.user_control_scopes enable row level security;

drop policy if exists control_scope_catalog_admin_read on public.control_scope_catalog;
create policy control_scope_catalog_admin_read on public.control_scope_catalog
for select to authenticated
using (public.has_any_role(array['super_admin','admin','operations','marketing','finance','viewer']));

drop policy if exists user_control_scopes_own_read on public.user_control_scopes;
create policy user_control_scopes_own_read on public.user_control_scopes
for select to authenticated
using (
  user_id = auth.uid()
  or public.has_any_role(array['super_admin','admin'])
);

update public.restaurant_locations
set name = 'Restaurante Hacienda de Letras Nieto',
    alias = 'Restaurante Nieto',
    description = 'Restaurante de Hacienda de Letras en Calle Nieto 106, con reservación disponible desde la app.',
    full_address = 'Calle Nieto #106, Zona Centro, Aguascalientes, Ags.',
    city = 'Aguascalientes',
    state = 'Aguascalientes',
    metadata = (coalesce(metadata, '{}'::jsonb) - 'pendingFields')
      || jsonb_build_object(
        'displayName', 'Restaurante Nieto',
        'legacyName', 'Restaurante Centro',
        'coordinates', jsonb_build_array(-102.2965412, 21.8799798),
        'officialAddress', true,
        'translations', coalesce(metadata->'translations', '{}'::jsonb)
          || jsonb_build_object(
            'en-US', jsonb_build_object(
              'name', 'Hacienda de Letras Nieto Restaurant',
              'title', 'Hacienda de Letras Nieto Restaurant',
              'description', 'Hacienda de Letras restaurant on Calle Nieto 106, with bookings available through the app.',
              'address', 'Calle Nieto #106, Downtown, Aguascalientes'
            ),
            'en', jsonb_build_object(
              'name', 'Hacienda de Letras Nieto Restaurant',
              'title', 'Hacienda de Letras Nieto Restaurant',
              'description', 'Hacienda de Letras restaurant on Calle Nieto 106, with bookings available through the app.',
              'address', 'Calle Nieto #106, Downtown, Aguascalientes'
            )
          )
      ),
    updated_at = now()
where slug = 'restaurante-centro-aguascalientes';

update public.map_pois
set name = 'Restaurante Hacienda de Letras Nieto',
    description = 'Restaurante de Hacienda de Letras en Calle Nieto 106.',
    address = 'Calle Nieto #106, Zona Centro, Aguascalientes, Ags.',
    search_keywords = array['restaurante','nieto','calle nieto','zona centro','hacienda de letras','aguascalientes'],
    metadata = coalesce(metadata, '{}'::jsonb)
      || jsonb_build_object(
        'displayName', 'Restaurante Nieto',
        'legacyName', 'Restaurante Centro',
        'location_kind', 'restaurant_center',
        'coordinateSource', 'verified_address_2026_08_13'
      ),
    updated_at = now()
where slug = 'restaurante-centro-aguascalientes';

update public.events
set subtitle = replace(coalesce(subtitle, ''), 'Restaurante Centro', 'Restaurante Nieto'),
    description = replace(coalesce(description, ''), 'Restaurante Centro', 'Restaurante Nieto'),
    short_description = replace(coalesce(short_description, ''), 'Restaurante Centro', 'Restaurante Nieto'),
    venue = replace(coalesce(venue, ''), 'Restaurante Centro', 'Restaurante Nieto'),
    metadata = coalesce(metadata, '{}'::jsonb)
      || jsonb_build_object(
        'venue_label', 'Restaurante Nieto',
        'legacyVenueLabel', 'Restaurante Centro'
      ),
    updated_at = now()
where slug = 'atardeceres-de-salsa-restaurante-centro-2026'
   or metadata->>'location_kind' = 'restaurant_center'
   or venue ilike '%Restaurante Centro%'
   or subtitle ilike '%Restaurante Centro%'
   or short_description ilike '%Restaurante Centro%'
   or description ilike '%Restaurante Centro%';

update public.event_images
set alt_text = replace(coalesce(alt_text, ''), 'Restaurante Hacienda de Letras Centro', 'Restaurante Hacienda de Letras Nieto')
where alt_text ilike '%Restaurante Hacienda de Letras Centro%';

update public.inventory_locations
set name = 'Restaurante Nieto',
    code = 'REST-NIETO',
    address = 'Calle Nieto #106, Zona Centro, Aguascalientes, Ags.',
    metadata = coalesce(metadata, '{}'::jsonb)
      || jsonb_build_object(
        'operationalCategory', 'restaurante',
        'displayName', 'Restaurante Nieto',
        'legacyName', 'Restaurante Centro',
        'locationKind', 'restaurant_center'
      ),
    updated_at = now()
where name = 'Restaurante Centro'
   or code = 'REST-CENTRO'
   or metadata->>'legacyName' = 'Restaurante Centro';

commit;
