import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { AlertCircle, Download, PackageCheck, Plus, RefreshCw, Search, Truck } from 'lucide-react'
import { useAuth } from '../../../contexts/AuthContext'
import { shipmentsClient, type ShipmentRecord } from '../../../services/phase7e.service'
import { SectionTitle } from '../../components/shared/SectionTitle'
import { StatusBadge } from '../../components/shared/StatusBadge'
import { ActionButton, Field, Metric, ModalForm, StateBlock } from './phase7e/ControlOperationsUi'
import { downloadCsv, formatDate, formatMoney, operationKey } from './phase7e/operationsUtils'

const emptyForm = { orderId: '', carrier: '', serviceLevel: '', trackingNumber: '', origin: '', destination: '', estimatedDeliveryAt: '', shippingCost: '0' }
const statusLabels: Record<string, string> = {
  pending: 'Pendiente',
  preparing: 'Preparando',
  ready: 'Listo',
  shipped: 'Enviado',
  in_transit: 'En tránsito',
  delivered: 'Entregado',
  failed: 'Incidencia',
  returned: 'Devuelto',
  cancelled: 'Cancelado',
}

function canWrite(roles: string[]) {
  return roles.some((role) => ['super_admin', 'admin', 'operations'].includes(role))
}

export function LogisticsOperationsPage() {
  const { session, roles } = useAuth()
  const token = session?.access_token
  const writable = canWrite(roles)
  const [shipments, setShipments] = useState<ShipmentRecord[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [incident, setIncident] = useState('')

  const selected = useMemo(() => shipments.find((item) => item.id === selectedId) ?? shipments[0] ?? null, [shipments, selectedId])
  const metrics = useMemo(() => ({
    active: shipments.filter((item) => !['delivered', 'cancelled', 'returned'].includes(item.status)).length,
    delivered: shipments.filter((item) => item.status === 'delivered').length,
    incidents: shipments.reduce((sum, item) => sum + item.incidentCount, 0),
  }), [shipments])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await shipmentsClient.list(token, { search: search || undefined, status: status || undefined, perPage: 100 })
      setShipments(response.data)
      setSelectedId((current) => current ?? response.data[0]?.id ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible cargar envíos.')
    } finally {
      setLoading(false)
    }
  }, [search, status, token])

  useEffect(() => {
    void load()
  }, [load])

  async function submitShipment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving) return
    setSaving(true)
    setError('')
    try {
      const response = await shipmentsClient.create(token, {
        orderId: form.orderId,
        carrier: form.carrier || undefined,
        serviceLevel: form.serviceLevel || undefined,
        trackingNumber: form.trackingNumber || undefined,
        origin: form.origin || undefined,
        destination: form.destination || undefined,
        estimatedDeliveryAt: form.estimatedDeliveryAt ? new Date(form.estimatedDeliveryAt).toISOString() : undefined,
        shippingCost: Number(form.shippingCost),
        idempotencyKey: operationKey('SHIPMENT'),
      })
      setSelectedId(response.data.id)
      setForm(emptyForm)
      setFormOpen(false)
      setToast('Envío creado en Supabase.')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible crear el envío.')
    } finally {
      setSaving(false)
    }
  }

  async function runStatus(nextStatus: string, label: string, confirmText: string) {
    if (!selected || !writable || saving) return
    if (!window.confirm(confirmText)) return
    setSaving(true)
    setError('')
    try {
      if (nextStatus === 'delivered') await shipmentsClient.deliver(token, selected.id, label)
      else if (nextStatus === 'cancelled') await shipmentsClient.cancel(token, selected.id, label)
      else await shipmentsClient.status(token, selected.id, nextStatus, label)
      setToast(label)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible actualizar el envío.')
    } finally {
      setSaving(false)
    }
  }

  async function registerIncident(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selected || !writable || saving) return
    if (!window.confirm('¿Registrar incidencia con historial?')) return
    setSaving(true)
    setError('')
    try {
      await shipmentsClient.incident(token, selected.id, incident)
      setIncident('')
      setToast('Incidencia registrada.')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible registrar la incidencia.')
    } finally {
      setSaving(false)
    }
  }

  async function exportCsv() {
    try {
      await downloadCsv(await shipmentsClient.exportCsv(token, { search: search || undefined, status: status || undefined }), 'envios-hacienda-de-letras.csv')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible exportar envíos.')
    }
  }

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <SectionTitle eyebrow="Operación" title="Logística" subtitle="Envíos reales, transportistas, guías, incidencias y evidencias auditables." />
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={load} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--color-line)] bg-[var(--color-panel)] px-4 text-sm font-semibold text-[var(--color-ink)]"><RefreshCw size={16} />Reintentar</button>
          <button type="button" onClick={exportCsv} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--color-line)] bg-[var(--color-panel)] px-4 text-sm font-semibold text-[var(--color-ink)]"><Download size={16} />Exportar CSV</button>
          <button type="button" onClick={() => setFormOpen(true)} disabled={!writable} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--color-burgundy)] px-5 text-sm font-semibold text-white disabled:opacity-50"><Plus size={16} />Crear envío</button>
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-3">
        <Metric icon={Truck} label="Envíos" value={String(shipments.length)} />
        <Metric icon={PackageCheck} label="Activos" value={String(metrics.active)} />
        <Metric icon={AlertCircle} label="Incidencias" value={String(metrics.incidents)} note={`${metrics.delivered} entregados`} />
      </section>

      <section className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-panel)] p-4 shadow-[var(--shadow-card)]">
        <div className="grid gap-3 md:grid-cols-[1fr_220px_auto]">
          <label className="flex min-h-11 items-center gap-3 rounded-xl border border-[var(--color-line)] bg-[var(--color-panel-strong)] px-4">
            <Search size={16} className="text-[var(--color-muted)]" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar folio, guía o transportista..." className="min-w-0 flex-1 bg-transparent text-sm text-[var(--color-ink)] outline-none" />
          </label>
          <select value={status} onChange={(event) => setStatus(event.target.value)} className="min-h-11 rounded-xl border border-[var(--color-line)] bg-[var(--color-panel-strong)] px-4 text-sm text-[var(--color-ink)]">
            <option value="">Todos los estados</option>
            {Object.entries(statusLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
          <button type="button" onClick={() => { setSearch(''); setStatus('') }} className="min-h-11 rounded-xl border border-[var(--color-line)] px-4 text-sm font-semibold text-[var(--color-burgundy)]">Limpiar</button>
        </div>
      </section>

      {error ? <div className="rounded-[var(--radius-card)] border border-[#ead8c5] bg-[#fff7ed] p-4 text-sm text-[#8a4b16]">{error}</div> : null}

      <section className="grid gap-5 2xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.9fr)]">
        <div className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-panel)] shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between border-b border-[var(--color-line)] px-5 py-4">
            <h3 className="text-lg font-semibold text-[var(--color-ink)]">Envíos reales</h3>
            <span className="rounded-full bg-[var(--color-soft)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">{shipments.length} registros</span>
          </div>
          {loading ? <StateBlock text="Cargando envíos reales..." /> : shipments.length === 0 ? <StateBlock title="Sin envíos reales" text="Crea un envío vinculado a una orden existente." /> : (
            <div className="divide-y divide-[var(--color-line)]">
              {shipments.map((item) => (
                <button key={item.id} type="button" onClick={() => setSelectedId(item.id)} className="grid w-full gap-4 px-5 py-4 text-left lg:grid-cols-[1fr_0.7fr_0.6fr_auto]" style={{ backgroundColor: selected?.id === item.id ? 'rgba(180,138,85,0.12)' : 'transparent' }}>
                  <div className="min-w-0"><p className="truncate text-sm font-semibold text-[var(--color-ink)]">{item.shipmentNumber ?? 'Envío sin folio'}</p><p className="mt-1 truncate text-xs text-[var(--color-muted)]">{item.orderNumber ?? 'Sin orden'} · {item.customerName ?? 'Sin cliente'}</p></div>
                  <p className="text-xs text-[var(--color-muted)]">{item.carrierName ?? 'Sin transportista'}</p>
                  <p className="text-xs font-semibold text-[var(--color-ink)]">{formatMoney(item.shippingCost)}</p>
                  <StatusBadge label={statusLabels[item.status] ?? item.status} />
                </button>
              ))}
            </div>
          )}
        </div>

        {selected ? (
          <aside className="space-y-4">
            <article className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-panel)] p-5 shadow-[var(--shadow-card)]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-gold)]">Detalle</p>
              <h3 className="mt-2 text-2xl text-[var(--color-burgundy)]" style={{ fontFamily: 'var(--font-display)' }}>{selected.shipmentNumber}</h3>
              <div className="mt-5 grid gap-3 text-sm text-[var(--color-muted-strong)]">
                <p>Guía: <strong>{selected.trackingNumber ?? 'Sin guía'}</strong></p>
                <p>Destino: <strong>{selected.destination ?? 'Sin destino'}</strong></p>
                <p>Entrega estimada: <strong>{formatDate(selected.estimatedDeliveryAt)}</strong></p>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <ActionButton disabled={!writable || selected.status !== 'pending'} onClick={() => runStatus('preparing', 'Envío en preparación.', '¿Marcar envío en preparación?')}>Preparar</ActionButton>
                <ActionButton disabled={!writable || selected.status !== 'preparing'} onClick={() => runStatus('ready', 'Envío listo.', '¿Marcar envío listo?')}>Listo</ActionButton>
                <ActionButton disabled={!writable || selected.status !== 'ready'} onClick={() => runStatus('shipped', 'Envío despachado.', '¿Despachar envío?')}>Enviar</ActionButton>
                <ActionButton disabled={!writable || !['shipped', 'in_transit'].includes(selected.status)} onClick={() => runStatus('delivered', 'Envío entregado.', '¿Marcar como entregado?')}>Entregar</ActionButton>
                <ActionButton disabled={!writable || ['delivered', 'cancelled'].includes(selected.status)} onClick={() => runStatus('cancelled', 'Envío cancelado.', '¿Cancelar envío?')}>Cancelar</ActionButton>
              </div>
            </article>
            <form onSubmit={registerIncident} className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-panel)] p-5 shadow-[var(--shadow-card)]">
              <h4 className="text-sm font-semibold text-[var(--color-ink)]">Incidencia</h4>
              <div className="mt-4 grid gap-3">
                <Field label="Detalle" value={incident} onChange={setIncident} required />
                <button type="submit" disabled={!writable || saving} className="min-h-11 rounded-xl bg-[var(--color-burgundy)] px-4 text-sm font-semibold text-white disabled:opacity-50">Registrar incidencia</button>
              </div>
            </form>
          </aside>
        ) : null}
      </section>

      {formOpen ? (
        <ModalForm title="Crear envío" onClose={() => setFormOpen(false)} onSubmit={submitShipment} saving={saving}>
          <Field label="ID de orden" value={form.orderId} onChange={(value) => setForm({ ...form, orderId: value })} required />
          <Field label="Transportista" value={form.carrier} onChange={(value) => setForm({ ...form, carrier: value })} />
          <Field label="Servicio" value={form.serviceLevel} onChange={(value) => setForm({ ...form, serviceLevel: value })} />
          <Field label="Guía" value={form.trackingNumber} onChange={(value) => setForm({ ...form, trackingNumber: value })} />
          <Field label="Origen" value={form.origin} onChange={(value) => setForm({ ...form, origin: value })} />
          <Field label="Destino" value={form.destination} onChange={(value) => setForm({ ...form, destination: value })} />
          <Field label="Entrega estimada" type="datetime-local" value={form.estimatedDeliveryAt} onChange={(value) => setForm({ ...form, estimatedDeliveryAt: value })} />
          <Field label="Costo" type="number" min="0" value={form.shippingCost} onChange={(value) => setForm({ ...form, shippingCost: value })} />
        </ModalForm>
      ) : null}

      {toast ? <div className="fixed bottom-6 right-6 z-[140] rounded-[1rem] border border-[#cfddca] bg-white p-4 text-sm font-semibold text-[#5f7d63] shadow-[0_22px_50px_rgba(45,22,14,0.18)]">{toast}</div> : null}
    </div>
  )
}
