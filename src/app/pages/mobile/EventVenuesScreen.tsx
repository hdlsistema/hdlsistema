import { CalendarDays, ChevronRight, MapPinned } from 'lucide-react'
import { Link } from 'react-router-dom'
import { AppSectionHeader, ErrorState, HeroEditorial, LoadingState, StatusBadge } from '../../components/mobile/PremiumMobileUi'
import { useAppPreferences } from '../../context/AppPreferencesContext'
import { usePublicContent } from '../../hooks/usePublicContent'
import { appPath } from '../../utils/appRoutes'
import { EVENT_VENUES, eventMatchesVenue } from '../../utils/eventVenues'

export function EventVenuesScreen() {
  const { isEnglish, t } = useAppPreferences()
  const { records: events, loading, error, retry } = usePublicContent('grand-events')

  return (
    <div className="app-page space-y-6">
      <HeroEditorial
        eyebrow="Hacienda de Letras"
        title={isEnglish ? 'Our events' : 'Nuestros eventos'}
        subtitle={isEnglish
          ? 'Choose a venue and review the published events for that space.'
          : 'Elige una sede y revisa los eventos publicados para ese espacio.'}
        image="/hacienda-portada-landing.webp"
        alt={isEnglish ? 'Hacienda de Letras venues' : 'Sedes Hacienda de Letras'}
      />

      <section className="space-y-4">
        <AppSectionHeader
          eyebrow={isEnglish ? 'Venues' : 'Sedes'}
          title={isEnglish ? 'Where will you live it?' : 'Dónde lo quieres vivir'}
          action={<StatusBadge>{EVENT_VENUES.length}</StatusBadge>}
        />

        {loading ? (
          <LoadingState label={t('app.premium.events.loading')} />
        ) : error ? (
          <ErrorState message={error} retryLabel={t('app.premium.retry')} onRetry={retry} />
        ) : (
          <div className="grid gap-4">
            {EVENT_VENUES.map((venue) => {
              const count = events.filter((event) => eventMatchesVenue(event, venue.key)).length
              return (
                <Link
                  key={venue.key}
                  to={appPath(`/nuestros-eventos/${venue.key}`)}
                  className="group overflow-hidden rounded-[1.35rem] border border-[rgba(220,202,181,0.78)] bg-white shadow-[0_18px_42px_rgba(58,32,18,0.08)]"
                >
                  <span className="relative block h-[172px] bg-[#2D1811]">
                    <img src={venue.image} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
                    <span className="absolute inset-0 bg-[linear-gradient(180deg,rgba(45,24,17,0.04),rgba(45,24,17,0.58))]" />
                    <span className="absolute bottom-3 left-3 inline-flex min-h-8 items-center gap-2 rounded-full border border-white/34 bg-white/20 px-3 text-[11px] font-semibold text-white backdrop-blur-xl">
                      <CalendarDays size={14} />
                      {count} {isEnglish ? 'events' : 'eventos'}
                    </span>
                  </span>
                  <span className="grid grid-cols-[1fr_auto] items-center gap-3 p-4">
                    <span className="min-w-0">
                      <span className="flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--color-gold)]">
                        <MapPinned size={13} />
                        {venue.eyebrow}
                      </span>
                      <span
                        className="mt-2 block text-[24px] leading-none text-[var(--color-ink)]"
                        style={{ fontFamily: 'var(--font-display)' }}
                      >
                        {venue.title}
                      </span>
                      <span className="mt-2 line-clamp-2 block text-[12px] leading-5 text-[var(--color-muted)]">
                        {venue.description}
                      </span>
                    </span>
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[rgba(104,13,43,0.12)] bg-[#fff7ef] text-[var(--color-burgundy)]">
                      <ChevronRight size={18} />
                    </span>
                  </span>
                </Link>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
