import type { ContentRecord } from '../../services/content.service'
import { DEFAULT_LOCALE, formatCurrency as formatI18nCurrency, formatTimeRange, type AppLocale } from '../i18n'

export function textField(record: ContentRecord, key: string, fallback = '') {
  const value = record[key]
  if (typeof value === 'string') return value
  if (typeof value === 'number') return String(value)
  return fallback
}

export function numberField(record: ContentRecord, key: string, fallback = 0) {
  const value = record[key]
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : fallback
  }
  return fallback
}

function objectRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function valueText(value: unknown): string {
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) return value.map(valueText).filter(Boolean).join(' ')
  if (value && typeof value === 'object') return Object.values(value as Record<string, unknown>).map(valueText).filter(Boolean).join(' ')
  return ''
}

export function metadataRecord(record: ContentRecord) {
  return objectRecord(record.metadata)
}

export function metadataText(record: ContentRecord, ...keys: string[]) {
  const metadata = metadataRecord(record)
  const overrides = objectRecord(metadata.overrides)
  if (keys.length === 0) return valueText(metadata)
  return keys
    .flatMap((key) => [valueText(metadata[key]), valueText(overrides[key])])
    .filter(Boolean)
    .join(' ')
}

export function contentRouteId(record: ContentRecord) {
  return textField(record, 'slug') || textField(record, 'code') || record.id
}

export function imageField(record: ContentRecord, fallback: string) {
  return textField(record, 'cover_image_url') ||
    textField(record, 'coverImageUrl') ||
    textField(record, 'image_url') ||
    textField(record, 'imageUrl') ||
    fallback
}

type GalleryImage = {
  id?: string
  url?: string
  alt_text?: string | null
  sort_order?: number | null
  status?: string | null
  visible_in_app?: boolean | null
  publish_at?: string | null
  unpublish_at?: string | null
  archived_at?: string | null
  deleted_at?: string | null
}

type PublicTicketType = {
  id?: string
  price?: number | string | null
  active?: boolean | null
  status?: string | null
  visible_in_app?: boolean | null
  sales_start_at?: string | null
  sales_end_at?: string | null
  publish_at?: string | null
  unpublish_at?: string | null
  archived_at?: string | null
  deleted_at?: string | null
}

function isLiveGalleryImage(image: GalleryImage) {
  const now = Date.now()
  const startsAt = image.publish_at ? new Date(image.publish_at).getTime() : null
  const endsAt = image.unpublish_at ? new Date(image.unpublish_at).getTime() : null
  return Boolean(image.url)
    && image.visible_in_app !== false
    && (image.status === undefined || image.status === null || image.status === 'published')
    && !image.archived_at
    && !image.deleted_at
    && (startsAt === null || startsAt <= now)
    && (endsAt === null || endsAt > now)
}

export function galleryImages(record: ContentRecord, key: string, fallbackUrl = '') {
  const value = record[key]
  const images = Array.isArray(value)
    ? value.filter((item): item is GalleryImage => Boolean(item && typeof item === 'object'))
    : []

  const liveImages = images
    .filter(isLiveGalleryImage)
    .sort((left, right) => Number(left.sort_order ?? 0) - Number(right.sort_order ?? 0))
    .map((image) => ({
      id: image.id ?? image.url ?? '',
      url: image.url ?? '',
      alt: image.alt_text ?? '',
    }))

  if (liveImages.length > 0) return liveImages
  return fallbackUrl ? [{ id: fallbackUrl, url: fallbackUrl, alt: '' }] : []
}

function isLiveTicketType(ticket: PublicTicketType) {
  const now = Date.now()
  const starts = ticket.sales_start_at ? new Date(ticket.sales_start_at).getTime() : null
  const ends = ticket.sales_end_at ? new Date(ticket.sales_end_at).getTime() : null
  const publishes = ticket.publish_at ? new Date(ticket.publish_at).getTime() : null
  const unpublishes = ticket.unpublish_at ? new Date(ticket.unpublish_at).getTime() : null
  return ticket.active !== false
    && ticket.visible_in_app !== false
    && ticket.status === 'published'
    && !ticket.archived_at
    && !ticket.deleted_at
    && (starts === null || starts <= now)
    && (ends === null || ends >= now)
    && (publishes === null || publishes <= now)
    && (unpublishes === null || unpublishes > now)
}

export function liveEventTicketTypes(record: ContentRecord) {
  const value = record.event_ticket_types
  return Array.isArray(value)
    ? value
      .filter((item): item is PublicTicketType => Boolean(item && typeof item === 'object'))
      .filter(isLiveTicketType)
    : []
}

export function eventMinimumTicketPrice(record: ContentRecord, fallback = 0) {
  const prices = liveEventTicketTypes(record)
    .map((ticket) => Number(ticket.price ?? 0))
    .filter((price) => Number.isFinite(price) && price > 0)

  return prices.length ? Math.min(...prices) : fallback
}

function normalizedCopy(value: string) {
  return value
    .toLocaleLowerCase('es-MX')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

export function isPhoneReservationInstruction(value: string) {
  const normalized = normalizedCopy(value)
  return normalized.includes('reserva por telefono')
    || normalized.includes('reservacion por telefono')
    || normalized.includes('reservation by phone')
    || normalized.includes('reserve by phone')
    || normalized.includes('se reserva directamente')
}

export function sanitizePublicEventCopy(value: string) {
  const cleanLines = value
    .split(/\n+|\.\s+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((part) => !isPhoneReservationInstruction(part))

  return cleanLines.join('. ')
}

export function publicEventHasEnded(record: ContentRecord) {
  const endAt = textField(record, 'end_at')
  if (!endAt) return false
  const endDate = new Date(endAt).getTime()
  return Number.isFinite(endDate) && endDate <= Date.now()
}

export function formatCurrency(value: number, locale: AppLocale = DEFAULT_LOCALE) {
  return formatI18nCurrency(value, locale, 'MXN')
}

export function formatPublicDate(value: unknown, locale: AppLocale = DEFAULT_LOCALE, fallback = 'Fecha por confirmar') {
  if (typeof value !== 'string' || !value) return fallback
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return fallback
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'America/Mexico_City' }).format(date)
}

export function formatPublicTimeRange(startValue: unknown, endValue: unknown, locale: AppLocale = DEFAULT_LOCALE) {
  if (typeof startValue !== 'string' || typeof endValue !== 'string') {
    return locale === 'en-US' ? 'Schedule to be confirmed' : 'Horario por confirmar'
  }

  const formatted = formatTimeRange(startValue, endValue, locale)
  return formatted || (locale === 'en-US' ? 'Schedule to be confirmed' : 'Horario por confirmar')
}
