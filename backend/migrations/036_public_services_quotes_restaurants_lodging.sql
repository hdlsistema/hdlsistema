begin;

alter table public.reservations add column if not exists cabin_package_id uuid;
alter table public.reservations add column if not exists restaurant_location_id uuid;
alter table public.reservations add column if not exists reservation_date date;
alter table public.reservations add column if not exists reservation_time time;
alter table public.reservations add column if not exists check_in date;
alter table public.reservations add column if not exists check_out date;
alter table public.reservations add column if not exists occasion text;
alter table public.experiences add column if not exists category text;

create table if not exists public.cabin_packages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  subtitle text,
  description text,
  price numeric(12,2) not null default 0,
  currency text not null default 'MXN',
  price_unit text not null default 'pareja',
  min_guests integer not null default 2,
  max_guests integer not null default 2,
  nights integer not null default 1,
  inclusions jsonb not null default '[]'::jsonb,
  status public.content_status not null default 'draft',
  visible_in_app boolean not null default false,
  visible_in_control boolean not null default true,
  verification_status text not null default 'verified',
  cover_image_url text,
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  publish_at timestamptz,
  unpublish_at timestamptz,
  archived_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cabin_packages_price_non_negative check (price >= 0),
  constraint cabin_packages_guests_valid check (min_guests > 0 and max_guests >= min_guests),
  constraint cabin_packages_nights_valid check (nights > 0),
  constraint cabin_packages_verification_status_valid check (verification_status in ('verified', 'pending_client_confirmation')),
  constraint cabin_packages_publication_window_valid check (unpublish_at is null or publish_at is null or unpublish_at > publish_at)
);

create table if not exists public.restaurant_locations (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  alias text,
  description text,
  full_address text,
  city text,
  state text,
  phone text,
  hours jsonb not null default '{}'::jsonb,
  reservation_enabled boolean not null default true,
  status public.content_status not null default 'draft',
  visible_in_app boolean not null default false,
  visible_in_control boolean not null default true,
  verification_status text not null default 'pending_client_confirmation',
  cover_image_url text,
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  publish_at timestamptz,
  unpublish_at timestamptz,
  archived_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint restaurant_locations_verification_status_valid check (verification_status in ('verified', 'pending_client_confirmation')),
  constraint restaurant_locations_publication_window_valid check (unpublish_at is null or publish_at is null or unpublish_at > publish_at)
);

create table if not exists public.venue_spaces (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  capacity integer not null,
  dimensions text not null,
  description text not null,
  status public.content_status not null default 'draft',
  visible_in_app boolean not null default false,
  visible_in_control boolean not null default true,
  verification_status text not null default 'verified',
  cover_image_url text,
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  publish_at timestamptz,
  unpublish_at timestamptz,
  archived_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint venue_spaces_capacity_positive check (capacity > 0),
  constraint venue_spaces_verification_status_valid check (verification_status in ('verified', 'pending_client_confirmation')),
  constraint venue_spaces_publication_window_valid check (unpublish_at is null or publish_at is null or unpublish_at > publish_at)
);

create table if not exists public.quote_requests (
  id uuid primary key default gen_random_uuid(),
  quote_number text not null unique,
  customer_id uuid references public.customers(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  event_category text not null,
  event_type text not null,
  preferred_date date,
  alternative_date date,
  preferred_start_time time,
  preferred_end_time time,
  guest_count integer not null,
  venue_space_id uuid references public.venue_spaces(id) on delete set null,
  venue_space_name text,
  food_required text not null default 'advice',
  food_type text,
  wine_required text not null default 'advice',
  wine_option text,
  requested_services text[] not null default array[]::text[],
  contact_first_name text not null,
  contact_last_name text not null,
  contact_email citext not null,
  contact_phone text not null,
  company_name text,
  notes text,
  status text not null default 'new',
  source text not null default 'mobile_app',
  assigned_to uuid references auth.users(id) on delete set null,
  admin_notes text,
  contacted_at timestamptz,
  quoted_at timestamptz,
  closed_at timestamptz,
  idempotency_key text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint quote_requests_guest_count_positive check (guest_count > 0),
  constraint quote_requests_status_valid check (status in ('new', 'contacted', 'in_progress', 'quoted', 'won', 'lost', 'cancelled')),
  constraint quote_requests_food_required_valid check (food_required in ('yes', 'no', 'advice')),
  constraint quote_requests_wine_required_valid check (wine_required in ('yes', 'no', 'advice'))
);

create unique index if not exists idx_quote_requests_user_idempotency_key
on public.quote_requests(user_id, idempotency_key)
where idempotency_key is not null;

create index if not exists idx_quote_requests_status_created on public.quote_requests(status, created_at desc);
create index if not exists idx_quote_requests_customer_created on public.quote_requests(customer_id, created_at desc);
create index if not exists idx_quote_requests_event_type on public.quote_requests(event_type);
create index if not exists idx_reservations_type_created on public.reservations(reservation_type, created_at desc);
create index if not exists idx_reservations_cabin_package on public.reservations(cabin_package_id);
create index if not exists idx_reservations_restaurant_location on public.reservations(restaurant_location_id);
create index if not exists idx_cabin_packages_publication on public.cabin_packages(status, visible_in_app, publish_at, unpublish_at) where deleted_at is null;
create index if not exists idx_restaurant_locations_publication on public.restaurant_locations(status, visible_in_app, publish_at, unpublish_at) where deleted_at is null;
create index if not exists idx_venue_spaces_publication on public.venue_spaces(status, visible_in_app, publish_at, unpublish_at) where deleted_at is null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'reservations_cabin_package_id_fkey') then
    alter table public.reservations
      add constraint reservations_cabin_package_id_fkey
      foreign key (cabin_package_id) references public.cabin_packages(id) on delete set null;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'reservations_restaurant_location_id_fkey') then
    alter table public.reservations
      add constraint reservations_restaurant_location_id_fkey
      foreign key (restaurant_location_id) references public.restaurant_locations(id) on delete set null;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'set_cabin_packages_updated_at'
  ) then
    create trigger set_cabin_packages_updated_at
    before update on public.cabin_packages
    for each row execute function public.set_updated_at();
  end if;

  if not exists (
    select 1 from pg_trigger where tgname = 'set_restaurant_locations_updated_at'
  ) then
    create trigger set_restaurant_locations_updated_at
    before update on public.restaurant_locations
    for each row execute function public.set_updated_at();
  end if;

  if not exists (
    select 1 from pg_trigger where tgname = 'set_venue_spaces_updated_at'
  ) then
    create trigger set_venue_spaces_updated_at
    before update on public.venue_spaces
    for each row execute function public.set_updated_at();
  end if;

  if not exists (
    select 1 from pg_trigger where tgname = 'set_quote_requests_updated_at'
  ) then
    create trigger set_quote_requests_updated_at
    before update on public.quote_requests
    for each row execute function public.set_updated_at();
  end if;
end $$;

alter table public.cabin_packages enable row level security;
alter table public.restaurant_locations enable row level security;
alter table public.venue_spaces enable row level security;
alter table public.quote_requests enable row level security;

drop policy if exists cabin_packages_public_read on public.cabin_packages;
create policy cabin_packages_public_read on public.cabin_packages
for select to anon, authenticated using (
  public.is_content_live(status::text, visible_in_app, publish_at, unpublish_at, archived_at, deleted_at)
);

drop policy if exists restaurant_locations_public_read on public.restaurant_locations;
create policy restaurant_locations_public_read on public.restaurant_locations
for select to anon, authenticated using (
  public.is_content_live(status::text, visible_in_app, publish_at, unpublish_at, archived_at, deleted_at)
);

drop policy if exists venue_spaces_public_read on public.venue_spaces;
create policy venue_spaces_public_read on public.venue_spaces
for select to anon, authenticated using (
  public.is_content_live(status::text, visible_in_app, publish_at, unpublish_at, archived_at, deleted_at)
);

drop policy if exists cabin_packages_admin_all on public.cabin_packages;
create policy cabin_packages_admin_all on public.cabin_packages
for all to authenticated using (
  public.can_operate_reservations(auth.uid(), array['super_admin','admin','operations','marketing','viewer'])
) with check (
  public.can_operate_reservations(auth.uid(), array['super_admin','admin','operations','marketing'])
);

drop policy if exists restaurant_locations_admin_all on public.restaurant_locations;
create policy restaurant_locations_admin_all on public.restaurant_locations
for all to authenticated using (
  public.can_operate_reservations(auth.uid(), array['super_admin','admin','operations','marketing','viewer'])
) with check (
  public.can_operate_reservations(auth.uid(), array['super_admin','admin','operations','marketing'])
);

drop policy if exists venue_spaces_admin_all on public.venue_spaces;
create policy venue_spaces_admin_all on public.venue_spaces
for all to authenticated using (
  public.can_operate_reservations(auth.uid(), array['super_admin','admin','operations','marketing','viewer'])
) with check (
  public.can_operate_reservations(auth.uid(), array['super_admin','admin','operations','marketing'])
);

drop policy if exists quote_requests_customer_read on public.quote_requests;
create policy quote_requests_customer_read on public.quote_requests
for select to authenticated using (
  customer_id = public.current_customer_id()
  or public.can_operate_reservations(auth.uid(), array['super_admin','admin','operations','marketing','viewer'])
);

drop policy if exists quote_requests_customer_insert on public.quote_requests;
create policy quote_requests_customer_insert on public.quote_requests
for insert to authenticated with check (
  customer_id = public.current_customer_id()
);

drop policy if exists quote_requests_admin_all on public.quote_requests;
create policy quote_requests_admin_all on public.quote_requests
for all to authenticated using (
  public.can_operate_reservations(auth.uid(), array['super_admin','admin','operations','marketing','viewer'])
) with check (
  public.can_operate_reservations(auth.uid(), array['super_admin','admin','operations','marketing'])
);

insert into public.cabin_packages (
  slug, name, subtitle, description, price, price_unit, min_guests, max_guests, nights,
  inclusions, status, visible_in_app, visible_in_control, verification_status, sort_order, metadata
)
values
  (
    'paquete-cabana',
    'Paquete Cabaña',
    'Una noche para dos personas',
    'Hospedaje en cabaña con desayuno y kit de bienvenida.',
    1900,
    'pareja',
    2,
    2,
    1,
    '["1 noche", "Desayuno", "Kit de bienvenida con vino, copas, café y agua"]'::jsonb,
    'published',
    true,
    true,
    'verified',
    10,
    jsonb_build_object('source', 'client_call_2026_08_11', 'bookingMode', 'REQUEST_CONFIRMATION')
  ),
  (
    'paquete-vino',
    'Paquete Vino',
    'Hospedaje con experiencia de vino',
    'Una noche para dos personas con tour, degustación, desayuno y kit de bienvenida.',
    2500,
    'pareja',
    2,
    2,
    1,
    '["1 noche", "Kit de bienvenida", "Recorrido", "Degustación de vino", "Desayuno"]'::jsonb,
    'published',
    true,
    true,
    'verified',
    20,
    jsonb_build_object('source', 'client_call_2026_08_11', 'bookingMode', 'REQUEST_CONFIRMATION')
  ),
  (
    'paquete-romantico',
    'Paquete Romántico',
    'Hospedaje con cena romántica',
    'Una noche para dos personas con cena romántica de tres tiempos, kit de bienvenida y desayuno.',
    5100,
    'pareja',
    2,
    2,
    1,
    '["1 noche", "Cena romántica de 3 tiempos", "Kit de bienvenida", "Desayuno"]'::jsonb,
    'published',
    true,
    true,
    'verified',
    30,
    jsonb_build_object('source', 'client_call_2026_08_11', 'bookingMode', 'REQUEST_CONFIRMATION')
  )
on conflict (slug) do update set
  name = excluded.name,
  subtitle = excluded.subtitle,
  description = excluded.description,
  price = excluded.price,
  price_unit = excluded.price_unit,
  min_guests = excluded.min_guests,
  max_guests = excluded.max_guests,
  nights = excluded.nights,
  inclusions = excluded.inclusions,
  status = excluded.status,
  visible_in_app = excluded.visible_in_app,
  visible_in_control = excluded.visible_in_control,
  verification_status = excluded.verification_status,
  sort_order = excluded.sort_order,
  metadata = public.cabin_packages.metadata || excluded.metadata,
  updated_at = now();

insert into public.restaurant_locations (
  slug, name, alias, description, full_address, city, state, hours,
  reservation_enabled, status, visible_in_app, visible_in_control, verification_status, sort_order, metadata
)
values
  (
    'restaurante-hacienda-de-letras',
    'Restaurante Hacienda de Letras',
    'El Greco',
    'Restaurante dentro de Hacienda de Letras con reservación disponible desde la app.',
    'Teodoro Olivares S/N, San Luis de Letras, Pabellón de Arteaga, Aguascalientes',
    'Pabellón de Arteaga',
    'Aguascalientes',
    jsonb_build_object(
      'mondayFriday', '11:00-18:00',
      'saturdaySunday', '11:00-18:30'
    ),
    true,
    'published',
    true,
    true,
    'verified',
    10,
    jsonb_build_object('source', 'client_call_2026_08_11', 'bookingMode', 'REQUEST_CONFIRMATION')
  ),
  (
    'restaurante-centro-aguascalientes',
    'Restaurante Centro Aguascalientes',
    null,
    'Restaurante en Centro Aguascalientes pendiente de confirmación operativa por Hacienda de Letras.',
    null,
    'Aguascalientes',
    'Aguascalientes',
    '{}'::jsonb,
    false,
    'draft',
    false,
    true,
    'pending_client_confirmation',
    20,
    jsonb_build_object('source', 'client_call_2026_08_11', 'pendingFields', array['address','hours','phone','photos','capacity','rules'])
  )
on conflict (slug) do update set
  name = excluded.name,
  alias = excluded.alias,
  description = excluded.description,
  full_address = excluded.full_address,
  city = excluded.city,
  state = excluded.state,
  hours = excluded.hours,
  reservation_enabled = excluded.reservation_enabled,
  status = excluded.status,
  visible_in_app = excluded.visible_in_app,
  visible_in_control = excluded.visible_in_control,
  verification_status = excluded.verification_status,
  sort_order = excluded.sort_order,
  metadata = public.restaurant_locations.metadata || excluded.metadata,
  updated_at = now();

insert into public.venue_spaces (
  slug, name, capacity, dimensions, description, status, visible_in_app, visible_in_control,
  verification_status, sort_order, metadata
)
values
  ('jardin-lateral-bugambilias', 'Jardín Lateral "Bugambilias"', 450, '9m x 30m', 'Jardín lateral para eventos sociales y empresariales con capacidad aproximada para 450 personas.', 'published', true, true, 'verified', 10, jsonb_build_object('source', 'client_call_2026_08_11')),
  ('jardin-central-entre-vinedos', 'Jardín Central "Entre Viñedos"', 400, '9m x 55m', 'Espacio central entre viñedos para eventos con capacidad aproximada para 400 personas.', 'published', true, true, 'verified', 20, jsonb_build_object('source', 'client_call_2026_08_11')),
  ('jardin-nogales', 'Jardín "Nogales"', 900, '20m x 60m', 'Jardín amplio para celebraciones y eventos de gran formato con capacidad aproximada para 900 personas.', 'published', true, true, 'verified', 30, jsonb_build_object('source', 'client_call_2026_08_11')),
  ('cava', 'Cava', 80, '6m x 20m', 'Cava para reuniones y experiencias privadas con capacidad aproximada para 80 personas.', 'published', true, true, 'verified', 40, jsonb_build_object('source', 'client_call_2026_08_11')),
  ('jardin-principal-entrada', 'Jardín Principal "Entrada"', 1200, '25m x 60m', 'Jardín principal de entrada para eventos de gran capacidad, hasta 1200 personas aproximadamente.', 'published', true, true, 'verified', 50, jsonb_build_object('source', 'client_call_2026_08_11'))
on conflict (slug) do update set
  name = excluded.name,
  capacity = excluded.capacity,
  dimensions = excluded.dimensions,
  description = excluded.description,
  status = excluded.status,
  visible_in_app = excluded.visible_in_app,
  visible_in_control = excluded.visible_in_control,
  verification_status = excluded.verification_status,
  sort_order = excluded.sort_order,
  metadata = public.venue_spaces.metadata || excluded.metadata,
  updated_at = now();

insert into public.experiences (
  slug, title, subtitle, description, short_description, duration_minutes, base_price,
  min_people, max_people, capacity, location, category, featured, status, visible_in_app, visible_in_control,
  sort_order, metadata
)
values
  (
    'cata-de-vinos',
    'Cata de vinos',
    'Cata guiada en Hacienda de Letras',
    'Experiencia de cata de vinos para conocer el carácter de Hacienda de Letras. Requiere confirmación operativa de horario y disponibilidad.',
    'Cata guiada de vinos en Hacienda de Letras.',
    50,
    300,
    1,
    20,
    20,
    'Hacienda de Letras',
    'Catas',
    true,
    'published',
    true,
    true,
    10,
    jsonb_build_object('source', 'client_call_2026_08_11', 'category', 'Catas', 'bookingMode', 'REQUEST_CONFIRMATION')
  ),
  (
    'recorrido-por-los-vinedos',
    'Recorrido por los viñedos',
    'Recorrido con una copa incluida',
    'Recorrido por los viñedos de Hacienda de Letras. Incluye una copa. Los horarios publicados deben confirmarse operativamente.',
    'Recorrido por viñedos con una copa incluida.',
    30,
    200,
    1,
    25,
    25,
    'Viñedos Hacienda de Letras',
    'Recorridos',
    true,
    'published',
    true,
    true,
    20,
    jsonb_build_object('source', 'client_call_2026_08_11', 'category', 'Recorridos', 'includes', '1 copa', 'bookingMode', 'REQUEST_CONFIRMATION')
  ),
  (
    'degustacion-de-5-vinos',
    'Degustación de 5 vinos',
    'Degustación de cinco etiquetas',
    'Degustación de 5 vinos de Hacienda de Letras, una onza por vino. Las etiquetas se confirman según disponibilidad.',
    'Degustación de 5 vinos, una onza por vino.',
    50,
    200,
    1,
    20,
    20,
    'Hacienda de Letras',
    'Catas',
    true,
    'published',
    true,
    true,
    30,
    jsonb_build_object('source', 'client_call_2026_08_11', 'category', 'Catas', 'serving', '1 oz por vino', 'bookingMode', 'REQUEST_CONFIRMATION')
  ),
  (
    'picnic-entre-vinedos',
    'Picnic entre viñedos',
    'Picnic para dos personas',
    'Picnic entre viñedos para dos personas. Incluye espacio, decoración, alimentos y vino. Requiere confirmación operativa.',
    'Picnic para dos entre viñedos.',
    120,
    2000,
    2,
    2,
    2,
    'Viñedos Hacienda de Letras',
    'Gastronomía',
    true,
    'published',
    true,
    true,
    40,
    jsonb_build_object('source', 'client_call_2026_08_11', 'category', 'Gastronomía', 'suggestedTime', '15:00-17:00', 'bookingMode', 'REQUEST_CONFIRMATION')
  ),
  (
    'cena-romantica-cava',
    'Cena romántica en la Cava',
    'Cena para dos personas en la cava',
    'Cena romántica en la Cava para dos personas. Incluye cava, velas, pétalos, rosas, cena de tres tiempos y botella de vino de la casa. No incluye hospedaje.',
    'Cena romántica en la cava para dos personas.',
    120,
    4000,
    2,
    2,
    2,
    'Cava Hacienda de Letras',
    'Gastronomía',
    true,
    'published',
    true,
    true,
    50,
    jsonb_build_object('source', 'client_call_2026_08_11', 'category', 'Gastronomía', 'bookingMode', 'REQUEST_CONFIRMATION', 'notCabinPackage', true)
  )
on conflict (slug) do update set
  title = excluded.title,
  subtitle = excluded.subtitle,
  description = excluded.description,
  short_description = excluded.short_description,
  duration_minutes = excluded.duration_minutes,
  base_price = excluded.base_price,
  min_people = excluded.min_people,
  max_people = excluded.max_people,
  capacity = excluded.capacity,
  location = excluded.location,
  category = excluded.category,
  featured = excluded.featured,
  status = excluded.status,
  visible_in_app = excluded.visible_in_app,
  visible_in_control = excluded.visible_in_control,
  sort_order = excluded.sort_order,
  metadata = public.experiences.metadata || excluded.metadata,
  updated_at = now();

commit;
