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
import { areaLabel, dateTime, eventLabel, money, statusLabel as safeStatusLabel } from './controlCopy'

function formatMoney(value: number, currency: string) {
  return money(value, currency)
}

function formatDate(value: string) {
  return dateTime(value)
}

function statusLabel(status?: string | null) {
  return safeStatusLabel(status)
}

function activityLabel(eventName: string) {
  return eventLabel(eventName)
}

function activityContext(module?: string | null, entityType?: string | null) {
  const moduleLabels: Record<string, string> = {
    app: 'App',
    customer: 'Cliente',
    commerce: 'Comercio',
    reservations: 'Reservaciones',
    cart: 'Carrito',
      checkout: 'Pago',
  }
  const entityLabels: Record<string, string> = {
    order: 'orden',
    cart: 'carrito',
    reservation: 'reservación',
    customer: 'cliente',
    session: 'sesión',
  }
  const left = module ? moduleLabels[module] ?? areaLabel(module) : 'Actividad'
  const right = entityType ? entityLabels[entityType] ?? entityType.replaceAll('_', ' ') : 'sin elemento asociado'
  return `${left} · ${right}`
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
      setError('No fue posible cargar la operación. Reintenta en unos momentos.')
    } finally {
      setLoading(false)
    }
  }, [session?.access_token])

  useEffect(() => {
    void load()
  }, [load])

  const collected = summary?.metrics.collected ?? []
  const collectedValue = collected.length
    ? collected.map((item) => formatMoney(item.amount, item.currency)).join(' · ')
    : formatMoney(0, 'MXN')

  return (
    <div className="control-page control-page--dashboard space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <SectionTitle
	          eyebrow="Centro de Control"
	          title="Operación"
	          subtitle="Pendientes, cobros y seguimiento diario de Hacienda de Letras."
        />
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex min-h-10 items-center justify-center gap-2 self-start rounded-full border border-[var(--color-line)] bg-[var(--color-panel)] px-4 text-sm font-medium text-[var(--color-ink)] transition hover:border-[var(--color-burgundy)] disabled:cursor-wait disabled:opacity-60"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Actualizar
        </button>
      </div>

      {error ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#c87d6e] bg-[#fff7f3] px-5 py-4 text-sm text-[#7b3026]">
          <span>{error}</span>
          <button type="button" onClick={() => void load()} className="font-medium underline">Reintentar</button>
        </div>
      ) : null}

      <div className="control-metrics-primary grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Clientes registrados"
          value={loading ? '—' : String(summary?.metrics.customers ?? 0)}
          detail="Perfiles de cliente no archivados"
          icon={Users}
        />
        <Metric
          label="Reservaciones activas"
          value={loading ? '—' : String(summary?.metrics.activeReservations ?? 0)}
          detail={loading ? 'Cargando...' : `${summary?.metrics.confirmedReservations ?? 0} confirmadas · ${summary?.metrics.pendingReservations ?? 0} pendientes`}
          icon={CalendarDays}
        />
        <Metric
          label="Cobrado registrado"
          value={loading ? '—' : collectedValue}
          detail={loading ? 'Cargando...' : `${summary?.metrics.confirmedPayments ?? 0} pagos confirmados`}
          icon={CircleDollarSign}
        />
        <Metric
          label="Órdenes por cobrar"
          value={loading ? '—' : String(summary?.metrics.pendingPaymentOrders ?? 0)}
          detail="Órdenes pendientes de pago"
          icon={ShoppingBag}
        />
      </div>


      <div className="control-metrics-secondary grid gap-4">
		        <Metric label="Clientes activos · 30 días" value={loading ? '—' : String(summary?.metrics.activeCustomersRecent ?? 0)} detail="Clientes identificados con actividad registrada" icon={Users} />
	        <Metric label="Carritos activos" value={loading ? '—' : String(summary?.metrics.activeCarts ?? 0)} detail={loading ? 'Cargando...' : `${summary?.metrics.convertedCarts ?? 0} convertidos`} icon={ShoppingBag} />
		        <Metric label="Checkouts · 30 días" value={loading ? '—' : String(summary?.metrics.checkoutStarted ?? 0)} detail="Inicios de pago registrados por la app" icon={Activity} />
			        <Metric label="Sesiones App · 30 días" value={loading ? '—' : String(summary?.metrics.visitorsRecent ?? 0)} detail="Sesiones únicas registradas" icon={Users} />
	        <Metric label="Ocupación de experiencias" value={loading ? '—' : `${summary?.metrics.occupancyRate ?? 0}%`} detail="Cupo confirmado en horarios futuros vendibles" icon={CalendarDays} />
		        <Metric label="Conversión de carritos" value={loading ? '—' : `${summary?.metrics.conversionRate ?? 0}%`} detail="Carritos convertidos sobre carritos registrados" icon={Activity} />
		        <Metric label="Puntos del mapa" value={loading ? '—' : String(summary?.metrics.publishedMapPois ?? 0)} detail="Ubicaciones publicadas y visibles en la app" icon={MapPin} />
	      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Panel title="Próximos horarios" action={<Link to="/control/disponibilidad" className="text-sm font-medium text-[var(--color-burgundy)]">Ver disponibilidad</Link>}>
          {loading ? <Empty>Cargando horarios operativos...</Empty> : null}
          {!loading && summary?.upcomingSlots.length === 0 ? (
            <Empty>No hay horarios futuros registrados. Crea y publica disponibilidad para empezar a recibir reservaciones.</Empty>
          ) : null}
          {!loading && summary?.upcomingSlots.length ? (
            <div className="divide-y divide-[var(--color-line)]">
              {summary.upcomingSlots.map((slot) => (
                <div key={slot.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                  <div>
                    <p className="text-base font-medium text-[var(--color-ink)]">{slot.experienceTitle}</p>
                    <p className="mt-1 text-sm text-[var(--color-muted)]">{formatDate(slot.startAt)}</p>
                  </div>
                  <div className="text-right text-sm">
                    <p className="font-medium text-[var(--color-ink)]">{slot.reserved}/{slot.capacity} personas</p>
                    <p className="mt-1 text-[var(--color-muted)]">{slot.available} disponibles · {statusLabel(slot.operationalStatus)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </Panel>

        <Panel title="Acciones operativas">
          <div className="divide-y divide-[var(--color-line)] px-5">
            {[
	              ['/control/reservaciones', 'Nueva reservación / seguimiento'],
	              ['/control/cotizaciones', 'Nueva cotización / seguimiento'],
	              ['/control/ordenes', 'Pedidos y entregas'],
	              ['/control/pagos', 'Cobros e incidencias'],
	              ['/control/clientes', 'CRM de clientes'],
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
        <Panel title="Reservaciones recientes" action={<Link to="/control/reservaciones" className="text-sm font-medium text-[var(--color-burgundy)]">Ver todas</Link>}>
          {loading ? <Empty>Cargando reservaciones...</Empty> : null}
          {!loading && summary?.recentReservations.length === 0 ? <Empty>Aún no hay reservaciones registradas.</Empty> : null}
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
                    <p className="mt-1 text-[var(--color-muted)]">{item.peopleCount} personas · {statusLabel(item.status)}</p>
                  </div>
                  <span className="shrink-0 text-[var(--color-muted)]">{formatDate(item.createdAt)}</span>
                </Link>
              ))}
            </div>
          ) : null}
        </Panel>

        <Panel title="Órdenes recientes" action={<Link to="/control/ordenes" className="text-sm font-medium text-[var(--color-burgundy)]">Ver todas</Link>}>
          {loading ? <Empty>Cargando órdenes...</Empty> : null}
          {!loading && summary?.recentOrders.length === 0 ? <Empty>Aún no hay órdenes registradas.</Empty> : null}
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
                    <p className="mt-1 text-[var(--color-muted)]">{statusLabel(item.status)} · {formatDate(item.createdAt)}</p>
                  </div>
                  <span className="shrink-0 font-medium text-[var(--color-ink)]">{formatMoney(item.total, item.currency)}</span>
                </Link>
              ))}
            </div>
          ) : null}
        </Panel>
      </div>

      <Panel title="Actividad reciente de la App" action={<Link to="/control/actividad" className="text-sm font-medium text-[var(--color-burgundy)]">Ver bitácora</Link>}>
        {loading ? <Empty>Cargando actividad...</Empty> : null}
        {!loading && summary?.recentAppActivity.length === 0 ? <Empty>Aún no hay actividad de App registrada.</Empty> : null}
        {!loading && summary?.recentAppActivity.length ? <div className="divide-y divide-[var(--color-line)]">{summary.recentAppActivity.map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 text-sm"><div><p className="font-medium text-[var(--color-ink)]">{item.customerName ?? 'Sesión sin identificar'} · {activityLabel(item.eventName)}</p><p className="mt-1 text-[var(--color-muted)]">{activityContext(item.module, item.entityType)}</p></div><span className="text-[var(--color-muted)]">{formatDate(item.occurredAt)}</span></div>)}</div> : null}
      </Panel>

      {!loading && summary ? (
        <p className="flex items-center gap-2 text-xs text-[var(--color-muted)]"><Clock3 size={14} /> Datos actualizados: {formatDate(summary.generatedAt)}.</p>
      ) : null}
    </div>
  )
}
