import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(__dirname, '..')

describe('persistencia elegible de sesión', () => {
  it('usa storage de auth configurable entre localStorage y sessionStorage', () => {
    const supabase = readFileSync(resolve(root, 'lib/supabase.ts'), 'utf8')

    expect(supabase).toContain('AUTH_PERSISTENCE_KEY')
    expect(supabase).toContain('window.localStorage')
    expect(supabase).toContain('window.sessionStorage')
    expect(supabase).toContain('authSessionStorage')
    expect(supabase).toContain('storage: authSessionStorage')
  })

  it('conecta Recordarme en login web y movil al inicio de sesion real', () => {
    const authPages = readFileSync(resolve(root, 'app/pages/public/AuthPages.tsx'), 'utf8')
    const mobileAuth = readFileSync(resolve(root, 'mobile/MobileAuthPages.tsx'), 'utf8')
    const authService = readFileSync(resolve(root, 'services/auth.service.ts'), 'utf8')

    expect(authPages).toContain('rememberSession')
    expect(authPages).toContain('Mantener sesión iniciada')
    expect(authPages).toContain('shouldRememberAuthSession')
    expect(mobileAuth).toContain("rememberSession: form.get('remember') === 'on'")
    expect(authService).toContain('setAuthSessionPersistence(options.rememberSession ?? true)')
  })
})
