import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import QRCode from 'qrcode'
import { CalendarDays, Check, ChevronDown, Clock3, Download, Lightbulb, Minus, Plus, QrCode, RefreshCw, Share2, Ticket, Users, X } from 'lucide-react'
import { PrimaryButton, SectionHeading } from '../../components/mobile/PremiumMobileUi'
import { AppSelect } from '../../components/mobile/AppSelect'
import { useAppPreferences } from '../../context/AppPreferencesContext'
import { usePublicContent } from '../../hooks/usePublicContent'
import { contentRouteId, formatCurrency, imageField, numberField, textField } from '../../utils/publicContent'
import { useAuth } from '../../../contexts/AuthContext'
import { customerClient, type CustomerAccessPass, type CustomerAvailabilitySlot, type CustomerReservation } from '../../../services/customer.service'
import { appPath } from '../../utils/appRoutes'
import { downloadAccessCredentialPdf, shareAccessCredential, type AccessCredential } from '../../utils/accessCredentialPdf'
import { acceptedContractMetadata, buildMenuSelection, contractTermsFromMetadata, menuConfigFromMetadata, menuSelectionFromMetadata } from '../../utils/reservationContract'

function normalizeSlot(slot: CustomerAvailabilitySlot) {
  return {
    id: slot.id,
    experienceId: slot.experienceId ?? slot.experience_id ?? '',
    experienceTitle: slot.experienceTitle ?? slot.experience_title ?? 'Experiencia',
    experienceSlug: slot.experienceSlug ?? slot.experience_slug ?? '',
    location: slot.location ?? null,
    durationMinutes: slot.durationMinutes ?? slot.duration_minutes ?? null,
    coverImageUrl: slot.coverImageUrl ?? slot.cover_image_url ?? null,
    startAt: slot.startAt ?? slot.start_at ?? '',
    endAt: slot.endAt ?? slot.end_at ?? '',
    available: Number(slot.available ?? 0),
    price: Number(slot.price ?? 0),
    isBookable: Boolean(slot.isBookable ?? slot.is_bookable ?? true),
  }
}

function formatDateTime(value: string | null | undefined, locale: string, fallback: string) {
  if (!value) return fallback
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return fallback
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function reservationSchedule(reservation: CustomerReservation, locale: string, fallback: string) {
  if (reservation.reservationType === 'restaurant' && reservation.reservationDate) {
    const date = new Date(`${reservation.reservationDate}T12:00:00`)
    if (!Number.isNaN(date.getTime())) {
      const formatted = new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(date)
      return reservation.reservationTime ? `${formatted} · ${reservation.reservationTime.slice(0, 5)}` : formatted
    }
  }
  if (reservation.reservationType === 'cabin' && reservation.checkIn) {
    const start = new Date(`${reservation.checkIn}T12:00:00`)
    const end = reservation.checkOut ? new Date(`${reservation.checkOut}T12:00:00`) : null
    if (!Number.isNaN(start.getTime())) {
      const formatter = new Intl.DateTimeFormat(locale, { dateStyle: 'medium' })
      return end && !Number.isNaN(end.getTime())
        ? `${formatter.format(start)} – ${formatter.format(end)}`
        : formatter.format(start)
    }
  }
  return formatDateTime(reservation.startAt, locale, fallback)
}

function makeIdempotencyKey(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

function isTicketAccessPass(pass: CustomerAccessPass) {
  return (pass.accessType === 'event_ticket' && Boolean(pass.eventTicketTypeId)) || pass.accessType === 'experience'
}

type ChoiceOption = {
  value: string
  label: string
}

type RomanticSignSelection = {
  required: boolean
  label: string
  message: string
  price: number
  currency: 'MXN'
}

type MainCourseSelection = {
  required: boolean
  label: string
  option: string
  value: string
}

const ROMANTIC_SIGN_PRICE = 500
const ROMANTIC_SIGN_LABEL = 'Letrero luminoso'
const ROMANTIC_SIGN_OPTIONS = [
  'Te quieres casar conmigo',
  'Quieres ser mi novia',
]
const MAIN_COURSE_LABEL = 'Plato fuerte'
const MAIN_COURSE_OPTIONS: ChoiceOption[] = [
  { value: 'filete-res', label: 'Filete de res' },
  { value: 'pechuga-rellena', label: 'Pechuga rellena' },
  { value: 'pasta-cremosa', label: 'Pasta cremosa' },
  { value: 'opcion-vegetariana', label: 'Opción vegetariana' },
]
const ROMANTIC_SERVICE_NOTICE_HOURS = 5

function objectRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function normalizeText(value: unknown) {
  return String(value ?? '')
    .toLocaleLowerCase('es-MX')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function romanticSignConfig(record: Record<string, unknown> | null | undefined) {
  const metadata = objectRecord(record?.metadata)
  const config = objectRecord(metadata.romanticSign)
  const descriptor = normalizeText(`${record?.slug ?? ''} ${record?.title ?? ''}`)
  const isPicnic = descriptor.includes('picnic')
  const isRomanticService = descriptor.includes('cena romantica') || isPicnic
  const enabled = config.enabled === true
    || metadata.romanticDinner === true
    || metadata.romanticService === true
    || record?.slug === 'cena-romantica-cava'
    || isRomanticService
  if (!enabled) return null

  const price = Number(config.price)
  const rawOptions = Array.isArray(config.options) ? config.options : []
  const options = rawOptions
    .map((option) => typeof option === 'string' ? option : String(objectRecord(option).label ?? ''))
    .filter(Boolean)

  return {
    label: String(config.label ?? ROMANTIC_SIGN_LABEL),
    price: Number.isFinite(price) && price >= 0 ? price : ROMANTIC_SIGN_PRICE,
    currency: 'MXN' as const,
    options: options.length > 0 ? options : ROMANTIC_SIGN_OPTIONS,
    serviceLabel: String(config.serviceLabel ?? (isPicnic ? 'Picnic' : 'Cena romántica')),
  }
}

function mainCourseConfig(record: Record<string, unknown> | null | undefined) {
  const metadata = objectRecord(record?.metadata)
  const config = objectRecord(metadata.mainCourse)
  const signConfig = romanticSignConfig(record)
  const menuConfig = objectRecord(metadata.menuConfig)
  const menuOptions = Array.isArray(menuConfig.options) ? menuConfig.options : []
  const hasStructuredMenu = menuConfig.enabled === true || menuOptions.length > 0
  const descriptor = normalizeText(`${record?.slug ?? ''} ${record?.title ?? ''}`)
  const isPicnic = descriptor.includes('picnic')
  const enabled = config.enabled === true
    || metadata.mainCourseRequired === true
    || (Boolean(signConfig) && !hasStructuredMenu)
  if (!enabled) return null

  const rawOptions = Array.isArray(config.options) ? config.options : []
  const options = rawOptions
    .map((option) => {
      if (typeof option === 'string') return { value: normalizeText(option).replace(/\s+/g, '-'), label: option }
      const recordOption = objectRecord(option)
      const label = String(recordOption.label ?? recordOption.name ?? '').trim()
      if (!label) return null
      return {
        value: String(recordOption.value ?? normalizeText(label).replace(/\s+/g, '-')),
        label,
      }
    })
    .filter((option): option is ChoiceOption => Boolean(option))
  const noticeHours = Number(config.noticeHours ?? metadata.minimumNoticeHours)

  return {
    label: String(config.label ?? MAIN_COURSE_LABEL),
    options: options.length > 0 ? options : MAIN_COURSE_OPTIONS,
    noticeHours: Number.isFinite(noticeHours) && noticeHours > 0 ? noticeHours : ROMANTIC_SERVICE_NOTICE_HOURS,
    serviceLabel: String(config.serviceLabel ?? signConfig?.serviceLabel ?? (isPicnic ? 'Picnic' : 'Cena romántica')),
  }
}

function romanticSignFromMetadata(metadata: Record<string, unknown> | null | undefined): RomanticSignSelection | null {
  const sign = objectRecord(metadata?.romanticSign)
  if (sign.required !== true) return null
  const price = Number(sign.price)
  const message = String(sign.message ?? '').trim()
  if (!message) return null
  return {
    required: true,
    label: String(sign.label ?? ROMANTIC_SIGN_LABEL),
    message,
    price: Number.isFinite(price) && price >= 0 ? price : ROMANTIC_SIGN_PRICE,
    currency: 'MXN',
  }
}

function mainCourseFromMetadata(metadata: Record<string, unknown> | null | undefined): MainCourseSelection | null {
  const course = objectRecord(metadata?.mainCourse)
  if (course.required !== true) return null
  const option = String(course.option ?? '').trim()
  const value = String(course.value ?? '').trim()
  if (!option) return null
  return {
    required: true,
    label: String(course.label ?? MAIN_COURSE_LABEL),
    option,
    value,
  }
}

function MobileChoiceSheet({
  title,
  options,
  selectedValue,
  onSelect,
  onClose,
}: {
  title: string
  options: ChoiceOption[]
  selectedValue: string
  onSelect: (value: string) => void
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-[160] flex items-end bg-[rgba(45,24,17,0.34)] px-3 pb-[calc(env(safe-area-inset-bottom)+118px)] pt-[calc(env(safe-area-inset-top)+12px)] backdrop-blur-md" role="dialog" aria-modal="true">
      <section className="max-h-[calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-142px)] w-full overflow-hidden rounded-[2rem] border border-[rgba(255,255,255,0.6)] bg-[rgba(255,249,241,0.94)] shadow-[0_28px_80px_rgba(45,24,17,0.32)] backdrop-blur-2xl">
        <header className="flex items-center justify-between gap-3 border-b border-[rgba(184,138,74,0.18)] px-5 py-4">
          <h3 className="text-[13px] font-semibold uppercase tracking-[0.16em] text-[var(--color-gold)]">{title}</h3>
          <button type="button" onClick={onClose} className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/72 text-[var(--color-ink)]" aria-label="Cerrar">
            <X size={16} />
          </button>
        </header>
        <div className="app-scrollbar-none max-h-[calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-220px)] overflow-y-auto p-3">
          {options.map((option) => {
            const active = option.value === selectedValue
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onSelect(option.value)
                  onClose()
                }}
                className={`mb-2 flex min-h-[56px] w-full items-center justify-between gap-3 rounded-[1.15rem] px-4 text-left text-[15px] transition ${active ? 'bg-[var(--color-burgundy)] text-white shadow-[0_16px_34px_rgba(104,13,36,0.22)]' : 'bg-white/66 text-[var(--color-ink)] shadow-[inset_0_0_0_1px_rgba(184,138,74,0.16)]'}`}
              >
                <span className="min-w-0 break-words">{option.label}</span>
                {active ? <Check size={18} className="shrink-0" /> : null}
              </button>
            )
          })}
        </div>
      </section>
    </div>
  )
}

function AccessQr({ payload, alt }: { payload: string; alt: string }) {
  const [source, setSource] = useState('')

  useEffect(() => {
    let active = true
    QRCode.toDataURL(payload, {
      errorCorrectionLevel: 'M',
      margin: 4,
      width: 260,
      color: {
        dark: '#252F37',
        light: '#F7F2EA',
      },
    }).then((nextSource) => {
      if (active) setSource(nextSource)
    }).catch(() => {
      if (active) setSource('')
    })
    return () => {
      active = false
    }
  }, [payload])

  return source ? (
    <img src={source} alt={alt} className="mx-auto aspect-square w-full max-w-[244px] rounded-[1.2rem] border border-[rgba(184,138,74,0.26)] bg-[#fff9f1] p-3" />
  ) : (
    <div className="mx-auto flex aspect-square w-full max-w-[244px] items-center justify-center rounded-[1.2rem] border border-[rgba(184,138,74,0.26)] bg-[#fff9f1] text-[var(--color-burgundy)]">
      <QrCode size={42} strokeWidth={1.5} />
    </div>
  )
}

function ticketStatusLabel(pass: CustomerAccessPass, t: (key: string, fallback?: string) => string) {
  if (pass.usedAt) return t('app.premium.ticket.used', 'Utilizado')
  if (pass.revokedAt) return t('app.premium.ticket.cancelled', 'Cancelado')
  const status = String(pass.status ?? '').toLocaleLowerCase('es-MX')
  if (['published', 'valid', 'confirmed', 'active'].includes(status)) return t('app.premium.ticket.valid', 'Vigente')
  if (['pending', 'reserved'].includes(status)) return t('common.pending', 'Pendiente')
  if (['cancelled', 'canceled', 'revoked'].includes(status)) return t('app.premium.ticket.cancelled', 'Cancelado')
  return pass.status ?? t('common.toBeConfirmed')
}

function TicketSheet({
  pass,
  locale,
  onClose,
  t,
}: {
  pass: CustomerAccessPass
  locale: string
  onClose: () => void
  t: (key: string, fallback?: string) => string
}) {
  const [ticketAction, setTicketAction] = useState<'download' | 'share' | ''>('')
  const [ticketActionMessage, setTicketActionMessage] = useState('')
  const credentialState: AccessCredential['state'] = pass.usedAt ? 'used' : pass.revokedAt ? 'cancelled' : 'valid'
  const credential: AccessCredential = { ...pass, state: credentialState }

  const runTicketAction = async (action: 'download' | 'share') => {
    setTicketAction(action)
    setTicketActionMessage('')
    try {
      if (action === 'download') {
        await downloadAccessCredentialPdf(credential, locale)
        setTicketActionMessage(t('app.premium.ticket.downloadReady', 'PDF generado.'))
      } else {
        const result = await shareAccessCredential(credential, locale)
        setTicketActionMessage(result === 'shared'
          ? t('app.premium.ticket.shared', 'Listo para compartir.')
          : t('app.premium.ticket.downloadReady', 'PDF generado.'))
      }
    } catch {
      setTicketActionMessage(t('app.premium.ticket.actionError', 'No fue posible preparar el boleto en este dispositivo.'))
    } finally {
      setTicketAction('')
    }
  }

  return (
    <div
      className="fixed inset-0 z-[180] flex items-center justify-center overflow-y-auto bg-[rgba(45,24,17,0.46)] px-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      style={{ paddingTop: 'calc(env(safe-area-inset-top) + 18px)', paddingBottom: 'calc(env(safe-area-inset-bottom) + 104px)' }}
    >
      <section className="max-h-[calc(100dvh-132px)] w-full max-w-[28rem] overflow-y-auto overscroll-contain rounded-[1.75rem] border border-[rgba(255,255,255,0.56)] bg-[rgba(255,249,241,0.94)] p-5 shadow-[0_24px_70px_rgba(45,24,17,0.35)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-gold)]">{t('app.premium.ticket.eyebrow', 'Mi boleto')}</p>
            <h3 className="mt-1 text-[25px] font-medium leading-none text-[var(--color-ink)]" style={{ fontFamily: 'var(--font-display)' }}>{pass.title ?? t('app.premium.ticket.access', 'Acceso')}</h3>
          </div>
          <button type="button" onClick={onClose} className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[rgba(45,24,17,0.2)] bg-white/70 text-[var(--color-ink)]" aria-label={t('common.close', 'Cerrar')}>
            <X size={18} />
          </button>
        </div>
        <div className="mt-5">
          <AccessQr payload={pass.qrPayload || pass.qrToken} alt={pass.passNumber ?? t('app.premium.ticket.qrAlt', 'Código QR de acceso')} />
        </div>
        <p className="mt-4 text-center text-[13px] font-semibold text-[var(--color-burgundy)]">{t('app.premium.ticket.present', 'Presenta este código al ingresar')}</p>
        <div className="mt-5 grid gap-2 rounded-[1.2rem] border border-[rgba(184,138,74,0.2)] bg-white/58 p-4 text-[12px] text-[var(--color-muted)]">
          <div className="flex justify-between gap-3"><span>{t('app.premium.ticket.folio', 'Folio')}</span><strong className="text-right text-[var(--color-ink)]">{pass.passNumber ?? pass.reservationNumber ?? pass.orderNumber}</strong></div>
          <div className="flex justify-between gap-3"><span>{t('app.premium.reservation.date')}</span><strong className="text-right text-[var(--color-ink)]">{formatDateTime(pass.startsAt, locale, t('common.toBeConfirmed'))}</strong></div>
          <div className="flex justify-between gap-3"><span>{pass.accessType === 'event_ticket' ? t('app.premium.events.ticket') : t('app.premium.reservation.guests')}</span><strong className="text-right text-[var(--color-ink)]">{pass.ticketTypeName ?? pass.peopleCount ?? t('common.toBeConfirmed')}</strong></div>
          <div className="flex justify-between gap-3"><span>{t('app.premium.ticket.status', 'Estado')}</span><strong className="text-right text-[var(--color-ink)]">{ticketStatusLabel(pass, t)}</strong></div>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <button type="button" disabled={Boolean(ticketAction)} onClick={() => void runTicketAction('download')} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[var(--color-burgundy)] px-4 text-[12px] font-semibold text-[var(--color-burgundy)] disabled:opacity-60">
            <Download size={15} />{ticketAction === 'download' ? t('common.loading', 'Preparando...') : t('app.premium.ticket.download', 'Descargar PDF')}
          </button>
          <button type="button" disabled={Boolean(ticketAction)} onClick={() => void runTicketAction('share')} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[var(--color-burgundy)] px-4 text-[12px] font-semibold text-white disabled:opacity-60">
            <Share2 size={15} />{ticketAction === 'share' ? t('common.loading', 'Preparando...') : t('app.premium.ticket.share', 'Compartir')}
          </button>
        </div>
        {ticketActionMessage ? <p className="mt-3 text-center text-[11px] font-semibold text-[var(--color-muted)]">{ticketActionMessage}</p> : null}
      </section>
    </div>
  )
}

export function ReservationScreen() {
  const { t, locale, language } = useAppPreferences()
  const { session } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const requestedExperienceId = useMemo(() => {
    const stateId = (location.state as { experienceId?: string } | null)?.experienceId
    const params = new URLSearchParams(location.search)
    return stateId || params.get('experienceId') || params.get('experience') || ''
  }, [location.search, location.state])
  const requestedReservationId = useMemo(() => {
    const params = new URLSearchParams(location.search)
    return params.get('reservationId') || params.get('reservation') || ''
  }, [location.search])
  const { records: experiences, loading, error, retry } = usePublicContent('experiences')
  const [selectedExperienceId, setSelectedExperienceId] = useState('')
  const [selectedSlotId, setSelectedSlotId] = useState('')
  const [people, setPeople] = useState(2)
  const [notes, setNotes] = useState('')
  const [slots, setSlots] = useState<ReturnType<typeof normalizeSlot>[]>([])
  const [reservations, setReservations] = useState<CustomerReservation[]>([])
  const [accessPasses, setAccessPasses] = useState<CustomerAccessPass[]>([])
  const [loadingSlots, setLoadingSlots] = useState(true)
  const [loadingReservations, setLoadingReservations] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [operationError, setOperationError] = useState('')
  const [selectedTicket, setSelectedTicket] = useState<CustomerAccessPass | null>(null)
  const [experienceSheetOpen, setExperienceSheetOpen] = useState(false)
  const [appliedRequestedExperienceId, setAppliedRequestedExperienceId] = useState<string | null>(null)
  const [romanticSignRequired, setRomanticSignRequired] = useState(false)
  const [romanticSignMessage, setRomanticSignMessage] = useState(ROMANTIC_SIGN_OPTIONS[0])
  const [mainCourseValue, setMainCourseValue] = useState(MAIN_COURSE_OPTIONS[0].value)
  const [menuValue, setMenuValue] = useState('')
  const [contractAccepted, setContractAccepted] = useState(false)

  const featuredExperience =
    experiences.find((experience) => String(experience.id) === selectedExperienceId)
    ?? experiences.find((experience) => contentRouteId(experience) === requestedExperienceId || experience.id === requestedExperienceId)
    ?? experiences[0]

  useEffect(() => {
    if (featuredExperience && !selectedExperienceId) {
      setSelectedExperienceId(String(featuredExperience.id))
    }
  }, [featuredExperience, selectedExperienceId])

  useEffect(() => {
    if (!requestedExperienceId || requestedExperienceId === appliedRequestedExperienceId || experiences.length === 0) return
    const requested = experiences.find((experience) => contentRouteId(experience) === requestedExperienceId || String(experience.id) === requestedExperienceId)
    if (!requested) {
      setAppliedRequestedExperienceId(requestedExperienceId)
      return
    }
    setSelectedExperienceId(String(requested.id))
    setSelectedSlotId('')
    setMessage('')
    setOperationError('')
    setAppliedRequestedExperienceId(requestedExperienceId)
  }, [appliedRequestedExperienceId, experiences, requestedExperienceId])

  const token = session?.access_token

  const loadSlots = useCallback(async () => {
    if (!token) return
    setLoadingSlots(true)
    setOperationError('')
    try {
      const response = await customerClient.availability(token)
      const nextSlots = response.data.map(normalizeSlot)
      setSlots(nextSlots)
    } catch {
      setSlots([])
      setOperationError(t('app.premium.reservation.availabilityError'))
    } finally {
      setLoadingSlots(false)
    }
  }, [t, token])

  const loadReservations = useCallback(async () => {
    if (!token) return
    setLoadingReservations(true)
    try {
      const [reservationResponse, passResponse] = await Promise.all([
        customerClient.reservations(token, { perPage: 20 }),
        customerClient.accessPasses(token).catch(() => ({ ok: true as const, data: [] as CustomerAccessPass[] })),
      ])
      setReservations(reservationResponse.data)
      setAccessPasses(passResponse.data)
      try {
        localStorage.setItem(`hdl_access_cache_${session?.user.id ?? 'customer'}`, JSON.stringify({
          reservations: reservationResponse.data,
          accessPasses: passResponse.data,
        }))
      } catch {
        // La app sigue funcionando aunque el dispositivo no permita almacenamiento local.
      }
    } catch {
      try {
        const cached = JSON.parse(localStorage.getItem(`hdl_access_cache_${session?.user.id ?? 'customer'}`) ?? 'null') as { reservations?: CustomerReservation[]; accessPasses?: CustomerAccessPass[] } | null
        setReservations(cached?.reservations ?? [])
        setAccessPasses(cached?.accessPasses ?? [])
      } catch {
        setReservations([])
        setAccessPasses([])
      }
    } finally {
      setLoadingReservations(false)
    }
  }, [session?.user.id, token])

  useEffect(() => {
    void loadSlots()
  }, [loadSlots])

  useEffect(() => {
    void loadReservations()
  }, [loadReservations])

  useEffect(() => {
    if (!requestedReservationId || loadingReservations || reservations.length === 0) return
    const handle = window.setTimeout(() => {
      document.getElementById(`reservation-${requestedReservationId}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
    }, 120)
    return () => window.clearTimeout(handle)
  }, [loadingReservations, requestedReservationId, reservations.length])

  const selectedSlot = useMemo(
    () => slots.find((slot) => slot.id === selectedSlotId) ?? null,
    [selectedSlotId, slots],
  )

  const allBookingSlots = useMemo(
    () => slots.filter((slot) => slot.experienceId === selectedExperienceId),
    [selectedExperienceId, slots],
  )

  const activeRomanticSignConfig = useMemo(
    () => romanticSignConfig(featuredExperience as Record<string, unknown> | null | undefined),
    [featuredExperience],
  )

  const activeMainCourseConfig = useMemo(
    () => mainCourseConfig(featuredExperience as Record<string, unknown> | null | undefined),
    [featuredExperience],
  )

  const featuredMetadata = useMemo(
    () => objectRecord((featuredExperience as Record<string, unknown> | null | undefined)?.metadata),
    [featuredExperience],
  )

  const activeContractTerms = useMemo(
    () => contractTermsFromMetadata(featuredMetadata),
    [featuredMetadata],
  )

  const activeMenuConfig = useMemo(
    () => menuConfigFromMetadata(featuredMetadata),
    [featuredMetadata],
  )

  const bookingSlots = useMemo(() => {
    if (!activeMainCourseConfig?.noticeHours) return allBookingSlots
    const minimumStart = Date.now() + activeMainCourseConfig.noticeHours * 60 * 60 * 1000
    return allBookingSlots.filter((slot) => {
      const start = new Date(slot.startAt).getTime()
      return Number.isNaN(start) || start >= minimumStart
    })
  }, [activeMainCourseConfig?.noticeHours, allBookingSlots])

  const blockedByNotice = allBookingSlots.length > 0 && bookingSlots.length === 0

  useEffect(() => {
    if (!activeRomanticSignConfig) {
      setRomanticSignRequired(false)
      setRomanticSignMessage(ROMANTIC_SIGN_OPTIONS[0])
      return
    }
    setRomanticSignMessage((current) => activeRomanticSignConfig.options.includes(current)
      ? current
      : activeRomanticSignConfig.options[0] ?? ROMANTIC_SIGN_OPTIONS[0])
  }, [activeRomanticSignConfig])

  useEffect(() => {
    setRomanticSignRequired(false)
    setContractAccepted(false)
    setMenuValue('')
  }, [selectedExperienceId])

  useEffect(() => {
    if (!activeMainCourseConfig) {
      setMainCourseValue(MAIN_COURSE_OPTIONS[0].value)
      return
    }
    setMainCourseValue((current) => activeMainCourseConfig.options.some((option) => option.value === current)
      ? current
      : activeMainCourseConfig.options[0]?.value ?? MAIN_COURSE_OPTIONS[0].value)
  }, [activeMainCourseConfig])

  useEffect(() => {
    if (!activeMenuConfig) {
      setMenuValue('')
      return
    }
    setMenuValue((current) => activeMenuConfig.options.some((option) => option.value === current)
      ? current
      : activeMenuConfig.required ? activeMenuConfig.options[0]?.value ?? '' : '')
  }, [activeMenuConfig])

  const romanticSignSelection = useMemo<RomanticSignSelection | null>(() => {
    if (!activeRomanticSignConfig || !romanticSignRequired) return null
    return {
      required: true,
      label: activeRomanticSignConfig.label,
      message: romanticSignMessage,
      price: activeRomanticSignConfig.price,
      currency: activeRomanticSignConfig.currency,
    }
  }, [activeRomanticSignConfig, romanticSignMessage, romanticSignRequired])

  const romanticSignTotal = romanticSignSelection ? romanticSignSelection.price : 0

  const mainCourseSelection = useMemo<MainCourseSelection | null>(() => {
    if (!activeMainCourseConfig) return null
    const selectedCourse = activeMainCourseConfig.options.find((option) => option.value === mainCourseValue)
    if (!selectedCourse) return null
    return {
      required: true,
      label: activeMainCourseConfig.label,
      option: selectedCourse.label,
      value: selectedCourse.value,
    }
  }, [activeMainCourseConfig, mainCourseValue])

  const menuSelection = useMemo(
    () => buildMenuSelection(activeMenuConfig, menuValue, people),
    [activeMenuConfig, menuValue, people],
  )

  const menuTotal = menuSelection?.subtotal ?? 0
  const reservationTotal = selectedSlot ? (selectedSlot.price * people) + romanticSignTotal + menuTotal : 0

  const standalonePasses = useMemo(
    () => accessPasses.filter(isTicketAccessPass),
    [accessPasses],
  )

  useEffect(() => {
    setSelectedSlotId((current) => current && bookingSlots.some((slot) => slot.id === current)
      ? current
      : bookingSlots[0]?.id ?? '')
  }, [bookingSlots])

  const createReservation = async () => {
    if (!token || !selectedSlot) return
    if (activeMainCourseConfig && !mainCourseSelection) {
      setOperationError('Selecciona el plato fuerte antes de continuar.')
      return
    }
    if (activeMenuConfig?.required && !menuSelection) {
      setOperationError('Selecciona el menú antes de continuar.')
      return
    }
    if (activeContractTerms.requiresAcceptance && !contractAccepted) {
      setOperationError('Acepta las condiciones de reservación antes de continuar.')
      return
    }
    setSubmitting(true)
    setMessage('')
    setOperationError('')
    try {
      const metadata = {
        ...(romanticSignSelection ? { romanticSign: romanticSignSelection } : {}),
        ...(mainCourseSelection ? { mainCourse: mainCourseSelection } : {}),
        ...(menuSelection ? { menuSelection } : {}),
        acceptedTerms: acceptedContractMetadata(activeContractTerms, 'mobile_experience_reservation'),
      }
      const response = await customerClient.createReservation(token, {
        experienceSlotId: selectedSlot.id,
        peopleCount: people,
        customerNotes: notes || null,
        metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
        language,
        idempotencyKey: makeIdempotencyKey('reservation'),
      })
      if (response.data.paymentOrderId) {
        navigate(`${appPath('/checkout')}?orderId=${encodeURIComponent(response.data.paymentOrderId)}`)
        return
      }
      setMessage(t('app.premium.reservation.created'))
      setNotes('')
      await Promise.all([loadSlots(), loadReservations()])
    } catch (err) {
      const status = err && typeof err === 'object' && 'status' in err ? Number((err as { status?: unknown }).status) : 0
      setOperationError(status === 409
        ? t('app.premium.reservation.capacityConflict')
        : t('app.premium.reservation.createError'))
    } finally {
      setSubmitting(false)
    }
  }

  const cancelReservation = async (reservation: CustomerReservation) => {
    if (!token) return
    setSubmitting(true)
    setOperationError('')
    try {
      await customerClient.cancelReservation(token, reservation.id, t('app.premium.reservation.cancel'))
      setMessage(t('app.premium.reservation.cancelled'))
      await Promise.all([loadSlots(), loadReservations()])
    } catch {
      setOperationError(t('app.premium.reservation.cancelError'))
    } finally {
      setSubmitting(false)
    }
  }

  const rescheduleReservation = async (reservation: CustomerReservation, slotId: string) => {
    if (!token || !slotId) return
    setSubmitting(true)
    setOperationError('')
    try {
      await customerClient.rescheduleReservation(token, reservation.id, {
        experienceSlotId: slotId,
        idempotencyKey: makeIdempotencyKey('reschedule'),
      })
      setMessage(t('app.premium.reservation.rescheduled'))
      await Promise.all([loadSlots(), loadReservations()])
    } catch {
      setOperationError(t('app.premium.reservation.rescheduleError'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="app-page space-y-6">
      <section className="space-y-3">
        <SectionHeading eyebrow={t('app.premium.reservation.eyebrow')} title={t('app.premium.reservation.title')} />
        <p className="text-[13px] leading-5 text-[var(--color-muted)]">
          {t('app.premium.reservation.subtitle')}
        </p>
      </section>

      <section className="relative rounded-[1.35rem] border border-[rgba(220,202,181,0.78)] bg-white shadow-[0_18px_38px_rgba(74,32,28,0.08)]">
        {loading ? (
          <div className="p-5 text-[12px] text-[var(--color-muted)]">{t('app.premium.reservation.loadingExperiences')}</div>
        ) : error ? (
          <div className="p-5 text-[12px] text-[var(--color-alert)]">
            <p>{error}</p>
            <button type="button" onClick={retry} className="mt-3 font-semibold text-[var(--color-burgundy)]">{t('common.retry')}</button>
          </div>
        ) : featuredExperience ? (
          <>
            <div className="relative min-h-[170px] overflow-hidden">
              {imageField(featuredExperience, '') ? (
                <img src={imageField(featuredExperience, '')} alt={textField(featuredExperience, 'title', 'Experiencia')} className="h-full w-full object-cover" />
              ) : null}
              <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_35%,rgba(40,14,17,0.78))]" />
              <div className="absolute inset-x-0 bottom-0 p-[var(--app-pad)] text-white">
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#f0cf92]">{t('app.premium.reservation.selectedExperience')}</p>
                <h2 className="mt-1 text-[clamp(22px,6vw,27px)] font-medium leading-none" style={{ fontFamily: 'var(--font-display)', overflowWrap: 'anywhere' }}>
                  {textField(featuredExperience, 'title', 'Experiencia')}
                </h2>
              </div>
            </div>
            <div className="space-y-3 p-4">
              <button
                type="button"
                onClick={() => setExperienceSheetOpen(true)}
                className="flex min-h-[58px] w-full items-center justify-between gap-3 rounded-[1rem] border border-[rgba(184,138,74,0.28)] bg-[rgba(255,249,241,0.72)] px-4 text-left text-[15px] text-[var(--color-ink)] shadow-[0_12px_28px_rgba(74,32,28,0.07),inset_0_1px_0_rgba(255,255,255,0.82)] backdrop-blur-xl"
              >
                <span className="min-w-0 break-words">{textField(featuredExperience, 'title', 'Experiencia')}</span>
                <ChevronDown size={18} className="shrink-0 text-[var(--color-burgundy)]" />
              </button>
              <p className="text-[12px] leading-5 text-[var(--color-muted)]">
                {textField(featuredExperience, 'short_description') || textField(featuredExperience, 'description')}
              </p>
              <p className="text-[14px] font-semibold text-[var(--color-burgundy)]">
                {formatCurrency(numberField(featuredExperience, 'base_price'), locale)} {t('app.premium.reservation.perPerson')}
              </p>
            </div>
          </>
        ) : (
          <div className="p-5 text-[12px] text-[var(--color-muted)]">{t('app.premium.reservation.noExperiences')}</div>
        )}
      </section>

      <section className="space-y-3">
        <SectionHeading title={t('app.premium.reservation.chooseSlot')} />
        {loadingSlots ? (
          <div className="rounded-[1.2rem] border border-[rgba(220,202,181,0.78)] bg-white p-5 text-[12px] text-[var(--color-muted)]">{t('app.premium.reservation.loadingAvailability')}</div>
        ) : bookingSlots.length === 0 ? (
          <div className="rounded-[1.2rem] border border-[rgba(220,202,181,0.78)] bg-white p-5 text-[12px] text-[var(--color-muted)]">
            {blockedByNotice
              ? `${activeMainCourseConfig?.serviceLabel ?? 'Esta experiencia'} requiere reservar con al menos ${activeMainCourseConfig?.noticeHours ?? ROMANTIC_SERVICE_NOTICE_HOURS} horas de anticipación.`
              : t('app.premium.reservation.noSlots')}
          </div>
        ) : (
          <div className="grid gap-3">
            {bookingSlots.slice(0, 8).map((slot) => (
              <button
                key={slot.id}
                type="button"
                onClick={() => setSelectedSlotId(slot.id)}
                className={`rounded-[1.1rem] border p-4 text-left text-[12px] transition ${selectedSlotId === slot.id ? 'border-[var(--color-burgundy)] bg-[#fff4f6]' : 'border-[rgba(220,202,181,0.78)] bg-white'}`}
              >
                <span className="flex items-center gap-2 font-semibold text-[var(--color-ink)]"><Clock3 size={14} />{formatDateTime(slot.startAt, locale, t('common.toBeConfirmed'))}</span>
                <span className="mt-2 block text-[11px] text-[var(--color-muted)]">{slot.available} {t('app.premium.reservation.spotsAvailable')} · {formatCurrency(slot.price, locale)}</span>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-[1.25rem] border border-[rgba(220,202,181,0.78)] bg-white p-4 shadow-[0_14px_30px_rgba(74,32,28,0.06)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#f8eee5] text-[var(--color-burgundy)]"><Users size={18} /></span>
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-[var(--color-ink)]">{t('app.premium.reservation.guests')}</p>
              <p className="mt-1 text-[11px] leading-4 text-[var(--color-muted)]">{t('app.premium.reservation.guestsHelp')}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 rounded-full border border-[rgba(104,13,36,0.13)] bg-[#fffaf5] p-1">
            <button type="button" aria-label={t('app.premium.decreaseQuantity')} onClick={() => setPeople((current) => Math.max(1, current - 1))} className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-burgundy)]"><Minus size={14} /></button>
            <span className="w-6 text-center text-[12px] font-semibold text-[var(--color-ink)]">{people}</span>
            <button type="button" aria-label={t('app.premium.increaseQuantity')} onClick={() => setPeople((current) => Math.min(20, current + 1))} className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-burgundy)] text-white"><Plus size={14} /></button>
          </div>
        </div>
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          maxLength={1000}
          rows={3}
          placeholder={t('app.premium.reservation.notePlaceholder')}
          className="mt-4 w-full min-w-0 rounded-[1rem] border border-[#dccab5] bg-white px-4 py-3 text-[14px] outline-none"
        />
      </section>

      {activeRomanticSignConfig ? (
        <section className="rounded-[1.15rem] border border-[rgba(180,138,85,0.24)] bg-[linear-gradient(145deg,rgba(247,242,234,0.92),rgba(232,216,200,0.58))] p-3.5 shadow-[0_12px_24px_rgba(37,47,55,0.06)]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--color-gold)]">{activeRomanticSignConfig.serviceLabel}</p>
              <h3 className="mt-1 flex items-center gap-2 text-[16px] font-semibold leading-tight text-[var(--color-ink)]"><Lightbulb size={15} className="shrink-0 text-[var(--color-burgundy)]" />{activeRomanticSignConfig.label}</h3>
              <p className="mt-1 text-[11px] leading-5 text-[var(--color-muted)]">
                Agrega el letrero a la reservación por {formatCurrency(activeRomanticSignConfig.price, locale)}.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setRomanticSignRequired((current) => !current)}
              className={`inline-flex min-h-9 shrink-0 items-center justify-center rounded-full px-3 text-[11px] font-semibold transition ${romanticSignRequired ? 'bg-[var(--color-burgundy)] text-white shadow-[0_10px_20px_rgba(91,11,31,0.16)]' : 'border border-[rgba(180,138,85,0.34)] bg-white/72 text-[var(--color-burgundy)]'}`}
            >
              {romanticSignRequired ? 'Agregado' : 'Agregar'}
            </button>
          </div>
          {romanticSignRequired ? (
            <div className="mt-3 grid gap-2">
              {activeRomanticSignConfig.options.map((option) => {
                const active = romanticSignMessage === option
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setRomanticSignMessage(option)}
                    className={`flex min-h-[44px] w-full items-center justify-between gap-3 rounded-[0.9rem] px-3.5 py-2 text-left text-[12px] font-semibold transition ${active ? 'bg-[rgba(91,11,31,0.08)] text-[var(--color-burgundy)] shadow-[inset_0_0_0_1px_rgba(91,11,31,0.34)]' : 'bg-white/62 text-[var(--color-ink)] shadow-[inset_0_0_0_1px_rgba(180,138,85,0.2)]'}`}
                  >
                    <span className="min-w-0 break-words">{option}</span>
                    {active ? <Check size={16} className="shrink-0" /> : null}
                  </button>
                )
              })}
            </div>
          ) : null}
        </section>
      ) : null}

      {activeMainCourseConfig ? (
        <section className="rounded-[1.25rem] border border-[rgba(180,138,85,0.28)] bg-white/82 p-4 shadow-[0_14px_30px_rgba(37,47,55,0.06)]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--color-gold)]">Cocina</p>
          <h3 className="mt-1 text-[18px] font-semibold leading-tight text-[var(--color-ink)]">{activeMainCourseConfig.label}</h3>
          <p className="mt-1 text-[12px] leading-5 text-[var(--color-muted)]">
            Se comparte con cocina para preparar la reserva. Requiere mínimo {activeMainCourseConfig.noticeHours} horas de anticipación.
          </p>
          <div className="mt-4 grid gap-2">
            {activeMainCourseConfig.options.map((option) => {
              const active = mainCourseValue === option.value
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setMainCourseValue(option.value)}
                  className={`flex min-h-[46px] w-full items-center justify-between gap-3 rounded-[0.9rem] px-3.5 py-2 text-left text-[12px] font-semibold transition ${active ? 'bg-[rgba(91,11,31,0.08)] text-[var(--color-burgundy)] shadow-[inset_0_0_0_1px_rgba(91,11,31,0.34)]' : 'bg-[rgba(247,242,234,0.82)] text-[var(--color-ink)] shadow-[inset_0_0_0_1px_rgba(180,138,85,0.2)]'}`}
                >
                  <span className="min-w-0 break-words">{option.label}</span>
                  {active ? <Check size={16} className="shrink-0" /> : null}
                </button>
              )
            })}
          </div>
        </section>
      ) : null}

      {activeMenuConfig ? (
        <section className="rounded-[1.25rem] border border-[rgba(180,138,85,0.28)] bg-white/86 p-4 shadow-[0_14px_30px_rgba(37,47,55,0.06)]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--color-gold)]">{activeMenuConfig.label}</p>
          <h3 className="mt-1 text-[18px] font-semibold leading-tight text-[var(--color-ink)]">Elige tu menú</h3>
          <p className="mt-1 text-[12px] leading-5 text-[var(--color-muted)]">
            {activeMenuConfig.priceMode === 'per_person'
              ? 'El precio se calcula por persona registrada en la reservación.'
              : 'El precio se agrega una vez a la reservación.'}
          </p>
          <div className="mt-4 grid gap-2">
            {!activeMenuConfig.required ? (
              <button
                type="button"
                onClick={() => setMenuValue('')}
                className={`grid min-h-[64px] w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-4 rounded-[1.05rem] px-5 py-3 text-left transition ${menuValue === '' ? 'bg-[var(--color-burgundy)] text-white shadow-[0_12px_26px_rgba(91,11,31,0.16)]' : 'bg-[rgba(247,242,234,0.82)] text-[var(--color-ink)] shadow-[inset_0_0_0_1px_rgba(180,138,85,0.2)]'}`}
              >
                <span className="min-w-0 text-[13px] font-semibold">Sin menú</span>
                {menuValue === '' ? <Check size={16} className="shrink-0" /> : null}
              </button>
            ) : null}
            {activeMenuConfig.options.map((option) => {
              const active = menuValue === option.value
              const quantity = activeMenuConfig.priceMode === 'per_person' ? Math.max(1, people) : 1
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setMenuValue(option.value)}
                  className={`grid min-h-[92px] w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-4 rounded-[1.05rem] px-5 py-4 text-left transition ${active ? 'bg-[var(--color-burgundy)] text-white shadow-[0_12px_26px_rgba(91,11,31,0.16)]' : 'bg-[rgba(247,242,234,0.82)] text-[var(--color-ink)] shadow-[inset_0_0_0_1px_rgba(180,138,85,0.2)]'}`}
                >
                  <span className="min-w-0">
                    {option.category ? <span className={`mb-1 block text-[9px] font-semibold uppercase tracking-[0.13em] ${active ? 'text-white/70' : 'text-[var(--color-gold)]'}`}>{option.category}</span> : null}
                    <span className="block break-words text-[13px] font-semibold">{option.label}</span>
                    {option.description ? <span className={`mt-1.5 block break-words pr-1 text-[11px] leading-5 ${active ? 'text-white/76' : 'text-[var(--color-muted)]'}`}>{option.description}</span> : null}
                  </span>
                  <span className="min-w-[96px] shrink-0 text-right">
                    <span className="block text-[12px] font-semibold">{formatCurrency(option.price * quantity, locale)}</span>
                    {active ? <Check size={16} className="ml-auto mt-2" /> : null}
                  </span>
                </button>
              )
            })}
          </div>
        </section>
      ) : null}

      <section className="rounded-[1.25rem] border border-[rgba(180,138,85,0.28)] bg-[rgba(247,242,234,0.78)] p-4 shadow-[0_14px_30px_rgba(37,47,55,0.05)]">
        <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--color-gold)]">Contrato de reservación</p>
        <h3 className="mt-1 text-[18px] font-semibold leading-tight text-[var(--color-ink)]">{activeContractTerms.title}</h3>
        <ul className="mt-3 grid gap-2 text-[12px] leading-5 text-[var(--color-muted)]">
          {activeContractTerms.terms.map((term) => (
            <li key={term} className="rounded-[0.9rem] bg-white/68 px-3 py-2">{term}</li>
          ))}
        </ul>
        {activeContractTerms.requiresAcceptance ? (
          <button
            type="button"
            onClick={() => setContractAccepted((current) => !current)}
            className={`mt-4 flex min-h-[54px] w-full items-center justify-between gap-3 rounded-[1rem] px-4 text-left text-[13px] font-semibold transition ${contractAccepted ? 'bg-[var(--color-burgundy)] text-white shadow-[0_12px_26px_rgba(91,11,31,0.16)]' : 'bg-white/72 text-[var(--color-ink)] shadow-[inset_0_0_0_1px_rgba(180,138,85,0.24)]'}`}
          >
            <span className="min-w-0 break-words">{activeContractTerms.confirmationMessage}</span>
            <span className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${contractAccepted ? 'bg-white/18 text-white' : 'bg-[rgba(37,47,55,0.08)] text-[var(--color-muted)]'}`}>
              {contractAccepted ? <Check size={15} /> : null}
            </span>
          </button>
        ) : null}
      </section>

      {selectedSlot ? (
        <section className="rounded-[1.3rem] bg-[linear-gradient(145deg,#fffaf5,#f2dfca)] p-5 shadow-[0_16px_34px_rgba(74,32,28,0.07)]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--color-gold)]">{t('app.premium.reservation.summary')}</p>
            <div className="mt-4 space-y-2 text-[12px]">
              <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-[var(--color-muted)]">{t('app.premium.reservation.date')}</span><span className="text-right font-semibold text-[var(--color-ink)]">{formatDateTime(selectedSlot.startAt, locale, t('common.toBeConfirmed'))}</span></div>
              <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-[var(--color-muted)]">{t('app.premium.reservation.guests')}</span><span className="font-semibold text-[var(--color-ink)]">{people}</span></div>
              {romanticSignSelection ? (
                <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-[var(--color-muted)]">{romanticSignSelection.label}</span><span className="font-semibold text-[var(--color-ink)]">{formatCurrency(romanticSignTotal, locale)}</span></div>
              ) : null}
              {mainCourseSelection ? (
                <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-[var(--color-muted)]">{mainCourseSelection.label}</span><span className="font-semibold text-[var(--color-ink)]">{mainCourseSelection.option}</span></div>
              ) : null}
              {menuSelection ? (
                <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-[var(--color-muted)]">{menuSelection.label}</span><span className="font-semibold text-[var(--color-ink)]">{menuSelection.option} · {formatCurrency(menuTotal, locale)}</span></div>
              ) : null}
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[rgba(180,138,85,0.22)] pt-2"><span className="text-[var(--color-muted)]">Total</span><span className="font-semibold text-[var(--color-ink)]">{formatCurrency(reservationTotal, locale)}</span></div>
          </div>
        </section>
      ) : null}

      {message ? <p className="rounded-[1rem] bg-[rgba(37,47,55,0.08)] p-3 text-[12px] text-[#252F37]">{message}</p> : null}
      {operationError ? <p className="rounded-[1rem] bg-[rgba(157,71,63,0.08)] p-3 text-[12px] text-[var(--color-alert)]">{operationError}</p> : null}

      <PrimaryButton onClick={createReservation} disabled={!selectedSlot || submitting}>
        <CalendarDays size={16} />
        {submitting ? t('app.premium.reservation.processing') : t('app.premium.reservation.continueToPayment', 'Continuar al pago')}
      </PrimaryButton>

      <section id="boletos" className="scroll-mt-6 space-y-3">
        <SectionHeading eyebrow={t('app.premium.events.ticket', 'Boletos')} title={t('app.premium.ticket.myAccesses', 'Mis boletos y accesos')} />
        {standalonePasses.length === 0 ? (
          <div className="rounded-[1.2rem] border border-[rgba(220,202,181,0.78)] bg-white p-5 text-[12px] text-[var(--color-muted)]">
            {t('app.premium.ticket.noEventPasses', 'Los boletos pagados aparecerán aquí con su código QR de entrada.')}
          </div>
        ) : (
          <div className="grid gap-3">
            {standalonePasses.map((pass) => (
              <article key={pass.id} className="rounded-[1.2rem] border border-[rgba(220,202,181,0.78)] bg-white p-4 shadow-[0_14px_30px_rgba(74,32,28,0.06)]">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-gold)]">{pass.orderNumber ?? pass.passNumber}</p>
                <h3 className="mt-1 text-[16px] font-semibold leading-tight text-[var(--color-ink)]">{pass.title ?? t('app.premium.events.ticket')}</h3>
                <p className="mt-1 text-[11px] text-[var(--color-muted)]">{formatDateTime(pass.startsAt, locale, t('common.toBeConfirmed'))}</p>
                <button type="button" onClick={() => setSelectedTicket(pass)} className="mt-4 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-full bg-[var(--color-burgundy)] px-4 text-[12px] font-semibold text-white">
                  <QrCode size={15} />
                  {t('app.premium.ticket.show', 'Ver boleto QR')}
                </button>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <SectionHeading eyebrow={t('app.premium.reservation.myBookings')} title={t('app.premium.reservation.yourBookings')} />
          <button type="button" onClick={() => void loadReservations()} className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-[var(--color-burgundy)]" aria-label={t('app.premium.reservation.refresh')}>
            <RefreshCw size={16} />
          </button>
        </div>
        {loadingReservations ? (
          <div className="rounded-[1.2rem] border border-[rgba(220,202,181,0.78)] bg-white p-5 text-[12px] text-[var(--color-muted)]">{t('app.premium.reservation.loadingReservations')}</div>
        ) : reservations.length === 0 ? (
          <div className="rounded-[1.2rem] border border-[rgba(220,202,181,0.78)] bg-white p-5 text-[12px] text-[var(--color-muted)]">{t('app.premium.reservation.noReservations')}</div>
        ) : (
          <div className="grid gap-3">
            {reservations.map((reservation) => {
              const reservationPasses = reservation.accessPasses?.length
                ? reservation.accessPasses
                : reservation.accessPass ? [reservation.accessPass] : []
              const romanticSign = romanticSignFromMetadata(reservation.metadata)
              const mainCourse = mainCourseFromMetadata(reservation.metadata)
              const menu = menuSelectionFromMetadata(reservation.metadata)
              const isRequestedReservation = requestedReservationId === reservation.id
              return (
              <article id={`reservation-${reservation.id}`} key={reservation.id} className={`rounded-[1.2rem] border bg-white p-4 shadow-[0_14px_30px_rgba(74,32,28,0.06)] ${isRequestedReservation ? 'border-[var(--color-burgundy)] ring-2 ring-[rgba(91,11,31,0.14)]' : 'border-[rgba(220,202,181,0.78)]'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-gold)]">{reservation.reservationNumber}</p>
                    <h3 className="mt-1 text-[16px] font-semibold leading-tight text-[var(--color-ink)]">{reservation.title ?? reservation.experienceTitle}</h3>
                    <p className="mt-1 text-[11px] text-[var(--color-muted)]">{reservationSchedule(reservation, locale, t('common.toBeConfirmed'))}</p>
                    {romanticSign ? (
                      <p className="mt-2 rounded-[0.85rem] bg-[rgba(180,138,85,0.16)] px-3 py-2 text-[11px] font-semibold leading-4 text-[var(--color-burgundy)]">
                        {romanticSign.label}: {romanticSign.message}
                      </p>
                    ) : null}
                    {mainCourse ? (
                      <p className="mt-2 rounded-[0.85rem] bg-[rgba(37,47,55,0.08)] px-3 py-2 text-[11px] font-semibold leading-4 text-[#252F37]">
                        {mainCourse.label}: {mainCourse.option}
                      </p>
                    ) : null}
                    {menu ? (
                      <p className="mt-2 rounded-[0.85rem] bg-[rgba(180,138,85,0.14)] px-3 py-2 text-[11px] font-semibold leading-4 text-[var(--color-ink)]">
                        {menu.label}: {menu.option}
                      </p>
                    ) : null}
                    {reservation.paymentStatus === 'pending' && reservation.paymentOrderId ? (
                      <button type="button" onClick={() => navigate(`${appPath('/checkout')}?orderId=${encodeURIComponent(reservation.paymentOrderId ?? '')}`)} className="mt-3 inline-flex min-h-9 items-center justify-center rounded-full bg-[var(--color-burgundy)] px-4 text-[11px] font-semibold text-white">
                        {t('app.premium.reservation.completePayment', 'Completar pago')}
                      </button>
                    ) : null}
                  </div>
                  <span className="rounded-full bg-[#f8eee5] px-3 py-1 text-[10px] font-semibold text-[var(--color-burgundy)]">{reservation.status}</span>
                </div>
                {['pending', 'confirmed'].includes(reservation.status) ? (
                  <div className="mt-4 grid gap-2">
                    {reservationPasses.length ? (
                      <div className={reservationPasses.length > 1 ? 'grid grid-cols-2 gap-2' : 'grid gap-2'}>
                        {reservationPasses.map((pass, index) => (
                          <button key={pass.id} type="button" onClick={() => setSelectedTicket(pass)} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-[var(--color-burgundy)] px-4 text-[12px] font-semibold text-white">
                            <Ticket size={15} />
                            {reservationPasses.length > 1 ? `QR ${index + 1} de ${reservationPasses.length}` : t('app.premium.ticket.show', 'Ver boleto QR')}
                          </button>
                        ))}
                      </div>
                    ) : null}
                    {reservation.reservationType === 'experience' ? (
                      <AppSelect
                        value=""
                        onChange={(value) => value && void rescheduleReservation(reservation, value)}
                        disabled={submitting}
                        options={[
                          { value: '', label: t('app.premium.reservation.rescheduleTo') },
                          ...slots
                            .filter((slot) => slot.experienceId === reservation.experienceId && slot.id !== reservation.slotId)
                            .slice(0, 8)
                            .map((slot) => ({
                              value: slot.id,
                              label: `${formatDateTime(slot.startAt, locale, t('common.toBeConfirmed'))} · ${slot.available}`,
                            })),
                        ]}
                      />
                    ) : null}
                    <button type="button" onClick={() => void cancelReservation(reservation)} disabled={submitting} className="rounded-[0.9rem] border border-[rgba(157,71,63,0.28)] px-3 py-2 text-[12px] font-semibold text-[var(--color-alert)]">
                      {t('app.premium.reservation.cancel')}
                    </button>
                  </div>
                ) : null}
              </article>
              )
            })}
          </div>
        )}
      </section>
      {selectedTicket ? (
        <TicketSheet pass={selectedTicket} locale={locale} t={t} onClose={() => setSelectedTicket(null)} />
      ) : null}
      {experienceSheetOpen ? (
        <MobileChoiceSheet
          title={t('app.premium.reservation.selectedExperience')}
          options={experiences.map((experience) => ({
            value: String(experience.id),
            label: textField(experience, 'title', 'Experiencia'),
          }))}
          selectedValue={selectedExperienceId}
          onSelect={setSelectedExperienceId}
          onClose={() => setExperienceSheetOpen(false)}
        />
      ) : null}
    </div>
  )
}
