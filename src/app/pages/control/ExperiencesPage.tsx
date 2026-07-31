import {
  useMemo,
  useState,
  type FormEvent,
} from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  Download,
  Edit3,
  Eye,
  Filter,
  Search,
  Sparkles,
  TrendingUp,
  Users,
  WalletCards,
  X,
} from 'lucide-react'
import { SectionTitle } from '../../components/shared/SectionTitle'
import { CrystalSelect } from '../../components/shared/CrystalSelect'
import { StatusBadge } from '../../components/shared/StatusBadge'
import { experiences } from '../../data/experiences'
import { useAppPreferences } from '../../context/AppPreferencesContext'

type ExperienceItem = (typeof experiences)[number]

type ExperienceVisual = {
  src: string
  eyebrow: string
  description: string
  accent: string
}

function normalizeText(value: string) {
  return value
    .toLocaleLowerCase('es-MX')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function toNumber(value: string | number | undefined) {
  if (typeof value === 'number') {
    return value
  }

  return Number(String(value ?? '').replace(/[^\d.-]/g, '')) || 0
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(value)
}

function getExperienceVisual(experience: ExperienceItem): ExperienceVisual {
  const title = normalizeText(experience.title)

  if (title.includes('cata')) {
    return {
      src: '/viñedo 1.webp',
      eyebrow: 'Degustación guiada',
      description:
        'Selección de etiquetas, guía especializada y una experiencia diseñada para descubrir el carácter de la casa.',
      accent: '#8f5d42',
    }
  }

  if (
    title.includes('recorrido') ||
    title.includes('vinedo') ||
    title.includes('viñedo')
  ) {
    return {
      src: '/turismo.jpeg',
      eyebrow: 'Origen y territorio',
      description:
        'Un recorrido por la historia, el paisaje y el proceso que convierte la uva en una experiencia.',
      accent: '#6f7f55',
    }
  }

  if (
    title.includes('cena') ||
    title.includes('romant') ||
    title.includes('maridaje')
  ) {
    return {
      src: '/romantic dinners evento.webp',
      eyebrow: 'Gastronomía',
      description:
        'Una experiencia íntima con menú especial, vino y ambientación dentro de la hacienda.',
      accent: '#7a263a',
    }
  }

  if (title.includes('picnic')) {
    return {
      src: '/Picnic evento.webp',
      eyebrow: 'Exterior',
      description:
        'Una tarde entre viñedos con vino, alimentos y una puesta en escena relajada.',
      accent: '#8d7447',
    }
  }

  if (title.includes('restaurante')) {
    return {
      src: '/hacienda 2.jpg',
      eyebrow: 'Hospitalidad',
      description:
        'Cocina de temporada, servicio cercano y una vista que forma parte de la experiencia.',
      accent: '#87523b',
    }
  }

  if (
    title.includes('privado') ||
    title.includes('corporativo') ||
    title.includes('boda')
  ) {
    return {
      src: '/boda 2.webp',
      eyebrow: 'Celebraciones',
      description:
        'Eventos diseñados a la medida para empresas, familias y ocasiones que merecen un escenario especial.',
      accent: '#8a6552',
    }
  }

  return {
    src: '/Hacienda-de-Letras hacienda.jpg',
    eyebrow: 'Hacienda de Letras',
    description:
      'Una experiencia creada alrededor del vino, el paisaje y la hospitalidad de la casa.',
    accent: '#681126',
  }
}

function getRevenue(experience: ExperienceItem) {
  return (
    toNumber(experience.price) *
    toNumber(experience.reservations)
  )
}

function getHealthLabel(occupancy: number, isEnglish: boolean) {
  if (occupancy >= 80) {
    return isEnglish ? 'High demand' : 'Alta demanda'
  }

  if (occupancy >= 55) {
    return isEnglish ? 'Healthy pace' : 'Ritmo saludable'
  }

  return isEnglish ? 'Needs a boost' : 'Requiere impulso'
}

function getHealthMessage(experience: ExperienceItem, isEnglish: boolean) {
  const occupancy = toNumber(experience.occupancy)

  if (isEnglish) {
    if (occupancy >= 85) {
      return `Demand for ${experience.title.toLowerCase()} is near the limit. Consider reviewing slots or adding a second departure before pushing sales further.`
    }
    if (occupancy >= 60) {
      return `${experience.title} maintains a healthy pace. The opportunity is in improving repeat visits and cross-selling without touching price.`
    }
    return `${experience.title} needs a commercial adjustment. Consider reviewing photography, value proposition and visibility within the app.`
  }

  if (occupancy >= 85) {
    return `La demanda de ${experience.title.toLowerCase()} está cerca del límite. Conviene revisar cupos, horarios o una segunda salida antes de seguir impulsando ventas.`
  }

  if (occupancy >= 60) {
    return `${experience.title} mantiene un ritmo sano. La oportunidad está en mejorar recurrencia y venta cruzada sin tocar el precio.`
  }

  return `${experience.title} necesita un ajuste comercial. Conviene revisar fotografía, propuesta de valor y visibilidad dentro de la app.`
}

function downloadExperiencesCsv(items: ExperienceItem[]) {
  const rows = [
    [
      'Experiencia',
      'Categoría',
      'Precio',
      'Duración',
      'Capacidad',
      'Reservas del mes',
      'Ocupación',
      'Ingreso estimado',
      'Estado',
    ],
    ...items.map((experience) => [
      experience.title,
      experience.category,
      experience.price,
      experience.duration,
      String(experience.capacity),
      String(experience.reservations),
      `${experience.occupancy}%`,
      formatCurrency(getRevenue(experience)),
      experience.status,
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
  link.download = 'experiencias-hacienda-de-letras.csv'
  link.click()

  URL.revokeObjectURL(url)
}

function MetricCard({
  label,
  value,
  note,
  icon: Icon,
  highlighted = false,
}: {
  label: string
  value: string
  note: string
  icon: typeof CalendarDays
  highlighted?: boolean
}) {
  return (
    <article
      className={`relative min-w-0 overflow-hidden rounded-[1.15rem] border p-5 shadow-[var(--shadow-card)] ${
        highlighted
          ? 'border-[rgba(104,17,38,0.16)] bg-[linear-gradient(145deg,#681126,#3b0816)]'
          : 'border-[var(--color-line)] bg-[var(--color-panel)]'
      }`}
    >
      <div
        className={`absolute -right-8 -top-8 h-24 w-24 rounded-full border ${
          highlighted
            ? 'border-white/10'
            : 'border-[rgba(180,138,85,0.14)]'
        }`}
      />

      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p
            className={`truncate text-xs ${
              highlighted
                ? 'text-white/64'
                : 'text-[var(--color-muted)]'
            }`}
          >
            {label}
          </p>

          <p
            className={`mt-3 text-[2rem] leading-none ${
              highlighted
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
            highlighted
              ? 'bg-white/10 text-[#e5c58f]'
              : 'bg-[var(--color-soft)] text-[var(--color-burgundy)]'
          }`}
        >
          <Icon size={18} />
        </span>
      </div>

      <p
        className={`relative mt-4 truncate text-[11px] ${
          highlighted
            ? 'text-white/55'
            : 'text-[var(--color-muted)]'
        }`}
      >
        {note}
      </p>
    </article>
  )
}

export function ExperiencesPage() {
  const { isEnglish } = useAppPreferences()
  const [experienceItems, setExperienceItems] =
    useState<ExperienceItem[]>(() =>
      experiences.map((experience) => ({ ...experience })),
    )

  const [selectedExperienceId, setSelectedExperienceId] =
    useState(experienceItems[0]?.id ?? '')

  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('Todos')
  const [editingExperience, setEditingExperience] =
    useState<ExperienceItem | null>(null)

  const statuses = useMemo(
    () => [
      'Todos',
      ...Array.from(
        new Set(experienceItems.map((item) => item.status)),
      ),
    ],
    [experienceItems],
  )

  const filteredExperiences = useMemo(() => {
    const normalizedSearch = normalizeText(searchTerm)

    return experienceItems.filter((experience) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        [
          experience.title,
          experience.category,
          experience.status,
        ].some((value) =>
          normalizeText(String(value)).includes(normalizedSearch),
        )

      const matchesStatus =
        statusFilter === 'Todos' ||
        experience.status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [experienceItems, searchTerm, statusFilter])

  const selectedExperience =
    filteredExperiences.find(
      (experience) => experience.id === selectedExperienceId,
    ) ??
    filteredExperiences[0] ??
    experienceItems[0]

  const totals = useMemo(() => {
    const reservations = experienceItems.reduce(
      (sum, item) => sum + toNumber(item.reservations),
      0,
    )

    const revenue = experienceItems.reduce(
      (sum, item) => sum + getRevenue(item),
      0,
    )

    const averageOccupancy =
      experienceItems.length > 0
        ? Math.round(
            experienceItems.reduce(
              (sum, item) => sum + toNumber(item.occupancy),
              0,
            ) / experienceItems.length,
          )
        : 0

    const active = experienceItems.filter((item) =>
      normalizeText(item.status).includes('activa'),
    ).length

    return {
      reservations,
      revenue,
      averageOccupancy,
      active,
    }
  }, [experienceItems])

  const selectedVisual = selectedExperience
    ? getExperienceVisual(selectedExperience)
    : null

  const selectedRevenue = selectedExperience
    ? getRevenue(selectedExperience)
    : 0

  const highDemand = experienceItems.filter(
    (item) => toNumber(item.occupancy) >= 80,
  ).length

  const healthy = experienceItems.filter((item) => {
    const occupancy = toNumber(item.occupancy)
    return occupancy >= 55 && occupancy < 80
  }).length

  const needsAction = experienceItems.filter(
    (item) => toNumber(item.occupancy) < 55,
  ).length

  const handleSaveExperience = (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault()

    if (!editingExperience) {
      return
    }

    setExperienceItems((current) =>
      current.map((item) =>
        item.id === editingExperience.id
          ? editingExperience
          : item,
      ),
    )

    setEditingExperience(null)
  }

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <SectionTitle
          eyebrow={isEnglish ? 'App control center' : 'Centro de control de la app'}
          title={isEnglish ? 'Experiences' : 'Experiencias'}
          subtitle={isEnglish
            ? 'The catalog your guest sees, turned into price, capacity, demand, reservations and performance control.'
            : 'El catálogo que ve el cliente, convertido en control de precio, cupos, demanda, reservaciones y desempeño.'}
        />

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() =>
              downloadExperiencesCsv(filteredExperiences)
            }
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--color-line)] bg-[var(--color-panel)] px-4 text-sm font-semibold text-[var(--color-ink)] shadow-sm transition hover:-translate-y-0.5"
          >
            <Download size={16} />
            {isEnglish ? 'Export catalog' : 'Exportar catálogo'}
          </button>

          <Link
            to="/control/app/experiencias"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--color-burgundy)] px-5 text-sm font-semibold shadow-[0_12px_25px_rgba(79,15,31,0.18)] transition hover:-translate-y-0.5"
            style={{
              color: '#ffffff',
              textDecoration: 'none',
            }}
          >
            <Eye size={16} color="#ffffff" />
            {isEnglish ? 'View in app' : 'Ver en la app'}
          </Link>
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label={isEnglish ? 'Active experiences' : 'Experiencias activas'}
          value={String(totals.active)}
          note={isEnglish ? 'Currently published in app' : 'Publicadas actualmente en la app'}
          icon={CheckCircle2}
        />

        <MetricCard
          label={isEnglish ? 'Monthly reservations' : 'Reservaciones del mes'}
          value={String(totals.reservations)}
          note={isEnglish ? 'Demand from digital channel' : 'Demanda generada por el canal digital'}
          icon={CalendarDays}
        />

        <MetricCard
          label={isEnglish ? 'Estimated revenue' : 'Ingresos estimados'}
          value={formatCurrency(totals.revenue)}
          note={isEnglish ? 'Reservations multiplied by price' : 'Reservaciones multiplicadas por precio'}
          icon={WalletCards}
          highlighted
        />

        <MetricCard
          label={isEnglish ? 'Average occupancy' : 'Ocupación promedio'}
          value={`${totals.averageOccupancy}%`}
          note={isEnglish ? 'Published slots within the app' : 'Cupos publicados dentro de la app'}
          icon={TrendingUp}
        />
      </section>

      <section className="rounded-[1.2rem] border border-[var(--color-line)] bg-[var(--color-panel)] p-4 shadow-[var(--shadow-card)]">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
          <div className="flex items-center gap-2">
            <Filter
              size={16}
              className="text-[var(--color-burgundy)]"
            />

            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-strong)]">
              {isEnglish ? 'Operational catalog' : 'Catálogo operativo'}
            </p>

            <span className="rounded-full bg-[var(--color-soft)] px-3 py-1.5 text-[10px] font-semibold text-[var(--color-muted)]">
              {filteredExperiences.length} {isEnglish ? 'experiences' : 'experiencias'}
            </span>
          </div>

          <div className="grid flex-1 gap-3 md:grid-cols-[minmax(240px,1fr)_210px_auto] xl:ml-auto xl:max-w-3xl">
            <label className="flex min-h-11 min-w-0 items-center gap-3 rounded-xl border border-[var(--color-line)] bg-[var(--color-panel-strong)] px-4">
              <Search
                size={16}
                className="shrink-0 text-[var(--color-muted)]"
              />

              <input
                type="search"
                value={searchTerm}
                onChange={(event) =>
                  setSearchTerm(event.target.value)
                }
                placeholder={isEnglish ? 'Search experience or category...' : 'Buscar experiencia o categoría...'}
                className="min-w-0 flex-1 bg-transparent text-sm text-[var(--color-ink)] outline-none placeholder:text-[var(--color-muted)]"
              />
            </label>

            <CrystalSelect
              value={statusFilter}
              onChange={setStatusFilter}
              options={statuses.map((status) => ({
                value: status,
                label: `${isEnglish ? 'Status' : 'Estado'}: ${status}`,
              }))}
            />

            <button
              type="button"
              onClick={() => {
                setSearchTerm('')
                setStatusFilter('Todos')
              }}
              className="min-h-11 rounded-xl border border-[var(--color-line)] bg-transparent px-4 text-sm font-semibold text-[var(--color-burgundy)]"
            >
              {isEnglish ? 'Clear' : 'Limpiar'}
            </button>
          </div>
        </div>
      </section>

      {selectedExperience && selectedVisual ? (
        <section className="grid min-w-0 gap-5 2xl:grid-cols-[minmax(0,1.35fr)_minmax(350px,0.65fr)]">
          <article className="relative min-h-[420px] overflow-hidden rounded-[1.45rem] border border-[var(--color-line)] bg-[#2d1712] shadow-[0_22px_54px_rgba(49,19,19,0.17)]">
            <img
              src={encodeURI(selectedVisual.src)}
              alt={selectedExperience.title}
              draggable={false}
              className="absolute inset-0 h-full w-full object-cover"
              onError={(imageEvent) => {
                imageEvent.currentTarget.src =
                  '/Hacienda-de-Letras hacienda.jpg'
              }}
            />

            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(24,6,12,0.05)_0%,rgba(24,6,12,0.16)_42%,rgba(24,6,12,0.96)_100%)]" />

            <div className="relative flex min-h-[420px] flex-col justify-between p-6 text-white">
              <div className="flex items-start justify-between gap-4">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-[#2f0913]/55 px-3 py-2 text-[9px] font-semibold uppercase tracking-[0.16em] text-[#e5c58f] backdrop-blur-md">
                  <Eye size={12} />
                  {isEnglish ? 'Published in app' : 'Publicada en la app'}
                </span>

                <span className="rounded-full border border-white/20 bg-white/12 px-3 py-1.5 text-[9px] font-semibold text-white backdrop-blur-md">
                  {selectedExperience.status}
                </span>
              </div>

              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#e5c58f]">
                  {selectedVisual.eyebrow}
                </p>

                <h2
                  className="mt-3 max-w-3xl text-[clamp(2.2rem,4vw,3.9rem)] leading-[0.96] text-white"
                  style={{
                    fontFamily:
                      'var(--font-display)',
                  }}
                >
                  {selectedExperience.title}
                </h2>

                <p className="mt-4 max-w-2xl text-sm leading-6 text-white/72">
                  {selectedVisual.description}
                </p>

                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    to="/control/app/experiencias"
                    className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold"
                    style={{
                      color: '#681126',
                      textDecoration: 'none',
                    }}
                  >
                    {isEnglish ? 'Open in app' : 'Abrir en la app'}
                    <ArrowRight size={15} />
                  </Link>

                  <button
                    type="button"
                    onClick={() =>
                      setEditingExperience({
                        ...selectedExperience,
                      })
                    }
                    className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/22 bg-white/10 px-4 text-sm font-semibold text-white backdrop-blur"
                  >
                    <Edit3 size={15} />
                    {isEnglish ? 'Edit experience' : 'Editar experiencia'}
                  </button>
                </div>
              </div>
            </div>
          </article>

          <aside className="space-y-4">
            <article className="rounded-[1.3rem] border border-[var(--color-line)] bg-[var(--color-panel)] p-5 shadow-[var(--shadow-card)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--color-gold)]">
                    {isEnglish ? 'Performance' : 'Desempeño'}
                  </p>

                  <h3
                    className="mt-2 text-[1.55rem] leading-tight text-[var(--color-ink)]"
                    style={{
                      fontFamily:
                        'var(--font-display)',
                    }}
                  >
                    {isEnglish ? 'Commercial control' : 'Control comercial'}
                  </h3>
                </div>

                <StatusBadge
                  label={selectedExperience.status}
                />
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-[1rem] bg-[var(--color-panel-strong)] p-4">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
                    {isEnglish ? 'Price' : 'Precio'}
                  </p>

                  <p className="mt-2 text-xl font-bold text-[var(--color-ink)]">
                    {selectedExperience.price}
                  </p>
                </div>

                <div className="rounded-[1rem] bg-[var(--color-panel-strong)] p-4">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
                    {isEnglish ? 'Duration' : 'Duración'}
                  </p>

                  <p className="mt-2 text-xl font-bold text-[var(--color-ink)]">
                    {selectedExperience.duration}
                  </p>
                </div>

                <div className="rounded-[1rem] bg-[var(--color-panel-strong)] p-4">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
                    {isEnglish ? 'Capacity' : 'Capacidad'}
                  </p>

                  <p className="mt-2 text-xl font-bold text-[var(--color-ink)]">
                    {selectedExperience.capacity}
                  </p>
                </div>

                <div className="rounded-[1rem] bg-[var(--color-panel-strong)] p-4">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
                    {isEnglish ? 'Bookings' : 'Reservas'}
                  </p>

                  <p className="mt-2 text-xl font-bold text-[var(--color-ink)]">
                    {selectedExperience.reservations}
                  </p>
                </div>

                <div className="col-span-2 rounded-[1rem] bg-[var(--color-panel-strong)] p-4">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
                    {isEnglish ? 'Estimated revenue' : 'Ingreso estimado'}
                  </p>

                  <p className="mt-2 text-2xl font-bold text-[var(--color-burgundy)]">
                    {formatCurrency(selectedRevenue)}
                  </p>
                </div>
              </div>

              <div className="mt-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold text-[var(--color-ink)]">
                    {isEnglish ? 'Published occupancy' : 'Ocupación publicada'}
                  </p>

                  <span className="text-xs font-bold text-[var(--color-burgundy)]">
                    {selectedExperience.occupancy}%
                  </span>
                </div>

                <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-[var(--color-soft)]">
                  <div
                    className="h-full rounded-full bg-[linear-gradient(90deg,var(--color-gold),var(--color-burgundy))]"
                    style={{
                      width: `${selectedExperience.occupancy}%`,
                    }}
                  />
                </div>
              </div>
            </article>

            <article className="rounded-[1.3rem] border border-[var(--color-line)] bg-[var(--color-panel)] p-5 shadow-[var(--shadow-card)]">
              <div className="flex items-center justify-between gap-4">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-soft)] text-[var(--color-burgundy)]">
                  <Sparkles size={18} />
                </span>

                <span className="rounded-full bg-[#f4e7d9] px-3 py-1.5 text-[8px] font-semibold uppercase tracking-[0.13em] text-[var(--color-burgundy)]">
                  ALQIA
                </span>
              </div>

              <h3
                className="mt-5 text-[1.35rem] leading-tight text-[var(--color-ink)]"
                style={{
                  fontFamily:
                    'var(--font-display)',
                }}
              >
                {isEnglish ? 'Executive read' : 'Lectura ejecutiva'}
              </h3>

              <p className="mt-3 text-xs leading-6 text-[var(--color-muted-strong)]">
                {getHealthMessage(selectedExperience, isEnglish)}
              </p>

              <button
                type="button"
                className="mt-5 inline-flex items-center gap-2 text-xs font-semibold text-[var(--color-burgundy)]"
              >
                {isEnglish ? 'View recommendation' : 'Ver recomendación'}
                <ArrowRight size={14} />
              </button>
            </article>
          </aside>
        </section>
      ) : null}

      <section className="grid gap-5 2xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
        <div>
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--color-gold)]">
                {isEnglish ? 'Connected catalog' : 'Catálogo conectado'}
              </p>

              <h3
                className="mt-2 text-[1.65rem] text-[var(--color-ink)]"
                style={{
                  fontFamily:
                    'var(--font-display)',
                }}
              >
                {isEnglish ? 'Published experiences' : 'Experiencias publicadas'}
              </h3>
            </div>

            <span className="text-xs text-[var(--color-muted)]">
              {isEnglish ? 'Select to review' : 'Selecciona para revisar'}
            </span>
          </div>

          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            {filteredExperiences.map((experience) => {
              const visual = getExperienceVisual(experience)
              const isSelected =
                selectedExperience?.id === experience.id

              return (
                <button
                  key={experience.id}
                  type="button"
                  onClick={() =>
                    setSelectedExperienceId(experience.id)
                  }
                  className="min-w-0 overflow-hidden rounded-[1.2rem] border bg-[var(--color-panel)] text-left transition hover:-translate-y-0.5"
                  style={{
                    borderColor: isSelected
                      ? 'var(--color-burgundy)'
                      : 'var(--color-line)',
                    outline: 'none',
                    boxShadow: isSelected
                      ? '0 18px 38px rgba(79,15,31,0.14)'
                      : 'var(--shadow-card)',
                  }}
                >
                  <div className="grid min-h-[180px] grid-cols-[150px_minmax(0,1fr)]">
                    <div className="relative overflow-hidden bg-[#eadfce]">
                      <img
                        src={encodeURI(visual.src)}
                        alt={experience.title}
                        draggable={false}
                        className="absolute inset-0 h-full w-full object-cover"
                        onError={(imageEvent) => {
                          imageEvent.currentTarget.src =
                            '/Hacienda-de-Letras hacienda.jpg'
                        }}
                      />

                      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(30,8,14,0.02),rgba(30,8,14,0.24))]" />
                    </div>

                    <div className="flex min-w-0 flex-col p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[9px] font-semibold uppercase tracking-[0.11em] text-[var(--color-gold)]">
                            {experience.category}
                          </p>

                          <h4
                            className="mt-2 line-clamp-2 text-[1.22rem] leading-[1.03] text-[var(--color-ink)]"
                            style={{
                              fontFamily:
                                'var(--font-display)',
                            }}
                          >
                            {experience.title}
                          </h4>
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-[9px] text-[var(--color-muted)]">
                            {isEnglish ? 'Price' : 'Precio'}
                          </p>
                          <p className="mt-1 text-xs font-bold text-[var(--color-ink)]">
                            {experience.price}
                          </p>
                        </div>

                        <div>
                          <p className="text-[9px] text-[var(--color-muted)]">
                            {isEnglish ? 'Bookings' : 'Reservas'}
                          </p>
                          <p className="mt-1 text-xs font-bold text-[var(--color-ink)]">
                            {experience.reservations}
                          </p>
                        </div>
                      </div>

                      <div className="mt-auto pt-4">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-[10px] text-[var(--color-muted)]">
                            {getHealthLabel(
                              toNumber(experience.occupancy),
                              isEnglish,
                            )}
                          </span>

                          <span className="text-xs font-bold text-[var(--color-burgundy)]">
                            {experience.occupancy}%
                          </span>
                        </div>

                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--color-soft)]">
                          <div
                            className="h-full rounded-full bg-[linear-gradient(90deg,var(--color-gold),var(--color-burgundy))]"
                            style={{
                              width: `${experience.occupancy}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        <aside className="space-y-4">
          <article className="rounded-[1.25rem] border border-[var(--color-line)] bg-[var(--color-panel)] p-5 shadow-[var(--shadow-card)]">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-soft)] text-[var(--color-burgundy)]">
                <BarChart3 size={18} />
              </span>

              <div>
                <p className="text-sm font-semibold text-[var(--color-ink)]">
                  {isEnglish ? 'Catalog health' : 'Salud del catálogo'}
                </p>

                <p className="mt-1 text-[10px] text-[var(--color-muted)]">
                  {isEnglish ? 'App channel demand' : 'Demanda del canal app'}
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {[
                {
                  label: isEnglish ? 'High demand' : 'Alta demanda',
                  value: highDemand,
                  icon: TrendingUp,
                  color: '#681126',
                },
                {
                  label: isEnglish ? 'Healthy pace' : 'Ritmo saludable',
                  value: healthy,
                  icon: CheckCircle2,
                  color: '#6d8d72',
                },
                {
                  label: isEnglish ? 'Need a boost' : 'Requieren impulso',
                  value: needsAction,
                  icon: CircleAlert,
                  color: '#b48a55',
                },
              ].map((item) => {
                const Icon = item.icon

                return (
                  <div
                    key={item.label}
                    className="flex items-center justify-between gap-4 rounded-[1rem] bg-[var(--color-panel-strong)] p-4"
                  >
                    <div className="flex items-center gap-3">
                      <Icon size={16} style={{ color: item.color }} />

                      <p className="text-xs font-semibold text-[var(--color-ink)]">
                        {item.label}
                      </p>
                    </div>

                    <span className="text-lg font-bold text-[var(--color-ink)]">
                      {item.value}
                    </span>
                  </div>
                )
              })}
            </div>
          </article>

          <article className="rounded-[1.25rem] border border-[var(--color-line)] bg-[var(--color-panel)] p-5 shadow-[var(--shadow-card)]">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-soft)] text-[var(--color-burgundy)]">
                <Users size={18} />
              </span>

              <div>
                <p className="text-sm font-semibold text-[var(--color-ink)]">
                  {isEnglish ? 'Behavior' : 'Comportamiento'}
                </p>

                <p className="mt-1 text-[10px] text-[var(--color-muted)]">
                  {isEnglish ? 'Demand profile' : 'Perfil de la demanda'}
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-5">
              {[
                [isEnglish ? 'Couples' : 'Parejas', 34],
                [isEnglish ? 'Families' : 'Familias', 28],
                [isEnglish ? 'Domestic tourism' : 'Turismo nacional', 23],
                [isEnglish ? 'Corporate' : 'Empresas', 15],
              ].map(([label, percent]) => (
                <div key={String(label)}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold text-[var(--color-ink)]">
                      {label}
                    </p>

                    <span className="text-xs font-bold text-[var(--color-burgundy)]">
                      {percent}%
                    </span>
                  </div>

                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--color-soft)]">
                    <div
                      className="h-full rounded-full bg-[linear-gradient(90deg,var(--color-gold),var(--color-burgundy))]"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </article>
        </aside>
      </section>

      <section className="rounded-[1.15rem] border border-[var(--color-line)] bg-[var(--color-panel)] p-5 shadow-[var(--shadow-card)]">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--color-soft)] text-[var(--color-burgundy)]">
              <Eye size={19} />
            </span>

            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--color-ink)]">
                {isEnglish ? 'One experience, two views' : 'Una experiencia, dos vistas'}
              </p>

              <p className="mt-2 max-w-4xl text-xs leading-6 text-[var(--color-muted)]">
                {isEnglish
                  ? 'Guests discover and book from the app. The team manages the same experience here: price, duration, slots, demand, reservations and commercial performance.'
                  : 'El cliente descubre y reserva desde la app. El equipo administra aquí la misma experiencia: precio, duración, cupos, demanda, reservaciones y desempeño comercial.'}
              </p>
            </div>
          </div>

          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[var(--color-line)] bg-[var(--color-panel-strong)] px-4 py-2 text-[10px] font-semibold text-[var(--color-burgundy)]">
            <Sparkles size={13} />
            {isEnglish ? 'Single data source' : 'Misma fuente de datos'}
          </span>
        </div>
      </section>

      {editingExperience ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#210711]/65 p-4 backdrop-blur-sm">
          <button
            type="button"
            aria-label="Cerrar editor"
            onClick={() => setEditingExperience(null)}
            className="absolute inset-0 cursor-default"
          />

          <form
            onSubmit={handleSaveExperience}
            className="relative z-10 max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[1.5rem] border border-[var(--color-line)] bg-[var(--color-panel)] p-6 shadow-[0_35px_90px_rgba(29,5,12,0.38)]"
          >
            <button
              type="button"
              onClick={() => setEditingExperience(null)}
              aria-label="Cerrar"
              className="absolute right-5 top-5 inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--color-line)] bg-white text-[var(--color-burgundy)]"
            >
              <X size={18} />
            </button>

            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-gold)]">
              {isEnglish ? 'Catalog edition' : 'Edición de catálogo'}
            </p>

            <h2
              className="mt-2 text-[2rem] text-[var(--color-burgundy)]"
              style={{
                fontFamily:
                  'var(--font-display)',
              }}
            >
              {isEnglish ? 'Edit experience' : 'Editar experiencia'}
            </h2>

            <p className="mt-2 text-sm text-[var(--color-muted)]">
              {isEnglish
                ? 'Changes are reflected in this Control Center mockup.'
                : 'Los cambios se reflejan en esta maqueta del Centro de Control.'}
            </p>

            <div className="mt-7 grid gap-4 md:grid-cols-2">
              <FormField
                label={isEnglish ? 'Name' : 'Nombre'}
                value={editingExperience.title}
                onChange={(value) =>
                  setEditingExperience((current) =>
                    current
                      ? { ...current, title: value }
                      : current,
                  )
                }
              />

              <FormField
                label={isEnglish ? 'Category' : 'Categoría'}
                value={editingExperience.category}
                onChange={(value) =>
                  setEditingExperience((current) =>
                    current
                      ? { ...current, category: value }
                      : current,
                  )
                }
              />

              <FormField
                label={isEnglish ? 'Price' : 'Precio'}
                value={editingExperience.price}
                onChange={(value) =>
                  setEditingExperience((current) =>
                    current
                      ? { ...current, price: value }
                      : current,
                  )
                }
              />

              <FormField
                label={isEnglish ? 'Duration' : 'Duración'}
                value={editingExperience.duration}
                onChange={(value) =>
                  setEditingExperience((current) =>
                    current
                      ? { ...current, duration: value }
                      : current,
                  )
                }
              />

              <FormField
                label={isEnglish ? 'Capacity' : 'Capacidad'}
                value={String(editingExperience.capacity)}
                onChange={(value) =>
                  setEditingExperience((current) =>
                    current
                      ? {
                          ...current,
                          capacity: toNumber(value),
                        }
                      : current,
                  )
                }
              />

              <FormField
                label={isEnglish ? 'Occupancy' : 'Ocupación'}
                value={String(editingExperience.occupancy)}
                onChange={(value) =>
                  setEditingExperience((current) =>
                    current
                      ? {
                          ...current,
                          occupancy: Number(value) as ExperienceItem['occupancy'],
                        }
                      : current,
                  )
                }
                type="number"
              />
            </div>

            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setEditingExperience(null)}
                className="min-h-12 rounded-xl border border-[var(--color-line)] px-5 text-sm font-semibold text-[var(--color-muted-strong)]"
              >
                {isEnglish ? 'Cancel' : 'Cancelar'}
              </button>

              <button
                type="submit"
                className="min-h-12 rounded-xl bg-[var(--color-burgundy)] px-6 text-sm font-semibold shadow-[0_12px_24px_rgba(79,15,31,0.18)]"
                style={{ color: '#ffffff' }}
              >
                {isEnglish ? 'Save changes' : 'Guardar cambios'}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  )
}

function FormField({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
        {label}
      </span>

      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-12 w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-panel-strong)] px-4 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-gold)]"
      />
    </label>
  )
}
