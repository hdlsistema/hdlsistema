import { Info, MapPin } from 'lucide-react'
import { MapboxScene } from '../../components/shared/MapboxScene'
import { SectionHeading } from '../../components/mobile/PremiumMobileUi'
import { useAppPreferences } from '../../context/AppPreferencesContext'

const HACIENDA_CENTER: [number, number] = [-102.3238, 21.8858]

export function MapScreen() {
  const { isEnglish } = useAppPreferences()

  const places = [
    {
      name: 'Hacienda de Letras',
      detail: isEnglish ? 'Reference center configured for the estate' : 'Centro de referencia configurado para la hacienda',
      coordinates: HACIENDA_CENTER,
    },
    {
      name: isEnglish ? 'Upper Vineyard' : 'Viñedo Alto',
      detail: isEnglish ? 'Provisional point of interest' : 'Punto de interés provisional',
      coordinates: [-102.331, 21.892] as [number, number],
    },
    {
      name: isEnglish ? 'Meeting point' : 'Punto de encuentro',
      detail: isEnglish ? 'Provisional point of interest' : 'Punto de interés provisional',
      coordinates: [-102.3154, 21.8872] as [number, number],
    },
  ]

  return (
    <div className="space-y-5 pb-3">
      <section className="space-y-3">
        <SectionHeading
          eyebrow={isEnglish ? 'Explore your visit' : 'Explora tu visita'}
          title={isEnglish ? 'Estate map' : 'Mapa de la hacienda'}
        />
        <p className="text-[13px] leading-5 text-[var(--color-muted)]">
          {isEnglish
            ? 'Mapbox is active with configurable estate coordinates. Internal routes and exact visitor distances are pending Hacienda confirmation.'
            : 'Mapbox está activo con coordenadas configurables de la hacienda. Las rutas internas y distancias exactas para visitantes quedan pendientes de confirmación por Hacienda.'}
        </p>
      </section>

      <section className="relative overflow-hidden rounded-[1.45rem] border border-[rgba(220,202,181,0.78)] shadow-[0_18px_38px_rgba(74,32,28,0.09)]">
        <MapboxScene
          center={HACIENDA_CENTER}
          zoom={14.5}
          pitch={58}
          bearing={-22}
          markers={places.map((place) => ({
            coordinates: place.coordinates,
            label: place.name,
          }))}
          className="h-[430px]"
        />

        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[linear-gradient(180deg,rgba(39,12,16,0.3),transparent)]" />

        <div className="absolute inset-x-3 bottom-3 rounded-[1.15rem] bg-white/95 p-4 shadow-[0_16px_34px_rgba(45,18,17,0.18)] backdrop-blur-sm">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f7ece2] text-[var(--color-burgundy)]">
              <MapPin size={18} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-[var(--color-gold)]">
                {isEnglish ? 'Configured reference' : 'Referencia configurada'}
              </p>
              <h3 className="mt-1 text-[1.35rem] leading-none text-[var(--color-ink)]" style={{ fontFamily: 'var(--font-display)' }}>
                Hacienda de Letras
              </h3>
              <p className="mt-2 text-[11px] leading-4 text-[var(--color-muted)]">
                {isEnglish
                  ? 'Visitor GPS, turn-by-turn routes and exact walking times are not enabled yet.'
                  : 'GPS de visitante, rutas guiadas y tiempos exactos de caminata aún no están habilitados.'}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        {places.map((place) => (
          <article key={place.name} className="flex items-center gap-3 rounded-[1.15rem] border border-[rgba(220,202,181,0.78)] bg-white p-4 shadow-[0_12px_28px_rgba(74,32,28,0.05)]">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f8eee5] text-[var(--color-burgundy)]">
              <MapPin size={17} />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="text-[14px] font-semibold text-[var(--color-ink)]">{place.name}</h3>
              <p className="mt-1 truncate text-[11px] text-[var(--color-muted)]">{place.detail}</p>
            </div>
            <Info size={16} className="shrink-0 text-[var(--color-gold)]" />
          </article>
        ))}
      </section>
    </div>
  )
}
