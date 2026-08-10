import { useCallback, useEffect, useState } from 'react'
import { Activity, RefreshCw } from 'lucide-react'
import { useAuth } from '../../../contexts/AuthContext'
import { appActivityAdminClient, type AppActivityRecord } from '../../../services/appActivityAdmin.service'
import { SectionTitle } from '../../components/shared/SectionTitle'

function dateTime(value: string) {
  return new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

function pretty(value: string) {
  return value.replaceAll('_', ' ')
}

export function AppActivityPage() {
  const { session } = useAuth()
  const [records, setRecords] = useState<AppActivityRecord[]>([])
  const [module, setModule] = useState('')
  const [eventName, setEventName] = useState('')
  const [customer, setCustomer] = useState('')
  const [result, setResult] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await appActivityAdminClient.list(session?.access_token, { perPage: 50, module: module || undefined, eventName: eventName || undefined, customer: customer || undefined, result: result || undefined, from: from || undefined, to: to || undefined })
      setRecords(response.data)
    } catch {
      setRecords([])
      setError('No fue posible consultar la actividad registrada de la App.')
    } finally {
      setLoading(false)
    }
  }, [customer, eventName, from, module, result, session?.access_token, to])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <SectionTitle eyebrow="App Hacienda de Letras" title="Actividad" subtitle="Bitácora operativa de interacciones relevantes, sin registrar datos sensibles." />
        <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex min-h-10 items-center justify-center gap-2 self-start rounded-full border border-[var(--color-line)] bg-[var(--color-panel)] px-4 text-sm font-medium text-[var(--color-ink)] disabled:opacity-60">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Actualizar
        </button>
      </div>

      <div className="flex flex-wrap gap-3 rounded-lg border border-[var(--color-line)] bg-[var(--color-panel)] p-4">
        <label className="grid gap-1 text-xs font-medium text-[var(--color-muted)]">Cliente
          <input value={customer} onChange={(event) => setCustomer(event.target.value)} placeholder="Nombre o correo" className="min-h-10 rounded-md border border-[var(--color-line)] bg-white px-3 text-sm text-[var(--color-ink)]" />
        </label>
        <label className="grid gap-1 text-xs font-medium text-[var(--color-muted)]">Módulo
          <select value={module} onChange={(event) => setModule(event.target.value)} className="min-h-10 rounded-md border border-[var(--color-line)] bg-white px-3 text-sm text-[var(--color-ink)]">
            <option value="">Todos</option><option value="account">Cuenta</option><option value="content">Contenido</option><option value="reservation">Reservaciones</option><option value="cart">Carrito</option><option value="checkout">Checkout</option><option value="payment">Pagos</option>
          </select>
        </label>
        <label className="grid gap-1 text-xs font-medium text-[var(--color-muted)]">Evento
          <input value={eventName} onChange={(event) => setEventName(event.target.value)} placeholder="Ej. cart_viewed" className="min-h-10 rounded-md border border-[var(--color-line)] bg-white px-3 text-sm text-[var(--color-ink)]" />
        </label>
        <label className="grid gap-1 text-xs font-medium text-[var(--color-muted)]">Resultado
          <select value={result} onChange={(event) => setResult(event.target.value)} className="min-h-10 rounded-md border border-[var(--color-line)] bg-white px-3 text-sm text-[var(--color-ink)]"><option value="">Todos</option><option value="started">Iniciado</option><option value="succeeded">Correcto</option><option value="processing">En proceso</option><option value="failed">Fallido</option><option value="cancelled">Cancelado</option></select>
        </label>
        <label className="grid gap-1 text-xs font-medium text-[var(--color-muted)]">Desde<input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="min-h-10 rounded-md border border-[var(--color-line)] bg-white px-3 text-sm text-[var(--color-ink)]" /></label>
        <label className="grid gap-1 text-xs font-medium text-[var(--color-muted)]">Hasta<input type="date" value={to} onChange={(event) => setTo(event.target.value)} className="min-h-10 rounded-md border border-[var(--color-line)] bg-white px-3 text-sm text-[var(--color-ink)]" /></label>
      </div>

      {error ? <p className="rounded-lg border border-[#c87d6e] bg-[#fff7f3] px-4 py-3 text-sm text-[#7b3026]">{error}</p> : null}
      <section className="overflow-hidden rounded-lg border border-[var(--color-line)] bg-[var(--color-panel)] shadow-[var(--shadow-card)]">
        <div className="overflow-x-auto">
          <table className="min-w-[780px] w-full text-left text-sm">
            <thead className="border-b border-[var(--color-line)] text-xs font-medium uppercase tracking-[0.1em] text-[var(--color-muted)]"><tr><th className="px-4 py-3">Fecha</th><th className="px-4 py-3">Cliente</th><th className="px-4 py-3">Evento</th><th className="px-4 py-3">Área</th><th className="px-4 py-3">Entidad</th><th className="px-4 py-3">Estado</th></tr></thead>
            <tbody className="divide-y divide-[var(--color-line)]">
              {loading ? <tr><td colSpan={6} className="px-4 py-10 text-center text-[var(--color-muted)]">Cargando bitácora...</td></tr> : null}
              {!loading && records.length === 0 ? <tr><td colSpan={6} className="px-4 py-10 text-center text-[var(--color-muted)]"><Activity size={20} className="mx-auto mb-2" />Aún no hay actividad de App registrada.</td></tr> : null}
              {!loading && records.map((record) => <tr key={record.id} className="align-top"><td className="px-4 py-3 text-[var(--color-muted)]">{dateTime(record.occurredAt)}</td><td className="px-4 py-3"><p className="font-medium text-[var(--color-ink)]">{record.customerName ?? 'Sesión sin identificar'}</p>{record.customerEmail ? <p className="mt-1 text-xs text-[var(--color-muted)]">{record.customerEmail}</p> : null}</td><td className="px-4 py-3 text-[var(--color-ink)]">{pretty(record.eventName)}</td><td className="px-4 py-3 text-[var(--color-muted)]">{pretty(record.module)}</td><td className="px-4 py-3 text-[var(--color-muted)]">{record.entityType ?? '—'}{record.entityId ? ` · ${record.entityId.slice(0, 8)}` : ''}</td><td className="px-4 py-3"><span className="rounded-full bg-[var(--color-soft)] px-2 py-1 text-xs text-[var(--color-ink)]">{pretty(record.status)}</span></td></tr>)}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
