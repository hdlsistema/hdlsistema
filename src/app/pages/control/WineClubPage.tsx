import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { BadgeCheck, Coins, Download, Plus, RefreshCw, Search, Users } from 'lucide-react'
import { useAuth } from '../../../contexts/AuthContext'
import { membershipsClient, type MembershipRecord } from '../../../services/phase7e.service'
import { customersClient, type CustomerRecord } from '../../../services/customers.service'
import { adminContentClient, type ContentRecord } from '../../../services/content.service'
import { SectionTitle } from '../../components/shared/SectionTitle'
import { StatusBadge } from '../../components/shared/StatusBadge'
import { CrystalSelect } from '../../components/shared/CrystalSelect'
import { ControlConfirmDialog } from '../../components/control/ControlConfirmDialog'
import { ControlEntityPicker } from '../../components/control/ControlEntityPicker'
import { QuickCustomerDialog } from '../../components/control/QuickCustomerDialog'
import { ActionButton, Field, Metric, ModalForm, StateBlock } from './phase7e/ControlOperationsUi'
import { downloadCsv, formatDate, operationKey } from './phase7e/operationsUtils'

const emptyForm = { customerId: '', planId: '', startDate: '' }
const emptyPoints = { points: '0', reason: '' }

type PendingWineClubAction = {
  title: string
  message: string
  confirmLabel: string
  tone?: 'default' | 'danger'
  action: () => Promise<unknown>
  success: string
}

function canWrite(roles: string[]) {
  return roles.some((role) => ['super_admin', 'admin', 'finance'].includes(role))
}

function labelStatus(status: string) {
  const labels: Record<string, string> = {
    pending: 'Pendiente',
    active: 'Activa',
    paused: 'Pausada',
    cancelled: 'Cancelada',
    expired: 'Expirada',
  }
  return labels[status] ?? status
}

export function WineClubPage() {
  const { session, roles } = useAuth()
  const token = session?.access_token
  const writable = canWrite(roles)
  const [memberships, setMemberships] = useState<MembershipRecord[]>([])
  const [customers, setCustomers] = useState<CustomerRecord[]>([])
  const [plans, setPlans] = useState<ContentRecord[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [points, setPoints] = useState(emptyPoints)
  const [pendingAction, setPendingAction] = useState<PendingWineClubAction | null>(null)

  const selected = useMemo(() => memberships.find((item) => item.id === selectedId) ?? memberships[0] ?? null, [memberships, selectedId])
  const activeCount = memberships.filter((item) => item.status === 'active').length
  const totalPoints = memberships.reduce((sum, item) => sum + item.pointsBalance, 0)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await membershipsClient.list(token, { search: search || undefined, status: status || undefined, perPage: 100 })
      setMemberships(response.data)
      setSelectedId((current) => current ?? response.data[0]?.id ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible cargar Wine Club.')
    } finally {
      setLoading(false)
    }
  }, [search, status, token])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!formOpen) return
    Promise.all([
      customersClient.list(token, { perPage: 100, status: 'published' }),
      adminContentClient.list('membership-plans', token, { perPage: 100 }),
    ]).then(([customerResponse, planResponse]) => {
      setCustomers(customerResponse.data)
      setPlans(planResponse.data.filter((plan) => !['archived', 'inactive', 'cancelled'].includes(String(plan.status ?? ''))))
    }).catch((err) => setError(err instanceof Error ? err.message : 'No fue posible cargar clientes y planes.'))
  }, [formOpen, token])

  async function submitMembership(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving) return
    setSaving(true)
    setError('')
    try {
      const response = await membershipsClient.create(token, {
        customerId: form.customerId,
        planId: form.planId,
        startDate: form.startDate ? new Date(form.startDate).toISOString() : undefined,
        idempotencyKey: operationKey('MEMBERSHIP'),
      })
      setSelectedId(response.data.id)
      setForm(emptyForm)
      setFormOpen(false)
      setToast('Membresía creada.')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible crear la membresía.')
    } finally {
      setSaving(false)
    }
  }

  function runAction(action: string, label: string, confirmText: string, reason?: string) {
    if (!selected || !writable || saving) return
    setPendingAction({
      title: label.replace('.', ''),
      message: confirmText,
      confirmLabel: 'Confirmar',
      tone: action === 'cancel' ? 'danger' : 'default',
      success: label,
      action: () => membershipsClient.action(token, selected.id, action, reason),
    })
  }

  async function confirmPendingAction() {
    if (!pendingAction || saving) return
    setSaving(true)
    setError('')
    try {
      await pendingAction.action()
      setToast(pendingAction.success)
      setPendingAction(null)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible completar la acción.')
    } finally {
      setSaving(false)
    }
  }

  async function adjustPoints(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selected || !writable || saving) return
    const pointsValue = Number(points.points)
    const reasonValue = points.reason
    setPendingAction({
      title: 'Registrar ajuste de puntos',
      message: 'El movimiento quedará guardado en el historial del cliente.',
      confirmLabel: 'Registrar ajuste',
      success: 'Puntos ajustados con historial.',
      action: async () => {
        await membershipsClient.adjustLoyalty(token, selected.id, {
          points: pointsValue,
          reason: reasonValue,
          idempotencyKey: operationKey('LOYALTY'),
        })
        setPoints(emptyPoints)
      },
    })
  }

  async function exportCsv() {
    try {
      await downloadCsv(await membershipsClient.exportCsv(token, { search: search || undefined, status: status || undefined }), 'wine-club-hacienda-de-letras.csv')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible exportar Wine Club.')
    }
  }

  return (
    <div className="control-page control-page--wineclub min-w-0 space-y-6">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <SectionTitle eyebrow="Wine Club" title="Wine Club" subtitle="Membresías, beneficios, puntos e historial operativo." />
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={load} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--color-line)] bg-[var(--color-panel)] px-4 text-sm font-semibold text-[var(--color-ink)]"><RefreshCw size={16} />Reintentar</button>
          <button type="button" onClick={exportCsv} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--color-line)] bg-[var(--color-panel)] px-4 text-sm font-semibold text-[var(--color-ink)]"><Download size={16} />Exportar CSV</button>
          <button type="button" onClick={() => setFormOpen(true)} disabled={!writable} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--color-burgundy)] px-5 text-sm font-semibold text-white disabled:opacity-50"><Plus size={16} />Asignar membresía</button>
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-3">
        <Metric icon={Users} label="Membresías" value={String(memberships.length)} />
        <Metric icon={BadgeCheck} label="Activas" value={String(activeCount)} />
        <Metric icon={Coins} label="Puntos" value={String(totalPoints)} />
      </section>

      <section className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-panel)] p-4 shadow-[var(--shadow-card)]">
        <div className="grid gap-3 md:grid-cols-[1fr_220px_auto]">
          <label className="flex min-h-11 items-center gap-3 rounded-xl border border-[var(--color-line)] bg-[var(--color-panel-strong)] px-4">
            <Search size={16} className="text-[var(--color-muted)]" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar folio de membresía..." className="min-w-0 flex-1 bg-transparent text-sm text-[var(--color-ink)] outline-none" />
          </label>
          <CrystalSelect value={status} onChange={setStatus}>
            <option value="">Todos los estados</option>
            <option value="pending">Pendiente</option>
            <option value="active">Activa</option>
            <option value="paused">Pausada</option>
            <option value="cancelled">Cancelada</option>
            <option value="expired">Expirada</option>
          </CrystalSelect>
          <button type="button" onClick={() => { setSearch(''); setStatus('') }} className="min-h-11 rounded-xl border border-[var(--color-line)] px-4 text-sm font-semibold text-[var(--color-burgundy)]">Limpiar</button>
        </div>
      </section>

      {error ? <div className="rounded-[var(--radius-card)] border border-[#ead8c5] bg-[#fff7ed] p-4 text-sm text-[#8a4b16]">{error}</div> : null}

      <section className="grid gap-5 2xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.9fr)]">
        <div className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-panel)] shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between border-b border-[var(--color-line)] px-5 py-4">
            <h3 className="text-lg font-semibold text-[var(--color-ink)]">Membresías de clientes</h3>
            <span className="rounded-full bg-[var(--color-soft)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">{memberships.length} registros</span>
          </div>
          {loading ? <StateBlock text="Cargando membresías..." /> : memberships.length === 0 ? <StateBlock title="Sin membresías" text="Asigna una membresía a un cliente existente." /> : (
            <div className="divide-y divide-[var(--color-line)]">
              {memberships.map((item) => (
                <button key={item.id} type="button" onClick={() => setSelectedId(item.id)} className="grid w-full gap-4 px-5 py-4 text-left lg:grid-cols-[1fr_0.8fr_0.5fr_auto]" style={{ backgroundColor: selected?.id === item.id ? 'rgba(180,138,85,0.12)' : 'transparent' }}>
                  <div className="min-w-0"><p className="truncate text-sm font-semibold text-[var(--color-ink)]">{item.membershipNumber}</p><p className="mt-1 truncate text-xs text-[var(--color-muted)]">{item.customerName || 'Cliente sin nombre'}</p></div>
                  <p className="text-xs text-[var(--color-muted)]">{item.planName ?? 'Sin plan'}</p>
                  <p className="text-xs font-semibold text-[var(--color-ink)]">{item.pointsBalance} pts</p>
                  <StatusBadge label={labelStatus(item.status)} />
                </button>
              ))}
            </div>
          )}
        </div>

        {selected ? (
          <aside className="space-y-4">
            <article className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-panel)] p-5 shadow-[var(--shadow-card)]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-gold)]">Detalle</p>
              <h3 className="mt-2 text-2xl text-[var(--color-burgundy)]" style={{ fontFamily: 'var(--font-display)' }}>{selected.membershipNumber}</h3>
              <div className="mt-5 grid gap-3 text-sm text-[var(--color-muted-strong)]">
                <p>Cliente: <strong>{selected.customerName || 'Sin nombre'}</strong></p>
                <p>Plan: <strong>{selected.planName ?? 'Sin plan'}</strong></p>
                <p>Renovación: <strong>{formatDate(selected.renewalDate)}</strong></p>
                <p>Expira: <strong>{formatDate(selected.expiresAt)}</strong></p>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <ActionButton disabled={!writable || selected.status !== 'pending'} onClick={() => runAction('activate', 'Membresía activada.', '¿Activar esta membresía?')}>Activar</ActionButton>
                <ActionButton disabled={!writable || selected.status !== 'active'} onClick={() => runAction('pause', 'Membresía pausada.', '¿Pausar esta membresía?', 'Pausa desde Centro de Control')}>Pausar</ActionButton>
                <ActionButton disabled={!writable || selected.status !== 'paused'} onClick={() => runAction('resume', 'Membresía reactivada.', '¿Reactivar esta membresía?')}>Reactivar</ActionButton>
                <ActionButton disabled={!writable || selected.status !== 'active'} onClick={() => runAction('renew', 'Membresía renovada.', '¿Renovar esta membresía?')}>Renovar</ActionButton>
                <ActionButton disabled={!writable || !['active', 'paused'].includes(selected.status)} onClick={() => runAction('cancel', 'Membresía cancelada.', '¿Cancelar esta membresía?', 'Cancelación desde Centro de Control')}>Cancelar</ActionButton>
              </div>
            </article>
            <form onSubmit={adjustPoints} className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-panel)] p-5 shadow-[var(--shadow-card)]">
              <h4 className="text-sm font-semibold text-[var(--color-ink)]">Ajuste de puntos</h4>
              <div className="mt-4 grid gap-3">
                <Field label="Puntos" type="number" value={points.points} onChange={(value) => setPoints({ ...points, points: value })} required />
                <Field label="Motivo" value={points.reason} onChange={(value) => setPoints({ ...points, reason: value })} required />
                <button type="submit" disabled={!writable || saving} className="min-h-11 rounded-xl bg-[var(--color-burgundy)] px-4 text-sm font-semibold text-white disabled:opacity-50">Registrar ajuste</button>
              </div>
            </form>
          </aside>
        ) : null}
      </section>

      {formOpen ? (
        <ModalForm title="Asignar membresía" onClose={() => setFormOpen(false)} onSubmit={submitMembership} saving={saving}>
          <ControlEntityPicker
            label="Cliente relacionado"
            value={form.customerId}
            options={customers.map((customer) => ({ id: customer.id, label: customer.displayName, description: [customer.email, customer.phone].filter(Boolean).join(' · ') || customer.customerNumber }))}
            onChange={(customerId) => setForm({ ...form, customerId })}
            actionLabel="Crear cliente nuevo"
            onAction={() => setCustomerDialogOpen(true)}
            required
          />
          <ControlEntityPicker
            label="Plan relacionado"
            value={form.planId}
            options={plans.map((plan) => ({ id: plan.id, label: String(plan.name ?? plan.code ?? 'Plan'), description: `${String(plan.billing_period ?? 'Periodo por definir')} · ${Number(plan.price ?? 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}` }))}
            onChange={(planId) => setForm({ ...form, planId })}
            emptyMessage="No hay planes activos"
            required
          />
          <Field label="Fecha de inicio" type="datetime" value={form.startDate} onChange={(value) => setForm({ ...form, startDate: value })} />
        </ModalForm>
      ) : null}

      <QuickCustomerDialog
        open={customerDialogOpen}
        token={token}
        onClose={() => setCustomerDialogOpen(false)}
        onCreated={(customer) => {
          setCustomers((current) => [customer, ...current.filter((item) => item.id !== customer.id)])
          setForm((current) => ({ ...current, customerId: customer.id }))
          setToast('Cliente creado y seleccionado.')
        }}
      />

      <ControlConfirmDialog
        open={Boolean(pendingAction)}
        title={pendingAction?.title ?? ''}
        message={pendingAction?.message ?? ''}
        confirmLabel={pendingAction?.confirmLabel}
        tone={pendingAction?.tone}
        busy={saving}
        onCancel={() => setPendingAction(null)}
        onConfirm={confirmPendingAction}
      />

      {toast ? <div className="fixed bottom-6 right-6 z-[140] rounded-[1rem] border border-[#cfddca] bg-white p-4 text-sm font-semibold text-[#5f7d63] shadow-[0_22px_50px_rgba(45,22,14,0.18)]">{toast}</div> : null}
    </div>
  )
}
