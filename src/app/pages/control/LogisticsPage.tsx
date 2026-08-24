import {
  AlertTriangle,
  ArrowDownAZ,
  ArrowUpAZ,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Loader2,
  PackageCheck,
  PackageOpen,
  Plus,
  RefreshCw,
  Route,
  ScanBarcode,
  Search,
  Send,
  ShoppingBag,
  SlidersHorizontal,
  Truck,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { useAuth } from '../../../contexts/AuthContext'
import { ordersClient, type OrderRecord } from '../../../services/commerce.service'
import { shipmentsClient, type ShipmentRecord } from '../../../services/phase7e.service'
import { ControlConfirmDialog } from '../../components/control/ControlConfirmDialog'
import { ControlEntityPicker } from '../../components/control/ControlEntityPicker'
import { CrystalDateTimeField } from '../../components/shared/CrystalDateField'
import { CrystalSelect } from '../../components/shared/CrystalSelect'
import { useAppPreferences } from '../../context/AppPreferencesContext'
import { dateOnly, money, statusLabel as safeStatusLabel } from './controlCopy'
import { shipmentActionsFor, type ShipmentAction } from './phase7e/operationsUtils'

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
  'inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[rgba(180,138,85,0.38)] bg-[#F7F2EA] px-4 text-xs font-semibold text-[#681126] shadow-[0_10px_22px_rgba(37,47,55,0.08)] transition hover:border-[#B48A55] hover:bg-white'
const primary =
  'inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#681126] px-4 text-xs font-semibold text-[#F7F2EA] shadow-[0_14px_28px_rgba(104,17,38,0.22)] transition hover:bg-[#54101f] disabled:cursor-not-allowed disabled:opacity-50'

type LogisticsQuickFilter = 'all' | 'active' | 'attention' | 'planned' | 'delivered'
type SortKey = 'updatedAt' | 'status' | 'orderType' | 'product' | 'month' | 'customer' | 'carrier'
type SortDirection = 'asc' | 'desc'
type ListResponse<T> = { data: T[]; pagination: { page: number; perPage: number; total: number } }
type LogisticsRecord = ShipmentRecord & {
  logisticsKey: string
  logisticsKind: 'shipment' | 'order'
  shipmentId?: string | null
  order?: OrderRecord
  orderTotal?: number | null
  currency?: string | null
}

type LogisticsCopy = {
  eyebrow: string
  title: string
  subtitle: string
  search: string
  refresh: string
  newShipment: string
  all: string
  active: string
  attention: string
  planned: string
  delivered: string
  status: string
  orderType: string
  productType: string
  month: string
  sortBy: string
  direction: string
  clear: string
  allStatuses: string
  allTypes: string
  allProducts: string
  allMonths: string
  newest: string
  customer: string
  carrier: string
  product: string
  asc: string
  desc: string
  visible: string
  empty: string
  loading: string
  route: string
  origin: string
  destination: string
  guide: string
  noGuide: string
  ownCarrier: string
  noOrder: string
  noCustomer: string
  noProduct: string
  estimated: string
  deliveredAt: string
  noDate: string
  cost: string
  noAmounts: string
  detail: string
  source: string
  ticketTotal: string
  items: string
  totalUnits: string
  updated: string
  tracking: string
  noActions: string
  createHint: string
  order: string
  serviceLevel: string
  trackingNumber: string
  trackingUrl: string
  shippingCost: string
  createShipment: string
  updateTitle: string
  updateLabel: string
  confirmDelivery: string
  confirmDeliveryMessage: string
  deliveredLabel: string
  cancelShipment: string
  cancelMessage: string
  toastCreatedGuide: string
  toastCreated: string
  toastUpdated: string
  loadError: string
  ordersError: string
  createError: string
  updateError: string
  actionPreparing: string
  actionReady: string
  actionShip: string
  actionTransit: string
  actionDeliver: string
  actionCancel: string
}

function canWrite(roles: string[]) {
  return roles.some((role) => ['super_admin', 'admin', 'operations'].includes(role))
}

function normalizeText(value: unknown) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function emptyLabel(isEnglish = false) {
  return isEnglish ? 'Pending' : 'Pendiente'
}

function shipmentStatus(value: string | null | undefined, isEnglish = false) {
  const labels: Record<string, string> = {
    not_required: 'No requiere envío',
    pending: 'Pendiente',
    pending_preparation: 'Por preparar',
    preparing: 'Preparando',
    ready: 'Lista para salida',
    awaiting_tracking: 'Guía pendiente',
    tracking_assigned: 'Guía asignada',
    shipped: 'Enviada',
    in_transit: 'En tránsito',
    delivered: 'Entregada',
    failed: 'Incidencia',
    returned: 'Devuelta',
    cancelled: 'Cancelada',
  }
  const englishLabels: Record<string, string> = {
    not_required: 'Shipping not required',
    pending: 'Pending',
    pending_preparation: 'Preparing',
    preparing: 'Preparing',
    ready: 'Ready to ship',
    awaiting_tracking: 'Tracking pending',
    tracking_assigned: 'Tracking assigned',
    shipped: 'Shipped',
    in_transit: 'In transit',
    delivered: 'Delivered',
    failed: 'Incident',
    returned: 'Returned',
    cancelled: 'Cancelled',
  }
  const current = value ?? ''
  return (isEnglish ? englishLabels[current] : labels[current]) ?? safeStatusLabel(current, isEnglish ? 'en-US' : 'es-MX')
}

function shipmentTone(status: string) {
  if (['delivered', 'not_required'].includes(status)) {
    return 'border-[rgba(37,47,55,0.32)] bg-[#252F37] text-[#F7F2EA]'
  }
  if (['failed', 'returned', 'cancelled'].includes(status)) {
    return 'border-[rgba(104,17,38,0.36)] bg-[rgba(104,17,38,0.1)] text-[#681126]'
  }
  if (['shipped', 'in_transit', 'tracking_assigned'].includes(status)) {
    return 'border-[rgba(180,138,85,0.42)] bg-[rgba(180,138,85,0.18)] text-[#252F37]'
  }
  return 'border-[rgba(232,216,200,0.9)] bg-[#F7F2EA] text-[#681126]'
}

function orderTypeLabel(value: string | null | undefined, isEnglish = false) {
  const labels: Record<string, string> = {
    wine: 'Vino',
    event: 'Evento',
    ticket: 'Evento',
    event_ticket: 'Evento',
    experience: 'Experiencia',
    experience_reservation: 'Experiencia',
    lodging: 'Hospedaje',
    cabin: 'Hospedaje',
    restaurant: 'Restaurante',
    food: 'Restaurante',
    mixed: 'Pedido mixto',
    physical_order: 'Producto físico',
    service_order: 'Servicio',
    manual: 'Manual',
  }
  const englishLabels: Record<string, string> = {
    wine: 'Wine',
    event: 'Event',
    ticket: 'Event',
    event_ticket: 'Event',
    experience: 'Experience',
    experience_reservation: 'Experience',
    lodging: 'Lodging',
    cabin: 'Lodging',
    restaurant: 'Restaurant',
    food: 'Restaurant',
    mixed: 'Mixed order',
    physical_order: 'Physical product',
    service_order: 'Service',
    manual: 'Manual',
  }
  const key = String(value ?? '').trim()
  if (!key) return isEnglish ? 'Unclassified order' : 'Pedido sin clasificar'
  return (isEnglish ? englishLabels[key] : labels[key]) ?? safeStatusLabel(key, isEnglish ? 'en-US' : 'es-MX')
}

function orderTypeIcon(value: string | null | undefined) {
  const key = String(value ?? '')
  if (['wine', 'physical_order', 'mixed'].includes(key)) return PackageOpen
  if (['event', 'ticket', 'event_ticket', 'experience', 'experience_reservation'].includes(key)) return ClipboardList
  if (['lodging', 'cabin'].includes(key)) return CalendarClock
  if (['restaurant', 'food'].includes(key)) return ShoppingBag
  return PackageCheck
}

function sourceLabel(value: string | null | undefined, isEnglish = false) {
  const normalized = normalizeText(value).replace(/[\s_-]+/g, '_')
  const labels: Record<string, string> = {
    app: 'App',
    mobile: 'App',
    mobile_app: 'App',
    ios: 'App iOS',
    android: 'App Android',
    web: 'Web',
    ecommerce: 'Web',
    checkout: 'Web',
    tienda_en_linea: 'Web',
    centro_de_control: 'Centro de control',
    control_center: 'Centro de control',
    admin: 'Centro de control',
    manual: 'Centro de control',
  }
  const englishLabels: Record<string, string> = {
    app: 'App',
    mobile: 'App',
    mobile_app: 'App',
    ios: 'iOS app',
    android: 'Android app',
    web: 'Web',
    ecommerce: 'Web',
    checkout: 'Web',
    tienda_en_linea: 'Web',
    centro_de_control: 'Control Center',
    control_center: 'Control Center',
    admin: 'Control Center',
    manual: 'Control Center',
  }
  if (!normalized) return isEnglish ? 'Unknown' : 'Sin origen'
  return (isEnglish ? englishLabels[normalized] : labels[normalized]) ?? safeStatusLabel(value, isEnglish ? 'en-US' : 'es-MX')
}

function progressFor(status: string) {
  const progress: Record<string, number> = {
    not_required: 100,
    pending: 12,
    pending_preparation: 22,
    preparing: 36,
    ready: 50,
    awaiting_tracking: 58,
    tracking_assigned: 66,
    shipped: 76,
    in_transit: 86,
    delivered: 100,
    failed: 42,
    returned: 35,
    cancelled: 8,
  }
  return progress[status] ?? 10
}

function shipmentDate(item: ShipmentRecord) {
  return item.deliveredAt ?? item.estimatedDeliveryAt ?? item.shippedAt ?? item.updatedAt ?? item.createdAt ?? item.orderCreatedAt ?? null
}

function monthKey(item: ShipmentRecord) {
  const value = shipmentDate(item)
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function monthLabel(value: string, locale: string) {
  if (!value) return ''
  const date = new Date(`${value}-01T12:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(date)
}

function timestamp(value?: string | null) {
  const parsed = Date.parse(value ?? '')
  return Number.isFinite(parsed) ? parsed : 0
}

function statusRank(status: string) {
  const ranks: Record<string, number> = {
    failed: 0,
    returned: 1,
    cancelled: 2,
    pending: 3,
    pending_preparation: 4,
    preparing: 5,
    ready: 6,
    awaiting_tracking: 7,
    tracking_assigned: 8,
    shipped: 9,
    in_transit: 10,
    delivered: 11,
    not_required: 12,
  }
  return ranks[status] ?? 99
}

function sortValue(item: ShipmentRecord, sortBy: SortKey) {
  if (sortBy === 'status') return statusRank(item.status)
  if (sortBy === 'orderType') return normalizeText(orderTypeLabel(item.orderType))
  if (sortBy === 'product') return normalizeText(item.productSummary ?? '')
  if (sortBy === 'month') return monthKey(item)
  if (sortBy === 'customer') return normalizeText(item.customerName ?? '')
  if (sortBy === 'carrier') return normalizeText(item.carrierName ?? '')
  return timestamp(item.updatedAt ?? item.createdAt ?? item.orderCreatedAt)
}

function compareShipments(a: ShipmentRecord, b: ShipmentRecord, sortBy: SortKey, direction: SortDirection) {
  const left = sortValue(a, sortBy)
  const right = sortValue(b, sortBy)
  const factor = direction === 'asc' ? 1 : -1
  if (typeof left === 'number' && typeof right === 'number') return (left - right) * factor
  return String(left).localeCompare(String(right), 'es-MX') * factor
}

async function loadAllPages<T>(loader: (page: number) => Promise<ListResponse<T>>, maxPages = 20) {
  const first = await loader(1)
  const all = [...first.data]
  const perPage = first.pagination?.perPage || first.data.length || 100
  const total = first.pagination?.total ?? first.data.length
  const pages = Math.min(maxPages, Math.max(1, Math.ceil(total / perPage)))
  for (let page = 2; page <= pages; page += 1) {
    const next = await loader(page)
    all.push(...next.data)
  }
  return all
}

function matchesQuickFilter(item: ShipmentRecord, filter: LogisticsQuickFilter) {
  if (filter === 'all') return true
  if (filter === 'attention') return item.incidentCount > 0 || ['failed', 'returned', 'cancelled'].includes(item.status)
  if (filter === 'planned') return ['pending', 'pending_preparation', 'preparing', 'ready', 'awaiting_tracking'].includes(item.status)
  if (filter === 'delivered') return ['delivered', 'not_required'].includes(item.status)
  return ['pending', 'pending_preparation', 'preparing', 'ready', 'awaiting_tracking', 'tracking_assigned', 'shipped', 'in_transit'].includes(item.status)
}

function compactDate(value: string | null | undefined, locale: string, fallback: string) {
  if (!value) return fallback
  return dateOnly(value, locale)
}

function cleanParts(values: Array<string | null | undefined>) {
  return values.map((value) => value?.trim()).filter((value): value is string => Boolean(value))
}

function orderDestination(order: OrderRecord) {
  const address = order.shippingAddress
  if (!address) return null
  return cleanParts([
    address.line1,
    address.line2,
    address.neighborhood,
    address.city,
    address.state,
    address.postalCode,
    address.country,
  ]).join(', ')
}

function orderTypeFromOrder(order: OrderRecord) {
  const types = [...new Set((order.itemTypes ?? []).filter(Boolean))]
  if (types.length > 1) return 'mixed'
  if (types[0]) return types[0]
  return order.requiresShipping ? 'physical_order' : 'service_order'
}

function shouldShowOrderInLogistics(order: OrderRecord) {
  if (order.status === 'cancelled') return true
  if (order.requiresShipping) return true
  if (order.shipment) return true
  if ((order.itemTypes ?? []).some((type) => ['wine', 'physical_order', 'mixed'].includes(type))) return true
  return Boolean(order.shippingStatus && order.shippingStatus !== 'not_required')
}

function logisticsFromOrder(order: OrderRecord): LogisticsRecord {
  const shipment = order.shipment
  const status = shipment?.status ?? order.shippingStatus ?? (order.requiresShipping ? 'pending_preparation' : 'not_required')
  return {
    id: shipment?.id ?? `order:${order.id}`,
    logisticsKey: shipment?.id ?? `order:${order.id}`,
    logisticsKind: shipment ? 'shipment' : 'order',
    shipmentId: shipment?.id ?? null,
    order,
    shipmentNumber: shipment?.shipmentNumber ?? null,
    orderId: order.id,
    orderNumber: order.orderNumber,
    orderStatus: order.status,
    orderSource: order.source,
    orderCreatedAt: order.createdAt,
    orderRequiresShipping: order.requiresShipping ?? false,
    orderType: orderTypeFromOrder(order),
    productSummary: order.itemSummary ?? null,
    productImageUrl: order.itemImageUrl ?? null,
    productTypes: order.itemTypes ?? [],
    itemCount: order.itemCount ?? 0,
    totalQuantity: order.totalQuantity ?? 0,
    customerName: order.customerName,
    carrierName: shipment?.carrier ?? null,
    serviceLevel: null,
    trackingNumber: shipment?.trackingNumber ?? null,
    trackingUrl: shipment?.trackingUrl ?? null,
    origin: 'Hacienda de Letras',
    destination: orderDestination(order),
    status,
    orderTotal: order.total ?? null,
    currency: order.currency,
    shippingCost: shipment?.shippingCost ?? order.shippingTotal ?? null,
    estimatedDeliveryAt: null,
    shippedAt: shipment?.shippedAt ?? null,
    deliveredAt: shipment?.deliveredAt ?? order.fulfilledAt ?? null,
    incidentCount: ['failed', 'returned', 'cancelled'].includes(status) ? 1 : 0,
    createdAt: shipment?.shippedAt ?? order.createdAt,
    updatedAt: shipment?.deliveredAt ?? order.updatedAt,
  }
}

function mergeLogisticsRecords(shipments: ShipmentRecord[], orders: OrderRecord[]): LogisticsRecord[] {
  const ordersById = new Map(orders.map((order) => [order.id, order]))
  const coveredOrderIds = new Set<string>()
  const rows = shipments.map((shipment): LogisticsRecord => {
    const order = shipment.orderId ? ordersById.get(shipment.orderId) : undefined
    if (shipment.orderId) coveredOrderIds.add(shipment.orderId)
    return {
      ...shipment,
      logisticsKey: shipment.id,
      logisticsKind: 'shipment',
      shipmentId: shipment.id,
      order,
      orderNumber: shipment.orderNumber ?? order?.orderNumber,
      orderStatus: shipment.orderStatus ?? order?.status,
      orderSource: shipment.orderSource ?? order?.source,
      orderCreatedAt: shipment.orderCreatedAt ?? order?.createdAt,
      orderRequiresShipping: shipment.orderRequiresShipping ?? order?.requiresShipping ?? null,
      orderType: shipment.orderType ?? (order ? orderTypeFromOrder(order) : null),
      productSummary: shipment.productSummary ?? order?.itemSummary ?? null,
      productImageUrl: shipment.productImageUrl ?? order?.itemImageUrl ?? null,
      productTypes: shipment.productTypes?.length ? shipment.productTypes : order?.itemTypes ?? [],
      itemCount: shipment.itemCount ?? order?.itemCount ?? 0,
      totalQuantity: shipment.totalQuantity ?? order?.totalQuantity ?? 0,
      customerName: shipment.customerName ?? order?.customerName,
      carrierName: shipment.carrierName ?? order?.shipment?.carrier ?? null,
      trackingNumber: shipment.trackingNumber ?? order?.shipment?.trackingNumber ?? null,
      trackingUrl: shipment.trackingUrl ?? order?.shipment?.trackingUrl ?? null,
      destination: shipment.destination ?? (order ? orderDestination(order) : null),
      orderTotal: shipment.orderTotal ?? order?.total ?? null,
      currency: shipment.currency ?? order?.currency ?? 'MXN',
      shippingCost: shipment.shippingCost ?? order?.shippingTotal ?? null,
    }
  })

  for (const order of orders) {
    if (!shouldShowOrderInLogistics(order) || coveredOrderIds.has(order.id)) continue
    rows.push(logisticsFromOrder(order))
  }

  return rows
}

function logisticsActionsFor(item: LogisticsRecord | null): ShipmentAction[] {
  if (!item) return []
  if (item.shipmentId) return shipmentActionsFor(item.status)
  switch (item.status) {
    case 'pending':
    case 'pending_preparation':
      return ['preparing', 'shipped', 'delivered']
    case 'preparing':
      return ['shipped', 'delivered']
    case 'ready':
    case 'awaiting_tracking':
    case 'tracking_assigned':
      return ['shipped', 'delivered']
    case 'shipped':
    case 'in_transit':
    case 'failed':
      return ['delivered']
    default:
      return []
  }
}

function logisticsCopy(isEnglish: boolean): LogisticsCopy {
  return isEnglish ? {
    eyebrow: 'Internal operation',
    title: 'Logistics',
    subtitle: 'Operational tracking by order, purchase source, product, route and delivery progress.',
    search: 'Search order, product, customer, guide or destination...',
    refresh: 'Refresh',
    newShipment: 'New shipment',
    all: 'All orders',
    active: 'In movement',
    attention: 'Needs attention',
    planned: 'Planned',
    delivered: 'Delivered',
    status: 'Status',
    orderType: 'Order type',
    productType: 'Product',
    month: 'Month',
    sortBy: 'Sort by',
    direction: 'Direction',
    clear: 'Clear filters',
    allStatuses: 'All statuses',
    allTypes: 'All order types',
    allProducts: 'All products',
    allMonths: 'All months',
    newest: 'Newest activity',
    customer: 'Customer',
    carrier: 'Carrier',
    product: 'Product',
    asc: 'Ascending',
    desc: 'Descending',
    visible: 'visible records',
    empty: 'No logistics orders match these filters.',
    loading: 'Loading logistics...',
    route: 'Route',
    origin: 'Origin',
    destination: 'Destination',
    guide: 'Guide',
    noGuide: 'No guide',
    ownCarrier: 'Internal operation',
    noOrder: 'No order',
    noCustomer: 'No customer',
    noProduct: 'Product pending',
    estimated: 'Estimated',
    deliveredAt: 'Delivered',
    noDate: 'No date',
    cost: 'Cost',
    noAmounts: 'No amounts',
    detail: 'Logistics detail',
    source: 'Purchase source',
    ticketTotal: 'Ticket total',
    items: 'Items',
    totalUnits: 'Units',
    updated: 'Updated',
    tracking: 'Open tracking',
    noActions: 'This shipment has no pending changes.',
    createHint: 'If you capture the tracking guide, the customer will see it in the app.',
    order: 'Order',
    serviceLevel: 'Service level',
    trackingNumber: 'Tracking number',
    trackingUrl: 'Tracking link',
    shippingCost: 'Shipping cost',
    createShipment: 'Create shipment',
    updateTitle: 'Update shipment',
    updateLabel: 'Update',
    confirmDelivery: 'Confirm delivery',
    confirmDeliveryMessage: 'Confirm that the recipient received the order.',
    deliveredLabel: 'Delivered',
    cancelShipment: 'Cancel shipment',
    cancelMessage: 'The shipment will remain cancelled in the history.',
    toastCreatedGuide: 'Shipment created and tracking guide notified to the customer.',
    toastCreated: 'Shipment created.',
    toastUpdated: 'Logistics updated.',
    loadError: 'Logistics could not be loaded.',
    ordersError: 'Orders could not be loaded.',
    createError: 'Shipment could not be created.',
    updateError: 'Could not update shipment.',
    actionPreparing: 'Preparing',
    actionReady: 'Ready',
    actionShip: 'Ship',
    actionTransit: 'In transit',
    actionDeliver: 'Deliver',
    actionCancel: 'Cancel',
  } : {
    eyebrow: 'Operación interna',
    title: 'Logística y entregas',
    subtitle: 'Seguimiento operativo por orden, origen de compra, producto, ruta y avance de entrega.',
    search: 'Buscar orden, producto, cliente, guía o destino...',
    refresh: 'Actualizar',
    newShipment: 'Nuevo envío',
    all: 'Todas las órdenes',
    active: 'En movimiento',
    attention: 'Requieren atención',
    planned: 'Planeadas',
    delivered: 'Entregadas',
    status: 'Estatus',
    orderType: 'Tipo de pedido',
    productType: 'Producto',
    month: 'Mes',
    sortBy: 'Ordenar por',
    direction: 'Dirección',
    clear: 'Limpiar filtros',
    allStatuses: 'Todos los estatus',
    allTypes: 'Todos los tipos',
    allProducts: 'Todos los productos',
    allMonths: 'Todos los meses',
    newest: 'Actividad reciente',
    customer: 'Cliente',
    carrier: 'Transportista',
    product: 'Producto',
    asc: 'Ascendente',
    desc: 'Descendente',
    visible: 'registros visibles',
    empty: 'No hay órdenes de logística con estos filtros.',
    loading: 'Cargando logística...',
    route: 'Ruta',
    origin: 'Origen',
    destination: 'Destino',
    guide: 'Guía',
    noGuide: 'Sin guía',
    ownCarrier: 'Operación propia',
    noOrder: 'Sin orden',
    noCustomer: 'Sin cliente',
    noProduct: 'Producto pendiente',
    estimated: 'Estimada',
    deliveredAt: 'Entregada',
    noDate: 'Sin fecha',
    cost: 'Costo',
    noAmounts: 'Sin importes',
    detail: 'Detalle logístico',
    source: 'Origen de compra',
    ticketTotal: 'Total del ticket',
    items: 'Partidas',
    totalUnits: 'Unidades',
    updated: 'Actualizado',
    tracking: 'Abrir rastreo',
    noActions: 'Este envío ya no tiene cambios pendientes.',
    createHint: 'Si capturas la guía, el cliente la verá en su app.',
    order: 'Orden',
    serviceLevel: 'Nivel de servicio',
    trackingNumber: 'Número de guía',
    trackingUrl: 'Enlace de rastreo',
    shippingCost: 'Costo de envío',
    createShipment: 'Crear envío',
    updateTitle: 'Actualizar envío',
    updateLabel: 'Actualizar',
    confirmDelivery: 'Confirmar entrega',
    confirmDeliveryMessage: 'Confirma que el destinatario recibió el pedido.',
    deliveredLabel: 'Entregado',
    cancelShipment: 'Cancelar envío',
    cancelMessage: 'El envío quedará cancelado en el historial.',
    toastCreatedGuide: 'Envío creado y guía notificada al cliente.',
    toastCreated: 'Envío creado.',
    toastUpdated: 'Logística actualizada.',
    loadError: 'No fue posible cargar logística.',
    ordersError: 'No fue posible cargar órdenes.',
    createError: 'No fue posible crear el envío.',
    updateError: 'No fue posible actualizar.',
    actionPreparing: 'Preparando',
    actionReady: 'Lista',
    actionShip: 'Enviar',
    actionTransit: 'En tránsito',
    actionDeliver: 'Entregar',
    actionCancel: 'Cancelar',
  }
}

export function LogisticsPage() {
  const { isEnglish, locale } = useAppPreferences()
  const copy = useMemo(() => logisticsCopy(isEnglish), [isEnglish])
  const { session, roles, financialAccess } = useAuth()
  const token = session?.access_token
  const writable = canWrite(roles)
  const [shipments, setShipments] = useState<ShipmentRecord[]>([])
  const [orders, setOrders] = useState<OrderRecord[]>([])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [quickFilter, setQuickFilter] = useState<LogisticsQuickFilter>('all')
  const [orderType, setOrderType] = useState('')
  const [productType, setProductType] = useState('')
  const [month, setMonth] = useState('')
  const [sortBy, setSortBy] = useState<SortKey>('updatedAt')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [selected, setSelected] = useState<LogisticsRecord | null>(null)
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
      const [shipmentRows, orderRows] = await Promise.all([
        loadAllPages((page) => shipmentsClient.list(token, { page, perPage: 100 })),
        loadAllPages((page) => ordersClient.list(token, { page, perPage: 100 })),
      ])
      const logisticsOrders = orderRows.filter(shouldShowOrderInLogistics)
      const logisticsRows = mergeLogisticsRecords(shipmentRows, logisticsOrders)
      setShipments(shipmentRows)
      setOrders(logisticsOrders)
      setSelected((current) => logisticsRows.find((item) => item.logisticsKey === current?.logisticsKey) ?? logisticsRows[0] ?? null)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : copy.loadError)
    } finally {
      setLoading(false)
    }
  }, [copy.loadError, token])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!formOpen) return
    ordersClient
      .list(token, { perPage: 100 })
      .then((response) => setOrders(response.data.filter((order) => order.requiresShipping)))
      .catch(() => setError(copy.ordersError))
  }, [copy.ordersError, formOpen, token])

  const logisticsRows = useMemo(() => mergeLogisticsRecords(shipments, orders), [orders, shipments])

  const metrics = useMemo(
    () => ({
      all: logisticsRows.length,
      active: logisticsRows.filter((item) => matchesQuickFilter(item, 'active')).length,
      attention: logisticsRows.filter((item) => matchesQuickFilter(item, 'attention')).length,
      planned: logisticsRows.filter((item) => matchesQuickFilter(item, 'planned')).length,
      delivered: logisticsRows.filter((item) => matchesQuickFilter(item, 'delivered')).length,
      incidents: logisticsRows.reduce((sum, item) => sum + item.incidentCount, 0),
    }),
    [logisticsRows],
  )

  const productOptions = useMemo(() => {
    const values = new Set<string>()
    logisticsRows.forEach((item) => item.productTypes?.forEach((type) => values.add(type)))
    return [...values].sort((a, b) => orderTypeLabel(a, isEnglish).localeCompare(orderTypeLabel(b, isEnglish), locale))
  }, [isEnglish, locale, logisticsRows])

  const orderTypeOptions = useMemo(() => {
    const values = new Set<string>()
    logisticsRows.forEach((item) => {
      if (item.orderType) values.add(item.orderType)
    })
    return [...values].sort((a, b) => orderTypeLabel(a, isEnglish).localeCompare(orderTypeLabel(b, isEnglish), locale))
  }, [isEnglish, locale, logisticsRows])

  const monthOptions = useMemo(() => {
    const values = [...new Set(logisticsRows.map(monthKey).filter(Boolean))]
    return values.sort((a, b) => b.localeCompare(a))
  }, [logisticsRows])

  const filteredShipments = useMemo(() => {
    const normalizedSearch = normalizeText(search)
    return logisticsRows
      .filter((item) => matchesQuickFilter(item, quickFilter))
      .filter((item) => !status || item.status === status)
      .filter((item) => !orderType || item.orderType === orderType)
      .filter((item) => !productType || item.productTypes?.includes(productType))
      .filter((item) => !month || monthKey(item) === month)
      .filter((item) => {
        if (!normalizedSearch) return true
        const haystack = [
          item.shipmentNumber,
          item.orderNumber,
          item.productSummary,
          item.customerName,
          item.carrierName,
          item.trackingNumber,
          item.origin,
          item.destination,
          item.orderSource,
          shipmentStatus(item.status, isEnglish),
          orderTypeLabel(item.orderType, isEnglish),
          sourceLabel(item.orderSource, isEnglish),
        ].map(normalizeText).join(' ')
        return haystack.includes(normalizedSearch)
      })
      .sort((a, b) => compareShipments(a, b, sortBy, sortDirection))
  }, [isEnglish, logisticsRows, month, orderType, productType, quickFilter, search, sortBy, sortDirection, status])

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
      setSelected({
        ...response.data,
        logisticsKey: response.data.id,
        logisticsKind: 'shipment',
        shipmentId: response.data.id,
      })
      setForm(emptyForm)
      setFormOpen(false)
      setToast(form.trackingNumber ? copy.toastCreatedGuide : copy.toastCreated)
      await load()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : copy.createError)
    } finally {
      setSaving(false)
    }
  }

  async function confirmAction() {
    if (!pendingAction) return
    setSaving(true)
    try {
      await pendingAction.run()
      setToast(copy.toastUpdated)
      setPendingAction(null)
      await load()
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : copy.updateError)
    } finally {
      setSaving(false)
    }
  }

  function askStatusFor(item: LogisticsRecord, next: string) {
    setPendingAction({
      title: copy.updateTitle,
      message: `${item.orderNumber ?? item.shipmentNumber ?? copy.newShipment} ${isEnglish ? 'will change to' : 'cambiará a'} ${shipmentStatus(next, isEnglish)}.`,
      label: copy.updateLabel,
      run: () => updateLogisticsStatus(item, next),
    })
  }

  function updateLogisticsStatus(item: LogisticsRecord, next: string) {
    if (item.shipmentId) return shipmentsClient.status(token, item.shipmentId, next)
    if (!item.orderId) throw new Error(copy.noOrder)
    if (next === 'preparing') return ordersClient.prepareShipping(token, item.orderId)
    if (next === 'shipped' || next === 'in_transit') return ordersClient.ship(token, item.orderId, { confirmWithoutTracking: true })
    if (next === 'delivered') return ordersClient.deliver(token, item.orderId)
    return ordersClient.prepareShipping(token, item.orderId)
  }

  function deliverSelected(item: LogisticsRecord) {
    if (item.shipmentId) {
      return shipmentsClient.deliver(token, item.shipmentId, isEnglish ? 'Delivery confirmed from Control Center' : 'Entrega confirmada desde Centro de Control')
    }
    if (!item.orderId) throw new Error(copy.noOrder)
    return ordersClient.deliver(token, item.orderId)
  }

  function cancelSelected(item: LogisticsRecord) {
    if (!item.shipmentId) throw new Error(copy.updateError)
    return shipmentsClient.cancel(token, item.shipmentId, isEnglish ? 'Cancelled from Control Center' : 'Cancelación desde Centro de Control')
  }

  function clearFilters() {
    setSearch('')
    setQuickFilter('all')
    setStatus('')
    setOrderType('')
    setProductType('')
    setMonth('')
    setSortBy('updatedAt')
    setSortDirection('desc')
  }

  return (
    <div className="control-page control-page--logistics min-w-0 space-y-3 text-[#252F37]">
      <section className="rounded-xl border border-[rgba(180,138,85,0.3)] bg-[#F7F2EA] p-3 shadow-[0_10px_20px_rgba(37,47,55,0.06)]">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <header className="min-w-0">
            <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[#B48A55]">{copy.eyebrow}</p>
            <h1 className="mt-0.5 text-lg font-semibold leading-tight text-[#252F37]">{copy.title}</h1>
            <p className="mt-0.5 max-w-4xl text-[12px] leading-5 text-[#675f59]">{copy.subtitle}</p>
          </header>
          <div className="flex flex-col gap-2 sm:flex-row xl:items-center xl:justify-end">
            <button type="button" onClick={load} className={secondary}>
              <RefreshCw size={15} />
              {copy.refresh}
            </button>
            <button type="button" disabled={!writable} onClick={() => setFormOpen(true)} className={primary}>
              <Plus size={15} />
              {copy.newShipment}
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-2 xl:grid-cols-[minmax(300px,1fr)_repeat(5,minmax(150px,0.42fr))]">
        <label className="relative min-w-0">
          <Search size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#681126]" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={copy.search}
            className="min-h-10 w-full rounded-lg border border-[rgba(180,138,85,0.32)] bg-white pl-10 pr-3 text-xs font-medium text-[#252F37] shadow-[0_8px_18px_rgba(37,47,55,0.05)] placeholder:text-[#675f59] focus:border-[#B48A55]"
          />
        </label>
        <QuickMetric icon={ClipboardList} label={copy.all} value={metrics.all} active={quickFilter === 'all'} onClick={() => setQuickFilter('all')} />
        <QuickMetric icon={Truck} label={copy.active} value={metrics.active} active={quickFilter === 'active'} onClick={() => setQuickFilter('active')} />
        <QuickMetric icon={AlertTriangle} label={copy.attention} value={metrics.attention} active={quickFilter === 'attention'} onClick={() => setQuickFilter('attention')} />
        <QuickMetric icon={CalendarClock} label={copy.planned} value={metrics.planned} active={quickFilter === 'planned'} onClick={() => setQuickFilter('planned')} />
        <QuickMetric icon={CheckCircle2} label={copy.delivered} value={metrics.delivered} active={quickFilter === 'delivered'} onClick={() => setQuickFilter('delivered')} />
      </section>

      <section className="grid gap-2 rounded-xl border border-[rgba(180,138,85,0.28)] bg-[#F7F2EA] p-3 shadow-[0_12px_26px_rgba(37,47,55,0.06)] md:grid-cols-2 xl:grid-cols-[repeat(6,minmax(0,1fr))_auto]">
        <FilterField icon={SlidersHorizontal} label={copy.status}>
          <LogisticsSelect value={status} onChange={setStatus} ariaLabel={copy.status}>
            <option value="">{copy.allStatuses}</option>
            <option value="pending">{shipmentStatus('pending', isEnglish)}</option>
            <option value="pending_preparation">{shipmentStatus('pending_preparation', isEnglish)}</option>
            <option value="preparing">{shipmentStatus('preparing', isEnglish)}</option>
            <option value="ready">{shipmentStatus('ready', isEnglish)}</option>
            <option value="awaiting_tracking">{shipmentStatus('awaiting_tracking', isEnglish)}</option>
            <option value="tracking_assigned">{shipmentStatus('tracking_assigned', isEnglish)}</option>
            <option value="shipped">{shipmentStatus('shipped', isEnglish)}</option>
            <option value="in_transit">{shipmentStatus('in_transit', isEnglish)}</option>
            <option value="delivered">{shipmentStatus('delivered', isEnglish)}</option>
            <option value="failed">{shipmentStatus('failed', isEnglish)}</option>
            <option value="returned">{shipmentStatus('returned', isEnglish)}</option>
            <option value="cancelled">{shipmentStatus('cancelled', isEnglish)}</option>
          </LogisticsSelect>
        </FilterField>
        <FilterField icon={ShoppingBag} label={copy.orderType}>
          <LogisticsSelect value={orderType} onChange={setOrderType} ariaLabel={copy.orderType}>
            <option value="">{copy.allTypes}</option>
            {orderTypeOptions.map((type) => <option key={type} value={type}>{orderTypeLabel(type, isEnglish)}</option>)}
          </LogisticsSelect>
        </FilterField>
        <FilterField icon={PackageOpen} label={copy.productType}>
          <LogisticsSelect value={productType} onChange={setProductType} ariaLabel={copy.productType}>
            <option value="">{copy.allProducts}</option>
            {productOptions.map((type) => <option key={type} value={type}>{orderTypeLabel(type, isEnglish)}</option>)}
          </LogisticsSelect>
        </FilterField>
        <FilterField icon={CalendarClock} label={copy.month}>
          <LogisticsSelect value={month} onChange={setMonth} ariaLabel={copy.month}>
            <option value="">{copy.allMonths}</option>
            {monthOptions.map((value) => <option key={value} value={value}>{monthLabel(value, locale)}</option>)}
          </LogisticsSelect>
        </FilterField>
        <FilterField icon={ArrowDownAZ} label={copy.sortBy}>
          <LogisticsSelect value={sortBy} onChange={(value) => setSortBy(value as SortKey)} ariaLabel={copy.sortBy}>
            <option value="updatedAt">{copy.newest}</option>
            <option value="status">{copy.status}</option>
            <option value="orderType">{copy.orderType}</option>
            <option value="product">{copy.product}</option>
            <option value="month">{copy.month}</option>
            <option value="customer">{copy.customer}</option>
            <option value="carrier">{copy.carrier}</option>
          </LogisticsSelect>
        </FilterField>
        <FilterField icon={sortDirection === 'asc' ? ArrowUpAZ : ArrowDownAZ} label={copy.direction}>
          <LogisticsSelect value={sortDirection} onChange={(value) => setSortDirection(value as SortDirection)} ariaLabel={copy.direction}>
            <option value="desc">{copy.desc}</option>
            <option value="asc">{copy.asc}</option>
          </LogisticsSelect>
        </FilterField>
        <div className="flex items-end">
          <button type="button" onClick={clearFilters} className={`${secondary} w-full xl:w-auto`}>
            <X size={14} />
            {copy.clear}
          </button>
        </div>
      </section>

      {error ? <p className="rounded-xl border border-[rgba(180,138,85,0.42)] bg-[#F7F2EA] p-3 text-xs font-semibold text-[#681126]">{error}</p> : null}

      <section className="min-w-0">
        <header className="mb-2 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[#B48A55]">{copy.active}</p>
            <p className="text-xs text-[#675f59]">{filteredShipments.length} {copy.visible}</p>
          </div>
          {metrics.incidents > 0 ? (
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-[rgba(104,17,38,0.22)] bg-[rgba(104,17,38,0.08)] px-2.5 py-1.5 text-[10px] font-semibold text-[#681126]">
              <AlertTriangle size={12} />
              {metrics.incidents} {copy.attention}
            </span>
          ) : null}
        </header>

        {loading ? (
          <div className="rounded-xl border border-[rgba(180,138,85,0.28)] bg-[#F7F2EA] p-8 text-center text-xs font-semibold text-[#681126] shadow-[0_12px_26px_rgba(37,47,55,0.06)]">
            <Loader2 className="mx-auto mb-2 animate-spin" size={18} />
            {copy.loading}
          </div>
        ) : filteredShipments.length === 0 ? (
          <div className="rounded-xl border border-[rgba(180,138,85,0.28)] bg-[#F7F2EA] p-8 text-center text-xs text-[#675f59] shadow-[0_12px_26px_rgba(37,47,55,0.06)]">
            {copy.empty}
          </div>
        ) : (
          <div className="grid gap-2 xl:grid-cols-2">
            {filteredShipments.map((item) => {
              const isSelected = selected?.logisticsKey === item.logisticsKey
              return (
                <ShipmentCard
                  key={item.logisticsKey}
                  item={item}
                  selected={isSelected}
                  actions={isSelected ? logisticsActionsFor(item) : []}
                  financialAccess={financialAccess}
                  locale={locale}
                  isEnglish={isEnglish}
                  copy={copy}
                  onSelect={() => setSelected(item)}
                  onAction={(next) => {
                    setSelected(item)
                    askStatusFor(item, next)
                  }}
                  onDeliver={() =>
                    setPendingAction({
                      title: copy.confirmDelivery,
                      message: copy.confirmDeliveryMessage,
                      label: copy.deliveredLabel,
                      run: () => deliverSelected(item),
                    })
                  }
                  onCancel={() =>
                    setPendingAction({
                      title: copy.cancelShipment,
                      message: copy.cancelMessage,
                      label: copy.cancelShipment,
                      run: () => cancelSelected(item),
                    })
                  }
                />
              )
            })}
          </div>
        )}
      </section>

      {formOpen ? (
        <div className="control-form-overlay fixed inset-0 z-[150] flex items-center justify-center bg-[#210711]/68 p-4 backdrop-blur-sm">
          <button type="button" aria-label="Cerrar" className="absolute inset-0" onClick={() => setFormOpen(false)} />
          <form
            onSubmit={submit}
            className="control-form-surface relative z-10 w-full max-w-4xl rounded-2xl border border-[var(--color-line)] bg-[var(--color-page)] p-6 shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-label={copy.newShipment}
          >
            <header className="control-form-header mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-[var(--color-burgundy)]">{copy.newShipment}</h2>
                <p className="mt-1 text-xs text-[var(--color-muted)]">{copy.createHint}</p>
              </div>
              <button type="button" onClick={() => setFormOpen(false)} aria-label="Cerrar">
                <X size={17} />
              </button>
            </header>

            <div className="grid gap-3 md:grid-cols-2">
              <ControlEntityPicker
                label={copy.order}
                value={form.orderId}
                options={orders.map((order) => ({
                  id: order.id,
                  label: order.orderNumber,
                  description: financialAccess ? `${order.customerName} · ${money(order.total, order.currency, locale)}` : order.customerName,
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
              <Field label={copy.carrier} value={form.carrier} onChange={(carrier) => setForm({ ...form, carrier })} />
              <Field label={copy.serviceLevel} value={form.serviceLevel} onChange={(serviceLevel) => setForm({ ...form, serviceLevel })} />
              <Field label={copy.trackingNumber} value={form.trackingNumber} onChange={(trackingNumber) => setForm({ ...form, trackingNumber })} />
              <Field label={copy.trackingUrl} value={form.trackingUrl} onChange={(trackingUrl) => setForm({ ...form, trackingUrl })} />
              <Field label={copy.origin} value={form.origin} onChange={(origin) => setForm({ ...form, origin })} />
              <Field label={copy.destination} value={form.destination} onChange={(destination) => setForm({ ...form, destination })} required />
              <CrystalDateTimeField
                value={form.estimatedDeliveryAt}
                onChange={(estimatedDeliveryAt) => setForm({ ...form, estimatedDeliveryAt })}
                label={copy.estimated}
              />
              {financialAccess ? (
                <Field label={copy.shippingCost} type="number" value={form.shippingCost} onChange={(shippingCost) => setForm({ ...form, shippingCost })} />
              ) : null}
              <div className="control-form-actions md:col-span-2">
                <button type="submit" disabled={saving} className={primary}>
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  {copy.createShipment}
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

function ShipmentCard({
  item,
  selected,
  actions,
  financialAccess,
  locale,
  isEnglish,
  copy,
  onSelect,
  onAction,
  onDeliver,
  onCancel,
}: {
  item: LogisticsRecord
  selected: boolean
  actions: ShipmentAction[]
  financialAccess: boolean
  locale: string
  isEnglish: boolean
  copy: LogisticsCopy
  onSelect: () => void
  onAction: (next: string) => void
  onDeliver: () => void
  onCancel: () => void
}) {
  const Icon = orderTypeIcon(item.orderType)
  const progress = progressFor(item.status)
  const destination = item.destination ?? emptyLabel(isEnglish)
  const origin = item.origin ?? 'Hacienda de Letras'
  const source = sourceLabel(item.orderSource, isEnglish)
  const total = financialAccess ? money(item.orderTotal, item.currency ?? 'MXN', locale) : copy.noAmounts
  const dateLabel = item.deliveredAt
    ? `${copy.deliveredAt}: ${compactDate(item.deliveredAt, locale, copy.noDate)}`
    : `${copy.estimated}: ${compactDate(item.estimatedDeliveryAt, locale, copy.noDate)}`

  return (
    <article
      className={`min-w-0 rounded-xl border bg-[#F7F2EA] p-3 shadow-[0_10px_20px_rgba(37,47,55,0.07)] transition hover:border-[#B48A55] ${
        selected ? 'border-[#681126] ring-2 ring-[rgba(104,17,38,0.16)]' : 'border-[rgba(180,138,85,0.26)]'
      }`}
    >
      <button type="button" onClick={onSelect} className="block w-full text-left">
        <div className="grid grid-cols-[52px_minmax(0,1fr)_auto] gap-3">
          {item.productImageUrl ? (
            <img
              src={item.productImageUrl}
              alt=""
              className="h-12 w-12 rounded-lg border border-[rgba(180,138,85,0.24)] bg-white object-cover"
            />
          ) : (
            <span className="grid h-12 w-12 place-items-center rounded-lg border border-[rgba(180,138,85,0.24)] bg-white text-[#681126]">
              <Icon size={20} />
            </span>
          )}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <p className="text-xs font-semibold leading-4 text-[#252F37]">{item.orderNumber ?? copy.noOrder}</p>
              <span className="rounded-full border border-[rgba(180,138,85,0.28)] bg-white px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-[#681126]">{source}</span>
            </div>
            <p className="mt-0.5 text-[11px] leading-4 text-[#675f59]">{item.customerName ?? copy.noCustomer}</p>
            <p className="mt-1 break-words text-[11px] font-semibold leading-4 text-[#252F37]">{item.productSummary ?? copy.noProduct}</p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <ShipmentPill status={item.status} compact isEnglish={isEnglish} />
            <strong className="text-sm leading-none text-[#681126]">{progress}%</strong>
          </div>
        </div>

        <div className="mt-3 grid gap-2 text-[10px] leading-4 text-[#675f59] sm:grid-cols-2">
          <InfoLine icon={ShoppingBag} label={copy.orderType} value={orderTypeLabel(item.orderType, isEnglish)} />
          <InfoLine icon={Truck} label={copy.carrier} value={item.carrierName ?? copy.ownCarrier} />
          <InfoLine icon={ScanBarcode} label={copy.guide} value={item.trackingNumber ?? copy.noGuide} />
          <InfoLine icon={ClipboardList} label={copy.source} value={source} />
        </div>

        <div className="mt-2 rounded-lg border border-[rgba(180,138,85,0.18)] bg-white px-2.5 py-2">
          <p className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-[#B48A55]">
            <Route size={12} className="text-[#681126]" />
            {copy.route}
          </p>
          <p className="mt-1 break-words text-[10px] font-medium leading-4 text-[#252F37]">{origin} {'->'} {destination}</p>
        </div>

        <div className="mt-2">
          <div className="h-1.5 overflow-hidden rounded-full bg-[#E8D8C8]">
            <span className="block h-full rounded-full bg-[#681126]" style={{ width: `${progress}%` }} />
          </div>
          <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-[10px] font-semibold text-[#252F37]">
            <span>{dateLabel}</span>
            <span>{copy.ticketTotal}: {total}</span>
          </div>
        </div>
      </button>

      {actions.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1.5 border-t border-[rgba(180,138,85,0.18)] pt-2">
          {actions.includes('preparing') ? <Tiny icon={ClipboardList} onClick={() => onAction('preparing')}>{copy.actionPreparing}</Tiny> : null}
          {actions.includes('ready') ? <Tiny icon={PackageCheck} onClick={() => onAction('ready')}>{copy.actionReady}</Tiny> : null}
          {actions.includes('shipped') ? <Tiny icon={Send} onClick={() => onAction('shipped')}>{copy.actionShip}</Tiny> : null}
          {actions.includes('in_transit') ? <Tiny icon={Truck} onClick={() => onAction('in_transit')}>{copy.actionTransit}</Tiny> : null}
          {actions.includes('delivered') ? <Tiny icon={CheckCircle2} onClick={onDeliver}>{copy.actionDeliver}</Tiny> : null}
          {actions.includes('cancelled') ? <Tiny icon={X} onClick={onCancel}>{copy.actionCancel}</Tiny> : null}
        </div>
      ) : null}
    </article>
  )
}

function ShipmentPill({ status, compact = false, isEnglish = false }: { status: string; compact?: boolean; isEnglish?: boolean }) {
  return (
    <span
      className={`inline-flex shrink-0 self-center whitespace-nowrap rounded-full border font-semibold leading-none ${
        compact ? 'px-2.5 py-1.5 text-[10px]' : 'px-3 py-2 text-[11px]'
      } ${shipmentTone(status)}`}
    >
      {shipmentStatus(status, isEnglish)}
    </span>
  )
}

function QuickMetric({ icon: Icon, label, value, active, onClick }: { icon: LucideIcon; label: string; value: number; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-[46px] min-w-[150px] rounded-lg border px-2.5 py-2 text-left shadow-[0_8px_18px_rgba(37,47,55,0.05)] transition ${
        active
          ? 'border-[#B48A55] bg-[#F7F2EA] text-[#681126]'
          : 'border-[rgba(180,138,85,0.22)] bg-[#F7F2EA] text-[#252F37] hover:border-[#B48A55] hover:bg-white'
      }`}
    >
      <span className="flex items-center justify-between gap-2">
        <Icon size={14} />
        <strong className="text-[13px] leading-none">{value}</strong>
      </span>
      <span className="mt-1 block text-[9px] font-semibold uppercase leading-3 tracking-[0.08em]">{label}</span>
    </button>
  )
}

function FilterField({ icon: Icon, label, children }: { icon: LucideIcon; label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <span className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#675f59]">
        <Icon size={12} className="text-[#681126]" />
        {label}
      </span>
      {children}
    </div>
  )
}

function LogisticsSelect({ value, onChange, ariaLabel, children }: { value: string; onChange: (value: string) => void; ariaLabel: string; children: ReactNode }) {
  return (
    <CrystalSelect
      value={value}
      onChange={onChange}
      ariaLabel={ariaLabel}
      buttonClassName="control-logistics-select-trigger"
      menuClassName="control-logistics-select-menu"
    >
      {children}
    </CrystalSelect>
  )
}

function InfoLine({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <p className="flex min-w-0 items-start gap-1.5">
      <Icon size={12} className="mt-0.5 shrink-0 text-[#681126]" />
      <span className="min-w-0">
        <span className="block text-[8px] font-semibold uppercase tracking-[0.1em] text-[#B48A55]">{label}</span>
        <span className="block break-words font-medium text-[#252F37]">{value}</span>
      </span>
    </p>
  )
}

function Tiny({ children, icon: Icon, onClick }: { children: string; icon: LucideIcon; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex min-h-8 items-center justify-center gap-1.5 rounded-lg border border-[rgba(180,138,85,0.34)] bg-white px-2.5 py-1.5 text-[10px] font-semibold text-[#681126] transition hover:border-[#B48A55] hover:bg-[#E8D8C8]"
    >
      <Icon size={12} />
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
