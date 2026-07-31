import { SectionTitle } from '../../components/shared/SectionTitle'
import { useAppPreferences } from '../../context/AppPreferencesContext'

export function DistributorsPage() {
  const { isEnglish } = useAppPreferences()
  return (
    <div className="space-y-6">
      <SectionTitle
        eyebrow={isEnglish ? 'Sales channel' : 'Canal comercial'}
        title={isEnglish ? 'Distributors' : 'Distribuidores'}
        subtitle={isEnglish ? 'Regional coverage, orders, sales, account status and opportunities by city.' : 'Cobertura regional, pedidos, ventas, estado de cuenta y oportunidades por ciudad.'}
      />
      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <article className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-panel)] p-5 shadow-[var(--shadow-card)]">
          <h3 className="text-xl text-[var(--color-ink)]" style={{ fontFamily: 'var(--font-display)' }}>
            {isEnglish ? 'Simulated regional map' : 'Mapa regional simulado'}
          </h3>
          <div className="relative mt-5 h-80 overflow-hidden rounded-[1rem] border border-[var(--color-line)] bg-[linear-gradient(180deg,#efe3d0,#f8f1e7)]">
            {[
              ['Aguascalientes', 'left-[42%] top-[44%]'],
              ['Guadalajara', 'left-[18%] top-[68%]'],
              ['Monterrey', 'left-[70%] top-[18%]'],
              ['Queretaro', 'left-[58%] top-[52%]'],
              ['Leon', 'left-[76%] top-[70%]'],
            ].map(([city, position]) => (
              <div key={city} className={`absolute ${position}`}>
                <div className="mb-2 h-4 w-4 rounded-full bg-[var(--color-burgundy)]" />
                <span className="text-xs text-[var(--color-muted-strong)]">{city}</span>
              </div>
            ))}
          </div>
        </article>
        <article className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-panel)] p-5 shadow-[var(--shadow-card)]">
          <h3 className="text-xl text-[var(--color-ink)]" style={{ fontFamily: 'var(--font-display)' }}>
            {isEnglish ? 'Distributors by city' : 'Distribuidores por ciudad'}
          </h3>
          <div className="mt-5 space-y-3">
            {[
              ['Distribuidor Norte', 'Monterrey', '$184,200', isEnglish ? '14 orders' : '14 pedidos', isEnglish ? 'Active' : 'Activa'],
              ['Casa Bajio', 'Leon', '$126,840', isEnglish ? '9 orders' : '9 pedidos', isEnglish ? 'Active' : 'Activa'],
              ['Vinoteca Occidente', 'Guadalajara', '$98,420', isEnglish ? '7 orders' : '7 pedidos', isEnglish ? 'Opportunity' : 'Oportunidad'],
              ['Cava Centro', 'Queretaro', '$112,600', isEnglish ? '8 orders' : '8 pedidos', isEnglish ? 'Active' : 'Activa'],
            ].map(([name, city, sales, orders, status]) => (
              <div key={name} className="grid grid-cols-[minmax(0,1fr)_110px_90px] gap-3 rounded-[1rem] border border-[var(--color-line)] bg-[var(--color-panel-strong)] p-4 text-sm text-[var(--color-muted-strong)]">
                <div>
                  <p className="text-[var(--color-ink)]">{name}</p>
                  <p className="mt-1 text-xs text-[var(--color-muted)]">{city}</p>
                </div>
                <div>
                  <p>{sales}</p>
                  <p className="mt-1 text-xs text-[var(--color-muted)]">{orders}</p>
                </div>
                <span className="rounded-full border border-[var(--color-line)] px-3 py-1 text-center text-xs text-[var(--color-muted)]">{status}</span>
              </div>
            ))}
          </div>
        </article>
      </div>
    </div>
  )
}
