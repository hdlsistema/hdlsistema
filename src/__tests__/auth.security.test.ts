import { describe, expect, it, vi } from 'vitest'

const signUpMock = vi.fn()
const signInWithPasswordMock = vi.fn()
const signOutMock = vi.fn()
const resetPasswordForEmailMock = vi.fn()
const updateUserMock = vi.fn()
const resendMock = vi.fn()
const apiFetchMock = vi.fn()

vi.mock('../services/api', () => ({
  API_BASE: 'http://localhost:3000',
  apiFetch: apiFetchMock,
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: {
      signUp: signUpMock,
      signInWithPassword: signInWithPasswordMock,
      signOut: signOutMock,
      resetPasswordForEmail: resetPasswordForEmailMock,
      updateUser: updateUserMock,
      resend: resendMock,
      getSession: vi.fn(),
      getUser: vi.fn(),
      refreshSession: vi.fn(),
    },
    from: vi.fn(),
  })),
}))

describe('auth.service security', () => {
  it('signUpCustomer no envia roles ni permisos administrativos', async () => {
    apiFetchMock.mockResolvedValueOnce({ ok: true, data: { userId: 'user-1', emailConfirmed: true } })
    signInWithPasswordMock.mockResolvedValueOnce({
      data: { user: { id: 'user-1' }, session: { access_token: 'safe-session' } },
      error: null,
    })

    const { signUpCustomer } = await import('../services/auth.service')

    await signUpCustomer({
      email: 'cliente.prueba@alqia.tech',
      password: 'Password123',
      firstName: 'Cliente',
      lastName: 'Prueba',
    })

    const payload = JSON.parse(String(apiFetchMock.mock.calls[0][1].body))
    expect(payload).not.toHaveProperty('role')
    expect(payload).not.toHaveProperty('is_admin')
    expect(payload).not.toHaveProperty('permissions')
    expect(payload).not.toHaveProperty('service_role')
    expect(signInWithPasswordMock).toHaveBeenCalledWith({ email: 'cliente.prueba@alqia.tech', password: 'Password123' })
  })

  it('signUpCustomer envía la preferencia de idioma sin permisos administrativos', async () => {
    apiFetchMock.mockResolvedValueOnce({ ok: true, data: { userId: 'user-2', emailConfirmed: true } })
    signInWithPasswordMock.mockResolvedValueOnce({
      data: { user: { id: 'user-2' }, session: { access_token: 'safe-session' } },
      error: null,
    })

    const { signUpCustomer } = await import('../services/auth.service')

    await signUpCustomer({
      email: 'cliente.english@alqia.tech',
      password: 'Password123',
      firstName: 'Cliente',
      lastName: 'English',
      preferredLanguage: 'en',
    })

    const payload = JSON.parse(String(apiFetchMock.mock.calls.at(-1)?.[1].body))
    expect(payload.preferredLanguage).toBe('en')
    expect(payload).not.toHaveProperty('role')
  })

  it('resetPassword usa redirect seguro configurado', async () => {
    resetPasswordForEmailMock.mockResolvedValueOnce({ error: null })
    const { resetPassword } = await import('../services/auth.service')

    await resetPassword('cliente.prueba@alqia.tech')

    expect(resetPasswordForEmailMock.mock.calls[0][1].redirectTo).toBe(
      'http://localhost:5173/reset-password',
    )
  })
})
