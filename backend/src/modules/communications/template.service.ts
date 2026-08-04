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
      body: 'Tu orden quedó pendiente de pago. La pasarela productiva se habilitará cuando Hacienda confirme sus credenciales.',
      cta: 'Ver orden',
    },
    'order.paid': {
      subject: 'Pago confirmado',
      preheader: 'Tu pago fue confirmado.',
      title: 'Pago confirmado',
      body: 'El pago de tu orden fue confirmado por el proveedor de pago autorizado.',
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
      body: 'Your order is pending payment. Production payment gateway will be enabled after Hacienda confirms its credentials.',
      cta: 'View order',
    },
    'order.paid': {
      subject: 'Payment confirmed',
      preheader: 'Your payment was confirmed.',
      title: 'Payment confirmed',
      body: 'Your order payment was confirmed by the authorized payment provider.',
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

function detailRows(payload: CommunicationPayload) {
  const labels: Record<string, string> = {
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
    startAt: 'Fecha',
    renewalDate: 'Renovación',
    expiresAt: 'Expira',
  }

  return Object.entries(labels)
    .filter(([key]) => !isSensitiveKey(key) && payload[key] !== null && payload[key] !== undefined && payload[key] !== '')
    .map(([key, label]) => `<tr><td style="padding:8px 12px;color:#6f625d;">${label}</td><td style="padding:8px 12px;font-weight:700;color:#2f2522;">${escapeHtml(payload[key])}</td></tr>`)
    .join('')
}

export function renderEmailTemplate(
  eventType: CommunicationEventType,
  payload: CommunicationPayload = {},
  localeValue?: string | null,
): RenderedEmailTemplate {
  const locale = normalizeLocale(localeValue)
  const copy = copies[locale][eventType]
  const rows = detailRows(payload)
  const support = String(payload.supportEmail ?? 'soporte@admhaciendadeletras.com')

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
      <p style="margin:0;color:#7b6d66;font-size:12px;line-height:1.5;">Copy transaccional pendiente de aprobación final de Hacienda de Letras. Para soporte escribe a ${escapeHtml(support)}.</p>
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
    `Soporte: ${support}`,
    'Copy transaccional pendiente de aprobación final de Hacienda de Letras.',
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
