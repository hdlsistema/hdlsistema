import { Building2, Loader2, PackageCheck, Plus, RefreshCw, ShoppingBag, UsersRound, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { useAuth } from '../../../contexts/AuthContext'
import { distributorsClient, type DistributorOrderRecord, type DistributorRecord } from '../../../services/phase7e.service'
import { ControlEntityPicker } from '../../components/control/ControlEntityPicker'
import { CrystalSelect } from '../../components/shared/CrystalSelect'
import { SectionTitle } from '../../components/shared/SectionTitle'
import { StatusBadge } from '../../components/shared/StatusBadge'
import { dateTime, money, statusLabel as safeStatusLabel } from './controlCopy'

const emptyDistributor = { name: '', contactName: '', email: '', phone: '', address: '', taxId: '', zone: '', distributorType: 'wholesale', operationalStatus: 'prospect', commercialTerms: '', priceListName: '', creditLimit: '0', notes: '' }
const emptyOrder = { distributorId: '', name: '', sku: '', quantity: '1', unitPrice: '0' }
function canWrite(roles: string[]) { return roles.some((role) => ['super_admin', 'admin', 'operations', 'finance'].includes(role)) }
function distributorStatus(value: string) { const labels: Record<string, string> = { prospect: 'Prospecto', active: 'Activo', inactive: 'Inactivo', suspended: 'Suspendido', archived: 'Archivado' }; return labels[value] ?? safeStatusLabel(value) }
function orderStatus(value: string) { const labels: Record<string, string> = { draft: 'Borrador', submitted: 'Solicitado', approved: 'Aprobado', rejected: 'Rechazado', preparing: 'Preparando', shipped: 'Enviado', delivered: 'Entregado', cancelled: 'Cancelado' }; return labels[value] ?? safeStatusLabel(value) }

export function DistributorsPage() {
  const { session, roles } = useAuth()
  const token = session?.access_token
  const writable = canWrite(roles)
  const [distributors, setDistributors] = useState<DistributorRecord[]>([])
  const [orders, setOrders] = useState<DistributorOrderRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [modal, setModal] = useState<'distributor' | 'order' | null>(null)
  const [distributorForm, setDistributorForm] = useState(emptyDistributor)
  const [orderForm, setOrderForm] = useState(emptyOrder)

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try { const [partnerResponse, orderResponse] = await Promise.all([distributorsClient.list(token, { perPage: 100 }), distributorsClient.orders(token, { perPage: 100 })]); setDistributors(partnerResponse.data); setOrders(orderResponse.data) }
    catch (loadError) { setError(loadError instanceof Error ? loadError.message : 'No fue posible cargar distribuidores.') }
    finally { setLoading(false) }
  }, [token])
  useEffect(() => { void load() }, [load])

  const metrics = useMemo(() => ({ active: distributors.filter((item) => item.status === 'active').length, prospects: distributors.filter((item) => item.status === 'prospect').length, openOrders: orders.filter((item) => !['delivered', 'cancelled', 'rejected'].includes(item.status)).length, sales: orders.reduce((sum, item) => sum + item.total, 0) }), [distributors, orders])

  async function submitDistributor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError('')
    try { await distributorsClient.create(token, { ...distributorForm, email: distributorForm.email || null, phone: distributorForm.phone || null, address: distributorForm.address || null, taxId: distributorForm.taxId || null, zone: distributorForm.zone || null, commercialTerms: distributorForm.commercialTerms || null, priceListName: distributorForm.priceListName || null, creditLimit: Number(distributorForm.creditLimit), notes: distributorForm.notes || null }); setDistributorForm(emptyDistributor); setModal(null); setToast('Distribuidor creado.'); await load() }
    catch (submitError) { setError(submitError instanceof Error ? submitError.message : 'No fue posible crear el distribuidor.') }
    finally { setSaving(false) }
  }

  async function submitOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError('')
    try { await distributorsClient.createOrder(token, { distributorId: orderForm.distributorId, items: [{ wineId: null, skuSnapshot: orderForm.sku || null, nameSnapshot: orderForm.name, quantity: Number(orderForm.quantity), unitPrice: Number(orderForm.unitPrice) }], idempotencyKey: crypto.randomUUID(), metadata: { source: 'control_center' } }); setOrderForm(emptyOrder); setModal(null); setToast('Pedido de distribuidor creado.'); await load() }
    catch (submitError) { setError(submitError instanceof Error ? submitError.message : 'No fue posible crear el pedido.') }
    finally { setSaving(false) }
  }

  async function advance(order: DistributorOrderRecord) {
    const next: Record<string, string> = { submitted: 'approve', approved: 'prepare', preparing: 'ship', shipped: 'deliver' }
    const action = next[order.status]
    if (!action) return
    setSaving(true); setError('')
    try { await distributorsClient.orderAction(token, order.id, action, 'Actualización desde Centro de Control'); setToast('Pedido actualizado.'); await load() }
    catch (actionError) { setError(actionError instanceof Error ? actionError.message : 'No fue posible actualizar el pedido.') }
    finally { setSaving(false) }
  }

  return <div className="control-page control-page--distributors min-w-0 space-y-6">
    <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between"><SectionTitle eyebrow="Venta B2B" title="Distribuidores" subtitle="Socios comerciales, condiciones, crédito y pedidos mayoristas." /><div className="flex gap-2"><button type="button" onClick={load} className={secondary}><RefreshCw size={15} />Actualizar</button><button type="button" disabled={!writable || distributors.length === 0} onClick={() => setModal('order')} className={secondary}><ShoppingBag size={15} />Nuevo pedido</button><button type="button" disabled={!writable} onClick={() => setModal('distributor')} className={primary}><Plus size={15} />Nuevo distribuidor</button></div></div>
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Metric icon={UsersRound} label="Activos" value={String(metrics.active)} /><Metric icon={Building2} label="Prospectos" value={String(metrics.prospects)} /><Metric icon={PackageCheck} label="Pedidos abiertos" value={String(metrics.openOrders)} /><Metric icon={ShoppingBag} label="Venta registrada" value={money(metrics.sales)} /></section>
    {error ? <p className="rounded-xl border border-[#ead8c5] bg-[#fff7ed] p-4 text-sm text-[#8a4b16]">{error}</p> : null}
    <section className="grid gap-5 xl:grid-cols-2"><article className="overflow-hidden rounded-xl border border-[var(--color-line)] bg-[var(--color-panel)] shadow-[var(--shadow-card)]"><header className="border-b border-[var(--color-line)] p-4"><h2 className="text-sm font-semibold">Directorio comercial</h2></header>{loading ? <Loader2 className="m-10 animate-spin" /> : <div className="divide-y divide-[var(--color-line)]">{distributors.map((item) => <div key={item.id} className="grid gap-3 p-4 md:grid-cols-[1fr_auto]"><div><p className="text-sm font-semibold">{item.name}</p><p className="mt-1 text-xs text-[var(--color-muted)]">{item.contactName || 'Sin contacto'} · {item.email || item.phone || 'Sin datos de contacto'}</p><p className="mt-1 text-[10px] text-[var(--color-muted)]">{item.zone || 'Sin zona'} · {item.priceListName || 'Sin lista'} · crédito {money(item.creditLimit)}</p></div><StatusBadge label={distributorStatus(item.status)} /></div>)}</div>}</article>
      <article className="overflow-hidden rounded-xl border border-[var(--color-line)] bg-[var(--color-panel)] shadow-[var(--shadow-card)]"><header className="border-b border-[var(--color-line)] p-4"><h2 className="text-sm font-semibold">Pedidos mayoristas</h2></header>{loading ? <Loader2 className="m-10 animate-spin" /> : <div className="divide-y divide-[var(--color-line)]">{orders.map((order) => <div key={order.id} className="grid gap-3 p-4 md:grid-cols-[1fr_auto]"><div><p className="text-sm font-semibold">{order.orderNumber} · {order.distributorName ?? 'Distribuidor'}</p><p className="mt-1 text-xs text-[var(--color-muted)]">{money(order.total, order.currency)} · {dateTime(order.createdAt)}</p></div><div className="flex items-center gap-2"><StatusBadge label={orderStatus(order.status)} />{['submitted', 'approved', 'preparing', 'shipped'].includes(order.status) ? <button type="button" disabled={!writable || saving} onClick={() => void advance(order)} className="rounded-md border border-[var(--color-line)] px-2 py-1 text-[10px] font-semibold text-[var(--color-burgundy)]">Avanzar</button> : null}</div></div>)}</div>}</article></section>
    {modal === 'distributor' ? <Modal title="Nuevo distribuidor" onClose={() => setModal(null)}><form onSubmit={submitDistributor} className="grid gap-3 md:grid-cols-2"><Field label="Razón comercial" value={distributorForm.name} onChange={(name) => setDistributorForm({ ...distributorForm, name })} required /><Field label="Contacto" value={distributorForm.contactName} onChange={(contactName) => setDistributorForm({ ...distributorForm, contactName })} /><Field label="Correo" type="email" value={distributorForm.email} onChange={(email) => setDistributorForm({ ...distributorForm, email })} /><Field label="Teléfono" value={distributorForm.phone} onChange={(phone) => setDistributorForm({ ...distributorForm, phone })} /><Field label="RFC / identificación fiscal" value={distributorForm.taxId} onChange={(taxId) => setDistributorForm({ ...distributorForm, taxId })} /><Field label="Zona" value={distributorForm.zone} onChange={(zone) => setDistributorForm({ ...distributorForm, zone })} /><label><span className={labelClass}>Tipo</span><CrystalSelect value={distributorForm.distributorType} onChange={(distributorType) => setDistributorForm({ ...distributorForm, distributorType })}><option value="wholesale">Mayoreo</option><option value="retail">Retail</option><option value="restaurant">Restaurante</option><option value="hotel">Hospedaje</option><option value="corporate">Corporativo</option></CrystalSelect></label><label><span className={labelClass}>Estado</span><CrystalSelect value={distributorForm.operationalStatus} onChange={(operationalStatus) => setDistributorForm({ ...distributorForm, operationalStatus })}><option value="prospect">Prospecto</option><option value="active">Activo</option><option value="inactive">Inactivo</option><option value="suspended">Suspendido</option></CrystalSelect></label><Field label="Lista de precios" value={distributorForm.priceListName} onChange={(priceListName) => setDistributorForm({ ...distributorForm, priceListName })} /><Field label="Límite de crédito" type="number" value={distributorForm.creditLimit} onChange={(creditLimit) => setDistributorForm({ ...distributorForm, creditLimit })} /><Field label="Dirección" value={distributorForm.address} onChange={(address) => setDistributorForm({ ...distributorForm, address })} wide /><Field label="Condiciones comerciales" value={distributorForm.commercialTerms} onChange={(commercialTerms) => setDistributorForm({ ...distributorForm, commercialTerms })} wide /><Field label="Notas internas" value={distributorForm.notes} onChange={(notes) => setDistributorForm({ ...distributorForm, notes })} wide /><Submit saving={saving} label="Crear distribuidor" /></form></Modal> : null}
    {modal === 'order' ? <Modal title="Nuevo pedido mayorista" onClose={() => setModal(null)}><form onSubmit={submitOrder} className="grid gap-3 md:grid-cols-2"><ControlEntityPicker label="Distribuidor" value={orderForm.distributorId} options={distributors.filter((item) => item.status !== 'archived').map((item) => ({ id: item.id, label: item.name, description: `${item.zone || 'Sin zona'} · ${distributorStatus(item.status)}` }))} onChange={(distributorId) => setOrderForm({ ...orderForm, distributorId })} required /><Field label="Producto / partida" value={orderForm.name} onChange={(name) => setOrderForm({ ...orderForm, name })} required /><Field label="SKU" value={orderForm.sku} onChange={(sku) => setOrderForm({ ...orderForm, sku })} /><Field label="Cantidad" type="number" value={orderForm.quantity} onChange={(quantity) => setOrderForm({ ...orderForm, quantity })} required /><Field label="Precio unitario" type="number" value={orderForm.unitPrice} onChange={(unitPrice) => setOrderForm({ ...orderForm, unitPrice })} required /><div className="rounded-lg bg-[var(--color-soft)] p-3 text-right md:col-span-2"><p className="text-[10px] uppercase text-[var(--color-muted)]">Total</p><p className="text-xl font-semibold text-[var(--color-burgundy)]">{money(Number(orderForm.quantity || 0) * Number(orderForm.unitPrice || 0))}</p></div><Submit saving={saving} label="Crear pedido" /></form></Modal> : null}
    {toast ? <div className="fixed bottom-6 right-6 z-[180] rounded-xl border border-[#cfddca] bg-white px-4 py-3 text-sm font-semibold text-[#5f7d63] shadow-xl">{toast}<button onClick={() => setToast('')} className="ml-3"><X size={14} /></button></div> : null}
  </div>
}

const secondary = 'inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--color-line)] bg-white px-4 text-xs font-semibold text-[var(--color-burgundy)] disabled:opacity-45'
const primary = 'inline-flex min-h-10 items-center gap-2 rounded-xl bg-[var(--color-burgundy)] px-4 text-xs font-semibold text-white disabled:opacity-45'
const labelClass = 'mb-1 block text-[10px] font-semibold uppercase text-[var(--color-muted)]'
function Metric({ icon: Icon, label, value }: { icon: typeof UsersRound; label: string; value: string }) { return <article className="rounded-xl border border-[var(--color-line)] bg-[var(--color-panel)] p-4 shadow-[var(--shadow-card)]"><div className="flex justify-between"><div><p className="text-[10px] uppercase text-[var(--color-muted)]">{label}</p><p className="mt-1 text-2xl font-semibold">{value}</p></div><Icon size={18} className="text-[var(--color-burgundy)]" /></div></article> }
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) { return <div className="control-form-overlay fixed inset-0 z-[150] flex items-center justify-center bg-[#210711]/68 p-4 backdrop-blur-sm"><button type="button" aria-label="Cerrar" className="absolute inset-0" onClick={onClose} /><section className="control-form-surface relative z-10 max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-[var(--color-line)] bg-[var(--color-page)] p-6 shadow-2xl" role="dialog" aria-modal="true" aria-label={title}><header className="control-form-header mb-5 flex items-center justify-between"><h2 className="text-xl font-semibold text-[var(--color-burgundy)]">{title}</h2><button type="button" onClick={onClose} aria-label="Cerrar"><X size={17} /></button></header>{children}</section></div> }
function Field({ label, value, onChange, type = 'text', required, wide }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean; wide?: boolean }) { return <label className={wide ? 'md:col-span-2' : ''}><span className={labelClass}>{label}{required ? ' *' : ''}</span><input type={type} min={type === 'number' ? '0' : undefined} required={required} value={value} onChange={(event) => onChange(event.target.value)} className="min-h-11 w-full rounded-xl border border-[var(--color-line)] bg-white px-3 text-sm outline-none" /></label> }
function Submit({ saving, label }: { saving: boolean; label: string }) { return <div className="flex justify-end md:col-span-2"><button type="submit" disabled={saving} className={primary}>{saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}{label}</button></div> }
