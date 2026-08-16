import type {
  CommunicationEventType,
  CommunicationLocale,
  CommunicationPayload,
  RenderedEmailTemplate,
} from './communications.types'

type TemplateCopy = {
  subject: string
  preheader: string
  title: string
  body: string
  cta: string
}

const brandName = 'Hacienda de Letras'
const brandLogoUrl = 'https://admhaciendadeletras.com/hacienda%20de%20letras%20logo1.png'
const customerAppUrl = 'https://admhaciendadeletras.com/app/perfil'
const supportedLocales: CommunicationLocale[] = ['es-MX', 'en-US']

const copies: Record<CommunicationLocale, Record<CommunicationEventType, TemplateCopy>> = {
  'es-MX': {
    'customer.welcome': {
      subject: 'Bienvenido a Hacienda de Letras',
      preheader: 'Tu historia con Hacienda de Letras comienza aquí.',
      title: 'Bienvenido a Hacienda de Letras',
      body: 'Qué alegría recibirte. Tu cuenta ya está lista para descubrir nuestros vinos, reservar experiencias memorables y disfrutar todo lo que hemos preparado para ti. Bienvenido a una historia nacida entre viñedos, hospitalidad y el vino de Aguascalientes.',
      cta: 'Descubrir Hacienda de Letras',
    },
    'reservation.created': {
      subject: 'Reservación recibida',
      preheader: 'Recibimos tu solicitud de reservación.',
      title: 'Recibimos tu reservación',
      body: 'La reservación quedó registrada con el estado actual que aparece en tu cuenta. Te avisaremos si hay cambios operativos.',
      cta: 'Ver reservación',
    },
    'reservation.rescheduled': {
      subject: 'Reservación reprogramada',
      preheader: 'Actualizamos el horario de tu reservación.',
      title: 'Tu reservación fue reprogramada',
      body: 'El nuevo horario ya está registrado. Revisa los detalles antes de tu visita.',
      cta: 'Ver reservación',
    },
    'reservation.cancelled': {
      subject: 'Reservación cancelada',
      preheader: 'Tu reservación fue cancelada correctamente.',
      title: 'Reservación cancelada',
      body: 'La cancelación quedó registrada. Este mensaje no incluye políticas comerciales adicionales.',
      cta: 'Ver historial',
    },
    'quote.request.created': {
      subject: 'Recibimos tu solicitud · Hacienda de Letras',
      preheader: 'Tu solicitud de cotización quedó registrada.',
      title: 'Recibimos tu solicitud',
      body: 'Gracias por escribirnos. El equipo de Hacienda de Letras revisará tu solicitud y dará seguimiento. Este correo no incluye precios ni confirma disponibilidad.',
      cta: 'Abrir Hacienda de Letras',
    },
    'quote.sent': {
      subject: 'Cotización Hacienda de Letras',
      preheader: 'Tu cotización fue preparada por nuestro equipo.',
      title: 'Tu cotización está lista',
      body: 'Compartimos la propuesta preparada por Hacienda de Letras con base en los datos de tu solicitud. Revisa los detalles y responde este correo para confirmar ajustes o siguiente paso.',
      cta: 'Abrir Hacienda de Letras',
    },
    'campaign.marketing': {
      subject: 'Hacienda de Letras',
      preheader: 'Mensaje de Hacienda de Letras.',
      title: 'Hacienda de Letras',
      body: 'Tenemos información preparada para ti desde Hacienda de Letras.',
      cta: 'Abrir Hacienda de Letras',
    },
    'order.created': {
      subject: 'Orden creada',
      preheader: 'Tu orden fue registrada.',
      title: 'Tu orden está registrada',
      body: 'Creamos la orden con los artículos seleccionados. El estado real se mantiene visible en tu cuenta.',
      cta: 'Ver orden',
    },
    'order.pending_payment': {
      subject: 'Orden pendiente de pago',
      preheader: 'Tu orden está pendiente de pago.',
      title: 'Orden pendiente de pago',
      body: 'Tu orden quedó pendiente de pago. Puedes retomarla desde tu cuenta cuando quieras completar la compra.',
      cta: 'Ver orden',
    },
    'order.paid': {
      subject: 'Pago confirmado',
      preheader: 'Tu pago fue confirmado.',
      title: 'Pago confirmado',
      body: 'Tu compra quedó confirmada. Prepararemos tu pedido y te compartiremos la guía cuando esté lista. Revisa los detalles desde tu cuenta.',
      cta: 'Ver orden',
    },
    'order.tracking_assigned': {
      subject: 'La guía de tu pedido está lista',
      preheader: 'Ya puedes consultar y rastrear tu envío.',
      title: 'Tu guía está lista',
      body: 'Preparamos los datos de seguimiento de tu pedido. Consulta la paquetería, el número de guía y abre el rastreo desde el botón inferior.',
      cta: 'Rastrear mi pedido',
    },
    'order.shipped': {
      subject: 'Tu pedido va en camino',
      preheader: 'La guía de tu pedido ya está disponible.',
      title: 'Tu pedido va en camino',
      body: 'Tu pedido fue marcado como enviado. Consulta la paquetería y número de guía desde tu cuenta.',
      cta: 'Ver orden',
    },
    'membership.activated': {
      subject: 'Membresía activada',
      preheader: 'Tu membresía Wine Club ya está activa.',
      title: 'Bienvenido a Wine Club',
      body: 'Tu membresía quedó activa con el plan registrado por Hacienda de Letras.',
      cta: 'Ver membresía',
    },
    'membership.renewed': {
      subject: 'Membresía renovada',
      preheader: 'Tu membresía Wine Club fue renovada.',
      title: 'Membresía renovada',
      body: 'La renovación quedó registrada. Revisa tus fechas y beneficios desde tu cuenta.',
      cta: 'Ver membresía',
    },
    'membership.expiring': {
      subject: 'Tu membresía está por expirar',
      preheader: 'Te avisamos antes del vencimiento de tu membresía.',
      title: 'Membresía próxima a vencer',
      body: 'Tu membresía se acerca a su fecha de vencimiento. Este aviso queda preparado para un scheduler autorizado.',
      cta: 'Ver membresía',
    },
    'security.password_changed': {
      subject: 'Contraseña actualizada',
      preheader: 'Tu contraseña fue actualizada.',
      title: 'Contraseña actualizada',
      body: 'Tu contraseña fue modificada correctamente. Si no reconoces este cambio, contacta a soporte.',
      cta: 'Ir a soporte',
    },
  },
  'en-US': {
    'customer.welcome': {
      subject: 'Welcome to Hacienda de Letras',
      preheader: 'Your story with Hacienda de Letras begins here.',
      title: 'Welcome to Hacienda de Letras',
      body: 'We are delighted to welcome you. Your account is ready to discover our wines, reserve memorable experiences and enjoy everything we have prepared for you. Welcome to a story shaped by vineyards, hospitality and the wine of Aguascalientes.',
      cta: 'Discover Hacienda de Letras',
    },
    'reservation.created': {
      subject: 'Reservation received',
      preheader: 'We received your reservation request.',
      title: 'We received your reservation',
      body: 'Your reservation was registered with the current status shown in your account. We will notify you if operational details change.',
      cta: 'View reservation',
    },
    'reservation.rescheduled': {
      subject: 'Reservation rescheduled',
      preheader: 'Your reservation time was updated.',
      title: 'Your reservation was rescheduled',
      body: 'The new time is now registered. Please review the details before your visit.',
      cta: 'View reservation',
    },
    'reservation.cancelled': {
      subject: 'Reservation cancelled',
      preheader: 'Your reservation was cancelled.',
      title: 'Reservation cancelled',
      body: 'The cancellation was registered. This message does not include additional commercial policies.',
      cta: 'View history',
    },
    'quote.request.created': {
      subject: 'We received your request · Hacienda de Letras',
      preheader: 'Your quote request was registered.',
      title: 'We received your request',
      body: 'Thank you for contacting us. Hacienda de Letras will review your request and follow up. This email does not include pricing or confirm availability.',
      cta: 'Open Hacienda de Letras',
    },
    'quote.sent': {
      subject: 'Hacienda de Letras quote',
      preheader: 'Your quote was prepared by our team.',
      title: 'Your quote is ready',
      body: 'We are sharing the proposal prepared by Hacienda de Letras based on your request. Review the details and reply to this email to confirm adjustments or next steps.',
      cta: 'Open Hacienda de Letras',
    },
    'campaign.marketing': {
      subject: 'Hacienda de Letras',
      preheader: 'Message from Hacienda de Letras.',
      title: 'Hacienda de Letras',
      body: 'We have information prepared for you from Hacienda de Letras.',
      cta: 'Open Hacienda de Letras',
    },
    'order.created': {
      subject: 'Order created',
      preheader: 'Your order was registered.',
      title: 'Your order is registered',
      body: 'We created the order with the selected items. The real status remains visible in your account.',
      cta: 'View order',
    },
    'order.pending_payment': {
      subject: 'Order pending payment',
      preheader: 'Your order is pending payment.',
      title: 'Order pending payment',
      body: 'Your order is pending payment. You can resume it from your account whenever you want to complete the purchase.',
      cta: 'View order',
    },
    'order.paid': {
      subject: 'Payment confirmed',
      preheader: 'Your payment was confirmed.',
      title: 'Payment confirmed',
      body: 'Your purchase is confirmed. We will prepare your order and share tracking details once they are ready. You can review the details from your account.',
      cta: 'View order',
    },
    'order.tracking_assigned': {
      subject: 'Your tracking details are ready',
      preheader: 'You can now review and track your shipment.',
      title: 'Your tracking details are ready',
      body: 'Your order now has shipping details. Review the carrier and tracking number, then open live tracking from the button below.',
      cta: 'Track my order',
    },
    'order.shipped': {
      subject: 'Your order is on its way',
      preheader: 'Your tracking details are now available.',
      title: 'Your order is on its way',
      body: 'Your order was marked as shipped. Review the carrier and tracking number from your account.',
      cta: 'View order',
    },
    'membership.activated': {
      subject: 'Membership activated',
      preheader: 'Your Wine Club membership is active.',
      title: 'Welcome to Wine Club',
      body: 'Your membership is active with the plan registered by Hacienda de Letras.',
      cta: 'View membership',
    },
    'membership.renewed': {
      subject: 'Membership renewed',
      preheader: 'Your Wine Club membership was renewed.',
      title: 'Membership renewed',
      body: 'The renewal was registered. Review your dates and benefits from your account.',
      cta: 'View membership',
    },
    'membership.expiring': {
      subject: 'Your membership is expiring soon',
      preheader: 'We are notifying you before your membership expires.',
      title: 'Membership expiring soon',
      body: 'Your membership is close to its expiration date. This notice is prepared for an authorized scheduler.',
      cta: 'View membership',
    },
    'security.password_changed': {
      subject: 'Password updated',
      preheader: 'Your password was updated.',
      title: 'Password updated',
      body: 'Your password was updated successfully. If you do not recognize this change, contact support.',
      cta: 'Contact support',
    },
  },
}

export function normalizeLocale(value?: string | null): CommunicationLocale {
  if (value === 'es') return 'es-MX'
  if (value === 'en') return 'en-US'
  return supportedLocales.includes(value as CommunicationLocale) ? value as CommunicationLocale : 'es-MX'
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function isSensitiveKey(key: string) {
  return /(token|secret|password|authorization|header|key)/i.test(key)
}

function formatPayloadValue(key: string, value: unknown, locale: CommunicationLocale) {
  if (typeof value !== 'string' && typeof value !== 'number') return value

  if (key === 'status' || key === 'shippingStatus') {
    const statusLabels: Record<CommunicationLocale, Record<string, string>> = {
      'es-MX': {
        pending: 'Pendiente', pending_payment: 'Pendiente de pago', paid: 'Pago confirmado',
        preparing: 'En preparación', tracking_assigned: 'Guía asignada', shipped: 'Enviado',
        delivered: 'Entregado', confirmed: 'Confirmada', cancelled: 'Cancelada', active: 'Activa',
      },
      'en-US': {
        pending: 'Pending', pending_payment: 'Pending payment', paid: 'Payment confirmed',
        preparing: 'Preparing', tracking_assigned: 'Tracking assigned', shipped: 'Shipped',
        delivered: 'Delivered', confirmed: 'Confirmed', cancelled: 'Cancelled', active: 'Active',
      },
    }
    return statusLabels[locale][String(value)] ?? String(value).replace(/_/g, ' ')
  }

  if (['startAt', 'renewalDate', 'expiresAt', 'preferredDate', 'estimatedDeliveryAt', 'reservationDate', 'checkIn', 'checkOut'].includes(key)) {
    const date = new Date(value)
    if (!Number.isNaN(date.getTime())) {
      return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: key === 'startAt' ? 'short' : undefined }).format(date)
    }
  }

  if (key === 'total' || key === 'quoteAmount') {
    const amount = typeof value === 'number' ? value : Number(value)
    if (Number.isFinite(amount)) {
      const formatted = new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)
      return locale === 'en-US' ? `MX$${formatted}` : `$${formatted} MXN`
    }
  }

  return value
}

function detailRows(payload: CommunicationPayload, locale: CommunicationLocale) {
  const labels: Record<CommunicationLocale, Record<string, string>> = {
    'es-MX': {
      customerName: 'Cliente',
      reservationNumber: 'Reservación',
      orderNumber: 'Orden',
      membershipNumber: 'Membresía',
      reservationType: 'Tipo de reservación',
      experienceTitle: 'Servicio',
      planName: 'Plan',
      status: 'Estado',
      peopleCount: 'Personas',
      total: 'Total',
      currency: 'Moneda',
      quoteNumber: 'Folio',
      eventType: 'Tipo de evento',
      preferredDate: 'Fecha solicitada',
      guestCount: 'Personas',
      message: 'Mensaje',
      quoteAmount: 'Importe cotizado',
      validUntil: 'Vigencia',
      campaignName: 'Campaña',
      ctaLabel: 'Acción',
      startAt: 'Fecha',
      reservationDate: 'Fecha de reservación',
      reservationTime: 'Hora',
      checkIn: 'Llegada',
      checkOut: 'Salida',
      renewalDate: 'Renovación',
      expiresAt: 'Expira',
      carrier: 'Paquetería',
      trackingNumber: 'Número de guía',
      shippingStatus: 'Estado del envío',
      estimatedDeliveryAt: 'Entrega estimada',
    },
    'en-US': {
      customerName: 'Customer',
      reservationNumber: 'Reservation',
      orderNumber: 'Order',
      membershipNumber: 'Membership',
      reservationType: 'Reservation type',
      experienceTitle: 'Service',
      planName: 'Plan',
      status: 'Status',
      peopleCount: 'Guests',
      total: 'Total',
      currency: 'Currency',
      quoteNumber: 'Reference',
      eventType: 'Event type',
      preferredDate: 'Requested date',
      guestCount: 'Guests',
      message: 'Message',
      quoteAmount: 'Quoted amount',
      validUntil: 'Valid until',
      campaignName: 'Campaign',
      ctaLabel: 'Action',
      startAt: 'Date',
      reservationDate: 'Reservation date',
      reservationTime: 'Time',
      checkIn: 'Check-in',
      checkOut: 'Check-out',
      renewalDate: 'Renewal',
      expiresAt: 'Expires',
      carrier: 'Carrier',
      trackingNumber: 'Tracking number',
      shippingStatus: 'Shipping status',
      estimatedDeliveryAt: 'Estimated delivery',
    },
  }

  return Object.entries(labels[locale])
    .filter(([key]) => key !== 'customerName' && !isSensitiveKey(key) && payload[key] !== null && payload[key] !== undefined && payload[key] !== '')
    .map(([key, label], index) => `<tr><td style="padding:11px 14px;color:#786963;font-size:13px;${index ? 'border-top:1px solid #eee3d9;' : ''}">${label}</td><td style="padding:11px 14px;text-align:right;font-weight:700;color:#332421;font-size:13px;${index ? 'border-top:1px solid #eee3d9;' : ''}">${escapeHtml(formatPayloadValue(key, payload[key], locale))}</td></tr>`)
    .join('')
}

function payloadString(payload: CommunicationPayload, key: string) {
  const value = payload[key]
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, 2200) : null
}

function safeHttpUrl(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) return null
  try {
    const parsed = new URL(value.trim())
    return ['http:', 'https:'].includes(parsed.protocol) ? parsed.toString() : null
  } catch {
    return null
  }
}

function ctaUrl(eventType: CommunicationEventType, payload: CommunicationPayload) {
  if (eventType === 'customer.welcome') {
    return 'https://admhaciendadeletras.com/app/login'
  }
  if (eventType === 'order.tracking_assigned' || eventType === 'order.shipped') {
    return safeHttpUrl(payload.trackingUrl) ?? `${customerAppUrl}#orders`
  }
  const explicit = safeHttpUrl(payload.ctaUrl)
  if (explicit) return explicit
  if (eventType.startsWith('reservation.')) return 'https://admhaciendadeletras.com/app/perfil#reservations'
  if (eventType.startsWith('order.')) return `${customerAppUrl}#orders`
  if (eventType.startsWith('membership.')) return 'https://admhaciendadeletras.com/app/membresias'
  return 'https://admhaciendadeletras.com/app/home'
}

function copyForPayload(
  eventType: CommunicationEventType,
  copy: TemplateCopy,
  payload: CommunicationPayload,
): TemplateCopy {
  if (!['quote.sent', 'campaign.marketing'].includes(eventType)) return copy
  const subject = payloadString(payload, 'subject')
  const title = payloadString(payload, 'title')
  const body = payloadString(payload, 'body') ?? payloadString(payload, 'message')
  const cta = payloadString(payload, 'ctaLabel')
  return {
    ...copy,
    subject: subject ?? copy.subject,
    title: title ?? subject ?? copy.title,
    body: body ?? copy.body,
    cta: cta ?? copy.cta,
  }
}

export function renderEmailTemplate(
  eventType: CommunicationEventType,
  payload: CommunicationPayload = {},
  localeValue?: string | null,
): RenderedEmailTemplate {
  const locale = normalizeLocale(localeValue)
  const copy = copyForPayload(eventType, copies[locale][eventType], payload)
  const rows = detailRows(payload, locale)
  const support = String(payload.supportEmail ?? 'soporte@admhaciendadeletras.com')
  const customerName = payloadString(payload, 'customerName')
  const greeting = customerName
    ? locale === 'en-US' ? `Hello, ${customerName}` : `Hola, ${customerName}`
    : locale === 'en-US' ? 'Hello' : 'Hola'
  const actionUrl = ctaUrl(eventType, payload)
  const helpCopy = locale === 'en-US'
    ? `Questions? Reply to this email or write to ${support}.`
    : `¿Necesitas ayuda? Responde este correo o escríbenos a ${support}.`
  const automaticCopy = locale === 'en-US'
    ? 'This is a transactional message related to your activity with Hacienda de Letras.'
    : 'Este es un mensaje transaccional relacionado con tu actividad en Hacienda de Letras.'

  const html = `<!doctype html>
<html lang="${locale === 'es-MX' ? 'es' : 'en'}">
<body style="margin:0;background:#f4eee7;color:#2f2522;font-family:Arial,Helvetica,sans-serif;-webkit-font-smoothing:antialiased;">
  <div style="display:none;max-height:0;overflow:hidden;">${escapeHtml(copy.preheader)}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;background:#f4eee7;">
    <tr><td align="center" style="padding:28px 14px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;border-collapse:separate;background:#fffdfa;border:1px solid #decfbe;border-radius:18px;overflow:hidden;box-shadow:0 18px 50px rgba(68,25,28,.10);">
        <tr><td style="height:6px;background:linear-gradient(90deg,#5d0d24,#8b253c,#c49a52);"></td></tr>
        <tr><td align="center" style="padding:25px 28px 21px;border-bottom:1px solid #eadfd4;">
          <img src="${brandLogoUrl}" width="112" alt="${brandName}" style="display:block;width:112px;max-width:112px;height:auto;border:0;" />
          <p style="margin:12px 0 0;color:#8a6a50;font-size:10px;font-weight:700;letter-spacing:.22em;text-transform:uppercase;">El vino de Aguascalientes</p>
        </td></tr>
        <tr><td style="padding:34px 34px 30px;">
          <p style="margin:0 0 10px;color:#9a7540;font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;">${escapeHtml(greeting)}</p>
          <h1 style="margin:0 0 15px;font-family:Georgia,'Times New Roman',serif;font-size:31px;line-height:1.15;font-weight:500;color:#5d0d24;">${escapeHtml(copy.title)}</h1>
          <p style="margin:0 0 24px;font-size:15px;line-height:1.72;color:#594944;">${escapeHtml(copy.body)}</p>
          ${rows ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;border-collapse:separate;background:#faf5ef;border:1px solid #eadfd4;border-radius:12px;margin:0 0 24px;overflow:hidden;">${rows}</table>` : ''}
          <table role="presentation" cellspacing="0" cellpadding="0"><tr><td style="border-radius:999px;background:#650f29;">
            <a href="${escapeHtml(actionUrl)}" style="display:inline-block;color:#ffffff;text-decoration:none;border-radius:999px;padding:14px 22px;font-size:14px;font-weight:700;letter-spacing:.01em;">${escapeHtml(copy.cta)} &nbsp;→</a>
          </td></tr></table>
          <p style="margin:25px 0 0;color:#786963;font-size:12px;line-height:1.65;">${escapeHtml(helpCopy)}</p>
        </td></tr>
        <tr><td style="padding:20px 34px;background:#5b1025;color:#f7e9dc;">
          <p style="margin:0 0 5px;font-family:Georgia,'Times New Roman',serif;font-size:16px;">Hacienda de Letras</p>
          <p style="margin:0;color:#dfc8bb;font-size:10px;line-height:1.6;">${escapeHtml(automaticCopy)}<br />Aguascalientes, México · admhaciendadeletras.com</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

  const textLines = [
    brandName,
    copy.title,
    copy.body,
    ...Object.entries(payload)
      .filter(([key, value]) => key !== 'supportEmail' && !isSensitiveKey(key) && value !== null && value !== undefined && value !== '')
      .map(([key, value]) => `${key}: ${value}`),
    `${locale === 'en-US' ? 'Support' : 'Soporte'}: ${support}`,
    automaticCopy,
  ]

  return {
    templateKey: eventType,
    locale,
    subject: copy.subject,
    preheader: copy.preheader,
    html,
    text: textLines.join('\n'),
  }
}
