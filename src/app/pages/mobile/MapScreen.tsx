import { useEffect, useMemo, useState } from 'react'
import { ExternalLink, LocateFixed, MapPin, Navigation, Search, Wine, X } from 'lucide-react'
import { MapboxScene } from '../../components/shared/MapboxScene'
import { AppSectionHeader, EmptyState, ErrorState, HeroEditorial, LoadingState, PrimaryButton } from '../../components/mobile/PremiumMobileUi'
import { useAppPreferences } from '../../context/AppPreferencesContext'
import { publicMapClient, type PublicMapPoi } from '../../../services/customer.service'

const HACIENDA_COORDINATES: [number, number] = [-102.29508, 22.13935]
const HACIENDA_ADDRESS = 'Teodoro Olivares S/N, 20668 San Luis de Letras, Ags.'
const OFFICIAL_HACIENDA_POI: PublicMapPoi = {
  id: 'official-hacienda-de-letras',
  slug: 'hacienda-de-letras',
  name: 'Hacienda de Letras',
  description: 'Ubicación oficial',
  category: 'hacienda',
  coordinates: HACIENDA_COORDINATES,
  address: HACIENDA_ADDRESS,
  searchKeywords: ['hacienda', 'vino', 'viñedo', 'san luis de letras', 'teodoro olivares'],
  metadata: { official: true },
  sortOrder: -1,
  updatedAt: '2026-08-13T00:00:00.000Z',
}
const DEFAULT_VIEWPORT_CENTER: [number, number] = HACIENDA_COORDINATES
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
  const { t, isEnglish } = useAppPreferences()
  const [pois, setPois] = useState<PublicMapPoi[]>([OFFICIAL_HACIENDA_POI])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedPoiId, setSelectedPoiId] = useState('')
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null)
  const [routeCoordinates, setRouteCoordinates] = useState<[number, number][]>([])
  const [locationMessage, setLocationMessage] = useState('')
  const [directionsPoi, setDirectionsPoi] = useState<PublicMapPoi | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    publicMapClient
      .pois()
      .then((response) => {
        if (!active) return
        const remotePois = response.data.filter((poi) => poi.slug !== OFFICIAL_HACIENDA_POI.slug && poi.id !== OFFICIAL_HACIENDA_POI.id)
        setPois([OFFICIAL_HACIENDA_POI, ...remotePois])
        setSelectedPoiId(OFFICIAL_HACIENDA_POI.id)
      })
      .catch(() => {
        if (active) {
          setPois([OFFICIAL_HACIENDA_POI])
          setSelectedPoiId(OFFICIAL_HACIENDA_POI.id)
        }
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
      setLocationMessage(isEnglish ? 'Location is not available on this device.' : 'La ubicación no está disponible en este dispositivo.')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation([position.coords.longitude, position.coords.latitude])
      },
      () => {
        setLocationMessage(isEnglish ? 'Location permission was not granted. The map remains available.' : 'Permiso de ubicación no concedido. El mapa sigue disponible.')
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 30_000 },
    )
  }

  const buildRoute = async (poi: PublicMapPoi) => {
    setSelectedPoiId(poi.id)
    setRouteCoordinates([])
    if (!userLocation) {
      setLocationMessage(isEnglish ? 'Enable your location to build a route to the selected place.' : 'Activa tu ubicación para trazar ruta al punto seleccionado.')
      return
    }
    setRouteCoordinates(await fetchDirections(userLocation, poi.coordinates))
  }

  const externalDirections = (provider: 'google' | 'waze', poi: PublicMapPoi) => {
    const [longitude, latitude] = poi.coordinates
    const destination = encodeURIComponent(poi.address || `${latitude},${longitude}`)
    const url = provider === 'waze'
      ? `https://www.waze.com/ul?ll=${latitude},${longitude}&navigate=yes`
      : `https://www.google.com/maps/dir/?api=1&destination=${destination}`
    window.open(url, '_blank', 'noopener,noreferrer')
    setDirectionsPoi(null)
  }

  return (
    <div className="app-page space-y-6">
      <HeroEditorial
        compact
        eyebrow={t('app.premium.home.mapTitle')}
        title={t('app.nav.map')}
        subtitle={t('app.premium.home.mapCopy')}
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
              variant: poi.id === OFFICIAL_HACIENDA_POI.id ? 'estate' as const : 'default' as const,
            })),
            ...(userLocation ? [{ coordinates: userLocation, label: isEnglish ? 'My location' : 'Mi ubicación' }] : []),
          ]}
          routes={routeCoordinates.length ? [{ coordinates: routeCoordinates, color: '#690D2B' }] : []}
          className="app-map-height"
        />
      </section>

      <section className="rounded-[1.2rem] border border-[rgba(184,138,74,0.28)] bg-[linear-gradient(145deg,rgba(255,250,242,0.96),rgba(244,230,207,0.92))] p-5 shadow-[var(--shadow-card)]">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[14px] bg-[linear-gradient(145deg,#84243f,#520719)] text-[#f4d9aa] shadow-[0_10px_22px_rgba(83,8,27,0.2)]"><Wine size={20} strokeWidth={1.55} /></span>
          <div className="min-w-0 flex-1">
            <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[var(--color-gold)]">{isEnglish ? 'Official location' : 'Ubicación oficial'}</p>
            <h2 className="mt-1 text-[20px] leading-tight text-[var(--color-ink)]" style={{ fontFamily: 'var(--font-display)' }}>Hacienda de Letras</h2>
            <address className="mt-2 not-italic text-[12px] leading-5 text-[var(--color-muted)]">{HACIENDA_ADDRESS}</address>
          </div>
        </div>
        <button type="button" onClick={() => setDirectionsPoi(OFFICIAL_HACIENDA_POI)} className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[14px] bg-[linear-gradient(135deg,#7d1435,#57071d)] px-4 text-[12px] font-semibold text-[#fffaf1] shadow-[0_12px_24px_rgba(83,8,27,0.18)]">
          <Navigation size={16} />
          {isEnglish ? 'How to get there' : 'Cómo llegar'}
        </button>
      </section>

      <section className="space-y-3">
        <AppSectionHeader eyebrow={isEnglish ? 'Interactive map' : 'Mapa interactivo'} title={isEnglish ? 'Points of interest' : 'Puntos de interés'} />
        <div className="flex gap-2 rounded-[1rem] bg-[rgba(255,250,242,0.86)] p-2 shadow-[var(--shadow-card)]">
          <label className="flex min-h-11 flex-1 items-center gap-2 rounded-full bg-white/72 px-3 text-[12px] text-[var(--color-muted)]">
            <Search size={15} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={isEnglish ? 'Search the map' : 'Buscar en el mapa'}
              className="min-w-0 flex-1 bg-transparent text-[13px] text-[var(--color-ink)] outline-none"
            />
          </label>
          <button
            type="button"
            onClick={requestLocation}
            aria-label={isEnglish ? 'Use my location' : 'Usar mi ubicación'}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--color-burgundy)] text-white"
          >
            <LocateFixed size={17} />
          </button>
        </div>
        {locationMessage ? <p className="rounded-[1rem] bg-[rgba(255,250,242,0.86)] p-3 text-[11px] text-[var(--color-muted)]">{locationMessage}</p> : null}
        {loading ? <LoadingState label={isEnglish ? 'Loading map...' : 'Cargando mapa...'} /> : null}
        {error ? <ErrorState message={error} /> : null}
        {!loading && !error && filteredPois.length === 0 ? (
          <EmptyState title={t('app.premium.informationSoon')} description={isEnglish ? 'Hacienda must publish official points of interest to enable search and routes.' : 'Hacienda debe cargar puntos de interés oficiales para activar búsqueda y rutas.'} />
        ) : null}
        {!loading && !error && filteredPois.map((poi) => (
          <article key={poi.id} className="flex items-center gap-3 rounded-[1.05rem] bg-[rgba(255,250,242,0.86)] p-4 shadow-[var(--shadow-card)]">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-surface-warm)] text-[var(--color-burgundy)]">
              <MapPin size={17} />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="text-[14px] font-semibold text-[var(--color-ink)]">{poi.name}</h3>
              <p className="mt-1 text-[11px] leading-4 text-[var(--color-muted)]">{poi.address ?? poi.description ?? poi.category}</p>
            </div>
            <button
              type="button"
              onClick={() => setDirectionsPoi(poi)}
              aria-label={`${isEnglish ? 'How to get to' : 'Cómo llegar a'} ${poi.name}`}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/72 text-[var(--color-gold)]"
            >
              <Navigation size={16} />
            </button>
          </article>
        ))}
        {selectedPoi && userLocation ? (
          <PrimaryButton onClick={() => void buildRoute(selectedPoi)}>
            <MapPin size={16} />
            {isEnglish ? 'Build route' : 'Trazar ruta'}
          </PrimaryButton>
        ) : null}
      </section>


      {directionsPoi ? (
        <div className="fixed inset-0 z-[180] flex items-end bg-[rgba(35,12,13,0.38)] px-3 pb-[calc(env(safe-area-inset-bottom)+12px)] backdrop-blur-[7px]" role="dialog" aria-modal="true" aria-label={isEnglish ? 'Choose navigation app' : 'Elige aplicación de navegación'}>
          <section className="w-full overflow-hidden rounded-[24px] border border-[rgba(231,207,170,0.82)] bg-[rgba(255,249,241,0.97)] p-5 shadow-[0_28px_64px_rgba(45,12,18,0.3)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[var(--color-gold)]">{isEnglish ? 'Directions' : 'Cómo llegar'}</p>
                <h2 className="mt-1 text-[23px] text-[var(--color-ink)]" style={{ fontFamily: 'var(--font-display)' }}>{directionsPoi.name}</h2>
                <p className="mt-2 text-[11px] leading-5 text-[var(--color-muted)]">{directionsPoi.address || HACIENDA_ADDRESS}</p>
              </div>
              <button type="button" onClick={() => setDirectionsPoi(null)} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-[var(--color-ink)]" aria-label={isEnglish ? 'Close' : 'Cerrar'}><X size={17} /></button>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => externalDirections('google', directionsPoi)} className="flex min-h-14 items-center justify-center gap-2 rounded-[15px] border border-[rgba(184,138,74,0.28)] bg-white text-[12px] font-semibold text-[var(--color-ink)]"><MapPin size={17} className="text-[var(--color-burgundy)]" />Google Maps<ExternalLink size={13} /></button>
              <button type="button" onClick={() => externalDirections('waze', directionsPoi)} className="flex min-h-14 items-center justify-center gap-2 rounded-[15px] bg-[linear-gradient(135deg,#7d1435,#57071d)] text-[12px] font-semibold text-white"><Navigation size={17} />Waze<ExternalLink size={13} /></button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  )
}
