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

type EventVariantOption = {
  id: string
  label: string
  value: string
  price: number | null
  capacity: number | null
  code: string | null
}

type EventVariant = {
  id: string
  name: string
  label: string
  key: string
  category: string
  input_type: string
  required: boolean
  options: EventVariantOption[]
}

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
    timeZone: 'America/Mexico_City',
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

function metadataValue(value: unknown, key: string) {
  if (!value || typeof value !== 'object') return ''
  const record = value as Record<string, unknown>
  const raw = record[key]
  return typeof raw === 'string' || typeof raw === 'number' ? String(raw) : ''
}

function metadataRecord(value: unknown, key: string) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const record = value as Record<string, unknown>
  const raw = record[key]
  return raw && typeof raw === 'object' && !Array.isArray(raw) ? raw as Record<string, unknown> : {}
}

function metadataBoolean(value: unknown, key: string, fallback: boolean) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fallback
  const record = value as Record<string, unknown>
  const raw = record[key]
  if (typeof raw === 'boolean') return raw
  if (typeof raw === 'string') return ['true', '1', 'yes', 'si', 'sí'].includes(raw.trim().toLowerCase())
  return fallback
}

function booleanPart(value: unknown, fallback: boolean) {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') return ['true', '1', 'yes', 'si', 'sí'].includes(value.trim().toLowerCase())
  return fallback
}

function linesFromUnknown(value: unknown) {
  if (Array.isArray(value)) return value.map(textValue).filter(Boolean).join('\n')
  return textValue(value)
}

function parseLines(value: unknown) {
  return textValue(value)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

function nestedBoolean(value: unknown, key: string, nestedKey: string, fallback: boolean) {
  return booleanPart(metadataRecord(value, key)[nestedKey], fallback)
}

function menuOptionsTextFromMetadata(value: unknown) {
  const menu = metadataRecord(value, 'menuConfig')
  const options = Array.isArray(menu.options) ? menu.options : []
  return options
    .map((option) => {
      if (!option || typeof option !== 'object' || Array.isArray(option)) return ''
      const record = option as Record<string, unknown>
      const label = textValue(record.label || record.name || record.option)
      if (!label) return ''
      const price = numericValue(record.price) ?? 0
      const category = textValue(record.category)
      const description = textValue(record.description)
      const parts = category ? [category, label, String(price), description] : [label, String(price), description]
      return parts.filter(Boolean).join(' | ')
    })
    .filter(Boolean)
    .join('\n')
}

function parseMenuOptionsText(value: unknown) {
  return textValue(value)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const parts = line.split('|').map((part) => part.trim())
      const [category, label, price, description] = parts.length >= 4
        ? parts
        : ['', parts[0] ?? '', parts[1] ?? '', parts.slice(2).join(' | ')]
      const cleanPrice = String(price ?? '').replace(/[$,]/g, '')
      const priceValue = numericValue(cleanPrice) ?? 0
      if (!label) return null
      return {
        value: slugKey(label) || `menu_${index + 1}`,
        label,
        category: category || null,
        description: description || null,
        price: priceValue,
        currency: 'MXN',
      }
    })
    .filter((item): item is { value: string; label: string; category: string | null; description: string | null; price: number; currency: 'MXN' } => Boolean(item))
}

function slugKey(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function textValue(value: unknown) {
  return typeof value === 'string' || typeof value === 'number' ? String(value).trim() : ''
}

function numericValue(value: unknown) {
  if (value === null || value === undefined || value === '') return null
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : null
}

function normalizeVariantOption(value: unknown, index: number): EventVariantOption | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const record = value as Record<string, unknown>
    const label = textValue(record.label || record.name || record.value)
    if (!label) return null
    return {
      id: textValue(record.id) || slugKey(label) || `option_${index + 1}`,
      label,
      value: textValue(record.value) || slugKey(label),
      price: numericValue(record.price),
      capacity: numericValue(record.capacity),
      code: textValue(record.code || record.sku) || null,
    }
  }
  const label = textValue(value)
  if (!label) return null
  return {
    id: slugKey(label) || `option_${index + 1}`,
    label,
    value: slugKey(label),
    price: null,
    capacity: null,
    code: null,
  }
}

function normalizeVariantSchema(value: unknown): EventVariant[] {
  if (!Array.isArray(value)) return []
  return value
    .map((item, index) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return null
      const record = item as Record<string, unknown>
      const name = textValue(record.name || record.label)
      const key = textValue(record.key) || slugKey(name)
      const options = Array.isArray(record.options)
        ? record.options.map(normalizeVariantOption).filter((option): option is EventVariantOption => Boolean(option))
        : []
      if (!name || !key || options.length === 0) return null
      return {
        id: textValue(record.id) || key || `variable_${index + 1}`,
        name,
        label: textValue(record.label) || name,
        key,
        category: textValue(record.category) || 'custom',
        input_type: textValue(record.input_type) || 'select',
        required: typeof record.required === 'boolean' ? record.required : false,
        options,
      }
    })
    .filter((item): item is EventVariant => Boolean(item))
}

function parseVariantSchemaText(value: string): EventVariant[] {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line): EventVariant | null => {
      const [rawName, ...rest] = line.split(':')
      const name = rawName?.trim() ?? ''
      const options: EventVariantOption[] = rest
        .join(':')
        .split(',')
        .map((option) => option.trim())
        .filter(Boolean)
        .map((option, optionIndex) => ({
          id: slugKey(option) || `option_${optionIndex + 1}`,
          label: option,
          value: slugKey(option),
          price: null,
          capacity: null,
          code: null,
        }))
      return name && options.length ? {
        id: slugKey(name),
        name,
        label: name,
        key: slugKey(name),
        category: 'custom',
        input_type: 'select',
        required: false,
        options,
      } : null
    })
    .filter((item): item is EventVariant => Boolean(item))
}

function eventVariantSchemaFromMetadata(value: unknown) {
  if (!value || typeof value !== 'object') return []
  const record = value as Record<string, unknown>
  return normalizeVariantSchema(record.variant_schema)
}

function toInputValue(record: ContentRecord | null, field: EditorialField) {
  const value = record?.[field.key]
  if (field.type === 'boolean') return value === true ? 'true' : 'false'
  if (field.type === 'datetime') return toDatetimeLocal(value)
  if (field.type === 'benefits') return linesFromBenefits(value)
  if (field.type === 'eventMetadata') {
    const contractTerms = metadataRecord(value, 'contractTerms')
    const menuConfig = metadataRecord(value, 'menuConfig')
    return JSON.stringify({
      event_kind: metadataValue(value, 'event_kind'),
      location_kind: metadataValue(value, 'location_kind') || 'estate',
      reservation_phone: metadataValue(value, 'reservation_phone'),
      contract_title: textValue(contractTerms.title),
      contract_terms: linesFromUnknown(contractTerms.terms),
      contract_confirmation: textValue(contractTerms.confirmationMessage),
      contract_requires_acceptance: nestedBoolean(value, 'contractTerms', 'requiresAcceptance', true),
      contract_version: textValue(contractTerms.version),
      menu_enabled: metadataBoolean(menuConfig, 'enabled', false),
      menu_required: metadataBoolean(menuConfig, 'required', true),
      menu_label: textValue(menuConfig.label),
      menu_price_mode: textValue(menuConfig.priceMode) || 'per_person',
      menu_options_text: menuOptionsTextFromMetadata(value),
      variant_schema: eventVariantSchemaFromMetadata(value),
      advancedJson: '',
    })
  }
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
      image_url: campaignValue(value, 'image_url'),
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
  const advanced = JSON.parse(advancedJson) as Record<string, unknown>
  return {
    ...fallback,
    ...advanced,
  }
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

    if (field.type === 'eventMetadata') {
      const parsed = rawValue ? JSON.parse(rawValue) as Record<string, unknown> : {}
      const eventKind = typeof parsed.event_kind === 'string' ? parsed.event_kind.trim() : ''
      const locationKind = typeof parsed.location_kind === 'string' ? parsed.location_kind.trim() : 'estate'
      const reservationPhone = typeof parsed.reservation_phone === 'string' ? parsed.reservation_phone.trim() : ''
      const contractTitle = typeof parsed.contract_title === 'string' ? parsed.contract_title.trim() : ''
      const contractTerms = parseLines(parsed.contract_terms)
      const contractConfirmation = typeof parsed.contract_confirmation === 'string' ? parsed.contract_confirmation.trim() : ''
      const contractVersion = typeof parsed.contract_version === 'string' ? parsed.contract_version.trim() : ''
      const menuLabel = typeof parsed.menu_label === 'string' ? parsed.menu_label.trim() : ''
      const menuPriceMode = parsed.menu_price_mode === 'flat' ? 'flat' : 'per_person'
      const menuOptions = parseMenuOptionsText(parsed.menu_options_text)
      const variantSchemaText = typeof parsed.variant_schema_text === 'string' ? parsed.variant_schema_text : ''
      const variantSchema = Array.isArray(parsed.variant_schema)
        ? normalizeVariantSchema(parsed.variant_schema)
        : parseVariantSchemaText(variantSchemaText)
      const fallbackMetadata: Record<string, unknown> = {
        event_scope: definition.entity === 'grand-events' ? 'grand' : 'standard',
        event_kind: eventKind,
        location_kind: locationKind || 'estate',
        reservation_phone: reservationPhone,
        variant_schema: variantSchema,
      }
      if (contractTitle || contractTerms.length || contractConfirmation) {
        fallbackMetadata.contractTerms = {
          title: contractTitle || 'Condiciones de reservación',
          terms: contractTerms,
          confirmationMessage: contractConfirmation || 'Acepto las condiciones de reservación.',
          requiresAcceptance: booleanPart(parsed.contract_requires_acceptance, true),
          version: contractVersion || `${definition.entity}-${slugKey(contractTitle || 'condiciones') || 'condiciones'}-v1`,
        }
      }
      if (booleanPart(parsed.menu_enabled, menuOptions.length > 0) || menuOptions.length > 0) {
        fallbackMetadata.menuConfig = {
          enabled: true,
          required: booleanPart(parsed.menu_required, true),
          label: menuLabel || 'Menú',
          priceMode: menuPriceMode,
          options: menuOptions,
        }
      }
      payload.metadata = parseGuidedJson(rawValue ?? '', fallbackMetadata)
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
      const imageUrl = typeof parsed.image_url === 'string' ? parsed.image_url.trim() : ''
      payload.content = parseGuidedJson(rawValue ?? '', {
        subject,
        body,
        cta_label: ctaLabel,
        cta_url: ctaUrl,
        image_url: imageUrl,
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
    errors[key] = 'La configuración avanzada no es válida.'
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
            : field.type === 'eventMetadata'
              ? !getGuidedJsonPart(values, field.key, 'event_kind')
              : field.type === 'campaignContent'
                ? !getGuidedJsonPart(values, field.key, 'body')
                : !value
      if (missing) {
        missingForPublish.push(field.label)
        errors[field.key] = `${field.label} es necesario antes de publicar.`
      }
    }

    if (field.key === 'slug' && value && !slugPattern.test(value)) {
      errors[field.key] = 'El enlace corto solo acepta minúsculas, números y guiones.'
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

    if (field.type === 'eventMetadata' || field.type === 'campaignAudience' || field.type === 'campaignContent') {
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
  const unpublishAt = values.unpublish_at
  if (intent === 'schedule' && publishAt && new Date(publishAt).getTime() <= Date.now()) {
    errors.publish_at = 'La programación debe ser futura.'
  }
  if (publishAt && unpublishAt && new Date(unpublishAt).getTime() <= new Date(publishAt).getTime()) {
    errors.unpublish_at = 'La fecha de retiro debe ser posterior a la publicación.'
  }
  if (validatesForPublish && unpublishAt && new Date(unpublishAt).getTime() <= Date.now()) {
    errors.unpublish_at = 'La fecha de retiro ya venció; elimínala o elige una fecha futura.'
  }
  if (startAt && unpublishAt && new Date(unpublishAt).getTime() <= new Date(startAt).getTime()) {
    errors.unpublish_at = 'La fecha de retiro debe ser posterior al inicio.'
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
