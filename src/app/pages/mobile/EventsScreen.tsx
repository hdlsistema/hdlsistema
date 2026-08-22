import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  AppSectionHeader,
  EditorialCard,
  EmptyState,
  ErrorState,
  HeroEditorial,
  LoadingState,
  PillRow,
  StatusBadge,
} from '../../components/mobile/PremiumMobileUi'
import { useAppPreferences } from '../../context/AppPreferencesContext'
import { usePublicContent } from '../../hooks/usePublicContent'
import { appPath } from '../../utils/appRoutes'
import { eventKindLabel, eventMatchesVenue, eventVenueForRecord, venueByKey } from '../../utils/eventVenues'
import {
  contentRouteId,
  formatCurrency,
  formatPublicDate,
  formatPublicTimeRange,
  imageField,
  numberField,
  textField,
} from '../../utils/publicContent'

function metadataField(event: Record<string, unknown>, key: string) {
  const metadata = event.metadata
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return ''
  const value = (metadata as Record<string, unknown>)[key]
  return typeof value === 'string' || typeof value === 'number' ? String(value) : ''
}

export function EventsScreen() {
  const { t, isEnglish, locale } = useAppPreferences()
  const { venueId } = useParams<{ venueId: string }>()
  const { records: events, loading, error, retry } = usePublicContent('grand-events')
  const selectedVenue = venueByKey(venueId)
  const categories = useMemo(
    () =>
      isEnglish
        ? ['All', 'Special', 'Sunsets', 'Festivals', 'Harvests', 'Gastronomy', 'Races', 'Concerts']
        : ['Todos', 'Especiales', 'Atardeceres', 'Festivales', 'Vendimias', 'Gastronomía', 'Carreras', 'Conciertos'],
    [isEnglish],
  )
  const [activeCategory, setActiveCategory] = useState(0)

  const filteredEvents = useMemo(() => {
    const venueEvents = events.filter((event) => eventMatchesVenue(event, venueId))
    if (activeCategory === 0) return venueEvents
    const target = categories[activeCategory]?.toLocaleLowerCase('es-MX') ?? ''

    return venueEvents.filter((event) => {
      const searchable = [
        textField(event, 'title'),
        textField(event, 'event_type'),
        metadataField(event, 'event_kind'),
        metadataField(event, 'location_kind'),
        textField(event, 'description'),
      ].join(' ').toLocaleLowerCase('es-MX')

      if (target.includes('special') || target.includes('especial')) {
        return searchable.includes('special') || searchable.includes('especial')
      }

      if (target.includes('sunset') || target.includes('atardecer')) {
        return searchable.includes('atardecer') || searchable.includes('terraza')
      }

      if (target.includes('festival')) {
        return searchable.includes('festival')
      }

      if (target.includes('harvest') || target.includes('vendimia')) {
        return searchable.includes('vendimia')
      }

      if (target.includes('gastronom')) {
        return searchable.includes('cena') ||
          searchable.includes('gastronom') ||
          searchable.includes('maridaje')
      }

      if (target.includes('race') || target.includes('carrera')) {
        return searchable.includes('carrera') ||
          searchable.includes('race') ||
          searchable.includes('3k') ||
          searchable.includes('5k') ||
          searchable.includes('8k')
      }

      if (target.includes('concert') || target.includes('concierto')) {
        return searchable.includes('concierto') ||
          searchable.includes('concert') ||
          searchable.includes('musica') ||
          searchable.includes('música')
      }

      return true
    })
  }, [activeCategory, categories, events, venueId])
  const heroImage = selectedVenue?.image || imageField(events[0] ?? { id: 'events-hero' }, '')

  return (
    <div className="app-page space-y-6">
      <HeroEditorial
        eyebrow={selectedVenue?.eyebrow ?? t('app.premium.events.eyebrow')}
        title={selectedVenue?.title ?? t('app.premium.events.title')}
        subtitle={selectedVenue?.description ?? t('app.premium.events.subtitle')}
        image={heroImage}
        alt={t('app.nav.events')}
      />

      <section className="space-y-4">
        <AppSectionHeader
          eyebrow={t('app.premium.events.families')}
          title={t('app.nav.events')}
          action={<StatusBadge>{filteredEvents.length}</StatusBadge>}
        />
        <PillRow
          items={categories}
          activeIndex={activeCategory}
          onSelect={setActiveCategory}
        />
      </section>

      {loading ? (
        <LoadingState label={t('app.premium.events.loading')} />
      ) : error ? (
        <ErrorState
          message={error}
          retryLabel={t('app.premium.retry')}
          onRetry={retry}
        />
      ) : filteredEvents.length === 0 ? (
        <EmptyState
          title={t('app.premium.events.empty')}
          description={t('app.premium.contentPreparing')}
        />
      ) : (
        <section className="grid gap-4">
          {filteredEvents.map((event) => {
            const title = textField(event, 'title', t('app.nav.events'))
            const price = numberField(event, 'price')
            const venue = eventVenueForRecord(event)
            const kind = eventKindLabel(metadataField(event, 'event_kind'))

            return (
              <EditorialCard
                key={event.id}
                to={appPath(`/eventos-magnos/${contentRouteId(event)}`)}
                image={imageField(event, '')}
                eyebrow={formatPublicDate(
                  event.start_at,
                  locale,
                  t('common.datePending'),
                )}
                title={title}
                description={
                  textField(event, 'short_description') ||
                  textField(event, 'description') ||
                  t('app.premium.informationSoon')
                }
                actionLabel={t('app.premium.events.details')}
                meta={
                  <div className="flex flex-wrap items-center gap-2 text-[10px] text-[var(--color-muted)]">
                    <StatusBadge>{venue.title}</StatusBadge>
                    <StatusBadge>{kind}</StatusBadge>
                    <StatusBadge>
                      {price > 0
                        ? formatCurrency(price, locale)
                        : t('app.premium.events.ticketPending')}
                    </StatusBadge>
                    <span>
                      {formatPublicTimeRange(
                        event.start_at,
                        event.end_at,
                        locale,
                      )}
                    </span>
                  </div>
                }
              />
            )
          })}
        </section>
      )}
    </div>
  )
}
