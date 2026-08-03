import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { CheckCircle2, Download, PackageCheck, Plus, RefreshCw, Search, ShoppingBag, X } from 'lucide-react'
import { useAuth } from '../../../contexts/AuthContext'
import { ordersClient, type OrderItemRecord, type OrderRecord } from '../../../services/commerce.service'
import { SectionTitle } from '../../components/shared/SectionTitle'
import { StatusBadge } from '../../components/shared/StatusBadge'

type OrderForm = {
  customerId: string
  reservationId: string
  itemName: string
  sku: string
  quantity: string
  unitPrice: string
}

const emptyForm: OrderForm = {
  customerId: '',
  reservationId: '',
  itemName: '',
  sku: '',
  quantity: '1',
  unitPrice: '0',
}

function money(value: number, currency = 'MXN') {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency }).format(value)
}

function dateLabel(value?: string | null) {
  if (!value) return 'Sin fecha'
  return new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

function canWrite(roles: string[]) {
  return roles.some((role) => ['super_admin', 'admin', 'operations', 'finance'].includes(role))
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    draft: 'Borrador',
    pending_payment: 'Pendiente de pago',
    paid: 'Pagada',
    processing: 'En proceso',
    fulfilled: 'Completada',
    cancelled: 'Cancelada',
    refunded: 'Reembolsada',
  }
  return labels[status] ?? status
}

export function OrdersPage() {
  const { session, roles } = useAuth()
  const token = session?.access_token
  const writable = canWrite(roles)
  const [orders, setOrders] = useState<OrderRecord[]>([])
  const [items, setItems] = useState<OrderItemRecord[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState<OrderForm>(emptyForm)

  const selected = useMemo(
    () => orders.find((order) => order.id === selectedId) ?? orders[0] ?? null,
    [orders, selectedId],
  )

  const loadOrders = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await ordersClient.list(token, { search: search || undefined, status: status || undefined, perPage: 100 })
      setOrders(response.data)
      setSelectedId((current) => current ?? response.data[0]?.id ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible cargar órdenes.')
    } finally {
      setLoading(false)
    }
  }, [search, status, token])

  useEffect(() => {
    void loadOrders()
  }, [loadOrders])

  useEffect(() => {
    if (!selected) {
      setItems([])
      return
    }
    ordersClient.items(token, selected.id).then((response) => setItems(response.data)).catch(() => setItems([]))
  }, [selected, token])

  const metrics = useMemo(() => ({
    paid: orders.filter((order) => order.status === 'paid').length,
    pending: orders.filter((order) => order.status === 'pending_payment').length,
    total: orders.reduce((sum, order) => sum + order.total, 0),
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
        source: 'Centro de control',
        idempotencyKey: crypto.randomUUID(),
        items: [{
          itemType: 'manual',
          nameSnapshot: form.itemName,
          skuSnapshot: form.sku || null,
          quantity: Number(form.quantity),
          unitPrice: Number(form.unitPrice),
        }],
      })
      setSelectedId(response.data.id)
      setForm(emptyForm)
      setFormOpen(false)
      setToast('Orden creada en Supabase.')
      await loadOrders()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible crear la orden.')
    } finally {
      setSaving(false)
    }
  }

  const runAction = async (message: string, action: () => Promise<unknown>, confirmMessage: string) => {
    if (!writable || saving) return
    if (!window.confirm(confirmMessage)) return
    setSaving(true)
    try {
      await action()
      setToast(message)
      await loadOrders()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible completar la acción.')
    } finally {
      setSaving(false)
    }
  }

  const exportCsv = async () => {
    try {
      const response = await ordersClient.exportCsv(token, { search: search || undefined, status: status || undefined })
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
    <div className="min-w-0 space-y-6">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <SectionTitle eyebrow="Operación" title="Órdenes" subtitle="Órdenes, partidas, pagos asociados e historial real desde Supabase." />
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={loadOrders} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--color-line)] bg-[var(--color-panel)] px-4 text-sm font-semibold text-[var(--color-ink)]"><RefreshCw size={16} />Reintentar</button>
          <button type="button" onClick={exportCsv} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--color-line)] bg-[var(--color-panel)] px-4 text-sm font-semibold text-[var(--color-ink)]"><Download size={16} />Exportar CSV</button>
          <button type="button" onClick={() => setFormOpen(true)} disabled={!writable} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--color-burgundy)] px-5 text-sm font-semibold text-white disabled:opacity-50"><Plus size={16} />Nueva orden</button>
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-3">
        <Metric icon={ShoppingBag} label="Órdenes" value={String(orders.length)} />
        <Metric icon={CheckCircle2} label="Pagadas" value={String(metrics.paid)} />
        <Metric icon={PackageCheck} label="Total" value={money(metrics.total)} />
      </section>

      <section className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-panel)] p-4 shadow-[var(--shadow-card)]">
        <div className="grid gap-3 md:grid-cols-[1fr_220px_auto]">
          <label className="flex min-h-11 items-center gap-3 rounded-xl border border-[var(--color-line)] bg-[var(--color-panel-strong)] px-4">
            <Search size={16} className="text-[var(--color-muted)]" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar folio u origen..." className="min-w-0 flex-1 bg-transparent text-sm text-[var(--color-ink)] outline-none" />
          </label>
          <select value={status} onChange={(event) => setStatus(event.target.value)} className="min-h-11 rounded-xl border border-[var(--color-line)] bg-[var(--color-panel-strong)] px-4 text-sm text-[var(--color-ink)]">
            <option value="">Todos los estados</option>
            <option value="pending_payment">Pendiente de pago</option>
            <option value="paid">Pagada</option>
            <option value="processing">En proceso</option>
            <option value="fulfilled">Completada</option>
            <option value="cancelled">Cancelada</option>
            <option value="refunded">Reembolsada</option>
          </select>
          <button type="button" onClick={() => { setSearch(''); setStatus('') }} className="min-h-11 rounded-xl border border-[var(--color-line)] px-4 text-sm font-semibold text-[var(--color-burgundy)]">Limpiar</button>
        </div>
      </section>

      {error ? <div className="rounded-[var(--radius-card)] border border-[#ead8c5] bg-[#fff7ed] p-4 text-sm text-[#8a4b16]">{error}</div> : null}

      <section className="grid min-w-0 gap-5 2xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.9fr)]">
        <div className="min-w-0 overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-panel)] shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between border-b border-[var(--color-line)] px-5 py-4">
            <h3 className="text-lg font-semibold text-[var(--color-ink)]">Órdenes reales</h3>
            <span className="rounded-full bg-[var(--color-soft)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">{orders.length} registros</span>
          </div>
          {loading ? <State text="Cargando órdenes reales..." /> : orders.length === 0 ? <State title="Sin órdenes reales" text="Crea una orden manual vinculada a un cliente real." /> : (
            <div className="divide-y divide-[var(--color-line)]">
              {orders.map((order) => (
                <button key={order.id} type="button" onClick={() => setSelectedId(order.id)} className="grid w-full gap-4 px-5 py-4 text-left lg:grid-cols-[1fr_0.7fr_0.6fr_auto]" style={{ backgroundColor: selected?.id === order.id ? 'rgba(180,138,85,0.12)' : 'transparent' }}>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[var(--color-ink)]">{order.orderNumber}</p>
                    <p className="mt-1 truncate text-xs text-[var(--color-muted)]">{order.customerName || 'Cliente sin nombre'}</p>
                  </div>
                  <p className="text-xs text-[var(--color-muted)]">{order.reservationNumber ?? 'Sin reservación'}</p>
                  <p className="text-xs font-semibold text-[var(--color-ink)]">{money(order.total, order.currency)}</p>
                  <StatusBadge label={statusLabel(order.status)} />
                </button>
              ))}
            </div>
          )}
        </div>

        {selected ? (
          <aside className="space-y-4">
            <article className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-panel)] p-5 shadow-[var(--shadow-card)]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-gold)]">Detalle</p>
              <h3 className="mt-2 text-2xl text-[var(--color-burgundy)]" style={{ fontFamily: 'var(--font-display)' }}>{selected.orderNumber}</h3>
              <div className="mt-5 grid gap-3">
                <Detail label="Cliente" value={selected.customerName || 'Sin nombre'} />
                <Detail label="Estado" value={statusLabel(selected.status)} />
                <Detail label="Pagado" value={`${money(selected.paidAmount, selected.currency)} de ${money(selected.total, selected.currency)}`} />
                <Detail label="Creada" value={dateLabel(selected.createdAt)} />
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <Action disabled={!writable || selected.status !== 'paid'} onClick={() => runAction('Orden marcada en proceso.', () => ordersClient.markProcessing(token, selected.id), '¿Marcar esta orden como en proceso?')}>En proceso</Action>
                <Action disabled={!writable || selected.status !== 'processing'} onClick={() => runAction('Orden completada.', () => ordersClient.fulfill(token, selected.id), '¿Completar esta orden?')}>Completar</Action>
                <Action disabled={!writable || !['draft', 'pending_payment', 'paid', 'processing'].includes(selected.status)} onClick={() => runAction('Orden cancelada.', () => ordersClient.cancel(token, selected.id, 'Cancelación desde Centro de Control'), '¿Cancelar esta orden?')}>Cancelar</Action>
              </div>
            </article>
            <article className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-panel)] p-5 shadow-[var(--shadow-card)]">
              <h4 className="text-sm font-semibold text-[var(--color-ink)]">Partidas</h4>
              <div className="mt-4 space-y-3">
                {items.length === 0 ? <p className="text-sm text-[var(--color-muted)]">Sin partidas cargadas.</p> : items.map((item) => (
                  <div key={item.id} className="rounded-xl bg-[var(--color-soft)] p-3">
                    <p className="text-sm font-semibold text-[var(--color-ink)]">{item.nameSnapshot}</p>
                    <p className="mt-1 text-xs text-[var(--color-muted)]">{item.quantity} x {money(item.unitPrice)} = {money(item.subtotal)}</p>
                  </div>
                ))}
              </div>
            </article>
          </aside>
        ) : null}
      </section>

      {formOpen ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[#210711]/68 p-4 backdrop-blur-sm">
          <button type="button" aria-label="Cerrar" onClick={() => setFormOpen(false)} className="absolute inset-0 cursor-default" />
          <form onSubmit={submitOrder} className="relative z-10 w-full max-w-2xl rounded-[1.5rem] border border-[var(--color-line)] bg-[var(--color-page)] p-6 shadow-[0_35px_90px_rgba(29,5,12,0.38)]">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl text-[var(--color-burgundy)]" style={{ fontFamily: 'var(--font-display)' }}>Nueva orden</h2>
              <button type="button" onClick={() => setFormOpen(false)} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--color-line)] bg-white text-[var(--color-burgundy)]"><X size={18} /></button>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Input label="ID de cliente" value={form.customerId} onChange={(value) => setForm({ ...form, customerId: value })} required />
              <Input label="ID de reservación" value={form.reservationId} onChange={(value) => setForm({ ...form, reservationId: value })} />
              <Input label="Partida" value={form.itemName} onChange={(value) => setForm({ ...form, itemName: value })} required />
              <Input label="SKU" value={form.sku} onChange={(value) => setForm({ ...form, sku: value })} />
              <Input label="Cantidad" type="number" min="1" value={form.quantity} onChange={(value) => setForm({ ...form, quantity: value })} required />
              <Input label="Precio unitario" type="number" min="0" value={form.unitPrice} onChange={(value) => setForm({ ...form, unitPrice: value })} required />
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setFormOpen(false)} className="min-h-11 rounded-xl border border-[var(--color-line)] px-5 text-sm font-semibold text-[var(--color-muted-strong)]">Cancelar</button>
              <button type="submit" disabled={saving} className="min-h-11 rounded-xl bg-[var(--color-burgundy)] px-5 text-sm font-semibold text-white disabled:opacity-60">{saving ? 'Guardando...' : 'Crear orden'}</button>
            </div>
          </form>
        </div>
      ) : null}

      {toast ? <Toast value={toast} onClose={() => setToast('')} /> : null}
    </div>
  )
}

function Metric({ icon: Icon, label, value }: { icon: typeof ShoppingBag; label: string; value: string }) {
  return <article className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-panel)] p-5 shadow-[var(--shadow-card)]"><div className="flex items-start justify-between gap-4"><div><p className="text-xs text-[var(--color-muted)]">{label}</p><p className="mt-3 text-3xl text-[var(--color-ink)]" style={{ fontFamily: 'var(--font-display)' }}>{value}</p></div><span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-soft)] text-[var(--color-burgundy)]"><Icon size={18} /></span></div></article>
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
