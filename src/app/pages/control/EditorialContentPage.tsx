import {
  Archive,
  CheckCircle2,
  Clock3,
  Copy,
  Eye,
  History,
  Loader2,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  Search,
  Trash2,
  XCircle,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { useAuth } from '../../../contexts/AuthContext'
import {
  adminContentClient,
  getPreviewUrl,
  type ContentEntity,
  type ContentRecord,
  type PublicationAction,
} from '../../../services/content.service'
import { SectionTitle } from '../../components/shared/SectionTitle'

type FieldType = 'text' | 'textarea' | 'number' | 'boolean' | 'datetime' | 'select'

type FieldConfig = {
  key: string
  label: string
  type: FieldType
  required?: boolean
  options?: Array<{ value: string; label: string }>
  nullable?: boolean
}

type EntityConfig = {
  entity: ContentEntity
  title: string
  subtitle: string
  eyebrow: string
  primaryLabel: string
  secondaryLabel: string
  listLabel: string
  singularLabel: string
  orderBy: 'sort_order' | 'created_at' | 'updated_at' | 'published_at' | 'name' | 'title'
  fields: FieldConfig[]
}

type UiError = {
  status?: number
  message: string
}

const contentStatuses = [
  { value: 'draft', label: 'Borrador' },
  { value: 'published', label: 'Publicado' },
  { value: 'scheduled', label: 'Programado' },
  { value: 'inactive', label: 'Inactivo' },
  { value: 'archived', label: 'Archivado' },
]

const eventStatuses = [
  ...contentStatuses,
  { value: 'sold_out', label: 'Agotado' },
  { value: 'cancelled', label: 'Cancelado' },
  { value: 'completed', label: 'Completado' },
]

const campaignStatuses = [
  { value: 'draft', label: 'Borrador' },
  { value: 'scheduled', label: 'Programada' },
  { value: 'active', label: 'Activa' },
  { value: 'paused', label: 'Pausada' },
  { value: 'completed', label: 'Completada' },
  { value: 'cancelled', label: 'Cancelada' },
]

const yesNoOptions = [
  { value: 'true', label: 'Sí' },
  { value: 'false', label: 'No' },
]

const editorialEntityConfigs: Record<ContentEntity, EntityConfig> = {
  wines: {
    entity: 'wines',
    title: 'Vinos',
    subtitle: 'Catálogo real conectado al backend editorial.',
    eyebrow: 'Contenido editorial',
    primaryLabel: 'name',
    secondaryLabel: 'sku',
    listLabel: 'vinos',
    singularLabel: 'vino',
    orderBy: 'name',
    fields: [
      { key: 'sku', label: 'SKU', type: 'text', required: true },
      { key: 'slug', label: 'Slug', type: 'text', required: true },
      { key: 'name', label: 'Nombre', type: 'text', required: true },
      { key: 'subtitle', label: 'Subtítulo', type: 'text', nullable: true },
      { key: 'description', label: 'Descripción', type: 'textarea', nullable: true },
      { key: 'grape_variety', label: 'Variedad de uva', type: 'text', nullable: true },
      { key: 'origin', label: 'Origen', type: 'text', nullable: true },
      { key: 'vintage', label: 'Añada', type: 'number', nullable: true },
      { key: 'price', label: 'Precio', type: 'number', required: true },
      { key: 'stock_quantity', label: 'Inventario', type: 'number', required: true },
      { key: 'featured', label: 'Destacado', type: 'boolean' },
      { key: 'visible_in_app', label: 'Visible en app', type: 'boolean' },
      { key: 'status', label: 'Estado', type: 'select', options: contentStatuses },
      { key: 'cover_image_url', label: 'Imagen principal URL', type: 'text', nullable: true },
    ],
  },
  experiences: {
    entity: 'experiences',
    title: 'Experiencias',
    subtitle: 'Experiencias publicables, editables y programables desde el backend.',
    eyebrow: 'Contenido editorial',
    primaryLabel: 'title',
    secondaryLabel: 'slug',
    listLabel: 'experiencias',
    singularLabel: 'experiencia',
    orderBy: 'title',
    fields: [
      { key: 'slug', label: 'Slug', type: 'text', required: true },
      { key: 'title', label: 'Título', type: 'text', required: true },
      { key: 'subtitle', label: 'Subtítulo', type: 'text', nullable: true },
      { key: 'short_description', label: 'Descripción corta', type: 'textarea', nullable: true },
      { key: 'description', label: 'Descripción', type: 'textarea', nullable: true },
      { key: 'duration_minutes', label: 'Duración en minutos', type: 'number', required: true },
      { key: 'base_price', label: 'Precio base', type: 'number', required: true },
      { key: 'capacity', label: 'Capacidad', type: 'number', required: true },
      { key: 'location', label: 'Ubicación', type: 'text', nullable: true },
      { key: 'featured', label: 'Destacada', type: 'boolean' },
      { key: 'visible_in_app', label: 'Visible en app', type: 'boolean' },
      { key: 'status', label: 'Estado', type: 'select', options: contentStatuses },
      { key: 'cover_image_url', label: 'Imagen principal URL', type: 'text', nullable: true },
    ],
  },
  events: {
    entity: 'events',
    title: 'Eventos',
    subtitle: 'Eventos reales con publicación, agenda y control de aforo.',
    eyebrow: 'Contenido editorial',
    primaryLabel: 'title',
    secondaryLabel: 'venue',
    listLabel: 'eventos',
    singularLabel: 'evento',
    orderBy: 'title',
    fields: [
      { key: 'slug', label: 'Slug', type: 'text', required: true },
      { key: 'title', label: 'Título', type: 'text', required: true },
      { key: 'subtitle', label: 'Subtítulo', type: 'text', nullable: true },
      { key: 'short_description', label: 'Descripción corta', type: 'textarea', nullable: true },
      { key: 'description', label: 'Descripción', type: 'textarea', nullable: true },
      { key: 'venue', label: 'Lugar', type: 'text', nullable: true },
      { key: 'start_at', label: 'Inicio', type: 'datetime', required: true },
      { key: 'end_at', label: 'Fin', type: 'datetime', required: true },
      { key: 'capacity', label: 'Capacidad', type: 'number', required: true },
      { key: 'sold_count', label: 'Vendidos', type: 'number' },
      { key: 'sales_enabled', label: 'Venta activa', type: 'boolean' },
      { key: 'featured', label: 'Destacado', type: 'boolean' },
      { key: 'visible_in_app', label: 'Visible en app', type: 'boolean' },
      { key: 'status', label: 'Estado', type: 'select', options: eventStatuses },
      { key: 'cover_image_url', label: 'Imagen principal URL', type: 'text', nullable: true },
    ],
  },
  promotions: {
    entity: 'promotions',
    title: 'Promociones',
    subtitle: 'Ofertas reales para publicar, pausar, programar o archivar.',
    eyebrow: 'Contenido editorial',
    primaryLabel: 'name',
    secondaryLabel: 'code',
    listLabel: 'promociones',
    singularLabel: 'promoción',
    orderBy: 'name',
    fields: [
      { key: 'code', label: 'Código', type: 'text', nullable: true },
      { key: 'name', label: 'Nombre', type: 'text', required: true },
      { key: 'description', label: 'Descripción', type: 'textarea', nullable: true },
      { key: 'promotion_type', label: 'Tipo de promoción', type: 'text', required: true },
      { key: 'discount_type', label: 'Tipo de descuento', type: 'text', required: true },
      { key: 'discount_value', label: 'Valor del descuento', type: 'number', required: true },
      { key: 'minimum_amount', label: 'Monto mínimo', type: 'number' },
      { key: 'maximum_discount', label: 'Descuento máximo', type: 'number', nullable: true },
      { key: 'starts_at', label: 'Inicio', type: 'datetime', nullable: true },
      { key: 'ends_at', label: 'Fin', type: 'datetime', nullable: true },
      { key: 'target_segment', label: 'Segmento', type: 'text', nullable: true },
      { key: 'visible_in_app', label: 'Visible en app', type: 'boolean' },
      { key: 'status', label: 'Estado', type: 'select', options: contentStatuses },
    ],
  },
  'membership-plans': {
    entity: 'membership-plans',
    title: 'Planes de membresía',
    subtitle: 'Planes reales del club conectados a publicación editorial.',
    eyebrow: 'Contenido editorial',
    primaryLabel: 'name',
    secondaryLabel: 'code',
    listLabel: 'planes',
    singularLabel: 'plan',
    orderBy: 'name',
    fields: [
      { key: 'code', label: 'Código', type: 'text', required: true },
      { key: 'name', label: 'Nombre', type: 'text', required: true },
      { key: 'description', label: 'Descripción', type: 'textarea', nullable: true },
      { key: 'price', label: 'Precio', type: 'number', required: true },
      { key: 'billing_period', label: 'Periodo de cobro', type: 'text', required: true },
      { key: 'daily_sommelier_limit', label: 'Límite diario de sommelier', type: 'number' },
      { key: 'active', label: 'Activo', type: 'boolean' },
      { key: 'visible_in_app', label: 'Visible en app', type: 'boolean' },
      { key: 'status', label: 'Estado', type: 'select', options: contentStatuses },
    ],
  },
  campaigns: {
    entity: 'campaigns',
    title: 'Campañas',
    subtitle: 'Campañas reales administradas desde el backend común.',
    eyebrow: 'Contenido editorial',
    primaryLabel: 'name',
    secondaryLabel: 'channel',
    listLabel: 'campañas',
    singularLabel: 'campaña',
    orderBy: 'name',
    fields: [
      { key: 'name', label: 'Nombre', type: 'text', required: true },
      { key: 'channel', label: 'Canal', type: 'text', required: true },
      { key: 'scheduled_at', label: 'Programación', type: 'datetime', nullable: true },
      { key: 'visible_in_app', label: 'Visible en app', type: 'boolean' },
      { key: 'status', label: 'Estado', type: 'select', options: campaignStatuses },
    ],
  },
}

function getDisplayValue(record: ContentRecord, key: string) {
  const value = record[key]
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  if (typeof value === 'boolean') return value ? 'Sí' : 'No'
  return ''
}

function getRecordTitle(record: ContentRecord, config: EntityConfig) {
  return getDisplayValue(record, config.primaryLabel) || getDisplayValue(record, 'name') || getDisplayValue(record, 'title') || 'Sin título'
}

function getRecordSubtitle(record: ContentRecord, config: EntityConfig) {
  return getDisplayValue(record, config.secondaryLabel) || getDisplayValue(record, 'slug') || getDisplayValue(record, 'code') || record.id
}

function formatDate(value: unknown) {
  if (typeof value !== 'string' || !value) return 'Sin fecha'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Sin fecha'

  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function toDatetimeLocal(value: unknown) {
  if (typeof value !== 'string' || !value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString().slice(0, 16)
}

function toInputValue(record: ContentRecord | null, field: FieldConfig) {
  const value = record?.[field.key]
  if (field.type === 'boolean') return value === true ? 'true' : 'false'
  if (field.type === 'datetime') return toDatetimeLocal(value)
  if (typeof value === 'number') return String(value)
  if (typeof value === 'string') return value
  return ''
}

function buildInitialForm(record: ContentRecord | null, fields: FieldConfig[]) {
  return fields.reduce<Record<string, string>>((next, field) => {
    next[field.key] = toInputValue(record, field)
    return next
  }, {})
}

function serializePayload(fields: FieldConfig[], values: Record<string, string>) {
  return fields.reduce<Record<string, unknown>>((payload, field) => {
    const rawValue = values[field.key]

    if (field.type === 'boolean') {
      payload[field.key] = rawValue === 'true'
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

    payload[field.key] = rawValue
    return payload
  }, {})
}

function getSafeError(error: unknown): UiError {
  if (error && typeof error === 'object') {
    const maybeStatus = 'status' in error ? Number((error as { status?: unknown }).status) : undefined
    if (maybeStatus === 401) return { status: 401, message: 'Tu sesión no autorizó esta operación.' }
    if (maybeStatus === 403) return { status: 403, message: 'Tu usuario no tiene permisos para esta operación.' }
    if (maybeStatus === 404) return { status: 404, message: 'El recurso solicitado no existe.' }
    if (maybeStatus === 422) return { status: 422, message: 'El backend rechazó el payload. Revisa los campos requeridos.' }
    if (maybeStatus) return { status: maybeStatus, message: `El backend respondió con HTTP ${maybeStatus}.` }
  }

  return { message: 'No fue posible completar la operación.' }
}

function StatusPill({ status }: { status?: string | null }) {
  const label = status || 'sin_estado'
  const tone =
    label === 'published' || label === 'active'
      ? 'border-[rgba(61,122,77,0.28)] bg-[rgba(61,122,77,0.1)] text-[var(--color-positive)]'
      : label === 'scheduled' || label === 'draft'
        ? 'border-[rgba(180,138,85,0.3)] bg-[rgba(180,138,85,0.12)] text-[var(--color-gold)]'
        : 'border-[rgba(157,71,63,0.28)] bg-[rgba(157,71,63,0.08)] text-[var(--color-alert)]'

  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${tone}`}>
      {label}
    </span>
  )
}

function IconButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--color-line)] bg-white text-[var(--color-muted)] transition hover:text-[var(--color-burgundy)] disabled:cursor-not-allowed disabled:opacity-45"
    >
      {children}
    </button>
  )
}

export function EditorialContentPage({ entity }: { entity: ContentEntity }) {
  const config = editorialEntityConfigs[entity]
  const { session } = useAuth()
  const token = session?.access_token
  const [records, setRecords] = useState<ContentRecord[]>([])
  const [selected, setSelected] = useState<ContentRecord | null>(null)
  const [form, setForm] = useState<Record<string, string>>(() => buildInitialForm(null, config.fields))
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [busyAction, setBusyAction] = useState<string | null>(null)
  const [error, setError] = useState<UiError | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [versions, setVersions] = useState<Array<{ version: number; created_at?: string | null }> | null>(null)
  const [scheduleAction, setScheduleAction] = useState<PublicationAction>('publish')
  const [scheduleAt, setScheduleAt] = useState('')

  const statusOptions = useMemo(() => {
    const statusField = config.fields.find((field) => field.key === 'status')
    return statusField?.options ?? contentStatuses
  }, [config.fields])

  const loadRecords = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await adminContentClient.list(entity, token, {
        page: 1,
        perPage: 50,
        search: search.trim() || undefined,
        status: statusFilter || undefined,
        locale: 'es-MX',
        orderBy: config.orderBy,
        orderDirection: 'asc',
      })
      setRecords(response.data)
      setSelected((current) => {
        if (!current) return response.data[0] ?? null
        return response.data.find((item) => item.id === current.id) ?? response.data[0] ?? null
      })
    } catch (loadError) {
      setError(getSafeError(loadError))
      setRecords([])
      setSelected(null)
    } finally {
      setLoading(false)
    }
  }, [config.orderBy, entity, search, statusFilter, token])

  useEffect(() => {
    void loadRecords()
  }, [loadRecords])

  useEffect(() => {
    setForm(buildInitialForm(selected, config.fields))
    setVersions(null)
    setSuccess(null)
  }, [config.fields, selected])

  function selectRecord(record: ContentRecord) {
    setSelected(record)
    setError(null)
  }

  function startCreate() {
    setSelected(null)
    setForm(buildInitialForm(null, config.fields))
    setVersions(null)
    setError(null)
    setSuccess(null)
  }

  async function saveRecord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const payload = serializePayload(config.fields, form)
      const response = selected
        ? await adminContentClient.update(entity, selected.id, payload, token)
        : await adminContentClient.create(entity, payload, token)
      setSelected(response.data)
      setSuccess(selected ? 'Cambios guardados.' : 'Registro creado.')
      await loadRecords()
    } catch (saveError) {
      setError(getSafeError(saveError))
    } finally {
      setSaving(false)
    }
  }

  async function runAction(action: PublicationAction) {
    if (!selected) return
    setBusyAction(action)
    setError(null)
    setSuccess(null)

    try {
      const response = await adminContentClient.action(entity, selected.id, action, token)
      setSelected(response.data)
      setSuccess('Acción completada.')
      await loadRecords()
    } catch (actionError) {
      setError(getSafeError(actionError))
    } finally {
      setBusyAction(null)
    }
  }

  async function scheduleRecord() {
    if (!selected || !scheduleAt) return
    setBusyAction('schedule')
    setError(null)
    setSuccess(null)

    try {
      await adminContentClient.schedule(
        entity,
        selected.id,
        { action: scheduleAction, run_at: new Date(scheduleAt).toISOString() },
        token,
      )
      setSuccess('Programación registrada.')
      setScheduleAt('')
      await loadRecords()
    } catch (scheduleError) {
      setError(getSafeError(scheduleError))
    } finally {
      setBusyAction(null)
    }
  }

  async function duplicateRecord() {
    if (!selected) return
    setBusyAction('duplicate')
    setError(null)
    setSuccess(null)

    try {
      const response = await adminContentClient.duplicate(entity, selected.id, token)
      setSelected(response.data)
      setSuccess('Duplicado creado.')
      await loadRecords()
    } catch (duplicateError) {
      setError(getSafeError(duplicateError))
    } finally {
      setBusyAction(null)
    }
  }

  async function removeRecord() {
    if (!selected) return
    setBusyAction('remove')
    setError(null)
    setSuccess(null)

    try {
      const response = await adminContentClient.remove(entity, selected.id, token)
      setSelected(response.data)
      setSuccess('Registro retirado.')
      await loadRecords()
    } catch (removeError) {
      setError(getSafeError(removeError))
    } finally {
      setBusyAction(null)
    }
  }

  async function loadVersions() {
    if (!selected) return
    setBusyAction('versions')
    setError(null)
    setSuccess(null)

    try {
      const response = await adminContentClient.versions(entity, selected.id, token)
      setVersions(response.data)
    } catch (versionsError) {
      setError(getSafeError(versionsError))
    } finally {
      setBusyAction(null)
    }
  }

  async function restoreVersion(version: number) {
    if (!selected) return
    setBusyAction(`version-${version}`)
    setError(null)
    setSuccess(null)

    try {
      const response = await adminContentClient.restoreVersion(entity, selected.id, version, token)
      setSelected(response.data)
      setSuccess('Versión restaurada.')
      await loadRecords()
      await loadVersions()
    } catch (restoreError) {
      setError(getSafeError(restoreError))
    } finally {
      setBusyAction(null)
    }
  }

  async function openPreview() {
    if (!selected) return
    setBusyAction('preview')
    setError(null)
    setSuccess(null)

    try {
      const response = await adminContentClient.previewToken(entity, selected.id, token)
      window.open(getPreviewUrl(response.data.token), '_blank', 'noopener,noreferrer')
      setSuccess('Vista previa generada.')
    } catch (previewError) {
      setError(getSafeError(previewError))
    } finally {
      setBusyAction(null)
    }
  }

  const selectedTitle = selected ? getRecordTitle(selected, config) : `Nuevo ${config.singularLabel}`
  const isBusy = saving || busyAction !== null

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <SectionTitle eyebrow={config.eyebrow} title={config.title} subtitle={config.subtitle} />
        <button
          type="button"
          onClick={startCreate}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--color-burgundy)] px-4 py-3 text-sm font-semibold text-white shadow-[var(--shadow-soft)] transition hover:brightness-110"
        >
          <Plus size={17} />
          Nuevo {config.singularLabel}
        </button>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(420px,1.05fr)]">
        <div className="space-y-4">
          <div className="rounded-[1rem] border border-[var(--color-line)] bg-[var(--color-panel)] p-4 shadow-[var(--shadow-card)]">
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px]">
              <label className="flex min-h-11 items-center gap-2 rounded-xl border border-[var(--color-line)] bg-white px-3 text-sm text-[var(--color-muted)]">
                <Search size={17} />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={`Buscar ${config.listLabel}`}
                  className="w-full bg-transparent py-2 text-[var(--color-ink)] outline-none"
                />
              </label>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="min-h-11 rounded-xl border border-[var(--color-line)] bg-white px-3 text-sm text-[var(--color-ink)] outline-none"
              >
                <option value="">Todos los estados</option>
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error ? (
            <div className="rounded-[1rem] border border-[rgba(157,71,63,0.28)] bg-[rgba(157,71,63,0.08)] p-4 text-sm text-[var(--color-alert)]">
              {error.message}
            </div>
          ) : null}

          {loading ? (
            <div className="flex min-h-64 items-center justify-center rounded-[1rem] border border-[var(--color-line)] bg-[var(--color-panel)] text-sm text-[var(--color-muted)]">
              <Loader2 className="mr-2 animate-spin" size={18} />
              Cargando contenido real...
            </div>
          ) : records.length === 0 ? (
            <div className="rounded-[1rem] border border-dashed border-[var(--color-line)] bg-[var(--color-panel)] p-8 text-center">
              <p className="text-lg font-semibold text-[var(--color-ink)]">Sin registros</p>
              <p className="mt-2 text-sm text-[var(--color-muted)]">
                El backend no devolvió {config.listLabel} para los filtros actuales.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-[1rem] border border-[var(--color-line)] bg-[var(--color-panel)] shadow-[var(--shadow-card)]">
              <div className="grid grid-cols-[minmax(0,1fr)_120px_120px] border-b border-[var(--color-line)] px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">
                <span>Registro</span>
                <span>Estado</span>
                <span>Actualizado</span>
              </div>
              <div className="divide-y divide-[var(--color-line)]">
                {records.map((record) => (
                  <button
                    key={record.id}
                    type="button"
                    onClick={() => selectRecord(record)}
                    className={`grid w-full grid-cols-[minmax(0,1fr)_120px_120px] items-center gap-3 px-4 py-4 text-left transition hover:bg-[rgba(104,17,38,0.04)] ${
                      selected?.id === record.id ? 'bg-[rgba(104,17,38,0.06)]' : ''
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-[var(--color-ink)]">
                        {getRecordTitle(record, config)}
                      </span>
                      <span className="mt-1 block truncate text-xs text-[var(--color-muted)]">
                        {getRecordSubtitle(record, config)}
                      </span>
                    </span>
                    <StatusPill status={record.status} />
                    <span className="text-xs text-[var(--color-muted)]">{formatDate(record.updated_at)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <form
          onSubmit={saveRecord}
          className="space-y-4 rounded-[1rem] border border-[var(--color-line)] bg-[var(--color-panel)] p-5 shadow-[var(--shadow-card)]"
        >
          <div className="flex flex-col gap-3 border-b border-[var(--color-line)] pb-4 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">
                Edición real
              </p>
              <h2 className="mt-1 truncate text-xl font-semibold text-[var(--color-ink)]">{selectedTitle}</h2>
              {selected ? (
                <p className="mt-1 text-xs text-[var(--color-muted)]">
                  Versión {selected.version ?? 'sin versión'} · {formatDate(selected.updated_at)}
                </p>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              {selected ? (
                <>
                  <IconButton label="Vista previa" onClick={openPreview} disabled={isBusy}>
                    <Eye size={16} />
                  </IconButton>
                  <IconButton label="Versiones" onClick={loadVersions} disabled={isBusy}>
                    <History size={16} />
                  </IconButton>
                </>
              ) : null}
              <button
                type="submit"
                disabled={isBusy}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-[var(--color-burgundy)] px-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-55"
              >
                {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                Guardar
              </button>
            </div>
          </div>

          {success ? (
            <div className="rounded-xl border border-[rgba(61,122,77,0.25)] bg-[rgba(61,122,77,0.08)] px-4 py-3 text-sm text-[var(--color-positive)]">
              {success}
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            {config.fields.map((field) => (
              <label
                key={field.key}
                className={field.type === 'textarea' ? 'space-y-2 md:col-span-2' : 'space-y-2'}
              >
                <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
                  {field.label}
                  {field.required ? ' *' : ''}
                </span>
                {field.type === 'textarea' ? (
                  <textarea
                    value={form[field.key] ?? ''}
                    onChange={(event) => setForm((current) => ({ ...current, [field.key]: event.target.value }))}
                    rows={4}
                    className="w-full rounded-xl border border-[var(--color-line)] bg-white px-3 py-3 text-sm text-[var(--color-ink)] outline-none"
                  />
                ) : field.type === 'select' ? (
                  <select
                    value={form[field.key] ?? ''}
                    onChange={(event) => setForm((current) => ({ ...current, [field.key]: event.target.value }))}
                    className="min-h-11 w-full rounded-xl border border-[var(--color-line)] bg-white px-3 text-sm text-[var(--color-ink)] outline-none"
                  >
                    <option value="">Sin cambio</option>
                    {field.options?.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : field.type === 'boolean' ? (
                  <select
                    value={form[field.key] ?? 'false'}
                    onChange={(event) => setForm((current) => ({ ...current, [field.key]: event.target.value }))}
                    className="min-h-11 w-full rounded-xl border border-[var(--color-line)] bg-white px-3 text-sm text-[var(--color-ink)] outline-none"
                  >
                    {yesNoOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={field.type === 'number' ? 'number' : field.type === 'datetime' ? 'datetime-local' : 'text'}
                    step={field.type === 'number' ? 'any' : undefined}
                    value={form[field.key] ?? ''}
                    onChange={(event) => setForm((current) => ({ ...current, [field.key]: event.target.value }))}
                    className="min-h-11 w-full rounded-xl border border-[var(--color-line)] bg-white px-3 text-sm text-[var(--color-ink)] outline-none"
                  />
                )}
              </label>
            ))}
          </div>

          {selected ? (
            <div className="space-y-4 border-t border-[var(--color-line)] pt-4">
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                <button
                  type="button"
                  onClick={() => void runAction('publish')}
                  disabled={isBusy}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--color-line)] bg-white px-3 py-2 text-sm font-semibold text-[var(--color-positive)] disabled:opacity-45"
                >
                  <CheckCircle2 size={16} />
                  Publicar
                </button>
                <button
                  type="button"
                  onClick={() => void runAction('unpublish')}
                  disabled={isBusy}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--color-line)] bg-white px-3 py-2 text-sm font-semibold text-[var(--color-gold)] disabled:opacity-45"
                >
                  <XCircle size={16} />
                  Despublicar
                </button>
                <button
                  type="button"
                  onClick={() => void runAction('archive')}
                  disabled={isBusy}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--color-line)] bg-white px-3 py-2 text-sm font-semibold text-[var(--color-alert)] disabled:opacity-45"
                >
                  <Archive size={16} />
                  Archivar
                </button>
                <button
                  type="button"
                  onClick={() => void runAction('restore')}
                  disabled={isBusy}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--color-line)] bg-white px-3 py-2 text-sm font-semibold text-[var(--color-burgundy)] disabled:opacity-45"
                >
                  <RotateCcw size={16} />
                  Restaurar
                </button>
              </div>

              <div className="grid gap-3 rounded-xl border border-[var(--color-line)] bg-white p-3 md:grid-cols-[150px_minmax(0,1fr)_auto]">
                <select
                  value={scheduleAction}
                  onChange={(event) => setScheduleAction(event.target.value as PublicationAction)}
                  className="min-h-10 rounded-lg border border-[var(--color-line)] px-3 text-sm outline-none"
                >
                  <option value="publish">Publicar</option>
                  <option value="unpublish">Despublicar</option>
                  <option value="archive">Archivar</option>
                  <option value="restore">Restaurar</option>
                </select>
                <input
                  type="datetime-local"
                  value={scheduleAt}
                  onChange={(event) => setScheduleAt(event.target.value)}
                  className="min-h-10 rounded-lg border border-[var(--color-line)] px-3 text-sm outline-none"
                />
                <button
                  type="button"
                  onClick={() => void scheduleRecord()}
                  disabled={isBusy || !scheduleAt}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--color-ink)] px-3 py-2 text-sm font-semibold text-white disabled:opacity-45"
                >
                  <Clock3 size={16} />
                  Programar
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void duplicateRecord()}
                  disabled={isBusy}
                  className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-line)] bg-white px-3 py-2 text-sm font-semibold text-[var(--color-muted)] disabled:opacity-45"
                >
                  <Copy size={16} />
                  Duplicar
                </button>
                <button
                  type="button"
                  onClick={() => void removeRecord()}
                  disabled={isBusy}
                  className="inline-flex items-center gap-2 rounded-lg border border-[rgba(157,71,63,0.28)] bg-[rgba(157,71,63,0.06)] px-3 py-2 text-sm font-semibold text-[var(--color-alert)] disabled:opacity-45"
                >
                  <Trash2 size={16} />
                  Retirar
                </button>
              </div>
            </div>
          ) : null}

          {versions ? (
            <div className="space-y-2 border-t border-[var(--color-line)] pt-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
                Historial de versiones
              </p>
              {versions.length === 0 ? (
                <p className="text-sm text-[var(--color-muted)]">No hay versiones registradas.</p>
              ) : (
                <div className="space-y-2">
                  {versions.map((version) => (
                    <div
                      key={version.version}
                      className="flex items-center justify-between gap-3 rounded-xl border border-[var(--color-line)] bg-white px-3 py-2"
                    >
                      <span className="text-sm text-[var(--color-ink)]">
                        Versión {version.version} · {formatDate(version.created_at)}
                      </span>
                      <button
                        type="button"
                        onClick={() => void restoreVersion(version.version)}
                        disabled={isBusy}
                        className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-line)] px-3 py-1.5 text-xs font-semibold text-[var(--color-burgundy)] disabled:opacity-45"
                      >
                        <Pencil size={14} />
                        Restaurar
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </form>
      </div>
    </section>
  )
}
