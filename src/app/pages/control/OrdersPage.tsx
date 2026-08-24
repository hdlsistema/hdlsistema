import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { CheckCircle2, ChevronDown, Clock3, Download, ExternalLink, FileClock, MapPin, PackageCheck, Plus, RefreshCw, Search, Send, ShoppingBag, Trash2, Truck, UserRound, X, type LucideIcon } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../../../contexts/AuthContext'
import { ordersClient, type OrderHistoryRecord, type OrderItemRecord, type OrderRecord, type PaymentRecord } from '../../../services/commerce.service'
import { adminContentClient, type ContentRecord } from '../../../services/content.service'
import { customersClient, type CustomerRecord } from '../../../services/customers.service'
import { reservationsClient, type ReservationRecord } from '../../../services/operations.service'
import { ControlConfirmDialog } from '../../components/control/ControlConfirmDialog'
import { ControlEntityPicker } from '../../components/control/ControlEntityPicker'
import { QuickCustomerDialog } from '../../components/control/QuickCustomerDialog'
import { SectionTitle } from '../../components/shared/SectionTitle'
import { StatusBadge } from '../../components/shared/StatusBadge'
import { CrystalSelect } from '../../components/shared/CrystalSelect'
import { useAppPreferences } from '../../context/AppPreferencesContext'
import { dateTime, eventLabel, money, paymentReferenceLabel, statusLabel as safeStatusLabel } from './controlCopy'

type OrderForm = {
  customerId: string
  reservationId: string
  source: string
  internalNotes: string
  items: OrderLineForm[]
}

type OrderLineForm = {
  id: string
  itemId: string
  itemType: string
  name: string
  sku: string
  quantity: string
  unitPrice: string
}

type TrackingForm = {
  carrier: string
  trackingNumber: string
  trackingUrl: string
}

const emptyForm: OrderForm = {
  customerId: '',
  reservationId: '',
  source: 'Centro de control',
  internalNotes: '',
  items: [{ id: 'line-1', itemId: '', itemType: 'manual', name: '', sku: '', quantity: '1', unitPrice: '0' }],
}

function dateLabel(value?: string | null, locale?: string) {
  return dateTime(value, locale)
}

function canWrite(roles: string[]) {
  return roles.some((role) => ['super_admin', 'admin', 'operations', 'finance'].includes(role))
}

function statusLabel(status?: string | null, locale?: string) {
  return safeStatusLabel(status, locale)
}

function paymentChipClass(status?: string | null) {
  const value = String(status ?? '').toLowerCase()
  if (['paid', 'fulfilled', 'completed'].includes(value)) return 'is-paid'
  if (['pending_payment', 'draft', 'processing', 'in_process'].includes(value)) return 'is-pending'
  if (['refunded', 'partially_refunded'].includes(value)) return 'is-refunded'
  if (['cancelled', 'canceled', 'failed'].includes(value)) return 'is-cancelled'
  return 'is-neutral'
}

function shippingStatusLabel(status?: string | null, isEnglish = false) {
  const labels: Record<string, string> = {
    not_required: 'No requiere envío',
    pending_preparation: 'Por preparar',
    preparing: 'Preparando',
    awaiting_tracking: 'Guía pendiente',
    tracking_assigned: 'Guía asignada',
    shipped: 'Enviada',
    delivered: 'Entregada',
    cancelled: 'Cancelada',
  }
  const englishLabels: Record<string, string> = {
    not_required: 'Shipping not required',
    pending_preparation: 'Preparing',
    preparing: 'Preparing',
    awaiting_tracking: 'Tracking pending',
    tracking_assigned: 'Tracking assigned',
    shipped: 'Shipped',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
  }
  return (isEnglish ? englishLabels[status || 'not_required'] : labels[status || 'not_required']) ?? safeStatusLabel(status, isEnglish ? 'en-US' : 'es-MX')
}

type PendingAction = {
  title: string
  message: string
  confirmLabel: string
  tone?: 'default' | 'danger'
  action: () => Promise<unknown>
  success: string
}

export function OrdersPage() {
  const { isEnglish, locale } = useAppPreferences()
  const { session, roles, financialAccess } = useAuth()
  const [searchParams] = useSearchParams()
  const token = session?.access_token
  const writable = canWrite(roles)
  const canCreateFinancialOrder = writable && financialAccess
  const [orders, setOrders] = useState<OrderRecord[]>([])
  const [items, setItems] = useState<OrderItemRecord[]>([])
  const [payments, setPayments] = useState<PaymentRecord[]>([])
  const [history, setHistory] = useState<OrderHistoryRecord[]>([])
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<OrderHistoryRecord | null>(null)
  const [customers, setCustomers] = useState<CustomerRecord[]>([])
  const [reservations, setReservations] = useState<ReservationRecord[]>([])
  const [wines, setWines] = useState<ContentRecord[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [shippingStatus, setShippingStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false)
  const [form, setForm] = useState<OrderForm>(emptyForm)
  const [trackingOpen, setTrackingOpen] = useState(false)
  const [trackingForm, setTrackingForm] = useState<TrackingForm>({ carrier: '', trackingNumber: '', trackingUrl: '' })
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null)

  const selected = useMemo(
    () => orders.find((order) => order.id === selectedId) ?? null,
    [orders, selectedId],
  )

  const loadOrders = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await ordersClient.list(token, {
        search: search || undefined,
        status: status || undefined,
        shippingStatus: shippingStatus || undefined,
        perPage: 100,
      })
      setOrders(response.data)
      const requestedOrderId = searchParams.get('orderId')
      setSelectedId((current) => {
        if (requestedOrderId && response.data.some((order) => order.id === requestedOrderId)) return requestedOrderId
        return current ?? response.data[0]?.id ?? null
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible cargar órdenes.')
    } finally {
      setLoading(false)
    }
  }, [search, searchParams, shippingStatus, status, token])

  useEffect(() => {
    void loadOrders()
  }, [loadOrders])

  const loadRelationOptions = useCallback(async () => {
    try {
      const [customerResponse, reservationResponse, wineResponse] = await Promise.all([
        customersClient.list(token, { perPage: 100, status: 'published' }),
        reservationsClient.list(token, { perPage: 100 }),
        adminContentClient.list('wines', token, { perPage: 100, orderBy: 'name', orderDirection: 'asc' }),
      ])
      setCustomers(customerResponse.data)
      setReservations(reservationResponse.data)
      setWines(wineResponse.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible cargar clientes y reservaciones.')
    }
  }, [token])

  useEffect(() => {
    if (formOpen) void loadRelationOptions()
  }, [formOpen, loadRelationOptions])

  useEffect(() => {
    if (!selected) {
      setItems([])
      setPayments([])
      setHistory([])
      setSelectedHistoryItem(null)
      return
    }
    setItems([])
    setPayments([])
    setHistory([])
    setSelectedHistoryItem(null)
    Promise.all([
      ordersClient.items(token, selected.id).then((response) => setItems(response.data)).catch(() => setItems([])),
      ordersClient.payments(token, selected.id).then((response) => setPayments(response.data)).catch(() => setPayments([])),
      ordersClient.history(token, selected.id).then((response) => setHistory(response.data)).catch(() => setHistory([])),
    ]).catch(() => undefined)
  }, [selected, token])

  const metrics = useMemo(() => ({
    paid: orders.filter((order) => order.status === 'paid').length,
    pending: orders.filter((order) => order.status === 'pending_payment').length,
    total: orders.reduce((sum, order) => sum + (order.total ?? 0), 0),
    preparation: orders.filter((order) => ['pending_preparation', 'preparing'].includes(order.shippingStatus || '')).length,
    tracking: orders.filter((order) => ['awaiting_tracking', 'tracking_assigned'].includes(order.shippingStatus || '')).length,
    shipped: orders.filter((order) => order.shippingStatus === 'shipped').length,
  }), [orders])

  const submitOrder = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (saving) return
    setSaving(true)
    setError('')
    try {
      const response = await ordersClient.create(token, {
        customerId: form.customerId,
        reservationId: form.reservationId || null,
        source: form.source,
        idempotencyKey: crypto.randomUUID(),
        metadata: { internalNotes: form.internalNotes || null, capturedBy: 'control_center' },
        items: form.items.map((item) => ({
          itemType: item.itemType,
          itemId: item.itemId || undefined,
          nameSnapshot: item.name,
          skuSnapshot: item.sku || null,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
        })),
      })
      setSelectedId(response.data.id)
      setForm({ ...emptyForm, items: [{ ...emptyForm.items[0] }] })
      setFormOpen(false)
      setToast('Orden creada.')
      await loadOrders()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible crear la orden.')
      } finally {
        setSaving(false)
      }
  }

  const updateSelectedFromResponse = (next: OrderRecord) => {
    setOrders((current) => current.map((order) => (order.id === next.id ? next : order)))
    setSelectedId(next.id)
  }

  const requestAction = (pending: PendingAction) => {
    if (!writable || saving) return
    setPendingAction(pending)
  }

  const confirmPendingAction = async () => {
    if (!pendingAction || saving) return
    setSaving(true)
    try {
      await pendingAction.action()
      setToast(pendingAction.success)
      await loadOrders()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible completar la acción.')
    } finally {
      setSaving(false)
      setPendingAction(null)
    }
  }

  const submitTracking = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selected || !writable || saving) return
    setSaving(true)
    setError('')
    try {
      const response = await ordersClient.assignTracking(token, selected.id, {
        carrier: trackingForm.carrier,
        trackingNumber: trackingForm.trackingNumber,
        trackingUrl: trackingForm.trackingUrl || null,
      })
      updateSelectedFromResponse(response.data)
      setTrackingForm({ carrier: '', trackingNumber: '', trackingUrl: '' })
      setTrackingOpen(false)
      setToast('Guía asignada.')
      await loadOrders()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible asignar la guía.')
    } finally {
      setSaving(false)
    }
  }

  const exportCsv = async () => {
    if (!financialAccess) {
      setError('Acceso financiero restringido.')
      return
    }
    try {
      const response = await ordersClient.exportCsv(token, { search: search || undefined, status: status || undefined, shippingStatus: shippingStatus || undefined })
      if (!response.ok) throw new Error('No fue posible exportar órdenes.')
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'ordenes-hacienda-de-letras.csv'
      link.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible exportar.')
    }
  }

  return (
    <div className="control-page control-page--orders min-w-0 space-y-6">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <SectionTitle eyebrow="Operación" title="Órdenes" subtitle="Seguimiento de venta, pago, entrega e historial de cada pedido." />
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={loadOrders} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[var(--color-line)] bg-[var(--color-panel)] px-3 text-xs font-semibold text-[var(--color-ink)]"><RefreshCw size={14} />Reintentar</button>
          <button type="button" onClick={exportCsv} disabled={!financialAccess} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[var(--color-line)] bg-[var(--color-panel)] px-3 text-xs font-semibold text-[var(--color-ink)] disabled:opacity-50"><Download size={14} />Exportar CSV</button>
          <button type="button" onClick={() => setFormOpen(true)} disabled={!canCreateFinancialOrder} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[var(--color-burgundy)] px-4 text-xs font-semibold text-white disabled:opacity-50"><Plus size={14} />Nueva orden</button>
        </div>
      </div>

      <section className="control-metrics-strip grid gap-4 sm:grid-cols-3 xl:grid-cols-6">
        <Metric icon={ShoppingBag} label="Órdenes" value={String(orders.length)} />
        <Metric icon={CheckCircle2} label="Pagadas" value={String(metrics.paid)} />
        <Metric icon={PackageCheck} label="Total" value={financialAccess ? money(metrics.total, 'MXN', locale) : (isEnglish ? 'Restricted' : 'Restringido')} />
        <Metric icon={Truck} label="Por preparar" value={String(metrics.preparation)} />
        <Metric icon={Send} label="Guía" value={String(metrics.tracking)} />
        <Metric icon={PackageCheck} label="Enviadas" value={String(metrics.shipped)} />
      </section>

      <section className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-panel)] p-4 shadow-[var(--shadow-card)]">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_220px_auto]">
          <label className="flex min-h-10 items-center gap-2 rounded-lg border border-[var(--color-line)] bg-[var(--color-panel-strong)] px-3">
            <Search size={14} className="text-[var(--color-muted)]" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar folio u origen..." className="min-w-0 flex-1 bg-transparent text-[11px] text-[var(--color-ink)] outline-none" />
          </label>
          <CrystalSelect value={status} onChange={setStatus}>
            <option value="">Todos los estados</option>
            <option value="pending_payment">Pendiente de pago</option>
            <option value="paid">Pagada</option>
            <option value="processing">En proceso</option>
            <option value="fulfilled">Completada</option>
            <option value="cancelled">Cancelada</option>
            <option value="refunded">Reembolsada</option>
          </CrystalSelect>
          <CrystalSelect value={shippingStatus} onChange={setShippingStatus}>
            <option value="">Todos los envíos</option>
            <option value="pending_preparation">Por preparar</option>
            <option value="preparing">Preparando</option>
            <option value="awaiting_tracking">Pendientes de guía</option>
            <option value="tracking_assigned">Con guía</option>
            <option value="shipped">Enviadas</option>
            <option value="delivered">Entregadas</option>
          </CrystalSelect>
          <button type="button" onClick={() => { setSearch(''); setStatus(''); setShippingStatus('') }} className="min-h-10 rounded-lg border border-[var(--color-line)] px-3 text-xs font-semibold text-[var(--color-burgundy)]">Limpiar</button>
        </div>
      </section>

      {error ? <div className="rounded-[var(--radius-card)] border border-[#ead8c5] bg-[#fff7ed] p-4 text-sm text-[#8a4b16]">{error}</div> : null}

      <section className="control-orders-collapsible min-w-0 overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-panel)] shadow-[var(--shadow-card)]">
        <div className="flex items-center justify-between border-b border-[var(--color-line)] px-4 py-3">
          <h3 className="text-sm font-semibold text-[var(--color-ink)]">Órdenes</h3>
          <span className="rounded-full bg-[var(--color-soft)] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">{orders.length} registros</span>
        </div>
        {loading ? <State text="Cargando órdenes..." /> : orders.length === 0 ? <State title="Sin órdenes" text="Crea una orden manual vinculada a un cliente registrado." /> : (
          <div className="divide-y divide-[var(--color-line)]">
            <div className="control-orders-list-header">
              <span>Orden / cliente</span>
              <span>Operación</span>
              <span>Total</span>
              <span>Pago</span>
              <span />
            </div>
            {orders.map((order) => {
              const isOpen = selected?.id === order.id
              return (
                <article key={order.id} className="bg-[var(--color-panel)]">
                  <button
                    type="button"
                    onClick={() => setSelectedId((current) => (current === order.id ? null : order.id))}
                    aria-expanded={isOpen}
                    className="control-orders-list-row"
                    style={{ backgroundColor: isOpen ? 'rgba(37,47,55,0.045)' : 'transparent' }}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[11px] font-semibold leading-4 text-[var(--color-ink)]">{order.orderNumber}</p>
                      <p className="mt-0.5 truncate text-[10px] leading-3 text-[var(--color-muted)]">{order.customerName || 'Cliente sin nombre'}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-[10px] font-semibold leading-3 text-[var(--color-ink)]">{order.requiresShipping ? 'Envío físico' : 'Servicio sin envío'}</p>
                      <p className="mt-0.5 truncate text-[9px] leading-3 text-[var(--color-muted)]">{order.requiresShipping ? shippingStatusLabel(order.shippingStatus, isEnglish) : order.reservationNumber ?? (isEnglish ? 'No reservation' : 'Sin reservación')}</p>
                    </div>
                    <p className="text-[10px] font-semibold leading-3 text-[var(--color-ink)]">{financialAccess ? money(order.total, order.currency, locale) : (isEnglish ? 'No amounts' : 'Sin importes')}</p>
                    <div className="min-w-0">
                      <span className={`control-order-payment-chip ${paymentChipClass(order.status)}`}>
                        <span className="truncate">{statusLabel(order.status, locale)}</span>
                      </span>
                    </div>
                    <ChevronDown size={14} className={`justify-self-end text-[var(--color-muted)] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isOpen && selected ? (
                    <div className="control-orders-expanded border-t border-[var(--color-line)] px-4 py-3">
                      <div className="grid gap-3 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
                        <section className="rounded-lg border border-[var(--color-line)] bg-white p-3">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[var(--color-gold)]">Detalle</p>
                              <h4 className="mt-1 truncate text-sm font-semibold text-[var(--color-burgundy)]">{selected.orderNumber}</h4>
                              <p className="mt-0.5 truncate text-[10px] text-[var(--color-muted)]">{selected.customerName || 'Sin nombre'} · {selected.source || 'Centro de control'}</p>
                            </div>
                            <StatusBadge label={statusLabel(selected.status, locale)} />
                          </div>
                          <div className="mt-3 grid gap-2 sm:grid-cols-2">
                            <Detail label="Envío" value={shippingStatusLabel(selected.shippingStatus, isEnglish)} />
                            <Detail label="Pagado" value={financialAccess ? `${money(selected.paidAmount, selected.currency, locale)} de ${money(selected.total, selected.currency, locale)}` : (isEnglish ? 'Restricted access' : 'Acceso restringido')} />
                            <Detail label="Creada" value={dateLabel(selected.createdAt, locale)} />
                            <Detail label="Correo" value={selected.customerEmail || 'Sin correo'} />
                          </div>
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            <Action disabled={!writable || selected.status !== 'paid'} onClick={() => requestAction({ title: 'Marcar orden en proceso', message: 'La orden pasará a preparación operativa para seguimiento interno.', confirmLabel: 'Marcar en proceso', success: 'Orden marcada en proceso.', action: () => ordersClient.markProcessing(token, selected.id) })}>En proceso</Action>
                            <Action disabled={!writable || selected.status !== 'processing'} onClick={() => requestAction({ title: 'Completar orden', message: 'Confirma que la entrega o servicio asociado ya quedó atendido.', confirmLabel: 'Completar', success: 'Orden completada.', action: () => ordersClient.fulfill(token, selected.id) })}>Completar</Action>
                            <Action disabled={!writable || !['draft', 'pending_payment', 'paid', 'processing'].includes(selected.status)} onClick={() => requestAction({ title: 'Cancelar orden', message: 'La orden quedará cancelada y el cambio se registrará en historial.', confirmLabel: 'Cancelar orden', tone: 'danger', success: 'Orden cancelada.', action: () => ordersClient.cancel(token, selected.id, 'Cancelación desde Centro de Control') })}>Cancelar</Action>
                          </div>
                        </section>

                        <section className="rounded-lg border border-[var(--color-line)] bg-white p-3">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[var(--color-gold)]">{selected.requiresShipping ? 'Entrega' : 'Operación'}</p>
                              <h4 className="mt-1 text-xs font-semibold text-[var(--color-ink)]">{selected.requiresShipping ? 'Seguimiento de pedido' : 'Sin envío físico'}</h4>
                            </div>
                            <StatusBadge label={selected.requiresShipping ? selected.shippingStatus ?? 'not_required' : 'not_required'} />
                          </div>
                          {selected.requiresShipping ? (
                            <div className="mt-3 grid gap-2">
                              {selected.shippingAddress ? (
                                <div className="rounded-lg bg-[var(--color-soft)] p-2 text-[10px] leading-4 text-[var(--color-muted-strong)]">
                                  <p className="mb-1 flex items-center gap-1.5 font-semibold text-[var(--color-ink)]"><MapPin size={13} /> Domicilio</p>
                                  {selected.shippingAddress.recipientName}<br />
                                  {selected.shippingAddress.line1}{selected.shippingAddress.line2 ? `, ${selected.shippingAddress.line2}` : ''}<br />
                                  {selected.shippingAddress.neighborhood ? `${selected.shippingAddress.neighborhood}, ` : ''}{selected.shippingAddress.city}, {selected.shippingAddress.state} {selected.shippingAddress.postalCode}<br />
                                  {selected.shippingAddress.phone ? selected.shippingAddress.phone : ''}
                                </div>
                              ) : (
                                <p className="rounded-lg bg-[var(--color-soft)] p-2 text-[10px] text-[var(--color-muted)]">Sin domicilio registrado en la orden.</p>
                              )}
                              <div className="rounded-lg bg-[var(--color-soft)] p-2 text-[10px] text-[var(--color-muted-strong)]">
                                <p className="font-semibold text-[var(--color-ink)]">Guía</p>
                                <p className="mt-0.5">{selected.shipment?.carrier || 'Paquetería pendiente'} · {selected.shipment?.trackingNumber || 'Sin guía'}</p>
                                {selected.shipment?.trackingUrl ? (
                                  <a href={selected.shipment.trackingUrl} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1.5 text-[9px] font-semibold text-[var(--color-burgundy)]">
                                    Abrir rastreo <ExternalLink size={11} />
                                  </a>
                                ) : null}
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                <Action disabled={!writable || !['pending_preparation', 'preparing'].includes(selected.shippingStatus || '')} onClick={() => requestAction({ title: 'Preparar pedido', message: 'El pedido quedará marcado para preparación y empaque.', confirmLabel: 'Preparar', success: 'Pedido en preparación.', action: () => ordersClient.prepareShipping(token, selected.id) })}>Preparando</Action>
                                <Action disabled={!writable || !['pending_preparation', 'preparing', 'awaiting_tracking', 'tracking_assigned'].includes(selected.shippingStatus || '')} onClick={() => setTrackingOpen((current) => !current)}>Guía</Action>
                                <Action disabled={!writable || !['tracking_assigned'].includes(selected.shippingStatus || '')} onClick={() => requestAction({ title: 'Marcar como enviado', message: 'El cliente podrá consultar que el pedido ya salió a entrega.', confirmLabel: 'Marcar enviado', success: 'Pedido marcado como enviado.', action: () => ordersClient.ship(token, selected.id) })}>Enviado</Action>
                                <Action disabled={!writable || selected.shippingStatus !== 'shipped'} onClick={() => requestAction({ title: 'Marcar como entregado', message: 'Confirma que el pedido ya fue entregado al cliente.', confirmLabel: 'Marcar entregado', success: 'Pedido marcado como entregado.', action: () => ordersClient.deliver(token, selected.id) })}>Entregado</Action>
                              </div>
                              {trackingOpen ? (
                                <form onSubmit={submitTracking} className="grid gap-2 rounded-lg border border-[var(--color-line)] bg-[var(--color-panel-strong)] p-2 sm:grid-cols-3">
                                  <Input label="Paquetería" value={trackingForm.carrier} onChange={(value) => setTrackingForm((current) => ({ ...current, carrier: value }))} required />
                                  <Input label="Número de guía" value={trackingForm.trackingNumber} onChange={(value) => setTrackingForm((current) => ({ ...current, trackingNumber: value }))} required />
                                  <Input label="Enlace de rastreo" value={trackingForm.trackingUrl} onChange={(value) => setTrackingForm((current) => ({ ...current, trackingUrl: value }))} />
                                  <button type="submit" disabled={saving} className="min-h-8 rounded-lg bg-[var(--color-burgundy)] px-3 text-[10px] font-semibold text-white disabled:opacity-60 sm:col-span-3">Guardar guía</button>
                                </form>
                              ) : null}
                            </div>
                          ) : (
                            <div className="mt-3 grid gap-2 sm:grid-cols-3">
                              <Detail label="Tipo" value="Reservación, boleto o experiencia" />
                              <Detail label="Reservación" value={selected.reservationNumber ?? 'Sin reservación'} />
                              <Detail label="Guía" value="No requiere guía" />
                            </div>
                          )}
                        </section>

                        <section className="rounded-lg border border-[var(--color-line)] bg-white p-3 xl:col-span-2">
                          <h4 className="text-xs font-semibold text-[var(--color-ink)]">Partidas</h4>
                          <div className="mt-2 grid gap-2 md:grid-cols-2">
                            {items.length === 0 ? <p className="text-[10px] text-[var(--color-muted)]">Sin partidas cargadas.</p> : items.map((item) => (
                              <div key={item.id} className="grid grid-cols-[48px_minmax(0,1fr)] gap-2 rounded-lg bg-[var(--color-soft)] p-2">
                                <OrderItemImage item={item} />
                                <div className="min-w-0 self-center">
                                  <p className="truncate text-[11px] font-semibold leading-4 text-[var(--color-ink)]">{item.nameSnapshot}</p>
                                  <p className="mt-0.5 text-[10px] leading-3 text-[var(--color-muted)]">{item.quantity} x {money(item.unitPrice, 'MXN', locale)} = {money(item.subtotal, 'MXN', locale)}</p>
                                  {item.skuSnapshot ? <p className="mt-0.5 truncate text-[9px] font-semibold uppercase text-[var(--color-gold)]">{item.skuSnapshot}</p> : null}
                                </div>
                              </div>
                            ))}
                          </div>
                        </section>

                        {financialAccess ? (
                          <section className="rounded-lg border border-[var(--color-line)] bg-white p-3">
                            <h4 className="text-xs font-semibold text-[var(--color-ink)]">Pagos asociados</h4>
                            <div className="mt-2 space-y-2">
                              {payments.length === 0 ? <p className="text-[10px] text-[var(--color-muted)]">Sin pagos asociados.</p> : payments.map((payment) => (
                                <div key={payment.id} className="rounded-lg bg-[var(--color-soft)] p-2 text-[10px]">
                                  <p className="font-semibold text-[var(--color-ink)]">{paymentReferenceLabel(payment.paymentReference, payment.orderNumber, payment.id)}</p>
                                  <p className="mt-0.5 text-[9px] text-[var(--color-muted)]">{statusLabel(payment.status, locale)} · {money(payment.amount, payment.currency, locale)} · {dateLabel(payment.paidAt ?? payment.createdAt, locale)}</p>
                                </div>
                              ))}
                            </div>
                          </section>
                        ) : null}

                        <section className="rounded-lg border border-[var(--color-line)] bg-white p-3">
                          <h4 className="flex items-center gap-1.5 text-xs font-semibold text-[var(--color-ink)]"><FileClock size={14} /> Historial</h4>
                          <div className="mt-2 space-y-2">
                            {history.length === 0 ? <p className="text-[10px] text-[var(--color-muted)]">Sin historial registrado.</p> : history.map((item) => (
                              <button key={item.id} type="button" onClick={() => setSelectedHistoryItem(item)} className="w-full rounded-lg bg-[var(--color-soft)] p-2 text-left text-[10px] transition hover:bg-white">
                                <p className="font-semibold text-[var(--color-ink)]">{eventLabel(item.action, locale)}</p>
                                <p className="mt-0.5 text-[9px] text-[var(--color-muted)]">{dateLabel(item.createdAt, locale)} · {historyActorName(item.actorName, item.actorUserId, isEnglish)}</p>
                              </button>
                            ))}
                          </div>
                        </section>
                      </div>
                    </div>
                  ) : null}
                </article>
              )
            })}
          </div>
        )}
      </section>

      {formOpen ? (
        <div className="control-form-overlay fixed inset-0 z-[150] flex items-center justify-center bg-[#210711]/68 p-4 backdrop-blur-sm">
          <button type="button" aria-label="Cerrar" onClick={() => setFormOpen(false)} className="absolute inset-0 cursor-default" />
          <form onSubmit={submitOrder} className="control-form-surface relative z-10 max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-[1.5rem] border border-[var(--color-line)] bg-[var(--color-page)] p-6 shadow-[0_35px_90px_rgba(29,5,12,0.38)]" role="dialog" aria-modal="true" aria-label="Nueva orden">
            <div className="control-form-header mb-6 flex items-center justify-between">
              <h2 className="text-2xl text-[var(--color-burgundy)]" style={{ fontFamily: 'var(--font-display)' }}>Nueva orden</h2>
              <button type="button" onClick={() => setFormOpen(false)} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--color-line)] bg-white text-[var(--color-burgundy)]"><X size={18} /></button>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <ControlEntityPicker
                label="Cliente relacionado"
                value={form.customerId}
                options={customers.map((customer) => ({
                  id: customer.id,
                  label: customer.displayName,
                  description: [customer.email, customer.phone].filter(Boolean).join(' · ') || customer.customerNumber,
                  keywords: customer.customerNumber,
                }))}
                onChange={(customerId) => setForm({ ...form, customerId, reservationId: customerId && reservations.some((item) => item.id === form.reservationId && item.customerId !== customerId) ? '' : form.reservationId })}
                actionLabel="Crear cliente nuevo"
                onAction={() => setCustomerDialogOpen(true)}
                required
              />
              <ControlEntityPicker
                label="Reservación relacionada"
                value={form.reservationId}
                options={reservations
                  .filter((reservation) => !form.customerId || reservation.customerId === form.customerId)
                  .map((reservation) => ({
                    id: reservation.id,
                    label: reservation.reservationNumber,
                    description: `${reservation.customerName} · ${reservation.experienceTitle || 'Servicio'} · ${statusLabel(reservation.status)}`,
                  }))}
                onChange={(reservationId) => {
                  const reservation = reservations.find((item) => item.id === reservationId)
                  setForm({ ...form, reservationId, customerId: reservation?.customerId ?? form.customerId })
                }}
                emptyMessage={form.customerId ? 'Este cliente no tiene reservaciones' : 'Sin reservaciones'}
              />
              <label className="block"><span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">Canal de venta</span><CrystalSelect value={form.source} onChange={(source) => setForm({ ...form, source })}><option>Centro de control</option><option>Teléfono</option><option>WhatsApp</option><option>Mostrador</option><option>Agencia</option><option>Evento</option><option>Web</option><option>App</option><option>Otro</option></CrystalSelect></label>
              <Input label="Notas internas" value={form.internalNotes} onChange={(internalNotes) => setForm({ ...form, internalNotes })} />
            </div>
            <section className="mt-5 rounded-xl border border-[var(--color-line)] bg-white/60 p-4">
              <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="text-sm font-semibold text-[var(--color-ink)]">Partidas de la orden</h3><p className="mt-1 text-xs text-[var(--color-muted)]">Agrega vinos, experiencias, hospedaje, alimentos, servicios o conceptos libres.</p></div><button type="button" onClick={() => setForm((current) => ({ ...current, items: [...current.items, { id: crypto.randomUUID(), itemId: '', itemType: 'manual', name: '', sku: '', quantity: '1', unitPrice: '0' }] }))} className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-[var(--color-line)] px-3 text-xs font-semibold text-[var(--color-burgundy)]"><Plus size={14} />Agregar partida</button></div>
              <div className="space-y-3">
                {form.items.map((line, index) => (
                  <div key={line.id} className="grid gap-3 rounded-xl bg-[var(--color-soft)] p-3 md:grid-cols-[150px_minmax(180px,1fr)_130px_90px_130px_auto]">
                    <label><span className="mb-1 block text-[9px] font-semibold uppercase text-[var(--color-muted)]">Tipo</span><CrystalSelect value={line.itemType} onChange={(itemType) => setForm((current) => ({ ...current, items: current.items.map((item) => item.id === line.id ? { ...item, itemType, itemId: '', name: '', sku: '', unitPrice: '0' } : item) }))}><option value="manual">Concepto libre</option><option value="wine">Vino</option><option value="experience">Experiencia</option><option value="event">Evento</option><option value="lodging">Hospedaje</option><option value="restaurant">Alimentos</option><option value="service">Servicio</option></CrystalSelect></label>
                    {line.itemType === 'wine' ? <ControlEntityPicker label={`Vino ${index + 1}`} value={line.itemId} options={wines.map((wine) => ({ id: wine.id, label: String(wine.name ?? 'Vino'), description: `${String(wine.sku ?? 'Sin SKU')} · ${money(Number(wine.price ?? 0), 'MXN', locale)} · stock ${String(wine.stock_quantity ?? 0)}` }))} onChange={(itemId) => { const wine = wines.find((value) => value.id === itemId); setForm((current) => ({ ...current, items: current.items.map((item) => item.id === line.id ? { ...item, itemId, name: String(wine?.name ?? ''), sku: String(wine?.sku ?? ''), unitPrice: String(wine?.price ?? 0) } : item) })) }} required /> : <Input label={`Partida ${index + 1}`} value={line.name} onChange={(name) => setForm((current) => ({ ...current, items: current.items.map((item) => item.id === line.id ? { ...item, name } : item) }))} required />}
                    <Input label="SKU" value={line.sku} onChange={(sku) => setForm((current) => ({ ...current, items: current.items.map((item) => item.id === line.id ? { ...item, sku } : item) }))} />
                    <Input label="Cant." type="number" min="1" value={line.quantity} onChange={(quantity) => setForm((current) => ({ ...current, items: current.items.map((item) => item.id === line.id ? { ...item, quantity } : item) }))} required />
                    <Input label="Precio" type="number" min="0" value={line.unitPrice} onChange={(unitPrice) => setForm((current) => ({ ...current, items: current.items.map((item) => item.id === line.id ? { ...item, unitPrice } : item) }))} required />
                    <button type="button" aria-label="Quitar partida" disabled={form.items.length === 1} onClick={() => setForm((current) => ({ ...current, items: current.items.filter((item) => item.id !== line.id) }))} className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--color-line)] text-[var(--color-alert)] disabled:opacity-30 md:mt-5"><Trash2 size={15} /></button>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex justify-end"><div className="rounded-lg bg-white px-4 py-2 text-right"><p className="text-[10px] uppercase text-[var(--color-muted)]">Total de la orden</p><p className="text-xl font-semibold text-[var(--color-burgundy)]">{money(form.items.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unitPrice || 0), 0), 'MXN', locale)}</p></div></div>
            </section>
            <div className="control-form-actions mt-6">
              <button type="button" onClick={() => setFormOpen(false)} className="min-h-11 rounded-xl border border-[var(--color-line)] px-5 text-sm font-semibold text-[var(--color-muted-strong)]">Cancelar</button>
              <button type="submit" disabled={saving} className="min-h-11 rounded-xl bg-[var(--color-burgundy)] px-5 text-sm font-semibold text-white disabled:opacity-60">{saving ? 'Guardando...' : 'Crear orden'}</button>
            </div>
          </form>
        </div>
      ) : null}

      <QuickCustomerDialog
        open={customerDialogOpen}
        token={token}
        onClose={() => setCustomerDialogOpen(false)}
        onCreated={(customer) => {
          setCustomers((current) => [customer, ...current.filter((item) => item.id !== customer.id)])
          setForm((current) => ({ ...current, customerId: customer.id }))
          setToast('Cliente creado y seleccionado.')
        }}
      />

      {toast ? <Toast value={toast} onClose={() => setToast('')} /> : null}
      <ControlConfirmDialog
        open={Boolean(pendingAction)}
        title={pendingAction?.title ?? ''}
        message={pendingAction?.message ?? ''}
        confirmLabel={pendingAction?.confirmLabel}
        tone={pendingAction?.tone}
        busy={saving}
        onCancel={() => setPendingAction(null)}
        onConfirm={confirmPendingAction}
      />
      {selectedHistoryItem ? <OrderHistoryDialog item={selectedHistoryItem} order={selected} isEnglish={isEnglish} locale={locale} onClose={() => setSelectedHistoryItem(null)} /> : null}
    </div>
  )
}

type HistoryDisplayRow = {
  key: string
  label: string
  value: string
}

function historyActorName(actorName?: string | null, actorUserId?: string | null, isEnglish = false) {
  if (actorName?.trim()) return actorName.trim()
  if (actorUserId) return isEnglish ? 'Registered user' : 'Usuario registrado'
  return isEnglish ? 'System' : 'Sistema'
}

function yesNo(value: unknown, isEnglish: boolean) {
  return value === true ? (isEnglish ? 'Yes' : 'Sí') : value === false ? 'No' : (isEnglish ? 'Not registered' : 'No registrado')
}

function moneyFromAudit(value: unknown, currency: string | undefined, locale: string) {
  const amount = Number(value)
  if (!Number.isFinite(amount)) return locale.startsWith('en') ? 'Not registered' : 'No registrado'
  return money(amount, currency || 'MXN', locale)
}

function textFromAudit(value: unknown, fallback: string) {
  if (value === null || value === undefined || value === '') return fallback
  if (typeof value === 'boolean') return value ? 'Sí' : 'No'
  if (typeof value === 'object') return fallback
  return String(value)
}

function checkoutModeLabel(value: unknown, isEnglish: boolean) {
  const raw = String(value ?? '').toLowerCase()
  if (!raw) return isEnglish ? 'Not registered' : 'No registrado'
  if (raw.includes('experience')) return isEnglish ? 'Experience reservation' : 'Reservación de experiencia'
  if (raw.includes('wine')) return isEnglish ? 'Wine purchase' : 'Compra de vino'
  if (raw.includes('restaurant')) return isEnglish ? 'Restaurant reservation' : 'Reservación de restaurante'
  if (raw.includes('cabin') || raw.includes('lodging')) return isEnglish ? 'Cabin reservation' : 'Reservación de cabaña'
  return isEnglish ? 'Control Center checkout' : 'Checkout del Centro de Control'
}

function fulfillmentModeLabel(value: unknown, isEnglish: boolean) {
  const raw = String(value ?? '').toLowerCase()
  if (!raw) return isEnglish ? 'Not registered' : 'No registrado'
  if (raw.includes('onsite')) return isEnglish ? 'On-site service' : 'Servicio en sitio'
  if (raw.includes('shipping')) return isEnglish ? 'Home delivery' : 'Envío a domicilio'
  if (raw.includes('pickup')) return isEnglish ? 'Pickup' : 'Recolección'
  return isEnglish ? 'Operational delivery' : 'Entrega operativa'
}

function paymentStatusFromAudit(value: unknown, locale: string) {
  const raw = String(value ?? '')
  return raw ? statusLabel(raw, locale) : (locale.startsWith('en') ? 'Not registered' : 'No registrado')
}

function metadataSummaryRows(value: unknown, order: OrderRecord | null, isEnglish: boolean, locale: string): HistoryDisplayRow[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return []
  const metadata = value as Record<string, unknown>
  const rows: HistoryDisplayRow[] = []
  if (metadata.checkoutMode) rows.push({ key: 'checkoutMode', label: isEnglish ? 'Checkout type' : 'Tipo de compra', value: checkoutModeLabel(metadata.checkoutMode, isEnglish) })
  if (metadata.fulfillmentMode) rows.push({ key: 'fulfillmentMode', label: isEnglish ? 'Fulfillment' : 'Entrega', value: fulfillmentModeLabel(metadata.fulfillmentMode, isEnglish) })
  if (metadata.paymentStatus) rows.push({ key: 'paymentStatus', label: isEnglish ? 'Payment' : 'Pago', value: paymentStatusFromAudit(metadata.paymentStatus, locale) })
  if (metadata.menuTotal !== undefined) rows.push({ key: 'menuTotal', label: isEnglish ? 'Menu amount' : 'Importe de menú', value: moneyFromAudit(metadata.menuTotal, order?.currency, locale) })
  if (metadata.addonsTotal !== undefined) rows.push({ key: 'addonsTotal', label: isEnglish ? 'Add-ons amount' : 'Importe de extras', value: moneyFromAudit(metadata.addonsTotal, order?.currency, locale) })
  if (metadata.reservationId || metadata.reservation_id) rows.push({ key: 'reservationId', label: isEnglish ? 'Reservation' : 'Reservación', value: order?.reservationNumber ?? (isEnglish ? 'Linked reservation' : 'Reservación vinculada') })
  return rows
}

function orderHistoryRows(value: Record<string, unknown> | undefined, order: OrderRecord | null, isEnglish: boolean, locale: string): HistoryDisplayRow[] {
  const data = value ?? {}
  const currencyCode = String(data.currency ?? order?.currency ?? 'MXN')
  const rows: HistoryDisplayRow[] = []
  const add = (key: string, labelEs: string, labelEn: string, displayValue: string) => {
    if (!displayValue || displayValue === 'undefined') return
    rows.push({ key, label: isEnglish ? labelEn : labelEs, value: displayValue })
  }
  if ('status' in data) add('status', 'Estado de orden', 'Order status', statusLabel(String(data.status ?? ''), locale))
  if ('shipping_status' in data) add('shipping_status', 'Estado de envío', 'Shipping status', shippingStatusLabel(String(data.shipping_status ?? ''), isEnglish))
  if ('payment_status' in data) add('payment_status', 'Estado de pago', 'Payment status', paymentStatusFromAudit(data.payment_status, locale))
  if ('requires_shipping' in data) add('requires_shipping', 'Requiere envío', 'Requires shipping', yesNo(data.requires_shipping, isEnglish))
  if ('subtotal' in data) add('subtotal', 'Subtotal', 'Subtotal', moneyFromAudit(data.subtotal, currencyCode, locale))
  if ('discount_total' in data) add('discount_total', 'Descuentos', 'Discounts', moneyFromAudit(data.discount_total, currencyCode, locale))
  if ('tax_total' in data) add('tax_total', 'Impuestos', 'Taxes', moneyFromAudit(data.tax_total, currencyCode, locale))
  if ('shipping_total' in data) add('shipping_total', 'Envío', 'Shipping', moneyFromAudit(data.shipping_total, currencyCode, locale))
  if ('total' in data) add('total', 'Total', 'Total', moneyFromAudit(data.total, currencyCode, locale))
  if ('currency' in data) add('currency', 'Moneda', 'Currency', textFromAudit(data.currency, currencyCode))
  if ('source' in data) add('source', 'Canal', 'Channel', textFromAudit(data.source, isEnglish ? 'Not registered' : 'No registrado'))
  if ('customer_id' in data || 'user_id' in data) add('customer', 'Cliente', 'Customer', order?.customerName || (isEnglish ? 'Linked customer' : 'Cliente vinculado'))
  if ('reservation_id' in data) add('reservation', 'Reservación', 'Reservation', order?.reservationNumber ?? (isEnglish ? 'Linked reservation' : 'Reservación vinculada'))
  if ('created_by' in data || 'updated_by' in data) add('operator', 'Usuario interno', 'Internal user', historyActorName(undefined, String(data.updated_by ?? data.created_by ?? ''), isEnglish))
  if ('paid_at' in data) add('paid_at', 'Pago confirmado', 'Payment confirmed', dateLabel(String(data.paid_at ?? ''), locale))
  if ('cancelled_at' in data) add('cancelled_at', 'Cancelación', 'Cancellation', dateLabel(String(data.cancelled_at ?? ''), locale))
  if ('fulfilled_at' in data) add('fulfilled_at', 'Cierre operativo', 'Operational completion', dateLabel(String(data.fulfilled_at ?? ''), locale))
  if ('created_at' in data) add('created_at', 'Creación', 'Created', dateLabel(String(data.created_at ?? ''), locale))
  if ('updated_at' in data) add('updated_at', 'Actualización', 'Updated', dateLabel(String(data.updated_at ?? ''), locale))
  if ('cancellation_reason' in data) add('cancellation_reason', 'Motivo', 'Reason', textFromAudit(data.cancellation_reason, isEnglish ? 'No reason' : 'Sin motivo'))
  rows.push(...metadataSummaryRows(data.metadata, order, isEnglish, locale))
  return rows
}

function orderEntityLabel(value: string | null | undefined, isEnglish: boolean) {
  const type = String(value ?? '').toLowerCase()
  if (type === 'order') return isEnglish ? 'Order' : 'Orden'
  if (type === 'payment') return isEnglish ? 'Payment' : 'Pago'
  if (type === 'shipment') return isEnglish ? 'Shipment' : 'Envío'
  return isEnglish ? 'Operation' : 'Operación'
}

function OrderHistoryDialog({ item, order, isEnglish, locale, onClose }: { item: OrderHistoryRecord; order: OrderRecord | null; isEnglish: boolean; locale: string; onClose: () => void }) {
  const beforeRows = orderHistoryRows(item.beforeData, order, isEnglish, locale)
  const afterRows = orderHistoryRows(item.afterData, order, isEnglish, locale)
  return (
    <div className="control-form-overlay fixed inset-0 z-[150] flex items-center justify-center bg-[#210711]/68 p-4 backdrop-blur-sm">
      <button type="button" aria-label="Cerrar" onClick={onClose} className="absolute inset-0 cursor-default" />
      <section className="control-form-surface relative z-10 max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-[1.25rem] border border-[var(--color-line)] bg-[var(--color-page)] p-6 shadow-2xl" role="dialog" aria-modal="true" aria-label="Detalle de historial de orden">
        <div className="control-form-header mb-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-gold)]">{isEnglish ? 'Order history' : 'Historial de orden'}</p>
            <h2 className="mt-1 text-xl font-semibold text-[var(--color-burgundy)]">{eventLabel(item.action, locale)}</h2>
          </div>
          <button type="button" onClick={onClose} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--color-line)] bg-white text-[var(--color-burgundy)]" aria-label="Cerrar"><X size={18} /></button>
        </div>
        <div className="grid gap-3 text-xs md:grid-cols-3">
          <HistorySummary icon={FileClock} label={isEnglish ? 'What happened' : 'Qué pasó'} value={eventLabel(item.action, locale)} />
          <HistorySummary icon={UserRound} label={isEnglish ? 'Who did it' : 'Quién lo hizo'} value={historyActorName(item.actorName, item.actorUserId, isEnglish)} />
          <HistorySummary icon={Clock3} label={isEnglish ? 'When' : 'Cuándo'} value={dateLabel(item.createdAt, locale)} />
          <HistorySummary icon={ShoppingBag} label={isEnglish ? 'Order' : 'Orden'} value={order?.orderNumber ?? (isEnglish ? 'Linked order' : 'Orden vinculada')} />
          <HistorySummary icon={UserRound} label={isEnglish ? 'Customer' : 'Cliente'} value={order?.customerName ?? (isEnglish ? 'Linked customer' : 'Cliente vinculado')} />
          <HistorySummary icon={PackageCheck} label={isEnglish ? 'Area' : 'Área'} value={orderEntityLabel(item.entityType, isEnglish)} />
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <HistoryData title={isEnglish ? 'Before' : 'Antes'} rows={beforeRows} isEnglish={isEnglish} />
          <HistoryData title={isEnglish ? 'After' : 'Después'} rows={afterRows} isEnglish={isEnglish} />
        </div>
      </section>
    </div>
  )
}

function HistorySummary({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[var(--color-soft)] p-3">
      <div className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[linear-gradient(145deg,#5B0B1F,#33040F)] text-[#fff6e8]">
        <Icon size={15} />
      </div>
      <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--color-muted)]">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-[var(--color-ink)]">{value}</p>
    </div>
  )
}

function HistoryData({ title, rows, isEnglish }: { title: string; rows: HistoryDisplayRow[]; isEnglish: boolean }) {
  return (
    <div className="rounded-xl border border-[var(--color-line)] bg-white p-4 text-xs">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">{title}</p>
      {rows.length === 0 ? <p className="mt-3 text-[var(--color-muted)]">{isEnglish ? 'No visible operational changes.' : 'Sin cambios operativos visibles.'}</p> : (
        <div className="mt-3 space-y-2">
          {rows.map((row) => (
            <div key={row.key} className="rounded-lg bg-[var(--color-soft)] p-2">
              <p className="text-[10px] font-semibold uppercase text-[var(--color-muted)]">{row.label}</p>
              <p className="mt-1 break-words text-[var(--color-ink)]">{row.value}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Metric({ icon: Icon, label, value }: { icon: typeof ShoppingBag; label: string; value: string }) {
  return <article className="control-metric rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-panel)] shadow-[var(--shadow-card)]"><div className="flex items-center justify-between gap-3"><div><p className="text-[11px] text-[var(--color-muted)]">{label}</p><p className="control-metric__value font-semibold text-[var(--color-ink)]">{value}</p></div><span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-[var(--color-soft)] text-[var(--color-burgundy)]"><Icon size={16} /></span></div></article>
}

function OrderItemImage({ item }: { item: OrderItemRecord }) {
  const [failed, setFailed] = useState(false)
  if (item.imageUrl && !failed) {
    return (
      <img
        src={item.imageUrl}
        alt={item.nameSnapshot}
        loading="lazy"
        onError={() => setFailed(true)}
        className="h-12 w-12 rounded-lg border border-white/70 object-cover shadow-[0_8px_16px_rgba(29,5,12,0.1)]"
      />
    )
  }
  return (
    <span className="flex h-12 w-12 items-center justify-center rounded-lg border border-[var(--color-line)] bg-[var(--color-panel-strong)] text-[var(--color-burgundy)]">
      <ShoppingBag size={16} />
    </span>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg bg-[var(--color-soft)] p-2"><p className="text-[8px] uppercase tracking-[0.12em] text-[var(--color-muted)]">{label}</p><p className="mt-0.5 break-words text-[10px] font-semibold leading-3 text-[var(--color-ink)]">{value}</p></div>
}

function State({ title, text }: { title?: string; text: string }) {
  return <div className="p-8 text-center">{title ? <p className="text-sm font-semibold text-[var(--color-ink)]">{title}</p> : null}<p className="mt-2 text-[11px] text-[var(--color-muted)]">{text}</p></div>
}

function Action({ children, disabled, onClick }: { children: string; disabled?: boolean; onClick: () => void }) {
  return <button type="button" disabled={disabled} onClick={onClick} className="inline-flex min-h-8 items-center justify-center rounded-lg border border-[var(--color-line)] px-2.5 text-[10px] font-semibold text-[var(--color-burgundy)] disabled:opacity-50">{children}</button>
}

function Input({ label, value, onChange, type = 'text', min, required }: { label: string; value: string; onChange: (value: string) => void; type?: string; min?: string; required?: boolean }) {
  return <label className="block"><span className="mb-1 block text-[8px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">{label}</span><input type={type} min={min} required={required} value={value} onChange={(event) => onChange(event.target.value)} className="min-h-9 w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-panel-strong)] px-3 text-[11px] text-[var(--color-ink)] outline-none" /></label>
}

function Toast({ value, onClose }: { value: string; onClose: () => void }) {
  return <div className="fixed bottom-6 right-6 z-[140] rounded-[1rem] border border-[rgba(37,47,55,0.24)] bg-white p-4 text-sm font-semibold text-[#252F37] shadow-[0_22px_50px_rgba(45,22,14,0.18)]">{value}<button type="button" onClick={onClose} className="ml-4 text-[var(--color-muted)]"><X size={14} /></button></div>
}
