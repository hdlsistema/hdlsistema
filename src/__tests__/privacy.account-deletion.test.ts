import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { adminPrivacyClient, customerPrivacyClient, publicPrivacyClient } from '../services/privacy.service'

afterEach(() => {
  vi.restoreAllMocks()
})

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('eliminación de cuenta exigida por tiendas', () => {
  it('mantiene una ruta web pública con contenido, retención y confirmación explícita', () => {
    const router = readFileSync(resolve(__dirname, '../app/routes/AppRouter.tsx'), 'utf8')
    const page = readFileSync(resolve(__dirname, '../app/pages/public/AccountDeletionPage.tsx'), 'utf8')

    expect(router).toContain('path="/eliminar-cuenta" element={<AccountDeletionPage />}')
    expect(router).toContain('path="/eliminar-cuenta/confirmar" element={<AccountDeletionConfirmationPage />}')
    expect(page).toContain('Eliminar cuenta de Hacienda de Letras')
    expect(page).toContain('Correo asociado a la cuenta')
    expect(page).toContain('Nombre (opcional)')
    expect(page).toContain('Eliminar definitivamente mi cuenta')
    expect(page).toContain('obligación legal, fiscal, de seguridad o de prevención de fraude')
    expect(page).toContain('Confirma la eliminación definitiva')
    expect(page).toContain('Enviamos un correo de confirmación')
    expect(page).not.toMatch(/revisi[oó]n|rechazad|aprobaci[oó]n/i)
    expect(page).not.toMatch(/Supabase|service[_ -]?role|endpoint|API|Railway/i)
  })

  it('conserva el recorrido Perfil a Privacidad y cuenta a Eliminar mi cuenta en web app y Mobile real', () => {
    const profile = readFileSync(resolve(__dirname, '../app/pages/mobile/ProfileScreen.tsx'), 'utf8')
    const webRouter = readFileSync(resolve(__dirname, '../app/routes/AppRouter.tsx'), 'utf8')
    const mobileRouter = readFileSync(resolve(__dirname, '../mobile/MobileRouter.tsx'), 'utf8')
    const deletion = readFileSync(resolve(__dirname, '../app/pages/mobile/DeleteAccountScreen.tsx'), 'utf8')
    const confirmation = readFileSync(resolve(__dirname, '../app/pages/public/AccountDeletionConfirmationPage.tsx'), 'utf8')

    expect(profile).toContain("appPath('/privacidad-cuenta')")
    expect(webRouter).toContain('path="privacidad-cuenta"')
    expect(webRouter).toContain('path="eliminar-cuenta"')
    expect(webRouter).toContain('path="eliminar-cuenta/confirmar"')
    expect(mobileRouter).toContain('path="privacidad-cuenta"')
    expect(mobileRouter).toContain('path="eliminar-cuenta"')
    expect(mobileRouter).toContain('path="eliminar-cuenta/confirmar"')
    expect(deletion).toContain('El proceso quedará vinculado automáticamente a tu sesión y correo actual.')
    expect(deletion).toContain('Confirma la eliminación definitiva')
    expect(deletion).toContain('Revisa tu correo')
    expect(deletion).toContain('Confirmar eliminación de cuenta')
    expect(confirmation).toContain('Tu cuenta está en proceso de eliminación')
    expect(confirmation).toContain('no será posible iniciar nuevas sesiones')
  })

  it('registra la solicitud pública en el backend y no envía datos técnicos al navegador', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(jsonResponse({ ok: true, data: { accepted: true } }, 202))
    vi.stubGlobal('fetch', fetchSpy)

    await publicPrivacyClient.requestAccountDeletion({
      email: 'persona@example.com',
      name: 'Persona',
      confirmation: true,
      retentionAcknowledged: true,
      locale: 'es',
      companyWebsite: '',
    })

    expect(fetchSpy).toHaveBeenCalledWith(
      'http://localhost:3001/api/public/account-deletion-requests',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('persona@example.com'),
      }),
    )
    expect(JSON.stringify(fetchSpy.mock.calls)).not.toMatch(/supabase|service.role|provider/i)
  })

  it('usa sesión para Mobile y protege la operación administrativa', async () => {
    const fetchSpy = vi.fn().mockImplementation(() => Promise.resolve(
      jsonResponse({ ok: true, data: { id: 'req-1' }, duplicate: false }, 202),
    ))
    vi.stubGlobal('fetch', fetchSpy)

    await customerPrivacyClient.requestAccountDeletion('jwt-customer', {
      confirmation: true,
      retentionAcknowledged: true,
      locale: 'es',
    })
    await adminPrivacyClient.list('jwt-admin', { status: 'pending_processing' })
    await adminPrivacyClient.update('jwt-admin', 'req-1', { status: 'in_progress', adminNotes: 'Procesamiento iniciado' })
    await adminPrivacyClient.process('jwt-admin', 'req-1')

    expect(fetchSpy).toHaveBeenNthCalledWith(
      1,
      'http://localhost:3001/api/customer/account-deletion-requests',
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer jwt-customer' }) }),
    )
    expect(fetchSpy).toHaveBeenNthCalledWith(
      2,
      'http://localhost:3001/api/admin/account-deletion-requests?status=pending_processing',
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer jwt-admin' }) }),
    )
    expect(fetchSpy).toHaveBeenNthCalledWith(
      3,
      'http://localhost:3001/api/admin/account-deletion-requests/req-1',
      expect.objectContaining({ method: 'PATCH' }),
    )
    expect(fetchSpy).toHaveBeenNthCalledWith(
      4,
      'http://localhost:3001/api/admin/account-deletion-requests/req-1/process',
      expect.objectContaining({ method: 'POST' }),
    )
    expect(() => customerPrivacyClient.requestAccountDeletion(null, { confirmation: true, retentionAcknowledged: true })).toThrow()
    expect(() => adminPrivacyClient.list(null)).toThrow()
  })
})
