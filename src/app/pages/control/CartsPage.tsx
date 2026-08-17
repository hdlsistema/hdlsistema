import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ChevronRight, ExternalLink, RefreshCw, ShoppingCart, X } from 'lucide-react'
import { useAuth } from '../../../contexts/AuthContext'
import { appActivityAdminClient, type CustomerCartRecord } from '../../../services/appActivityAdmin.service'
import { SectionTitle } from '../../components/shared/SectionTitle'
import { CrystalDateField } from '../../components/shared/CrystalDateField'
import { CrystalSelect } from '../../components/shared/CrystalSelect'
import { eventLabel, money, statusLabel } from './controlCopy'

function inactivity(minutes: number) {
  if (minutes < 60) return `${minutes} min`
  if (minutes < 1_440) return `${Math.floor(minutes / 60)} h ${minutes % 60} min`
  return `${Math.floor(minutes / 1_440)} d`
}

function cartStatusLabel(status: string) {
  const labels: Record<string, string> = {
    active: 'Activo',
    checkout_started: 'Pago iniciado',
    abandoned: 'Abandonado',
    converted: 'Convertido',
  }
  return labels[status] ?? statusLabel(status)
}

function cartEventLabel(eventName: string) {
  return eventLabel(eventName)
}

export function CartsPage() {
  const { session } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [carts, setCarts] = useState<CustomerCartRecord[]>([])
  const [selected, setSelected] = useState<CustomerCartRecord | null>(null)
  const [status, setStatus] = useState('')
  const [customer, setCustomer] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [threshold, setThreshold] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await appActivityAdminClient.carts(session?.access_token, { perPage: 100, status: status || undefined, customer: customer || undefined, from: from || undefined, to: to || undefined })
      setCarts(response.data)
      setThreshold(response.configuration.abandonmentThresholdMinutes)
    } catch {
      setCarts([])
      setError('No fue posible consultar los carritos.')
    } finally {
      setLoading(false)
    }
  }, [customer, from, session?.access_token, status, to])

  const openCart = useCallback(async (id: string) => {
    setError('')
    try {
      const response = await appActivityAdminClient.cart(session?.access_token, id)
      setSelected(response.data)
    } catch {
      setError('No fue posible abrir el detalle del carrito.')
    }
  }, [session?.access_token])

  useEffect(() => { void load() }, [load])
  useEffect(() => {
    const cartId = searchParams.get('cartId')
    if (cartId && selected?.id !== cartId) void openCart(cartId)
  }, [openCart, searchParams, selected?.id])

  const closeCart = () => {
    setSelected(null)
    if (searchParams.has('cartId')) {
      const next = new URLSearchParams(searchParams)
      next.delete('cartId')
      setSearchParams(next, { replace: true })
    }
  }

  return (
    <div className="control-page control-page--carts space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end"><SectionTitle eyebrow="App Hacienda de Letras" title="Carritos" subtitle="Carritos, actividad asociada y seguimiento operativo." /><button type="button" onClick={() => void load()} className="inline-flex min-h-10 items-center justify-center gap-2 self-start rounded-full border border-[var(--color-line)] bg-[var(--color-panel)] px-4 text-sm font-medium"><RefreshCw size={16} className={loading ? 'animate-spin' : ''} />Actualizar</button></div>
      <div className="flex flex-wrap items-end gap-4 rounded-lg border border-[var(--color-line)] bg-[var(--color-panel)] p-4"><label className="grid min-w-[210px] gap-1 text-xs font-medium text-[var(--color-muted)]">Estado<CrystalSelect value={status} onChange={setStatus}><option value="">Todos</option><option value="active">Activo</option><option value="checkout_started">Pago iniciado</option><option value="abandoned">Abandonado</option><option value="converted">Convertido</option></CrystalSelect></label><label className="grid gap-1 text-xs font-medium text-[var(--color-muted)]">Cliente<input value={customer} onChange={(event) => setCustomer(event.target.value)} placeholder="Nombre o correo" className="min-h-10 rounded-md border border-[var(--color-line)] bg-white px-3 text-sm text-[var(--color-ink)]" /></label><CrystalDateField value={from} onChange={setFrom} label="Desde" placeholder="Inicio" className="min-w-[160px]" /><CrystalDateField value={to} onChange={setTo} label="Hasta" placeholder="Fin" className="min-w-[160px]" /><p className="text-sm text-[var(--color-muted)]">{threshold ? `Seguimiento: ${threshold} min sin actividad.` : 'Seguimiento de abandono pendiente de configurar.'}</p></div>
      {error ? <p className="rounded-lg border border-[#c87d6e] bg-[#fff7f3] px-4 py-3 text-sm text-[#7b3026]">{error}</p> : null}
      <section className="overflow-hidden rounded-lg border border-[var(--color-line)] bg-[var(--color-panel)] shadow-[var(--shadow-card)]"><div className="overflow-x-auto"><table className="min-w-[850px] w-full text-left text-sm"><thead className="border-b border-[var(--color-line)] text-xs font-medium uppercase tracking-[0.1em] text-[var(--color-muted)]"><tr><th className="px-4 py-3">Cliente</th><th className="px-4 py-3">Productos</th><th className="px-4 py-3">Valor</th><th className="px-4 py-3">Última actividad</th><th className="px-4 py-3">Estado</th><th className="px-4 py-3" /></tr></thead><tbody className="divide-y divide-[var(--color-line)]">{loading ? <tr><td colSpan={6} className="px-4 py-10 text-center text-[var(--color-muted)]">Cargando carritos...</td></tr> : null}{!loading && carts.length === 0 ? <tr><td colSpan={6} className="px-4 py-10 text-center text-[var(--color-muted)]"><ShoppingCart size={20} className="mx-auto mb-2" />No hay carritos para este filtro.</td></tr> : null}{!loading && carts.map((cart) => <tr key={cart.id}><td className="px-4 py-3"><p className="font-medium text-[var(--color-ink)]">{cart.customerName ?? 'Sesión sin identificar'}</p>{cart.customerEmail ? <p className="mt-1 text-xs text-[var(--color-muted)]">{cart.customerEmail}</p> : null}</td><td className="px-4 py-3 text-[var(--color-muted)]">{cart.quantity} artículos · {cart.items.length} partidas</td><td className="px-4 py-3 text-[var(--color-ink)]">{money(cart.estimatedValue, cart.currency)}</td><td className="px-4 py-3 text-[var(--color-muted)]">{inactivity(cart.inactiveMinutes)} sin actividad</td><td className="px-4 py-3"><span className="rounded-full bg-[var(--color-soft)] px-2 py-1 text-xs text-[var(--color-ink)]">{cartStatusLabel(cart.status)}</span></td><td className="px-4 py-3"><button type="button" onClick={() => void openCart(cart.id)} className="inline-flex items-center gap-1 text-[var(--color-burgundy)]">Detalle <ChevronRight size={15} /></button></td></tr>)}</tbody></table></div></section>
      {selected ? <aside className="fixed inset-y-0 right-0 z-[120] flex w-full max-w-lg flex-col border-l border-[var(--color-line)] bg-[var(--color-panel)] shadow-2xl"><header className="flex items-start justify-between gap-4 border-b border-[var(--color-line)] p-5"><div><p className="text-xs font-medium uppercase tracking-[0.12em] text-[var(--color-muted)]">Carrito</p><h2 className="mt-1 text-2xl text-[var(--color-ink)]" style={{ fontFamily: 'var(--font-display)' }}>{selected.customerName ?? 'Sesión sin identificar'}</h2><p className="mt-1 text-sm text-[var(--color-muted)]">{cartStatusLabel(selected.status)} · {inactivity(selected.inactiveMinutes)} sin actividad</p></div><button type="button" onClick={closeCart} className="rounded-full p-2 text-[var(--color-ink)]" aria-label="Cerrar detalle"><X size={20} /></button></header><div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-5"><section><h3 className="text-sm font-medium text-[var(--color-ink)]">Partidas</h3><div className="mt-3 divide-y divide-[var(--color-line)] rounded-lg border border-[var(--color-line)]">{selected.items.map((item) => <div key={item.id} className="flex justify-between gap-4 p-3 text-sm"><span>{item.name} · {item.quantity}</span><span>{money(item.subtotal, item.currency)}</span></div>)}</div><p className="mt-3 text-right text-sm font-medium text-[var(--color-ink)]">{money(selected.estimatedValue, selected.currency)}</p>{selected.relatedOrderId ? <a href={`/control/ordenes?orderId=${encodeURIComponent(selected.relatedOrderId)}`} className="mt-3 inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[var(--color-burgundy)] px-4 text-sm font-semibold text-white">Ver orden <ExternalLink size={14} /></a> : <p className="mt-2 text-xs text-[var(--color-muted)]">Aún no existe una orden relacionada para este carrito.</p>}</section><section><h3 className="text-sm font-medium text-[var(--color-ink)]">Actividad relevante</h3><div className="mt-3 space-y-2">{selected.events.length ? selected.events.map((event) => <div key={event.id} className="rounded-md bg-[var(--color-soft)] p-3 text-sm"><p className="text-[var(--color-ink)]">{cartEventLabel(event.eventName)}</p><p className="mt-1 text-xs text-[var(--color-muted)]">{new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(event.occurredAt))}</p></div>) : <p className="text-sm text-[var(--color-muted)]">Sin actividad adicional registrada.</p>}</div></section></div></aside> : null}
    </div>
  )
}
