export type ContractTerms = {
  title: string
  terms: string[]
  confirmationMessage: string
  requiresAcceptance: boolean
  version: string
}

export type OperationalRules = {
  checkInTime?: string
  checkOutTime?: string
  breakfastWindow?: string
  minimumNoticeHours?: number
  vineyardTourTime?: string
  tastingTime?: string
  dinnerTime?: string
  dinnerDurationMinutes?: number
  kitchenNotice?: string
}

export type MenuOption = {
  value: string
  label: string
  description?: string
  price: number
  currency: 'MXN'
  category?: string
}

export type MenuConfig = {
  enabled: boolean
  required: boolean
  label: string
  priceMode: 'per_person' | 'flat'
  options: MenuOption[]
}

export type MenuSelection = {
  label: string
  option: string
  value: string
  price: number
  quantity: number
  subtotal: number
  currency: 'MXN'
  priceMode: 'per_person' | 'flat'
  description?: string
  category?: string
}

const DEFAULT_CONTRACT_TERMS: ContractTerms = {
  title: 'Condiciones de reservación',
  terms: [
    'La reservación queda sujeta a disponibilidad y confirmación operativa de Hacienda de Letras.',
    'Los horarios, accesos y servicios se atienden conforme a las condiciones publicadas al momento de reservar.',
    'Los cambios deben solicitarse con anticipación al equipo de atención.',
  ],
  confirmationMessage: 'Acepto las condiciones de reservación.',
  requiresAcceptance: true,
  version: 'reservation-terms-v1',
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function textValue(value: unknown) {
  return typeof value === 'string' || typeof value === 'number' ? String(value).trim() : ''
}

function booleanValue(value: unknown, fallback: boolean) {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') return ['true', '1', 'yes', 'si', 'sí'].includes(value.trim().toLowerCase())
  return fallback
}

function numberValue(value: unknown, fallback = 0) {
  const next = Number(value)
  return Number.isFinite(next) ? next : fallback
}

function slugValue(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function linesValue(value: unknown) {
  if (Array.isArray(value)) return value.map(textValue).filter(Boolean)
  return textValue(value)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

export function contractTermsFromMetadata(metadata: unknown, fallback: ContractTerms = DEFAULT_CONTRACT_TERMS): ContractTerms {
  const contract = asRecord(asRecord(metadata).contractTerms)
  const terms = linesValue(contract.terms)
  return {
    title: textValue(contract.title) || fallback.title,
    terms: terms.length ? terms : fallback.terms,
    confirmationMessage: textValue(contract.confirmationMessage) || fallback.confirmationMessage,
    requiresAcceptance: booleanValue(contract.requiresAcceptance ?? contract.required, fallback.requiresAcceptance),
    version: textValue(contract.version) || fallback.version,
  }
}

export function acceptedContractMetadata(contract: ContractTerms, source: string) {
  return {
    title: contract.title,
    version: contract.version,
    acceptedAt: new Date().toISOString(),
    source,
    terms: contract.terms,
  }
}

export function operationalRulesFromMetadata(metadata: unknown, fallback: OperationalRules): OperationalRules {
  const rules = asRecord(asRecord(metadata).operationalRules)
  return {
    ...fallback,
    checkInTime: textValue(rules.checkInTime) || fallback.checkInTime,
    checkOutTime: textValue(rules.checkOutTime) || fallback.checkOutTime,
    breakfastWindow: textValue(rules.breakfastWindow) || fallback.breakfastWindow,
    minimumNoticeHours: numberValue(rules.minimumNoticeHours, fallback.minimumNoticeHours ?? 0),
    vineyardTourTime: textValue(rules.vineyardTourTime) || fallback.vineyardTourTime,
    tastingTime: textValue(rules.tastingTime) || fallback.tastingTime,
    dinnerTime: textValue(rules.dinnerTime) || fallback.dinnerTime,
    dinnerDurationMinutes: numberValue(rules.dinnerDurationMinutes, fallback.dinnerDurationMinutes ?? 0),
    kitchenNotice: textValue(rules.kitchenNotice) || fallback.kitchenNotice,
  }
}

export function menuConfigFromMetadata(metadata: unknown): MenuConfig | null {
  const config = asRecord(asRecord(metadata).menuConfig)
  const rawOptions = Array.isArray(config.options) ? config.options : []
  const options = rawOptions
    .map((value): MenuOption | null => {
      const record = asRecord(value)
      const label = textValue(record.label || record.name || record.option)
      if (!label) return null
      return {
        value: textValue(record.value) || slugValue(label),
        label,
        description: textValue(record.description) || undefined,
        price: Math.max(0, numberValue(record.price, 0)),
        currency: 'MXN',
        category: textValue(record.category) || undefined,
      }
    })
    .filter((option): option is MenuOption => Boolean(option))
  const enabled = booleanValue(config.enabled, options.length > 0)
  if (!enabled || options.length === 0) return null
  return {
    enabled,
    required: booleanValue(config.required, true),
    label: textValue(config.label) || 'Menú',
    priceMode: textValue(config.priceMode) === 'flat' ? 'flat' : 'per_person',
    options,
  }
}

export function buildMenuSelection(config: MenuConfig | null, selectedValue: string, people: number): MenuSelection | null {
  if (!config || !selectedValue) return null
  const option = config.options.find((item) => item.value === selectedValue)
  if (!option) return null
  const quantity = config.priceMode === 'per_person' ? Math.max(1, people) : 1
  return {
    label: config.label,
    option: option.label,
    value: option.value,
    price: option.price,
    quantity,
    subtotal: option.price * quantity,
    currency: option.currency,
    priceMode: config.priceMode,
    description: option.description,
    category: option.category,
  }
}

export function menuSelectionFromMetadata(metadata: Record<string, unknown> | null | undefined): MenuSelection | null {
  const selection = asRecord(metadata?.menuSelection)
  const option = textValue(selection.option)
  if (!option) return null
  return {
    label: textValue(selection.label) || 'Menú',
    option,
    value: textValue(selection.value),
    price: Math.max(0, numberValue(selection.price, 0)),
    quantity: Math.max(1, numberValue(selection.quantity, 1)),
    subtotal: Math.max(0, numberValue(selection.subtotal, 0)),
    currency: 'MXN',
    priceMode: textValue(selection.priceMode) === 'flat' ? 'flat' : 'per_person',
    description: textValue(selection.description) || undefined,
    category: textValue(selection.category) || undefined,
  }
}

export function formatRuleTime(value?: string) {
  if (!value || !/^\d{2}:\d{2}$/.test(value)) return value || ''
  const [hour, minute] = value.split(':').map(Number)
  const suffix = hour >= 12 ? 'p.m.' : 'a.m.'
  const hour12 = hour % 12 || 12
  return `${hour12}:${String(minute).padStart(2, '0')} ${suffix}`
}

export function formatWindowLabel(value?: string) {
  if (!value) return ''
  const [start, end] = value.split('-').map((item) => item.trim())
  if (!start || !end) return value
  return `${formatRuleTime(start)} a ${formatRuleTime(end)}`
}
