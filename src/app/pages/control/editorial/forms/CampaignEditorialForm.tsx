import { useMemo, useState } from 'react'
import { Loader2, Mail, Search } from 'lucide-react'
import { supabase } from '../../../../../lib/supabase'
import {
  adminContentClient,
  type CampaignAudienceFilters,
  type CampaignAudiencePreviewResponse,
  type CampaignSendResponse,
} from '../../../../../services/content.service'
import { CrystalSelect } from '../../../../components/shared/CrystalSelect'
import { EditorialFormShell } from '../EditorialFormShell'
import type { EditorialFormProps } from './editorialFormTypes'

function parseJson(value: string | undefined) {
  if (!value) return {}
  try {
    return JSON.parse(value) as Record<string, unknown>
  } catch {
    return {}
  }
}

function stringValue(value: unknown) {
  return typeof value === 'string' ? value : ''
}

function numberValue(value: unknown) {
  return typeof value === 'number' ? String(value) : typeof value === 'string' ? value : ''
}

function cleanFilters(filters: CampaignAudienceFilters) {
  return Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== '' && value !== undefined && value !== null),
  ) as CampaignAudienceFilters
}

async function currentAccessToken() {
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ?? null
}

export function CampaignEditorialForm(props: EditorialFormProps) {
  const storedAudience = useMemo(() => parseJson(props.form.audience_definition), [props.form.audience_definition])
  const storedContent = useMemo(() => parseJson(props.form.content), [props.form.content])
  const [filters, setFilters] = useState({
    search: stringValue(storedAudience.search),
    segment: stringValue(storedAudience.segment),
    source: stringValue(storedAudience.source),
    location: stringValue(storedAudience.location),
    hasOrders: storedAudience.hasOrders === true ? 'true' : storedAudience.hasOrders === false ? 'false' : '',
    hasReservations: storedAudience.hasReservations === true ? 'true' : storedAudience.hasReservations === false ? 'false' : '',
    hasMembership: storedAudience.hasMembership === true ? 'true' : storedAudience.hasMembership === false ? 'false' : '',
    minAge: numberValue(storedAudience.minAge),
    maxAge: numberValue(storedAudience.maxAge),
    minTotalSpend: numberValue(storedAudience.minTotalSpend),
    limit: numberValue(storedAudience.limit) || '250',
  })
  const [preview, setPreview] = useState<CampaignAudiencePreviewResponse['data'] | null>(null)
  const [sendResult, setSendResult] = useState<CampaignSendResponse['data'] | null>(null)
  const [working, setWorking] = useState('')
  const [operationError, setOperationError] = useState('')

  const audiencePayload = () => cleanFilters({
    search: filters.search,
    segment: filters.segment,
    source: filters.source,
    location: filters.location,
    hasOrders: filters.hasOrders === '' ? undefined : filters.hasOrders === 'true',
    hasReservations: filters.hasReservations === '' ? undefined : filters.hasReservations === 'true',
    hasMembership: filters.hasMembership === '' ? undefined : filters.hasMembership === 'true',
    minAge: filters.minAge ? Number(filters.minAge) : undefined,
    maxAge: filters.maxAge ? Number(filters.maxAge) : undefined,
    minTotalSpend: filters.minTotalSpend ? Number(filters.minTotalSpend) : undefined,
    limit: filters.limit ? Number(filters.limit) : undefined,
  })

  const previewAudience = async () => {
    setWorking('preview')
    setOperationError('')
    setSendResult(null)
    try {
      const response = await adminContentClient.previewCampaignAudience(audiencePayload(), await currentAccessToken())
      setPreview(response.data)
      props.onChange('audience_definition', JSON.stringify(audiencePayload()))
    } catch {
      setPreview(null)
      setOperationError('No fue posible calcular la audiencia con consentimiento.')
    } finally {
      setWorking('')
    }
  }

  const sendCampaign = async () => {
    if (!props.record?.id) {
      setOperationError('Guarda la campaña antes de enviarla.')
      return
    }
    setWorking('send')
    setOperationError('')
    try {
      const content = parseJson(props.form.content)
      const response = await adminContentClient.sendCampaign(props.record.id, {
        audience: audiencePayload(),
        subject: stringValue(content.subject),
        body: stringValue(content.body),
        ctaLabel: stringValue(content.cta_label),
        ctaUrl: stringValue(content.cta_url) || undefined,
        limit: filters.limit ? Number(filters.limit) : undefined,
      }, await currentAccessToken())
      setSendResult(response.data)
      props.onChange('audience_definition', JSON.stringify(audiencePayload()))
    } catch {
      setSendResult(null)
      setOperationError('No fue posible enviar la campaña. Revisa audiencia, contenido y configuración de envío.')
    } finally {
      setWorking('')
    }
  }

  return (
    <div className="space-y-5">
      <EditorialFormShell {...props} />
      <section className="rounded-[1rem] border border-[var(--color-line)] bg-white/58 p-5 shadow-[var(--shadow-card)] backdrop-blur-2xl">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[var(--color-muted)]">Operación de campaña</p>
            <h3 className="mt-1 text-xl font-semibold text-[var(--color-ink)]">Audiencia y envío de campaña</h3>
            <p className="mt-1 text-[13px] text-[var(--color-muted)]">Solo se incluyen clientes con correo válido y consentimiento de marketing por email.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => void previewAudience()} disabled={Boolean(working)} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[var(--color-line)] bg-white/72 px-4 text-sm font-semibold text-[var(--color-burgundy)]">
              {working === 'preview' ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
              Previsualizar
            </button>
            <button type="button" onClick={() => void sendCampaign()} disabled={Boolean(working) || !props.record?.id || !stringValue(storedContent.subject) || !stringValue(storedContent.body)} className="inline-flex min-h-10 items-center gap-2 rounded-full bg-[var(--color-burgundy)] px-4 text-sm font-semibold text-white disabled:opacity-55">
              {working === 'send' ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
              Enviar campaña
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-5">
          <GlassInput label="Buscar" value={filters.search} onChange={(value) => setFilters((current) => ({ ...current, search: value }))} placeholder="Nombre, correo o folio" />
          <GlassInput label="Segmento" value={filters.segment} onChange={(value) => setFilters((current) => ({ ...current, segment: value }))} placeholder="vip, frecuente..." />
          <GlassInput label="Canal" value={filters.source} onChange={(value) => setFilters((current) => ({ ...current, source: value }))} placeholder="App, Web, Atención directa..." />
          <GlassInput label="Ubicación" value={filters.location} onChange={(value) => setFilters((current) => ({ ...current, location: value }))} placeholder="Ciudad o estado" />
          <GlassInput label="Límite" value={filters.limit} onChange={(value) => setFilters((current) => ({ ...current, limit: value }))} placeholder="250" type="number" />
          <GlassSelect label="Compras" value={filters.hasOrders} onChange={(value) => setFilters((current) => ({ ...current, hasOrders: value }))} />
          <GlassSelect label="Reservas" value={filters.hasReservations} onChange={(value) => setFilters((current) => ({ ...current, hasReservations: value }))} />
          <GlassSelect label="Wine Club" value={filters.hasMembership} onChange={(value) => setFilters((current) => ({ ...current, hasMembership: value }))} />
          <GlassInput label="Edad mínima" value={filters.minAge} onChange={(value) => setFilters((current) => ({ ...current, minAge: value }))} type="number" />
          <GlassInput label="Gasto mínimo" value={filters.minTotalSpend} onChange={(value) => setFilters((current) => ({ ...current, minTotalSpend: value }))} type="number" />
        </div>

        {operationError ? <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{operationError}</p> : null}

        {preview ? (
          <div className="mt-5 rounded-[1rem] border border-[var(--color-line)] bg-white/64 p-4">
            <p className="text-sm font-semibold text-[var(--color-ink)]">{preview.total} destinatarios con consentimiento</p>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {preview.sample.slice(0, 8).map((item) => (
                <div key={item.id} className="rounded-2xl bg-white/72 px-4 py-3 text-sm">
                  <p className="font-semibold text-[var(--color-ink)]">{item.name}</p>
                  <p className="text-[var(--color-muted)]">{item.email}</p>
                  <p className="text-xs text-[var(--color-muted)]">{item.segment ?? 'Sin segmento'} · {item.source ?? 'Sin origen'}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {sendResult ? (
          <div className="mt-5 rounded-[1rem] border border-green-200 bg-green-50/80 p-4 text-sm text-green-900">
            Campaña enviada: {sendResult.sent} aceptados, {sendResult.pending} pendientes, {sendResult.failed} fallidos.
          </div>
        ) : null}
      </section>
    </div>
  )
}

function GlassInput({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: 'text' | 'number'
}) {
  return (
    <label className="space-y-2">
      <span className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--color-muted)]">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="min-h-11 w-full rounded-2xl border border-[var(--color-line)] bg-white/72 px-3 text-sm text-[var(--color-ink)] outline-none"
      />
    </label>
  )
}

function GlassSelect({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="space-y-2">
      <span className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--color-muted)]">{label}</span>
      <CrystalSelect value={value} onChange={onChange}>
        <option value="">Sin filtro</option>
        <option value="true">Sí</option>
        <option value="false">No</option>
      </CrystalSelect>
    </label>
  )
}
