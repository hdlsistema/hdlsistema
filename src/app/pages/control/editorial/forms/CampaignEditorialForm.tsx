import { useEffect, useMemo, useState } from 'react'
import { BarChart3, Bell, Inbox, Loader2, Mail, Search } from 'lucide-react'
import { supabase } from '../../../../../lib/supabase'
import {
  adminContentClient,
  type CampaignAudienceFilters,
  type CampaignAudiencePreviewResponse,
  type CampaignMetricsResponse,
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

function dateValue(value: unknown) {
  if (typeof value !== 'string' || !value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString().slice(0, 10)
}

function cleanFilters(filters: CampaignAudienceFilters) {
  return Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== '' && value !== undefined && value !== null),
  ) as CampaignAudienceFilters
}

type CampaignChannel = 'email' | 'push' | 'in_app'
type CampaignSourceGroup = NonNullable<CampaignAudienceFilters['sourceGroup']>
type CampaignCartStatus = NonNullable<CampaignAudienceFilters['cartStatus']>
type CampaignOrderStatus = NonNullable<CampaignAudienceFilters['orderStatus']>
type BooleanFilterValue = '' | 'true' | 'false'
type Option = { value: string; label: string }

const sourceGroupValues = new Set(['app', 'web', 'hacienda', 'other'])
const cartStatusValues = new Set(['active', 'abandoned', 'converted'])
const orderStatusValues = new Set(['draft', 'pending_payment', 'paid', 'processing', 'fulfilled', 'cancelled', 'refunded'])

const segmentOptions: Option[] = [
  { value: '', label: 'Todos los clientes' },
  { value: 'customer', label: 'Cliente general' },
  { value: 'recurring', label: 'Recurrente' },
  { value: 'vip', label: 'VIP' },
  { value: 'high_value', label: 'Alto valor' },
  { value: 'at_risk', label: 'En riesgo' },
  { value: 'inactive', label: 'Inactivo' },
  { value: 'wine_club', label: 'Wine Club' },
  { value: 'corporate', label: 'Corporativo' },
  { value: 'new', label: 'Nuevo en app' },
]

const sourceGroupOptions: Option[] = [
  { value: '', label: 'Todos los orígenes' },
  { value: 'app', label: 'App nativa' },
  { value: 'web', label: 'Web' },
  { value: 'hacienda', label: 'Hacienda / manual' },
  { value: 'other', label: 'Otro origen' },
]

const booleanOptions: Option[] = [
  { value: '', label: 'Sin filtro' },
  { value: 'true', label: 'Sí' },
  { value: 'false', label: 'No' },
]

const cartStatusOptions: Option[] = [
  { value: '', label: 'Sin filtro' },
  { value: 'active', label: 'Carrito activo' },
  { value: 'abandoned', label: 'Checkout abandonado' },
  { value: 'converted', label: 'Compra convertida' },
]

const orderStatusOptions: Option[] = [
  { value: '', label: 'Sin filtro' },
  { value: 'pending_payment', label: 'Pago pendiente' },
  { value: 'paid', label: 'Pago confirmado' },
  { value: 'processing', label: 'En proceso' },
  { value: 'fulfilled', label: 'Completada' },
  { value: 'cancelled', label: 'Cancelada' },
  { value: 'refunded', label: 'Reembolsada' },
  { value: 'draft', label: 'Borrador' },
]

function sourceGroupValue(value: string): CampaignSourceGroup | undefined {
  return sourceGroupValues.has(value) ? value as CampaignSourceGroup : undefined
}

function cartStatusValue(value: string): CampaignCartStatus | undefined {
  return cartStatusValues.has(value) ? value as CampaignCartStatus : undefined
}

function orderStatusValue(value: string): CampaignOrderStatus | undefined {
  return orderStatusValues.has(value) ? value as CampaignOrderStatus : undefined
}

function boolFilter(value: string): boolean | undefined {
  return value === 'true' ? true : value === 'false' ? false : undefined
}

function dateFilter(value: string, edge: 'start' | 'end') {
  if (!value) return undefined
  const date = new Date(`${value}T${edge === 'start' ? '00:00:00.000' : '23:59:59.999'}`)
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString()
}

function sourceGroupLabel(value?: string | null) {
  return sourceGroupOptions.find((option) => option.value === value)?.label ?? 'Sin origen'
}

function channelLabel(channel: CampaignChannel) {
  if (channel === 'email') return 'Correo'
  if (channel === 'push') return 'Push'
  return 'Notificación en app'
}

async function currentAccessToken() {
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ?? null
}

export function CampaignEditorialForm(props: EditorialFormProps) {
  const storedAudience = useMemo(() => parseJson(props.form.audience_definition), [props.form.audience_definition])
  const storedContent = useMemo(() => parseJson(props.form.content), [props.form.content])
  const [channels, setChannels] = useState<CampaignChannel[]>(() => {
    const value = storedAudience.channels
    const selected = Array.isArray(value)
      ? value.filter((channel): channel is CampaignChannel => ['email', 'push', 'in_app'].includes(String(channel)))
      : []
    return selected.length ? selected : ['email']
  })
  const [filters, setFilters] = useState({
    search: stringValue(storedAudience.search),
    segment: stringValue(storedAudience.segment),
    source: stringValue(storedAudience.source),
    sourceGroup: stringValue(storedAudience.sourceGroup),
    location: stringValue(storedAudience.location),
    hasOrders: storedAudience.hasOrders === true ? 'true' : storedAudience.hasOrders === false ? 'false' : '' as BooleanFilterValue,
    orderStatus: stringValue(storedAudience.orderStatus),
    hasReservations: storedAudience.hasReservations === true ? 'true' : storedAudience.hasReservations === false ? 'false' : '' as BooleanFilterValue,
    hasMembership: storedAudience.hasMembership === true ? 'true' : storedAudience.hasMembership === false ? 'false' : '' as BooleanFilterValue,
    cartStatus: stringValue(storedAudience.cartStatus),
    minAge: numberValue(storedAudience.minAge),
    maxAge: numberValue(storedAudience.maxAge),
    minTotalSpend: numberValue(storedAudience.minTotalSpend),
    maxTotalSpend: numberValue(storedAudience.maxTotalSpend),
    minTotalVisits: numberValue(storedAudience.minTotalVisits),
    createdFrom: dateValue(storedAudience.createdFrom),
    createdTo: dateValue(storedAudience.createdTo),
    lastVisitFrom: dateValue(storedAudience.lastVisitFrom),
    lastVisitTo: dateValue(storedAudience.lastVisitTo),
    limit: numberValue(storedAudience.limit) || '250',
  })
  const [preview, setPreview] = useState<CampaignAudiencePreviewResponse['data'] | null>(null)
  const [sendResult, setSendResult] = useState<CampaignSendResponse['data'] | null>(null)
  const [metrics, setMetrics] = useState<CampaignMetricsResponse['data'] | null>(null)
  const [working, setWorking] = useState('')
  const [operationError, setOperationError] = useState('')

  const audiencePayload = () => cleanFilters({
    channels,
    search: filters.search,
    segment: filters.segment,
    source: filters.source,
    sourceGroup: sourceGroupValue(filters.sourceGroup),
    location: filters.location,
    hasOrders: boolFilter(filters.hasOrders),
    orderStatus: orderStatusValue(filters.orderStatus),
    hasReservations: boolFilter(filters.hasReservations),
    hasMembership: boolFilter(filters.hasMembership),
    cartStatus: cartStatusValue(filters.cartStatus),
    minAge: filters.minAge ? Number(filters.minAge) : undefined,
    maxAge: filters.maxAge ? Number(filters.maxAge) : undefined,
    minTotalSpend: filters.minTotalSpend ? Number(filters.minTotalSpend) : undefined,
    maxTotalSpend: filters.maxTotalSpend ? Number(filters.maxTotalSpend) : undefined,
    minTotalVisits: filters.minTotalVisits ? Number(filters.minTotalVisits) : undefined,
    createdFrom: dateFilter(filters.createdFrom, 'start'),
    createdTo: dateFilter(filters.createdTo, 'end'),
    lastVisitFrom: dateFilter(filters.lastVisitFrom, 'start'),
    lastVisitTo: dateFilter(filters.lastVisitTo, 'end'),
    limit: filters.limit ? Number(filters.limit) : undefined,
  })

  useEffect(() => {
    if (!props.record?.id) {
      setMetrics(null)
      return
    }
    let active = true
    void (async () => {
      try {
        const response = await adminContentClient.campaignMetrics(props.record!.id, await currentAccessToken())
        if (active) setMetrics(response.data)
      } catch {
        if (active) setMetrics(null)
      }
    })()
    return () => { active = false }
  }, [props.record?.id])

  const toggleChannel = (channel: CampaignChannel) => {
    setChannels((current) => {
      if (current.includes(channel)) return current.length === 1 ? current : current.filter((item) => item !== channel)
      return [...current, channel]
    })
    setPreview(null)
    setSendResult(null)
  }

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
        channels,
        subject: stringValue(content.subject),
        body: stringValue(content.body),
        ctaLabel: stringValue(content.cta_label),
        ctaUrl: stringValue(content.cta_url) || undefined,
        limit: filters.limit ? Number(filters.limit) : undefined,
      }, await currentAccessToken())
      setSendResult(response.data)
      const updatedMetrics = await adminContentClient.campaignMetrics(props.record.id, await currentAccessToken())
      setMetrics(updatedMetrics.data)
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
            <p className="mt-1 text-[13px] text-[var(--color-muted)]">La audiencia se calcula con registros reales y respeta el consentimiento de cada canal.</p>
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

        <p className="mt-5 text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--color-muted)]">Canales de entrega</p>
        <div className="mt-5 grid gap-2 sm:grid-cols-3">
          {([
            { id: 'email' as const, label: 'Correo', icon: Mail },
            { id: 'push' as const, label: 'Notificación push', icon: Bell },
            { id: 'in_app' as const, label: 'Notificación en app', icon: Inbox },
          ]).map((channel) => {
            const Icon = channel.icon
            const selected = channels.includes(channel.id)
            return (
              <button
                key={channel.id}
                type="button"
                aria-pressed={selected}
                onClick={() => toggleChannel(channel.id)}
                className={`flex min-h-12 items-center gap-3 rounded-2xl border px-4 text-left text-sm font-semibold transition ${selected ? 'border-[var(--color-burgundy)] bg-[#fff3f5] text-[var(--color-burgundy)]' : 'border-[var(--color-line)] bg-white/64 text-[var(--color-muted)]'}`}
              >
                <Icon size={17} />
                {channel.label}
              </button>
            )
          })}
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-4">
          <GlassInput label="Buscar" value={filters.search} onChange={(value) => setFilters((current) => ({ ...current, search: value }))} placeholder="Nombre, correo o folio" />
          <GlassOptionsSelect label="Tipo de cliente" value={filters.segment} onChange={(value) => setFilters((current) => ({ ...current, segment: value }))} options={segmentOptions} />
          <GlassOptionsSelect label="Origen" value={filters.sourceGroup} onChange={(value) => setFilters((current) => ({ ...current, sourceGroup: value }))} options={sourceGroupOptions} />
          <GlassInput label="Ubicación" value={filters.location} onChange={(value) => setFilters((current) => ({ ...current, location: value }))} placeholder="Ciudad o estado" />
          <GlassInput label="Límite" value={filters.limit} onChange={(value) => setFilters((current) => ({ ...current, limit: value }))} placeholder="250" type="number" />
          <GlassOptionsSelect label="Compras" value={filters.hasOrders} onChange={(value) => setFilters((current) => ({ ...current, hasOrders: value as BooleanFilterValue }))} options={booleanOptions} />
          <GlassOptionsSelect label="Estado de orden" value={filters.orderStatus} onChange={(value) => setFilters((current) => ({ ...current, orderStatus: value }))} options={orderStatusOptions} />
          <GlassOptionsSelect label="Carritos" value={filters.cartStatus} onChange={(value) => setFilters((current) => ({ ...current, cartStatus: value }))} options={cartStatusOptions} />
          <GlassOptionsSelect label="Reservas" value={filters.hasReservations} onChange={(value) => setFilters((current) => ({ ...current, hasReservations: value as BooleanFilterValue }))} options={booleanOptions} />
          <GlassOptionsSelect label="Wine Club" value={filters.hasMembership} onChange={(value) => setFilters((current) => ({ ...current, hasMembership: value as BooleanFilterValue }))} options={booleanOptions} />
          <GlassInput label="Cliente desde" value={filters.createdFrom} onChange={(value) => setFilters((current) => ({ ...current, createdFrom: value }))} type="date" />
          <GlassInput label="Cliente hasta" value={filters.createdTo} onChange={(value) => setFilters((current) => ({ ...current, createdTo: value }))} type="date" />
          <GlassInput label="Actividad desde" value={filters.lastVisitFrom} onChange={(value) => setFilters((current) => ({ ...current, lastVisitFrom: value }))} type="date" />
          <GlassInput label="Actividad hasta" value={filters.lastVisitTo} onChange={(value) => setFilters((current) => ({ ...current, lastVisitTo: value }))} type="date" />
          <GlassInput label="Edad mínima" value={filters.minAge} onChange={(value) => setFilters((current) => ({ ...current, minAge: value }))} type="number" />
          <GlassInput label="Visitas mínimas" value={filters.minTotalVisits} onChange={(value) => setFilters((current) => ({ ...current, minTotalVisits: value }))} type="number" />
          <GlassInput label="Gasto mínimo" value={filters.minTotalSpend} onChange={(value) => setFilters((current) => ({ ...current, minTotalSpend: value }))} type="number" />
          <GlassInput label="Gasto máximo" value={filters.maxTotalSpend} onChange={(value) => setFilters((current) => ({ ...current, maxTotalSpend: value }))} type="number" />
        </div>

        {operationError ? <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{operationError}</p> : null}

        {preview ? (
          <div className="mt-5 rounded-[1rem] border border-[var(--color-line)] bg-white/64 p-4">
            <p className="text-sm font-semibold text-[var(--color-ink)]">{preview.total} destinatarios elegibles</p>
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-[var(--color-muted)]">
              {preview.channels.map((channel) => (
                <span key={channel} className="rounded-full bg-white px-3 py-1">
                  {channelLabel(channel)}: {preview.channelTotals[channel] ?? 0}
                </span>
              ))}
              {preview.excludedInternalUsers ? (
                <span className="rounded-full bg-white px-3 py-1">Usuarios internos excluidos: {preview.excludedInternalUsers}</span>
              ) : null}
            </div>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {preview.sample.slice(0, 8).map((item) => (
                <div key={item.id} className="rounded-2xl bg-white/72 px-4 py-3 text-sm">
                  <p className="font-semibold text-[var(--color-ink)]">{item.name}</p>
                  <p className="text-[var(--color-muted)]">{item.email}</p>
                  <p className="text-xs text-[var(--color-muted)]">{item.segment ?? 'Sin segmento'} · {sourceGroupLabel(item.sourceGroup)} · {item.totalVisits} visitas · ${item.totalSpend.toLocaleString('es-MX')}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {sendResult ? (
          <div className="mt-5 rounded-[1rem] border border-[rgba(37,47,55,0.24)] bg-[rgba(37,47,55,0.08)] p-4 text-sm text-[#252F37]">
            Campaña enviada: {sendResult.sent} aceptados, {sendResult.pending} pendientes, {sendResult.failed} fallidos.
          </div>
        ) : null}

        {metrics?.channels.some((channel) => channel.total > 0) ? (
          <div className="mt-5 rounded-[1rem] border border-[var(--color-line)] bg-white/64 p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-[var(--color-ink)]"><BarChart3 size={16} /> Métricas guardadas en Supabase</p>
            <div className="mt-3 grid gap-2 md:grid-cols-3">
              {metrics.channels.filter((channel) => channel.total > 0).map((channel) => (
                <div key={channel.channel} className="rounded-2xl bg-white/76 p-3 text-xs text-[var(--color-muted)]">
                  <p className="font-semibold text-[var(--color-ink)]">{channelLabel(channel.channel)}</p>
                  <p className="mt-1">Entregados {channel.delivered} · Pendientes {channel.pending} · Fallidos {channel.failed}</p>
                  <p className="mt-1">Abiertos {channel.opened} · Clics {channel.clicked}</p>
                </div>
              ))}
            </div>
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
  type?: 'text' | 'number' | 'date'
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

function GlassOptionsSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: Option[]
}) {
  return (
    <label className="space-y-2">
      <span className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--color-muted)]">{label}</span>
      <CrystalSelect value={value} onChange={onChange}>
        {options.map((option) => (
          <option key={option.value || 'empty'} value={option.value}>{option.label}</option>
        ))}
      </CrystalSelect>
    </label>
  )
}
