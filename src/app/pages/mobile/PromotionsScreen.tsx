import {
  AppSectionHeader,
  EditorialCard,
  EmptyState,
  ErrorState,
  HeroEditorial,
  LoadingState,
  StatusBadge,
} from '../../components/mobile/PremiumMobileUi'
import { useAppPreferences } from '../../context/AppPreferencesContext'
import { usePublicContent } from '../../hooks/usePublicContent'
import type { AppLocale } from '../../i18n'
import { appPath } from '../../utils/appRoutes'
import {
  contentRouteId,
  formatCurrency,
  formatPublicDate,
  numberField,
  textField,
} from '../../utils/publicContent'

function discountLabel(type: string, value: number, locale: AppLocale) {
  if (value <= 0) return locale === 'en-US' ? 'Benefit' : 'Beneficio'
  if (type.toLowerCase().includes('percent') || type.includes('%')) return `${value}%`
  return formatCurrency(value, locale)
}

export function PromotionsScreen() {
  const { isEnglish, locale } = useAppPreferences()
  const { records: promotions, loading, error, retry } = usePublicContent('promotions')

  return (
    <div className="app-page space-y-6">
      <HeroEditorial
        eyebrow={isEnglish ? 'Published benefits' : 'Beneficios vigentes'}
        title={isEnglish ? 'Promotions' : 'Promociones'}
        subtitle={isEnglish ? 'Current offers published by Hacienda de Letras.' : 'Ofertas actuales publicadas por Hacienda de Letras.'}
        image="/Hacienda-de-Letras hacienda.jpg"
        alt={isEnglish ? 'Hacienda de Letras promotions' : 'Promociones Hacienda de Letras'}
        compact
      />

      <section className="space-y-4">
        <AppSectionHeader
          eyebrow={isEnglish ? 'Editorial catalog' : 'Catálogo editorial'}
          title={isEnglish ? 'Available promotions' : 'Promociones disponibles'}
          subtitle={isEnglish ? 'Only active publications authorized from Control Center appear here.' : 'Sólo aparecen publicaciones activas desde Centro de Control.'}
          action={<StatusBadge>{promotions.length}</StatusBadge>}
        />

        {loading ? (
          <LoadingState label={isEnglish ? 'Loading promotions...' : 'Cargando promociones...'} />
        ) : error ? (
          <ErrorState
            message={error}
            retryLabel={isEnglish ? 'Retry' : 'Reintentar'}
            onRetry={retry}
          />
        ) : promotions.length === 0 ? (
          <EmptyState
            title={isEnglish ? 'No promotions available' : 'Sin promociones disponibles'}
            description={isEnglish ? 'New benefits will appear when Hacienda publishes them.' : 'Los nuevos beneficios aparecerán cuando Hacienda los publique.'}
          />
        ) : (
          <div className="grid gap-4">
            {promotions.map((promotion) => {
              const title = textField(promotion, 'name', isEnglish ? 'Promotion' : 'Promoción')
              const discountType = textField(promotion, 'discount_type')
              const value = numberField(promotion, 'discount_value')
              const startsAt = formatPublicDate(promotion.starts_at, locale, isEnglish ? 'Start pending' : 'Inicio pendiente')
              const endsAt = formatPublicDate(promotion.ends_at, locale, isEnglish ? 'Open validity' : 'Vigencia abierta')
              const code = textField(promotion, 'code')
              const minimum = numberField(promotion, 'minimum_amount')

              return (
                <EditorialCard
                  key={promotion.id}
                  to={appPath(`/promociones#${contentRouteId(promotion)}`)}
                  title={title}
                  eyebrow={discountLabel(discountType, value, locale)}
                  description={textField(promotion, 'description') || (isEnglish ? 'Benefit published by Hacienda de Letras.' : 'Beneficio publicado por Hacienda de Letras.')}
                  actionLabel={isEnglish ? 'Review conditions' : 'Ver condiciones'}
                  meta={
                    <div className="flex flex-wrap items-center gap-2 text-[10px] text-[var(--color-muted)]">
                      {code ? <StatusBadge>{code}</StatusBadge> : null}
                      <StatusBadge>{startsAt}</StatusBadge>
                      <StatusBadge>{endsAt}</StatusBadge>
                      {minimum > 0 ? <span>{isEnglish ? 'Minimum' : 'Mínimo'} {formatCurrency(minimum, locale)}</span> : null}
                    </div>
                  }
                />
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
