function currentLocale(locale?: string) {
  if (locale) return locale
  if (typeof document !== 'undefined' && document.documentElement.lang.toLowerCase().startsWith('en')) return 'en-US'
  return 'es-MX'
}

export function money(value: number | null | undefined, currency = 'MXN', locale?: string) {
  return new Intl.NumberFormat(currentLocale(locale), {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(Number(value ?? 0))
}

export function dateTime(value?: string | null, locale?: string) {
  const resolvedLocale = currentLocale(locale)
  if (!value) return resolvedLocale.startsWith('en') ? 'No date' : 'Sin fecha'
  return new Intl.DateTimeFormat(resolvedLocale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(value)).replace(',', ' ·').replaceAll(' ', '\u00a0')
}

export function dateOnly(value?: string | null, locale?: string) {
  const resolvedLocale = currentLocale(locale)
  if (!value) return resolvedLocale.startsWith('en') ? 'No date' : 'Sin fecha'
  return new Intl.DateTimeFormat(resolvedLocale, {
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
  correcto: 'Correcto',
  converted: 'Convertido',
  delivered: 'Entregado',
  entregada: 'Entregada',
  entregado: 'Entregado',
  draft: 'Borrador',
  enviada: 'Enviado',
  enviado: 'Enviado',
  'en proceso': 'En proceso',
  'en transito': 'En tránsito',
  'en tránsito': 'En tránsito',
  failed: 'Fallido',
  fallido: 'Fallido',
  fulfilled: 'Completado',
  ganado: 'Ganada',
  in_progress: 'En proceso',
  inactive: 'Inactivo',
  inactivo: 'Inactivo',
  iniciado: 'Iniciado',
  in_transit: 'En tránsito',
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
  'por preparar': 'Por preparar',
  prospect: 'Prospecto',
  published: 'Publicado',
  publicado: 'Publicado',
  quoted: 'Cotizada',
  ready: 'Lista para salida',
  'guia asignada': 'Guía asignada',
  'guía asignada': 'Guía asignada',
  'guia pendiente': 'Guía pendiente',
  'guía pendiente': 'Guía pendiente',
  'lista para salida': 'Lista para salida',
  'no requiere envio': 'No requiere envío',
  'no requiere envío': 'No requiere envío',
  refunded: 'Reembolsado',
  reembolsada: 'Reembolsada',
  reembolsado: 'Reembolsado',
  revoked: 'Revocado',
  sent: 'Enviado',
  shipped: 'Enviado',
  succeeded: 'Correcto',
  'stock bajo': 'Stock bajo',
  tracking_assigned: 'Guía asignada',
  returned: 'Devuelto',
  used: 'Usado',
  usado: 'Usado',
  won: 'Ganada',
}

const STATUS_LABELS_EN: Record<string, string> = {
  active: 'Active', archived: 'Archived', awaiting_tracking: 'Tracking pending', blocked: 'Blocked',
  cancelled: 'Cancelled', closed: 'Closed', completed: 'Completed', confirmed: 'Confirmed', contacted: 'Contacted',
  correcto: 'Healthy', converted: 'Converted', delivered: 'Delivered', draft: 'Draft', failed: 'Failed', fulfilled: 'Completed',
  in_progress: 'In progress', in_transit: 'In transit', inactive: 'Inactive', lost: 'Lost', new: 'New', no_show: 'No show',
  not_required: 'Shipping not required', open: 'Open', paid: 'Payment confirmed', partially_refunded: 'Partially refunded',
  paused: 'Paused', pending: 'Pending', pending_payment: 'Payment pending', pending_preparation: 'Preparing',
  preparing: 'Preparing', processing: 'In progress', prospect: 'Prospect', published: 'Published', quoted: 'Quoted', ready: 'Ready to ship',
  'por preparar': 'Preparing',
  refunded: 'Refunded', revoked: 'Revoked', sent: 'Sent', shipped: 'Shipped', started: 'Started',
  returned: 'Returned', succeeded: 'Successful', 'stock bajo': 'Low stock', tracking_assigned: 'Tracking assigned', used: 'Used', won: 'Won',
  enviada: 'Shipped',
  enviado: 'Shipped',
  entregada: 'Delivered',
  entregado: 'Delivered',
  'en proceso': 'In progress',
  'en transito': 'In transit',
  'en tránsito': 'In transit',
  'guia asignada': 'Tracking assigned',
  'guía asignada': 'Tracking assigned',
  'guia pendiente': 'Tracking pending',
  'guía pendiente': 'Tracking pending',
  'lista para salida': 'Ready to ship',
  'no requiere envio': 'Shipping not required',
  'no requiere envío': 'Shipping not required',
}

export function statusLabel(value?: string | null, locale?: string) {
  const resolvedLocale = currentLocale(locale)
  if (!value) return resolvedLocale.startsWith('en') ? 'No status' : 'Sin estado'
  const normalized = value.toLowerCase()
  const label = resolvedLocale.startsWith('en') ? STATUS_LABELS_EN[normalized] : STATUS_LABELS[normalized]
  if (label) return label
  if (import.meta.env.DEV) {
    console.warn('Estado no mapeado en Centro de Control', value)
  }
  return resolvedLocale.startsWith('en') ? 'Unrecognized status' : 'Estado no identificado'
}

const EVENT_LABELS: Record<string, string> = {
  insert: 'Registro creado',
  update: 'Registro actualizado',
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

const EVENT_LABELS_EN: Record<string, string> = {
  insert: 'Record created',
  update: 'Record updated',
  app_session_started: 'App session started',
  cart_abandoned: 'Cart left unfinished',
  cart_created: 'Cart created',
  cart_item_added: 'Item added to cart',
  cart_item_removed: 'Item removed from cart',
  checkout_payment_attempted: 'Payment attempt started',
  checkout_payment_form_viewed: 'Payment form opened',
  checkout_started: 'Checkout started',
  customer_login: 'Customer signed in',
  customer_created: 'Customer created',
  customer_updated: 'Customer updated',
  customer_archived: 'Customer archived',
  customer_restored: 'Customer restored',
  customer_logout: 'Customer signed out',
  customer_profile_updated: 'Profile updated',
  order_created: 'Order created',
  order_cancelled: 'Order cancelled',
  order_delivered: 'Order delivered',
  order_fulfilled: 'Order completed',
  order_pending_payment: 'Order awaiting payment',
  order_paid: 'Payment confirmed',
  order_processing: 'Order in progress',
  order_shipped: 'Order shipped',
  order_updated: 'Order updated',
  payment_processing: 'Payment in progress',
  payment_failed: 'Payment failed',
  payment_succeeded: 'Payment confirmed',
  quote_requested: 'Quote requested',
  quote_email_sent: 'Quote sent by email',
  reservation_created: 'Reservation created',
  reservation_cancelled: 'Reservation cancelled',
  reservation_confirmed: 'Reservation confirmed',
  reservation_rescheduled: 'Reservation rescheduled',
  reservation_started: 'Reservation started',
  reservation_submitted: 'Reservation requested',
  shipping_prepared: 'Order prepared',
  tag_assigned: 'Tag assigned',
  tag_removed: 'Tag removed',
  wine_club_viewed: 'Wine Club viewed',
}

export function eventLabel(value?: string | null, locale?: string) {
  const resolvedLocale = currentLocale(locale)
  if (!value) return resolvedLocale.startsWith('en') ? 'Movement recorded' : 'Movimiento registrado'
  const normalized = value.toLowerCase().replaceAll('.', '_')
  const label = resolvedLocale.startsWith('en') ? EVENT_LABELS_EN[normalized] : EVENT_LABELS[normalized]
  if (label) return label
  if (import.meta.env.DEV) {
    console.warn('Evento no mapeado en Centro de Control', value)
  }
  return resolvedLocale.startsWith('en') ? 'Movement recorded' : 'Movimiento registrado'
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
