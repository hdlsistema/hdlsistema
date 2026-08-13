import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Banknote, Download, ExternalLink, FileText, Plus, RefreshCw, RotateCcw, Search, X } from 'lucide-react'
import { useAuth } from '../../../contexts/AuthContext'
import { ordersClient, paymentsClient, type OrderRecord, type PaymentRecord } from '../../../services/commerce.service'
import { ControlConfirmDialog } from '../../components/control/ControlConfirmDialog'
import { ControlEntityPicker } from '../../components/control/ControlEntityPicker'
import { ControlStorageUpload } from '../../components/control/ControlStorageUpload'
import { SectionTitle } from '../../components/shared/SectionTitle'
import { StatusBadge } from '../../components/shared/StatusBadge'
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

function statusLabel(status: string) {
  return safeStatusLabel(status)
}

function paymentMethodLabel(payment: PaymentRecord) {
  const value = `${payment.method ?? ''} ${payment.provider ?? ''}`.toLowerCase()
  if (value.includes('card') || value.includes('tarjeta') || value.includes('stripe')) return 'Tarjeta'
  if (value.includes('transfer')) return 'Transferencia'
  if (value.includes('cash') || value.includes('efectivo')) return 'Efectivo'
  if (value.includes('terminal')) return 'Terminal'
  return payment.method ?? 'Pago registrado'
}

export function PaymentsPage() {
  const { session, roles } = useAuth()
  const token = session?.access_token
  const writable = canFinance(roles)
  const [payments, setPayments] = useState<PaymentRecord[]>([])
  const [orders, setOrders] = useState<OrderRecord[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
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
      setSelectedId((current) => current ?? response.data[0]?.id ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible cargar pagos.')
    } finally {
      setLoading(false)
    }
  }, [search, status, token])

  useEffect(() => {
    void loadPayments()
  }, [loadPayments])

  useEffect(() => {
    if (!formOpen) return
    ordersClient.list(token, { perPage: 100, status: 'pending_payment' })
      .then((response) => setOrders(response.data))
      .catch((err) => setError(err instanceof Error ? err.message : 'No fue posible cargar órdenes pendientes.'))
  }, [formOpen, token])

  const metrics = useMemo(() => ({
    paid: payments.filter((payment) => payment.status === 'paid').reduce((sum, payment) => sum + payment.amount, 0),
    refunded: payments.reduce((sum, payment) => sum + payment.refundedAmount, 0),
  }), [payments])

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
    <div className="control-page control-page--payments min-w-0 space-y-6">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <SectionTitle eyebrow="Finanzas" title="Pagos" subtitle="Cobros, comprobantes y seguimiento financiero por orden." />
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={loadPayments} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--color-line)] bg-[var(--color-panel)] px-4 text-sm font-semibold text-[var(--color-ink)]"><RefreshCw size={16} />Reintentar</button>
          <button type="button" onClick={exportCsv} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--color-line)] bg-[var(--color-panel)] px-4 text-sm font-semibold text-[var(--color-ink)]"><Download size={16} />Exportar CSV</button>
          <button type="button" onClick={() => setFormOpen(true)} disabled={!writable} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--color-burgundy)] px-5 text-sm font-semibold text-white disabled:opacity-50"><Plus size={16} />Pago manual</button>
        </div>
      </div>

      <section className="control-metrics-strip grid gap-4 sm:grid-cols-3">
        <Metric icon={Banknote} label="Pagos" value={String(payments.length)} />
        <Metric icon={Banknote} label="Cobrado" value={money(metrics.paid)} />
        <Metric icon={RotateCcw} label="Reembolsado" value={money(metrics.refunded)} />
      </section>

      <section className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-panel)] p-4 shadow-[var(--shadow-card)]">
        <div className="grid gap-3 md:grid-cols-[1fr_220px_auto]">
          <label className="flex min-h-11 items-center gap-3 rounded-xl border border-[var(--color-line)] bg-[var(--color-panel-strong)] px-4">
            <Search size={16} className="text-[var(--color-muted)]" />
	            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar referencia, orden o método..." className="min-w-0 flex-1 bg-transparent text-sm text-[var(--color-ink)] outline-none" />
          </label>
          <CrystalSelect value={status} onChange={setStatus}>
            <option value="">Todos los estados</option>
            <option value="paid">Pagado</option>
            <option value="partially_refunded">Reembolso parcial</option>
            <option value="refunded">Reembolsado</option>
            <option value="failed">Fallido</option>
          </CrystalSelect>
          <button type="button" onClick={() => { setSearch(''); setStatus('') }} className="min-h-11 rounded-xl border border-[var(--color-line)] px-4 text-sm font-semibold text-[var(--color-burgundy)]">Limpiar</button>
        </div>
      </section>

      {error ? <div className="rounded-[var(--radius-card)] border border-[#ead8c5] bg-[#fff7ed] p-4 text-sm text-[#8a4b16]">{error}</div> : null}

      <section className="min-w-0 space-y-4">
        <div className="control-master-list min-w-0 overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-panel)] shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between border-b border-[var(--color-line)] px-5 py-4">
	            <h3 className="text-lg font-semibold text-[var(--color-ink)]">Pagos</h3>
            <span className="rounded-full bg-[var(--color-soft)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">{payments.length} registros</span>
          </div>
          <div className="overflow-x-auto"><div className="min-w-[820px]"><div className="control-table-head grid grid-cols-[150px_170px_minmax(160px,1fr)_120px_120px_150px] gap-3 border-b border-[var(--color-line)] bg-[var(--color-soft)] px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--color-muted)]">
            <span>Fecha</span><span>Orden</span><span>Cliente</span><span>Método</span><span>Monto</span><span>Estado</span>
          </div>
          {loading ? <State text="Cargando pagos..." /> : payments.length === 0 ? <State title="Sin pagos registrados" text="Registra pagos manuales solo cuando exista comprobante operativo." /> : (
            <div className="divide-y divide-[var(--color-line)]">
              {payments.map((payment) => (
                <button key={payment.id} type="button" onClick={() => setSelectedId(payment.id)} className="grid w-full grid-cols-[150px_170px_minmax(160px,1fr)_120px_120px_150px] items-center gap-3 px-4 py-3 text-left" style={{ backgroundColor: selected?.id === payment.id ? 'rgba(180,138,85,0.12)' : 'transparent' }}>
                  <p className="whitespace-nowrap text-[11px] text-[var(--color-muted)]">{dateLabel(payment.paidAt ?? payment.createdAt)}</p>
                  <p className="truncate text-xs font-semibold text-[var(--color-ink)]">{payment.orderNumber ?? 'Sin folio'}</p>
                  <p className="truncate text-xs text-[var(--color-ink)]">{payment.customerName ?? 'No identificado'}</p>
	                  <p className="truncate text-[11px] text-[var(--color-muted)]">{paymentMethodLabel(payment)}</p>
                  <p className="text-xs font-semibold text-[var(--color-ink)]">{money(payment.amount, payment.currency)}</p>
                  <StatusBadge label={statusLabel(payment.status)} />
                </button>
              ))}
            </div>
          )}
          </div></div>
        </div>

        {selected ? (
          <aside className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-panel)] p-5 shadow-[var(--shadow-card)]">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-gold)]">Detalle financiero seleccionado</p><h3 className="mt-2 break-all text-xl text-[var(--color-burgundy)]" style={{ fontFamily: 'var(--font-display)' }}>{paymentReferenceLabel(selected.paymentReference, selected.orderNumber, selected.id)}</h3></div><div className="flex flex-wrap gap-2">
              {selected.orderId ? <Action onClick={() => { window.location.href = `/control/ordenes?orderId=${encodeURIComponent(selected.orderId)}` }}><ExternalLink size={14} /> Abrir orden</Action> : null}
              <Action disabled={!selected.hasReceipt} onClick={openReceipt}><FileText size={14} /> Comprobante</Action>
              <Action disabled={!writable || !['paid', 'partially_refunded'].includes(selected.status)} onClick={() => { setRefundAmount(''); setRefundReason(''); setRefundOpen(true) }}><RotateCcw size={14} /> Reembolsar</Action>
            </div></div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-7">
              <Detail label="Cliente" value={selected.customerName ?? 'Cliente no identificado'} />
              <Detail label="Orden" value={selected.orderNumber ?? 'Sin folio'} />
              <Detail label="Estado" value={statusLabel(selected.status)} />
              <Detail label="Método" value={paymentMethodLabel(selected)} />
              <Detail label="Monto" value={money(selected.amount, selected.currency)} />
              <Detail label="Reembolsado" value={money(selected.refundedAmount, selected.currency)} />
              <Detail label="Fecha de pago" value={dateLabel(selected.paidAt)} />
            </div>
          </aside>
        ) : null}
      </section>

      {formOpen ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[#210711]/68 p-4 backdrop-blur-sm">
          <button type="button" aria-label="Cerrar" onClick={() => setFormOpen(false)} className="absolute inset-0 cursor-default" />
          <form onSubmit={submitManualPayment} className="relative z-10 w-full max-w-2xl rounded-[1.5rem] border border-[var(--color-line)] bg-[var(--color-page)] p-6 shadow-[0_35px_90px_rgba(29,5,12,0.38)]">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl text-[var(--color-burgundy)]" style={{ fontFamily: 'var(--font-display)' }}>Pago manual</h2>
              <button type="button" onClick={() => setFormOpen(false)} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--color-line)] bg-white text-[var(--color-burgundy)]"><X size={18} /></button>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <ControlEntityPicker
                label="Orden relacionada"
                value={form.orderId}
                options={orders.map((order) => ({
                  id: order.id,
                  label: order.orderNumber,
                  description: `${order.customerName} · Pendiente ${money(Math.max(order.total - order.paidAmount, 0), order.currency)}`,
                  keywords: `${order.customerEmail ?? ''} ${order.source}`,
                }))}
                onChange={(orderId) => {
                  const order = orders.find((item) => item.id === orderId)
                  setForm({ ...form, orderId, amount: order ? String(Math.max(order.total - order.paidAmount, 0)) : form.amount })
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
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setFormOpen(false)} className="min-h-11 rounded-xl border border-[var(--color-line)] px-5 text-sm font-semibold text-[var(--color-muted-strong)]">Cancelar</button>
              <button type="submit" disabled={saving} className="min-h-11 rounded-xl bg-[var(--color-burgundy)] px-5 text-sm font-semibold text-white disabled:opacity-60">{saving ? 'Guardando...' : 'Registrar pago'}</button>
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

function Metric({ icon: Icon, label, value }: { icon: typeof Banknote; label: string; value: string }) {
  return <article className="control-metric rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-panel)] shadow-[var(--shadow-card)]"><div className="flex items-center justify-between gap-3"><div><p className="text-[11px] text-[var(--color-muted)]">{label}</p><p className="control-metric__value font-semibold text-[var(--color-ink)]">{value}</p></div><span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-[var(--color-soft)] text-[var(--color-burgundy)]"><Icon size={16} /></span></div></article>
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-[var(--color-soft)] p-3"><p className="text-[10px] uppercase tracking-[0.12em] text-[var(--color-muted)]">{label}</p><p className="mt-1 text-sm font-semibold text-[var(--color-ink)]">{value}</p></div>
}

function State({ title, text }: { title?: string; text: string }) {
  return <div className="p-8 text-center">{title ? <p className="text-lg font-semibold text-[var(--color-ink)]">{title}</p> : null}<p className="mt-2 text-sm text-[var(--color-muted)]">{text}</p></div>
}

function Action({ children, disabled, onClick }: { children: React.ReactNode; disabled?: boolean; onClick: () => void }) {
  return <button type="button" disabled={disabled} onClick={onClick} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[var(--color-line)] px-3 text-xs font-semibold text-[var(--color-burgundy)] disabled:opacity-50">{children}</button>
}

function Input({ label, value, onChange, type = 'text', min, required }: { label: string; value: string; onChange: (value: string) => void; type?: string; min?: string; required?: boolean }) {
  return <label className="block"><span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">{label}</span><input type={type} min={min} required={required} value={value} onChange={(event) => onChange(event.target.value)} className="min-h-11 w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-panel-strong)] px-4 text-sm text-[var(--color-ink)] outline-none" /></label>
}

function Toast({ value, onClose }: { value: string; onClose: () => void }) {
  return <div className="fixed bottom-6 right-6 z-[140] rounded-[1rem] border border-[#cfddca] bg-white p-4 text-sm font-semibold text-[#5f7d63] shadow-[0_22px_50px_rgba(45,22,14,0.18)]">{value}<button type="button" onClick={onClose} className="ml-4 text-[var(--color-muted)]"><X size={14} /></button></div>
}
