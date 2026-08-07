import { Info, MapPin } from 'lucide-react'
import { MapboxScene } from '../../components/shared/MapboxScene'
import { AppSectionHeader, EmptyState, HeroEditorial } from '../../components/mobile/PremiumMobileUi'
import { useAppPreferences } from '../../context/AppPreferencesContext'

const HACIENDA_CENTER: [number, number] = [-102.3238, 21.8858]

export function MapScreen() {
  const { t } = useAppPreferences()
  const places = [
    {
      name: 'Hacienda de Letras',
      detail: t('app.premium.map.pointDetail'),
      coordinates: HACIENDA_CENTER,
    },
  ]

  return (
    <div className="app-page space-y-6">
      <HeroEditorial
        compact
        eyebrow={t('app.premium.home.mapTitle')}
        title={t('app.nav.map')}
        subtitle={t('app.premium.home.mapCopy')}
        image="/Slide-1.webp"
        alt={t('app.nav.map')}
      />

      <section className="overflow-hidden rounded-[1.25rem] shadow-[var(--shadow-float)]">
        <MapboxScene
          center={HACIENDA_CENTER}
          zoom={14.5}
          pitch={58}
          bearing={-22}
          markers={places.map((place) => ({
            coordinates: place.coordinates,
            label: place.name,
          }))}
          className="app-map-height"
        />
      </section>

      <section className="space-y-3">
        <AppSectionHeader eyebrow={t('app.premium.availabilityPending')} title="Hacienda de Letras" />
        {places.map((place) => (
          <article key={place.name} className="flex items-center gap-3 rounded-[1.05rem] bg-[rgba(255,250,242,0.86)] p-4 shadow-[var(--shadow-card)]">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-surface-warm)] text-[var(--color-burgundy)]">
              <MapPin size={17} />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="text-[14px] font-semibold text-[var(--color-ink)]">{place.name}</h3>
              <p className="mt-1 text-[11px] text-[var(--color-muted)]">{place.detail}</p>
            </div>
            <Info size={16} className="shrink-0 text-[var(--color-gold)]" />
          </article>
        ))}
        <EmptyState title={t('app.premium.informationSoon')} description={t('app.premium.map.pendingRoutes')} />
      </section>
    </div>
  )
}
