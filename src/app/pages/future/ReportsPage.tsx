import {
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  Megaphone,
  MousePointerClick,
  RefreshCcw,
  Repeat2,
  Smartphone,
  Target,
  TrendingUp,
  Users,
  WalletCards,
  type LucideIcon,
} from 'lucide-react'
import { CrystalSelect } from '../../components/shared/CrystalSelect'
import { SectionTitle } from '../../components/shared/SectionTitle'

type PanelKey =
  | 'commercial'
  | 'reservations'
  | 'customers'
  | 'marketing'

type PeriodKey = 'month' | 'last30' | 'quarter'

type KpiItem = {
  label: string
  value: string
  note: string
  delta: string
  icon: LucideIcon
  tone: 'brand' | 'positive' | 'neutral' | 'attention'
}

type SalesRow = {
  date: string
  customer: string
  concept: string
  origin: string
  amount: number
  method: string
  status: string
}

type ExperienceRow = {
  name: string
  reservations: number
  revenue: number
  occupancy: number
  conversion: number
}

type CampaignRow = {
  name: string
  source: string
  leads: number
  reservations: number
  spend: number
  revenue: number
}

const salesTrend = [42, 48, 55, 51, 64, 69, 74, 71, 82, 88, 92, 97]

const categoryMix = [
  { label: 'Experiencias', value: 42, amount: '$524,475' },
  { label: 'Vino', value: 31, amount: '$387,113' },
  { label: 'Eventos', value: 17, amount: '$212,288' },
  { label: 'Wine Club', value: 10, amount: '$124,875' },
]

const salesRows: SalesRow[] = [
  {
    date: '30 Jun 2026',
    customer: 'Valeria Montes',
    concept: 'Wine Club anual',
    origin: 'App orgánica',
    amount: 8400,
    method: 'Visa',
    status: 'Pagado',
  },
  {
    date: '29 Jun 2026',
    customer: 'Grupo Astra',
    concept: 'Evento corporativo',
    origin: 'Campaña',
    amount: 42000,
    method: 'Factura',
    status: 'Facturado',
  },
  {
    date: '29 Jun 2026',
    customer: 'Luis Mendoza',
    concept: 'Cata premium',
    origin: 'App orgánica',
    amount: 3880,
    method: 'Mastercard',
    status: 'Pagado',
  },
  {
    date: '28 Jun 2026',
    customer: 'Rodrigo León',
    concept: 'Recorrido + compra',
    origin: 'Referido',
    amount: 2640,
    method: 'Apple Pay',
    status: 'Pagado',
  },
  {
    date: '27 Jun 2026',
    customer: 'Sofía Herrera',
    concept: 'Cena romántica',
    origin: 'Campaña',
    amount: 5600,
    method: 'Visa',
    status: 'Pagado',
  },
]

const experienceRows: ExperienceRow[] = [
  {
    name: 'Catas de vino',
    reservations: 164,
    revenue: 241600,
    occupancy: 92,
    conversion: 8.4,
  },
  {
    name: 'Recorrido por viñedos',
    reservations: 112,
    revenue: 156800,
    occupancy: 78,
    conversion: 7.1,
  },
  {
    name: 'Cena romántica',
    reservations: 38,
    revenue: 98600,
    occupancy: 86,
    conversion: 6.8,
  },
  {
    name: 'Picnic entre viñedos',
    reservations: 26,
    revenue: 36400,
    occupancy: 64,
    conversion: 5.2,
  },
  {
    name: 'Eventos privados',
    reservations: 28,
    revenue: 231800,
    occupancy: 73,
    conversion: 4.9,
  },
]

const reservationStatus = [
  { label: 'Confirmadas', value: 214, percent: 58, tone: '#681126' },
  { label: 'Pendientes', value: 68, percent: 18, tone: '#b48a55' },
  { label: 'Completadas', value: 77, percent: 21, tone: '#6d8d72' },
  { label: 'No show', value: 9, percent: 3, tone: '#b96666' },
]

const weeklyDemand = [
  { label: 'Lun', value: 54 },
  { label: 'Mar', value: 61 },
  { label: 'Mié', value: 67 },
  { label: 'Jue', value: 72 },
  { label: 'Vie', value: 84 },
  { label: 'Sáb', value: 94 },
  { label: 'Dom', value: 78 },
]

const customerSegments = [
  {
    label: 'Nuevos',
    value: '42%',
    note: 'Primera compra',
    icon: Users,
  },
  {
    label: 'Recurrentes',
    value: '31%',
    note: '2 compras o más',
    icon: Repeat2,
  },
  {
    label: 'Wine Club',
    value: '17%',
    note: 'Membresía activa',
    icon: CheckCircle2,
  },
  {
    label: 'Eventos',
    value: '10%',
    note: 'Compra estacional',
    icon: CalendarDays,
  },
]

const leadPipeline = [
  { label: 'Leads captados', value: 1842, percent: 100 },
  { label: 'Exploraron una opción', value: 964, percent: 52 },
  { label: 'Iniciaron reservación', value: 486, percent: 26 },
  { label: 'Reservaron', value: 326, percent: 18 },
]

const campaignRows: CampaignRow[] = [
  {
    name: 'Cenas de temporada',
    source: 'Instagram',
    leads: 428,
    reservations: 91,
    spend: 28400,
    revenue: 148600,
  },
  {
    name: 'Catas de fin de semana',
    source: 'Google',
    leads: 376,
    reservations: 84,
    spend: 23600,
    revenue: 131400,
  },
  {
    name: 'Wine Club',
    source: 'Meta',
    leads: 219,
    reservations: 46,
    spend: 18100,
    revenue: 88200,
  },
  {
    name: 'Eventos corporativos',
    source: 'Referidos',
    leads: 74,
    reservations: 18,
    spend: 4200,
    revenue: 126000,
  },
]

const periodOptions: Array<{
  value: PeriodKey
  label: string
  factor: number
}> = [
  { value: 'month', label: 'Este mes', factor: 1 },
  { value: 'last30', label: 'Últimos 30 días', factor: 1.08 },
  { value: 'quarter', label: 'Este trimestre', factor: 2.84 },
]

const sourceOptions = [
  'Todos los orígenes',
  'App orgánica',
  'Campañas',
  'Referidos',
  'Wine Club',
]

const experienceOptions = [
  'Todas las experiencias',
  ...experienceRows.map((item) => item.name),
]

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(value)
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('es-MX', {
    maximumFractionDigits: 0,
  }).format(value)
}

function downloadCsv(filename: string, rows: Array<Array<string | number>>) {
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
  link.download = filename
  link.click()

  URL.revokeObjectURL(url)
}

function KpiCard({ item }: { item: KpiItem }) {
  const Icon = item.icon
  const isBrand = item.tone === 'brand'

  return (
    <article
      className={`relative min-w-0 overflow-hidden rounded-[1.2rem] border p-5 shadow-[var(--shadow-card)] ${
        isBrand
          ? 'border-[rgba(104,17,38,0.18)] bg-[linear-gradient(145deg,#681126,#3b0816)] text-white'
          : 'border-[var(--color-line)] bg-[var(--color-panel)]'
      }`}
    >
      <div
        className={`absolute -right-9 -top-9 h-24 w-24 rounded-full border ${
          isBrand
            ? 'border-white/10'
            : 'border-[rgba(180,138,85,0.14)]'
        }`}
      />

      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p
            className={`truncate text-[11px] font-medium ${
              isBrand
                ? 'text-white/68'
                : 'text-[var(--color-muted)]'
            }`}
          >
            {item.label}
          </p>

          <p
            className={`mt-3 text-[2rem] leading-none ${
              isBrand ? 'text-white' : 'text-[var(--color-ink)]'
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
            isBrand
              ? 'bg-white/10 text-[#e6c38b]'
              : 'bg-[var(--color-soft)] text-[var(--color-burgundy)]'
          }`}
        >
          <Icon size={18} />
        </span>
      </div>

      <div className="relative mt-4 flex items-center justify-between gap-3">
        <p
          className={`truncate text-[11px] ${
            isBrand
              ? 'text-white/58'
              : 'text-[var(--color-muted)]'
          }`}
        >
          {item.note}
        </p>

        <span
          className={`shrink-0 text-[10px] font-semibold ${
            item.tone === 'attention'
              ? 'text-[#b35b5b]'
              : isBrand
                ? 'text-[#e6c38b]'
                : 'text-[var(--color-positive)]'
          }`}
        >
          {item.delta}
        </span>
      </div>
    </article>
  )
}

function ReportPanel({
  title,
  subtitle,
  icon: Icon,
  open,
  onToggle,
  actions,
  children,
}: {
  title: string
  subtitle: string
  icon: LucideIcon
  open: boolean
  onToggle: () => void
  actions?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="overflow-hidden rounded-[1.35rem] border border-[var(--color-line)] bg-[var(--color-panel)] shadow-[var(--shadow-card)]">
      <div className="flex flex-col gap-4 px-5 py-5 md:flex-row md:items-center">
        <button
          type="button"
          onClick={onToggle}
          className="flex min-w-0 flex-1 items-center gap-4 text-left"
          style={{
            background: 'transparent',
            border: 0,
            padding: 0,
            outline: 'none',
          }}
        >
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--color-soft)] text-[var(--color-burgundy)]">
            <Icon size={19} />
          </span>

          <span className="min-w-0">
            <span
              className="block text-[1.35rem] leading-tight text-[var(--color-ink)]"
              style={{
                fontFamily: 'var(--font-display)',
              }}
            >
              {title}
            </span>

            <span className="mt-1 block text-xs leading-5 text-[var(--color-muted)]">
              {subtitle}
            </span>
          </span>

          <ChevronDown
            size={19}
            className={`ml-auto shrink-0 text-[var(--color-muted)] transition-transform ${
              open ? 'rotate-180' : ''
            }`}
          />
        </button>

        {actions ? (
          <div className="flex shrink-0 flex-wrap gap-2 md:pl-4">
            {actions}
          </div>
        ) : null}
      </div>

      {open ? (
        <div className="border-t border-[var(--color-line)] p-5">
          {children}
        </div>
      ) : null}
    </section>
  )
}

function ExportButton({
  onClick,
  label = 'Exportar',
}: {
  onClick: () => void
  label?: string
}) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation()
        onClick()
      }}
      className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--color-line)] bg-[var(--color-panel-strong)] px-3 text-xs font-semibold text-[var(--color-burgundy)] transition hover:-translate-y-0.5"
    >
      <FileSpreadsheet size={14} />
      {label}
    </button>
  )
}

function ProgressRow({
  label,
  value,
  percent,
  meta,
}: {
  label: string
  value: string
  percent: number
  meta?: string
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-[var(--color-ink)]">
            {label}
          </p>

          {meta ? (
            <p className="mt-1 truncate text-[10px] text-[var(--color-muted)]">
              {meta}
            </p>
          ) : null}
        </div>

        <span className="shrink-0 text-xs font-semibold text-[var(--color-burgundy)]">
          {value}
        </span>
      </div>

      <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--color-soft)]">
        <div
          className="h-full rounded-full bg-[linear-gradient(90deg,var(--color-gold),var(--color-burgundy))]"
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>
    </div>
  )
}

export function ReportsPage() {
  const [period, setPeriod] = useState<PeriodKey>('month')
  const [source, setSource] = useState('Todos los orígenes')
  const [experience, setExperience] = useState(
    'Todas las experiencias',
  )

  const [openPanels, setOpenPanels] = useState<
    Record<PanelKey, boolean>
  >({
    commercial: true,
    reservations: false,
    customers: false,
    marketing: false,
  })

  const periodFactor =
    periodOptions.find((item) => item.value === period)?.factor ?? 1

  const sourceFactor =
    source === 'Todos los orígenes'
      ? 1
      : source === 'App orgánica'
        ? 0.48
        : source === 'Campañas'
          ? 0.31
          : source === 'Referidos'
            ? 0.13
            : 0.08

  const filteredExperiences = useMemo(() => {
    if (experience === 'Todas las experiencias') {
      return experienceRows
    }

    return experienceRows.filter((item) => item.name === experience)
  }, [experience])

  const headlineSales = 1248750 * periodFactor * sourceFactor
  const headlineReservations = Math.round(
    368 * periodFactor * sourceFactor,
  )

  const kpis: KpiItem[] = [
    {
      label: 'Ingresos desde la app',
      value: formatCurrency(headlineSales),
      note: 'Pagos, reservaciones y compras',
      delta: '+18.6%',
      icon: WalletCards,
      tone: 'brand',
    },
    {
      label: 'Reservaciones',
      value: formatNumber(headlineReservations),
      note: 'Confirmadas dentro del periodo',
      delta: '+14.2%',
      icon: CalendarDays,
      tone: 'positive',
    },
    {
      label: 'Conversión digital',
      value: '6.7%',
      note: 'De visita a reservación',
      delta: '+0.8 pts',
      icon: TrendingUp,
      tone: 'positive',
    },
    {
      label: 'Pagos por recuperar',
      value: '19',
      note: 'Valor potencial: $31,800',
      delta: 'Atención',
      icon: CircleDollarSign,
      tone: 'attention',
    },
  ]

  const executiveKpis: KpiItem[] = [
    {
      label: 'Crecimiento de ingresos',
      value: '+18.6%',
      note: 'Comparativo contra periodo anterior',
      delta: 'En ritmo',
      icon: TrendingUp,
      tone: 'positive',
    },
    {
      label: 'Pagos recuperables',
      value: '$31,800',
      note: 'Cobros incompletos detectados',
      delta: 'Seguimiento',
      icon: CircleDollarSign,
      tone: 'attention',
    },
    {
      label: 'Ticket de recurrentes',
      value: '1.4×',
      note: 'Vs cliente de primera compra',
      delta: 'Estable',
      icon: Repeat2,
      tone: 'neutral',
    },
  ]

  const togglePanel = (panel: PanelKey) => {
    setOpenPanels((current) => ({
      ...current,
      [panel]: !current[panel],
    }))
  }

  const resetFilters = () => {
    setPeriod('month')
    setSource('Todos los orígenes')
    setExperience('Todas las experiencias')
  }

  const exportCommercial = () => {
    downloadCsv('reporte-comercial-app.csv', [
      [
        'Fecha',
        'Cliente',
        'Concepto',
        'Origen',
        'Monto',
        'Método',
        'Estado',
      ],
      ...salesRows.map((row) => [
        row.date,
        row.customer,
        row.concept,
        row.origin,
        row.amount,
        row.method,
        row.status,
      ]),
    ])
  }

  const exportReservations = () => {
    downloadCsv('reporte-reservaciones-app.csv', [
      [
        'Experiencia',
        'Reservaciones',
        'Ingresos',
        'Ocupación',
        'Conversión',
      ],
      ...filteredExperiences.map((row) => [
        row.name,
        row.reservations,
        row.revenue,
        `${row.occupancy}%`,
        `${row.conversion}%`,
      ]),
    ])
  }

  const exportCustomers = () => {
    downloadCsv('reporte-clientes-app.csv', [
      ['Segmento', 'Participación', 'Descripción'],
      ...customerSegments.map((item) => [
        item.label,
        item.value,
        item.note,
      ]),
    ])
  }

  const exportMarketing = () => {
    downloadCsv('reporte-marketing-app.csv', [
      [
        'Campaña',
        'Origen',
        'Leads',
        'Reservaciones',
        'Inversión',
        'Ingresos',
        'ROAS',
      ],
      ...campaignRows.map((row) => [
        row.name,
        row.source,
        row.leads,
        row.reservations,
        row.spend,
        row.revenue,
        (row.revenue / row.spend).toFixed(1),
      ]),
    ])
  }

  const exportExecutiveSummary = () => {
    downloadCsv('resumen-ejecutivo-app.csv', [
      ['Indicador', 'Valor', 'Lectura'],
      ...kpis.map((item) => [item.label, item.value, item.note]),
      [],
      ['Alcance', 'Canal app', 'Reservaciones, pagos y campañas conectadas'],
      [
        'Expansión disponible',
        'Business OS',
        'Restaurante, inventario, logística y operación total',
      ],
    ])
  }

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <SectionTitle
          eyebrow="Inteligencia del canal digital"
          title="Reportes"
          subtitle="Consulta, compara y exporta el desempeño comercial de la app sin perderte entre tablas interminables."
        />

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={exportExecutiveSummary}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--color-line)] bg-[var(--color-panel)] px-4 text-sm font-semibold text-[var(--color-ink)] shadow-sm transition hover:-translate-y-0.5"
          >
            <Download size={16} />
            Exportar resumen
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--color-burgundy)] px-5 text-sm font-semibold shadow-[0_12px_25px_rgba(79,15,31,0.18)] transition hover:-translate-y-0.5"
            style={{ color: '#ffffff' }}
          >
            <FileText size={16} color="#ffffff" />
            Imprimir / PDF
          </button>
        </div>
      </div>

      <section className="rounded-[1.3rem] border border-[var(--color-line)] bg-[var(--color-panel)] p-4 shadow-[var(--shadow-card)]">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Filter
              size={16}
              className="text-[var(--color-burgundy)]"
            />

            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-strong)]">
              Vista del reporte
            </p>

            <span className="ml-auto inline-flex items-center gap-2 rounded-full bg-[var(--color-soft)] px-3 py-1.5 text-[10px] font-semibold text-[var(--color-muted)]">
              <Smartphone size={12} />
              Fuente actual: app
            </span>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[repeat(3,minmax(180px,1fr))_auto]">
            <CrystalSelect
              value={period}
              onChange={(value) => setPeriod(value as PeriodKey)}
              options={periodOptions.map((item) => ({
                value: item.value,
                label: `Periodo: ${item.label}`,
              }))}
            />

            <CrystalSelect
              value={source}
              onChange={setSource}
              options={sourceOptions.map((item) => ({
                value: item,
                label: `Origen: ${item}`,
              }))}
            />

            <CrystalSelect
              value={experience}
              onChange={setExperience}
              options={experienceOptions.map((item) => ({
                value: item,
                label: `Experiencia: ${item}`,
              }))}
            />

            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--color-line)] bg-transparent px-4 text-sm font-semibold text-[var(--color-burgundy)]"
            >
              <RefreshCcw size={15} />
              Restablecer
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((item) => (
          <KpiCard key={item.label} item={item} />
        ))}
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {executiveKpis.map((item) => (
          <KpiCard key={item.label} item={item} />
        ))}
      </section>

      <div className="space-y-4">
        <ReportPanel
          title="Rendimiento comercial"
          subtitle="Ingresos, mezcla de productos, transacciones y ticket promedio."
          icon={BarChart3}
          open={openPanels.commercial}
          onToggle={() => togglePanel('commercial')}
          actions={
            <ExportButton
              label="Exportar ventas"
              onClick={exportCommercial}
            />
          }
        >
          <div className="grid gap-5 2xl:grid-cols-[1.35fr_0.65fr]">
            <article className="rounded-[1.15rem] border border-[var(--color-line)] bg-[var(--color-panel-strong)] p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">
                    Evolución de ingresos
                  </p>

                  <p
                    className="mt-2 text-[2rem] leading-none text-[var(--color-ink)]"
                    style={{
                      fontFamily:
                        'var(--font-display)',
                    }}
                  >
                    {formatCurrency(headlineSales)}
                  </p>

                  <p className="mt-2 text-xs text-[var(--color-positive)]">
                    +18.6% contra el periodo anterior
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-white px-4 py-3 shadow-sm">
                    <p className="text-[9px] uppercase tracking-[0.1em] text-[var(--color-muted)]">
                      Ticket
                    </p>
                    <p className="mt-1 text-sm font-bold text-[var(--color-ink)]">
                      $1,320
                    </p>
                  </div>

                  <div className="rounded-xl bg-white px-4 py-3 shadow-sm">
                    <p className="text-[9px] uppercase tracking-[0.1em] text-[var(--color-muted)]">
                      Órdenes
                    </p>
                    <p className="mt-1 text-sm font-bold text-[var(--color-ink)]">
                      945
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-7 flex h-[230px] items-end gap-2 rounded-[1rem] bg-[linear-gradient(180deg,#fffaf4,#f3e7d8)] px-4 pb-4 pt-6">
                {salesTrend.map((height, index) => (
                  <div
                    key={`${height}-${index}`}
                    className="relative flex-1"
                    style={{ height: `${height}%` }}
                  >
                    <div className="absolute inset-0 rounded-t-full bg-[linear-gradient(180deg,var(--color-gold),var(--color-burgundy))]" />

                    {index === salesTrend.length - 1 ? (
                      <span className="absolute -top-7 left-1/2 -translate-x-1/2 rounded-full bg-[var(--color-burgundy)] px-2 py-1 text-[8px] font-bold text-white">
                        Hoy
                      </span>
                    ) : null}
                  </div>
                ))}
              </div>
            </article>

            <article className="rounded-[1.15rem] border border-[var(--color-line)] bg-[var(--color-panel-strong)] p-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">
                Mezcla de ingresos
              </p>

              <h3
                className="mt-2 text-[1.45rem] text-[var(--color-ink)]"
                style={{
                  fontFamily: 'var(--font-display)',
                }}
              >
                Qué está comprando el cliente
              </h3>

              <div className="mt-6 space-y-5">
                {categoryMix.map((item) => (
                  <ProgressRow
                    key={item.label}
                    label={item.label}
                    value={`${item.value}%`}
                    percent={item.value}
                    meta={item.amount}
                  />
                ))}
              </div>
            </article>
          </div>

          <div className="mt-5 overflow-hidden rounded-[1.15rem] border border-[var(--color-line)]">
            <div className="hidden grid-cols-[110px_minmax(150px,1fr)_minmax(170px,1.2fr)_130px_120px_100px] gap-4 bg-[var(--color-soft)] px-5 py-3 text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)] xl:grid">
              <span>Fecha</span>
              <span>Cliente</span>
              <span>Concepto</span>
              <span>Origen</span>
              <span>Monto</span>
              <span>Estado</span>
            </div>

            <div className="divide-y divide-[var(--color-line)]">
              {salesRows.map((row) => (
                <article
                  key={`${row.date}-${row.customer}`}
                  className="grid gap-3 bg-[var(--color-panel)] px-5 py-4 xl:grid-cols-[110px_minmax(150px,1fr)_minmax(170px,1.2fr)_130px_120px_100px] xl:items-center"
                >
                  <p className="text-xs text-[var(--color-muted)]">
                    {row.date}
                  </p>

                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[var(--color-ink)]">
                      {row.customer}
                    </p>
                    <p className="mt-1 text-[10px] text-[var(--color-muted)]">
                      {row.method}
                    </p>
                  </div>

                  <p className="text-xs text-[var(--color-muted-strong)]">
                    {row.concept}
                  </p>

                  <p className="text-xs text-[var(--color-muted)]">
                    {row.origin}
                  </p>

                  <p className="text-sm font-bold text-[var(--color-ink)]">
                    {formatCurrency(row.amount)}
                  </p>

                  <span className="w-fit rounded-full bg-[#e7efe6] px-3 py-1.5 text-[9px] font-semibold text-[#5f7d63]">
                    {row.status}
                  </span>
                </article>
              ))}
            </div>
          </div>
        </ReportPanel>

        <ReportPanel
          title="Reservaciones y demanda"
          subtitle="Ocupación publicada en la app, estatus y rendimiento por experiencia."
          icon={CalendarDays}
          open={openPanels.reservations}
          onToggle={() => togglePanel('reservations')}
          actions={
            <ExportButton
              label="Exportar reservaciones"
              onClick={exportReservations}
            />
          }
        >
          <div className="grid gap-5 2xl:grid-cols-[0.72fr_1.28fr]">
            <article className="rounded-[1.15rem] border border-[var(--color-line)] bg-[var(--color-panel-strong)] p-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">
                Estado de reservaciones
              </p>

              <h3
                className="mt-2 text-[1.45rem] text-[var(--color-ink)]"
                style={{
                  fontFamily: 'var(--font-display)',
                }}
              >
                368 registros activos
              </h3>

              <div className="mt-6 space-y-4">
                {reservationStatus.map((item) => (
                  <div key={item.label}>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-semibold text-[var(--color-ink)]">
                        {item.label}
                      </p>
                      <p className="text-xs text-[var(--color-muted)]">
                        {item.value}
                      </p>
                    </div>

                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${item.percent}%`,
                          backgroundColor: item.tone,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <article className="rounded-[1.15rem] border border-[var(--color-line)] bg-[var(--color-panel-strong)] p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">
                    Demanda semanal
                  </p>

                  <h3
                    className="mt-2 text-[1.45rem] text-[var(--color-ink)]"
                    style={{
                      fontFamily:
                        'var(--font-display)',
                    }}
                  >
                    El sábado concentra la presión
                  </h3>
                </div>

                <span className="w-fit rounded-full bg-[#f4e5d7] px-3 py-1.5 text-[9px] font-semibold text-[var(--color-burgundy)]">
                  Pico: 94%
                </span>
              </div>

              <div className="mt-7 grid grid-cols-7 gap-2">
                {weeklyDemand.map((item) => (
                  <div key={item.label} className="text-center">
                    <div className="flex h-[170px] items-end rounded-xl bg-white p-2">
                      <div
                        className="w-full rounded-lg bg-[linear-gradient(180deg,var(--color-gold),var(--color-burgundy))]"
                        style={{ height: `${item.value}%` }}
                      />
                    </div>

                    <p className="mt-2 text-[10px] font-semibold text-[var(--color-muted)]">
                      {item.label}
                    </p>

                    <p className="mt-1 text-xs font-bold text-[var(--color-ink)]">
                      {item.value}%
                    </p>
                  </div>
                ))}
              </div>
            </article>
          </div>

          <div className="mt-5 grid gap-3 xl:grid-cols-2">
            {filteredExperiences.map((row) => (
              <article
                key={row.name}
                className="rounded-[1rem] border border-[var(--color-line)] bg-[var(--color-panel-strong)] p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h4 className="truncate text-sm font-semibold text-[var(--color-ink)]">
                      {row.name}
                    </h4>

                    <p className="mt-1 text-[10px] text-[var(--color-muted)]">
                      {row.reservations} reservaciones
                    </p>
                  </div>

                  <span className="shrink-0 text-sm font-bold text-[var(--color-burgundy)]">
                    {formatCurrency(row.revenue)}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-white p-3">
                    <p className="text-[9px] uppercase tracking-[0.1em] text-[var(--color-muted)]">
                      Ocupación
                    </p>
                    <p className="mt-1 text-sm font-bold text-[var(--color-ink)]">
                      {row.occupancy}%
                    </p>
                  </div>

                  <div className="rounded-xl bg-white p-3">
                    <p className="text-[9px] uppercase tracking-[0.1em] text-[var(--color-muted)]">
                      Conversión
                    </p>
                    <p className="mt-1 text-sm font-bold text-[var(--color-ink)]">
                      {row.conversion}%
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </ReportPanel>

        <ReportPanel
          title="Clientes"
          subtitle="Segmentación, frecuencia, valor del cliente y avance del pipeline."
          icon={Users}
          open={openPanels.customers}
          onToggle={() => togglePanel('customers')}
          actions={
            <ExportButton
              label="Exportar clientes"
              onClick={exportCustomers}
            />
          }
        >
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {customerSegments.map((item) => {
              const Icon = item.icon

              return (
                <article
                  key={item.label}
                  className="rounded-[1rem] border border-[var(--color-line)] bg-[var(--color-panel-strong)] p-4"
                >
                  <Icon
                    size={17}
                    className="text-[var(--color-burgundy)]"
                  />

                  <p className="mt-5 text-2xl font-bold text-[var(--color-ink)]">
                    {item.value}
                  </p>

                  <p className="mt-1 text-sm font-semibold text-[var(--color-ink)]">
                    {item.label}
                  </p>

                  <p className="mt-1 text-[10px] text-[var(--color-muted)]">
                    {item.note}
                  </p>
                </article>
              )
            })}
          </div>

          <div className="mt-5 grid gap-5 2xl:grid-cols-[1fr_0.82fr]">
            <article className="rounded-[1.15rem] border border-[var(--color-line)] bg-[var(--color-panel-strong)] p-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">
                Pipeline de conversión
              </p>

              <h3
                className="mt-2 text-[1.45rem] text-[var(--color-ink)]"
                style={{
                  fontFamily: 'var(--font-display)',
                }}
              >
                De interés a reservación
              </h3>

              <div className="mt-6 space-y-5">
                {leadPipeline.map((item) => (
                  <ProgressRow
                    key={item.label}
                    label={item.label}
                    value={formatNumber(item.value)}
                    percent={item.percent}
                  />
                ))}
              </div>
            </article>

            <article className="rounded-[1.15rem] border border-[var(--color-line)] bg-[linear-gradient(145deg,#681126,#3b0816)] p-5 text-white">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#e6c38b]">
                Valor del cliente
              </p>

              <h3
                className="mt-3 text-[1.7rem] leading-tight text-white"
                style={{
                  fontFamily: 'var(--font-display)',
                }}
              >
                La recurrencia vale más que una campaña nueva.
              </h3>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-white/10 bg-white/8 p-4">
                  <p className="text-[9px] uppercase tracking-[0.1em] text-white/52">
                    Ticket recurrente
                  </p>
                  <p className="mt-2 text-lg font-bold text-white">
                    $1,840
                  </p>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/8 p-4">
                  <p className="text-[9px] uppercase tracking-[0.1em] text-white/52">
                    Frecuencia
                  </p>
                  <p className="mt-2 text-lg font-bold text-white">
                    2.6×
                  </p>
                </div>
              </div>

              <p className="mt-5 text-xs leading-6 text-white/64">
                El segmento recurrente representa 31% de la base, pero
                genera 41% del ingreso digital del periodo.
              </p>
            </article>
          </div>
        </ReportPanel>

        <ReportPanel
          title="Marketing y conversión"
          subtitle="Leads, campañas, costo de adquisición y retorno atribuido."
          icon={Megaphone}
          open={openPanels.marketing}
          onToggle={() => togglePanel('marketing')}
          actions={
            <ExportButton
              label="Exportar campañas"
              onClick={exportMarketing}
            />
          }
        >
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              {
                label: 'Leads',
                value: '1,842',
                note: '+22% contra periodo anterior',
                icon: MousePointerClick,
              },
              {
                label: 'Reservaciones atribuidas',
                value: '326',
                note: '17.7% de conversión',
                icon: Target,
              },
              {
                label: 'CAC promedio',
                value: '$228',
                note: '-9% contra periodo anterior',
                icon: CircleDollarSign,
              },
              {
                label: 'ROAS',
                value: '5.8×',
                note: 'Retorno sobre inversión',
                icon: ArrowUpRight,
              },
            ].map((item) => {
              const Icon = item.icon

              return (
                <article
                  key={item.label}
                  className="rounded-[1rem] border border-[var(--color-line)] bg-[var(--color-panel-strong)] p-4"
                >
                  <Icon
                    size={17}
                    className="text-[var(--color-burgundy)]"
                  />

                  <p className="mt-5 text-2xl font-bold text-[var(--color-ink)]">
                    {item.value}
                  </p>

                  <p className="mt-1 text-sm font-semibold text-[var(--color-ink)]">
                    {item.label}
                  </p>

                  <p className="mt-1 text-[10px] leading-4 text-[var(--color-muted)]">
                    {item.note}
                  </p>
                </article>
              )
            })}
          </div>

          <div className="mt-5 overflow-hidden rounded-[1.15rem] border border-[var(--color-line)]">
            <div className="hidden grid-cols-[minmax(180px,1.2fr)_110px_90px_110px_120px_90px] gap-4 bg-[var(--color-soft)] px-5 py-3 text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)] xl:grid">
              <span>Campaña</span>
              <span>Origen</span>
              <span>Leads</span>
              <span>Reservas</span>
              <span>Ingresos</span>
              <span>ROAS</span>
            </div>

            <div className="divide-y divide-[var(--color-line)]">
              {campaignRows.map((row) => {
                const roas = row.revenue / row.spend

                return (
                  <article
                    key={row.name}
                    className="grid gap-3 bg-[var(--color-panel)] px-5 py-4 xl:grid-cols-[minmax(180px,1.2fr)_110px_90px_110px_120px_90px] xl:items-center"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[var(--color-ink)]">
                        {row.name}
                      </p>

                      <p className="mt-1 text-[10px] text-[var(--color-muted)]">
                        Inversión {formatCurrency(row.spend)}
                      </p>
                    </div>

                    <p className="text-xs text-[var(--color-muted)]">
                      {row.source}
                    </p>

                    <p className="text-sm font-semibold text-[var(--color-ink)]">
                      {formatNumber(row.leads)}
                    </p>

                    <p className="text-sm font-semibold text-[var(--color-ink)]">
                      {formatNumber(row.reservations)}
                    </p>

                    <p className="text-sm font-bold text-[var(--color-ink)]">
                      {formatCurrency(row.revenue)}
                    </p>

                    <span className="w-fit rounded-full bg-[#e7efe6] px-3 py-1.5 text-[10px] font-bold text-[#5f7d63]">
                      {roas.toFixed(1)}×
                    </span>
                  </article>
                )
              })}
            </div>
          </div>
        </ReportPanel>
      </div>

      <section className="rounded-[1.25rem] border border-[var(--color-line)] bg-[var(--color-panel)] p-5 shadow-[var(--shadow-card)]">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--color-soft)] text-[var(--color-burgundy)]">
              <Smartphone size={19} />
            </span>

            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--color-ink)]">
                Alcance actual del Centro de Reportes
              </p>

              <p className="mt-2 max-w-4xl text-xs leading-6 text-[var(--color-muted)]">
                Hoy consolida información generada por la app:
                reservaciones, pagos, comportamiento del cliente y campañas
                conectadas. El mismo centro puede ampliarse para integrar
                restaurante, eventos presenciales, inventario, logística y
                operación completa de Hacienda de Letras.
              </p>
            </div>
          </div>

          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[var(--color-line)] bg-[var(--color-panel-strong)] px-4 py-2 text-[10px] font-semibold text-[var(--color-burgundy)]">
            <FileText size={13} />
            Escalable a Business OS
          </span>
        </div>
      </section>
    </div>
  )
}
