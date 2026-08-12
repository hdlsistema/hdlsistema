import { Link } from 'react-router-dom'
import { ChevronRight, ConciergeBell, FileText, Grape, Languages, MapPin, Sparkles, Utensils } from 'lucide-react'
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
  const { t, locale, language, setLanguage } = useAppPreferences()
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
      icon: Sparkles,
      eyebrow: 'Vive la Hacienda',
      title: t('app.nav.experiences'),
      copy: commercial.experiences[0]?.shortDescription || 'Catas, recorridos y momentos únicos en Hacienda de Letras.',
    },
    {
      to: appPath('/cabanas'),
      icon: ConciergeBell,
      eyebrow: 'Hospedaje',
      title: 'Cabañas',
      copy: commercial.cabins[0]?.description || 'Paquetes de hospedaje con solicitud y confirmación operativa.',
    },
    {
      to: appPath('/restaurantes'),
      icon: Utensils,
      eyebrow: 'Gastronomía',
      title: 'Restaurantes',
      copy: commercial.restaurants[0]?.description || 'Reserva mesa en Hacienda de Letras.',
    },
    {
      to: appPath('/celebra'),
      icon: FileText,
      eyebrow: 'Celebra aquí',
      title: 'Solicitar cotización',
      copy: 'Haz de Hacienda de Letras el escenario de tu próxima historia.',
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
      icon: Sparkles,
      eyebrow: t('app.premium.home.sommelierTitle'),
      title: t('app.premium.contentPreparing'),
      copy: t('app.premium.home.sommelierCopy'),
    },
  ]

  return (
    <div className="pb-2">
      <section className="relative -mt-px min-h-[clamp(360px,72vh,480px)] overflow-hidden bg-[#2D1811]">
        <img
          src="/Hacienda-de-Letras hacienda.jpg"
          alt="Hacienda de Letras"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(35,20,15,0.05)_25%,rgba(35,20,15,0.75)_100%)]" />
        <div className="absolute right-[var(--app-pad)] top-4 z-10">
          <button
            type="button"
            onClick={() => setLanguage(language === 'es' ? 'en' : 'es')}
            className="inline-flex min-h-9 items-center gap-2 rounded-full border border-white/28 bg-white/18 px-3 text-[11px] font-semibold text-white shadow-[0_12px_28px_rgba(45,24,17,0.22)] backdrop-blur-xl"
            aria-label={t('common.language')}
          >
            <Languages size={14} />
            <span>{language === 'es' ? 'ES' : 'EN'}</span>
          </button>
        </div>
        <div className="relative flex min-h-[clamp(360px,72vh,480px)] flex-col justify-end px-[var(--app-pad)] pb-6 text-white">
          <p className="text-[10px] font-semibold uppercase text-[#E2C58E]">
            {t('app.premium.home.eyebrow')}
          </p>
          <h1
            className="mt-2 max-w-[18rem] text-[clamp(32px,9vw,42px)] leading-[0.95] text-white"
            style={{ fontFamily: 'var(--font-display)', overflowWrap: 'anywhere' }}
          >
            {t('app.premium.home.title')}
          </h1>
          <p className="mt-3 max-w-[18rem] text-[14px] leading-5 text-white/86">
            {t('app.premium.home.subtitle')}
          </p>
          <PrimaryButton to={appPath('/reservacion')} className="mt-5 rounded-[12px]">
            {t('app.premium.experiences.reserve')}
          </PrimaryButton>
        </div>
      </section>

      <div className="space-y-7 px-[var(--app-pad)]">
        <Link
          to={appPath('/vinos')}
          className="relative z-10 -mt-7 flex min-h-[88px] items-center justify-between gap-4 rounded-[16px] bg-[#FFF9F1] p-4 shadow-[0_16px_34px_rgba(58,32,18,0.13)]"
        >
          <span className="min-w-0">
            <span
              className="block text-[1.35rem] leading-none text-[#2D1811]"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {t('app.premium.home.wines')}
            </span>
            <span className="mt-2 block text-[12px] leading-4 text-[#776053]">
              {t('app.premium.home.winesCopy')}
            </span>
          </span>
          <ChevronRight size={18} className="shrink-0 text-[#690D2B]" />
        </Link>

        <section className="space-y-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase text-[#B88A4A]">
                {t('app.nav.store')}
              </p>
              <h2
                className="mt-1 text-[clamp(28px,7vw,34px)] leading-none text-[#2D1811]"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {t('app.premium.home.wines')}
              </h2>
            </div>
            <Link to={appPath('/vinos')} className="text-[12px] font-semibold text-[#690D2B]">
              {t('app.premium.viewAll')}
            </Link>
          </div>

          {loadingWines ? (
            <div className="app-scrollbar-none flex gap-3 overflow-x-auto pb-1">
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
            <div className="app-scrollbar-none flex gap-3 overflow-x-auto pb-1">
              {wines.slice(0, 4).map((wine) => (
                <Link
                  key={wine.id}
                  to={appPath(`/vinos/${contentRouteId(wine)}`)}
                  className="w-[156px] shrink-0 overflow-hidden rounded-[18px] border border-[rgba(184,138,74,0.18)] bg-[#FFF9F1] shadow-[0_14px_26px_rgba(58,32,18,0.08)]"
                >
                  <span className="block h-[132px] bg-[#2D1811]">
                    {imageField(wine, '') ? (
                      <img
                        src={imageField(wine, '')}
                        alt={textField(wine, 'name', 'Vino Hacienda de Letras')}
                        className="h-full w-full object-cover"
                      />
                    ) : null}
                  </span>
                  <span className="block min-h-[86px] p-3">
                    <span className="block text-[9px] font-semibold uppercase text-[#B88A4A]">
                      {textField(wine, 'category') || textField(wine, 'grape_variety') || 'Cava'}
                    </span>
                    <span
                      className="mt-1 line-clamp-2 block text-[18px] leading-none text-[#2D1811]"
                      style={{ fontFamily: 'var(--font-display)' }}
                    >
                      {textField(wine, 'name', 'Hacienda de Letras')}
                    </span>
                    <span className="mt-2 block text-[11px] font-semibold text-[#690D2B]">
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
            <p className="text-[10px] font-semibold uppercase text-[#B88A4A]">
              {t('app.premium.experiences.eyebrow')}
            </p>
            <h2
              className="mt-1 text-[clamp(28px,7vw,34px)] leading-none text-[#2D1811]"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {t('app.premium.home.experiences')}
            </h2>
          </div>

          {loadingExperiences ? (
            <div className="app-scrollbar-none flex gap-3 overflow-x-auto pb-1">
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
            <div className="app-scrollbar-none flex gap-3 overflow-x-auto pb-1">
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

        <section className="space-y-3">
          {modules.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.to}
                to={item.to}
                className="grid min-h-[112px] grid-cols-[36px_1fr_auto] items-center gap-3 rounded-[16px] border border-[rgba(184,138,74,0.16)] bg-[#FFF9F1] p-4"
              >
                <span className="inline-flex h-11 w-11 items-center justify-center text-[#B88A4A]">
                  <Icon size={24} strokeWidth={1.45} />
                </span>
                <span className="min-w-0">
                  <span className="block text-[9px] font-semibold uppercase text-[#B88A4A]">
                    {item.eyebrow}
                  </span>
                  <span
                    className="mt-1 block text-[clamp(18px,5vw,21px)] leading-none text-[#2D1811]"
                    style={{ fontFamily: 'var(--font-display)', overflowWrap: 'anywhere' }}
                  >
                    {item.title}
                  </span>
                  <span className="mt-2 line-clamp-2 block text-[11px] leading-4 text-[#776053]">
                    {item.copy}
                  </span>
                </span>
                <ChevronRight size={17} className="text-[#690D2B]" />
              </Link>
            )
          })}
        </section>
      </div>
    </div>
  )
}
