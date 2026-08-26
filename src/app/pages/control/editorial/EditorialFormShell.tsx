import { AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, Eye, FileText, History, Loader2, PanelRight, Plus, Save, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import type { ContentRecord } from '../../../../services/content.service'
import type {
  EditorialDefinition,
  EditorialField,
  EditorialFieldErrors,
  EditorialFormValues,
} from './forms/editorialFormTypes'
import { statusLabel } from './forms/editorialFormMappers'
import { CrystalDateTimeField } from '../../../components/shared/CrystalDateField'
import { CrystalSelect } from '../../../components/shared/CrystalSelect'
import { ControlStorageUpload } from '../../../components/control/ControlStorageUpload'

type EditorialFormShellProps = {
  definition: EditorialDefinition
  record?: ContentRecord | null
  form: EditorialFormValues
  fieldErrors: EditorialFieldErrors
  recordVersion?: number | null
  updatedAtLabel: string
  selectedTitle: string
  saving: boolean
  isBusy: boolean
  success: string | null
  isPublishedRecord?: boolean
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onStepSave?: () => Promise<boolean>
  onChange: (key: string, value: string) => void
  onPreview: () => void
  onVersions: () => void
  actions: ReactNode
  versions: ReactNode
}

function parseCompositeValue(value: string | undefined) {
  if (!value) return {}
  try {
    return JSON.parse(value) as Record<string, unknown>
  } catch {
    return {}
  }
}

function updateCompositeValue(
  value: string | undefined,
  key: string,
  nextValue: unknown,
) {
  return JSON.stringify({ ...parseCompositeValue(value), [key]: nextValue })
}

function textPart(value: unknown) {
  return typeof value === 'string' || typeof value === 'number' ? String(value) : ''
}

function nestedTextValue(form: EditorialFormValues, key: string, nestedKeys: string[]) {
  const composite = parseCompositeValue(form[key])
  for (const nestedKey of nestedKeys) {
    const value = textPart(composite[nestedKey]).trim()
    if (value) return value
  }
  return ''
}

function firstTextValue(form: EditorialFormValues, keys: string[], fallback = '') {
  for (const key of keys) {
    const direct = textPart(form[key]).trim()
    if (direct) return direct

    const nested = nestedTextValue(form, key, ['title', 'name', 'subject', 'heading', 'body', 'summary', 'description'])
    if (nested) return nested
  }
  return fallback
}

function previewImageValue(form: EditorialFormValues) {
  for (const key of ['cover_image_url', 'image_url', 'hero_image_url', 'poster_url', 'thumbnail_url', 'featured_image_url']) {
    const direct = textPart(form[key]).trim()
    if (direct) return direct
  }

  for (const key of ['campaign_content', 'metadata']) {
    const nested = nestedTextValue(form, key, ['cover_image_url', 'coverImageUrl', 'image_url', 'imageUrl', 'hero_image_url', 'poster_url', 'image', 'cover'])
    if (nested) return nested
  }
  return ''
}

function previewPriceValue(form: EditorialFormValues) {
  for (const key of ['price', 'base_price', 'amount', 'discount_value', 'pre_sale_price', 'door_price']) {
    const direct = textPart(form[key]).trim()
    if (direct) return direct
  }
  return ''
}

function shorten(value: string, max = 118) {
  return value.length > max ? `${value.slice(0, max).trim()}...` : value
}

function booleanPart(value: unknown, fallback = false) {
  return typeof value === 'boolean' ? value : fallback
}

function slugKey(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

type EventVariableOptionDraft = {
  id: string
  label: string
  price: string
  capacity: string
  code: string
}

type EventVariableDraft = {
  id: string
  name: string
  key: string
  category: string
  required: boolean
  options: EventVariableOptionDraft[]
}

const eventVariableCategories = [
  { value: 'ticket', label: 'Boleto / asistente' },
  { value: 'race_distance', label: 'Distancia de carrera' },
  { value: 'pet', label: 'Mascota' },
  { value: 'age_group', label: 'Edad' },
  { value: 'accessory', label: 'Accesorio' },
  { value: 'custom', label: 'Personalizada' },
]

const eventVariableTemplates: Array<{ label: string; variables: EventVariableDraft[] }> = [
  {
    label: 'Adultos y niños',
    variables: [
      {
        id: 'attendee_type',
        name: 'Tipo de asistente',
        key: 'attendee_type',
        category: 'ticket',
        required: true,
        options: [
          { id: 'adult', label: 'Adulto', price: '', capacity: '', code: 'ADULTO' },
          { id: 'child', label: 'Niño', price: '', capacity: '', code: 'NINO' },
        ],
      },
    ],
  },
  {
    label: 'Carrera 3K, 5K y 8K',
    variables: [
      {
        id: 'race_distance',
        name: 'Distancia',
        key: 'race_distance',
        category: 'race_distance',
        required: true,
        options: [
          { id: '3k', label: '3K', price: '', capacity: '', code: '3K' },
          { id: '5k', label: '5K', price: '', capacity: '', code: '5K' },
          { id: '8k', label: '8K', price: '', capacity: '', code: '8K' },
        ],
      },
      {
        id: 'attendee_type',
        name: 'Tipo de asistente',
        key: 'attendee_type',
        category: 'ticket',
        required: true,
        options: [
          { id: 'adult', label: 'Adulto', price: '', capacity: '', code: 'ADULTO' },
          { id: 'child', label: 'Niño', price: '', capacity: '', code: 'NINO' },
        ],
      },
    ],
  },
  {
    label: 'Mascotas',
    variables: [
      {
        id: 'dog_breed',
        name: 'Raza',
        key: 'dog_breed',
        category: 'pet',
        required: false,
        options: [
          { id: 'small_breed', label: 'Raza pequeña', price: '', capacity: '', code: 'RAZA-PEQ' },
          { id: 'medium_breed', label: 'Raza mediana', price: '', capacity: '', code: 'RAZA-MED' },
          { id: 'large_breed', label: 'Raza grande', price: '', capacity: '', code: 'RAZA-GDE' },
        ],
      },
      {
        id: 'dog_size',
        name: 'Tamaño',
        key: 'dog_size',
        category: 'pet',
        required: false,
        options: [
          { id: 'small', label: 'Pequeño', price: '', capacity: '', code: 'TAM-PEQ' },
          { id: 'medium', label: 'Mediano', price: '', capacity: '', code: 'TAM-MED' },
          { id: 'large', label: 'Grande', price: '', capacity: '', code: 'TAM-GDE' },
        ],
      },
    ],
  },
]

function emptyEventVariable(): EventVariableDraft {
  return {
    id: `var_${Date.now()}`,
    name: '',
    key: '',
    category: 'custom',
    required: false,
    options: [{ id: `opt_${Date.now()}`, label: '', price: '', capacity: '', code: '' }],
  }
}

function emptyEventVariableOption(): EventVariableOptionDraft {
  return { id: `opt_${Date.now()}`, label: '', price: '', capacity: '', code: '' }
}

function normalizeEventVariableOption(value: unknown, index: number): EventVariableOptionDraft {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const record = value as Record<string, unknown>
    const label = textPart(record.label || record.name || record.value)
    return {
      id: textPart(record.id) || slugKey(label) || `option_${index + 1}`,
      label,
      price: textPart(record.price),
      capacity: textPart(record.capacity),
      code: textPart(record.code || record.sku),
    }
  }
  const label = textPart(value)
  return {
    id: slugKey(label) || `option_${index + 1}`,
    label,
    price: '',
    capacity: '',
    code: '',
  }
}

function normalizeEventVariables(value: unknown): EventVariableDraft[] {
  if (!Array.isArray(value)) return []
  return value
    .map((item, index) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return null
      const record = item as Record<string, unknown>
      const name = textPart(record.name || record.label)
      const options = Array.isArray(record.options)
        ? record.options.map(normalizeEventVariableOption).filter((option) => option.label)
        : []
      return {
        id: textPart(record.id) || textPart(record.key) || slugKey(name) || `variable_${index + 1}`,
        name,
        key: textPart(record.key) || slugKey(name),
        category: textPart(record.category) || 'custom',
        required: booleanPart(record.required, false),
        options: options.length ? options : [emptyEventVariableOption()],
      }
    })
    .filter((item): item is EventVariableDraft => Boolean(item))
}

function sanitizeEventVariables(variables: EventVariableDraft[]) {
  return variables
    .map((variable) => {
      const name = variable.name.trim()
      const key = variable.key.trim() || slugKey(name)
      const options = variable.options
        .map((option) => {
          const label = option.label.trim()
          const price = option.price.trim()
          const capacity = option.capacity.trim()
          const code = option.code.trim()
          const priceNumber = price === '' ? null : Number(price)
          const capacityNumber = capacity === '' ? null : Number(capacity)
          if (!label) return null
          return {
            id: option.id || slugKey(label),
            label,
            value: slugKey(label),
            price: priceNumber !== null && Number.isFinite(priceNumber) ? priceNumber : null,
            capacity: capacityNumber !== null && Number.isFinite(capacityNumber) ? capacityNumber : null,
            code: code || null,
          }
        })
        .filter((option): option is { id: string; label: string; value: string; price: number | null; capacity: number | null; code: string | null } => Boolean(option))
      if (!name || !key || options.length === 0) return null
      return {
        id: variable.id || key,
        name,
        label: name,
        key,
        category: variable.category || 'custom',
        input_type: 'select',
        required: variable.required,
        options,
      }
    })
    .filter(Boolean)
}

function cloneEventVariable(variable: EventVariableDraft, index = 0): EventVariableDraft {
  const stamp = Date.now()
  return {
    ...variable,
    id: `${variable.id}_${stamp}_${index}`,
    options: variable.options.map((option, optionIndex) => ({
      ...option,
      id: `${option.id}_${stamp}_${index}_${optionIndex}`,
    })),
  }
}

function visibilityCopy(definition: EditorialDefinition, form: EditorialFormValues) {
  if (definition.entity === 'campaigns') {
    if (form.status === 'completed') return 'Campaña enviada'
    if (form.status === 'scheduled') return 'Programada'
    if (form.status === 'active') return 'Lista para envío'
    return 'Operación interna'
  }
  const status = form.status
  if (status === 'archived' || status === 'cancelled') return 'Archivado'
  if (status === 'scheduled') return 'Programado'
  if (form.visible_in_app === 'true' && status === definition.publishStatus) return 'Visible en app'
  return 'No visible en app'
}

function isWizardRequired(field: EditorialField) {
  return Boolean(field.required || field.publishRequired)
}

function hasMeaningfulText(value: string | undefined) {
  return Boolean(String(value ?? '').trim())
}

function hasWizardValue(field: EditorialField, value: string | undefined) {
  if (!isWizardRequired(field)) return true
  if (field.type === 'boolean') return true
  if (field.type === 'number') {
    if (!hasMeaningfulText(value)) return false
    const parsedValue = Number(value)
    return Number.isFinite(parsedValue)
  }
  if (field.type === 'benefits') {
    return String(value ?? '')
      .split('\n')
      .some((item) => item.trim())
  }
  if (field.type === 'eventMetadata') {
    const parsed = parseCompositeValue(value)
    return hasMeaningfulText(textPart(parsed.event_kind))
  }
  if (field.type === 'campaignAudience') {
    const parsed = parseCompositeValue(value)
    const channels = Array.isArray(parsed.channels) ? parsed.channels : []
    return hasMeaningfulText(textPart(parsed.segment)) || hasMeaningfulText(textPart(parsed.notes)) || channels.length > 0
  }
  if (field.type === 'campaignContent') {
    const parsed = parseCompositeValue(value)
    return hasMeaningfulText(textPart(parsed.subject)) && hasMeaningfulText(textPart(parsed.body))
  }
  return hasMeaningfulText(value)
}

function missingFieldsForSection(
  section: EditorialDefinition['sections'][number],
  form: EditorialFormValues,
  fieldErrors: EditorialFieldErrors,
) {
  return section.fields
    .filter((field) => !hasWizardValue(field, form[field.key]) || Boolean(fieldErrors[field.key]))
    .map((field) => field.label)
}

function completionForSection(
  section: EditorialDefinition['sections'][number],
  form: EditorialFormValues,
  fieldErrors: EditorialFieldErrors,
) {
  const requiredFields = section.fields.filter(isWizardRequired)
  const completeRequired = requiredFields.filter((field) => hasWizardValue(field, form[field.key])).length
  const hasErrors = section.fields.some((field) => Boolean(fieldErrors[field.key]))
  return {
    total: requiredFields.length,
    complete: completeRequired,
    hasErrors,
    done: !hasErrors && completeRequired === requiredFields.length,
  }
}

function FieldHelp({ field, error }: { field: EditorialField; error?: string }) {
  if (error) return <p className="text-[13px] font-semibold text-[var(--color-alert)]">{error}</p>
  if (field.helper) return <p className="text-[13px] text-[var(--color-muted)]">{field.helper}</p>
  if (field.publicVisible) return <p className="text-[13px] text-[var(--color-muted)]">Se muestra en la app del cliente.</p>
  return null
}

function StandardField({
  field,
  value,
  error,
  onChange,
}: {
  field: EditorialField
  value: string
  error?: string
  onChange: (value: string) => void
}) {
  const inputClass = `min-h-11 w-full rounded-xl border bg-white px-3 text-[13px] text-[var(--color-ink)] outline-none ${
    error ? 'border-[rgba(157,71,63,0.65)]' : 'border-[var(--color-line)]'
  }`

  if (field.type === 'textarea') {
    return (
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={4}
        placeholder={field.placeholder}
        className={`${inputClass} py-3`}
      />
    )
  }

  if (field.type === 'select') {
    return (
      <CrystalSelect value={value} onChange={onChange}>
        <option value="">Sin cambio</option>
        {field.options?.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </CrystalSelect>
    )
  }

  if (field.type === 'boolean') {
    return (
      <CrystalSelect value={value || 'false'} onChange={onChange}>
        <option value="true">Sí</option>
        <option value="false">No</option>
      </CrystalSelect>
    )
  }

  if (field.type === 'datetime') {
    return <CrystalDateTimeField value={value} onChange={onChange} placeholder={field.placeholder ?? 'Seleccionar fecha'} />
  }

  return (
    <input
      type={field.type === 'number' ? 'number' : 'text'}
      step={field.type === 'number' ? 'any' : undefined}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={field.placeholder}
      className={inputClass}
    />
  )
}

function BenefitsField({
  value,
  error,
  onChange,
}: {
  value: string
  error?: string
  onChange: (value: string) => void
}) {
  const benefits = value.split('\n').map((item) => item.trim()).filter(Boolean)
  return (
    <div className="space-y-3">
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={5}
        placeholder="Un beneficio por línea"
        className={`w-full rounded-xl border bg-white px-3 py-3 text-[13px] text-[var(--color-ink)] outline-none ${
          error ? 'border-[rgba(157,71,63,0.65)]' : 'border-[var(--color-line)]'
        }`}
      />
      <div className="rounded-xl border border-[var(--color-line)] bg-white p-3">
        <p className="text-[13px] font-semibold text-[var(--color-ink)]">Vista de beneficios</p>
        {benefits.length === 0 ? (
          <p className="mt-2 text-[13px] text-[var(--color-muted)]">Agrega al menos un beneficio antes de publicar.</p>
        ) : (
          <ul className="mt-2 space-y-1 text-[13px] text-[var(--color-muted)]">
            {benefits.map((benefit) => (
              <li key={benefit}>- {benefit}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function EventMetadataField({
  value,
  error,
  onChange,
}: {
  value: string
  error?: string
  onChange: (value: string) => void
}) {
  const [selectedTemplateLabel, setSelectedTemplateLabel] = useState(eventVariableTemplates[0]?.label ?? '')
  const parsed = parseCompositeValue(value)
  const variables = normalizeEventVariables(parsed.variant_schema)
  const validVariables = sanitizeEventVariables(variables).length
  const selectedTemplate = eventVariableTemplates.find((template) => template.label === selectedTemplateLabel) ?? eventVariableTemplates[0]
  const setCompositeValue = (key: string, nextValue: unknown) => onChange(updateCompositeValue(value, key, nextValue))
  const setVariables = (nextVariables: EventVariableDraft[]) => setCompositeValue('variant_schema', nextVariables)
  const inputClass = `min-h-11 w-full rounded-xl border bg-white px-3 text-[13px] text-[var(--color-ink)] outline-none ${
    error ? 'border-[rgba(157,71,63,0.65)]' : 'border-[var(--color-line)]'
  }`
  const applyTemplate = (template: { label: string; variables: EventVariableDraft[] }) => {
    const keys = new Set(variables.map((variable) => variable.key).filter(Boolean))
    const nextVariables = [...variables]
    template.variables.forEach((templateVariable, index) => {
      if (!keys.has(templateVariable.key)) {
        nextVariables.push(cloneEventVariable(templateVariable, index))
        keys.add(templateVariable.key)
      }
    })
    setVariables(nextVariables)
  }
  const updateVariable = (variableIndex: number, nextVariable: EventVariableDraft) => {
    const nextVariables = variables.map((variable, index) => (index === variableIndex ? nextVariable : variable))
    setVariables(nextVariables)
  }
  const updateVariableField = (variableIndex: number, key: keyof EventVariableDraft, nextValue: string | boolean) => {
    const variable = variables[variableIndex]
    if (!variable) return
    const derivedKey = key === 'name' && !variable.key ? slugKey(String(nextValue)) : variable.key
    updateVariable(variableIndex, { ...variable, [key]: nextValue, key: derivedKey })
  }
  const updateOptionField = (
    variableIndex: number,
    optionIndex: number,
    key: keyof EventVariableOptionDraft,
    nextValue: string,
  ) => {
    const variable = variables[variableIndex]
    if (!variable) return
    const nextOptions = variable.options.map((option, index) => (index === optionIndex ? { ...option, [key]: nextValue } : option))
    updateVariable(variableIndex, { ...variable, options: nextOptions })
  }
  const removeVariable = (variableIndex: number) => setVariables(variables.filter((_, index) => index !== variableIndex))
  const removeOption = (variableIndex: number, optionIndex: number) => {
    const variable = variables[variableIndex]
    if (!variable) return
    const nextOptions = variable.options.filter((_, index) => index !== optionIndex)
    updateVariable(variableIndex, { ...variable, options: nextOptions.length ? nextOptions : [emptyEventVariableOption()] })
  }
  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2">
        <label>
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">Tipo de evento</span>
          <CrystalSelect value={textPart(parsed.event_kind)} onChange={(nextValue) => setCompositeValue('event_kind', nextValue)}>
            <option value="">Seleccionar</option>
            <option value="special">Especial</option>
            <option value="sunset">Atardecer</option>
            <option value="festival">Festival</option>
            <option value="harvest">Vendimia</option>
            <option value="gastronomy">Gastronomía</option>
            <option value="race">Carrera</option>
            <option value="concert">Concierto</option>
            <option value="private">Encuentro privado</option>
          </CrystalSelect>
        </label>
        <label>
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">Sede / mapa</span>
          <CrystalSelect value={textPart(parsed.location_kind) || 'estate'} onChange={(nextValue) => setCompositeValue('location_kind', nextValue)}>
            <option value="estate">Hacienda principal</option>
            <option value="restaurant_estate">Restaurante Hacienda</option>
            <option value="restaurant_center">Restaurante Nieto</option>
            <option value="cabins">Cabañas</option>
            <option value="boutique">Boutique</option>
          </CrystalSelect>
        </label>
      </div>
      <input
        value={textPart(parsed.reservation_phone)}
        onChange={(event) => setCompositeValue('reservation_phone', event.target.value)}
        placeholder="Teléfono de reservación"
        className={inputClass}
      />
      <section className="rounded-2xl border border-[var(--color-line)] bg-white/80 p-4 shadow-[0_18px_40px_rgba(37,47,55,0.06)]">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[rgba(37,47,55,0.08)] text-[#252F37]"><FileText size={17} /></span>
          <div className="min-w-0">
            <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-gold)]">Contrato y condiciones</span>
            <p className="mt-1 text-[13px] leading-5 text-[var(--color-muted)]">
              Estas reglas se muestran en la app y el cliente debe aceptarlas antes de reservar.
            </p>
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label>
            <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">Título</span>
            <input
              value={textPart(parsed.contract_title)}
              onChange={(event) => setCompositeValue('contract_title', event.target.value)}
              placeholder="Condiciones de reservación"
              className={inputClass}
            />
          </label>
          <label>
            <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">Confirmación</span>
            <input
              value={textPart(parsed.contract_confirmation)}
              onChange={(event) => setCompositeValue('contract_confirmation', event.target.value)}
              placeholder="Acepto las condiciones de reservación."
              className={inputClass}
            />
          </label>
        </div>
        <label className="mt-3 block">
          <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">Condiciones visibles</span>
          <textarea
            value={textPart(parsed.contract_terms)}
            onChange={(event) => setCompositeValue('contract_terms', event.target.value)}
            rows={5}
            placeholder="Una condición por línea"
            className="w-full rounded-xl border border-[var(--color-line)] bg-white px-3 py-3 text-[13px] text-[var(--color-ink)] outline-none"
          />
        </label>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <label>
            <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">Aceptación obligatoria</span>
            <CrystalSelect
              value={booleanPart(parsed.contract_requires_acceptance, true) ? 'true' : 'false'}
              onChange={(nextValue) => setCompositeValue('contract_requires_acceptance', nextValue === 'true')}
            >
              <option value="true">Sí</option>
              <option value="false">No</option>
            </CrystalSelect>
          </label>
          <label>
            <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">Versión</span>
            <input
              value={textPart(parsed.contract_version)}
              onChange={(event) => setCompositeValue('contract_version', event.target.value)}
              placeholder="reservation-terms-v1"
              className={inputClass}
            />
          </label>
        </div>
      </section>
      <section className="rounded-2xl border border-[var(--color-line)] bg-[rgba(247,242,234,0.72)] p-4 shadow-[0_18px_40px_rgba(37,47,55,0.05)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-gold)]">Menú de reservación</span>
            <p className="mt-1 text-[13px] leading-5 text-[var(--color-muted)]">
              Úsalo para picnic, cenas o experiencias con alimento. En la app se muestra como listado cristal.
            </p>
          </div>
          <span className="rounded-lg border border-[rgba(37,47,55,0.14)] bg-[rgba(37,47,55,0.06)] px-3 py-1 text-[12px] font-semibold text-[#252F37]">
            Editable
          </span>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <label>
            <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">Activo</span>
            <CrystalSelect value={booleanPart(parsed.menu_enabled, false) ? 'true' : 'false'} onChange={(nextValue) => setCompositeValue('menu_enabled', nextValue === 'true')}>
              <option value="true">Sí</option>
              <option value="false">No</option>
            </CrystalSelect>
          </label>
          <label>
            <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">Obligatorio</span>
            <CrystalSelect value={booleanPart(parsed.menu_required, true) ? 'true' : 'false'} onChange={(nextValue) => setCompositeValue('menu_required', nextValue === 'true')}>
              <option value="true">Sí</option>
              <option value="false">No</option>
            </CrystalSelect>
          </label>
          <label>
            <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">Cobro</span>
            <CrystalSelect value={textPart(parsed.menu_price_mode) || 'per_person'} onChange={(nextValue) => setCompositeValue('menu_price_mode', nextValue)}>
              <option value="per_person">Por persona</option>
              <option value="flat">Fijo</option>
            </CrystalSelect>
          </label>
          <label>
            <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">Etiqueta</span>
            <input value={textPart(parsed.menu_label)} onChange={(event) => setCompositeValue('menu_label', event.target.value)} placeholder="Menú" className={inputClass} />
          </label>
        </div>
        <label className="mt-3 block">
          <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">Opciones</span>
          <textarea
            value={textPart(parsed.menu_options_text)}
            onChange={(event) => setCompositeValue('menu_options_text', event.target.value)}
            rows={7}
            placeholder="Categoría | Platillo | Precio | Descripción"
            className="w-full rounded-xl border border-[var(--color-line)] bg-white px-3 py-3 text-[13px] text-[var(--color-ink)] outline-none"
          />
        </label>
      </section>
      <section className="rounded-2xl border border-[var(--color-line)] bg-white/75 p-4 shadow-[0_18px_40px_rgba(91,11,31,0.06)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-gold)]">Constructor de variables</span>
            <p className="mt-1 text-[13px] text-[var(--color-muted)]">
              Define edades, distancias, categorías o variables nuevas. El cobro final se configura en tipos de boleto.
            </p>
          </div>
          <span className="rounded-lg border border-[rgba(104,17,38,0.18)] bg-[rgba(104,17,38,0.06)] px-3 py-1 text-[12px] font-semibold text-[var(--color-burgundy)]">
            {validVariables} activas
          </span>
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto]">
          <label>
            <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">Plantilla</span>
            <CrystalSelect value={selectedTemplateLabel} onChange={setSelectedTemplateLabel}>
              {eventVariableTemplates.map((template) => (
                <option key={template.label} value={template.label}>
                  {template.label}
                </option>
              ))}
            </CrystalSelect>
          </label>
          <button
            type="button"
            onClick={() => selectedTemplate && applyTemplate(selectedTemplate)}
            className="mt-0 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[rgba(104,17,38,0.24)] bg-white px-4 text-[13px] font-semibold text-[var(--color-burgundy)] transition hover:bg-[rgba(104,17,38,0.06)] lg:mt-[1.35rem]"
          >
            <Plus size={15} /> Agregar plantilla
          </button>
          <button
            type="button"
            onClick={() => setVariables([...variables, emptyEventVariable()])}
            className="mt-0 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--color-burgundy)] px-4 text-[13px] font-semibold text-white shadow-[0_12px_26px_rgba(104,17,38,0.22)] transition hover:brightness-105 lg:mt-[1.35rem]"
          >
            <Plus size={15} /> Variable personalizada
          </button>
        </div>
        {variables.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-[var(--color-line)] bg-[rgba(232,216,200,0.32)] p-4 text-[13px] text-[var(--color-muted)]">
            Aún no hay variables configuradas para este evento.
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {variables.map((variable, variableIndex) => (
              <article key={variable.id} className="rounded-2xl border border-[var(--color-line)] bg-[rgba(247,242,234,0.72)] p-3">
                <div className="grid gap-3 lg:grid-cols-[1.2fr_0.9fr_0.9fr_0.7fr_auto]">
                  <label>
                    <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">Nombre</span>
                    <input
                      value={variable.name}
                      onChange={(event) => updateVariableField(variableIndex, 'name', event.target.value)}
                      placeholder="Distancia, edad, raza"
                      className={inputClass}
                    />
                  </label>
                  <label>
                    <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">Clave</span>
                    <input
                      value={variable.key}
                      onChange={(event) => updateVariableField(variableIndex, 'key', slugKey(event.target.value))}
                      placeholder="distancia"
                      className={inputClass}
                    />
                  </label>
                  <label>
                    <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">Categoría</span>
                    <CrystalSelect value={variable.category} onChange={(nextValue) => updateVariableField(variableIndex, 'category', nextValue)}>
                      {eventVariableCategories.map((category) => (
                        <option key={category.value} value={category.value}>
                          {category.label}
                        </option>
                      ))}
                    </CrystalSelect>
                  </label>
                  <label>
                    <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">Obligatoria</span>
                    <CrystalSelect
                      value={variable.required ? 'true' : 'false'}
                      onChange={(nextValue) => updateVariableField(variableIndex, 'required', nextValue === 'true')}
                    >
                      <option value="true">Sí</option>
                      <option value="false">No</option>
                    </CrystalSelect>
                  </label>
                  <button
                    type="button"
                    onClick={() => removeVariable(variableIndex)}
                    className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl border border-[rgba(91,11,31,0.28)] bg-white px-3 text-[var(--color-burgundy)] transition hover:bg-[rgba(91,11,31,0.08)]"
                    aria-label="Eliminar variable"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-gold)]">Opciones</span>
                    <button
                      type="button"
                      onClick={() => updateVariable(variableIndex, { ...variable, options: [...variable.options, emptyEventVariableOption()] })}
                      className="inline-flex min-h-9 items-center gap-2 rounded-xl border border-[var(--color-line)] bg-white px-3 text-[12px] font-semibold text-[var(--color-burgundy)]"
                    >
                      <Plus size={14} /> Agregar opción
                    </button>
                  </div>
                  {variable.options.map((option, optionIndex) => (
                    <div key={option.id} className="grid gap-2 rounded-xl bg-white p-2 md:grid-cols-[1.2fr_0.7fr_0.7fr_0.8fr_auto]">
                      <input
                        value={option.label}
                        onChange={(event) => updateOptionField(variableIndex, optionIndex, 'label', event.target.value)}
                        placeholder="Adulto, niño, 3K"
                        className={inputClass}
                      />
                      <input
                        type="number"
                        step="any"
                        value={option.price}
                        onChange={(event) => updateOptionField(variableIndex, optionIndex, 'price', event.target.value)}
                        placeholder="Precio ref."
                        className={inputClass}
                      />
                      <input
                        type="number"
                        value={option.capacity}
                        onChange={(event) => updateOptionField(variableIndex, optionIndex, 'capacity', event.target.value)}
                        placeholder="Cupo"
                        className={inputClass}
                      />
                      <input
                        value={option.code}
                        onChange={(event) => updateOptionField(variableIndex, optionIndex, 'code', event.target.value.toUpperCase())}
                        placeholder="Código"
                        className={inputClass}
                      />
                      <button
                        type="button"
                        onClick={() => removeOption(variableIndex, optionIndex)}
                        className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[rgba(91,11,31,0.2)] text-[var(--color-burgundy)]"
                        aria-label="Eliminar opción"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
      <details className="rounded-xl border border-[var(--color-line)] bg-white p-3">
        <summary className="cursor-pointer text-[13px] font-semibold text-[var(--color-burgundy)]">Opciones avanzadas</summary>
        <textarea
          value={textPart(parsed.advancedJson)}
          onChange={(event) => setCompositeValue('advancedJson', event.target.value)}
          rows={4}
          placeholder="JSON adicional de metadata"
          className="mt-3 w-full rounded-xl border border-[var(--color-line)] bg-white px-3 py-3 text-[13px] text-[var(--color-ink)] outline-none"
        />
      </details>
    </div>
  )
}

function CampaignAudienceField({
  value,
  error,
  onChange,
}: {
  value: string
  error?: string
  onChange: (value: string) => void
}) {
  const parsed = parseCompositeValue(value)
  return (
    <div className="space-y-3">
      <input
        value={textPart(parsed.segment)}
        onChange={(event) => onChange(updateCompositeValue(value, 'segment', event.target.value))}
        placeholder="Segmento objetivo"
        className={`min-h-11 w-full rounded-xl border bg-white px-3 text-[13px] text-[var(--color-ink)] outline-none ${
          error ? 'border-[rgba(157,71,63,0.65)]' : 'border-[var(--color-line)]'
        }`}
      />
      <textarea
        value={textPart(parsed.notes)}
        onChange={(event) => onChange(updateCompositeValue(value, 'notes', event.target.value))}
        rows={3}
        placeholder="Notas de audiencia"
        className="w-full rounded-xl border border-[var(--color-line)] bg-white px-3 py-3 text-[13px] text-[var(--color-ink)] outline-none"
      />
      <details className="rounded-xl border border-[var(--color-line)] bg-white p-3">
        <summary className="cursor-pointer text-[13px] font-semibold text-[var(--color-burgundy)]">Opciones avanzadas</summary>
        <textarea
          value={textPart(parsed.advancedJson)}
          onChange={(event) => onChange(updateCompositeValue(value, 'advancedJson', event.target.value))}
          rows={4}
          placeholder="Segmento, reglas o notas adicionales"
          className="mt-3 w-full rounded-xl border border-[var(--color-line)] bg-white px-3 py-3 text-[13px] text-[var(--color-ink)] outline-none"
        />
      </details>
    </div>
  )
}

function CampaignContentField({
  value,
  error,
  onChange,
}: {
  value: string
  error?: string
  onChange: (value: string) => void
}) {
  const parsed = parseCompositeValue(value)
  return (
    <div className="space-y-3">
      <input
        value={textPart(parsed.subject)}
        onChange={(event) => onChange(updateCompositeValue(value, 'subject', event.target.value))}
        placeholder="Asunto o título"
        className={`min-h-11 w-full rounded-xl border bg-white px-3 text-[13px] text-[var(--color-ink)] outline-none ${
          error ? 'border-[rgba(157,71,63,0.65)]' : 'border-[var(--color-line)]'
        }`}
      />
      <textarea
        value={textPart(parsed.body)}
        onChange={(event) => onChange(updateCompositeValue(value, 'body', event.target.value))}
        rows={4}
        placeholder="Mensaje principal"
        className="w-full rounded-xl border border-[var(--color-line)] bg-white px-3 py-3 text-[13px] text-[var(--color-ink)] outline-none"
      />
      <div className="grid gap-3 md:grid-cols-2">
        <input
          value={textPart(parsed.cta_label)}
          onChange={(event) => onChange(updateCompositeValue(value, 'cta_label', event.target.value))}
          placeholder="Texto del botón"
          className="min-h-11 rounded-xl border border-[var(--color-line)] bg-white px-3 text-[13px] text-[var(--color-ink)] outline-none"
        />
        <input
          value={textPart(parsed.cta_url)}
          onChange={(event) => onChange(updateCompositeValue(value, 'cta_url', event.target.value))}
          placeholder="Enlace del botón"
          className="min-h-11 rounded-xl border border-[var(--color-line)] bg-white px-3 text-[13px] text-[var(--color-ink)] outline-none"
        />
      </div>
      <input
        value={textPart(parsed.image_url)}
        onChange={(event) => onChange(updateCompositeValue(value, 'image_url', event.target.value))}
        placeholder="Enlace de imagen publicada"
        className="min-h-11 w-full rounded-xl border border-[var(--color-line)] bg-white px-3 text-[13px] text-[var(--color-ink)] outline-none"
      />
      <details className="rounded-xl border border-[var(--color-line)] bg-white p-3">
        <summary className="cursor-pointer text-[13px] font-semibold text-[var(--color-burgundy)]">Opciones avanzadas</summary>
        <textarea
          value={textPart(parsed.advancedJson)}
          onChange={(event) => onChange(updateCompositeValue(value, 'advancedJson', event.target.value))}
          rows={4}
          placeholder="Asunto, mensaje o llamado a la acción adicional"
          className="mt-3 w-full rounded-xl border border-[var(--color-line)] bg-white px-3 py-3 text-[13px] text-[var(--color-ink)] outline-none"
        />
      </details>
    </div>
  )
}

function FormField({
  field,
  value,
  error,
  onChange,
  entity,
  recordId,
}: {
  field: EditorialField
  value: string
  error?: string
  onChange: (value: string) => void
  entity: EditorialDefinition['entity']
  recordId?: string
}) {
  const isCoverImage = field.key === 'cover_image_url' && ['wines', 'experiences', 'events', 'grand-events', 'promotions'].includes(entity)
  const storageBucket = entity === 'grand-events' ? 'events' : entity
  const isWideField = field.type === 'textarea' ||
    field.type === 'benefits' ||
    field.type === 'eventMetadata' ||
    field.type === 'campaignAudience' ||
    field.type === 'campaignContent'

  return (
    <label className={isWideField ? 'space-y-2 md:col-span-2' : 'space-y-2'}>
      <span className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[var(--color-muted)]">
        {field.label}
        {field.required || field.publishRequired ? ' *' : ''}
      </span>
      {isCoverImage ? (
        <ControlStorageUpload
          bucket={storageBucket}
          pathPrefix={`${storageBucket}/${recordId ?? 'draft'}`}
          value={value}
          onChange={onChange}
          label="imagen"
          accept="image/jpeg,image/png,image/webp,image/avif"
          maxSizeMb={10}
          publicFile
          image
        />
      ) : field.type === 'benefits' ? (
        <BenefitsField value={value} error={error} onChange={onChange} />
      ) : field.type === 'eventMetadata' ? (
        <EventMetadataField value={value} error={error} onChange={onChange} />
      ) : field.type === 'campaignAudience' ? (
        <CampaignAudienceField value={value} error={error} onChange={onChange} />
      ) : field.type === 'campaignContent' ? (
        <CampaignContentField value={value} error={error} onChange={onChange} />
      ) : (
        <StandardField field={field} value={value} error={error} onChange={onChange} />
      )}
      <FieldHelp field={field} error={error} />
    </label>
  )
}

export function EditorialFormShell({
  definition,
  record,
  form,
  fieldErrors,
  recordVersion,
  updatedAtLabel,
  selectedTitle,
  saving,
  isBusy,
  success,
  isPublishedRecord = false,
  onSubmit,
  onStepSave,
  onChange,
  onPreview,
  onVersions,
  actions,
  versions,
}: EditorialFormShellProps) {
  const reviewStepIndex = definition.sections.length
  const [activeStepIndex, setActiveStepIndex] = useState(0)
  const [stepNotice, setStepNotice] = useState<string | null>(null)
  const [savingStep, setSavingStep] = useState(false)
  const visibility = visibilityCopy(definition, form)
  const saveLabel = record ? (isPublishedRecord ? 'Guardar cambios' : 'Guardar borrador') : 'Crear registro'
  const saveHelp =
    definition.entity === 'campaigns'
      ? 'Guardar conserva audiencia y contenido. El envío se realiza desde la operación de campaña.'
      : isPublishedRecord
        ? 'Guardar actualiza esta publicación sin retirarla de la app. Para ocultarla usa Despublicar.'
        : 'Guardar borrador no publica el contenido. Publicar lo hace visible cuando cumple los campos mínimos.'
  const sectionProgress = useMemo(
    () => definition.sections.map((section) => completionForSection(section, form, fieldErrors)),
    [definition.sections, fieldErrors, form],
  )
  const completedSections = sectionProgress.filter((section) => section.done).length
  const progressPercent = definition.sections.length > 0
    ? Math.round((completedSections / definition.sections.length) * 100)
    : 100
  const activeSection = activeStepIndex < reviewStepIndex ? definition.sections[activeStepIndex] : null
  const activeProgress = activeSection ? sectionProgress[activeStepIndex] : null
  const stepList = [
    ...definition.sections.map((section, index) => ({
      key: `section-${index}`,
      title: section.title,
      description: section.description,
      index,
      review: false,
    })),
    {
      key: 'review',
      title: 'Vista previa y publicación',
      description: 'Revisa, autoriza y publica desde el cierre.',
      index: reviewStepIndex,
      review: true,
    },
  ]
  const totalSteps = reviewStepIndex + 1
  const previewTitle = firstTextValue(
    form,
    ['title', 'name', 'subject', 'code', 'campaign_content'],
    selectedTitle || definition.title,
  )
  const previewDescription = firstTextValue(
    form,
    ['short_description', 'description', 'summary', 'body', 'notes', 'campaign_content'],
    definition.publicSummary,
  )
  const previewImage = previewImageValue(form)
  const previewPrice = previewPriceValue(form)
  const allMissingFields = definition.sections.flatMap((section) =>
    missingFieldsForSection(section, form, fieldErrors).map((label) => `${section.title}: ${label}`),
  )
  const reviewReady = allMissingFields.length === 0

  useEffect(() => {
    setActiveStepIndex(0)
    setStepNotice(null)
  }, [definition.entity, record?.id])

  const blockingStepBefore = (targetIndex: number) => {
    const sectionsToValidate = Math.min(targetIndex, definition.sections.length)
    for (let index = 0; index < sectionsToValidate; index += 1) {
      const missing = missingFieldsForSection(definition.sections[index], form, fieldErrors)
      if (missing.length > 0) return { index, missing }
    }
    return null
  }

  const requestStep = async (targetIndex: number) => {
    const nextIndex = Math.max(0, Math.min(targetIndex, reviewStepIndex))
    if (nextIndex <= activeStepIndex) {
      setActiveStepIndex(nextIndex)
      setStepNotice(null)
      return
    }

    const blocked = blockingStepBefore(nextIndex)
    if (blocked) {
      setActiveStepIndex(blocked.index)
      setStepNotice(`Completa ${blocked.missing.slice(0, 3).join(', ')} para avanzar.`)
      return
    }

    if (nextIndex > activeStepIndex && onStepSave) {
      setSavingStep(true)
      const saved = await onStepSave()
      setSavingStep(false)
      if (!saved) {
        setStepNotice('Revisa los campos marcados antes de continuar.')
        return
      }
    }

    setActiveStepIndex(nextIndex)
    setStepNotice(null)
  }

  return (
    <form onSubmit={onSubmit} className="control-editorial-studio space-y-5">
      <section className="overflow-hidden rounded-[1.5rem] border border-[rgba(180,138,85,0.36)] bg-[linear-gradient(135deg,rgba(247,242,234,0.98),rgba(232,216,200,0.42))] p-5 shadow-[0_22px_60px_rgba(37,47,55,0.08)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.22em] text-[#B48A55]">
              <FileText size={15} strokeWidth={1.7} />
              Estudio editorial
            </p>
            <h2 className="mt-3 max-w-[900px] text-3xl font-semibold leading-tight text-[#252F37] md:text-4xl" style={{ fontFamily: 'var(--font-display)' }}>
              {selectedTitle}
            </h2>
            <p className="mt-2 max-w-[760px] text-[15px] leading-6 text-[var(--color-muted)]">{definition.microcopy}</p>
            {recordVersion ? (
              <p className="mt-2 text-[13px] text-[var(--color-muted)]">Versión {recordVersion} · {updatedAtLabel}</p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            {recordVersion ? (
              <>
                <button
                  type="button"
                  onClick={onPreview}
                  disabled={isBusy}
                  title="Ver vista previa"
                  aria-label="Ver vista previa"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[rgba(180,138,85,0.32)] bg-white/88 text-[#252F37] shadow-[0_12px_30px_rgba(37,47,55,0.06)] transition hover:border-[#681126] hover:text-[#681126] disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <Eye size={17} />
                </button>
                <button
                  type="button"
                  onClick={onVersions}
                  disabled={isBusy}
                  title="Ver versiones"
                  aria-label="Ver versiones"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[rgba(180,138,85,0.32)] bg-white/88 text-[#252F37] shadow-[0_12px_30px_rgba(37,47,55,0.06)] transition hover:border-[#681126] hover:text-[#681126] disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <History size={17} />
                </button>
              </>
            ) : null}
            <button
              type="submit"
              disabled={isBusy}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-[#681126] px-5 text-[14px] font-semibold text-white shadow-[0_16px_34px_rgba(104,17,38,0.22)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-55"
            >
              {saving ? <Loader2 className="animate-spin" size={17} /> : <Save size={17} />}
              {saveLabel}
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-white/80 bg-white/72 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.86)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#B48A55]">Estado</p>
            <p className="mt-2 text-lg font-semibold text-[#252F37]">{statusLabel(definition, form.status)}</p>
          </div>
          <div className="rounded-2xl border border-white/80 bg-white/72 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.86)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#B48A55]">Visibilidad</p>
            <p className="mt-2 text-lg font-semibold text-[#681126]">{visibility}</p>
          </div>
          <div className="rounded-2xl border border-white/80 bg-white/72 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.86)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#B48A55]">Avance</p>
            <p className="mt-2 text-lg font-semibold text-[#252F37]">{completedSections}/{definition.sections.length} bloques</p>
          </div>
        </div>
      </section>

      {success ? (
        <div className="flex items-center gap-3 rounded-2xl border border-[rgba(37,47,55,0.2)] bg-[rgba(37,47,55,0.06)] px-4 py-3 text-[13px] font-semibold text-[#252F37]">
          <CheckCircle2 size={17} />
          {success}
        </div>
      ) : null}

      {stepNotice ? (
        <div className="flex items-start gap-3 rounded-2xl border border-[rgba(180,138,85,0.42)] bg-[rgba(180,138,85,0.12)] px-4 py-3 text-[13px] font-semibold text-[#681126]">
          <AlertCircle className="mt-0.5 shrink-0" size={17} />
          <span>{stepNotice}</span>
        </div>
      ) : null}

      <div className="control-editorial-builder grid gap-5">
        <aside className="rounded-[1.5rem] border border-[rgba(180,138,85,0.34)] bg-white/76 p-4 shadow-[0_18px_46px_rgba(37,47,55,0.07)] backdrop-blur">
          <div className="border-b border-[rgba(232,216,200,0.88)] pb-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#B48A55]">Mapa de edición</p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#E8D8C8]/72">
              <div
                className="h-full rounded-full bg-[linear-gradient(90deg,#681126_0%,#B48A55_58%,#252F37_100%)] transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="mt-2 text-[12px] text-[var(--color-muted)]">{progressPercent}% listo para revisión.</p>
          </div>

          <div className="mt-4 space-y-2">
            {stepList.map((step) => {
              const progress = step.review ? null : sectionProgress[step.index]
              const isActive = activeStepIndex === step.index
              const isComplete = step.review ? reviewReady : Boolean(progress?.done)
              const isLocked = step.index > 0 && Boolean(blockingStepBefore(step.index))
              const titleStyle = isActive || isComplete
                ? {
                    backgroundImage: 'linear-gradient(90deg,#681126,#B48A55,#252F37)',
                    WebkitBackgroundClip: 'text',
                    color: 'transparent',
                  }
                : undefined

              return (
                <button
                  key={step.key}
                  type="button"
                  onClick={() => void requestStep(step.index)}
                  aria-current={isActive ? 'step' : undefined}
                  className={`grid w-full grid-cols-[34px_minmax(0,1fr)] gap-3 rounded-2xl border px-3 py-3 text-left transition ${
                    isActive
                      ? 'border-[rgba(104,17,38,0.34)] bg-[#F7F2EA] shadow-[0_14px_28px_rgba(104,17,38,0.12)]'
                      : isComplete
                        ? 'border-[rgba(180,138,85,0.38)] bg-white'
                        : 'border-[rgba(232,216,200,0.9)] bg-white/64 hover:bg-[#F7F2EA]'
                  }`}
                >
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-xl border text-[12px] font-semibold ${
                      isActive || isComplete
                        ? 'border-[rgba(104,17,38,0.24)] bg-white text-[#681126]'
                        : 'border-[rgba(232,216,200,0.92)] bg-[#F7F2EA] text-[var(--color-muted)]'
                    }`}
                  >
                    {isComplete ? <CheckCircle2 size={15} /> : String(step.index + 1).padStart(2, '0')}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[13px] font-semibold leading-5 text-[#252F37]" style={titleStyle}>{step.title}</span>
                    <span className="mt-1 line-clamp-2 block text-[12px] leading-4 text-[var(--color-muted)]">
                      {isLocked ? 'Completa lo anterior para abrir.' : step.description}
                    </span>
                  </span>
                </button>
              )
            })}
          </div>

          <div className="mt-4 rounded-2xl border border-[rgba(180,138,85,0.28)] bg-[#F7F2EA]/78 p-4">
            <p className="text-[12px] font-semibold text-[#252F37]">Regla de avance</p>
            <p className="mt-1 text-[12px] leading-5 text-[var(--color-muted)]">{saveHelp}</p>
          </div>
        </aside>

        <section className="min-w-0 rounded-[1.5rem] border border-[rgba(180,138,85,0.34)] bg-white/82 p-5 shadow-[0_18px_46px_rgba(37,47,55,0.07)] backdrop-blur">
          {activeSection ? (
            <>
              <div className="flex flex-col gap-3 border-b border-[rgba(232,216,200,0.88)] pb-5 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#B48A55]">Paso {activeStepIndex + 1} de {totalSteps}</p>
                  <h3 className="mt-2 text-2xl font-semibold text-[#252F37]" style={{ fontFamily: 'var(--font-display)' }}>{activeSection.title}</h3>
                  <p className="mt-2 max-w-[780px] text-[14px] leading-6 text-[var(--color-muted)]">{activeSection.description}</p>
                </div>
                {activeProgress ? (
                  <div className="min-w-[132px] rounded-2xl border border-[rgba(180,138,85,0.28)] bg-[#F7F2EA]/78 px-4 py-3 text-right">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">Requeridos</p>
                    <p className="mt-1 text-xl font-semibold text-[#681126]">{activeProgress.complete}/{activeProgress.total}</p>
                  </div>
                ) : null}
              </div>

              <div className="control-editorial-fields mt-5 grid gap-4 md:grid-cols-2">
                {activeSection.fields.map((field) => (
                  <FormField
                    key={field.key}
                    field={field}
                    value={form[field.key] ?? ''}
                    error={fieldErrors[field.key]}
                    onChange={(value) => onChange(field.key, value)}
                    entity={definition.entity}
                    recordId={record?.id}
                  />
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="flex flex-col gap-3 border-b border-[rgba(232,216,200,0.88)] pb-5 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#B48A55]">Cierre editorial</p>
                  <h3 className="mt-2 text-2xl font-semibold text-[#252F37]" style={{ fontFamily: 'var(--font-display)' }}>Preview, autorización y publicación</h3>
                  <p className="mt-2 max-w-[780px] text-[14px] leading-6 text-[var(--color-muted)]">Confirma que la publicación esté lista antes de solicitar aprobación o lanzarla.</p>
                </div>
                {recordVersion ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={onPreview}
                      disabled={isBusy}
                      title="Ver vista previa"
                      aria-label="Ver vista previa"
                      className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[rgba(180,138,85,0.32)] bg-white text-[#252F37] transition hover:border-[#681126] hover:text-[#681126] disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      <Eye size={17} />
                    </button>
                    <button
                      type="button"
                      onClick={onVersions}
                      disabled={isBusy}
                      title="Ver versiones"
                      aria-label="Ver versiones"
                      className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[rgba(180,138,85,0.32)] bg-white text-[#252F37] transition hover:border-[#681126] hover:text-[#681126] disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      <History size={17} />
                    </button>
                  </div>
                ) : null}
              </div>

              <div className="mt-5 grid gap-3 lg:grid-cols-3">
                <div className="rounded-2xl border border-[rgba(180,138,85,0.28)] bg-[#F7F2EA]/72 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">Registro</p>
                  <p className="mt-2 text-[15px] font-semibold text-[#252F37]">{selectedTitle}</p>
                </div>
                <div className="rounded-2xl border border-[rgba(180,138,85,0.28)] bg-[#F7F2EA]/72 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">Lectura pública</p>
                  <p className="mt-2 text-[15px] font-semibold text-[#681126]">{visibility}</p>
                </div>
                <div className="rounded-2xl border border-[rgba(180,138,85,0.28)] bg-[#F7F2EA]/72 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">Estado</p>
                  <p className="mt-2 text-[15px] font-semibold text-[#252F37]">{statusLabel(definition, form.status)}</p>
                </div>
              </div>

              {reviewReady ? (
                <div className="mt-5 flex items-start gap-3 rounded-2xl border border-[rgba(37,47,55,0.2)] bg-[rgba(37,47,55,0.06)] p-4 text-[13px] text-[#252F37]">
                  <CheckCircle2 className="mt-0.5 shrink-0" size={17} />
                  <p>Los campos obligatorios están completos. Ya puedes guardar, pedir autorización o publicar según el flujo permitido.</p>
                </div>
              ) : (
                <div className="mt-5 rounded-2xl border border-[rgba(104,17,38,0.24)] bg-[rgba(104,17,38,0.06)] p-4">
                  <div className="flex items-start gap-3 text-[#681126]">
                    <AlertCircle className="mt-0.5 shrink-0" size={17} />
                    <div>
                      <p className="text-[13px] font-semibold">Faltan campos para publicar.</p>
                      <ul className="mt-2 space-y-1 text-[12px] text-[var(--color-muted)]">
                        {allMissingFields.slice(0, 8).map((label) => <li key={label}>{label}</li>)}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-5 rounded-2xl border border-[rgba(180,138,85,0.28)] bg-white p-4">
                <p className="text-[13px] font-semibold text-[#252F37]">{definition.entity === 'campaigns' ? 'Operación de campaña' : 'Contenido visible para cliente'}</p>
                <p className="mt-2 text-[13px] leading-6 text-[var(--color-muted)]">{definition.publicSummary}</p>
              </div>

              <div className="mt-5 space-y-4">
                {actions}
                {versions}
              </div>
            </>
          )}

          <div className="mt-6 flex flex-col gap-3 border-t border-[rgba(232,216,200,0.88)] pt-5">
            <p className="max-w-none text-[12px] leading-5 text-[var(--color-muted)]">
              {activeStepIndex === reviewStepIndex
                ? 'Último paso: revisa y confirma la publicación.'
                : 'Al avanzar se guarda el progreso y se validan los campos de este bloque.'}
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
              <button
                type="button"
                onClick={() => void requestStep(activeStepIndex - 1)}
                disabled={activeStepIndex === 0 || isBusy || savingStep}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-[rgba(180,138,85,0.34)] bg-white px-4 text-[13px] font-semibold text-[#252F37] disabled:cursor-not-allowed disabled:opacity-45"
              >
                <ChevronLeft size={16} />
                Anterior
              </button>
              {activeStepIndex < reviewStepIndex ? (
                <button
                  type="button"
                  onClick={() => void requestStep(activeStepIndex + 1)}
                  disabled={isBusy || savingStep}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-[#681126] px-5 text-[13px] font-semibold text-white shadow-[0_14px_30px_rgba(104,17,38,0.2)] disabled:cursor-not-allowed disabled:opacity-55"
                >
                  {savingStep ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                  {activeStepIndex === reviewStepIndex - 1 ? 'Guardar y revisar' : 'Guardar y continuar'}
                  <ChevronRight size={16} />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isBusy}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-[#252F37] px-5 text-[13px] font-semibold text-white shadow-[0_14px_30px_rgba(37,47,55,0.18)] disabled:cursor-not-allowed disabled:opacity-55"
                >
                  {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                  {saveLabel}
                </button>
              )}
            </div>
          </div>
        </section>

        <aside className="min-w-0">
          <div className="sticky top-4 rounded-[1.5rem] border border-[rgba(180,138,85,0.34)] bg-white/78 p-4 shadow-[0_18px_46px_rgba(37,47,55,0.07)] backdrop-blur">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#B48A55]">Vista previa</p>
                <p className="mt-1 text-sm font-semibold text-[#252F37]">Como lo verá el cliente</p>
              </div>
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[rgba(180,138,85,0.32)] bg-[#F7F2EA] text-[#681126]">
                <PanelRight size={17} />
              </span>
            </div>

            <div className="mt-4 rounded-[2rem] border border-[#252F37]/14 bg-[#252F37] p-3 shadow-[0_18px_42px_rgba(37,47,55,0.18)]">
              <div className="overflow-hidden rounded-[1.55rem] bg-[#F7F2EA]">
                <div className="h-7 bg-white/86" />
                <div className="p-3">
                  <div className="relative min-h-[178px] overflow-hidden rounded-[1.25rem] bg-[#E8D8C8]">
                    {previewImage ? (
                      <img src={previewImage} alt="" className="h-[178px] w-full object-cover" />
                    ) : (
                      <div className="flex h-[178px] items-center justify-center px-6 text-center text-[12px] font-semibold uppercase tracking-[0.18em] text-[#681126]">
                        Imagen pendiente
                      </div>
                    )}
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(37,47,55,0.02),rgba(37,47,55,0.68))]" />
                    <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#E8D8C8]">{definition.singularLabel}</p>
                      <p className="mt-1 text-2xl leading-7" style={{ fontFamily: 'var(--font-display)' }}>{shorten(previewTitle, 58)}</p>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full bg-[#E8D8C8] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#681126]">{statusLabel(definition, form.status)}</span>
                    {previewPrice ? <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-[#252F37]">${previewPrice}</span> : null}
                  </div>

                  <p className="mt-3 text-[13px] leading-6 text-[var(--color-muted)]">{shorten(previewDescription, 190)}</p>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <div className="rounded-2xl border border-[rgba(180,138,85,0.28)] bg-white p-3">
                      <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--color-muted)]">Estado</p>
                      <p className="mt-1 text-[12px] font-semibold text-[#252F37]">{statusLabel(definition, form.status)}</p>
                    </div>
                    <div className="rounded-2xl border border-[rgba(180,138,85,0.28)] bg-white p-3">
                      <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--color-muted)]">Paso</p>
                      <p className="mt-1 text-[12px] font-semibold text-[#681126]">{Math.min(activeStepIndex + 1, totalSteps)}/{totalSteps}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              {sectionProgress.map((section, index) => (
                <div key={`${definition.sections[index].title}-${index}`} className="flex items-center justify-between gap-3 rounded-2xl border border-[rgba(232,216,200,0.9)] bg-white/72 px-3 py-2">
                  <span className="min-w-0 text-[12px] font-semibold text-[#252F37]">{definition.sections[index].title}</span>
                  <span className={`shrink-0 text-[12px] font-semibold ${section.done ? 'text-[#252F37]' : 'text-[#681126]'}`}>{section.complete}/{section.total}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </form>
  )
}
