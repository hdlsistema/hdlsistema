import { Link } from 'react-router-dom'
import { Sparkles, Wine } from 'lucide-react'
import { AppSectionHeader, EmptyState, ErrorState, HeroEditorial, LoadingState, WineCard } from '../../components/mobile/PremiumMobileUi'
import { useAppPreferences } from '../../context/AppPreferencesContext'
import { usePublicContent } from '../../hooks/usePublicContent'
import { contentRouteId, formatCurrency, imageField, numberField, textField } from '../../utils/publicContent'

export function SommelierScreen() {
  const { t, locale } = useAppPreferences()
  const { records: wines, loading, error, retry } = usePublicContent('wines')

  return (
    <div className="space-y-6 pb-2">
      <HeroEditorial
        compact
        eyebrow={t('app.premium.home.sommelierTitle')}
        title={t('app.premium.contentPreparing')}
        subtitle={t('app.premium.home.sommelierCopy')}
        image="/hacienda 2.jpg"
        alt={t('app.premium.home.sommelierTitle')}
      />

      <section className="rounded-[1.15rem] bg-[rgba(255,250,242,0.86)] p-5 shadow-[var(--shadow-card)]">
        <Sparkles size={19} className="text-[var(--color-gold)]" />
        <p className="mt-3 text-[12px] leading-5 text-[var(--color-muted)]">
          {t('app.premium.home.sommelierCopy')}
        </p>
      </section>

      <section className="space-y-4">
        <AppSectionHeader eyebrow={t('app.premium.wines.eyebrow')} title={t('app.premium.wines.title')} />
        {loading ? (
          <LoadingState label={t('app.premium.wines.loading')} />
        ) : error ? (
          <ErrorState message={error} retryLabel={t('app.premium.retry')} onRetry={retry} />
        ) : wines.length === 0 ? (
          <EmptyState title={t('app.premium.contentPreparing')} description={t('app.premium.informationSoon')} />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {wines.slice(0, 4).map((wine) => {
              const price = numberField(wine, 'price')
              return (
                <WineCard
                  key={wine.id}
                  wine={{
                    id: contentRouteId(wine),
                    name: textField(wine, 'name', t('app.nav.store')),
                    kind: textField(wine, 'grape_variety') || textField(wine, 'origin'),
                    price: price > 0 ? formatCurrency(price, locale) : t('app.premium.pricePending'),
                    image: imageField(wine, '/Logo-HDL-2.svg'),
                  }}
                  badge={t('app.premium.selection')}
                />
              )
            })}
          </div>
        )}
      </section>

      <Link to="/app/vinos" className="flex min-h-12 items-center justify-center gap-2 rounded-[0.95rem] bg-[var(--color-burgundy)] px-5 text-[13px] font-semibold text-white">
        <Wine size={16} />
        {t('app.nav.store')}
      </Link>
    </div>
  )
}
