import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  CalendarDays,
  Check,
  ChevronRight,
  Crown,
  Eye,
  EyeOff,
  Gift,
  Grape,
  LockKeyhole,
  Mail,
  MapPin,
  Menu,
  PartyPopper,
  Phone,
  ShoppingBag,
  Sparkles,
  User,
  Wine,
  X,
} from 'lucide-react'
import { useAuth } from '../../../contexts/AuthContext'
import {
  resendVerification,
  signUpCustomer,
  type AuthServiceError,
} from '../../../services/auth.service'
type AuthMode = 'login' | 'register' | null

const experiences = [
  {
    title: 'Catas y recorridos',
    description:
      'Conoce nuestras etiquetas, camina entre viñedos y descubre el origen de cada botella.',
    image: '/turismo.jpeg',
    icon: Wine,
    link: '/app/experiencias',
  },
  {
    title: 'Eventos inolvidables',
    description:
      'Vendimias, celebraciones, encuentros empresariales y momentos diseñados a la medida.',
    image: '/boda 2.webp',
    icon: PartyPopper,
    link: '/app/eventos',
  },
  {
    title: 'Bodas entre viñedos',
    description:
      'Espacios con historia, paisaje y carácter para celebrar uno de los días más importantes.',
    image: '/bodas.webp',
    icon: Gift,
    link: '/app/eventos',
  },
]

const benefits = [
  'Acceso preferente a eventos',
  'Selecciones especiales de vino',
  'Beneficios en experiencias',
  'Catas privadas',
  'Invitaciones exclusivas',
]

const onboardingScreens = [
  {
    eyebrow: 'DESCUBRE',
    title: 'El vino de Aguascalientes',
    description:
      'Conoce nuestras etiquetas, encuentra nuevos favoritos y recibe recomendaciones según tus gustos.',
    icon: Grape,
  },
  {
    eyebrow: 'RESERVA',
    title: 'Experiencias que permanecen',
    description:
      'Consulta fechas y reserva catas, recorridos, cenas, eventos y momentos especiales desde la app.',
    icon: CalendarDays,
  },
  {
    eyebrow: 'DISFRUTA',
    title: 'Todo Hacienda de Letras contigo',
    description:
      'Guarda tus boletos, consulta tus compras y accede a beneficios personalizados durante cada visita.',
    icon: Crown,
  },
]

export function LandingPage() {
  const navigate = useNavigate()
  const { signIn } = useAuth()

  const [menuOpen, setMenuOpen] = useState(false)
  const [authMode, setAuthMode] = useState<AuthMode>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [onboardingStep, setOnboardingStep] = useState<number | null>(null)
  const [authError, setAuthError] = useState('')
  const [authNotice, setAuthNotice] = useState('')
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false)
  const [verificationEmail, setVerificationEmail] = useState('')

  const closeAuth = () => {
    setAuthMode(null)
    setShowPassword(false)
    setAuthError('')
    setAuthNotice('')
    setVerificationEmail('')
  }

  const handleAuthSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isSubmittingAuth) return

    const form = new FormData(event.currentTarget)
    const email = String(form.get('email') ?? '').trim().toLowerCase()
    const password = String(form.get('password') ?? '')
    setAuthError('')
    setAuthNotice('')
    setIsSubmittingAuth(true)

    try {
      if (authMode === 'register') {
        const fullName = String(form.get('fullName') ?? '').trim()
        const [firstName, ...lastNameParts] = fullName.split(/\s+/)
        const confirmPassword = String(form.get('confirmPassword') ?? '')

        if (password.length < 8) {
          setAuthError('La contraseña debe tener al menos 8 caracteres.')
          return
        }

        if (password !== confirmPassword) {
          setAuthError('Las contraseñas no coinciden.')
          return
        }

        await signUpCustomer({
          email,
          password,
          firstName: firstName || 'Cliente',
          lastName: lastNameParts.join(' ') || 'Hacienda',
          phone: String(form.get('phone') ?? ''),
        })

        setVerificationEmail(email)
        setAuthNotice('Cuenta creada. Revisa tu correo para verificarla antes de iniciar sesión.')
        return
      }

      const nextRoles = await signIn(email, password)
      closeAuth()
      navigate(nextRoles.some((role) => role !== 'customer') ? '/control/dashboard' : '/app/home')
    } catch (error) {
      const message =
        error && typeof error === 'object' && 'message' in error
          ? String((error as AuthServiceError).message)
          : 'No fue posible completar la operación.'
      setAuthError(message)
    } finally {
      setIsSubmittingAuth(false)
    }
  }

  const finishOnboarding = () => {
    setOnboardingStep(null)
    navigate('/app/home')
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[var(--color-page)] text-[var(--color-ink)]">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#2f0913]/88 text-white backdrop-blur-xl">
        <div className="mx-auto flex h-[78px] max-w-[1440px] items-center justify-between px-5 md:px-10">
          <Link
            to="/"
            aria-label="Hacienda de Letras"
            className="flex items-center"
          >
            <img
              src="/Logo-HDL-2.svg"
              alt="Hacienda de Letras"
              className="h-[54px] w-auto brightness-0 invert"
            />
          </Link>

          <nav className="hidden items-center gap-8 text-[13px] font-medium tracking-wide lg:flex">
            <a className="transition hover:text-[#dbc59d]" href="#hacienda">
              La Hacienda
            </a>

            <a
              className="transition hover:text-[#dbc59d]"
              href="#experiencias"
            >
              Experiencias
            </a>

            <a className="transition hover:text-[#dbc59d]" href="#vinos">
              Nuestros vinos
            </a>

            <a className="transition hover:text-[#dbc59d]" href="#club">
              Wine Club
            </a>

            <a className="transition hover:text-[#dbc59d]" href="#visitanos">
              Visítanos
            </a>
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <button
              type="button"
              onClick={() => setAuthMode('login')}
              className="rounded-full border border-white/30 px-5 py-2.5 text-[13px] font-semibold text-white transition hover:border-white hover:bg-white/10"
            >
              Iniciar sesión
            </button>

            <button
              type="button"
              onClick={() => setAuthMode('register')}
              className="rounded-full bg-[#b48a55] px-5 py-2.5 text-[13px] font-bold text-[#2f0913] shadow-lg transition hover:-translate-y-0.5 hover:bg-[#d0ad79]"
            >
              Crear cuenta
            </button>
          </div>

          <button
            type="button"
            onClick={() => setMenuOpen((current) => !current)}
            aria-label="Abrir menú"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/20 text-white lg:hidden"
          >
            {menuOpen ? <X size={21} /> : <Menu size={21} />}
          </button>
        </div>

        {menuOpen ? (
          <div className="border-t border-white/10 bg-[#2f0913] px-5 py-6 lg:hidden">
            <div className="flex flex-col gap-4 text-[14px]">
              <a href="#hacienda" onClick={() => setMenuOpen(false)}>
                La Hacienda
              </a>

              <a href="#experiencias" onClick={() => setMenuOpen(false)}>
                Experiencias
              </a>

              <a href="#vinos" onClick={() => setMenuOpen(false)}>
                Nuestros vinos
              </a>

              <a href="#club" onClick={() => setMenuOpen(false)}>
                Wine Club
              </a>

              <a href="#visitanos" onClick={() => setMenuOpen(false)}>
                Visítanos
              </a>

              <div className="mt-3 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false)
                    setAuthMode('login')
                  }}
                  className="rounded-full border border-white/25 px-4 py-3"
                >
                  Iniciar sesión
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false)
                    setAuthMode('register')
                  }}
                  className="rounded-full bg-[#b48a55] px-4 py-3 font-bold text-[#2f0913]"
                >
                  Crear cuenta
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </header>

      <main>
        <section className="relative flex min-h-[96vh] items-end overflow-hidden pt-[78px]">
          <img
            src="/hacienda 2.jpg"
            alt="Hacienda de Letras"
            className="absolute inset-0 h-full w-full object-cover"
          />

          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(35,5,13,0.93)_0%,rgba(52,10,20,0.75)_38%,rgba(35,5,13,0.18)_75%,rgba(35,5,13,0.28)_100%)]" />

          <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(30,6,12,0.82)_0%,transparent_50%)]" />

          <div className="relative mx-auto grid w-full max-w-[1440px] gap-12 px-6 pb-16 pt-24 md:px-10 md:pb-24 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
            <div className="max-w-[760px] text-white">
              <p className="mb-6 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.3em] text-[#dbc59d]">
                <span className="h-px w-10 bg-[#dbc59d]" />
                Viñedo fundado en 1854
              </p>

              <h1
                className="max-w-[720px] text-[50px] font-normal leading-[0.96] md:text-[72px] lg:text-[88px]"
                style={{
                  fontFamily: 'var(--font-display)',
                }}
              >
                Hacienda de Letras
              </h1>

              <p className="mt-5 text-[13px] font-semibold uppercase tracking-[0.18em] text-[#dbc59d]">
                Aplicación oficial de Hacienda de Letras
              </p>

              <p className="mt-7 max-w-[720px] text-[17px] leading-8 text-white/82 md:text-[19px]">
                Hacienda de Letras es la aplicación oficial para descubrir nuestros vinos, conocer experiencias y eventos, realizar reservaciones, comprar productos y boletos, y consultar tus accesos digitales desde un solo lugar.
              </p>

              <div className="mt-10 flex flex-col gap-4 sm:flex-row">
                <Link
                  to="/app/experiencias"
                  className="inline-flex min-h-[54px] items-center justify-center gap-3 rounded-full bg-[#8c1732] px-7 text-[14px] font-bold text-white shadow-[0_18px_40px_rgba(30,5,13,0.3)] transition hover:-translate-y-1 hover:bg-[#a51d3c]"
                >
                  Reservar una experiencia
                  <ArrowRight size={17} />
                </Link>

                <Link
                  to="/app/tienda"
                  className="inline-flex min-h-[54px] items-center justify-center gap-3 rounded-full border border-white/40 bg-white/8 px-7 text-[14px] font-semibold text-white backdrop-blur transition hover:-translate-y-1 hover:bg-white/16"
                >
                  Descubrir nuestros vinos
                  <Wine size={17} />
                </Link>
              </div>

              <div className="mt-12 flex flex-wrap gap-x-7 gap-y-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">
                <span>Vino</span>
                <span>Catas</span>
                <span>Recorridos</span>
                <span>Gastronomía</span>
                <span>Eventos</span>
              </div>
            </div>

            <div className="hidden justify-end lg:flex">
              <div className="w-full max-w-[360px] border border-white/20 bg-white/10 p-7 text-white backdrop-blur-xl">
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#dbc59d]">
                  Tu próxima visita
                </p>

                <h2
                  className="mt-4 text-[31px] leading-tight"
                  style={{
                    fontFamily: 'var(--font-display)',
                  }}
                >
                  Un día entre vino, historia y paisaje.
                </h2>

                <div className="mt-7 space-y-4">
                  <div className="flex items-center gap-4 border-b border-white/15 pb-4">
                    <CalendarDays size={19} className="text-[#dbc59d]" />
                    <div>
                      <p className="text-[12px] text-white/60">Disponibilidad</p>
                      <p className="text-[14px] font-semibold">
                        Consulta fechas y horarios
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 border-b border-white/15 pb-4">
                    <MapPin size={19} className="text-[#dbc59d]" />
                    <div>
                      <p className="text-[12px] text-white/60">Ubicación</p>
                      <p className="text-[14px] font-semibold">
                        Pabellón de Arteaga
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <Sparkles size={19} className="text-[#dbc59d]" />
                    <div>
                      <p className="text-[12px] text-white/60">
                        Recomendación personalizada
                      </p>
                      <p className="text-[14px] font-semibold">
                        Consulta a ALQIA Sommelier
                      </p>
                    </div>
                  </div>
                </div>

                <Link
                  to="/app/home"
                  className="mt-7 inline-flex items-center gap-2 text-[13px] font-bold text-[#dbc59d]"
                >
                  Explorar la app
                  <ArrowRight size={15} />
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section
          id="app-oficial"
          className="mx-auto grid max-w-[1320px] gap-8 px-6 py-20 md:px-10 lg:grid-cols-[1fr_0.9fr]"
        >
          <article className="rounded-[2rem] border border-[#dccab5] bg-white/78 p-7 shadow-[0_24px_70px_rgba(61,26,17,0.1)] backdrop-blur md:p-10">
            <p className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.25em] text-[#9b7040]">
              <span className="h-px w-9 bg-[#b48a55]" />
              ¿Qué puedes hacer en la app?
            </p>

            <h2
              className="mt-5 text-[42px] font-normal leading-[1.02] text-[#4f0f1f] md:text-[58px]"
              style={{
                fontFamily: 'var(--font-display)',
              }}
            >
              Todo Hacienda de Letras en un solo lugar.
            </h2>

            <ul className="mt-8 grid gap-4 text-[15px] leading-7 text-[#5f463a] md:grid-cols-2">
              {[
                'Explorar vinos y consultar información de cada etiqueta.',
                'Descubrir experiencias y eventos de Hacienda de Letras.',
                'Realizar y administrar reservaciones.',
                'Comprar productos y boletos disponibles.',
                'Consultar tus reservaciones, compras y accesos digitales.',
                'Acceder a Wine Club y beneficios disponibles.',
                'Administrar tu perfil y preferencias.',
              ].map((item) => (
                <li key={item} className="flex gap-3 rounded-[1.2rem] border border-[#eadbc9] bg-[#fffaf4] p-4">
                  <span className="mt-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#681126] text-white">
                    <Check size={13} />
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </article>

          <aside
            id="google-signin"
            className="rounded-[2rem] border border-[#d8bf9c] bg-[linear-gradient(145deg,#fffaf3,#f1e4d3)] p-7 shadow-[0_24px_70px_rgba(61,26,17,0.1)] md:p-10"
          >
            <span className="inline-flex h-[52px] w-[52px] items-center justify-center rounded-full border border-[#d8bf9c] bg-white text-[#681126] shadow-sm">
              <LockKeyhole size={22} />
            </span>

            <p className="mt-7 text-[11px] font-bold uppercase tracking-[0.25em] text-[#9b7040]">
              Inicio de sesión con Google
            </p>

            <h2
              className="mt-4 text-[36px] font-normal leading-[1.04] text-[#4f0f1f] md:text-[48px]"
              style={{
                fontFamily: 'var(--font-display)',
              }}
            >
              Accede a tu perfil de forma segura.
            </h2>

            <p className="mt-6 text-[15px] leading-8 text-[#5f463a]">
              Puedes iniciar sesión con tu cuenta de Google para crear o acceder a tu perfil de Hacienda de Letras. Utilizamos la información básica autorizada por Google, como tu nombre, correo electrónico e identificador de cuenta, únicamente para identificar tu perfil, mantener tu sesión y asociar tus reservaciones, compras y preferencias.
            </p>

            <div className="mt-8 flex flex-col gap-3">
              <Link
                to="/politica-de-privacidad"
                className="inline-flex min-h-[48px] items-center justify-center rounded-full border border-[#681126] px-5 text-[13px] font-bold text-[#681126] transition hover:bg-[#681126] hover:text-white"
              >
                Política de Privacidad
              </Link>

              <Link
                to="/terminos-y-condiciones"
                className="inline-flex min-h-[48px] items-center justify-center rounded-full border border-[#d8bf9c] bg-white/70 px-5 text-[13px] font-bold text-[#681126] transition hover:bg-white"
              >
                Términos y Condiciones
              </Link>
            </div>
          </aside>
        </section>

        <section className="relative z-10 mx-auto -mt-8 max-w-[1220px] px-5 md:-mt-12">
          <div className="grid overflow-hidden rounded-[1.7rem] border border-[#dccab5] bg-[#fffaf3] shadow-[0_24px_70px_rgba(61,26,17,0.15)] sm:grid-cols-2 lg:grid-cols-4">
            {[
              ['1854', 'Año de fundación'],
              ['40+', 'Años de tradición vinícola'],
              ['18+', 'Variedades de uva'],
              ['Una', 'Experiencia integral'],
            ].map(([value, label], index) => (
              <div
                key={label}
                className={`px-7 py-7 text-center ${
                  index < 3
                    ? 'border-b border-[#e4d6c4] sm:border-r lg:border-b-0'
                    : ''
                }`}
              >
                <p
                  className="text-[34px] text-[#681126]"
                  style={{
                    fontFamily: 'var(--font-display)',
                  }}
                >
                  {value}
                </p>

                <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7f6a59]">
                  {label}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section
          id="hacienda"
          className="mx-auto grid max-w-[1320px] gap-14 px-6 py-28 md:px-10 lg:grid-cols-[0.92fr_1.08fr] lg:items-center"
        >
          <div className="relative min-h-[580px]">
            <img
              src="/Hacienda-de-Letras hacienda.jpg"
              alt="Entrada de Hacienda de Letras"
              className="absolute left-0 top-0 h-[76%] w-[76%] rounded-[1.8rem] object-cover shadow-[0_24px_60px_rgba(58,28,18,0.16)]"
            />

            <img
              src="/turismo.jpeg"
              alt="Jardines de Hacienda de Letras"
              className="absolute bottom-0 right-0 h-[52%] w-[58%] rounded-[1.8rem] border-[10px] border-[var(--color-page)] object-cover shadow-[0_24px_60px_rgba(58,28,18,0.18)]"
            />

            <div className="absolute bottom-[9%] left-[8%] rounded-[1.3rem] bg-[#681126] px-6 py-5 text-white shadow-xl">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#dbc59d]">
                Hacienda de Letras
              </p>

              <p
                className="mt-1 text-[24px]"
                style={{
                  fontFamily: 'var(--font-display)',
                }}
              >
                Tradición que se vive.
              </p>
            </div>
          </div>

          <div>
            <p className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.25em] text-[#9b7040]">
              <span className="h-px w-9 bg-[#b48a55]" />
              Nuestra historia
            </p>

            <h2
              className="mt-5 max-w-[680px] text-[43px] font-normal leading-[1.04] text-[#4f0f1f] md:text-[59px]"
              style={{
                fontFamily: 'var(--font-display)',
              }}
            >
              Más que una visita, una historia para recordar.
            </h2>

            <p className="mt-7 max-w-[650px] text-[16px] leading-8 text-[#6f5a4d]">
              Hacienda de Letras reúne tradición vinícola, experiencias entre
              viñedos, gastronomía y momentos diseñados para disfrutarse sin
              prisa.
            </p>

            <p className="mt-5 max-w-[650px] text-[16px] leading-8 text-[#6f5a4d]">
              Ven a conocer nuestros vinos, recorre la hacienda, celebra una
              ocasión especial o forma parte de una comunidad que comparte el
              gusto por el vino de Aguascalientes.
            </p>

            <div className="mt-9 grid gap-4 sm:grid-cols-2">
              {[
                ['Vino con identidad', 'Etiquetas nacidas en Aguascalientes.'],
                [
                  'Experiencias auténticas',
                  'Momentos conectados con la tierra y la historia.',
                ],
                [
                  'Gastronomía y maridaje',
                  'Sabores creados para acompañar cada copa.',
                ],
                [
                  'Celebraciones',
                  'Espacios únicos para encuentros memorables.',
                ],
              ].map(([title, description]) => (
                <div
                  key={title}
                  className="border-l-2 border-[#b48a55] py-2 pl-5"
                >
                  <h3 className="text-[14px] font-bold text-[#4f0f1f]">
                    {title}
                  </h3>

                  <p className="mt-1 text-[13px] leading-6 text-[#7f6a59]">
                    {description}
                  </p>
                </div>
              ))}
            </div>

            <Link
              to="/app/home"
              className="mt-10 inline-flex items-center gap-3 rounded-full border border-[#681126] px-6 py-3.5 text-[13px] font-bold text-[#681126] transition hover:bg-[#681126] hover:text-white"
            >
              Conocer Hacienda de Letras
              <ArrowRight size={16} />
            </Link>
          </div>
        </section>

        <section
          id="experiencias"
          className="bg-[#2f0913] px-6 py-28 text-white md:px-10"
        >
          <div className="mx-auto max-w-[1320px]">
            <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
              <div>
                <p className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.25em] text-[#dbc59d]">
                  <span className="h-px w-9 bg-[#dbc59d]" />
                  Vive la hacienda
                </p>

                <h2
                  className="mt-5 max-w-[760px] text-[44px] font-normal leading-[1.02] md:text-[62px]"
                  style={{
                    fontFamily: 'var(--font-display)',
                  }}
                >
                  Momentos que comienzan con una copa.
                </h2>
              </div>

              <Link
                to="/app/experiencias"
                className="inline-flex items-center gap-2 text-[13px] font-bold text-[#dbc59d]"
              >
                Ver todas las experiencias
                <ArrowRight size={16} />
              </Link>
            </div>

            <div className="mt-14 grid gap-6 lg:grid-cols-3">
              {experiences.map((experience) => {
                const Icon = experience.icon

                return (
                  <Link
                    key={experience.title}
                    to={experience.link}
                    className="group relative min-h-[520px] overflow-hidden rounded-[1.8rem]"
                  >
                    <img
                      src={experience.image}
                      alt={experience.title}
                      className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105"
                    />

                    <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(30,5,12,0.96)_0%,rgba(30,5,12,0.12)_70%)]" />

                    <div className="absolute inset-x-0 bottom-0 p-7">
                      <span className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/25 bg-white/10 text-[#dbc59d] backdrop-blur">
                        <Icon size={21} />
                      </span>

                      <h3
                        className="mt-5 text-[31px] leading-tight"
                        style={{
                          fontFamily: 'var(--font-display)',
                        }}
                      >
                        {experience.title}
                      </h3>

                      <p className="mt-3 text-[14px] leading-6 text-white/72">
                        {experience.description}
                      </p>

                      <span className="mt-5 inline-flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.12em] text-[#dbc59d]">
                        Descubrir
                        <ChevronRight size={16} />
                      </span>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        </section>

        <section
          id="vinos"
          className="mx-auto grid max-w-[1320px] gap-14 px-6 py-28 md:px-10 lg:grid-cols-2 lg:items-center"
        >
          <div>
            <p className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.25em] text-[#9b7040]">
              <span className="h-px w-9 bg-[#b48a55]" />
              Nuestra selección
            </p>

            <h2
              className="mt-5 text-[46px] font-normal leading-[1.02] text-[#4f0f1f] md:text-[62px]"
              style={{
                fontFamily: 'var(--font-display)',
              }}
            >
              Vinos con identidad de Aguascalientes.
            </h2>

            <p className="mt-7 max-w-[610px] text-[16px] leading-8 text-[#6f5a4d]">
              Cada etiqueta cuenta una parte de nuestra historia. Descubre vinos
              tintos, blancos, rosados y espumosos creados para acompañar
              grandes comidas y mejores recuerdos.
            </p>

            <div className="mt-9 flex flex-wrap gap-3">
              {['Tintos', 'Blancos', 'Rosados', 'Espumosos'].map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-[#dccab5] bg-white px-4 py-2 text-[12px] font-semibold text-[#681126]"
                >
                  {item}
                </span>
              ))}
            </div>

            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/app/tienda"
                className="inline-flex min-h-[52px] items-center justify-center gap-3 rounded-full bg-[#681126] px-7 text-[14px] font-bold text-white transition hover:-translate-y-0.5 hover:bg-[#7d1730]"
                style={{ color: '#ffffff' }}
              >
                Ver catálogo
                <ShoppingBag size={17} color="#ffffff" />
              </Link>

              <Link
                to="/app/sommelier"
                className="inline-flex min-h-[52px] items-center justify-center gap-3 rounded-full border border-[#681126] px-7 text-[14px] font-bold text-[#681126] transition hover:bg-[#681126] hover:text-white"
              >
                Encontrar mi vino
                <Sparkles size={17} />
              </Link>
            </div>
          </div>

          <div className="relative min-h-[590px]">
            <img
              src="/Hacienda-de-Letras hacienda.jpg"
              alt="Hacienda de Letras"
              className="absolute right-0 top-0 h-[84%] w-[82%] rounded-[2rem] object-cover shadow-[0_30px_70px_rgba(58,28,18,0.17)]"
            />

            <div className="absolute bottom-0 left-0 max-w-[360px] rounded-[1.6rem] bg-[#681126] p-7 text-white shadow-2xl">
              <Wine size={29} className="text-[#dbc59d]" />

              <p
                className="mt-5 text-[28px] leading-tight"
                style={{
                  fontFamily: 'var(--font-display)',
                }}
              >
                Una botella puede guardar un lugar, una fecha y una historia.
              </p>

              <p className="mt-4 text-[13px] leading-6 text-white/68">
                Explora nuestras etiquetas y encuentra la selección ideal para
                compartir, regalar o celebrar.
              </p>
            </div>
          </div>
        </section>

        <section className="bg-[#e9dfd0] px-6 py-28 md:px-10">
          <div className="mx-auto grid max-w-[1220px] overflow-hidden rounded-[2rem] bg-[#681126] text-white shadow-[0_30px_80px_rgba(49,10,20,0.22)] lg:grid-cols-[0.9fr_1.1fr]">
            <div className="relative min-h-[440px]">
              <img
                src="/turismo.jpeg"
                alt="Experiencia en Hacienda de Letras"
                className="absolute inset-0 h-full w-full object-cover"
              />

              <div className="absolute inset-0 bg-[#2f0913]/28" />
            </div>

            <div className="flex flex-col justify-center p-8 md:p-14">
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#dbc59d]">
                ALQIA Sommelier
              </p>

              <h2
                className="mt-5 text-[41px] font-normal leading-[1.02] md:text-[55px]"
                style={{
                  fontFamily: 'var(--font-display)',
                }}
              >
                Tu asistente personal de vinos.
              </h2>

              <p className="mt-6 max-w-[610px] text-[15px] leading-7 text-white/76">
                Cuéntale qué vas a comer, qué ocasión celebras o qué sabores
                disfrutas. ALQIA Sommelier te ayudará a elegir el vino, el
                maridaje o la experiencia ideal.
              </p>

              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {[
                  '¿Qué vino recomiendas para una cena?',
                  'Quiero elegir un regalo especial.',
                  '¿Qué experiencia recomiendas para una pareja?',
                  'Ayúdame a comparar dos etiquetas.',
                ].map((question) => (
                  <div
                    key={question}
                    className="rounded-[1rem] border border-white/15 bg-white/8 px-4 py-3 text-[12px] leading-5 text-white/80"
                  >
                    {question}
                  </div>
                ))}
              </div>

              <Link
                to="/app/sommelier"
                className="mt-9 inline-flex min-h-[52px] w-fit items-center gap-3 rounded-full bg-[#dbc59d] px-7 text-[14px] font-bold text-[#3a0a16] transition hover:-translate-y-0.5 hover:bg-white"
              >
                Hablar con el Sommelier
                <Sparkles size={17} />
              </Link>
            </div>
          </div>
        </section>

        <section
          id="club"
          className="mx-auto grid max-w-[1320px] gap-16 px-6 py-28 md:px-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center"
        >
          <div className="order-2 lg:order-1">
            <p className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.25em] text-[#9b7040]">
              <span className="h-px w-9 bg-[#b48a55]" />
              Wine Club
            </p>

            <h2
              className="mt-5 text-[46px] font-normal leading-[1.02] text-[#4f0f1f] md:text-[62px]"
              style={{
                fontFamily: 'var(--font-display)',
              }}
            >
              Una forma distinta de pertenecer.
            </h2>

            <p className="mt-7 max-w-[650px] text-[16px] leading-8 text-[#6f5a4d]">
              Wine Club conecta a nuestros clientes más cercanos con
              selecciones, experiencias y beneficios exclusivos durante todo el
              año.
            </p>

            <div className="mt-8 space-y-4">
              {benefits.map((benefit) => (
                <div key={benefit} className="flex items-center gap-4">
                  <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#681126] text-white">
                    <Check size={15} />
                  </span>

                  <span className="text-[14px] font-semibold text-[#4b352c]">
                    {benefit}
                  </span>
                </div>
              ))}
            </div>

            <Link
              to="/app/club"
              className="mt-10 inline-flex min-h-[52px] items-center justify-center gap-3 rounded-full bg-[#681126] px-7 text-[14px] font-bold text-white transition hover:-translate-y-0.5"
            >
              Conocer Wine Club
              <Crown size={17} />
            </Link>
          </div>

          <div className="order-1 lg:order-2">
            <div className="relative overflow-hidden rounded-[2rem] bg-[#2f0913] p-8 text-white shadow-[0_30px_70px_rgba(49,10,20,0.22)] md:p-11">
              <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full border border-[#dbc59d]/20" />
              <div className="absolute -right-8 -top-8 h-48 w-48 rounded-full border border-[#dbc59d]/20" />

              <div className="relative">
                <div className="flex items-center justify-between">
                  <span className="inline-flex h-14 w-14 items-center justify-center rounded-full border border-[#dbc59d]/40 text-[#dbc59d]">
                    <Crown size={24} />
                  </span>

                  <span className="rounded-full border border-white/15 bg-white/8 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#dbc59d]">
                    Membresía anual
                  </span>
                </div>

                <p className="mt-14 text-[11px] font-bold uppercase tracking-[0.2em] text-[#dbc59d]">
                  Gran Reserva
                </p>

                <h3
                  className="mt-3 text-[42px] leading-[1.04]"
                  style={{
                    fontFamily: 'var(--font-display)',
                  }}
                >
                  Hacienda de Letras, durante todo el año.
                </h3>

                <p className="mt-5 text-[14px] leading-7 text-white/68">
                  Una membresía diseñada para quienes desean vivir más de cerca
                  nuestros vinos, eventos y experiencias.
                </p>

                <div className="mt-9 grid grid-cols-2 gap-3">
                  {[
                    ['Selecciones', 'Especiales'],
                    ['Acceso', 'Preferente'],
                    ['Catas', 'Privadas'],
                    ['Beneficios', 'Exclusivos'],
                  ].map(([value, label]) => (
                    <div
                      key={value}
                      className="rounded-[1rem] border border-white/12 bg-white/7 p-4"
                    >
                      <p className="text-[15px] font-bold">{value}</p>
                      <p className="mt-1 text-[11px] text-white/54">{label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[#fffaf3] px-6 py-28 md:px-10">
          <div className="mx-auto grid max-w-[1400px] gap-16 lg:grid-cols-[1.4fr_1fr] lg:items-center">
            <img
              src="/imagenlandingapp.png"
              alt="Hacienda de Letras App"
              className="w-full"
            />

            <div>
              <p className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.25em] text-[#9b7040]">
                <span className="h-px w-9 bg-[#b48a55]" />
                Una experiencia conectada
              </p>

              <h2
                className="mt-5 text-[45px] font-normal leading-[1.02] text-[#4f0f1f] md:text-[61px]"
                style={{
                  fontFamily: 'var(--font-display)',
                }}
              >
                Hacienda de Letras, siempre contigo.
              </h2>

              <p className="mt-7 max-w-[650px] text-[16px] leading-8 text-[#6f5a4d]">
                Desde la app podrás reservar experiencias, comprar vino,
                consultar boletos, recibir recomendaciones y acceder a tus
                beneficios desde un solo lugar.
              </p>

              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                {[
                  ['Compra vinos', 'Explora y encuentra nuevas etiquetas.'],
                  ['Reserva', 'Consulta horarios y disponibilidad.'],
                  ['Boletos digitales', 'Lleva tus accesos siempre contigo.'],
                  [
                    'Recomendaciones',
                    'Recibe sugerencias según tus preferencias.',
                  ],
                ].map(([title, description]) => (
                  <div
                    key={title}
                    className="rounded-[1.2rem] border border-[#e1d1be] bg-white p-5 shadow-sm"
                  >
                    <h3 className="text-[14px] font-bold text-[#681126]">
                      {title}
                    </h3>

                    <p className="mt-2 text-[12px] leading-5 text-[#7f6a59]">
                      {description}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link
                  to="/app/home"
                  className="inline-flex min-h-[52px] items-center justify-center gap-3 rounded-full bg-[#681126] px-7 text-[14px] font-bold text-white"
                  style={{ color: '#ffffff' }}
                >
                  Explorar la app
                  <ArrowRight size={17} />
                </Link>

                <button
                  type="button"
                  onClick={() => setAuthMode('register')}
                  className="inline-flex min-h-[52px] items-center justify-center gap-3 rounded-full bg-[#681126] px-7 text-[14px] font-bold text-white"
                  style={{ color: '#ffffff' }}
                >
                  Crear mi cuenta
                  <User size={17} />
                </button>
              </div>
            </div>
          </div>
        </section>

        <section
          id="visitanos"
          className="relative min-h-[620px] overflow-hidden px-6 py-28 text-white md:px-10"
        >
          <img
            src="/Hacienda-de-Letras hacienda.jpg"
            alt="Visita Hacienda de Letras"
            className="absolute inset-0 h-full w-full object-cover"
          />

          <div className="absolute inset-0 bg-[#2f0913]/74" />

          <div className="relative mx-auto flex min-h-[390px] max-w-[1220px] items-center justify-center text-center">
            <div className="max-w-[800px]">
              <MapPin size={30} className="mx-auto text-[#dbc59d]" />

              <p className="mt-6 text-[10px] font-bold uppercase tracking-[0.27em] text-[#dbc59d]">
                Tu próxima experiencia comienza aquí
              </p>

              <h2
                className="mt-5 text-[50px] font-normal leading-[1] md:text-[74px]"
                style={{
                  fontFamily: 'var(--font-display)',
                }}
              >
                Hay lugares que se visitan. Otros se recuerdan.
              </h2>

              <p className="mx-auto mt-7 max-w-[680px] text-[16px] leading-8 text-white/76">
                Ven a descubrir el vino, el paisaje y las experiencias de
                Hacienda de Letras.
              </p>

              <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
                <Link
                  to="/app/reservacion"
                  className="inline-flex min-h-[54px] items-center justify-center gap-3 rounded-full bg-[#b48a55] px-8 text-[14px] font-bold text-[#2f0913]"
                >
                  Reservar ahora
                  <CalendarDays size={17} />
                </Link>

                <Link
                  to="/app/mapa"
                  className="inline-flex min-h-[54px] items-center justify-center gap-3 rounded-full border border-white/35 bg-white/8 px-8 text-[14px] font-bold text-white backdrop-blur"
                >
                  Cómo llegar
                  <MapPin size={17} />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-[#21060d] px-6 py-14 text-white md:px-10">
        <div className="mx-auto grid max-w-[1320px] gap-10 md:grid-cols-2 lg:grid-cols-5">
          <div>
            <img
              src="/Logo-HDL-2.svg"
              alt="Hacienda de Letras"
              className="h-20 w-auto brightness-0 invert"
            />

            <p className="mt-5 max-w-[290px] text-[13px] leading-6 text-white/58">
              Hacienda de Letras
              <br />
              Aplicación oficial
            </p>
          </div>

          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#dbc59d]">
              Descubre
            </p>

            <div className="mt-5 flex flex-col gap-3 text-[13px] text-white/65">
              <a href="#hacienda">La Hacienda</a>
              <a href="#experiencias">Experiencias</a>
              <a href="#vinos">Nuestros vinos</a>
              <a href="#club">Wine Club</a>
            </div>
          </div>

          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#dbc59d]">
              Planea tu visita
            </p>

            <div className="mt-5 flex flex-col gap-3 text-[13px] text-white/65">
              <Link to="/app/reservacion">Reservaciones</Link>
              <Link to="/app/eventos">Próximos eventos</Link>
              <Link to="/app/mapa">Cómo llegar</Link>
              <Link to="/app/sommelier">ALQIA Sommelier</Link>
            </div>
          </div>

          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#dbc59d]">
              Mi cuenta
            </p>

            <div className="mt-5 flex flex-col gap-3">
              <button
                type="button"
                onClick={() => setAuthMode('login')}
                className="w-fit text-[13px] text-white/65"
              >
                Iniciar sesión
              </button>

              <button
                type="button"
                onClick={() => setAuthMode('register')}
                className="w-fit text-[13px] text-white/65"
              >
                Crear cuenta
              </button>

              <Link
                to="/app/home"
                className="text-[13px] text-white/65"
              >
                Abrir la app
              </Link>
            </div>
          </div>

          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#dbc59d]">
              Legal
            </p>

            <div className="mt-5 flex flex-col gap-3 text-[13px] text-white/65">
              <Link to="/politica-de-privacidad">Política de Privacidad</Link>
              <Link to="/terminos-y-condiciones">Términos y Condiciones</Link>
              <Link to="/login">Acceso administrativo</Link>
            </div>
          </div>
        </div>

        <div className="mx-auto mt-12 flex max-w-[1320px] flex-col justify-between gap-4 border-t border-white/10 pt-7 text-[11px] text-white/38 md:flex-row">
          <p>© 2026 Hacienda de Letras. Todos los derechos reservados.</p>
          <p>Business & Experience OS</p>
        </div>
      </footer>

      {authMode ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[#180309]/75 p-4 backdrop-blur-md"
        >
          <button
            type="button"
            aria-label="Cerrar"
            onClick={closeAuth}
            className="absolute inset-0 cursor-default"
          />

          <div className="relative z-10 max-h-[94vh] w-full max-w-[510px] overflow-y-auto rounded-[2rem] bg-[#fffaf3] p-6 shadow-[0_40px_100px_rgba(20,2,8,0.42)] md:p-9">
            <button
              type="button"
              onClick={closeAuth}
              aria-label="Cerrar"
              className="absolute right-5 top-5 inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#dccab5] bg-white text-[#681126]"
            >
              <X size={19} />
            </button>

            <img
              src="/Logo-HDL-2.svg"
              alt="Hacienda de Letras"
              className="mx-auto h-20 w-auto"
            />

            <div className="mt-6 text-center">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#b48a55]">
                {authMode === 'register'
                  ? 'FORMA PARTE DE LA HISTORIA'
                  : 'BIENVENIDA DE NUEVO'}
              </p>

              <h2
                className="mt-3 text-[35px] leading-tight text-[#4f0f1f]"
                style={{
                  fontFamily: 'var(--font-display)',
                }}
              >
                {authMode === 'register'
                  ? 'Crea tu cuenta'
                  : 'Qué gusto verte de nuevo'}
              </h2>

              <p className="mx-auto mt-3 max-w-[390px] text-[13px] leading-6 text-[#7f6a59]">
                {authMode === 'register'
                  ? 'Disfruta una experiencia personalizada, administra tus reservaciones y accede a beneficios especiales.'
                  : 'Consulta tus reservaciones, compras, boletos y beneficios desde un solo lugar.'}
              </p>
            </div>

            <form className="mt-7 space-y-4" onSubmit={handleAuthSubmit}>
              {authMode === 'register' ? (
                <>
                  <label className="block">
                    <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.1em] text-[#5f463a]">
                      Nombre completo
                    </span>

                    <div className="flex items-center gap-3 rounded-[1rem] border border-[#dccab5] bg-white px-4">
                      <User size={17} className="text-[#8a6c59]" />

                      <input
                        required
                        name="fullName"
                        type="text"
                        placeholder="Escribe tu nombre"
                        className="min-h-[52px] min-w-0 flex-1 bg-transparent text-[13px] outline-none"
                      />
                    </div>
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.1em] text-[#5f463a]">
                      Teléfono
                    </span>

                    <div className="flex items-center gap-3 rounded-[1rem] border border-[#dccab5] bg-white px-4">
                      <Phone size={17} className="text-[#8a6c59]" />

                      <input
                        required
                        name="phone"
                        type="tel"
                        placeholder="Tu número de contacto"
                        className="min-h-[52px] min-w-0 flex-1 bg-transparent text-[13px] outline-none"
                      />
                    </div>
                  </label>
                </>
              ) : null}

              <label className="block">
                <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.1em] text-[#5f463a]">
                  Correo electrónico
                </span>

                <div className="flex items-center gap-3 rounded-[1rem] border border-[#dccab5] bg-white px-4">
                  <Mail size={17} className="text-[#8a6c59]" />

                  <input
                    required
                    name="email"
                    type="email"
                    placeholder="nombre@correo.com"
                    className="min-h-[52px] min-w-0 flex-1 bg-transparent text-[13px] outline-none"
                  />
                </div>
              </label>

              <label className="block">
                <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.1em] text-[#5f463a]">
                  Contraseña
                </span>

                <div className="flex items-center gap-3 rounded-[1rem] border border-[#dccab5] bg-white px-4">
                  <LockKeyhole size={17} className="text-[#8a6c59]" />

                  <input
                    required
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Escribe tu contraseña"
                    className="min-h-[52px] min-w-0 flex-1 bg-transparent text-[13px] outline-none"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    aria-label={
                      showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'
                    }
                    className="text-[#681126]"
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </label>

              {authMode === 'register' ? (
                <>
                  <label className="block">
                    <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.1em] text-[#5f463a]">
                      Confirmar contraseña
                    </span>

                    <div className="flex items-center gap-3 rounded-[1rem] border border-[#dccab5] bg-white px-4">
                      <LockKeyhole size={17} className="text-[#8a6c59]" />

                      <input
                        required
                        name="confirmPassword"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Confirma tu contraseña"
                        className="min-h-[52px] min-w-0 flex-1 bg-transparent text-[13px] outline-none"
                      />
                    </div>
                  </label>

                <label className="flex items-start gap-3 text-[11px] leading-5 text-[#6f5a4d]">
                  <input
                    required
                    name="terms"
                    type="checkbox"
                    className="mt-1 accent-[#681126]"
                  />

                  <span>
                    Confirmo que cumplo con la edad requerida y acepto los
                    {' '}
                    <Link to="/terminos-y-condiciones" target="_blank" rel="noreferrer" className="font-bold text-[#681126] underline">
                      términos y condiciones
                    </Link>
                    {' '}
                    y la
                    {' '}
                    <Link to="/politica-de-privacidad" target="_blank" rel="noreferrer" className="font-bold text-[#681126] underline">
                      política de privacidad
                    </Link>
                    .
                  </span>
                </label>
                </>
              ) : (
                <Link
                  to="/recuperar"
                  onClick={closeAuth}
                  className="text-[12px] font-semibold text-[#681126]"
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              )}

              {authError ? (
                <p className="rounded-[0.8rem] bg-[#fff1f2] px-3 py-2 text-[12px] text-[#9f1239]">
                  {authError}
                </p>
              ) : null}

              {authNotice ? (
                <div className="rounded-[0.8rem] bg-[#f7efe4] px-3 py-2 text-[12px] text-[#5f463a]">
                  <p>{authNotice}</p>
                  {verificationEmail ? (
                    <button
                      type="button"
                      onClick={() => resendVerification(verificationEmail)}
                      className="mt-2 font-bold text-[#681126]"
                    >
                      Reenviar verificación
                    </button>
                  ) : null}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={isSubmittingAuth}
                className="inline-flex min-h-[53px] w-full items-center justify-center gap-3 rounded-full bg-[#681126] px-6 text-[14px] font-bold text-white shadow-[0_14px_30px_rgba(104,17,38,0.2)] disabled:opacity-60"
              >
                {isSubmittingAuth
                  ? 'Procesando...'
                  : authMode === 'register'
                  ? 'Crear mi cuenta'
                  : 'Iniciar sesión'}
                <ArrowRight size={17} />
              </button>
            </form>

            <div className="mt-7 text-center text-[12px] text-[#7f6a59]">
              {authMode === 'register' ? (
                <p>
                  ¿Ya tienes una cuenta?{' '}
                  <button
                    type="button"
                    onClick={() => setAuthMode('login')}
                    className="font-bold text-[#681126]"
                  >
                    Inicia sesión
                  </button>
                </p>
              ) : (
                <p>
                  ¿Aún no tienes una cuenta?{' '}
                  <button
                    type="button"
                    onClick={() => setAuthMode('register')}
                    className="font-bold text-[#681126]"
                  >
                    Créala aquí
                  </button>
                </p>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {onboardingStep !== null ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[110] flex items-center justify-center bg-[#180309]/82 p-4 backdrop-blur-lg"
        >
          <div className="w-full max-w-[470px] overflow-hidden rounded-[2rem] bg-[#fffaf3] shadow-[0_45px_110px_rgba(20,2,8,0.48)]">
            <div className="relative h-[260px] overflow-hidden">
              <img
                src={
                  onboardingStep === 1
                    ? '/boda 2.webp'
                    : onboardingStep === 2
                      ? '/Hacienda-de-Letras hacienda.jpg'
                      : '/turismo.jpeg'
                }
                alt=""
                className="h-full w-full object-cover"
              />

              <div className="absolute inset-0 bg-gradient-to-t from-[#2f0913]/85 to-transparent" />

              <button
                type="button"
                onClick={finishOnboarding}
                className="absolute right-5 top-5 rounded-full bg-white/90 px-4 py-2 text-[11px] font-bold text-[#681126]"
              >
                Omitir
              </button>

              <div className="absolute bottom-6 left-6 inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#681126] text-[#dbc59d] shadow-xl">
                {(() => {
                  const CurrentIcon =
                    onboardingScreens[onboardingStep].icon

                  return <CurrentIcon size={24} />
                })()}
              </div>
            </div>

            <div className="p-7 md:p-9">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#b48a55]">
                {onboardingScreens[onboardingStep].eyebrow}
              </p>

              <h2
                className="mt-3 text-[36px] leading-[1.04] text-[#4f0f1f]"
                style={{
                  fontFamily: 'var(--font-display)',
                }}
              >
                {onboardingScreens[onboardingStep].title}
              </h2>

              <p className="mt-5 text-[14px] leading-7 text-[#6f5a4d]">
                {onboardingScreens[onboardingStep].description}
              </p>

              <div className="mt-8 flex items-center justify-between">
                <div className="flex gap-2">
                  {onboardingScreens.map((screen, index) => (
                    <span
                      key={screen.title}
                      className={`h-2 rounded-full transition-all ${
                        index === onboardingStep
                          ? 'w-7 bg-[#681126]'
                          : 'w-2 bg-[#d8c7b4]'
                      }`}
                    />
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (
                      onboardingStep ===
                      onboardingScreens.length - 1
                    ) {
                      finishOnboarding()
                      return
                    }

                    setOnboardingStep(onboardingStep + 1)
                  }}
                  className="inline-flex min-h-[50px] items-center gap-3 rounded-full bg-[#681126] px-6 text-[13px] font-bold text-white"
                >
                  {onboardingStep === onboardingScreens.length - 1
                    ? 'Entrar a la app'
                    : 'Continuar'}
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
