import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { CalendarDays, Check, Clock3, MapPin, Minus, Plus, Ticket } from 'lucide-react'
import { PrimaryButton } from '../../components/mobile/PremiumMobileUi'
import { useAppPreferences } from '../../context/AppPreferencesContext'
import { publicContentClient, type ContentRecord } from '../../../services/content.service'
import {
  formatCurrency,
  formatPublicDate,
  formatPublicTimeRange,
  imageField,
  numberField,
  textField,
} from '../../utils/publicContent'

export function EventDetailScreen() {
  const { eventId } = useParams()
  const { isEnglish } = useAppPreferences()
  const [event, setEvent] = useState<ContentRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [quantity, setQuantity] = useState(1)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)

    if (!eventId) {
      setEvent(null)
      setError(isEnglish ? 'Event not found.' : 'Evento no encontrado.')
      setLoading(false)
      return
    }

    publicContentClient
      .getBySlug('events', eventId, 'es-MX')
      .then((response) => {
        if (active) setEvent(response.data)
      })
      .catch(() => {
        if (active) {
          setEvent(null)
          setError(isEnglish ? 'Event not available.' : 'Evento no disponible.')
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [eventId, isEnglish])

  if (loading) {
    return (
      <div className="rounded-[1.3rem] border border-[rgba(220,202,181,0.78)] bg-white p-6 text-[13px] text-[var(--color-muted)]">
        {isEnglish ? 'Loading event...' : 'Cargando evento...'}
      </div>
    )
  }

  if (error || !event) {
    return (
      <div className="rounded-[1.3rem] border border-[rgba(157,71,63,0.28)] bg-[rgba(157,71,63,0.08)] p-6 text-[13px] text-[var(--color-alert)]">
        {error}
      </div>
    )
  }

  const eventTitle = textField(event, 'title', isEnglish ? 'Event' : 'Evento')
  const eventSummary = textField(event, 'short_description') || textField(event, 'description')
  const eventDate = formatPublicDate(event.start_at)
  const eventSchedule = formatPublicTimeRange(event.start_at, event.end_at)
  const eventVenue = textField(event, 'venue', 'Hacienda de Letras')
  const eventPriceAmount = numberField(event, 'price')
  const eventPrice = eventPriceAmount > 0
    ? formatCurrency(eventPriceAmount)
    : (isEnglish ? 'Access to be confirmed' : 'Acceso por confirmar')
  const includedItems = eventSummary
    ? eventSummary.split('.').map((item) => item.trim()).filter(Boolean)
    : [isEnglish ? 'Information to be confirmed' : 'Información por confirmar']

  return (
    <div className="space-y-6 pb-3">
      <section className="relative min-h-[320px] overflow-hidden rounded-[1.55rem] shadow-[0_24px_50px_rgba(49,19,19,0.2)]">
        <img src={imageField(event, '/romantic%20dinners%20evento.webp')} alt={eventTitle} className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(27,8,11,0.05),rgba(27,8,11,0.84))]" />
        <div className="absolute inset-x-0 bottom-0 p-5 text-white">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.14] px-3 py-1.5 text-[10px] backdrop-blur-sm">
            <CalendarDays size={12} />
            {isEnglish ? 'Special event' : 'Evento especial'}
          </span>
          <h1 className="mt-3 text-[2.6rem] leading-[0.88]" style={{ fontFamily: 'var(--font-display)' }}>
            {eventTitle}
          </h1>
          <p className="mt-3 text-[13px] leading-5 text-white/[0.82]">{eventSummary}</p>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3">
        {[
          { icon: CalendarDays, label: isEnglish ? 'Date' : 'Fecha', value: eventDate },
          { icon: Clock3, label: isEnglish ? 'Schedule' : 'Horario', value: eventSchedule },
          { icon: MapPin, label: isEnglish ? 'Venue' : 'Lugar', value: eventVenue },
          { icon: Ticket, label: isEnglish ? 'Ticket' : 'Entrada', value: eventPrice },
        ].map((item) => {
          const Icon = item.icon
          return (
            <article key={item.label} className="min-w-0 rounded-[1.15rem] border border-[rgba(220,202,181,0.78)] bg-white p-4 shadow-[0_12px_28px_rgba(74,32,28,0.05)]">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#f7ece2] text-[var(--color-burgundy)]">
                <Icon size={17} />
              </span>
              <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.13em] text-[var(--color-gold)]">{item.label}</p>
              <p className="mt-1 break-words text-[13px] font-semibold leading-5 text-[var(--color-ink)]">{item.value}</p>
            </article>
          )
        })}
      </section>

      <section className="rounded-[1.3rem] border border-[rgba(220,202,181,0.78)] bg-white p-5 shadow-[0_16px_34px_rgba(74,32,28,0.06)]">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-gold)]">{isEnglish ? 'Your ticket includes' : 'Tu entrada incluye'}</p>
        <div className="mt-4 space-y-3">
          {includedItems.map((item) => (
            <div key={item} className="flex items-start gap-3 text-[13px] leading-5 text-[var(--color-ink)]">
              <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#f4e5d8] text-[var(--color-burgundy)]">
                <Check size={12} />
              </span>
              <span>{item.trim()}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[1.3rem] border border-[rgba(220,202,181,0.78)] bg-[linear-gradient(145deg,#fffaf5,#f5e6d4)] p-5 shadow-[0_16px_34px_rgba(74,32,28,0.06)]">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[11px] text-[var(--color-muted)]">{isEnglish ? 'Price per person' : 'Precio por persona'}</p>
            <p className="mt-1 text-[1.85rem] leading-none text-[var(--color-burgundy)]" style={{ fontFamily: 'var(--font-display)' }}>
              {eventPrice}
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-[rgba(104,13,36,0.14)] bg-white p-1.5">
            <button
              type="button"
              aria-label={isEnglish ? 'Decrease quantity' : 'Disminuir cantidad'}
              onClick={() => setQuantity((current) => Math.max(1, current - 1))}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[var(--color-burgundy)]"
            >
              <Minus size={16} />
            </button>
            <span className="w-7 text-center text-[14px] font-semibold text-[var(--color-ink)]">{quantity}</span>
            <button
              type="button"
              aria-label={isEnglish ? 'Increase quantity' : 'Aumentar cantidad'}
              onClick={() => setQuantity((current) => current + 1)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-burgundy)] text-white"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>
        <div className="mt-5">
          <PrimaryButton to="/app/carrito">{isEnglish ? 'Buy tickets' : 'Comprar boletos'}</PrimaryButton>
        </div>
      </section>
    </div>
  )
}
