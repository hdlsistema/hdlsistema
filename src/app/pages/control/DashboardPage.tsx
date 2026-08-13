import { useCallback, useEffect, useState, type ReactNode } from 'react'
import {
  CalendarDays,
  Activity,
  ChevronRight,
  CircleDollarSign,
	  Clock3,
	  MapPin,
	  RefreshCw,
  ShoppingBag,
  Users,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../../contexts/AuthContext'
import { dashboardClient, type DashboardSummary } from '../../../services/dashboard.service'
import { SectionTitle } from '../../components/shared/SectionTitle'
import { dateTime, money, statusLabel as safeStatusLabel } from './controlCopy'
import { useAppPreferences } from '../../context/AppPreferencesContext'

function formatMoney(value: number, currency: string, locale: string) {
  return money(value, currency, locale)
}

function formatDate(value: string, locale: string) {
  return dateTime(value, locale)
}

function statusLabel(status: string | null | undefined, locale: string) {
  return safeStatusLabel(status, locale)
}

function Metric({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string
  value: string
  detail: string
  icon: typeof Users
}) {
  return (
    <section className="control-metric rounded-lg border border-[var(--color-line)] bg-[var(--color-panel)] shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--color-muted)]">{label}</p>
          <p className="control-metric__value font-semibold leading-none text-[var(--color-ink)]">{value}</p>
          <p className="control-metric__detail text-[var(--color-muted)]">{detail}</p>
        </div>
        <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-[var(--color-soft)] text-[var(--color-burgundy)]">
          <Icon size={20} />
        </span>
      </div>
    </section>
  )
}

function Panel({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="control-panel rounded-lg border border-[var(--color-line)] bg-[var(--color-panel)] shadow-[var(--shadow-card)]">
      <header className="flex items-center justify-between gap-4 border-b border-[var(--color-line)] px-5 py-4">
        <h2 className="text-xl font-normal text-[var(--color-ink)]" style={{ fontFamily: 'var(--font-display)' }}>{title}</h2>
        {action}
      </header>
      {children}
    </section>
  )
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="px-5 py-8 text-sm text-[var(--color-muted)]">{children}</p>
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
    eyebrow: 'Command center', title: 'Operations', subtitle: 'Pending work, collections and daily follow-up for Hacienda de Letras.',
    refresh: 'Refresh', retry: 'Try again', customers: 'Registered customers', customerDetail: 'Non-archived customer profiles',
    reservations: 'Active bookings', loading: 'Loading...', confirmed: 'confirmed', pending: 'pending',
    collected: 'Recorded collections', paymentsConfirmed: 'confirmed payments', ordersDue: 'Orders awaiting payment', ordersDueDetail: 'Orders pending payment',
    activeCustomers: 'Active customers · 30 days', activeCustomersDetail: 'Identified customers with recorded activity',
    activeCarts: 'Active carts', converted: 'converted', checkouts: 'Checkouts · 30 days', checkoutsDetail: 'Checkout starts recorded by the app',
    appSessions: 'App sessions · 30 days', appSessionsDetail: 'Unique sessions recorded', occupancy: 'Experience occupancy', occupancyDetail: 'Confirmed capacity in future sellable slots',
    conversion: 'Cart conversion', conversionDetail: 'Converted carts over recorded carts', map: 'Map locations', mapDetail: 'Published locations visible in the app',
    upcoming: 'Upcoming schedules', viewAvailability: 'View availability', loadingSlots: 'Loading operating schedules...',
    noSlots: 'There are no future schedules. Create and publish availability to start receiving bookings.', people: 'guests', available: 'available',
    actions: 'Operating actions', actionRows: ['New booking / follow-up', 'New quote / follow-up', 'Orders and deliveries', 'Collections and incidents', 'Customer CRM'],
    recentReservations: 'Recent bookings', viewAll: 'View all', loadingReservations: 'Loading bookings...', noReservations: 'No bookings have been recorded yet.',
    recentOrders: 'Recent orders', loadingOrders: 'Loading orders...', noOrders: 'No orders have been recorded yet.', updated: 'Data updated',
  } : {
    eyebrow: 'Centro de Control', title: 'Operación', subtitle: 'Pendientes, cobros y seguimiento diario de Hacienda de Letras.',
    refresh: 'Actualizar', retry: 'Reintentar', customers: 'Clientes registrados', customerDetail: 'Perfiles de cliente no archivados',
    reservations: 'Reservaciones activas', loading: 'Cargando...', confirmed: 'confirmadas', pending: 'pendientes',
    collected: 'Cobrado registrado', paymentsConfirmed: 'pagos confirmados', ordersDue: 'Órdenes por cobrar', ordersDueDetail: 'Órdenes pendientes de pago',
    activeCustomers: 'Clientes activos · 30 días', activeCustomersDetail: 'Clientes identificados con actividad registrada',
    activeCarts: 'Carritos activos', converted: 'convertidos', checkouts: 'Checkouts · 30 días', checkoutsDetail: 'Inicios de pago registrados por la app',
    appSessions: 'Sesiones App · 30 días', appSessionsDetail: 'Sesiones únicas registradas', occupancy: 'Ocupación de experiencias', occupancyDetail: 'Cupo confirmado en horarios futuros vendibles',
    conversion: 'Conversión de carritos', conversionDetail: 'Carritos convertidos sobre carritos registrados', map: 'Puntos del mapa', mapDetail: 'Ubicaciones publicadas y visibles en la app',
    upcoming: 'Próximos horarios', viewAvailability: 'Ver disponibilidad', loadingSlots: 'Cargando horarios operativos...',
    noSlots: 'No hay horarios futuros registrados. Crea y publica disponibilidad para empezar a recibir reservaciones.', people: 'personas', available: 'disponibles',
    actions: 'Acciones operativas', actionRows: ['Nueva reservación / seguimiento', 'Nueva cotización / seguimiento', 'Pedidos y entregas', 'Cobros e incidencias', 'CRM de clientes'],
    recentReservations: 'Reservaciones recientes', viewAll: 'Ver todas', loadingReservations: 'Cargando reservaciones...', noReservations: 'Aún no hay reservaciones registradas.',
    recentOrders: 'Órdenes recientes', loadingOrders: 'Cargando órdenes...', noOrders: 'Aún no hay órdenes registradas.', updated: 'Datos actualizados',
  }

  useEffect(() => {
    void load()
  }, [load])

  const collected = summary?.metrics.collected ?? []
  const collectedValue = collected.length
    ? collected.map((item) => formatMoney(item.amount, item.currency, locale)).join(' · ')
    : formatMoney(0, 'MXN', locale)

  return (
    <div className="control-page control-page--dashboard space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <SectionTitle
          eyebrow={copy.eyebrow}
	          title={copy.title}
	          subtitle={copy.subtitle}
        />
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex min-h-10 items-center justify-center gap-2 self-start rounded-full border border-[var(--color-line)] bg-[var(--color-panel)] px-4 text-sm font-medium text-[var(--color-ink)] transition hover:border-[var(--color-burgundy)] disabled:cursor-wait disabled:opacity-60"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          {copy.refresh}
        </button>
      </div>

      {error ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#c87d6e] bg-[#fff7f3] px-5 py-4 text-sm text-[#7b3026]">
          <span>{error}</span>
          <button type="button" onClick={() => void load()} className="font-medium underline">{copy.retry}</button>
        </div>
      ) : null}

      <div className="control-metrics-primary grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label={copy.customers}
          value={loading ? '—' : String(summary?.metrics.customers ?? 0)}
          detail={copy.customerDetail}
          icon={Users}
        />
        <Metric
          label={copy.reservations}
          value={loading ? '—' : String(summary?.metrics.activeReservations ?? 0)}
          detail={loading ? copy.loading : `${summary?.metrics.confirmedReservations ?? 0} ${copy.confirmed} · ${summary?.metrics.pendingReservations ?? 0} ${copy.pending}`}
          icon={CalendarDays}
        />
        <Metric
          label={copy.collected}
          value={loading ? '—' : collectedValue}
          detail={loading ? copy.loading : `${summary?.metrics.confirmedPayments ?? 0} ${copy.paymentsConfirmed}`}
          icon={CircleDollarSign}
        />
        <Metric
          label={copy.ordersDue}
          value={loading ? '—' : String(summary?.metrics.pendingPaymentOrders ?? 0)}
          detail={copy.ordersDueDetail}
          icon={ShoppingBag}
        />
      </div>


      <div className="control-metrics-secondary grid gap-4">
		        <Metric label={copy.activeCustomers} value={loading ? '—' : String(summary?.metrics.activeCustomersRecent ?? 0)} detail={copy.activeCustomersDetail} icon={Users} />
	        <Metric label={copy.activeCarts} value={loading ? '—' : String(summary?.metrics.activeCarts ?? 0)} detail={loading ? copy.loading : `${summary?.metrics.convertedCarts ?? 0} ${copy.converted}`} icon={ShoppingBag} />
		        <Metric label={copy.checkouts} value={loading ? '—' : String(summary?.metrics.checkoutStarted ?? 0)} detail={copy.checkoutsDetail} icon={Activity} />
			        <Metric label={copy.appSessions} value={loading ? '—' : String(summary?.metrics.visitorsRecent ?? 0)} detail={copy.appSessionsDetail} icon={Users} />
	        <Metric label={copy.occupancy} value={loading ? '—' : `${summary?.metrics.occupancyRate ?? 0}%`} detail={copy.occupancyDetail} icon={CalendarDays} />
		        <Metric label={copy.conversion} value={loading ? '—' : `${summary?.metrics.conversionRate ?? 0}%`} detail={copy.conversionDetail} icon={Activity} />
		        <Metric label={copy.map} value={loading ? '—' : String(summary?.metrics.publishedMapPois ?? 0)} detail={copy.mapDetail} icon={MapPin} />
	      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Panel title={copy.upcoming} action={<Link to="/control/disponibilidad" className="text-sm font-medium text-[var(--color-burgundy)]">{copy.viewAvailability}</Link>}>
          {loading ? <Empty>{copy.loadingSlots}</Empty> : null}
          {!loading && summary?.upcomingSlots.length === 0 ? (
            <Empty>{copy.noSlots}</Empty>
          ) : null}
          {!loading && summary?.upcomingSlots.length ? (
            <div className="divide-y divide-[var(--color-line)]">
              {summary.upcomingSlots.map((slot) => (
                <div key={slot.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                  <div>
                    <p className="text-base font-medium text-[var(--color-ink)]">{slot.experienceTitle}</p>
                    <p className="mt-1 text-sm text-[var(--color-muted)]">{formatDate(slot.startAt, locale)}</p>
                  </div>
                  <div className="text-right text-sm">
                    <p className="font-medium text-[var(--color-ink)]">{slot.reserved}/{slot.capacity} {copy.people}</p>
                    <p className="mt-1 text-[var(--color-muted)]">{slot.available} {copy.available} · {statusLabel(slot.operationalStatus, locale)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </Panel>

        <Panel title={copy.actions}>
          <div className="divide-y divide-[var(--color-line)] px-5">
            {[
	              ['/control/reservaciones', copy.actionRows[0]],
	              ['/control/cotizaciones', copy.actionRows[1]],
	              ['/control/ordenes', copy.actionRows[2]],
	              ['/control/pagos', copy.actionRows[3]],
	              ['/control/clientes', copy.actionRows[4]],
            ].map(([to, label]) => (
              <Link key={to} className="flex items-center justify-between py-4 text-sm text-[var(--color-ink)] transition hover:text-[var(--color-burgundy)]" to={to}>
                <span>{label}</span>
                <ChevronRight size={17} strokeWidth={1.5} />
              </Link>
            ))}
          </div>
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title={copy.recentReservations} action={<Link to="/control/reservaciones" className="text-sm font-medium text-[var(--color-burgundy)]">{copy.viewAll}</Link>}>
          {loading ? <Empty>{copy.loadingReservations}</Empty> : null}
          {!loading && summary?.recentReservations.length === 0 ? <Empty>{copy.noReservations}</Empty> : null}
          {!loading && summary?.recentReservations.length ? (
            <div className="divide-y divide-[var(--color-line)]">
              {summary.recentReservations.map((item) => (
                <Link
                  to={`/control/reservaciones?reservationId=${encodeURIComponent(item.id)}`}
                  key={item.id}
                  className="flex items-center justify-between gap-3 px-5 py-4 text-sm transition hover:bg-[var(--color-soft)]"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-[var(--color-ink)]">{item.reservationNumber}</p>
                    <p className="mt-1 text-[var(--color-muted)]">{item.peopleCount} {copy.people} · {statusLabel(item.status, locale)}</p>
                  </div>
                  <span className="shrink-0 text-[var(--color-muted)]">{formatDate(item.createdAt, locale)}</span>
                </Link>
              ))}
            </div>
          ) : null}
        </Panel>

        <Panel title={copy.recentOrders} action={<Link to="/control/ordenes" className="text-sm font-medium text-[var(--color-burgundy)]">{copy.viewAll}</Link>}>
          {loading ? <Empty>{copy.loadingOrders}</Empty> : null}
          {!loading && summary?.recentOrders.length === 0 ? <Empty>{copy.noOrders}</Empty> : null}
          {!loading && summary?.recentOrders.length ? (
            <div className="divide-y divide-[var(--color-line)]">
              {summary.recentOrders.map((item) => (
                <Link
                  to={`/control/ordenes?orderId=${encodeURIComponent(item.id)}`}
                  key={item.id}
                  className="flex items-center justify-between gap-3 px-5 py-4 text-sm transition hover:bg-[var(--color-soft)]"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-[var(--color-ink)]">{item.orderNumber}</p>
                    <p className="mt-1 text-[var(--color-muted)]">{statusLabel(item.status, locale)} · {formatDate(item.createdAt, locale)}</p>
                  </div>
                  <span className="shrink-0 font-medium text-[var(--color-ink)]">{formatMoney(item.total, item.currency, locale)}</span>
                </Link>
              ))}
            </div>
          ) : null}
        </Panel>
      </div>

      {!loading && summary ? (
        <p className="flex items-center gap-2 text-xs text-[var(--color-muted)]"><Clock3 size={14} /> {copy.updated}: {formatDate(summary.generatedAt, locale)}.</p>
      ) : null}
    </div>
  )
}
