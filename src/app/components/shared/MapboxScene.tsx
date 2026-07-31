import { useEffect, useId, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

type MarkerItem = {
  coordinates: [number, number]
  label?: string
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
  const routeIdsRef = useRef<string[]>([])
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

    map.on('load', () => {
      markers.forEach((marker, index) => {
        const markerNode = document.createElement('div')
        markerNode.className =
          'h-4 w-4 rounded-full border-2 border-white bg-[#7d1328] shadow-[0_0_0_4px_rgba(125,19,40,0.18)]'
        markerNode.setAttribute('aria-label', marker.label ?? `marker-${index}`)

        const mapMarker = new mapboxgl.Marker(markerNode).setLngLat(marker.coordinates).addTo(map)
        markerRefs.current.push(mapMarker)
      })

      routes.forEach((route, index) => {
        const sourceId = `${sceneId}-route-source-${index}`
        const layerId = `${sceneId}-route-layer-${index}`

        map.addSource(sourceId, {
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

        map.addLayer({
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

        routeIdsRef.current.push(sourceId, layerId)
      })
    })

    return () => {
      markerRefs.current.forEach((marker) => marker.remove())
      markerRefs.current = []

      routeIdsRef.current = []

      map.remove()
      mapRef.current = null
    }
  }, [bearing, center, markers, pitch, routes, sceneId, zoom])

  if (!MAPBOX_TOKEN) {
    return (
      <div
        className={`flex items-center justify-center rounded-[inherit] bg-[linear-gradient(180deg,#efe3d0,#f8f1e7)] p-6 text-center text-sm text-[var(--color-muted)] ${className}`.trim()}
      >
        Agrega tu token en `.env.local` como `VITE_MAPBOX_TOKEN` para activar el mapa 3D.
      </div>
    )
  }

  return <div ref={mapNodeRef} className={className} />
}
