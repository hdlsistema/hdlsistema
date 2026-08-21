import { supabaseAdminClient } from '../../config/supabase'
import type { UserContext } from '../operations/operationErrors'

export type ControlPermission = {
  code: string
  module: string
  page: string
  action: string
  label: string
  description?: string | null
  financial: boolean
  sortOrder: number
}

export const CONTROL_PERMISSION_CATALOG: ControlPermission[] = [
  { code: 'dashboard.view', module: 'Operación', page: 'Dashboard', action: 'Ver', label: 'Dashboard', financial: false, sortOrder: 10 },
  { code: 'reservations.view', module: 'Operación', page: 'Reservaciones', action: 'Ver', label: 'Reservaciones', financial: false, sortOrder: 20 },
  { code: 'reservations.manage', module: 'Operación', page: 'Reservaciones', action: 'Gestionar', label: 'Gestionar reservaciones', financial: false, sortOrder: 21 },
  { code: 'quotes.view', module: 'Operación', page: 'Cotizaciones', action: 'Ver', label: 'Cotizaciones', financial: false, sortOrder: 30 },
  { code: 'quotes.manage', module: 'Operación', page: 'Cotizaciones', action: 'Gestionar', label: 'Gestionar cotizaciones', financial: false, sortOrder: 31 },
  { code: 'orders.view', module: 'Operación', page: 'Órdenes', action: 'Ver', label: 'Órdenes sin importes', financial: false, sortOrder: 40 },
  { code: 'orders.manage', module: 'Operación', page: 'Órdenes', action: 'Gestionar', label: 'Operar órdenes', financial: false, sortOrder: 41 },
  { code: 'orders.financial', module: 'Operación', page: 'Órdenes', action: 'Finanzas', label: 'Importes de órdenes', financial: true, sortOrder: 42 },
  { code: 'availability.view', module: 'Operación', page: 'Disponibilidad', action: 'Ver', label: 'Disponibilidad', financial: false, sortOrder: 50 },
  { code: 'availability.manage', module: 'Operación', page: 'Disponibilidad', action: 'Gestionar', label: 'Gestionar disponibilidad', financial: false, sortOrder: 51 },
  { code: 'inventory.view', module: 'Operación', page: 'Inventario', action: 'Ver', label: 'Inventario', financial: false, sortOrder: 60 },
  { code: 'inventory.manage', module: 'Operación', page: 'Inventario', action: 'Gestionar', label: 'Gestionar inventario', financial: false, sortOrder: 61 },
  { code: 'logistics.view', module: 'Operación', page: 'Logística', action: 'Ver', label: 'Logística', financial: false, sortOrder: 70 },
  { code: 'logistics.manage', module: 'Operación', page: 'Logística', action: 'Gestionar', label: 'Gestionar logística', financial: false, sortOrder: 71 },
  { code: 'entries.view', module: 'Operación', page: 'Control de entradas', action: 'Ver', label: 'Control de entradas', financial: false, sortOrder: 80 },
  { code: 'entries.scan', module: 'Operación', page: 'Control de entradas', action: 'Escanear', label: 'Escanear QR', financial: false, sortOrder: 81 },
  { code: 'entries.reverse', module: 'Operación', page: 'Control de entradas', action: 'Revertir', label: 'Revertir check-in', financial: false, sortOrder: 82 },
  { code: 'entries.counts', module: 'Operación', page: 'Control de entradas', action: 'Acumulado', label: 'Acumulado de asistencia', financial: false, sortOrder: 83 },
  { code: 'customers.view', module: 'Comercial', page: 'Clientes', action: 'Ver', label: 'Clientes', financial: false, sortOrder: 90 },
  { code: 'customers.manage', module: 'Comercial', page: 'Clientes', action: 'Gestionar', label: 'Gestionar clientes', financial: false, sortOrder: 91 },
  { code: 'payments.view', module: 'Comercial', page: 'Pagos', action: 'Ver', label: 'Pagos', financial: true, sortOrder: 100 },
  { code: 'carts.view', module: 'Comercial', page: 'Carritos', action: 'Ver', label: 'Carritos', financial: false, sortOrder: 110 },
  { code: 'wineclub.view', module: 'Comercial', page: 'Wine Club', action: 'Ver', label: 'Wine Club', financial: false, sortOrder: 120 },
  { code: 'wineclub.manage', module: 'Comercial', page: 'Wine Club', action: 'Gestionar', label: 'Gestionar Wine Club', financial: false, sortOrder: 121 },
  { code: 'wineclub.financial', module: 'Comercial', page: 'Wine Club', action: 'Finanzas', label: 'Importes Wine Club', financial: true, sortOrder: 122 },
  { code: 'distributors.view', module: 'Comercial', page: 'Distribuidores', action: 'Ver', label: 'Distribuidores', financial: false, sortOrder: 130 },
  { code: 'distributors.manage', module: 'Comercial', page: 'Distribuidores', action: 'Gestionar', label: 'Gestionar distribuidores', financial: false, sortOrder: 131 },
  { code: 'distributors.financial', module: 'Comercial', page: 'Distribuidores', action: 'Finanzas', label: 'Importes distribuidores', financial: true, sortOrder: 132 },
  { code: 'content.wines.manage', module: 'Contenido', page: 'Vinos', action: 'Gestionar', label: 'Vinos', financial: false, sortOrder: 140 },
  { code: 'content.experiences.manage', module: 'Contenido', page: 'Experiencias', action: 'Gestionar', label: 'Experiencias', financial: false, sortOrder: 150 },
  { code: 'content.events.manage', module: 'Contenido', page: 'Eventos', action: 'Gestionar', label: 'Eventos', financial: false, sortOrder: 160 },
  { code: 'content.services.manage', module: 'Contenido', page: 'Servicios y sedes', action: 'Gestionar', label: 'Servicios y sedes', financial: false, sortOrder: 170 },
  { code: 'content.promotions.manage', module: 'Contenido', page: 'Promociones', action: 'Gestionar', label: 'Promociones', financial: false, sortOrder: 180 },
  { code: 'content.memberships.manage', module: 'Contenido', page: 'Membresías', action: 'Gestionar', label: 'Membresías', financial: false, sortOrder: 190 },
  { code: 'content.campaigns.manage', module: 'Contenido', page: 'Campañas', action: 'Gestionar', label: 'Campañas', financial: false, sortOrder: 200 },
  { code: 'reports.view', module: 'Administración', page: 'Reportes', action: 'Ver', label: 'Reportes financieros', financial: true, sortOrder: 210 },
  { code: 'activity.view', module: 'Administración', page: 'Actividad App', action: 'Ver', label: 'Actividad App', financial: false, sortOrder: 220 },
  { code: 'privacy.manage', module: 'Administración', page: 'Eliminación de cuentas', action: 'Gestionar', label: 'Eliminación de cuentas', financial: false, sortOrder: 230 },
  { code: 'settings.manage', module: 'Administración', page: 'Configuración', action: 'Gestionar', label: 'Configuración', financial: false, sortOrder: 240 },
  { code: 'users.manage', module: 'Administración', page: 'Usuarios y permisos', action: 'Gestionar', label: 'Usuarios y permisos', financial: false, sortOrder: 250 },
]

const catalogCodes = new Set(CONTROL_PERMISSION_CATALOG.map((item) => item.code))
const financialCodes = new Set(CONTROL_PERMISSION_CATALOG.filter((item) => item.financial).map((item) => item.code))

const ROLE_DEFAULTS: Record<string, string[]> = {
  super_admin: CONTROL_PERMISSION_CATALOG.map((item) => item.code),
  admin: CONTROL_PERMISSION_CATALOG.map((item) => item.code),
  operations: [
    'dashboard.view',
    'reservations.view',
    'reservations.manage',
    'quotes.view',
    'orders.view',
    'orders.manage',
    'availability.view',
    'availability.manage',
    'inventory.view',
    'inventory.manage',
    'logistics.view',
    'logistics.manage',
    'entries.view',
    'entries.scan',
    'entries.reverse',
    'entries.counts',
    'customers.view',
    'customers.manage',
    'carts.view',
    'distributors.view',
    'distributors.manage',
    'activity.view',
  ],
  marketing: [
    'dashboard.view',
    'quotes.view',
    'quotes.manage',
    'customers.view',
    'customers.manage',
    'wineclub.view',
    'content.wines.manage',
    'content.experiences.manage',
    'content.events.manage',
    'content.services.manage',
    'content.promotions.manage',
    'content.campaigns.manage',
    'activity.view',
  ],
  finance: ['dashboard.view', 'orders.view', 'customers.view', 'payments.view', 'reports.view', 'wineclub.view', 'distributors.view'],
  viewer: ['dashboard.view', 'reservations.view', 'quotes.view', 'orders.view', 'availability.view', 'inventory.view', 'logistics.view', 'entries.view', 'customers.view', 'carts.view', 'activity.view'],
}

function unique(values: string[]) {
  return [...new Set(values.filter((value) => catalogCodes.has(value)))]
}

export function normalizePermissionCodes(values: unknown, allowFinancial: boolean) {
  if (!Array.isArray(values)) return []
  return unique(values.filter((value): value is string => typeof value === 'string'))
    .filter((code) => allowFinancial || !financialCodes.has(code))
}

export function rolesGrantFinancialAccess(roles: string[] | undefined) {
  return Boolean(roles?.some((role) => role === 'super_admin' || role === 'admin'))
}

export async function userHasFinancialAccess(user: UserContext | { userId?: string; roles?: string[] }) {
  if (rolesGrantFinancialAccess(user.roles)) return true
  if (!user.userId) return false
  const result = await supabaseAdminClient
    .from('financial_access_grants')
    .select('user_id')
    .eq('user_id', user.userId)
    .is('revoked_at', null)
    .maybeSingle()
  return !result.error && Boolean(result.data)
}

export async function explicitUserPermissions(userId: string) {
  const result = await supabaseAdminClient
    .from('user_control_permissions')
    .select('permission_code')
    .eq('user_id', userId)
  if (result.error) return []
  return unique((result.data ?? []).map((row) => row.permission_code).filter(Boolean))
}

async function usesExplicitPermissionMode(userId?: string) {
  if (!userId) return false
  const { data, error } = await supabaseAdminClient.auth.admin.getUserById(userId)
  if (error || !data.user) return false
  return Boolean(data.user.app_metadata?.staff_account || data.user.app_metadata?.managed_password_locked)
}

export async function resolveControlAccess(user: UserContext) {
  const roles = user.roles ?? []
  const financialAccess = await userHasFinancialAccess(user)
  const explicitMode = rolesGrantFinancialAccess(roles) ? false : await usesExplicitPermissionMode(user.userId)
  const defaults = explicitMode ? [] : roles.flatMap((role) => ROLE_DEFAULTS[role] ?? [])
  const explicit = user.userId ? await explicitUserPermissions(user.userId) : []
  const permissions = unique([...defaults, ...explicit])
    .filter((code) => financialAccess || !financialCodes.has(code))
  return { permissions, financialAccess }
}

export function permissionCatalogForActor(financialAccess: boolean) {
  return CONTROL_PERMISSION_CATALOG
    .filter((permission) => financialAccess || !permission.financial)
    .sort((a, b) => a.sortOrder - b.sortOrder)
}

export function permissionIsFinancial(code: string) {
  return financialCodes.has(code)
}
