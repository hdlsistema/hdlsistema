import { useEffect, useMemo, useState } from 'react'
import { Info, LocateFixed, MapPin, Search } from 'lucide-react'
import { MapboxScene } from '../../components/shared/MapboxScene'
import { AppSectionHeader, EmptyState, ErrorState, HeroEditorial, LoadingState, PrimaryButton } from '../../components/mobile/PremiumMobileUi'
import { useAppPreferences } from '../../context/AppPreferencesContext'
import { publicMapClient, type PublicMapPoi } from '../../../services/customer.service'

const DEFAULT_VIEWPORT_CENTER: [number, number] = [-102.296, 21.882]
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined

function centerForPois(pois: PublicMapPoi[]): [number, number] {
  return pois[0]?.coordinates ?? DEFAULT_VIEWPORT_CENTER
}

async function fetchDirections(from: [number, number], to: [number, number]): Promise<[number, number][]> {
  if (!MAPBOX_TOKEN) return [from, to]
  const coords = `${from.join(',')};${to.join(',')}`
  const url = `https://api.mapbox.com/directions/v5/mapbox/walking/${coords}?geometries=geojson&access_token=${encodeURIComponent(MAPBOX_TOKEN)}`
  const response = await fetch(url)
  if (!response.ok) return [from, to]
  const data = await response.json() as {
    routes?: Array<{ geometry?: { coordinates?: [number, number][] } }>
  }
  const coordinates = data.routes?.[0]?.geometry?.coordinates
  return coordinates?.length
    ? coordinates
    : [from, to]
}

export function MapScreen() {
  const { t } = useAppPreferences()
  const [pois, setPois] = useState<PublicMapPoi[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedPoiId, setSelectedPoiId] = useState('')
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null)
  const [routeCoordinates, setRouteCoordinates] = useState<[number, number][]>([])
  const [locationMessage, setLocationMessage] = useState('')

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    publicMapClient
      .pois()
      .then((response) => {
        if (!active) return
        setPois(response.data)
        setSelectedPoiId(response.data[0]?.id ?? '')
      })
      .catch(() => {
        if (active) setError(t('app.premium.contentUnavailable'))
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [t])

  const filteredPois = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return pois
    return pois.filter((poi) => [
      poi.name,
      poi.description ?? '',
      poi.category,
      poi.address ?? '',
      ...poi.searchKeywords,
    ].some((value) => value.toLowerCase().includes(term)))
  }, [pois, search])

  const selectedPoi = filteredPois.find((poi) => poi.id === selectedPoiId) ?? filteredPois[0] ?? null
  const mapCenter = selectedPoi?.coordinates ?? centerForPois(pois)

  const requestLocation = () => {
    setLocationMessage('')
    if (!navigator.geolocation) {
      setLocationMessage('La ubicación no está disponible en este dispositivo.')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation([position.coords.longitude, position.coords.latitude])
      },
      () => {
        setLocationMessage('Permiso de ubicación no concedido. El mapa sigue disponible.')
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 30_000 },
    )
  }

  const buildRoute = async (poi: PublicMapPoi) => {
    setSelectedPoiId(poi.id)
    setRouteCoordinates([])
    if (!userLocation) {
      setLocationMessage('Activa tu ubicación para trazar ruta al punto seleccionado.')
      return
    }
    setRouteCoordinates(await fetchDirections(userLocation, poi.coordinates))
  }

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
          center={mapCenter}
          zoom={selectedPoi ? 15 : 11}
          pitch={58}
          bearing={-22}
          markers={[
            ...pois.map((poi) => ({
              coordinates: poi.coordinates,
              label: poi.name,
            })),
            ...(userLocation ? [{ coordinates: userLocation, label: 'Mi ubicación' }] : []),
          ]}
          routes={routeCoordinates.length ? [{ coordinates: routeCoordinates, color: '#690D2B' }] : []}
          className="app-map-height"
        />
      </section>

      <section className="space-y-3">
        <AppSectionHeader eyebrow="Mapa interactivo" title="Puntos de interés" />
        <div className="flex gap-2 rounded-[1rem] bg-[rgba(255,250,242,0.86)] p-2 shadow-[var(--shadow-card)]">
          <label className="flex min-h-11 flex-1 items-center gap-2 rounded-full bg-white/72 px-3 text-[12px] text-[var(--color-muted)]">
            <Search size={15} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar en el mapa"
              className="min-w-0 flex-1 bg-transparent text-[13px] text-[var(--color-ink)] outline-none"
            />
          </label>
          <button
            type="button"
            onClick={requestLocation}
            aria-label="Usar mi ubicación"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--color-burgundy)] text-white"
          >
            <LocateFixed size={17} />
          </button>
        </div>
        {locationMessage ? <p className="rounded-[1rem] bg-[rgba(255,250,242,0.86)] p-3 text-[11px] text-[var(--color-muted)]">{locationMessage}</p> : null}
        {loading ? <LoadingState label="Cargando mapa..." /> : null}
        {error ? <ErrorState message={error} /> : null}
        {!loading && !error && filteredPois.length === 0 ? (
          <EmptyState title={t('app.premium.informationSoon')} description="Hacienda debe cargar puntos de interés oficiales para activar búsqueda y rutas." />
        ) : null}
        {!loading && !error && filteredPois.map((poi) => (
          <article key={poi.id} className="flex items-center gap-3 rounded-[1.05rem] bg-[rgba(255,250,242,0.86)] p-4 shadow-[var(--shadow-card)]">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-surface-warm)] text-[var(--color-burgundy)]">
              <MapPin size={17} />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="text-[14px] font-semibold text-[var(--color-ink)]">{poi.name}</h3>
              <p className="mt-1 text-[11px] text-[var(--color-muted)]">{poi.description ?? poi.address ?? poi.category}</p>
            </div>
            <button
              type="button"
              onClick={() => void buildRoute(poi)}
              aria-label={`Trazar ruta a ${poi.name}`}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/72 text-[var(--color-gold)]"
            >
              <Info size={16} />
            </button>
          </article>
        ))}
        {selectedPoi && userLocation ? (
          <PrimaryButton onClick={() => void buildRoute(selectedPoi)}>
            <MapPin size={16} />
            Trazar ruta
          </PrimaryButton>
        ) : null}
      </section>
    </div>
  )
}
