import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CheckCircle2, CircleDashed, Loader2, RefreshCw } from 'lucide-react'
import { useAuth } from '../../../contexts/AuthContext'
import { quoteRequestsClient, type QuoteRequestRecord } from '../../../services/commercial.service'

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

const nextActions: Array<{ status: QuoteRequestRecord['status']; label: string }> = [
  { status: 'contacted', label: 'Marcar contactada' },
  { status: 'in_progress', label: 'En proceso' },
  { status: 'quoted', label: 'Cotizada' },
  { status: 'won', label: 'Ganada' },
  { status: 'lost', label: 'Perdida' },
  { status: 'cancelled', label: 'Cancelar' },
]

function statusLabel(status: string) {
  return statuses.find((item) => item.value === status)?.label ?? status
}

function dateLabel(value?: string | null) {
  if (!value) return 'Sin fecha'
  return new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium' }).format(new Date(`${value}T12:00:00`))
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
      setSelected((current) => {
        const preferred = quoteId ? response.data.find((item) => item.id === quoteId) : null
        if (preferred) return preferred
        if (current) return response.data.find((item) => item.id === current.id) ?? response.data[0] ?? null
        return response.data[0] ?? null
      })
    } catch {
      setItems([])
      setSelected(null)
      setError('No fue posible cargar cotizaciones.')
    } finally {
      setLoading(false)
    }
  }, [quoteId, search, status, token])

  useEffect(() => {
    void load()
  }, [load])

  const counts = useMemo(() => ({
    total: items.length,
    new: items.filter((item) => item.status === 'new').length,
    won: items.filter((item) => item.status === 'won').length,
  }), [items])

  const updateStatus = async (nextStatus: QuoteRequestRecord['status']) => {
    if (!selected) return
    setSaving(nextStatus)
    setError('')
    try {
      const response = await quoteRequestsClient.update(token, selected.id, { status: nextStatus })
      setSelected(response.data)
      setItems((current) => current.map((item) => item.id === response.data.id ? response.data : item))
    } catch {
      setError('No fue posible actualizar la cotización.')
    } finally {
      setSaving('')
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--color-muted)]">Operación comercial</p>
          <h1 className="mt-2 text-5xl text-[var(--color-ink)]" style={{ fontFamily: 'var(--font-display)' }}>Cotizaciones</h1>
          <p className="mt-2 text-[var(--color-muted-strong)]">Solicitudes reales de eventos sociales y empresariales desde la app.</p>
        </div>
        <button type="button" onClick={() => void load()} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[rgba(200,171,136,0.55)] bg-white/50 px-5 text-sm font-medium text-[var(--color-burgundy)] backdrop-blur-xl">
          <RefreshCw size={16} /> Actualizar
        </button>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <Metric label="Solicitudes" value={counts.total} />
        <Metric label="Nuevas" value={counts.new} />
        <Metric label="Ganadas" value={counts.won} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="rounded-[1.4rem] border border-[rgba(200,171,136,0.45)] bg-white/42 p-4 shadow-[0_24px_58px_rgba(84,43,23,0.08)] backdrop-blur-2xl">
          <div className="flex flex-wrap gap-2">
            {statuses.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setStatus(item.value)}
                className={`rounded-full px-4 py-2 text-sm ${status === item.value ? 'bg-[var(--color-burgundy)] text-white' : 'bg-white/62 text-[var(--color-muted-strong)]'}`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por folio, cliente, evento o teléfono..."
            className="mt-4 min-h-12 w-full rounded-full border border-[rgba(200,171,136,0.45)] bg-white/64 px-5 text-sm outline-none"
          />
          {error ? <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
          <div className="mt-4 overflow-hidden rounded-[1.1rem] border border-[rgba(200,171,136,0.32)] bg-white/48">
            {loading ? (
              <div className="flex min-h-44 items-center justify-center text-[var(--color-muted)]"><Loader2 className="animate-spin" /></div>
            ) : items.length === 0 ? (
              <div className="min-h-44 p-8 text-center text-[var(--color-muted)]">Sin cotizaciones para los filtros actuales.</div>
            ) : (
              <div className="divide-y divide-[rgba(200,171,136,0.25)]">
                {items.map((item) => (
                  <button key={item.id} type="button" onClick={() => setSelected(item)} className={`grid w-full gap-2 px-4 py-4 text-left md:grid-cols-[1fr_auto] ${selected?.id === item.id ? 'bg-[rgba(138,31,45,0.08)]' : 'hover:bg-white/50'}`}>
                    <span>
                      <span className="block text-sm font-semibold text-[var(--color-ink)]">{item.quoteNumber} · {item.customerName}</span>
                      <span className="mt-1 block text-sm text-[var(--color-muted-strong)]">{item.eventType} · {item.guestCount} personas · {dateLabel(item.preferredDate)}</span>
                    </span>
                    <span className="inline-flex h-8 items-center justify-center rounded-full bg-white/70 px-3 text-xs font-semibold text-[var(--color-burgundy)]">{statusLabel(item.status)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <aside className="rounded-[1.4rem] border border-[rgba(200,171,136,0.45)] bg-white/50 p-5 shadow-[0_24px_58px_rgba(84,43,23,0.08)] backdrop-blur-2xl">
          {selected ? (
            <div className="space-y-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-gold)]">{selected.quoteNumber}</p>
                <h2 className="mt-2 text-2xl text-[var(--color-ink)]" style={{ fontFamily: 'var(--font-display)' }}>{selected.eventType}</h2>
                <p className="mt-1 text-sm text-[var(--color-muted-strong)]">{selected.customerName}</p>
              </div>
              <dl className="grid gap-3 text-sm">
                <Detail label="Estado" value={statusLabel(selected.status)} />
                <Detail label="Fecha solicitada" value={dateLabel(selected.preferredDate)} />
                <Detail label="Personas" value={String(selected.guestCount)} />
                <Detail label="Espacio" value={selected.venueSpaceName || 'Por definir'} />
                <Detail label="Teléfono" value={selected.contactPhone} />
                <Detail label="Correo" value={selected.contactEmail} />
              </dl>
              <div className="grid gap-2">
                {nextActions.map((action) => (
                  <button key={action.status} type="button" onClick={() => void updateStatus(action.status)} disabled={saving === action.status || selected.status === action.status} className="flex min-h-11 items-center justify-between rounded-full border border-[rgba(200,171,136,0.45)] bg-white/60 px-4 text-sm font-medium text-[var(--color-burgundy)] disabled:opacity-55">
                    {action.label}
                    {saving === action.status ? <Loader2 className="animate-spin" size={16} /> : selected.status === action.status ? <CheckCircle2 size={16} /> : <CircleDashed size={16} />}
                  </button>
                ))}
              </div>
              <Link to={`/control/cotizaciones/${selected.id}`} className="block text-xs text-[var(--color-muted)]">Deep link operativo listo para notificaciones.</Link>
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
    <div className="rounded-[1.25rem] border border-[rgba(200,171,136,0.45)] bg-white/44 p-5 backdrop-blur-2xl">
      <p className="text-sm text-[var(--color-muted-strong)]">{label}</p>
      <p className="mt-3 text-4xl text-[var(--color-ink)]">{value}</p>
    </div>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/58 px-4 py-3">
      <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-gold)]">{label}</dt>
      <dd className="mt-1 text-[var(--color-ink)]">{value}</dd>
    </div>
  )
}
