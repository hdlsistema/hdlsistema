import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Download,
  FileClock,
  MessageSquarePlus,
  RefreshCw,
  Search,
  Users,
  X,
} from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../../../contexts/AuthContext'
import { API_BASE } from '../../../services/api'
import {
  availabilityClient,
  reservationsClient,
  type AvailabilitySlot,
  type ReservationHistoryItem,
  type ReservationRecord,
} from '../../../services/operations.service'
import { ControlConfirmDialog } from '../../components/control/ControlConfirmDialog'
import { SectionTitle } from '../../components/shared/SectionTitle'
import { StatusBadge } from '../../components/shared/StatusBadge'
import { CrystalSelect } from '../../components/shared/CrystalSelect'
import { useAppPreferences } from '../../context/AppPreferencesContext'
import { dateTime, money, statusLabel as safeStatusLabel } from './controlCopy'

type ReservationForm = {
  customerName: string
  customerEmail: string
  customerPhone: string
  experienceSlotId: string
  peopleCount: string
  status: 'pending' | 'confirmed'
  customerNotes: string
  internalNotes: string
  source: string
}

const emptyForm: ReservationForm = {
  customerName: '',
  customerEmail: '',
  customerPhone: '',
  experienceSlotId: '',
  peopleCount: '2',
  status: 'pending',
  customerNotes: '',
  internalNotes: '',
  source: 'Centro de control',
}

function canWrite(roles: string[]) {
  return roles.some((role) => ['super_admin', 'admin', 'operations'].includes(role))
}

function formatDateTime(value: string | null | undefined) {
  return value ? dateTime(value) : 'Sin horario'
}

function currency(value: number, code = 'MXN') {
  return money(value, code)
}

function statusLabel(status: ReservationRecord['status']) {
  return safeStatusLabel(status)
}

function historyStatusLabel(status?: string | null) {
  if (!status) return 'Inicio'
  return safeStatusLabel(status)
}

function channelLabel(source?: string | null) {
  const labels: Record<string, string> = {
    app: 'App',
    web: 'Web',
    admin: 'Centro de Control',
    control: 'Centro de Control',
    'Centro de control': 'Centro de Control',
  }
  if (!source) return 'Sin canal'
  return labels[source] ?? 'Operación'
}

type PendingReservationAction = {
  title: string
  message: string
  confirmLabel: string
  tone?: 'default' | 'danger'
  action: () => Promise<unknown>
  success: string
}

export function ReservationsPage() {
  const { isEnglish } = useAppPreferences()
  const { session, roles } = useAuth()
  const [searchParams] = useSearchParams()
  const token = session?.access_token
  const writable = canWrite(roles)
  const [items, setItems] = useState<ReservationRecord[]>([])
  const [slots, setSlots] = useState<AvailabilitySlot[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [history, setHistory] = useState<ReservationHistoryItem[]>([])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState<ReservationForm>(emptyForm)
  const [rescheduleSlotId, setRescheduleSlotId] = useState('')
  const [partySize, setPartySize] = useState('')
  const [note, setNote] = useState('')
  const [pendingAction, setPendingAction] = useState<PendingReservationAction | null>(null)

  const loadReservations = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [reservationResponse, slotResponse] = await Promise.all([
        reservationsClient.list(token, {
          search: search || undefined,
          status: status || undefined,
          perPage: 100,
        }),
        availabilityClient.slots(token, { availability: 'available' }),
      ])
      setItems(reservationResponse.data)
      setSlots(slotResponse.data)
      const requestedReservationId = searchParams.get('reservationId')
      setSelectedId((current) => {
        if (requestedReservationId && reservationResponse.data.some((item) => item.id === requestedReservationId)) return requestedReservationId
        return current ?? reservationResponse.data[0]?.id ?? null
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible cargar reservaciones.')
    } finally {
      setLoading(false)
    }
  }, [search, searchParams, status, token])

  useEffect(() => {
    void loadReservations()
  }, [loadReservations])

  useEffect(() => {
    const timer = window.setTimeout(() => void loadReservations(), 350)
    return () => window.clearTimeout(timer)
  }, [loadReservations])

  const selected = useMemo(
    () => items.find((item) => item.id === selectedId) ?? items[0] ?? null,
    [items, selectedId],
  )

  useEffect(() => {
    if (!selected?.id) {
      setHistory([])
      return
    }
    reservationsClient.history(token, selected.id)
      .then((response) => setHistory(response.data))
      .catch(() => setHistory([]))
  }, [selected?.id, token])

  const metrics = useMemo(() => ({
    confirmed: items.filter((item) => item.status === 'confirmed').length,
    pending: items.filter((item) => item.status === 'pending').length,
    cancelled: items.filter((item) => item.status === 'cancelled').length,
    people: items.reduce((sum, item) => sum + item.peopleCount, 0),
  }), [items])

  const submitReservation = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (saving) return
    setSaving(true)
    setError('')
    try {
      const response = await reservationsClient.create(token, {
        customerName: form.customerName,
        customerEmail: form.customerEmail,
        customerPhone: form.customerPhone,
        experienceSlotId: form.experienceSlotId,
        peopleCount: Number(form.peopleCount),
        status: form.status,
        customerNotes: form.customerNotes || null,
        internalNotes: form.internalNotes || null,
        source: form.source,
      })
      setForm(emptyForm)
      setFormOpen(false)
      setSelectedId(response.data.id)
      setToast('Reservación creada.')
      await loadReservations()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible crear la reservación.')
    } finally {
      setSaving(false)
    }
  }

  const requestAction = (pending: PendingReservationAction) => {
    if (!writable || saving) return
    setPendingAction(pending)
  }

  const confirmPendingAction = async () => {
    if (!pendingAction || saving) return
    setSaving(true)
    setError('')
    try {
      await pendingAction.action()
      setToast(pendingAction.success)
      await loadReservations()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible completar la acción.')
    } finally {
      setSaving(false)
      setPendingAction(null)
    }
  }

  const exportCsv = async () => {
    try {
      const url = `${API_BASE}${reservationsClient.exportUrl({ search: search || undefined, status: status || undefined })}`
      const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      if (!response.ok) throw new Error('No fue posible exportar reservaciones.')
      const blob = await response.blob()
      const objectUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = objectUrl
      link.download = 'reservaciones-hacienda-de-letras.csv'
      link.click()
      URL.revokeObjectURL(objectUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible exportar.')
    }
  }

  const submitReschedule = async () => {
    if (!selected || !rescheduleSlotId) return
    requestAction({
      title: 'Reprogramar reservación',
      message: 'Se liberará el horario anterior y se reservará el nuevo horario en una sola operación.',
      confirmLabel: 'Reprogramar',
      success: 'Reservación reprogramada.',
      action: () => reservationsClient.reschedule(token, selected.id, rescheduleSlotId),
    })
    setRescheduleSlotId('')
  }

  const submitPartySize = async () => {
    if (!selected || !partySize) return
    requestAction({
      title: 'Cambiar número de personas',
      message: 'Se validará el cupo disponible antes de guardar el cambio.',
      confirmLabel: 'Cambiar personas',
      success: 'Número de personas actualizado.',
      action: () => reservationsClient.changePartySize(token, selected.id, Number(partySize)),
    })
    setPartySize('')
  }

  const submitNote = async () => {
    if (!selected || !note.trim()) return
    setSaving(true)
    try {
      await reservationsClient.addNote(token, selected.id, note.trim())
      setNote('')
      setToast('Nota interna agregada.')
      await loadReservations()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible agregar la nota.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="control-page control-page--reservations min-w-0 space-y-6">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <SectionTitle
          eyebrow={isEnglish ? 'Operations' : 'Operación'}
          title={isEnglish ? 'Reservations' : 'Reservaciones'}
          subtitle={isEnglish ? 'Bookings, capacity and operational status history.' : 'Reservaciones, cupo e historial de cambios operativos.'}
        />
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={loadReservations} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--color-line)] bg-[var(--color-panel)] px-4 text-sm font-semibold text-[var(--color-ink)]">
            <RefreshCw size={16} />
            Reintentar
          </button>
          <button type="button" onClick={exportCsv} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--color-line)] bg-[var(--color-panel)] px-4 text-sm font-semibold text-[var(--color-ink)]">
            <Download size={16} />
            Exportar CSV
          </button>
          <button
            type="button"
            onClick={() => {
              setForm({ ...emptyForm, experienceSlotId: slots[0]?.id ?? '' })
              setFormOpen(true)
            }}
            disabled={!writable}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--color-burgundy)] px-5 text-sm font-semibold text-white shadow-[0_12px_25px_rgba(79,15,31,0.18)] disabled:opacity-50"
          >
            Nueva reservación
          </button>
        </div>
      </div>

      <section className="control-metrics-strip grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={CheckCircle2} label="Confirmadas" value={String(metrics.confirmed)} />
        <Metric icon={Clock3} label="Pendientes" value={String(metrics.pending)} />
        <Metric icon={X} label="Canceladas" value={String(metrics.cancelled)} />
        <Metric icon={Users} label="Personas" value={String(metrics.people)} />
      </section>

      <section className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-panel)] p-4 shadow-[var(--shadow-card)]">
        <div className="grid gap-3 md:grid-cols-[1fr_220px_auto]">
          <label className="flex min-h-11 items-center gap-3 rounded-xl border border-[var(--color-line)] bg-[var(--color-panel-strong)] px-4">
            <Search size={16} className="text-[var(--color-muted)]" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por cliente, correo, teléfono o folio..." className="min-w-0 flex-1 bg-transparent text-sm text-[var(--color-ink)] outline-none" />
          </label>
          <CrystalSelect value={status} onChange={setStatus}>
            <option value="">Todos los estados</option>
            <option value="pending">Pendiente</option>
            <option value="confirmed">Confirmada</option>
            <option value="cancelled">Cancelada</option>
            <option value="completed">Completada</option>
            <option value="no_show">No asistió</option>
          </CrystalSelect>
          <button type="button" onClick={() => { setSearch(''); setStatus('') }} className="min-h-11 rounded-xl border border-[var(--color-line)] px-4 text-sm font-semibold text-[var(--color-burgundy)]">
            Limpiar
          </button>
        </div>
      </section>

      {error ? (
        <div className="rounded-[var(--radius-card)] border border-[#ead8c5] bg-[#fff7ed] p-4 text-sm text-[#8a4b16]">{error}</div>
      ) : null}

      <section className="control-master-detail grid min-w-0 gap-5 xl:grid-cols-[minmax(360px,0.4fr)_minmax(0,0.6fr)]">
        <div className="control-master-list min-w-0 overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-panel)] shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between gap-4 border-b border-[var(--color-line)] px-5 py-4">
            <h3 className="text-lg font-semibold text-[var(--color-ink)]">Reservaciones</h3>
            <span className="rounded-full bg-[var(--color-soft)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">{items.length} registros</span>
          </div>
          {loading ? (
            <div className="p-8 text-center text-sm text-[var(--color-muted)]">Cargando reservaciones...</div>
          ) : items.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-lg font-semibold text-[var(--color-ink)]">Sin reservaciones</p>
              <p className="mt-2 text-sm text-[var(--color-muted)]">Crea una reservación manual cuando haya un horario disponible.</p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--color-line)]">
              {items.map((reservation) => (
                <button
                  key={reservation.id}
                  type="button"
                  onClick={() => setSelectedId(reservation.id)}
                  className="grid w-full gap-4 px-5 py-4 text-left transition lg:grid-cols-[1.2fr_0.9fr_0.65fr_auto]"
                  style={{ backgroundColor: selected?.id === reservation.id ? 'rgba(180,138,85,0.12)' : 'transparent' }}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[var(--color-ink)]">{reservation.customerName}</p>
                    <p className="mt-1 truncate text-xs text-[var(--color-muted)]">{reservation.experienceTitle}</p>
                    <p className="mt-1 truncate text-[10px] text-[var(--color-muted)]">{reservation.email}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[var(--color-ink)]">{formatDateTime(reservation.startAt)}</p>
                    <p className="mt-1 text-[10px] text-[var(--color-muted)]">{reservation.peopleCount} personas · cupo {reservation.available}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[var(--color-ink)]">{currency(reservation.total, reservation.currency)}</p>
	                    <p className="mt-1 text-[10px] text-[var(--color-muted)]">Canal: {channelLabel(reservation.source)}</p>
                  </div>
                  <StatusBadge label={statusLabel(reservation.status)} />
                </button>
              ))}
            </div>
          )}
        </div>

        {selected ? (
          <aside className="control-detail-pane space-y-4">
            <article className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-panel)] p-5 shadow-[var(--shadow-card)]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-gold)]">Detalle operativo</p>
              <h3 className="mt-2 truncate text-2xl text-[var(--color-burgundy)]" style={{ fontFamily: 'var(--font-display)' }}>{selected.customerName}</h3>
              <p className="mt-2 text-sm text-[var(--color-muted)]">{selected.reservationNumber}</p>
              <div className="mt-5 grid gap-3">
                <Detail label="Experiencia" value={selected.experienceTitle} />
                <Detail label="Horario" value={formatDateTime(selected.startAt)} />
                <Detail label="Personas" value={`${selected.peopleCount} personas`} />
                <Detail label="Cupo disponible" value={String(selected.available)} />
	                <Detail label="Canal" value={channelLabel(selected.source)} />
                <Detail label="Total" value={currency(selected.total, selected.currency)} />
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <ActionButton disabled={!writable || selected.status !== 'pending'} onClick={() => requestAction({ title: 'Confirmar reservación', message: 'Se validará el cupo antes de confirmar la reservación.', confirmLabel: 'Confirmar', success: 'Reservación confirmada.', action: () => reservationsClient.confirm(token, selected.id) })}>Confirmar</ActionButton>
                <ActionButton disabled={!writable || !['pending', 'confirmed'].includes(selected.status)} onClick={() => requestAction({ title: 'Cancelar reservación', message: 'Si estaba confirmada, se liberará el cupo del horario.', confirmLabel: 'Cancelar reservación', tone: 'danger', success: 'Reservación cancelada.', action: () => reservationsClient.cancel(token, selected.id, 'Cancelación desde Centro de Control') })}>Cancelar</ActionButton>
              </div>
            </article>

            <article className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-panel)] p-5 shadow-[var(--shadow-card)]">
              <h4 className="flex items-center gap-2 text-sm font-semibold text-[var(--color-ink)]"><CalendarDays size={16} /> Reprogramar</h4>
              <CrystalSelect value={rescheduleSlotId} onChange={setRescheduleSlotId} className="mt-3">
                <option value="">Selecciona nuevo horario</option>
                {slots.map((slot) => <option key={slot.id} value={slot.id}>{slot.experienceTitle} · {formatDateTime(slot.startAt)} · {slot.available} lugares</option>)}
              </CrystalSelect>
              <ActionButton disabled={!writable || !rescheduleSlotId} onClick={submitReschedule}>Reprogramar</ActionButton>
            </article>

            <article className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-panel)] p-5 shadow-[var(--shadow-card)]">
              <h4 className="flex items-center gap-2 text-sm font-semibold text-[var(--color-ink)]"><Users size={16} /> Personas y notas</h4>
              <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
                <input type="number" min="1" value={partySize} onChange={(event) => setPartySize(event.target.value)} placeholder="Personas" className="min-h-11 rounded-xl border border-[var(--color-line)] bg-[var(--color-panel-strong)] px-4 text-sm text-[var(--color-ink)]" />
                <ActionButton disabled={!writable || !partySize} onClick={submitPartySize}>Cambiar</ActionButton>
              </div>
              <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} placeholder="Nota interna" className="mt-3 w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-panel-strong)] px-4 py-3 text-sm text-[var(--color-ink)] outline-none" />
              <ActionButton disabled={!writable || !note.trim()} onClick={submitNote}><MessageSquarePlus size={14} /> Agregar nota</ActionButton>
            </article>

            <article className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-panel)] p-5 shadow-[var(--shadow-card)]">
              <h4 className="flex items-center gap-2 text-sm font-semibold text-[var(--color-ink)]"><FileClock size={16} /> Historial</h4>
              <div className="mt-4 space-y-3">
                {history.length === 0 ? <p className="text-sm text-[var(--color-muted)]">Sin historial registrado.</p> : history.map((item) => (
                  <div key={item.id} className="rounded-xl bg-[var(--color-soft)] p-3">
                    <p className="text-xs font-semibold text-[var(--color-ink)]">{historyStatusLabel(item.previousStatus)} → {historyStatusLabel(item.newStatus)}</p>
                    <p className="mt-1 text-[10px] text-[var(--color-muted)]">{formatDateTime(item.createdAt)} · {item.notes ?? 'Cambio de estado'}</p>
                  </div>
                ))}
              </div>
            </article>
          </aside>
        ) : null}
      </section>

      {formOpen ? (
        <Modal title="Nueva reservación" onClose={() => setFormOpen(false)}>
          <form onSubmit={submitReservation} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <FormInput label="Nombre completo" value={form.customerName} onChange={(value) => setForm({ ...form, customerName: value })} required />
              <FormInput label="Correo electrónico" type="email" value={form.customerEmail} onChange={(value) => setForm({ ...form, customerEmail: value })} required />
              <FormInput label="Teléfono" value={form.customerPhone} onChange={(value) => setForm({ ...form, customerPhone: value })} />
              <FormInput label="Personas" type="number" min="1" value={form.peopleCount} onChange={(value) => setForm({ ...form, peopleCount: value })} required />
            </div>
            <FormSelect label="Horario disponible" value={form.experienceSlotId} onChange={(value) => setForm({ ...form, experienceSlotId: value })}>
              {slots.map((slot) => <option key={slot.id} value={slot.id}>{slot.experienceTitle} · {formatDateTime(slot.startAt)} · {slot.available} lugares</option>)}
            </FormSelect>
            <FormSelect label="Estado inicial" value={form.status} onChange={(value) => setForm({ ...form, status: value as ReservationForm['status'] })}>
              <option value="pending">Pendiente</option>
              <option value="confirmed">Confirmada</option>
            </FormSelect>
            <FormInput label="Origen" value={form.source} onChange={(value) => setForm({ ...form, source: value })} />
            <FormText label="Notas del cliente" value={form.customerNotes} onChange={(value) => setForm({ ...form, customerNotes: value })} />
            <FormText label="Notas internas" value={form.internalNotes} onChange={(value) => setForm({ ...form, internalNotes: value })} />
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setFormOpen(false)} className="min-h-11 rounded-xl border border-[var(--color-line)] px-5 text-sm font-semibold text-[var(--color-muted-strong)]">Cancelar</button>
              <button type="submit" disabled={saving || slots.length === 0} className="min-h-11 rounded-xl bg-[var(--color-burgundy)] px-5 text-sm font-semibold text-white disabled:opacity-60">{saving ? 'Guardando...' : 'Crear reservación'}</button>
            </div>
          </form>
        </Modal>
      ) : null}

      {toast ? (
        <div className="fixed bottom-6 right-6 z-[140] rounded-[1rem] border border-[#cfddca] bg-white p-4 text-sm font-semibold text-[#5f7d63] shadow-[0_22px_50px_rgba(45,22,14,0.18)]">
          {toast}
          <button type="button" onClick={() => setToast('')} className="ml-4 text-[var(--color-muted)]"><X size={14} /></button>
        </div>
      ) : null}
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
    </div>
  )
}

function Metric({ icon: Icon, label, value }: { icon: typeof CalendarDays; label: string; value: string }) {
  return (
    <article className="control-metric rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-panel)] shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs text-[var(--color-muted)]">{label}</p>
          <p className="mt-3 text-3xl text-[var(--color-ink)]" style={{ fontFamily: 'var(--font-display)' }}>{value}</p>
        </div>
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-soft)] text-[var(--color-burgundy)]"><Icon size={18} /></span>
      </div>
    </article>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[var(--color-soft)] p-3">
      <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--color-muted)]">{label}</p>
      <p className="mt-1 text-sm font-semibold text-[var(--color-ink)]">{value}</p>
    </div>
  )
}

function ActionButton({ children, disabled, onClick }: { children: ReactNode; disabled?: boolean; onClick: () => void }) {
  return (
    <button type="button" disabled={disabled} onClick={onClick} className="mt-3 inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[var(--color-line)] px-3 text-xs font-semibold text-[var(--color-burgundy)] disabled:opacity-50">
      {children}
    </button>
  )
}

function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[#210711]/68 p-4 backdrop-blur-sm">
      <button type="button" aria-label="Cerrar" onClick={onClose} className="absolute inset-0 cursor-default" />
      <div className="relative z-10 max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-[1.5rem] border border-[var(--color-line)] bg-[var(--color-page)] p-6 shadow-[0_35px_90px_rgba(29,5,12,0.38)]">
        <div className="mb-6 flex items-center justify-between gap-4">
          <h2 className="text-2xl text-[var(--color-burgundy)]" style={{ fontFamily: 'var(--font-display)' }}>{title}</h2>
          <button type="button" onClick={onClose} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--color-line)] bg-white text-[var(--color-burgundy)]"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

function FormInput({ label, value, onChange, type = 'text', required, min }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean; min?: string }) {
  return (
    <label className="block">
      <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">{label}</span>
      <input type={type} min={min} required={required} value={value} onChange={(event) => onChange(event.target.value)} className="min-h-11 w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-panel-strong)] px-4 text-sm text-[var(--color-ink)] outline-none" />
    </label>
  )
}

function FormSelect({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">{label}</span>
      <CrystalSelect value={value} onChange={onChange}>
        {children}
      </CrystalSelect>
    </label>
  )
}

function FormText({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">{label}</span>
      <textarea rows={3} value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-panel-strong)] px-4 py-3 text-sm text-[var(--color-ink)] outline-none" />
    </label>
  )
}
