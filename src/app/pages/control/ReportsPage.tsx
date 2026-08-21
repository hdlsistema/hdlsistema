import { AlertTriangle, BedDouble, CalendarDays, CircleDollarSign, Download, Loader2, RefreshCw, ShoppingBag, TrendingUp } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../../contexts/AuthContext'
import { ordersClient, paymentsClient, type OrderRecord, type PaymentRecord } from '../../../services/commerce.service'
import { inventoryClient, type InventoryRecord } from '../../../services/phase7e.service'
import { lodgingClient, type LodgingStay } from '../../../services/lodging.service'
import { reservationsClient, type ReservationRecord } from '../../../services/operations.service'
import { CrystalDateField } from '../../components/shared/CrystalDateField'
import { SectionTitle } from '../../components/shared/SectionTitle'
import { money } from './controlCopy'

function isoDate(date: Date) { return date.toISOString().slice(0, 10) }
const current = new Date()
const monthStart = isoDate(new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth(), 1)))

export function ReportsPage() {
  const { session } = useAuth()
  const token = session?.access_token
  const [from, setFrom] = useState(monthStart)
  const [to, setTo] = useState(isoDate(current))
  const [orders, setOrders] = useState<OrderRecord[]>([])
  const [payments, setPayments] = useState<PaymentRecord[]>([])
  const [reservations, setReservations] = useState<ReservationRecord[]>([])
  const [inventory, setInventory] = useState<InventoryRecord[]>([])
  const [stays, setStays] = useState<LodgingStay[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const [orderResponse, paymentResponse, reservationResponse, inventoryResponse, stayResponse] = await Promise.all([
        ordersClient.list(token, { perPage: 100, from, to }),
        paymentsClient.list(token, { perPage: 100, from, to }),
        reservationsClient.list(token, { perPage: 100, from, to }),
        inventoryClient.summary(token, { perPage: 100 }),
        lodgingClient.stays(token),
      ])
      setOrders(orderResponse.data); setPayments(paymentResponse.data); setReservations(reservationResponse.data); setInventory(inventoryResponse.data.items); setStays(stayResponse.data)
    } catch (loadError) { setError(loadError instanceof Error ? loadError.message : 'No fue posible generar el reporte.') }
    finally { setLoading(false) }
  }, [from, to, token])
  useEffect(() => { void load() }, [load])

  const metrics = useMemo(() => {
    const paid = payments.filter((item) => ['paid', 'partially_refunded', 'refunded'].includes(item.status)).reduce((sum, item) => sum + item.amount - item.refundedAmount, 0)
    const receivable = orders.filter((item) => item.status === 'pending_payment').reduce((sum, item) => sum + Math.max((item.total ?? 0) - (item.paidAmount ?? 0), 0), 0)
    const activeReservations = reservations.filter((item) => ['pending', 'confirmed'].includes(item.status)).length
    const occupied = stays.filter((item) => item.status === 'checked_in').length
    return { paid, receivable, activeReservations, occupied, lowStock: inventory.filter((item) => item.lowStock).length }
  }, [inventory, orders, payments, reservations, stays])

  const channels = useMemo(() => Object.entries(orders.reduce<Record<string, { count: number; total: number }>>((map, order) => { const key = order.source || 'Sin canal'; const currentValue = map[key] ?? { count: 0, total: 0 }; map[key] = { count: currentValue.count + 1, total: currentValue.total + (order.total ?? 0) }; return map }, {})).sort((a, b) => b[1].total - a[1].total), [orders])
  const methods = useMemo(() => Object.entries(payments.reduce<Record<string, number>>((map, payment) => { const key = payment.method || payment.provider || 'Otro'; map[key] = (map[key] ?? 0) + payment.amount - payment.refundedAmount; return map }, {})).sort((a, b) => b[1] - a[1]), [payments])

  async function download(kind: 'orders' | 'payments' | 'reservations' | 'inventory') {
    try {
      const response = kind === 'orders' ? await ordersClient.exportCsv(token, { from, to }) : kind === 'payments' ? await paymentsClient.exportCsv(token, { from, to }) : kind === 'reservations' ? await reservationsClient.exportCsv(token, { from, to }) : await inventoryClient.exportCsv(token)
      if (!response.ok) throw new Error('No fue posible exportar el archivo.')
      const url = URL.createObjectURL(await response.blob()); const link = document.createElement('a'); link.href = url; link.download = `${kind}-hacienda-de-letras-${from}-${to}.csv`; link.click(); URL.revokeObjectURL(url)
    } catch (downloadError) { setError(downloadError instanceof Error ? downloadError.message : 'No fue posible exportar.') }
  }

  return <div className="control-page control-page--reports min-w-0 space-y-6">
    <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between"><SectionTitle eyebrow="Dirección" title="Reportes operativos" subtitle="Ventas, cobros, reservaciones, hospedaje e inventario con datos vivos del centro de control." /><button type="button" onClick={load} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--color-line)] bg-white px-4 text-xs font-semibold text-[var(--color-burgundy)]"><RefreshCw size={15} />Actualizar</button></div>
    <section className="rounded-xl border border-[var(--color-line)] bg-[var(--color-panel)] p-4 shadow-[var(--shadow-card)]"><div className="flex flex-wrap items-end gap-3"><CrystalDateField value={from} onChange={setFrom} label="Desde" /><CrystalDateField value={to} onChange={setTo} label="Hasta" /><p className="pb-2 text-xs text-[var(--color-muted)]">Periodo aplicado a ventas, pagos y reservaciones. Inventario y ocupación muestran estado actual.</p></div></section>
    {error ? <p className="rounded-xl border border-[#ead8c5] bg-[#fff7ed] p-4 text-sm text-[#8a4b16]">{error}</p> : null}
    {loading ? <div className="p-12"><Loader2 className="mx-auto animate-spin" /></div> : <><section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5"><Metric icon={CircleDollarSign} label="Cobro neto" value={money(metrics.paid)} /><Metric icon={ShoppingBag} label="Por cobrar" value={money(metrics.receivable)} /><Metric icon={CalendarDays} label="Reservaciones activas" value={String(metrics.activeReservations)} /><Metric icon={BedDouble} label="Cabañas ocupadas" value={String(metrics.occupied)} /><Metric icon={AlertTriangle} label="Stock bajo" value={String(metrics.lowStock)} alert={metrics.lowStock > 0} /></section>
      <section className="grid gap-5 xl:grid-cols-2"><Panel title="Venta por canal"><div className="space-y-2">{channels.length === 0 ? <Empty /> : channels.map(([channel, value]) => <Bar key={channel} label={channel} detail={`${value.count} orden(es)`} value={money(value.total)} ratio={value.total / Math.max(channels[0]?.[1].total ?? 1, 1)} />)}</div></Panel><Panel title="Cobro por método"><div className="space-y-2">{methods.length === 0 ? <Empty /> : methods.map(([method, amount]) => <Bar key={method} label={method} detail="Neto de reembolsos" value={money(amount)} ratio={amount / Math.max(methods[0]?.[1] ?? 1, 1)} />)}</div></Panel></section>
      <section className="rounded-xl border border-[var(--color-line)] bg-[var(--color-panel)] p-5 shadow-[var(--shadow-card)]"><div className="flex items-center gap-2"><TrendingUp size={17} className="text-[var(--color-burgundy)]" /><h2 className="text-base font-semibold">Exportaciones para conciliación</h2></div><div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Export label="Órdenes" onClick={() => void download('orders')} /><Export label="Pagos" onClick={() => void download('payments')} /><Export label="Reservaciones" onClick={() => void download('reservations')} /><Export label="Inventario actual" onClick={() => void download('inventory')} /></div></section>
      <section className="grid gap-3 md:grid-cols-3"><LinkCard to="/control/pagos" label="Revisar conciliación de pagos" /><LinkCard to="/control/disponibilidad?view=hospedaje" label="Revisar ocupación de cabañas" /><LinkCard to="/control/inventario" label="Atender alertas de inventario" /></section></>}
  </div>
}

function Metric({ icon: Icon, label, value, alert }: { icon: typeof CircleDollarSign; label: string; value: string; alert?: boolean }) { return <article className="rounded-xl border border-[var(--color-line)] bg-[var(--color-panel)] p-4 shadow-[var(--shadow-card)]"><div className="flex justify-between"><div><p className="text-[10px] uppercase text-[var(--color-muted)]">{label}</p><p className={`mt-1 text-xl font-semibold ${alert ? 'text-[var(--color-alert)]' : ''}`}>{value}</p></div><Icon size={18} className={alert ? 'text-[var(--color-alert)]' : 'text-[var(--color-burgundy)]'} /></div></article> }
function Panel({ title, children }: { title: string; children: ReactNode }) { return <article className="rounded-xl border border-[var(--color-line)] bg-[var(--color-panel)] p-5 shadow-[var(--shadow-card)]"><h2 className="mb-4 text-base font-semibold">{title}</h2>{children}</article> }
function Bar({ label, detail, value, ratio }: { label: string; detail: string; value: string; ratio: number }) { return <div className="rounded-lg bg-[var(--color-soft)] p-3"><div className="flex justify-between gap-3 text-xs"><div><p className="font-semibold">{label}</p><p className="mt-1 text-[10px] text-[var(--color-muted)]">{detail}</p></div><p className="font-semibold">{value}</p></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white"><span className="block h-full rounded-full bg-[var(--color-burgundy)]" style={{ width: `${Math.max(3, Math.min(ratio * 100, 100))}%` }} /></div></div> }
function Empty() { return <p className="py-8 text-center text-sm text-[var(--color-muted)]">Sin datos para el periodo.</p> }
function Export({ label, onClick }: { label: string; onClick: () => void }) { return <button type="button" onClick={onClick} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[var(--color-line)] bg-white px-4 text-xs font-semibold text-[var(--color-burgundy)]"><Download size={15} />{label} CSV</button> }
function LinkCard({ to, label }: { to: string; label: string }) { return <Link to={to} className="rounded-xl border border-[var(--color-line)] bg-[var(--color-panel)] p-4 text-sm font-semibold text-[var(--color-burgundy)] shadow-[var(--shadow-card)]">{label}</Link> }
