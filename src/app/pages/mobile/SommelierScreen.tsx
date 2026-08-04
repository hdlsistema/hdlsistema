import { Link } from 'react-router-dom'
import { Clock, ShoppingBag, Sparkles, Wine } from 'lucide-react'
import { SectionHeading } from '../../components/mobile/PremiumMobileUi'
import { useAppPreferences } from '../../context/AppPreferencesContext'
import { usePublicContent } from '../../hooks/usePublicContent'
import { contentRouteId, formatCurrency, imageField, numberField, textField } from '../../utils/publicContent'

export function SommelierScreen() {
  const { isEnglish } = useAppPreferences()
  const { records: wines, loading, error, retry } = usePublicContent('wines')
  const featuredWines = wines.slice(0, 3)

  return (
    <div className="space-y-5 pb-3">
      <section className="relative overflow-hidden rounded-[1.45rem] bg-[linear-gradient(135deg,#560e21,#8e2039)] p-5 text-white shadow-[0_20px_42px_rgba(90,14,34,0.23)]">
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full border border-white/10" />
        <div className="relative flex items-start gap-4">
          <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-[#d7b16d] bg-white/5 text-[#f0cf92]">
            <Sparkles size={23} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.17em] text-[#efcf93]">ALQIA Sommelier</p>
            <h1 className="mt-1 text-[2rem] leading-[0.92]" style={{ fontFamily: 'var(--font-display)' }}>
              {isEnglish ? 'Coming soon' : 'Próximamente'}
            </h1>
            <p className="mt-3 text-[12px] leading-5 text-white/[0.78]">
              {isEnglish
                ? 'OpenAI recommendations are not active yet. For now, this space only shows published wines from Hacienda de Letras.'
                : 'Las recomendaciones con OpenAI aún no están activas. Por ahora, este espacio solo muestra vinos publicados de Hacienda de Letras.'}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-[1.2rem] border border-[rgba(220,202,181,0.78)] bg-white p-4 text-[12px] leading-5 text-[var(--color-muted)] shadow-[0_14px_30px_rgba(74,32,28,0.06)]">
        <div className="flex items-start gap-3">
          <Clock size={17} className="mt-0.5 shrink-0 text-[var(--color-gold)]" />
          <p>
            {isEnglish
              ? 'This screen does not generate AI answers, pairings or recommendations until the Sommelier integration is approved.'
              : 'Esta pantalla no genera respuestas, maridajes ni recomendaciones de IA hasta aprobar la integración del Sommelier.'}
          </p>
        </div>
      </section>

      <section className="space-y-3">
        <SectionHeading
          eyebrow={isEnglish ? 'Published cellar' : 'Cava publicada'}
          title={isEnglish ? 'Wines available to explore' : 'Vinos disponibles para explorar'}
        />

        {loading ? (
          <article className="rounded-[1.25rem] border border-[rgba(220,202,181,0.78)] bg-white p-5 text-[12px] text-[var(--color-muted)]">
            {isEnglish ? 'Loading published wines...' : 'Cargando vinos publicados...'}
          </article>
        ) : error ? (
          <article className="rounded-[1.25rem] border border-[rgba(157,71,63,0.28)] bg-[rgba(157,71,63,0.08)] p-5 text-[12px] text-[var(--color-alert)]">
            <p>{error}</p>
            <button type="button" onClick={retry} className="mt-3 text-[12px] font-semibold text-[var(--color-burgundy)]">
              {isEnglish ? 'Retry' : 'Reintentar'}
            </button>
          </article>
        ) : featuredWines.length === 0 ? (
          <article className="rounded-[1.25rem] border border-[rgba(220,202,181,0.78)] bg-white p-5 text-[12px] text-[var(--color-muted)]">
            {isEnglish ? 'There are no published wines yet.' : 'Aún no hay vinos publicados.'}
          </article>
        ) : (
          featuredWines.map((wine) => (
            <article key={wine.id} className="grid grid-cols-[74px_minmax(0,1fr)] gap-3 rounded-[1.2rem] border border-[rgba(220,202,181,0.78)] bg-white p-3 shadow-[0_12px_26px_rgba(74,32,28,0.05)]">
              <div className="flex h-[96px] items-center justify-center rounded-[0.9rem] bg-[#f2e4d3]">
                <img
                  src={imageField(wine, '/Logo-HDL-2.svg')}
                  alt={textField(wine, 'name', isEnglish ? 'Wine' : 'Vino')}
                  className="max-h-[82px] w-auto object-contain"
                />
              </div>
              <div className="flex min-w-0 flex-col justify-center">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-gold)]">
                  {textField(wine, 'grape_variety') || textField(wine, 'category')}
                </p>
                <h3 className="mt-1 break-words text-[1.1rem] leading-none text-[var(--color-ink)]" style={{ fontFamily: 'var(--font-display)' }}>
                  {textField(wine, 'name', isEnglish ? 'Wine' : 'Vino')}
                </h3>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className="text-[13px] font-semibold text-[var(--color-burgundy)]">
                    {formatCurrency(numberField(wine, 'price'))}
                  </span>
                  <Link to={`/app/tienda/${contentRouteId(wine)}`} className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-burgundy)] px-3 py-2 text-[10px] font-semibold text-white">
                    <ShoppingBag size={12} />
                    {isEnglish ? 'View' : 'Ver'}
                  </Link>
                </div>
              </div>
            </article>
          ))
        )}
      </section>

      <Link
        to="/app/tienda"
        className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full bg-[var(--color-burgundy)] px-5 text-[13px] font-bold text-white shadow-[0_13px_26px_rgba(104,17,38,0.2)]"
      >
        <Wine size={16} />
        {isEnglish ? 'Open store' : 'Abrir tienda'}
      </Link>
    </div>
  )
}
