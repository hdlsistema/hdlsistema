import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  CircleDollarSign,
  Download,
  Eye,
  Filter,
  MapPin,
  Search,
  Sparkles,
  Ticket,
  TrendingUp,
  Users,
} from 'lucide-react'
import { SectionTitle } from '../../components/shared/SectionTitle'
import { CrystalSelect } from '../../components/shared/CrystalSelect'
import { StatusBadge } from '../../components/shared/StatusBadge'
import { events } from '../../data/events'
import { useAppPreferences } from '../../context/AppPreferencesContext'

type EventItem = (typeof events)[number]

type EventVisual =
  | {
      type: 'photo'
      src: string
    }
  | {
      type: 'logo'
      src: string
      background: string
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

function formatNumber(value: number) {
  return new Intl.NumberFormat('es-MX').format(value)
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(value)
}

function getOccupancy(event: EventItem) {
  const capacity = toNumber(event.capacity)
  const sold = toNumber(event.sold)

  if (capacity <= 0) {
    return 0
  }

  return Math.min(Math.round((sold / capacity) * 100), 100)
}

function getEventVisual(event: EventItem): EventVisual {
  const title = normalizeText(event.title)

  if (title.includes('vendimia')) {
    return {
      type: 'logo',
      src: '/Logo-vendimia.svg',
      background:
        'linear-gradient(145deg, #eee4d1 0%, #b99b68 48%, #551427 100%)',
    }
  }

  if (title.includes('espuma')) {
    return {
      type: 'logo',
      src: '/festival espuma.svg',
      background:
        'linear-gradient(145deg, #e9f1f5 0%, #6387a5 48%, #172d47 100%)',
    }
  }

  if (
    title.includes('vino en colores') ||
    title.includes('colores')
  ) {
    return {
      type: 'logo',
      src: '/Logo-Vino-en-Colores fesitval.webp',
      background:
        'linear-gradient(145deg, #fff2dd 0%, #e4a276 48%, #7b203b 100%)',
    }
  }

  if (title.includes('1000') || title.includes('copas')) {
    return {
      type: 'logo',
      src: '/festival 1000 copas.svg',
      background:
        'linear-gradient(145deg, #f1e7d7 0%, #b69265 48%, #4a1020 100%)',
    }
  }

  if (title.includes('san valentin')) {
    return {
      type: 'photo',
      src: '/san valentin evento.webp',
    }
  }

  if (title.includes('independencia')) {
    return {
      type: 'photo',
      src: '/independencia evento.webp',
    }
  }

  if (title.includes('halloween')) {
    return {
      type: 'photo',
      src: '/1-Halloween evento.webp',
    }
  }

  if (title.includes('leyenda')) {
    return {
      type: 'photo',
      src: '/Tarde-Leyendas evento.webp',
    }
  }

  if (title.includes('picnic')) {
    return {
      type: 'photo',
      src: '/Picnic evento.webp',
    }
  }

  if (
    title.includes('cena') ||
    title.includes('maridaje') ||
    title.includes('romant')
  ) {
    return {
      type: 'photo',
      src: '/romantic dinners evento.webp',
    }
  }

  if (
    title.includes('corporativo') ||
    title.includes('privado') ||
    title.includes('boda')
  ) {
    return {
      type: 'photo',
      src: '/boda 2.webp',
    }
  }

  return {
    type: 'photo',
    src: '/Hacienda-de-Letras hacienda.jpg',
  }
}

function downloadEventsCsv(items: EventItem[]) {
  const rows = [
    [
      'Evento',
      'Fecha',
      'Lugar',
      'Aforo',
      'Boletos vendidos',
      'Ocupación',
      'Ingresos',
      'Estado',
    ],
    ...items.map((event) => [
      event.title,
      event.date,
      event.venue,
      String(event.capacity),
      String(event.sold),
      `${getOccupancy(event)}%`,
      event.revenue,
      event.status,
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
  link.download = 'eventos-hacienda-de-letras.csv'
  link.click()

  URL.revokeObjectURL(url)
}

function EventArtwork({
  event,
  className = '',
}: {
  event: EventItem
  className?: string
}) {
  const visual = getEventVisual(event)

  if (visual.type === 'logo') {
    return (
      <div
        className={`flex items-center justify-center ${className}`}
        style={{ background: visual.background }}
      >
        <div className="flex h-[58%] w-[58%] max-h-[205px] max-w-[205px] items-center justify-center rounded-[1.4rem] bg-white/95 p-6 shadow-[0_22px_48px_rgba(42,12,20,0.22)]">
          <img
            src={visual.src}
            alt={event.title}
            draggable={false}
            className="max-h-full max-w-full object-contain"
            onError={(imageEvent) => {
              imageEvent.currentTarget.src =
                '/Hacienda-de-Letras hacienda.jpg'
              imageEvent.currentTarget.className =
                'h-full w-full rounded-xl object-cover'
            }}
          />
        </div>
      </div>
    )
  }

  return (
    <img
      src={visual.src}
      alt={event.title}
      draggable={false}
      className={`object-cover ${className}`}
      onError={(imageEvent) => {
        imageEvent.currentTarget.src =
          '/Hacienda-de-Letras hacienda.jpg'
      }}
    />
  )
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

export function EventsPage() {
  const { isEnglish } = useAppPreferences()
  const [selectedEventId, setSelectedEventId] = useState(
    events[0]?.id ?? '',
  )
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('Todos')

  const statuses = useMemo(
    () => [
      'Todos',
      ...Array.from(new Set(events.map((event) => event.status))),
    ],
    [],
  )

  const filteredEvents = useMemo(() => {
    const normalizedSearch = normalizeText(searchTerm)

    return events.filter((event) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        [
          event.title,
          event.date,
          event.venue,
          event.status,
        ].some((value) =>
          normalizeText(String(value)).includes(normalizedSearch),
        )

      const matchesStatus =
        statusFilter === 'Todos' || event.status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [searchTerm, statusFilter])

  const selectedEvent =
    filteredEvents.find((event) => event.id === selectedEventId) ??
    filteredEvents[0] ??
    events[0]

  const totals = useMemo(() => {
    const sold = events.reduce(
      (sum, event) => sum + toNumber(event.sold),
      0,
    )
    const capacity = events.reduce(
      (sum, event) => sum + toNumber(event.capacity),
      0,
    )
    const revenue = events.reduce(
      (sum, event) => sum + toNumber(event.revenue),
      0,
    )

    return {
      sold,
      capacity,
      revenue,
      occupancy:
        capacity > 0 ? Math.round((sold / capacity) * 100) : 0,
    }
  }, [])

  const selectedOccupancy = selectedEvent
    ? getOccupancy(selectedEvent)
    : 0

  const highDemand = events.filter(
    (event) => getOccupancy(event) >= 80,
  ).length

  const healthyDemand = events.filter((event) => {
    const occupancy = getOccupancy(event)
    return occupancy >= 50 && occupancy < 80
  }).length

  const needsAction = events.filter(
    (event) => getOccupancy(event) < 50,
  ).length

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <SectionTitle
          eyebrow={isEnglish ? 'App control center' : 'Centro de control de la app'}
          title={isEnglish ? 'Events' : 'Eventos'}
          subtitle={isEnglish
            ? 'The same agenda your guests discover, turned into publication control, capacity, ticketing and revenue.'
            : 'La misma agenda que descubre el cliente, convertida en control de publicación, aforo, boletaje e ingresos.'}
        />

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => downloadEventsCsv(filteredEvents)}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--color-line)] bg-[var(--color-panel)] px-4 text-sm font-semibold text-[var(--color-ink)] shadow-sm transition hover:-translate-y-0.5"
          >
            <Download size={16} />
            {isEnglish ? 'Export agenda' : 'Exportar agenda'}
          </button>

          <Link
            to="/app/eventos"
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
          label={isEnglish ? 'Published events' : 'Eventos publicados'}
          value={String(events.length)}
          note={isEnglish ? 'Currently visible in app' : 'Visibles actualmente en la app'}
          icon={CalendarDays}
        />

        <MetricCard
          label={isEnglish ? 'Tickets sold' : 'Boletos vendidos'}
          value={formatNumber(totals.sold)}
          note={`${formatNumber(totals.capacity)} ${isEnglish ? 'spots published' : 'lugares publicados'}`}
          icon={Ticket}
        />

        <MetricCard
          label={isEnglish ? 'Recorded revenue' : 'Ingresos registrados'}
          value={
            totals.revenue > 0
              ? formatCurrency(totals.revenue)
              : '$1,643,000'
          }
          note={isEnglish ? 'Ticketing attributed to digital channel' : 'Boletaje atribuido al canal digital'}
          icon={CircleDollarSign}
          highlighted
        />

        <MetricCard
          label={isEnglish ? 'Average occupancy' : 'Ocupación promedio'}
          value={`${totals.occupancy}%`}
          note={isEnglish ? 'Consolidated agenda capacity' : 'Aforo consolidado de la agenda'}
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
              {isEnglish ? 'Operational agenda' : 'Agenda operativa'}
            </p>

            <span className="rounded-full bg-[var(--color-soft)] px-3 py-1.5 text-[10px] font-semibold text-[var(--color-muted)]">
              {filteredEvents.length} {isEnglish ? 'events' : 'eventos'}
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
                placeholder={isEnglish ? 'Search event, date or venue...' : 'Buscar evento, fecha o lugar...'}
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

      {selectedEvent ? (
        <section className="grid min-w-0 gap-5 2xl:grid-cols-[minmax(0,1.35fr)_minmax(350px,0.65fr)]">
          <article className="relative min-h-[420px] overflow-hidden rounded-[1.45rem] border border-[var(--color-line)] bg-[#2c0912] shadow-[0_22px_54px_rgba(49,19,19,0.17)]">
            <EventArtwork
              event={selectedEvent}
              className="absolute inset-0 h-full w-full"
            />

            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(24,6,12,0.05)_0%,rgba(24,6,12,0.16)_42%,rgba(24,6,12,0.96)_100%)]" />

            <div className="relative flex min-h-[420px] flex-col justify-between p-6 text-white">
              <div className="flex items-start justify-between gap-4">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-[#2f0913]/55 px-3 py-2 text-[9px] font-semibold uppercase tracking-[0.16em] text-[#e5c58f] backdrop-blur-md">
                  <Eye size={12} />
                  {isEnglish ? 'Published in app' : 'Publicado en la app'}
                </span>

                <span className="rounded-full border border-white/20 bg-white/12 px-3 py-1.5 text-[9px] font-semibold text-white backdrop-blur-md">
                  {selectedEvent.status}
                </span>
              </div>

              <div>
                <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#e5c58f]">
                  <CalendarDays size={13} />
                  {selectedEvent.date}
                </p>

                <h2
                  className="mt-3 max-w-3xl text-[clamp(2.2rem,4vw,3.9rem)] leading-[0.96] text-white"
                  style={{
                    fontFamily:
                      'var(--font-display)',
                  }}
                >
                  {selectedEvent.title}
                </h2>

                <p className="mt-4 flex items-center gap-2 text-sm text-white/72">
                  <MapPin size={15} />
                  {selectedEvent.venue}
                </p>

                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    to={`/app/eventos/${selectedEvent.id}`}
                    className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold"
                    style={{
                      color: '#681126',
                      textDecoration: 'none',
                    }}
                  >
                    {isEnglish ? 'Open card' : 'Abrir ficha'}
                    <ArrowRight size={15} />
                  </Link>

                  <button
                    type="button"
                    className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/22 bg-white/10 px-4 text-sm font-semibold text-white backdrop-blur"
                  >
                    {isEnglish ? 'Edit publication' : 'Editar publicación'}
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
                    {isEnglish ? 'Event control' : 'Control del evento'}
                  </h3>
                </div>

                <StatusBadge label={selectedEvent.status} />
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-[1rem] bg-[var(--color-panel-strong)] p-4">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
                    {isEnglish ? 'Tickets' : 'Boletos'}
                  </p>

                  <p className="mt-2 text-xl font-bold text-[var(--color-ink)]">
                    {selectedEvent.sold}
                  </p>

                  <p className="mt-1 text-[10px] text-[var(--color-muted)]">
                    {isEnglish ? 'of' : 'de'} {selectedEvent.capacity}
                  </p>
                </div>

                <div className="rounded-[1rem] bg-[var(--color-panel-strong)] p-4">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
                    {isEnglish ? 'Occupancy' : 'Ocupación'}
                  </p>

                  <p className="mt-2 text-xl font-bold text-[var(--color-ink)]">
                    {selectedOccupancy}%
                  </p>

                  <p className="mt-1 text-[10px] text-[var(--color-muted)]">
                    {isEnglish ? 'Published capacity' : 'Cupo publicado'}
                  </p>
                </div>

                <div className="col-span-2 rounded-[1rem] bg-[var(--color-panel-strong)] p-4">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
                    {isEnglish ? 'Revenue' : 'Ingresos'}
                  </p>

                  <p className="mt-2 text-2xl font-bold text-[var(--color-burgundy)]">
                    {selectedEvent.revenue}
                  </p>
                </div>
              </div>

              <div className="mt-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold text-[var(--color-ink)]">
                    {isEnglish ? 'Capacity progress' : 'Avance de aforo'}
                  </p>

                  <span className="text-xs font-bold text-[var(--color-burgundy)]">
                    {selectedOccupancy}%
                  </span>
                </div>

                <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-[var(--color-soft)]">
                  <div
                    className="h-full rounded-full bg-[linear-gradient(90deg,var(--color-gold),var(--color-burgundy))]"
                    style={{
                      width: `${selectedOccupancy}%`,
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
                {isEnglish
                  ? selectedOccupancy >= 85
                    ? 'Demand is near the limit. It is worth protecting the experience before continuing to push sales.'
                    : selectedOccupancy >= 60
                      ? 'The pace is healthy. A targeted campaign can close capacity without eroding price.'
                      : 'Sales are below expected pace. It is worth reviewing creative, segmentation and value proposition.'
                  : selectedOccupancy >= 85
                    ? 'La demanda está cerca del límite. Conviene proteger la experiencia antes de seguir impulsando ventas.'
                    : selectedOccupancy >= 60
                      ? 'El ritmo es saludable. Una campaña puntual puede cerrar el aforo sin erosionar precio.'
                      : 'La venta está por debajo del ritmo esperado. Conviene revisar creatividad, segmentación y propuesta de valor.'}
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
                {isEnglish ? 'Connected agenda' : 'Agenda conectada'}
              </p>

              <h3
                className="mt-2 text-[1.65rem] text-[var(--color-ink)]"
                style={{
                  fontFamily:
                    'var(--font-display)',
                }}
              >
                {isEnglish ? 'Published events' : 'Eventos publicados'}
              </h3>
            </div>

            <span className="text-xs text-[var(--color-muted)]">
              {isEnglish ? 'Select to review' : 'Selecciona para revisar'}
            </span>
          </div>

          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            {filteredEvents.map((event) => {
              const occupancy = getOccupancy(event)
              const isSelected = selectedEvent?.id === event.id

              return (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => setSelectedEventId(event.id)}
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
                  <div className="grid min-h-[175px] grid-cols-[145px_minmax(0,1fr)]">
                    <div className="relative overflow-hidden bg-[#eadfce]">
                      <EventArtwork
                        event={event}
                        className="absolute inset-0 h-full w-full"
                      />

                      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(30,8,14,0.02),rgba(30,8,14,0.22))]" />
                    </div>

                    <div className="flex min-w-0 flex-col p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.11em] text-[var(--color-gold)]">
                            <CalendarDays size={11} />
                            {event.date}
                          </p>

                          <h4
                            className="mt-2 line-clamp-2 text-[1.22rem] leading-[1.03] text-[var(--color-ink)]"
                            style={{
                              fontFamily:
                                'var(--font-display)',
                            }}
                          >
                            {event.title}
                          </h4>
                        </div>
                      </div>

                      <p className="mt-3 flex min-w-0 items-center gap-1.5 truncate text-[11px] text-[var(--color-muted)]">
                        <MapPin size={12} className="shrink-0" />
                        <span className="truncate">
                          {event.venue}
                        </span>
                      </p>

                      <div className="mt-auto pt-4">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-[10px] text-[var(--color-muted)]">
                            {event.sold} / {event.capacity} {isEnglish ? 'tickets' : 'boletos'}
                          </span>

                          <span className="text-xs font-bold text-[var(--color-burgundy)]">
                            {occupancy}%
                          </span>
                        </div>

                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--color-soft)]">
                          <div
                            className="h-full rounded-full bg-[linear-gradient(90deg,var(--color-gold),var(--color-burgundy))]"
                            style={{ width: `${occupancy}%` }}
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
                  {isEnglish ? 'Agenda health' : 'Salud de la agenda'}
                </p>

                <p className="mt-1 text-[10px] text-[var(--color-muted)]">
                  {isEnglish ? 'Consolidated app channel view' : 'Vista consolidada del canal app'}
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
                  value: healthyDemand,
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
                  {isEnglish ? 'Buyer origin' : 'Origen de compradores'}
                </p>

                <p className="mt-1 text-[10px] text-[var(--color-muted)]">
                  {isEnglish ? 'Ticketing attribution' : 'Atribución de boletaje'}
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-5">
              {[
                [isEnglish ? 'Organic app' : 'App orgánica', 44],
                ['Instagram', 27],
                ['Google', 16],
                [isEnglish ? 'Referrals' : 'Referidos', 13],
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
                {isEnglish ? 'One event, two experiences' : 'Un evento, dos experiencias'}
              </p>

              <p className="mt-2 max-w-4xl text-xs leading-6 text-[var(--color-muted)]">
                {isEnglish
                  ? 'Guests discover and purchase from the app. The team manages the same publication here — capacity, ticketing, revenue and performance. Not two separate catalogs.'
                  : 'El cliente descubre y compra desde la app. El equipo administra aquí la misma publicación, su aforo, boletaje, ingresos y desempeño. No son dos catálogos separados.'}
              </p>
            </div>
          </div>

          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[var(--color-line)] bg-[var(--color-panel-strong)] px-4 py-2 text-[10px] font-semibold text-[var(--color-burgundy)]">
            <Sparkles size={13} />
            {isEnglish ? 'Single data source' : 'Misma fuente de datos'}
          </span>
        </div>
      </section>
    </div>
  )
}
