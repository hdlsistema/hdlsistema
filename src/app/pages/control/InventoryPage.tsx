import { AlertTriangle, ArrowRightLeft, Boxes, Download, Loader2, MapPin, PackagePlus, Plus, RefreshCw, Search, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { useAuth } from '../../../contexts/AuthContext'
import { adminContentClient, type ContentRecord } from '../../../services/content.service'
import { inventoryClient, type InventoryLocationRecord, type InventoryRecord } from '../../../services/phase7e.service'
import { ControlEntityPicker } from '../../components/control/ControlEntityPicker'
import { CrystalSelect } from '../../components/shared/CrystalSelect'
import { SectionTitle } from '../../components/shared/SectionTitle'
import { StatusBadge } from '../../components/shared/StatusBadge'
import { dateTime } from './controlCopy'

type ModalName = 'item' | 'location' | 'movement' | null

const emptyItem = { wineId: '', locationId: '', sku: '', productName: '', lotCode: '', unitOfMeasure: 'bottle', minimumQuantity: '0', maximumQuantity: '', unitCost: '' }
const emptyLocation = { name: '', code: '', type: 'warehouse', address: '' }

function canWrite(roles: string[]) {
  return roles.some((role) => ['super_admin', 'admin', 'operations'].includes(role))
}

function movementLabel(value: string) {
  const labels: Record<string, string> = { purchase: 'Entrada por compra', reservation: 'Reserva', release: 'Liberación', sale: 'Salida por venta', transfer_in: 'Transferencia entrada', transfer_out: 'Transferencia salida', adjustment_in: 'Ajuste entrada', adjustment_out: 'Ajuste salida' }
  return labels[value] ?? value.replaceAll('_', ' ')
}

export function InventoryPage() {
  const { session, roles } = useAuth()
  const token = session?.access_token
  const writable = canWrite(roles)
  const [items, setItems] = useState<InventoryRecord[]>([])
  const [locations, setLocations] = useState<InventoryLocationRecord[]>([])
  const [movements, setMovements] = useState<Array<{ id: string; movementType: string; quantity: number; product?: string | null; location?: string | null; reason?: string | null; createdAt: string }>>([])
  const [alerts, setAlerts] = useState<InventoryRecord[]>([])
  const [wines, setWines] = useState<ContentRecord[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [modal, setModal] = useState<ModalName>(null)
  const [itemForm, setItemForm] = useState(emptyItem)
  const [locationForm, setLocationForm] = useState(emptyLocation)
  const [selectedItem, setSelectedItem] = useState<InventoryRecord | null>(null)
  const [movementAction, setMovementAction] = useState<'receive' | 'adjust' | 'transfer'>('receive')
  const [movementQuantity, setMovementQuantity] = useState('1')
  const [movementReason, setMovementReason] = useState('')
  const [movementTarget, setMovementTarget] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [inventory, wineResponse] = await Promise.all([
        inventoryClient.summary(token, { perPage: 100 }),
        adminContentClient.list('wines', token, { perPage: 100, orderBy: 'name', orderDirection: 'asc' }),
      ])
      setItems(inventory.data.items)
      setLocations(inventory.data.locations)
      setMovements(inventory.data.movements)
      setAlerts(inventory.data.alerts)
      setWines(wineResponse.data)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'No fue posible cargar inventario.')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { void load() }, [load])

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('es-MX')
    if (!term) return items
    return items.filter((item) => `${item.wineName} ${item.productName ?? ''} ${item.sku ?? ''} ${item.locationName ?? ''} ${item.lotCode ?? ''}`.toLocaleLowerCase('es-MX').includes(term))
  }, [items, search])

  const metrics = useMemo(() => ({
    units: items.reduce((sum, item) => sum + item.onHand, 0),
    reserved: items.reduce((sum, item) => sum + item.reserved, 0),
    available: items.reduce((sum, item) => sum + item.available, 0),
  }), [items])

  async function submitItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true); setError('')
    try {
      await inventoryClient.createItem(token, { wineId: itemForm.wineId, locationId: itemForm.locationId, sku: itemForm.sku || undefined, productName: itemForm.productName || undefined, lotCode: itemForm.lotCode || undefined, unitOfMeasure: itemForm.unitOfMeasure, minimumQuantity: Number(itemForm.minimumQuantity), maximumQuantity: itemForm.maximumQuantity ? Number(itemForm.maximumQuantity) : null, unitCost: itemForm.unitCost ? Number(itemForm.unitCost) : null })
      setItemForm(emptyItem); setModal(null); setToast('Producto agregado al inventario.'); await load()
    } catch (submitError) { setError(submitError instanceof Error ? submitError.message : 'No fue posible crear el producto.') } finally { setSaving(false) }
  }

  async function submitLocation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true); setError('')
    try {
      await inventoryClient.createLocation(token, { ...locationForm, address: locationForm.address || null, active: true })
      setLocationForm(emptyLocation); setModal(null); setToast('Ubicación creada.'); await load()
    } catch (submitError) { setError(submitError instanceof Error ? submitError.message : 'No fue posible crear la ubicación.') } finally { setSaving(false) }
  }

  function openMovement(item: InventoryRecord, action: 'receive' | 'adjust' | 'transfer') {
    setSelectedItem(item); setMovementAction(action); setMovementQuantity(action === 'adjust' ? '0' : '1'); setMovementReason(''); setMovementTarget(''); setModal('movement')
  }

  async function submitMovement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedItem) return
    setSaving(true); setError('')
    try {
      const common = { p_inventory_item_id: selectedItem.id, p_idempotency_key: crypto.randomUUID() }
      const payload = movementAction === 'receive'
        ? { ...common, p_quantity: Number(movementQuantity), p_reason: movementReason }
        : movementAction === 'adjust'
          ? { ...common, p_quantity_delta: Number(movementQuantity), p_reason: movementReason }
          : { ...common, p_to_location_id: movementTarget, p_quantity: Number(movementQuantity), p_reason: movementReason }
      await inventoryClient.operation(token, movementAction, payload)
      setModal(null); setToast('Movimiento registrado y existencia actualizada.'); await load()
    } catch (submitError) { setError(submitError instanceof Error ? submitError.message : 'No fue posible registrar el movimiento.') } finally { setSaving(false) }
  }

  async function exportCsv() {
    try { const response = await inventoryClient.exportCsv(token); if (!response.ok) throw new Error('No fue posible exportar.'); const url = URL.createObjectURL(await response.blob()); const link = document.createElement('a'); link.href = url; link.download = 'inventario-hacienda-de-letras.csv'; link.click(); URL.revokeObjectURL(url) } catch (exportError) { setError(exportError instanceof Error ? exportError.message : 'No fue posible exportar.') }
  }

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between"><SectionTitle eyebrow="Operación interna" title="Inventario" subtitle="Existencia por almacén, reservas, mínimos y trazabilidad de movimientos." /><div className="flex flex-wrap gap-2"><button type="button" onClick={load} className={secondaryButton}><RefreshCw size={15} />Actualizar</button><button type="button" onClick={exportCsv} className={secondaryButton}><Download size={15} />Exportar</button><button type="button" disabled={!writable} onClick={() => setModal('location')} className={secondaryButton}><MapPin size={15} />Ubicación</button><button type="button" disabled={!writable || locations.length === 0} onClick={() => setModal('item')} className={primaryButton}><Plus size={15} />Agregar producto</button></div></div>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Metric icon={Boxes} label="Partidas" value={String(items.length)} /><Metric icon={PackagePlus} label="En existencia" value={String(metrics.units)} /><Metric icon={ArrowRightLeft} label="Reservadas" value={String(metrics.reserved)} /><Metric icon={AlertTriangle} label="Alertas" value={String(alerts.length)} tone={alerts.length ? 'alert' : undefined} /></section>
      <section className="rounded-xl border border-[var(--color-line)] bg-[var(--color-panel)] p-4 shadow-[var(--shadow-card)]"><label className="flex min-h-11 items-center gap-3 rounded-xl border border-[var(--color-line)] bg-white px-4"><Search size={15} className="text-[var(--color-muted)]" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar vino, SKU, lote o almacén..." className="min-w-0 flex-1 bg-transparent text-sm outline-none" /></label></section>
      {error ? <p className="rounded-xl border border-[#ead8c5] bg-[#fff7ed] p-4 text-sm text-[#8a4b16]">{error}</p> : null}
      <section className="overflow-hidden rounded-xl border border-[var(--color-line)] bg-[var(--color-panel)] shadow-[var(--shadow-card)]"><div className="overflow-x-auto"><table className="w-full min-w-[920px] text-left text-xs"><thead className="bg-[var(--color-soft)] text-[10px] uppercase text-[var(--color-muted)]"><tr><th className="px-4 py-3">Producto</th><th className="px-4 py-3">Ubicación</th><th className="px-4 py-3">Existencia</th><th className="px-4 py-3">Reservado</th><th className="px-4 py-3">Disponible</th><th className="px-4 py-3">Mínimo</th><th className="px-4 py-3">Estado</th><th className="px-4 py-3">Movimientos</th></tr></thead><tbody className="divide-y divide-[var(--color-line)]">{loading ? <tr><td colSpan={8} className="p-10 text-center"><Loader2 className="mx-auto animate-spin" /></td></tr> : filtered.length === 0 ? <tr><td colSpan={8} className="p-10 text-center text-[var(--color-muted)]">Sin inventario para mostrar.</td></tr> : filtered.map((item) => <tr key={item.id}><td className="px-4 py-3"><p className="font-semibold">{item.wineName}</p><p className="text-[10px] text-[var(--color-muted)]">{item.sku || 'Sin SKU'}{item.lotCode ? ` · lote ${item.lotCode}` : ''}</p></td><td className="px-4 py-3">{item.locationName || 'Sin ubicación'}</td><td className="px-4 py-3 font-semibold">{item.onHand}</td><td className="px-4 py-3">{item.reserved}</td><td className="px-4 py-3 font-semibold text-[#487252]">{item.available}</td><td className="px-4 py-3">{item.minimum}</td><td className="px-4 py-3"><StatusBadge label={item.lowStock ? 'Stock bajo' : 'Correcto'} /></td><td className="px-4 py-3"><div className="flex gap-1"><TinyButton onClick={() => openMovement(item, 'receive')}>Entrada</TinyButton><TinyButton onClick={() => openMovement(item, 'adjust')}>Ajuste</TinyButton><TinyButton onClick={() => openMovement(item, 'transfer')}>Transferir</TinyButton></div></td></tr>)}</tbody></table></div></section>
      <section className="rounded-xl border border-[var(--color-line)] bg-[var(--color-panel)] p-4 shadow-[var(--shadow-card)]"><h2 className="text-sm font-semibold">Últimos movimientos</h2><div className="mt-3 grid gap-2 lg:grid-cols-2">{movements.slice(0, 10).map((movement) => <div key={movement.id} className="flex items-start justify-between gap-3 rounded-lg bg-[var(--color-soft)] p-3 text-xs"><div><p className="font-semibold">{movementLabel(movement.movementType)} · {movement.product ?? 'Producto'}</p><p className="mt-1 text-[10px] text-[var(--color-muted)]">{movement.location ?? 'Sin ubicación'} · {movement.reason ?? 'Sin nota'} · {dateTime(movement.createdAt)}</p></div><span className="font-semibold">{movement.quantity > 0 ? '+' : ''}{movement.quantity}</span></div>)}</div></section>
      {modal === 'item' ? <Modal title="Agregar producto al inventario" onClose={() => setModal(null)}><form onSubmit={submitItem} className="grid gap-3 md:grid-cols-2"><ControlEntityPicker label="Vino" value={itemForm.wineId} options={wines.map((wine) => ({ id: wine.id, label: String(wine.name ?? wine.title ?? 'Vino'), description: String(wine.sku ?? 'Sin SKU') }))} onChange={(wineId) => { const wine = wines.find((value) => value.id === wineId); setItemForm({ ...itemForm, wineId, sku: String(wine?.sku ?? ''), productName: String(wine?.name ?? '') }) }} required /><ControlEntityPicker label="Ubicación" value={itemForm.locationId} options={locations.map((location) => ({ id: location.id, label: location.name, description: location.code || location.type }))} onChange={(locationId) => setItemForm({ ...itemForm, locationId })} required /><Field label="Nombre operativo" value={itemForm.productName} onChange={(productName) => setItemForm({ ...itemForm, productName })} /><Field label="SKU" value={itemForm.sku} onChange={(sku) => setItemForm({ ...itemForm, sku })} /><Field label="Lote" value={itemForm.lotCode} onChange={(lotCode) => setItemForm({ ...itemForm, lotCode })} /><Field label="Unidad" value={itemForm.unitOfMeasure} onChange={(unitOfMeasure) => setItemForm({ ...itemForm, unitOfMeasure })} /><Field label="Mínimo" type="number" value={itemForm.minimumQuantity} onChange={(minimumQuantity) => setItemForm({ ...itemForm, minimumQuantity })} /><Field label="Máximo" type="number" value={itemForm.maximumQuantity} onChange={(maximumQuantity) => setItemForm({ ...itemForm, maximumQuantity })} /><Field label="Costo unitario" type="number" value={itemForm.unitCost} onChange={(unitCost) => setItemForm({ ...itemForm, unitCost })} /><Submit saving={saving} label="Agregar" /></form></Modal> : null}
      {modal === 'location' ? <Modal title="Nueva ubicación de inventario" onClose={() => setModal(null)}><form onSubmit={submitLocation} className="grid gap-3 md:grid-cols-2"><Field label="Nombre" value={locationForm.name} onChange={(name) => setLocationForm({ ...locationForm, name })} required /><Field label="Código" value={locationForm.code} onChange={(code) => setLocationForm({ ...locationForm, code })} /><label><span className={labelClass}>Tipo</span><CrystalSelect value={locationForm.type} onChange={(type) => setLocationForm({ ...locationForm, type })}><option value="warehouse">Almacén</option><option value="store">Tienda</option><option value="restaurant">Restaurante</option><option value="cellar">Cava</option><option value="event">Eventos</option></CrystalSelect></label><Field label="Dirección / referencia" value={locationForm.address} onChange={(address) => setLocationForm({ ...locationForm, address })} /><Submit saving={saving} label="Crear ubicación" /></form></Modal> : null}
      {modal === 'movement' && selectedItem ? <Modal title={`${movementAction === 'receive' ? 'Entrada' : movementAction === 'adjust' ? 'Ajuste' : 'Transferencia'} · ${selectedItem.wineName}`} onClose={() => setModal(null)}><form onSubmit={submitMovement} className="grid gap-3 md:grid-cols-2"><Field label={movementAction === 'adjust' ? 'Diferencia (+/-)' : 'Cantidad'} type="number" value={movementQuantity} onChange={setMovementQuantity} required />{movementAction === 'transfer' ? <ControlEntityPicker label="Destino" value={movementTarget} options={locations.filter((location) => location.id !== selectedItem.locationId).map((location) => ({ id: location.id, label: location.name, description: location.code || location.type }))} onChange={setMovementTarget} required /> : null}<Field label="Motivo" value={movementReason} onChange={setMovementReason} required wide /><div className="md:col-span-2 rounded-lg bg-[var(--color-soft)] p-3 text-xs">Existencia actual: {selectedItem.onHand} · reservado: {selectedItem.reserved} · disponible: {selectedItem.available}</div><Submit saving={saving} label="Registrar movimiento" /></form></Modal> : null}
      {toast ? <div className="fixed bottom-6 right-6 z-[180] rounded-xl border border-[#cfddca] bg-white px-4 py-3 text-sm font-semibold text-[#5f7d63] shadow-xl">{toast}<button onClick={() => setToast('')} className="ml-3"><X size={14} /></button></div> : null}
    </div>
  )
}

const secondaryButton = 'inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--color-line)] bg-white px-4 text-xs font-semibold text-[var(--color-burgundy)] disabled:opacity-45'
const primaryButton = 'inline-flex min-h-10 items-center gap-2 rounded-xl bg-[var(--color-burgundy)] px-4 text-xs font-semibold text-white disabled:opacity-45'
const labelClass = 'mb-1 block text-[10px] font-semibold uppercase text-[var(--color-muted)]'

function Metric({ icon: Icon, label, value, tone }: { icon: typeof Boxes; label: string; value: string; tone?: 'alert' }) { return <article className="rounded-xl border border-[var(--color-line)] bg-[var(--color-panel)] p-4 shadow-[var(--shadow-card)]"><div className="flex justify-between"><div><p className="text-[10px] uppercase text-[var(--color-muted)]">{label}</p><p className={`mt-1 text-2xl font-semibold ${tone ? 'text-[var(--color-alert)]' : 'text-[var(--color-ink)]'}`}>{value}</p></div><Icon size={18} className={tone ? 'text-[var(--color-alert)]' : 'text-[var(--color-burgundy)]'} /></div></article> }
function TinyButton({ children, onClick }: { children: string; onClick: () => void }) { return <button type="button" onClick={onClick} className="rounded-md border border-[var(--color-line)] px-2 py-1 text-[10px] font-semibold text-[var(--color-burgundy)]">{children}</button> }
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) { return <div className="fixed inset-0 z-[150] flex items-center justify-center bg-[#210711]/68 p-4 backdrop-blur-sm"><button type="button" className="absolute inset-0" onClick={onClose} /><section className="relative z-10 max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-[var(--color-line)] bg-[var(--color-page)] p-5 shadow-2xl"><header className="mb-5 flex items-center justify-between"><h2 className="text-xl font-semibold text-[var(--color-burgundy)]">{title}</h2><button type="button" onClick={onClose}><X size={17} /></button></header>{children}</section></div> }
function Field({ label, value, onChange, type = 'text', required, wide }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean; wide?: boolean }) { return <label className={wide ? 'md:col-span-2' : ''}><span className={labelClass}>{label}{required ? ' *' : ''}</span><input type={type} step={type === 'number' ? 'any' : undefined} required={required} value={value} onChange={(event) => onChange(event.target.value)} className="min-h-11 w-full rounded-xl border border-[var(--color-line)] bg-white px-3 text-sm outline-none" /></label> }
function Submit({ saving, label }: { saving: boolean; label: string }) { return <div className="flex justify-end md:col-span-2"><button type="submit" disabled={saving} className={primaryButton}>{saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}{label}</button></div> }
