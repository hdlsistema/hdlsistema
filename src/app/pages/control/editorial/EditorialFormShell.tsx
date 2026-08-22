import { BookOpenCheck, Eye, History, Loader2, Plus, Save, Trash2, Workflow } from 'lucide-react'
import type { FormEvent, ReactNode } from 'react'
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
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
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
  const parsed = parseCompositeValue(value)
  const variables = normalizeEventVariables(parsed.variant_schema)
  const validVariables = sanitizeEventVariables(variables).length
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
            <option value="restaurant_center">Restaurante Centro</option>
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
      <section className="rounded-2xl border border-[var(--color-line)] bg-white/75 p-4 shadow-[0_18px_40px_rgba(104,17,38,0.06)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-gold)]">Constructor de variables</span>
            <p className="mt-1 text-[13px] text-[var(--color-muted)]">
              Define edades, distancias, categorías o variables nuevas. El cobro final se configura en tipos de boleto.
            </p>
          </div>
          <span className="rounded-full bg-[rgba(104,17,38,0.08)] px-3 py-1 text-[12px] font-semibold text-[var(--color-burgundy)]">
            {validVariables} activas
          </span>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {eventVariableTemplates.map((template) => (
            <button
              key={template.label}
              type="button"
              onClick={() => applyTemplate(template)}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--color-line)] bg-white px-3 text-[13px] font-semibold text-[var(--color-burgundy)] transition hover:border-[var(--color-burgundy)]"
            >
              <Plus size={15} /> {template.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setVariables([...variables, emptyEventVariable()])}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[var(--color-burgundy)] px-3 text-[13px] font-semibold text-white shadow-[0_12px_26px_rgba(104,17,38,0.2)] transition hover:brightness-105"
          >
            <Plus size={15} /> Variable libre
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
                    className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl border border-[rgba(104,17,38,0.28)] bg-white px-3 text-[var(--color-burgundy)] transition hover:bg-[rgba(104,17,38,0.08)]"
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
                        className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[rgba(104,17,38,0.2)] text-[var(--color-burgundy)]"
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
  onSubmit,
  onChange,
  onPreview,
  onVersions,
  actions,
  versions,
}: EditorialFormShellProps) {
  const visibility = visibilityCopy(definition, form)

  return (
    <form
      onSubmit={onSubmit}
      className="control-editorial-form space-y-5 rounded-[1rem] border border-[var(--color-line)] bg-[var(--color-panel)] p-5 shadow-[var(--shadow-card)]"
    >
      <div className="flex flex-col gap-3 border-b border-[var(--color-line)] pb-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[var(--color-muted)]">
            Formulario especializado
          </p>
          <h2 className="mt-1 truncate text-xl font-semibold text-[var(--color-ink)]">{selectedTitle}</h2>
          {recordVersion ? (
            <p className="mt-1 text-[13px] text-[var(--color-muted)]">
              Versión {recordVersion} · {updatedAtLabel}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          {recordVersion ? (
            <>
              <button
                type="button"
                onClick={onPreview}
                disabled={isBusy}
                title="Ver vista previa"
                aria-label="Ver vista previa"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--color-line)] bg-white text-[var(--color-muted)] transition hover:text-[var(--color-burgundy)] disabled:cursor-not-allowed disabled:opacity-45"
              >
                <Eye size={16} />
              </button>
              <button
                type="button"
                onClick={onVersions}
                disabled={isBusy}
                title="Ver versiones"
                aria-label="Ver versiones"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--color-line)] bg-white text-[var(--color-muted)] transition hover:text-[var(--color-burgundy)] disabled:cursor-not-allowed disabled:opacity-45"
              >
                <History size={16} />
              </button>
            </>
          ) : null}
          <button
            type="submit"
            disabled={isBusy}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-[var(--color-burgundy)] px-3 text-[13px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-55"
          >
            {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
            Guardar borrador
          </button>
        </div>
      </div>

      <div className="grid gap-3 rounded-xl border border-[var(--color-line)] bg-white p-4 md:grid-cols-[minmax(0,1fr)_220px]">
        <div>
          <p className="text-[13px] font-semibold text-[var(--color-ink)]">{definition.microcopy}</p>
          <p className="mt-1 text-[13px] text-[var(--color-muted)]">
	            {definition.entity === 'campaigns'
              ? 'Guardar conserva audiencia y contenido. El envío se realiza desde la operación de campaña.'
              : 'Guardar borrador no publica el contenido. Publicar lo hace visible cuando cumple los campos mínimos.'}
          </p>
        </div>
        <div className="rounded-xl border border-[var(--color-line)] bg-[var(--color-soft)] p-3">
          <p className="text-[13px] font-semibold text-[var(--color-ink)]">Visibilidad</p>
          <p className="mt-1 text-[13px] text-[var(--color-muted)]">{visibility}</p>
          <p className="mt-1 text-[13px] text-[var(--color-muted)]">
            Estado: {statusLabel(definition, form.status)}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-[var(--color-line)] bg-white p-4">
        <div className="flex items-start gap-3">
          {definition.entity === 'campaigns' ? <Workflow size={18} strokeWidth={1.7} className="mt-0.5 text-[var(--color-gold)]" /> : <BookOpenCheck size={18} strokeWidth={1.7} className="mt-0.5 text-[var(--color-gold)]" />}
          <div>
	            <p className="text-[13px] font-semibold text-[var(--color-ink)]">
                {definition.entity === 'campaigns' ? 'Cómo se opera' : 'Qué verá el cliente'}
              </p>
            <p className="mt-1 text-[13px] text-[var(--color-muted)]">{definition.publicSummary}</p>
          </div>
        </div>
      </div>

      {success ? (
        <div className="rounded-xl border border-[rgba(37,47,55,0.24)] bg-[rgba(37,47,55,0.08)] px-4 py-3 text-[13px] text-[var(--color-positive)]">
          {success}
        </div>
      ) : null}

      <div className="control-editorial-sections">
      {definition.sections.map((section, index) => (
        <details
          key={section.title}
          className="control-editorial-section border-t border-[var(--color-line)] py-3"
          open={definition.entity !== 'campaigns' || index === 0}
        >
          <summary className="cursor-pointer list-none pr-6">
            <h3 className="text-base font-semibold text-[var(--color-ink)]">{section.title}</h3>
            <p className="mt-1 text-[13px] text-[var(--color-muted)]">{section.description}</p>
          </summary>
          <div className="control-editorial-fields mt-3 grid gap-4 md:grid-cols-2">
            {section.fields.map((field) => (
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
        </details>
      ))}
      </div>

      {actions}
      {versions}
    </form>
  )
}
