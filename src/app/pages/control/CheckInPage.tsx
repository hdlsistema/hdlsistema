import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Check, Download, KeyRound, QrCode, RefreshCw, RotateCcw, ShieldCheck, Ticket, X } from 'lucide-react'
import { useAuth } from '../../../contexts/AuthContext'
import {
  accessPassClient,
  checkinsClient,
  type AccessPassRecord,
  type AccessPassValidation,
  type CheckinRecord,
} from '../../../services/commerce.service'
import { SectionTitle } from '../../components/shared/SectionTitle'
import { CrystalDateTimeField } from '../../components/shared/CrystalDateField'
import { StatusBadge } from '../../components/shared/StatusBadge'

type PassForm = {
  reservationId: string
  orderId: string
  validFrom: string
  validUntil: string
}

const emptyPassForm: PassForm = {
  reservationId: '',
  orderId: '',
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

export function CheckInPage() {
  const { session, roles } = useAuth()
  const token = session?.access_token
  const writable = canOperate(roles)
  const [passes, setPasses] = useState<AccessPassRecord[]>([])
  const [checkins, setCheckins] = useState<CheckinRecord[]>([])
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

  const metrics = useMemo(() => ({
    activePasses: passes.filter((item) => item.status === 'published' && !item.revokedAt).length,
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
        orderId: form.orderId || null,
        validFrom: isoOrNull(form.validFrom),
        validUntil: isoOrNull(form.validUntil),
        idempotencyKey: crypto.randomUUID(),
      })
      setIssuedToken(response.data.qrToken ?? '')
      setSelectedPassId(response.data.id)
      setForm(emptyPassForm)
      setFormOpen(false)
      setToast('Pase emitido. Copia el token QR ahora; no se guarda en texto plano.')
      await loadCheckin()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible emitir el pase.')
    } finally {
      setSaving(false)
    }
  }

  const validateCode = async () => {
    if (!code.trim() || saving) return
    setSaving(true)
    setError('')
    try {
      const response = await accessPassClient.validate(token, code.trim())
      setValidation(response.data)
      setSelectedPassId(response.data.accessPassId)
    } catch (err) {
      setValidation(null)
      setError(err instanceof Error ? err.message : 'No fue posible validar el pase.')
    } finally {
      setSaving(false)
    }
  }

  const registerValidatedCheckin = async () => {
    if (!validation?.valid || saving) return
    if (!window.confirm('¿Registrar check-in de este pase? El backend bloqueará un segundo uso.')) return
    setSaving(true)
    try {
      await checkinsClient.register(token, {
        accessPassId: validation.accessPassId,
        requestId: crypto.randomUUID(),
        notes: 'Check-in desde Centro de Control',
      })
      setToast('Check-in registrado.')
      setCode('')
      setValidation(null)
      await loadCheckin()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible registrar check-in.')
    } finally {
      setSaving(false)
    }
  }

  const revokeSelectedPass = async () => {
    if (!selectedPass || !writable || saving) return
    const reason = window.prompt('Motivo de revocación')
    if (!reason) return
    if (!window.confirm('¿Revocar este pase de acceso?')) return
    setSaving(true)
    try {
      await accessPassClient.revoke(token, selectedPass.id, reason)
      setToast('Pase revocado.')
      await loadCheckin()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible revocar el pase.')
    } finally {
      setSaving(false)
    }
  }

  const reverseCheckin = async (checkin: CheckinRecord) => {
    if (!writable || saving) return
    const reason = window.prompt('Motivo de reversión')
    if (!reason) return
    if (!window.confirm('¿Revertir este check-in? El pase quedará disponible de nuevo.')) return
    setSaving(true)
    try {
      await checkinsClient.reverse(token, checkin.id, reason)
      setToast('Check-in revertido.')
      await loadCheckin()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible revertir el check-in.')
    } finally {
      setSaving(false)
    }
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
    <div className="min-w-0 space-y-6">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <SectionTitle eyebrow="Acceso" title="Check-in" subtitle="Pases QR seguros, validación y reversión autorizada con datos reales." />
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={loadCheckin} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--color-line)] bg-[var(--color-panel)] px-4 text-sm font-semibold text-[var(--color-ink)]"><RefreshCw size={16} />Reintentar</button>
          <button type="button" onClick={exportCsv} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--color-line)] bg-[var(--color-panel)] px-4 text-sm font-semibold text-[var(--color-ink)]"><Download size={16} />Exportar CSV</button>
          <button type="button" onClick={() => setFormOpen(true)} disabled={!writable} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--color-burgundy)] px-5 text-sm font-semibold text-white disabled:opacity-50"><Ticket size={16} />Emitir pase</button>
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-3">
        <Metric icon={Ticket} label="Pases activos" value={String(metrics.activePasses)} />
        <Metric icon={ShieldCheck} label="Usados" value={String(metrics.used)} />
        <Metric icon={Check} label="Check-ins" value={String(metrics.activeCheckins)} />
      </section>

      <section className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-panel)] p-5 shadow-[var(--shadow-card)]">
        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <label className="flex min-h-11 items-center gap-3 rounded-xl border border-[var(--color-line)] bg-[var(--color-panel-strong)] px-4">
            <QrCode size={16} className="text-[var(--color-muted)]" />
            <input value={code} onChange={(event) => setCode(event.target.value)} placeholder="Captura manual de código QR" className="min-w-0 flex-1 bg-transparent text-sm text-[var(--color-ink)] outline-none" />
          </label>
          <button type="button" onClick={validateCode} disabled={!writable || !code.trim() || saving} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--color-line)] px-5 text-sm font-semibold text-[var(--color-burgundy)] disabled:opacity-50"><KeyRound size={16} />Validar</button>
        </div>
        {validation ? (
          <div className="mt-4 rounded-xl bg-[var(--color-soft)] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[var(--color-ink)]">{validation.passNumber} · {validation.guestName ?? 'Invitado'}</p>
                <p className="mt-1 text-xs text-[var(--color-muted)]">{validation.experienceTitle ?? 'Acceso'} · {validation.peopleCount ?? 1} personas</p>
              </div>
              <StatusBadge label={validation.valid ? 'Válido' : validation.reason ?? 'No válido'} />
            </div>
            <button type="button" onClick={registerValidatedCheckin} disabled={!validation.valid || saving} className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl bg-[var(--color-burgundy)] px-4 text-xs font-semibold text-white disabled:opacity-50"><Check size={14} />Registrar check-in</button>
          </div>
        ) : null}
      </section>

      {issuedToken ? (
        <section className="rounded-[var(--radius-card)] border border-[#cfddca] bg-white p-4 text-sm text-[#406845] shadow-[var(--shadow-card)]">
          <p className="font-semibold">Token QR emitido para entrega segura</p>
          <p className="mt-2 break-all font-mono text-xs">{issuedToken}</p>
        </section>
      ) : null}

      {error ? <div className="rounded-[var(--radius-card)] border border-[#ead8c5] bg-[#fff7ed] p-4 text-sm text-[#8a4b16]">{error}</div> : null}

      <section className="grid min-w-0 gap-5 2xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
        <div className="min-w-0 overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-panel)] shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between border-b border-[var(--color-line)] px-5 py-4">
            <h3 className="text-lg font-semibold text-[var(--color-ink)]">Pases de acceso</h3>
            <span className="rounded-full bg-[var(--color-soft)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">{passes.length} registros</span>
          </div>
          {loading ? <State text="Cargando pases reales..." /> : passes.length === 0 ? <State title="Sin pases emitidos" text="Emite un pase desde una reservación u orden real." /> : (
            <div className="divide-y divide-[var(--color-line)]">
              {passes.map((pass) => (
                <button key={pass.id} type="button" onClick={() => setSelectedPassId(pass.id)} className="grid w-full gap-4 px-5 py-4 text-left lg:grid-cols-[1fr_0.8fr_auto]" style={{ backgroundColor: selectedPass?.id === pass.id ? 'rgba(180,138,85,0.12)' : 'transparent' }}>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[var(--color-ink)]">{pass.passNumber ?? 'Pase'}</p>
                    <p className="mt-1 truncate text-xs text-[var(--color-muted)]">{pass.guestName ?? 'Invitado'} · {pass.eventOrExperience ?? 'Acceso'}</p>
                  </div>
                  <p className="text-xs text-[var(--color-muted)]">{pass.usedAt ? `Usado ${dateLabel(pass.usedAt)}` : 'Sin uso'}</p>
                  <StatusBadge label={pass.revokedAt ? 'Revocado' : pass.status} />
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
                <Detail label="Reservación" value={selectedPass.reservationNumber ?? 'Sin folio'} />
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
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[#210711]/68 p-4 backdrop-blur-sm">
          <button type="button" aria-label="Cerrar" onClick={() => setFormOpen(false)} className="absolute inset-0 cursor-default" />
          <form onSubmit={submitPass} className="relative z-10 w-full max-w-2xl rounded-[1.5rem] border border-[var(--color-line)] bg-[var(--color-page)] p-6 shadow-[0_35px_90px_rgba(29,5,12,0.38)]">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl text-[var(--color-burgundy)]" style={{ fontFamily: 'var(--font-display)' }}>Emitir pase</h2>
              <button type="button" onClick={() => setFormOpen(false)} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--color-line)] bg-white text-[var(--color-burgundy)]"><X size={18} /></button>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Input label="ID de reservación" value={form.reservationId} onChange={(value) => setForm({ ...form, reservationId: value })} />
              <Input label="ID de orden pagada" value={form.orderId} onChange={(value) => setForm({ ...form, orderId: value })} />
              <Input label="Válido desde" type="datetime" value={form.validFrom} onChange={(value) => setForm({ ...form, validFrom: value })} />
              <Input label="Válido hasta" type="datetime" value={form.validUntil} onChange={(value) => setForm({ ...form, validUntil: value })} />
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setFormOpen(false)} className="min-h-11 rounded-xl border border-[var(--color-line)] px-5 text-sm font-semibold text-[var(--color-muted-strong)]">Cancelar</button>
              <button type="submit" disabled={saving || (!form.reservationId && !form.orderId)} className="min-h-11 rounded-xl bg-[var(--color-burgundy)] px-5 text-sm font-semibold text-white disabled:opacity-60">{saving ? 'Guardando...' : 'Emitir pase'}</button>
            </div>
          </form>
        </div>
      ) : null}

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
