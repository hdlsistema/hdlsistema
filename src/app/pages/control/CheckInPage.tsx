import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import jsQR from 'jsqr'
import { Camera, Check, Download, KeyRound, QrCode, RefreshCw, RotateCcw, ShieldCheck, Ticket, X } from 'lucide-react'
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

const emptyPassForm: PassForm = {
  reservationId: '',
  validFrom: '',
  validUntil: '',
}

function dateLabel(value?: string | null) {
  if (!value) return 'Sin fecha'
  return new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
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

  const selectedPass = useMemo(
    () => passes.find((item) => item.id === selectedPassId) ?? passes[0] ?? null,
    [passes, selectedPassId],
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
    activePasses: passes.filter((item) => item.status === 'published' && !item.revokedAt && !item.usedAt && (!item.validUntil || new Date(item.validUntil).getTime() >= Date.now())).length,
    used: passes.filter((item) => item.usedAt).length,
    activeCheckins: checkins.filter((item) => item.status === 'active').length,
  }), [checkins, passes])

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

      <section className="grid gap-4 sm:grid-cols-3">
        <Metric icon={Ticket} label="Pases activos" value={String(metrics.activePasses)} />
        <Metric icon={ShieldCheck} label="Usados" value={String(metrics.used)} />
        <Metric icon={Check} label="Check-ins" value={String(metrics.activeCheckins)} />
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
        <section className="rounded-[var(--radius-card)] border border-[#cfddca] bg-white p-4 text-sm text-[#406845] shadow-[var(--shadow-card)]">
          <p className="font-semibold">Pase emitido correctamente</p>
          <p className="mt-2">El código quedó listo para acceso del visitante.</p>
        </section>
      ) : null}

      {error ? <div className="rounded-[var(--radius-card)] border border-[#ead8c5] bg-[#fff7ed] p-4 text-sm text-[#8a4b16]">{error}</div> : null}

      <section className="grid min-w-0 gap-5 2xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
        <div className="min-w-0 overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-panel)] shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between border-b border-[var(--color-line)] px-5 py-4">
            <h3 className="text-lg font-semibold text-[var(--color-ink)]">Pases de acceso</h3>
            <span className="rounded-full bg-[var(--color-soft)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">{passes.length} registros</span>
          </div>
          {loading ? <State text="Cargando pases..." /> : passes.length === 0 ? <State title="Sin pases emitidos" text="Los boletos de evento se generan al pagar; los pases manuales se emiten desde una reservación." /> : (
            <div className="divide-y divide-[var(--color-line)]">
              {passes.map((pass) => (
                <button key={pass.id} type="button" onClick={() => setSelectedPassId(pass.id)} className="grid w-full gap-4 px-5 py-4 text-left lg:grid-cols-[1fr_0.8fr_auto]" style={{ backgroundColor: selectedPass?.id === pass.id ? 'rgba(180,138,85,0.12)' : 'transparent' }}>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[var(--color-ink)]">{pass.passNumber ?? 'Pase'}</p>
                    <p className="mt-1 truncate text-xs text-[var(--color-muted)]">{pass.guestName ?? 'Invitado'} · {pass.eventOrExperience ?? 'Acceso'}</p>
                  </div>
                  <p className="text-xs text-[var(--color-muted)]">{pass.usedAt ? `Usado ${dateLabel(pass.usedAt)}` : 'Sin uso'}</p>
                  <StatusBadge label={passStatusLabel(pass)} />
                </button>
              ))}
            </div>
          )}
        </div>

        <aside className="space-y-4">
          {selectedPass ? (
            <article className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-panel)] p-5 shadow-[var(--shadow-card)]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-gold)]">Pase seleccionado</p>
              <h3 className="mt-2 text-2xl text-[var(--color-burgundy)]" style={{ fontFamily: 'var(--font-display)' }}>{selectedPass.passNumber ?? 'Pase'}</h3>
              <div className="mt-5 grid gap-3">
                <Detail label="Invitado" value={selectedPass.guestName ?? 'Sin nombre'} />
                <Detail label={selectedPass.reservationNumber ? 'Reservación' : 'Orden'} value={selectedPass.reservationNumber ?? selectedPass.orderNumber ?? 'Sin folio'} />
                <Detail label="Vigencia" value={`${dateLabel(selectedPass.validFrom)} - ${dateLabel(selectedPass.validUntil)}`} />
              </div>
              <button type="button" onClick={revokeSelectedPass} disabled={!writable || Boolean(selectedPass.revokedAt)} className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--color-line)] px-3 text-xs font-semibold text-[var(--color-burgundy)] disabled:opacity-50"><X size={14} />Revocar pase</button>
            </article>
          ) : null}
          <article className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-panel)] p-5 shadow-[var(--shadow-card)]">
            <h4 className="text-sm font-semibold text-[var(--color-ink)]">Historial de check-in</h4>
            <div className="mt-4 space-y-3">
              {checkins.length === 0 ? <p className="text-sm text-[var(--color-muted)]">Sin check-ins registrados.</p> : checkins.map((checkin) => (
                <div key={checkin.id} className="rounded-xl bg-[var(--color-soft)] p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[var(--color-ink)]">{checkin.passNumber ?? 'Pase'}</p>
                      <p className="mt-1 text-xs text-[var(--color-muted)]">{dateLabel(checkin.checkedInAt)} · {checkin.eventOrExperience ?? 'Acceso'}</p>
                    </div>
                    <StatusBadge label={checkin.status === 'active' ? 'Activo' : 'Revertido'} />
                  </div>
                  <button type="button" onClick={() => reverseCheckin(checkin)} disabled={!writable || checkin.status !== 'active'} className="mt-3 inline-flex min-h-9 items-center gap-2 rounded-xl border border-[var(--color-line)] px-3 text-xs font-semibold text-[var(--color-burgundy)] disabled:opacity-50"><RotateCcw size={14} />Revertir</button>
                </div>
              ))}
            </div>
          </article>
        </aside>
      </section>

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
  return <article className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-panel)] p-5 shadow-[var(--shadow-card)]"><div className="flex items-start justify-between gap-4"><div><p className="text-xs text-[var(--color-muted)]">{label}</p><p className="mt-3 text-3xl text-[var(--color-ink)]" style={{ fontFamily: 'var(--font-display)' }}>{value}</p></div><span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-soft)] text-[var(--color-burgundy)]"><Icon size={18} /></span></div></article>
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-[var(--color-soft)] p-3"><p className="text-[10px] uppercase tracking-[0.12em] text-[var(--color-muted)]">{label}</p><p className="mt-1 text-sm font-semibold text-[var(--color-ink)]">{value}</p></div>
}

function State({ title, text }: { title?: string; text: string }) {
  return <div className="p-8 text-center">{title ? <p className="text-lg font-semibold text-[var(--color-ink)]">{title}</p> : null}<p className="mt-2 text-sm text-[var(--color-muted)]">{text}</p></div>
}

function Input({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  if (type === 'datetime') return <CrystalDateTimeField label={label} value={value} onChange={onChange} />

  return <label className="block"><span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">{label}</span><input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="min-h-11 w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-panel-strong)] px-4 text-sm text-[var(--color-ink)] outline-none" /></label>
}

function Toast({ value, onClose }: { value: string; onClose: () => void }) {
  return <div className="fixed bottom-6 right-6 z-[140] rounded-[1rem] border border-[#cfddca] bg-white p-4 text-sm font-semibold text-[#5f7d63] shadow-[0_22px_50px_rgba(45,22,14,0.18)]">{value}<button type="button" onClick={onClose} className="ml-4 text-[var(--color-muted)]"><X size={14} /></button></div>
}
