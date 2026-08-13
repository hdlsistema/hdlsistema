import { MapboxScene } from '../shared/MapboxScene'
import { useAppPreferences } from '../../context/AppPreferencesContext'

export function MapCard() {
  const { isEnglish } = useAppPreferences()
  const address = 'Teodoro Olivares S/N, 20668 San Luis de Letras, Ags.'
  const mapUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`
  return (
    <article className="grid grid-cols-[142px_minmax(0,1fr)] gap-4 rounded-[1.15rem] border border-[rgba(220,202,181,0.82)] bg-[linear-gradient(135deg,#fffaf3,#f5e7d3)] p-3 shadow-[var(--shadow-card)]">
      <div className="relative min-h-[116px] overflow-hidden rounded-[1rem] border border-[rgba(220,202,181,0.82)]">
        <MapboxScene
          center={[-102.29508, 22.13935]}
          zoom={14}
          pitch={0}
          bearing={0}
          markers={[{ coordinates: [-102.29508, 22.13935], label: 'Hacienda de Letras', variant: 'estate' }]}
          className="h-full min-h-[116px]"
        />
      </div>
      <div className="flex flex-col justify-center">
        <h4 className="text-[16px] leading-[1.1] text-[var(--color-ink)]" style={{ fontFamily: 'var(--font-display)' }}>
          {isEnglish ? 'How to get here?' : '¿Cómo llegar?'}
        </h4>
        <p className="mt-2 text-[13px] leading-5 text-[var(--color-muted)]">
          {address}
        </p>
        <a
          href={mapUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex w-fit items-center gap-2 rounded-full border border-[var(--color-line)] bg-white px-4 py-2 text-[13px] font-medium text-[var(--color-ink)]"
        >
          {isEnglish ? 'How to get there' : 'Cómo llegar'}
          <span className="text-[16px] leading-none text-[var(--color-burgundy)]">↗</span>
        </a>
      </div>
    </article>
  )
}
