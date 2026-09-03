import { useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check, Compass, Eye, EyeOff, LockKeyhole, Mail, User } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { resetPassword, signInWithAppleNative, signInWithOAuth, signUpCustomer, updatePassword, type AuthServiceError } from '../services/auth.service'
import { useAppPreferences } from '../app/context/AppPreferencesContext'
import { translateErrorCode, type AppLanguage } from '../app/i18n'
import { requestMobileOnboardingReplay } from './mobileOnboardingReplay'

function getErrorMessage(error: unknown, language: AppLanguage) {
  if (error && typeof error === 'object' && 'code' in error) {
    return translateErrorCode(language, String((error as AuthServiceError).code), (error as AuthServiceError).message)
  }
  if (error && typeof error === 'object' && 'message' in error) return String((error as AuthServiceError).message)
  return translateErrorCode(language, 'auth_error')
}

function safeRedirect(path: unknown, fallback: string) {
  if (typeof path !== 'string' || !path.startsWith('/') || path.startsWith('//')) return fallback
  const normalizedPath = (path.split('#')[0]?.split('?')[0] || '/').replace(/^\/app(?=\/|$)/, '') || '/'
  if (normalizedPath === '/control' || normalizedPath.startsWith('/control/')) return fallback
  return path
}

async function withAuthTimeout<T>(promise: Promise<T>): Promise<T> {
  let timeoutId: number | undefined
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = window.setTimeout(() => {
      reject({ code: 'auth_timeout', message: 'La conexión tardó demasiado. Intenta de nuevo.' })
    }, 15000)
  })

  try {
    return await Promise.race([promise, timeout])
  } finally {
    if (timeoutId) window.clearTimeout(timeoutId)
  }
}

function AuthShell({
  eyebrow,
  title,
  note,
  children,
  onBack,
  backLabel,
}: {
  eyebrow: string
  title: string
  note: string
  children: ReactNode
  onBack?: () => void
  backLabel?: string
}) {
  return (
    <main className="native-auth-screen">
      {onBack ? (
        <button type="button" className="native-auth-screen__back" onClick={onBack} aria-label={backLabel}>
          <ArrowLeft size={18} strokeWidth={1.75} />
        </button>
      ) : null}
      <div className="native-auth-screen__hero" aria-hidden="true">
        <div className="native-auth-screen__hero-veil" />
        <img src="/hacienda de letras logo 2.png" alt="" className="native-auth-screen__logo" />
      </div>
      <section className="native-auth-screen__content">
        <p className="native-auth-screen__eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="native-auth-screen__note">{note}</p>
        {children}
      </section>
    </main>
  )
}

export function MobileLoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { signIn, isAuthenticated } = useAuth()
  const { t, language } = useAppPreferences()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const destination = useMemo(() => safeRedirect((location.state as { from?: string } | null)?.from, '/home'), [location.state])

  if (isAuthenticated) return <Navigate to={destination} replace />

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (loading) return
    setError('')
    setLoading(true)
    const form = new FormData(event.currentTarget)
    try {
      await withAuthTimeout(signIn(String(form.get('email') ?? ''), String(form.get('password') ?? ''), { rememberSession: form.get('remember') === 'on' }))
      navigate(destination, { replace: true })
    } catch (err) {
      setError(getErrorMessage(err, language))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      eyebrow={language === 'en' ? 'Secure access' : 'Acceso seguro'}
      title={language === 'en' ? 'Welcome' : 'Bienvenido'}
      note={language === 'en' ? 'Sign in to continue your Hacienda de Letras experience.' : 'Inicia sesión para continuar tu experiencia en Hacienda de Letras.'}
      onBack={requestMobileOnboardingReplay}
      backLabel={language === 'en' ? 'Back to onboarding' : 'Regresar al onboarding'}
    >
      <button type="button" className="native-auth-explore" onClick={() => navigate('/home')}>
        <Compass size={17} strokeWidth={1.65} />
        {language === 'en' ? 'Explore Hacienda' : 'Explorar Hacienda'}
      </button>
      <form className="native-auth-form" onSubmit={submit}>
        <SocialAuthActions onError={setError} />
        <div className="native-auth-divider"><span>{t('auth.orEmail')}</span></div>
        <Field icon={<Mail size={18} />} label={t('auth.email')} name="email" type="email" autoComplete="email" />
        <PasswordField show={showPassword} setShow={setShowPassword} autoComplete="current-password" />
        <div className="native-auth-form__options">
          <CheckControl name="remember" label={t('auth.rememberMe')} defaultChecked />
          <Link to="/recuperar" className="native-auth-form__link">{t('auth.forgotPassword')}</Link>
        </div>
        <SubmitButton loading={loading}>{t('auth.login')}</SubmitButton>
        {error ? <p className="native-auth-form__error" role="alert">{error}</p> : null}
      </form>
      <p className="native-auth-screen__footnote">{t('auth.noAccount')} <Link to="/registro">{t('auth.createAccount')}</Link></p>
    </AuthShell>
  )
}

export function MobileRegisterPage() {
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
    if (password.length < 8) return setError(t('auth.passwordMin'))
    if (password !== confirmPassword) return setError(t('auth.passwordsMismatch'))
    if (form.get('terms') !== 'on') return setError(t('auth.termsRequired'))
    setLoading(true)
    try {
      const result = await signUpCustomer({
        email,
        password,
        firstName: String(form.get('firstName') ?? ''),
        lastName: String(form.get('lastName') ?? ''),
        preferredLanguage: language,
      })
      if (!result.session) throw { code: 'auth_error', message: language === 'en' ? 'We could not open your session.' : 'No fue posible abrir tu sesión.' }
      navigate('/home', { replace: true })
    } catch (err) {
      setError(getErrorMessage(err, language))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      eyebrow={language === 'en' ? 'Your account' : 'Tu cuenta'}
      title={t('auth.createAccount')}
      note={language === 'en' ? 'Keep your visits, bookings and preferences in one place.' : 'Guarda tus visitas, reservas y preferencias en un solo lugar.'}
    >
      <form className="native-auth-form" onSubmit={submit}>
        <SocialAuthActions onError={setError} />
        <div className="native-auth-divider"><span>{t('auth.orEmail')}</span></div>
        <Field icon={<User size={18} />} label={t('auth.firstName')} name="firstName" autoComplete="given-name" />
        <Field icon={<User size={18} />} label={t('auth.lastName')} name="lastName" autoComplete="family-name" />
        <Field icon={<Mail size={18} />} label={t('auth.email')} name="email" type="email" autoComplete="email" />
        <PasswordField show={showPassword} setShow={setShowPassword} autoComplete="new-password" />
        <Field icon={<LockKeyhole size={18} />} label={t('auth.confirmPassword')} name="confirmPassword" type={showPassword ? 'text' : 'password'} autoComplete="new-password" />
        <CheckControl name="terms" label={t('auth.terms')} required />
        {error ? <p className="native-auth-form__error" role="alert">{error}</p> : null}
        <SubmitButton loading={loading}>{t('auth.createAccount')}</SubmitButton>
      </form>
      <p className="native-auth-screen__footnote">{language === 'en' ? 'Already have an account?' : '¿Ya tienes cuenta?'} <Link to="/login">{t('auth.login')}</Link></p>
    </AuthShell>
  )
}

export function MobileRecoverPage() {
  const { t, language } = useAppPreferences()
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    const form = new FormData(event.currentTarget)
    try {
      await resetPassword(String(form.get('email') ?? ''), '/reset-password')
      setSent(true)
    } catch (err) {
      setError(getErrorMessage(err, language))
    }
  }

  return (
    <AuthShell eyebrow={language === 'en' ? 'Recover access' : 'Recuperar acceso'} title={language === 'en' ? 'Reset your password' : 'Restablece tu contraseña'} note={language === 'en' ? 'Enter your email and we will send you a secure link.' : 'Escribe tu correo y te enviaremos un enlace seguro para continuar.'}>
      {sent ? (
        <div className="native-auth-success">
          <span><Check size={23} strokeWidth={1.6} /></span>
          <p>{t('auth.recoverySent')}</p>
          <Link to="/login" className="native-auth-secondary">{language === 'en' ? 'Back to sign in' : 'Volver a iniciar sesión'}</Link>
        </div>
      ) : (
        <form className="native-auth-form" onSubmit={submit}>
          <Field icon={<Mail size={18} />} label={t('auth.email')} name="email" type="email" autoComplete="email" />
          {error ? <p className="native-auth-form__error" role="alert">{error}</p> : null}
          <SubmitButton>{t('auth.sendLink')}</SubmitButton>
        </form>
      )}
    </AuthShell>
  )
}

export function MobileResetPasswordPage() {
  const navigate = useNavigate()
  const { t, language } = useAppPreferences()
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    const form = new FormData(event.currentTarget)
    const password = String(form.get('password') ?? '')
    const confirmation = String(form.get('confirmPassword') ?? '')
    if (password.length < 8) return setError(t('auth.passwordMin'))
    if (password !== confirmation) return setError(t('auth.passwordsMismatch'))
    try {
      await updatePassword(password)
      navigate('/login', { replace: true })
    } catch (err) {
      setError(getErrorMessage(err, language))
    }
  }

  return (
    <AuthShell eyebrow={language === 'en' ? 'New password' : 'Nueva contraseña'} title={language === 'en' ? 'Secure your access' : 'Define tu acceso'} note={language === 'en' ? 'Choose a secure password to continue.' : 'Elige una contraseña segura para continuar.'}>
      <form className="native-auth-form" onSubmit={submit}>
        <PasswordField show={showPassword} setShow={setShowPassword} autoComplete="new-password" />
        <Field icon={<LockKeyhole size={18} />} label={t('auth.confirmPassword')} name="confirmPassword" type={showPassword ? 'text' : 'password'} autoComplete="new-password" />
        {error ? <p className="native-auth-form__error" role="alert">{error}</p> : null}
        <SubmitButton>{t('auth.updatePassword')}</SubmitButton>
      </form>
    </AuthShell>
  )
}

export function MobileAuthCallbackPage() {
  const { isAuthenticated, isLoading } = useAuth()
  if (isLoading) return <div className="native-auth-screen"><div className="native-auth-screen__content"><span className="mobile-launch-screen__loader" aria-label="Cargando" /></div></div>
  return <Navigate to={isAuthenticated ? '/home' : '/login'} replace />
}

function Field({ icon, label, name, type = 'text', autoComplete }: { icon: ReactNode; label: string; name: string; type?: string; autoComplete?: string }) {
  return (
    <label className="native-auth-field">
      <span>{label}</span>
      <div>
        {icon}
        <input required name={name} type={type} autoComplete={autoComplete} />
      </div>
    </label>
  )
}

function PasswordField({ show, setShow, autoComplete }: { show: boolean; setShow: (value: boolean) => void; autoComplete: string }) {
  const { t } = useAppPreferences()
  return (
    <label className="native-auth-field">
      <span>{t('auth.password')}</span>
      <div>
        <LockKeyhole size={18} />
        <input required name="password" type={show ? 'text' : 'password'} autoComplete={autoComplete} />
        <button type="button" onClick={() => setShow(!show)} aria-label={show ? t('auth.hidePassword') : t('auth.showPassword')}>
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </label>
  )
}

function SubmitButton({ children, loading = false }: { children: ReactNode; loading?: boolean }) {
  const { t } = useAppPreferences()
  return <button type="submit" disabled={loading} className="native-auth-primary">{loading ? t('auth.processing') : children}<ArrowRight size={18} /></button>
}

function CheckControl({ name, label, required = false, defaultChecked = false }: { name: string; label: string; required?: boolean; defaultChecked?: boolean }) {
  return (
    <label className="native-auth-check">
      <input required={required} name={name} type="checkbox" defaultChecked={defaultChecked} />
      <span className="native-auth-check__mark" aria-hidden="true"><Check size={12} strokeWidth={2.8} /></span>
      <span>{label}</span>
    </label>
  )
}

function SocialAuthActions({ onError }: { onError: (message: string) => void }) {
  const { t, language } = useAppPreferences()
  const [provider, setProvider] = useState<'google' | 'apple' | null>(null)

  const continueWith = async (nextProvider: 'google' | 'apple') => {
    if (provider) return
    onError('')
    setProvider(nextProvider)
    try {
      if (nextProvider === 'apple') {
        await signInWithAppleNative()
      } else {
        await signInWithOAuth(nextProvider)
      }
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && String((error as AuthServiceError).code) === 'apple_cancelled') {
        setProvider(null)
        return
      }
      onError(getErrorMessage(error, language))
      setProvider(null)
    }
  }

  return (
    <div className="native-auth-social" aria-label={t('auth.socialAccess')}>
      <button type="button" className="native-auth-social__google" onClick={() => void continueWith('google')} disabled={Boolean(provider)}>
        <img src="/brand/google.svg" alt="" aria-hidden="true" />
        {provider === 'google' ? t('auth.processing') : t('auth.continueGoogle')}
      </button>
      <button type="button" className="native-auth-social__apple" onClick={() => void continueWith('apple')} disabled={Boolean(provider)}>
        <img src="/brand/apple.svg" alt="" aria-hidden="true" />
        {provider === 'apple' ? t('auth.processing') : t('auth.continueApple')}
      </button>
    </div>
  )
}
