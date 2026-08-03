import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Building2, Download, PackageCheck, Plus, RefreshCw, Search, Users } from 'lucide-react'
import { useAuth } from '../../../contexts/AuthContext'
import { distributorsClient, type DistributorOrderRecord, type DistributorRecord } from '../../../services/phase7e.service'
import { SectionTitle } from '../../components/shared/SectionTitle'
import { StatusBadge } from '../../components/shared/StatusBadge'
import { ActionButton, Field, Metric, ModalForm, StateBlock } from './phase7e/ControlOperationsUi'
import { downloadCsv, formatMoney, operationKey } from './phase7e/operationsUtils'

const emptyDistributor = { name: '', contactName: '', email: '', phone: '', zone: '', distributorType: 'wholesale', commercialTerms: '', priceListName: '', creditLimit: '0' }
const emptyOrder = { skuSnapshot: '', nameSnapshot: '', quantity: '1', unitPrice: '0' }
const statusLabels: Record<string, string> = {
  prospect: 'Prospecto',
  active: 'Activo',
  inactive: 'Inactivo',
  suspended: 'Suspendido',
  archived: 'Archivado',
  submitted: 'Enviado',
  approved: 'Aprobado',
  rejected: 'Rechazado',
  preparing: 'Preparando',
  shipped: 'Enviado',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
}

function canWrite(roles: string[]) {
  return roles.some((role) => ['super_admin', 'admin', 'operations'].includes(role))
}

function canApprove(roles: string[]) {
  return roles.some((role) => ['super_admin', 'admin', 'operations', 'finance'].includes(role))
}

export function DistributorsOperationsPage() {
  const { session, roles } = useAuth()
  const token = session?.access_token
  const writable = canWrite(roles)
  const approvable = canApprove(roles)
  const [distributors, setDistributors] = useState<DistributorRecord[]>([])
  const [orders, setOrders] = useState<DistributorOrderRecord[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [distributorOpen, setDistributorOpen] = useState(false)
  const [orderOpen, setOrderOpen] = useState(false)
  const [distributorForm, setDistributorForm] = useState(emptyDistributor)
  const [orderForm, setOrderForm] = useState(emptyOrder)

  const selected = useMemo(() => distributors.find((item) => item.id === selectedId) ?? distributors[0] ?? null, [distributors, selectedId])
  const selectedOrders = orders.filter((order) => order.distributorId === selected?.id)
  const active = distributors.filter((item) => item.status === 'active').length
  const total = orders.reduce((sum, item) => sum + item.total, 0)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [distributorResponse, orderResponse] = await Promise.all([
        distributorsClient.list(token, { search: search || undefined, status: status || undefined, perPage: 100 }),
        distributorsClient.orders(token, { perPage: 100 }),
      ])
      setDistributors(distributorResponse.data)
      setOrders(orderResponse.data)
      setSelectedId((current) => current ?? distributorResponse.data[0]?.id ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible cargar distribuidores.')
    } finally {
      setLoading(false)
    }
  }, [search, status, token])

  useEffect(() => {
    void load()
  }, [load])

  async function submitDistributor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving) return
    setSaving(true)
    setError('')
    try {
      const response = await distributorsClient.create(token, {
        name: distributorForm.name,
        contactName: distributorForm.contactName || undefined,
        email: distributorForm.email || undefined,
        phone: distributorForm.phone || undefined,
        zone: distributorForm.zone || undefined,
        distributorType: distributorForm.distributorType,
        operationalStatus: 'prospect',
        commercialTerms: distributorForm.commercialTerms || undefined,
        priceListName: distributorForm.priceListName || undefined,
        creditLimit: Number(distributorForm.creditLimit),
      })
      setSelectedId(response.data.id)
      setDistributorForm(emptyDistributor)
      setDistributorOpen(false)
      setToast('Distribuidor creado en Supabase.')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible crear el distribuidor.')
    } finally {
      setSaving(false)
    }
  }

  async function submitOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selected || saving) return
    setSaving(true)
    setError('')
    try {
      await distributorsClient.createOrder(token, {
        distributorId: selected.id,
        idempotencyKey: operationKey('DORDER'),
        items: [{
          skuSnapshot: orderForm.skuSnapshot || undefined,
          nameSnapshot: orderForm.nameSnapshot,
          quantity: Number(orderForm.quantity),
          unitPrice: Number(orderForm.unitPrice),
        }],
      })
      setOrderForm(emptyOrder)
      setOrderOpen(false)
      setToast('Pedido de distribuidor creado.')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible crear el pedido.')
    } finally {
      setSaving(false)
    }
  }

  async function runOrderAction(order: DistributorOrderRecord, action: string, label: string, confirmText: string) {
    if (saving) return
    if (!window.confirm(confirmText)) return
    setSaving(true)
    setError('')
    try {
      await distributorsClient.orderAction(token, order.id, action, label)
      setToast(label)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible actualizar el pedido.')
    } finally {
      setSaving(false)
    }
  }

  async function exportCsv() {
    try {
      await downloadCsv(await distributorsClient.exportCsv(token, { search: search || undefined, status: status || undefined }), 'distribuidores-hacienda-de-letras.csv')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible exportar distribuidores.')
    }
  }

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <SectionTitle eyebrow="Canal comercial" title="Distribuidores" subtitle="Distribuidores reales, contactos, condiciones, pedidos e historial operativo." />
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={load} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--color-line)] bg-[var(--color-panel)] px-4 text-sm font-semibold text-[var(--color-ink)]"><RefreshCw size={16} />Reintentar</button>
          <button type="button" onClick={exportCsv} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--color-line)] bg-[var(--color-panel)] px-4 text-sm font-semibold text-[var(--color-ink)]"><Download size={16} />Exportar CSV</button>
          <button type="button" onClick={() => setDistributorOpen(true)} disabled={!writable} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--color-burgundy)] px-5 text-sm font-semibold text-white disabled:opacity-50"><Plus size={16} />Distribuidor</button>
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-3">
        <Metric icon={Building2} label="Distribuidores" value={String(distributors.length)} />
        <Metric icon={Users} label="Activos" value={String(active)} />
        <Metric icon={PackageCheck} label="Pedidos" value={String(orders.length)} note={formatMoney(total)} />
      </section>

      <section className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-panel)] p-4 shadow-[var(--shadow-card)]">
        <div className="grid gap-3 md:grid-cols-[1fr_220px_auto]">
          <label className="flex min-h-11 items-center gap-3 rounded-xl border border-[var(--color-line)] bg-[var(--color-panel-strong)] px-4">
            <Search size={16} className="text-[var(--color-muted)]" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar distribuidor, folio o zona..." className="min-w-0 flex-1 bg-transparent text-sm text-[var(--color-ink)] outline-none" />
          </label>
          <select value={status} onChange={(event) => setStatus(event.target.value)} className="min-h-11 rounded-xl border border-[var(--color-line)] bg-[var(--color-panel-strong)] px-4 text-sm text-[var(--color-ink)]">
            <option value="">Todos los estados</option>
            <option value="prospect">Prospecto</option>
            <option value="active">Activo</option>
            <option value="inactive">Inactivo</option>
            <option value="suspended">Suspendido</option>
            <option value="archived">Archivado</option>
          </select>
          <button type="button" onClick={() => { setSearch(''); setStatus('') }} className="min-h-11 rounded-xl border border-[var(--color-line)] px-4 text-sm font-semibold text-[var(--color-burgundy)]">Limpiar</button>
        </div>
      </section>

      {error ? <div className="rounded-[var(--radius-card)] border border-[#ead8c5] bg-[#fff7ed] p-4 text-sm text-[#8a4b16]">{error}</div> : null}

      <section className="grid gap-5 2xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.9fr)]">
        <div className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-panel)] shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between border-b border-[var(--color-line)] px-5 py-4">
            <h3 className="text-lg font-semibold text-[var(--color-ink)]">Distribuidores reales</h3>
            <span className="rounded-full bg-[var(--color-soft)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">{distributors.length} registros</span>
          </div>
          {loading ? <StateBlock text="Cargando distribuidores reales..." /> : distributors.length === 0 ? <StateBlock title="Sin distribuidores reales" text="Da de alta un distribuidor operativo." /> : (
            <div className="divide-y divide-[var(--color-line)]">
              {distributors.map((item) => (
                <button key={item.id} type="button" onClick={() => setSelectedId(item.id)} className="grid w-full gap-4 px-5 py-4 text-left lg:grid-cols-[1fr_0.7fr_0.6fr_auto]" style={{ backgroundColor: selected?.id === item.id ? 'rgba(180,138,85,0.12)' : 'transparent' }}>
                  <div className="min-w-0"><p className="truncate text-sm font-semibold text-[var(--color-ink)]">{item.name}</p><p className="mt-1 truncate text-xs text-[var(--color-muted)]">{item.distributorNumber ?? 'Sin folio'} · {item.contactName ?? 'Sin contacto'}</p></div>
                  <p className="text-xs text-[var(--color-muted)]">{item.zone ?? 'Sin zona'}</p>
                  <p className="text-xs font-semibold text-[var(--color-ink)]">{item.priceListName ?? 'Sin lista'}</p>
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
              <h3 className="mt-2 text-2xl text-[var(--color-burgundy)]" style={{ fontFamily: 'var(--font-display)' }}>{selected.name}</h3>
              <div className="mt-5 grid gap-3 text-sm text-[var(--color-muted-strong)]">
                <p>Zona: <strong>{selected.zone ?? 'Sin zona'}</strong></p>
                <p>Condiciones: <strong>{selected.commercialTerms ?? 'No registradas'}</strong></p>
                <p>Límite de crédito: <strong>{formatMoney(selected.creditLimit)}</strong></p>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <ActionButton disabled={!writable} onClick={() => setOrderOpen(true)}>Nuevo pedido</ActionButton>
                <ActionButton disabled={!writable || selected.status === 'archived'} onClick={async () => {
                  if (!window.confirm('¿Archivar este distribuidor?')) return
                  await distributorsClient.archive(token, selected.id)
                  await load()
                }}>Archivar</ActionButton>
              </div>
            </article>
            <article className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-panel)] p-5 shadow-[var(--shadow-card)]">
              <h4 className="text-sm font-semibold text-[var(--color-ink)]">Pedidos</h4>
              <div className="mt-4 space-y-3">
                {selectedOrders.length === 0 ? <p className="text-sm text-[var(--color-muted)]">Sin pedidos para este distribuidor.</p> : selectedOrders.map((order) => (
                  <div key={order.id} className="rounded-xl bg-[var(--color-soft)] p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div><p className="text-sm font-semibold text-[var(--color-ink)]">{order.orderNumber}</p><p className="mt-1 text-xs text-[var(--color-muted)]">{formatMoney(order.total, order.currency)}</p></div>
                      <StatusBadge label={statusLabels[order.status] ?? order.status} />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <ActionButton disabled={!approvable || order.status !== 'submitted'} onClick={() => runOrderAction(order, 'approve', 'Pedido aprobado.', '¿Aprobar pedido?')}>Aprobar</ActionButton>
                      <ActionButton disabled={!approvable || !['draft', 'submitted'].includes(order.status)} onClick={() => runOrderAction(order, 'reject', 'Pedido rechazado.', '¿Rechazar pedido?')}>Rechazar</ActionButton>
                      <ActionButton disabled={!writable || order.status !== 'approved'} onClick={() => runOrderAction(order, 'prepare', 'Pedido en preparación.', '¿Preparar pedido?')}>Preparar</ActionButton>
                      <ActionButton disabled={!writable || order.status !== 'preparing'} onClick={() => runOrderAction(order, 'ship', 'Pedido enviado.', '¿Enviar pedido?')}>Enviar</ActionButton>
                      <ActionButton disabled={!writable || order.status !== 'shipped'} onClick={() => runOrderAction(order, 'deliver', 'Pedido entregado.', '¿Marcar entregado?')}>Entregar</ActionButton>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          </aside>
        ) : null}
      </section>

      {distributorOpen ? (
        <ModalForm title="Alta de distribuidor" onClose={() => setDistributorOpen(false)} onSubmit={submitDistributor} saving={saving}>
          <Field label="Nombre" value={distributorForm.name} onChange={(value) => setDistributorForm({ ...distributorForm, name: value })} required />
          <Field label="Contacto" value={distributorForm.contactName} onChange={(value) => setDistributorForm({ ...distributorForm, contactName: value })} />
          <Field label="Correo" type="email" value={distributorForm.email} onChange={(value) => setDistributorForm({ ...distributorForm, email: value })} />
          <Field label="Teléfono" value={distributorForm.phone} onChange={(value) => setDistributorForm({ ...distributorForm, phone: value })} />
          <Field label="Zona" value={distributorForm.zone} onChange={(value) => setDistributorForm({ ...distributorForm, zone: value })} />
          <Field label="Tipo" value={distributorForm.distributorType} onChange={(value) => setDistributorForm({ ...distributorForm, distributorType: value })} />
          <Field label="Condiciones" value={distributorForm.commercialTerms} onChange={(value) => setDistributorForm({ ...distributorForm, commercialTerms: value })} />
          <Field label="Lista de precios" value={distributorForm.priceListName} onChange={(value) => setDistributorForm({ ...distributorForm, priceListName: value })} />
          <Field label="Límite de crédito" type="number" min="0" value={distributorForm.creditLimit} onChange={(value) => setDistributorForm({ ...distributorForm, creditLimit: value })} />
        </ModalForm>
      ) : null}

      {orderOpen && selected ? (
        <ModalForm title="Pedido de distribuidor" onClose={() => setOrderOpen(false)} onSubmit={submitOrder} saving={saving}>
          <Field label="SKU" value={orderForm.skuSnapshot} onChange={(value) => setOrderForm({ ...orderForm, skuSnapshot: value })} />
          <Field label="Producto" value={orderForm.nameSnapshot} onChange={(value) => setOrderForm({ ...orderForm, nameSnapshot: value })} required />
          <Field label="Cantidad" type="number" min="1" value={orderForm.quantity} onChange={(value) => setOrderForm({ ...orderForm, quantity: value })} required />
          <Field label="Precio unitario" type="number" min="0" value={orderForm.unitPrice} onChange={(value) => setOrderForm({ ...orderForm, unitPrice: value })} required />
        </ModalForm>
      ) : null}

      {toast ? <div className="fixed bottom-6 right-6 z-[140] rounded-[1rem] border border-[#cfddca] bg-white p-4 text-sm font-semibold text-[#5f7d63] shadow-[0_22px_50px_rgba(45,22,14,0.18)]">{toast}</div> : null}
    </div>
  )
}
