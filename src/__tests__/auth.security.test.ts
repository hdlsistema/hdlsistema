import { describe, expect, it, vi } from 'vitest'

const signUpMock = vi.fn()
const signInWithPasswordMock = vi.fn()
const signOutMock = vi.fn()
const resetPasswordForEmailMock = vi.fn()
const updateUserMock = vi.fn()
const resendMock = vi.fn()

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
    signUpMock.mockResolvedValueOnce({
      data: { user: { id: 'user-1' }, session: null },
      error: null,
    })

    const { signUpCustomer } = await import('../services/auth.service')

    await signUpCustomer({
      email: 'cliente.prueba@alqia.tech',
      password: 'Password123',
      firstName: 'Cliente',
      lastName: 'Prueba',
    })

    const payload = signUpMock.mock.calls[0][0]
    expect(payload.options.data).not.toHaveProperty('role')
    expect(payload.options.data).not.toHaveProperty('is_admin')
    expect(payload.options.data).not.toHaveProperty('permissions')
    expect(payload.options.data).not.toHaveProperty('service_role')
  })

  it('signUpCustomer envía la preferencia de idioma sin permisos administrativos', async () => {
    signUpMock.mockResolvedValueOnce({
      data: { user: { id: 'user-2' }, session: null },
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

    const payload = signUpMock.mock.calls.at(-1)?.[0]
    expect(payload.options.data.preferred_language).toBe('en')
    expect(payload.options.data).not.toHaveProperty('role')
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
