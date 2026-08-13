begin;

do $$
begin
  if (select count(*) from public.cabin_packages where deleted_at is null and slug in ('paquete-cabana', 'paquete-vino', 'paquete-romantico')) <> 3 then
    raise exception 'Se esperaban los tres paquetes de cabaña existentes; no se aplicaron cambios.';
  end if;
end $$;

update public.cabin_packages
set
  name = 'Paquete Cabaña',
  subtitle = 'Una noche de hospedaje para dos personas',
  description = 'Una estancia entre viñedos para dos personas, con desayuno y un kit de bienvenida preparado por Hacienda de Letras.',
  price = 1900,
  currency = 'MXN',
  price_unit = 'pareja',
  min_guests = 2,
  max_guests = 2,
  nights = 1,
  inclusions = '["1 noche de hospedaje", "Desayuno incluido", "Kit de bienvenida", "Botella de vino", "Copas", "Café", "Botellas de agua"]'::jsonb,
  metadata = metadata || '{"bookingMode":"REQUEST_CONFIRMATION","commercialCategory":"Hospedaje","priceAudience":"pareja","breakfastIncluded":true}'::jsonb,
  updated_at = now()
where slug = 'paquete-cabana' and deleted_at is null;

update public.cabin_packages
set
  name = 'Paquete Vino',
  subtitle = 'Hospedaje, recorrido y cata para dos personas',
  description = 'Una noche para dos personas con desayuno, kit de bienvenida, recorrido por los viñedos y cata de vinos de Hacienda de Letras.',
  price = 2500,
  currency = 'MXN',
  price_unit = 'pareja',
  min_guests = 2,
  max_guests = 2,
  nights = 1,
  inclusions = '["1 noche de hospedaje", "Desayuno incluido", "Kit de bienvenida", "Botella de vino", "Copas", "Café", "Botellas de agua", "Recorrido por los viñedos", "Cata de vinos"]'::jsonb,
  metadata = metadata || '{"bookingMode":"REQUEST_CONFIRMATION","commercialCategory":"Hospedaje","priceAudience":"pareja","breakfastIncluded":true}'::jsonb,
  updated_at = now()
where slug = 'paquete-vino' and deleted_at is null;

update public.cabin_packages
set
  name = 'Paquete Romántico',
  subtitle = 'Hospedaje y cena romántica para dos personas',
  description = 'Una noche para dos personas con desayuno, cena romántica de tres tiempos y kit de bienvenida de Hacienda de Letras.',
  price = 5100,
  currency = 'MXN',
  price_unit = 'pareja',
  min_guests = 2,
  max_guests = 2,
  nights = 1,
  inclusions = '["1 noche de hospedaje", "Desayuno incluido", "Cena romántica de 3 tiempos", "Kit de bienvenida", "Botella de vino", "Copas", "Café", "Botellas de agua"]'::jsonb,
  metadata = metadata || '{"bookingMode":"REQUEST_CONFIRMATION","commercialCategory":"Hospedaje","priceAudience":"pareja","breakfastIncluded":true}'::jsonb,
  updated_at = now()
where slug = 'paquete-romantico' and deleted_at is null;

-- Estos dos registros fueron creados por la validación editorial 4B. Se conservan
-- como historial, pero dejan de presentarse como contenido de prueba y señalan el
-- módulo real desde el que se administra cada paquete de hospedaje.
with cabin_references(id, package_slug, title, subtitle, short_description, description) as (
  values
    (
      '753b9438-0f4b-42c4-82b0-ee112db34479'::uuid,
      'paquete-cabana',
      'Paquete Cabaña',
      'Hospedaje para dos personas',
      'Referencia interna del paquete de hospedaje.',
      'Este paquete se administra desde Servicios, sedes y hospedaje, en Paquetes de cabaña.'
    ),
    (
      '6263fcbe-d04c-4539-8c75-1b21c5315da6'::uuid,
      'paquete-vino',
      'Paquete Vino',
      'Hospedaje con recorrido y cata',
      'Referencia interna del paquete de hospedaje con vino.',
      'Este paquete se administra desde Servicios, sedes y hospedaje, en Paquetes de cabaña.'
    )
)
update public.experiences e
set
  title = r.title,
  subtitle = r.subtitle,
  short_description = r.short_description,
  description = r.description,
  category = 'Hospedaje · Cabañas',
  status = 'archived',
  visible_in_app = false,
  archived_at = coalesce(e.archived_at, now()),
  metadata = coalesce(e.metadata, '{}'::jsonb) || jsonb_build_object(
    'historicalReference', true,
    'managedIn', 'Servicios, sedes y hospedaje / Paquetes de cabaña',
    'cabinPackageSlug', r.package_slug
  ),
  updated_at = now()
from cabin_references r
where e.id = r.id and e.deleted_at is null;

do $$
begin
  if exists (
    select 1
    from public.cabin_packages
    where slug in ('paquete-cabana', 'paquete-vino', 'paquete-romantico')
      and (
        deleted_at is not null
        or status <> 'published'
        or visible_in_app is not true
        or price_unit <> 'pareja'
        or min_guests <> 2
        or max_guests <> 2
        or nights <> 1
      )
  ) then
    raise exception 'La verificación final de paquetes de cabaña no fue satisfactoria.';
  end if;
end $$;

select slug, name, subtitle, price, price_unit, nights, inclusions, status, visible_in_app
from public.cabin_packages
where deleted_at is null and slug in ('paquete-cabana', 'paquete-vino', 'paquete-romantico')
order by sort_order;

commit;
