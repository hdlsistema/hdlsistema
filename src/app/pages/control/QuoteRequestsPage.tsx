import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { useParams } from 'react-router-dom'
import {
  Loader2,
  Mail,
  PencilLine,
  Phone,
  Plus,
  RefreshCw,
  Save,
  UserRound,
  X,
} from 'lucide-react'
import { useAuth } from '../../../contexts/AuthContext'
import {
  adminCommercialCatalogClient,
  quoteRequestsClient,
  type PublicCommercialItem,
  type QuoteRequestRecord,
} from '../../../services/commercial.service'
import { customersClient, type CustomerRecord } from '../../../services/customers.service'
import { ControlEntityPicker } from '../../components/control/ControlEntityPicker'
import { QuickCustomerDialog } from '../../components/control/QuickCustomerDialog'
import { CrystalDateField } from '../../components/shared/CrystalDateField'
import { CrystalSelect } from '../../components/shared/CrystalSelect'
import { dateOnly, money, statusLabel as safeStatusLabel } from './controlCopy'

const statuses = [
  { value: '', label: 'Todas' },
  { value: 'new', label: 'Nueva' },
  { value: 'contacted', label: 'Contactada' },
  { value: 'in_progress', label: 'En proceso' },
  { value: 'quoted', label: 'Cotizada' },
  { value: 'won', label: 'Ganada' },
  { value: 'lost', label: 'Perdida' },
  { value: 'cancelled', label: 'Cancelada' },
] as const

type QuoteDraft = {
  customerId: string
  status: QuoteRequestRecord['status']
  eventCategory: string
  eventType: string
  preferredDate: string
  alternativeDate: string
  preferredStartTime: string
  preferredEndTime: string
  guestCount: string
  venueSpaceId: string
  venueSpaceName: string
  foodRequired: QuoteRequestRecord['foodRequired']
  foodType: string
  wineRequired: QuoteRequestRecord['wineRequired']
  wineOption: string
  requestedServices: string
  contactFirstName: string
  contactLastName: string
  contactEmail: string
  contactPhone: string
  companyName: string
  notes: string
  source: string
  adminNotes: string
}

const emptyQuoteDraft: QuoteDraft = {
  customerId: '', status: 'new', eventCategory: 'social', eventType: '', preferredDate: '', alternativeDate: '',
  preferredStartTime: '', preferredEndTime: '', guestCount: '2', venueSpaceId: '', venueSpaceName: '',
  foodRequired: 'advice', foodType: '', wineRequired: 'advice', wineOption: '', requestedServices: '',
  contactFirstName: '', contactLastName: '', contactEmail: '', contactPhone: '', companyName: '', notes: '',
  source: 'Centro de control', adminNotes: '',
}

const sourceOptions = [
  { value: 'Centro de control', label: 'Centro de Control' },
  { value: 'mobile_app', label: 'App móvil' },
  { value: 'Teléfono', label: 'Teléfono' },
  { value: 'WhatsApp', label: 'WhatsApp' },
  { value: 'Mostrador', label: 'Mostrador' },
  { value: 'Agencia', label: 'Agencia' },
  { value: 'Evento', label: 'Evento' },
  { value: 'Web', label: 'Sitio web' },
  { value: 'Otro', label: 'Otro' },
] as const

function sourceLabel(source?: string | null) {
  if (!source) return 'Sin origen'
  if (['mobile_app', 'app', 'App'].includes(source)) return 'App móvil'
  return sourceOptions.find((item) => item.value === source)?.label ?? source
}

function isAppQuote(quote: QuoteRequestRecord) {
  return ['mobile_app', 'app', 'App'].includes(quote.source)
}

function draftFromQuote(quote: QuoteRequestRecord, pendingAdminNotes?: string): QuoteDraft {
  return {
    customerId: quote.customerId ?? '',
    status: quote.status,
    eventCategory: quote.eventCategory,
    eventType: quote.eventType,
    preferredDate: quote.preferredDate ?? '',
    alternativeDate: quote.alternativeDate ?? '',
    preferredStartTime: quote.preferredStartTime?.slice(0, 5) ?? '',
    preferredEndTime: quote.preferredEndTime?.slice(0, 5) ?? '',
    guestCount: String(quote.guestCount),
    venueSpaceId: quote.venueSpaceId ?? '',
    venueSpaceName: quote.venueSpaceName ?? '',
    foodRequired: quote.foodRequired,
    foodType: quote.foodType ?? '',
    wineRequired: quote.wineRequired,
    wineOption: quote.wineOption ?? '',
    requestedServices: quote.requestedServices?.join(', ') ?? '',
    contactFirstName: quote.contactFirstName ?? '',
    contactLastName: quote.contactLastName ?? '',
    contactEmail: quote.contactEmail,
    contactPhone: quote.contactPhone,
    companyName: quote.companyName ?? '',
    notes: quote.notes ?? '',
    source: quote.source,
    adminNotes: pendingAdminNotes ?? quote.adminNotes ?? '',
  }
}

function canWrite(roles: string[]) {
  return roles.some((role) => ['super_admin', 'admin', 'operations', 'marketing'].includes(role))
}

function statusLabel(status: string) {
  return statuses.find((item) => item.value === status)?.label ?? safeStatusLabel(status)
}

function dateLabel(value?: string | null) {
  return dateOnly(value)
}

function currency(value?: number | null, code = 'MXN') {
  if (value === null || value === undefined || Number.isNaN(value)) return ''
  return money(value, code)
}

function metadataValue(metadata: Record<string, unknown> | undefined, key: string) {
  const value = metadata?.[key]
  if (value === null || value === undefined || value === '') return ''
  if (Array.isArray(value)) return value.join(', ')
  if (typeof value === 'object') return 'Información adicional'
  return String(value)
}

function emailStatusLabel(status?: string | null) {
  const labels: Record<string, string> = {
    queued: 'en cola',
    pending: 'pendiente',
    pending_configuration: 'requiere configuración operativa',
    processing: 'en proceso',
    sent: 'enviado',
    delivered: 'entregado',
    failed: 'no enviado',
  }
  if (!status) return 'registrado'
  return labels[status] ?? safeStatusLabel(status)
}

function requirementLabel(value: QuoteRequestRecord['foodRequired'] | QuoteRequestRecord['wineRequired']) {
  return value === 'yes' ? 'Sí' : value === 'no' ? 'No' : 'Requiere asesoría'
}

function timeRange(start?: string | null, end?: string | null) {
  const values = [start?.slice(0, 5), end?.slice(0, 5)].filter(Boolean)
  return values.length ? values.join(' a ') : 'Por definir'
}

function defaultSubject(quote: QuoteRequestRecord | null) {
  return quote ? `Cotización ${quote.quoteNumber} · Hacienda de Letras` : 'Cotización Hacienda de Letras'
}

function defaultMessage(quote: QuoteRequestRecord | null) {
  if (!quote) return ''
  return [
    `Hola ${quote.customerName || 'Cliente'},`,
    '',
    `Gracias por considerar Hacienda de Letras para ${quote.eventType}.`,
    'Te compartimos la propuesta preparada con base en los datos de tu solicitud.',
    '',
    'Quedamos atentos a tus comentarios para confirmar ajustes, disponibilidad y siguientes pasos.',
  ].join('\n')
}

export function QuoteRequestsPage() {
  const { quoteId } = useParams<{ quoteId?: string }>()
  const { session, roles } = useAuth()
  const token = session?.access_token
  const writable = canWrite(roles)
  const [items, setItems] = useState<QuoteRequestRecord[]>([])
  const [selected, setSelected] = useState<QuoteRequestRecord | null>(null)
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [adminNotes, setAdminNotes] = useState('')
  const [quoteForm, setQuoteForm] = useState({
    subject: '',
    message: '',
    quoteAmount: '',
    validUntil: '',
  })
  const [customers, setCustomers] = useState<CustomerRecord[]>([])
  const [venues, setVenues] = useState<PublicCommercialItem[]>([])
  const [formMode, setFormMode] = useState<'create' | 'edit' | null>(null)
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false)
  const [quoteDraft, setQuoteDraft] = useState<QuoteDraft>(emptyQuoteDraft)

  const syncSelected = useCallback((quote: QuoteRequestRecord | null) => {
    setSelected(quote)
    setAdminNotes(quote?.adminNotes ?? '')
    setQuoteForm({
      subject: defaultSubject(quote),
      message: defaultMessage(quote),
      quoteAmount: metadataValue(quote?.metadata, 'lastQuotedAmount'),
      validUntil: '',
    })
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await quoteRequestsClient.list(token, {
        status: status || undefined,
        search: search || undefined,
        perPage: 50,
      })
      setItems(response.data)
      let preferred = quoteId ? response.data.find((item) => item.id === quoteId) : null
      if (quoteId && !preferred) {
        try {
          preferred = (await quoteRequestsClient.get(token, quoteId)).data
          setItems((current) => current.some((item) => item.id === preferred?.id) ? current : [preferred!, ...current])
        } catch {
          preferred = null
        }
      }
      syncSelected(preferred ?? response.data[0] ?? null)
    } catch {
      setItems([])
      syncSelected(null)
      setError('No fue posible cargar cotizaciones.')
    } finally {
      setLoading(false)
    }
  }, [quoteId, search, status, syncSelected, token])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!formMode) return
    Promise.all([
      customersClient.list(token, { perPage: 100, status: 'published' }),
      adminCommercialCatalogClient.list(token),
    ]).then(([customerResponse, catalogResponse]) => {
      setCustomers(customerResponse.data)
      setVenues(catalogResponse.data.venueSpaces)
    }).catch(() => setError('No fue posible cargar todos los catálogos del formulario.'))
  }, [formMode, token])

  const counts = useMemo(() => ({
    total: items.length,
    app: items.filter(isAppQuote).length,
    manual: items.filter((item) => !isAppQuote(item)).length,
    inProgress: items.filter((item) => item.status === 'contacted' || item.status === 'in_progress').length,
  }), [items])

  const replaceItem = (quote: QuoteRequestRecord) => {
    syncSelected(quote)
    setItems((current) => current.map((item) => item.id === quote.id ? quote : item))
  }

  const updateStatus = async (nextStatus: QuoteRequestRecord['status']) => {
    if (!selected) return
    setSaving(nextStatus)
    setError('')
    setSuccess('')
    try {
      const response = await quoteRequestsClient.update(token, selected.id, { status: nextStatus, adminNotes })
      replaceItem(response.data)
      setSuccess('Estado actualizado.')
    } catch {
      setError('No fue posible actualizar la cotización.')
    } finally {
      setSaving('')
    }
  }

  const saveNotes = async () => {
    if (!selected) return
    setSaving('notes')
    setError('')
    setSuccess('')
    try {
      const response = await quoteRequestsClient.update(token, selected.id, { adminNotes })
      replaceItem(response.data)
      setSuccess('Notas internas guardadas.')
    } catch {
      setError('No fue posible guardar las notas.')
    } finally {
      setSaving('')
    }
  }

  const sendQuote = async () => {
    if (!selected) return
    setSaving('send')
    setError('')
    setSuccess('')
    try {
      const amount = quoteForm.quoteAmount.trim() ? Number(quoteForm.quoteAmount) : undefined
      const response = await quoteRequestsClient.sendQuote(token, selected.id, {
        subject: quoteForm.subject,
        message: quoteForm.message,
        quoteAmount: Number.isFinite(amount) ? amount : undefined,
        validUntil: quoteForm.validUntil || undefined,
        adminNotes,
      })
      replaceItem(response.data.quote)
      setSuccess(`Cotización enviada. Estado del correo: ${emailStatusLabel(response.data.email.status)}.`)
    } catch {
      setError('No fue posible enviar la cotización por correo.')
    } finally {
      setSaving('')
    }
  }

  const openCreateForm = () => {
    setQuoteDraft(emptyQuoteDraft)
    setFormMode('create')
  }

  const openEditForm = () => {
    if (!selected) return
    setQuoteDraft(draftFromQuote(selected, adminNotes))
    setFormMode('edit')
  }

  const submitQuoteForm = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!writable || saving) return
    const mode = formMode
    if (!mode) return
    setSaving(mode)
    setError('')
    setSuccess('')
    try {
      const editablePayload = {
        customerId: quoteDraft.customerId || null,
        eventCategory: quoteDraft.eventCategory,
        eventType: quoteDraft.eventType,
        preferredDate: quoteDraft.preferredDate || null,
        alternativeDate: quoteDraft.alternativeDate || null,
        preferredStartTime: quoteDraft.preferredStartTime || null,
        preferredEndTime: quoteDraft.preferredEndTime || null,
        guestCount: Number(quoteDraft.guestCount),
        venueSpaceId: quoteDraft.venueSpaceId || null,
        venueSpaceName: quoteDraft.venueSpaceName || null,
        foodRequired: quoteDraft.foodRequired,
        foodType: quoteDraft.foodType || null,
        wineRequired: quoteDraft.wineRequired,
        wineOption: quoteDraft.wineOption || null,
        requestedServices: quoteDraft.requestedServices.split(',').map((item) => item.trim()).filter(Boolean),
        contactFirstName: quoteDraft.contactFirstName,
        contactLastName: quoteDraft.contactLastName,
        contactEmail: quoteDraft.contactEmail,
        contactPhone: quoteDraft.contactPhone,
        companyName: quoteDraft.companyName || null,
        notes: quoteDraft.notes || null,
        source: quoteDraft.source,
        adminNotes: quoteDraft.adminNotes || null,
      }
      const response = mode === 'create'
        ? await quoteRequestsClient.create(token, {
            ...editablePayload,
            language: 'es',
            idempotencyKey: crypto.randomUUID(),
          })
        : await quoteRequestsClient.update(token, selected!.id, {
            ...editablePayload,
            status: quoteDraft.status,
          })
      setQuoteDraft(emptyQuoteDraft)
      setFormMode(null)
      replaceItem(response.data)
      setSuccess(mode === 'create' ? 'Cotización manual creada.' : 'Cotización actualizada con todos sus datos.')
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'No fue posible guardar la cotización.')
    } finally {
      setSaving('')
    }
  }

  return (
    <div className="control-page control-page--quotes space-y-6">
      <header className="control-page-title flex flex-wrap items-end justify-between gap-4">
	        <div>
	          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-muted)]">Operación comercial</p>
	          <h1 className="mt-2 text-[34px] leading-none text-[var(--color-ink)]" style={{ fontFamily: 'var(--font-display)' }}>Cotizaciones</h1>
	          <p className="mt-2 text-[var(--color-muted-strong)]">Solicitudes recibidas desde la app y cotizaciones manuales, con expediente editable y envío.</p>
	        </div>
        <div className="flex flex-wrap gap-2"><button type="button" onClick={() => void load()} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[rgba(200,171,136,0.55)] bg-white/50 px-5 text-sm font-medium text-[var(--color-burgundy)] backdrop-blur-xl"><RefreshCw size={16} /> Actualizar</button><button type="button" disabled={!writable} onClick={openCreateForm} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--color-burgundy)] px-5 text-sm font-semibold text-white disabled:opacity-50"><Plus size={16} />Nueva manual</button></div>
      </header>

      <section className="control-metrics-strip grid gap-4 md:grid-cols-4">
        <Metric label="Solicitudes" value={counts.total} />
        <Metric label="Recibidas desde app" value={counts.app} />
        <Metric label="Manuales" value={counts.manual} />
        <Metric label="Seguimiento" value={counts.inProgress} />
      </section>

      <section className="control-master-detail grid gap-6 xl:grid-cols-[minmax(360px,0.4fr)_minmax(0,0.6fr)]">
        <div className="control-master-list rounded-[1.4rem] border border-[rgba(200,171,136,0.45)] bg-white/42 p-4 shadow-[0_24px_58px_rgba(84,43,23,0.08)] backdrop-blur-2xl">
	          <div className="grid gap-3 md:grid-cols-[210px_1fr]">
	            <CrystalSelect value={status} onChange={setStatus}>
	              {statuses.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
	            </CrystalSelect>
	            <input
	              value={search}
	              onChange={(event) => setSearch(event.target.value)}
	              placeholder="Buscar por folio, cliente, evento o teléfono..."
	              className="min-h-11 w-full rounded-full border border-[rgba(200,171,136,0.45)] bg-white/64 px-5 text-sm text-[var(--color-ink)] outline-none"
	            />
	          </div>
          {error ? <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
          {success ? <p className="mt-4 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">{success}</p> : null}
          <div className="mt-4 overflow-hidden rounded-[1.1rem] border border-[rgba(200,171,136,0.32)] bg-white/48">
            {loading ? (
              <div className="flex min-h-44 items-center justify-center text-[var(--color-muted)]"><Loader2 className="animate-spin" /></div>
            ) : items.length === 0 ? (
              <div className="min-h-44 p-8 text-center text-[var(--color-muted)]">Sin cotizaciones para los filtros actuales.</div>
            ) : (
              <div className="divide-y divide-[rgba(200,171,136,0.25)]">
                {items.map((item) => (
                  <button key={item.id} type="button" onClick={() => syncSelected(item)} className={`grid w-full gap-2 px-4 py-4 text-left md:grid-cols-[1fr_auto] ${selected?.id === item.id ? 'bg-[rgba(138,31,45,0.08)]' : 'hover:bg-white/50'}`}>
                    <span>
                      <span className="block text-sm font-semibold text-[var(--color-ink)]">{item.quoteNumber} · {item.customerName}</span>
                      <span className="mt-1 block text-[12px] text-[var(--color-muted-strong)]">{item.eventType} · {item.guestCount} personas · <span className="whitespace-nowrap">{dateLabel(item.preferredDate)}</span></span>
                      <span className="mt-1 block text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-gold)]">{sourceLabel(item.source)}</span>
                    </span>
                    <span className="inline-flex h-8 items-center justify-center rounded-full bg-white/70 px-3 text-xs font-semibold text-[var(--color-burgundy)]">{statusLabel(item.status)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <aside className="control-detail-pane rounded-[1.4rem] border border-[rgba(200,171,136,0.45)] bg-white/50 p-5 shadow-[0_24px_58px_rgba(84,43,23,0.08)] backdrop-blur-2xl">
          {selected ? (
            <div className="space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-gold)]">{selected.quoteNumber}</p>
                  <h2 className="mt-2 text-2xl text-[var(--color-ink)]" style={{ fontFamily: 'var(--font-display)' }}>{selected.eventType}</h2>
                  <p className="mt-1 text-sm text-[var(--color-muted-strong)]">{selected.customerName}</p>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <span className="rounded-full border border-[rgba(181,135,73,0.28)] bg-white/70 px-3 py-2 text-xs font-semibold text-[var(--color-gold)]">{sourceLabel(selected.source)}</span>
                  <span className="rounded-full bg-[rgba(138,31,45,0.09)] px-4 py-2 text-sm font-semibold text-[var(--color-burgundy)]">{statusLabel(selected.status)}</span>
                  <button type="button" disabled={!writable} onClick={openEditForm} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[rgba(138,31,45,0.2)] bg-white/80 px-4 text-xs font-semibold text-[var(--color-burgundy)] disabled:opacity-50"><PencilLine size={14} /> Editar expediente</button>
                </div>
              </div>

              <section className="grid gap-3 md:grid-cols-2">
                <Detail icon={<UserRound size={16} />} label="Cliente" value={`${selected.contactFirstName ?? ''} ${selected.contactLastName ?? ''}`.trim() || selected.customerName} />
                <Detail icon={<Phone size={16} />} label="Teléfono" value={selected.contactPhone || 'Sin teléfono'} />
                <Detail icon={<Mail size={16} />} label="Correo" value={selected.contactEmail || 'Sin correo'} />
                <Detail label="Empresa" value={selected.companyName || 'Sin empresa'} />
                <Detail label="Fecha solicitada" value={dateLabel(selected.preferredDate)} />
                <Detail label="Fecha alternativa" value={dateLabel(selected.alternativeDate)} />
                <Detail label="Horario" value={timeRange(selected.preferredStartTime, selected.preferredEndTime)} />
                <Detail label="Personas" value={String(selected.guestCount)} />
                <Detail label="Espacio" value={selected.venueSpaceName || 'Por definir'} />
                <Detail label="Comida" value={`${requirementLabel(selected.foodRequired)}${selected.foodType ? ` · ${selected.foodType}` : ''}`} />
                <Detail label="Vino" value={`${requirementLabel(selected.wineRequired)}${selected.wineOption ? ` · ${selected.wineOption}` : ''}`} />
                <Detail label="Servicios" value={selected.requestedServices?.length ? selected.requestedServices.join(', ') : 'Sin servicios capturados'} wide />
                <Detail label="Notas del cliente" value={selected.notes || 'Sin notas'} wide />
              </section>

	              <section className="rounded-[1.1rem] border border-[rgba(200,171,136,0.42)] bg-white/58 p-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-[var(--color-ink)]">Seguimiento interno</h3>
                  <button type="button" onClick={() => void saveNotes()} disabled={saving === 'notes'} className="inline-flex h-9 items-center gap-2 rounded-full bg-white/75 px-3 text-xs font-semibold text-[var(--color-burgundy)] disabled:opacity-55">
                    {saving === 'notes' ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    Guardar
                  </button>
                </div>
                <textarea
                  value={adminNotes}
                  onChange={(event) => setAdminNotes(event.target.value)}
                  rows={3}
                  placeholder="Notas internas, responsable, próxima acción o acuerdos..."
                  className="mt-3 w-full rounded-2xl border border-[rgba(200,171,136,0.42)] bg-white/70 px-4 py-3 text-sm text-[var(--color-ink)] outline-none"
                />
                <div className="mt-3 grid items-end gap-2 md:grid-cols-[minmax(0,1fr)_auto]">
                  <label className="grid gap-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--color-muted)]">
                    Cambiar estado
                    <CrystalSelect
                      value={selected.status}
                      onChange={(value) => void updateStatus(value as QuoteRequestRecord['status'])}
                      disabled={Boolean(saving)}
                    >
                      {statuses.filter((item) => item.value).map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                    </CrystalSelect>
                  </label>
                  <span className="control-current-status inline-flex h-[38px] items-center rounded-md border border-[rgba(138,31,45,0.16)] bg-[rgba(138,31,45,0.07)] px-3 text-[11px] font-semibold text-[var(--color-burgundy)]">
                    Actual: {statusLabel(selected.status)}
                  </span>
                </div>
	              </section>
	              <section className="grid gap-3 rounded-[1.1rem] border border-[rgba(200,171,136,0.42)] bg-white/58 p-4 md:grid-cols-2">
	                <Detail label="Responsable" value={selected.assignedTo || 'Sin responsable asignado'} />
	                <Detail label="Contactada" value={dateLabel(selected.contactedAt)} />
	                <Detail label="Cotizada" value={dateLabel(selected.quotedAt)} />
	                <Detail label="Cierre" value={dateLabel(selected.closedAt)} />
	              </section>

              <section className="rounded-[1.1rem] border border-[rgba(138,31,45,0.22)] bg-[rgba(255,255,255,0.62)] p-4">
                <h3 className="text-sm font-semibold text-[var(--color-ink)]">Enviar cotización por correo</h3>
                <div className="mt-3 grid gap-3">
                  <input
                    value={quoteForm.subject}
                    onChange={(event) => setQuoteForm((current) => ({ ...current, subject: event.target.value }))}
                    placeholder="Asunto"
                    className="min-h-11 rounded-2xl border border-[rgba(200,171,136,0.42)] bg-white/72 px-4 text-sm text-[var(--color-ink)] outline-none"
                  />
                  <textarea
                    value={quoteForm.message}
                    onChange={(event) => setQuoteForm((current) => ({ ...current, message: event.target.value }))}
                    rows={5}
                    placeholder="Mensaje de la propuesta"
                    className="rounded-2xl border border-[rgba(200,171,136,0.42)] bg-white/72 px-4 py-3 text-sm text-[var(--color-ink)] outline-none"
                  />
                  <div className="grid gap-3 md:grid-cols-2">
                    <input
                      value={quoteForm.quoteAmount}
                      onChange={(event) => setQuoteForm((current) => ({ ...current, quoteAmount: event.target.value }))}
                      placeholder="Monto cotizado MXN"
                      inputMode="decimal"
                      className="min-h-11 rounded-2xl border border-[rgba(200,171,136,0.42)] bg-white/72 px-4 text-sm text-[var(--color-ink)] outline-none"
                    />
                    <CrystalDateField
                      value={quoteForm.validUntil}
                      onChange={(value) => setQuoteForm((current) => ({ ...current, validUntil: value }))}
                      placeholder="Vigente hasta"
                      buttonClassName="min-h-11 rounded-2xl border-[rgba(200,171,136,0.42)] bg-white/72 text-sm"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => void sendQuote()}
                    disabled={saving === 'send' || !selected.contactEmail || quoteForm.subject.length < 3 || quoteForm.message.length < 10}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[var(--color-burgundy)] px-5 text-sm font-semibold text-white disabled:opacity-55"
                  >
                    {saving === 'send' ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
                    Enviar cotización
                  </button>
                  <p className="text-xs text-[var(--color-muted)]">
                    {quoteForm.quoteAmount ? `Importe visible: ${currency(Number(quoteForm.quoteAmount))}` : 'El correo se envía al contacto registrado y queda en el historial operativo.'}
                  </p>
                </div>
              </section>
            </div>
          ) : (
            <p className="text-sm text-[var(--color-muted)]">Selecciona una cotización.</p>
          )}
        </aside>
      </section>

      {formMode ? (
        <div className="control-form-overlay fixed inset-0 z-[150] flex items-center justify-center bg-[#210711]/68 p-4 backdrop-blur-sm">
          <button type="button" aria-label="Cerrar" onClick={() => setFormMode(null)} className="absolute inset-0" />
          <form onSubmit={submitQuoteForm} className="control-form-surface relative z-10 max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-2xl border border-[var(--color-line)] bg-[var(--color-page)] p-6 shadow-[0_35px_90px_rgba(29,5,12,0.38)]" role="dialog" aria-modal="true" aria-label={formMode === 'create' ? 'Nueva cotización manual' : 'Editar cotización'}>
            <header className="control-form-header mb-5 flex items-center justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-gold)]">Expediente comercial completo</p><h2 className="mt-1 text-2xl text-[var(--color-burgundy)]" style={{ fontFamily: 'var(--font-display)' }}>{formMode === 'create' ? 'Nueva cotización manual' : `Editar ${selected?.quoteNumber ?? 'cotización'}`}</h2><p className="mt-1 text-xs text-[var(--color-muted)]">Los registros de la app y los capturados manualmente conservan el mismo nivel de edición.</p></div><button type="button" onClick={() => setFormMode(null)} className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--color-line)] bg-white" aria-label="Cerrar"><X size={17} /></button></header>
            <div className="control-form-grid grid gap-4 md:grid-cols-2">
              <ControlEntityPicker label="Cliente relacionado (opcional)" value={quoteDraft.customerId} options={customers.map((customer) => ({ id: customer.id, label: customer.displayName, description: [customer.email, customer.phone].filter(Boolean).join(' · ') || customer.customerNumber }))} onChange={(customerId) => { const customer = customers.find((item) => item.id === customerId); const names = customer?.displayName.trim().split(/\s+/) ?? []; setQuoteDraft((current) => ({ ...current, customerId, contactFirstName: customer ? names[0] ?? '' : current.contactFirstName, contactLastName: customer ? names.slice(1).join(' ') || '-' : current.contactLastName, contactEmail: customer?.email ?? current.contactEmail, contactPhone: customer?.phone ?? current.contactPhone })) }} actionLabel="Crear cliente nuevo" onAction={() => setCustomerDialogOpen(true)} />
              <label><span className="mb-2 block text-[10px] font-semibold uppercase text-[var(--color-muted)]">Canal de origen</span><CrystalSelect value={quoteDraft.source} onChange={(source) => setQuoteDraft({ ...quoteDraft, source })} options={sourceOptions.map((item) => ({ ...item }))} /></label>
              {formMode === 'edit' ? <label><span className="mb-2 block text-[10px] font-semibold uppercase text-[var(--color-muted)]">Estado</span><CrystalSelect value={quoteDraft.status} onChange={(statusValue) => setQuoteDraft({ ...quoteDraft, status: statusValue as QuoteRequestRecord['status'] })}>{statuses.filter((item) => item.value).map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</CrystalSelect></label> : null}
              <QuoteInput label="Nombre" value={quoteDraft.contactFirstName} onChange={(contactFirstName) => setQuoteDraft({ ...quoteDraft, contactFirstName })} required />
              <QuoteInput label="Apellidos" value={quoteDraft.contactLastName} onChange={(contactLastName) => setQuoteDraft({ ...quoteDraft, contactLastName })} required />
              <QuoteInput label="Correo" type="email" value={quoteDraft.contactEmail} onChange={(contactEmail) => setQuoteDraft({ ...quoteDraft, contactEmail })} required />
              <QuoteInput label="Teléfono" value={quoteDraft.contactPhone} onChange={(contactPhone) => setQuoteDraft({ ...quoteDraft, contactPhone })} required />
              <QuoteInput label="Empresa (opcional)" value={quoteDraft.companyName} onChange={(companyName) => setQuoteDraft({ ...quoteDraft, companyName })} />
              <label><span className="mb-2 block text-[10px] font-semibold uppercase text-[var(--color-muted)]">Categoría</span><CrystalSelect value={quoteDraft.eventCategory} onChange={(eventCategory) => setQuoteDraft({ ...quoteDraft, eventCategory })}><option value="social">Social</option><option value="business">Empresarial</option></CrystalSelect></label>
              <QuoteInput label="Tipo de evento o servicio" value={quoteDraft.eventType} onChange={(eventType) => setQuoteDraft({ ...quoteDraft, eventType })} required />
              <QuoteInput label="Personas" type="number" value={quoteDraft.guestCount} onChange={(guestCount) => setQuoteDraft({ ...quoteDraft, guestCount })} required />
              <CrystalDateField value={quoteDraft.preferredDate} onChange={(preferredDate) => setQuoteDraft({ ...quoteDraft, preferredDate })} label="Fecha preferida" />
              <CrystalDateField value={quoteDraft.alternativeDate} onChange={(alternativeDate) => setQuoteDraft({ ...quoteDraft, alternativeDate })} label="Fecha alternativa" />
              <QuoteInput label="Hora de inicio" type="time" value={quoteDraft.preferredStartTime} onChange={(preferredStartTime) => setQuoteDraft({ ...quoteDraft, preferredStartTime })} />
              <QuoteInput label="Hora de término" type="time" value={quoteDraft.preferredEndTime} onChange={(preferredEndTime) => setQuoteDraft({ ...quoteDraft, preferredEndTime })} />
              <ControlEntityPicker label="Espacio publicado (opcional)" value={quoteDraft.venueSpaceId} options={venues.map((venue) => ({ id: venue.id, label: venue.name, description: [venue.capacity ? `${venue.capacity} personas` : '', venue.dimensions].filter(Boolean).join(' · ') }))} onChange={(venueSpaceId) => { const venue = venues.find((item) => item.id === venueSpaceId); setQuoteDraft((current) => ({ ...current, venueSpaceId, venueSpaceName: venue?.name ?? current.venueSpaceName })) }} />
              <QuoteInput label="Espacio o sede descrita" value={quoteDraft.venueSpaceName} onChange={(venueSpaceName) => setQuoteDraft({ ...quoteDraft, venueSpaceName })} />
              <label><span className="mb-2 block text-[10px] font-semibold uppercase text-[var(--color-muted)]">¿Requiere comida?</span><CrystalSelect value={quoteDraft.foodRequired} onChange={(foodRequired) => setQuoteDraft({ ...quoteDraft, foodRequired: foodRequired as QuoteRequestRecord['foodRequired'] })}><option value="advice">Requiere asesoría</option><option value="yes">Sí</option><option value="no">No</option></CrystalSelect></label>
              <QuoteInput label="Tipo de comida o menú" value={quoteDraft.foodType} onChange={(foodType) => setQuoteDraft({ ...quoteDraft, foodType })} />
              <label><span className="mb-2 block text-[10px] font-semibold uppercase text-[var(--color-muted)]">¿Requiere vino?</span><CrystalSelect value={quoteDraft.wineRequired} onChange={(wineRequired) => setQuoteDraft({ ...quoteDraft, wineRequired: wineRequired as QuoteRequestRecord['wineRequired'] })}><option value="advice">Requiere asesoría</option><option value="yes">Sí</option><option value="no">No</option></CrystalSelect></label>
              <QuoteInput label="Vino o propuesta solicitada" value={quoteDraft.wineOption} onChange={(wineOption) => setQuoteDraft({ ...quoteDraft, wineOption })} />
              <QuoteInput label="Servicios solicitados (separados por coma)" value={quoteDraft.requestedServices} onChange={(requestedServices) => setQuoteDraft({ ...quoteDraft, requestedServices })} wide />
              <QuoteTextArea label="Notas del cliente" value={quoteDraft.notes} onChange={(notes) => setQuoteDraft({ ...quoteDraft, notes })} />
              <QuoteTextArea label="Notas internas" value={quoteDraft.adminNotes} onChange={(adminNotesValue) => setQuoteDraft({ ...quoteDraft, adminNotes: adminNotesValue })} />
            </div>
            <footer className="control-form-actions sticky bottom-0 mt-6 border-t border-[var(--color-line)] bg-[rgba(249,242,232,0.96)] py-4"><button type="button" onClick={() => setFormMode(null)} className="min-h-11 rounded-xl border border-[var(--color-line)] px-5 text-sm font-semibold">Cancelar</button><button type="submit" disabled={saving === formMode} className="min-h-11 rounded-xl bg-[var(--color-burgundy)] px-5 text-sm font-semibold text-white disabled:opacity-55">{saving === formMode ? 'Guardando...' : formMode === 'create' ? 'Crear cotización' : 'Guardar expediente'}</button></footer>
          </form>
        </div>
      ) : null}

      <QuickCustomerDialog open={customerDialogOpen} token={token} onClose={() => setCustomerDialogOpen(false)} onCreated={(customer) => { setCustomers((current) => [customer, ...current]); const names = customer.displayName.trim().split(/\s+/); setQuoteDraft((current) => ({ ...current, customerId: customer.id, contactFirstName: names[0] ?? '', contactLastName: names.slice(1).join(' ') || '-', contactEmail: customer.email ?? '', contactPhone: customer.phone ?? '' })) }} />
    </div>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="control-metric rounded-[1.25rem] border border-[rgba(200,171,136,0.45)] bg-white/60 backdrop-blur-2xl">
      <p className="text-[11px] text-[var(--color-muted-strong)]">{label}</p>
      <p className="control-metric__value font-semibold text-[var(--color-ink)]">{value}</p>
    </div>
  )
}

function Detail({ label, value, icon, wide }: { label: string; value: string; icon?: ReactNode; wide?: boolean }) {
  return (
    <div className={`control-detail-item border-b border-[rgba(200,171,136,0.26)] px-1 py-2 ${wide ? 'md:col-span-2' : ''}`}>
      <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-gold)]">
        {icon}
        {label}
      </dt>
      <dd className="mt-1 whitespace-pre-wrap text-sm text-[var(--color-ink)]">{value}</dd>
    </div>
  )
}

function QuoteInput({ label, value, onChange, type = 'text', required, wide }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean; wide?: boolean }) {
  return <label className={wide ? 'md:col-span-2' : ''}><span className="mb-2 block text-[10px] font-semibold uppercase text-[var(--color-muted)]">{label}{required ? ' *' : ''}</span><input type={type} min={type === 'number' ? '1' : undefined} required={required} value={value} onChange={(event) => onChange(event.target.value)} className="min-h-11 w-full rounded-xl border border-[var(--color-line)] bg-white px-4 text-sm text-[var(--color-ink)] outline-none" /></label>
}

function QuoteTextArea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label><span className="mb-2 block text-[10px] font-semibold uppercase text-[var(--color-muted)]">{label}</span><textarea rows={3} value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-xl border border-[var(--color-line)] bg-white px-4 py-3 text-sm text-[var(--color-ink)] outline-none" /></label>
}
