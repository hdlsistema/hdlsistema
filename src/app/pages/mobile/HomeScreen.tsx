import { Link } from 'react-router-dom'
import { CalendarDays, Grape, MapPin, Sparkles, Wine } from 'lucide-react'
import { useAuth } from '../../../contexts/AuthContext'
import {
  AppSectionHeader,
  EditorialCard,
  EmptyState,
  ErrorState,
  HeroEditorial,
  LoadingState,
  PrimaryButton,
  StatusBadge,
  WineCard,
} from '../../components/mobile/PremiumMobileUi'
import { useAppPreferences } from '../../context/AppPreferencesContext'
import { usePublicContent } from '../../hooks/usePublicContent'
import {
  contentRouteId,
  formatCurrency,
  imageField,
  numberField,
  textField,
} from '../../utils/publicContent'

function campaignContent(record: Record<string, unknown>) {
  const content = record.content
  return content && typeof content === 'object' && !Array.isArray(content)
    ? content as Record<string, unknown>
    : {}
}

function campaignText(record: Record<string, unknown>, key: string) {
  const value = campaignContent(record)[key]
  return typeof value === 'string' ? value.trim() : ''
}

function campaignImage(record: Record<string, unknown>) {
  return campaignText(record, 'image_url') ||
    campaignText(record, 'cover_image_url') ||
    textField(record, 'cover_image_url')
}

function campaignRoute(record: Record<string, unknown>) {
  const route = campaignContent(record).cta_path
  return typeof route === 'string' &&
    ['/app/tienda', '/app/experiencias', '/app/eventos', '/app/club', '/app/reservacion'].includes(route)
    ? route
    : '/app/tienda'
}

export function HomeScreen() {
  const { t, isEnglish, locale } = useAppPreferences()
  const { profile, user } = useAuth()
  const { records: wines, loading: loadingWines, error: winesError, retry: retryWines } = usePublicContent('wines')
  const { records: experiences, loading: loadingExperiences, error: experiencesError, retry: retryExperiences } = usePublicContent('experiences')
  const { records: events, loading: loadingEvents, error: eventsError, retry: retryEvents } = usePublicContent('events')
  const { records: promotions } = usePublicContent('promotions')
  const { records: plans } = usePublicContent('membership-plans')
  const { records: campaigns } = usePublicContent('campaigns')

  const firstName = profile?.first_name ||
    profile?.display_name?.split(' ')[0] ||
    user?.email?.split('@')[0] ||
    ''
  const featuredCampaign = campaigns[0]
  const featuredPromotion = promotions[0]

  return (
    <div className="space-y-7 pb-2">
      <HeroEditorial
        eyebrow={t('app.premium.home.eyebrow')}
        title={t('app.premium.home.title')}
        subtitle={t('app.premium.home.subtitle')}
        image="/Hacienda-de-Letras hacienda.jpg"
        alt="Hacienda de Letras"
        action={
          <PrimaryButton to="/app/experiencias" className="w-fit rounded-full px-4">
            {t('app.premium.experiences.reserve')}
            <Sparkles size={15} />
          </PrimaryButton>
        }
      />

      {firstName ? (
        <section className="rounded-[1.15rem] bg-[rgba(255,250,242,0.82)] p-4 shadow-[var(--shadow-soft)]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-gold)]">
            {t('app.premium.home.welcome')}
          </p>
          <h2
            className="mt-1 text-[1.55rem] leading-none text-[var(--color-ink)]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {t('app.premium.home.welcomeBack')}, {firstName}
          </h2>
        </section>
      ) : null}

      <section className="grid grid-cols-2 gap-3">
        {[
          { to: '/app/vinos', icon: Wine, title: t('app.nav.store'), copy: t('app.premium.home.wines') },
          { to: '/app/reservacion', icon: CalendarDays, title: t('app.nav.reservations'), copy: t('app.premium.home.reserveCopy') },
          { to: '/app/club', icon: Grape, title: t('app.premium.home.clubTitle'), copy: t('app.premium.home.clubCopy') },
          { to: '/app/mapa', icon: MapPin, title: t('app.premium.home.mapTitle'), copy: t('app.premium.home.mapCopy') },
        ].map((item) => {
          const Icon = item.icon
          return (
            <Link
              key={item.to}
              to={item.to}
              className="min-w-0 rounded-[1.1rem] bg-[rgba(255,250,242,0.82)] p-4 shadow-[var(--shadow-card)]"
            >
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-surface-warm)] text-[var(--color-burgundy)]">
                <Icon size={18} />
              </span>
              <h3 className="mt-3 truncate text-[14px] font-semibold text-[var(--color-ink)]">
                {item.title}
              </h3>
              <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-[var(--color-muted)]">
                {item.copy}
              </p>
            </Link>
          )
        })}
      </section>

      <section className="space-y-4">
        <AppSectionHeader
          eyebrow={t('app.premium.wines.eyebrow')}
          title={t('app.premium.home.wines')}
          action={
            <Link to="/app/vinos" className="text-[12px] font-semibold text-[var(--color-gold)]">
              {t('app.premium.viewAll')}
            </Link>
          }
        />
        {loadingWines ? (
          <LoadingState label={t('app.premium.wines.loading')} />
        ) : winesError ? (
          <ErrorState
            message={winesError}
            retryLabel={t('app.premium.retry')}
            onRetry={retryWines}
          />
        ) : wines.length === 0 ? (
          <EmptyState
            title={t('app.premium.contentPreparing')}
            description={t('app.premium.informationSoon')}
          />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {wines.slice(0, 4).map((wine, index) => (
              <WineCard
                key={wine.id}
                wine={{
                  id: contentRouteId(wine),
                  name: textField(wine, 'name', t('app.nav.store')),
                  kind: textField(wine, 'subtitle') || textField(wine, 'origin') || textField(wine, 'wine_type'),
                  price: numberField(wine, 'price') > 0
                    ? formatCurrency(numberField(wine, 'price'), locale)
                    : t('app.premium.pricePending'),
                  image: imageField(wine, '/Logo-HDL-2.svg'),
                  varietal: textField(wine, 'grape_variety'),
                }}
                badge={index === 0 ? t('app.premium.featured') : t('app.premium.selection')}
              />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <AppSectionHeader
          eyebrow={t('app.premium.experiences.eyebrow')}
          title={t('app.premium.home.experiences')}
          action={
            <Link to="/app/experiencias" className="text-[12px] font-semibold text-[var(--color-gold)]">
              {t('app.premium.viewAll')}
            </Link>
          }
        />
        {loadingExperiences ? (
          <LoadingState label={t('app.premium.experiences.loading')} />
        ) : experiencesError ? (
          <ErrorState
            message={experiencesError}
            retryLabel={t('app.premium.retry')}
            onRetry={retryExperiences}
          />
        ) : experiences.length === 0 ? (
          <EmptyState
            title={t('app.premium.contentPreparing')}
            description={t('app.premium.informationSoon')}
          />
        ) : (
          <div className="grid gap-3">
            {experiences.slice(0, 2).map((experience) => (
              <EditorialCard
                key={experience.id}
                to={`/app/experiencias/${contentRouteId(experience)}`}
                image={imageField(experience, '/turismo.jpeg')}
                eyebrow="Hacienda de Letras"
                title={textField(experience, 'title', t('app.nav.experiences'))}
                description={textField(experience, 'short_description') || textField(experience, 'description')}
                meta={
                  <StatusBadge>
                    {numberField(experience, 'base_price') > 0
                      ? formatCurrency(numberField(experience, 'base_price'), locale)
                      : t('app.premium.pricePending')}
                  </StatusBadge>
                }
                actionLabel={t('app.premium.experiences.details')}
              />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <AppSectionHeader
          eyebrow={t('app.premium.events.eyebrow')}
          title={t('app.premium.home.events')}
          action={
            <Link to="/app/eventos" className="text-[12px] font-semibold text-[var(--color-gold)]">
              {t('app.premium.open')}
            </Link>
          }
        />
        {loadingEvents ? (
          <LoadingState label={t('app.premium.events.loading')} />
        ) : eventsError ? (
          <ErrorState
            message={eventsError}
            retryLabel={t('app.premium.retry')}
            onRetry={retryEvents}
          />
        ) : events.length === 0 ? (
          <EmptyState
            title={t('app.premium.contentPreparing')}
            description={t('app.premium.informationSoon')}
          />
        ) : (
          <div className="grid gap-3">
            {events.slice(0, 2).map((event) => (
              <EditorialCard
                key={event.id}
                to={`/app/eventos/${contentRouteId(event)}`}
                image={imageField(event, '/romantic%20dinners%20evento.webp')}
                eyebrow={textField(event, 'venue') || 'Hacienda de Letras'}
                title={textField(event, 'title', t('app.nav.events'))}
                description={textField(event, 'short_description') || textField(event, 'description')}
                actionLabel={t('app.premium.events.details')}
              />
            ))}
          </div>
        )}
      </section>

      {featuredCampaign || featuredPromotion ? (
        <section className="grid gap-3">
          {featuredCampaign ? (
            <EditorialCard
              to={campaignRoute(featuredCampaign)}
              image={campaignImage(featuredCampaign) || '/Slide-1.webp'}
              eyebrow={isEnglish ? 'Published campaign' : 'Campaña publicada'}
              title={
                campaignText(featuredCampaign, 'title') ||
                textField(featuredCampaign, 'name', isEnglish ? 'Campaign' : 'Campaña')
              }
              description={campaignText(featuredCampaign, 'body') || textField(featuredCampaign, 'description')}
              actionLabel={campaignText(featuredCampaign, 'cta_label') || t('app.premium.open')}
            />
          ) : null}
          {featuredPromotion ? (
            <Link
              to="/app/tienda"
              className="rounded-[1.2rem] bg-[rgba(255,250,242,0.86)] p-5 shadow-[var(--shadow-card)]"
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-gold)]">
                {isEnglish ? 'Published promotion' : 'Promoción publicada'}
              </p>
              <h2
                className="mt-2 text-[1.7rem] leading-none text-[var(--color-ink)]"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {textField(featuredPromotion, 'title') || textField(featuredPromotion, 'name', 'Promoción')}
              </h2>
            </Link>
          ) : null}
        </section>
      ) : null}

      <section className="grid gap-3">
        <Link
          to="/app/club"
          className="rounded-[1.2rem] bg-[var(--color-burgundy-deep)] p-5 text-white shadow-[var(--shadow-float)]"
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#d7bd8e]">
            {t('app.premium.home.clubTitle')}
          </p>
          <h2
            className="mt-2 text-[1.8rem] leading-none"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {plans[0]
              ? textField(plans[0], 'name', t('app.premium.club.title'))
              : t('app.premium.club.title')}
          </h2>
          <p className="mt-3 text-[12px] leading-5 text-white/72">
            {t('app.premium.home.clubCopy')}
          </p>
        </Link>
        <Link
          to="/app/sommelier"
          className="rounded-[1.2rem] bg-[rgba(255,250,242,0.86)] p-5 shadow-[var(--shadow-card)]"
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-gold)]">
            {t('app.premium.home.sommelierTitle')}
          </p>
          <h2
            className="mt-2 text-[1.7rem] leading-none text-[var(--color-ink)]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {t('app.premium.contentPreparing')}
          </h2>
          <p className="mt-3 text-[12px] leading-5 text-[var(--color-muted)]">
            {t('app.premium.home.sommelierCopy')}
          </p>
        </Link>
      </section>
    </div>
  )
}
