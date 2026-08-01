import type { ContentRecord } from '../../services/content.service'

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

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatPublicDate(value: unknown, fallback = 'Fecha por confirmar') {
  if (typeof value !== 'string' || !value) return fallback
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return fallback

  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'medium',
  }).format(date)
}

export function formatPublicTimeRange(startValue: unknown, endValue: unknown) {
  if (typeof startValue !== 'string' || typeof endValue !== 'string') {
    return 'Horario por confirmar'
  }

  const start = new Date(startValue)
  const end = new Date(endValue)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return 'Horario por confirmar'
  }

  const formatter = new Intl.DateTimeFormat('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
  })

  return `${formatter.format(start)} - ${formatter.format(end)}`
}
