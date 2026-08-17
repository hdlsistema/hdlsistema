import { BarChart3, BedDouble, BrushCleaning, CalendarRange, Check, DoorOpen, Loader2, LockKeyhole, Plus, RefreshCw, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../../contexts/AuthContext'
import { customersClient, type CustomerRecord } from '../../../services/customers.service'
import { lodgingClient, type LodgingCalendarEntry, type LodgingPackage, type LodgingStay, type LodgingUnit } from '../../../services/lodging.service'
import { ControlConfirmDialog } from '../../components/control/ControlConfirmDialog'
import { ControlEntityPicker } from '../../components/control/ControlEntityPicker'
import { QuickCustomerDialog } from '../../components/control/QuickCustomerDialog'
import { CrystalDateField } from '../../components/shared/CrystalDateField'
import { CrystalSelect } from '../../components/shared/CrystalSelect'
import { SectionTitle } from '../../components/shared/SectionTitle'
import { StatusBadge } from '../../components/shared/StatusBadge'
import { dateOnly, money, statusLabel } from './controlCopy'

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10)
}

function addDays(value: string, count: number) {
  const date = new Date(`${value}T12:00:00.000Z`)
  date.setUTCDate(date.getUTCDate() + count)
  return isoDate(date)
}

function dateRange(from: string, to: string) {
  const values: string[] = []
  let current = from
  while (current < to && values.length < 31) {
    values.push(current)
    current = addDays(current, 1)
  }
  return values
}

const today = isoDate(new Date())

const emptyUnit = { cabinPackageId: '', code: '', name: '', description: '', capacity: '2', baseRate: '0', operationalStatus: 'active', housekeepingStatus: 'clean' }
const emptyReservation = { customerId: '', cabinPackageId: '', unitId: '', checkIn: today, checkOut: addDays(today, 1), peopleCount: '2', status: 'pending', source: 'Centro de control', customerNotes: '', internalNotes: '' }
const emptyBlock = { unitId: '', startDate: today, endDate: addDays(today, 1), entryType: 'maintenance', reason: '' }

type ModalName = 'unit' | 'reservation' | 'block' | 'checkin' | null

function canWrite(roles: string[]) {
  return roles.some((role) => ['super_admin', 'admin', 'operations'].includes(role))
}

function entryLabel(entry: LodgingCalendarEntry) {
  if (entry.entryType === 'hold') return `Hold · ${entry.customerName ?? entry.reservationNumber ?? 'Cliente'}`
  if (entry.entryType === 'reservation') return entry.customerName ?? entry.reservationNumber ?? 'Reservada'
  const labels: Record<string, string> = { maintenance: 'Mantenimiento', owner_block: 'Bloqueo propietario', private_event: 'Evento privado', operations: 'Operación', other: 'Bloqueada' }
  return labels[entry.entryType] ?? 'Bloqueada'
}

function housekeepingLabel(value: string) {
  const labels: Record<string, string> = { clean: 'Limpia', dirty: 'Requiere limpieza', inspection: 'En inspección', out_of_service: 'Fuera de servicio' }
  return labels[value] ?? value
}

function stayStatusLabel(value: string) {
  const labels: Record<string, string> = { held: 'Solicitud pendiente', reserved: 'Reservada', checked_in: 'Huésped alojado', checked_out: 'Salida realizada', cancelled: 'Cancelada', no_show: 'No se presentó', expired: 'Solicitud vencida' }
  return labels[value] ?? statusLabel(value)
}

export function LodgingPage({ embedded = false }: { embedded?: boolean }) {
  const { session, roles } = useAuth()
  const token = session?.access_token
  const writable = canWrite(roles)
  const [units, setUnits] = useState<LodgingUnit[]>([])
  const [packages, setPackages] = useState<LodgingPackage[]>([])
  const [customers, setCustomers] = useState<CustomerRecord[]>([])
  const [entries, setEntries] = useState<LodgingCalendarEntry[]>([])
  const [stays, setStays] = useState<LodgingStay[]>([])
  const [from, setFrom] = useState(today)
  const [to, setTo] = useState(addDays(today, 14))
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [modal, setModal] = useState<ModalName>(null)
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false)
  const [unitForm, setUnitForm] = useState(emptyUnit)
  const [reservationForm, setReservationForm] = useState(emptyReservation)
  const [blockForm, setBlockForm] = useState(emptyBlock)
  const [checkinStay, setCheckinStay] = useState<LodgingStay | null>(null)
  const [guestName, setGuestName] = useState('')
  const [operationNotes, setOperationNotes] = useState('')
  const [checkoutStay, setCheckoutStay] = useState<LodgingStay | null>(null)
  const [releaseEntry, setReleaseEntry] = useState<LodgingCalendarEntry | null>(null)
  const [searchParams, setSearchParams] = useSearchParams()

  const days = useMemo(() => dateRange(from, to), [from, to])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [unitResponse, packageResponse, customerResponse, calendarResponse, stayResponse] = await Promise.all([
        lodgingClient.units(token),
        lodgingClient.packages(token),
        customersClient.list(token, { perPage: 100, status: 'published' }),
        lodgingClient.calendar(token, { from, to }),
        lodgingClient.stays(token),
      ])
      setUnits(unitResponse.data)
      setPackages(packageResponse.data)
      setCustomers(customerResponse.data)
      setEntries(calendarResponse.data)
      setStays(stayResponse.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible cargar hospedaje.')
    } finally {
      setLoading(false)
    }
  }, [from, to, token])

  useEffect(() => { void load() }, [load])

  useEffect(() => {
    if (searchParams.get('action') !== 'nueva-reservacion' || !writable) return
    setModal('reservation')
    const next = new URLSearchParams(searchParams)
    next.delete('action')
    setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams, writable])

  const metrics = useMemo(() => ({
    total: units.length,
    occupied: new Set(stays.filter((stay) => stay.status === 'checked_in').map((stay) => stay.unitId)).size,
    arrivals: stays.filter((stay) => stay.plannedCheckIn === today && ['held', 'reserved'].includes(stay.status)).length,
    dirty: units.filter((unit) => unit.housekeepingStatus === 'dirty').length,
  }), [stays, units])

  const calendarSummary = useMemo(() => {
    const byDay = days.map((day) => {
      const counts = { day, reserved: 0, holds: 0, blocked: 0, available: 0 }
      units.forEach((unit) => {
        const unavailable = unit.operationalStatus !== 'active' || unit.housekeepingStatus === 'out_of_service'
        const entry = entries.find((item) => item.unitId === unit.id && item.startDate <= day && item.endDate > day)
        if (unavailable || (entry && !['reservation', 'hold'].includes(entry.entryType))) counts.blocked += 1
        else if (entry?.entryType === 'reservation') counts.reserved += 1
        else if (entry?.entryType === 'hold') counts.holds += 1
        else counts.available += 1
      })
      return counts
    })
    const totals = byDay.reduce((sum, day) => ({
      reserved: sum.reserved + day.reserved,
      holds: sum.holds + day.holds,
      blocked: sum.blocked + day.blocked,
      available: sum.available + day.available,
    }), { reserved: 0, holds: 0, blocked: 0, available: 0 })
    const sellable = totals.reserved + totals.holds + totals.available
    const occupancy = sellable > 0 ? Math.round(((totals.reserved + totals.holds) / sellable) * 100) : 0
    return { byDay, totals, occupancy, sellable }
  }, [days, entries, units])

  const entryFor = (unitId: string, day: string) => entries.find((entry) => entry.unitId === unitId && entry.startDate <= day && entry.endDate > day)

  const submitUnit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (saving) return
    setSaving(true)
    setError('')
    try {
      await lodgingClient.createUnit(token, {
        cabinPackageId: unitForm.cabinPackageId || null,
        code: unitForm.code,
        name: unitForm.name,
        description: unitForm.description || null,
        capacity: Number(unitForm.capacity),
        baseRate: Number(unitForm.baseRate),
        currency: 'MXN',
        operationalStatus: unitForm.operationalStatus,
        housekeepingStatus: unitForm.housekeepingStatus,
      })
      setUnitForm(emptyUnit)
      setModal(null)
      setToast('Cabaña agregada al inventario de hospedaje.')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible crear la cabaña.')
    } finally { setSaving(false) }
  }

  const submitReservation = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (saving) return
    setSaving(true)
    setError('')
    try {
      await lodgingClient.createReservation(token, {
        customerId: reservationForm.customerId,
        cabinPackageId: reservationForm.cabinPackageId,
        unitId: reservationForm.unitId || null,
        checkIn: reservationForm.checkIn,
        checkOut: reservationForm.checkOut,
        peopleCount: Number(reservationForm.peopleCount),
        status: reservationForm.status,
        source: reservationForm.source,
        customerNotes: reservationForm.customerNotes || null,
        internalNotes: reservationForm.internalNotes || null,
        idempotencyKey: crypto.randomUUID(),
      })
      setReservationForm(emptyReservation)
      setModal(null)
      setToast('Reservación de cabaña creada y fechas bloqueadas.')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible crear la reservación.')
    } finally { setSaving(false) }
  }

  const submitBlock = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (saving) return
    setSaving(true)
    setError('')
    try {
      await lodgingClient.block(token, blockForm)
      setBlockForm(emptyBlock)
      setModal(null)
      setToast('Fechas bloqueadas en el calendario.')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible bloquear las fechas.')
    } finally { setSaving(false) }
  }

  const submitCheckIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!checkinStay || saving) return
    setSaving(true)
    setError('')
    try {
      await lodgingClient.checkIn(token, checkinStay.reservationId, { guestManifest: guestName.trim() ? [{ fullName: guestName.trim() }] : [], notes: operationNotes || null })
      setCheckinStay(null)
      setGuestName('')
      setOperationNotes('')
      setModal(null)
      setToast('Check-in de cabaña registrado.')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible registrar el check-in.')
    } finally { setSaving(false) }
  }

  const confirmCheckOut = async () => {
    if (!checkoutStay || saving) return
    setSaving(true)
    setError('')
    try {
      await lodgingClient.checkOut(token, checkoutStay.reservationId, { notes: operationNotes || null })
      setCheckoutStay(null)
      setOperationNotes('')
      setToast('Check-out registrado; la cabaña quedó pendiente de limpieza.')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible registrar el check-out.')
    } finally { setSaving(false) }
  }

  const confirmReleaseEntry = async () => {
    if (!releaseEntry || saving) return
    setSaving(true)
    setError('')
    try {
      await lodgingClient.releaseBlock(token, releaseEntry.id)
      setReleaseEntry(null)
      setToast('Bloqueo liberado; las noches vuelven a estar disponibles.')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible liberar el bloqueo.')
    } finally { setSaving(false) }
  }

  const setHousekeeping = async (unit: LodgingUnit, housekeepingStatus: string) => {
    try {
      await lodgingClient.updateUnit(token, unit.id, { housekeepingStatus })
      setToast(`Estado de ${unit.name} actualizado.`)
      await load()
    } catch (err) { setError(err instanceof Error ? err.message : 'No fue posible actualizar limpieza.') }
  }

  const fieldClass = 'min-h-11 w-full rounded-xl border border-[var(--color-line)] bg-white px-3 text-sm text-[var(--color-ink)] outline-none focus:border-[var(--color-burgundy)]'

  return (
    <div className="control-page min-w-0 space-y-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        {embedded
          ? <div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-gold)]">Control de hospedaje</p><h2 className="mt-1 text-2xl font-semibold text-[var(--color-ink)]">Cabañas</h2><p className="mt-1 text-sm text-[var(--color-muted)]">Inventario físico, venta por noche, recepción y limpieza en una sola vista.</p></div>
          : <SectionTitle eyebrow="Operación de cabañas" title="Hospedaje y disponibilidad" subtitle="Inventario por cabaña, bloqueos nocturnos, llegadas, salidas y limpieza." />}
        <div className="flex flex-wrap gap-2">
          <Link to="/control/servicios" className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[var(--color-line)] bg-white px-3 text-xs font-semibold text-[var(--color-burgundy)]"><BedDouble size={15} />Paquetes y fotos</Link>
          <button type="button" onClick={() => void load()} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[var(--color-line)] bg-white px-3 text-xs font-semibold"><RefreshCw size={15} className={loading ? 'animate-spin' : ''} />Actualizar</button>
          <button type="button" onClick={() => setModal('block')} disabled={!writable || units.length === 0} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[var(--color-line)] bg-white px-3 text-xs font-semibold text-[var(--color-burgundy)] disabled:opacity-45"><LockKeyhole size={15} />Bloquear fechas</button>
          <button type="button" onClick={() => setModal('unit')} disabled={!writable} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[var(--color-line)] bg-white px-3 text-xs font-semibold text-[var(--color-burgundy)] disabled:opacity-45"><Plus size={15} />Agregar cabaña</button>
          <button type="button" onClick={() => setModal('reservation')} disabled={!writable || units.length === 0} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[var(--color-burgundy)] px-4 text-xs font-semibold text-white disabled:opacity-45"><CalendarRange size={15} />Nueva reservación</button>
        </div>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={BedDouble} label="Cabañas" value={String(metrics.total)} detail="Inventario físico" />
        <Metric icon={DoorOpen} label="Ocupadas ahora" value={String(metrics.occupied)} detail="Check-in activo" />
        <Metric icon={CalendarRange} label="Llegadas hoy" value={String(metrics.arrivals)} detail="Pendientes de recepción" />
        <Metric icon={BrushCleaning} label="Por limpiar" value={String(metrics.dirty)} detail="Housekeeping" />
      </section>

      <section aria-label="Gráficas de ocupación de cabañas" className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <article className="rounded-xl border border-[var(--color-line)] bg-[var(--color-panel)] p-5 shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-gold)]">Ocupación del periodo</p><h3 className="mt-1 text-base font-semibold">Noches vendibles</h3></div><BarChart3 size={18} className="text-[var(--color-burgundy)]" /></div>
          <div className="mt-5 flex items-center gap-5">
            <div className="grid h-32 w-32 shrink-0 place-items-center rounded-full" style={{ background: `conic-gradient(#6f1029 0 ${calendarSummary.occupancy}%, #e8eee4 ${calendarSummary.occupancy}% 100%)` }}><div className="grid h-[92px] w-[92px] place-items-center rounded-full bg-[var(--color-panel)] text-center"><div><p className="text-3xl font-semibold text-[var(--color-ink)]">{calendarSummary.occupancy}%</p><p className="text-[9px] uppercase text-[var(--color-muted)]">ocupación</p></div></div></div>
            <div className="space-y-2 text-xs"><Legend color="#6f1029" label={`${calendarSummary.totals.reserved} reservadas`} /><Legend color="#d3a347" label={`${calendarSummary.totals.holds} en hold`} /><Legend color="#b85f54" label={`${calendarSummary.totals.blocked} bloqueadas`} /><Legend color="#76906d" label={`${calendarSummary.totals.available} disponibles`} /></div>
          </div>
          <p className="mt-4 rounded-lg bg-[var(--color-soft)] px-3 py-2 text-[10px] text-[var(--color-muted)]">La ocupación se calcula sobre noches vendibles; mantenimiento y fuera de servicio no inflan el porcentaje.</p>
        </article>
        <article className="min-w-0 rounded-xl border border-[var(--color-line)] bg-[var(--color-panel)] p-5 shadow-[var(--shadow-card)]">
          <div><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-gold)]">Pronóstico operativo</p><h3 className="mt-1 text-base font-semibold">Disponibilidad diaria por color</h3></div>
          <div className="mt-5 overflow-x-auto pb-2">
            <div className="flex min-w-max items-end gap-3">
              {calendarSummary.byDay.map((item) => {
                const total = Math.max(units.length, 1)
                return <div key={`summary-${item.day}`} className="w-14 text-center"><div className="flex h-32 flex-col-reverse overflow-hidden rounded-lg bg-[var(--color-soft)]" title={`${item.available} disponibles · ${item.reserved} reservadas · ${item.holds} holds · ${item.blocked} bloqueadas`}><span style={{ height: `${(item.available / total) * 100}%` }} className="bg-[#76906d]" /><span style={{ height: `${(item.reserved / total) * 100}%` }} className="bg-[#6f1029]" /><span style={{ height: `${(item.holds / total) * 100}%` }} className="bg-[#d3a347]" /><span style={{ height: `${(item.blocked / total) * 100}%` }} className="bg-[#b85f54]" /></div><p className="mt-2 text-[9px] font-semibold uppercase text-[var(--color-muted)]">{shortDay(item.day)}</p><p className="text-[9px] text-[#5f7d63]">{item.available} libres</p></div>
              })}
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2"><Legend color="#76906d" label="Disponible" /><Legend color="#6f1029" label="Reservada" /><Legend color="#d3a347" label="Hold pendiente" /><Legend color="#b85f54" label="Bloqueada" /></div>
        </article>
      </section>

      <section className="rounded-xl border border-[var(--color-line)] bg-[var(--color-panel)] shadow-[var(--shadow-card)]">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-line)] px-4 py-3"><div><h2 className="text-base font-semibold">Inventario de cabañas</h2><p className="mt-0.5 text-[10px] text-[var(--color-muted)]">Paquetes comerciales publicados y cabañas físicas asignadas.</p></div><span className="rounded-full bg-[var(--color-soft)] px-3 py-1 text-[10px] font-semibold uppercase text-[var(--color-muted)]">{packages.length} paquetes · {units.length} unidades</span></header>
        <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
          {packages.length === 0 ? <p className="text-sm text-[var(--color-muted)]">Aún no hay paquetes de cabaña configurados en Servicios y sedes.</p> : packages.map((item) => {
            const assigned = units.filter((unit) => unit.cabinPackageId === item.id)
            return <article key={item.id} className="flex min-w-0 gap-3 rounded-xl border border-[var(--color-line)] bg-white p-3">{item.cover_image_url ? <img src={item.cover_image_url} alt="" className="h-16 w-20 rounded-lg object-cover" /> : <span className="grid h-16 w-20 shrink-0 place-items-center rounded-lg bg-[var(--color-soft)] text-[var(--color-burgundy)]"><BedDouble size={20} /></span>}<div className="min-w-0"><p className="truncate text-sm font-semibold">{item.name}</p><p className="mt-1 text-[10px] text-[var(--color-muted)]">{item.nights} noche(s) · {money(item.price, item.currency)}</p><p className={`mt-2 text-[10px] font-semibold ${assigned.length ? 'text-[#5f7d63]' : 'text-[#a85a46]'}`}>{assigned.length ? `${assigned.length} cabaña(s) física(s)` : 'Sin unidad física asignada'}</p></div></article>
          })}
        </div>
      </section>

      <section className="rounded-xl border border-[var(--color-line)] bg-[var(--color-panel)] p-4 shadow-[var(--shadow-card)]">
        <div className="flex flex-wrap items-end gap-3">
          <CrystalDateField value={from} onChange={setFrom} label="Desde" placeholder="Entrada" className="min-w-[170px]" />
          <CrystalDateField value={to} onChange={setTo} label="Hasta" placeholder="Salida" className="min-w-[170px]" />
          <p className="pb-2 text-xs text-[var(--color-muted)]">Las noches se manejan en intervalo de entrada inclusiva y salida exclusiva para evitar cruces de ocupación.</p>
        </div>
      </section>

      {error ? <div className="rounded-lg border border-[#ead8c5] bg-[#fff7ed] px-4 py-3 text-sm text-[#8a4b16]">{error}</div> : null}

      <section className="overflow-hidden rounded-xl border border-[var(--color-line)] bg-[var(--color-panel)] shadow-[var(--shadow-card)]">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-line)] px-4 py-3"><div><h2 className="text-base font-semibold">Calendario por cabaña</h2><div className="mt-2 flex flex-wrap gap-x-3 gap-y-1"><Legend color="#76906d" label="Disponible" /><Legend color="#6f1029" label="Reservada" /><Legend color="#d3a347" label="Hold" /><Legend color="#b85f54" label="Bloqueada / fuera de servicio" /></div></div><span className="text-xs text-[var(--color-muted)]">{days.length} noches visibles</span></header>
        <div className="overflow-x-auto">
          <div className="min-w-max" style={{ display: 'grid', gridTemplateColumns: `190px repeat(${Math.max(days.length, 1)}, minmax(92px, 1fr))` }}>
            <div className="sticky left-0 z-20 border-b border-r border-[var(--color-line)] bg-[var(--color-soft)] px-3 py-2 text-[10px] font-semibold uppercase text-[var(--color-muted)]">Cabaña</div>
            {days.map((day) => <div key={day} className="border-b border-r border-[var(--color-line)] bg-[var(--color-soft)] px-2 py-2 text-center text-[10px] font-semibold uppercase text-[var(--color-muted)]">{new Intl.DateTimeFormat('es-MX', { weekday: 'short', day: '2-digit', month: 'short', timeZone: 'UTC' }).format(new Date(`${day}T12:00:00Z`))}</div>)}
            {loading ? <div className="col-span-full flex min-h-36 items-center justify-center text-sm text-[var(--color-muted)]"><Loader2 size={18} className="mr-2 animate-spin" />Cargando calendario...</div> : null}
            {!loading && units.length === 0 ? <div className="col-span-full min-h-32 p-8 text-center text-sm text-[var(--color-muted)]">Agrega la primera cabaña física para comenzar a controlar noches.</div> : null}
            {!loading && units.map((unit) => (
              <div key={unit.id} className="contents">
                <div className="sticky left-0 z-10 border-b border-r border-[var(--color-line)] bg-white px-3 py-2">
                  <p className="text-xs font-semibold text-[var(--color-ink)]">{unit.code} · {unit.name}</p>
                  <div className="mt-1 flex items-center gap-2"><span className="text-[10px] text-[var(--color-muted)]">{unit.capacity} pers.</span><CrystalSelect value={unit.housekeepingStatus} onChange={(value) => void setHousekeeping(unit, value)} disabled={!writable} className="min-h-7 text-[10px]"><option value="clean">Limpia</option><option value="dirty">Por limpiar</option><option value="inspection">Inspección</option><option value="out_of_service">Fuera de servicio</option></CrystalSelect></div>
                </div>
                {days.map((day) => {
                  const entry = entryFor(unit.id, day)
                  const unavailable = unit.operationalStatus !== 'active' || unit.housekeepingStatus === 'out_of_service'
                  return <div key={`${unit.id}-${day}`} className="min-h-16 border-b border-r border-[var(--color-line)] p-1.5">{entry ? <button type="button" title={`${entryLabel(entry)} · ${entry.startDate} a ${entry.endDate}`} onClick={() => !entry.reservationId && writable ? setReleaseEntry(entry) : undefined} className={`h-full min-h-12 w-full rounded-md px-2 py-1 text-left text-[10px] font-semibold ${entry.entryType === 'reservation' ? 'bg-[#ead9df] text-[#6f1029]' : entry.entryType === 'hold' ? 'bg-[#fff0ce] text-[#8a5b13]' : 'bg-[#f3e1df] text-[#8b4038]'}`}><span className="line-clamp-2">{entryLabel(entry)}</span>{entry.entryType === 'hold' && entry.expiresAt ? <span className="mt-0.5 block text-[9px] font-normal">vence {new Intl.DateTimeFormat('es-MX', { hour: '2-digit', minute: '2-digit' }).format(new Date(entry.expiresAt))}</span> : null}</button> : unavailable ? <span className="flex h-full min-h-12 items-center justify-center rounded-md bg-[#f3e1df] px-2 text-center text-[9px] font-semibold text-[#8b4038]">Fuera de venta</span> : <span className="flex h-full min-h-12 items-center justify-center rounded-md bg-[#e8eee4] text-[9px] font-semibold text-[#53704f]">Disponible</span>}</div>
                })}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-[var(--color-line)] bg-[var(--color-panel)] shadow-[var(--shadow-card)]">
        <header className="flex items-center justify-between border-b border-[var(--color-line)] px-4 py-3"><h2 className="text-base font-semibold">Recepción y estancias</h2><span className="text-xs text-[var(--color-muted)]">{stays.length} registros</span></header>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-xs">
            <thead className="bg-[var(--color-soft)] text-[10px] uppercase tracking-[0.08em] text-[var(--color-muted)]"><tr><th className="px-3 py-2">Folio</th><th className="px-3 py-2">Cliente</th><th className="px-3 py-2">Cabaña</th><th className="px-3 py-2">Entrada</th><th className="px-3 py-2">Salida</th><th className="px-3 py-2">Estado</th><th className="px-3 py-2">Acciones</th></tr></thead>
            <tbody className="divide-y divide-[var(--color-line)]">{stays.map((stay) => <tr key={stay.id}><td className="px-3 py-2 font-semibold">{stay.reservationNumber ?? 'Sin folio'}</td><td className="px-3 py-2"><p className="font-semibold">{stay.customerName ?? 'Cliente'}</p><p className="text-[10px] text-[var(--color-muted)]">{stay.peopleCount} huéspedes</p></td><td className="px-3 py-2">{stay.unitCode} · {stay.unitName}<p className="text-[10px] text-[var(--color-muted)]">{housekeepingLabel(stay.housekeepingStatus)}</p></td><td className="px-3 py-2">{dateOnly(stay.plannedCheckIn)}</td><td className="px-3 py-2">{dateOnly(stay.plannedCheckOut)}</td><td className="px-3 py-2"><StatusBadge label={stayStatusLabel(stay.status)} /></td><td className="px-3 py-2"><div className="flex gap-2">{['held', 'reserved'].includes(stay.status) ? <button type="button" disabled={!writable} onClick={() => { setCheckinStay(stay); setGuestName(stay.customerName ?? ''); setModal('checkin') }} className="rounded-md border border-[var(--color-line)] px-2 py-1 font-semibold text-[var(--color-burgundy)] disabled:opacity-45">Check-in</button> : null}{stay.status === 'checked_in' ? <button type="button" disabled={!writable} onClick={() => setCheckoutStay(stay)} className="rounded-md bg-[var(--color-burgundy)] px-2 py-1 font-semibold text-white disabled:opacity-45">Check-out</button> : null}</div></td></tr>)}</tbody>
          </table>
        </div>
      </section>

      {modal === 'unit' ? <Modal title="Agregar cabaña física" onClose={() => setModal(null)}><form onSubmit={submitUnit} className="grid gap-3 md:grid-cols-2"><ControlEntityPicker label="Paquete comercial" value={unitForm.cabinPackageId} options={packages.map((item) => ({ id: item.id, label: item.name, description: `${item.nights} noche(s) · ${money(item.price, item.currency)}` }))} onChange={(cabinPackageId) => { const item = packages.find((value) => value.id === cabinPackageId); setUnitForm({ ...unitForm, cabinPackageId, baseRate: item ? String(item.price) : unitForm.baseRate, capacity: item ? String(item.max_guests) : unitForm.capacity }) }} /><Field label="Código" value={unitForm.code} onChange={(code) => setUnitForm({ ...unitForm, code })} required /><Field label="Nombre operativo" value={unitForm.name} onChange={(name) => setUnitForm({ ...unitForm, name })} required /><Field label="Capacidad" type="number" value={unitForm.capacity} onChange={(capacity) => setUnitForm({ ...unitForm, capacity })} required /><Field label="Tarifa base" type="number" value={unitForm.baseRate} onChange={(baseRate) => setUnitForm({ ...unitForm, baseRate })} required /><label><span className="mb-1 block text-[10px] font-semibold uppercase text-[var(--color-muted)]">Estado operativo</span><CrystalSelect value={unitForm.operationalStatus} onChange={(operationalStatus) => setUnitForm({ ...unitForm, operationalStatus })}><option value="active">Activa</option><option value="inactive">Inactiva</option><option value="maintenance">Mantenimiento</option></CrystalSelect></label><label className="md:col-span-2"><span className="mb-1 block text-[10px] font-semibold uppercase text-[var(--color-muted)]">Descripción interna</span><textarea value={unitForm.description} onChange={(event) => setUnitForm({ ...unitForm, description: event.target.value })} rows={3} className={fieldClass} /></label><SubmitBar saving={saving} onCancel={() => setModal(null)} label="Agregar cabaña" /></form></Modal> : null}

      {modal === 'reservation' ? <Modal title="Nueva reservación de cabaña" onClose={() => setModal(null)}><form onSubmit={submitReservation} className="grid gap-3 md:grid-cols-2"><ControlEntityPicker label="Cliente" value={reservationForm.customerId} options={customers.map((item) => ({ id: item.id, label: item.displayName, description: [item.email, item.phone].filter(Boolean).join(' · ') || item.customerNumber }))} onChange={(customerId) => setReservationForm({ ...reservationForm, customerId })} actionLabel="Crear cliente nuevo" onAction={() => setCustomerDialogOpen(true)} required /><ControlEntityPicker label="Paquete" value={reservationForm.cabinPackageId} options={packages.map((item) => ({ id: item.id, label: item.name, description: `${item.nights} noche(s) · ${money(item.price, item.currency)}` }))} onChange={(cabinPackageId) => setReservationForm({ ...reservationForm, cabinPackageId, unitId: '' })} required /><ControlEntityPicker label="Cabaña específica (opcional)" value={reservationForm.unitId} options={units.filter((item) => !reservationForm.cabinPackageId || !item.cabinPackageId || item.cabinPackageId === reservationForm.cabinPackageId).map((item) => ({ id: item.id, label: `${item.code} · ${item.name}`, description: `${item.capacity} personas · ${housekeepingLabel(item.housekeepingStatus)}` }))} onChange={(unitId) => setReservationForm({ ...reservationForm, unitId })} emptyMessage="Sin unidades compatibles" /><Field label="Huéspedes" type="number" value={reservationForm.peopleCount} onChange={(peopleCount) => setReservationForm({ ...reservationForm, peopleCount })} required /><CrystalDateField value={reservationForm.checkIn} onChange={(checkIn) => setReservationForm({ ...reservationForm, checkIn, checkOut: reservationForm.checkOut <= checkIn ? addDays(checkIn, 1) : reservationForm.checkOut })} label="Entrada" /><CrystalDateField value={reservationForm.checkOut} onChange={(checkOut) => setReservationForm({ ...reservationForm, checkOut })} label="Salida" /><label><span className="mb-1 block text-[10px] font-semibold uppercase text-[var(--color-muted)]">Estado</span><CrystalSelect value={reservationForm.status} onChange={(status) => setReservationForm({ ...reservationForm, status })}><option value="pending">Pendiente; bloquea hasta resolución</option><option value="confirmed">Confirmada</option></CrystalSelect></label><label><span className="mb-1 block text-[10px] font-semibold uppercase text-[var(--color-muted)]">Canal</span><CrystalSelect value={reservationForm.source} onChange={(source) => setReservationForm({ ...reservationForm, source })}><option>Centro de control</option><option>Teléfono</option><option>WhatsApp</option><option>Mostrador</option><option>Agencia</option><option>Web</option><option>App</option><option>Otro</option></CrystalSelect></label><label className="md:col-span-2"><span className="mb-1 block text-[10px] font-semibold uppercase text-[var(--color-muted)]">Notas del cliente</span><textarea value={reservationForm.customerNotes} onChange={(event) => setReservationForm({ ...reservationForm, customerNotes: event.target.value })} rows={2} className={fieldClass} /></label><label className="md:col-span-2"><span className="mb-1 block text-[10px] font-semibold uppercase text-[var(--color-muted)]">Notas internas</span><textarea value={reservationForm.internalNotes} onChange={(event) => setReservationForm({ ...reservationForm, internalNotes: event.target.value })} rows={2} className={fieldClass} /></label><SubmitBar saving={saving} onCancel={() => setModal(null)} label="Crear y bloquear fechas" /></form></Modal> : null}

      {modal === 'block' ? <Modal title="Bloquear fechas" onClose={() => setModal(null)}><form onSubmit={submitBlock} className="grid gap-3 md:grid-cols-2"><ControlEntityPicker label="Cabaña" value={blockForm.unitId} options={units.map((item) => ({ id: item.id, label: `${item.code} · ${item.name}`, description: housekeepingLabel(item.housekeepingStatus) }))} onChange={(unitId) => setBlockForm({ ...blockForm, unitId })} required /><label><span className="mb-1 block text-[10px] font-semibold uppercase text-[var(--color-muted)]">Motivo</span><CrystalSelect value={blockForm.entryType} onChange={(entryType) => setBlockForm({ ...blockForm, entryType })}><option value="maintenance">Mantenimiento</option><option value="owner_block">Bloqueo propietario</option><option value="private_event">Evento privado</option><option value="operations">Operación</option><option value="other">Otro</option></CrystalSelect></label><CrystalDateField value={blockForm.startDate} onChange={(startDate) => setBlockForm({ ...blockForm, startDate, endDate: blockForm.endDate <= startDate ? addDays(startDate, 1) : blockForm.endDate })} label="Desde" /><CrystalDateField value={blockForm.endDate} onChange={(endDate) => setBlockForm({ ...blockForm, endDate })} label="Hasta" /><Field label="Detalle del bloqueo" value={blockForm.reason} onChange={(reason) => setBlockForm({ ...blockForm, reason })} required wide /><SubmitBar saving={saving} onCancel={() => setModal(null)} label="Bloquear fechas" /></form></Modal> : null}

      {modal === 'checkin' && checkinStay ? <Modal title={`Check-in · ${checkinStay.reservationNumber ?? checkinStay.unitName}`} onClose={() => setModal(null)}><form onSubmit={submitCheckIn} className="grid gap-3"><Field label="Huésped principal" value={guestName} onChange={setGuestName} required /><label><span className="mb-1 block text-[10px] font-semibold uppercase text-[var(--color-muted)]">Notas de recepción</span><textarea value={operationNotes} onChange={(event) => setOperationNotes(event.target.value)} rows={3} className={fieldClass} /></label><div className="rounded-lg bg-[var(--color-soft)] p-3 text-xs text-[var(--color-muted-strong)]">Cabaña {checkinStay.unitCode} · {checkinStay.unitName} · salida {dateOnly(checkinStay.plannedCheckOut)}</div><SubmitBar saving={saving} onCancel={() => setModal(null)} label="Registrar check-in" /></form></Modal> : null}

      <QuickCustomerDialog open={customerDialogOpen} token={token} onClose={() => setCustomerDialogOpen(false)} onCreated={(customer) => { setCustomers((current) => [customer, ...current]); setReservationForm((current) => ({ ...current, customerId: customer.id })); setToast('Cliente creado y seleccionado.') }} />
      <ControlConfirmDialog open={Boolean(checkoutStay)} title="Registrar check-out" message={checkoutStay ? `${checkoutStay.customerName ?? 'El huésped'} saldrá de ${checkoutStay.unitCode}. La cabaña quedará marcada para limpieza.` : ''} confirmLabel="Registrar salida" busy={saving} onCancel={() => { setCheckoutStay(null); setOperationNotes('') }} onConfirm={confirmCheckOut}><label className="block"><span className="mb-1 block text-[10px] font-semibold uppercase text-[var(--color-muted)]">Notas de salida</span><textarea value={operationNotes} onChange={(event) => setOperationNotes(event.target.value)} rows={3} className={fieldClass} /></label></ControlConfirmDialog>
      <ControlConfirmDialog open={Boolean(releaseEntry)} title="Liberar bloqueo de cabaña" message={releaseEntry ? `${entryLabel(releaseEntry)} dejará de bloquear ${releaseEntry.unitCode} del ${dateOnly(releaseEntry.startDate)} al ${dateOnly(releaseEntry.endDate)}.` : ''} confirmLabel="Liberar fechas" busy={saving} onCancel={() => setReleaseEntry(null)} onConfirm={confirmReleaseEntry} />
      {toast ? <div className="fixed bottom-6 right-6 z-[180] rounded-xl border border-[#cfddca] bg-white px-4 py-3 text-sm font-semibold text-[#5f7d63] shadow-xl">{toast}<button type="button" onClick={() => setToast('')} className="ml-3"><X size={14} /></button></div> : null}
    </div>
  )
}

function shortDay(value: string) {
  return new Intl.DateTimeFormat('es-MX', { weekday: 'short', day: '2-digit', timeZone: 'UTC' }).format(new Date(`${value}T12:00:00Z`))
}

function Legend({ color, label }: { color: string; label: string }) {
  return <span className="inline-flex items-center gap-1.5 text-[10px] text-[var(--color-muted-strong)]"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />{label}</span>
}

function Metric({ icon: Icon, label, value, detail }: { icon: typeof BedDouble; label: string; value: string; detail: string }) {
  return <article className="rounded-xl border border-[var(--color-line)] bg-[var(--color-panel)] p-4 shadow-[var(--shadow-card)]"><div className="flex items-start justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-muted)]">{label}</p><p className="mt-1 text-2xl font-semibold text-[var(--color-ink)]">{value}</p><p className="mt-1 text-xs text-[var(--color-muted)]">{detail}</p></div><span className="rounded-lg bg-[var(--color-soft)] p-2 text-[var(--color-burgundy)]"><Icon size={17} /></span></div></article>
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return <div className="control-form-overlay fixed inset-0 z-[150] flex items-center justify-center bg-[#210711]/68 p-4 backdrop-blur-sm"><button type="button" aria-label="Cerrar" onClick={onClose} className="absolute inset-0" /><section className="control-form-surface relative z-10 max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-[var(--color-line)] bg-[var(--color-page)] p-5 shadow-[0_35px_90px_rgba(29,5,12,0.38)]" role="dialog" aria-modal="true" aria-label={title}><header className="control-form-header mb-5 flex items-center justify-between"><h2 className="text-xl font-semibold text-[var(--color-burgundy)]">{title}</h2><button type="button" onClick={onClose} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--color-line)] bg-white" aria-label="Cerrar"><X size={16} /></button></header>{children}</section></div>
}

function Field({ label, value, onChange, type = 'text', required, wide }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean; wide?: boolean }) {
  return <label className={wide ? 'md:col-span-2' : ''}><span className="mb-1 block text-[10px] font-semibold uppercase text-[var(--color-muted)]">{label}{required ? ' *' : ''}</span><input required={required} type={type} min={type === 'number' ? '0' : undefined} value={value} onChange={(event) => onChange(event.target.value)} className="min-h-11 w-full rounded-xl border border-[var(--color-line)] bg-white px-3 text-sm text-[var(--color-ink)] outline-none focus:border-[var(--color-burgundy)]" /></label>
}

function SubmitBar({ saving, onCancel, label }: { saving: boolean; onCancel: () => void; label: string }) {
  return <div className="flex justify-end gap-2 md:col-span-2"><button type="button" onClick={onCancel} className="min-h-10 rounded-lg border border-[var(--color-line)] px-4 text-sm font-semibold">Cancelar</button><button type="submit" disabled={saving} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[var(--color-burgundy)] px-4 text-sm font-semibold text-white disabled:opacity-55">{saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}{label}</button></div>
}
