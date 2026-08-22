import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  PackageCheck,
  Plus,
  RefreshCw,
  Truck,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { useAuth } from '../../../contexts/AuthContext'
import { ordersClient, type OrderRecord } from '../../../services/commerce.service'
import { shipmentsClient, type ShipmentRecord } from '../../../services/phase7e.service'
import { ControlConfirmDialog } from '../../components/control/ControlConfirmDialog'
import { ControlEntityPicker } from '../../components/control/ControlEntityPicker'
import { CrystalDateTimeField } from '../../components/shared/CrystalDateField'
import { CrystalSelect } from '../../components/shared/CrystalSelect'
import { SectionTitle } from '../../components/shared/SectionTitle'
import { dateTime, money, statusLabel as safeStatusLabel } from './controlCopy'
import { shipmentActionsFor } from './phase7e/operationsUtils'

const emptyForm = {
  orderId: '',
  carrier: '',
  serviceLevel: '',
  trackingNumber: '',
  trackingUrl: '',
  origin: 'Hacienda de Letras',
  destination: '',
  estimatedDeliveryAt: '',
  shippingCost: '0',
}

const secondary =
  'inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--color-line)] bg-white px-4 text-xs font-semibold text-[var(--color-burgundy)]'
const primary =
  'inline-flex min-h-10 items-center gap-2 rounded-xl bg-[var(--color-burgundy)] px-4 text-xs font-semibold text-white disabled:opacity-50'

function canWrite(roles: string[]) {
  return roles.some((role) => ['super_admin', 'admin', 'operations'].includes(role))
}

function shipmentStatus(value: string) {
  const labels: Record<string, string> = {
    not_required: 'No requiere envio',
    pending: 'Pendiente',
    pending_preparation: 'Por preparar',
    preparing: 'Preparando',
    ready: 'Lista para salida',
    awaiting_tracking: 'Esperando guia',
    tracking_assigned: 'Guia asignada',
    shipped: 'Enviada',
    in_transit: 'En transito',
    delivered: 'Entregada',
    failed: 'Incidencia',
    returned: 'Devuelta',
    cancelled: 'Cancelada',
  }
  return labels[value] ?? safeStatusLabel(value)
}

function shipmentTone(status: string) {
  if (['delivered', 'not_required'].includes(status)) {
    return 'border-[rgba(37,47,55,0.24)] bg-[rgba(37,47,55,0.08)] text-[var(--color-positive)]'
  }
  if (['failed', 'returned', 'cancelled'].includes(status)) {
    return 'border-[rgba(157,71,63,0.28)] bg-[rgba(157,71,63,0.08)] text-[var(--color-alert)]'
  }
  return 'border-[rgba(180,138,85,0.34)] bg-[rgba(180,138,85,0.13)] text-[var(--color-gold)]'
}

export function LogisticsPage() {
  const { session, roles, financialAccess } = useAuth()
  const token = session?.access_token
  const writable = canWrite(roles)
  const [shipments, setShipments] = useState<ShipmentRecord[]>([])
  const [orders, setOrders] = useState<OrderRecord[]>([])
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [selected, setSelected] = useState<ShipmentRecord | null>(null)
  const [pendingAction, setPendingAction] = useState<{
    title: string
    message: string
    label: string
    run: () => Promise<unknown>
  } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await shipmentsClient.list(token, { perPage: 100, status: status || undefined })
      setShipments(response.data)
      setSelected((current) => response.data.find((item) => item.id === current?.id) ?? response.data[0] ?? null)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'No fue posible cargar logistica.')
    } finally {
      setLoading(false)
    }
  }, [status, token])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!formOpen) return
    ordersClient
      .list(token, { perPage: 100 })
      .then((response) => setOrders(response.data.filter((order) => order.requiresShipping)))
      .catch(() => setError('No fue posible cargar ordenes.'))
  }, [formOpen, token])

  const metrics = useMemo(
    () => ({
      preparing: shipments.filter((item) => ['pending', 'pending_preparation', 'preparing', 'ready'].includes(item.status)).length,
      transit: shipments.filter((item) => ['shipped', 'in_transit'].includes(item.status)).length,
      delivered: shipments.filter((item) => item.status === 'delivered').length,
      incidents: shipments.reduce((sum, item) => sum + item.incidentCount, 0),
    }),
    [shipments],
  )

  const availableActions = shipmentActionsFor(selected?.status)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      const response = await shipmentsClient.create(token, {
        orderId: form.orderId,
        carrierId: null,
        carrier: form.carrier || null,
        serviceLevel: form.serviceLevel || null,
        trackingNumber: form.trackingNumber || null,
        trackingUrl: form.trackingUrl || null,
        origin: form.origin || null,
        destination: form.destination || null,
        estimatedDeliveryAt: form.estimatedDeliveryAt ? new Date(form.estimatedDeliveryAt).toISOString() : null,
        shippingCost: financialAccess ? Number(form.shippingCost) : 0,
        idempotencyKey: crypto.randomUUID(),
      })
      setSelected(response.data)
      setForm(emptyForm)
      setFormOpen(false)
      setToast(form.trackingNumber ? 'Envio creado y guia notificada al cliente.' : 'Envio creado.')
      await load()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'No fue posible crear el envio.')
    } finally {
      setSaving(false)
    }
  }

  async function confirmAction() {
    if (!pendingAction) return
    setSaving(true)
    try {
      await pendingAction.run()
      setToast('Logistica actualizada.')
      setPendingAction(null)
      await load()
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'No fue posible actualizar.')
    } finally {
      setSaving(false)
    }
  }

  function askStatus(next: string) {
    if (!selected) return
    setPendingAction({
      title: 'Actualizar envio',
      message: `${selected.shipmentNumber ?? 'El envio'} cambiara a ${shipmentStatus(next)}.`,
      label: 'Actualizar',
      run: () => shipmentsClient.status(token, selected.id, next),
    })
  }

  return (
    <div className="control-page control-page--logistics min-w-0 space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <SectionTitle
          eyebrow="Operacion interna"
          title="Logistica y entregas"
          subtitle="Preparacion, guias, transito, incidencias y confirmacion de entrega."
        />
        <div className="control-action-bar xl:justify-end">
          <button type="button" onClick={load} className={secondary}>
            <RefreshCw size={15} />
            Actualizar
          </button>
          <button type="button" disabled={!writable} onClick={() => setFormOpen(true)} className={primary}>
            <Plus size={15} />
            Nuevo envio
          </button>
        </div>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={PackageCheck} label="Preparacion" value={metrics.preparing} />
        <Metric icon={Truck} label="En transito" value={metrics.transit} />
        <Metric icon={CheckCircle2} label="Entregadas" value={metrics.delivered} />
        <Metric icon={AlertTriangle} label="Incidencias" value={metrics.incidents} />
      </section>

      <section className="rounded-xl border border-[var(--color-line)] bg-[var(--color-panel)] p-4 shadow-[var(--shadow-card)]">
        <CrystalSelect value={status} onChange={setStatus}>
          <option value="">Todos los estados</option>
          <option value="pending">Pendiente</option>
          <option value="pending_preparation">Por preparar</option>
          <option value="preparing">Preparando</option>
          <option value="ready">Lista</option>
          <option value="awaiting_tracking">Esperando guia</option>
          <option value="tracking_assigned">Guia asignada</option>
          <option value="shipped">Enviada</option>
          <option value="in_transit">En transito</option>
          <option value="delivered">Entregada</option>
          <option value="failed">Incidencia</option>
          <option value="returned">Devuelta</option>
          <option value="cancelled">Cancelada</option>
        </CrystalSelect>
      </section>

      {error ? <p className="rounded-xl border border-[#ead8c5] bg-[#fff7ed] p-4 text-sm text-[#8a4b16]">{error}</p> : null}

      <section className="grid min-w-0 gap-5 2xl:grid-cols-[minmax(0,1fr)_420px]">
        <article className="min-w-0 overflow-hidden rounded-xl border border-[var(--color-line)] bg-[var(--color-panel)] shadow-[var(--shadow-card)]">
          <header className="hidden border-b border-[var(--color-line)] bg-[rgba(37,47,55,0.05)] px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)] lg:grid lg:grid-cols-[minmax(220px,0.9fr)_minmax(160px,0.6fr)_minmax(320px,1.2fr)_150px]">
            <span>Envio</span>
            <span>Operacion</span>
            <span>Destino</span>
            <span className="text-right">Estado</span>
          </header>

          {loading ? (
            <div className="p-12">
              <Loader2 className="mx-auto animate-spin" />
            </div>
          ) : shipments.length === 0 ? (
            <div className="p-12 text-center text-sm text-[var(--color-muted)]">Sin envios registrados.</div>
          ) : (
            <div className="divide-y divide-[var(--color-line)]">
              {shipments.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelected(item)}
                  className={`grid w-full min-w-0 gap-3 px-5 py-4 text-left transition hover:bg-[rgba(180,138,85,0.08)] lg:grid-cols-[minmax(220px,0.9fr)_minmax(160px,0.6fr)_minmax(320px,1.2fr)_150px] lg:items-center ${
                    selected?.id === item.id ? 'border-l-4 border-[var(--color-gold)] bg-[var(--color-soft)] pl-4' : ''
                  }`}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[var(--color-text)]">{item.shipmentNumber ?? 'Envio'}</p>
                    <p className="mt-1 truncate text-xs text-[var(--color-muted)]">
                      {item.orderNumber ?? 'Sin orden'} · {item.customerName ?? 'Cliente'}
                    </p>
                  </div>

                  <div className="min-w-0 text-xs">
                    <p className="truncate font-medium text-[var(--color-text)]">{item.carrierName ?? 'Operacion propia'}</p>
                    <p className="mt-1 truncate text-[var(--color-muted)]">{item.trackingNumber ?? 'Sin guia'}</p>
                  </div>

                  <div className="min-w-0 text-xs">
                    <p className="line-clamp-2 text-[var(--color-text)]">{item.destination ?? 'Destino pendiente'}</p>
                    <p className="mt-1 text-[var(--color-muted)]">{financialAccess ? money(item.shippingCost) : 'Sin importes'}</p>
                  </div>

                  <ShipmentPill status={item.status} />
                </button>
              ))}
            </div>
          )}
        </article>

        {selected ? (
          <aside className="min-w-0 rounded-xl border border-[var(--color-line)] bg-[var(--color-panel)] p-5 shadow-[var(--shadow-card)] 2xl:sticky 2xl:top-4 2xl:self-start">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-gold)]">Detalle logistico</p>
                <h2 className="mt-2 truncate text-xl font-semibold text-[var(--color-burgundy)]">{selected.shipmentNumber ?? 'Envio'}</h2>
              </div>
              <ShipmentPill status={selected.status} compact />
            </div>

            <div className="mt-4 grid gap-2">
              <Detail label="Orden" value={selected.orderNumber ?? 'Sin orden'} />
              <Detail label="Cliente" value={selected.customerName ?? 'Sin cliente'} />
              <Detail label="Transportista" value={selected.carrierName ?? 'Operacion propia'} />
              <Detail label="Guia" value={selected.trackingNumber ?? 'Pendiente'} />
              <Detail label="Destino" value={selected.destination ?? 'Pendiente'} />
              <Detail label="Entrega estimada" value={dateTime(selected.estimatedDeliveryAt)} />
            </div>

            {selected.trackingUrl ? (
              <a
                href={selected.trackingUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex min-h-10 w-full items-center justify-center rounded-xl border border-[var(--color-line)] bg-white px-4 text-xs font-semibold text-[var(--color-burgundy)]"
              >
                Abrir rastreo
              </a>
            ) : null}

            <div className="mt-4 grid gap-2 sm:grid-cols-2 2xl:grid-cols-1">
              {availableActions.includes('preparing') ? <Tiny onClick={() => askStatus('preparing')}>Preparando</Tiny> : null}
              {availableActions.includes('ready') ? <Tiny onClick={() => askStatus('ready')}>Lista</Tiny> : null}
              {availableActions.includes('shipped') ? <Tiny onClick={() => askStatus('shipped')}>Enviar</Tiny> : null}
              {availableActions.includes('in_transit') ? <Tiny onClick={() => askStatus('in_transit')}>En transito</Tiny> : null}
              {availableActions.includes('delivered') ? (
                <Tiny
                  onClick={() =>
                    setPendingAction({
                      title: 'Confirmar entrega',
                      message: 'Confirma que el destinatario recibio el pedido.',
                      label: 'Entregado',
                      run: () => shipmentsClient.deliver(token, selected.id, 'Entrega confirmada desde Centro de Control'),
                    })
                  }
                >
                  Entregar
                </Tiny>
              ) : null}
              {availableActions.includes('cancelled') ? (
                <Tiny
                  onClick={() =>
                    setPendingAction({
                      title: 'Cancelar envio',
                      message: 'El envio quedara cancelado en el historial.',
                      label: 'Cancelar envio',
                      run: () => shipmentsClient.cancel(token, selected.id, 'Cancelacion desde Centro de Control'),
                    })
                  }
                >
                  Cancelar
                </Tiny>
              ) : null}
              {availableActions.length === 0 ? (
                <p className="rounded-xl bg-[var(--color-soft)] p-3 text-xs text-[var(--color-muted)]">
                  Este envio ya no tiene cambios pendientes.
                </p>
              ) : null}
            </div>
          </aside>
        ) : null}
      </section>

      {formOpen ? (
        <div className="control-form-overlay fixed inset-0 z-[150] flex items-center justify-center bg-[#210711]/68 p-4 backdrop-blur-sm">
          <button type="button" aria-label="Cerrar" className="absolute inset-0" onClick={() => setFormOpen(false)} />
          <form
            onSubmit={submit}
            className="control-form-surface relative z-10 w-full max-w-4xl rounded-2xl border border-[var(--color-line)] bg-[var(--color-page)] p-6 shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-label="Nuevo envio"
          >
            <header className="control-form-header mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-[var(--color-burgundy)]">Nuevo envio</h2>
                <p className="mt-1 text-xs text-[var(--color-muted)]">
                  Si capturas la guia, el cliente la vera en su app y recibira el aviso transaccional.
                </p>
              </div>
              <button type="button" onClick={() => setFormOpen(false)} aria-label="Cerrar">
                <X size={17} />
              </button>
            </header>

            <div className="grid gap-3 md:grid-cols-2">
              <ControlEntityPicker
                label="Orden"
                value={form.orderId}
                options={orders.map((order) => ({
                  id: order.id,
                  label: order.orderNumber,
                  description: financialAccess ? `${order.customerName} · ${money(order.total, order.currency)}` : order.customerName,
                }))}
                onChange={(orderId) => {
                  const order = orders.find((item) => item.id === orderId)
                  setForm({
                    ...form,
                    orderId,
                    destination: order?.shippingAddress
                      ? `${order.shippingAddress.line1}, ${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.postalCode}`
                      : form.destination,
                  })
                }}
                required
              />
              <Field label="Transportista" value={form.carrier} onChange={(carrier) => setForm({ ...form, carrier })} />
              <Field label="Nivel de servicio" value={form.serviceLevel} onChange={(serviceLevel) => setForm({ ...form, serviceLevel })} />
              <Field label="Numero de guia" value={form.trackingNumber} onChange={(trackingNumber) => setForm({ ...form, trackingNumber })} />
              <Field label="Enlace de rastreo" value={form.trackingUrl} onChange={(trackingUrl) => setForm({ ...form, trackingUrl })} />
              <Field label="Origen" value={form.origin} onChange={(origin) => setForm({ ...form, origin })} />
              <Field label="Destino" value={form.destination} onChange={(destination) => setForm({ ...form, destination })} required />
              <CrystalDateTimeField
                value={form.estimatedDeliveryAt}
                onChange={(estimatedDeliveryAt) => setForm({ ...form, estimatedDeliveryAt })}
                label="Entrega estimada"
              />
              {financialAccess ? (
                <Field label="Costo de envio" type="number" value={form.shippingCost} onChange={(shippingCost) => setForm({ ...form, shippingCost })} />
              ) : null}
              <div className="control-form-actions md:col-span-2">
                <button type="submit" disabled={saving} className={primary}>
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  Crear envio
                </button>
              </div>
            </div>
          </form>
        </div>
      ) : null}

      <ControlConfirmDialog
        open={Boolean(pendingAction)}
        title={pendingAction?.title ?? ''}
        message={pendingAction?.message ?? ''}
        confirmLabel={pendingAction?.label}
        busy={saving}
        onCancel={() => setPendingAction(null)}
        onConfirm={confirmAction}
      />

      {toast ? (
        <div className="fixed bottom-6 right-6 z-[180] rounded-xl border border-[rgba(37,47,55,0.24)] bg-white px-4 py-3 text-sm font-semibold text-[#252F37] shadow-xl">
          {toast}
          <button onClick={() => setToast('')} className="ml-3">
            <X size={14} />
          </button>
        </div>
      ) : null}
    </div>
  )
}

function ShipmentPill({ status, compact = false }: { status: string; compact?: boolean }) {
  return (
    <span
      className={`inline-flex shrink-0 self-center justify-self-start whitespace-nowrap rounded-full border font-semibold leading-none lg:justify-self-end ${
        compact ? 'px-2.5 py-1.5 text-[10px]' : 'min-w-[112px] justify-center px-3 py-2 text-[11px]'
      } ${shipmentTone(status)}`}
    >
      {shipmentStatus(status)}
    </span>
  )
}

function Metric({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: number }) {
  return (
    <article className="rounded-xl border border-[var(--color-line)] bg-[var(--color-panel)] p-4 shadow-[var(--shadow-card)]">
      <div className="flex justify-between">
        <div>
          <p className="text-[10px] uppercase text-[var(--color-muted)]">{label}</p>
          <p className="mt-1 text-2xl font-semibold">{value}</p>
        </div>
        <Icon size={18} className="text-[var(--color-burgundy)]" />
      </div>
    </article>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-[var(--color-soft)] p-3">
      <p className="text-[9px] uppercase text-[var(--color-muted)]">{label}</p>
      <p className="mt-1 break-words text-xs font-semibold">{value}</p>
    </div>
  )
}

function Tiny({ children, onClick }: { children: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="min-h-10 rounded-xl border border-[var(--color-line)] bg-white px-3 py-2 text-xs font-semibold text-[var(--color-burgundy)] transition hover:border-[var(--color-gold)] hover:bg-[var(--color-soft)]"
    >
      {children}
    </button>
  )
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  required,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  required?: boolean
}) {
  return (
    <label>
      <span className="mb-1 block text-[10px] font-semibold uppercase text-[var(--color-muted)]">
        {label}
        {required ? ' *' : ''}
      </span>
      <input
        type={type}
        min={type === 'number' ? '0' : undefined}
        required={required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-11 w-full rounded-xl border border-[var(--color-line)] bg-white px-3 text-sm outline-none"
      />
    </label>
  )
}
