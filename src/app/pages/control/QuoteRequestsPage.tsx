import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useParams } from 'react-router-dom'
import {
  Loader2,
  Mail,
  Phone,
  RefreshCw,
  Save,
  UserRound,
} from 'lucide-react'
import { useAuth } from '../../../contexts/AuthContext'
import { quoteRequestsClient, type QuoteRequestRecord } from '../../../services/commercial.service'
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
  const { session } = useAuth()
  const token = session?.access_token
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
      const preferred = quoteId ? response.data.find((item) => item.id === quoteId) : null
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

  const counts = useMemo(() => ({
    total: items.length,
    new: items.filter((item) => item.status === 'new').length,
    inProgress: items.filter((item) => item.status === 'contacted' || item.status === 'in_progress').length,
    won: items.filter((item) => item.status === 'won').length,
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

  return (
    <div className="control-page control-page--quotes space-y-6">
      <header className="control-page-title flex flex-wrap items-end justify-between gap-4">
	        <div>
	          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-muted)]">Operación comercial</p>
	          <h1 className="mt-2 text-[34px] leading-none text-[var(--color-ink)]" style={{ fontFamily: 'var(--font-display)' }}>Cotizaciones</h1>
	          <p className="mt-2 text-[var(--color-muted-strong)]">Solicitudes con seguimiento, propuesta y envío por correo.</p>
	        </div>
        <button type="button" onClick={() => void load()} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[rgba(200,171,136,0.55)] bg-white/50 px-5 text-sm font-medium text-[var(--color-burgundy)] backdrop-blur-xl">
          <RefreshCw size={16} /> Actualizar
        </button>
      </header>

      <section className="control-metrics-strip grid gap-4 md:grid-cols-4">
        <Metric label="Solicitudes" value={counts.total} />
        <Metric label="Nuevas" value={counts.new} />
        <Metric label="Seguimiento" value={counts.inProgress} />
        <Metric label="Ganadas" value={counts.won} />
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
                <span className="rounded-full bg-[rgba(138,31,45,0.09)] px-4 py-2 text-sm font-semibold text-[var(--color-burgundy)]">{statusLabel(selected.status)}</span>
              </div>

              <section className="grid gap-3 md:grid-cols-2">
                <Detail icon={<UserRound size={16} />} label="Cliente" value={`${selected.contactFirstName ?? ''} ${selected.contactLastName ?? ''}`.trim() || selected.customerName} />
                <Detail icon={<Phone size={16} />} label="Teléfono" value={selected.contactPhone || 'Sin teléfono'} />
                <Detail icon={<Mail size={16} />} label="Correo" value={selected.contactEmail || 'Sin correo'} />
                <Detail label="Fecha solicitada" value={dateLabel(selected.preferredDate)} />
                <Detail label="Personas" value={String(selected.guestCount)} />
                <Detail label="Espacio" value={selected.venueSpaceName || 'Por definir'} />
                <Detail label="Comida" value={selected.foodPreference || 'Sin preferencia'} />
                <Detail label="Vino" value={selected.winePreference || 'Sin preferencia'} />
                <Detail label="Servicios" value={selected.requestedServices?.length ? selected.requestedServices.join(', ') : 'Sin servicios capturados'} wide />
                <Detail label="Presupuesto" value={selected.budgetRange || 'No indicado'} />
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
