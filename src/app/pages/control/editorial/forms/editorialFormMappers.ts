import type { ContentRecord } from '../../../../../services/content.service'
import type {
  EditorialDefinition,
  EditorialField,
  EditorialFieldErrors,
  EditorialFormValues,
  ValidationIntent,
  ValidationResult,
} from './editorialFormTypes'

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export function getDefinitionFields(definition: EditorialDefinition): EditorialField[] {
  return definition.sections.flatMap((section) => section.fields)
}

export function formatDate(value: unknown) {
  if (typeof value !== 'string' || !value) return 'Sin fecha'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Sin fecha'

  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

export function getDisplayValue(record: ContentRecord, key: string) {
  const value = record[key]
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  if (typeof value === 'boolean') return value ? 'Sí' : 'No'
  return ''
}

export function getRecordTitle(record: ContentRecord, definition: EditorialDefinition) {
  return getDisplayValue(record, definition.primaryLabel) || getDisplayValue(record, 'name') || getDisplayValue(record, 'title') || 'Sin título'
}

export function getRecordSubtitle(record: ContentRecord, definition: EditorialDefinition) {
  return getDisplayValue(record, definition.secondaryLabel) || getDisplayValue(record, 'slug') || getDisplayValue(record, 'code') || record.id
}

export function statusLabel(definition: EditorialDefinition, status?: string | null) {
  const label = status || 'sin_estado'
  const option = getDefinitionFields(definition)
    .find((field) => field.key === 'status')
    ?.options?.find((item) => item.value === label)
  return option?.label ?? label
}

function toDatetimeLocal(value: unknown) {
  if (typeof value !== 'string' || !value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString().slice(0, 16)
}

function linesFromBenefits(value: unknown) {
  if (!value || typeof value !== 'object') return ''
  const record = value as { items?: unknown; benefits?: unknown }
  const list = Array.isArray(record.items) ? record.items : Array.isArray(record.benefits) ? record.benefits : []
  return list.map((item) => String(item).trim()).filter(Boolean).join('\n')
}

function campaignValue(value: unknown, key: string) {
  if (!value || typeof value !== 'object') return ''
  const record = value as Record<string, unknown>
  const raw = record[key]
  return typeof raw === 'string' || typeof raw === 'number' ? String(raw) : ''
}

function toInputValue(record: ContentRecord | null, field: EditorialField) {
  const value = record?.[field.key]
  if (field.type === 'boolean') return value === true ? 'true' : 'false'
  if (field.type === 'datetime') return toDatetimeLocal(value)
  if (field.type === 'benefits') return linesFromBenefits(value)
  if (field.type === 'campaignAudience') {
    return JSON.stringify({
      segment: campaignValue(value, 'segment'),
      notes: campaignValue(value, 'notes'),
      advancedJson: '',
    })
  }
  if (field.type === 'campaignContent') {
    return JSON.stringify({
      subject: campaignValue(value, 'subject'),
      body: campaignValue(value, 'body'),
      cta_label: campaignValue(value, 'cta_label'),
      cta_url: campaignValue(value, 'cta_url'),
      advancedJson: '',
    })
  }
  if (typeof value === 'number') return String(value)
  if (typeof value === 'string') return value
  return ''
}

export function buildInitialEditorialForm(record: ContentRecord | null, definition: EditorialDefinition): EditorialFormValues {
  return getDefinitionFields(definition).reduce<EditorialFormValues>((next, field) => {
    next[field.key] = toInputValue(record, field)
    return next
  }, {})
}

function parseGuidedJson(rawValue: string, fallback: Record<string, unknown>) {
  if (!rawValue) return fallback
  const parsed = JSON.parse(rawValue) as Record<string, unknown>
  const advancedJson = typeof parsed.advancedJson === 'string' ? parsed.advancedJson.trim() : ''
  if (!advancedJson) return fallback
  return JSON.parse(advancedJson) as Record<string, unknown>
}

export function serializeEditorialPayload(definition: EditorialDefinition, values: EditorialFormValues) {
  return getDefinitionFields(definition).reduce<Record<string, unknown>>((payload, field) => {
    const rawValue = values[field.key]

    if (field.type === 'boolean') {
      payload[field.key] = rawValue === 'true'
      return payload
    }

    if (field.type === 'benefits') {
      const items = (rawValue ?? '')
        .split('\n')
        .map((item) => item.trim())
        .filter(Boolean)
      payload.benefits = { items }
      return payload
    }

    if (field.type === 'campaignAudience') {
      const parsed = rawValue ? JSON.parse(rawValue) as Record<string, unknown> : {}
      const segment = typeof parsed.segment === 'string' ? parsed.segment.trim() : ''
      const notes = typeof parsed.notes === 'string' ? parsed.notes.trim() : ''
      payload.audience_definition = parseGuidedJson(rawValue ?? '', { segment, notes })
      return payload
    }

    if (field.type === 'campaignContent') {
      const parsed = rawValue ? JSON.parse(rawValue) as Record<string, unknown> : {}
      const subject = typeof parsed.subject === 'string' ? parsed.subject.trim() : ''
      const body = typeof parsed.body === 'string' ? parsed.body.trim() : ''
      const ctaLabel = typeof parsed.cta_label === 'string' ? parsed.cta_label.trim() : ''
      const ctaUrl = typeof parsed.cta_url === 'string' ? parsed.cta_url.trim() : ''
      payload.content = parseGuidedJson(rawValue ?? '', {
        subject,
        body,
        cta_label: ctaLabel,
        cta_url: ctaUrl,
      })
      return payload
    }

    if (rawValue === undefined || rawValue === '') {
      if (field.nullable) payload[field.key] = null
      return payload
    }

    if (field.type === 'number') {
      payload[field.key] = Number(rawValue)
      return payload
    }

    if (field.type === 'datetime') {
      payload[field.key] = new Date(rawValue).toISOString()
      return payload
    }

    payload[field.key] = rawValue.trim()
    return payload
  }, {})
}

function getGuidedJsonPart(values: EditorialFormValues, key: string, part: string) {
  const rawValue = values[key]
  if (!rawValue) return ''
  try {
    const parsed = JSON.parse(rawValue) as Record<string, unknown>
    const value = parsed[part]
    return typeof value === 'string' ? value.trim() : ''
  } catch {
    return ''
  }
}

function validateGuidedJson(values: EditorialFormValues, key: string, errors: EditorialFieldErrors) {
  const rawValue = values[key]
  if (!rawValue) return
  try {
    const parsed = JSON.parse(rawValue) as Record<string, unknown>
    const advancedJson = typeof parsed.advancedJson === 'string' ? parsed.advancedJson.trim() : ''
    if (advancedJson) JSON.parse(advancedJson)
  } catch {
    errors[key] = 'El JSON avanzado no es válido.'
  }
}

export function validateEditorialForm(
  definition: EditorialDefinition,
  values: EditorialFormValues,
  intent: ValidationIntent,
): ValidationResult {
  const errors: EditorialFieldErrors = {}
  const missingForPublish: string[] = []
  const fields = getDefinitionFields(definition)
  const status = values.status
  const validatesForPublish = intent === 'publish' || status === definition.publishStatus

  for (const field of fields) {
    const value = values[field.key]?.trim() ?? ''

    if (field.required && !value) {
      errors[field.key] = `${field.label} es obligatorio.`
      continue
    }

    if (validatesForPublish && field.publishRequired) {
      const missing =
        field.type === 'benefits'
          ? value.split('\n').map((item) => item.trim()).filter(Boolean).length === 0
          : field.type === 'campaignAudience'
            ? !getGuidedJsonPart(values, field.key, 'segment')
            : field.type === 'campaignContent'
              ? !getGuidedJsonPart(values, field.key, 'body')
              : !value
      if (missing) {
        missingForPublish.push(field.label)
        errors[field.key] = `${field.label} es necesario antes de publicar.`
      }
    }

    if (field.key === 'slug' && value && !slugPattern.test(value)) {
      errors[field.key] = 'El slug solo acepta minúsculas, números y guiones.'
    }

    if (field.type === 'number' && value && Number.isNaN(Number(value))) {
      errors[field.key] = `${field.label} debe ser numérico.`
    }

    if (field.type === 'datetime' && value && Number.isNaN(new Date(value).getTime())) {
      errors[field.key] = `${field.label} debe ser una fecha válida.`
    }

    if (field.key === 'status' && value && field.options && !field.options.some((option) => option.value === value)) {
      errors[field.key] = 'El estado editorial no está permitido.'
    }

    if (field.type === 'campaignAudience' || field.type === 'campaignContent') {
      validateGuidedJson(values, field.key, errors)
    }
  }

  const startAt = values.start_at || values.starts_at
  const endAt = values.end_at || values.ends_at
  if (startAt && endAt && new Date(endAt).getTime() < new Date(startAt).getTime()) {
    const key = values.end_at ? 'end_at' : 'ends_at'
    errors[key] = 'La fecha final no puede ser anterior al inicio.'
  }

  const publishAt = values.publish_at
  if (intent === 'schedule' && publishAt && new Date(publishAt).getTime() <= Date.now()) {
    errors.publish_at = 'La programación debe ser futura.'
  }

  return {
    valid: Object.keys(errors).length === 0,
    generalMessage: Object.keys(errors).length > 0 ? 'Revisa los campos marcados antes de guardar.' : null,
    fieldErrors: errors,
    missingForPublish,
  }
}

export function extractFieldErrorsFromBackend(error: unknown, definition: EditorialDefinition): EditorialFieldErrors {
  if (!error || typeof error !== 'object') return {}
  const body = 'body' in error ? (error as { body?: unknown }).body : undefined
  if (!body || typeof body !== 'object') return {}
  const maybeError = 'error' in body ? (body as { error?: unknown }).error : undefined
  const details = maybeError && typeof maybeError === 'object' && 'details' in maybeError
    ? (maybeError as { details?: unknown }).details
    : undefined
  if (!Array.isArray(details)) return {}

  const validKeys = new Set(getDefinitionFields(definition).map((field) => field.key))
  return details.reduce<EditorialFieldErrors>((next, item) => {
    if (!item || typeof item !== 'object') return next
    const path = 'path' in item && Array.isArray((item as { path?: unknown }).path)
      ? (item as { path: unknown[] }).path[0]
      : undefined
    const message = 'message' in item && typeof (item as { message?: unknown }).message === 'string'
      ? (item as { message: string }).message
      : 'Revisa este campo.'
    if (typeof path === 'string' && validKeys.has(path)) next[path] = message
    return next
  }, {})
}
