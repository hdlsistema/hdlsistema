export type CommunicationEventType =
  | 'customer.welcome'
  | 'reservation.created'
  | 'reservation.rescheduled'
  | 'reservation.cancelled'
  | 'quote.request.created'
  | 'quote.sent'
  | 'campaign.marketing'
  | 'order.created'
  | 'order.pending_payment'
  | 'order.paid'
  | 'order.tracking_assigned'
  | 'order.shipped'
  | 'membership.activated'
  | 'membership.renewed'
  | 'membership.expiring'
  | 'security.password_changed'
  | 'account_deletion.confirmation'
  | 'account_deletion.completed'

export type CommunicationLocale = 'es-MX' | 'en-US'

export type CommunicationPayload = Record<string, string | number | boolean | null | undefined>

export type EnqueueTransactionalEmailInput = {
  eventType: CommunicationEventType
  aggregateType: string
  aggregateId?: string | null
  customerId?: string | null
  userId?: string | null
  recipientEmail?: string | null
  locale?: string | null
  payload?: CommunicationPayload
  idempotencyKey?: string
}

export type RenderedEmailTemplate = {
  templateKey: CommunicationEventType
  locale: CommunicationLocale
  subject: string
  preheader: string
  html: string
  text: string
}
