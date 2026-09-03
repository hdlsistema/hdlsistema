import { CheckCircle2, Clock3, FileClock, Loader2, PlayCircle, RefreshCw, Save, Search, ShieldAlert, Smartphone, TriangleAlert, Webhook } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../../../contexts/AuthContext'
import { adminPrivacyClient, type AccountDeletionRecord, type AccountDeletionStatus } from '../../../services/privacy.service'
import { CrystalSelect } from '../../components/shared/CrystalSelect'
import { SectionTitle } from '../../components/shared/SectionTitle'
import { dateTime } from './controlCopy'

const statusOptions = [
  { value: '', label: 'Todos los estados' },
  { value: 'pending_processing', label: 'Pendiente de procesar' },
  { value: 'in_progress', label: 'En proceso' },
  { value: 'completed', label: 'Completada' },
  { value: 'technical_error', label: 'Error técnico' },
] as const

const sourceOptions = [
  { value: '', label: 'Todos los canales' },
  { value: 'public_web', label: 'Web pública' },
  { value: 'mobile_app', label: 'App Mobile' },
  { value: 'admin', label: 'Centro de Control' },
]

const transitions: Record<AccountDeletionStatus, AccountDeletionStatus[]> = {
  awaiting_email_confirmation: [],
  pending_processing: ['in_progress', 'technical_error'],
  in_progress: ['technical_error'],
  completed: [],
  technical_error: ['in_progress'],
}

function statusLabel(status: string) {
  return statusOptions.find((item) => item.value === status)?.label ?? status
}

function sourceLabel(source: string) {
  return sourceOptions.find((item) => item.value === source)?.label ?? source
}

function statusTone(status: AccountDeletionStatus) {
  if (status === 'completed') return 'border-[rgba(37,47,55,0.24)] bg-[rgba(37,47,55,0.08)] text-[#252F37]'
  if (status === 'technical_error') return 'border-[#e1bcb4] bg-[#fff0ed] text-[#994638]'
  if (status === 'in_progress') return 'border-[#d7c29b] bg-[#fff7e8] text-[#896126]'
  return 'border-[#d8c6b2] bg-[#f8f0e7] text-[#705746]'
}

function canWrite(roles: string[]) {
  return roles.some((role) => ['super_admin', 'admin', 'operations'].includes(role))
}

export function AccountDeletionRequestsPage() {
  const [searchParams] = useSearchParams()
  const requestedId = searchParams.get('requestId')
  const { session, roles } = useAuth()
  const token = session?.access_token
  const writable = canWrite(roles)
  const [items, setItems] = useState<AccountDeletionRecord[]>([])
  const [selected, setSelected] = useState<AccountDeletionRecord | null>(null)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [source, setSource] = useState('')
  const [nextStatus, setNextStatus] = useState('')
  const [adminNotes, setAdminNotes] = useState('')
  const [retentionNotes, setRetentionNotes] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const syncSelected = useCallback((record: AccountDeletionRecord | null) => {
    setSelected(record)
    setNextStatus('')
    setAdminNotes(record?.adminNotes ?? '')
    setRetentionNotes(record?.retentionNotes ?? '')
  }, [])

  const loadDetail = useCallback(async (id: string) => {
    try {
      const response = await adminPrivacyClient.get(token, id)
      syncSelected(response.data)
    } catch {
      setError('No fue posible cargar el expediente de eliminación.')
    }
  }, [syncSelected, token])

  const load = useCallback(async (preferredId?: string) => {
    setLoading(true)
    setError('')
    try {
      const response = await adminPrivacyClient.list(token, {
        search: search || undefined,
        status: status || undefined,
        source: source || undefined,
        perPage: 100,
      })
      setItems(response.data)
      const id = preferredId ?? requestedId ?? selected?.id ?? response.data[0]?.id
      if (id && response.data.some((item) => item.id === id)) await loadDetail(id)
      else syncSelected(null)
    } catch {
      setItems([])
      syncSelected(null)
      setError('No fue posible cargar las órdenes de eliminación de cuenta.')
    } finally {
      setLoading(false)
    }
  }, [loadDetail, requestedId, search, selected?.id, source, status, syncSelected, token])

  useEffect(() => { void load() }, [load])

  const metrics = useMemo(() => ({
    pending: items.filter((item) => item.status === 'pending_processing').length,
    processing: items.filter((item) => item.status === 'in_progress').length,
    error: items.filter((item) => item.status === 'technical_error').length,
    completed: items.filter((item) => item.status === 'completed').length,
  }), [items])

  const transitionOptions = useMemo(() => {
    if (!selected) return []
    return [
      { value: '', label: 'Conservar estado actual' },
      ...transitions[selected.status].map((value) => ({ value, label: statusLabel(value) })),
    ]
  }, [selected])

  async function save() {
    if (!selected || !writable || saving) return
    if (nextStatus === 'technical_error' && !adminNotes.trim()) {
      setError('Agrega una nota operativa antes de marcar Error técnico.')
      return
    }
    setSaving(true)
    setError('')
    setNotice('')
    try {
      await adminPrivacyClient.update(token, selected.id, {
        status: nextStatus ? nextStatus as AccountDeletionStatus : undefined,
        adminNotes: adminNotes.trim() || null,
        retentionNotes: retentionNotes.trim() || null,
      })
      setNotice('Orden actualizada y cambio registrado en el historial.')
      await load(selected.id)
    } catch {
      setError('No fue posible guardar la orden. Revisa la transición y las notas requeridas.')
    } finally {
      setSaving(false)
    }
  }

  async function processOrder() {
    if (!selected || !writable || processing) return
    setProcessing(true)
    setError('')
    setNotice('')
    try {
      await adminPrivacyClient.process(token, selected.id)
      setNotice('Orden procesada. La cuenta fue eliminada o anonimizada y se envió el correo final.')
      await load(selected.id)
    } catch {
      setError('No fue posible procesar la eliminación. La orden queda disponible para consultar el error técnico y reintentar.')
      await load(selected.id)
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="control-page control-page--account-deletion min-w-0 space-y-6 pb-8">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <SectionTitle eyebrow="Privacidad operativa" title="Eliminación de cuentas" subtitle="Órdenes confirmadas por correo para ejecutar eliminación, anonimización, conservación limitada y cierre con trazabilidad." />
        <button type="button" onClick={() => void load()} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[var(--color-line)] bg-white px-4 text-xs font-semibold text-[var(--color-burgundy)]"><RefreshCw size={15} />Actualizar</button>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={FileClock} label="Pendientes" value={metrics.pending} />
        <Metric icon={Clock3} label="En proceso" value={metrics.processing} />
        <Metric icon={TriangleAlert} label="Error técnico" value={metrics.error} />
        <Metric icon={CheckCircle2} label="Completadas" value={metrics.completed} />
      </section>

      <section className="grid gap-3 rounded-xl border border-[var(--color-line)] bg-[var(--color-panel)] p-4 shadow-[var(--shadow-card)] lg:grid-cols-[minmax(260px,1fr)_240px_220px]">
        <label className="flex min-h-11 items-center gap-3 rounded-xl border border-[rgba(220,202,181,0.9)] bg-white px-4"><Search size={16} className="text-[var(--color-burgundy)]" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar folio, correo o nombre…" className="min-w-0 flex-1 bg-transparent text-sm outline-none" /></label>
        <CrystalSelect value={status} onChange={setStatus} options={[...statusOptions]} ariaLabel="Filtrar por estado" />
        <CrystalSelect value={source} onChange={setSource} options={sourceOptions} ariaLabel="Filtrar por canal" />
      </section>

      {error ? <p role="alert" className="rounded-xl border border-[#e3b8ad] bg-[#fff2ef] p-4 text-sm text-[#944431]">{error}</p> : null}
      {notice ? <p role="status" className="rounded-xl border border-[rgba(37,47,55,0.24)] bg-[rgba(37,47,55,0.08)] p-4 text-sm text-[#252F37]">{notice}</p> : null}

      <section className="grid min-w-0 gap-5 2xl:grid-cols-[minmax(460px,0.92fr)_minmax(520px,1.08fr)]">
        <div className="min-w-0 overflow-hidden rounded-xl border border-[var(--color-line)] bg-[var(--color-panel)] shadow-[var(--shadow-card)]">
          <div className="border-b border-[var(--color-line)] px-5 py-4"><h2 className="text-base font-semibold">Órdenes</h2><p className="mt-1 text-xs text-[var(--color-muted)]">{items.length} registro(s) en la vista actual</p></div>
          {loading ? <div className="p-14"><Loader2 className="mx-auto animate-spin text-[var(--color-burgundy)]" /></div> : items.length === 0 ? <p className="p-12 text-center text-sm text-[var(--color-muted)]">No hay órdenes con estos filtros.</p> : <div className="max-h-[760px] overflow-y-auto">{items.map((item) => <button key={item.id} type="button" onClick={() => void loadDetail(item.id)} className={`w-full border-b border-[var(--color-line)] px-5 py-4 text-left transition last:border-b-0 ${selected?.id === item.id ? 'bg-[var(--color-soft)]' : 'hover:bg-white/70'}`}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-semibold text-[var(--color-ink)]">{item.requestNumber}</p><p className="mt-1 truncate text-xs text-[var(--color-muted)]">{item.requestedName || 'Nombre no proporcionado'} · {item.email}</p></div><span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${statusTone(item.status)}`}>{statusLabel(item.status)}</span></div><div className="mt-3 flex flex-wrap items-center gap-3 text-[10px] text-[var(--color-muted)]"><span className="inline-flex items-center gap-1">{item.source === 'mobile_app' ? <Smartphone size={12} /> : <Webhook size={12} />}{sourceLabel(item.source)}</span><span>{dateTime(item.createdAt)}</span><span>{item.userId ? 'Usuario identificado' : 'Sin sesión'}</span></div></button>)}</div>}
        </div>

        <div className="min-w-0 rounded-xl border border-[var(--color-line)] bg-[var(--color-panel)] p-5 shadow-[var(--shadow-card)]">
          {!selected ? <div className="flex min-h-[440px] items-center justify-center text-center"><div><ShieldAlert className="mx-auto text-[var(--color-muted)]" /><p className="mt-3 text-sm text-[var(--color-muted)]">Selecciona una orden para operar el expediente.</p></div></div> : <div className="space-y-5">
            <div className="flex flex-col gap-3 border-b border-[var(--color-line)] pb-5 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-gold)]">Expediente de privacidad</p><h2 className="mt-2 break-all text-xl text-[var(--color-burgundy)]" style={{ fontFamily: 'var(--font-display)' }}>{selected.requestNumber}</h2></div><span className={`w-fit rounded-full border px-3 py-1.5 text-xs font-semibold ${statusTone(selected.status)}`}>{statusLabel(selected.status)}</span></div>
            <div className="grid gap-3 sm:grid-cols-2"><Detail label="Solicitante" value={selected.requestedName || 'No proporcionado'} /><Detail label="Correo asociado" value={selected.email} /><Detail label="Canal" value={sourceLabel(selected.source)} /><Detail label="Identidad de sesión" value={selected.userId ? 'Vinculada a usuario autenticado' : 'Sin usuario autenticado'} /><Detail label="Confirmación por correo" value={dateTime(selected.confirmedAt)} /><Detail label="Plazo máximo" value={dateTime(selected.processingDueAt)} /></div>

            <div className="rounded-xl border border-[#dfccb3] bg-[#fff9f1] p-4"><p className="text-xs font-semibold text-[var(--color-burgundy)]">Alcance de ejecución</p><p className="mt-2 text-xs leading-6 text-[var(--color-muted)]">Centro de Control procesa la orden confirmada: elimina cuenta de acceso, datos personales no requeridos y anonimiza información transaccional cuando corresponda. La información obligatoria se conserva solo por el plazo legal, fiscal, de seguridad o prevención de fraude aplicable.</p></div>

            {writable ? <div className="space-y-4 rounded-xl border border-[var(--color-line)] bg-white/70 p-4"><button type="button" onClick={() => void processOrder()} disabled={processing || selected.status === 'completed'} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-burgundy)] px-5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"><PlayCircle size={15} />{processing ? 'Procesando…' : selected.status === 'completed' ? 'Orden completada' : 'Procesar eliminación'}</button><div><p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">Estado operativo</p><CrystalSelect value={nextStatus} onChange={setNextStatus} options={transitionOptions} disabled={transitionOptions.length <= 1} ariaLabel="Estado operativo" /></div><label className="block"><span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">Notas operativas</span><textarea value={adminNotes} onChange={(event) => setAdminNotes(event.target.value)} maxLength={5000} className="mt-2 min-h-[110px] w-full rounded-xl border border-[var(--color-line)] bg-white p-3 text-sm outline-none" placeholder="Acciones realizadas, obligación de conservación, error técnico o seguimiento operativo…" /></label><label className="block"><span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">Información que debe conservarse</span><textarea value={retentionNotes} onChange={(event) => setRetentionNotes(event.target.value)} maxLength={5000} className="mt-2 min-h-[92px] w-full rounded-xl border border-[var(--color-line)] bg-white p-3 text-sm outline-none" placeholder="Indica obligación y plazo aplicable, o registra que no existe conservación adicional…" /></label><button type="button" onClick={() => void save()} disabled={saving} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[var(--color-line)] bg-white px-5 text-xs font-semibold text-[var(--color-burgundy)] disabled:opacity-60"><Save size={15} />{saving ? 'Guardando…' : 'Guardar notas/estado'}</button></div> : <p className="rounded-xl bg-[var(--color-soft)] p-4 text-xs text-[var(--color-muted)]">Tu rol permite consultar, pero no modificar órdenes de privacidad.</p>}

            <div><h3 className="text-sm font-semibold">Historial de estado</h3><div className="mt-3 space-y-2">{selected.history?.map((event) => <div key={event.id} className="flex gap-3 rounded-lg bg-[var(--color-soft)] p-3"><span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[var(--color-burgundy)]" /><div className="min-w-0"><p className="text-xs font-semibold">{event.fromStatus ? `${statusLabel(event.fromStatus)} → ` : ''}{statusLabel(event.toStatus)}</p><p className="mt-1 text-[10px] text-[var(--color-muted)]">{dateTime(event.createdAt)}</p></div></div>)}{!selected.history?.length ? <p className="text-xs text-[var(--color-muted)]">Historial pendiente de carga.</p> : null}</div></div>
          </div>}
        </div>
      </section>
    </div>
  )
}

function Metric({ icon: Icon, label, value }: { icon: typeof FileClock; label: string; value: number }) { return <article className="rounded-xl border border-[var(--color-line)] bg-[var(--color-panel)] p-4 shadow-[var(--shadow-card)]"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] uppercase tracking-[0.12em] text-[var(--color-muted)]">{label}</p><p className="mt-2 text-2xl font-semibold">{value}</p></div><Icon size={18} className="text-[var(--color-burgundy)]" /></div></article> }
function Detail({ label, value }: { label: string; value: string }) { return <div className="min-w-0 rounded-lg bg-[var(--color-soft)] p-3"><p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">{label}</p><p className="mt-1 break-words text-xs font-semibold text-[var(--color-ink)]">{value}</p></div> }
