import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { AlertTriangle, Boxes, Download, PackagePlus, Plus, RefreshCw, Search, Warehouse } from 'lucide-react'
import { useAuth } from '../../../contexts/AuthContext'
import { inventoryClient, type InventoryLocationRecord, type InventoryMovementRecord, type InventoryRecord } from '../../../services/phase7e.service'
import { SectionTitle } from '../../components/shared/SectionTitle'
import { StatusBadge } from '../../components/shared/StatusBadge'
import { ActionButton, Field, Metric, ModalForm, SelectField, StateBlock } from './phase7e/ControlOperationsUi'
import { downloadCsv, operationKey } from './phase7e/operationsUtils'

const emptyItem = { wineId: '', locationId: '', sku: '', productName: '', lotCode: '', minimumQuantity: '0', unitCost: '' }
const emptyLocation = { name: '', code: '', type: 'warehouse', address: '' }
const emptyMove = { quantity: '1', reason: '', toLocationId: '' }

function canWrite(roles: string[]) {
  return roles.some((role) => ['super_admin', 'admin', 'operations'].includes(role))
}

export function InventoryOperationsPage() {
  const { session, roles } = useAuth()
  const token = session?.access_token
  const writable = canWrite(roles)
  const [items, setItems] = useState<InventoryRecord[]>([])
  const [locations, setLocations] = useState<InventoryLocationRecord[]>([])
  const [movements, setMovements] = useState<InventoryMovementRecord[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [itemOpen, setItemOpen] = useState(false)
  const [locationOpen, setLocationOpen] = useState(false)
  const [itemForm, setItemForm] = useState(emptyItem)
  const [locationForm, setLocationForm] = useState(emptyLocation)
  const [moveForm, setMoveForm] = useState(emptyMove)

  const selected = useMemo(() => items.find((item) => item.id === selectedId) ?? items[0] ?? null, [items, selectedId])
  const totals = useMemo(() => ({
    onHand: items.reduce((sum, item) => sum + item.onHand, 0),
    reserved: items.reduce((sum, item) => sum + item.reserved, 0),
    low: items.filter((item) => item.lowStock).length,
  }), [items])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await inventoryClient.summary(token, { search: search || undefined, status: status || undefined, perPage: 100 })
      setItems(response.data.items)
      setLocations(response.data.locations)
      setMovements(response.data.movements)
      setSelectedId((current) => current ?? response.data.items[0]?.id ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible cargar inventario.')
    } finally {
      setLoading(false)
    }
  }, [search, status, token])

  useEffect(() => {
    void load()
  }, [load])

  async function submitItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving) return
    setSaving(true)
    setError('')
    try {
      const response = await inventoryClient.createItem(token, {
        wineId: itemForm.wineId,
        locationId: itemForm.locationId,
        sku: itemForm.sku || undefined,
        productName: itemForm.productName || undefined,
        lotCode: itemForm.lotCode || undefined,
        minimumQuantity: Number(itemForm.minimumQuantity),
        unitCost: itemForm.unitCost ? Number(itemForm.unitCost) : undefined,
      })
      setSelectedId(response.data.id)
      setItemForm(emptyItem)
      setItemOpen(false)
      setToast('Item de inventario guardado.')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible guardar el item.')
    } finally {
      setSaving(false)
    }
  }

  async function submitLocation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving) return
    setSaving(true)
    setError('')
    try {
      await inventoryClient.createLocation(token, {
        name: locationForm.name,
        code: locationForm.code || undefined,
        type: locationForm.type,
        address: locationForm.address || undefined,
      })
      setLocationForm(emptyLocation)
      setLocationOpen(false)
      setToast('Ubicación creada.')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible crear la ubicación.')
    } finally {
      setSaving(false)
    }
  }

  async function runOperation(action: 'receive' | 'reserve' | 'release' | 'fulfill' | 'adjust' | 'transfer', label: string, confirmText: string) {
    if (!selected || !writable || saving) return
    if (!window.confirm(confirmText)) return
    setSaving(true)
    setError('')
    try {
      const base = {
        inventoryItemId: selected.id,
        quantity: Number(moveForm.quantity),
        reason: moveForm.reason || label,
        idempotencyKey: operationKey(`INV_${action.toUpperCase()}`),
      }
      await inventoryClient.operation(token, action, action === 'adjust'
        ? { inventoryItemId: selected.id, quantityDelta: Number(moveForm.quantity), reason: moveForm.reason, idempotencyKey: operationKey('INV_ADJUST') }
        : action === 'transfer'
          ? { ...base, toLocationId: moveForm.toLocationId }
          : base)
      setToast(label)
      setMoveForm(emptyMove)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible completar el movimiento.')
    } finally {
      setSaving(false)
    }
  }

  async function exportCsv() {
    try {
      await downloadCsv(await inventoryClient.exportCsv(token, { search: search || undefined, status: status || undefined }), 'inventario-hacienda-de-letras.csv')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible exportar inventario.')
    }
  }

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <SectionTitle eyebrow="Operación" title="Inventario" subtitle="Existencias reales, reservas, movimientos, ubicaciones y alertas de mínimo." />
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={load} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--color-line)] bg-[var(--color-panel)] px-4 text-sm font-semibold text-[var(--color-ink)]"><RefreshCw size={16} />Reintentar</button>
          <button type="button" onClick={exportCsv} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--color-line)] bg-[var(--color-panel)] px-4 text-sm font-semibold text-[var(--color-ink)]"><Download size={16} />Exportar CSV</button>
          <button type="button" onClick={() => setLocationOpen(true)} disabled={!writable} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--color-line)] px-4 text-sm font-semibold text-[var(--color-burgundy)] disabled:opacity-50"><Warehouse size={16} />Ubicación</button>
          <button type="button" onClick={() => setItemOpen(true)} disabled={!writable} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--color-burgundy)] px-5 text-sm font-semibold text-white disabled:opacity-50"><Plus size={16} />Item</button>
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-4">
        <Metric icon={Boxes} label="Stock físico" value={String(totals.onHand)} />
        <Metric icon={PackagePlus} label="Reservado" value={String(totals.reserved)} />
        <Metric icon={Warehouse} label="Ubicaciones" value={String(locations.length)} />
        <Metric icon={AlertTriangle} label="Alertas" value={String(totals.low)} />
      </section>

      <section className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-panel)] p-4 shadow-[var(--shadow-card)]">
        <div className="grid gap-3 md:grid-cols-[1fr_220px_auto]">
          <label className="flex min-h-11 items-center gap-3 rounded-xl border border-[var(--color-line)] bg-[var(--color-panel-strong)] px-4">
            <Search size={16} className="text-[var(--color-muted)]" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar SKU, producto o lote..." className="min-w-0 flex-1 bg-transparent text-sm text-[var(--color-ink)] outline-none" />
          </label>
          <select value={status} onChange={(event) => setStatus(event.target.value)} className="min-h-11 rounded-xl border border-[var(--color-line)] bg-[var(--color-panel-strong)] px-4 text-sm text-[var(--color-ink)]">
            <option value="">Todos los estados</option>
            <option value="active">Activo</option>
            <option value="inactive">Inactivo</option>
            <option value="archived">Archivado</option>
          </select>
          <button type="button" onClick={() => { setSearch(''); setStatus('') }} className="min-h-11 rounded-xl border border-[var(--color-line)] px-4 text-sm font-semibold text-[var(--color-burgundy)]">Limpiar</button>
        </div>
      </section>

      {error ? <div className="rounded-[var(--radius-card)] border border-[#ead8c5] bg-[#fff7ed] p-4 text-sm text-[#8a4b16]">{error}</div> : null}

      <section className="grid gap-5 2xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.9fr)]">
        <div className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-panel)] shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between border-b border-[var(--color-line)] px-5 py-4">
            <h3 className="text-lg font-semibold text-[var(--color-ink)]">Existencias reales</h3>
            <span className="rounded-full bg-[var(--color-soft)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">{items.length} items</span>
          </div>
          {loading ? <StateBlock text="Cargando inventario real..." /> : items.length === 0 ? <StateBlock title="Sin inventario operativo" text="Crea una ubicación y un item vinculado a un vino real." /> : (
            <div className="divide-y divide-[var(--color-line)]">
              {items.map((item) => (
                <button key={item.id} type="button" onClick={() => setSelectedId(item.id)} className="grid w-full gap-4 px-5 py-4 text-left lg:grid-cols-[1fr_0.6fr_0.6fr_auto]" style={{ backgroundColor: selected?.id === item.id ? 'rgba(180,138,85,0.12)' : 'transparent' }}>
                  <div className="min-w-0"><p className="truncate text-sm font-semibold text-[var(--color-ink)]">{item.productName ?? item.wineName}</p><p className="mt-1 truncate text-xs text-[var(--color-muted)]">{item.sku ?? 'Sin SKU'} · {item.locationName ?? 'Sin ubicación'}</p></div>
                  <p className="text-xs text-[var(--color-muted)]">Físico {item.onHand}</p>
                  <p className="text-xs font-semibold text-[var(--color-ink)]">Disponible {item.available}</p>
                  <StatusBadge label={item.lowStock ? 'Mínimo' : item.status} />
                </button>
              ))}
            </div>
          )}
        </div>

        {selected ? (
          <aside className="space-y-4">
            <article className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-panel)] p-5 shadow-[var(--shadow-card)]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-gold)]">Movimientos</p>
              <h3 className="mt-2 text-2xl text-[var(--color-burgundy)]" style={{ fontFamily: 'var(--font-display)' }}>{selected.sku ?? selected.productName}</h3>
              <div className="mt-5 grid gap-3">
                <Field label="Cantidad" type="number" value={moveForm.quantity} onChange={(value) => setMoveForm({ ...moveForm, quantity: value })} required />
                <Field label="Motivo" value={moveForm.reason} onChange={(value) => setMoveForm({ ...moveForm, reason: value })} required />
                <SelectField label="Ubicación destino" value={moveForm.toLocationId} onChange={(value) => setMoveForm({ ...moveForm, toLocationId: value })}>
                  <option value="">Seleccionar</option>
                  {locations.filter((location) => location.id !== selected.locationId).map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
                </SelectField>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <ActionButton disabled={!writable} onClick={() => runOperation('receive', 'Entrada registrada.', '¿Registrar entrada de inventario?')}>Entrada</ActionButton>
                <ActionButton disabled={!writable} onClick={() => runOperation('reserve', 'Reserva registrada.', '¿Reservar inventario disponible?')}>Reservar</ActionButton>
                <ActionButton disabled={!writable} onClick={() => runOperation('release', 'Reserva liberada.', '¿Liberar inventario reservado?')}>Liberar</ActionButton>
                <ActionButton disabled={!writable} onClick={() => runOperation('fulfill', 'Salida registrada.', '¿Convertir reserva en salida?')}>Salida</ActionButton>
                <ActionButton disabled={!writable || !moveForm.toLocationId} onClick={() => runOperation('transfer', 'Transferencia registrada.', '¿Transferir inventario disponible?')}>Transferir</ActionButton>
                <ActionButton disabled={!writable} onClick={() => runOperation('adjust', 'Ajuste registrado.', '¿Registrar ajuste con motivo?')}>Ajustar</ActionButton>
              </div>
            </article>
            <article className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-panel)] p-5 shadow-[var(--shadow-card)]">
              <h4 className="text-sm font-semibold text-[var(--color-ink)]">Historial reciente</h4>
              <div className="mt-4 space-y-3">
                {movements.length === 0 ? <p className="text-sm text-[var(--color-muted)]">Sin movimientos recientes.</p> : movements.slice(0, 6).map((movement) => (
                  <div key={movement.id} className="rounded-xl bg-[var(--color-soft)] p-3 text-sm text-[var(--color-muted-strong)]">
                    <p className="font-semibold text-[var(--color-ink)]">{movement.movementType} · {movement.quantity}</p>
                    <p className="mt-1 text-xs">{movement.product ?? 'Producto'} · {movement.reason ?? 'Sin motivo'}</p>
                  </div>
                ))}
              </div>
            </article>
          </aside>
        ) : null}
      </section>

      {itemOpen ? (
        <ModalForm title="Item de inventario" onClose={() => setItemOpen(false)} onSubmit={submitItem} saving={saving}>
          <Field label="ID de vino" value={itemForm.wineId} onChange={(value) => setItemForm({ ...itemForm, wineId: value })} required />
          <SelectField label="Ubicación" value={itemForm.locationId} onChange={(value) => setItemForm({ ...itemForm, locationId: value })}>
            <option value="">Seleccionar</option>
            {locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
          </SelectField>
          <Field label="SKU" value={itemForm.sku} onChange={(value) => setItemForm({ ...itemForm, sku: value })} />
          <Field label="Producto" value={itemForm.productName} onChange={(value) => setItemForm({ ...itemForm, productName: value })} />
          <Field label="Lote" value={itemForm.lotCode} onChange={(value) => setItemForm({ ...itemForm, lotCode: value })} />
          <Field label="Mínimo" type="number" min="0" value={itemForm.minimumQuantity} onChange={(value) => setItemForm({ ...itemForm, minimumQuantity: value })} />
          <Field label="Costo unitario" type="number" min="0" value={itemForm.unitCost} onChange={(value) => setItemForm({ ...itemForm, unitCost: value })} />
        </ModalForm>
      ) : null}

      {locationOpen ? (
        <ModalForm title="Ubicación" onClose={() => setLocationOpen(false)} onSubmit={submitLocation} saving={saving}>
          <Field label="Nombre" value={locationForm.name} onChange={(value) => setLocationForm({ ...locationForm, name: value })} required />
          <Field label="Código" value={locationForm.code} onChange={(value) => setLocationForm({ ...locationForm, code: value })} />
          <Field label="Tipo" value={locationForm.type} onChange={(value) => setLocationForm({ ...locationForm, type: value })} required />
          <Field label="Dirección" value={locationForm.address} onChange={(value) => setLocationForm({ ...locationForm, address: value })} />
        </ModalForm>
      ) : null}

      {toast ? <div className="fixed bottom-6 right-6 z-[140] rounded-[1rem] border border-[#cfddca] bg-white p-4 text-sm font-semibold text-[#5f7d63] shadow-[0_22px_50px_rgba(45,22,14,0.18)]">{toast}</div> : null}
    </div>
  )
}
