import { useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, User } from 'lucide-react'
import { useAuth } from '../../../contexts/AuthContext'
import {
  resendVerification,
  resetPassword,
  signUpCustomer,
  updatePassword,
  type AuthServiceError,
} from '../../../services/auth.service'
import { useAppPreferences } from '../../context/AppPreferencesContext'
import { translateErrorCode, type AppLanguage } from '../../i18n'
import { LanguageSelector } from '../../components/shared/LanguageSelector'

function getErrorMessage(error: unknown, language: AppLanguage) {
  if (error && typeof error === 'object' && 'code' in error) {
    return translateErrorCode(language, String((error as AuthServiceError).code), (error as AuthServiceError).message)
  }
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as AuthServiceError).message)
  }
  return translateErrorCode(language, 'auth_error')
}

function safeRedirect(path: unknown, fallback: string) {
  if (typeof path !== 'string') return fallback
  if (!path.startsWith('/') || path.startsWith('//')) return fallback
  return path
}

function AuthShell({
  eyebrow,
  title,
  note,
  children,
}: {
  eyebrow: string
  title: string
  note: string
  children: ReactNode
}) {
  return (
    <div className="min-h-screen bg-[#fffaf3] px-5 py-10 text-[#4f0f1f]">
      <div className="fixed right-5 top-5 z-10">
        <LanguageSelector />
      </div>
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-[520px] flex-col justify-center">
        <Link to="/" className="mx-auto mb-8 block">
          <img src="/Logo-HDL-2.svg" alt="Hacienda de Letras" className="h-20 w-auto" />
        </Link>
        <section className="rounded-[2rem] border border-[#dccab5] bg-white p-6 shadow-[0_24px_80px_rgba(80,28,28,0.13)] md:p-9">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#b48a55]">
            {eyebrow}
          </p>
          <h1 className="mt-3 text-[36px] leading-tight">{title}</h1>
          <p className="mt-3 text-[13px] leading-6 text-[#7f6a59]">{note}</p>
          {children}
        </section>
      </div>
    </div>
  )
}

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { signIn, roles, isAuthenticated, isAdmin } = useAuth()
  const { t, language } = useAppPreferences()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const appMode = location.pathname.startsWith('/app/')
  const registerPath = appMode ? '/app/registro' : '/registro'
  const recoverPath = appMode ? '/app/recuperar' : '/recuperar'

  const destination = useMemo(() => {
    const from = (location.state as { from?: string } | null)?.from
    if (from) return safeRedirect(from, '/app/home')
    if (!appMode && roles.length && isAdmin) return '/control/dashboard'
    return '/app/home'
  }, [appMode, isAdmin, location.state, roles.length])

  if (isAuthenticated && roles.length) return <Navigate to={destination} replace />

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (loading) return
    setError('')
    setLoading(true)
    const form = new FormData(event.currentTarget)
    try {
      const nextRoles = await signIn(String(form.get('email') ?? ''), String(form.get('password') ?? ''))
      const adminRole = nextRoles.some((role) => role !== 'customer')
      navigate(!appMode && adminRole ? '/control/dashboard' : destination, { replace: true })
    } catch (err) {
      setError(getErrorMessage(err, language))
    } finally {
      setLoading(false)
    }
  }

  return (
      <AuthShell
      eyebrow={t('auth.secureAccess')}
      title={t('auth.login')}
      note={t('auth.loginNote')}
    >
      <form className="mt-7 space-y-4" onSubmit={submit}>
        <Field icon={<Mail size={17} />} label={t('auth.email')} name="email" type="email" />
        <PasswordField show={showPassword} setShow={setShowPassword} />
        <Link to={recoverPath} className="block text-[12px] font-semibold text-[#681126]">
          {t('auth.forgotPassword')}
        </Link>
        {error ? <p className="text-[12px] text-[#9f1239]">{error}</p> : null}
        <SubmitButton loading={loading}>{t('auth.login')}</SubmitButton>
      </form>
      <p className="mt-6 text-center text-[12px] text-[#7f6a59]">
        {t('auth.noAccount')} <Link className="font-bold text-[#681126]" to={registerPath}>{t('auth.createAccount')}</Link>
      </p>
    </AuthShell>
  )
}

export function RegisterPage() {
  const location = useLocation()
  const { t, language } = useAppPreferences()
  const [error, setError] = useState('')
  const [successEmail, setSuccessEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const appMode = location.pathname.startsWith('/app/')
  const loginPath = appMode ? '/app/login' : '/login'

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (loading) return
    setError('')
    const form = new FormData(event.currentTarget)
    const password = String(form.get('password') ?? '')
    const confirmPassword = String(form.get('confirmPassword') ?? '')
    const email = String(form.get('email') ?? '').trim().toLowerCase()

    if (password.length < 8) {
      setError(t('auth.passwordMin'))
      return
    }
    if (password !== confirmPassword) {
      setError(t('auth.passwordsMismatch'))
      return
    }
    if (form.get('terms') !== 'on') {
      setError(t('auth.termsRequired'))
      return
    }

    setLoading(true)
    try {
      await signUpCustomer({
        email,
        password,
        firstName: String(form.get('firstName') ?? ''),
        lastName: String(form.get('lastName') ?? ''),
        phone: String(form.get('phone') ?? ''),
        preferredLanguage: language,
      })
      setSuccessEmail(email)
    } catch (err) {
      setError(getErrorMessage(err, language))
    } finally {
      setLoading(false)
    }
  }

  if (successEmail) {
    return (
      <AuthShell
        eyebrow={t('auth.verifyEmail')}
        title={t('auth.accountCreated')}
        note={t('auth.verifyNote')}
      >
        <button
          type="button"
          onClick={() => resendVerification(successEmail)}
          className="mt-7 inline-flex min-h-[50px] w-full items-center justify-center rounded-full border border-[#681126] px-6 text-[13px] font-bold text-[#681126]"
        >
          {t('auth.resendVerification')}
        </button>
        <Link
          to={loginPath}
          className="mt-3 inline-flex min-h-[50px] w-full items-center justify-center rounded-full bg-[#681126] px-6 text-[13px] font-bold text-white"
        >
          {t('auth.goToLogin')}
        </Link>
      </AuthShell>
    )
  }

  return (
      <AuthShell
      eyebrow={t('auth.customerAccount')}
      title={t('auth.createAccount')}
      note={t('auth.createAccountNote')}
    >
      <form className="mt-7 space-y-4" onSubmit={submit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field icon={<User size={17} />} label={t('auth.firstName')} name="firstName" />
          <Field icon={<User size={17} />} label={t('auth.lastName')} name="lastName" />
        </div>
        <Field icon={<Mail size={17} />} label={t('auth.email')} name="email" type="email" />
        <Field icon={<User size={17} />} label={t('auth.phone')} name="phone" type="tel" required={false} />
        <PasswordField show={showPassword} setShow={setShowPassword} />
        <Field icon={<LockKeyhole size={17} />} label={t('auth.confirmPassword')} name="confirmPassword" type={showPassword ? 'text' : 'password'} />
        <label className="flex items-start gap-3 text-[11px] leading-5 text-[#6f5a4d]">
          <input required name="terms" type="checkbox" className="mt-1 accent-[#681126]" />
          <span>{t('auth.terms')}</span>
        </label>
        {error ? <p className="text-[12px] text-[#9f1239]">{error}</p> : null}
        <SubmitButton loading={loading}>{t('auth.createAccount')}</SubmitButton>
      </form>
    </AuthShell>
  )
}

export function RecoverPage() {
  const location = useLocation()
  const { t, language } = useAppPreferences()
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const appMode = location.pathname.startsWith('/app/')

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    const form = new FormData(event.currentTarget)
    try {
      await resetPassword(String(form.get('email') ?? ''), appMode ? '/app/reset-password' : '/reset-password')
      setSent(true)
    } catch (err) {
      setError(getErrorMessage(err, language))
    }
  }

  return (
      <AuthShell
      eyebrow={t('auth.recovery')}
      title={t('auth.resetAccess')}
      note={t('auth.recoveryNote')}
    >
      {sent ? (
        <p className="mt-7 rounded-[1rem] bg-[#f7efe4] p-4 text-[13px] text-[#5f463a]">
          {t('auth.recoverySent')}
        </p>
      ) : (
        <form className="mt-7 space-y-4" onSubmit={submit}>
          <Field icon={<Mail size={17} />} label={t('auth.email')} name="email" type="email" />
          {error ? <p className="text-[12px] text-[#9f1239]">{error}</p> : null}
          <SubmitButton>{t('auth.sendLink')}</SubmitButton>
        </form>
      )}
    </AuthShell>
  )
}

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { t, language } = useAppPreferences()
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const appMode = location.pathname.startsWith('/app/')

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    const form = new FormData(event.currentTarget)
    const password = String(form.get('password') ?? '')
    const confirmPassword = String(form.get('confirmPassword') ?? '')
    if (password.length < 8) {
      setError(t('auth.passwordMin'))
      return
    }
    if (password !== confirmPassword) {
      setError(t('auth.passwordsMismatch'))
      return
    }
    try {
      await updatePassword(password)
      navigate(appMode ? '/app/login' : '/login', { replace: true })
    } catch (err) {
      setError(getErrorMessage(err, language))
    }
  }

  return (
      <AuthShell
      eyebrow={t('auth.newPassword')}
      title={t('auth.definePassword')}
      note={t('auth.resetNote')}
    >
      <form className="mt-7 space-y-4" onSubmit={submit}>
        <PasswordField show={showPassword} setShow={setShowPassword} />
        <Field icon={<LockKeyhole size={17} />} label={t('auth.confirmPassword')} name="confirmPassword" type={showPassword ? 'text' : 'password'} />
        {error ? <p className="text-[12px] text-[#9f1239]">{error}</p> : null}
        <SubmitButton>{t('auth.updatePassword')}</SubmitButton>
      </form>
    </AuthShell>
  )
}

export function AppAuthCallbackPage() {
  const { isAuthenticated, isLoading } = useAuth()
  const { t } = useAppPreferences()

  if (isLoading) {
    return (
      <AuthShell
        eyebrow={t('auth.secureAccess')}
        title={t('auth.validatingSession')}
        note={t('auth.validatingNote')}
      >
        <p className="mt-7 text-[13px] text-[#7f6a59]">{t('auth.oneMoment')}</p>
      </AuthShell>
    )
  }

  return <Navigate to={isAuthenticated ? '/app/home' : '/app/login'} replace />
}

function Field({
  icon,
  label,
  name,
  type = 'text',
  required = true,
}: {
  icon: ReactNode
  label: string
  name: string
  type?: string
  required?: boolean
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.1em] text-[#5f463a]">
        {label}
      </span>
      <div className="flex items-center gap-3 rounded-[1rem] border border-[#dccab5] bg-white px-4">
        <span className="text-[#8a6c59]">{icon}</span>
        <input
          required={required}
          name={name}
          type={type}
          className="min-h-[52px] min-w-0 flex-1 bg-transparent text-[13px] outline-none"
        />
      </div>
    </label>
  )
}

function PasswordField({
  show,
  setShow,
}: {
  show: boolean
  setShow: (value: boolean) => void
}) {
  const { t } = useAppPreferences()
  return (
    <label className="block">
      <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.1em] text-[#5f463a]">
        {t('auth.password')}
      </span>
      <div className="flex items-center gap-3 rounded-[1rem] border border-[#dccab5] bg-white px-4">
        <LockKeyhole size={17} className="text-[#8a6c59]" />
        <input
          required
          name="password"
          type={show ? 'text' : 'password'}
          className="min-h-[52px] min-w-0 flex-1 bg-transparent text-[13px] outline-none"
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          className="text-[#681126]"
          aria-label={show ? t('auth.hidePassword') : t('auth.showPassword')}
        >
          {show ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </div>
    </label>
  )
}

function SubmitButton({
  children,
  loading = false,
}: {
  children: ReactNode
  loading?: boolean
}) {
  const { t } = useAppPreferences()
  return (
    <button
      type="submit"
      disabled={loading}
      className="inline-flex min-h-[53px] w-full items-center justify-center gap-3 rounded-full bg-[#681126] px-6 text-[14px] font-bold text-white disabled:opacity-60"
    >
      {loading ? t('auth.processing') : children}
      <ArrowRight size={17} />
    </button>
  )
}
