import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Banknote,
  CalendarClock,
  CreditCard,
  Download,
  ExternalLink,
  FileText,
  Globe2,
  Package,
  Plus,
  ReceiptText,
  RefreshCw,
  RotateCcw,
  Search,
  Smartphone,
  Store,
  TrendingDown,
  TrendingUp,
  UtensilsCrossed,
  WalletCards,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useAuth } from '../../../contexts/AuthContext'
import { ordersClient, paymentsClient, type OrderRecord, type PaymentRecord } from '../../../services/commerce.service'
import { ControlConfirmDialog } from '../../components/control/ControlConfirmDialog'
import { ControlEntityPicker } from '../../components/control/ControlEntityPicker'
import { ControlStorageUpload } from '../../components/control/ControlStorageUpload'
import { SectionTitle } from '../../components/shared/SectionTitle'
import { CrystalSelect } from '../../components/shared/CrystalSelect'
import { dateTime, money, paymentReferenceLabel, statusLabel as safeStatusLabel } from './controlCopy'

type ManualPaymentForm = {
  orderId: string
  amount: string
  paymentMethodType: string
  paymentReference: string
  receiptStoragePath: string
  notes: string
}

type FlowPoint = {
  key: string
  label: string
  income: number
  refunds: number
  net: number
}

const emptyForm: ManualPaymentForm = {
  orderId: '',
  amount: '',
  paymentMethodType: 'transferencia',
  paymentReference: '',
  receiptStoragePath: '',
  notes: '',
}

function dateLabel(value?: string | null) {
  return dateTime(value)
}

function canFinance(roles: string[]) {
  return roles.some((role) => ['super_admin', 'admin', 'finance'].includes(role))
}

function statusLabel(status?: string | null) {
  return safeStatusLabel(status)
}

function paymentMethodLabel(payment: PaymentRecord) {
  const value = `${payment.method ?? ''} ${payment.provider ?? ''}`.toLowerCase()
  if (value.includes('card') || value.includes('tarjeta') || value.includes('stripe')) return 'Tarjeta'
  if (value.includes('transfer')) return 'Transferencia'
  if (value.includes('cash') || value.includes('efectivo')) return 'Efectivo'
  if (value.includes('terminal')) return 'Terminal'
  if (value.includes('deposit')) return 'Depósito'
  return payment.method ?? 'Pago registrado'
}

function metadataText(payment: PaymentRecord, key: string) {
  const value = payment.orderMetadata?.[key]
  return typeof value === 'string' ? value : ''
}

function paymentSource(payment: PaymentRecord) {
  const raw = `${payment.orderSource ?? ''} ${metadataText(payment, 'source')} ${metadataText(payment, 'checkoutMode')} ${metadataText(payment, 'fulfillmentMode')}`.toLowerCase()
  if (raw.includes('app') || raw.includes('mobile') || raw.includes('customer_app')) return 'App'
  if (raw.includes('web') || raw.includes('checkout') || raw.includes('landing')) return 'Web'
  if (raw.includes('restaurant') || raw.includes('restaurante') || raw.includes('menu')) return 'Restaurante'
  if (raw.includes('boutique') || raw.includes('mostrador') || raw.includes('tienda')) return 'Boutique'
  if (raw.includes('control') || raw.includes('manual') || raw.includes('hacienda') || raw.includes('whatsapp') || raw.includes('telefono')) return 'Hacienda / manual'
  return payment.orderSource || 'No registrado'
}

function sourceIcon(payment: PaymentRecord): LucideIcon {
  const source = paymentSource(payment).toLowerCase()
  if (source.includes('app')) return Smartphone
  if (source.includes('web')) return Globe2
  if (source.includes('restaurante')) return UtensilsCrossed
  if (source.includes('boutique')) return Store
  return WalletCards
}

function paymentStatusClass(status: string) {
  if (['paid', 'succeeded', 'completed'].includes(status)) return 'is-paid'
  if (['partially_refunded', 'refunded'].includes(status)) return 'is-refunded'
  if (['failed', 'cancelled', 'canceled'].includes(status)) return 'is-failed'
  return 'is-pending'
}

function cashFlowPoints(payments: PaymentRecord[]) {
  const map = new Map<string, FlowPoint>()
  for (const payment of payments) {
    const date = new Date(payment.paidAt ?? payment.createdAt)
    const key = Number.isNaN(date.getTime()) ? 'sin-fecha' : date.toISOString().slice(0, 10)
    const label = key === 'sin-fecha' ? 'Sin fecha' : date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })
    const current = map.get(key) ?? { key, label, income: 0, refunds: 0, net: 0 }
    if (['paid', 'partially_refunded', 'refunded'].includes(payment.status)) current.income += payment.amount
    current.refunds += payment.refundedAmount
    current.net = current.income - current.refunds
    map.set(key, current)
  }
  return Array.from(map.values()).sort((a, b) => a.key.localeCompare(b.key)).slice(-7)
}

export function PaymentsPage() {
  const [searchParams] = useSearchParams()
  const requestedPaymentId = searchParams.get('paymentId')
  const { session, roles } = useAuth()
  const token = session?.access_token
  const writable = canFinance(roles)
  const [payments, setPayments] = useState<PaymentRecord[]>([])
  const [orders, setOrders] = useState<OrderRecord[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState<ManualPaymentForm>(emptyForm)
  const [refundOpen, setRefundOpen] = useState(false)
  const [refundAmount, setRefundAmount] = useState('')
  const [refundReason, setRefundReason] = useState('')

  const selected = useMemo(
    () => payments.find((payment) => payment.id === selectedId) ?? payments[0] ?? null,
    [payments, selectedId],
  )

  const loadPayments = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await paymentsClient.list(token, { search: search || undefined, status: status || undefined, perPage: 100 })
      setPayments(response.data)
      setSelectedId((current) => {
        if (requestedPaymentId && response.data.some((payment) => payment.id === requestedPaymentId)) return requestedPaymentId
        return current ?? response.data[0]?.id ?? null
      })
      if (requestedPaymentId && response.data.some((payment) => payment.id === requestedPaymentId)) setDetailOpen(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible cargar pagos.')
    } finally {
      setLoading(false)
    }
  }, [requestedPaymentId, search, status, token])

  useEffect(() => {
    void loadPayments()
  }, [loadPayments])

  useEffect(() => {
    if (!formOpen) return
    ordersClient.list(token, { perPage: 100, status: 'pending_payment' })
      .then((response) => setOrders(response.data))
      .catch((err) => setError(err instanceof Error ? err.message : 'No fue posible cargar órdenes pendientes.'))
  }, [formOpen, token])

  const metrics = useMemo(() => {
    const income = payments.filter((payment) => ['paid', 'partially_refunded', 'refunded'].includes(payment.status)).reduce((sum, payment) => sum + payment.amount, 0)
    const refunded = payments.reduce((sum, payment) => sum + payment.refundedAmount, 0)
    return {
      income,
      refunded,
      net: income - refunded,
      stripe: payments.filter((payment) => payment.provider === 'stripe').length,
    }
  }, [payments])

  const flow = useMemo(() => cashFlowPoints(payments), [payments])
  const maxFlow = Math.max(...flow.map((point) => Math.max(point.income, point.refunds, point.net)), 1)

  const submitManualPayment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (saving) return
    setSaving(true)
    setError('')
    try {
      const response = await paymentsClient.manual(token, {
        orderId: form.orderId,
        amount: Number(form.amount),
        paymentMethodType: form.paymentMethodType,
        paymentReference: form.paymentReference,
        receiptStoragePath: form.receiptStoragePath || null,
        notes: form.notes || null,
        idempotencyKey: crypto.randomUUID(),
      })
      setSelectedId(response.data.id)
      setDetailOpen(true)
      setForm(emptyForm)
      setFormOpen(false)
      setToast('Pago manual registrado.')
      await loadPayments()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible registrar el pago.')
    } finally {
      setSaving(false)
    }
  }

  const refundSelected = async () => {
    if (!selected || !writable || saving) return
    if (!refundAmount || !refundReason.trim()) {
      setError('Captura monto y motivo del reembolso.')
      return
    }
    setSaving(true)
    try {
      await paymentsClient.refund(token, selected.id, { amount: Number(refundAmount), reason: refundReason.trim(), idempotencyKey: crypto.randomUUID() })
      setRefundOpen(false)
      setRefundAmount('')
      setRefundReason('')
      setToast('Reembolso registrado.')
      await loadPayments()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible registrar el reembolso.')
    } finally {
      setSaving(false)
    }
  }

  const openReceipt = async () => {
    if (!selected?.hasReceipt) return
    try {
      const response = await paymentsClient.receipt(token, selected.id)
      window.open(response.data.url, '_blank', 'noopener,noreferrer')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible abrir el comprobante.')
    }
  }

  const exportCsv = async () => {
    try {
      const response = await paymentsClient.exportCsv(token, { search: search || undefined, status: status || undefined })
      if (!response.ok) throw new Error('No fue posible exportar pagos.')
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'pagos-hacienda-de-letras.csv'
      link.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible exportar.')
    }
  }

  return (
    <div className="control-page control-page--payments min-w-0 space-y-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <SectionTitle eyebrow="Finanzas" title="Pagos" subtitle="Cash flow por transacción, canal, orden, comprobante y conciliación." />
        <div className="flex flex-wrap gap-2">
          <ActionButton onClick={loadPayments}><RefreshCw size={14} />Actualizar</ActionButton>
          <ActionButton onClick={exportCsv}><Download size={14} />Exportar</ActionButton>
          <button type="button" onClick={() => setFormOpen(true)} disabled={!writable} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-[#681126] px-4 text-xs font-semibold text-[#F7F2EA] disabled:opacity-50"><Plus size={14} />Pago manual</button>
        </div>
      </div>

      <section className="control-metrics-strip grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={TrendingUp} label="Ingresos cobrados" value={money(metrics.income)} />
        <Metric icon={TrendingDown} label="Reembolsos" value={money(metrics.refunded)} />
        <Metric icon={Banknote} label="Flujo neto" value={money(metrics.net)} />
        <Metric icon={CreditCard} label="Stripe" value={`${metrics.stripe} transacciones`} />
      </section>

      <section className="rounded-lg border border-[var(--color-line)] bg-[var(--color-panel)] p-3 shadow-[var(--shadow-card)]">
        <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_190px_auto]">
          <label className="flex min-h-10 items-center gap-2 rounded-md border border-[var(--color-line)] bg-white px-3">
            <Search size={14} className="text-[var(--color-muted)]" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar referencia, orden, método o proveedor..." className="min-w-0 flex-1 bg-transparent text-[12px] text-[var(--color-ink)] outline-none" />
          </label>
          <CrystalSelect value={status} onChange={setStatus} buttonClassName="control-compact-select-trigger" menuClassName="control-compact-select-menu">
            <option value="">Todos los estados</option>
            <option value="paid">Pagado</option>
            <option value="processing">Procesando</option>
            <option value="partially_refunded">Reembolso parcial</option>
            <option value="refunded">Reembolsado</option>
            <option value="failed">Fallido</option>
          </CrystalSelect>
          <button type="button" onClick={() => { setSearch(''); setStatus('') }} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-[var(--color-line)] bg-white px-3 text-xs font-semibold text-[#681126]"><X size={14} />Limpiar</button>
        </div>
      </section>

      {error ? <div className="rounded-lg border border-[#e2b6b6] bg-[#fff4f4] p-3 text-xs font-semibold text-[#8c2f2f]">{error}</div> : null}

      <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 rounded-lg border border-[var(--color-line)] bg-[var(--color-panel)] shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between border-b border-[var(--color-line)] px-4 py-3">
            <div>
              <h3 className="text-sm font-semibold text-[#252F37]">Transacciones recientes</h3>
              <p className="text-[10px] text-[var(--color-muted)]">Toca una línea para ver origen, compra, Stripe y comprobante.</p>
            </div>
            <span className="rounded-full bg-[#E8D8C8] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-[#252F37]">{payments.length} registros</span>
          </div>
          {loading ? <State text="Cargando pagos..." /> : payments.length === 0 ? <State title="Sin transacciones" text="Los pagos aparecerán cuando exista una orden pagada o comprobante registrado." /> : (
            <div className="divide-y divide-[var(--color-line)]">
              {payments.map((payment) => (
                <PaymentRowButton
                  key={payment.id}
                  payment={payment}
                  active={selected?.id === payment.id}
                  onClick={() => {
                    setSelectedId(payment.id)
                    setDetailOpen(true)
                  }}
                />
              ))}
            </div>
          )}
        </div>

        <aside className="grid gap-4">
          <section className="rounded-lg border border-[var(--color-line)] bg-[var(--color-panel)] p-4 shadow-[var(--shadow-card)]">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-[#252F37]">Cash flow</h3>
                <p className="text-[10px] text-[var(--color-muted)]">Ingresos y reembolsos por día.</p>
              </div>
              <CalendarClock size={17} className="text-[#681126]" />
            </div>
            <div className="grid gap-3">
              {flow.length ? flow.map((point) => (
                <div key={point.key} className="grid gap-1.5">
                  <div className="flex items-center justify-between gap-3 text-[10px]">
                    <span className="font-semibold text-[#252F37]">{point.label}</span>
                    <span className="text-[var(--color-muted)]">{money(point.net)}</span>
                  </div>
                  <FlowBar value={point.income} max={maxFlow} color="#681126" />
                  <FlowBar value={point.refunds} max={maxFlow} color="#B48A55" />
                </div>
              )) : <p className="text-xs text-[var(--color-muted)]">Sin flujo para el periodo.</p>}
            </div>
          </section>

          <section className="rounded-lg border border-[var(--color-line)] bg-[var(--color-panel)] p-4 shadow-[var(--shadow-card)]">
            <h3 className="text-sm font-semibold text-[#252F37]">Conciliación</h3>
            <div className="mt-3 grid gap-2">
              <MiniLine label="Tarjeta / Stripe" value={String(payments.filter((payment) => payment.provider === 'stripe').length)} />
              <MiniLine label="Manual / Hacienda" value={String(payments.filter((payment) => payment.provider !== 'stripe').length)} />
              <MiniLine label="Con comprobante" value={String(payments.filter((payment) => payment.hasReceipt).length)} />
              <MiniLine label="Fallidos" value={String(payments.filter((payment) => ['failed', 'cancelled', 'canceled'].includes(payment.status)).length)} />
            </div>
          </section>
        </aside>
      </section>

      {detailOpen && selected ? (
        <PaymentDetailDialog
          payment={selected}
          writable={writable}
          onClose={() => setDetailOpen(false)}
          onOpenReceipt={openReceipt}
          onRefund={() => {
            setRefundAmount('')
            setRefundReason('')
            setRefundOpen(true)
          }}
        />
      ) : null}

      {formOpen ? (
        <div className="control-form-overlay fixed inset-0 z-[150] flex items-center justify-center bg-[#210711]/68 p-4 backdrop-blur-sm">
          <button type="button" aria-label="Cerrar" onClick={() => setFormOpen(false)} className="absolute inset-0 cursor-default" />
          <form onSubmit={submitManualPayment} className="control-form-surface relative z-10 w-full max-w-4xl rounded-[1.25rem] border border-[var(--color-line)] bg-[var(--color-page)] p-6 shadow-[0_35px_90px_rgba(29,5,12,0.38)]" role="dialog" aria-modal="true" aria-label="Pago manual">
            <div className="control-form-header mb-6 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-[#681126]">Pago manual</h2>
              <button type="button" onClick={() => setFormOpen(false)} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--color-line)] bg-white text-[#681126]"><X size={18} /></button>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <ControlEntityPicker
                label="Orden relacionada"
                value={form.orderId}
                options={orders.map((order) => ({
                  id: order.id,
                  label: order.orderNumber,
                  description: `${order.customerName} · Pendiente ${money(Math.max((order.total ?? 0) - (order.paidAmount ?? 0), 0), order.currency)}`,
                  keywords: `${order.customerEmail ?? ''} ${order.source}`,
                }))}
                onChange={(orderId) => {
                  const order = orders.find((item) => item.id === orderId)
                  setForm({ ...form, orderId, amount: order ? String(Math.max((order.total ?? 0) - (order.paidAmount ?? 0), 0)) : form.amount })
                }}
                emptyMessage="No hay órdenes pendientes de pago"
                required
              />
              <Input label="Monto" type="number" min="0.01" value={form.amount} onChange={(value) => setForm({ ...form, amount: value })} required />
              <label className="block"><span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">Método *</span><CrystalSelect value={form.paymentMethodType} onChange={(paymentMethodType) => setForm({ ...form, paymentMethodType })}><option value="transferencia">Transferencia</option><option value="efectivo">Efectivo</option><option value="terminal">Terminal</option><option value="deposito">Depósito</option><option value="cortesia">Cortesía autorizada</option></CrystalSelect></label>
              <Input label="Referencia" value={form.paymentReference} onChange={(value) => setForm({ ...form, paymentReference: value })} required />
              <div className="md:col-span-2">
                <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">Comprobante</span>
                <ControlStorageUpload
                  bucket="documents"
                  pathPrefix={`payments/manual/${form.orderId || 'unassigned'}`}
                  value={form.receiptStoragePath}
                  onChange={(receiptStoragePath) => setForm({ ...form, receiptStoragePath })}
                  label="comprobante"
                  accept="application/pdf,image/jpeg,image/png,image/webp"
                  maxSizeMb={12}
                />
              </div>
              <Input label="Notas" value={form.notes} onChange={(value) => setForm({ ...form, notes: value })} />
            </div>
            <div className="control-form-actions mt-6">
              <button type="button" onClick={() => setFormOpen(false)} className="min-h-10 rounded-md border border-[var(--color-line)] px-4 text-xs font-semibold text-[var(--color-muted-strong)]">Cancelar</button>
              <button type="submit" disabled={saving} className="min-h-10 rounded-md bg-[#681126] px-4 text-xs font-semibold text-[#F7F2EA] disabled:opacity-60">{saving ? 'Guardando...' : 'Registrar pago'}</button>
            </div>
          </form>
        </div>
      ) : null}

      {toast ? <Toast value={toast} onClose={() => setToast('')} /> : null}
      <ControlConfirmDialog
        open={refundOpen}
        title="Registrar reembolso"
        message="El monto se validará contra el pago disponible antes de guardarse."
        confirmLabel="Registrar reembolso"
        tone="danger"
        busy={saving}
        onCancel={() => setRefundOpen(false)}
        onConfirm={refundSelected}
      >
        <div className="grid gap-3">
          <Input label="Monto a reembolsar" type="number" min="0.01" value={refundAmount} onChange={setRefundAmount} required />
          <Input label="Motivo" value={refundReason} onChange={setRefundReason} required />
        </div>
      </ControlConfirmDialog>
    </div>
  )
}

function PaymentRowButton({ payment, active, onClick }: { payment: PaymentRecord; active: boolean; onClick: () => void }) {
  const SourceIcon = sourceIcon(payment)
  return (
    <button type="button" onClick={onClick} className={`control-payment-row ${active ? 'is-active' : ''}`}>
      <span className="control-payment-row__icon"><SourceIcon size={16} /></span>
      <span className="min-w-0">
        <span className="control-payment-row__folio">{paymentReferenceLabel(payment.paymentReference, payment.orderNumber, payment.id)}</span>
        <span className="control-payment-row__meta">{payment.customerName || 'Cliente no registrado'} · {payment.itemSummary || 'Compra sin partidas visibles'}</span>
      </span>
      <span className="control-payment-row__source">{paymentSource(payment)}</span>
      <span className="control-payment-row__date">{dateLabel(payment.paidAt ?? payment.createdAt)}</span>
      <span className="control-payment-row__amount">{money(payment.amount, payment.currency)}</span>
      <PaymentPill status={payment.status} />
    </button>
  )
}

function PaymentDetailDialog({
  payment,
  writable,
  onClose,
  onOpenReceipt,
  onRefund,
}: {
  payment: PaymentRecord
  writable: boolean
  onClose: () => void
  onOpenReceipt: () => void
  onRefund: () => void
}) {
  const SourceIcon = sourceIcon(payment)
  return (
    <div className="control-form-overlay fixed inset-0 z-[150] flex items-center justify-center bg-[#210711]/68 p-4 backdrop-blur-sm">
      <button type="button" aria-label="Cerrar" onClick={onClose} className="absolute inset-0 cursor-default" />
      <section className="control-form-surface relative z-10 max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-[1.25rem] border border-[var(--color-line)] bg-[var(--color-page)] p-5 shadow-2xl" role="dialog" aria-modal="true" aria-label="Detalle de pago">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#B48A55]">Detalle de transacción</p>
            <h2 className="mt-1 truncate text-xl font-semibold text-[#681126]">{paymentReferenceLabel(payment.paymentReference, payment.orderNumber, payment.id)}</h2>
            <p className="mt-1 text-xs text-[var(--color-muted)]">{payment.customerName || 'Cliente no registrado'} · {payment.customerEmail || 'Sin correo'}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {payment.orderId ? <ActionButton onClick={() => { window.location.href = `/control/ordenes?orderId=${encodeURIComponent(payment.orderId)}` }}><ExternalLink size={14} />Abrir orden</ActionButton> : null}
            <ActionButton disabled={!payment.hasReceipt} onClick={onOpenReceipt}><FileText size={14} />Comprobante</ActionButton>
            <ActionButton disabled={!writable || !['paid', 'partially_refunded'].includes(payment.status)} onClick={onRefund}><RotateCcw size={14} />Reembolsar</ActionButton>
            <button type="button" onClick={onClose} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[var(--color-line)] bg-white text-[#681126]" aria-label="Cerrar"><X size={16} /></button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Detail icon={Banknote} label="Monto cobrado" value={money(payment.amount, payment.currency)} />
          <Detail icon={RotateCcw} label="Reembolsado" value={money(payment.refundedAmount, payment.currency)} />
          <Detail icon={CreditCard} label="Procesador" value={`${payment.provider}${payment.providerEnvironment ? ` · ${payment.providerEnvironment}` : ''}`} />
          <Detail icon={SourceIcon} label="Origen de compra" value={paymentSource(payment)} />
          <Detail icon={ReceiptText} label="Estado de pago" value={statusLabel(payment.status)} />
          <Detail icon={Package} label="Orden" value={payment.orderNumber ?? 'Sin orden visible'} />
          <Detail icon={CalendarClock} label="Fecha de pago" value={dateLabel(payment.paidAt ?? payment.createdAt)} />
          <Detail icon={WalletCards} label="Total del ticket" value={money(payment.orderTotal ?? payment.amount, payment.orderCurrency ?? payment.currency)} />
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="rounded-lg border border-[var(--color-line)] bg-white p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-[#252F37]">Qué compró</h3>
                <p className="text-[10px] text-[var(--color-muted)]">Partidas reales ligadas a la orden del pago.</p>
              </div>
              <span className="rounded-full bg-[#E8D8C8] px-2 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-[#252F37]">{payment.items?.length ?? 0} partidas</span>
            </div>
            <div className="grid gap-2">
              {payment.items?.length ? payment.items.map((item) => (
                <div key={item.id} className="grid grid-cols-[minmax(0,1fr)_80px_110px] gap-3 rounded-md border border-[var(--color-line)] bg-[#fffdfa] p-3 text-xs">
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-[#252F37]">{item.name}</span>
                    <span className="mt-0.5 block truncate text-[10px] text-[var(--color-muted)]">{item.itemType || 'concepto'}{item.sku ? ` · ${item.sku}` : ''}</span>
                  </span>
                  <span className="text-right text-[#252F37]">{item.quantity} pza.</span>
                  <span className="text-right font-semibold text-[#681126]">{money(item.subtotal, payment.currency)}</span>
                </div>
              )) : <p className="rounded-md border border-dashed border-[var(--color-line)] p-4 text-xs text-[var(--color-muted)]">La orden no tiene partidas visibles en este pago.</p>}
            </div>
          </section>

          <section className="rounded-lg border border-[var(--color-line)] bg-white p-4">
            <h3 className="text-sm font-semibold text-[#252F37]">Conciliación</h3>
            <div className="mt-3 grid gap-2">
              <MiniLine label="Método" value={paymentMethodLabel(payment)} />
              <MiniLine label="Referencia" value={payment.paymentReference || 'No registrada'} />
              <MiniLine label="Stripe intent" value={payment.provider === 'stripe' ? (payment.providerPaymentId || 'No registrado') : 'No aplica'} />
              <MiniLine label="Estado orden" value={payment.orderStatus ? statusLabel(payment.orderStatus) : 'No registrado'} />
              <MiniLine label="Orden creada" value={dateLabel(payment.orderCreatedAt)} />
              <MiniLine label="Falló en" value={payment.failedAt ? dateLabel(payment.failedAt) : 'No aplica'} />
              <MiniLine label="Notas" value={payment.notes || 'Sin notas'} />
            </div>
          </section>
        </div>
      </section>
    </div>
  )
}

function Metric({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <article className="control-metric rounded-lg border border-[var(--color-line)] bg-[var(--color-panel)] shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[11px] text-[var(--color-muted)]">{label}</p>
          <p className="control-metric__value truncate font-semibold text-[#252F37]">{value}</p>
        </div>
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-[#E8D8C8] text-[#681126]"><Icon size={16} /></span>
      </div>
    </article>
  )
}

function PaymentPill({ status }: { status: string }) {
  return <span className={`control-payment-pill ${paymentStatusClass(status)}`}>{statusLabel(status)}</span>
}

function Detail({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[var(--color-line)] bg-white p-3">
      <Icon size={15} className="mb-2 text-[#681126]" />
      <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#B48A55]">{label}</p>
      <p className="mt-1 break-words text-xs font-semibold text-[#252F37]">{value}</p>
    </div>
  )
}

function MiniLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-md bg-[#F7F2EA] px-3 py-2 text-xs">
      <span className="text-[var(--color-muted)]">{label}</span>
      <strong className="max-w-[58%] break-words text-right text-[#252F37]">{value}</strong>
    </div>
  )
}

function FlowBar({ value, max, color }: { value: number; max: number; color: string }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-[#E8D8C8]">
      <span className="block h-full rounded-full" style={{ width: `${Math.max(4, Math.min(100, (value / max) * 100))}%`, backgroundColor: color }} />
    </div>
  )
}

function State({ title, text }: { title?: string; text: string }) {
  return <div className="p-8 text-center">{title ? <p className="text-sm font-semibold text-[#252F37]">{title}</p> : null}<p className="mt-2 text-xs text-[var(--color-muted)]">{text}</p></div>
}

function ActionButton({ children, disabled, onClick }: { children: ReactNode; disabled?: boolean; onClick: () => void }) {
  return <button type="button" disabled={disabled} onClick={onClick} className="inline-flex min-h-9 items-center justify-center gap-2 rounded-md border border-[var(--color-line)] bg-white px-3 text-xs font-semibold text-[#681126] disabled:opacity-50">{children}</button>
}

function Input({ label, value, onChange, type = 'text', min, required }: { label: string; value: string; onChange: (value: string) => void; type?: string; min?: string; required?: boolean }) {
  return <label className="block"><span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">{label}</span><input type={type} min={min} required={required} value={value} onChange={(event) => onChange(event.target.value)} className="min-h-10 w-full rounded-md border border-[var(--color-line)] bg-white px-3 text-xs text-[var(--color-ink)] outline-none" /></label>
}

function Toast({ value, onClose }: { value: string; onClose: () => void }) {
  return <div className="fixed bottom-6 right-6 z-[140] rounded-lg border border-[rgba(37,47,55,0.24)] bg-white p-4 text-xs font-semibold text-[#252F37] shadow-[0_22px_50px_rgba(45,22,14,0.18)]">{value}<button type="button" onClick={onClose} className="ml-4 text-[var(--color-muted)]"><X size={14} /></button></div>
}
