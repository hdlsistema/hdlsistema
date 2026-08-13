import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const landing = readFileSync(new URL('../app/pages/public/LandingPage.tsx', import.meta.url), 'utf8')
const auth = readFileSync(new URL('../app/pages/public/AuthPages.tsx', import.meta.url), 'utf8')
const router = readFileSync(new URL('../app/routes/AppRouter.tsx', import.meta.url), 'utf8')

describe('entrada pública al Centro de Control', () => {
  it('usa la portada original y presenta una bienvenida operativa compacta', () => {
    expect(landing).toContain('/hacienda-portada-landing.webp')
    expect(landing).toContain('Acceso al Centro de Control')
    expect(landing).toContain('Política de Privacidad')
    expect(landing).toContain('Eliminar cuenta')
    expect(landing).not.toContain('Crear cuenta')
  })

  it('presenta acceso administrativo sobre cristal sin alta pública', () => {
    expect(auth).toContain('/fondo-login.webp')
    expect(auth).toContain('-scale-x-100')
    expect(auth).toContain('Ingresar al Centro de Control')
    expect(router).toContain('<Route path="/registro" element={<Navigate to="/login" replace />} />')
  })
})
