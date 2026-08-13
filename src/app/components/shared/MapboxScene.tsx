import { useEffect, useId, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

type MarkerItem = {
  coordinates: [number, number]
  label?: string
  variant?: 'default' | 'estate' | 'lodging' | 'restaurant'
  onSelect?: () => void
}

type RouteLine = {
  coordinates: [number, number][]
  color?: string
}

type MapboxSceneProps = {
  center: [number, number]
  zoom: number
  pitch?: number
  bearing?: number
  markers?: MarkerItem[]
  routes?: RouteLine[]
  className?: string
}

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN
const SATELLITE_STYLE = 'mapbox://styles/mapbox/satellite-streets-v12'

export function MapboxScene({
  center,
  zoom,
  pitch = 60,
  bearing = 0,
  markers = [],
  routes = [],
  className = '',
}: MapboxSceneProps) {
  const mapNodeRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const markerRefs = useRef<mapboxgl.Marker[]>([])
  const routeIdsRef = useRef<Array<{ sourceId: string; layerId: string }>>([])
  const sceneId = useId().replace(/:/g, '-')

  useEffect(() => {
    if (!mapNodeRef.current || mapRef.current || !MAPBOX_TOKEN) {
      return
    }

    mapboxgl.accessToken = MAPBOX_TOKEN

    const map = new mapboxgl.Map({
      container: mapNodeRef.current,
      style: SATELLITE_STYLE,
      center,
      zoom,
      pitch,
      bearing,
      antialias: true,
      attributionControl: false,
      preserveDrawingBuffer: false,
    })

    mapRef.current = map

    map.on('style.load', () => {
      if (!map.getSource('mapbox-dem')) {
        map.addSource('mapbox-dem', {
          type: 'raster-dem',
          url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
          tileSize: 512,
          maxzoom: 14,
        })
      }

      map.setTerrain({ source: 'mapbox-dem', exaggeration: 1.45 })
      map.setFog({
        color: 'rgba(255, 248, 238, 0.8)',
        'high-color': 'rgba(14, 10, 8, 0.2)',
        'space-color': 'rgba(23, 17, 13, 0.9)',
        'horizon-blend': 0.12,
        'star-intensity': 0,
      })

      const layers = map.getStyle().layers ?? []
      const labelLayer = layers.find(
        (layer) => layer.type === 'symbol' && layer.layout && 'text-field' in layer.layout,
      )?.id

      if (!map.getLayer('hdl-3d-buildings')) {
        map.addLayer(
          {
            id: 'hdl-3d-buildings',
            source: 'composite',
            'source-layer': 'building',
            filter: ['==', ['get', 'extrude'], 'true'],
            type: 'fill-extrusion',
            minzoom: 14,
            paint: {
              'fill-extrusion-color': [
                'interpolate',
                ['linear'],
                ['get', 'height'],
                0,
                '#e2d3be',
                80,
                '#c6b098',
                200,
                '#9f7f62',
              ],
              'fill-extrusion-height': ['get', 'height'],
              'fill-extrusion-base': ['coalesce', ['get', 'min_height'], 0],
              'fill-extrusion-opacity': 0.78,
            },
          },
          labelLayer,
        )
      }
    })

    return () => {
      markerRefs.current.forEach((marker) => marker.remove())
      markerRefs.current = []
      routeIdsRef.current = []
      map.remove()
      mapRef.current = null
    }
  }, [sceneId])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    map.easeTo({ center, zoom, pitch, bearing, duration: 650 })
  }, [bearing, center, pitch, zoom])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const currentMap = map

    function renderOverlays() {
      markerRefs.current.forEach((marker) => marker.remove())
      markerRefs.current = []

      for (const route of routeIdsRef.current) {
        if (currentMap.getLayer(route.layerId)) currentMap.removeLayer(route.layerId)
        if (currentMap.getSource(route.sourceId)) currentMap.removeSource(route.sourceId)
      }
      routeIdsRef.current = []

      markers.forEach((marker, index) => {
        const markerNode = document.createElement('div')
        if (marker.variant === 'estate' || marker.variant === 'lodging' || marker.variant === 'restaurant') {
          markerNode.className = 'grid h-11 w-11 -translate-y-1 rotate-[-45deg] place-items-center rounded-[50%_50%_50%_8px] border-2 border-[#f7e4c0] bg-[linear-gradient(145deg,#8b2742,#510719)] text-[#f7e4c0] shadow-[0_12px_28px_rgba(55,6,19,0.38),0_0_0_5px_rgba(111,15,40,0.16)]'
          markerNode.innerHTML = marker.variant === 'lodging'
            ? '<svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="transform:rotate(45deg)"><path d="M3 12v7M21 12v7M3 16h18M6 16v-5h6a4 4 0 0 1 4 4v1M6 11V8h4a2 2 0 0 1 2 2v1"/></svg>'
            : marker.variant === 'restaurant'
              ? '<svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="transform:rotate(45deg)"><path d="M7 3v8M4.5 3v5A2.5 2.5 0 0 0 7 10.5 2.5 2.5 0 0 0 9.5 8V3M7 10.5V21M15 3v18M15 3c3 1 4.5 4 4 8h-4"/></svg>'
              : '<svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="transform:rotate(45deg)"><path d="M8 3h8l-1 5.2a4 4 0 0 1-3.9 3.2h-.2A4 4 0 0 1 7 8.2L8 3Z"/><path d="M12 11.5V19M9 21h6"/><path d="M7.6 6.5h8.8"/></svg>'
        } else {
          markerNode.className =
            'h-4 w-4 rounded-full border-2 border-white bg-[#7d1328] shadow-[0_0_0_4px_rgba(125,19,40,0.18)]'
        }
        markerNode.setAttribute('aria-label', marker.label ?? `marker-${index}`)
        if (marker.onSelect) {
          markerNode.setAttribute('role', 'button')
          markerNode.setAttribute('tabindex', '0')
          markerNode.style.cursor = 'pointer'
          markerNode.addEventListener('click', marker.onSelect)
          markerNode.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') marker.onSelect?.()
          })
        }

        const mapMarker = new mapboxgl.Marker({ element: markerNode, anchor: marker.variant && marker.variant !== 'default' ? 'bottom' : 'center' })
          .setLngLat(marker.coordinates)
          .addTo(currentMap)
        markerRefs.current.push(mapMarker)
      })

      routes.forEach((route, index) => {
        if (route.coordinates.length < 2) return
        const sourceId = `${sceneId}-route-source-${index}`
        const layerId = `${sceneId}-route-layer-${index}`

        currentMap.addSource(sourceId, {
          type: 'geojson',
          data: {
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: route.coordinates,
            },
            properties: {},
          },
        })

        currentMap.addLayer({
          id: layerId,
          type: 'line',
          source: sourceId,
          layout: {
            'line-cap': 'round',
            'line-join': 'round',
          },
          paint: {
            'line-color': route.color ?? '#7d1328',
            'line-width': 3,
            'line-opacity': 0.85,
            'line-dasharray': [1, 1.6],
          },
        })

        routeIdsRef.current.push({ sourceId, layerId })
      })
    }

    if (currentMap.loaded()) renderOverlays()
    else currentMap.once('load', renderOverlays)
  }, [markers, routes, sceneId])

  if (!MAPBOX_TOKEN) {
    return (
      <div
        className={`flex items-center justify-center rounded-[inherit] bg-[linear-gradient(180deg,#efe3d0,#f8f1e7)] p-6 text-center text-sm text-[var(--color-muted)] ${className}`.trim()}
      >
        El mapa interactivo no está disponible en este momento. Puedes abrir la ruta desde la ficha de cada sede.
      </div>
    )
  }

  return <div ref={mapNodeRef} className={className} />
}
