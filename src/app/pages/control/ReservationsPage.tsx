import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  CreditCard,
  Download,
  Filter,
  Mail,
  MapPin,
  Phone,
  Plus,
  Search,
  Users,
  WalletCards,
  X,
} from 'lucide-react'
import {
  useMemo,
  useState,
  type FormEvent,
} from 'react'
import {
  ReservationTable,
  type ReservationItem,
} from '../../components/control/ReservationTable'
import { CrystalSelect } from '../../components/shared/CrystalSelect'
import { SectionTitle } from '../../components/shared/SectionTitle'
import { StatusBadge } from '../../components/shared/StatusBadge'
import { reservations } from '../../data/reservations'
import { useAppPreferences } from '../../context/AppPreferencesContext'

type NewReservationForm = {
  guest: string
  email: string
  phone: string
  plan: string
  date: string
  people: string
  amount: string
  travelOrigin: string
}

const emptyForm: NewReservationForm = {
  guest: '',
  email: '',
  phone: '',
  plan: 'Cata de vino',
  date: '',
  people: '2',
  amount: '$950.00',
  travelOrigin: 'Aguascalientes',
}

function normalizeText(value: string) {
  return value
    .toLocaleLowerCase('es-MX')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function downloadReservationsCsv(items: ReservationItem[]) {
  const headers = [
    'ID',
    'Cliente',
    'Experiencia',
    'Fecha reserva',
    'Creada',
    'Personas',
    'Monto',
    'Canal',
    'Origen viaje',
    'Pago',
    'Referencia',
    'Pago app',
    'Teléfono',
    'Correo',
    'Estado',
  ]

  const rows = items.map((item) => [
    item.id,
    item.guest,
    item.plan,
    item.date,
    item.bookedAt,
    String(item.people),
    item.amount,
    item.source,
    item.travelOrigin,
    item.paymentMethod,
    item.paymentReference,
    item.appPayment ? 'Sí' : 'No',
    item.phone,
    item.email,
    item.status,
  ])

  const csv = [headers, ...rows]
    .map((row) =>
      row
        .map(
          (cell) =>
            `"${String(cell).replace(/"/g, '""')}"`,
        )
        .join(','),
    )
    .join('\n')

  const blob = new Blob([csv], {
    type: 'text/csv;charset=utf-8;',
  })

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = 'reservaciones-hacienda-de-letras.csv'
  link.click()

  URL.revokeObjectURL(url)
}

export function ReservationsPage() {
  const { isEnglish } = useAppPreferences()
  const [reservationItems, setReservationItems] =
    useState<ReservationItem[]>(() => [...reservations])

  const [selectedReservationId, setSelectedReservationId] =
    useState<string | null>(reservations[0]?.id ?? null)

  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('Todos')
  const [experienceFilter, setExperienceFilter] =
    useState('Todas')
  const [channelFilter, setChannelFilter] = useState('Todos')

  const [isNewReservationOpen, setIsNewReservationOpen] =
    useState(false)

  const [newReservationForm, setNewReservationForm] =
    useState<NewReservationForm>(emptyForm)

  const statuses = useMemo(
    () => [
      'Todos',
      ...Array.from(
        new Set(
          reservationItems.map((item) => item.status),
        ),
      ),
    ],
    [reservationItems],
  )

  const experiences = useMemo(
    () => [
      'Todas',
      ...Array.from(
        new Set(reservationItems.map((item) => item.plan)),
      ),
    ],
    [reservationItems],
  )

  const channels = useMemo(
    () => [
      'Todos',
      ...Array.from(
        new Set(
          reservationItems.map((item) => item.source),
        ),
      ),
    ],
    [reservationItems],
  )

  const filteredReservations = useMemo(() => {
    const normalizedSearch = normalizeText(searchTerm)

    return reservationItems.filter((reservation) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        [
          reservation.guest,
          reservation.email,
          reservation.phone,
          reservation.plan,
          reservation.paymentReference,
          reservation.travelOrigin,
        ].some((value) =>
          normalizeText(String(value)).includes(
            normalizedSearch,
          ),
        )

      const matchesStatus =
        statusFilter === 'Todos' ||
        reservation.status === statusFilter

      const matchesExperience =
        experienceFilter === 'Todas' ||
        reservation.plan === experienceFilter

      const matchesChannel =
        channelFilter === 'Todos' ||
        reservation.source === channelFilter

      return (
        matchesSearch &&
        matchesStatus &&
        matchesExperience &&
        matchesChannel
      )
    })
  }, [
    reservationItems,
    searchTerm,
    statusFilter,
    experienceFilter,
    channelFilter,
  ])

  const selectedReservation = useMemo(
    () =>
      filteredReservations.find(
        (item) => item.id === selectedReservationId,
      ) ??
      filteredReservations[0] ??
      null,
    [filteredReservations, selectedReservationId],
  )

  const confirmedCount = reservationItems.filter((item) =>
    normalizeText(item.status).includes('confirm'),
  ).length

  const pendingCount = reservationItems.filter((item) =>
    normalizeText(item.status).includes('pend'),
  ).length

  const completedCount = reservationItems.filter((item) =>
    normalizeText(item.status).includes('complet'),
  ).length

  const paidInAppCount = reservationItems.filter(
    (item) => item.appPayment,
  ).length

  const resetFilters = () => {
    setSearchTerm('')
    setStatusFilter('Todos')
    setExperienceFilter('Todas')
    setChannelFilter('Todos')
  }

  const handleCreateReservation = (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault()

    const reservationId = `RES-${Date.now()}`

    const newReservation = {
      id: reservationId,
      guest: newReservationForm.guest,
      plan: newReservationForm.plan,
      date:
        newReservationForm.date || 'Fecha por confirmar',
      bookedAt: new Date().toLocaleString('es-MX', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
      people: Number(newReservationForm.people) || 1,
      amount: newReservationForm.amount || '$0.00',
      source: 'Centro de control',
      travelOrigin:
        newReservationForm.travelOrigin ||
        'Aguascalientes',
      paymentMethod: 'Pendiente de pago',
      paymentReference: 'Por generar',
      appPayment: false,
      phone: newReservationForm.phone,
      email: newReservationForm.email,
      status: 'Pendiente',
    } as ReservationItem

    setReservationItems((current) => [
      newReservation,
      ...current,
    ])

    setSelectedReservationId(reservationId)
    setNewReservationForm(emptyForm)
    setIsNewReservationOpen(false)
    resetFilters()
  }

  const metrics = [
    {
      title: isEnglish ? 'Confirmed' : 'Confirmadas',
      value:
        reservationItems.length <= 20
          ? String(confirmedCount)
          : '214',
      note: isEnglish ? 'Current week' : 'Semana actual',
      icon: CheckCircle2,
      trend: '+12.4%',
    },
    {
      title: isEnglish ? 'Pending' : 'Pendientes',
      value:
        reservationItems.length <= 20
          ? String(pendingCount)
          : '68',
      note: isEnglish ? 'To confirm' : 'Por confirmar',
      icon: Clock3,
      trend: isEnglish ? 'Attention' : 'Atención',
    },
    {
      title: isEnglish ? 'Completed' : 'Completadas',
      value:
        reservationItems.length <= 20
          ? String(completedCount)
          : '54',
      note: isEnglish ? 'End of day' : 'Cierre de jornada',
      icon: CalendarDays,
      trend: '+8.1%',
    },
    {
      title: isEnglish ? 'Paid in app' : 'Pagadas en app',
      value:
        reservationItems.length <= 20
          ? String(paidInAppCount)
          : '126',
      note: isEnglish ? 'Cards & wallets' : 'Tarjetas y wallets',
      icon: WalletCards,
      trend: '37%',
    },
    {
      title: isEnglish ? 'Reference validated' : 'Referencia validada',
      value: '98%',
      note: isEnglish ? 'No incidents' : 'Sin incidencias',
      icon: CreditCard,
      trend: isEnglish ? 'Optimal' : 'Óptimo',
    },
  ]

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <SectionTitle
          eyebrow={isEnglish ? 'Operations' : 'Operación'}
          title={isEnglish ? 'Reservations' : 'Reservaciones'}
          subtitle={isEnglish
            ? 'Full control of availability, payments, visitors and operational tracking.'
            : 'Control integral de disponibilidad, pagos, visitantes y seguimiento operativo.'}
        />

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() =>
              downloadReservationsCsv(filteredReservations)
            }
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--color-line)] bg-[var(--color-panel)] px-4 text-sm font-semibold text-[var(--color-ink)] shadow-sm transition hover:-translate-y-0.5"
          >
            <Download size={16} />
            {isEnglish ? 'Export Excel' : 'Exportar Excel'}
          </button>

          <button
            type="button"
            onClick={() => setIsNewReservationOpen(true)}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--color-burgundy)] px-5 text-sm font-semibold shadow-[0_12px_25px_rgba(79,15,31,0.18)] transition hover:-translate-y-0.5"
            style={{ color: '#ffffff' }}
          >
            <Plus size={17} color="#ffffff" />
            {isEnglish ? 'New reservation' : 'Nueva reservación'}
          </button>
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {metrics.map((metric) => {
          const Icon = metric.icon

          return (
            <article
              key={metric.title}
              className="relative min-w-0 overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-panel)] p-5 shadow-[var(--shadow-card)]"
            >
              <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full border border-[rgba(180,138,85,0.15)]" />

              <div className="relative flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-[var(--color-muted)]">
                    {metric.title}
                  </p>

                  <p
                    className="mt-3 text-[2rem] leading-none text-[var(--color-ink)]"
                    style={{
                      fontFamily:
                        'var(--font-display)',
                    }}
                  >
                    {metric.value}
                  </p>
                </div>

                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-soft)] text-[var(--color-burgundy)]">
                  <Icon size={18} />
                </span>
              </div>

              <div className="relative mt-4 flex items-center justify-between gap-3">
                <p className="truncate text-xs text-[var(--color-muted)]">
                  {metric.note}
                </p>

                <span className="shrink-0 text-[10px] font-semibold text-[var(--color-positive)]">
                  {metric.trend}
                </span>
              </div>
            </article>
          )
        })}
      </section>

      <section className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-panel)] p-4 shadow-[var(--shadow-card)]">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Filter
              size={16}
              className="text-[var(--color-burgundy)]"
            />

            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-strong)]">
              {isEnglish ? 'Operational filters' : 'Filtros operativos'}
            </p>

            <span className="ml-auto rounded-full bg-[var(--color-soft)] px-3 py-1 text-[10px] font-semibold text-[var(--color-muted)]">
              {filteredReservations.length} {isEnglish ? 'results' : 'resultados'}
            </span>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(220px,1.5fr)_repeat(3,minmax(150px,0.7fr))_auto]">
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
                placeholder={isEnglish ? 'Search guest, email, reference...' : 'Buscar cliente, correo, referencia...'}
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

            <CrystalSelect
              value={experienceFilter}
              onChange={setExperienceFilter}
              options={experiences.map((experience) => ({
                value: experience,
                label: `${isEnglish ? 'Experience' : 'Experiencia'}: ${experience}`,
              }))}
            />

            <CrystalSelect
              value={channelFilter}
              onChange={setChannelFilter}
              options={channels.map((channel) => ({
                value: channel,
                label: `${isEnglish ? 'Channel' : 'Canal'}: ${channel}`,
              }))}
            />

            <button
              type="button"
              onClick={resetFilters}
              className="min-h-11 rounded-xl border border-[var(--color-line)] bg-transparent px-4 text-sm font-semibold text-[var(--color-burgundy)]"
            >
              {isEnglish ? 'Clear' : 'Limpiar'}
            </button>
          </div>
        </div>
      </section>

      <section className="grid min-w-0 gap-5 2xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.8fr)]">
        <div className="min-w-0">
          <ReservationTable
            items={filteredReservations}
            selectedReservationId={
              selectedReservation?.id ?? null
            }
            onSelect={setSelectedReservationId}
          />
        </div>

        {selectedReservation ? (
          <aside className="min-w-0 2xl:sticky 2xl:top-5 2xl:self-start">
            <article className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-panel)] shadow-[var(--shadow-card)]">
              <div className="relative overflow-hidden bg-[linear-gradient(145deg,var(--color-burgundy-deep),var(--color-burgundy))] p-6 text-white">
                <div className="absolute -right-14 -top-14 h-40 w-40 rounded-full border border-white/10" />

                <div className="relative flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#dbc59d]">
                      {isEnglish ? 'Operational detail' : 'Detalle operativo'}
                    </p>

                    <h3
                      className="mt-3 truncate text-[2rem] leading-none text-white"
                      style={{
                        fontFamily:
                          'var(--font-display)',
                      }}
                    >
                      {selectedReservation.guest}
                    </h3>

                    <p className="mt-3 line-clamp-2 text-sm text-white/72">
                      {selectedReservation.plan}
                    </p>
                  </div>

                  <StatusBadge
                    label={selectedReservation.status}
                  />
                </div>

                <div className="relative mt-6 flex items-center justify-between gap-4 border-t border-white/15 pt-4">
                  <div>
                    <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-white/52">
                      {isEnglish ? 'Amount' : 'Importe'}
                    </p>

                    <p className="mt-1 text-xl font-bold text-white">
                      {selectedReservation.amount}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-white/52">
                      {isEnglish ? 'Reference' : 'Referencia'}
                    </p>

                    <p className="mt-1 text-xs font-semibold text-white">
                      {selectedReservation.paymentReference}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-5 p-5">
                <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-1">
                  <DetailCard
                    icon={CalendarDays}
                    label={isEnglish ? 'Reservation date' : 'Fecha de reservación'}
                    value={selectedReservation.date}
                    note={`${isEnglish ? 'Created' : 'Creada'} ${selectedReservation.bookedAt}`}
                  />

                  <DetailCard
                    icon={Users}
                    label={isEnglish ? 'Visitors' : 'Visitantes'}
                    value={`${selectedReservation.people} ${isEnglish ? 'guests' : 'personas'}`}
                    note={`${isEnglish ? 'Traveling from' : 'Viajan desde'} ${selectedReservation.travelOrigin}`}
                  />

                  <DetailCard
                    icon={CreditCard}
                    label={isEnglish ? 'Payment method' : 'Forma de pago'}
                    value={selectedReservation.paymentMethod}
                    note={
                      selectedReservation.appPayment
                        ? (isEnglish ? 'Payment made via app' : 'Pago realizado desde la app')
                        : (isEnglish ? 'External payment' : 'Pago externo al flujo de la app')
                    }
                  />

                  <DetailCard
                    icon={MapPin}
                    label={isEnglish ? 'Origin channel' : 'Canal de origen'}
                    value={selectedReservation.source}
                    note={selectedReservation.travelOrigin}
                  />
                </div>

                <div className="rounded-[1rem] border border-[var(--color-line)] bg-[var(--color-panel-strong)] p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">
                    {isEnglish ? 'Contact' : 'Contacto'}
                  </p>

                  <a
                    href={`tel:${selectedReservation.phone}`}
                    className="mt-3 flex items-center gap-3 text-sm font-semibold text-[var(--color-ink)]"
                  >
                    <Phone
                      size={15}
                      className="text-[var(--color-burgundy)]"
                    />
                    {selectedReservation.phone}
                  </a>

                  <a
                    href={`mailto:${selectedReservation.email}`}
                    className="mt-3 flex min-w-0 items-center gap-3 text-sm text-[var(--color-muted-strong)]"
                  >
                    <Mail
                      size={15}
                      className="shrink-0 text-[var(--color-burgundy)]"
                    />
                    <span className="truncate">
                      {selectedReservation.email}
                    </span>
                  </a>
                </div>

                <div className="rounded-[1rem] border border-[rgba(137,47,58,0.18)] bg-[#f7eade] p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-burgundy)]">
                    {isEnglish ? 'Next action' : 'Próxima acción'}
                  </p>

                  <p className="mt-2 text-sm leading-6 text-[var(--color-muted-strong)]">
                    {isEnglish
                      ? `Confirm arrival, validate the payment reference and prepare the ${selectedReservation.plan.toLowerCase()} experience for ${selectedReservation.people} attendees.`
                      : `Confirmar llegada, validar la referencia de pago y preparar la experiencia ${selectedReservation.plan.toLowerCase()} para ${selectedReservation.people} asistentes.`}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    className="min-h-11 rounded-xl border border-[var(--color-line)] bg-[var(--color-panel-strong)] px-4 text-xs font-semibold text-[var(--color-burgundy)]"
                  >
                    {isEnglish ? 'Contact' : 'Contactar'}
                  </button>

                  <button
                    type="button"
                    className="min-h-11 rounded-xl bg-[var(--color-burgundy)] px-4 text-xs font-semibold"
                    style={{ color: '#ffffff' }}
                  >
                    {isEnglish ? 'Mark arrival' : 'Marcar llegada'}
                  </button>
                </div>
              </div>
            </article>
          </aside>
        ) : null}
      </section>

      {isNewReservationOpen ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#1d050c]/70 p-4 backdrop-blur-sm">
          <button
            type="button"
            aria-label="Cerrar"
            onClick={() => setIsNewReservationOpen(false)}
            className="absolute inset-0 cursor-default"
          />

          <form
            onSubmit={handleCreateReservation}
            className="relative z-10 max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[1.7rem] border border-[var(--color-line)] bg-[var(--color-panel)] p-6 shadow-[0_35px_90px_rgba(29,5,12,0.38)]"
          >
            <button
              type="button"
              onClick={() =>
                setIsNewReservationOpen(false)
              }
              aria-label="Cerrar"
              className="absolute right-5 top-5 inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--color-line)] bg-white text-[var(--color-burgundy)]"
            >
              <X size={18} />
            </button>

            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-gold)]">
              {isEnglish ? 'Control center' : 'Centro de control'}
            </p>

            <h2
              className="mt-2 text-[2rem] text-[var(--color-burgundy)]"
              style={{
                fontFamily:
                  'var(--font-display)',
              }}
            >
              {isEnglish ? 'New reservation' : 'Nueva reservación'}
            </h2>

            <p className="mt-2 text-sm text-[var(--color-muted)]">
              {isEnglish
                ? 'Enter the main details. The record will appear immediately on the operational panel.'
                : 'Registra la información principal. El seguimiento aparecerá inmediatamente en el panel operativo.'}
            </p>

            <div className="mt-7 grid gap-4 md:grid-cols-2">
              <FormField
                label={isEnglish ? 'Full name' : 'Nombre completo'}
                value={newReservationForm.guest}
                onChange={(value) =>
                  setNewReservationForm((current) => ({
                    ...current,
                    guest: value,
                  }))
                }
                placeholder={isEnglish ? "Guest's name" : 'Nombre del cliente'}
                required
              />

              <FormField
                label={isEnglish ? 'Email address' : 'Correo electrónico'}
                type="email"
                value={newReservationForm.email}
                onChange={(value) =>
                  setNewReservationForm((current) => ({
                    ...current,
                    email: value,
                  }))
                }
                placeholder="guest@email.com"
                required
              />

              <FormField
                label={isEnglish ? 'Phone' : 'Teléfono'}
                type="tel"
                value={newReservationForm.phone}
                onChange={(value) =>
                  setNewReservationForm((current) => ({
                    ...current,
                    phone: value,
                  }))
                }
                placeholder="+52 449..."
                required
              />

              <FormField
                label={isEnglish ? 'City of origin' : 'Ciudad de origen'}
                value={newReservationForm.travelOrigin}
                onChange={(value) =>
                  setNewReservationForm((current) => ({
                    ...current,
                    travelOrigin: value,
                  }))
                }
                placeholder="Aguascalientes"
              />

              <label className="block">
                <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
                  {isEnglish ? 'Experience' : 'Experiencia'}
                </span>

                <CrystalSelect
                  value={newReservationForm.plan}
                  onChange={(value) =>
                    setNewReservationForm((current) => ({
                      ...current,
                      plan: value,
                    }))
                  }
                  options={[
                    'Cata de vino',
                    'Recorrido por viñedos',
                    'Cena romántica',
                    'Picnic entre viñedos',
                    'Restaurante',
                    'Evento privado',
                  ].map((item) => ({
                    value: item,
                    label: item,
                  }))}
                  buttonClassName="min-h-12 text-[var(--color-ink)]"
                />
              </label>

              <FormField
                label={isEnglish ? 'Date' : 'Fecha'}
                type="date"
                value={newReservationForm.date}
                onChange={(value) =>
                  setNewReservationForm((current) => ({
                    ...current,
                    date: value,
                  }))
                }
                required
              />

              <FormField
                label={isEnglish ? 'Guests' : 'Personas'}
                type="number"
                value={newReservationForm.people}
                onChange={(value) =>
                  setNewReservationForm((current) => ({
                    ...current,
                    people: value,
                  }))
                }
                min="1"
                required
              />

              <FormField
                label={isEnglish ? 'Estimated amount' : 'Monto estimado'}
                value={newReservationForm.amount}
                onChange={(value) =>
                  setNewReservationForm((current) => ({
                    ...current,
                    amount: value,
                  }))
                }
                placeholder="$950.00"
              />
            </div>

            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() =>
                  setIsNewReservationOpen(false)
                }
                className="min-h-12 rounded-xl border border-[var(--color-line)] px-5 text-sm font-semibold text-[var(--color-muted-strong)]"
              >
                {isEnglish ? 'Cancel' : 'Cancelar'}
              </button>

              <button
                type="submit"
                className="min-h-12 rounded-xl bg-[var(--color-burgundy)] px-6 text-sm font-semibold shadow-[0_12px_24px_rgba(79,15,31,0.18)]"
                style={{ color: '#ffffff' }}
              >
                {isEnglish ? 'Create reservation' : 'Crear reservación'}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  )
}

type DetailCardProps = {
  icon: typeof CalendarDays
  label: string
  value: string
  note: string
}

function DetailCard({
  icon: Icon,
  label,
  value,
  note,
}: DetailCardProps) {
  return (
    <div className="rounded-[1rem] border border-[var(--color-line)] bg-[var(--color-panel-strong)] p-4">
      <div className="flex items-center gap-2 text-[var(--color-burgundy)]">
        <Icon size={15} />

        <p className="text-[9px] font-semibold uppercase tracking-[0.12em]">
          {label}
        </p>
      </div>

      <p className="mt-3 text-sm font-semibold text-[var(--color-ink)]">
        {value}
      </p>

      <p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--color-muted)]">
        {note}
      </p>
    </div>
  )
}

type FormFieldProps = {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  placeholder?: string
  required?: boolean
  min?: string
}

function FormField({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  required = false,
  min,
}: FormFieldProps) {
  return (
    <label className="block">
      <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
        {label}
      </span>

      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        min={min}
        className="min-h-12 w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-panel-strong)] px-4 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-gold)]"
      />
    </label>
  )
}
