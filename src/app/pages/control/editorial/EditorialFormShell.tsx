import { BookOpenCheck, Eye, History, Loader2, Save, Workflow } from 'lucide-react'
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
    return JSON.parse(value) as Record<string, string>
  } catch {
    return {}
  }
}

function updateCompositeValue(
  value: string | undefined,
  key: string,
  nextValue: string,
) {
  return JSON.stringify({ ...parseCompositeValue(value), [key]: nextValue })
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
  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2">
        <label>
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">Tipo de evento</span>
          <CrystalSelect value={parsed.event_kind ?? ''} onChange={(nextValue) => onChange(updateCompositeValue(value, 'event_kind', nextValue))}>
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
          <CrystalSelect value={parsed.location_kind ?? 'estate'} onChange={(nextValue) => onChange(updateCompositeValue(value, 'location_kind', nextValue))}>
            <option value="estate">Hacienda principal</option>
            <option value="restaurant_estate">Restaurante Hacienda</option>
            <option value="restaurant_center">Restaurante Centro</option>
            <option value="cabins">Cabañas</option>
            <option value="boutique">Boutique</option>
          </CrystalSelect>
        </label>
      </div>
      <input
        value={parsed.reservation_phone ?? ''}
        onChange={(event) => onChange(updateCompositeValue(value, 'reservation_phone', event.target.value))}
        placeholder="Teléfono de reservación"
        className={`min-h-11 w-full rounded-xl border bg-white px-3 text-[13px] text-[var(--color-ink)] outline-none ${
          error ? 'border-[rgba(157,71,63,0.65)]' : 'border-[var(--color-line)]'
        }`}
      />
      <label className="block">
        <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">Variables del evento</span>
        <textarea
          value={parsed.variant_schema_text ?? ''}
          onChange={(event) => onChange(updateCompositeValue(value, 'variant_schema_text', event.target.value))}
          rows={4}
          placeholder={'Distancia: 3K, 5K, 8K\nTipo de asistente: Adulto, Niño'}
          className="w-full rounded-xl border border-[var(--color-line)] bg-white px-3 py-3 text-[13px] text-[var(--color-ink)] outline-none"
        />
        <p className="mt-1 text-[12px] leading-5 text-[var(--color-muted)]">
          Usa una línea por variable. Cada opción puede convertirse en tipos de boleto con precio y cupo propios.
        </p>
      </label>
      <details className="rounded-xl border border-[var(--color-line)] bg-white p-3">
        <summary className="cursor-pointer text-[13px] font-semibold text-[var(--color-burgundy)]">Opciones avanzadas</summary>
        <textarea
          value={parsed.advancedJson ?? ''}
          onChange={(event) => onChange(updateCompositeValue(value, 'advancedJson', event.target.value))}
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
        value={parsed.segment ?? ''}
        onChange={(event) => onChange(updateCompositeValue(value, 'segment', event.target.value))}
        placeholder="Segmento objetivo"
        className={`min-h-11 w-full rounded-xl border bg-white px-3 text-[13px] text-[var(--color-ink)] outline-none ${
          error ? 'border-[rgba(157,71,63,0.65)]' : 'border-[var(--color-line)]'
        }`}
      />
      <textarea
        value={parsed.notes ?? ''}
        onChange={(event) => onChange(updateCompositeValue(value, 'notes', event.target.value))}
        rows={3}
        placeholder="Notas de audiencia"
        className="w-full rounded-xl border border-[var(--color-line)] bg-white px-3 py-3 text-[13px] text-[var(--color-ink)] outline-none"
      />
      <details className="rounded-xl border border-[var(--color-line)] bg-white p-3">
        <summary className="cursor-pointer text-[13px] font-semibold text-[var(--color-burgundy)]">Opciones avanzadas</summary>
        <textarea
          value={parsed.advancedJson ?? ''}
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
        value={parsed.subject ?? ''}
        onChange={(event) => onChange(updateCompositeValue(value, 'subject', event.target.value))}
        placeholder="Asunto o título"
        className={`min-h-11 w-full rounded-xl border bg-white px-3 text-[13px] text-[var(--color-ink)] outline-none ${
          error ? 'border-[rgba(157,71,63,0.65)]' : 'border-[var(--color-line)]'
        }`}
      />
      <textarea
        value={parsed.body ?? ''}
        onChange={(event) => onChange(updateCompositeValue(value, 'body', event.target.value))}
        rows={4}
        placeholder="Mensaje principal"
        className="w-full rounded-xl border border-[var(--color-line)] bg-white px-3 py-3 text-[13px] text-[var(--color-ink)] outline-none"
      />
      <div className="grid gap-3 md:grid-cols-2">
        <input
          value={parsed.cta_label ?? ''}
          onChange={(event) => onChange(updateCompositeValue(value, 'cta_label', event.target.value))}
          placeholder="Texto del botón"
          className="min-h-11 rounded-xl border border-[var(--color-line)] bg-white px-3 text-[13px] text-[var(--color-ink)] outline-none"
        />
        <input
          value={parsed.cta_url ?? ''}
          onChange={(event) => onChange(updateCompositeValue(value, 'cta_url', event.target.value))}
          placeholder="Enlace del botón"
          className="min-h-11 rounded-xl border border-[var(--color-line)] bg-white px-3 text-[13px] text-[var(--color-ink)] outline-none"
        />
      </div>
      <input
        value={parsed.image_url ?? ''}
        onChange={(event) => onChange(updateCompositeValue(value, 'image_url', event.target.value))}
        placeholder="Enlace de imagen publicada"
        className="min-h-11 w-full rounded-xl border border-[var(--color-line)] bg-white px-3 text-[13px] text-[var(--color-ink)] outline-none"
      />
      <details className="rounded-xl border border-[var(--color-line)] bg-white p-3">
        <summary className="cursor-pointer text-[13px] font-semibold text-[var(--color-burgundy)]">Opciones avanzadas</summary>
        <textarea
          value={parsed.advancedJson ?? ''}
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
        <div className="rounded-xl border border-[rgba(61,122,77,0.25)] bg-[rgba(61,122,77,0.08)] px-4 py-3 text-[13px] text-[var(--color-positive)]">
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
