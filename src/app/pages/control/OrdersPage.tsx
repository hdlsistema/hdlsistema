import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { CheckCircle2, Download, ExternalLink, FileClock, MapPin, PackageCheck, Plus, RefreshCw, Search, Send, ShoppingBag, Trash2, Truck, X } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../../../contexts/AuthContext'
import { ordersClient, type OrderItemRecord, type OrderRecord, type PaymentRecord } from '../../../services/commerce.service'
import { adminContentClient, type ContentRecord } from '../../../services/content.service'
import { customersClient, type CustomerRecord } from '../../../services/customers.service'
import { reservationsClient, type ReservationRecord } from '../../../services/operations.service'
import { ControlConfirmDialog } from '../../components/control/ControlConfirmDialog'
import { ControlEntityPicker } from '../../components/control/ControlEntityPicker'
import { QuickCustomerDialog } from '../../components/control/QuickCustomerDialog'
import { SectionTitle } from '../../components/shared/SectionTitle'
import { StatusBadge } from '../../components/shared/StatusBadge'
import { CrystalSelect } from '../../components/shared/CrystalSelect'
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

function dateLabel(value?: string | null) {
  return dateTime(value)
}

function canWrite(roles: string[]) {
  return roles.some((role) => ['super_admin', 'admin', 'operations', 'finance'].includes(role))
}

function statusLabel(status: string) {
  return safeStatusLabel(status)
}

function shippingStatusLabel(status?: string | null) {
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
  return labels[status || 'not_required'] ?? safeStatusLabel(status)
}

type OrderHistoryRecord = { id: string; action: string; entityType: string; createdAt: string }
type PendingAction = {
  title: string
  message: string
  confirmLabel: string
  tone?: 'default' | 'danger'
  action: () => Promise<unknown>
  success: string
}

export function OrdersPage() {
  const { session, roles, financialAccess } = useAuth()
  const [searchParams] = useSearchParams()
  const token = session?.access_token
  const writable = canWrite(roles)
  const canCreateFinancialOrder = writable && financialAccess
  const [orders, setOrders] = useState<OrderRecord[]>([])
  const [items, setItems] = useState<OrderItemRecord[]>([])
  const [payments, setPayments] = useState<PaymentRecord[]>([])
  const [history, setHistory] = useState<OrderHistoryRecord[]>([])
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
    () => orders.find((order) => order.id === selectedId) ?? orders[0] ?? null,
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
      return
    }
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
          <button type="button" onClick={loadOrders} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--color-line)] bg-[var(--color-panel)] px-4 text-sm font-semibold text-[var(--color-ink)]"><RefreshCw size={16} />Reintentar</button>
          <button type="button" onClick={exportCsv} disabled={!financialAccess} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--color-line)] bg-[var(--color-panel)] px-4 text-sm font-semibold text-[var(--color-ink)] disabled:opacity-50"><Download size={16} />Exportar CSV</button>
          <button type="button" onClick={() => setFormOpen(true)} disabled={!canCreateFinancialOrder} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--color-burgundy)] px-5 text-sm font-semibold text-white disabled:opacity-50"><Plus size={16} />Nueva orden</button>
        </div>
      </div>

      <section className="control-metrics-strip grid gap-4 sm:grid-cols-3 xl:grid-cols-6">
        <Metric icon={ShoppingBag} label="Órdenes" value={String(orders.length)} />
        <Metric icon={CheckCircle2} label="Pagadas" value={String(metrics.paid)} />
        <Metric icon={PackageCheck} label="Total" value={financialAccess ? money(metrics.total) : 'Restringido'} />
        <Metric icon={Truck} label="Por preparar" value={String(metrics.preparation)} />
        <Metric icon={Send} label="Guía" value={String(metrics.tracking)} />
        <Metric icon={PackageCheck} label="Enviadas" value={String(metrics.shipped)} />
      </section>

      <section className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-panel)] p-4 shadow-[var(--shadow-card)]">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_220px_auto]">
          <label className="flex min-h-11 items-center gap-3 rounded-xl border border-[var(--color-line)] bg-[var(--color-panel-strong)] px-4">
            <Search size={16} className="text-[var(--color-muted)]" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar folio u origen..." className="min-w-0 flex-1 bg-transparent text-sm text-[var(--color-ink)] outline-none" />
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
          <button type="button" onClick={() => { setSearch(''); setStatus(''); setShippingStatus('') }} className="min-h-11 rounded-xl border border-[var(--color-line)] px-4 text-sm font-semibold text-[var(--color-burgundy)]">Limpiar</button>
        </div>
      </section>

      {error ? <div className="rounded-[var(--radius-card)] border border-[#ead8c5] bg-[#fff7ed] p-4 text-sm text-[#8a4b16]">{error}</div> : null}

      <section className="control-master-detail grid min-w-0 gap-5 xl:grid-cols-[minmax(360px,0.4fr)_minmax(0,0.6fr)]">
        <div className="control-master-list min-w-0 overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-panel)] shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between border-b border-[var(--color-line)] px-5 py-4">
            <h3 className="text-lg font-semibold text-[var(--color-ink)]">Órdenes</h3>
            <span className="rounded-full bg-[var(--color-soft)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">{orders.length} registros</span>
          </div>
          {loading ? <State text="Cargando órdenes..." /> : orders.length === 0 ? <State title="Sin órdenes" text="Crea una orden manual vinculada a un cliente registrado." /> : (
            <div className="divide-y divide-[var(--color-line)]">
              {orders.map((order) => (
                <button key={order.id} type="button" onClick={() => setSelectedId(order.id)} className="grid w-full gap-4 px-5 py-4 text-left lg:grid-cols-[1fr_0.7fr_0.6fr_auto]" style={{ backgroundColor: selected?.id === order.id ? 'rgba(180,138,85,0.12)' : 'transparent' }}>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[var(--color-ink)]">{order.orderNumber}</p>
                    <p className="mt-1 truncate text-xs text-[var(--color-muted)]">{order.customerName || 'Cliente sin nombre'}</p>
                  </div>
                  <p className="text-xs text-[var(--color-muted)]">{order.requiresShipping ? shippingStatusLabel(order.shippingStatus) : order.reservationNumber ?? 'Sin reservación'}</p>
                  <p className="text-xs font-semibold text-[var(--color-ink)]">{financialAccess ? money(order.total, order.currency) : 'Sin importes'}</p>
                  <StatusBadge label={order.status} />
                </button>
              ))}
            </div>
          )}
        </div>

        {selected ? (
          <aside className="control-detail-pane space-y-4">
            <article className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-panel)] p-5 shadow-[var(--shadow-card)]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-gold)]">Detalle</p>
              <h3 className="mt-2 text-2xl text-[var(--color-burgundy)]" style={{ fontFamily: 'var(--font-display)' }}>{selected.orderNumber}</h3>
              <div className="mt-5 grid gap-3">
                <Detail label="Cliente" value={selected.customerName || 'Sin nombre'} />
                <Detail label="Estado de orden" value={statusLabel(selected.status)} />
                <Detail label="Envío" value={shippingStatusLabel(selected.shippingStatus)} />
                <Detail label="Pagado" value={financialAccess ? `${money(selected.paidAmount, selected.currency)} de ${money(selected.total, selected.currency)}` : 'Acceso restringido'} />
                <Detail label="Creada" value={dateLabel(selected.createdAt)} />
                <Detail label="Canal" value={selected.source || 'Centro de Control'} />
                <Detail label="Correo" value={selected.customerEmail || 'Sin correo'} />
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <Action disabled={!writable || selected.status !== 'paid'} onClick={() => requestAction({ title: 'Marcar orden en proceso', message: 'La orden pasará a preparación operativa para seguimiento interno.', confirmLabel: 'Marcar en proceso', success: 'Orden marcada en proceso.', action: () => ordersClient.markProcessing(token, selected.id) })}>En proceso</Action>
                <Action disabled={!writable || selected.status !== 'processing'} onClick={() => requestAction({ title: 'Completar orden', message: 'Confirma que la entrega o servicio asociado ya quedó atendido.', confirmLabel: 'Completar', success: 'Orden completada.', action: () => ordersClient.fulfill(token, selected.id) })}>Completar</Action>
                <Action disabled={!writable || !['draft', 'pending_payment', 'paid', 'processing'].includes(selected.status)} onClick={() => requestAction({ title: 'Cancelar orden', message: 'La orden quedará cancelada y el cambio se registrará en historial.', confirmLabel: 'Cancelar orden', tone: 'danger', success: 'Orden cancelada.', action: () => ordersClient.cancel(token, selected.id, 'Cancelación desde Centro de Control') })}>Cancelar</Action>
              </div>
            </article>
            {selected.requiresShipping ? (
              <article className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-panel)] p-5 shadow-[var(--shadow-card)]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-gold)]">Entrega</p>
                    <h4 className="mt-1 text-lg font-semibold text-[var(--color-ink)]">Seguimiento de pedido</h4>
                  </div>
                  <StatusBadge label={selected.shippingStatus ?? 'not_required'} />
                </div>
                {selected.shippingAddress ? (
                  <div className="mt-4 rounded-xl bg-[var(--color-soft)] p-3 text-sm leading-6 text-[var(--color-muted-strong)]">
                    <p className="mb-1 flex items-center gap-2 font-semibold text-[var(--color-ink)]"><MapPin size={15} /> Domicilio</p>
                    {selected.shippingAddress.recipientName}<br />
                    {selected.shippingAddress.line1}{selected.shippingAddress.line2 ? `, ${selected.shippingAddress.line2}` : ''}<br />
                    {selected.shippingAddress.neighborhood ? `${selected.shippingAddress.neighborhood}, ` : ''}{selected.shippingAddress.city}, {selected.shippingAddress.state} {selected.shippingAddress.postalCode}<br />
                    {selected.shippingAddress.phone ? selected.shippingAddress.phone : ''}
                  </div>
                ) : (
                  <p className="mt-4 rounded-xl bg-[var(--color-soft)] p-3 text-sm text-[var(--color-muted)]">Sin domicilio registrado en la orden.</p>
                )}
                <div className="mt-4 rounded-xl bg-[var(--color-soft)] p-3 text-sm text-[var(--color-muted-strong)]">
                  <p className="font-semibold text-[var(--color-ink)]">Guía</p>
                  <p className="mt-1">{selected.shipment?.carrier || 'Paquetería pendiente'} · {selected.shipment?.trackingNumber || 'Sin guía'}</p>
                  {selected.shipment?.trackingUrl ? (
                    <a href={selected.shipment.trackingUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-2 text-xs font-semibold text-[var(--color-burgundy)]">
                      Abrir rastreo <ExternalLink size={13} />
                    </a>
                  ) : null}
                </div>
                <div className="mt-4 grid gap-2">
                  <Action disabled={!writable || !['pending_preparation', 'preparing'].includes(selected.shippingStatus || '')} onClick={() => requestAction({ title: 'Preparar pedido', message: 'El pedido quedará marcado para preparación y empaque.', confirmLabel: 'Preparar', success: 'Pedido en preparación.', action: () => ordersClient.prepareShipping(token, selected.id) })}>Marcar preparando</Action>
                  <Action disabled={!writable || !['pending_preparation', 'preparing', 'awaiting_tracking', 'tracking_assigned'].includes(selected.shippingStatus || '')} onClick={() => setTrackingOpen((current) => !current)}>Capturar guía</Action>
                  <Action disabled={!writable || !['tracking_assigned'].includes(selected.shippingStatus || '')} onClick={() => requestAction({ title: 'Marcar como enviado', message: 'El cliente podrá consultar que el pedido ya salió a entrega.', confirmLabel: 'Marcar enviado', success: 'Pedido marcado como enviado.', action: () => ordersClient.ship(token, selected.id) })}>Marcar enviado</Action>
                  <Action disabled={!writable || selected.shippingStatus !== 'shipped'} onClick={() => requestAction({ title: 'Marcar como entregado', message: 'Confirma que el pedido ya fue entregado al cliente.', confirmLabel: 'Marcar entregado', success: 'Pedido marcado como entregado.', action: () => ordersClient.deliver(token, selected.id) })}>Marcar entregado</Action>
                </div>
                {trackingOpen ? (
                  <form onSubmit={submitTracking} className="mt-4 grid gap-3 rounded-xl border border-[var(--color-line)] bg-[var(--color-panel-strong)] p-3">
                    <Input label="Paquetería" value={trackingForm.carrier} onChange={(value) => setTrackingForm((current) => ({ ...current, carrier: value }))} required />
                    <Input label="Número de guía" value={trackingForm.trackingNumber} onChange={(value) => setTrackingForm((current) => ({ ...current, trackingNumber: value }))} required />
                    <Input label="Enlace de rastreo" value={trackingForm.trackingUrl} onChange={(value) => setTrackingForm((current) => ({ ...current, trackingUrl: value }))} />
                    <button type="submit" disabled={saving} className="min-h-10 rounded-xl bg-[var(--color-burgundy)] px-4 text-xs font-semibold text-white disabled:opacity-60">Guardar guía</button>
                  </form>
                ) : null}
              </article>
            ) : (
              <article className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-panel)] p-5 shadow-[var(--shadow-card)]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-gold)]">Operación</p>
                    <h4 className="mt-1 text-lg font-semibold text-[var(--color-ink)]">Sin envío físico</h4>
                  </div>
                  <StatusBadge label="not_required" />
                </div>
                <div className="mt-4 grid gap-2">
                  <Detail label="Tipo" value="Reservación, boleto o experiencia" />
                  <Detail label="Reservación" value={selected.reservationNumber ?? 'Sin reservación'} />
                  <Detail label="Guía" value="No requiere guía" />
                </div>
              </article>
            )}
            <article className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-panel)] p-5 shadow-[var(--shadow-card)]">
              <h4 className="text-sm font-semibold text-[var(--color-ink)]">Partidas</h4>
              <div className="mt-4 space-y-3">
                {items.length === 0 ? <p className="text-sm text-[var(--color-muted)]">Sin partidas cargadas.</p> : items.map((item) => (
                  <div key={item.id} className="grid grid-cols-[76px_minmax(0,1fr)] gap-3 rounded-xl bg-[var(--color-soft)] p-3">
                    <OrderItemImage item={item} />
                    <div className="min-w-0 self-center">
                      <p className="truncate text-sm font-semibold text-[var(--color-ink)]">{item.nameSnapshot}</p>
                      <p className="mt-1 text-xs text-[var(--color-muted)]">{item.quantity} x {money(item.unitPrice)} = {money(item.subtotal)}</p>
                      {item.skuSnapshot ? <p className="mt-1 truncate text-[10px] font-semibold uppercase text-[var(--color-gold)]">{item.skuSnapshot}</p> : null}
                    </div>
                  </div>
                ))}
              </div>
            </article>
            {financialAccess ? (
              <article className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-panel)] p-5 shadow-[var(--shadow-card)]">
                <h4 className="text-sm font-semibold text-[var(--color-ink)]">Pagos asociados</h4>
                <div className="mt-4 space-y-3">
                  {payments.length === 0 ? <p className="text-sm text-[var(--color-muted)]">Sin pagos asociados.</p> : payments.map((payment) => (
                    <div key={payment.id} className="rounded-xl bg-[var(--color-soft)] p-3 text-sm">
                      <p className="font-semibold text-[var(--color-ink)]">{paymentReferenceLabel(payment.paymentReference, payment.orderNumber, payment.id)}</p>
                      <p className="mt-1 text-xs text-[var(--color-muted)]">{statusLabel(payment.status)} · {money(payment.amount, payment.currency)} · {dateLabel(payment.paidAt ?? payment.createdAt)}</p>
                    </div>
                  ))}
                </div>
              </article>
            ) : null}
            <article className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-panel)] p-5 shadow-[var(--shadow-card)]">
              <h4 className="flex items-center gap-2 text-sm font-semibold text-[var(--color-ink)]"><FileClock size={16} /> Historial</h4>
              <div className="mt-4 space-y-3">
                {history.length === 0 ? <p className="text-sm text-[var(--color-muted)]">Sin historial registrado.</p> : history.map((item) => (
                  <div key={item.id} className="rounded-xl bg-[var(--color-soft)] p-3 text-sm">
                    <p className="font-semibold text-[var(--color-ink)]">{eventLabel(item.action)}</p>
                    <p className="mt-1 text-xs text-[var(--color-muted)]">{dateLabel(item.createdAt)}</p>
                  </div>
                ))}
              </div>
            </article>
          </aside>
        ) : null}
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
                    {line.itemType === 'wine' ? <ControlEntityPicker label={`Vino ${index + 1}`} value={line.itemId} options={wines.map((wine) => ({ id: wine.id, label: String(wine.name ?? 'Vino'), description: `${String(wine.sku ?? 'Sin SKU')} · ${money(Number(wine.price ?? 0))} · stock ${String(wine.stock_quantity ?? 0)}` }))} onChange={(itemId) => { const wine = wines.find((value) => value.id === itemId); setForm((current) => ({ ...current, items: current.items.map((item) => item.id === line.id ? { ...item, itemId, name: String(wine?.name ?? ''), sku: String(wine?.sku ?? ''), unitPrice: String(wine?.price ?? 0) } : item) })) }} required /> : <Input label={`Partida ${index + 1}`} value={line.name} onChange={(name) => setForm((current) => ({ ...current, items: current.items.map((item) => item.id === line.id ? { ...item, name } : item) }))} required />}
                    <Input label="SKU" value={line.sku} onChange={(sku) => setForm((current) => ({ ...current, items: current.items.map((item) => item.id === line.id ? { ...item, sku } : item) }))} />
                    <Input label="Cant." type="number" min="1" value={line.quantity} onChange={(quantity) => setForm((current) => ({ ...current, items: current.items.map((item) => item.id === line.id ? { ...item, quantity } : item) }))} required />
                    <Input label="Precio" type="number" min="0" value={line.unitPrice} onChange={(unitPrice) => setForm((current) => ({ ...current, items: current.items.map((item) => item.id === line.id ? { ...item, unitPrice } : item) }))} required />
                    <button type="button" aria-label="Quitar partida" disabled={form.items.length === 1} onClick={() => setForm((current) => ({ ...current, items: current.items.filter((item) => item.id !== line.id) }))} className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--color-line)] text-[var(--color-alert)] disabled:opacity-30 md:mt-5"><Trash2 size={15} /></button>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex justify-end"><div className="rounded-lg bg-white px-4 py-2 text-right"><p className="text-[10px] uppercase text-[var(--color-muted)]">Total de la orden</p><p className="text-xl font-semibold text-[var(--color-burgundy)]">{money(form.items.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unitPrice || 0), 0))}</p></div></div>
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
        className="h-[76px] w-[76px] rounded-xl border border-white/70 object-cover shadow-[0_12px_24px_rgba(29,5,12,0.12)]"
      />
    )
  }
  return (
    <span className="flex h-[76px] w-[76px] items-center justify-center rounded-xl border border-[var(--color-line)] bg-[var(--color-panel-strong)] text-[var(--color-burgundy)]">
      <ShoppingBag size={24} />
    </span>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-[var(--color-soft)] p-3"><p className="text-[10px] uppercase tracking-[0.12em] text-[var(--color-muted)]">{label}</p><p className="mt-1 text-sm font-semibold text-[var(--color-ink)]">{value}</p></div>
}

function State({ title, text }: { title?: string; text: string }) {
  return <div className="p-8 text-center">{title ? <p className="text-lg font-semibold text-[var(--color-ink)]">{title}</p> : null}<p className="mt-2 text-sm text-[var(--color-muted)]">{text}</p></div>
}

function Action({ children, disabled, onClick }: { children: string; disabled?: boolean; onClick: () => void }) {
  return <button type="button" disabled={disabled} onClick={onClick} className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[var(--color-line)] px-3 text-xs font-semibold text-[var(--color-burgundy)] disabled:opacity-50">{children}</button>
}

function Input({ label, value, onChange, type = 'text', min, required }: { label: string; value: string; onChange: (value: string) => void; type?: string; min?: string; required?: boolean }) {
  return <label className="block"><span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">{label}</span><input type={type} min={min} required={required} value={value} onChange={(event) => onChange(event.target.value)} className="min-h-11 w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-panel-strong)] px-4 text-sm text-[var(--color-ink)] outline-none" /></label>
}

function Toast({ value, onClose }: { value: string; onClose: () => void }) {
  return <div className="fixed bottom-6 right-6 z-[140] rounded-[1rem] border border-[#cfddca] bg-white p-4 text-sm font-semibold text-[#5f7d63] shadow-[0_22px_50px_rgba(45,22,14,0.18)]">{value}<button type="button" onClick={onClose} className="ml-4 text-[var(--color-muted)]"><X size={14} /></button></div>
}
