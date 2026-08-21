begin;

create table if not exists public.control_permissions (
  code text primary key,
  module text not null,
  page text not null,
  action text not null,
  label text not null,
  description text,
  financial boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.user_control_permissions (
  user_id uuid not null references auth.users(id) on delete cascade,
  permission_code text not null references public.control_permissions(code) on delete cascade,
  granted_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (user_id, permission_code)
);

create table if not exists public.financial_access_grants (
  user_id uuid primary key references auth.users(id) on delete cascade,
  granted_by uuid references auth.users(id) on delete set null,
  reason text,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  revoked_by uuid references auth.users(id) on delete set null,
  revocation_reason text
);

create index if not exists idx_user_control_permissions_code on public.user_control_permissions(permission_code);
create index if not exists idx_financial_access_active on public.financial_access_grants(user_id) where revoked_at is null;

insert into public.control_permissions (code, module, page, action, label, description, financial, sort_order)
values
  ('dashboard.view', 'Operación', 'Dashboard', 'Ver', 'Dashboard', 'Indicadores operativos generales sin detalle financiero reservado.', false, 10),
  ('reservations.view', 'Operación', 'Reservaciones', 'Ver', 'Reservaciones', 'Consultar reservaciones y expedientes operativos.', false, 20),
  ('reservations.manage', 'Operación', 'Reservaciones', 'Gestionar', 'Gestionar reservaciones', 'Confirmar, cancelar o reprogramar reservaciones.', false, 21),
  ('quotes.view', 'Operación', 'Cotizaciones', 'Ver', 'Cotizaciones', 'Consultar solicitudes y cotizaciones.', false, 30),
  ('quotes.manage', 'Operación', 'Cotizaciones', 'Gestionar', 'Gestionar cotizaciones', 'Crear, editar y dar seguimiento a cotizaciones.', false, 31),
  ('orders.view', 'Operación', 'Órdenes', 'Ver', 'Órdenes sin importes', 'Consultar pedidos, partidas, dirección y estado sin información financiera.', false, 40),
  ('orders.manage', 'Operación', 'Órdenes', 'Gestionar', 'Operar órdenes', 'Preparar, enviar y entregar pedidos sin acceso financiero.', false, 41),
  ('orders.financial', 'Operación', 'Órdenes', 'Finanzas', 'Importes de órdenes', 'Ver subtotales, pagos, reembolsos e importes de pedidos.', true, 42),
  ('availability.view', 'Operación', 'Disponibilidad', 'Ver', 'Disponibilidad', 'Consultar calendario, cupos y bloqueos.', false, 50),
  ('availability.manage', 'Operación', 'Disponibilidad', 'Gestionar', 'Gestionar disponibilidad', 'Crear horarios, cupos, bloqueos y operación hotelera.', false, 51),
  ('inventory.view', 'Operación', 'Inventario', 'Ver', 'Inventario', 'Consultar inventario y existencias.', false, 60),
  ('inventory.manage', 'Operación', 'Inventario', 'Gestionar', 'Gestionar inventario', 'Registrar productos, ajustes y movimientos.', false, 61),
  ('logistics.view', 'Operación', 'Logística', 'Ver', 'Logística', 'Consultar envíos y guías.', false, 70),
  ('logistics.manage', 'Operación', 'Logística', 'Gestionar', 'Gestionar logística', 'Preparar, rastrear y confirmar entregas.', false, 71),
  ('entries.view', 'Operación', 'Control de entradas', 'Ver', 'Control de entradas', 'Consultar boletos y check-ins.', false, 80),
  ('entries.scan', 'Operación', 'Control de entradas', 'Escanear', 'Escanear QR', 'Validar y consumir boletos QR de entrada.', false, 81),
  ('entries.reverse', 'Operación', 'Control de entradas', 'Revertir', 'Revertir check-in', 'Revertir asistencias con motivo operativo.', false, 82),
  ('entries.counts', 'Operación', 'Control de entradas', 'Acumulado', 'Acumulado de asistencia', 'Ver conteos operativos de lecturas por evento o boleto sin dinero.', false, 83),
  ('customers.view', 'Comercial', 'Clientes', 'Ver', 'Clientes', 'Consultar clientes y actividad limitada.', false, 90),
  ('customers.manage', 'Comercial', 'Clientes', 'Gestionar', 'Gestionar clientes', 'Editar clientes, notas, etiquetas y consentimiento.', false, 91),
  ('payments.view', 'Comercial', 'Pagos', 'Ver', 'Pagos', 'Consultar pagos, recibos, reembolsos y referencias financieras.', true, 100),
  ('carts.view', 'Comercial', 'Carritos', 'Ver', 'Carritos', 'Consultar carritos y actividad comercial sin pagos.', false, 110),
  ('wineclub.view', 'Comercial', 'Wine Club', 'Ver', 'Wine Club', 'Consultar membresías sin detalle financiero reservado.', false, 120),
  ('wineclub.manage', 'Comercial', 'Wine Club', 'Gestionar', 'Gestionar Wine Club', 'Crear y operar membresías y beneficios.', false, 121),
  ('wineclub.financial', 'Comercial', 'Wine Club', 'Finanzas', 'Importes Wine Club', 'Ver importes o pagos asociados a membresías.', true, 122),
  ('distributors.view', 'Comercial', 'Distribuidores', 'Ver', 'Distribuidores', 'Consultar distribuidores y pedidos.', false, 130),
  ('distributors.manage', 'Comercial', 'Distribuidores', 'Gestionar', 'Gestionar distribuidores', 'Crear distribuidores, contactos y pedidos.', false, 131),
  ('distributors.financial', 'Comercial', 'Distribuidores', 'Finanzas', 'Importes distribuidores', 'Ver importes de pedidos de distribución.', true, 132),
  ('content.wines.manage', 'Contenido', 'Vinos', 'Gestionar', 'Vinos', 'Crear y publicar vinos visibles en la app.', false, 140),
  ('content.experiences.manage', 'Contenido', 'Experiencias', 'Gestionar', 'Experiencias', 'Crear y publicar experiencias.', false, 150),
  ('content.events.manage', 'Contenido', 'Eventos', 'Gestionar', 'Eventos', 'Crear eventos y tipos de boleto.', false, 160),
  ('content.services.manage', 'Contenido', 'Servicios y sedes', 'Gestionar', 'Servicios y sedes', 'Gestionar cabañas, restaurantes y espacios.', false, 170),
  ('content.promotions.manage', 'Contenido', 'Promociones', 'Gestionar', 'Promociones', 'Gestionar promociones.', false, 180),
  ('content.memberships.manage', 'Contenido', 'Membresías', 'Gestionar', 'Membresías', 'Gestionar planes de membresía.', false, 190),
  ('content.campaigns.manage', 'Contenido', 'Campañas', 'Gestionar', 'Campañas', 'Gestionar campañas y comunicación.', false, 200),
  ('reports.view', 'Administración', 'Reportes', 'Ver', 'Reportes financieros', 'Consultar reportes con datos financieros.', true, 210),
  ('activity.view', 'Administración', 'Actividad App', 'Ver', 'Actividad App', 'Consultar trazabilidad operativa de la app.', false, 220),
  ('privacy.manage', 'Administración', 'Eliminación de cuentas', 'Gestionar', 'Eliminación de cuentas', 'Atender solicitudes de privacidad y eliminación.', false, 230),
  ('settings.manage', 'Administración', 'Configuración', 'Gestionar', 'Configuración', 'Gestionar preferencias operativas.', false, 240),
  ('users.manage', 'Administración', 'Usuarios y permisos', 'Gestionar', 'Usuarios y permisos', 'Crear staff, credenciales y permisos.', false, 250)
on conflict (code) do update
set module = excluded.module,
    page = excluded.page,
    action = excluded.action,
    label = excluded.label,
    description = excluded.description,
    financial = excluded.financial,
    sort_order = excluded.sort_order;

insert into public.financial_access_grants (user_id, reason)
select distinct u.id, 'Propietario autorizado por migracion 063'
from auth.users u
left join public.profiles p on p.id = u.id
where (
  lower(coalesce(p.display_name, '')) like '%patricia%garibay%'
  or lower(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')) like '%patricia%garibay%'
  or lower(coalesce(u.email, '')) like '%pcgaribay%'
  or lower(coalesce(u.email, '')) like '%patricia%garibay%'
  or lower(coalesce(p.display_name, '')) like '%carlos%aleman%'
  or lower(coalesce(p.display_name, '')) like '%carlos%alemán%'
  or lower(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')) like '%carlos%aleman%'
  or lower(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')) like '%carlos%alemán%'
  or lower(coalesce(p.display_name, '')) like '%carlos%salas%'
  or lower(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')) like '%carlos%salas%'
)
on conflict (user_id) do update
set revoked_at = null,
    revoked_by = null,
    revocation_reason = null,
    reason = excluded.reason;

alter table public.control_permissions enable row level security;
alter table public.user_control_permissions enable row level security;
alter table public.financial_access_grants enable row level security;

drop policy if exists control_permissions_admin_read on public.control_permissions;
create policy control_permissions_admin_read on public.control_permissions
for select to authenticated
using (public.has_any_role(array['super_admin','admin','operations','marketing','finance','viewer']));

drop policy if exists user_control_permissions_own_read on public.user_control_permissions;
create policy user_control_permissions_own_read on public.user_control_permissions
for select to authenticated
using (
  user_id = auth.uid()
  or public.has_any_role(array['super_admin','admin'])
);

drop policy if exists financial_access_grants_own_read on public.financial_access_grants;
create policy financial_access_grants_own_read on public.financial_access_grants
for select to authenticated
using (
  user_id = auth.uid()
  or public.has_any_role(array['super_admin','admin'])
);

commit;
