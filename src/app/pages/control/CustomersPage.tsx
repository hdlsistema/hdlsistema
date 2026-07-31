import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BadgeDollarSign,
  BarChart3,
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Download,
  Filter,
  Mail,
  MapPin,
  MessageSquareText,
  Phone,
  Search,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  Users,
  WalletCards,
  Wine,
  type LucideIcon,
} from 'lucide-react'
import { CrystalSelect } from '../../components/shared/CrystalSelect'
import { SectionTitle } from '../../components/shared/SectionTitle'
import { customers } from '../../data/customers'
import { useAppPreferences } from '../../context/AppPreferencesContext'

type CustomerItem = (typeof customers)[number]

type CustomerValueBand = 'VIP' | 'Alto valor' | 'Recurrente' | 'En desarrollo'

function normalizeText(value: string | number | undefined) {
  return String(value ?? '')
    .toLocaleLowerCase('es-MX')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function moneyToNumber(value: string | number | undefined) {
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

function formatNumber(value: number) {
  return new Intl.NumberFormat('es-MX').format(value)
}

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase()
}

function getValueBand(customer: CustomerItem): CustomerValueBand {
  const totalSpent = moneyToNumber(customer.totalSpent)
  const reservations = Number(customer.reservations) || 0
  const eventsVisited = Number(customer.eventsVisited) || 0
  const wineClub = normalizeText(customer.wineClub)

  if (
    totalSpent >= 25000 ||
    wineClub.includes('activo') ||
    wineClub.includes('si')
  ) {
    return 'VIP'
  }

  if (totalSpent >= 12000 || reservations + eventsVisited >= 7) {
    return 'Alto valor'
  }

  if (reservations + eventsVisited >= 3) {
    return 'Recurrente'
  }

  return 'En desarrollo'
}

function getBandStyles(band: CustomerValueBand) {
  const styles: Record<CustomerValueBand, string> = {
    VIP: 'bg-[#efe3cf] text-[#805821]',
    'Alto valor': 'bg-[#eee4e8] text-[#7a2a42]',
    Recurrente: 'bg-[#e8f0e7] text-[#5f7d63]',
    'En desarrollo': 'bg-[#f3ede6] text-[#7d6d61]',
  }

  return styles[band]
}

function getCustomerScore(customer: CustomerItem) {
  const totalSpent = moneyToNumber(customer.totalSpent)
  const reservations = Number(customer.reservations) || 0
  const events = Number(customer.eventsVisited) || 0
  const points = Number(customer.points) || 0
  const wineClub = normalizeText(customer.wineClub)

  const score =
    Math.min(totalSpent / 400, 45) +
    Math.min(reservations * 4, 24) +
    Math.min(events * 3, 15) +
    Math.min(points / 250, 8) +
    (wineClub.includes('activo') || wineClub.includes('si') ? 8 : 0)

  return Math.max(12, Math.min(Math.round(score), 100))
}

function downloadCustomersCsv(items: CustomerItem[]) {
  const headers = [
    'ID',
    'Nombre',
    'Segmento',
    'Ciudad',
    'Teléfono',
    'Correo',
    'Registro',
    'Última compra',
    'Reservaciones',
    'Eventos',
    'Total gastado',
    'Ticket promedio',
    'Frecuencia',
    'Preferencia',
    'Vino favorito',
    'Experiencia favorita',
    'Canal de origen',
    'Nivel',
    'Puntos',
    'Cupones',
    'Wine Club',
    'Última visita',
    'Oportunidad',
  ]

  const rows = items.map((item) => [
    item.id,
    item.name,
    item.segment,
    item.city,
    item.phone,
    item.email,
    item.registrationDate,
    item.lastPurchase,
    item.reservations,
    item.eventsVisited,
    item.totalSpent,
    item.averageTicket,
    item.frequency,
    item.preference,
    item.favoriteWine,
    item.favoriteExperience,
    item.originChannel,
    item.loyaltyLevel,
    item.points,
    item.coupons,
    item.wineClub,
    item.lastVisit,
    item.opportunity,
  ])

  const csv = [headers, ...rows]
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
  link.download = 'clientes-hacienda-de-letras.csv'
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
  icon: typeof Users
  emphasized?: boolean
}) {
  return (
    <article
      className={`relative min-w-0 overflow-hidden rounded-[1.15rem] border p-5 shadow-[var(--shadow-card)] ${
        emphasized
          ? 'border-[rgba(104,17,38,0.18)] bg-[linear-gradient(145deg,#681126,#3b0816)]'
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

function ProgressBar({
  value,
  label,
  meta,
}: {
  value: number
  label: string
  meta: string
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-[var(--color-ink)]">
            {label}
          </p>
          <p className="mt-1 truncate text-[10px] text-[var(--color-muted)]">
            {meta}
          </p>
        </div>

        <span className="shrink-0 text-xs font-bold text-[var(--color-burgundy)]">
          {value}%
        </span>
      </div>

      <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--color-soft)]">
        <div
          className="h-full rounded-full bg-[linear-gradient(90deg,var(--color-gold),var(--color-burgundy))]"
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
    </div>
  )
}

export function CustomersPage() {
  const { isEnglish } = useAppPreferences()
  const [selectedCustomerId, setSelectedCustomerId] = useState(
    customers[0]?.id ?? '',
  )
  const [searchTerm, setSearchTerm] = useState('')
  const [segmentFilter, setSegmentFilter] = useState('Todos')
  const [cityFilter, setCityFilter] = useState('Todas')
  const [valueFilter, setValueFilter] = useState('Todos')
  const [channelFilter, setChannelFilter] = useState('Todos')

  const segments = useMemo(
    () => [
      'Todos',
      ...Array.from(
        new Set(customers.map((customer) => customer.segment)),
      ),
    ],
    [],
  )

  const cities = useMemo(
    () => [
      'Todas',
      ...Array.from(new Set(customers.map((customer) => customer.city))),
    ],
    [],
  )

  const channels = useMemo(
    () => [
      'Todos',
      ...Array.from(
        new Set(customers.map((customer) => customer.originChannel)),
      ),
    ],
    [],
  )

  const filteredCustomers = useMemo(() => {
    const query = normalizeText(searchTerm)

    return customers.filter((customer) => {
      const matchesSearch =
        query.length === 0 ||
        [
          customer.name,
          customer.email,
          customer.phone,
          customer.city,
          customer.segment,
          customer.favoriteWine,
          customer.favoriteExperience,
        ].some((value) => normalizeText(value).includes(query))

      const matchesSegment =
        segmentFilter === 'Todos' ||
        customer.segment === segmentFilter

      const matchesCity =
        cityFilter === 'Todas' || customer.city === cityFilter

      const matchesValue =
        valueFilter === 'Todos' ||
        getValueBand(customer) === valueFilter

      const matchesChannel =
        channelFilter === 'Todos' ||
        customer.originChannel === channelFilter

      return (
        matchesSearch &&
        matchesSegment &&
        matchesCity &&
        matchesValue &&
        matchesChannel
      )
    })
  }, [
    searchTerm,
    segmentFilter,
    cityFilter,
    valueFilter,
    channelFilter,
  ])

  const selectedCustomer =
    filteredCustomers.find(
      (customer) => customer.id === selectedCustomerId,
    ) ??
    filteredCustomers[0] ??
    customers[0]

  const totals = useMemo(() => {
    const totalSpent = customers.reduce(
      (sum, customer) => sum + moneyToNumber(customer.totalSpent),
      0,
    )

    const averageTicket =
      customers.length > 0
        ? Math.round(
            customers.reduce(
              (sum, customer) =>
                sum + moneyToNumber(customer.averageTicket),
              0,
            ) / customers.length,
          )
        : 0

    const recurring = customers.filter(
      (customer) =>
        Number(customer.reservations) +
          Number(customer.eventsVisited) >=
        3,
    ).length

    const wineClub = customers.filter((customer) => {
      const value = normalizeText(customer.wineClub)
      return value.includes('activo') || value.includes('si')
    }).length

    return {
      totalSpent,
      averageTicket,
      recurring,
      wineClub,
    }
  }, [])

  const segmentSummary = useMemo(() => {
    const groups: Record<CustomerValueBand, number> = {
      VIP: 0,
      'Alto valor': 0,
      Recurrente: 0,
      'En desarrollo': 0,
    }

    customers.forEach((customer) => {
      groups[getValueBand(customer)] += 1
    })

    return groups
  }, [])

  const topOpportunities = useMemo(
    () =>
      [...customers]
        .sort(
          (a, b) =>
            getCustomerScore(b) - getCustomerScore(a),
        )
        .slice(0, 4),
    [],
  )

  const selectedScore = selectedCustomer
    ? getCustomerScore(selectedCustomer)
    : 0

  const selectedBand = selectedCustomer
    ? getValueBand(selectedCustomer)
    : 'En desarrollo'

  const clearFilters = () => {
    setSearchTerm('')
    setSegmentFilter('Todos')
    setCityFilter('Todas')
    setValueFilter('Todos')
    setChannelFilter('Todos')
  }

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <SectionTitle
          eyebrow={isEnglish ? 'App control center' : 'Centro de control de la app'}
          title={isEnglish ? 'Customers' : 'Clientes'}
          subtitle={isEnglish
            ? 'Commercial base, loyalty and opportunities built from real behavior inside the app.'
            : 'Base comercial, fidelización y oportunidades construidas con el comportamiento real dentro de la app.'}
        />

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => downloadCustomersCsv(filteredCustomers)}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--color-line)] bg-[var(--color-panel)] px-4 text-sm font-semibold text-[var(--color-ink)] shadow-sm transition hover:-translate-y-0.5"
          >
            <Download size={16} />
            {isEnglish ? 'Export customers' : 'Exportar clientes'}
          </button>

          <Link
            to="/control/futuro/campanas"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--color-burgundy)] px-5 text-sm font-semibold shadow-[0_12px_25px_rgba(79,15,31,0.18)] transition hover:-translate-y-0.5"
            style={{
              color: '#ffffff',
              textDecoration: 'none',
            }}
          >
            <MegaphoneIcon />
            {isEnglish ? 'Create campaign' : 'Crear campaña'}
          </Link>
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label={isEnglish ? 'Registered customers' : 'Clientes registrados'}
          value={formatNumber(customers.length)}
          note={isEnglish ? 'Active profiles in digital channel' : 'Perfiles activos en el canal digital'}
          icon={Users}
        />

        <MetricCard
          label={isEnglish ? 'Recurring customers' : 'Clientes recurrentes'}
          value={formatNumber(totals.recurring)}
          note={isEnglish ? 'Three or more interactions' : 'Tres interacciones o más'}
          icon={TrendingUp}
        />

        <MetricCard
          label={isEnglish ? 'Generated value' : 'Valor generado'}
          value={formatCurrency(totals.totalSpent)}
          note={isEnglish ? 'Accumulated purchase & reservation' : 'Compra y reservación acumulada'}
          icon={WalletCards}
          emphasized
        />

        <MetricCard
          label={isEnglish ? 'Average ticket' : 'Ticket promedio'}
          value={formatCurrency(totals.averageTicket)}
          note={`${totals.wineClub} ${isEnglish ? 'Wine Club members' : 'miembros Wine Club'}`}
          icon={BadgeDollarSign}
        />
      </section>

      <section className="rounded-[1.2rem] border border-[var(--color-line)] bg-[var(--color-panel)] p-4 shadow-[var(--shadow-card)]">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Filter
              size={16}
              className="text-[var(--color-burgundy)]"
            />

            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-strong)]">
              {isEnglish ? 'Customer base' : 'Base de clientes'}
            </p>

            <span className="rounded-full bg-[var(--color-soft)] px-3 py-1.5 text-[10px] font-semibold text-[var(--color-muted)]">
              {filteredCustomers.length} {isEnglish ? 'results' : 'resultados'}
            </span>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(220px,1.15fr)_repeat(4,minmax(0,0.72fr))_minmax(104px,0.38fr)]">
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
                placeholder={isEnglish ? 'Search customer, email or preference...' : 'Buscar cliente, correo o preferencia...'}
                className="min-w-0 flex-1 bg-transparent text-sm text-[var(--color-ink)] outline-none placeholder:text-[var(--color-muted)]"
              />
            </label>

            <CrystalSelect
              value={segmentFilter}
              onChange={setSegmentFilter}
              options={segments.map((segment) => ({
                value: segment,
                label: segment,
              }))}
              className="min-w-0"
              menuClassName="xl:min-w-[250px]"
            />

            <CrystalSelect
              value={cityFilter}
              onChange={setCityFilter}
              options={cities.map((city) => ({
                value: city,
                label: city,
              }))}
              className="min-w-0"
              menuClassName="xl:min-w-[220px]"
            />

            <CrystalSelect
              value={valueFilter}
              onChange={setValueFilter}
              options={[
                'Todos',
                'VIP',
                'Alto valor',
                'Recurrente',
                'En desarrollo',
              ].map((value) => ({
                value,
                label: value,
              }))}
              className="min-w-0"
              menuClassName="xl:min-w-[220px]"
            />

            <CrystalSelect
              value={channelFilter}
              onChange={setChannelFilter}
              options={channels.map((channel) => ({
                value: channel,
                label: channel,
              }))}
              className="min-w-0"
              menuClassName="xl:min-w-[260px]"
            />

            <button
              type="button"
              onClick={clearFilters}
              className="min-h-11 w-full rounded-xl border border-[var(--color-line)] bg-transparent px-4 text-sm font-semibold text-[var(--color-burgundy)]"
            >
              {isEnglish ? 'Clear' : 'Limpiar'}
            </button>
          </div>
        </div>
      </section>

      <section className="grid min-w-0 gap-5 2xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.65fr)]">
        <div className="overflow-hidden rounded-[1.25rem] border border-[var(--color-line)] bg-[var(--color-panel)] shadow-[var(--shadow-card)]">
          <div className="flex flex-col gap-3 border-b border-[var(--color-line)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3
                className="text-[1.45rem] text-[var(--color-ink)]"
                style={{
                  fontFamily: 'var(--font-display)',
                }}
              >
                {isEnglish ? 'Commercial relationship' : 'Relación comercial'}
              </h3>

              <p className="mt-1 text-[11px] text-[var(--color-muted)]">
                {isEnglish ? 'Select a customer to open their profile.' : 'Selecciona un cliente para abrir su expediente.'}
              </p>
            </div>

            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
              {isEnglish ? 'Updated today' : 'Actualizado hoy'}
            </span>
          </div>

          <div className="hidden grid-cols-[minmax(220px,1.2fr)_120px_110px_110px_120px_34px] gap-4 bg-[var(--color-soft)] px-5 py-3 text-[9px] font-semibold uppercase tracking-[0.11em] text-[var(--color-muted)] xl:grid">
            <span>{isEnglish ? 'Customer' : 'Cliente'}</span>
            <span>{isEnglish ? 'Value' : 'Valor'}</span>
            <span>{isEnglish ? 'Total' : 'Total'}</span>
            <span>{isEnglish ? 'Frequency' : 'Frecuencia'}</span>
            <span>{isEnglish ? 'Last visit' : 'Última visita'}</span>
            <span />
          </div>

          <div className="divide-y divide-[var(--color-line)]">
            {filteredCustomers.map((customer) => {
              const band = getValueBand(customer)
              const selected = selectedCustomer?.id === customer.id

              return (
                <button
                  key={customer.id}
                  type="button"
                  onClick={() => setSelectedCustomerId(customer.id)}
                  className="grid w-full gap-3 px-5 py-4 text-left transition xl:grid-cols-[minmax(220px,1.2fr)_120px_110px_110px_120px_34px] xl:items-center"
                  style={{
                    backgroundColor: selected
                      ? 'rgba(104,17,38,0.045)'
                      : 'transparent',
                    outline: 'none',
                  }}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(145deg,#eadbc8,#b99060)] text-sm font-bold text-[#5f2e20]">
                      {getInitials(customer.name)}
                    </span>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[var(--color-ink)]">
                        {customer.name}
                      </p>

                      <p className="mt-1 flex items-center gap-1.5 truncate text-[10px] text-[var(--color-muted)]">
                        <MapPin size={11} className="shrink-0" />
                        <span className="truncate">
                          {customer.city} · {customer.segment}
                        </span>
                      </p>
                    </div>
                  </div>

                  <span
                    className={`w-fit rounded-full px-3 py-1.5 text-[9px] font-semibold ${getBandStyles(
                      band,
                    )}`}
                  >
                    {band}
                  </span>

                  <p className="text-sm font-bold text-[var(--color-ink)]">
                    {customer.totalSpent}
                  </p>

                  <p className="text-xs text-[var(--color-muted-strong)]">
                    {customer.frequency}
                  </p>

                  <p className="text-xs text-[var(--color-muted)]">
                    {customer.lastVisit}
                  </p>

                  <ChevronRight
                    size={17}
                    className="hidden text-[var(--color-muted)] xl:block"
                  />
                </button>
              )
            })}
          </div>

          {filteredCustomers.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <Search
                size={24}
                className="mx-auto text-[var(--color-muted)]"
              />
              <p className="mt-4 text-sm font-semibold text-[var(--color-ink)]">
                {isEnglish ? 'No customers match those filters.' : 'No encontramos clientes con esos filtros.'}
              </p>
              <button
                type="button"
                onClick={clearFilters}
                className="mt-3 text-xs font-semibold text-[var(--color-burgundy)]"
              >
                {isEnglish ? 'Reset search' : 'Restablecer búsqueda'}
              </button>
            </div>
          ) : null}
        </div>

        {selectedCustomer ? (
          <aside className="space-y-4">
            <article className="rounded-[1.3rem] border border-[var(--color-line)] bg-[var(--color-panel)] p-5 shadow-[var(--shadow-card)]">
              <div className="flex items-start gap-4">
                <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(145deg,#eadbc8,#b99060)] text-lg font-bold text-[#5f2e20]">
                  {getInitials(selectedCustomer.name)}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3
                      className="truncate text-[1.55rem] leading-tight text-[var(--color-ink)]"
                      style={{
                        fontFamily:
                          'var(--font-display)',
                      }}
                    >
                      {selectedCustomer.name}
                    </h3>

                    <span
                      className={`rounded-full px-3 py-1.5 text-[9px] font-semibold ${getBandStyles(
                        selectedBand,
                      )}`}
                    >
                      {selectedBand}
                    </span>
                  </div>

                  <p className="mt-1 text-xs text-[var(--color-muted)]">
                    {selectedCustomer.segment} · {selectedCustomer.city}
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-[1rem] bg-[var(--color-panel-strong)] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
                      Score comercial
                    </p>
                    <p className="mt-1 text-lg font-bold text-[var(--color-ink)]">
                      {selectedScore}/100
                    </p>
                  </div>

                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[var(--color-burgundy)] shadow-sm">
                    <BarChart3 size={18} />
                  </span>
                </div>

                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
                  <div
                    className="h-full rounded-full bg-[linear-gradient(90deg,var(--color-gold),var(--color-burgundy))]"
                    style={{ width: `${selectedScore}%` }}
                  />
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-[1rem] border border-[var(--color-line)] bg-[var(--color-panel-strong)] p-4">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.11em] text-[var(--color-muted)]">
                    {isEnglish ? 'Total spent' : 'Total gastado'}
                  </p>
                  <p className="mt-2 text-lg font-bold text-[var(--color-ink)]">
                    {selectedCustomer.totalSpent}
                  </p>
                </div>

                <div className="rounded-[1rem] border border-[var(--color-line)] bg-[var(--color-panel-strong)] p-4">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.11em] text-[var(--color-muted)]">
                    {isEnglish ? 'Average ticket' : 'Ticket promedio'}
                  </p>
                  <p className="mt-2 text-lg font-bold text-[var(--color-ink)]">
                    {selectedCustomer.averageTicket}
                  </p>
                </div>

                <div className="rounded-[1rem] border border-[var(--color-line)] bg-[var(--color-panel-strong)] p-4">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.11em] text-[var(--color-muted)]">
                    {isEnglish ? 'Reservations' : 'Reservaciones'}
                  </p>
                  <p className="mt-2 text-lg font-bold text-[var(--color-ink)]">
                    {selectedCustomer.reservations}
                  </p>
                </div>

                <div className="rounded-[1rem] border border-[var(--color-line)] bg-[var(--color-panel-strong)] p-4">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.11em] text-[var(--color-muted)]">
                    {isEnglish ? 'Points' : 'Puntos'}
                  </p>
                  <p className="mt-2 text-lg font-bold text-[var(--color-ink)]">
                    {formatNumber(Number(selectedCustomer.points) || 0)}
                  </p>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <a
                  href={`mailto:${selectedCustomer.email}`}
                  className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--color-line)] bg-[var(--color-panel-strong)] px-3 text-xs font-semibold text-[var(--color-ink)]"
                  style={{ textDecoration: 'none' }}
                >
                  <Mail size={14} />
                  {isEnglish ? 'Email' : 'Correo'}
                </a>

                <a
                  href={`tel:${selectedCustomer.phone}`}
                  className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--color-line)] bg-[var(--color-panel-strong)] px-3 text-xs font-semibold text-[var(--color-ink)]"
                  style={{ textDecoration: 'none' }}
                >
                  <Phone size={14} />
                  {isEnglish ? 'Call' : 'Llamar'}
                </a>

                <Link
                  to="/control/futuro/campanas"
                  className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[var(--color-burgundy)] px-3 text-xs font-semibold"
                  style={{
                    color: '#ffffff',
                    textDecoration: 'none',
                  }}
                >
                  <Bell size={14} color="#ffffff" />
                  {isEnglish ? 'Activate' : 'Activar'}
                </Link>
              </div>
            </article>

            <article className="rounded-[1.3rem] border border-[var(--color-line)] bg-[var(--color-panel)] p-5 shadow-[var(--shadow-card)]">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-soft)] text-[var(--color-burgundy)]">
                  <Wine size={18} />
                </span>

                <div>
                  <p className="text-sm font-semibold text-[var(--color-ink)]">
                    {isEnglish ? 'Preferences' : 'Preferencias'}
                  </p>
                  <p className="mt-1 text-[10px] text-[var(--color-muted)]">
                    {isEnglish ? 'What resonates most with this customer' : 'Lo que más conecta con este cliente'}
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {[
                  {
                    label: isEnglish ? 'Favorite wine' : 'Vino favorito',
                    value: selectedCustomer.favoriteWine,
                    icon: Wine,
                  },
                  {
                    label: isEnglish ? 'Favorite experience' : 'Experiencia favorita',
                    value: selectedCustomer.favoriteExperience,
                    icon: CalendarDays,
                  },
                  {
                    label: isEnglish ? 'Preference' : 'Preferencia',
                    value: selectedCustomer.preference,
                    icon: Star,
                  },
                  {
                    label: isEnglish ? 'Origin channel' : 'Canal de origen',
                    value: selectedCustomer.originChannel,
                    icon: Target,
                  },
                ].map(({ label, value, icon: ItemIcon }: {
                  label: string
                  value: string
                  icon: LucideIcon
                }) => {

                  return (
                    <div
                      key={label}
                      className="flex items-center gap-3 rounded-xl bg-[var(--color-panel-strong)] px-4 py-3"
                    >
                      <ItemIcon
                        size={15}
                        className="shrink-0 text-[var(--color-burgundy)]"
                      />
                      <div className="min-w-0">
                        <p className="text-[9px] uppercase tracking-[0.1em] text-[var(--color-muted)]">
                          {label}
                        </p>
                        <p className="mt-1 text-xs font-semibold leading-5 text-[var(--color-ink)]">
                          {value}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </article>

            <article className="rounded-[1.3rem] border border-[rgba(180,138,85,0.24)] bg-[#fbf6ee] p-5">
              <div className="flex items-start gap-3">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[var(--color-burgundy)] shadow-sm">
                  <Sparkles size={18} />
                </span>

                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-gold)]">
                    {isEnglish ? 'Suggested opportunity' : 'Oportunidad sugerida'}
                  </p>

                  <p className="mt-3 text-sm font-semibold leading-5 text-[var(--color-ink)]">
                    {selectedCustomer.opportunity}
                  </p>

                  <p className="mt-2 text-[11px] leading-5 text-[var(--color-muted-strong)]">
                    {isEnglish ? 'Last visit:' : 'Última visita:'} {selectedCustomer.lastVisit}. {isEnglish ? 'Current level:' : 'Nivel actual:'}
                    {' '}
                    {selectedCustomer.loyaltyLevel}.
                  </p>

                  <Link
                    to="/control/futuro/campanas"
                    className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-[var(--color-burgundy)]"
                    style={{ textDecoration: 'none' }}
                  >
                    {isEnglish ? 'Create personalized campaign' : 'Crear campaña personalizada'}
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            </article>
          </aside>
        ) : null}
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.75fr_1.25fr]">
        <article className="rounded-[1.25rem] border border-[var(--color-line)] bg-[var(--color-panel)] p-5 shadow-[var(--shadow-card)]">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-soft)] text-[var(--color-burgundy)]">
              <Users size={18} />
            </span>

            <div>
              <p className="text-sm font-semibold text-[var(--color-ink)]">
                {isEnglish ? 'Value segmentation' : 'Segmentación de valor'}
              </p>
              <p className="mt-1 text-[10px] text-[var(--color-muted)]">
                {isEnglish ? 'Commercial base distribution' : 'Distribución de la base comercial'}
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-5">
            {(
              [
                ['VIP', segmentSummary.VIP],
                ['Alto valor', segmentSummary['Alto valor']],
                ['Recurrente', segmentSummary.Recurrente],
                ['En desarrollo', segmentSummary['En desarrollo']],
              ] as Array<[CustomerValueBand, number]>
            ).map(([label, value]) => {
              const percent =
                customers.length > 0
                  ? Math.round((value / customers.length) * 100)
                  : 0

              return (
                <ProgressBar
                  key={label}
                  label={label}
                  value={percent}
                  meta={`${formatNumber(value)} ${isEnglish ? 'customers' : 'clientes'}`}
                />
              )
            })}
          </div>
        </article>

        <article className="rounded-[1.25rem] border border-[var(--color-line)] bg-[var(--color-panel)] p-5 shadow-[var(--shadow-card)]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-soft)] text-[var(--color-burgundy)]">
                <Target size={18} />
              </span>

              <div>
                <p className="text-sm font-semibold text-[var(--color-ink)]">
                  {isEnglish ? 'Priority opportunities' : 'Oportunidades prioritarias'}
                </p>
                <p className="mt-1 text-[10px] text-[var(--color-muted)]">
                  {isEnglish ? 'Customers with highest response probability' : 'Clientes con mayor probabilidad de respuesta'}
                </p>
              </div>
            </div>

            <Link
              to="/control/futuro/campanas"
              className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--color-burgundy)]"
              style={{ textDecoration: 'none' }}
            >
              {isEnglish ? 'Create segment' : 'Crear segmento'}
              <ArrowRight size={14} />
            </Link>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {topOpportunities.map((customer) => (
              <button
                key={customer.id}
                type="button"
                onClick={() => setSelectedCustomerId(customer.id)}
                className="rounded-[1rem] border border-[var(--color-line)] bg-[var(--color-panel-strong)] p-4 text-left transition hover:-translate-y-0.5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[var(--color-ink)]">
                      {customer.name}
                    </p>
                    <p className="mt-1 truncate text-[10px] text-[var(--color-muted)]">
                      {customer.opportunity}
                    </p>
                  </div>

                  <span className="rounded-full bg-white px-3 py-1.5 text-[9px] font-bold text-[var(--color-burgundy)] shadow-sm">
                    {getCustomerScore(customer)}/100
                  </span>
                </div>

                <div className="mt-4 flex items-center justify-between gap-3">
                  <span className="text-[10px] text-[var(--color-muted)]">
                    {customer.originChannel}
                  </span>
                  <span className="text-xs font-bold text-[var(--color-ink)]">
                    {customer.totalSpent}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </article>
      </section>

      <section className="rounded-[1.15rem] border border-[var(--color-line)] bg-[var(--color-panel)] p-5 shadow-[var(--shadow-card)]">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--color-soft)] text-[var(--color-burgundy)]">
              <MessageSquareText size={19} />
            </span>

            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--color-ink)]">
                {isEnglish
                  ? 'The customer base feeds campaigns and loyalty'
                  : 'La base de clientes alimenta campañas y fidelización'}
              </p>

              <p className="mt-2 max-w-4xl text-xs leading-6 text-[var(--color-muted)]">
                {isEnglish
                  ? 'Every purchase, reservation, event and preference recorded in the app improves segmentation. The Campaigns Center uses this same data to send relevant promotions, not mass blind messages.'
                  : 'Cada compra, reservación, evento y preferencia registrada en la app mejora la segmentación. El Centro de Campañas usa esta misma información para enviar promociones relevantes, no mensajes masivos a ciegas.'}
              </p>
            </div>
          </div>

          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[var(--color-line)] bg-[var(--color-panel-strong)] px-4 py-2 text-[10px] font-semibold text-[var(--color-burgundy)]">
            <CheckCircle2 size={13} />
            {isEnglish ? 'Single data source' : 'Fuente única de datos'}
          </span>
        </div>
      </section>
    </div>
  )
}

function MegaphoneIcon() {
  return <Sparkles size={16} color="#ffffff" />
}
