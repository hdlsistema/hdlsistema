import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, Clock3, Users } from 'lucide-react'
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
import { contentRouteId, formatCurrency, imageField, numberField, textField } from '../../utils/publicContent'

function normalize(value: string) {
  return value.toLocaleLowerCase('es-MX')
}

export function ExperiencesScreen() {
  const { t, isEnglish, locale } = useAppPreferences()
  const { records: experiences, loading, error, retry } = usePublicContent('experiences')
  const categories = useMemo(
    () => isEnglish
      ? ['All', 'Tastings', 'Tours', 'Gastronomy', 'Special']
      : ['Todas', 'Catas', 'Recorridos', 'Gastronomía', 'Especiales'],
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
    <div className="space-y-6 pb-2">
      <HeroEditorial
        eyebrow={t('app.premium.experiences.eyebrow')}
        title={t('app.premium.experiences.title')}
        subtitle={t('app.premium.experiences.subtitle')}
        image="/turismo.jpeg"
        alt={t('app.nav.experiences')}
      />

      <section className="space-y-4">
        <AppSectionHeader
          eyebrow={t('app.premium.experiences.choose')}
          title={t('app.nav.experiences')}
          action={<StatusBadge>{filteredExperiences.length}</StatusBadge>}
        />
        <PillRow items={categories} activeIndex={activeCategory} onSelect={setActiveCategory} />
      </section>

      {loading ? (
        <LoadingState label={t('app.premium.experiences.loading')} />
      ) : error ? (
        <ErrorState message={error} retryLabel={t('app.premium.retry')} onRetry={retry} />
      ) : filteredExperiences.length === 0 ? (
        <EmptyState title={t('app.premium.experiences.empty')} description={t('app.premium.contentPreparing')} />
      ) : (
        <section className="grid gap-4">
          {filteredExperiences.map((experience) => {
            const title = textField(experience, 'title', t('app.nav.experiences'))
            const price = numberField(experience, 'base_price')
            const duration = numberField(experience, 'duration_minutes')
            const capacity = numberField(experience, 'capacity')
            return (
              <EditorialCard
                key={experience.id}
                to={`/app/experiencias/${contentRouteId(experience)}`}
                image={imageField(experience, '/turismo.jpeg')}
                eyebrow="Hacienda de Letras"
                title={title}
                description={textField(experience, 'short_description') || textField(experience, 'description') || t('app.premium.informationSoon')}
                actionLabel={t('app.premium.experiences.details')}
                meta={
                  <div className="grid grid-cols-3 gap-2 text-[10px] text-[var(--color-muted)]">
                    <StatusBadge>{price > 0 ? formatCurrency(price, locale) : t('app.premium.pricePending')}</StatusBadge>
                    <span className="inline-flex items-center gap-1"><Clock3 size={12} />{duration > 0 ? `${duration} ${t('app.minutes')}` : t('app.premium.informationSoon')}</span>
                    <span className="inline-flex items-center gap-1"><Users size={12} />{capacity > 0 ? `${capacity}` : t('app.premium.availabilityPending')}</span>
                  </div>
                }
              />
            )
          })}
        </section>
      )}

      <section className="rounded-[1.2rem] bg-[var(--color-burgundy-deep)] p-5 text-white shadow-[var(--shadow-float)]">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#d7bd8e]">Hacienda de Letras</p>
        <h2 className="mt-2 text-[1.75rem] leading-none" style={{ fontFamily: 'var(--font-display)' }}>
          {t('app.premium.home.reserveTitle')}
        </h2>
        <p className="mt-3 text-[12px] leading-5 text-white/72">{t('app.premium.home.reserveCopy')}</p>
        <Link to="/app/reservacion" className="mt-4 inline-flex items-center gap-2 text-[12px] font-semibold text-[#d7bd8e]">
          <CalendarDays size={14} />
          {t('app.premium.experiences.reserve')}
        </Link>
      </section>
    </div>
  )
}
