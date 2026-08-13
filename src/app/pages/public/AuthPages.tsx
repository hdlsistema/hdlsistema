import { useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck, User } from 'lucide-react'
import { useAuth } from '../../../contexts/AuthContext'
import {
  resetPassword,
  signUpCustomer,
  updatePassword,
  type AuthServiceError,
} from '../../../services/auth.service'
import { useAppPreferences } from '../../context/AppPreferencesContext'
import { translateErrorCode, type AppLanguage } from '../../i18n'

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
  const location = useLocation()
  const appMode = location.pathname.startsWith('/app/')

  return (
    <div className={appMode ? 'overflow-x-hidden bg-[#FBF7F0] px-[var(--app-pad)] pb-6 pt-3 text-[var(--color-burgundy)]' : 'min-h-screen overflow-x-hidden bg-[linear-gradient(180deg,#fffaf5_0%,#f0dcc7_100%)] px-5 py-10 text-[var(--color-burgundy)]'}>
      <div className={appMode ? 'mx-auto flex w-full min-w-0 flex-col justify-start' : 'mx-auto flex min-h-[calc(100vh-5rem)] max-w-[520px] flex-col justify-center'}>
        {!appMode ? (
          <Link to="/" className="mx-auto mb-8 block rounded-full bg-white/72 px-6 py-3 shadow-[var(--shadow-soft)]">
            <img src="/hacienda de letras logo 2.png" alt="Hacienda de Letras" className="h-14 w-auto" />
          </Link>
        ) : null}
        <section className={appMode ? 'rounded-[18px] border border-[rgba(170,125,67,0.22)] bg-[#FFF9F1] p-5 shadow-[0_14px_32px_rgba(58,32,18,0.1)]' : 'rounded-[1.35rem] border border-[rgba(170,125,67,0.22)] bg-[rgba(255,250,242,0.94)] p-6 shadow-[var(--shadow-float)] backdrop-blur md:p-9'}>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-gold)]">
            {eyebrow}
          </p>
          <h1 className="mt-3 text-[clamp(32px,9vw,42px)] leading-[0.95] text-[var(--color-ink)]" style={{ fontFamily: 'var(--font-display)', overflowWrap: 'anywhere' }}>{title}</h1>
          <p className="mt-3 text-[13px] leading-6 text-[var(--color-muted)]">{note}</p>
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

  if (!appMode) {
    return (
      <main className="relative isolate min-h-screen overflow-hidden bg-[#1a090d] text-white">
        <img
          src="/fondo-login-hd.png"
          alt="Copa de Hacienda de Letras entre las vides"
          className="absolute inset-0 -z-30 h-full w-full object-cover object-center"
        />
        <div className="absolute inset-0 -z-20 bg-[linear-gradient(90deg,rgba(17,4,7,0.60)_0%,rgba(35,7,14,0.46)_42%,rgba(19,4,9,0.76)_100%)]" />
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_25%_20%,rgba(206,151,77,0.18),transparent_38%),linear-gradient(180deg,rgba(12,3,6,0.18),rgba(12,3,6,0.58))]" />

        <header className="flex items-center justify-between gap-4 px-5 py-5 sm:px-8 lg:px-12">
          <Link to="/" className="inline-flex items-center gap-3 text-white/88">
            <ArrowLeft size={16} strokeWidth={1.6} />
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em]">Volver a la Hacienda</span>
          </Link>
        </header>

        <div className="mx-auto grid min-h-[calc(100vh-86px)] w-full max-w-[1480px] grid-cols-[minmax(0,1fr)] items-center px-4 pb-8 sm:px-8 lg:grid-cols-[minmax(0,1fr)_520px] lg:px-12">
          <div className="hidden max-w-[500px] self-end pb-14 lg:block">
            <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#edc98e]">Hacienda de Letras · 1854</p>
            <p className="mt-4 text-[42px] font-normal leading-[0.96] text-white/92" style={{ fontFamily: 'var(--font-display)' }}>La operación también se cuida en los detalles.</p>
          </div>

          <section className="relative w-[calc(100vw-2rem)] min-w-0 max-w-full justify-self-center overflow-hidden rounded-[24px] border border-white/24 bg-[rgba(47,13,21,0.52)] p-5 shadow-[0_38px_100px_rgba(8,1,3,0.48)] backdrop-blur-2xl sm:w-full sm:rounded-[28px] sm:p-9">
            <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[#e9c48c]/75 to-transparent" />
            <div className="flex min-w-0 items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#e5bd82]">Acceso privado</p>
                <h1 className="mt-3 text-[clamp(34px,10vw,54px)] font-normal leading-[0.9] tracking-[-0.025em] text-[#fff8ed]" style={{ fontFamily: 'var(--font-display)', overflowWrap: 'anywhere' }}>Centro de Control</h1>
              </div>
              <span className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/18 bg-white/8 text-[#f0d4a8] min-[430px]:inline-flex">
                <ShieldCheck size={20} strokeWidth={1.45} />
              </span>
            </div>
            <p className="mt-5 max-w-[410px] text-[13px] leading-6 text-white/65">Ingresa con tu perfil autorizado para coordinar la operación de Hacienda de Letras.</p>

            <form className="mt-7 min-w-0 space-y-4" onSubmit={submit}>
              <ControlField icon={<Mail size={17} />} label={t('auth.email')} name="email" type="email" autoComplete="email" />
              <ControlPasswordField show={showPassword} setShow={setShowPassword} />
              <div className="flex justify-end">
                <Link to={recoverPath} className="text-[11px] font-semibold text-[#f0d1a0] transition hover:text-white">
                  {t('auth.forgotPassword')}
                </Link>
              </div>
              {error ? <p className="rounded-xl border border-[#ffccd6]/20 bg-[#9f1239]/22 px-3 py-2 text-[12px] text-[#ffe3e8]">{error}</p> : null}
              <button
                type="submit"
                disabled={loading}
                className="inline-flex min-h-[54px] w-full items-center justify-center gap-3 rounded-full bg-[#f4e4cf] px-5 text-[13px] font-bold text-[#571024] shadow-[0_18px_40px_rgba(13,2,5,0.25)] transition hover:bg-white disabled:opacity-60"
              >
                {loading ? t('auth.processing') : 'Ingresar al Centro de Control'}
                <ArrowRight size={16} />
              </button>
            </form>
            <p className="mt-6 border-t border-white/12 pt-5 text-center text-[10px] leading-5 text-white/48">Acceso exclusivo para personal autorizado. Cada ingreso queda protegido por los permisos del perfil.</p>
          </section>
        </div>
      </main>
    )
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
        {t('auth.noAccount')} <Link className="font-bold text-[#681126]" to="/app/registro">{t('auth.createAccount')}</Link>
      </p>
    </AuthShell>
  )
}

function ControlField({
  icon,
  label,
  name,
  type,
  autoComplete,
}: {
  icon: ReactNode
  label: string
  name: string
  type: string
  autoComplete: string
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.15em] text-white/64">{label}</span>
      <span className="flex min-h-[54px] w-full min-w-0 max-w-full items-center gap-3 rounded-2xl border border-white/18 bg-black/18 px-4 shadow-inner transition focus-within:border-[#e7c18a]/70 focus-within:bg-black/24">
        <span className="text-[#dfbd8e]">{icon}</span>
        <input required name={name} type={type} autoComplete={autoComplete} className="control-login-input w-full min-w-0 flex-1 bg-transparent text-[14px] text-white outline-none placeholder:text-white/30" />
      </span>
    </label>
  )
}

function ControlPasswordField({ show, setShow }: { show: boolean; setShow: (value: boolean) => void }) {
  const { t } = useAppPreferences()
  return (
    <label className="block">
      <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.15em] text-white/64">{t('auth.password')}</span>
      <span className="flex min-h-[54px] w-full min-w-0 max-w-full items-center gap-3 rounded-2xl border border-white/18 bg-black/18 px-4 shadow-inner transition focus-within:border-[#e7c18a]/70 focus-within:bg-black/24">
        <LockKeyhole size={17} className="text-[#dfbd8e]" />
        <input required name="password" type={show ? 'text' : 'password'} autoComplete="current-password" className="control-login-input w-full min-w-0 flex-1 bg-transparent text-[14px] text-white outline-none" />
        <button type="button" onClick={() => setShow(!show)} className="text-white/62 transition hover:text-white" aria-label={show ? t('auth.hidePassword') : t('auth.showPassword')}>
          {show ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </span>
    </label>
  )
}

export function RegisterPage() {
  const navigate = useNavigate()
  const { t, language } = useAppPreferences()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

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
      const result = await signUpCustomer({
        email,
        password,
        firstName: String(form.get('firstName') ?? ''),
        lastName: String(form.get('lastName') ?? ''),
        phone: String(form.get('phone') ?? ''),
        preferredLanguage: language,
      })
      if (!result.session) throw { code: 'auth_error', message: language === 'en' ? 'We could not open your session.' : 'No fue posible abrir tu sesión.' }
      navigate('/app/home', { replace: true })
    } catch (err) {
      setError(getErrorMessage(err, language))
    } finally {
      setLoading(false)
    }
  }

  return (
      <AuthShell
      eyebrow={t('auth.customerAccount')}
      title={t('auth.createAccount')}
      note={t('auth.createAccountNote')}
    >
      <form className="mt-7 space-y-4" onSubmit={submit}>
        <div className="grid gap-4">
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
	      <div className="flex min-w-0 items-center gap-3 rounded-[1rem] border border-[#dccab5] bg-white px-4">
        <span className="text-[#8a6c59]">{icon}</span>
        <input
          required={required}
          name={name}
          type={type}
	          className="min-h-[52px] min-w-0 flex-1 bg-transparent text-[14px] outline-none"
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
	      <div className="flex min-w-0 items-center gap-3 rounded-[1rem] border border-[#dccab5] bg-white px-4">
        <LockKeyhole size={17} className="text-[#8a6c59]" />
        <input
          required
          name="password"
          type={show ? 'text' : 'password'}
	          className="min-h-[52px] min-w-0 flex-1 bg-transparent text-[14px] outline-none"
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
	      className="inline-flex min-h-[53px] w-full min-w-0 items-center justify-center gap-3 rounded-full bg-[#681126] px-4 text-[14px] font-bold text-white disabled:opacity-60"
    >
      {loading ? t('auth.processing') : children}
      <ArrowRight size={17} />
    </button>
  )
}
