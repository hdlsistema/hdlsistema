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

export function contentRouteId(record: ContentRecord) {
  return textField(record, 'slug') || textField(record, 'code') || record.id
}

export function imageField(record: ContentRecord, fallback: string) {
  return textField(record, 'cover_image_url') || fallback
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
