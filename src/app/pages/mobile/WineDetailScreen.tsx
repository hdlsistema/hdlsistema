import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Award, Grape, MapPin, Minus, Plus, Sparkles, Star, UtensilsCrossed, Wine } from 'lucide-react'
import { PrimaryButton, SectionHeading } from '../../components/mobile/PremiumMobileUi'
import { wines } from '../../data/wines'
import { useAppPreferences } from '../../context/AppPreferencesContext'

export function WineDetailScreen() {
  const { wineId } = useParams()
  const { isEnglish } = useAppPreferences()
  const wine = useMemo(() => wines.find((item) => String(item.id) === wineId) ?? wines[0], [wineId])
  const [quantity, setQuantity] = useState(1)

  return (
    <div className="space-y-6 pb-3">
      <section className="overflow-hidden rounded-[1.5rem] border border-[rgba(220,202,181,0.78)] bg-white shadow-[0_20px_42px_rgba(74,32,28,0.09)]">
        <div className="relative flex min-h-[330px] items-center justify-center bg-[radial-gradient(circle_at_50%_42%,#fffaf3_0%,#f1dfc9_68%,#e9d3bb_100%)] p-6">
          <span className="absolute left-4 top-4 rounded-full bg-white/[0.92] px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.13em] text-[var(--color-burgundy)] shadow-sm">
            {isEnglish ? "Estate's selection" : 'Selección de la casa'}
          </span>
          <img src={wine.image} alt={wine.name} className="max-h-[285px] w-auto object-contain drop-shadow-[0_24px_18px_rgba(67,26,22,0.22)]" />
        </div>

        <div className="p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-gold)]">{wine.kind}</p>
          <h1 className="mt-2 break-words text-[2.55rem] leading-[0.88] text-[var(--color-ink)]" style={{ fontFamily: 'var(--font-display)' }}>
            {wine.name}
          </h1>
          <p className="mt-3 text-[12px] leading-5 text-[var(--color-muted)]">
            {wine.varietal || (isEnglish ? 'Special selection' : 'Selección especial')}{wine.harvest ? ` · ${wine.harvest}` : ''}
          </p>

          <div className="mt-4 flex items-center gap-2 text-[11px] text-[var(--color-muted)]">
            <span className="inline-flex items-center gap-1 rounded-full bg-[#fff4df] px-2.5 py-1.5 text-[#9a6a23]">
              <Star size={12} fill="currentColor" />
              4.8
            </span>
            <span>{isEnglish ? '128 reviews' : '128 reseñas'}</span>
          </div>

          <div className="mt-5 flex items-end justify-between gap-4">
            <div>
              <p className="text-[10px] text-[var(--color-muted)]">{isEnglish ? 'Price' : 'Precio'}</p>
              <p className="mt-1 text-[2.15rem] leading-none text-[var(--color-burgundy)]" style={{ fontFamily: 'var(--font-display)' }}>
                {wine.price}
              </p>
            </div>
            <div className="flex items-center gap-1 rounded-full border border-[rgba(104,13,36,0.13)] bg-[#fffaf5] p-1.5">
              <button type="button" aria-label={isEnglish ? 'Decrease quantity' : 'Disminuir cantidad'} onClick={() => setQuantity((current) => Math.max(1, current - 1))} className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[var(--color-burgundy)]">
                <Minus size={15} />
              </button>
              <span className="w-7 text-center text-[13px] font-semibold text-[var(--color-ink)]">{quantity}</span>
              <button type="button" aria-label={isEnglish ? 'Increase quantity' : 'Aumentar cantidad'} onClick={() => setQuantity((current) => current + 1)} className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-burgundy)] text-white">
                <Plus size={15} />
              </button>
            </div>
          </div>

          <div className="mt-5">
            <PrimaryButton to="/app/carrito">{isEnglish ? 'Add to cart' : 'Agregar al carrito'}</PrimaryButton>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3">
        {[
          { icon: Grape, label: isEnglish ? 'Grape' : 'Uva', value: wine.varietal || (isEnglish ? "Estate's selection" : 'Selección de la casa') },
          { icon: Award, label: isEnglish ? 'Vintage' : 'Cosecha', value: wine.harvest || (isEnglish ? 'Current edition' : 'Edición actual') },
          { icon: MapPin, label: isEnglish ? 'Origin' : 'Origen', value: 'Aguascalientes' },
          { icon: Wine, label: isEnglish ? 'Service' : 'Servicio', value: '16–18 °C' },
        ].map((item) => {
          const Icon = item.icon
          return (
            <article key={item.label} className="min-w-0 rounded-[1.15rem] border border-[rgba(220,202,181,0.78)] bg-white p-4 shadow-[0_12px_28px_rgba(74,32,28,0.05)]">
              <Icon size={17} className="text-[var(--color-burgundy)]" />
              <p className="mt-3 text-[9px] font-semibold uppercase tracking-[0.13em] text-[var(--color-gold)]">{item.label}</p>
              <p className="mt-1 break-words text-[12px] font-semibold leading-4 text-[var(--color-ink)]">{item.value}</p>
            </article>
          )
        })}
      </section>

      <section className="space-y-3">
        <SectionHeading eyebrow={isEnglish ? 'Sensory profile' : 'Perfil sensorial'} title={isEnglish ? 'Tasting notes' : 'Notas de cata'} />
        <article className="rounded-[1.3rem] border border-[rgba(220,202,181,0.78)] bg-white p-5 text-[13px] leading-6 text-[var(--color-muted)] shadow-[0_16px_34px_rgba(74,32,28,0.06)]">
          {isEnglish
            ? 'Aromas of ripe dark fruits, vanilla and spices. On the palate it is balanced, with soft tannins and a persistent finish.'
            : 'Aromas a frutos negros maduros, vainilla y especias. En boca es equilibrado, con taninos suaves y un final persistente.'}
        </article>
      </section>

      <section className="space-y-3">
        <SectionHeading eyebrow={isEnglish ? 'Enjoy it better' : 'Disfrútalo mejor'} title={isEnglish ? 'Suggested pairing' : 'Maridaje sugerido'} />
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: isEnglish ? 'Red meats' : 'Carnes rojas', icon: UtensilsCrossed },
            { label: isEnglish ? 'Pasta' : 'Pastas', icon: UtensilsCrossed },
            { label: isEnglish ? 'Aged cheeses' : 'Quesos maduros', icon: UtensilsCrossed },
          ].map((item) => {
            const Icon = item.icon
            return (
              <article key={item.label} className="min-w-0 rounded-[1.1rem] border border-[rgba(220,202,181,0.78)] bg-white p-3 text-center shadow-[0_12px_26px_rgba(74,32,28,0.05)]">
                <span className="mx-auto inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#f7ece2] text-[var(--color-burgundy)]">
                  <Icon size={16} />
                </span>
                <p className="mt-3 break-words text-[10px] font-semibold leading-4 text-[var(--color-ink)]">{item.label}</p>
              </article>
            )
          })}
        </div>
      </section>

      <section className="rounded-[1.3rem] bg-[linear-gradient(135deg,#5b0e22,#8d2038)] p-5 text-white shadow-[0_18px_38px_rgba(93,15,35,0.2)]">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#d7b16d] text-[#f0cf92]">
            <Sparkles size={19} />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#efcf93]">ALQIA Sommelier</p>
            <h3 className="mt-1 text-[1.45rem] leading-none" style={{ fontFamily: 'var(--font-display)' }}>{isEnglish ? 'Is this the ideal wine for your occasion?' : '¿Es el vino ideal para tu ocasión?'}</h3>
            <p className="mt-2 text-[11px] leading-4 text-white/[0.76]">{isEnglish ? 'Tell us what you are going to eat or celebrate and receive a personalized recommendation.' : 'Cuéntanos qué vas a comer o celebrar y recibe una recomendación personalizada.'}</p>
          </div>
        </div>
      </section>
    </div>
  )
}
