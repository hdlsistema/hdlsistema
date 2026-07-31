import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Grape, Send, ShoppingBag, Sparkles, Wine } from 'lucide-react'
import { SectionHeading } from '../../components/mobile/PremiumMobileUi'
import { useAppPreferences } from '../../context/AppPreferencesContext'
import { wines } from '../../data/wines'

export function SommelierScreen() {
  const { isEnglish } = useAppPreferences()
  const featuredWine = wines[0]
  const [question, setQuestion] = useState('')

  const suggestions = isEnglish
    ? [
        'A wine for red meat',
        'I want a gift bottle',
        'Something light for dinner',
      ]
    : [
        'Un vino para carnes rojas',
        'Quiero hacer un regalo',
        'Algo ligero para una cena',
      ]

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
              {isEnglish
                ? 'Your personal wine assistant'
                : 'Tu asistente personal de vinos'}
            </h1>
            <p className="mt-3 text-[12px] leading-5 text-white/[0.78]">
              {isEnglish
                ? 'Pairings, occasions, gifts and experiences, in one conversation.'
                : 'Maridajes, ocasiones, regalos y experiencias, en una conversación.'}
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <SectionHeading
          eyebrow={isEnglish ? 'Suggestions' : 'Sugerencias'}
          title={
            isEnglish
              ? 'What would you like to discover?'
              : '¿Qué quieres descubrir?'
          }
        />
        <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => setQuestion(suggestion)}
              className="shrink-0 rounded-full border border-[rgba(220,202,181,0.78)] bg-white px-4 py-2.5 text-[11px] text-[var(--color-burgundy)] shadow-sm"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-4 rounded-[1.35rem] border border-[rgba(220,202,181,0.72)] bg-[#fbf7f1] p-4 shadow-[0_16px_34px_rgba(74,32,28,0.06)]">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-burgundy)] text-white">
            <Sparkles size={16} />
          </span>
          <div className="max-w-[82%] rounded-[1rem] rounded-tl-sm bg-white px-4 py-3 text-[12px] leading-5 text-[var(--color-ink)] shadow-sm">
            {isEnglish
              ? 'Hello, I am ALQIA Sommelier. Tell me what you are eating, the occasion you have in mind or the flavors you enjoy.'
              : 'Hola, soy ALQIA Sommelier. Cuéntame qué vas a comer, qué ocasión tienes o qué sabores disfrutas.'}
          </div>
        </div>

        <div className="flex justify-end">
          <div className="max-w-[80%] rounded-[1rem] rounded-tr-sm bg-[#efe0ce] px-4 py-3 text-[12px] leading-5 text-[var(--color-ink)]">
            {isEnglish
              ? 'What wine do you recommend for a grilled steak?'
              : '¿Qué vino me recomiendas para un filete al grill?'}
          </div>
        </div>

        <div className="flex items-start gap-3">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-burgundy)] text-white">
            <Sparkles size={16} />
          </span>
          <div className="max-w-[86%] rounded-[1rem] rounded-tl-sm bg-white p-3 shadow-sm">
            <p className="text-[12px] leading-5 text-[var(--color-ink)]">
              {isEnglish ? (
                <>
                  I recommend <strong>{featuredWine.name}</strong>. Its structure works especially well with red meat and bold flavors.
                </>
              ) : (
                <>
                  Te recomiendo <strong>{featuredWine.name}</strong>. Su estructura acompaña muy bien carnes rojas y sabores intensos.
                </>
              )}
            </p>

            <article className="mt-3 grid grid-cols-[64px_minmax(0,1fr)] gap-3 rounded-[0.95rem] border border-[rgba(220,202,181,0.72)] bg-[#fffaf5] p-3">
              <div className="flex h-[92px] items-center justify-center rounded-[0.8rem] bg-[#f2e4d3]">
                <img src={featuredWine.image} alt={featuredWine.name} className="max-h-[78px] w-auto object-contain" />
              </div>
              <div className="flex min-w-0 flex-col justify-center">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-gold)]">{isEnglish ? 'Recommendation' : 'Recomendación'}</p>
                <h3 className="mt-1 break-words text-[1.1rem] leading-none text-[var(--color-ink)]" style={{ fontFamily: 'var(--font-display)' }}>
                  {featuredWine.name}
                </h3>
                <p className="mt-1 text-[10px] text-[var(--color-muted)]">{featuredWine.kind}</p>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className="text-[13px] font-semibold text-[var(--color-burgundy)]">{featuredWine.price}</span>
                  <Link to="/control/app/carrito" className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-burgundy)] px-3 py-2 text-[10px] font-semibold text-white">
                    <ShoppingBag size={12} />
                    {isEnglish ? 'Add' : 'Agregar'}
                  </Link>
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <article className="rounded-[1.15rem] border border-[rgba(220,202,181,0.72)] bg-white p-4 shadow-[0_12px_26px_rgba(74,32,28,0.05)]">
          <Wine size={18} className="text-[var(--color-burgundy)]" />
          <p className="mt-3 text-[12px] font-semibold text-[var(--color-ink)]">
            {isEnglish ? 'Pairings' : 'Maridajes'}
          </p>
          <p className="mt-1 text-[10px] leading-4 text-[var(--color-muted)]">
            {isEnglish
              ? 'Find the ideal wine for every dish.'
              : 'Encuentra el vino ideal para cada platillo.'}
          </p>
        </article>
        <article className="rounded-[1.15rem] border border-[rgba(220,202,181,0.72)] bg-white p-4 shadow-[0_12px_26px_rgba(74,32,28,0.05)]">
          <Grape size={18} className="text-[var(--color-burgundy)]" />
          <p className="mt-3 text-[12px] font-semibold text-[var(--color-ink)]">
            {isEnglish ? 'Preferences' : 'Preferencias'}
          </p>
          <p className="mt-1 text-[10px] leading-4 text-[var(--color-muted)]">
            {isEnglish
              ? 'Learn your taste to recommend better.'
              : 'Aprende tus gustos para recomendar mejor.'}
          </p>
        </article>
      </section>

      <label className="flex items-center gap-3 rounded-[1.1rem] border border-[rgba(220,202,181,0.78)] bg-white px-4 py-3 shadow-[0_14px_30px_rgba(74,32,28,0.07)]">
        <input
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder={
            isEnglish
              ? 'Write your question...'
              : 'Escribe tu pregunta...'
          }
          className="min-w-0 flex-1 bg-transparent text-[12px] text-[var(--color-ink)] outline-none placeholder:text-[var(--color-muted)]"
        />
        <button
          type="button"
          aria-label={
            isEnglish ? 'Send question' : 'Enviar pregunta'
          }
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-burgundy)] text-white"
        >
          <Send size={16} />
        </button>
      </label>
    </div>
  )
}
