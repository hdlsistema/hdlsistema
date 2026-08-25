type HasPermission = (permission: string | string[]) => boolean

export type ControlEntryRoute = {
  to: string
  path: string
  permission: string
}

export const CONTROL_ENTRY_ROUTES: ControlEntryRoute[] = [
  { to: 'dashboard', path: '/control/dashboard', permission: 'dashboard.view' },
  { to: 'reservaciones', path: '/control/reservaciones', permission: 'reservations.view' },
  { to: 'cotizaciones', path: '/control/cotizaciones', permission: 'quotes.view' },
  { to: 'ordenes', path: '/control/ordenes', permission: 'orders.view' },
  { to: 'disponibilidad', path: '/control/disponibilidad', permission: 'availability.view' },
  { to: 'inventario', path: '/control/inventario', permission: 'inventory.view' },
  { to: 'logistica', path: '/control/logistica', permission: 'logistics.view' },
  { to: 'entradas', path: '/control/entradas', permission: 'entries.view' },
  { to: 'clientes', path: '/control/clientes', permission: 'customers.view' },
  { to: 'pagos', path: '/control/pagos', permission: 'payments.view' },
  { to: 'carritos', path: '/control/carritos', permission: 'carts.view' },
  { to: 'wine-club', path: '/control/wine-club', permission: 'wineclub.view' },
  { to: 'distribuidores', path: '/control/distribuidores', permission: 'distributors.view' },
  { to: 'vinos', path: '/control/vinos', permission: 'content.wines.manage' },
  { to: 'experiencias', path: '/control/experiencias', permission: 'content.experiences.manage' },
  { to: 'eventos-magnos', path: '/control/eventos-magnos', permission: 'content.events.manage' },
  { to: 'servicios', path: '/control/servicios', permission: 'content.services.manage' },
  { to: 'promociones', path: '/control/promociones', permission: 'content.promotions.manage' },
  { to: 'membresias', path: '/control/membresias', permission: 'content.memberships.manage' },
  { to: 'campanas', path: '/control/campanas', permission: 'content.campaigns.manage' },
  { to: 'reportes', path: '/control/reportes', permission: 'reports.view' },
  { to: 'actividad', path: '/control/actividad', permission: 'activity.view' },
  { to: 'eliminacion-cuentas', path: '/control/eliminacion-cuentas', permission: 'privacy.manage' },
  { to: 'usuarios-permisos', path: '/control/usuarios-permisos', permission: 'users.manage' },
  { to: 'configuracion', path: '/control/configuracion', permission: 'settings.manage' },
]

export function firstPermittedControlRoute(hasPermission: HasPermission) {
  return CONTROL_ENTRY_ROUTES.find((route) => hasPermission(route.permission)) ?? null
}
