import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  ArrowUpRight,
  CalendarDays,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  FileText,
  RefreshCw,
  ShoppingBag,
  Sparkles,
  Users,
  WalletCards,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../../contexts/AuthContext'
import { dashboardClient, type DashboardSummary } from '../../../services/dashboard.service'
import { dateTime, money, statusLabel as safeStatusLabel } from './controlCopy'
import { useAppPreferences } from '../../context/AppPreferencesContext'
import { ExecutiveAssistant } from '../../components/control/ExecutiveAssistant'

function formatMoney(value: number, currency: string, locale: string) {
  return money(value, currency, locale)
}

function formatDate(value: string, locale: string) {
  return dateTime(value, locale)
}

function statusLabel(status: string | null | undefined, locale: string) {
  return safeStatusLabel(status, locale)
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0))
}

type Tone = 'wine' | 'gold' | 'forest' | 'clay'

function ExecutiveMetric({
  label,
  value,
  detail,
  icon: Icon,
  tone,
}: {
  label: string
  value: string
  detail: string
  icon: typeof Users
  tone: Tone
}) {
  return (
    <article className={`control-executive-metric control-executive-metric--${tone}`}>
      <div className="control-executive-metric__heading">
        <span className="control-executive-metric__icon"><Icon size={17} strokeWidth={1.7} /></span>
        <p>{label}</p>
      </div>
      <p className="control-executive-metric__value">{value}</p>
      <p className="control-executive-metric__detail">{detail}</p>
    </article>
  )
}

function DashboardPanel({
  eyebrow,
  title,
  children,
  action,
  className = '',
}: {
  eyebrow?: string
  title: string
  children: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <section className={`control-dashboard-panel ${className}`}>
      <header className="control-dashboard-panel__header">
        <div>
          {eyebrow ? <p>{eyebrow}</p> : null}
          <h2>{title}</h2>
        </div>
        {action}
      </header>
      {children}
    </section>
  )
}

function RadialGauge({ label, value, tone }: { label: string; value: number; tone: 'wine' | 'forest' }) {
  const percentage = clampPercent(value)
  const color = tone === 'forest' ? '#252F37' : '#681126'
  return (
    <div className="control-radial-gauge">
      <div
        className="control-radial-gauge__ring"
        style={{ background: `conic-gradient(${color} 0 ${percentage}%, rgba(122, 91, 72, 0.12) ${percentage}% 100%)` }}
        aria-label={`${label}: ${percentage}%`}
      >
        <span>{Math.round(percentage)}%</span>
      </div>
      <p>{label}</p>
    </div>
  )
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="control-dashboard-empty">{children}</p>
}

export function DashboardPage() {
  const { session } = useAuth()
  const { isEnglish, locale } = useAppPreferences()
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await dashboardClient.get(session?.access_token)
      setSummary(response.data)
    } catch {
      setSummary(null)
      setError(isEnglish ? 'The live operation could not be loaded. Try again in a moment.' : 'No fue posible cargar la operación. Reintenta en unos momentos.')
    } finally {
      setLoading(false)
    }
  }, [isEnglish, session?.access_token])

  const copy = isEnglish ? {
    eyebrow: 'Executive command center', title: 'Today at the estate', subtitle: 'A clear reading of sales, bookings and the customer journey.',
    live: 'Live operation', refresh: 'Refresh', retry: 'Try again', customers: 'Registered customers', customerDetail: 'Available customer profiles',
    reservations: 'Active bookings', loading: 'Loading...', confirmed: 'confirmed', pending: 'pending', other: 'other',
    collected: 'Recorded collections', paymentsConfirmed: 'confirmed payments', ordersDue: 'Orders awaiting payment', ordersDueDetail: 'Orders pending payment',
    overview: 'Commercial overview', bookingMix: 'Booking mix', bookingMixDetail: 'Current operational status',
    customerJourney: 'Customer journey', customerJourneyDetail: 'Recorded activity, not a projection', carts: 'Active carts', checkouts: 'Checkout starts', converted: 'Converted carts',
    performance: 'Operational performance', performanceDetail: 'Capacity and digital response', occupancy: 'Future occupancy', conversion: 'Cart conversion',
    activeCustomers: 'Active customers', appSessions: 'App sessions', map: 'Published map points', last30Days: 'Last 30 days',
    upcoming: 'Upcoming experiences', upcomingEyebrow: 'Operating agenda', viewAvailability: 'View availability', loadingSlots: 'Loading operating schedules...',
    noSlots: 'There are no future schedules. Create and publish availability to start receiving bookings.', people: 'guests', available: 'available',
    actions: 'Priority routes', actionsEyebrow: 'Quick access', actionRows: [
      { label: 'Bookings', detail: 'Confirm and follow up', to: '/control/reservaciones', icon: CalendarDays },
      { label: 'Quotes', detail: 'Attend new requests', to: '/control/cotizaciones', icon: FileText },
      { label: 'Orders', detail: 'Prepare and deliver', to: '/control/ordenes', icon: ShoppingBag },
      { label: 'Payments', detail: 'Review collections', to: '/control/pagos', icon: WalletCards },
    ],
    recent: 'Latest movements', recentEyebrow: 'Customer activity', recentReservations: 'Bookings', recentOrders: 'Orders', viewAll: 'View all',
    loadingReservations: 'Loading bookings...', noReservations: 'No bookings have been recorded yet.', loadingOrders: 'Loading orders...', noOrders: 'No orders have been recorded yet.', updated: 'Data updated',
  } : {
    eyebrow: 'Centro ejecutivo de operación', title: 'Hoy en la Hacienda', subtitle: 'Una lectura clara de ventas, reservaciones y experiencia del cliente.',
    live: 'Operación en línea', refresh: 'Actualizar', retry: 'Reintentar', customers: 'Clientes registrados', customerDetail: 'Perfiles disponibles para atención',
    reservations: 'Reservaciones activas', loading: 'Cargando...', confirmed: 'confirmadas', pending: 'pendientes', other: 'otros estados',
    collected: 'Cobrado registrado', paymentsConfirmed: 'pagos confirmados', ordersDue: 'Órdenes por cobrar', ordersDueDetail: 'Órdenes pendientes de pago',
    overview: 'Panorama comercial', bookingMix: 'Composición de reservaciones', bookingMixDetail: 'Estado operativo actual',
    customerJourney: 'Recorrido del cliente', customerJourneyDetail: 'Actividad registrada, no una proyección', carts: 'Carritos activos', checkouts: 'Inicios de checkout', converted: 'Carritos convertidos',
    performance: 'Rendimiento operativo', performanceDetail: 'Capacidad y respuesta digital', occupancy: 'Ocupación futura', conversion: 'Conversión de carritos',
    activeCustomers: 'Clientes activos', appSessions: 'Sesiones en app', map: 'Puntos publicados', last30Days: 'Últimos 30 días',
    upcoming: 'Próximas experiencias', upcomingEyebrow: 'Agenda operativa', viewAvailability: 'Ver disponibilidad', loadingSlots: 'Cargando horarios operativos...',
    noSlots: 'No hay horarios futuros registrados. Crea y publica disponibilidad para empezar a recibir reservaciones.', people: 'personas', available: 'disponibles',
    actions: 'Rutas prioritarias', actionsEyebrow: 'Acceso inmediato', actionRows: [
      { label: 'Reservaciones', detail: 'Confirmar y dar seguimiento', to: '/control/reservaciones', icon: CalendarDays },
      { label: 'Cotizaciones', detail: 'Atender nuevas solicitudes', to: '/control/cotizaciones', icon: FileText },
      { label: 'Órdenes', detail: 'Preparar y entregar', to: '/control/ordenes', icon: ShoppingBag },
      { label: 'Pagos', detail: 'Revisar cobros', to: '/control/pagos', icon: WalletCards },
    ],
    recent: 'Últimos movimientos', recentEyebrow: 'Actividad de clientes', recentReservations: 'Reservaciones', recentOrders: 'Órdenes', viewAll: 'Ver todo',
    loadingReservations: 'Cargando reservaciones...', noReservations: 'Aún no hay reservaciones registradas.', loadingOrders: 'Cargando órdenes...', noOrders: 'Aún no hay órdenes registradas.', updated: 'Datos actualizados',
  }

  useEffect(() => {
    void load()
  }, [load])

  const metrics = summary?.metrics
  const collected = metrics?.collected ?? []
  const collectedValue = collected.length
    ? collected.map((item) => formatMoney(item.amount, item.currency, locale)).join(' · ')
    : formatMoney(0, 'MXN', locale)
  const activeReservations = metrics?.activeReservations ?? 0
  const confirmedReservations = metrics?.confirmedReservations ?? 0
  const pendingReservations = metrics?.pendingReservations ?? 0
  const otherReservations = Math.max(0, activeReservations - confirmedReservations - pendingReservations)

  const bookingMix = useMemo(() => {
    const total = Math.max(activeReservations, confirmedReservations + pendingReservations + otherReservations, 1)
    const confirmedStop = clampPercent((confirmedReservations / total) * 100)
    const pendingStop = clampPercent(((confirmedReservations + pendingReservations) / total) * 100)
    return {
      background: `conic-gradient(#681126 0 ${confirmedStop}%, #bd8c47 ${confirmedStop}% ${pendingStop}%, #d9cbbc ${pendingStop}% 100%)`,
    }
  }, [activeReservations, confirmedReservations, otherReservations, pendingReservations])

  const journey = [
    { label: copy.carts, value: metrics?.activeCarts ?? 0, tone: 'wine' },
    { label: copy.checkouts, value: metrics?.checkoutStarted ?? 0, tone: 'gold' },
    { label: copy.converted, value: metrics?.convertedCarts ?? 0, tone: 'forest' },
  ]
  const journeyMax = Math.max(1, ...journey.map((item) => item.value))

  return (
    <div className="control-page control-page--dashboard control-dashboard-editorial">
      <section className="control-dashboard-hero">
        <div className="control-dashboard-hero__ornament" aria-hidden="true" />
        <div className="control-dashboard-hero__header">
          <div>
            <div className="control-dashboard-hero__eyebrow"><Sparkles size={13} /><span>{copy.eyebrow}</span></div>
            <h1>{copy.title}</h1>
            <p>{copy.subtitle}</p>
          </div>
          <div className="control-dashboard-hero__actions">
            <span className="control-dashboard-live"><i />{copy.live}</span>
            <button type="button" onClick={() => void load()} disabled={loading}><RefreshCw size={15} className={loading ? 'animate-spin' : ''} />{copy.refresh}</button>
          </div>
        </div>

        {error ? <div className="control-dashboard-error"><span>{error}</span><button type="button" onClick={() => void load()}>{copy.retry}</button></div> : null}

        <div className="control-dashboard-hero__metrics">
          <ExecutiveMetric label={copy.customers} value={loading ? '—' : String(metrics?.customers ?? 0)} detail={copy.customerDetail} icon={Users} tone="gold" />
          <ExecutiveMetric label={copy.reservations} value={loading ? '—' : String(activeReservations)} detail={loading ? copy.loading : `${confirmedReservations} ${copy.confirmed} · ${pendingReservations} ${copy.pending}`} icon={CalendarDays} tone="wine" />
          <ExecutiveMetric label={copy.collected} value={loading ? '—' : collectedValue} detail={loading ? copy.loading : `${metrics?.confirmedPayments ?? 0} ${copy.paymentsConfirmed}`} icon={CircleDollarSign} tone="forest" />
          <ExecutiveMetric label={copy.ordersDue} value={loading ? '—' : String(metrics?.pendingPaymentOrders ?? 0)} detail={copy.ordersDueDetail} icon={ShoppingBag} tone="clay" />
        </div>
      </section>

      <ExecutiveAssistant />

      <div className="control-dashboard-section-heading"><div><span>{copy.overview}</span><i /></div></div>

      <div className="control-dashboard-analytics">
        <DashboardPanel eyebrow={copy.bookingMixDetail} title={copy.bookingMix} className="control-dashboard-panel--booking">
          <div className="control-booking-mix">
            <div className="control-booking-mix__chart" style={bookingMix}><div><strong>{loading ? '—' : activeReservations}</strong><span>{copy.reservations}</span></div></div>
            <div className="control-booking-mix__legend">
              {[
                { label: copy.confirmed, value: confirmedReservations, color: '#681126' },
                { label: copy.pending, value: pendingReservations, color: '#bd8c47' },
                { label: copy.other, value: otherReservations, color: '#d9cbbc' },
              ].map((item) => <div key={item.label}><i style={{ background: item.color }} /><span>{item.label}</span><strong>{loading ? '—' : item.value}</strong></div>)}
            </div>
          </div>
        </DashboardPanel>

        <DashboardPanel eyebrow={copy.customerJourneyDetail} title={copy.customerJourney} className="control-dashboard-panel--journey">
          <div className="control-journey-bars">
            {journey.map((item) => (
              <div key={item.label} className="control-journey-bars__row">
                <div><span>{item.label}</span><strong>{loading ? '—' : item.value}</strong></div>
                <div className="control-journey-bars__track"><i className={`is-${item.tone}`} style={{ width: loading ? '8%' : `${Math.max(7, (item.value / journeyMax) * 100)}%` }} /></div>
              </div>
            ))}
          </div>
        </DashboardPanel>

        <DashboardPanel eyebrow={copy.performanceDetail} title={copy.performance} className="control-dashboard-panel--performance">
          <div className="control-performance-grid">
            <RadialGauge label={copy.occupancy} value={loading ? 0 : metrics?.occupancyRate ?? 0} tone="forest" />
            <RadialGauge label={copy.conversion} value={loading ? 0 : metrics?.conversionRate ?? 0} tone="wine" />
          </div>
          <div className="control-digital-reach">
            <div><span>{copy.activeCustomers}</span><strong>{loading ? '—' : metrics?.activeCustomersRecent ?? 0}</strong><small>{copy.last30Days}</small></div>
            <div><span>{copy.appSessions}</span><strong>{loading ? '—' : metrics?.visitorsRecent ?? 0}</strong><small>{copy.last30Days}</small></div>
            <div><span>{copy.map}</span><strong>{loading ? '—' : metrics?.publishedMapPois ?? 0}</strong><small>{copy.live}</small></div>
          </div>
        </DashboardPanel>
      </div>

      <div className="control-dashboard-operational-grid">
        <DashboardPanel eyebrow={copy.upcomingEyebrow} title={copy.upcoming} action={<Link to="/control/disponibilidad" className="control-dashboard-text-link">{copy.viewAvailability}<ArrowUpRight size={14} /></Link>} className="control-dashboard-panel--agenda">
          {loading ? <Empty>{copy.loadingSlots}</Empty> : null}
          {!loading && summary?.upcomingSlots.length === 0 ? <Empty>{copy.noSlots}</Empty> : null}
          {!loading && summary?.upcomingSlots.length ? (
            <div className="control-dashboard-agenda">
              {summary.upcomingSlots.slice(0, 6).map((slot, index) => {
                const occupancy = slot.capacity > 0 ? clampPercent((slot.reserved / slot.capacity) * 100) : 0
                return (
                  <div key={slot.id} className="control-dashboard-agenda__row">
                    <span className="control-dashboard-agenda__index">{String(index + 1).padStart(2, '0')}</span>
                    <div className="control-dashboard-agenda__content">
                      <div><strong>{slot.experienceTitle}</strong><span>{formatDate(slot.startAt, locale)}</span></div>
                      <div className="control-dashboard-agenda__capacity">
                        <div><span>{slot.reserved}/{slot.capacity} {copy.people}</span><strong>{slot.available} {copy.available}</strong></div>
                        <div className="control-dashboard-agenda__track"><i style={{ width: `${occupancy}%` }} /></div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : null}
        </DashboardPanel>

        <DashboardPanel eyebrow={copy.actionsEyebrow} title={copy.actions} className="control-dashboard-panel--actions">
          <div className="control-dashboard-actions">
            {copy.actionRows.map(({ to, label, detail, icon: Icon }, index) => (
              <Link key={to} to={to} className={`control-dashboard-action control-dashboard-action--${index + 1}`}>
                <span><Icon size={17} strokeWidth={1.65} /></span><div><strong>{label}</strong><small>{detail}</small></div><ChevronRight size={15} />
              </Link>
            ))}
          </div>
        </DashboardPanel>
      </div>

      <DashboardPanel eyebrow={copy.recentEyebrow} title={copy.recent} className="control-dashboard-panel--recent">
        <div className="control-dashboard-recent">
          <section>
            <header><h3>{copy.recentReservations}</h3><Link to="/control/reservaciones">{copy.viewAll}</Link></header>
            {loading ? <Empty>{copy.loadingReservations}</Empty> : null}
            {!loading && summary?.recentReservations.length === 0 ? <Empty>{copy.noReservations}</Empty> : null}
            {!loading && summary?.recentReservations.length ? (
              <div className="control-dashboard-recent__list">
                {summary.recentReservations.slice(0, 5).map((item) => (
                  <Link to={`/control/reservaciones?reservationId=${encodeURIComponent(item.id)}`} key={item.id}>
                    <div><strong>{item.reservationNumber}</strong><span>{item.peopleCount} {copy.people} · {statusLabel(item.status, locale)}</span></div><time>{formatDate(item.createdAt, locale)}</time>
                  </Link>
                ))}
              </div>
            ) : null}
          </section>
          <section>
            <header><h3>{copy.recentOrders}</h3><Link to="/control/ordenes">{copy.viewAll}</Link></header>
            {loading ? <Empty>{copy.loadingOrders}</Empty> : null}
            {!loading && summary?.recentOrders.length === 0 ? <Empty>{copy.noOrders}</Empty> : null}
            {!loading && summary?.recentOrders.length ? (
              <div className="control-dashboard-recent__list">
                {summary.recentOrders.slice(0, 5).map((item) => (
                  <Link to={`/control/ordenes?orderId=${encodeURIComponent(item.id)}`} key={item.id}>
                    <div><strong>{item.orderNumber}</strong><span>{statusLabel(item.status, locale)} · {formatDate(item.createdAt, locale)}</span></div><b>{formatMoney(item.total, item.currency, locale)}</b>
                  </Link>
                ))}
              </div>
            ) : null}
          </section>
        </div>
      </DashboardPanel>

      {!loading && summary ? <p className="control-dashboard-updated"><Clock3 size={13} /> {copy.updated}: {formatDate(summary.generatedAt, locale)}.</p> : null}
    </div>
  )
}
