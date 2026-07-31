import { LocateFixed, MapPin, Navigation, Route, Search } from 'lucide-react'
import { MapboxScene } from '../../components/shared/MapboxScene'
import { SectionHeading } from '../../components/mobile/PremiumMobileUi'
import { useAppPreferences } from '../../context/AppPreferencesContext'

export function MapScreen() {
  const { isEnglish } = useAppPreferences()

  const places = [
    {
      name: 'Terraza 1854',
      detail: isEnglish ? 'Central hub for experiences' : 'Punto central de experiencias',
      distance: '2 min',
    },
    {
      name: isEnglish ? 'Restaurant' : 'Restaurante',
      detail: isEnglish ? 'Author cuisine and pairing' : 'Cocina de autor y maridaje',
      distance: '4 min',
    },
    {
      name: isEnglish ? 'Underground cellar' : 'Cava subterránea',
      detail: isEnglish ? 'Tastings and guided tours' : 'Catas y recorridos guiados',
      distance: '6 min',
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
            ? 'Locate yourself, find each space and check the best route during your visit.'
            : 'Ubícate, encuentra cada espacio y consulta la mejor ruta durante tu visita.'}
        </p>
      </section>

      <label className="flex items-center gap-3 rounded-[1.05rem] border border-[rgba(220,202,181,0.78)] bg-white px-4 py-3.5 shadow-[0_12px_28px_rgba(74,32,28,0.06)]">
        <Search size={17} className="text-[var(--color-burgundy)]" />
        <input
          type="search"
          placeholder={isEnglish ? 'Search restaurant, cellar or terrace' : 'Buscar restaurante, cava o terraza'}
          className="min-w-0 flex-1 bg-transparent text-[12px] text-[var(--color-ink)] outline-none placeholder:text-[var(--color-muted)]"
        />
      </label>

      <div className="grid grid-cols-2 gap-2 rounded-[1rem] bg-[#eee2d4] p-1.5">
        <button type="button" className="rounded-[0.8rem] bg-white px-3 py-2.5 text-[11px] font-semibold text-[var(--color-burgundy)] shadow-sm">
          {isEnglish ? 'Inside the estate' : 'Dentro de la hacienda'}
        </button>
        <button type="button" className="rounded-[0.8rem] px-3 py-2.5 text-[11px] font-medium text-[var(--color-muted)]">
          {isEnglish ? 'Getting here' : 'Cómo llegar'}
        </button>
      </div>

      <section className="relative overflow-hidden rounded-[1.45rem] border border-[rgba(220,202,181,0.78)] shadow-[0_18px_38px_rgba(74,32,28,0.09)]">
        <MapboxScene
          center={[-102.3238, 21.8858]}
          zoom={14.5}
          pitch={58}
          bearing={-22}
          markers={[
            { coordinates: [-102.331, 21.892], label: isEnglish ? 'Upper Vineyard' : 'Viñedo Alto' },
            { coordinates: [-102.3238, 21.8858], label: 'Terraza 1854' },
            { coordinates: [-102.3196, 21.8822], label: isEnglish ? 'Restaurant' : 'Restaurante' },
            { coordinates: [-102.3154, 21.8872], label: isEnglish ? 'Meeting point' : 'Punto de encuentro' },
          ]}
          className="h-[430px]"
        />

        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[linear-gradient(180deg,rgba(39,12,16,0.3),transparent)]" />

        <div className="absolute right-3 top-3 flex flex-col gap-2">
          <button type="button" aria-label={isEnglish ? 'Center location' : 'Centrar ubicación'} className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-[var(--color-burgundy)] shadow-lg">
            <LocateFixed size={18} />
          </button>
          <button type="button" aria-label={isEnglish ? 'Trace route' : 'Trazar ruta'} className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-burgundy)] text-white shadow-lg">
            <Route size={18} />
          </button>
        </div>

        <div className="absolute inset-x-3 bottom-3 rounded-[1.15rem] bg-white/95 p-4 shadow-[0_16px_34px_rgba(45,18,17,0.18)] backdrop-blur-sm">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f7ece2] text-[var(--color-burgundy)]">
              <MapPin size={18} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-[var(--color-gold)]">{isEnglish ? 'You are nearby' : 'Estás cerca'}</p>
              <h3 className="mt-1 text-[1.35rem] leading-none text-[var(--color-ink)]" style={{ fontFamily: 'var(--font-display)' }}>
                Terraza 1854
              </h3>
              <p className="mt-2 text-[11px] leading-4 text-[var(--color-muted)]">
                {isEnglish ? '2 minutes walking. Follow the marked route.' : 'A 2 minutos caminando. Sigue la ruta señalada.'}
              </p>
            </div>
            <Navigation size={18} className="shrink-0 text-[var(--color-burgundy)]" />
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
            <span className="shrink-0 text-[10px] font-semibold text-[var(--color-gold)]">{place.distance}</span>
          </article>
        ))}
      </section>
    </div>
  )
}
