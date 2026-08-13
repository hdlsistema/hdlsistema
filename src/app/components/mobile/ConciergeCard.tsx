import { useAppPreferences } from '../../context/AppPreferencesContext'

export function ConciergeCard() {
  const { isEnglish } = useAppPreferences()
  return (
    <article className="rounded-[1.25rem] border border-[rgba(137,47,58,0.2)] bg-[radial-gradient(circle_at_right,rgba(154,31,48,0.28),transparent_36%),linear-gradient(135deg,var(--color-burgundy),#6c1528)] p-5 text-white shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-[62px] w-[62px] items-center justify-center rounded-full border border-[rgba(215,173,96,0.8)] bg-[rgba(60,11,20,0.35)]">
            <img src="/faviconhacienda.svg" alt="Sommelier Hacienda de Letras" className="h-8 w-8 object-contain brightness-[3]" />
          </div>
          <div>
            <h3 className="text-[18px] font-semibold leading-none">
              Sommelier Hacienda
            </h3>
            <p className="mt-1 inline-flex rounded-md bg-[rgba(215,173,96,0.95)] px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-burgundy-deep)]">
              Asistente de vinos
            </p>
          </div>
        </div>
        <button type="button" className="rounded-full border border-[rgba(215,173,96,0.9)] px-4 py-2 text-[12px] text-white">
          {isEnglish ? 'Chat' : 'Chatear'}
        </button>
      </div>
      <p className="mt-3 text-[12px] leading-5 text-[rgba(255,243,229,0.92)]">
        {isEnglish
          ? 'Your personal wine assistant. Ask me about pairings, grapes, experiences and more.'
          : 'Tu asistente personal de vinos. Pregúntame sobre maridajes, uvas, experiencias y mas.'}
      </p>
    </article>
  )
}
