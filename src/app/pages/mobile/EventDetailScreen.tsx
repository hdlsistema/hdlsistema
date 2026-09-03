import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { CalendarDays, Clock3, MapPin, Minus, Plus, ShoppingCart, Ticket } from 'lucide-react'
import { publicContentClient, type ContentRecord } from '../../../services/content.service'
import { AppSectionHeader, BackButton, EmptyState, ErrorState, HeroEditorial, LoadingState, PrimaryButton, StatusBadge } from '../../components/mobile/PremiumMobileUi'
import { useAppPreferences } from '../../context/AppPreferencesContext'
import { eventMinimumTicketPrice, formatCurrency, formatPublicDate, formatPublicTimeRange, galleryImages, imageField, numberField, publicEventHasEnded, sanitizePublicEventCopy, textField } from '../../utils/publicContent'
import { appPath } from '../../utils/appRoutes'
import { eventKindLabel, eventMetadata, eventVenueForRecord } from '../../utils/eventVenues'
import { useAuth } from '../../../contexts/AuthContext'
import { customerClient } from '../../../services/customer.service'
import { useMobileGuestAccess } from '../../components/mobile/MobileGuestAccessContext'

type EventTicketType = {
  id: string
  name?: string | null
  description?: string | null
  price?: number | string | null
  capacity?: number | null
  sold_count?: number | null
  reserved_count?: number | null
  active?: boolean | null
  status?: string | null
  visible_in_app?: boolean | null
  sales_start_at?: string | null
  sales_end_at?: string | null
  publish_at?: string | null
  unpublish_at?: string | null
  archived_at?: string | null
  deleted_at?: string | null
}

type EventVariantDisplayOption = {
  label: string
  price: number | null
  capacity: number | null
}

function liveTicket(ticket: EventTicketType) {
  const now = Date.now()
  const starts = ticket.sales_start_at ? new Date(ticket.sales_start_at).getTime() : null
  const ends = ticket.sales_end_at ? new Date(ticket.sales_end_at).getTime() : null
  const publishes = ticket.publish_at ? new Date(ticket.publish_at).getTime() : null
  const unpublishes = ticket.unpublish_at ? new Date(ticket.unpublish_at).getTime() : null
  return ticket.active !== false
    && ticket.visible_in_app !== false
    && ticket.status === 'published'
    && !ticket.archived_at
    && !ticket.deleted_at
    && (starts === null || starts <= now)
    && (ends === null || ends >= now)
    && (publishes === null || publishes <= now)
    && (unpublishes === null || unpublishes > now)
}

function ticketAvailable(ticket: EventTicketType) {
  return Math.max(
    Number(ticket.capacity ?? 0) - Number(ticket.sold_count ?? 0) - Number(ticket.reserved_count ?? 0),
    0,
  )
}

function normalizeLocationText(value?: string | null) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .replace(/\s*·\s*/g, ' · ')
    .trim()
}

function eventLocationValue(venueTitle: string, rawLocation: string) {
  const title = normalizeLocationText(venueTitle)
  const location = normalizeLocationText(rawLocation)
  if (!location) return title
  const uniqueParts = Array.from(
    new Map(
      location
        .split(/\s+·\s+/)
        .map((part) => normalizeLocationText(part))
        .filter(Boolean)
        .map((part) => [part.toLocaleLowerCase('es-MX'), part]),
    ).values(),
  )
  const cleanLocation = uniqueParts.join(' · ')
  if (!cleanLocation) return title
  const normalizedTitle = title.toLocaleLowerCase('es-MX')
  const normalizedLocation = cleanLocation.toLocaleLowerCase('es-MX')
  if (normalizedLocation === normalizedTitle || normalizedLocation.includes(normalizedTitle)) return cleanLocation
  return cleanLocation
}

function variantSchemaItems(record: ContentRecord) {
  const schema = eventMetadata(record).variant_schema
  if (!Array.isArray(schema)) return []
  return schema
    .map((item) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return null
      const row = item as Record<string, unknown>
      const label = typeof row.label === 'string' ? row.label : typeof row.name === 'string' ? row.name : ''
      const options = Array.isArray(row.options)
        ? row.options
          .map((option): EventVariantDisplayOption | null => {
            if (option && typeof option === 'object' && !Array.isArray(option)) {
              const optionRecord = option as Record<string, unknown>
              const optionLabel = typeof optionRecord.label === 'string'
                ? optionRecord.label
                : typeof optionRecord.name === 'string'
                  ? optionRecord.name
                  : typeof optionRecord.value === 'string'
                    ? optionRecord.value
                    : ''
              const price = optionRecord.price === null || optionRecord.price === undefined || optionRecord.price === ''
                ? null
                : Number(optionRecord.price)
              const capacity = optionRecord.capacity === null || optionRecord.capacity === undefined || optionRecord.capacity === ''
                ? null
                : Number(optionRecord.capacity)
              return optionLabel
                ? {
                  label: optionLabel,
                  price: Number.isFinite(price) ? price : null,
                  capacity: Number.isFinite(capacity) ? capacity : null,
                }
                : null
            }
            const optionLabel = String(option ?? '').trim()
            return optionLabel ? { label: optionLabel, price: null, capacity: null } : null
          })
          .filter((option): option is EventVariantDisplayOption => Boolean(option))
        : []
      return label ? { label, options } : null
    })
    .filter((item): item is { label: string; options: EventVariantDisplayOption[] } => Boolean(item))
}

export function EventDetailScreen() {
  const { eventId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { t, locale } = useAppPreferences()
  const { session } = useAuth()
  const { requestAuth } = useMobileGuestAccess()
  const [event, setEvent] = useState<ContentRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [quantityByTicket, setQuantityByTicket] = useState<Record<string, number>>({})
  const [addingTicket, setAddingTicket] = useState('')
  const [cartMessage, setCartMessage] = useState('')
  const [cartError, setCartError] = useState('')

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    if (!eventId) {
      setError(t('app.eventNotFound'))
      setLoading(false)
      return
    }
    publicContentClient
      .getBySlug('grand-events', eventId, locale)
      .then((response) => {
        if (active) setEvent(response.data)
      })
      .catch(() => {
        if (active) setError(t('app.eventNotFound'))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [eventId, locale, t])

  if (loading) return <div className="app-page"><LoadingState label={t('app.premium.events.loading')} /></div>
  if (error || !event) return <div className="app-page"><ErrorState message={error ?? t('app.eventNotFound')} /></div>

  const title = textField(event, 'title', t('app.nav.events'))
  const summary = sanitizePublicEventCopy(textField(event, 'short_description') || textField(event, 'description')) || t('app.premium.informationSoon')
  const price = eventMinimumTicketPrice(event, numberField(event, 'price'))
  const includedItems = summary.split('.').map((item) => item.trim()).filter(Boolean)
  const gallery = galleryImages(event, 'event_images', imageField(event, ''))
  const venue = eventVenueForRecord(event)
  const locationValue = eventLocationValue(venue.title, textField(event, 'venue'))
  const metadata = eventMetadata(event)
  const kind = eventKindLabel(String(metadata.event_kind ?? ''))
  const salesEnabled = event.sales_enabled !== false
  const eventEnded = publicEventHasEnded(event)
  const eventPurchasable = salesEnabled && !eventEnded
  const variants = variantSchemaItems(event)
  const ticketTypes = (Array.isArray(event.event_ticket_types) ? event.event_ticket_types : [])
    .filter((item): item is EventTicketType => Boolean(item && typeof item === 'object' && 'id' in item))
    .filter((ticket) => eventPurchasable && liveTicket(ticket))
  const eventAvailable = Math.max(
    numberField(event, 'capacity') - numberField(event, 'sold_count') - numberField(event, 'reserved_count'),
    0,
  )

  const addTicketToCart = async (ticket: EventTicketType) => {
    const token = session?.access_token
    if (!token) {
      requestAuth({ from: `${location.pathname}${location.search}${location.hash}` })
      return
    }
    const maxQuantity = Math.max(Math.min(ticketAvailable(ticket), eventAvailable), 0)
    if (!eventPurchasable || maxQuantity < 1) {
      setCartError(t('app.premium.events.ticketUnavailable', 'La venta para este boleto no está disponible.'))
      return
    }
    const quantity = Math.min(quantityByTicket[ticket.id] ?? 1, maxQuantity)
    setAddingTicket(ticket.id)
    setCartError('')
    setCartMessage('')
    try {
      await customerClient.addCartItem(token, {
        itemType: 'event_ticket',
        itemId: ticket.id,
        quantity,
        idempotencyKey: `event_ticket_${ticket.id}_${Date.now()}`,
      })
      setCartMessage(t('app.premium.events.ticketAdded', 'Boleto agregado al carrito.'))
      navigate(appPath('/checkout'))
    } catch {
      setCartError(t('app.premium.events.ticketAddError', 'No fue posible agregar el boleto.'))
    } finally {
      setAddingTicket('')
    }
  }

  return (
    <div className="app-page space-y-6">
      <BackButton label={t('app.premium.back')} />
      <HeroEditorial
        eyebrow={t('app.premium.events.eyebrow')}
        title={title}
        subtitle={summary}
        image={imageField(event, '')}
        alt={title}
      />
      <section className="grid grid-cols-[repeat(auto-fit,minmax(136px,1fr))] gap-3">
        {[
          { icon: CalendarDays, label: t('app.premium.events.date'), value: formatPublicDate(event.start_at, locale, t('common.datePending')) },
          { icon: Clock3, label: t('app.premium.events.schedule'), value: formatPublicTimeRange(event.start_at, event.end_at, locale) },
          { icon: MapPin, label: t('app.location'), value: locationValue },
          {
            icon: Ticket,
            label: t('app.premium.events.ticket'),
            value: eventEnded
              ? t('app.premium.events.salesClosed', 'Venta cerrada')
              : ticketTypes.length > 0 && price > 0
                ? formatCurrency(price, locale)
                : t('app.premium.events.ticketPending'),
          },
        ].map((item) => {
          const Icon = item.icon
          return (
            <article key={item.label} className="rounded-[1.05rem] bg-[rgba(255,250,242,0.84)] p-4 shadow-[var(--shadow-card)]">
              <Icon size={17} className="text-[var(--color-burgundy)]" />
              <p className="mt-3 text-[9px] font-semibold uppercase tracking-[0.13em] text-[var(--color-gold)]">{item.label}</p>
              <p className="mt-1 break-words text-[12px] font-semibold leading-4 text-[var(--color-ink)]">{item.value}</p>
            </article>
          )
        })}
      </section>
      {variants.length ? (
        <section className="space-y-3">
          <AppSectionHeader eyebrow={kind} title={t('app.premium.events.variants', 'Opciones del evento')} />
          <div className="grid gap-3">
            {variants.map((item) => (
              <article key={item.label} className="rounded-[1rem] border border-[rgba(220,202,181,0.78)] bg-[#fffaf5] p-4">
                <p className="text-[9px] font-semibold uppercase tracking-[0.13em] text-[var(--color-gold)]">{item.label}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {item.options.length ? item.options.map((option) => (
                    <StatusBadge key={`${item.label}-${option.label}`}>
                      {option.label}
                      {option.price !== null ? ` · ${formatCurrency(option.price, locale)}` : ''}
                      {option.capacity !== null ? ` · ${option.capacity} cupos` : ''}
                    </StatusBadge>
                  )) : <StatusBadge>{t('common.toBeConfirmed')}</StatusBadge>}
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}
      <section className="space-y-3">
        <AppSectionHeader eyebrow={t('app.publishedDetails')} title={t('app.publishedDetails')} />
        {includedItems.length ? (
          <div className="grid gap-2">
            {includedItems.map((item) => <StatusBadge key={item}>{item}</StatusBadge>)}
          </div>
        ) : (
          <EmptyState title={t('app.premium.contentPreparing')} description={t('app.premium.informationSoon')} />
        )}
      </section>

      {gallery.length > 1 ? (
        <section className="space-y-3">
          <AppSectionHeader eyebrow={t('app.publishedDetails')} title={t('app.gallery')} />
          <div className="app-scrollbar-none flex gap-3 overflow-x-auto pb-1">
            {gallery.map((image) => (
              <img
                key={image.id}
                src={image.url}
                alt={image.alt || title}
                className="h-28 w-40 shrink-0 rounded-[1rem] object-cover shadow-[var(--shadow-card)]"
              />
            ))}
          </div>
        </section>
      ) : null}
      <section className="space-y-3">
        <AppSectionHeader eyebrow={t('app.premium.events.ticket')} title={t('app.premium.events.accessOptions', 'Boletos disponibles')} />
        {ticketTypes.length === 0 ? (
          <EmptyState
            title={eventEnded
              ? t('app.premium.events.salesClosed', 'Venta cerrada')
              : t('app.premium.events.ticketPending')}
            description={eventEnded
              ? t('app.premium.events.eventEnded', 'Este evento ya terminó. Los boletos se cerraron automáticamente.')
              : t('app.premium.events.noTicketsConfigured', 'Hacienda publicará aquí boletos, precios y capacidad para reservar desde la app.')}
          />
        ) : (
          <div className="grid gap-3">
            {ticketTypes.map((ticket) => {
              const available = Math.min(ticketAvailable(ticket), eventAvailable)
              const quantity = available > 0 ? Math.min(quantityByTicket[ticket.id] ?? 1, available) : 0
              return (
                <article key={ticket.id} className="rounded-[1.2rem] border border-[rgba(220,202,181,0.78)] bg-white p-4 shadow-[0_14px_30px_rgba(74,32,28,0.06)]">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-[18px] leading-tight text-[var(--color-ink)]" style={{ fontFamily: 'var(--font-display)' }}>{ticket.name ?? t('app.premium.events.ticket')}</h3>
                      {ticket.description ? <p className="mt-1 text-[12px] leading-5 text-[var(--color-muted)]">{ticket.description}</p> : null}
                      <p className="mt-2 text-[13px] font-semibold text-[var(--color-burgundy)]">{formatCurrency(Number(ticket.price ?? 0), locale)}</p>
                      <p className="mt-1 text-[11px] text-[var(--color-muted)]">{available} {t('app.premium.reservation.spotsAvailable')}</p>
                    </div>
                    <Ticket className="shrink-0 text-[var(--color-gold)]" size={24} strokeWidth={1.45} />
                  </div>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-1 rounded-full border border-[rgba(104,13,36,0.13)] bg-[#fffaf5] p-1">
                      <button type="button" disabled={available < 1} onClick={() => setQuantityByTicket((current) => ({ ...current, [ticket.id]: Math.max(1, quantity - 1) }))} className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-burgundy)]"><Minus size={14} /></button>
                      <span className="w-7 text-center text-[12px] font-semibold text-[var(--color-ink)]">{quantity}</span>
                      <button type="button" disabled={available < 1} onClick={() => setQuantityByTicket((current) => ({ ...current, [ticket.id]: Math.min(available, quantity + 1) }))} className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-burgundy)] text-white disabled:opacity-50"><Plus size={14} /></button>
                    </div>
                    <PrimaryButton onClick={() => void addTicketToCart(ticket)} disabled={available < 1 || addingTicket === ticket.id}>
                      <ShoppingCart size={16} />
                      {addingTicket === ticket.id ? t('app.premium.reservation.processing') : t('app.premium.events.addTicket', 'Agregar boleto')}
                    </PrimaryButton>
                  </div>
                </article>
              )
            })}
          </div>
        )}
        {cartMessage ? <p className="rounded-[1rem] bg-[rgba(37,47,55,0.08)] p-3 text-[12px] text-[#252F37]">{cartMessage}</p> : null}
        {cartError ? <p className="rounded-[1rem] bg-[rgba(157,71,63,0.08)] p-3 text-[12px] text-[var(--color-alert)]">{cartError}</p> : null}
      </section>
    </div>
  )
}
