import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import {
  Ban,
  CalendarDays,
  Check,
  Clock3,
  Copy,
  Edit3,
  Lock,
  Plus,
  RefreshCw,
  Save,
  Unlock,
  Users,
  X,
} from 'lucide-react'
import { useAuth } from '../../../contexts/AuthContext'
import {
  availabilityClient,
  type AvailabilityBlockout,
  type AvailabilityExperience,
  type AvailabilitySlot,
} from '../../../services/operations.service'
import { SectionTitle } from '../../components/shared/SectionTitle'
import { CrystalSelect } from '../../components/shared/CrystalSelect'
import { useAppPreferences } from '../../context/AppPreferencesContext'

type SlotForm = {
  id?: string
  experienceId: string
  startAt: string
  endAt: string
  capacity: string
  priceOverride: string
  notes: string
  isBookable: boolean
  operationalStatus: 'open' | 'blocked' | 'closed'
}

type BlockoutForm = {
  experienceId: string
  startAt: string
  endAt: string
  reason: string
  blockType: 'manual' | 'maintenance' | 'private_event' | 'weather' | 'operations' | 'other'
  appliesToAllExperiences: boolean
}

const emptySlotForm: SlotForm = {
  experienceId: '',
  startAt: '',
  endAt: '',
  capacity: '12',
  priceOverride: '',
  notes: '',
  isBookable: true,
  operationalStatus: 'open',
}

const emptyBlockoutForm: BlockoutForm = {
  experienceId: '',
  startAt: '',
  endAt: '',
  reason: '',
  blockType: 'manual',
  appliesToAllExperiences: false,
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return 'Sin horario'
  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function toLocalInput(value: string) {
  const date = new Date(value)
  const offset = date.getTimezoneOffset()
  const local = new Date(date.getTime() - offset * 60_000)
  return local.toISOString().slice(0, 16)
}

function toIso(value: string) {
  return new Date(value).toISOString()
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    open: 'Abierto',
    blocked: 'Bloqueado',
    closed: 'Cerrado',
    published: 'Publicado',
    inactive: 'Inactivo',
  }
  return labels[status] ?? status
}

function canWrite(roles: string[]) {
  return roles.some((role) => ['super_admin', 'admin', 'operations'].includes(role))
}

export function AvailabilityPage() {
  const { isEnglish } = useAppPreferences()
  const { session, roles } = useAuth()
  const writable = canWrite(roles)
  const [slots, setSlots] = useState<AvailabilitySlot[]>([])
  const [experiences, setExperiences] = useState<AvailabilityExperience[]>([])
  const [blockouts, setBlockouts] = useState<AvailabilityBlockout[]>([])
  const [experienceFilter, setExperienceFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [slotForm, setSlotForm] = useState<SlotForm | null>(null)
  const [blockoutForm, setBlockoutForm] = useState<BlockoutForm | null>(null)
  const [duplicateDate, setDuplicateDate] = useState('')

  const token = session?.access_token

  const loadAvailability = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await availabilityClient.list(token, {
        experienceId: experienceFilter || undefined,
        status: statusFilter || undefined,
      })
      setSlots(response.data.slots)
      setExperiences(response.data.experiences)
      setBlockouts(response.data.blockouts)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible cargar disponibilidad.')
    } finally {
      setLoading(false)
    }
  }, [experienceFilter, statusFilter, token])

  useEffect(() => {
    void loadAvailability()
  }, [loadAvailability])

  const metrics = useMemo(() => {
    const capacity = slots.reduce((sum, slot) => sum + slot.capacity, 0)
    const confirmed = slots.reduce((sum, slot) => sum + slot.confirmed, 0)
    const blocked = slots.filter((slot) => slot.operationalStatus === 'blocked').length
    return {
      capacity,
      confirmed,
      available: Math.max(capacity - confirmed, 0),
      occupancy: capacity > 0 ? Math.round((confirmed / capacity) * 100) : 0,
      blocked,
    }
  }, [slots])

  const openNewSlot = () => {
    setSlotForm({
      ...emptySlotForm,
      experienceId: experiences[0]?.id ?? '',
    })
  }

  const openEditSlot = (slot: AvailabilitySlot) => {
    setSlotForm({
      id: slot.id,
      experienceId: slot.experienceId,
      startAt: toLocalInput(slot.startAt),
      endAt: toLocalInput(slot.endAt),
      capacity: String(slot.capacity),
      priceOverride: slot.priceOverride == null ? '' : String(slot.priceOverride),
      notes: slot.notes ?? '',
      isBookable: slot.isBookable,
      operationalStatus: slot.operationalStatus,
    })
  }

  const saveSlot = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!slotForm || saving) return
    setSaving(true)
    setError('')
    try {
      const payload = {
        experienceId: slotForm.experienceId,
        startAt: toIso(slotForm.startAt),
        endAt: toIso(slotForm.endAt),
        capacity: Number(slotForm.capacity),
        priceOverride: slotForm.priceOverride ? Number(slotForm.priceOverride) : null,
        notes: slotForm.notes || null,
        isBookable: slotForm.isBookable,
        operationalStatus: slotForm.operationalStatus,
      }
      if (slotForm.id) {
        await availabilityClient.updateSlot(token, slotForm.id, payload)
      } else {
        await availabilityClient.createSlot(token, payload)
      }
      setSlotForm(null)
      setToast('Disponibilidad guardada en Supabase.')
      await loadAvailability()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible guardar el horario.')
    } finally {
      setSaving(false)
    }
  }

  const toggleSlotBlock = async (slot: AvailabilitySlot) => {
    if (!writable || saving) return
    const confirmed = window.confirm(
      slot.operationalStatus === 'blocked'
        ? '¿Desbloquear este horario para nuevas reservaciones?'
        : '¿Bloquear este horario para nuevas reservaciones?',
    )
    if (!confirmed) return
    setSaving(true)
    try {
      if (slot.operationalStatus === 'blocked') {
        await availabilityClient.unblockSlot(token, slot.id)
      } else {
        await availabilityClient.blockSlot(token, slot.id, 'Bloqueo operativo')
      }
      setToast('Estado del horario actualizado.')
      await loadAvailability()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible actualizar el horario.')
    } finally {
      setSaving(false)
    }
  }

  const saveBlockout = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!blockoutForm || saving) return
    setSaving(true)
    try {
      await availabilityClient.createBlockout(token, {
        experienceId: blockoutForm.appliesToAllExperiences ? null : blockoutForm.experienceId,
        startAt: toIso(blockoutForm.startAt),
        endAt: toIso(blockoutForm.endAt),
        reason: blockoutForm.reason || null,
        blockType: blockoutForm.blockType,
        appliesToAllExperiences: blockoutForm.appliesToAllExperiences,
      })
      setBlockoutForm(null)
      setToast('Bloqueo guardado en Supabase.')
      await loadAvailability()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible crear el bloqueo.')
    } finally {
      setSaving(false)
    }
  }

  const duplicateSelectedDay = async () => {
    const firstSlot = slots[0]
    if (!firstSlot || !duplicateDate || saving) return
    const sourceDate = firstSlot.startAt.slice(0, 10)
    const confirmed = window.confirm(`¿Duplicar los horarios de ${sourceDate} hacia ${duplicateDate}?`)
    if (!confirmed) return
    setSaving(true)
    try {
      await availabilityClient.duplicateSlots(token, {
        experienceId: firstSlot.experienceId,
        sourceDate,
        targetDates: [duplicateDate],
      })
      setDuplicateDate('')
      setToast('Horarios duplicados en Supabase.')
      await loadAvailability()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible duplicar horarios.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <SectionTitle
          eyebrow={isEnglish ? 'Operations' : 'Operación'}
          title={isEnglish ? 'Availability' : 'Disponibilidad'}
          subtitle={isEnglish ? 'Real slots, capacity and blocks persisted in Supabase.' : 'Horarios, cupos y bloqueos reales persistidos en Supabase.'}
        />
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={loadAvailability}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--color-line)] bg-[var(--color-panel)] px-4 text-sm font-semibold text-[var(--color-ink)]"
          >
            <RefreshCw size={16} />
            Reintentar
          </button>
          <button
            type="button"
            onClick={() => setBlockoutForm({ ...emptyBlockoutForm, experienceId: experiences[0]?.id ?? '' })}
            disabled={!writable}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--color-line)] bg-[var(--color-panel)] px-4 text-sm font-semibold text-[var(--color-burgundy)] disabled:opacity-50"
          >
            <Ban size={16} />
            Bloquear rango
          </button>
          <button
            type="button"
            onClick={openNewSlot}
            disabled={!writable}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--color-burgundy)] px-5 text-sm font-semibold text-white shadow-[0_12px_25px_rgba(79,15,31,0.18)] disabled:opacity-50"
          >
            <Plus size={17} />
            Nuevo horario
          </button>
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Metric icon={CalendarDays} label="Horarios" value={String(slots.length)} />
        <Metric icon={Users} label="Capacidad" value={String(metrics.capacity)} />
        <Metric icon={Check} label="Confirmados" value={String(metrics.confirmed)} />
        <Metric icon={Clock3} label="Disponibles" value={String(metrics.available)} />
        <Metric icon={Lock} label="Bloqueados" value={String(metrics.blocked)} />
      </section>

      <section className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-panel)] p-4 shadow-[var(--shadow-card)]">
        <div className="grid gap-3 md:grid-cols-[1fr_220px_220px_auto]">
          <CrystalSelect
            value={experienceFilter}
            onChange={setExperienceFilter}
          >
            <option value="">Todas las experiencias</option>
            {experiences.map((experience) => (
              <option key={experience.id} value={experience.id}>{experience.title}</option>
            ))}
          </CrystalSelect>
          <CrystalSelect
            value={statusFilter}
            onChange={setStatusFilter}
          >
            <option value="">Todos los estados</option>
            <option value="open">Abierto</option>
            <option value="blocked">Bloqueado</option>
            <option value="closed">Cerrado</option>
          </CrystalSelect>
          <input
            type="date"
            value={duplicateDate}
            onChange={(event) => setDuplicateDate(event.target.value)}
            className="min-h-11 rounded-xl border border-[var(--color-line)] bg-[var(--color-panel-strong)] px-4 text-sm text-[var(--color-ink)]"
          />
          <button
            type="button"
            onClick={duplicateSelectedDay}
            disabled={!writable || !duplicateDate || slots.length === 0}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--color-line)] px-4 text-sm font-semibold text-[var(--color-burgundy)] disabled:opacity-50"
          >
            <Copy size={16} />
            Duplicar
          </button>
        </div>
      </section>

      {error ? (
        <div className="rounded-[var(--radius-card)] border border-[#ead8c5] bg-[#fff7ed] p-4 text-sm text-[#8a4b16]">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-panel)] p-8 text-center text-sm text-[var(--color-muted)]">
          Cargando disponibilidad real...
        </div>
      ) : slots.length === 0 ? (
        <div className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-panel)] p-8 text-center">
          <p className="text-lg font-semibold text-[var(--color-ink)]">Sin horarios reales</p>
          <p className="mt-2 text-sm text-[var(--color-muted)]">Crea el primer horario para comenzar a recibir reservaciones.</p>
        </div>
      ) : (
        <section className="grid gap-4 xl:grid-cols-2">
          {slots.map((slot) => (
            <article key={slot.id} className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-panel)] p-5 shadow-[var(--shadow-card)]">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[var(--color-ink)]">{slot.experienceTitle}</p>
                  <p className="mt-1 text-xs text-[var(--color-muted)]">{formatDateTime(slot.startAt)} - {formatDateTime(slot.endAt)}</p>
                </div>
                <span className="rounded-full bg-[var(--color-soft)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted-strong)]">
                  {statusLabel(slot.operationalStatus)}
                </span>
              </div>
              <div className="mt-5 grid grid-cols-3 gap-3 text-center">
                <MiniStat label="Cupo" value={String(slot.capacity)} />
                <MiniStat label="Confirmados" value={String(slot.confirmed)} />
                <MiniStat label="Disponible" value={String(slot.available)} />
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-[var(--color-soft)]">
                <div className="h-full bg-[var(--color-burgundy)]" style={{ width: `${slot.occupancy}%` }} />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => openEditSlot(slot)}
                  disabled={!writable}
                  className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--color-line)] px-3 text-xs font-semibold text-[var(--color-burgundy)] disabled:opacity-50"
                >
                  <Edit3 size={14} />
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => toggleSlotBlock(slot)}
                  disabled={!writable}
                  className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--color-line)] px-3 text-xs font-semibold text-[var(--color-burgundy)] disabled:opacity-50"
                >
                  {slot.operationalStatus === 'blocked' ? <Unlock size={14} /> : <Lock size={14} />}
                  {slot.operationalStatus === 'blocked' ? 'Desbloquear' : 'Bloquear'}
                </button>
              </div>
              {slot.notes ? <p className="mt-4 text-xs leading-5 text-[var(--color-muted)]">{slot.notes}</p> : null}
            </article>
          ))}
        </section>
      )}

      <section className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-panel)] p-5 shadow-[var(--shadow-card)]">
        <h3 className="text-lg font-semibold text-[var(--color-ink)]">Bloqueos activos</h3>
        <div className="mt-4 space-y-3">
          {blockouts.length === 0 ? (
            <p className="text-sm text-[var(--color-muted)]">No hay bloqueos reales en el rango consultado.</p>
          ) : blockouts.map((blockout) => (
            <div key={blockout.id} className="rounded-xl border border-[var(--color-line)] bg-[var(--color-panel-strong)] p-4">
              <p className="text-sm font-semibold text-[var(--color-ink)]">{blockout.reason ?? 'Bloqueo operativo'}</p>
              <p className="mt-1 text-xs text-[var(--color-muted)]">{formatDateTime(blockout.startAt)} - {formatDateTime(blockout.endAt)}</p>
            </div>
          ))}
        </div>
      </section>

      {slotForm ? (
        <Modal title={slotForm.id ? 'Editar horario' : 'Nuevo horario'} onClose={() => setSlotForm(null)}>
          <form onSubmit={saveSlot} className="space-y-4">
            <FormSelect label="Experiencia" value={slotForm.experienceId} onChange={(value) => setSlotForm({ ...slotForm, experienceId: value })}>
              {experiences.map((experience) => <option key={experience.id} value={experience.id}>{experience.title}</option>)}
            </FormSelect>
            <div className="grid gap-4 md:grid-cols-2">
              <FormInput label="Inicio" type="datetime-local" value={slotForm.startAt} onChange={(value) => setSlotForm({ ...slotForm, startAt: value })} required />
              <FormInput label="Fin" type="datetime-local" value={slotForm.endAt} onChange={(value) => setSlotForm({ ...slotForm, endAt: value })} required />
              <FormInput label="Capacidad" type="number" min="1" value={slotForm.capacity} onChange={(value) => setSlotForm({ ...slotForm, capacity: value })} required />
              <FormInput label="Precio especial" type="number" min="0" value={slotForm.priceOverride} onChange={(value) => setSlotForm({ ...slotForm, priceOverride: value })} />
            </div>
            <FormSelect label="Estado operativo" value={slotForm.operationalStatus} onChange={(value) => setSlotForm({ ...slotForm, operationalStatus: value as SlotForm['operationalStatus'] })}>
              <option value="open">Abierto</option>
              <option value="blocked">Bloqueado</option>
              <option value="closed">Cerrado</option>
            </FormSelect>
            <label className="flex items-center gap-3 text-sm text-[var(--color-ink)]">
              <input type="checkbox" checked={slotForm.isBookable} onChange={(event) => setSlotForm({ ...slotForm, isBookable: event.target.checked })} />
              Reservable por clientes
            </label>
            <FormText label="Notas internas" value={slotForm.notes} onChange={(value) => setSlotForm({ ...slotForm, notes: value })} />
            <ModalActions saving={saving} submitLabel="Guardar horario" onCancel={() => setSlotForm(null)} />
          </form>
        </Modal>
      ) : null}

      {blockoutForm ? (
        <Modal title="Crear bloqueo" onClose={() => setBlockoutForm(null)}>
          <form onSubmit={saveBlockout} className="space-y-4">
            <label className="flex items-center gap-3 text-sm text-[var(--color-ink)]">
              <input type="checkbox" checked={blockoutForm.appliesToAllExperiences} onChange={(event) => setBlockoutForm({ ...blockoutForm, appliesToAllExperiences: event.target.checked })} />
              Aplicar a todas las experiencias
            </label>
            {!blockoutForm.appliesToAllExperiences ? (
              <FormSelect label="Experiencia" value={blockoutForm.experienceId} onChange={(value) => setBlockoutForm({ ...blockoutForm, experienceId: value })}>
                {experiences.map((experience) => <option key={experience.id} value={experience.id}>{experience.title}</option>)}
              </FormSelect>
            ) : null}
            <div className="grid gap-4 md:grid-cols-2">
              <FormInput label="Inicio" type="datetime-local" value={blockoutForm.startAt} onChange={(value) => setBlockoutForm({ ...blockoutForm, startAt: value })} required />
              <FormInput label="Fin" type="datetime-local" value={blockoutForm.endAt} onChange={(value) => setBlockoutForm({ ...blockoutForm, endAt: value })} required />
            </div>
            <FormSelect label="Tipo" value={blockoutForm.blockType} onChange={(value) => setBlockoutForm({ ...blockoutForm, blockType: value as BlockoutForm['blockType'] })}>
              <option value="manual">Manual</option>
              <option value="maintenance">Mantenimiento</option>
              <option value="private_event">Grupo privado</option>
              <option value="weather">Clima</option>
              <option value="operations">Operación interna</option>
              <option value="other">Otro</option>
            </FormSelect>
            <FormText label="Motivo" value={blockoutForm.reason} onChange={(value) => setBlockoutForm({ ...blockoutForm, reason: value })} />
            <ModalActions saving={saving} submitLabel="Crear bloqueo" onCancel={() => setBlockoutForm(null)} />
          </form>
        </Modal>
      ) : null}

      {toast ? (
        <div className="fixed bottom-6 right-6 z-[140] rounded-[1rem] border border-[#cfddca] bg-white p-4 text-sm font-semibold text-[#5f7d63] shadow-[0_22px_50px_rgba(45,22,14,0.18)]">
          {toast}
          <button type="button" onClick={() => setToast('')} className="ml-4 text-[var(--color-muted)]"><X size={14} /></button>
        </div>
      ) : null}
    </div>
  )
}

function Metric({ icon: Icon, label, value }: { icon: typeof CalendarDays; label: string; value: string }) {
  return (
    <article className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-panel)] p-5 shadow-[var(--shadow-card)]">
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

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[var(--color-soft)] p-3">
      <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--color-muted)]">{label}</p>
      <p className="mt-1 text-sm font-semibold text-[var(--color-ink)]">{value}</p>
    </div>
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
      <textarea rows={4} value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-panel-strong)] px-4 py-3 text-sm text-[var(--color-ink)] outline-none" />
    </label>
  )
}

function ModalActions({ saving, submitLabel, onCancel }: { saving: boolean; submitLabel: string; onCancel: () => void }) {
  return (
    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
      <button type="button" onClick={onCancel} className="min-h-11 rounded-xl border border-[var(--color-line)] px-5 text-sm font-semibold text-[var(--color-muted-strong)]">Cancelar</button>
      <button type="submit" disabled={saving} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--color-burgundy)] px-5 text-sm font-semibold text-white disabled:opacity-60">
        <Save size={15} />
        {saving ? 'Guardando...' : submitLabel}
      </button>
    </div>
  )
}
