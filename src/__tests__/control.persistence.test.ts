import { readFileSync, readdirSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

function filesBelow(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = resolve(directory, entry)
    return statSync(path).isDirectory() ? filesBelow(path) : [path]
  })
}

const root = resolve(__dirname, '..')

describe('persistencia del Centro de Control', () => {
  it('no guarda datos operativos en almacenamiento del navegador', () => {
    const controlSources = filesBelow(resolve(root, 'app/pages/control'))
      .filter((path) => /\.(ts|tsx)$/.test(path))
      .map((path) => readFileSync(path, 'utf8'))
      .join('\n')
    const preferences = readFileSync(resolve(root, 'app/context/AppPreferencesContext.tsx'), 'utf8')

    expect(controlSources).not.toMatch(/localStorage|sessionStorage|indexedDB/)
    expect(preferences).not.toMatch(/localStorage|sessionStorage|indexedDB/)
  })

  it.each([
    ['dashboard', 'dashboard.service.ts', 'dashboard/dashboard.service.ts'],
    ['disponibilidad', 'operations.service.ts', 'availability/availability.service.ts'],
    ['reservaciones', 'operations.service.ts', 'reservations/reservations.service.ts'],
    ['servicios y cotizaciones', 'commercial.service.ts', 'commercial/commercial.service.ts'],
    ['contenido editorial', 'content.service.ts', 'content/content.service.ts'],
    ['clientes', 'customers.service.ts', 'customers/customers.service.ts'],
    ['pedidos y pagos', 'commerce.service.ts', 'orders/orders.service.ts'],
    ['check-in', 'commerce.service.ts', 'checkin/checkin.service.ts'],
    ['membresias e inventario', 'phase7e.service.ts', 'inventory/inventory.service.ts'],
    ['hospedaje', 'lodging.service.ts', 'lodging/lodging.service.ts'],
    ['actividad y carritos', 'appActivityAdmin.service.ts', 'activity/activity.service.ts'],
    ['privacidad', 'privacy.service.ts', 'privacy/privacy.service.ts'],
    ['configuracion', 'settings.service.ts', 'settings/settings.service.ts'],
  ])('%s usa API autenticada y backend Supabase', (_module, frontendFile, backendFile) => {
    const frontend = readFileSync(resolve(root, 'services', frontendFile), 'utf8')
    const backend = readFileSync(resolve(root, '../backend/src/modules', backendFile), 'utf8')

    expect(frontend).toContain('apiFetch')
    expect(frontend).toMatch(/\/api\/(admin|customer|public)\//)
    expect(backend).toMatch(/supabaseAdminClient|createSupabaseUserRequestClient/)
    expect(backend).toMatch(/\.from\(|\.rpc\(/)
  })

  it('los archivos del Centro se cargan a Supabase Storage', () => {
    const upload = readFileSync(resolve(root, 'app/components/control/ControlStorageUpload.tsx'), 'utf8')
    expect(upload).toContain('supabase.storage.from(bucket).upload')
    expect(upload).not.toMatch(/localStorage|sessionStorage|indexedDB/)
  })
})
