import { useMemo, useState } from 'react'
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
import {
  contentRouteId,
  formatCurrency,
  formatPublicDate,
  formatPublicTimeRange,
  imageField,
  numberField,
  textField,
} from '../../utils/publicContent'

export function EventsScreen() {
  const { t, isEnglish, locale } = useAppPreferences()
  const { records: events, loading, error, retry } = usePublicContent('events')
  const categories = useMemo(
    () =>
      isEnglish
        ? ['All', 'Festivals', 'Harvests', 'Gastronomy', 'Private']
        : ['Todos', 'Festivales', 'Vendimias', 'Gastronomía', 'Privados'],
    [isEnglish],
  )
  const [activeCategory, setActiveCategory] = useState(0)

  const filteredEvents = useMemo(() => {
    if (activeCategory === 0) return events
    const target = categories[activeCategory]?.toLocaleLowerCase('es-MX') ?? ''

    return events.filter((event) => {
      const searchable = [
        textField(event, 'title'),
        textField(event, 'event_type'),
        textField(event, 'description'),
      ].join(' ').toLocaleLowerCase('es-MX')

      if (target.includes('harvest') || target.includes('vendimia')) {
        return searchable.includes('vendimia')
      }

      if (target.includes('gastronom')) {
        return searchable.includes('cena') ||
          searchable.includes('gastronom') ||
          searchable.includes('maridaje')
      }

      if (target.includes('private') || target.includes('privado')) {
        return searchable.includes('privado') ||
          searchable.includes('boda') ||
          searchable.includes('corporativo')
      }

      return true
    })
  }, [activeCategory, categories, events])

  return (
    <div className="app-page space-y-6">
      <HeroEditorial
        eyebrow={t('app.premium.events.eyebrow')}
        title={t('app.premium.events.title')}
        subtitle={t('app.premium.events.subtitle')}
        image="/romantic%20dinners%20evento.webp"
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

            return (
              <EditorialCard
                key={event.id}
                to={appPath(`/eventos/${contentRouteId(event)}`)}
                image={imageField(event, '/romantic%20dinners%20evento.webp')}
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
