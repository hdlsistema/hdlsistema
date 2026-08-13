export function money(value: number | null | undefined, currency = 'MXN') {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(Number(value ?? 0))
}

export function dateTime(value?: string | null) {
  if (!value) return 'Sin fecha'
  return new Intl.DateTimeFormat('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(value)).replace(',', ' ·').replaceAll(' ', '\u00a0')
}

export function dateOnly(value?: string | null) {
  if (!value) return 'Sin fecha'
  return new Intl.DateTimeFormat('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value)).replaceAll(' ', '\u00a0')
}

export function shortId(value?: string | null) {
  if (!value) return 'Sin folio'
  return value.slice(0, 8).toUpperCase()
}

const STATUS_LABELS: Record<string, string> = {
  abierto: 'Abierto',
  active: 'Activo',
  archived: 'Archivado',
  awaiting_tracking: 'Guía pendiente',
  activa: 'Activa',
  blocked: 'Bloqueado',
  bloqueado: 'Bloqueado',
  borrador: 'Borrador',
  cancelled: 'Cancelado',
  cancelada: 'Cancelada',
  cancelado: 'Cancelado',
  closed: 'Cerrado',
  cerrado: 'Cerrado',
  completed: 'Completado',
  completada: 'Completada',
  completado: 'Completado',
  confirmed: 'Confirmado',
  confirmada: 'Confirmada',
  confirmado: 'Confirmado',
  contactada: 'Contactada',
  contacted: 'Contactada',
  converted: 'Convertido',
  delivered: 'Entregado',
  entregada: 'Entregada',
  entregado: 'Entregado',
  draft: 'Borrador',
  failed: 'Fallido',
  fallido: 'Fallido',
  fulfilled: 'Completado',
  ganado: 'Ganada',
  in_progress: 'En proceso',
  inactive: 'Inactivo',
  inactivo: 'Inactivo',
  iniciado: 'Iniciado',
  started: 'Iniciado',
  lost: 'Perdida',
  nueva: 'Nueva',
  new: 'Nueva',
  no_show: 'No asistió',
  not_required: 'No requiere envío',
  open: 'Abierto',
  paid: 'Pago confirmado',
  'pago confirmado': 'Pago confirmado',
  pagada: 'Pago confirmado',
  pagado: 'Pago confirmado',
  parcialmente_reembolsado: 'Reembolso parcial',
  partially_refunded: 'Reembolso parcial',
  paused: 'Pausado',
  pausada: 'Pausada',
  pausado: 'Pausado',
  pending: 'Pendiente',
  pending_payment: 'Pago pendiente',
  'pago pendiente': 'Pago pendiente',
  pendiente: 'Pendiente',
  'pendiente de pago': 'Pago pendiente',
  pending_preparation: 'Por preparar',
  preparing: 'Preparando',
  processing: 'En proceso',
  prospect: 'Prospecto',
  published: 'Publicado',
  publicado: 'Publicado',
  quoted: 'Cotizada',
  refunded: 'Reembolsado',
  reembolsada: 'Reembolsada',
  reembolsado: 'Reembolsado',
  revoked: 'Revocado',
  sent: 'Enviado',
  shipped: 'Enviado',
  succeeded: 'Correcto',
  tracking_assigned: 'Guía asignada',
  used: 'Usado',
  usado: 'Usado',
  won: 'Ganada',
}

export function statusLabel(value?: string | null) {
  if (!value) return 'Sin estado'
  const normalized = value.toLowerCase()
  const label = STATUS_LABELS[normalized]
  if (label) return label
  if (import.meta.env.DEV) {
    console.warn('Estado no mapeado en Centro de Control', value)
  }
  return 'Estado no identificado'
}

const EVENT_LABELS: Record<string, string> = {
  app_session_started: 'Sesión iniciada en la app',
  cart_abandoned: 'Carrito sin finalizar',
  cart_created: 'Carrito creado',
  cart_item_added: 'Producto agregado al carrito',
  cart_item_removed: 'Producto retirado del carrito',
  checkout_payment_attempted: 'Intento de pago iniciado',
  checkout_payment_form_viewed: 'Formulario de pago abierto',
  checkout_started: 'Checkout iniciado',
  customer_login: 'Cliente inició sesión',
  customer_created: 'Cliente creado',
  customer_updated: 'Cliente actualizado',
  customer_archived: 'Cliente archivado',
  customer_restored: 'Cliente restaurado',
  customer_logout: 'Cliente cerró sesión',
  customer_profile_updated: 'Perfil actualizado',
  order_created: 'Orden creada',
  order_cancelled: 'Orden cancelada',
  order_delivered: 'Orden entregada',
  order_fulfilled: 'Orden completada',
  order_pending_payment: 'Orden pendiente de pago',
  order_paid: 'Pago confirmado',
  order_processing: 'Orden en proceso',
  order_shipped: 'Orden enviada',
  order_updated: 'Orden actualizada',
  payment_processing: 'Pago en proceso',
  payment_failed: 'Pago fallido',
  payment_succeeded: 'Pago confirmado',
  quote_requested: 'Cotización solicitada',
  quote_email_sent: 'Cotización enviada por correo',
  reservation_created: 'Reservación creada',
  reservation_cancelled: 'Reservación cancelada',
  reservation_confirmed: 'Reservación confirmada',
  reservation_rescheduled: 'Reservación reprogramada',
  reservation_started: 'Reservación iniciada',
  reservation_submitted: 'Reservación solicitada',
  shipping_prepared: 'Pedido en preparación',
  tag_assigned: 'Etiqueta asignada',
  tag_removed: 'Etiqueta retirada',
  wine_club_viewed: 'Wine Club consultado',
}

export function eventLabel(value?: string | null) {
  if (!value) return 'Movimiento registrado'
  const normalized = value.toLowerCase().replaceAll('.', '_')
  const label = EVENT_LABELS[normalized]
  if (label) return label
  if (import.meta.env.DEV) {
    console.warn('Evento no mapeado en Centro de Control', value)
  }
  return 'Movimiento registrado'
}

export function areaLabel(value?: string | null) {
  const labels: Record<string, string> = {
    app: 'App cliente',
    cart: 'Carrito',
    checkout: 'Pago',
    commerce: 'Comercio',
    customer: 'Cliente',
    customers: 'Clientes',
    payments: 'Pagos',
    reservations: 'Reservaciones',
  }
  if (!value) return 'Operación'
  return labels[value] ?? 'Operación'
}

export function entityLabel(value?: string | null) {
  const labels: Record<string, string> = {
    cart: 'Carrito',
    customer: 'Cliente',
    order: 'Orden',
    payment: 'Pago',
    quote: 'Cotización',
    reservation: 'Reservación',
    session: 'Sesión',
  }
  if (!value) return 'Sin elemento asociado'
  return labels[value] ?? 'Elemento operativo'
}

export function paymentReferenceLabel(reference?: string | null, orderNumber?: string | null, id?: string | null) {
  if (reference) return reference
  if (orderNumber) return `Orden ${orderNumber}`
  return `Pago ${shortId(id)}`
}
