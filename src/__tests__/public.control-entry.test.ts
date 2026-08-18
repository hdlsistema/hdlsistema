import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const landing = readFileSync(new URL('../app/pages/public/LandingPage.tsx', import.meta.url), 'utf8')
const auth = readFileSync(new URL('../app/pages/public/AuthPages.tsx', import.meta.url), 'utf8')
const router = readFileSync(new URL('../app/routes/AppRouter.tsx', import.meta.url), 'utf8')
const controlLayout = readFileSync(new URL('../app/layout/ControlLayout.tsx', import.meta.url), 'utf8')
const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8')

describe('entrada pública al Centro de Control', () => {
  it('usa la portada restaurada en alta resolución y presenta una bienvenida operativa compacta', () => {
    expect(landing).toContain('/hacienda-portada-landing-hd.png')
    expect(landing).toContain('Acceso al Centro de Control')
    expect(landing).toContain('Política de Privacidad')
    expect(landing).toContain('Eliminar cuenta')
    expect(landing).not.toContain('Crear cuenta')
  })

  it('presenta acceso administrativo sobre cristal sin alta pública', () => {
    expect(auth).toContain('/fondo-login-hd.png')
    expect(auth).not.toContain('<LanguageSelector')
    expect(auth).toContain('Ingresar al Centro de Control')
    expect(router).toContain('<Route path="/registro" element={<Navigate to="/login" replace />} />')
  })

  it('mantiene la identidad pública compatible con OAuth como Hacienda de Letras', () => {
    expect(html).toContain('<title>Hacienda de Letras</title>')
    expect(html).toContain('name="application-name" content="Hacienda de Letras"')
    expect(html).toContain('href="/favicon-control-center.png?v=20260818"')
    expect(landing).toContain("document.title = 'Hacienda de Letras'")
    expect(landing).not.toContain("document.title = 'Hacienda de Letras · Centro de Control'")
  })

  it('no muestra la vista cliente de la App en el menú administrativo', () => {
    expect(controlLayout).not.toContain("to: '/control/app'")
    expect(controlLayout).not.toContain("t('control.appView')")
  })
})
