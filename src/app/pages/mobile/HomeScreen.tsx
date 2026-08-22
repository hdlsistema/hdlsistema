import { Link } from 'react-router-dom'
import { BedDouble, CalendarDays, ChevronRight, Compass, FileText, Grape, Languages, MapPin, MessagesSquare, UtensilsCrossed } from 'lucide-react'
import {
  EditorialCard,
  EmptyState,
  ErrorState,
  PrimaryButton,
  Skeleton,
  StatusBadge,
} from '../../components/mobile/PremiumMobileUi'
import { useAppPreferences } from '../../context/AppPreferencesContext'
import { usePublicCommercialServices } from '../../hooks/usePublicCommercialServices'
import { usePublicContent } from '../../hooks/usePublicContent'
import { appPath } from '../../utils/appRoutes'
import {
  contentRouteId,
  formatCurrency,
  imageField,
  numberField,
  textField,
} from '../../utils/publicContent'

export function HomeScreen() {
  const { t, locale, language, isEnglish, setLanguage } = useAppPreferences()
  const { records: wines, loading: loadingWines, error: winesError, retry: retryWines } = usePublicContent('wines')
  const { records: experiences, loading: loadingExperiences, error: experiencesError, retry: retryExperiences } = usePublicContent('experiences')
  const { records: plans } = usePublicContent('membership-plans')
  const {
    services: commercial,
    error: commercialError,
    retry: retryCommercial,
  } = usePublicCommercialServices()

  const modules = [
    {
      to: appPath('/experiencias'),
      icon: Compass,
      eyebrow: isEnglish ? 'Live the Hacienda' : 'Vive la Hacienda',
      title: t('app.nav.experiences'),
      copy: commercial.experiences[0]?.shortDescription || (isEnglish ? 'Tastings, tours and unique moments at Hacienda de Letras.' : 'Catas, recorridos y momentos únicos en Hacienda de Letras.'),
    },
    {
      to: appPath('/nuestros-eventos'),
      icon: CalendarDays,
      eyebrow: isEnglish ? 'Venues and tickets' : 'Sedes y boletos',
      title: isEnglish ? 'Our events' : 'Nuestros eventos',
      copy: isEnglish ? 'Choose a venue and review grand events published by Hacienda.' : 'Elige una sede y revisa los eventos magnos publicados por Hacienda.',
    },
    {
      to: appPath('/cabanas'),
      icon: BedDouble,
      eyebrow: isEnglish ? 'Lodging' : 'Hospedaje',
      title: isEnglish ? 'Cabins' : 'Cabañas',
      copy: commercial.cabins[0]?.description || (isEnglish ? 'Lodging packages with confirmed availability.' : 'Paquetes de hospedaje con solicitud y confirmación operativa.'),
    },
    {
      to: appPath('/restaurantes'),
      icon: UtensilsCrossed,
      eyebrow: isEnglish ? 'Dining' : 'Gastronomía',
      title: isEnglish ? 'Restaurants' : 'Restaurantes',
      copy: commercial.restaurants[0]?.description || (isEnglish ? 'Request a table at Hacienda de Letras.' : 'Reserva mesa en Hacienda de Letras.'),
    },
    {
      to: appPath('/celebra'),
      icon: FileText,
      eyebrow: isEnglish ? 'Celebrate here' : 'Celebra aquí',
      title: isEnglish ? 'Request a quote' : 'Solicitar cotización',
      copy: isEnglish ? 'Make Hacienda de Letras the setting for your next story.' : 'Haz de Hacienda de Letras el escenario de tu próxima historia.',
    },
    {
      to: appPath('/membresias'),
      icon: Grape,
      eyebrow: t('app.premium.home.clubTitle'),
      title: plans[0]
        ? textField(plans[0], 'name', t('app.premium.home.clubTitle'))
        : t('app.premium.home.clubTitle'),
      copy: t('app.premium.home.clubCopy'),
    },
    {
      to: appPath('/mapa'),
      icon: MapPin,
      eyebrow: t('app.premium.home.mapTitle'),
      title: t('app.nav.map'),
      copy: t('app.premium.home.mapCopy'),
    },
    {
      to: appPath('/sommelier'),
      icon: MessagesSquare,
      eyebrow: t('app.premium.home.sommelierTitle'),
      title: t('app.premium.home.sommelierTitle'),
      copy: t('app.premium.home.sommelierCopy'),
    },
  ]

  return (
    <div className="ipad-home-screen pb-2">
      <section className="ipad-home-hero relative -mt-px min-h-[clamp(330px,64vh,430px)] overflow-hidden bg-[var(--color-ink)]">
        <img
          src="/Hacienda-de-Letras hacienda.jpg"
          alt="Hacienda de Letras"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(37,47,55,0.08)_18%,rgba(104,17,38,0.78)_100%)]" />
        <div className="absolute right-[var(--app-pad)] top-4 z-10">
          <button
            type="button"
            onClick={() => setLanguage(language === 'es' ? 'en' : 'es')}
            className="inline-flex min-h-9 items-center gap-2 rounded-full border border-[rgba(247,242,234,0.32)] bg-[rgba(37,47,55,0.26)] px-3 text-[11px] font-semibold text-[#F7F2EA] shadow-[0_12px_28px_rgba(37,47,55,0.22)] backdrop-blur-xl"
            aria-label={t('common.language')}
          >
            <Languages size={14} />
            <span>{language === 'es' ? 'ES' : 'EN'}</span>
          </button>
        </div>
        <div className="relative flex min-h-[clamp(330px,64vh,430px)] flex-col justify-end px-[var(--app-pad)] pb-6 text-white">
          <p className="text-[10px] font-semibold uppercase text-[#F7DFAE]">
            {t('app.premium.home.eyebrow')}
          </p>
          <h1
            className="mt-2 max-w-[18rem] text-[clamp(27px,7.4vw,36px)] font-medium leading-[0.98] text-white"
            style={{ fontFamily: 'var(--font-display)', overflowWrap: 'anywhere' }}
          >
            {t('app.premium.home.title')}
          </h1>
          <p className="mt-3 max-w-[18rem] text-[12px] leading-5 text-white/86">
            {t('app.premium.home.subtitle')}
          </p>
          <PrimaryButton to={appPath('/reservacion')} className="mt-5 rounded-[12px]">
            {t('app.premium.experiences.reserve')}
          </PrimaryButton>
        </div>
      </section>

      <div className="ipad-home-content space-y-7 px-[var(--app-pad)]">
        <Link
          to={appPath('/vinos')}
          className="relative z-10 -mt-7 flex min-h-[84px] items-center justify-between gap-4 rounded-[20px] border border-[rgba(180,138,85,0.34)] bg-[linear-gradient(135deg,rgba(247,242,234,0.92),rgba(232,216,200,0.76))] p-4 shadow-[0_18px_42px_rgba(37,47,55,0.11),inset_0_1px_0_rgba(255,255,255,.72)] backdrop-blur-xl"
        >
          <span className="min-w-0">
            <span
              className="block text-[1.35rem] leading-none text-[var(--color-ink)]"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {t('app.premium.home.wines')}
            </span>
            <span className="mt-2 block text-[12px] leading-4 text-[var(--color-muted)]">
              {t('app.premium.home.winesCopy')}
            </span>
          </span>
          <ChevronRight size={18} className="shrink-0 text-[var(--color-burgundy)]" />
        </Link>

        <section className="space-y-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase text-[var(--color-gold)]">
                {t('app.nav.store')}
              </p>
              <h2
                className="mt-1 text-[clamp(23px,6vw,29px)] font-medium leading-none text-[var(--color-ink)]"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {t('app.premium.home.wines')}
              </h2>
            </div>
            <Link to={appPath('/vinos')} className="text-[12px] font-semibold text-[var(--color-burgundy)]">
              {t('app.premium.viewAll')}
            </Link>
          </div>

          {loadingWines ? (
            <div className="ipad-home-wines app-scrollbar-none flex gap-3 overflow-x-auto pb-1">
              <Skeleton className="h-[210px] w-[156px] shrink-0" />
              <Skeleton className="h-[210px] w-[156px] shrink-0" />
            </div>
          ) : winesError ? (
            <ErrorState
              message={t('app.premium.contentUnavailable')}
              retryLabel={t('app.premium.retry')}
              onRetry={retryWines}
            />
          ) : wines.length === 0 ? (
            <EmptyState
              title={t('app.premium.contentPreparing')}
              description={t('app.premium.informationSoon')}
            />
          ) : (
            <div className="ipad-home-wines app-scrollbar-none flex gap-3 overflow-x-auto pb-1">
              {wines.slice(0, 4).map((wine) => (
                <Link
                  key={wine.id}
                  to={appPath(`/vinos/${contentRouteId(wine)}`)}
                  className="w-[156px] shrink-0 overflow-hidden rounded-[18px] border border-[rgba(180,138,85,0.26)] bg-[linear-gradient(145deg,#F7F2EA,rgba(232,216,200,0.72))] shadow-[0_14px_26px_rgba(37,47,55,0.08)]"
                >
                  <span className="block h-[132px] bg-[var(--color-ink)]">
                    {imageField(wine, '') ? (
                      <img
                        src={imageField(wine, '')}
                        alt={textField(wine, 'name', 'Vino Hacienda de Letras')}
                        className="h-full w-full object-cover"
                      />
                    ) : null}
                  </span>
                  <span className="block min-h-[86px] p-3">
                    <span className="block text-[9px] font-semibold uppercase text-[var(--color-gold)]">
                      {textField(wine, 'category') || textField(wine, 'grape_variety') || 'Cava'}
                    </span>
                    <span
                      className="mt-1 line-clamp-2 block text-[18px] leading-none text-[var(--color-ink)]"
                      style={{ fontFamily: 'var(--font-display)' }}
                    >
                      {textField(wine, 'name', 'Hacienda de Letras')}
                    </span>
                    <span className="mt-2 block text-[11px] font-semibold text-[var(--color-burgundy)]">
                      {formatCurrency(numberField(wine, 'price'), locale)}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-4">
          <div>
            <p className="text-[10px] font-semibold uppercase text-[var(--color-gold)]">
              {t('app.premium.experiences.eyebrow')}
            </p>
            <h2
              className="mt-1 text-[clamp(23px,6vw,29px)] font-medium leading-none text-[var(--color-ink)]"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {t('app.premium.home.experiences')}
            </h2>
          </div>

          {loadingExperiences ? (
            <div className="ipad-home-experiences app-scrollbar-none flex gap-3 overflow-x-auto pb-1">
              <Skeleton className="h-[160px] w-[min(86%,340px)] shrink-0" />
              <Skeleton className="h-[160px] w-[min(86%,340px)] shrink-0" />
            </div>
          ) : experiencesError ? (
            <ErrorState
              message={t('app.premium.contentUnavailable')}
              retryLabel={t('app.premium.retry')}
              onRetry={retryExperiences}
            />
          ) : experiences.length === 0 ? (
            <EmptyState
              title={t('app.premium.contentPreparing')}
              description={t('app.premium.informationSoon')}
            />
          ) : (
            <div className="ipad-home-experiences app-scrollbar-none flex gap-3 overflow-x-auto pb-1">
              {experiences.slice(0, 4).map((experience) => (
                <div key={experience.id} className="w-[min(86%,340px)] shrink-0">
                  <EditorialCard
                    to={appPath(`/experiencias/${contentRouteId(experience)}`)}
                    image={imageField(experience, '')}
                    eyebrow={textField(experience, 'category') || 'Hacienda de Letras'}
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
                </div>
              ))}
            </div>
          )}
        </section>

        {commercialError ? (
          <ErrorState
            message={commercialError}
            retryLabel={t('app.premium.retry')}
            onRetry={retryCommercial}
          />
        ) : null}

        <section className="ipad-home-modules space-y-3">
          {modules.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.to}
                to={item.to}
                className="grid min-h-[104px] grid-cols-[40px_1fr_auto] items-center gap-3 rounded-[20px] border border-[rgba(180,138,85,0.28)] bg-[linear-gradient(145deg,rgba(247,242,234,0.9),rgba(232,216,200,0.66))] p-4 shadow-[0_14px_34px_rgba(37,47,55,.07),inset_0_1px_0_rgba(255,255,255,.72)] backdrop-blur-xl"
              >
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[rgba(180,138,85,0.34)] bg-[rgba(37,47,55,0.08)] text-[var(--color-burgundy)] shadow-[0_8px_18px_rgba(37,47,55,.08)]">
                  <Icon size={18} strokeWidth={1.45} />
                </span>
                <span className="min-w-0">
                  <span className="block text-[9px] font-semibold uppercase text-[var(--color-gold)]">
                    {item.eyebrow}
                  </span>
                  <span
                    className="mt-1 block text-[clamp(17px,4.6vw,19px)] font-medium leading-none text-[var(--color-ink)]"
                    style={{ fontFamily: 'var(--font-display)', overflowWrap: 'anywhere' }}
                  >
                    {item.title}
                  </span>
                  <span className="mt-2 line-clamp-2 block text-[11px] leading-4 text-[var(--color-muted)]">
                    {item.copy}
                  </span>
                </span>
                <ChevronRight size={17} className="text-[var(--color-burgundy)]" />
              </Link>
            )
          })}
        </section>
      </div>
    </div>
  )
}
