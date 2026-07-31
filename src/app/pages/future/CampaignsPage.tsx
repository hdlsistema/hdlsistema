import { useMemo, useState } from 'react'
import { useAppPreferences } from '../../context/AppPreferencesContext'
import {
  Bell,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Clock3,
  Eye,
  Filter,
  Mail,
  MessageSquareText,
  Plus,
  Search,
  Send,
  Smartphone,
  Sparkles,
  Target,
  Users,
  X,
} from 'lucide-react'
import { CrystalSelect } from '../../components/shared/CrystalSelect'
import { SectionTitle } from '../../components/shared/SectionTitle'

type StepKey =
  | 'audience'
  | 'promotion'
  | 'message'
  | 'channels'
  | 'review'

type PreviewTab = 'email' | 'push' | 'inApp'

type SegmentKey =
  | 'all'
  | 'club'
  | 'frequent'
  | 'new'
  | 'inactive'
  | 'highValue'
  | 'events'
  | 'experiences'
  | 'wine'

type ChannelKey = 'email' | 'push' | 'inApp' | 'banner'

type CampaignStatus = 'Activa' | 'Finalizada' | 'Programada' | 'Borrador'

type CampaignRecord = {
  id: string
  name: string
  segment: string
  channels: string
  sent: number
  openRate: number
  conversion: number
  revenue: number
  status: CampaignStatus
}

function getSteps(isEnglish: boolean): Array<{ key: StepKey; label: string }> {
  return [
    { key: 'audience', label: isEnglish ? 'Audience' : 'Audiencia' },
    { key: 'promotion', label: isEnglish ? 'Promotion' : 'Promoción' },
    { key: 'message', label: isEnglish ? 'Message' : 'Mensaje' },
    { key: 'channels', label: isEnglish ? 'Channels' : 'Canales' },
    { key: 'review', label: isEnglish ? 'Review' : 'Revisar' },
  ]
}

function getSegmentOptions(isEnglish: boolean): Array<{
  key: SegmentKey
  label: string
  description: string
  count: number
}> {
  return [
    {
      key: 'all',
      label: isEnglish ? 'All customers' : 'Todos los clientes',
      description: isEnglish ? 'Full base with valid consent.' : 'Base completa con consentimiento válido.',
      count: 1248,
    },
    {
      key: 'club',
      label: 'Wine Club',
      description: isEnglish ? 'Active members and those approaching renewal.' : 'Miembros activos y próximos a renovar.',
      count: 412,
    },
    {
      key: 'frequent',
      label: isEnglish ? 'Frequent customers' : 'Clientes frecuentes',
      description: isEnglish ? 'Two or more purchases in the last year.' : 'Dos compras o más durante el último año.',
      count: 386,
    },
    {
      key: 'new',
      label: isEnglish ? 'New customers' : 'Clientes nuevos',
      description: isEnglish ? 'First purchase in the last 45 days.' : 'Primera compra durante los últimos 45 días.',
      count: 174,
    },
    {
      key: 'inactive',
      label: isEnglish ? 'Inactive customers' : 'Clientes inactivos',
      description: isEnglish ? 'No purchase or reservation in 90 days.' : 'Sin compra ni reservación en 90 días.',
      count: 214,
    },
    {
      key: 'highValue',
      label: isEnglish ? 'High value' : 'Alto valor',
      description: isEnglish ? 'Average ticket above $1,500.' : 'Ticket promedio superior a $1,500.',
      count: 168,
    },
    {
      key: 'events',
      label: isEnglish ? 'Event visitors' : 'Visitantes de eventos',
      description: isEnglish ? 'Purchased tickets or attended festivals.' : 'Compraron boletos o asistieron a festivales.',
      count: 522,
    },
    {
      key: 'experiences',
      label: isEnglish ? 'Experiences customers' : 'Clientes de experiencias',
      description: isEnglish ? 'Reserved tastings, tours, or dinners.' : 'Reservaron catas, recorridos o cenas.',
      count: 438,
    },
    {
      key: 'wine',
      label: isEnglish ? 'Wine buyers' : 'Compradores de vino',
      description: isEnglish ? 'Purchased one or more labels.' : 'Compraron una o más etiquetas.',
      count: 691,
    },
  ]
}

function getCampaignHistory(isEnglish: boolean): CampaignRecord[] {
  return [
    {
      id: 'campaign-1',
      name: 'Cena bajo las estrellas',
      segment: isEnglish ? 'Recurring couples' : 'Parejas recurrentes',
      channels: 'Email + Push',
      sent: 318,
      openRate: 49,
      conversion: 9.2,
      revenue: 84600,
      status: 'Finalizada',
    },
    {
      id: 'campaign-2',
      name: 'Vendimia 2026',
      segment: isEnglish ? 'Active customers' : 'Clientes activos',
      channels: 'Email + Push + App',
      sent: 742,
      openRate: 44,
      conversion: 7.8,
      revenue: 136400,
      status: 'Activa',
    },
    {
      id: 'campaign-3',
      name: 'Reactivación Wine Club',
      segment: isEnglish ? '90-day inactive' : 'Inactivos 90 días',
      channels: 'Email',
      sent: 186,
      openRate: 38,
      conversion: 5.1,
      revenue: 31200,
      status: 'Programada',
    },
  ]
}

function getPromotionOptions(isEnglish: boolean): string[] {
  return [
    isEnglish ? 'Wine tasting' : 'Cata de vino',
    isEnglish ? 'Vineyard tour' : 'Recorrido por viñedos',
    isEnglish ? 'Romantic dinner' : 'Cena romántica',
    isEnglish ? 'Vineyard picnic' : 'Picnic entre viñedos',
    'Wine Club',
    'Festival 1000 Copas',
    'Vendimia Hacienda de Letras',
    isEnglish ? 'Custom promotion' : 'Promoción personalizada',
  ]
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('es-MX').format(value)
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(value)
}

function StatusPill({ status }: { status: CampaignStatus }) {
  const { isEnglish } = useAppPreferences()
  const styles: Record<CampaignStatus, string> = {
    Activa: 'bg-[#e8f0e7] text-[#5f7d63]',
    Finalizada: 'bg-[#f2ece5] text-[#7f6a59]',
    Programada: 'bg-[#f6eadb] text-[#9b6b2f]',
    Borrador: 'bg-[#efe9ef] text-[#745c72]',
  }
  const labels: Record<CampaignStatus, string> = {
    Activa: isEnglish ? 'Active' : 'Activa',
    Finalizada: isEnglish ? 'Completed' : 'Finalizada',
    Programada: isEnglish ? 'Scheduled' : 'Programada',
    Borrador: isEnglish ? 'Draft' : 'Borrador',
  }

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1.5 text-[10px] font-semibold ${styles[status]}`}
    >
      {labels[status]}
    </span>
  )
}

function ChannelToggle({
  icon: Icon,
  title,
  description,
  enabled,
  onToggle,
}: {
  icon: typeof Mail
  title: string
  description: string
  enabled: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center gap-4 rounded-[1rem] border border-[var(--color-line)] bg-[var(--color-panel-strong)] p-4 text-left transition hover:-translate-y-0.5"
    >
      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-soft)] text-[var(--color-burgundy)]">
        <Icon size={18} />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-[var(--color-ink)]">
          {title}
        </span>

        <span className="mt-1 block text-[11px] leading-5 text-[var(--color-muted)]">
          {description}
        </span>
      </span>

      <span
        className={`relative h-7 w-12 shrink-0 rounded-full transition ${
          enabled ? 'bg-[var(--color-burgundy)]' : 'bg-[#d9d1c8]'
        }`}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition ${
            enabled ? 'left-6' : 'left-1'
          }`}
        />
      </span>
    </button>
  )
}

export function CampaignsPage() {
  const [currentStep, setCurrentStep] = useState<StepKey>('audience')
  const [selectedSegment, setSelectedSegment] =
    useState<SegmentKey>('inactive')
  const [previewTab, setPreviewTab] = useState<PreviewTab>('email')
  const [historySearch, setHistorySearch] = useState('')
  const [showSuccess, setShowSuccess] = useState(false)

  const [filters, setFilters] = useState({
    city: 'Todas',
    lastPurchase: '90 días o más',
    minPurchases: '2',
    minTicket: '1500',
    acceptsPromotions: true,
    excludeRecentContacts: true,
  })

  const [promotion, setPromotion] = useState({
    objective: 'Reactivar clientes',
    product: 'Cata de vino',
    discount: '15',
    code: 'REGRESA15',
    startDate: '2026-07-01',
    endDate: '2026-07-15',
    capacity: '60',
    link: '/control/app/reservacion',
  })

  const [message, setMessage] = useState({
    internalName: 'Regresa a Hacienda',
    subject: 'Una experiencia te está esperando en Hacienda de Letras',
    preheader: 'Tienes un beneficio especial por tiempo limitado.',
    title: 'Vuelve a vivir el vino de Aguascalientes',
    body:
      'Patricia, queremos invitarte a regresar. Disfruta 15% de descuento en tu próxima cata y descubre nuevas etiquetas de la casa.',
    button: 'Reservar ahora',
    signature: 'Hacienda de Letras',
  })

  const [channels, setChannels] = useState<Record<ChannelKey, boolean>>({
    email: true,
    push: true,
    inApp: true,
    banner: false,
  })

  const [delivery, setDelivery] = useState({
    mode: 'schedule',
    date: '2026-07-01',
    time: '10:00',
    quietHours: true,
    frequencyLimit: true,
    stopAtCapacity: true,
  })

  const { isEnglish } = useAppPreferences()
  const steps = useMemo(() => getSteps(isEnglish), [isEnglish])
  const segmentOptions = useMemo(() => getSegmentOptions(isEnglish), [isEnglish])
  const promotionOptions = useMemo(() => getPromotionOptions(isEnglish), [isEnglish])
  const campaignHistory = useMemo(() => getCampaignHistory(isEnglish), [isEnglish])

  const activeStepIndex = steps.findIndex(
    (step) => step.key === currentStep,
  )

  const selectedSegmentData =
    segmentOptions.find((segment) => segment.key === selectedSegment) ??
    segmentOptions[0]

  const audienceEstimate = useMemo(() => {
    let total = selectedSegmentData.count

    if (filters.lastPurchase !== 'Todos') {
      total = Math.round(total * 0.78)
    }

    if (Number(filters.minPurchases) >= 2) {
      total = Math.round(total * 0.82)
    }

    if (Number(filters.minTicket) >= 1500) {
      total = Math.round(total * 0.68)
    }

    return Math.max(total, 34)
  }, [filters, selectedSegmentData])

  const emailAvailable = Math.round(audienceEstimate * 0.96)
  const pushAvailable = Math.round(audienceEstimate * 0.7)
  const excluded = Math.max(
    selectedSegmentData.count - audienceEstimate,
    0,
  )
  const duplicates = Math.max(
    Math.round(audienceEstimate * 0.018),
    2,
  )

  const filteredHistory = useMemo(() => {
    const query = historySearch.toLocaleLowerCase('es-MX').trim()

    if (!query) {
      return campaignHistory
    }

    return campaignHistory.filter((campaign) =>
      [
        campaign.name,
        campaign.segment,
        campaign.channels,
        campaign.status,
      ]
        .join(' ')
        .toLocaleLowerCase('es-MX')
        .includes(query),
    )
  }, [historySearch])

  const goNext = () => {
    const nextIndex = Math.min(activeStepIndex + 1, steps.length - 1)
    setCurrentStep(steps[nextIndex].key)
  }

  const goPrevious = () => {
    const previousIndex = Math.max(activeStepIndex - 1, 0)
    setCurrentStep(steps[previousIndex].key)
  }

  const launchCampaign = () => {
    setShowSuccess(true)
    window.setTimeout(() => setShowSuccess(false), 3500)
  }

  const renderAudienceStep = () => (
    <div className="grid gap-5 2xl:grid-cols-[minmax(0,1.25fr)_minmax(330px,0.75fr)]">
      <div className="space-y-5">
        <section className="rounded-[1.2rem] border border-[var(--color-line)] bg-[var(--color-panel)] p-5 shadow-[var(--shadow-card)]">
          <div className="flex flex-col gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-gold)]">
              {isEnglish ? 'Quick segments' : 'Segmentos rápidos'}
            </p>

            <h3
              className="text-[1.55rem] text-[var(--color-ink)]"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {isEnglish ? 'Who do you want to activate?' : '¿A quién quieres activar?'}
            </h3>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {segmentOptions.map((segment) => {
              const selected = selectedSegment === segment.key

              return (
                <button
                  key={segment.key}
                  type="button"
                  onClick={() => setSelectedSegment(segment.key)}
                  className="rounded-[1rem] border p-4 text-left transition hover:-translate-y-0.5"
                  style={{
                    borderColor: selected
                      ? 'var(--color-burgundy)'
                      : 'var(--color-line)',
                    backgroundColor: selected
                      ? 'rgba(104,17,38,0.055)'
                      : 'var(--color-panel-strong)',
                    boxShadow: selected
                      ? '0 14px 28px rgba(79,15,31,0.1)'
                      : 'none',
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-soft)] text-[var(--color-burgundy)]">
                      <Users size={16} />
                    </span>

                    {selected ? (
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-burgundy)] text-white">
                        <Check size={13} />
                      </span>
                    ) : null}
                  </div>

                  <p className="mt-4 text-sm font-semibold text-[var(--color-ink)]">
                    {segment.label}
                  </p>

                  <p className="mt-1 min-h-[38px] text-[10px] leading-5 text-[var(--color-muted)]">
                    {segment.description}
                  </p>

                  <p className="mt-3 text-xs font-bold text-[var(--color-burgundy)]">
                    {formatNumber(segment.count)} {isEnglish ? 'customers' : 'clientes'}
                  </p>
                </button>
              )
            })}
          </div>
        </section>

        <section className="rounded-[1.2rem] border border-[var(--color-line)] bg-[var(--color-panel)] p-5 shadow-[var(--shadow-card)]">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-soft)] text-[var(--color-burgundy)]">
              <Filter size={17} />
            </span>

            <div>
              <p className="text-sm font-semibold text-[var(--color-ink)]">
                {isEnglish ? 'Advanced filters' : 'Filtros avanzados'}
              </p>

              <p className="mt-1 text-[10px] text-[var(--color-muted)]">
                {isEnglish ? 'Refine the audience without duplicates or unauthorized contacts.' : 'Refina la audiencia sin duplicados ni contactos no autorizados.'}
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <label className="block">
              <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
                {isEnglish ? 'City' : 'Ciudad'}
              </span>

              <CrystalSelect
                value={filters.city}
                onChange={(value) =>
                  setFilters((current) => ({
                    ...current,
                    city: value,
                  }))
                }
                options={[
                  { value: 'Todas', label: isEnglish ? 'All' : 'Todas' },
                  { value: 'Aguascalientes', label: 'Aguascalientes' },
                  { value: 'Guadalajara', label: 'Guadalajara' },
                  { value: 'Ciudad de México', label: 'Ciudad de México' },
                  { value: 'Monterrey', label: 'Monterrey' },
                  { value: 'León', label: 'León' },
                ]}
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
                {isEnglish ? 'Last purchase' : 'Última compra'}
              </span>

              <CrystalSelect
                value={filters.lastPurchase}
                onChange={(value) =>
                  setFilters((current) => ({
                    ...current,
                    lastPurchase: value,
                  }))
                }
                options={[
                  { value: 'Todos', label: isEnglish ? 'All' : 'Todos' },
                  { value: '30 días o más', label: isEnglish ? '30+ days' : '30 días o más' },
                  { value: '60 días o más', label: isEnglish ? '60+ days' : '60 días o más' },
                  { value: '90 días o más', label: isEnglish ? '90+ days' : '90 días o más' },
                  { value: '180 días o más', label: isEnglish ? '180+ days' : '180 días o más' },
                ]}
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
                {isEnglish ? 'Minimum purchases' : 'Compras mínimas'}
              </span>

              <input
                type="number"
                min="0"
                value={filters.minPurchases}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    minPurchases: event.target.value,
                  }))
                }
                className="min-h-11 w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-panel-strong)] px-4 text-sm text-[var(--color-ink)] outline-none"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
                {isEnglish ? 'Minimum ticket' : 'Ticket mínimo'}
              </span>

              <input
                type="number"
                min="0"
                value={filters.minTicket}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    minTicket: event.target.value,
                  }))
                }
                className="min-h-11 w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-panel-strong)] px-4 text-sm text-[var(--color-ink)] outline-none"
              />
            </label>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {[
              {
                key: 'acceptsPromotions',
                label: isEnglish ? 'Only customers with active consent' : 'Solo clientes con consentimiento vigente',
              },
              {
                key: 'excludeRecentContacts',
                label: isEnglish ? 'Exclude recently contacted customers' : 'Excluir clientes contactados recientemente',
              },
            ].map((item) => {
              const key = item.key as
                | 'acceptsPromotions'
                | 'excludeRecentContacts'
              const active = filters[key]

              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() =>
                    setFilters((current) => ({
                      ...current,
                      [key]: !current[key],
                    }))
                  }
                  className="flex items-center gap-3 rounded-xl border border-[var(--color-line)] bg-[var(--color-panel-strong)] p-4 text-left"
                >
                  <span
                    className={`inline-flex h-6 w-6 items-center justify-center rounded-md ${
                      active
                        ? 'bg-[var(--color-burgundy)] text-white'
                        : 'bg-white text-transparent'
                    }`}
                  >
                    <Check size={14} />
                  </span>

                  <span className="text-xs font-semibold text-[var(--color-ink)]">
                    {item.label}
                  </span>
                </button>
              )
            })}
          </div>
        </section>
      </div>

      <aside className="space-y-4">
        <section className="rounded-[1.2rem] border border-[var(--color-line)] bg-[var(--color-panel)] p-5 shadow-[var(--shadow-card)]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-gold)]">
            {isEnglish ? 'Estimated audience' : 'Audiencia estimada'}
          </p>

          <p
            className="mt-3 text-[2.8rem] leading-none text-[var(--color-ink)]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {formatNumber(audienceEstimate)}
          </p>

          <p className="mt-2 text-xs text-[var(--color-muted)]">
            {isEnglish ? 'customers ready for campaign' : 'clientes listos para campaña'}
          </p>

          <div className="mt-6 space-y-3">
            {[
              [isEnglish ? 'Email available' : 'Correo disponible', emailAvailable],
              [isEnglish ? 'Push available' : 'Push disponible', pushAvailable],
              [isEnglish ? 'Excluded for privacy' : 'Excluidos por privacidad', excluded],
              [isEnglish ? 'Duplicates removed' : 'Duplicados eliminados', duplicates],
            ].map(([label, value]) => (
              <div
                key={String(label)}
                className="flex items-center justify-between gap-4 rounded-xl bg-[var(--color-panel-strong)] px-4 py-3"
              >
                <span className="text-xs text-[var(--color-muted-strong)]">
                  {label}
                </span>

                <span className="text-sm font-bold text-[var(--color-ink)]">
                  {formatNumber(Number(value))}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[1.2rem] border border-[rgba(180,138,85,0.25)] bg-[#fbf5ec] p-5">
          <div className="flex items-start gap-3">
            <Sparkles
              size={18}
              className="mt-0.5 shrink-0 text-[var(--color-burgundy)]"
            />

            <div>
              <p className="text-sm font-semibold text-[var(--color-ink)]">
                {isEnglish ? 'Segmentation recommendation' : 'Recomendación de segmentación'}
              </p>

              <p className="mt-2 text-xs leading-6 text-[var(--color-muted-strong)]">
                {isEnglish
                  ? 'This segment responds best when the promotion is presented as an exclusive benefit rather than a generic discount.'
                  : 'Este segmento responde mejor cuando la promoción se presenta como beneficio exclusivo y no como descuento genérico.'}
              </p>
            </div>
          </div>
        </section>
      </aside>
    </div>
  )

  const renderPromotionStep = () => (
    <div className="grid gap-5 2xl:grid-cols-[minmax(0,1.25fr)_minmax(330px,0.75fr)]">
      <section className="rounded-[1.2rem] border border-[var(--color-line)] bg-[var(--color-panel)] p-5 shadow-[var(--shadow-card)]">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-gold)]">
          {isEnglish ? 'Commercial offer' : 'Oferta comercial'}
        </p>

        <h3
          className="mt-2 text-[1.55rem] text-[var(--color-ink)]"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {isEnglish ? 'What do you want to sell?' : '¿Qué quieres vender?'}
        </h3>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Field
            label={isEnglish ? 'Campaign objective' : 'Objetivo de campaña'}
            value={promotion.objective}
            onChange={(value) =>
              setPromotion((current) => ({
                ...current,
                objective: value,
              }))
            }
          />

          <label className="block">
            <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
              {isEnglish ? 'Product or experience' : 'Producto o experiencia'}
            </span>

            <CrystalSelect
              value={promotion.product}
              onChange={(value) =>
                setPromotion((current) => ({
                  ...current,
                  product: value,
                }))
              }
              options={promotionOptions.map((option) => ({
                value: option,
                label: option,
              }))}
              buttonClassName="min-h-12 text-[var(--color-ink)]"
            />
          </label>

          <Field
            label={isEnglish ? 'Discount (%)' : 'Descuento (%)'}
            type="number"
            value={promotion.discount}
            onChange={(value) =>
              setPromotion((current) => ({
                ...current,
                discount: value,
              }))
            }
          />

          <Field
            label={isEnglish ? 'Promo code' : 'Código promocional'}
            value={promotion.code}
            onChange={(value) =>
              setPromotion((current) => ({
                ...current,
                code: value,
              }))
            }
          />

          <Field
            label={isEnglish ? 'Start date' : 'Fecha de inicio'}
            type="date"
            value={promotion.startDate}
            onChange={(value) =>
              setPromotion((current) => ({
                ...current,
                startDate: value,
              }))
            }
          />

          <Field
            label={isEnglish ? 'Expiration date' : 'Fecha de vencimiento'}
            type="date"
            value={promotion.endDate}
            onChange={(value) =>
              setPromotion((current) => ({
                ...current,
                endDate: value,
              }))
            }
          />

          <Field
            label={isEnglish ? 'Available capacity' : 'Cupo disponible'}
            type="number"
            value={promotion.capacity}
            onChange={(value) =>
              setPromotion((current) => ({
                ...current,
                capacity: value,
              }))
            }
          />

          <Field
            label={isEnglish ? 'Destination link' : 'Enlace de destino'}
            value={promotion.link}
            onChange={(value) =>
              setPromotion((current) => ({
                ...current,
                link: value,
              }))
            }
          />
        </div>
      </section>

      <aside className="space-y-4">
        <section className="overflow-hidden rounded-[1.2rem] border border-[var(--color-line)] bg-[var(--color-panel)] shadow-[var(--shadow-card)]">
          <div className="relative h-[190px] overflow-hidden">
            <img
              src="/romantic dinners evento.webp"
              alt="Vista de la promoción"
              className="absolute inset-0 h-full w-full object-cover"
            />

            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(30,8,14,0.05),rgba(30,8,14,0.82))]" />

            <div className="absolute inset-x-0 bottom-0 p-5 text-white">
              <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-[#e5c58f]">
                {promotion.objective}
              </p>

              <h4
                className="mt-2 text-[1.7rem] leading-tight text-white"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {promotion.product}
              </h4>
            </div>
          </div>

          <div className="p-5">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-[var(--color-panel-strong)] p-3">
                <p className="text-[9px] uppercase tracking-[0.1em] text-[var(--color-muted)]">
                  {isEnglish ? 'Benefit' : 'Beneficio'}
                </p>

                <p className="mt-1 text-lg font-bold text-[var(--color-burgundy)]">
                  {promotion.discount}% OFF
                </p>
              </div>

              <div className="rounded-xl bg-[var(--color-panel-strong)] p-3">
                <p className="text-[9px] uppercase tracking-[0.1em] text-[var(--color-muted)]">
                  {isEnglish ? 'Capacity' : 'Cupo'}
                </p>

                <p className="mt-1 text-lg font-bold text-[var(--color-ink)]">
                  {promotion.capacity}
                </p>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-dashed border-[var(--color-line)] px-4 py-3">
              <span className="text-xs text-[var(--color-muted)]">
                {isEnglish ? 'Code' : 'Código'}
              </span>

              <span className="font-mono text-sm font-bold text-[var(--color-burgundy)]">
                {promotion.code}
              </span>
            </div>
          </div>
        </section>
      </aside>
    </div>
  )

  const renderMessageStep = () => (
    <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.72fr)]">
      <section className="rounded-[1.2rem] border border-[var(--color-line)] bg-[var(--color-panel)] p-5 shadow-[var(--shadow-card)]">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-gold)]">
          {isEnglish ? 'Content' : 'Contenido'}
        </p>

        <h3
          className="mt-2 text-[1.55rem] text-[var(--color-ink)]"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {isEnglish ? 'Build the message' : 'Construye el mensaje'}
        </h3>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Field
            label={isEnglish ? 'Internal name' : 'Nombre interno'}
            value={message.internalName}
            onChange={(value) =>
              setMessage((current) => ({
                ...current,
                internalName: value,
              }))
            }
          />

          <Field
            label={isEnglish ? 'Email subject' : 'Asunto del correo'}
            value={message.subject}
            onChange={(value) =>
              setMessage((current) => ({
                ...current,
                subject: value,
              }))
            }
          />

          <div className="md:col-span-2">
            <Field
              label="Texto previo"
              value={message.preheader}
              onChange={(value) =>
                setMessage((current) => ({
                  ...current,
                  preheader: value,
                }))
              }
            />
          </div>

          <div className="md:col-span-2">
            <Field
              label="Título principal"
              value={message.title}
              onChange={(value) =>
                setMessage((current) => ({
                  ...current,
                  title: value,
                }))
              }
            />
          </div>

          <label className="block md:col-span-2">
            <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
              {isEnglish ? 'Message' : 'Mensaje'}
            </span>

            <textarea
              value={message.body}
              onChange={(event) =>
                setMessage((current) => ({
                  ...current,
                  body: event.target.value,
                }))
              }
              rows={6}
              className="w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-panel-strong)] px-4 py-3 text-sm leading-6 text-[var(--color-ink)] outline-none"
            />
          </label>

          <Field
            label={isEnglish ? 'Button text' : 'Texto del botón'}
            value={message.button}
            onChange={(value) =>
              setMessage((current) => ({
                ...current,
                button: value,
              }))
            }
          />

          <Field
            label={isEnglish ? 'Signature' : 'Firma'}
            value={message.signature}
            onChange={(value) =>
              setMessage((current) => ({
                ...current,
                signature: value,
              }))
            }
          />
        </div>

        <div className="mt-5 rounded-xl bg-[var(--color-panel-strong)] p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
            {isEnglish ? 'Available variables' : 'Variables disponibles'}
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            {[
              '{{nombre}}',
              '{{ultima_compra}}',
              '{{nivel_club}}',
              '{{codigo_promocional}}',
              '{{evento_recomendado}}',
            ].map((variable) => (
              <button
                key={variable}
                type="button"
                onClick={() =>
                  setMessage((current) => ({
                    ...current,
                    body: `${current.body} ${variable}`,
                  }))
                }
                className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-line)] bg-white px-3 py-2 font-mono text-[10px] text-[var(--color-burgundy)]"
              >
                <Plus size={11} />
                {variable}
              </button>
            ))}
          </div>
        </div>
      </section>

      <aside className="rounded-[1.2rem] border border-[var(--color-line)] bg-[var(--color-panel)] p-5 shadow-[var(--shadow-card)]">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--color-gold)]">
              {isEnglish ? 'Preview' : 'Vista previa'}
            </p>

            <h3
              className="mt-2 text-[1.35rem] text-[var(--color-ink)]"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {isEnglish ? 'How the customer will see it' : 'Cómo lo verá el cliente'}
            </h3>
          </div>

          <Eye size={18} className="text-[var(--color-burgundy)]" />
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2 rounded-xl bg-[var(--color-panel-strong)] p-1">
          {[
            ['email', isEnglish ? 'Email' : 'Correo'],
            ['push', 'Push'],
            ['inApp', isEnglish ? 'In app' : 'En app'],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setPreviewTab(key as PreviewTab)}
              className={`rounded-lg px-3 py-2 text-[10px] font-semibold ${
                previewTab === key
                  ? 'bg-white text-[var(--color-burgundy)] shadow-sm'
                  : 'text-[var(--color-muted)]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-5">
          {previewTab === 'email' ? (
            <div className="overflow-hidden rounded-[1rem] border border-[var(--color-line)] bg-white shadow-sm">
              <div className="border-b border-[var(--color-line)] px-4 py-3">
                <p className="text-[10px] text-[var(--color-muted)]">
                  {isEnglish ? 'Subject' : 'Asunto'}
                </p>

                <p className="mt-1 text-xs font-semibold text-[var(--color-ink)]">
                  {message.subject}
                </p>
              </div>

              <img
                src="/romantic dinners evento.webp"
                alt="Promoción"
                className="h-44 w-full object-cover"
              />

              <div className="p-5">
                <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[var(--color-gold)]">
                  {promotion.product}
                </p>

                <h4
                  className="mt-2 text-[1.6rem] leading-tight text-[var(--color-burgundy)]"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  {message.title}
                </h4>

                <p className="mt-4 text-xs leading-6 text-[var(--color-muted-strong)]">
                  {message.body}
                </p>

                <button
                  type="button"
                  className="mt-5 rounded-xl bg-[var(--color-burgundy)] px-4 py-3 text-xs font-semibold"
                  style={{ color: '#ffffff' }}
                >
                  {message.button}
                </button>

                <p className="mt-5 text-[10px] text-[var(--color-muted)]">
                  {message.signature}
                </p>
              </div>
            </div>
          ) : null}

          {previewTab === 'push' ? (
            <div className="rounded-[1.4rem] bg-[#eee8df] p-5">
              <div className="rounded-[1rem] bg-white p-4 shadow-[0_16px_34px_rgba(45,22,14,0.12)]">
                <div className="flex items-start gap-3">
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-burgundy)] text-white">
                    <Bell size={18} />
                  </span>

                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[var(--color-ink)]">
                      Hacienda de Letras
                    </p>

                    <p className="mt-1 text-[11px] font-semibold text-[var(--color-ink)]">
                      {message.title}
                    </p>

                    <p className="mt-1 text-[10px] leading-5 text-[var(--color-muted)]">
                      {message.preheader}
                    </p>
                  </div>

                  <span className="text-[9px] text-[var(--color-muted)]">
                    {isEnglish ? 'now' : 'ahora'}
                  </span>
                </div>
              </div>
            </div>
          ) : null}

          {previewTab === 'inApp' ? (
            <div className="overflow-hidden rounded-[1.2rem] border border-[var(--color-line)] bg-white">
              <img
                src="/romantic dinners evento.webp"
                alt="Mensaje dentro de la app"
                className="h-48 w-full object-cover"
              />

              <div className="p-5">
                <span className="rounded-full bg-[#f4e7d9] px-3 py-1.5 text-[8px] font-semibold uppercase tracking-[0.12em] text-[var(--color-burgundy)]">
                  {isEnglish ? 'Exclusive benefit' : 'Beneficio exclusivo'}
                </span>

                <h4
                  className="mt-4 text-[1.55rem] leading-tight text-[var(--color-burgundy)]"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  {message.title}
                </h4>

                <p className="mt-3 text-xs leading-6 text-[var(--color-muted-strong)]">
                  {message.body}
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </aside>
    </div>
  )

  const renderChannelsStep = () => (
    <div className="grid gap-5 2xl:grid-cols-[minmax(0,1.1fr)_minmax(340px,0.9fr)]">
      <section className="rounded-[1.2rem] border border-[var(--color-line)] bg-[var(--color-panel)] p-5 shadow-[var(--shadow-card)]">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-gold)]">
          {isEnglish ? 'Distribution' : 'Distribución'}
        </p>

        <h3
          className="mt-2 text-[1.55rem] text-[var(--color-ink)]"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {isEnglish ? 'Choose channels' : 'Elige los canales'}
        </h3>

        <div className="mt-6 grid gap-3 md:grid-cols-2">
          <ChannelToggle
            icon={Mail}
            title={isEnglish ? 'Email' : 'Correo electrónico'}
            description={`${formatNumber(emailAvailable)} ${isEnglish ? 'available recipients' : 'destinatarios disponibles'}`}
            enabled={channels.email}
            onToggle={() =>
              setChannels((current) => ({
                ...current,
                email: !current.email,
              }))
            }
          />

          <ChannelToggle
            icon={Bell}
            title={isEnglish ? 'Push notification' : 'Notificación push'}
            description={`${formatNumber(pushAvailable)} ${isEnglish ? 'active devices' : 'dispositivos activos'}`}
            enabled={channels.push}
            onToggle={() =>
              setChannels((current) => ({
                ...current,
                push: !current.push,
              }))
            }
          />

          <ChannelToggle
            icon={MessageSquareText}
            title={isEnglish ? 'Notification center' : 'Centro de notificaciones'}
            description={isEnglish ? 'Persistent message within the app.' : 'Mensaje persistente dentro de la app.'}
            enabled={channels.inApp}
            onToggle={() =>
              setChannels((current) => ({
                ...current,
                inApp: !current.inApp,
              }))
            }
          />

          <ChannelToggle
            icon={Smartphone}
            title={isEnglish ? 'In-app banner' : 'Banner dentro de la app'}
            description={isEnglish ? 'Promotion visible on the app home screen.' : 'Promoción visible en el inicio de la app.'}
            enabled={channels.banner}
            onToggle={() =>
              setChannels((current) => ({
                ...current,
                banner: !current.banner,
              }))
            }
          />
        </div>
      </section>

      <aside className="rounded-[1.2rem] border border-[var(--color-line)] bg-[var(--color-panel)] p-5 shadow-[var(--shadow-card)]">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-gold)]">
          {isEnglish ? 'Scheduling' : 'Programación'}
        </p>

        <h3
          className="mt-2 text-[1.45rem] text-[var(--color-ink)]"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {isEnglish ? 'When should it go out' : 'Cuándo debe salir'}
        </h3>

        <div className="mt-5 grid grid-cols-2 gap-3">
          {[
            ['now', isEnglish ? 'Send now' : 'Enviar ahora'],
            ['schedule', isEnglish ? 'Schedule' : 'Programar'],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() =>
                setDelivery((current) => ({
                  ...current,
                  mode: value,
                }))
              }
              className="rounded-xl border px-4 py-3 text-xs font-semibold"
              style={{
                borderColor:
                  delivery.mode === value
                    ? 'var(--color-burgundy)'
                    : 'var(--color-line)',
                backgroundColor:
                  delivery.mode === value
                    ? 'rgba(104,17,38,0.055)'
                    : 'var(--color-panel-strong)',
                color:
                  delivery.mode === value
                    ? 'var(--color-burgundy)'
                    : 'var(--color-muted-strong)',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {delivery.mode === 'schedule' ? (
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Field
              label={isEnglish ? 'Date' : 'Fecha'}
              type="date"
              value={delivery.date}
              onChange={(value) =>
                setDelivery((current) => ({
                  ...current,
                  date: value,
                }))
              }
            />

            <Field
              label={isEnglish ? 'Time' : 'Hora'}
              type="time"
              value={delivery.time}
              onChange={(value) =>
                setDelivery((current) => ({
                  ...current,
                  time: value,
                }))
              }
            />
          </div>
        ) : null}

        <div className="mt-5 space-y-3">
          {[
            {
              key: 'quietHours',
              label: isEnglish ? 'Respect quiet hours' : 'Respetar horario silencioso',
            },
            {
              key: 'frequencyLimit',
              label: isEnglish ? 'Limit contact frequency' : 'Limitar frecuencia de contacto',
            },
            {
              key: 'stopAtCapacity',
              label: isEnglish ? 'Stop campaign when capacity is reached' : 'Detener campaña al completar cupo',
            },
          ].map((item) => {
            const key = item.key as
              | 'quietHours'
              | 'frequencyLimit'
              | 'stopAtCapacity'
            const enabled = delivery[key]

            return (
              <button
                key={item.key}
                type="button"
                onClick={() =>
                  setDelivery((current) => ({
                    ...current,
                    [key]: !current[key],
                  }))
                }
                className="flex w-full items-center justify-between gap-4 rounded-xl bg-[var(--color-panel-strong)] px-4 py-3 text-left"
              >
                <span className="text-xs font-semibold text-[var(--color-ink)]">
                  {item.label}
                </span>

                <span
                  className={`inline-flex h-6 w-6 items-center justify-center rounded-md ${
                    enabled
                      ? 'bg-[var(--color-burgundy)] text-white'
                      : 'bg-white text-transparent'
                  }`}
                >
                  <Check size={13} />
                </span>
              </button>
            )
          })}
        </div>
      </aside>
    </div>
  )

  const renderReviewStep = () => (
    <div className="grid gap-5 2xl:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)]">
      <section className="rounded-[1.2rem] border border-[var(--color-line)] bg-[var(--color-panel)] p-5 shadow-[var(--shadow-card)]">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-gold)]">
          {isEnglish ? 'Final summary' : 'Resumen final'}
        </p>

        <h3
          className="mt-2 text-[1.55rem] text-[var(--color-ink)]"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {isEnglish ? 'Review before sending' : 'Revisa antes de enviar'}
        </h3>

        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {[
            [isEnglish ? 'Campaign' : 'Campaña', message.internalName],
            [isEnglish ? 'Objective' : 'Objetivo', promotion.objective],
            [isEnglish ? 'Audience' : 'Audiencia', `${formatNumber(audienceEstimate)} ${isEnglish ? 'customers' : 'clientes'}`],
            [isEnglish ? 'Promotion' : 'Promoción', `${promotion.discount}% ${isEnglish ? 'on' : 'en'} ${promotion.product}`],
            [isEnglish ? 'Email' : 'Correo', `${formatNumber(emailAvailable)} ${isEnglish ? 'recipients' : 'destinatarios'}`],
            ['Push', `${formatNumber(pushAvailable)} ${isEnglish ? 'devices' : 'dispositivos'}`],
            [isEnglish ? 'Validity' : 'Vigencia', `${promotion.startDate} ${isEnglish ? 'to' : 'al'} ${promotion.endDate}`],
            [
              isEnglish ? 'Delivery' : 'Envío',
              delivery.mode === 'now'
                ? (isEnglish ? 'Immediate' : 'Inmediato')
                : `${delivery.date} · ${delivery.time}`,
            ],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-[1rem] bg-[var(--color-panel-strong)] p-4"
            >
              <p className="text-[9px] font-semibold uppercase tracking-[0.11em] text-[var(--color-muted)]">
                {label}
              </p>

              <p className="mt-2 text-sm font-semibold text-[var(--color-ink)]">
                {value}
              </p>
            </div>
          ))}
        </div>
      </section>

      <aside className="space-y-4">
        <section className="rounded-[1.2rem] border border-[var(--color-line)] bg-[var(--color-panel)] p-5 shadow-[var(--shadow-card)]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--color-gold)]">
            {isEnglish ? 'Validations' : 'Validaciones'}
          </p>

          <div className="mt-5 space-y-3">
            {[
              [isEnglish ? 'Consent validated' : 'Consentimiento validado', true],
              [isEnglish ? 'Duplicates removed' : 'Duplicados eliminados', true],
              [isEnglish ? 'Links verified' : 'Enlaces verificados', true],
              [isEnglish ? 'Capacity available' : 'Cupo disponible', true],
              [`${excluded} ${isEnglish ? 'customers excluded' : 'clientes excluidos'}`, false],
            ].map(([label, ok]) => (
              <div
                key={String(label)}
                className="flex items-center gap-3 rounded-xl bg-[var(--color-panel-strong)] px-4 py-3"
              >
                <span
                  className={`inline-flex h-7 w-7 items-center justify-center rounded-full ${
                    ok
                      ? 'bg-[#e7efe6] text-[#5f7d63]'
                      : 'bg-[#f8eadc] text-[#aa6b2e]'
                  }`}
                >
                  {ok ? <Check size={14} /> : <CircleAlert size={14} />}
                </span>

                <span className="text-xs font-semibold text-[var(--color-ink)]">
                  {label}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[1.2rem] border border-[var(--color-line)] bg-[var(--color-panel)] p-5 shadow-[var(--shadow-card)]">
          <div className="grid gap-3">
            <button
              type="button"
              className="min-h-11 rounded-xl border border-[var(--color-line)] bg-[var(--color-panel-strong)] px-4 text-sm font-semibold text-[var(--color-ink)]"
            >
              {isEnglish ? 'Save draft' : 'Guardar borrador'}
            </button>

            <button
              type="button"
              className="min-h-11 rounded-xl border border-[var(--color-line)] bg-[var(--color-panel-strong)] px-4 text-sm font-semibold text-[var(--color-burgundy)]"
            >
              {isEnglish ? 'Send test' : 'Enviar prueba'}
            </button>

            <button
              type="button"
              onClick={launchCampaign}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[var(--color-burgundy)] px-5 text-sm font-semibold shadow-[0_12px_24px_rgba(79,15,31,0.18)]"
              style={{ color: '#ffffff' }}
            >
              <Send size={16} color="#ffffff" />
              {delivery.mode === 'now'
                ? (isEnglish ? 'Send now' : 'Enviar ahora')
                : (isEnglish ? 'Schedule campaign' : 'Programar campaña')}
            </button>
          </div>
        </section>
      </aside>
    </div>
  )

  const renderCurrentStep = () => {
    if (currentStep === 'audience') {
      return renderAudienceStep()
    }

    if (currentStep === 'promotion') {
      return renderPromotionStep()
    }

    if (currentStep === 'message') {
      return renderMessageStep()
    }

    if (currentStep === 'channels') {
      return renderChannelsStep()
    }

    return renderReviewStep()
  }

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <SectionTitle
          eyebrow={isEnglish ? 'Commercial activation' : 'Activación comercial'}
          title={isEnglish ? 'Campaign Center' : 'Centro de Campañas'}
          subtitle={isEnglish ? 'Segment customers, create promotions, and distribute communications via email and app notifications.' : 'Segmenta clientes, crea promociones y distribuye comunicaciones por correo y notificaciones de la app.'}
        />

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--color-line)] bg-[var(--color-panel)] px-4 text-sm font-semibold text-[var(--color-ink)] shadow-sm"
          >
            <Clock3 size={16} />
            {isEnglish ? 'History' : 'Historial'}
          </button>

          <button
            type="button"
            onClick={() => {
              setCurrentStep('audience')
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--color-burgundy)] px-5 text-sm font-semibold shadow-[0_12px_25px_rgba(79,15,31,0.18)]"
            style={{ color: '#ffffff' }}
          >
            <Plus size={16} color="#ffffff" />
            {isEnglish ? 'New campaign' : 'Nueva campaña'}
          </button>
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: isEnglish ? 'Available customers' : 'Clientes disponibles',
            value: '1,248',
            note: isEnglish ? 'With active consent' : 'Con consentimiento vigente',
            icon: Users,
          },
          {
            label: isEnglish ? 'Active push' : 'Push activo',
            value: '864',
            note: isEnglish ? 'Devices with notifications' : 'Dispositivos con notificaciones',
            icon: Bell,
          },
          {
            label: isEnglish ? 'Average open rate' : 'Apertura promedio',
            value: '42.8%',
            note: isEnglish ? 'Last 90 days' : 'Últimos 90 días',
            icon: Eye,
          },
          {
            label: isEnglish ? 'Attributed conversion' : 'Conversión atribuida',
            value: '7.4%',
            note: isEnglish ? 'From contact to purchase' : 'De contacto a compra',
            icon: Target,
          },
        ].map((item) => {
          const Icon = item.icon

          return (
            <article
              key={item.label}
              className="relative overflow-hidden rounded-[1.1rem] border border-[var(--color-line)] bg-[var(--color-panel)] p-5 shadow-[var(--shadow-card)]"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs text-[var(--color-muted)]">
                    {item.label}
                  </p>

                  <p
                    className="mt-3 text-[1.9rem] leading-none text-[var(--color-ink)]"
                    style={{
                      fontFamily:
                        'var(--font-display)',
                    }}
                  >
                    {item.value}
                  </p>
                </div>

                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-soft)] text-[var(--color-burgundy)]">
                  <Icon size={18} />
                </span>
              </div>

              <p className="mt-4 text-[11px] text-[var(--color-muted)]">
                {item.note}
              </p>
            </article>
          )
        })}
      </section>

      <section className="rounded-[1.2rem] border border-[var(--color-line)] bg-[var(--color-panel)] p-4 shadow-[var(--shadow-card)]">
        <div className="grid gap-3 md:grid-cols-5">
          {steps.map((step, index) => {
            const active = currentStep === step.key
            const completed = index < activeStepIndex

            return (
              <button
                key={step.key}
                type="button"
                onClick={() => setCurrentStep(step.key)}
                className="flex items-center gap-3 rounded-xl px-3 py-3 text-left transition"
                style={{
                  backgroundColor: active
                    ? 'rgba(104,17,38,0.055)'
                    : 'transparent',
                }}
              >
                <span
                  className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    active || completed
                      ? 'bg-[var(--color-burgundy)] text-white'
                      : 'bg-[var(--color-soft)] text-[var(--color-muted)]'
                  }`}
                >
                  {completed ? <Check size={14} /> : index + 1}
                </span>

                <span
                  className={`text-xs font-semibold ${
                    active
                      ? 'text-[var(--color-burgundy)]'
                      : 'text-[var(--color-muted-strong)]'
                  }`}
                >
                  {step.label}
                </span>
              </button>
            )
          })}
        </div>
      </section>

      {renderCurrentStep()}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        <button
          type="button"
          onClick={goPrevious}
          disabled={activeStepIndex === 0}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--color-line)] bg-[var(--color-panel)] px-5 text-sm font-semibold text-[var(--color-muted-strong)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft size={16} />
          {isEnglish ? 'Back' : 'Anterior'}
        </button>

        {activeStepIndex < steps.length - 1 ? (
          <button
            type="button"
            onClick={goNext}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--color-burgundy)] px-5 text-sm font-semibold"
            style={{ color: '#ffffff' }}
          >
            {isEnglish ? 'Continue' : 'Continuar'}
            <ChevronRight size={16} color="#ffffff" />
          </button>
        ) : null}
      </div>

      <section className="rounded-[1.15rem] border border-[rgba(180,138,85,0.25)] bg-[#fbf6ee] p-5">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-[var(--color-burgundy)] shadow-sm">
              <Sparkles size={19} />
            </span>

            <div>
              <p className="text-sm font-semibold text-[var(--color-ink)]">
                {isEnglish ? 'ALQIA detected an opportunity' : 'ALQIA detectó una oportunidad'}
              </p>

              <p className="mt-2 max-w-4xl text-xs leading-6 text-[var(--color-muted-strong)]">
                {isEnglish
                  ? '214 customers purchased wine in the last six months but never booked an experience. A tasting campaign with an exclusive benefit could generate between 18 and 27 reservations.'
                  : '214 clientes compraron vino durante los últimos seis meses, pero nunca reservaron una experiencia. Una campaña de cata con beneficio exclusivo podría generar entre 18 y 27 reservaciones.'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setSelectedSegment('wine')
                setCurrentStep('audience')
              }}
              className="rounded-xl border border-[var(--color-line)] bg-white px-4 py-3 text-xs font-semibold text-[var(--color-ink)]"
            >
              {isEnglish ? 'Create segment' : 'Crear segmento'}
            </button>

            <button
              type="button"
              onClick={() => setCurrentStep('promotion')}
              className="rounded-xl bg-[var(--color-burgundy)] px-4 py-3 text-xs font-semibold"
              style={{ color: '#ffffff' }}
            >
              {isEnglish ? 'Prepare campaign' : 'Preparar campaña'}
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-[1.2rem] border border-[var(--color-line)] bg-[var(--color-panel)] p-5 shadow-[var(--shadow-card)]">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--color-gold)]">
              {isEnglish ? 'History' : 'Historial'}
            </p>

            <h3
              className="mt-2 text-[1.45rem] text-[var(--color-ink)]"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {isEnglish ? 'Recent campaigns' : 'Campañas recientes'}
            </h3>
          </div>

          <label className="flex min-h-11 min-w-0 items-center gap-3 rounded-xl border border-[var(--color-line)] bg-[var(--color-panel-strong)] px-4 xl:w-[360px]">
            <Search size={15} className="text-[var(--color-muted)]" />

            <input
              type="search"
              value={historySearch}
              onChange={(event) =>
                setHistorySearch(event.target.value)
              }
              placeholder={isEnglish ? 'Search campaign...' : 'Buscar campaña...'}
              className="min-w-0 flex-1 bg-transparent text-sm text-[var(--color-ink)] outline-none"
            />
          </label>
        </div>

        <div className="mt-5 overflow-hidden rounded-[1rem] border border-[var(--color-line)]">
          <div className="hidden grid-cols-[minmax(190px,1.2fr)_minmax(150px,1fr)_130px_90px_100px_120px_100px] gap-4 bg-[var(--color-soft)] px-5 py-3 text-[9px] font-semibold uppercase tracking-[0.11em] text-[var(--color-muted)] xl:grid">
            <span>{isEnglish ? 'Campaign' : 'Campaña'}</span>
            <span>{isEnglish ? 'Segment' : 'Segmento'}</span>
            <span>{isEnglish ? 'Channels' : 'Canales'}</span>
            <span>{isEnglish ? 'Sent' : 'Enviados'}</span>
            <span>{isEnglish ? 'Open rate' : 'Apertura'}</span>
            <span>{isEnglish ? 'Revenue' : 'Ingresos'}</span>
            <span>{isEnglish ? 'Status' : 'Estado'}</span>
          </div>

          <div className="divide-y divide-[var(--color-line)]">
            {filteredHistory.map((campaign) => (
              <article
                key={campaign.id}
                className="grid gap-3 bg-[var(--color-panel)] px-5 py-4 xl:grid-cols-[minmax(190px,1.2fr)_minmax(150px,1fr)_130px_90px_100px_120px_100px] xl:items-center"
              >
                <div>
                  <p className="text-sm font-semibold text-[var(--color-ink)]">
                    {campaign.name}
                  </p>

                  <p className="mt-1 text-[10px] text-[var(--color-muted)]">
                    {isEnglish ? 'Conversion' : 'Conversión'} {campaign.conversion}%
                  </p>
                </div>

                <p className="text-xs text-[var(--color-muted-strong)]">
                  {campaign.segment}
                </p>

                <p className="text-xs text-[var(--color-muted)]">
                  {campaign.channels}
                </p>

                <p className="text-sm font-semibold text-[var(--color-ink)]">
                  {formatNumber(campaign.sent)}
                </p>

                <p className="text-sm font-semibold text-[var(--color-ink)]">
                  {campaign.openRate}%
                </p>

                <p className="text-sm font-bold text-[var(--color-ink)]">
                  {formatCurrency(campaign.revenue)}
                </p>

                <StatusPill status={campaign.status} />
              </article>
            ))}
          </div>
        </div>
      </section>

      {showSuccess ? (
        <div className="fixed bottom-6 right-6 z-[120] flex max-w-sm items-start gap-3 rounded-[1rem] border border-[#cfddca] bg-white p-4 shadow-[0_22px_50px_rgba(45,22,14,0.18)]">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#e7efe6] text-[#5f7d63]">
            <Check size={16} />
          </span>

          <div>
            <p className="text-sm font-semibold text-[var(--color-ink)]">
              {isEnglish ? 'Campaign scheduled' : 'Campaña programada'}
            </p>

            <p className="mt-1 text-[11px] leading-5 text-[var(--color-muted)]">
              {isEnglish
                ? 'The send is ready for email, push, and app notifications.'
                : 'El envío quedó listo para correo, push y notificaciones de la app.'}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowSuccess(false)}
            className="ml-auto text-[var(--color-muted)]"
          >
            <X size={15} />
          </button>
        </div>
      ) : null}
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
        {label}
      </span>

      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-12 w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-panel-strong)] px-4 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-gold)]"
      />
    </label>
  )
}
