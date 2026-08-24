import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import jsQR from 'jsqr'
import {
  CalendarClock,
  Camera,
  Check,
  ClipboardList,
  Download,
  ExternalLink,
  ImageIcon,
  KeyRound,
  QrCode,
  ReceiptText,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Ticket,
  UserCheck,
  Users,
  WalletCards,
  X,
} from 'lucide-react'
import { useAuth } from '../../../contexts/AuthContext'
import {
  accessPassClient,
  checkinsClient,
  type AccessPassRecord,
  type AccessPassValidation,
  type CheckinRecord,
} from '../../../services/commerce.service'
import { reservationsClient, type ReservationRecord } from '../../../services/operations.service'
import { SectionTitle } from '../../components/shared/SectionTitle'
import { CrystalDateTimeField } from '../../components/shared/CrystalDateField'
import { StatusBadge } from '../../components/shared/StatusBadge'
import { ControlConfirmDialog } from '../../components/control/ControlConfirmDialog'
import { ControlEntityPicker } from '../../components/control/ControlEntityPicker'
import { normalizeAccessQrCode } from '../../utils/accessQr'

type PassForm = {
  reservationId: string
  validFrom: string
  validUntil: string
}

type PendingCheckinAction = {
  title: string
  message: string
  confirmLabel: string
  tone?: 'default' | 'danger'
  requiresReason?: boolean
  action: (reason: string) => Promise<unknown>
  success: string
}

export type CheckinEventGroup = {
  key: string
  title: string
  imageUrl: string | null
  capacity: number
  checkedIn: number
  totalPasses: number
  totalGuests: number
  occupancy: number
  startsAt: string | null
  endsAt: string | null
  ticketTotal: number | null
  sources: string[]
  passes: AccessPassRecord[]
  checkins: CheckinRecord[]
}

const emptyPassForm: PassForm = {
  reservationId: '',
  validFrom: '',
  validUntil: '',
}

function dateLabel(value?: string | null) {
  if (!value) return 'Sin fecha'
  return new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

function shortDateLabel(value?: string | null) {
  if (!value) return 'Sin fecha'
  return new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
}

function moneyLabel(value?: number | null) {
  if (value === null || value === undefined) return 'Sin total'
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value)
}

export function sourceLabel(value?: string | null) {
  const raw = String(value ?? '').trim()
  const normalized = raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  if (!raw) return 'Sin origen'
  if (normalized.includes('app') || normalized.includes('mobile')) return 'App'
  if (normalized.includes('web') || normalized.includes('public') || normalized.includes('online')) return 'Web'
  if (normalized.includes('control') || normalized.includes('manual') || normalized.includes('mostrador') || normalized.includes('hacienda')) return 'Hacienda'
  return raw
}

export function occupancyPercent(checkedIn: number, capacity: number) {
  if (!Number.isFinite(capacity) || capacity <= 0) return 0
  return Math.max(0, Math.min(100, Math.round((checkedIn / capacity) * 100)))
}

function positiveNumber(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
}

function latestDate(values: Array<string | null | undefined>) {
  return values
    .filter(Boolean)
    .sort((a, b) => new Date(String(b)).getTime() - new Date(String(a)).getTime())[0] ?? null
}

function accessGroupKey(pass: AccessPassRecord) {
  if (pass.eventId) return `${pass.accessType ?? 'evento'}:${pass.eventId}`
  if (pass.eventTicketTypeId) return `boleto:${pass.eventTicketTypeId}`
  if (pass.reservationId) return `reservacion:${pass.reservationId}`
  return `pase:${pass.id}`
}

function eventEditPath(group: CheckinEventGroup) {
  const eventId = group.passes.find((pass) => pass.eventId)?.eventId ?? group.checkins.find((checkin) => checkin.eventId)?.eventId
  return eventId ? `/control/eventos-magnos?recordId=${encodeURIComponent(eventId)}` : null
}

function emptyGroupFromPass(pass: AccessPassRecord): CheckinEventGroup {
  const fallbackTitle = pass.ticketTypeName ?? pass.reservationNumber ?? pass.orderNumber ?? pass.passNumber ?? 'Acceso'
  const capacity = positiveNumber(pass.eventCapacity) || positiveNumber(pass.ticketCapacity) || positiveNumber(pass.peopleCount) || 1
  return {
    key: accessGroupKey(pass),
    title: pass.eventOrExperience ?? fallbackTitle,
    imageUrl: pass.eventImageUrl ?? null,
    capacity,
    checkedIn: 0,
    totalPasses: 0,
    totalGuests: 0,
    occupancy: 0,
    startsAt: pass.eventStartsAt ?? pass.validFrom ?? null,
    endsAt: pass.eventEndsAt ?? pass.validUntil ?? null,
    ticketTotal: null,
    sources: [],
    passes: [],
    checkins: [],
  }
}

export function buildCheckinEventGroups(passes: AccessPassRecord[], checkins: CheckinRecord[]) {
  const groups = new Map<string, CheckinEventGroup>()
  const passById = new Map(passes.map((pass) => [pass.id, pass]))
  const totalsByGroup = new Map<string, Map<string, number>>()

  const recordTotal = (groupKey: string, transactionKey: string, value?: number | null) => {
    if (!value || value <= 0) return
    const totals = totalsByGroup.get(groupKey) ?? new Map<string, number>()
    totals.set(transactionKey, value)
    totalsByGroup.set(groupKey, totals)
  }

  for (const pass of passes) {
    const key = accessGroupKey(pass)
    const current = groups.get(key) ?? emptyGroupFromPass(pass)
    const capacity = positiveNumber(pass.eventCapacity) || positiveNumber(pass.ticketCapacity)
    current.capacity = Math.max(current.capacity, capacity || 0)
    current.totalPasses += 1
    current.totalGuests += positiveNumber(pass.peopleCount) || 1
    recordTotal(key, pass.orderId ? `orden:${pass.orderId}` : pass.reservationId ? `reservacion:${pass.reservationId}` : `pase:${pass.id}`, pass.orderTotal ?? pass.reservationTotal)
    current.startsAt = current.startsAt ?? pass.eventStartsAt ?? pass.validFrom ?? null
    current.endsAt = current.endsAt ?? pass.eventEndsAt ?? pass.validUntil ?? null
    current.imageUrl = current.imageUrl ?? pass.eventImageUrl ?? null
    const source = sourceLabel(pass.purchaseSource)
    if (source !== 'Sin origen' && !current.sources.includes(source)) current.sources.push(source)
    current.passes.push(pass)
    groups.set(key, current)
  }

  for (const checkin of checkins) {
    const pass = passById.get(checkin.accessPassId)
    const key = pass ? accessGroupKey(pass) : checkin.eventId ? `evento:${checkin.eventId}` : `pase:${checkin.accessPassId}`
    const current = groups.get(key) ?? {
      key,
      title: checkin.eventOrExperience ?? checkin.ticketTypeName ?? checkin.reservationNumber ?? checkin.orderNumber ?? 'Acceso',
      imageUrl: checkin.eventImageUrl ?? null,
      capacity: positiveNumber(checkin.eventCapacity) || 1,
      checkedIn: 0,
      totalPasses: 0,
      totalGuests: 0,
      occupancy: 0,
      startsAt: checkin.eventStartsAt ?? null,
      endsAt: checkin.eventEndsAt ?? checkin.validUntil ?? null,
      ticketTotal: checkin.orderTotal ?? null,
      sources: [],
      passes: [],
      checkins: [],
    }
    if (checkin.status === 'active') current.checkedIn += 1
    current.capacity = Math.max(current.capacity, positiveNumber(checkin.eventCapacity) || 0)
    current.imageUrl = current.imageUrl ?? checkin.eventImageUrl ?? null
    current.startsAt = current.startsAt ?? checkin.eventStartsAt ?? null
    current.endsAt = current.endsAt ?? checkin.eventEndsAt ?? checkin.validUntil ?? null
    const source = sourceLabel(checkin.purchaseSource)
    if (source !== 'Sin origen' && !current.sources.includes(source)) current.sources.push(source)
    if (!pass) {
      recordTotal(key, checkin.orderNumber ? `orden:${checkin.orderNumber}` : checkin.reservationNumber ? `reservacion:${checkin.reservationNumber}` : `pase:${checkin.accessPassId}`, checkin.orderTotal)
    }
    current.checkins.push(checkin)
    groups.set(key, current)
  }

  return Array.from(groups.values()).map((group) => {
    const capacity = group.capacity || group.totalGuests || group.totalPasses || group.checkedIn || 1
    return {
      ...group,
      capacity,
      ticketTotal: Array.from(totalsByGroup.get(group.key)?.values() ?? []).reduce((sum, value) => sum + value, 0) || null,
      occupancy: occupancyPercent(group.checkedIn, capacity),
    }
  }).sort((a, b) => {
    const aDate = latestDate([a.startsAt, a.endsAt, a.passes[0]?.issuedAt, a.checkins[0]?.checkedInAt])
    const bDate = latestDate([b.startsAt, b.endsAt, b.passes[0]?.issuedAt, b.checkins[0]?.checkedInAt])
    return new Date(bDate ?? 0).getTime() - new Date(aDate ?? 0).getTime()
  })
}

function isoOrNull(value: string) {
  return value ? new Date(value).toISOString() : null
}

function canOperate(roles: string[]) {
  return roles.some((role) => ['super_admin', 'admin', 'operations'].includes(role))
}

function passStatusLabel(pass: AccessPassRecord) {
  if (pass.revokedAt) return 'Revocado'
  if (pass.usedAt) return 'Usado'
  if (pass.validUntil && new Date(pass.validUntil).getTime() < Date.now()) return 'Expirado'
  const labels: Record<string, string> = {
    active: 'Activo',
    expired: 'Expirado',
    issued: 'Emitido',
    published: 'Activo',
    revoked: 'Revocado',
    used: 'Usado',
  }
  return labels[pass.status] ?? pass.status.replaceAll('_', ' ')
}

function confirmationLabel(type?: string | null) {
  if (type === 'restaurant') return 'Confirmar llegada'
  if (type === 'cabin') return 'Confirmar check-in'
  return 'Confirmar entrada'
}

export function CheckInPage() {
  const { session, roles } = useAuth()
  const token = session?.access_token
  const writable = canOperate(roles)
  const [passes, setPasses] = useState<AccessPassRecord[]>([])
  const [checkins, setCheckins] = useState<CheckinRecord[]>([])
  const [reservations, setReservations] = useState<ReservationRecord[]>([])
  const [selectedPassId, setSelectedPassId] = useState<string | null>(null)
  const [selectedGroupKey, setSelectedGroupKey] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [validation, setValidation] = useState<AccessPassValidation | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState<PassForm>(emptyPassForm)
  const [issuedToken, setIssuedToken] = useState('')
  const [pendingAction, setPendingAction] = useState<PendingCheckinAction | null>(null)
  const [reasonDraft, setReasonDraft] = useState('')
  const [scannerOpen, setScannerOpen] = useState(false)
  const [scannerError, setScannerError] = useState('')
  const scannerVideoRef = useRef<HTMLVideoElement | null>(null)
  const scannerCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const scannerStreamRef = useRef<MediaStream | null>(null)
  const scannerFrameRef = useRef<number | null>(null)

  const eventGroups = useMemo(() => buildCheckinEventGroups(passes, checkins), [checkins, passes])

  const selectedGroup = useMemo(
    () => eventGroups.find((item) => item.key === selectedGroupKey) ?? eventGroups[0] ?? null,
    [eventGroups, selectedGroupKey],
  )

  const selectedPass = useMemo(
    () => passes.find((item) => item.id === selectedPassId) ?? selectedGroup?.passes[0] ?? passes[0] ?? null,
    [passes, selectedGroup, selectedPassId],
  )

  const loadCheckin = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [passResponse, checkinResponse] = await Promise.all([
        accessPassClient.list(token, { perPage: 100 }),
        checkinsClient.list(token, { perPage: 100 }),
      ])
      setPasses(passResponse.data)
      setCheckins(checkinResponse.data)
      setSelectedPassId((current) => current ?? passResponse.data[0]?.id ?? null)
      const nextGroups = buildCheckinEventGroups(passResponse.data, checkinResponse.data)
      setSelectedGroupKey((current) => current && nextGroups.some((group) => group.key === current) ? current : nextGroups[0]?.key ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible cargar check-in.')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    void loadCheckin()
  }, [loadCheckin])

  useEffect(() => {
    if (!formOpen) return
    reservationsClient.list(token, { perPage: 100 }).then((reservationResponse) => {
      setReservations(reservationResponse.data)
    }).catch((err) => setError(err instanceof Error ? err.message : 'No fue posible cargar reservaciones.'))
  }, [formOpen, token])

  const metrics = useMemo(() => ({
    events: eventGroups.length,
    capacity: eventGroups.reduce((sum, item) => sum + item.capacity, 0),
    activePasses: passes.filter((item) => item.status === 'published' && !item.revokedAt && !item.usedAt && (!item.validUntil || new Date(item.validUntil).getTime() >= Date.now())).length,
    used: passes.filter((item) => item.usedAt).length,
    activeCheckins: checkins.filter((item) => item.status === 'active').length,
  }), [checkins, eventGroups, passes])

  const submitPass = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (saving) return
    setSaving(true)
    setError('')
    setIssuedToken('')
    try {
      const response = await accessPassClient.issue(token, {
        reservationId: form.reservationId || null,
        validFrom: isoOrNull(form.validFrom),
        validUntil: isoOrNull(form.validUntil),
        idempotencyKey: crypto.randomUUID(),
      })
      setIssuedToken(response.data.qrToken ? 'issued' : '')
      setSelectedPassId(response.data.id)
      setForm(emptyPassForm)
      setFormOpen(false)
      setToast('Pase emitido. El código quedó listo para acceso.')
      await loadCheckin()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible emitir el pase.')
    } finally {
      setSaving(false)
    }
  }

  const validateCode = async (candidate = code) => {
    const normalizedCode = normalizeAccessQrCode(candidate)
    if (!normalizedCode) {
      setValidation(null)
      setError('El código capturado no corresponde a un pase de Hacienda de Letras.')
      return
    }
    if (saving) return
    setSaving(true)
    setError('')
    setCode(normalizedCode)
    try {
      const response = await accessPassClient.validate(token, normalizedCode)
      setValidation(response.data)
      setSelectedPassId(response.data.accessPassId)
    } catch (err) {
      setValidation(null)
      setError(err instanceof Error ? err.message : 'No fue posible validar el pase.')
    } finally {
      setSaving(false)
    }
  }

  const stopScannerMedia = useCallback(() => {
    if (scannerFrameRef.current !== null) {
      window.cancelAnimationFrame(scannerFrameRef.current)
      scannerFrameRef.current = null
    }
    scannerStreamRef.current?.getTracks().forEach((track) => track.stop())
    scannerStreamRef.current = null
    if (scannerVideoRef.current) scannerVideoRef.current.srcObject = null
  }, [])

  useEffect(() => {
    if (!scannerOpen) return
    let cancelled = false

    const scanFrame = () => {
      if (cancelled) return
      const video = scannerVideoRef.current
      const canvas = scannerCanvasRef.current
      if (video && canvas && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth > 0) {
        const width = Math.min(video.videoWidth, 960)
        const height = Math.round((video.videoHeight / video.videoWidth) * width)
        canvas.width = width
        canvas.height = height
        const context = canvas.getContext('2d', { willReadFrequently: true })
        if (context) {
          context.drawImage(video, 0, 0, width, height)
          const image = context.getImageData(0, 0, width, height)
          const result = jsQR(image.data, width, height, { inversionAttempts: 'attemptBoth' })
          if (result?.data) {
            const normalizedCode = normalizeAccessQrCode(result.data)
            if (normalizedCode) {
              stopScannerMedia()
              setScannerOpen(false)
              setToast('Código QR capturado. Validando pase...')
              void validateCode(normalizedCode)
              return
            }
          }
        }
      }
      scannerFrameRef.current = window.requestAnimationFrame(scanFrame)
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setScannerError('Este navegador no permite usar la cámara. Captura el código manualmente.')
      return () => {
        cancelled = true
        stopScannerMedia()
      }
    }

    navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: { ideal: 'environment' } },
    }).then(async (stream) => {
      if (cancelled) {
        stream.getTracks().forEach((track) => track.stop())
        return
      }
      scannerStreamRef.current = stream
      if (!scannerVideoRef.current) return
      scannerVideoRef.current.srcObject = stream
      await scannerVideoRef.current.play()
      scannerFrameRef.current = window.requestAnimationFrame(scanFrame)
    }).catch(() => {
      if (!cancelled) setScannerError('No fue posible abrir la cámara. Revisa el permiso del navegador o captura el código manualmente.')
    })

    return () => {
      cancelled = true
      stopScannerMedia()
    }
  }, [scannerOpen, stopScannerMedia])

  const closeScanner = () => {
    stopScannerMedia()
    setScannerOpen(false)
    setScannerError('')
  }

  const registerValidatedCheckin = async () => {
    if (!validation?.valid || saving) return
    setPendingAction({
      title: confirmationLabel(validation.accessType),
      message: 'La lectura todavía no consume el QR. Al confirmar se registrará la operación y se evitará un segundo uso.',
      confirmLabel: 'Confirmar',
      success: `${confirmationLabel(validation.accessType)} registrado.`,
      action: async () => {
        await checkinsClient.register(token, {
          accessPassId: validation.accessPassId,
          requestId: crypto.randomUUID(),
          notes: 'Check-in desde Centro de Control',
          metadata: { accessType: validation.accessType ?? 'access', source: 'control_checkin' },
        })
        setCode('')
        setValidation(null)
      },
    })
  }

  const confirmPendingAction = async () => {
    if (!pendingAction || saving) return
    if (pendingAction.requiresReason && !reasonDraft.trim()) {
      setError('Captura el motivo para continuar.')
      return
    }
    setSaving(true)
    setError('')
    try {
      await pendingAction.action(reasonDraft.trim())
      setToast(pendingAction.success)
      setPendingAction(null)
      setReasonDraft('')
      await loadCheckin()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible completar la acción.')
    } finally {
      setSaving(false)
    }
  }

  const revokeSelectedPass = async () => {
    if (!selectedPass || !writable || saving) return
    setReasonDraft('')
    setPendingAction({
      title: 'Revocar pase',
      message: 'El pase dejará de ser válido para acceso.',
      confirmLabel: 'Revocar',
      tone: 'danger',
      requiresReason: true,
      success: 'Pase revocado.',
      action: (reason) => accessPassClient.revoke(token, selectedPass.id, reason),
    })
  }

  const reverseCheckin = async (checkin: CheckinRecord) => {
    if (!writable || saving) return
    setReasonDraft('')
    setPendingAction({
      title: 'Revertir check-in',
      message: 'El pase quedará disponible nuevamente y el movimiento se registrará en historial.',
      confirmLabel: 'Revertir',
      tone: 'danger',
      requiresReason: true,
      success: 'Check-in revertido.',
      action: (reason) => checkinsClient.reverse(token, checkin.id, reason),
    })
  }

  const exportCsv = async () => {
    try {
      const response = await checkinsClient.exportCsv(token)
      if (!response.ok) throw new Error('No fue posible exportar check-in.')
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'check-in-hacienda-de-letras.csv'
      link.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible exportar.')
    }
  }

  return (
    <div className="control-page control-page--checkin min-w-0 space-y-6">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <SectionTitle eyebrow="Acceso" title="Control de entradas" subtitle="Escaneo de boletos QR, asistencia y reversión autorizada." />
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={loadCheckin} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--color-line)] bg-[var(--color-panel)] px-4 text-sm font-semibold text-[var(--color-ink)]"><RefreshCw size={16} />Reintentar</button>
          <button type="button" onClick={exportCsv} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--color-line)] bg-[var(--color-panel)] px-4 text-sm font-semibold text-[var(--color-ink)]"><Download size={16} />Exportar CSV</button>
          <button type="button" onClick={() => setFormOpen(true)} disabled={!writable} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--color-burgundy)] px-5 text-sm font-semibold text-white disabled:opacity-50"><Ticket size={16} />Emitir pase manual</button>
        </div>
      </div>

      <section className="control-checkin-kpis grid gap-3 sm:grid-cols-5">
        <Metric icon={ClipboardList} label="Eventos" value={String(metrics.events)} />
        <Metric icon={Users} label="Capacidad" value={String(metrics.capacity)} />
        <Metric icon={Ticket} label="Pases activos" value={String(metrics.activePasses)} />
        <Metric icon={ShieldCheck} label="Usados" value={String(metrics.used)} />
        <Metric icon={UserCheck} label="Entradas" value={String(metrics.activeCheckins)} />
      </section>

      <section className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-panel)] p-5 shadow-[var(--shadow-card)]">
        <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
          <label className="flex min-h-11 items-center gap-3 rounded-xl border border-[var(--color-line)] bg-[var(--color-panel-strong)] px-4">
            <QrCode size={16} className="text-[var(--color-muted)]" />
            <input value={code} onChange={(event) => setCode(event.target.value)} placeholder="Captura manual de código QR" className="min-w-0 flex-1 bg-transparent text-sm text-[var(--color-ink)] outline-none" />
          </label>
          <button type="button" onClick={() => { setScannerError(''); setScannerOpen(true) }} disabled={!writable || saving} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--color-line)] px-5 text-sm font-semibold text-[var(--color-burgundy)] disabled:opacity-50"><Camera size={16} />Escanear QR</button>
          <button type="button" onClick={() => void validateCode()} disabled={!writable || !code.trim() || saving} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--color-line)] px-5 text-sm font-semibold text-[var(--color-burgundy)] disabled:opacity-50"><KeyRound size={16} />Validar</button>
        </div>
        {validation ? (
          <div className="mt-4 rounded-xl bg-[var(--color-soft)] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[var(--color-ink)]">{validation.passNumber} · {validation.guestName ?? 'Invitado'}</p>
                <p className="mt-1 text-xs text-[var(--color-muted)]">{validation.experienceTitle ?? validation.ticketTypeName ?? 'Acceso'} · {validation.peopleCount ?? 1} personas</p>
              </div>
              <StatusBadge label={validation.valid ? 'Válido' : validation.reason ?? 'No válido'} />
            </div>
            <button type="button" onClick={registerValidatedCheckin} disabled={!validation.valid || saving} className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl bg-[var(--color-burgundy)] px-4 text-xs font-semibold text-white disabled:opacity-50"><Check size={14} />{confirmationLabel(validation.accessType)}</button>
          </div>
        ) : null}
      </section>

      {issuedToken ? (
        <section className="rounded-[var(--radius-card)] border border-[rgba(37,47,55,0.24)] bg-white p-4 text-sm text-[#252F37] shadow-[var(--shadow-card)]">
          <p className="font-semibold">Pase emitido correctamente</p>
          <p className="mt-2">El código quedó listo para acceso del visitante.</p>
        </section>
      ) : null}

      {error ? <div className="rounded-[var(--radius-card)] border border-[#ead8c5] bg-[#fff7ed] p-4 text-sm text-[#8a4b16]">{error}</div> : null}

      <section className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-panel)] p-4 shadow-[var(--shadow-card)]">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-gold)]">Eventos con QR</p>
            <h3 className="mt-1 text-base font-semibold text-[var(--color-ink)]">Ocupación por evento y reservación</h3>
          </div>
          <span className="rounded-full bg-[var(--color-soft)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">{passes.length} pases</span>
        </div>
        {loading ? <State text="Cargando eventos y accesos..." /> : eventGroups.length === 0 ? <State title="Sin accesos emitidos" text="Los boletos pagados y reservaciones confirmadas aparecerán aquí con su ocupación real." /> : (
          <div className="control-checkin-event-grid">
            {eventGroups.map((group) => (
              <EventAccessCard
                key={group.key}
                group={group}
                active={selectedGroup?.key === group.key}
                onClick={() => {
                  setSelectedGroupKey(group.key)
                  setSelectedPassId(group.passes[0]?.id ?? group.checkins[0]?.accessPassId ?? null)
                }}
              />
            ))}
          </div>
        )}
      </section>

      {selectedGroup ? (
        <section className="control-checkin-detail-grid grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(22rem,0.95fr)]">
          <article className="min-w-0 rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-panel)] p-4 shadow-[var(--shadow-card)]">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-gold)]">Listado QR</p>
                <h3 className="mt-1 truncate text-base font-semibold text-[var(--color-ink)]">{selectedGroup.title}</h3>
                <p className="mt-1 text-xs text-[var(--color-muted)]">{selectedGroup.checkedIn}/{selectedGroup.capacity} entradas · {selectedGroup.occupancy}% ocupación</p>
              </div>
              <StatusBadge label={selectedGroup.occupancy >= 100 ? 'Completo' : 'En recepción'} />
            </div>
            <OccupancyBar value={selectedGroup.occupancy} />
            <div className="mt-4 space-y-2">
              {selectedGroup.checkins.length === 0 ? (
                <p className="rounded-lg border border-[var(--color-line)] bg-white p-4 text-xs text-[var(--color-muted)]">Todavía no hay ingresos registrados por QR para este evento.</p>
              ) : selectedGroup.checkins.map((checkin) => (
                <AttendeeRow key={checkin.id} checkin={checkin} writable={writable} onReverse={reverseCheckin} />
              ))}
            </div>
          </article>

          <aside className="min-w-0 space-y-4">
            <article className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-panel)] p-4 shadow-[var(--shadow-card)]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-gold)]">Resumen del evento</p>
                {eventEditPath(selectedGroup) ? (
                  <Link to={eventEditPath(selectedGroup) ?? '#'} className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-[var(--color-line)] bg-white px-2 text-[10px] font-semibold text-[var(--color-burgundy)]">
                    <ExternalLink size={12} />
                    Editar evento
                  </Link>
                ) : null}
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <Detail icon={Users} label="Capacidad" value={`${selectedGroup.checkedIn}/${selectedGroup.capacity}`} />
                <Detail icon={ReceiptText} label="Total del ticket" value={moneyLabel(selectedGroup.ticketTotal)} />
                <Detail icon={WalletCards} label="Origen" value={selectedGroup.sources.join(' · ') || 'Sin origen'} />
                <Detail icon={CalendarClock} label="Horario" value={shortDateLabel(selectedGroup.startsAt)} />
              </div>
            </article>
            <article className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-panel)] p-4 shadow-[var(--shadow-card)]">
              <div className="flex items-center justify-between gap-3">
                <h4 className="text-sm font-semibold text-[var(--color-ink)]">Historial de compra y vigencia</h4>
                {selectedPass ? <button type="button" onClick={revokeSelectedPass} disabled={!writable || Boolean(selectedPass.revokedAt)} className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-[var(--color-line)] px-2 text-[10px] font-semibold text-[var(--color-burgundy)] disabled:opacity-50"><X size={12} />Revocar</button> : null}
              </div>
              <div className="mt-3 space-y-2">
                {selectedGroup.passes.map((pass) => (
                  <PurchaseHistoryRow key={pass.id} pass={pass} active={selectedPass?.id === pass.id} onClick={() => setSelectedPassId(pass.id)} />
                ))}
              </div>
            </article>
          </aside>
        </section>
      ) : null}

      {formOpen ? (
        <div className="control-form-overlay fixed inset-0 z-[150] flex items-center justify-center bg-[#210711]/68 p-4 backdrop-blur-sm">
          <button type="button" aria-label="Cerrar" onClick={() => setFormOpen(false)} className="absolute inset-0 cursor-default" />
          <form onSubmit={submitPass} className="control-form-surface relative z-10 w-full max-w-2xl rounded-[1.5rem] border border-[var(--color-line)] bg-[var(--color-page)] p-6 shadow-[0_35px_90px_rgba(29,5,12,0.38)]" role="dialog" aria-modal="true" aria-label="Emitir pase">
            <div className="control-form-header mb-6 flex items-center justify-between">
              <h2 className="text-2xl text-[var(--color-burgundy)]" style={{ fontFamily: 'var(--font-display)' }}>Emitir pase</h2>
              <button type="button" onClick={() => setFormOpen(false)} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--color-line)] bg-white text-[var(--color-burgundy)]"><X size={18} /></button>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <ControlEntityPicker
                label="Reservación vinculada"
                value={form.reservationId}
                options={reservations.map((reservation) => ({ id: reservation.id, label: reservation.reservationNumber, description: `${reservation.customerName} · ${reservation.experienceTitle || 'Servicio'}` }))}
                onChange={(reservationId) => setForm({ ...form, reservationId })}
                emptyMessage="Sin reservaciones disponibles"
              />
              <Input label="Válido desde" type="datetime" value={form.validFrom} onChange={(value) => setForm({ ...form, validFrom: value })} />
              <Input label="Válido hasta" type="datetime" value={form.validUntil} onChange={(value) => setForm({ ...form, validUntil: value })} />
            </div>
            <div className="control-form-actions mt-6">
              <button type="button" onClick={() => setFormOpen(false)} className="min-h-11 rounded-xl border border-[var(--color-line)] px-5 text-sm font-semibold text-[var(--color-muted-strong)]">Cancelar</button>
              <button type="submit" disabled={saving || !form.reservationId} className="min-h-11 rounded-xl bg-[var(--color-burgundy)] px-5 text-sm font-semibold text-white disabled:opacity-60">{saving ? 'Guardando...' : 'Emitir pase'}</button>
            </div>
          </form>
        </div>
      ) : null}

      {scannerOpen ? (
        <div className="fixed inset-0 z-[var(--control-z-scanner)] flex items-center justify-center bg-[#210711]/78 p-4 backdrop-blur-md" role="dialog" aria-modal="true" aria-labelledby="checkin-scanner-title">
          <button type="button" aria-label="Cerrar escáner" onClick={closeScanner} className="absolute inset-0 cursor-default" />
          <section className="relative z-10 w-full max-w-xl overflow-hidden rounded-[1.5rem] border border-white/20 bg-[#fff9f1] shadow-[0_35px_90px_rgba(29,5,12,0.42)]">
            <header className="flex items-center justify-between gap-4 border-b border-[var(--color-line)] px-5 py-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-gold)]">Acceso seguro</p>
                <h2 id="checkin-scanner-title" className="mt-1 text-xl font-semibold text-[var(--color-burgundy)]">Escanear boleto QR</h2>
              </div>
              <button type="button" onClick={closeScanner} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--color-line)] bg-white text-[var(--color-burgundy)]" aria-label="Cerrar"><X size={18} /></button>
            </header>
            <div className="p-4">
              <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-[#2d1811]">
                <video ref={scannerVideoRef} muted playsInline className="h-full w-full object-cover" />
                <div className="pointer-events-none absolute inset-[12%] rounded-2xl border-2 border-white/90 shadow-[0_0_0_999px_rgba(20,5,10,0.28)]" />
              </div>
              <canvas ref={scannerCanvasRef} className="hidden" aria-hidden="true" />
              {scannerError ? <p className="mt-4 rounded-xl border border-[#ead8c5] bg-[#fff7ed] p-3 text-sm text-[#8a4b16]">{scannerError}</p> : <p className="mt-4 text-center text-sm text-[var(--color-muted)]">Coloca el código completo dentro del recuadro. La validación inicia automáticamente.</p>}
            </div>
          </section>
        </div>
      ) : null}

      <ControlConfirmDialog
        open={Boolean(pendingAction)}
        title={pendingAction?.title ?? ''}
        message={pendingAction?.message ?? ''}
        confirmLabel={pendingAction?.confirmLabel}
        tone={pendingAction?.tone}
        busy={saving}
        onCancel={() => { setPendingAction(null); setReasonDraft('') }}
        onConfirm={confirmPendingAction}
      >
        {pendingAction?.requiresReason ? (
          <label className="block">
            <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">Motivo</span>
            <textarea
              rows={4}
              value={reasonDraft}
              onChange={(event) => setReasonDraft(event.target.value)}
              className="w-full rounded-2xl border border-[var(--color-line)] bg-white/65 px-4 py-3 text-sm text-[var(--color-ink)] outline-none focus:border-[var(--color-burgundy)]"
              placeholder="Describe el motivo operativo"
            />
          </label>
        ) : null}
      </ControlConfirmDialog>

      {toast ? <Toast value={toast} onClose={() => setToast('')} /> : null}
    </div>
  )
}

function Metric({ icon: Icon, label, value }: { icon: typeof Ticket; label: string; value: string }) {
  return <article className="rounded-lg border border-[var(--color-line)] bg-[var(--color-panel)] p-3 shadow-[var(--shadow-card)]"><div className="flex items-center justify-between gap-3"><span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-soft)] text-[var(--color-burgundy)]"><Icon size={15} /></span><div className="min-w-0 text-right"><p className="truncate text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--color-muted)]">{label}</p><p className="mt-1 text-lg font-semibold text-[var(--color-ink)]">{value}</p></div></div></article>
}

function EventAccessCard({ group, active, onClick }: { group: CheckinEventGroup; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={`control-checkin-event-card ${active ? 'is-active' : ''}`}>
      <div className="control-checkin-event-card__image">
        {group.imageUrl ? <img src={group.imageUrl} alt="" loading="lazy" /> : <ImageIcon size={24} aria-hidden="true" />}
        <span className="control-checkin-event-card__status">{group.occupancy}%</span>
      </div>
      <div className="control-checkin-event-card__body">
        <div className="min-w-0">
          <p className="control-checkin-event-card__title">{group.title}</p>
          <p className="control-checkin-event-card__meta">{shortDateLabel(group.startsAt)} · {group.sources.join(' · ') || 'Sin origen'}</p>
        </div>
        <div className="control-checkin-event-card__count">
          <span>{group.checkedIn}/{group.capacity}</span>
          <small>Entradas</small>
        </div>
        <OccupancyBar value={group.occupancy} compact />
      </div>
    </button>
  )
}

function OccupancyBar({ value, compact = false }: { value: number; compact?: boolean }) {
  const color = value >= 95 ? '#681126' : value >= 60 ? '#B48A55' : '#252F37'
  return (
    <div className={compact ? 'control-checkin-occupancy is-compact' : 'control-checkin-occupancy'} aria-label={`Ocupación ${value}%`}>
      <span style={{ width: `${value}%`, backgroundColor: color }} />
    </div>
  )
}

function AttendeeRow({ checkin, writable, onReverse }: { checkin: CheckinRecord; writable: boolean; onReverse: (checkin: CheckinRecord) => void }) {
  return (
    <div className="control-checkin-attendee-row">
      <div className="min-w-0">
        <p className="truncate text-xs font-semibold text-[var(--color-ink)]">{checkin.guestName ?? 'Invitado'}</p>
        <p className="mt-1 truncate text-[10px] text-[var(--color-muted)]">QR {checkin.passNumber ?? 'sin folio'} · {dateLabel(checkin.checkedInAt)}</p>
        <p className="mt-1 truncate text-[10px] text-[var(--color-muted)]">Compra {sourceLabel(checkin.purchaseSource)} · {checkin.orderNumber ?? checkin.reservationNumber ?? 'Sin folio'} · {moneyLabel(checkin.orderTotal)}</p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-2">
        <StatusBadge label={checkin.status === 'active' ? 'Entró' : 'Revertido'} />
        <button type="button" onClick={() => onReverse(checkin)} disabled={!writable || checkin.status !== 'active'} className="inline-flex min-h-7 items-center gap-1 rounded-lg border border-[var(--color-line)] px-2 text-[10px] font-semibold text-[var(--color-burgundy)] disabled:opacity-50"><RotateCcw size={12} />Revertir</button>
      </div>
    </div>
  )
}

function PurchaseHistoryRow({ pass, active, onClick }: { pass: AccessPassRecord; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={`control-checkin-pass-row ${active ? 'is-active' : ''}`}>
      <div className="min-w-0">
        <p className="truncate text-xs font-semibold text-[var(--color-ink)]">{pass.passNumber ?? 'Pase'}</p>
        <p className="mt-1 truncate text-[10px] text-[var(--color-muted)]">{pass.guestName ?? 'Invitado'} · {pass.orderNumber ?? pass.reservationNumber ?? 'Sin folio'}</p>
        <p className="mt-1 truncate text-[10px] text-[var(--color-muted)]">Comprado en {sourceLabel(pass.purchaseSource)} · {dateLabel(pass.purchasedAt)} · Vence {dateLabel(pass.validUntil)}</p>
      </div>
      <div className="shrink-0 text-right">
        <StatusBadge label={passStatusLabel(pass)} />
        <p className="mt-2 text-[10px] font-semibold text-[var(--color-ink)]">{moneyLabel(pass.orderTotal ?? pass.reservationTotal)}</p>
      </div>
    </button>
  )
}

function Detail({ icon: Icon, label, value }: { icon?: typeof Ticket; label: string; value: string }) {
  return <div className="rounded-lg bg-[var(--color-soft)] p-3">{Icon ? <Icon size={13} className="mb-2 text-[var(--color-burgundy)]" /> : null}<p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">{label}</p><p className="mt-1 break-words text-xs font-semibold text-[var(--color-ink)]">{value}</p></div>
}

function State({ title, text }: { title?: string; text: string }) {
  return <div className="p-8 text-center">{title ? <p className="text-lg font-semibold text-[var(--color-ink)]">{title}</p> : null}<p className="mt-2 text-sm text-[var(--color-muted)]">{text}</p></div>
}

function Input({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  if (type === 'datetime') return <CrystalDateTimeField label={label} value={value} onChange={onChange} />

  return <label className="block"><span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">{label}</span><input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="min-h-11 w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-panel-strong)] px-4 text-sm text-[var(--color-ink)] outline-none" /></label>
}

function Toast({ value, onClose }: { value: string; onClose: () => void }) {
  return <div className="fixed bottom-6 right-6 z-[140] rounded-[1rem] border border-[rgba(37,47,55,0.24)] bg-white p-4 text-sm font-semibold text-[#252F37] shadow-[0_22px_50px_rgba(45,22,14,0.18)]">{value}<button type="button" onClick={onClose} className="ml-4 text-[var(--color-muted)]"><X size={14} /></button></div>
}
