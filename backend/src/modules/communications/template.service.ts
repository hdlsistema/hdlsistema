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
const supportedLocales: CommunicationLocale[] = ['es-MX', 'en-US']

const copies: Record<CommunicationLocale, Record<CommunicationEventType, TemplateCopy>> = {
  'es-MX': {
    'customer.welcome': {
      subject: 'Bienvenida a Hacienda de Letras',
      preheader: 'Tu cuenta ya está lista.',
      title: 'Tu cuenta está lista',
      body: 'Gracias por registrarte. Ya puedes consultar experiencias, reservaciones, Wine Club y órdenes desde la app.',
      cta: 'Ir a mi cuenta',
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
      title: 'Bienvenida a Wine Club',
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
      preheader: 'Your account is ready.',
      title: 'Your account is ready',
      body: 'Thank you for registering. You can now review experiences, reservations, Wine Club and orders from the app.',
      cta: 'Open my account',
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

  if (['startAt', 'renewalDate', 'expiresAt', 'preferredDate'].includes(key)) {
    const date = new Date(value)
    if (!Number.isNaN(date.getTime())) {
      return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: key === 'startAt' ? 'short' : undefined }).format(date)
    }
  }

  if (key === 'total') {
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
      experienceTitle: 'Experiencia',
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
      renewalDate: 'Renovación',
      expiresAt: 'Expira',
    },
    'en-US': {
      customerName: 'Customer',
      reservationNumber: 'Reservation',
      orderNumber: 'Order',
      membershipNumber: 'Membership',
      experienceTitle: 'Experience',
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
      renewalDate: 'Renewal',
      expiresAt: 'Expires',
    },
  }

  return Object.entries(labels[locale])
    .filter(([key]) => !isSensitiveKey(key) && payload[key] !== null && payload[key] !== undefined && payload[key] !== '')
    .map(([key, label]) => `<tr><td style="padding:8px 12px;color:#6f625d;">${label}</td><td style="padding:8px 12px;font-weight:700;color:#2f2522;">${escapeHtml(formatPayloadValue(key, payload[key], locale))}</td></tr>`)
    .join('')
}

function payloadString(payload: CommunicationPayload, key: string) {
  const value = payload[key]
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, 2200) : null
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
  const pendingCopyNotice =
    locale === 'en-US'
      ? `Final transactional copy is pending approval by Hacienda de Letras. For support, write to ${escapeHtml(support)}.`
      : `Copy transaccional pendiente de aprobación final de Hacienda de Letras. Para soporte escribe a ${escapeHtml(support)}.`

  const html = `<!doctype html>
<html lang="${locale === 'es-MX' ? 'es' : 'en'}">
<body style="margin:0;background:#f7f3ef;color:#2f2522;font-family:Arial,Helvetica,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;">${escapeHtml(copy.preheader)}</div>
  <main style="max-width:640px;margin:0 auto;padding:32px 18px;">
    <section style="background:#ffffff;border:1px solid #e3d8ce;border-radius:8px;padding:28px;">
      <p style="margin:0 0 18px;color:#8a1f2d;font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;">${brandName}</p>
      <h1 style="margin:0 0 14px;font-size:24px;line-height:1.2;color:#2f2522;">${escapeHtml(copy.title)}</h1>
      <p style="margin:0 0 22px;font-size:15px;line-height:1.6;color:#4d403b;">${escapeHtml(copy.body)}</p>
      ${rows ? `<table role="presentation" style="width:100%;border-collapse:collapse;background:#faf7f4;border:1px solid #eadfd7;border-radius:8px;margin:0 0 22px;">${rows}</table>` : ''}
      <p style="margin:0 0 24px;">
        <a href="https://admhaciendadeletras.com/app/home" style="display:inline-block;background:#8a1f2d;color:#ffffff;text-decoration:none;border-radius:6px;padding:12px 16px;font-size:14px;font-weight:700;">${escapeHtml(copy.cta)}</a>
      </p>
      <p style="margin:0;color:#7b6d66;font-size:12px;line-height:1.5;">${pendingCopyNotice}</p>
    </section>
  </main>
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
    locale === 'en-US'
      ? 'Final transactional copy is pending approval by Hacienda de Letras.'
      : 'Copy transaccional pendiente de aprobación final de Hacienda de Letras.',
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
