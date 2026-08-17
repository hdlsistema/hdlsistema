import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import {
  Ban,
  BarChart3,
  BedDouble,
  Building2,
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
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../../../contexts/AuthContext'
import {
  availabilityClient,
  type AvailabilityBlockout,
  type AvailabilityExperience,
  type AvailabilitySlot,
} from '../../../services/operations.service'
import { SectionTitle } from '../../components/shared/SectionTitle'
import { CrystalDateField, CrystalDateTimeField } from '../../components/shared/CrystalDateField'
import { CrystalSelect } from '../../components/shared/CrystalSelect'
import { ControlConfirmDialog } from '../../components/control/ControlConfirmDialog'
import { useAppPreferences } from '../../context/AppPreferencesContext'
import { LodgingPage } from './LodgingPage'
import { RestaurantAvailabilityPanel } from './RestaurantAvailabilityPanel'

type AvailabilityMode = 'experiencias' | 'restaurantes' | 'hospedaje'

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

type PendingAvailabilityAction = {
  title: string
  message: string
  confirmLabel: string
  action: () => Promise<unknown>
  success: string
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
  const [pendingAction, setPendingAction] = useState<PendingAvailabilityAction | null>(null)
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedMode = searchParams.get('view') ?? ''
  const availabilityMode: AvailabilityMode = ['hospedaje', 'hotel', 'cabanas'].includes(requestedMode)
    ? 'hospedaje'
    : requestedMode === 'restaurantes'
      ? 'restaurantes'
      : 'experiencias'

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

  const chartSlots = useMemo(
    () => [...slots].sort((left, right) => left.startAt.localeCompare(right.startAt)).slice(0, 8),
    [slots],
  )

  const selectMode = (mode: AvailabilityMode) => {
    const next = new URLSearchParams(searchParams)
    if (mode === 'hospedaje') next.set('view', 'hospedaje')
    else if (mode === 'restaurantes') next.set('view', 'restaurantes')
    else next.delete('view')
    setSearchParams(next, { replace: true })
  }

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
      setToast('Disponibilidad guardada.')
      await loadAvailability()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible guardar el horario.')
    } finally {
      setSaving(false)
    }
  }

  const toggleSlotBlock = async (slot: AvailabilitySlot) => {
    if (!writable || saving) return
    const unblock = slot.operationalStatus === 'blocked'
    setPendingAction({
      title: unblock ? 'Desbloquear horario' : 'Bloquear horario',
      message: unblock
        ? 'El horario volverá a estar disponible para nuevas reservaciones.'
        : 'El horario dejará de estar disponible para nuevas reservaciones hasta que se desbloquee.',
      confirmLabel: unblock ? 'Desbloquear' : 'Bloquear',
      success: 'Estado del horario actualizado.',
      action: () => unblock
        ? availabilityClient.unblockSlot(token, slot.id)
        : availabilityClient.blockSlot(token, slot.id, 'Bloqueo operativo'),
    })
  }

  const confirmPendingAction = async () => {
    if (!pendingAction || saving) return
    setSaving(true)
    try {
      await pendingAction.action()
      setToast(pendingAction.success)
      setPendingAction(null)
      await loadAvailability()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible completar la acción.')
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
      setToast('Bloqueo guardado.')
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
    setPendingAction({
      title: 'Duplicar horarios',
      message: `Se copiarán los horarios del ${sourceDate} al ${duplicateDate}.`,
      confirmLabel: 'Duplicar',
      success: 'Horarios duplicados.',
      action: async () => {
        await availabilityClient.duplicateSlots(token, {
          experienceId: firstSlot.experienceId,
          sourceDate,
          targetDates: [duplicateDate],
        })
        setDuplicateDate('')
      },
    })
  }

  if (availabilityMode === 'hospedaje') {
    return (
      <div className="control-page control-page--availability min-w-0 space-y-5">
        <SectionTitle
          eyebrow={isEnglish ? 'Operations' : 'Operación'}
          title={isEnglish ? 'Availability' : 'Disponibilidad'}
          subtitle={isEnglish ? 'Inventory, sellable capacity and operational blocks by business line.' : 'Inventario vendible, ocupación y bloqueos por línea de negocio.'}
        />
        <AvailabilityModeSwitch mode={availabilityMode} onChange={selectMode} />
        <LodgingPage embedded />
      </div>
    )
  }

  if (availabilityMode === 'restaurantes') {
    return (
      <div className="control-page control-page--availability min-w-0 space-y-5">
        <SectionTitle
          eyebrow={isEnglish ? 'Operations' : 'Operación'}
          title={isEnglish ? 'Availability' : 'Disponibilidad'}
          subtitle={isEnglish ? 'Schedules and bookable capacity by business line.' : 'Horarios y capacidad reservable por línea de negocio.'}
        />
        <AvailabilityModeSwitch mode={availabilityMode} onChange={selectMode} />
        <RestaurantAvailabilityPanel token={token} writable={writable} />
      </div>
    )
  }

  return (
    <div className="control-page control-page--availability min-w-0 space-y-6">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <SectionTitle
          eyebrow={isEnglish ? 'Operations' : 'Operación'}
          title={isEnglish ? 'Availability' : 'Disponibilidad'}
          subtitle={isEnglish ? 'Inventory, sellable capacity and operational blocks by business line.' : 'Inventario vendible, ocupación y bloqueos por línea de negocio.'}
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

      <AvailabilityModeSwitch mode={availabilityMode} onChange={selectMode} />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Metric icon={CalendarDays} label="Horarios" value={String(slots.length)} />
        <Metric icon={Users} label="Capacidad" value={String(metrics.capacity)} />
        <Metric icon={Check} label="Confirmados" value={String(metrics.confirmed)} />
        <Metric icon={Clock3} label="Disponibles" value={String(metrics.available)} />
        <Metric icon={Lock} label="Bloqueados" value={String(metrics.blocked)} />
      </section>

      <section aria-label="Gráficas de ocupación de experiencias" className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)]">
        <article className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-panel)] p-5 shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between gap-3">
            <div><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-gold)]">Ocupación consolidada</p><h3 className="mt-1 text-base font-semibold text-[var(--color-ink)]">Experiencias</h3></div>
            <BarChart3 size={18} className="text-[var(--color-burgundy)]" />
          </div>
          <div className="mt-5 flex items-center gap-5">
            <div className="grid h-28 w-28 shrink-0 place-items-center rounded-full" style={{ background: `conic-gradient(var(--color-burgundy) 0 ${metrics.occupancy}%, #eee4d5 ${metrics.occupancy}% 100%)` }}>
              <div className="grid h-20 w-20 place-items-center rounded-full bg-[var(--color-panel)] text-center"><div><p className="text-2xl font-semibold text-[var(--color-ink)]">{metrics.occupancy}%</p><p className="text-[9px] uppercase text-[var(--color-muted)]">ocupado</p></div></div>
            </div>
            <div className="space-y-2 text-xs"><ChartLegend color="#6f1029" label={`${metrics.confirmed} confirmados`} /><ChartLegend color="#eee4d5" label={`${metrics.available} lugares libres`} /></div>
          </div>
        </article>
        <article className="min-w-0 rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-panel)] p-5 shadow-[var(--shadow-card)]">
          <div><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-gold)]">Demanda por horario</p><h3 className="mt-1 text-base font-semibold text-[var(--color-ink)]">Próximos horarios</h3></div>
          <div className="mt-5 space-y-3">
            {chartSlots.length === 0 ? <p className="text-sm text-[var(--color-muted)]">Los horarios aparecerán aquí al configurar disponibilidad.</p> : chartSlots.map((slot) => (
              <div key={`chart-${slot.id}`} className="grid items-center gap-3 sm:grid-cols-[minmax(150px,0.42fr)_minmax(160px,1fr)_42px]">
                <div className="min-w-0"><p className="truncate text-xs font-semibold text-[var(--color-ink)]">{slot.experienceTitle}</p><p className="truncate text-[10px] text-[var(--color-muted)]">{formatDateTime(slot.startAt)}</p></div>
                <div className="h-3 overflow-hidden rounded-full bg-[#eee4d5]"><div className="h-full rounded-full bg-[linear-gradient(90deg,#6f1029,#b48a55)]" style={{ width: `${Math.min(slot.occupancy, 100)}%` }} /></div>
                <p className="text-right text-xs font-semibold text-[var(--color-burgundy)]">{slot.occupancy}%</p>
              </div>
            ))}
          </div>
        </article>
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
          <CrystalDateField value={duplicateDate} onChange={setDuplicateDate} placeholder="Fecha a duplicar" />
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
          Cargando disponibilidad...
        </div>
      ) : slots.length === 0 ? (
        <div className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-panel)] p-8 text-center">
          <p className="text-lg font-semibold text-[var(--color-ink)]">Sin horarios</p>
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
            <p className="text-sm text-[var(--color-muted)]">No hay bloqueos en el rango consultado.</p>
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
              <FormInput label="Inicio" type="datetime" value={slotForm.startAt} onChange={(value) => setSlotForm({ ...slotForm, startAt: value })} required />
              <FormInput label="Fin" type="datetime" value={slotForm.endAt} onChange={(value) => setSlotForm({ ...slotForm, endAt: value })} required />
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
              <FormInput label="Inicio" type="datetime" value={blockoutForm.startAt} onChange={(value) => setBlockoutForm({ ...blockoutForm, startAt: value })} required />
              <FormInput label="Fin" type="datetime" value={blockoutForm.endAt} onChange={(value) => setBlockoutForm({ ...blockoutForm, endAt: value })} required />
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

      <ControlConfirmDialog
        open={Boolean(pendingAction)}
        title={pendingAction?.title ?? ''}
        message={pendingAction?.message ?? ''}
        confirmLabel={pendingAction?.confirmLabel}
        busy={saving}
        onCancel={() => setPendingAction(null)}
        onConfirm={confirmPendingAction}
      />

      {toast ? (
        <div className="fixed bottom-6 right-6 z-[140] rounded-[1rem] border border-[#cfddca] bg-white p-4 text-sm font-semibold text-[#5f7d63] shadow-[0_22px_50px_rgba(45,22,14,0.18)]">
          {toast}
          <button type="button" onClick={() => setToast('')} className="ml-4 text-[var(--color-muted)]"><X size={14} /></button>
        </div>
      ) : null}
    </div>
  )
}

function AvailabilityModeSwitch({ mode, onChange }: { mode: AvailabilityMode; onChange: (mode: AvailabilityMode) => void }) {
  return (
    <section aria-label="Tipo de disponibilidad" className="grid gap-2 rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-panel)] p-2 shadow-[var(--shadow-card)] md:grid-cols-3">
      <button type="button" onClick={() => onChange('experiencias')} className={`flex min-h-14 items-center gap-3 rounded-xl px-4 text-left transition ${mode === 'experiencias' ? 'bg-[var(--color-burgundy)] text-white shadow-md' : 'text-[var(--color-ink)] hover:bg-[var(--color-soft)]'}`}>
        <CalendarDays size={19} /><span><strong className="block text-sm">Experiencias y eventos</strong><small className={`block text-[10px] ${mode === 'experiencias' ? 'text-white/70' : 'text-[var(--color-muted)]'}`}>Horarios, cupos y bloqueos</small></span>
      </button>
      <button type="button" onClick={() => onChange('restaurantes')} className={`flex min-h-14 items-center gap-3 rounded-xl px-4 text-left transition ${mode === 'restaurantes' ? 'bg-[var(--color-burgundy)] text-white shadow-md' : 'text-[var(--color-ink)] hover:bg-[var(--color-soft)]'}`}>
        <Building2 size={19} /><span><strong className="block text-sm">Restaurantes</strong><small className={`block text-[10px] ${mode === 'restaurantes' ? 'text-white/70' : 'text-[var(--color-muted)]'}`}>Horarios disponibles para solicitar mesa</small></span>
      </button>
      <button type="button" onClick={() => onChange('hospedaje')} className={`flex min-h-14 items-center gap-3 rounded-xl px-4 text-left transition ${mode === 'hospedaje' ? 'bg-[var(--color-burgundy)] text-white shadow-md' : 'text-[var(--color-ink)] hover:bg-[var(--color-soft)]'}`}>
        <BedDouble size={19} /><span><strong className="block text-sm">Cabañas</strong><small className={`block text-[10px] ${mode === 'hospedaje' ? 'text-white/70' : 'text-[var(--color-muted)]'}`}>Noches, unidades, ocupación y recepción</small></span>
      </button>
    </section>
  )
}

function ChartLegend({ color, label }: { color: string; label: string }) {
  return <div className="flex items-center gap-2 text-[var(--color-muted-strong)]"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />{label}</div>
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
    <div className="control-form-overlay fixed inset-0 z-[120] flex items-center justify-center bg-[#210711]/68 p-4 backdrop-blur-sm">
      <button type="button" aria-label="Cerrar" onClick={onClose} className="absolute inset-0 cursor-default" />
      <div className="control-form-surface relative z-10 max-h-[94vh] w-full max-w-4xl overflow-y-auto rounded-[1.5rem] border border-[var(--color-line)] bg-[var(--color-page)] p-6 shadow-[0_35px_90px_rgba(29,5,12,0.38)]" role="dialog" aria-modal="true" aria-label={title}>
        <div className="control-form-header mb-6 flex items-center justify-between gap-4">
          <h2 className="text-2xl text-[var(--color-burgundy)]" style={{ fontFamily: 'var(--font-display)' }}>{title}</h2>
          <button type="button" onClick={onClose} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--color-line)] bg-white text-[var(--color-burgundy)]"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

function FormInput({ label, value, onChange, type = 'text', required, min }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean; min?: string }) {
  if (type === 'datetime') {
    return <CrystalDateTimeField label={label} value={value} onChange={onChange} />
  }

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
