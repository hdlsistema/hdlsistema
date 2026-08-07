import { useMemo, useState } from 'react'
import { Clock3, Users } from 'lucide-react'
import {
  EditorialCard,
  EmptyState,
  ErrorState,
  PillRow,
  Skeleton,
} from '../../components/mobile/PremiumMobileUi'
import { useAppPreferences } from '../../context/AppPreferencesContext'
import { usePublicContent } from '../../hooks/usePublicContent'
import { appPath } from '../../utils/appRoutes'
import { contentRouteId, formatCurrency, imageField, numberField, textField } from '../../utils/publicContent'

function normalize(value: string) {
  return value.toLocaleLowerCase('es-MX')
}

export function ExperiencesScreen() {
  const { t, isEnglish, locale } = useAppPreferences()
  const { records: experiences, loading, error, retry } = usePublicContent('experiences')
  const categories = useMemo(
    () => isEnglish
      ? ['All', 'Tastings', 'Tours', 'Gastronomy']
      : ['Todas', 'Catas', 'Recorridos', 'Gastronomía'],
    [isEnglish],
  )
  const [activeCategory, setActiveCategory] = useState(0)

  const filteredExperiences = useMemo(() => {
    if (activeCategory === 0) return experiences
    const category = normalize(categories[activeCategory] ?? '')
    return experiences.filter((experience) => {
      const target = normalize([
        textField(experience, 'title'),
        textField(experience, 'category'),
        textField(experience, 'description'),
      ].join(' '))
      if (category.includes('tasting') || category.includes('cata')) return target.includes('cata') || target.includes('tasting')
      if (category.includes('tour') || category.includes('recorrido')) return target.includes('recorrido') || target.includes('tour') || target.includes('viñedo')
      if (category.includes('gastronom')) return target.includes('gastronom') || target.includes('cena') || target.includes('maridaje')
      return true
    })
  }, [activeCategory, categories, experiences])

  return (
    <div className="space-y-6 px-[var(--app-pad)] pb-2 pt-3">
      <section className="relative min-h-[clamp(220px,52vh,320px)] overflow-hidden rounded-[20px] bg-[#2D1811] text-white">
        <img src="/turismo.jpeg" alt={t('app.nav.experiences')} className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(35,20,15,0.08),rgba(35,20,15,0.78))]" />
        <div className="relative flex min-h-[clamp(220px,52vh,320px)] flex-col justify-end px-[var(--app-pad)] pb-5 pt-8">
          <p className="text-[10px] font-semibold uppercase text-[#D7B67A]">{t('app.premium.experiences.eyebrow')}</p>
          <h1 className="mt-2 max-w-[18rem] text-[clamp(28px,7vw,34px)] leading-none text-white" style={{ fontFamily: 'var(--font-display)', overflowWrap: 'anywhere' }}>
            {t('app.premium.experiences.title')}
          </h1>
          <p className="mt-3 max-w-[18rem] text-[14px] leading-5 text-white/84">{t('app.premium.experiences.subtitle')}</p>
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <p className="text-[10px] font-semibold uppercase text-[#B88A4A]">{t('app.premium.experiences.choose')}</p>
          <h2 className="mt-1 text-[clamp(28px,7vw,34px)] leading-none text-[#2D1811]" style={{ fontFamily: 'var(--font-display)' }}>
            {t('app.nav.experiences')}
          </h2>
        </div>
        <PillRow items={categories} activeIndex={activeCategory} onSelect={setActiveCategory} />
      </section>

      {loading ? (
        <section className="grid gap-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-[148px]" />
          ))}
        </section>
      ) : error ? (
        <ErrorState message={t('app.premium.contentUnavailable')} retryLabel={t('app.premium.retry')} onRetry={retry} />
      ) : filteredExperiences.length === 0 ? (
        <EmptyState title={t('app.premium.experiences.empty')} description={t('app.premium.contentPreparing')} />
      ) : (
        <section className="grid gap-3">
          {filteredExperiences.map((experience) => {
            const title = textField(experience, 'title', t('app.nav.experiences'))
            const price = numberField(experience, 'base_price')
            const duration = numberField(experience, 'duration_minutes')
            const capacity = numberField(experience, 'capacity')
            return (
              <EditorialCard
                key={experience.id}
	                to={appPath(`/experiencias/${contentRouteId(experience)}`)}
                image={imageField(experience, '')}
                eyebrow={textField(experience, 'category') || 'Hacienda de Letras'}
                title={title}
                description={textField(experience, 'short_description') || textField(experience, 'description')}
                actionLabel={t('app.premium.experiences.details')}
                meta={
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-[#776053]">
                    <span className="font-semibold text-[#690D2B]">{price > 0 ? formatCurrency(price, locale) : t('app.premium.pricePending')}</span>
                    {duration > 0 ? <span className="inline-flex items-center gap-1"><Clock3 size={12} />{duration} {t('app.minutes')}</span> : null}
                    {capacity > 0 ? <span className="inline-flex items-center gap-1"><Users size={12} />{capacity}</span> : null}
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
