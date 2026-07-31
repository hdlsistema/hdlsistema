
import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react'
import { Link } from 'react-router-dom'
import {
  Activity,
  ArrowRight,
  BrainCircuit,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Eye,
  Grape,
  MessageCircle,
  PartyPopper,
  RefreshCw,
  Route,
  Send,
  Sparkles,
  TicketCheck,
  TrendingUp,
  Users,
  WalletCards,
  Wine,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { MapboxScene } from '../../components/shared/MapboxScene'
import { useAppPreferences } from '../../context/AppPreferencesContext'

type KpiItem = {
  label: string
  value: string
  note: string
  delta: string
  icon: LucideIcon
  status: 'positive' | 'attention' | 'neutral'
}

type ExperienceItem = {
  name: string
  reservations: number
  occupancy: number
  revenue: string
  nextSlot: string
}

type LiveArea = {
  name: string
  visitors: number
  capacity: number
  status: string
}

type AgendaItem = {
  time: string
  title: string
  detail: string
  status: string
  icon: LucideIcon
}

function getKpis(isEnglish: boolean): KpiItem[] {
  return [
    {
      label: isEnglish ? 'App sales' : 'Ventas desde la app',
      value: '$1,248,750',
      note: isEnglish ? 'Wine, experiences and events' : 'Vino, experiencias y eventos',
      delta: '+18.6%',
      icon: WalletCards,
      status: 'positive',
    },
    {
      label: isEnglish ? 'Active bookings' : 'Reservaciones activas',
      value: '368',
      note: isEnglish ? '126 paid from the app' : '126 pagadas desde la app',
      delta: '+14.2%',
      icon: CalendarDays,
      status: 'positive',
    },
    {
      label: isEnglish ? 'Visitors on site' : 'Visitantes en sitio',
      value: '124',
      note: isEnglish ? '6 zones with activity' : '6 zonas con actividad',
      delta: isEnglish ? 'Live' : 'En vivo',
      icon: Users,
      status: 'neutral',
    },
    {
      label: isEnglish ? 'Average occupancy' : 'Ocupación promedio',
      value: '78%',
      note: isEnglish ? 'Saturday projected at 91%' : 'Sábado proyectado al 91%',
      delta: '+9 pts',
      icon: Activity,
      status: 'positive',
    },
    {
      label: isEnglish ? 'Digital conversion' : 'Conversión digital',
      value: '6.7%',
      note: isEnglish ? 'From web visit to booking' : 'De visita web a reservación',
      delta: '+0.8 pts',
      icon: TrendingUp,
      status: 'positive',
    },
  ]
}

function getExperiencePerformance(isEnglish: boolean): ExperienceItem[] {
  return [
    {
      name: isEnglish ? 'Wine tastings' : 'Catas de vino',
      reservations: 164,
      occupancy: 92,
      revenue: '$241,600',
      nextSlot: isEnglish ? 'Sat 16:00' : 'Sáb. 16:00',
    },
    {
      name: isEnglish ? 'Vineyard tour' : 'Recorrido por viñedos',
      reservations: 112,
      occupancy: 78,
      revenue: '$156,800',
      nextSlot: isEnglish ? 'Today 14:30' : 'Hoy 14:30',
    },
    {
      name: isEnglish ? 'Romantic dinner' : 'Cena romántica',
      reservations: 38,
      occupancy: 86,
      revenue: '$98,600',
      nextSlot: isEnglish ? 'Fri 20:00' : 'Vie. 20:00',
    },
    {
      name: isEnglish ? 'Vineyard picnic' : 'Picnic entre viñedos',
      reservations: 26,
      occupancy: 64,
      revenue: '$36,400',
      nextSlot: isEnglish ? 'Sat 13:00' : 'Sáb. 13:00',
    },
    {
      name: isEnglish ? 'Restaurant' : 'Restaurante',
      reservations: 216,
      occupancy: 71,
      revenue: '$287,200',
      nextSlot: isEnglish ? 'Today 15:00' : 'Hoy 15:00',
    },
  ]
}

function getLiveAreas(isEnglish: boolean): LiveArea[] {
  return [
    {
      name: 'Terraza 1854',
      visitors: 38,
      capacity: 50,
      status: isEnglish ? 'High activity' : 'Alta actividad',
    },
    {
      name: isEnglish ? 'Upper Vineyard' : 'Viñedo Alto',
      visitors: 24,
      capacity: 40,
      status: isEnglish ? 'Tour in progress' : 'Recorrido activo',
    },
    {
      name: isEnglish ? 'Barrel Hall' : 'Salón Barricas',
      visitors: 18,
      capacity: 30,
      status: isEnglish ? 'Tasting in progress' : 'Cata en curso',
    },
    {
      name: isEnglish ? 'Restaurant' : 'Restaurante',
      visitors: 31,
      capacity: 54,
      status: isEnglish ? 'Open service' : 'Servicio abierto',
    },
    {
      name: isEnglish ? 'Underground Cellar' : 'Cava Subterránea',
      visitors: 13,
      capacity: 20,
      status: isEnglish ? 'Private dinner' : 'Cena privada',
    },
  ]
}

function getAgenda(isEnglish: boolean): AgendaItem[] {
  return [
    {
      time: '12:30',
      title: isEnglish ? 'Corporate group arrival' : 'Llegada grupo empresarial',
      detail: isEnglish ? '24 guests · Terraza 1854' : '24 personas · Terraza 1854',
      status: isEnglish ? 'Confirmed' : 'Confirmado',
      icon: Users,
    },
    {
      time: '14:30',
      title: isEnglish ? 'Vineyard tour' : 'Recorrido por viñedos',
      detail: isEnglish ? '18 guests · Guide assigned' : '18 personas · Guía asignado',
      status: isEnglish ? 'Ready' : 'Listo',
      icon: Route,
    },
    {
      time: '16:00',
      title: isEnglish ? 'Gran Reserva Tasting' : 'Cata Gran Reserva',
      detail: isEnglish ? '12 guests · Barrel Hall' : '12 personas · Salón Barricas',
      status: isEnglish ? 'High priority' : 'Alta prioridad',
      icon: Wine,
    },
    {
      time: '20:00',
      title: isEnglish ? 'Pairing dinner' : 'Cena de maridaje',
      detail: isEnglish ? '8 tables · Underground Cellar' : '8 mesas · Cava Subterránea',
      status: isEnglish ? 'Preparation' : 'Preparación',
      icon: PartyPopper,
    },
  ]
}

function getWeeklyOccupancy(isEnglish: boolean) {
  return [
    { name: isEnglish ? 'Tastings' : 'Catas', values: [58, 64, 69, 76, 88, 96, 82] },
    { name: isEnglish ? 'Tours' : 'Recorridos', values: [44, 52, 61, 67, 79, 91, 73] },
    { name: isEnglish ? 'Dinners' : 'Cenas', values: [32, 38, 48, 56, 81, 94, 86] },
    { name: 'Picnic', values: [26, 31, 40, 49, 66, 78, 69] },
    { name: isEnglish ? 'Restaurant' : 'Restaurante', values: [54, 61, 68, 72, 84, 89, 77] },
  ]
}

const weekDays = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

const salesBars = [42, 48, 55, 51, 64, 69, 74, 71, 82, 88, 92, 97]

function getChannelMix(isEnglish: boolean) {
  return [
    {
      label: isEnglish ? 'Hacienda App' : 'App Hacienda',
      value: 48,
      note: isEnglish ? '598 bookings' : '598 reservaciones',
    },
    {
      label: 'Instagram',
      value: 23,
      note: isEnglish ? '287 bookings' : '287 reservaciones',
    },
    {
      label: 'Google',
      value: 17,
      note: isEnglish ? '212 bookings' : '212 reservaciones',
    },
    {
      label: isEnglish ? 'Direct sales' : 'Venta directa',
      value: 12,
      note: isEnglish ? '151 bookings' : '151 reservaciones',
    },
  ]
}

const quickQuestions = [
  '¿Cómo vamos hoy?',
  '¿Qué debo atender primero?',
  '¿Cómo estará el sábado?',
  '¿Qué está vendiendo mejor?',
]

function getGreeting(language: 'es' | 'en') {
  const hour = new Date().getHours()

  if (hour < 12) {
    return language === 'en' ? 'Good morning' : 'Buenos días'
  }

  if (hour < 19) {
    return language === 'en' ? 'Good afternoon' : 'Buenas tardes'
  }

  return language === 'en' ? 'Good evening' : 'Buenas noches'
}

function getHeatColor(value: number) {
  if (value >= 90) {
    return '#681126'
  }

  if (value >= 80) {
    return '#8f2740'
  }

  if (value >= 70) {
    return '#b04c56'
  }

  if (value >= 60) {
    return '#cf7b72'
  }

  if (value >= 45) {
    return '#e5aa94'
  }

  return '#f3d9c9'
}

function createAiAnswer(question: string, language: 'es' | 'en') {
  const normalizedQuestion = question
    .toLocaleLowerCase('es-MX')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

  if (
    normalizedQuestion.includes('hoy') ||
    normalizedQuestion.includes('vamos') ||
    normalizedQuestion.includes('today') ||
    normalizedQuestion.includes('doing')
  ) {
    return language === 'en'
      ? 'The estate is operating above target. You are at $1.24M in monthly sales, 368 active bookings and 124 visitors on site. The immediate focus is the 4:00 PM tasting, already at 92% occupancy. It would be smart to open 12 extra seats for Saturday.'
      : 'La hacienda opera por encima del objetivo. Llevas $1.24 M en ventas del mes, 368 reservaciones activas y 124 visitantes en sitio. El foco inmediato es la cata de las 16:00, que está al 92% de ocupación. Conviene abrir 12 lugares adicionales para el sábado.'
  }

  if (
    normalizedQuestion.includes('primero') ||
    normalizedQuestion.includes('atender') ||
    normalizedQuestion.includes('alerta') ||
    normalizedQuestion.includes('first') ||
    normalizedQuestion.includes('handle')
  ) {
    return language === 'en'
      ? 'Priority one: confirm the 12:30 corporate group. Priority two: release an extra tasting slot for Saturday. Priority three: contact the 19 guests who started a booking and did not finish payment. That recovery could represent about $31,800.'
      : 'Prioridad uno: confirmar el grupo empresarial de las 12:30. Prioridad dos: liberar una salida adicional de cata para el sábado. Prioridad tres: contactar a 19 clientes que iniciaron reservación y no concluyeron el pago. Esa recuperación podría representar aproximadamente $31,800.'
  }

  if (
    normalizedQuestion.includes('sabado') ||
    normalizedQuestion.includes('ocupacion') ||
    normalizedQuestion.includes('saturday') ||
    normalizedQuestion.includes('occupancy')
  ) {
    return language === 'en'
      ? 'Saturday is projected at 91% overall occupancy. Tastings will reach 96%, dinners 94% and vineyard tours 91%. I recommend adding an extra tasting at 6:00 PM and reinforcing service at Terraza 1854 between 3:30 PM and 6:30 PM.'
      : 'El sábado se proyecta al 91% de ocupación general. Catas llegará a 96%, cenas a 94% y recorridos a 91%. Sugiero abrir un horario adicional de cata a las 18:00 y reforzar atención en Terraza 1854 entre 15:30 y 18:30.'
  }

  if (
    normalizedQuestion.includes('vende') ||
    normalizedQuestion.includes('ventas') ||
    normalizedQuestion.includes('mejor') ||
    normalizedQuestion.includes('selling') ||
    normalizedQuestion.includes('sales') ||
    normalizedQuestion.includes('best')
  ) {
    return language === 'en'
      ? 'The best mix of margin and demand is wine tastings. They generate $241,600 at 92% occupancy. In pure volume, the restaurant leads with $287,200. Instagram campaigns convert 23% better when they promote romantic dinners and seasonal events.'
      : 'La mejor combinación de margen y demanda es Catas de vino. Genera $241,600 con 92% de ocupación. En volumen, el restaurante lidera con $287,200. Las campañas de Instagram convierten 23% mejor cuando promocionan cena romántica y eventos de temporada.'
  }

  if (
    normalizedQuestion.includes('cliente') ||
    normalizedQuestion.includes('conversion') ||
    normalizedQuestion.includes('campana') ||
    normalizedQuestion.includes('customer') ||
    normalizedQuestion.includes('campaign')
  ) {
    return language === 'en'
      ? 'Digital conversion stands at 6.7%, which is 0.8 points above last month. The app is the strongest channel with 48% of bookings. There is a clear opportunity in recovering carts and incomplete reservations during the first 35 minutes.'
      : 'La conversión digital está en 6.7%, 0.8 puntos arriba del mes anterior. El canal con mayor peso es la app con 48% de las reservaciones. Hay una oportunidad clara en recuperar carritos y reservaciones incompletas durante los primeros 35 minutos.'
  }

  return language === 'en'
    ? 'With current data, the operation is stable and growing. The biggest upside is in expanding tasting capacity, recovering incomplete payments and pushing seasonal events from the app. I can go deeper into sales, occupancy, customers, schedule or conversion.'
    : 'Con los datos actuales, la operación está estable y creciendo. El mayor potencial está en ampliar capacidad de catas, recuperar pagos incompletos y empujar eventos de temporada desde la app. Puedo profundizar en ventas, ocupación, clientes, agenda o conversión.'
}

function ExecutiveCard({
  title,
  children,
  className = '',
}: {
  title: string
  children: ReactNode
  className?: string
}) {
  return (
    <article
      className={`min-w-0 overflow-hidden rounded-[1.35rem] border border-[var(--color-line)] bg-[var(--color-panel)] shadow-[var(--shadow-card)] ${className}`}
    >
      <div className="border-b border-[var(--color-line)] px-5 py-4">
        <h3
          className="text-[1.35rem] leading-none text-[var(--color-ink)]"
          style={{
            fontFamily: 'var(--font-display)',
          }}
        >
          {title}
        </h3>
      </div>

      {children}
    </article>
  )
}

function KpiCard({
  item,
  emphasized = false,
}: {
  item: KpiItem
  emphasized?: boolean
}) {
  const Icon = item.icon

  return (
    <article
      className={`relative min-w-0 overflow-hidden rounded-[1.25rem] border p-4 shadow-[var(--shadow-card)] sm:p-5 ${
        emphasized
          ? 'border-[rgba(104,17,38,0.2)] bg-[linear-gradient(145deg,#681126,#3f0918)] text-white'
          : 'border-[var(--color-line)] bg-[var(--color-panel)]'
      }`}
    >
      <div
        className={`absolute -right-9 -top-9 h-24 w-24 rounded-full border ${
          emphasized
            ? 'border-white/10'
            : 'border-[rgba(180,138,85,0.15)]'
        }`}
      />

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p
            className={`truncate text-[11px] font-medium ${
              emphasized
                ? 'text-white/68'
                : 'text-[var(--color-muted)]'
            }`}
          >
            {item.label}
          </p>

          <p
            className={`mt-3 text-[1.8rem] leading-none sm:text-[2rem] ${
              emphasized
                ? 'text-white'
                : 'text-[var(--color-ink)]'
            }`}
            style={{
              fontFamily: 'var(--font-display)',
            }}
          >
            {item.value}
          </p>
        </div>

        <span
          className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
            emphasized
              ? 'bg-white/10 text-[#e6c38b]'
              : 'bg-[var(--color-soft)] text-[var(--color-burgundy)]'
          }`}
        >
          <Icon size={18} />
        </span>
      </div>

      <div className="relative mt-4">
        <p
          className={`line-clamp-1 text-[10px] ${
            emphasized
              ? 'text-white/60'
              : 'text-[var(--color-muted)]'
          }`}
        >
          {item.note}
        </p>

        <span
          className={`mt-2 inline-flex rounded-full px-2 py-1 text-[9px] font-bold ${
            item.status === 'positive'
              ? emphasized
                ? 'bg-white/10 text-[#ead3a7]'
                : 'bg-[#edf6ee] text-[#47724b]'
              : item.status === 'attention'
                ? 'bg-[#fff3de] text-[#9b6419]'
                : emphasized
                  ? 'bg-white/10 text-white'
                  : 'bg-[var(--color-soft)] text-[var(--color-burgundy)]'
          }`}
        >
          {item.delta}
        </span>
      </div>
    </article>
  )
}

export function DashboardPage() {
  const { adminName, language, locale, isEnglish } =
    useAppPreferences()
  const kpis = useMemo(() => getKpis(isEnglish), [isEnglish])
  const experiencePerformance = useMemo(() => getExperiencePerformance(isEnglish), [isEnglish])
  const liveAreas = useMemo(() => getLiveAreas(isEnglish), [isEnglish])
  const agenda = useMemo(() => getAgenda(isEnglish), [isEnglish])
  const weeklyOccupancy = useMemo(() => getWeeklyOccupancy(isEnglish), [isEnglish])
  const channelMix = useMemo(() => getChannelMix(isEnglish), [isEnglish])
  const [aiQuestion, setAiQuestion] = useState('')
  const [aiAnswer, setAiAnswer] = useState(
    language === 'en'
      ? 'The operation is stable and above target. Saturday tasting demand requires more capacity. There are also 19 pending bookings that should be recovered today.'
      : 'La operación está estable y por encima del objetivo. La demanda de catas para el sábado requiere ampliar capacidad. También hay 19 reservaciones pendientes de pago que conviene recuperar hoy.',
  )
  const [lastQuestion, setLastQuestion] = useState(
    language === 'en'
      ? 'Executive summary for today'
      : 'Resumen ejecutivo de hoy',
  )

  const dateLabel = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      }).format(new Date()),
    [locale],
  )

  const localizedQuickQuestions = useMemo(
    () =>
      isEnglish
        ? [
            'How are we doing today?',
            'What should I handle first?',
            'How will Saturday perform?',
            'What is selling best?',
          ]
        : quickQuestions,
    [isEnglish],
  )

  useEffect(() => {
    setAiAnswer(
      language === 'en'
        ? 'The operation is stable and above target. Saturday tasting demand requires more capacity. There are also 19 pending bookings that should be recovered today.'
        : 'La operación está estable y por encima del objetivo. La demanda de catas para el sábado requiere ampliar capacidad. También hay 19 reservaciones pendientes de pago que conviene recuperar hoy.',
    )
    setLastQuestion(
      language === 'en'
        ? 'Executive summary for today'
        : 'Resumen ejecutivo de hoy',
    )
  }, [language])

  const handleAiQuestion = (
    question: string,
  ) => {
    const cleanQuestion = question.trim()

    if (!cleanQuestion) {
      return
    }

    setLastQuestion(cleanQuestion)
    setAiAnswer(createAiAnswer(cleanQuestion, language))
    setAiQuestion('')
  }

  const handleSubmit = (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault()
    handleAiQuestion(aiQuestion)
  }

  return (
    <div className="min-w-0 space-y-5 overflow-x-hidden pb-8">
      <section className="relative overflow-hidden rounded-[1.45rem] border border-[rgba(200,171,136,0.18)] bg-[linear-gradient(145deg,rgba(79,15,31,0.98),rgba(108,27,47,0.9)_58%,rgba(142,69,84,0.84)_100%)] px-5 py-5 text-white shadow-[0_18px_46px_rgba(49,10,20,0.14)] sm:px-6 sm:py-5">
        <div className="absolute -right-12 -top-24 h-56 w-56 rounded-full border border-white/8" />
        <div className="absolute right-8 top-8 h-28 w-28 rounded-full border border-white/8" />

        <div className="relative grid gap-5 xl:grid-cols-[1.35fr_0.65fr] xl:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#e8c78e]">
                <span className="h-2 w-2 rounded-full bg-[#7fe19a] shadow-[0_0_0_5px_rgba(127,225,154,0.12)]" />
                {isEnglish ? 'Live operation' : 'Operación en vivo'}
              </span>

              <span className="text-[11px] capitalize text-white/55">
                {dateLabel}
              </span>
            </div>

            <h1
              className="mt-4 max-w-[720px] text-[1.9rem] font-normal leading-[0.98] text-white sm:text-[2.55rem]"
              style={{
                fontFamily: 'var(--font-display)',
              }}
            >
              {getGreeting(language)}, {adminName}.{' '}
              {isEnglish
                ? 'This is how the estate is moving today.'
                : 'Así se mueve la hacienda hoy.'}
            </h1>

            <p className="mt-3 max-w-[700px] text-[12px] leading-6 text-white/70 sm:text-[13px]">
              {isEnglish
                ? 'Sales, bookings, occupancy, visitors and customer behavior in one command center.'
                : 'Ventas, reservaciones, ocupación, visitantes y comportamiento del cliente en un solo centro de mando.'}
            </p>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/control/reservaciones"
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-[#e3c38e] px-4 text-[11px] font-bold text-[#38101a] shadow-[0_10px_24px_rgba(26,10,15,0.16)] transition hover:-translate-y-0.5"
              >
                {isEnglish ? 'View bookings' : 'Ver reservaciones'}
                <ArrowRight size={15} />
              </Link>

              <Link
                to="/control/app/home"
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-white/20 bg-white/8 px-4 text-[11px] font-semibold text-white backdrop-blur transition hover:bg-white/13"
                style={{
                  color: '#ffffff',
                }}
              >
                <Eye size={15} color="#ffffff" />
                {isEnglish
                  ? 'Open app experience'
                  : 'Abrir experiencia de la app'}
              </Link>
            </div>
          </div>

          <div className="rounded-[1.15rem] border border-white/12 bg-[rgba(255,255,255,0.08)] p-4 backdrop-blur-xl sm:p-4.5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.17em] text-[#e8c78e]">
                  {isEnglish ? 'ALQIA summary' : 'Resumen ALQIA'}
                </p>

                <p className="mt-2 text-[11px] leading-5 text-white/70">
                  {isEnglish
                    ? 'Saturday demand is growing faster than current capacity.'
                    : 'La demanda del sábado está creciendo más rápido que la capacidad actual.'}
                </p>
              </div>

              <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#e8c78e]/35 text-[#e8c78e]">
                <BrainCircuit size={20} />
              </span>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              {(isEnglish
                ? [['91%', 'Sat occupancy'], ['19', 'Payments to close'], ['$31.8k', 'Recoverable revenue']]
                : [['91%', 'Ocupación sábado'], ['19', 'Pagos por cerrar'], ['$31.8k', 'Ingreso recuperable']]
              ).map(([value, label]) => (
                <div
                  key={label}
                  className="rounded-[0.9rem] bg-[rgba(255,255,255,0.08)] p-3"
                >
                  <p
                    className="text-[1rem] leading-none text-white"
                    style={{
                      fontFamily:
                        'var(--font-display)',
                    }}
                  >
                    {value}
                  </p>

                  <p className="mt-2 text-[8px] leading-3 text-white/48">
                    {label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-5 lg:gap-4">
        {kpis.map((item, index) => (
          <div
            key={item.label}
            className={
              index === kpis.length - 1
                ? 'col-span-2 lg:col-span-1'
                : ''
            }
          >
            <KpiCard
              item={item}
              emphasized={index === 2}
            />
          </div>
        ))}
      </section>

      <section className="grid min-w-0 gap-5 2xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.55fr)]">
        <article className="min-w-0 overflow-hidden rounded-[1.4rem] border border-[var(--color-line)] bg-[var(--color-panel)] shadow-[var(--shadow-card)]">
          <div className="flex flex-col gap-3 border-b border-[var(--color-line)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.17em] text-[var(--color-gold)]">
                {isEnglish ? 'Real-time activity' : 'Actividad en tiempo real'}
              </p>

              <h2
                className="mt-2 text-[1.55rem] leading-none text-[var(--color-ink)]"
                style={{
                  fontFamily:
                    'var(--font-display)',
                }}
              >
                {isEnglish ? 'Estate operations map' : 'Mapa operativo de la hacienda'}
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-[#edf6ee] px-3 py-2 text-[9px] font-bold text-[#47724b]">
                <span className="h-2 w-2 rounded-full bg-[#5b9d63]" />
                {isEnglish ? '124 visitors' : '124 visitantes'}
              </span>

              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-line)] bg-[var(--color-panel-strong)] text-[var(--color-burgundy)]"
                aria-label={isEnglish ? 'Refresh map' : 'Actualizar mapa'}
              >
                <RefreshCw size={14} />
              </button>
            </div>
          </div>

          <div className="relative h-[390px] overflow-hidden sm:h-[470px]">
            <MapboxScene
              center={[-102.3238, 21.8858]}
              zoom={14.6}
              pitch={70}
              bearing={-32}
              markers={[
                {
                  coordinates: [-102.331, 21.892],
                  label: 'Viñedo Alto · 24',
                },
                {
                  coordinates: [-102.3255, 21.8878],
                  label: 'Terraza 1854 · 38',
                },
                {
                  coordinates: [-102.3189, 21.8915],
                  label: 'Salón Barricas · 18',
                },
                {
                  coordinates: [-102.3154, 21.8872],
                  label: 'Restaurante · 31',
                },
                {
                  coordinates: [-102.3196, 21.8822],
                  label: 'Cava Subterránea · 13',
                },
                {
                  coordinates: [-102.3272, 21.8794],
                  label: 'Viñedo Bajo',
                },
              ]}
              className="h-full min-h-[390px] w-full"
            />

            <div className="absolute left-4 top-4 max-w-[220px] rounded-[1rem] border border-white/15 bg-[#251018]/78 p-4 text-white shadow-xl backdrop-blur-md">
              <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#e8c78e]">
                {isEnglish ? 'Right now' : 'Ahora mismo'}
              </p>

              <p
                className="mt-2 text-[2.2rem] leading-none text-white"
                style={{
                  fontFamily:
                    'var(--font-display)',
                }}
              >
                124
              </p>

              <p className="mt-2 text-[10px] leading-4 text-white/65">
                {isEnglish ? 'visitors across six zones' : 'visitantes distribuidos en seis zonas'}
              </p>
            </div>

            <div className="absolute bottom-4 left-4 right-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {liveAreas.slice(0, 3).map((area) => (
                <div
                  key={area.name}
                  className="rounded-[0.85rem] border border-white/12 bg-[#251018]/74 px-3 py-2 text-white backdrop-blur-md"
                >
                  <p className="truncate text-[9px] font-bold">
                    {area.name}
                  </p>

                  <p className="mt-1 text-[8px] text-white/58">
                    {area.visitors} {isEnglish ? 'guests' : 'personas'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </article>

        <ExecutiveCard title={isEnglish ? 'Live operation' : 'Operación en vivo'}>
          <div className="space-y-3 p-4">
            {liveAreas.map((area) => {
              const percentage = Math.round(
                (area.visitors / area.capacity) * 100,
              )

              return (
                <div
                  key={area.name}
                  className="rounded-[1rem] border border-[var(--color-line)] bg-[var(--color-panel-strong)] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-[12px] font-semibold text-[var(--color-ink)]">
                        {area.name}
                      </p>

                      <p className="mt-1 text-[9px] text-[var(--color-muted)]">
                        {area.status}
                      </p>
                    </div>

                    <span
                      className={`shrink-0 rounded-full px-2 py-1 text-[8px] font-bold ${
                        percentage >= 75
                          ? 'bg-[#f9e6df] text-[#8a2638]'
                          : 'bg-[#edf6ee] text-[#47724b]'
                      }`}
                    >
                      {percentage}%
                    </span>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3 text-[9px] text-[var(--color-muted)]">
                    <span>
                      {area.visitors} {isEnglish ? 'of' : 'de'} {area.capacity}
                    </span>
                    <span>{area.capacity - area.visitors} {isEnglish ? 'seats' : 'lugares'}</span>
                  </div>

                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--color-soft)]">
                    <div
                      className="h-full rounded-full bg-[linear-gradient(90deg,#b78b55,#681126)]"
                      style={{
                        width: `${percentage}%`,
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </ExecutiveCard>
      </section>

      <section className="grid min-w-0 gap-5 2xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
        <ExecutiveCard title={isEnglish ? 'Sales and bookings' : 'Ventas y reservaciones'}>
          <div className="p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-[var(--color-muted)]">
                  {isEnglish ? 'Monthly total' : 'Acumulado mensual'}
                </p>

                <p
                  className="mt-2 text-[2.35rem] leading-none text-[var(--color-ink)]"
                  style={{
                    fontFamily:
                      'var(--font-display)',
                  }}
                >
                  $1,248,750
                </p>

                <p className="mt-2 text-[11px] font-semibold text-[#47724b]">
                  {isEnglish ? '+18.6% vs. last month' : '+18.6% contra el mes anterior'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-[0.9rem] bg-[var(--color-soft)] px-4 py-3">
                  <p className="text-[9px] text-[var(--color-muted)]">
                    {isEnglish ? 'Avg. ticket' : 'Ticket promedio'}
                  </p>
                  <p className="mt-1 text-[14px] font-bold text-[var(--color-ink)]">
                    $1,320
                  </p>
                </div>

                <div className="rounded-[0.9rem] bg-[var(--color-soft)] px-4 py-3">
                  <p className="text-[9px] text-[var(--color-muted)]">
                    {isEnglish ? 'Orders' : 'Órdenes'}
                  </p>
                  <p className="mt-1 text-[14px] font-bold text-[var(--color-ink)]">
                    945
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-7 h-[220px] rounded-[1.1rem] bg-[linear-gradient(180deg,#fffaf4,#f6eadc)] p-4">
              <div className="flex h-full items-end gap-2">
                {salesBars.map((height, index) => (
                  <div
                    key={`${height}-${index}`}
                    className="group relative flex h-full flex-1 items-end"
                  >
                    <div
                      className="w-full rounded-t-full bg-[linear-gradient(180deg,#c49a62,#681126)]"
                      style={{
                        height: `${height}%`,
                      }}
                    />

                    {index === salesBars.length - 1 ? (
                      <span className="absolute -top-1 right-0 rounded-full bg-[#681126] px-2 py-1 text-[8px] font-bold text-white">
                        {isEnglish ? 'Today' : 'Hoy'}
                      </span>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3 text-[9px] text-[var(--color-muted)]">
              <span>{isEnglish ? 'Week 1' : 'Semana 1'}</span>
              <span>{isEnglish ? 'Week 2' : 'Semana 2'}</span>
              <span>{isEnglish ? 'Week 3' : 'Semana 3'}</span>
              <span>{isEnglish ? 'Week 4' : 'Semana 4'}</span>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {(isEnglish
                ? [['Wines', '$842,300', '67%'], ['Experiences', '$406,450', '33%'], ['Paid in app', '$632,180', '51%']]
                : [['Vinos', '$842,300', '67%'], ['Experiencias', '$406,450', '33%'], ['Pagado en app', '$632,180', '51%']]
              ).map(([label, value, share]) => (
                <div
                  key={label}
                  className="rounded-[1rem] border border-[var(--color-line)] bg-[var(--color-panel-strong)] p-4"
                >
                  <p className="text-[9px] text-[var(--color-muted)]">
                    {label}
                  </p>
                  <p className="mt-2 text-[14px] font-bold text-[var(--color-ink)]">
                    {value}
                  </p>
                  <p className="mt-1 text-[9px] font-semibold text-[var(--color-burgundy)]">
                    {share}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </ExecutiveCard>

        <ExecutiveCard title={isEnglish ? 'Experience performance' : 'Rendimiento por experiencia'}>
          <div className="space-y-4 p-5">
            {experiencePerformance.map((experience) => (
              <div
                key={experience.name}
                className="rounded-[1rem] border border-[var(--color-line)] bg-[var(--color-panel-strong)] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[12px] font-semibold text-[var(--color-ink)]">
                      {experience.name}
                    </p>

                    <p className="mt-1 text-[9px] text-[var(--color-muted)]">
                      {experience.reservations} {isEnglish ? 'bookings' : 'reservas'} ·{' '}
                      {experience.revenue}
                    </p>
                  </div>

                  <span
                    className={`shrink-0 rounded-full px-2 py-1 text-[8px] font-bold ${
                      experience.occupancy >= 85
                        ? 'bg-[#f9e6df] text-[#8a2638]'
                        : 'bg-[#edf6ee] text-[#47724b]'
                    }`}
                  >
                    {experience.occupancy}%
                  </span>
                </div>

                <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--color-soft)]">
                  <div
                    className="h-full rounded-full bg-[linear-gradient(90deg,#c79d65,#681126)]"
                    style={{
                      width: `${experience.occupancy}%`,
                    }}
                  />
                </div>

                <div className="mt-3 flex items-center justify-between gap-3 text-[9px]">
                  <span className="text-[var(--color-muted)]">
                    {isEnglish ? 'Next slot' : 'Próximo horario'}
                  </span>
                  <span className="font-semibold text-[var(--color-burgundy)]">
                    {experience.nextSlot}
                  </span>
                </div>
              </div>
            ))}

            <Link
              to="/control/experiencias"
              className="flex min-h-11 items-center justify-between rounded-xl bg-[var(--color-soft)] px-4 text-[11px] font-semibold text-[var(--color-burgundy)]"
            >
              Ver desempeño completo
              <ChevronRight size={15} />
            </Link>
          </div>
        </ExecutiveCard>
      </section>

      <section className="grid min-w-0 gap-5 2xl:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)]">
        <article className="relative min-w-0 overflow-hidden rounded-[1.45rem] bg-[linear-gradient(145deg,#2b0711,#681126_58%,#8b243b)] p-5 text-white shadow-[0_26px_60px_rgba(49,10,20,0.24)] sm:p-6">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full border border-white/10" />
          <div className="absolute -right-8 -top-8 h-44 w-44 rounded-full border border-white/10" />

          <div className="relative">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#e8c78e]">
                  {isEnglish
                    ? 'ALQIA Executive Assistant'
                    : 'Asistente ejecutivo ALQIA'}
                </p>

                <h2
                  className="mt-3 text-[1.8rem] leading-[1.02] text-white sm:text-[2.15rem]"
                  style={{
                    fontFamily:
                      'var(--font-display)',
                  }}
                >
                  {isEnglish
                    ? 'Ask anything you need. The estate answers.'
                    : 'Pregunta lo que necesites. La hacienda responde.'}
                </h2>
              </div>

              <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[#e8c78e]/30 text-[#e8c78e]">
                <Sparkles size={21} />
              </span>
            </div>

            <div className="mt-6 rounded-[1.1rem] border border-white/12 bg-white/8 p-4 backdrop-blur-md">
              <div className="flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.13em] text-white/45">
                <MessageCircle size={13} />
                {lastQuestion}
              </div>

              <p className="mt-3 text-[13px] leading-6 text-white/84">
                {aiAnswer}
              </p>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {localizedQuickQuestions.map((question) => (
                <button
                  key={question}
                  type="button"
                  onClick={() => handleAiQuestion(question)}
                  className="rounded-full border border-white/14 bg-white/7 px-3 py-2 text-[9px] font-semibold text-white/72 transition hover:bg-white/12"
                  style={{
                    color: 'rgba(255,255,255,0.78)',
                  }}
                >
                  {question}
                </button>
              ))}
            </div>

            <form
              onSubmit={handleSubmit}
              className="mt-5 flex min-w-0 items-center gap-2 rounded-full border border-white/16 bg-white/10 p-2 backdrop-blur-md"
            >
              <input
                value={aiQuestion}
                onChange={(event) =>
                  setAiQuestion(event.target.value)
                }
                placeholder={
                  isEnglish
                    ? 'Ex. What should I handle first?'
                    : 'Ej. ¿Qué debo atender primero?'
                }
                className="min-h-10 min-w-0 flex-1 bg-transparent px-3 text-[11px] text-white outline-none placeholder:text-white/38"
              />

              <button
                type="submit"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#e3c38e] text-[#38101a]"
                aria-label={
                  isEnglish
                    ? 'Ask ALQIA'
                    : 'Preguntar a ALQIA'
                }
              >
                <Send size={16} />
              </button>
            </form>

            <p className="mt-3 text-[8px] uppercase tracking-[0.12em] text-white/35">
              {isEnglish
                ? 'Executive demo connected to simulated control center data'
                : 'Demo ejecutiva conectada a datos simulados del centro de control'}
            </p>
          </div>
        </article>

        <ExecutiveCard title={isEnglish ? "Today's operations schedule" : 'Agenda operativa de hoy'}>
          <div className="space-y-3 p-4">
            {agenda.map((item, index) => {
              const Icon = item.icon

              return (
                <div
                  key={`${item.time}-${item.title}`}
                  className="flex gap-3 rounded-[1rem] border border-[var(--color-line)] bg-[var(--color-panel-strong)] p-4"
                >
                  <div className="flex flex-col items-center">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-soft)] text-[var(--color-burgundy)]">
                      <Icon size={17} />
                    </span>

                    {index < agenda.length - 1 ? (
                      <span className="mt-2 h-full w-px bg-[var(--color-line)]" />
                    ) : null}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[9px] font-bold text-[var(--color-gold)]">
                          {item.time}
                        </p>

                        <p className="mt-1 line-clamp-2 text-[12px] font-semibold text-[var(--color-ink)]">
                          {item.title}
                        </p>

                        <p className="mt-1 text-[9px] leading-4 text-[var(--color-muted)]">
                          {item.detail}
                        </p>
                      </div>

                      <span
                        className={`shrink-0 rounded-full px-2 py-1 text-[8px] font-bold ${
                          item.status === 'Alta prioridad' || item.status === 'High priority'
                            ? 'bg-[#f9e6df] text-[#8a2638]'
                            : 'bg-[#edf6ee] text-[#47724b]'
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}

            <Link
              to="/control/reservaciones"
              className="flex min-h-11 items-center justify-between rounded-xl bg-[var(--color-soft)] px-4 text-[11px] font-semibold text-[var(--color-burgundy)]"
            >
              {isEnglish ? 'View full schedule' : 'Ver agenda completa'}
              <ChevronRight size={15} />
            </Link>
          </div>
        </ExecutiveCard>
      </section>

      <section className="grid min-w-0 gap-5 2xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
        <ExecutiveCard title={isEnglish ? 'Weekly occupancy' : 'Ocupación semanal'}>
          <div className="p-5">
            <div className="grid grid-cols-[88px_repeat(7,minmax(0,1fr))] gap-1.5 text-center">
              <span />

              {weekDays.map((day, index) => (
                <span
                  key={`${day}-${index}`}
                  className="text-[8px] font-bold text-[var(--color-muted)]"
                >
                  {day}
                </span>
              ))}

              {weeklyOccupancy.map((row) => (
                <div
                  key={row.name}
                  className="contents"
                >
                  <span className="truncate py-2 text-left text-[9px] font-semibold text-[var(--color-ink)]">
                    {row.name}
                  </span>

                  {row.values.map((value, index) => (
                    <div
                      key={`${row.name}-${index}`}
                      className="flex min-h-9 items-center justify-center rounded-[0.65rem] text-[8px] font-bold"
                      style={{
                        backgroundColor:
                          getHeatColor(value),
                        color:
                          value >= 70
                            ? '#ffffff'
                            : '#5f3d35',
                      }}
                      title={`${row.name}: ${value}%`}
                    >
                      {value}
                    </div>
                  ))}
                </div>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3 text-[8px] text-[var(--color-muted)]">
              <span>{isEnglish ? 'Low' : 'Baja'}</span>
              {[35, 50, 65, 75, 85, 95].map((value) => (
                <span
                  key={value}
                  className="h-3 w-6 rounded-full"
                  style={{
                    backgroundColor: getHeatColor(value),
                  }}
                />
              ))}
              <span>{isEnglish ? 'High' : 'Alta'}</span>
            </div>

            <div className="mt-5 rounded-[1rem] bg-[var(--color-soft)] p-4">
              <div className="flex items-start gap-3">
                <CircleAlert
                  size={17}
                  className="mt-0.5 shrink-0 text-[var(--color-burgundy)]"
                />

                <div>
                  <p className="text-[11px] font-semibold text-[var(--color-ink)]">
                    {isEnglish ? 'Saturday near capacity' : 'Sábado cerca del límite'}
                  </p>

                  <p className="mt-1 text-[9px] leading-4 text-[var(--color-muted)]">
                    {isEnglish
                      ? 'Tastings, dinners and tours will exceed 90% occupancy if the current pace continues.'
                      : 'Catas, cenas y recorridos superarán 90% de ocupación si continúa el ritmo actual.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </ExecutiveCard>

        <ExecutiveCard title={isEnglish ? 'Source and conversion' : 'Origen y conversión'}>
          <div className="p-5">
            <div className="space-y-4">
              {channelMix.map((channel) => (
                <div key={channel.label}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold text-[var(--color-ink)]">
                        {channel.label}
                      </p>

                      <p className="mt-1 text-[8px] text-[var(--color-muted)]">
                        {channel.note}
                      </p>
                    </div>

                    <span className="text-[11px] font-bold text-[var(--color-burgundy)]">
                      {channel.value}%
                    </span>
                  </div>

                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--color-soft)]">
                    <div
                      className="h-full rounded-full bg-[linear-gradient(90deg,#c89e67,#681126)]"
                      style={{
                        width: `${channel.value}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-[1rem] bg-[#2f0913] p-4 text-white">
                <p className="text-[8px] uppercase tracking-[0.12em] text-white/52">
                  {isEnglish ? 'Conversion' : 'Conversión'}
                </p>
                <p
                  className="mt-2 text-[2rem] leading-none text-white"
                  style={{
                    fontFamily:
                      'var(--font-display)',
                  }}
                >
                  6.7%
                </p>
                <p className="mt-2 text-[8px] text-[#e8c78e]">
                  +0.8 pts
                </p>
              </div>

              <div className="rounded-[1rem] bg-[var(--color-soft)] p-4">
                <p className="text-[8px] uppercase tracking-[0.12em] text-[var(--color-muted)]">
                  {isEnglish ? 'Repurchase' : 'Recompra'}
                </p>
                <p
                  className="mt-2 text-[2rem] leading-none text-[var(--color-ink)]"
                  style={{
                    fontFamily:
                      'var(--font-display)',
                  }}
                >
                  31%
                </p>
                <p className="mt-2 text-[8px] text-[var(--color-positive)]">
                  +4.2 pts
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-[1rem] border border-[var(--color-line)] bg-[var(--color-panel-strong)] p-4">
              <div className="flex items-start gap-3">
                <Zap
                  size={17}
                  className="mt-0.5 shrink-0 text-[var(--color-gold)]"
                />

                <div>
                  <p className="text-[11px] font-semibold text-[var(--color-ink)]">
                    {isEnglish ? 'Immediate opportunity' : 'Oportunidad inmediata'}
                  </p>

                  <p className="mt-1 text-[9px] leading-4 text-[var(--color-muted)]">
                    {isEnglish
                      ? 'Recovering 19 incomplete payments could add approximately $31,800 today.'
                      : 'Recuperar 19 pagos incompletos podría sumar aproximadamente $31,800 hoy.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </ExecutiveCard>
      </section>

      <section className="grid min-w-0 gap-5 lg:grid-cols-3">
        {[
          {
            icon: TicketCheck,
            title: isEnglish ? 'Bookings to confirm' : 'Reservaciones por confirmar',
            value: '19',
            note: isEnglish ? '12 started from the app' : '12 iniciadas desde la app',
            action: isEnglish ? 'Review now' : 'Revisar ahora',
            to: '/control/reservaciones',
            tone: 'attention',
          },
          {
            icon: CheckCircle2,
            title: isEnglish ? 'Operation without issues' : 'Operación sin incidencias',
            value: '98%',
            note: isEnglish ? 'Payments and references validated' : 'Pagos y referencias validadas',
            action: isEnglish ? 'View tracking' : 'Ver seguimiento',
            to: '/control/reservaciones',
            tone: 'positive',
          },
          {
            icon: Grape,
            title: isEnglish ? 'Next major event' : 'Próximo evento fuerte',
            value: 'Vendimia',
            note: isEnglish ? 'Projection: 87% capacity' : 'Proyección: 87% de aforo',
            action: isEnglish ? 'Open event' : 'Abrir evento',
            to: '/control/eventos',
            tone: 'brand',
          },
        ].map((item) => {
          const Icon = item.icon

          return (
            <article
              key={item.title}
              className="rounded-[1.25rem] border border-[var(--color-line)] bg-[var(--color-panel)] p-5 shadow-[var(--shadow-card)]"
            >
              <div className="flex items-start justify-between gap-4">
                <span
                  className={`inline-flex h-11 w-11 items-center justify-center rounded-xl ${
                    item.tone === 'attention'
                      ? 'bg-[#fff0e6] text-[#9b4d25]'
                      : item.tone === 'positive'
                        ? 'bg-[#edf6ee] text-[#47724b]'
                        : 'bg-[var(--color-soft)] text-[var(--color-burgundy)]'
                  }`}
                >
                  <Icon size={18} />
                </span>

                <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
                  {isEnglish ? 'Updated' : 'Actualizado'}
                </span>
              </div>

              <p className="mt-5 text-[10px] text-[var(--color-muted)]">
                {item.title}
              </p>

              <p
                className="mt-2 text-[1.9rem] leading-none text-[var(--color-ink)]"
                style={{
                  fontFamily:
                    'var(--font-display)',
                }}
              >
                {item.value}
              </p>

              <p className="mt-2 text-[9px] text-[var(--color-muted)]">
                {item.note}
              </p>

              <Link
                to={item.to}
                className="mt-5 inline-flex items-center gap-2 text-[10px] font-bold text-[var(--color-burgundy)]"
              >
                {item.action}
                <ArrowRight size={13} />
              </Link>
            </article>
          )
        })}
      </section>
    </div>
  )
}
