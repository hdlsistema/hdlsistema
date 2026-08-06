import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { CalendarDays, Clock3, MapPin, Ticket } from 'lucide-react'
import { publicContentClient, type ContentRecord } from '../../../services/content.service'
import { AppSectionHeader, BackButton, EmptyState, ErrorState, HeroEditorial, LoadingState, StatusBadge } from '../../components/mobile/PremiumMobileUi'
import { useAppPreferences } from '../../context/AppPreferencesContext'
import { formatCurrency, formatPublicDate, formatPublicTimeRange, imageField, numberField, textField } from '../../utils/publicContent'

export function EventDetailScreen() {
  const { eventId } = useParams()
  const { t, locale } = useAppPreferences()
  const [event, setEvent] = useState<ContentRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
      .getBySlug('events', eventId, locale)
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

  if (loading) return <LoadingState label={t('app.premium.events.loading')} />
  if (error || !event) return <ErrorState message={error ?? t('app.eventNotFound')} />

  const title = textField(event, 'title', t('app.nav.events'))
  const summary = textField(event, 'short_description') || textField(event, 'description') || t('app.premium.informationSoon')
  const price = numberField(event, 'price')
  const includedItems = summary.split('.').map((item) => item.trim()).filter(Boolean)

  return (
    <div className="space-y-6 pb-2">
      <BackButton label={t('app.premium.back')} />
      <HeroEditorial
        eyebrow={t('app.premium.events.eyebrow')}
        title={title}
        subtitle={summary}
        image={imageField(event, '/romantic%20dinners%20evento.webp')}
        alt={title}
      />
      <section className="grid grid-cols-2 gap-3">
        {[
          { icon: CalendarDays, label: t('app.premium.events.date'), value: formatPublicDate(event.start_at, locale, t('common.datePending')) },
          { icon: Clock3, label: t('app.premium.events.schedule'), value: formatPublicTimeRange(event.start_at, event.end_at, locale) },
          { icon: MapPin, label: t('app.location'), value: textField(event, 'venue', 'Hacienda de Letras') },
          { icon: Ticket, label: t('app.premium.events.ticket'), value: price > 0 ? formatCurrency(price, locale) : t('app.premium.events.ticketPending') },
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
    </div>
  )
}
