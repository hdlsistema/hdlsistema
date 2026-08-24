import {
  AlertTriangle,
  ArrowRightLeft,
  Boxes,
  ChevronRight,
  Download,
  History,
  Loader2,
  MapPin,
  PackagePlus,
  Plus,
  RefreshCw,
  Search,
  Store,
  Trash2,
  Warehouse,
  Wine,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { useAuth } from '../../../contexts/AuthContext'
import { adminContentClient, type ContentRecord } from '../../../services/content.service'
import { inventoryClient, type InventoryLocationRecord, type InventoryMovementRecord, type InventoryRecord } from '../../../services/phase7e.service'
import { ControlConfirmDialog } from '../../components/control/ControlConfirmDialog'
import { ControlEntityPicker } from '../../components/control/ControlEntityPicker'
import { CrystalSelect } from '../../components/shared/CrystalSelect'
import { SectionTitle } from '../../components/shared/SectionTitle'
import { StatusBadge } from '../../components/shared/StatusBadge'
import { useAppPreferences } from '../../context/AppPreferencesContext'
import { dateTime } from './controlCopy'

type ModalName = 'item' | 'location' | 'movement' | 'timeline' | null
type InventoryMovementAction = 'receive' | 'adjust' | 'transfer'
type InventoryTab = 'all' | 'active' | 'reserved' | 'low' | 'empty'
type PendingAction = { title: string; message: string; confirmLabel: string; action: () => Promise<unknown>; success: string }

const emptyItem = { wineId: '', locationId: '', sku: '', productName: '', lotCode: '', unitOfMeasure: 'bottle', minimumQuantity: '0', maximumQuantity: '', unitCost: '' }
const emptyLocation = { name: '', code: '', type: 'warehouse', address: '' }

export function buildInventoryMovementPayload(
  action: InventoryMovementAction,
  inventoryItemId: string,
  quantity: number,
  reason: string,
  options: { toLocationId?: string; idempotencyKey?: string } = {},
) {
  const common = { inventoryItemId, idempotencyKey: options.idempotencyKey ?? crypto.randomUUID() }
  if (action === 'receive') return { ...common, quantity, reason }
  if (action === 'adjust') return { ...common, quantityDelta: quantity, reason }
  return { ...common, toLocationId: options.toLocationId ?? '', quantity, reason }
}

function canWrite(roles: string[]) {
  return roles.some((role) => ['super_admin', 'admin', 'operations'].includes(role))
}

function movementLabel(value: string, isEnglish = false) {
  const labels: Record<string, string> = {
    purchase: 'Entrada por compra',
    reservation: 'Reserva',
    release: 'Liberación',
    sale: 'Salida por venta',
    return: 'Devolución',
    transfer_in: 'Transferencia entrada',
    transfer_out: 'Transferencia salida',
    adjustment_in: 'Ajuste entrada',
    adjustment_out: 'Ajuste salida',
  }
  const englishLabels: Record<string, string> = {
    purchase: 'Purchase entry',
    reservation: 'Reservation',
    release: 'Release',
    sale: 'Sale exit',
    return: 'Return',
    transfer_in: 'Transfer in',
    transfer_out: 'Transfer out',
    adjustment_in: 'Stock adjustment in',
    adjustment_out: 'Stock adjustment out',
  }
  return (isEnglish ? englishLabels[value] : labels[value]) ?? (isEnglish ? 'Inventory movement' : 'Movimiento de inventario')
}

function locationTypeLabel(value?: string | null, isEnglish = false) {
  const labels: Record<string, string> = {
    warehouse: 'Bodega / almacén',
    cellar: 'Cava',
    store: 'Boutique',
    restaurant: 'Restaurante',
    event: 'Eventos',
    event_venue: 'Sede de eventos',
  }
  const englishLabels: Record<string, string> = {
    warehouse: 'Warehouse / storage',
    cellar: 'Cellar',
    store: 'Boutique',
    restaurant: 'Restaurant',
    event: 'Events',
    event_venue: 'Event venue',
  }
  return (isEnglish ? englishLabels[value ?? ''] : labels[value ?? '']) ?? (isEnglish ? 'No type' : 'Sin tipo')
}

function locationIcon(value?: string | null) {
  if (value === 'cellar') return Wine
  if (value === 'store') return Store
  if (value === 'restaurant') return MapPin
  return Warehouse
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function emptyLabel(isEnglish = false) {
  return isEnglish ? 'Not registered' : 'No registrado'
}

function movementLocationLine(movement: InventoryMovementRecord, isEnglish = false) {
  if (movement.fromLocationName && movement.toLocationName) return `${movement.fromLocationName} → ${movement.toLocationName}`
  return movement.fromLocationName ?? movement.toLocationName ?? movement.location ?? emptyLabel(isEnglish)
}

function actorDisplayName(actorName?: string | null, actorUserId?: string | null, isEnglish = false) {
  if (actorName?.trim()) return actorName.trim()
  if (actorUserId) return isEnglish ? 'Registered user' : 'Usuario registrado'
  return isEnglish ? 'System' : 'Sistema'
}

function inventoryStateLabel(value: unknown, isEnglish = false) {
  if (!isRecord(value)) return emptyLabel(isEnglish)
  const quantity = value.quantity ?? value.onHand
  const reserved = value.reservedQuantity ?? value.reserved
  const available = value.available
  return [
    quantity !== undefined ? `${isEnglish ? 'Stock' : 'Existencia'} ${String(quantity)}` : null,
    reserved !== undefined ? `${isEnglish ? 'Reserved' : 'Reservado'} ${String(reserved)}` : null,
    available !== undefined ? `${isEnglish ? 'Available' : 'Disponible'} ${String(available)}` : null,
  ].filter(Boolean).join(' · ') || (isEnglish ? 'Registered with no visible detail' : 'Registrado sin detalle visible')
}

function movementSourceLabel(metadata: Record<string, unknown> | undefined, isEnglish = false) {
  const origin = String(metadata?.origin ?? metadata?.module ?? '').toLowerCase()
  if (origin.includes('order')) return isEnglish ? 'Orders' : 'Órdenes'
  if (origin.includes('checkout')) return isEnglish ? 'Checkout' : 'Checkout'
  if (origin.includes('reservation')) return isEnglish ? 'Reservations' : 'Reservaciones'
  if (origin.includes('purchase')) return isEnglish ? 'Purchases' : 'Compras'
  if (origin.includes('inventory')) return isEnglish ? 'Inventory' : 'Inventario'
  if (origin.includes('control')) return isEnglish ? 'Control Center' : 'Centro de Control'
  return emptyLabel(isEnglish)
}

function movementReferenceLabel(movement: InventoryMovementRecord, isEnglish = false) {
  const type = String(movement.referenceType ?? '').toLowerCase()
  if (type.includes('order')) return isEnglish ? 'Linked order' : 'Orden vinculada'
  if (type.includes('reservation')) return isEnglish ? 'Linked reservation' : 'Reservación vinculada'
  if (type.includes('purchase')) return isEnglish ? 'Purchase record' : 'Compra registrada'
  if (type.includes('transfer')) return isEnglish ? 'Transfer record' : 'Transferencia registrada'
  return movement.referenceType ? (isEnglish ? 'Operational reference' : 'Referencia operativa') : emptyLabel(isEnglish)
}

function normalizeSearch(value: string) {
  return value.toLocaleLowerCase('es-MX').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

export function InventoryPage() {
  const { isEnglish, locale } = useAppPreferences()
  const { session, roles } = useAuth()
  const token = session?.access_token
  const writable = canWrite(roles)
  const [items, setItems] = useState<InventoryRecord[]>([])
  const [locations, setLocations] = useState<InventoryLocationRecord[]>([])
  const [movements, setMovements] = useState<InventoryMovementRecord[]>([])
  const [alerts, setAlerts] = useState<InventoryRecord[]>([])
  const [wines, setWines] = useState<ContentRecord[]>([])
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<InventoryTab>('all')
  const [locationFilter, setLocationFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [modal, setModal] = useState<ModalName>(null)
  const [itemForm, setItemForm] = useState(emptyItem)
  const [locationForm, setLocationForm] = useState(emptyLocation)
  const [selectedItem, setSelectedItem] = useState<InventoryRecord | null>(null)
  const [timelineItem, setTimelineItem] = useState<InventoryRecord | null>(null)
  const [timelineMovements, setTimelineMovements] = useState<InventoryMovementRecord[]>([])
  const [selectedMovementDetail, setSelectedMovementDetail] = useState<InventoryMovementRecord | null>(null)
  const [timelineLoading, setTimelineLoading] = useState(false)
  const [movementAction, setMovementAction] = useState<InventoryMovementAction>('receive')
  const [movementQuantity, setMovementQuantity] = useState('1')
  const [movementReason, setMovementReason] = useState('')
  const [movementTarget, setMovementTarget] = useState('')
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null)

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

  const locationById = useMemo(() => new Map(locations.map((location) => [location.id, location])), [locations])

  const lastMovementByItemId = useMemo(() => {
    const map = new Map<string, InventoryMovementRecord>()
    for (const movement of movements) {
      if (movement.inventoryItemId && !map.has(movement.inventoryItemId)) map.set(movement.inventoryItemId, movement)
    }
    return map
  }, [movements])

  const filtered = useMemo(() => {
    const term = normalizeSearch(search.trim())
    return items.filter((item) => {
      const location = locationById.get(item.locationId)
      const locationType = item.locationType ?? location?.type
      if (activeTab === 'active' && item.status !== 'active') return false
      if (activeTab === 'reserved' && item.reserved <= 0) return false
      if (activeTab === 'low' && !item.lowStock) return false
      if (activeTab === 'empty' && item.onHand > 0) return false
      if (locationFilter.startsWith('location:') && item.locationId !== locationFilter.slice('location:'.length)) return false
      if (locationFilter.startsWith('type:') && locationType !== locationFilter.slice('type:'.length)) return false
      if (!term) return true
      const haystack = normalizeSearch(`${item.wineName} ${item.productName ?? ''} ${item.sku ?? ''} ${item.locationName ?? ''} ${item.locationCode ?? location?.code ?? ''} ${item.lotCode ?? ''}`)
      return haystack.includes(term)
    })
  }, [activeTab, items, locationById, locationFilter, search])

  const metrics = useMemo(() => ({
    units: items.reduce((sum, item) => sum + item.onHand, 0),
    reserved: items.reduce((sum, item) => sum + item.reserved, 0),
    available: items.reduce((sum, item) => sum + item.available, 0),
    locations: new Set(items.map((item) => item.locationId)).size,
  }), [items])

  const tabs = useMemo(() => ([
    { id: 'all' as const, label: 'Todo', count: items.length },
    { id: 'active' as const, label: 'Activo', count: items.filter((item) => item.status === 'active').length },
    { id: 'reserved' as const, label: 'Reservado', count: items.filter((item) => item.reserved > 0).length },
    { id: 'low' as const, label: 'Stock bajo', count: alerts.length },
    { id: 'empty' as const, label: 'Agotado', count: items.filter((item) => item.onHand <= 0).length },
  ]), [alerts.length, items])

  const locationSummaries = useMemo(() => {
    return locations.map((location) => {
      const scoped = items.filter((item) => item.locationId === location.id)
      return {
        location,
        items: scoped.length,
        onHand: scoped.reduce((sum, item) => sum + item.onHand, 0),
        available: scoped.reduce((sum, item) => sum + item.available, 0),
      }
    }).filter((summary) => summary.items > 0 || summary.location.active)
  }, [items, locations])

  const typeSummaries = useMemo(() => {
    const map = new Map<string, { type: string; items: number; onHand: number; available: number }>()
    for (const item of items) {
      const type = item.locationType ?? locationById.get(item.locationId)?.type ?? 'warehouse'
      const current = map.get(type) ?? { type, items: 0, onHand: 0, available: 0 }
      current.items += 1
      current.onHand += item.onHand
      current.available += item.available
      map.set(type, current)
    }
    return [...map.values()].sort((a, b) => locationTypeLabel(a.type, isEnglish).localeCompare(locationTypeLabel(b.type, isEnglish), locale))
  }, [isEnglish, items, locale, locationById])

  async function submitItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      await inventoryClient.createItem(token, {
        wineId: itemForm.wineId,
        locationId: itemForm.locationId,
        sku: itemForm.sku || undefined,
        productName: itemForm.productName || undefined,
        lotCode: itemForm.lotCode || undefined,
        unitOfMeasure: itemForm.unitOfMeasure,
        minimumQuantity: Number(itemForm.minimumQuantity),
        maximumQuantity: itemForm.maximumQuantity ? Number(itemForm.maximumQuantity) : null,
        unitCost: itemForm.unitCost ? Number(itemForm.unitCost) : null,
      })
      setItemForm(emptyItem)
      setModal(null)
      setToast('Producto agregado al inventario.')
      await load()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'No fue posible crear el producto.')
    } finally {
      setSaving(false)
    }
  }

  async function submitLocation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      await inventoryClient.createLocation(token, { ...locationForm, address: locationForm.address || null, active: true })
      setLocationForm(emptyLocation)
      setModal(null)
      setToast('Ubicación creada.')
      await load()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'No fue posible crear la ubicación.')
    } finally {
      setSaving(false)
    }
  }

  function openMovement(item: InventoryRecord, action: InventoryMovementAction) {
    setSelectedItem(item)
    setMovementAction(action)
    setMovementQuantity(action === 'adjust' ? '0' : '1')
    setMovementReason('')
    setMovementTarget('')
    setModal('movement')
  }

  async function openTimeline(item: InventoryRecord) {
    setTimelineItem(item)
    setTimelineMovements([])
    setSelectedMovementDetail(null)
    setTimelineLoading(true)
    setModal('timeline')
    setError('')
    try {
      const response = await inventoryClient.movements(token, { inventoryItemId: item.id, perPage: 100 })
      setTimelineMovements(response.data)
    } catch (timelineError) {
      setError(timelineError instanceof Error ? timelineError.message : 'No fue posible cargar el historial.')
    } finally {
      setTimelineLoading(false)
    }
  }

  async function submitMovement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedItem) return
    setSaving(true)
    setError('')
    try {
      const payload = buildInventoryMovementPayload(movementAction, selectedItem.id, Number(movementQuantity), movementReason, { toLocationId: movementTarget })
      await inventoryClient.operation(token, movementAction, payload)
      setModal(null)
      setToast('Movimiento registrado y existencia actualizada.')
      await load()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'No fue posible registrar el movimiento.')
    } finally {
      setSaving(false)
    }
  }

  function requestArchiveItem(item: InventoryRecord) {
    if (!writable || saving) return
    const product = item.productName ?? item.wineName
    setPendingAction({
      title: isEnglish ? 'Remove inventory item' : 'Eliminar producto del inventario',
      message: isEnglish
        ? `${product} will be archived and hidden from active inventory. Its movement history remains available.`
        : `${product} se archivará y dejará de aparecer en el inventario activo. Su historial de movimientos se conserva.`,
      confirmLabel: isEnglish ? 'Remove' : 'Eliminar',
      success: isEnglish ? 'Inventory item archived.' : 'Producto eliminado del inventario activo.',
      action: () => inventoryClient.updateItem(token, item.id, {
        status: 'archived',
        metadata: {
          archivedFrom: 'control_center',
          archivedReason: 'manual_inventory_removal',
        },
      }),
    })
  }

  async function confirmPendingAction() {
    if (!pendingAction || saving) return
    setSaving(true)
    setError('')
    try {
      await pendingAction.action()
      setToast(pendingAction.success)
      setPendingAction(null)
      await load()
    } catch (archiveError) {
      setError(archiveError instanceof Error ? archiveError.message : (isEnglish ? 'Could not remove inventory item.' : 'No fue posible eliminar el producto.'))
    } finally {
      setSaving(false)
    }
  }

  async function exportCsv() {
    try {
      const response = await inventoryClient.exportCsv(token)
      if (!response.ok) throw new Error('No fue posible exportar.')
      const url = URL.createObjectURL(await response.blob())
      const link = document.createElement('a')
      link.href = url
      link.download = 'inventario-hacienda-de-letras.csv'
      link.click()
      URL.revokeObjectURL(url)
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : 'No fue posible exportar.')
    }
  }

  return (
    <div className="control-page control-page--inventory min-w-0 space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <SectionTitle eyebrow="Operación interna" title="Inventario amplio" subtitle="Existencia real por bodega, cava, boutique, restaurantes y puntos operativos." />
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={load} className={secondaryButton}><RefreshCw size={15} />Actualizar</button>
          <button type="button" onClick={exportCsv} className={secondaryButton}><Download size={15} />Exportar</button>
          <button type="button" disabled={!writable} onClick={() => setModal('location')} className={secondaryButton}><MapPin size={15} />Ubicación</button>
          <button type="button" disabled={!writable || locations.length === 0} onClick={() => setModal('item')} className={primaryButton}><Plus size={15} />Agregar producto</button>
        </div>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={Boxes} label="Partidas" value={String(items.length)} />
        <Metric icon={PackagePlus} label="Existencia total" value={String(metrics.units)} />
        <Metric icon={ArrowRightLeft} label="Reservadas" value={String(metrics.reserved)} />
        <Metric icon={AlertTriangle} label="Alertas" value={String(alerts.length)} tone={alerts.length ? 'alert' : undefined} />
      </section>

      <section className="rounded-xl border border-[var(--color-line)] bg-[var(--color-panel)] p-4 shadow-[var(--shadow-card)]">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex min-h-10 items-center gap-2 rounded-lg border px-4 text-xs font-semibold transition ${activeTab === tab.id ? 'border-[var(--color-burgundy)] bg-[var(--color-burgundy)] text-white' : 'border-[var(--color-line)] bg-white text-[var(--color-ink)]'}`}
              >
                {tab.label}
                <span className={`rounded-full px-2 py-0.5 text-[10px] ${activeTab === tab.id ? 'bg-white/18 text-white' : 'bg-[var(--color-soft)] text-[var(--color-muted)]'}`}>{tab.count}</span>
              </button>
            ))}
          </div>
          <div className="grid gap-3 xl:grid-cols-[minmax(260px,1fr)_260px]">
            <label className="flex min-h-12 items-center gap-3 rounded-xl border border-[var(--color-line)] bg-white px-4">
              <Search size={16} className="text-[var(--color-muted)]" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar vino, SKU, lote, cava, bodega, boutique o restaurante..." className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
            </label>
            <CrystalSelect value={locationFilter} onChange={setLocationFilter}>
              <option value="all">Todas las ubicaciones</option>
              {typeSummaries.map((summary) => <option key={summary.type} value={`type:${summary.type}`}>{locationTypeLabel(summary.type, isEnglish)} · {summary.available} {isEnglish ? 'avail.' : 'disp.'}</option>)}
              {locationSummaries.map(({ location, available }) => <option key={location.id} value={`location:${location.id}`}>{location.name} · {available} disp.</option>)}
            </CrystalSelect>
          </div>
        </div>
      </section>

      <section className="grid gap-3 lg:grid-cols-2 xl:grid-cols-4">
        {typeSummaries.map((summary) => {
          const Icon = locationIcon(summary.type)
          return (
            <button key={summary.type} type="button" onClick={() => setLocationFilter(`type:${summary.type}`)} className="rounded-xl border border-[var(--color-line)] bg-[var(--color-panel)] p-4 text-left shadow-[var(--shadow-card)] transition hover:border-[rgba(91,11,31,0.28)]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">{locationTypeLabel(summary.type, isEnglish)}</p>
                  <p className="mt-2 text-2xl font-semibold text-[var(--color-ink)]">{summary.available}</p>
                  <p className="text-[11px] text-[var(--color-muted)]">{summary.items} partidas · {summary.onHand} existencia</p>
                </div>
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-soft)] text-[var(--color-burgundy)]"><Icon size={17} /></span>
              </div>
            </button>
          )
        })}
      </section>

      {error ? <p className="rounded-xl border border-[#ead8c5] bg-[#fff7ed] p-4 text-sm text-[#8a4b16]">{error}</p> : null}

      <section className="overflow-hidden rounded-xl border border-[var(--color-line)] bg-[var(--color-panel)] shadow-[var(--shadow-card)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-line)] px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-[var(--color-ink)]">Inventario por ubicación</h2>
            <p className="mt-1 text-[11px] text-[var(--color-muted)]">{filtered.length} partidas visibles · {metrics.locations} ubicaciones con movimiento</p>
          </div>
          <button type="button" onClick={() => { setActiveTab('all'); setLocationFilter('all'); setSearch('') }} className="rounded-lg border border-[var(--color-line)] px-3 py-2 text-xs font-semibold text-[var(--color-burgundy)]">Limpiar filtros</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px] text-left text-xs">
            <thead className="bg-[var(--color-soft)] text-[10px] uppercase text-[var(--color-muted)]">
              <tr>
                <th className="px-4 py-3">Producto</th>
                <th className="px-4 py-3">Ubicación</th>
                <th className="px-4 py-3">Existencia</th>
                <th className="px-4 py-3">Reservado</th>
                <th className="px-4 py-3">Disponible</th>
                <th className="px-4 py-3">Mínimo</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Último movimiento</th>
                <th className="px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-line)]">
              {loading ? (
                <tr><td colSpan={9} className="p-10 text-center"><Loader2 className="mx-auto animate-spin" /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={9} className="p-10 text-center text-[var(--color-muted)]">Sin inventario para mostrar.</td></tr>
              ) : filtered.map((item) => {
                const location = locationById.get(item.locationId)
                const lastMovement = lastMovementByItemId.get(item.id)
                return (
                  <tr key={item.id} className="align-top transition hover:bg-[rgba(180,138,85,0.08)]">
                    <td className="px-4 py-3">
                      <div className="flex min-w-[220px] items-center gap-3">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt="" className="h-10 w-10 shrink-0 rounded-lg border border-[var(--color-line)] bg-white object-cover" />
                        ) : (
                          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-[var(--color-line)] bg-white text-[var(--color-burgundy)]">
                            <Wine size={16} />
                          </span>
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-semibold leading-4 text-[var(--color-ink)]">{item.productName ?? item.wineName}</p>
                          <p className="mt-0.5 text-[10px] leading-3 text-[var(--color-muted)]">{item.sku || 'Sin SKU'}{item.lotCode ? ` · lote ${item.lotCode}` : ''}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-[var(--color-ink)]">{item.locationName || 'Sin ubicación'}</p>
                      <p className="mt-1 text-[10px] text-[var(--color-muted)]">{item.locationCode ?? location?.code ?? (isEnglish ? 'No code' : 'Sin código')} · {locationTypeLabel(item.locationType ?? location?.type, isEnglish)}</p>
                    </td>
                    <td className="px-4 py-3 font-semibold text-[var(--color-ink)]">{item.onHand}</td>
                    <td className="px-4 py-3">{item.reserved}</td>
                    <td className="px-4 py-3 font-semibold text-[#252F37]">{item.available}</td>
                    <td className="px-4 py-3">{item.minimum}</td>
                    <td className="px-4 py-3"><StatusBadge label={item.lowStock ? 'Stock bajo' : item.status === 'active' ? 'Correcto' : item.status} /></td>
                    <td className="px-4 py-3">
                      {lastMovement ? (
                        <button type="button" onClick={() => setSelectedMovementDetail(lastMovement)} className="group max-w-[220px] text-left">
                          <p className="truncate font-semibold text-[var(--color-ink)] group-hover:text-[var(--color-burgundy)]">{movementLabel(lastMovement.movementType, isEnglish)} · {lastMovement.quantity > 0 ? '+' : ''}{lastMovement.quantity}</p>
                          <p className="mt-1 truncate text-[10px] text-[var(--color-muted)]">{dateTime(lastMovement.createdAt, locale)} · {actorDisplayName(lastMovement.actorName, lastMovement.actorUserId, isEnglish)}</p>
                        </button>
                      ) : <span className="text-[var(--color-muted)]">{isEnglish ? 'No movement' : 'Sin movimiento'}</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        <ActionIconButton icon={History} label={isEnglish ? 'History' : 'Historial'} onClick={() => void openTimeline(item)} />
                        {writable ? (
                          <>
                            <ActionIconButton icon={PackagePlus} label={isEnglish ? 'Receive stock' : 'Entrada'} onClick={() => openMovement(item, 'receive')} />
                            <ActionIconButton icon={RefreshCw} label={isEnglish ? 'Adjust stock' : 'Ajuste'} onClick={() => openMovement(item, 'adjust')} />
                            <ActionIconButton icon={ArrowRightLeft} label={isEnglish ? 'Transfer stock' : 'Transferir'} onClick={() => openMovement(item, 'transfer')} />
                            <ActionIconButton icon={Trash2} label={isEnglish ? 'Remove' : 'Eliminar'} onClick={() => requestArchiveItem(item)} />
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-[var(--color-line)] bg-[var(--color-panel)] p-4 shadow-[var(--shadow-card)]">
        <h2 className="text-sm font-semibold">Últimos movimientos</h2>
        <div className="mt-3 grid gap-2 lg:grid-cols-2">
          {movements.slice(0, 10).map((movement) => (
            <button key={movement.id} type="button" onClick={() => setSelectedMovementDetail(movement)} className="flex items-start justify-between gap-3 rounded-lg bg-[var(--color-soft)] p-3 text-left text-xs transition hover:bg-white">
              <div className="min-w-0">
                <p className="truncate font-semibold">{movementLabel(movement.movementType, isEnglish)} · {movement.product ?? (isEnglish ? 'Product' : 'Producto')}</p>
                <p className="mt-1 truncate text-[10px] text-[var(--color-muted)]">{movementLocationLine(movement, isEnglish)} · {movement.reason ?? (isEnglish ? 'No note' : 'Sin nota')} · {dateTime(movement.createdAt, locale)}</p>
                <p className="mt-1 truncate text-[10px] text-[var(--color-muted)]">{isEnglish ? 'By' : 'Quién'}: {actorDisplayName(movement.actorName, movement.actorUserId, isEnglish)} · {isEnglish ? 'Source' : 'Origen'}: {movementSourceLabel(movement.metadata, isEnglish)}</p>
              </div>
              <span className="shrink-0 font-semibold">{movement.quantity > 0 ? '+' : ''}{movement.quantity}</span>
            </button>
          ))}
        </div>
      </section>

      {modal === 'item' ? (
        <Modal title="Agregar producto al inventario" onClose={() => setModal(null)}>
          <form onSubmit={submitItem} className="grid gap-3 md:grid-cols-2">
            <ControlEntityPicker label="Vino" value={itemForm.wineId} options={wines.map((wine) => ({ id: wine.id, label: String(wine.name ?? wine.title ?? 'Vino'), description: String(wine.sku ?? 'Sin SKU') }))} onChange={(wineId) => { const wine = wines.find((value) => value.id === wineId); setItemForm({ ...itemForm, wineId, sku: String(wine?.sku ?? ''), productName: String(wine?.name ?? '') }) }} required />
            <ControlEntityPicker label="Ubicación" value={itemForm.locationId} options={locations.map((location) => ({ id: location.id, label: location.name, description: `${location.code || location.type} · ${locationTypeLabel(location.type, isEnglish)}` }))} onChange={(locationId) => setItemForm({ ...itemForm, locationId })} required />
            <Field label="Nombre operativo" value={itemForm.productName} onChange={(productName) => setItemForm({ ...itemForm, productName })} />
            <Field label="SKU" value={itemForm.sku} onChange={(sku) => setItemForm({ ...itemForm, sku })} />
            <Field label="Lote" value={itemForm.lotCode} onChange={(lotCode) => setItemForm({ ...itemForm, lotCode })} />
            <Field label="Unidad" value={itemForm.unitOfMeasure} onChange={(unitOfMeasure) => setItemForm({ ...itemForm, unitOfMeasure })} />
            <Field label="Mínimo" type="number" value={itemForm.minimumQuantity} onChange={(minimumQuantity) => setItemForm({ ...itemForm, minimumQuantity })} />
            <Field label="Máximo" type="number" value={itemForm.maximumQuantity} onChange={(maximumQuantity) => setItemForm({ ...itemForm, maximumQuantity })} />
            <Field label="Costo unitario" type="number" value={itemForm.unitCost} onChange={(unitCost) => setItemForm({ ...itemForm, unitCost })} />
            <Submit saving={saving} label="Agregar" />
          </form>
        </Modal>
      ) : null}

      {modal === 'location' ? (
        <Modal title="Nueva ubicación de inventario" onClose={() => setModal(null)}>
          <form onSubmit={submitLocation} className="grid gap-3 md:grid-cols-2">
            <Field label="Nombre" value={locationForm.name} onChange={(name) => setLocationForm({ ...locationForm, name })} required />
            <Field label="Código" value={locationForm.code} onChange={(code) => setLocationForm({ ...locationForm, code })} />
            <label>
              <span className={labelClass}>Tipo</span>
              <CrystalSelect value={locationForm.type} onChange={(type) => setLocationForm({ ...locationForm, type })}>
                <option value="warehouse">Bodega / almacén</option>
                <option value="cellar">Cava</option>
                <option value="store">Boutique</option>
                <option value="restaurant">Restaurante</option>
                <option value="event_venue">Sede de eventos</option>
              </CrystalSelect>
            </label>
            <Field label="Dirección / referencia" value={locationForm.address} onChange={(address) => setLocationForm({ ...locationForm, address })} />
            <Submit saving={saving} label="Crear ubicación" />
          </form>
        </Modal>
      ) : null}

      {modal === 'movement' && selectedItem ? (
        <Modal title={`${movementAction === 'receive' ? 'Entrada' : movementAction === 'adjust' ? 'Ajuste' : 'Transferencia'} · ${selectedItem.wineName}`} onClose={() => setModal(null)}>
          <form onSubmit={submitMovement} className="grid gap-3 md:grid-cols-2">
            <Field label={movementAction === 'adjust' ? 'Diferencia (+/-)' : 'Cantidad'} type="number" value={movementQuantity} onChange={setMovementQuantity} required />
            {movementAction === 'transfer' ? <ControlEntityPicker label="Destino" value={movementTarget} options={locations.filter((location) => location.id !== selectedItem.locationId).map((location) => ({ id: location.id, label: location.name, description: `${location.code || location.type} · ${locationTypeLabel(location.type, isEnglish)}` }))} onChange={setMovementTarget} required /> : null}
            <Field label="Motivo" value={movementReason} onChange={setMovementReason} required wide />
            <div className="md:col-span-2 rounded-lg bg-[var(--color-soft)] p-3 text-xs">Existencia actual: {selectedItem.onHand} · reservado: {selectedItem.reserved} · disponible: {selectedItem.available}</div>
            <Submit saving={saving} label="Registrar movimiento" />
          </form>
        </Modal>
      ) : null}

      {modal === 'timeline' && timelineItem ? (
        <Modal title={`Historial · ${timelineItem.wineName}`} onClose={() => { setModal(null); setSelectedMovementDetail(null) }}>
          <div className="space-y-4">
            <div className="grid gap-3 rounded-xl border border-[var(--color-line)] bg-white p-4 text-xs md:grid-cols-4">
              <Info label="Producto" value={timelineItem.productName ?? timelineItem.wineName} />
              <Info label="SKU / lote" value={[timelineItem.sku, timelineItem.lotCode].filter(Boolean).join(' · ') || 'No registrado'} />
              <Info label="Ubicación actual" value={timelineItem.locationName ?? 'No registrado'} />
              <Info label="Disponible" value={String(timelineItem.available)} />
            </div>
            {timelineLoading ? (
              <div className="p-8 text-center"><Loader2 className="mx-auto animate-spin" /></div>
            ) : timelineMovements.length === 0 ? (
              <p className="rounded-xl bg-[var(--color-soft)] p-4 text-sm text-[var(--color-muted)]">Sin movimientos registrados para esta partida.</p>
            ) : (
              <div className="space-y-3">
                {timelineMovements.map((movement) => <MovementCard key={movement.id} movement={movement} isEnglish={isEnglish} locale={locale} onClick={() => setSelectedMovementDetail(movement)} />)}
              </div>
            )}
          </div>
        </Modal>
      ) : null}

      {selectedMovementDetail ? (
        <Modal title={`${isEnglish ? 'Movement' : 'Movimiento'} · ${movementLabel(selectedMovementDetail.movementType, isEnglish)}`} onClose={() => setSelectedMovementDetail(null)}>
          <MovementDetail movement={selectedMovementDetail} isEnglish={isEnglish} locale={locale} />
        </Modal>
      ) : null}

      <ControlConfirmDialog
        open={Boolean(pendingAction)}
        title={pendingAction?.title ?? ''}
        message={pendingAction?.message ?? ''}
        confirmLabel={pendingAction?.confirmLabel}
        tone="danger"
        busy={saving}
        onCancel={() => setPendingAction(null)}
        onConfirm={confirmPendingAction}
      />

      {toast ? <div className="fixed bottom-6 right-6 z-[180] rounded-xl border border-[rgba(37,47,55,0.24)] bg-white px-4 py-3 text-sm font-semibold text-[#252F37] shadow-xl">{toast}<button onClick={() => setToast('')} className="ml-3"><X size={14} /></button></div> : null}
    </div>
  )
}

const secondaryButton = 'inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--color-line)] bg-white px-4 text-xs font-semibold text-[var(--color-burgundy)] disabled:opacity-45'
const primaryButton = 'inline-flex min-h-10 items-center gap-2 rounded-xl bg-[var(--color-burgundy)] px-4 text-xs font-semibold text-white disabled:opacity-45'
const labelClass = 'mb-1 block text-[10px] font-semibold uppercase text-[var(--color-muted)]'

function Metric({ icon: Icon, label, value, tone }: { icon: typeof Boxes; label: string; value: string; tone?: 'alert' }) {
  return (
    <article className="rounded-xl border border-[var(--color-line)] bg-[var(--color-panel)] p-4 shadow-[var(--shadow-card)]">
      <div className="flex justify-between">
        <div>
          <p className="text-[10px] uppercase text-[var(--color-muted)]">{label}</p>
          <p className={`mt-1 text-2xl font-semibold ${tone ? 'text-[var(--color-alert)]' : 'text-[var(--color-ink)]'}`}>{value}</p>
        </div>
        <Icon size={18} className={tone ? 'text-[var(--color-alert)]' : 'text-[var(--color-burgundy)]'} />
      </div>
    </article>
  )
}

function ActionIconButton({ icon: Icon, label, onClick }: { icon: LucideIcon; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className="group relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[rgba(91,11,31,0.22)] bg-[#F7F2EA] text-[var(--color-burgundy)] shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] transition hover:border-[rgba(91,11,31,0.48)] hover:bg-[#681126] hover:text-[#fff6e8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(180,138,85,0.45)]"
    >
      <Icon size={15} strokeWidth={1.8} />
      <span className="pointer-events-none absolute bottom-[calc(100%+0.45rem)] left-1/2 z-20 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-[#250611] px-2 py-1 text-[10px] font-semibold text-[#fff6e8] shadow-lg group-hover:block">
        {label}
      </span>
    </button>
  )
}

function MovementCard({ movement, isEnglish, locale, onClick }: { movement: InventoryMovementRecord; isEnglish: boolean; locale: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="w-full rounded-xl border border-[var(--color-line)] bg-white p-4 text-left text-xs shadow-sm transition hover:border-[rgba(91,11,31,0.3)]">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--color-ink)]">{movementLabel(movement.movementType, isEnglish)}</p>
          <p className="mt-1 text-[var(--color-muted)]">{dateTime(movement.createdAt, locale)} · {movementLocationLine(movement, isEnglish)}</p>
          <p className="mt-1 text-[var(--color-muted)]">{isEnglish ? 'By' : 'Quién'}: {actorDisplayName(movement.actorName, movement.actorUserId, isEnglish)} · {isEnglish ? 'Reason' : 'Motivo'}: {movement.reason ?? emptyLabel(isEnglish)}</p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[rgba(37,47,55,0.18)] px-3 py-1 font-semibold text-[var(--color-ink)]">
          {movement.quantity > 0 ? '+' : ''}{movement.quantity}
          <ChevronRight size={13} />
        </span>
      </div>
    </button>
  )
}

function MovementDetail({ movement, isEnglish, locale }: { movement: InventoryMovementRecord; isEnglish: boolean; locale: string }) {
  const metadata = movement.metadata ?? {}
  return (
    <div className="space-y-4 text-xs">
      <div className="grid gap-3 md:grid-cols-3">
        <Info label={isEnglish ? 'What happened' : 'Qué pasó'} value={movementLabel(movement.movementType, isEnglish)} />
        <Info label={isEnglish ? 'Who did it' : 'Quién lo hizo'} value={actorDisplayName(movement.actorName, movement.actorUserId, isEnglish)} />
        <Info label={isEnglish ? 'When' : 'Cuándo'} value={dateTime(movement.createdAt, locale)} />
        <Info label={isEnglish ? 'Product' : 'Producto'} value={movement.product ?? movement.sku ?? emptyLabel(isEnglish)} />
        <Info label={isEnglish ? 'Quantity' : 'Cantidad'} value={`${movement.quantity > 0 ? '+' : ''}${movement.quantity}`} />
        <Info label={isEnglish ? 'Location' : 'Ubicación'} value={movementLocationLine(movement, isEnglish)} />
        <Info label={isEnglish ? 'Reference' : 'Referencia'} value={movementReferenceLabel(movement, isEnglish)} />
        <Info label={isEnglish ? 'Reason' : 'Motivo'} value={movement.reason ?? emptyLabel(isEnglish)} />
        <Info label={isEnglish ? 'Source' : 'Origen'} value={movementSourceLabel(metadata, isEnglish)} />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-[var(--color-line)] bg-white p-4">
          <p className="text-[10px] font-semibold uppercase text-[var(--color-muted)]">{isEnglish ? 'Before' : 'Antes'}</p>
          <p className="mt-2 text-sm font-semibold text-[var(--color-ink)]">{inventoryStateLabel(metadata.stateBefore, isEnglish)}</p>
        </div>
        <div className="rounded-xl border border-[var(--color-line)] bg-white p-4">
          <p className="text-[10px] font-semibold uppercase text-[var(--color-muted)]">{isEnglish ? 'After' : 'Después'}</p>
          <p className="mt-2 text-sm font-semibold text-[var(--color-ink)]">{inventoryStateLabel(metadata.stateAfter, isEnglish)}</p>
        </div>
      </div>
    </div>
  )
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="control-form-overlay fixed inset-0 z-[150] flex items-center justify-center bg-[#210711]/68 p-4 backdrop-blur-sm">
      <button type="button" aria-label="Cerrar" className="absolute inset-0" onClick={onClose} />
      <section className="control-form-surface relative z-10 max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-[var(--color-line)] bg-[var(--color-page)] p-5 shadow-2xl" role="dialog" aria-modal="true" aria-label={title}>
        <header className="control-form-header mb-5 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-[var(--color-burgundy)]">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Cerrar"><X size={17} /></button>
        </header>
        {children}
      </section>
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0 rounded-xl bg-[var(--color-soft)] p-3"><p className="text-[10px] font-semibold uppercase text-[var(--color-muted)]">{label}</p><p className="mt-1 break-words text-[var(--color-ink)]">{value}</p></div>
}

function Field({ label, value, onChange, type = 'text', required, wide }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean; wide?: boolean }) {
  return <label className={wide ? 'md:col-span-2' : ''}><span className={labelClass}>{label}{required ? ' *' : ''}</span><input type={type} step={type === 'number' ? 'any' : undefined} required={required} value={value} onChange={(event) => onChange(event.target.value)} className="min-h-11 w-full rounded-xl border border-[var(--color-line)] bg-white px-3 text-sm outline-none" /></label>
}

function Submit({ saving, label }: { saving: boolean; label: string }) {
  return <div className="flex justify-end md:col-span-2"><button type="submit" disabled={saving} className={primaryButton}>{saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}{label}</button></div>
}
