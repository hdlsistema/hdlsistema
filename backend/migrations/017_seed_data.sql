begin;

insert into public.roles (code, name, description)
values
  ('super_admin', 'Super Admin', 'Acceso total administrativo'),
  ('admin', 'Admin', 'Administracion general'),
  ('operations', 'Operaciones', 'Operacion de reservas, eventos e inventario'),
  ('marketing', 'Marketing', 'Campanas, promociones y contenido'),
  ('finance', 'Finanzas', 'Ordenes, pagos y reportes financieros'),
  ('viewer', 'Viewer', 'Lectura administrativa limitada'),
  ('customer', 'Cliente', 'Usuario final de app y portal')
on conflict (code) do update
set name = excluded.name,
    description = excluded.description;

insert into public.system_settings (key, value, description)
values
  ('currency', '"MXN"'::jsonb, 'Moneda base'),
  ('timezone', '"America/Mexico_City"'::jsonb, 'Zona horaria base'),
  ('language', '"es"'::jsonb, 'Idioma base'),
  ('sommelier_daily_limit', '10'::jsonb, 'Limite diario seed/test'),
  ('sommelier_monthly_limit', '3000'::jsonb, 'Limite mensual seed/test')
on conflict (key) do update
set value = excluded.value,
    description = excluded.description,
    updated_at = now();

insert into public.wine_categories (name, slug, description, sort_order, active)
values
  ('Tintos', 'tintos', 'Categoria seed/test de vinos tintos', 1, true),
  ('Blancos', 'blancos', 'Categoria seed/test de vinos blancos', 2, true),
  ('Rosados', 'rosados', 'Categoria seed/test de vinos rosados', 3, true)
on conflict (slug) do update
set name = excluded.name,
    description = excluded.description,
    sort_order = excluded.sort_order,
    active = excluded.active;

with categories as (
  select id, slug from public.wine_categories
)
insert into public.wines (
  sku, slug, name, subtitle, description, category_id, vintage, grape_variety,
  alcohol_percentage, volume_ml, origin, tasting_notes, pairing_notes,
  serving_temperature, price, stock_quantity, featured, status, cover_image_url
)
values
  (
    'HDL-SEED-TRES-MOSQUETEROS', 'tres-mosqueteros-seed', 'Tres Mosqueteros Seed',
    'Vino de prueba', 'Dato seed/test para catalogo inicial',
    (select id from categories where slug = 'tintos'), 2022, 'Blend tinto',
    13.50, 750, 'Hacienda de Letras', 'Fruta roja y especias',
    'Carnes, quesos maduros', '16-18 C', 420.00, 36, true, 'published', null
  ),
  (
    'HDL-SEED-MUSCAT', 'muscat-seed', 'Muscat Seed',
    'Vino de prueba', 'Dato seed/test para catalogo inicial',
    (select id from categories where slug = 'blancos'), 2023, 'Muscat',
    12.00, 750, 'Hacienda de Letras', 'Floral y fresco',
    'Postres, entradas ligeras', '8-10 C', 360.00, 24, true, 'published', null
  ),
  (
    'HDL-SEED-RUBY', 'ruby-seed', 'Ruby Seed',
    'Vino de prueba', 'Dato seed/test para catalogo inicial',
    (select id from categories where slug = 'rosados'), 2023, 'Rosado',
    12.50, 750, 'Hacienda de Letras', 'Fruta fresca',
    'Mariscos, ensaladas', '8-10 C', 390.00, 30, false, 'published', null
  )
on conflict (sku) do update
set name = excluded.name,
    subtitle = excluded.subtitle,
    description = excluded.description,
    category_id = excluded.category_id,
    price = excluded.price,
    status = excluded.status,
    updated_at = now();

insert into public.experiences (
  slug, title, subtitle, description, short_description, duration_minutes,
  base_price, min_people, max_people, capacity, location, featured, status
)
values
  ('cata-hacienda-seed', 'Cata Hacienda Seed', 'Experiencia de prueba', 'Dato seed/test de experiencia', 'Cata guiada seed/test', 90, 650.00, 2, 12, 24, 'Cava', true, 'published'),
  ('picnic-vinedo-seed', 'Picnic Vinedo Seed', 'Experiencia de prueba', 'Dato seed/test de experiencia', 'Picnic seed/test', 120, 850.00, 2, 8, 16, 'Vinedo', true, 'published')
on conflict (slug) do update
set title = excluded.title,
    base_price = excluded.base_price,
    status = excluded.status,
    updated_at = now();

insert into public.experience_slots (experience_id, start_at, end_at, capacity, status, notes)
select e.id, now() + interval '7 days', now() + interval '7 days 2 hours', e.capacity, 'published', 'Slot seed/test'
from public.experiences e
where e.slug in ('cata-hacienda-seed', 'picnic-vinedo-seed')
  and not exists (
    select 1 from public.experience_slots s
    where s.experience_id = e.id
      and s.notes = 'Slot seed/test'
  );

insert into public.events (
  slug, title, subtitle, description, short_description, venue, start_at, end_at,
  capacity, featured, status, visible_in_app, sales_enabled
)
values
  ('vendimia-seed', 'Vendimia Seed', 'Evento de prueba', 'Dato seed/test de evento', 'Vendimia seed/test', 'Hacienda de Letras', now() + interval '30 days', now() + interval '30 days 5 hours', 120, true, 'published', true, true),
  ('leyendas-seed', 'Tarde de Leyendas Seed', 'Evento de prueba', 'Dato seed/test de evento', 'Leyendas seed/test', 'Hacienda de Letras', now() + interval '45 days', now() + interval '45 days 4 hours', 80, false, 'published', true, true)
on conflict (slug) do update
set title = excluded.title,
    status = excluded.status,
    visible_in_app = excluded.visible_in_app,
    sales_enabled = excluded.sales_enabled,
    updated_at = now();

insert into public.event_ticket_types (event_id, name, description, price, capacity, active)
select e.id, 'General Seed', 'Boleto seed/test', 750.00, e.capacity, true
from public.events e
where e.slug in ('vendimia-seed', 'leyendas-seed')
  and not exists (
    select 1 from public.event_ticket_types t
    where t.event_id = e.id and t.name = 'General Seed'
  );

insert into public.promotions (
  code, name, description, promotion_type, discount_type, discount_value,
  minimum_amount, maximum_discount, starts_at, ends_at, usage_limit,
  usage_per_customer, target_segment, status
)
values
  ('SEED10', 'Seed 10', 'Promocion seed/test', 'coupon', 'percent', 10, 500, 250, now() - interval '1 day', now() + interval '90 days', 100, 1, 'seed', 'published'),
  ('CLUBSEED', 'Club Seed', 'Promocion seed/test', 'coupon', 'fixed', 150, 900, 150, now() - interval '1 day', now() + interval '90 days', 50, 1, 'seed', 'published')
on conflict (code) do update
set name = excluded.name,
    description = excluded.description,
    status = excluded.status,
    updated_at = now();

insert into public.membership_plans (
  code, name, description, price, billing_period, benefits, daily_sommelier_limit, active
)
values
  ('SEED-CLUB-BASE', 'Club Base Seed', 'Plan seed/test', 499.00, 'monthly', '{"benefits":["descuentos","sommelier"]}'::jsonb, 10, true),
  ('SEED-CLUB-PREMIUM', 'Club Premium Seed', 'Plan seed/test', 999.00, 'monthly', '{"benefits":["descuentos","eventos","sommelier"]}'::jsonb, 25, true)
on conflict (code) do update
set name = excluded.name,
    price = excluded.price,
    benefits = excluded.benefits,
    active = excluded.active,
    updated_at = now();

insert into public.inventory_locations (name, type, address, active)
values ('Cava Principal Seed', 'warehouse', 'Hacienda de Letras - seed/test', true)
on conflict (name) do update
set type = excluded.type,
    address = excluded.address,
    active = excluded.active;

insert into public.sommelier_knowledge (namespace, title, content, source_type, metadata, active)
select 'seed', 'Guia base seed', 'Contenido seed/test para Sommelier ALQIA. No integra OpenAI.', 'seed', '{"seed":true}'::jsonb, true
where not exists (
  select 1 from public.sommelier_knowledge
  where namespace = 'seed' and title = 'Guia base seed'
);

commit;
