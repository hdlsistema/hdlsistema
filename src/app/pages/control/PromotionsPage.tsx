import {
  useMemo,
  useState,
  type FormEvent,
  type ChangeEvent,
} from 'react'
import {
  BarChart3,
  BellRing,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Download,
  Eye,
  Gift,
  Mail,
  Megaphone,
  PencilLine,
  Plus,
  Search,
  Send,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  WalletCards,
  X,
  type LucideIcon,
} from 'lucide-react'
import { CrystalSelect } from '../../components/shared/CrystalSelect'
import { SectionTitle } from '../../components/shared/SectionTitle'
import { useAppPreferences } from '../../context/AppPreferencesContext'

type PromotionStatus =
  | 'Activa'
  | 'Programada'
  | 'Finalizada'
  | 'Borrador'
  | 'En revisión ALQIA'

type PromotionType =
  | 'Experiencia'
  | 'Evento'
  | 'Vino'
  | 'Wine Club'
  | 'Promoción personalizada'

type PromotionRecord = {
  id: string
  name: string
  objective: string
  type: PromotionType
  offer: string
  segment: string
  startDate: string
  endDate: string
  channels: string[]
  status: PromotionStatus
  expectedAttendance: number
  actualAttendance: number
  expectedRevenue: number
  actualRevenue: number
  budget: number
  conversion: number
  coupon: string
}

type PromotionForm = {
  name: string
  objective: string
  type: PromotionType
  product: string
  imageName: string
  imagePreview: string
  discount: string
  segment: string
  reach: string
  conversion: string
  averageTicket: string
  budget: string
  startDate: string
  endDate: string
  coupon: string
  message: string
  email: boolean
  push: boolean
  inApp: boolean
}

const initialPromotions: PromotionRecord[] = [
  {
    id: 'promo-vendimia',
    name: 'Preventa Vendimia 2026',
    objective: 'Acelerar venta anticipada',
    type: 'Evento',
    offer: '15% en preventa',
    segment: 'Clientes activos',
    startDate: '2026-06-15',
    endDate: '2026-08-31',
    channels: ['Correo', 'Push', 'App'],
    status: 'Activa',
    expectedAttendance: 220,
    actualAttendance: 198,
    expectedRevenue: 308000,
    actualRevenue: 286400,
    budget: 28000,
    conversion: 8.3,
    coupon: 'VENDIMIA15',
  },
  {
    id: 'promo-wineclub',
    name: 'Wine Club Verano',
    objective: 'Incrementar membresías',
    type: 'Wine Club',
    offer: 'Upgrade con 10% de beneficio',
    segment: 'Clientes recurrentes',
    startDate: '2026-06-20',
    endDate: '2026-07-20',
    channels: ['Correo', 'App'],
    status: 'Activa',
    expectedAttendance: 58,
    actualAttendance: 42,
    expectedRevenue: 116000,
    actualRevenue: 92400,
    budget: 14500,
    conversion: 9.1,
    coupon: 'WINECLUB10',
  },
  {
    id: 'promo-picnic',
    name: 'Picnic 2x1',
    objective: 'Elevar ocupación de fin de semana',
    type: 'Experiencia',
    offer: 'Segundo acceso preferente',
    segment: 'Parejas y clientes nuevos',
    startDate: '2026-07-01',
    endDate: '2026-07-31',
    channels: ['Push', 'App'],
    status: 'Programada',
    expectedAttendance: 96,
    actualAttendance: 0,
    expectedRevenue: 134400,
    actualRevenue: 0,
    budget: 9600,
    conversion: 6.8,
    coupon: 'PICNIC2X1',
  },
  {
    id: 'promo-cata',
    name: 'Cata VIP',
    objective: 'Aumentar ticket promedio',
    type: 'Experiencia',
    offer: 'Maridaje premium incluido',
    segment: 'Clientes de alto valor',
    startDate: '2026-05-15',
    endDate: '2026-06-20',
    channels: ['Correo', 'Push'],
    status: 'Finalizada',
    expectedAttendance: 64,
    actualAttendance: 71,
    expectedRevenue: 102400,
    actualRevenue: 126300,
    budget: 11800,
    conversion: 7.6,
    coupon: 'CATAVIP',
  },
]

const emptyForm: PromotionForm = {
  name: 'Nueva campaña',
  objective: 'Incrementar reservaciones',
  type: 'Experiencia',
  product: 'Cata de vino',
  imageName: 'romantic dinners evento.webp',
  imagePreview: '/romantic dinners evento.webp',
  discount: '15',
  segment: 'Clientes recurrentes',
  reach: '420',
  conversion: '7.5',
  averageTicket: '1450',
  budget: '12000',
  startDate: '2026-07-01',
  endDate: '2026-07-15',
  coupon: 'HACIENDA15',
  message:
    'Disfruta un beneficio especial en tu próxima experiencia en Hacienda de Letras.',
  email: true,
  push: true,
  inApp: true,
}

const productOptions = [
  'Cata de vino',
  'Recorrido por viñedos',
  'Cena romántica',
  'Picnic entre viñedos',
  'Vendimia Hacienda de Letras',
  'Festival 1000 Copas',
  'Wine Club',
  'Selección de vinos',
]

const audienceOptions = [
  'Todos los clientes',
  'Clientes recurrentes',
  'Clientes nuevos',
  'Clientes inactivos',
  'Clientes de alto valor',
  'Miembros Wine Club',
  'Visitantes de eventos',
  'Compradores de vino',
]

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(value)
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('es-MX').format(value)
}

function statusStyles(status: PromotionStatus) {
  const styles: Record<PromotionStatus, string> = {
    Activa: 'bg-[#e8f0e7] text-[#5f7d63]',
    Programada: 'bg-[#f6eadb] text-[#93652f]',
    Finalizada: 'bg-[#eee9e3] text-[#74665b]',
    Borrador: 'bg-[#eee7ee] text-[#72566f]',
    'En revisión ALQIA': 'bg-[#efe4d4] text-[#7f5b28]',
  }

  return styles[status]
}

function getAttendanceProgress(promotion: PromotionRecord) {
  if (promotion.expectedAttendance <= 0) {
    return 0
  }

  return Math.min(
    Math.round(
      (promotion.actualAttendance / promotion.expectedAttendance) * 100,
    ),
    140,
  )
}

function getRevenueProgress(promotion: PromotionRecord) {
  if (promotion.expectedRevenue <= 0) {
    return 0
  }

  return Math.min(
    Math.round(
      (promotion.actualRevenue / promotion.expectedRevenue) * 100,
    ),
    140,
  )
}

function getRoas(promotion: PromotionRecord) {
  if (promotion.budget <= 0) {
    return 0
  }

  const revenue =
    promotion.actualRevenue > 0
      ? promotion.actualRevenue
      : promotion.expectedRevenue

  return revenue / promotion.budget
}

function downloadPromotionsCsv(items: PromotionRecord[]) {
  const rows = [
    [
      'Campaña',
      'Objetivo',
      'Tipo',
      'Oferta',
      'Segmento',
      'Inicio',
      'Fin',
      'Canales',
      'Estado',
      'Afluencia esperada',
      'Afluencia real',
      'Ingreso esperado',
      'Ingreso real',
      'Presupuesto',
      'Conversión',
      'Cupón',
    ],
    ...items.map((item) => [
      item.name,
      item.objective,
      item.type,
      item.offer,
      item.segment,
      item.startDate,
      item.endDate,
      item.channels.join(' + '),
      item.status,
      item.expectedAttendance,
      item.actualAttendance,
      item.expectedRevenue,
      item.actualRevenue,
      item.budget,
      `${item.conversion}%`,
      item.coupon,
    ]),
  ]

  const csv = rows
    .map((row) =>
      row
        .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
        .join(','),
    )
    .join('\n')

  const blob = new Blob([`\uFEFF${csv}`], {
    type: 'text/csv;charset=utf-8;',
  })

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = 'promociones-hacienda-de-letras.csv'
  link.click()

  URL.revokeObjectURL(url)
}

function MetricCard({
  label,
  value,
  note,
  icon: Icon,
  emphasized = false,
}: {
  label: string
  value: string
  note: string
  icon: LucideIcon
  emphasized?: boolean
}) {
  return (
    <article
      className={`relative min-w-0 overflow-hidden rounded-[1.1rem] border p-5 shadow-[var(--shadow-card)] ${
        emphasized
          ? 'border-[rgba(104,17,38,0.17)] bg-[linear-gradient(145deg,#681126,#3b0816)]'
          : 'border-[var(--color-line)] bg-[var(--color-panel)]'
      }`}
    >
      <div
        className={`absolute -right-8 -top-8 h-24 w-24 rounded-full border ${
          emphasized
            ? 'border-white/10'
            : 'border-[rgba(180,138,85,0.14)]'
        }`}
      />

      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p
            className={`truncate text-xs ${
              emphasized
                ? 'text-white/64'
                : 'text-[var(--color-muted)]'
            }`}
          >
            {label}
          </p>

          <p
            className={`mt-3 text-[2rem] leading-none ${
              emphasized
                ? 'text-white'
                : 'text-[var(--color-ink)]'
            }`}
            style={{
              fontFamily: 'var(--font-display)',
            }}
          >
            {value}
          </p>
        </div>

        <span
          className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
            emphasized
              ? 'bg-white/10 text-[#e5c58f]'
              : 'bg-[var(--color-soft)] text-[var(--color-burgundy)]'
          }`}
        >
          <Icon size={18} />
        </span>
      </div>

      <p
        className={`relative mt-4 truncate text-[11px] ${
          emphasized
            ? 'text-white/55'
            : 'text-[var(--color-muted)]'
        }`}
      >
        {note}
      </p>
    </article>
  )
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  min,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  min?: string
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
        {label}
      </span>

      <input
        type={type}
        min={min}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-11 w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-panel-strong)] px-4 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-gold)]"
      />
    </label>
  )
}

export function PromotionsPage() {
  const { isEnglish } = useAppPreferences()
  const [promotions, setPromotions] =
    useState<PromotionRecord[]>(initialPromotions)
  const [selectedPromotionId, setSelectedPromotionId] = useState(
    initialPromotions[0].id,
  )
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('Todos')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [form, setForm] = useState<PromotionForm>(emptyForm)
  const [successMessage, setSuccessMessage] = useState('')

  const filteredPromotions = useMemo(() => {
    const query = searchTerm.toLocaleLowerCase('es-MX').trim()

    return promotions.filter((promotion) => {
      const matchesSearch =
        query.length === 0 ||
        [
          promotion.name,
          promotion.objective,
          promotion.offer,
          promotion.segment,
          promotion.coupon,
        ]
          .join(' ')
          .toLocaleLowerCase('es-MX')
          .includes(query)

      const matchesStatus =
        statusFilter === 'Todos' ||
        promotion.status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [promotions, searchTerm, statusFilter])

  const selectedPromotion =
    filteredPromotions.find(
      (promotion) => promotion.id === selectedPromotionId,
    ) ??
    filteredPromotions[0] ??
    promotions[0]

  const totals = useMemo(() => {
    const active = promotions.filter(
      (promotion) => promotion.status === 'Activa',
    ).length

    const expectedAttendance = promotions.reduce(
      (sum, promotion) => sum + promotion.expectedAttendance,
      0,
    )

    const actualAttendance = promotions.reduce(
      (sum, promotion) => sum + promotion.actualAttendance,
      0,
    )

    const actualRevenue = promotions.reduce(
      (sum, promotion) => sum + promotion.actualRevenue,
      0,
    )

    const expectedRevenue = promotions.reduce(
      (sum, promotion) => sum + promotion.expectedRevenue,
      0,
    )

    return {
      active,
      expectedAttendance,
      actualAttendance,
      actualRevenue,
      expectedRevenue,
      attendanceProgress:
        expectedAttendance > 0
          ? Math.round(
              (actualAttendance / expectedAttendance) * 100,
            )
          : 0,
    }
  }, [promotions])

  const projectedAttendance = Math.max(
    Math.round(
      (Number(form.reach) || 0) *
        ((Number(form.conversion) || 0) / 100),
    ),
    0,
  )

  const projectedRevenue =
    projectedAttendance * (Number(form.averageTicket) || 0)

  const projectedRoas =
    Number(form.budget) > 0
      ? projectedRevenue / Number(form.budget)
      : 0

  const handlePromotionImageChange = (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    const previewUrl = URL.createObjectURL(file)

    setForm((current) => ({
      ...current,
      imageName: file.name,
      imagePreview: previewUrl,
    }))
  }

  const createPromotion = (
    event: FormEvent<HTMLFormElement>,
    sendToAlqia: boolean,
  ) => {
    event.preventDefault()

    const id = `promo-${Date.now()}`
    const channels = [
      form.email ? 'Correo' : '',
      form.push ? 'Push' : '',
      form.inApp ? 'App' : '',
    ].filter(Boolean)

    const newPromotion: PromotionRecord = {
      id,
      name: form.name,
      objective: form.objective,
      type: form.type,
      offer: `${form.discount}% en ${form.product}`,
      segment: form.segment,
      startDate: form.startDate,
      endDate: form.endDate,
      channels,
      status: sendToAlqia ? 'En revisión ALQIA' : 'Borrador',
      expectedAttendance: projectedAttendance,
      actualAttendance: 0,
      expectedRevenue: projectedRevenue,
      actualRevenue: 0,
      budget: Number(form.budget) || 0,
      conversion: Number(form.conversion) || 0,
      coupon: form.coupon,
    }

    setPromotions((current) => [newPromotion, ...current])
    setSelectedPromotionId(id)
    setIsModalOpen(false)
    setForm(emptyForm)

    setSuccessMessage(
      sendToAlqia
        ? (isEnglish
            ? 'The campaign was sent to ALQIA. The team will update the app within 72 hours.'
            : 'La campaña fue enviada a ALQIA. El equipo actualizará la app en un plazo máximo de 72 horas.')
        : (isEnglish ? 'The promotion was saved as a draft.' : 'La promoción quedó guardada como borrador.'),
    )

    window.setTimeout(() => setSuccessMessage(''), 5000)
  }

  const sendPromotionToAlqia = (promotionId: string) => {
    setPromotions((current) =>
      current.map((promotion) =>
        promotion.id === promotionId
          ? {
              ...promotion,
              status: 'En revisión ALQIA',
            }
          : promotion,
      ),
    )

    setSuccessMessage(
      isEnglish
        ? 'Promotion sent to ALQIA. The app will be updated within 72 hours.'
        : 'Promoción enviada a ALQIA. La actualización de la app se realizará en un máximo de 72 horas.',
    )

    window.setTimeout(() => setSuccessMessage(''), 5000)
  }

  return (
    <div
      className="min-w-0 space-y-6"
      style={{ fontFamily: 'var(--font-body)' }}
    >
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <SectionTitle
          eyebrow={isEnglish ? 'Commercial activation' : 'Activación comercial'}
          title={isEnglish ? 'Promotions' : 'Promociones'}
          subtitle={isEnglish
            ? 'Design campaigns, estimate their impact and control attendance, monetization and publication within the app.'
            : 'Diseña campañas, estima su impacto y controla afluencia, monetización y publicación dentro de la app.'}
        />

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => downloadPromotionsCsv(filteredPromotions)}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--color-line)] bg-[var(--color-panel)] px-4 text-sm font-semibold text-[var(--color-ink)] shadow-sm transition hover:-translate-y-0.5"
          >
            <Download size={16} />
            {isEnglish ? 'Export' : 'Exportar'}
          </button>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--color-burgundy)] px-5 text-sm font-semibold shadow-[0_12px_25px_rgba(79,15,31,0.18)] transition hover:-translate-y-0.5"
            style={{ color: '#ffffff' }}
          >
            <Plus size={16} color="#ffffff" />
            {isEnglish ? 'Create promotion' : 'Crear promoción'}
          </button>
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label={isEnglish ? 'Active campaigns' : 'Campañas activas'}
          value={String(totals.active)}
          note={`${promotions.length} ${isEnglish ? 'registered promotions' : 'promociones registradas'}`}
          icon={Megaphone}
        />

        <MetricCard
          label={isEnglish ? 'Accumulated attendance' : 'Afluencia acumulada'}
          value={formatNumber(totals.actualAttendance)}
          note={`${totals.attendanceProgress}% ${isEnglish ? 'of expected goal' : 'de la meta esperada'}`}
          icon={Users}
        />

        <MetricCard
          label={isEnglish ? 'Attributed revenue' : 'Ingresos atribuidos'}
          value={formatCurrency(totals.actualRevenue)}
          note={`${isEnglish ? 'Goal:' : 'Meta:'} ${formatCurrency(totals.expectedRevenue)}`}
          icon={WalletCards}
          emphasized
        />

        <MetricCard
          label={isEnglish ? 'Average conversion' : 'Conversión promedio'}
          value="7.9%"
          note={isEnglish ? 'Active and finished campaigns' : 'Campañas activas y finalizadas'}
          icon={TrendingUp}
        />
      </section>

      <section className="rounded-[1.15rem] border border-[rgba(180,138,85,0.24)] bg-[#fbf6ee] p-5">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-[var(--color-burgundy)] shadow-sm">
              <Sparkles size={19} />
            </span>

            <div>
              <p className="text-sm font-semibold text-[var(--color-ink)]">
                {isEnglish ? 'Executive read' : 'Lectura ejecutiva'}
              </p>

              <p className="mt-2 max-w-4xl text-xs leading-6 text-[var(--color-muted-strong)]">
                {isEnglish
                  ? 'Vendimia is close to its goal and Cata VIP exceeded it. Wine Club Verano is below the expected pace. Before increasing investment, consider adjusting the message and reinforcing in-app notifications.'
                  : 'Vendimia avanza cerca de la meta y Cata VIP la superó. Wine Club Verano está por debajo del ritmo previsto. Antes de aumentar inversión, conviene ajustar el mensaje y reforzar notificación dentro de la app.'}
              </p>
            </div>
          </div>

          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[var(--color-line)] bg-white px-4 py-2 text-[10px] font-semibold text-[var(--color-burgundy)]">
            <Target size={13} />
            {isEnglish ? 'Priority: Wine Club' : 'Prioridad: Wine Club'}
          </span>
        </div>
      </section>

      <section className="grid gap-5 2xl:grid-cols-[minmax(0,1.35fr)_minmax(330px,0.65fr)]">
        <article className="rounded-[1.25rem] border border-[var(--color-line)] bg-[var(--color-panel)] p-5 shadow-[var(--shadow-card)]">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--color-gold)]">
                {isEnglish ? 'Attendance trend' : 'Tendencia de afluencia'}
              </p>

              <h3
                className="mt-2 text-[1.5rem] text-[var(--color-ink)]"
                style={{
                  fontFamily: 'var(--font-display)',
                }}
              >
                {isEnglish ? 'Expected vs. actual result' : 'Esperado contra resultado real'}
              </h3>
            </div>

            <div className="flex items-center gap-4 text-[10px] text-[var(--color-muted)]">
              <span className="inline-flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-[#d6c7b6]" />
                {isEnglish ? 'Expected' : 'Esperado'}
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-[var(--color-burgundy)]" />
                {isEnglish ? 'Actual' : 'Real'}
              </span>
            </div>
          </div>

          <div className="mt-7 grid min-h-[265px] grid-cols-4 gap-5">
            {promotions.slice(0, 4).map((promotion) => {
              const maxValue = Math.max(
                promotion.expectedAttendance,
                promotion.actualAttendance,
                1,
              )

              const expectedHeight =
                (promotion.expectedAttendance / maxValue) * 100

              const actualHeight =
                (promotion.actualAttendance / maxValue) * 100

              return (
                <div
                  key={promotion.id}
                  className="flex min-w-0 flex-col justify-end"
                >
                  <div className="flex h-[210px] items-end justify-center gap-2 rounded-[1rem] bg-[var(--color-panel-strong)] px-3 pb-3 pt-5">
                    <div
                      className="w-8 rounded-t-lg bg-[#d6c7b6]"
                      style={{ height: `${expectedHeight}%` }}
                    />
                    <div
                      className="w-8 rounded-t-lg bg-[linear-gradient(180deg,var(--color-gold),var(--color-burgundy))]"
                      style={{ height: `${actualHeight}%` }}
                    />
                  </div>

                  <p className="mt-3 line-clamp-2 text-center text-[10px] font-semibold leading-4 text-[var(--color-ink)]">
                    {promotion.name}
                  </p>
                </div>
              )
            })}
          </div>
        </article>

        <aside className="rounded-[1.25rem] border border-[var(--color-line)] bg-[var(--color-panel)] p-5 shadow-[var(--shadow-card)]">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-soft)] text-[var(--color-burgundy)]">
              <BarChart3 size={18} />
            </span>

            <div>
              <p className="text-sm font-semibold text-[var(--color-ink)]">
                Monetización
              </p>

              <p className="mt-1 text-[10px] text-[var(--color-muted)]">
                Rendimiento de la campaña seleccionada
              </p>
            </div>
          </div>

          {selectedPromotion ? (
            <div className="mt-5">
              <p className="text-sm font-semibold text-[var(--color-ink)]">
                {selectedPromotion.name}
              </p>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-[var(--color-panel-strong)] p-4">
                  <p className="text-[9px] uppercase tracking-[0.1em] text-[var(--color-muted)]">
                    {isEnglish ? 'Actual revenue' : 'Ingreso real'}
                  </p>
                  <p className="mt-2 text-lg font-bold text-[var(--color-ink)]">
                    {formatCurrency(selectedPromotion.actualRevenue)}
                  </p>
                </div>

                <div className="rounded-xl bg-[var(--color-panel-strong)] p-4">
                  <p className="text-[9px] uppercase tracking-[0.1em] text-[var(--color-muted)]">
                    ROAS
                  </p>
                  <p className="mt-2 text-lg font-bold text-[var(--color-ink)]">
                    {getRoas(selectedPromotion).toFixed(1)}×
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-5">
                <ProgressLine
                  label={isEnglish ? 'Attendance' : 'Afluencia'}
                  value={`${getAttendanceProgress(selectedPromotion)}%`}
                  percent={getAttendanceProgress(selectedPromotion)}
                  note={`${selectedPromotion.actualAttendance} ${isEnglish ? 'of' : 'de'} ${selectedPromotion.expectedAttendance}`}
                />

                <ProgressLine
                  label={isEnglish ? 'Monetization' : 'Monetización'}
                  value={`${getRevenueProgress(selectedPromotion)}%`}
                  percent={getRevenueProgress(selectedPromotion)}
                  note={`${formatCurrency(
                    selectedPromotion.actualRevenue,
                  )} ${isEnglish ? 'of' : 'de'} ${formatCurrency(
                    selectedPromotion.expectedRevenue,
                  )}`}
                />
              </div>
            </div>
          ) : null}
        </aside>
      </section>

      <section className="rounded-[1.25rem] border border-[var(--color-line)] bg-[var(--color-panel)] p-5 shadow-[var(--shadow-card)]">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--color-gold)]">
              Portafolio comercial
            </p>

            <h3
              className="mt-2 text-[1.5rem] text-[var(--color-ink)]"
              style={{
                fontFamily: 'var(--font-display)',
              }}
            >
              Campañas y promociones
            </h3>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <label className="flex min-h-11 min-w-0 items-center gap-3 rounded-xl border border-[var(--color-line)] bg-[var(--color-panel-strong)] px-4 sm:w-[300px]">
              <Search
                size={15}
                className="shrink-0 text-[var(--color-muted)]"
              />

              <input
                type="search"
                value={searchTerm}
                onChange={(event) =>
                  setSearchTerm(event.target.value)
                }
                placeholder={isEnglish ? 'Search promotion...' : 'Buscar promoción...'}
                className="min-w-0 flex-1 bg-transparent text-sm text-[var(--color-ink)] outline-none"
              />
            </label>

            <CrystalSelect
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                'Todos',
                'Activa',
                'Programada',
                'Finalizada',
                'Borrador',
                'En revisión ALQIA',
              ].map((status) => ({
                value: status,
                label: status,
              }))}
              className="sm:w-[240px]"
            />
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {filteredPromotions.map((promotion) => {
            const attendanceProgress =
              getAttendanceProgress(promotion)

            return (
              <button
                key={promotion.id}
                type="button"
                onClick={() => setSelectedPromotionId(promotion.id)}
                className="grid w-full gap-4 rounded-[1rem] border border-[var(--color-line)] bg-[var(--color-panel-strong)] p-4 text-left transition hover:-translate-y-0.5 xl:grid-cols-[minmax(210px,1.2fr)_150px_150px_150px_170px] xl:items-center"
                style={{
                  outline: 'none',
                  boxShadow:
                    selectedPromotionId === promotion.id
                      ? '0 14px 30px rgba(79,15,31,0.1)'
                      : 'none',
                  borderColor:
                    selectedPromotionId === promotion.id
                      ? 'var(--color-burgundy)'
                      : 'var(--color-line)',
                }}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-semibold text-[var(--color-ink)]">
                      {promotion.name}
                    </p>

                    <span
                      className={`rounded-full px-3 py-1 text-[9px] font-semibold ${statusStyles(
                        promotion.status,
                      )}`}
                    >
                      {promotion.status}
                    </span>
                  </div>

                  <p className="mt-1 truncate text-[10px] text-[var(--color-muted)]">
                    {promotion.offer} · {promotion.segment}
                  </p>
                </div>

                <div>
                  <p className="text-[9px] uppercase tracking-[0.1em] text-[var(--color-muted)]">
                    {isEnglish ? 'Attendance' : 'Afluencia'}
                  </p>
                  <p className="mt-1 text-sm font-bold text-[var(--color-ink)]">
                    {promotion.actualAttendance} /{' '}
                    {promotion.expectedAttendance}
                  </p>
                </div>

                <div>
                  <p className="text-[9px] uppercase tracking-[0.1em] text-[var(--color-muted)]">
                    {isEnglish ? 'Monetization' : 'Monetización'}
                  </p>
                  <p className="mt-1 text-sm font-bold text-[var(--color-ink)]">
                    {formatCurrency(promotion.actualRevenue)}
                  </p>
                </div>

                <div>
                  <p className="text-[9px] uppercase tracking-[0.1em] text-[var(--color-muted)]">
                    {isEnglish ? 'Fulfillment' : 'Cumplimiento'}
                  </p>
                  <p className="mt-1 text-sm font-bold text-[var(--color-burgundy)]">
                    {attendanceProgress}%
                  </p>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="text-[10px] text-[var(--color-muted)]">
                    {promotion.channels.join(' + ')}
                  </span>

                  <ChevronRight
                    size={16}
                    className="shrink-0 text-[var(--color-muted)]"
                  />
                </div>
              </button>
            )
          })}
        </div>
      </section>

      {selectedPromotion ? (
        <section className="rounded-[1.2rem] border border-[var(--color-line)] bg-[var(--color-panel)] p-5 shadow-[var(--shadow-card)]">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--color-soft)] text-[var(--color-burgundy)]">
                <Gift size={19} />
              </span>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-[var(--color-ink)]">
                    {selectedPromotion.name}
                  </p>

                  <span
                    className={`rounded-full px-3 py-1 text-[9px] font-semibold ${statusStyles(
                      selectedPromotion.status,
                    )}`}
                  >
                    {selectedPromotion.status}
                  </span>
                </div>

                <p className="mt-2 max-w-4xl text-xs leading-6 text-[var(--color-muted)]">
                  {isEnglish
                    ? `${selectedPromotion.objective}. Coupon `
                    : `${selectedPromotion.objective}. Cupón `}
                  <strong>{selectedPromotion.coupon}</strong>
                  {isEnglish
                    ? `, valid from ${selectedPromotion.startDate} to ${selectedPromotion.endDate}.`
                    : `, vigente del ${selectedPromotion.startDate} al ${selectedPromotion.endDate}.`}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--color-line)] bg-[var(--color-panel-strong)] px-4 text-xs font-semibold text-[var(--color-ink)]"
              >
                <Eye size={14} />
                {isEnglish ? 'Preview' : 'Vista previa'}
              </button>

              <button
                type="button"
                className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--color-line)] bg-[var(--color-panel-strong)] px-4 text-xs font-semibold text-[var(--color-ink)]"
              >
                <PencilLine size={14} />
                {isEnglish ? 'Edit' : 'Editar'}
              </button>

              <button
                type="button"
                onClick={() =>
                  sendPromotionToAlqia(selectedPromotion.id)
                }
                className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[var(--color-burgundy)] px-4 text-xs font-semibold"
                style={{ color: '#ffffff' }}
              >
                <Sparkles size={14} color="#ffffff" />
                {isEnglish ? 'Send to ALQIA' : 'Enviar a ALQIA'}
              </button>
            </div>
          </div>

          <div className="mt-4 flex items-start gap-3 rounded-xl bg-[#fbf6ee] px-4 py-3">
            <CircleAlert
              size={16}
              className="mt-0.5 shrink-0 text-[var(--color-gold)]"
            />

            <p className="text-[11px] leading-5 text-[var(--color-muted-strong)]">
              Al enviar a ALQIA, nuestro equipo revisará materiales,
              configuración y publicación. La actualización de la app se
              realizará en un plazo máximo de 72 horas.
            </p>
          </div>
        </section>
      ) : null}

      {isModalOpen ? (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-[#210711]/68 p-4 backdrop-blur-sm">
          <button
            type="button"
            aria-label="Cerrar modal"
            onClick={() => setIsModalOpen(false)}
            className="absolute inset-0 cursor-default"
          />

          <form
            onSubmit={(event) => createPromotion(event, false)}
            className="relative z-10 max-h-[94vh] w-full max-w-6xl overflow-y-auto rounded-[1.5rem] border border-[var(--color-line)] bg-[var(--color-page)] shadow-[0_35px_90px_rgba(29,5,12,0.38)]"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-[var(--color-line)] bg-[var(--color-page)] px-6 py-5">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-gold)]">
                  {isEnglish ? 'New campaign' : 'Nueva campaña'}
                </p>

                <h2
                  className="mt-2 text-[1.8rem] leading-none text-[var(--color-ink)]"
                  style={{
                    fontFamily: 'var(--font-display)',
                  }}
                >
                  {isEnglish ? 'Create promotion' : 'Crear promoción'}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--color-line)] bg-white text-[var(--color-burgundy)]"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid gap-5 p-6 2xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.65fr)]">
              <div className="space-y-5">
                <section className="rounded-[1.15rem] border border-[var(--color-line)] bg-[var(--color-panel)] p-5">
                  <p className="text-sm font-semibold text-[var(--color-ink)]">
                    {isEnglish ? 'Commercial information' : 'Información comercial'}
                  </p>

                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <Field
                      label={isEnglish ? 'Campaign name' : 'Nombre de campaña'}
                      value={form.name}
                      onChange={(value) =>
                        setForm((current) => ({
                          ...current,
                          name: value,
                        }))
                      }
                    />

                    <Field
                      label={isEnglish ? 'Objective' : 'Objetivo'}
                      value={form.objective}
                      onChange={(value) =>
                        setForm((current) => ({
                          ...current,
                          objective: value,
                        }))
                      }
                    />

                    <label className="block">
                      <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
                        {isEnglish ? 'Type' : 'Tipo'}
                      </span>

                      <CrystalSelect
                        value={form.type}
                        onChange={(value) =>
                          setForm((current) => ({
                            ...current,
                            type: value as PromotionType,
                          }))
                        }
                        options={[
                          'Experiencia',
                          'Evento',
                          'Vino',
                          'Wine Club',
                          'Promoción personalizada',
                        ].map((option) => ({
                          value: option,
                          label: option,
                        }))}
                      />
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
                        {isEnglish ? 'Product or experience' : 'Producto o experiencia'}
                      </span>

                      <CrystalSelect
                        value={form.product}
                        onChange={(value) =>
                          setForm((current) => ({
                            ...current,
                            product: value,
                          }))
                        }
                        options={productOptions.map((option) => ({
                          value: option,
                          label: option,
                        }))}
                      />
                    </label>

                    <label className="block md:col-span-2">
                      <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
                        {isEnglish ? 'Promotion image' : 'Imagen de la promoción'}
                      </span>

                      <div className="rounded-[1rem] border border-dashed border-[rgba(180,138,85,0.34)] bg-[rgba(255,252,247,0.72)] p-4">
                        <div className="flex flex-col gap-4 md:flex-row md:items-center">
                          <label className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-xl bg-[var(--color-burgundy)] px-4 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(79,15,31,0.18)]">
                            Elegir imagen
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handlePromotionImageChange}
                              className="hidden"
                            />
                          </label>

                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-[var(--color-ink)]">
                              {form.imageName}
                            </p>
                            <p className="mt-1 text-[11px] text-[var(--color-muted)]">
                              {isEnglish
                                ? 'Upload an image from your computer for a promotion preview.'
                                : 'Sube una imagen desde tu ordenador para vista previa de la promoción.'}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 overflow-hidden rounded-[1rem] border border-[var(--color-line)]">
                          <img
                            src={form.imagePreview}
                            alt="Vista previa de la promoción"
                            className="h-44 w-full object-cover"
                          />
                        </div>
                      </div>
                    </label>

                    <Field
                      label={isEnglish ? 'Discount (%)' : 'Descuento (%)'}
                      type="number"
                      min="0"
                      value={form.discount}
                      onChange={(value) =>
                        setForm((current) => ({
                          ...current,
                          discount: value,
                        }))
                      }
                    />

                    <Field
                      label={isEnglish ? 'Promotional code' : 'Código promocional'}
                      value={form.coupon}
                      onChange={(value) =>
                        setForm((current) => ({
                          ...current,
                          coupon: value,
                        }))
                      }
                    />

                    <Field
                      label={isEnglish ? 'Start date' : 'Fecha de inicio'}
                      type="date"
                      value={form.startDate}
                      onChange={(value) =>
                        setForm((current) => ({
                          ...current,
                          startDate: value,
                        }))
                      }
                    />

                    <Field
                      label={isEnglish ? 'End date' : 'Fecha de término'}
                      type="date"
                      value={form.endDate}
                      onChange={(value) =>
                        setForm((current) => ({
                          ...current,
                          endDate: value,
                        }))
                      }
                    />
                  </div>
                </section>

                <section className="rounded-[1.15rem] border border-[var(--color-line)] bg-[var(--color-panel)] p-5">
                  <p className="text-sm font-semibold text-[var(--color-ink)]">
                    {isEnglish ? 'Audience & projection' : 'Audiencia y proyección'}
                  </p>

                  <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <label className="block">
                      <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
                        {isEnglish ? 'Segment' : 'Segmento'}
                      </span>

                      <CrystalSelect
                        value={form.segment}
                        onChange={(value) =>
                          setForm((current) => ({
                            ...current,
                            segment: value,
                          }))
                        }
                        options={audienceOptions.map((option) => ({
                          value: option,
                          label: option,
                        }))}
                      />
                    </label>

                    <Field
                      label={isEnglish ? 'Estimated reach' : 'Alcance estimado'}
                      type="number"
                      min="0"
                      value={form.reach}
                      onChange={(value) =>
                        setForm((current) => ({
                          ...current,
                          reach: value,
                        }))
                      }
                    />

                    <Field
                      label={isEnglish ? 'Expected conversion (%)' : 'Conversión esperada (%)'}
                      type="number"
                      min="0"
                      value={form.conversion}
                      onChange={(value) =>
                        setForm((current) => ({
                          ...current,
                          conversion: value,
                        }))
                      }
                    />

                    <Field
                      label={isEnglish ? 'Average ticket' : 'Ticket promedio'}
                      type="number"
                      min="0"
                      value={form.averageTicket}
                      onChange={(value) =>
                        setForm((current) => ({
                          ...current,
                          averageTicket: value,
                        }))
                      }
                    />

                    <Field
                      label={isEnglish ? 'Budget' : 'Presupuesto'}
                      type="number"
                      min="0"
                      value={form.budget}
                      onChange={(value) =>
                        setForm((current) => ({
                          ...current,
                          budget: value,
                        }))
                      }
                    />

                    <label className="block">
                      <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
                        {isEnglish ? 'Channels' : 'Canales'}
                      </span>

                      <div className="grid grid-cols-3 gap-2">
                        {[
                          {
                            key: 'email',
                            label: 'Correo',
                            icon: Mail,
                          },
                          {
                            key: 'push',
                            label: 'Push',
                            icon: BellRing,
                          },
                          {
                            key: 'inApp',
                            label: 'App',
                            icon: Eye,
                          },
                        ].map((item) => {
                          const ChannelIcon = item.icon as LucideIcon
                          const field = item.key as
                            | 'email'
                            | 'push'
                            | 'inApp'
                          const active = form[field]

                          return (
                            <button
                              key={item.key}
                              type="button"
                              onClick={() =>
                                setForm((current) => ({
                                  ...current,
                                  [field]: !current[field],
                                }))
                              }
                              className="flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3 text-[10px] font-semibold"
                              style={{
                                borderColor: active
                                  ? 'var(--color-burgundy)'
                                  : 'var(--color-line)',
                                backgroundColor: active
                                  ? 'rgba(104,17,38,0.055)'
                                  : 'var(--color-panel-strong)',
                                color: active
                                  ? 'var(--color-burgundy)'
                                  : 'var(--color-muted)',
                              }}
                            >
                              <ChannelIcon size={13} />
                              {item.label}
                            </button>
                          )
                        })}
                      </div>
                    </label>
                  </div>

                  <label className="mt-4 block">
                    <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
                        {isEnglish ? 'Main message' : 'Mensaje principal'}
                      </span>

                    <textarea
                      value={form.message}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          message: event.target.value,
                        }))
                      }
                      rows={4}
                      className="w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-panel-strong)] px-4 py-3 text-sm leading-6 text-[var(--color-ink)] outline-none"
                    />
                  </label>
                </section>
              </div>

              <aside className="space-y-4">
                <section className="rounded-[1.15rem] border border-[var(--color-line)] bg-[var(--color-panel)] p-5">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-soft)] text-[var(--color-burgundy)]">
                      <TrendingUp size={18} />
                    </span>

                    <div>
                      <p className="text-sm font-semibold text-[var(--color-ink)]">
                        {isEnglish ? 'Projection' : 'Proyección'}
                      </p>
                      <p className="mt-1 text-[10px] text-[var(--color-muted)]">
                        {isEnglish ? 'Estimated from campaign data' : 'Estimada con los datos de la campaña'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-[var(--color-panel-strong)] p-4">
                      <p className="text-[9px] uppercase tracking-[0.1em] text-[var(--color-muted)]">
                        {isEnglish ? 'Attendance' : 'Afluencia'}
                      </p>
                      <p className="mt-2 text-xl font-bold text-[var(--color-ink)]">
                        {formatNumber(projectedAttendance)}
                      </p>
                    </div>

                    <div className="rounded-xl bg-[var(--color-panel-strong)] p-4">
                      <p className="text-[9px] uppercase tracking-[0.1em] text-[var(--color-muted)]">
                        {isEnglish ? 'Conversion' : 'Conversión'}
                      </p>
                      <p className="mt-2 text-xl font-bold text-[var(--color-ink)]">
                        {form.conversion}%
                      </p>
                    </div>

                    <div className="col-span-2 rounded-xl bg-[var(--color-panel-strong)] p-4">
                      <p className="text-[9px] uppercase tracking-[0.1em] text-[var(--color-muted)]">
                        {isEnglish ? 'Projected revenue' : 'Ingreso proyectado'}
                      </p>
                      <p className="mt-2 text-2xl font-bold text-[var(--color-burgundy)]">
                        {formatCurrency(projectedRevenue)}
                      </p>
                    </div>

                    <div className="col-span-2 rounded-xl border border-[rgba(180,138,85,0.24)] bg-[#fbf6ee] p-4">
                      <p className="text-[9px] uppercase tracking-[0.1em] text-[var(--color-muted)]">
                        {isEnglish ? 'Estimated ROAS' : 'ROAS estimado'}
                      </p>
                      <p className="mt-2 text-2xl font-bold text-[var(--color-ink)]">
                        {projectedRoas.toFixed(1)}×
                      </p>
                    </div>
                  </div>
                </section>

                <section className="rounded-[1.15rem] border border-[var(--color-line)] bg-[var(--color-panel)] p-5">
                  <p className="text-sm font-semibold text-[var(--color-ink)]">
                    {isEnglish ? 'Publication in app' : 'Publicación en la app'}
                  </p>

                  <p className="mt-3 text-xs leading-6 text-[var(--color-muted-strong)]">
                    {isEnglish
                      ? 'After creating the campaign you can send it to ALQIA. Our team will review the content, set up the promotion and update the app within 72 hours.'
                      : 'Después de crear la campaña puedes enviarla a ALQIA. Nuestro equipo revisará el contenido, montará la promoción y actualizará la app en máximo 72 horas.'}
                  </p>

                  <div className="mt-4 flex items-start gap-3 rounded-xl bg-[var(--color-panel-strong)] p-4">
                    <CheckCircle2
                      size={17}
                      className="mt-0.5 shrink-0 text-[#5f7d63]"
                    />
                    <p className="text-[11px] leading-5 text-[var(--color-muted-strong)]">
                      {isEnglish
                        ? 'Includes visual review, coupon setup, channels and publication.'
                        : 'Incluye revisión visual, configuración del cupón, canales y publicación.'}
                    </p>
                  </div>
                </section>
              </aside>
            </div>

            <div className="sticky bottom-0 flex flex-col-reverse gap-3 border-t border-[var(--color-line)] bg-[var(--color-page)] px-6 py-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="min-h-11 rounded-xl border border-[var(--color-line)] bg-white px-5 text-sm font-semibold text-[var(--color-muted-strong)]"
              >
                {isEnglish ? 'Cancel' : 'Cancelar'}
              </button>

              <button
                type="submit"
                className="min-h-11 rounded-xl border border-[var(--color-line)] bg-white px-5 text-sm font-semibold text-[var(--color-burgundy)]"
              >
                {isEnglish ? 'Save draft' : 'Guardar borrador'}
              </button>

              <button
                type="button"
                onClick={(event) => {
                  createPromotion(
                    event as unknown as FormEvent<HTMLFormElement>,
                    true,
                  )
                }}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--color-burgundy)] px-5 text-sm font-semibold shadow-[0_12px_24px_rgba(79,15,31,0.18)]"
                style={{ color: '#ffffff' }}
              >
                <Send size={16} color="#ffffff" />
                {isEnglish ? 'Create and send to ALQIA' : 'Crear y enviar a ALQIA'}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {successMessage ? (
        <div className="fixed bottom-6 right-6 z-[130] flex max-w-md items-start gap-3 rounded-[1rem] border border-[#cfddca] bg-white p-4 shadow-[0_22px_50px_rgba(45,22,14,0.18)]">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#e7efe6] text-[#5f7d63]">
            <Check size={16} />
          </span>

          <div>
            <p className="text-sm font-semibold text-[var(--color-ink)]">
              {isEnglish ? 'Action completed' : 'Acción completada'}
            </p>
            <p className="mt-1 text-[11px] leading-5 text-[var(--color-muted)]">
              {successMessage}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setSuccessMessage('')}
            className="ml-auto text-[var(--color-muted)]"
          >
            <X size={15} />
          </button>
        </div>
      ) : null}
    </div>
  )
}

function ProgressLine({
  label,
  value,
  percent,
  note,
}: {
  label: string
  value: string
  percent: number
  note: string
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-[var(--color-ink)]">
            {label}
          </p>
          <p className="mt-1 text-[10px] text-[var(--color-muted)]">
            {note}
          </p>
        </div>

        <span className="text-xs font-bold text-[var(--color-burgundy)]">
          {value}
        </span>
      </div>

      <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-[var(--color-soft)]">
        <div
          className="h-full rounded-full bg-[linear-gradient(90deg,var(--color-gold),var(--color-burgundy))]"
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>
    </div>
  )
}
