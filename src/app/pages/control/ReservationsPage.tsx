import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import {
  BedDouble,
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
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../../contexts/AuthContext'
import { API_BASE } from '../../../services/api'
import {
  availabilityClient,
  reservationsClient,
  type AvailabilitySlot,
  type ReservationHistoryItem,
  type ReservationRecord,
} from '../../../services/operations.service'
import { lodgingClient, type LodgingStay, type LodgingUnit } from '../../../services/lodging.service'
import { customersClient, type CustomerRecord } from '../../../services/customers.service'
import { ControlConfirmDialog } from '../../components/control/ControlConfirmDialog'
import { ControlEntityPicker } from '../../components/control/ControlEntityPicker'
import { QuickCustomerDialog } from '../../components/control/QuickCustomerDialog'
import { SectionTitle } from '../../components/shared/SectionTitle'
import { StatusBadge } from '../../components/shared/StatusBadge'
import { CrystalSelect } from '../../components/shared/CrystalSelect'
import { CrystalDateField } from '../../components/shared/CrystalDateField'
import { useAppPreferences } from '../../context/AppPreferencesContext'
import { dateOnly, dateTime, money, statusLabel as safeStatusLabel } from './controlCopy'

type ReservationForm = {
  customerId: string
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
  customerId: '',
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
    'Centro de Control': 'Centro de Control',
    'Teléfono': 'Teléfono',
    WhatsApp: 'WhatsApp',
    Mostrador: 'Mostrador',
    Agencia: 'Agencia',
    Web: 'Web',
    App: 'App',
    Otro: 'Otro',
  }
  if (!source) return 'Sin canal'
  return labels[source] ?? source
}

function reservationTypeLabel(type: ReservationRecord['reservationType']) {
  const labels: Record<ReservationRecord['reservationType'], string> = {
    experience: 'Experiencia',
    event: 'Evento',
    cabin: 'Cabaña',
    restaurant: 'Restaurante',
  }
  return labels[type]
}

function lodgingPeriod(checkIn?: string | null, checkOut?: string | null) {
  if (!checkIn || !checkOut) return 'Fechas pendientes'
  return `${dateOnly(checkIn)} → ${dateOnly(checkOut)}`
}

function lodgingNights(checkIn?: string | null, checkOut?: string | null) {
  if (!checkIn || !checkOut) return 0
  return Math.max(Math.round((new Date(`${checkOut}T12:00:00Z`).getTime() - new Date(`${checkIn}T12:00:00Z`).getTime()) / 86_400_000), 0)
}

function addReservationDays(value: string, count: number) {
  const date = new Date(`${value}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() + count)
  return date.toISOString().slice(0, 10)
}

function housekeepingCopy(value: string) {
  const labels: Record<string, string> = { clean: 'Limpia', dirty: 'Pendiente de limpieza', inspection: 'En inspección', out_of_service: 'Fuera de servicio' }
  return labels[value] ?? value
}

function lodgingStayStatusCopy(value: string) {
  const labels: Record<string, string> = { held: 'Solicitud pendiente', reserved: 'Reservada', checked_in: 'Huésped alojado', checked_out: 'Salida realizada', cancelled: 'Cancelada', no_show: 'No se presentó', expired: 'Solicitud vencida' }
  return labels[value] ?? value
}

function reservationSchedule(item: ReservationRecord) {
  if (item.reservationType === 'cabin') return lodgingPeriod(item.checkIn, item.checkOut)
  if (item.reservationType === 'restaurant') return [item.reservationDate ? dateOnly(item.reservationDate) : null, item.reservationTime].filter(Boolean).join(' · ') || 'Fecha pendiente'
  return formatDateTime(item.startAt)
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
  const [reservationType, setReservationType] = useState('')
  const [lodgingStays, setLodgingStays] = useState<LodgingStay[]>([])
  const [lodgingUnits, setLodgingUnits] = useState<LodgingUnit[]>([])
  const [customers, setCustomers] = useState<CustomerRecord[]>([])
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false)
  const [cabinCheckIn, setCabinCheckIn] = useState('')
  const [cabinCheckOut, setCabinCheckOut] = useState('')
  const [cabinUnitId, setCabinUnitId] = useState('')
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
      const [reservationResponse, slotResponse, stayResponse, unitResponse, customerResponse] = await Promise.all([
        reservationsClient.list(token, {
          search: search || undefined,
          status: status || undefined,
          reservationType: reservationType || undefined,
          perPage: 100,
        }),
        availabilityClient.slots(token, { availability: 'available' }),
        lodgingClient.stays(token),
        lodgingClient.units(token),
        customersClient.list(token, { perPage: 100, status: 'published' }),
      ])
      setItems(reservationResponse.data)
      setSlots(slotResponse.data)
      setLodgingStays(stayResponse.data)
      setLodgingUnits(unitResponse.data)
      setCustomers(customerResponse.data)
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
  }, [reservationType, search, searchParams, status, token])

  useEffect(() => {
    const timer = window.setTimeout(() => void loadReservations(), 350)
    return () => window.clearTimeout(timer)
  }, [loadReservations])

  const selected = useMemo(
    () => items.find((item) => item.id === selectedId) ?? items[0] ?? null,
    [items, selectedId],
  )

  const selectedStay = useMemo(
    () => lodgingStays.find((stay) => stay.reservationId === selected?.id) ?? null,
    [lodgingStays, selected?.id],
  )

  useEffect(() => {
    setPartySize(selected ? String(selected.peopleCount) : '')
    if (selected?.reservationType === 'cabin') {
      setCabinCheckIn(selected.checkIn ?? selectedStay?.plannedCheckIn ?? '')
      setCabinCheckOut(selected.checkOut ?? selectedStay?.plannedCheckOut ?? '')
      setCabinUnitId(selectedStay?.unitId ?? '')
    } else {
      setCabinCheckIn('')
      setCabinCheckOut('')
      setCabinUnitId('')
    }
  }, [selected, selectedStay])

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
    cabins: items.filter((item) => item.reservationType === 'cabin').length,
  }), [items])

  const compatibleLodgingUnits = useMemo(() => lodgingUnits.filter((unit) => (
    unit.operationalStatus === 'active'
    && unit.housekeepingStatus !== 'out_of_service'
    && unit.capacity >= (selected?.peopleCount ?? 1)
    && (!selected?.cabinPackage?.id || !unit.cabinPackageId || unit.cabinPackageId === selected.cabinPackage.id)
  )), [lodgingUnits, selected?.cabinPackage?.id, selected?.peopleCount])

  const submitReservation = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (saving) return
    setSaving(true)
    setError('')
    try {
      const response = await reservationsClient.create(token, {
        customerId: form.customerId,
        customerName: form.customerId ? undefined : form.customerName,
        customerEmail: form.customerId ? undefined : form.customerEmail,
        customerPhone: form.customerId ? undefined : form.customerPhone,
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
      const url = `${API_BASE}${reservationsClient.exportUrl({ search: search || undefined, status: status || undefined, reservationType: reservationType || undefined })}`
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

  const submitCabinReschedule = () => {
    if (!selected || selected.reservationType !== 'cabin' || !cabinCheckIn || !cabinCheckOut) return
    requestAction({
      title: 'Reprogramar estancia en cabaña',
      message: `Se validará inventario y se bloqueará ${cabinUnitId ? 'la cabaña seleccionada' : 'la primera cabaña compatible'} del ${dateOnly(cabinCheckIn)} al ${dateOnly(cabinCheckOut)} en una sola operación.`,
      confirmLabel: 'Reprogramar estancia',
      success: 'Estancia reprogramada y calendario actualizado.',
      action: () => lodgingClient.reschedule(token, selected.id, { checkIn: cabinCheckIn, checkOut: cabinCheckOut, unitId: cabinUnitId || null }),
    })
  }

  const submitPartySize = async () => {
    if (!selected || !partySize) return
    requestAction({
      title: 'Cambiar número de personas',
      message: selected.reservationType === 'cabin' ? 'Se validará la capacidad de la cabaña y del paquete sin alterar indebidamente la tarifa por noche.' : 'Se validará el cupo disponible antes de guardar el cambio.',
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
          <Link to="/control/disponibilidad?view=hospedaje&action=nueva-reservacion" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--color-line)] bg-[var(--color-panel)] px-4 text-sm font-semibold text-[var(--color-burgundy)]"><BedDouble size={16} />Nueva cabaña</Link>
          <button
            type="button"
            onClick={() => {
              setForm({ ...emptyForm, customerId: customers[0]?.id ?? '', experienceSlotId: slots[0]?.id ?? '' })
              setFormOpen(true)
            }}
            disabled={!writable}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--color-burgundy)] px-5 text-sm font-semibold text-white shadow-[0_12px_25px_rgba(79,15,31,0.18)] disabled:opacity-50"
          >
            Nueva experiencia
          </button>
        </div>
      </div>

      <section className="control-metrics-strip grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Metric icon={CheckCircle2} label="Confirmadas" value={String(metrics.confirmed)} />
        <Metric icon={Clock3} label="Pendientes" value={String(metrics.pending)} />
        <Metric icon={X} label="Canceladas" value={String(metrics.cancelled)} />
        <Metric icon={Users} label="Personas" value={String(metrics.people)} />
        <Metric icon={BedDouble} label="Cabañas" value={String(metrics.cabins)} />
      </section>

      <section className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-panel)] p-4 shadow-[var(--shadow-card)]">
        <div className="grid gap-3 md:grid-cols-[minmax(240px,1fr)_190px_190px_auto]">
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
          <CrystalSelect value={reservationType} onChange={setReservationType}>
            <option value="">Todos los servicios</option>
            <option value="experience">Experiencias</option>
            <option value="event">Eventos</option>
            <option value="cabin">Cabañas</option>
            <option value="restaurant">Restaurantes</option>
          </CrystalSelect>
          <button type="button" onClick={() => { setSearch(''); setStatus(''); setReservationType('') }} className="min-h-11 rounded-xl border border-[var(--color-line)] px-4 text-sm font-semibold text-[var(--color-burgundy)]">
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
                    <span className="mt-2 inline-flex rounded-full bg-[var(--color-soft)] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-[var(--color-burgundy)]">{reservationTypeLabel(reservation.reservationType)}</span>
                    <p className="mt-1 truncate text-[10px] text-[var(--color-muted)]">{reservation.email}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[var(--color-ink)]">{reservationSchedule(reservation)}</p>
                    <p className="mt-1 text-[10px] text-[var(--color-muted)]">{reservation.peopleCount} {reservation.reservationType === 'cabin' ? `huéspedes · ${lodgingNights(reservation.checkIn, reservation.checkOut)} noche(s)` : reservation.reservationType === 'restaurant' ? 'comensales' : `personas · ${reservation.available} lugares libres`}</p>
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
              <div className="mt-3 flex items-center gap-2"><span className="rounded-full bg-[var(--color-soft)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-burgundy)]">{reservationTypeLabel(selected.reservationType)}</span><StatusBadge label={statusLabel(selected.status)} /></div>
              {selected.reservationType === 'cabin' ? (
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <Detail label="Paquete de cabaña" value={selected.cabinPackage?.name ?? selected.experienceTitle} />
                  <Detail label="Cabaña asignada" value={selectedStay ? `${selectedStay.unitCode} · ${selectedStay.unitName}` : 'Unidad pendiente'} />
                  <Detail label="Entrada" value={selected.checkIn ? dateOnly(selected.checkIn) : 'Pendiente'} />
                  <Detail label="Salida" value={selected.checkOut ? dateOnly(selected.checkOut) : 'Pendiente'} />
                  <Detail label="Estancia" value={`${lodgingNights(selected.checkIn, selected.checkOut)} noche(s) · ${selected.peopleCount} huésped(es)`} />
                  <Detail label="Estado de estancia" value={selectedStay ? lodgingStayStatusCopy(selectedStay.status) : 'Sin estancia operativa'} />
                  <Detail label="Housekeeping" value={selectedStay ? housekeepingCopy(selectedStay.housekeepingStatus) : 'Sin asignar'} />
                  <Detail label="Canal de venta" value={channelLabel(selected.source)} />
                  <Detail label="Total" value={currency(selected.total, selected.currency)} />
                </div>
              ) : selected.reservationType === 'restaurant' ? (
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <Detail label="Restaurante" value={selected.restaurantLocation?.name ?? selected.experienceTitle} />
                  <Detail label="Fecha y hora" value={reservationSchedule(selected)} />
                  <Detail label="Comensales" value={String(selected.peopleCount)} />
                  <Detail label="Ocasión" value={selected.occasion ?? 'No especificada'} />
                  <Detail label="Canal" value={channelLabel(selected.source)} />
                  <Detail label="Total" value={currency(selected.total, selected.currency)} />
                  <Detail label="Pago" value={selected.paymentStatus === 'not_required' ? 'No requerido' : selected.paymentStatus === 'pending' ? 'Pendiente en App' : selected.paymentStatus === 'paid' ? 'Pagado' : selected.paymentStatus} />
                </div>
              ) : (
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <Detail label={selected.reservationType === 'event' ? 'Evento' : 'Experiencia'} value={selected.experienceTitle} />
                  <Detail label="Horario" value={formatDateTime(selected.startAt)} />
                  <Detail label="Personas" value={`${selected.peopleCount} personas`} />
                  <Detail label="Cupo disponible" value={String(selected.available)} />
                  <Detail label="Canal" value={channelLabel(selected.source)} />
                  <Detail label="Total" value={currency(selected.total, selected.currency)} />
                  <Detail label="Pago" value={selected.paymentStatus === 'not_required' ? 'No requerido' : selected.paymentStatus === 'pending' ? 'Pendiente en App' : selected.paymentStatus === 'paid' ? 'Pagado' : selected.paymentStatus} />
                </div>
              )}
              <div className="mt-5 flex flex-wrap gap-2">
                <ActionButton disabled={!writable || selected.status !== 'pending' || (selected.reservationType === 'cabin' && selectedStay?.status === 'expired') || (selected.reservationType === 'experience' && selected.paymentStatus !== 'not_required')} onClick={() => requestAction({ title: 'Confirmar reservación', message: selected.reservationType === 'cabin' ? 'La solicitud pendiente se convertirá en reserva firme; las noches ya están bloqueadas para impedir cruces.' : 'Se validará el cupo antes de confirmar la reservación.', confirmLabel: 'Confirmar', success: 'Reservación confirmada.', action: () => reservationsClient.confirm(token, selected.id) })}>Confirmar</ActionButton>
                <ActionButton disabled={!writable || !['pending', 'confirmed'].includes(selected.status) || (selected.reservationType === 'experience' && selected.paymentStatus !== 'not_required')} onClick={() => requestAction({ title: 'Cancelar reservación', message: selected.reservationType === 'cabin' ? 'Se cancelará la estancia y se liberarán sus noches en el calendario de cabañas.' : 'Si estaba confirmada, se liberará el cupo del horario.', confirmLabel: 'Cancelar reservación', tone: 'danger', success: 'Reservación cancelada.', action: () => reservationsClient.cancel(token, selected.id, 'Cancelación desde Centro de Control') })}>Cancelar</ActionButton>
              </div>
            </article>

            {selected.reservationType === 'cabin' ? (
              <article className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-panel)] p-5 shadow-[var(--shadow-card)]">
                <h4 className="flex items-center gap-2 text-sm font-semibold text-[var(--color-ink)]"><BedDouble size={16} /> Reprogramar estancia</h4>
                <p className="mt-1 text-xs text-[var(--color-muted)]">Valida cruces, capacidad y unidad física antes de mover las noches.</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2"><CrystalDateField label="Nueva entrada" value={cabinCheckIn} onChange={(value) => { setCabinCheckIn(value); if (cabinCheckOut <= value) setCabinCheckOut(addReservationDays(value, Math.max(lodgingNights(selected.checkIn, selected.checkOut), 1))) }} /><CrystalDateField label="Nueva salida" value={cabinCheckOut} onChange={setCabinCheckOut} /></div>
                <CrystalSelect value={cabinUnitId} onChange={setCabinUnitId} className="mt-3"><option value="">Asignación automática</option>{compatibleLodgingUnits.map((unit) => <option key={unit.id} value={unit.id}>{unit.code} · {unit.name} · {unit.capacity} huéspedes</option>)}</CrystalSelect>
                <div className="flex flex-wrap gap-2"><ActionButton disabled={!writable || !['pending', 'confirmed'].includes(selected.status) || !selectedStay || !['held', 'reserved'].includes(selectedStay.status) || !cabinCheckIn || !cabinCheckOut || cabinCheckOut <= cabinCheckIn} onClick={submitCabinReschedule}>Validar y reprogramar</ActionButton><Link to="/control/disponibilidad?view=hospedaje" className="mt-3 inline-flex min-h-10 items-center rounded-xl border border-[var(--color-line)] px-3 text-xs font-semibold text-[var(--color-burgundy)]">Ver calendario de cabañas</Link></div>
              </article>
            ) : selected.reservationType !== 'restaurant' ? (
              <article className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-panel)] p-5 shadow-[var(--shadow-card)]">
                <h4 className="flex items-center gap-2 text-sm font-semibold text-[var(--color-ink)]"><CalendarDays size={16} /> Reprogramar horario</h4>
                <CrystalSelect value={rescheduleSlotId} onChange={setRescheduleSlotId} className="mt-3">
                  <option value="">Selecciona nuevo horario</option>
                  {slots.filter((slot) => !selected.experienceId || slot.experienceId === selected.experienceId).map((slot) => <option key={slot.id} value={slot.id}>{slot.experienceTitle} · {formatDateTime(slot.startAt)} · {slot.available} lugares</option>)}
                </CrystalSelect>
                <ActionButton disabled={!writable || !rescheduleSlotId || selected.paymentStatus !== 'not_required'} onClick={submitReschedule}>Reprogramar</ActionButton>
              </article>
            ) : null}

            <article className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-panel)] p-5 shadow-[var(--shadow-card)]">
              <h4 className="flex items-center gap-2 text-sm font-semibold text-[var(--color-ink)]"><Users size={16} /> Personas y notas</h4>
              <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
                <input type="number" min="1" value={partySize} onChange={(event) => setPartySize(event.target.value)} placeholder="Personas" className="min-h-11 rounded-xl border border-[var(--color-line)] bg-[var(--color-panel-strong)] px-4 text-sm text-[var(--color-ink)]" />
                <ActionButton disabled={!writable || !['pending', 'confirmed'].includes(selected.status) || !partySize || (selected.reservationType === 'experience' && selected.paymentStatus !== 'not_required')} onClick={submitPartySize}>Cambiar</ActionButton>
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
        <Modal title="Nueva reservación de experiencia" onClose={() => setFormOpen(false)}>
          <form onSubmit={submitReservation} className="space-y-4">
            <ControlEntityPicker label="Cliente relacionado" value={form.customerId} options={customers.map((customer) => ({ id: customer.id, label: customer.displayName, description: [customer.email, customer.phone].filter(Boolean).join(' · ') || customer.customerNumber }))} onChange={(customerId) => setForm({ ...form, customerId })} actionLabel="Crear cliente nuevo" onAction={() => setCustomerDialogOpen(true)} required />
            <FormInput label="Personas" type="number" min="1" value={form.peopleCount} onChange={(value) => setForm({ ...form, peopleCount: value })} required />
            <FormSelect label="Horario disponible" value={form.experienceSlotId} onChange={(value) => setForm({ ...form, experienceSlotId: value })}>
              {slots.map((slot) => <option key={slot.id} value={slot.id}>{slot.experienceTitle} · {formatDateTime(slot.startAt)} · {slot.available} lugares</option>)}
            </FormSelect>
            <FormSelect label="Estado inicial" value={form.status} onChange={(value) => setForm({ ...form, status: value as ReservationForm['status'] })}>
              <option value="pending">Pendiente</option>
              <option value="confirmed">Confirmada</option>
            </FormSelect>
            <FormSelect label="Canal de venta" value={form.source} onChange={(value) => setForm({ ...form, source: value })}><option>Centro de control</option><option>Teléfono</option><option>WhatsApp</option><option>Mostrador</option><option>Agencia</option><option>Web</option><option>App</option><option>Otro</option></FormSelect>
            <FormText label="Notas del cliente" value={form.customerNotes} onChange={(value) => setForm({ ...form, customerNotes: value })} />
            <FormText label="Notas internas" value={form.internalNotes} onChange={(value) => setForm({ ...form, internalNotes: value })} />
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setFormOpen(false)} className="min-h-11 rounded-xl border border-[var(--color-line)] px-5 text-sm font-semibold text-[var(--color-muted-strong)]">Cancelar</button>
              <button type="submit" disabled={saving || slots.length === 0 || !form.customerId} className="min-h-11 rounded-xl bg-[var(--color-burgundy)] px-5 text-sm font-semibold text-white disabled:opacity-60">{saving ? 'Guardando...' : 'Crear reservación'}</button>
            </div>
          </form>
        </Modal>
      ) : null}

      <QuickCustomerDialog open={customerDialogOpen} token={token} onClose={() => setCustomerDialogOpen(false)} onCreated={(customer) => { setCustomers((current) => [customer, ...current]); setForm((current) => ({ ...current, customerId: customer.id })); setToast('Cliente creado y seleccionado.') }} />

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
