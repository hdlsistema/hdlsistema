import { Link } from 'react-router-dom'
import { Grape, SlidersHorizontal, Sparkles } from 'lucide-react'
import { PillRow, SearchField, SectionHeading, WineCard } from '../../components/mobile/PremiumMobileUi'
import { wines } from '../../data/wines'
import { useAppPreferences } from '../../context/AppPreferencesContext'

export function StoreScreen() {
  const { isEnglish } = useAppPreferences()
  return (
    <div className="space-y-6 pb-3">
      <section className="overflow-hidden rounded-[1.45rem] border border-[rgba(220,202,181,0.78)] bg-[linear-gradient(135deg,#fffaf4,#f2dfc9)] p-5 shadow-[0_18px_38px_rgba(74,32,28,0.08)]">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--color-gold)]">{isEnglish ? 'Wine boutique' : 'Boutique de vinos'}</p>
        <h1 className="mt-2 text-[2.15rem] leading-[0.92] text-[var(--color-burgundy)]" style={{ fontFamily: 'var(--font-display)' }}>
          {isEnglish ? 'Our selection' : 'Nuestra selección'}
        </h1>
        <p className="mt-3 max-w-[290px] text-[13px] leading-5 text-[var(--color-muted)]">
          {isEnglish
            ? 'Labels with the identity of Aguascalientes, chosen to share, give and remember.'
            : 'Etiquetas con identidad de Aguascalientes, elegidas para compartir, regalar y recordar.'}
        </p>
      </section>

      <SearchField placeholder={isEnglish ? 'Search wine, grape or label' : 'Buscar vino, uva o etiqueta'} />

      <section className="space-y-3">
        <PillRow
          items={isEnglish
            ? ['All', 'Reds', 'Whites', 'Rosés', 'Sparkling']
            : ['Todos', 'Tintos', 'Blancos', 'Rosados', 'Espumosos']}
          activeIndex={0}
        />
        <div className="flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button type="button" className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[rgba(220,202,181,0.78)] bg-white px-4 py-2 text-[11px] text-[var(--color-muted)]">
            <SlidersHorizontal size={13} />
            {isEnglish ? 'Filters' : 'Filtros'}
          </button>
          {(isEnglish
            ? ['Grape', 'Price', 'Vintage', 'Pairing']
            : ['Uva', 'Precio', 'Cosecha', 'Maridaje']
          ).map((filter) => (
            <button key={filter} type="button" className="shrink-0 rounded-full border border-[rgba(220,202,181,0.78)] bg-white px-4 py-2 text-[11px] text-[var(--color-muted)]">
              {filter}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <SectionHeading
          eyebrow={isEnglish ? 'Hacienda de Letras Cellar' : 'Cava Hacienda de Letras'}
          title={isEnglish ? 'Available wines' : 'Vinos disponibles'}
        />
        <div className="grid grid-cols-2 gap-3">
          {wines.map((wine, index) => (
            <WineCard
              key={wine.id}
              wine={wine}
              badge={
                index === 0
                  ? (isEnglish ? 'Best seller' : 'Más vendido')
                  : index === 2
                  ? (isEnglish ? 'Special edition' : 'Edición especial')
                  : (isEnglish ? 'Available' : 'Disponible')
              }
            />
          ))}
        </div>
      </section>

      <Link
        to="/control/app/club"
        className="relative block overflow-hidden rounded-[1.35rem] bg-[linear-gradient(135deg,#5c0f23,#8e1f37)] p-5 text-white shadow-[0_18px_38px_rgba(93,15,35,0.2)]"
      >
        <div className="absolute -right-10 top-1/2 h-36 w-36 -translate-y-1/2 rounded-full border border-white/10" />
        <div className="relative flex items-center gap-4">
          <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[#d9b56f] bg-white/5 text-[#f0cf92]">
            <Grape size={22} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#efcf93]">Wine Club</p>
              <Sparkles size={12} className="text-[#efcf93]" />
            </div>
            <h2
              className="mt-1 text-[1.45rem] leading-none text-[#f3dfb4]"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {isEnglish ? 'Benefits in every bottle' : 'Beneficios en cada botella'}
            </h2>
            <p className="mt-2 text-[11px] leading-4 text-[#f6ead3]">
              {isEnglish
                ? 'Pre-sales, special selections and exclusive experiences.'
                : 'Preventa, selecciones especiales y experiencias exclusivas.'}
            </p>
          </div>
        </div>
      </Link>
    </div>
  )
}
