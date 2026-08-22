import type { ContentRecord } from '../../services/content.service'
import {
  OFFICIAL_BOUTIQUE_POI,
  OFFICIAL_CABINS_POI,
  OFFICIAL_CENTRO_RESTAURANT_POI,
  OFFICIAL_ESTATE_RESTAURANT_POI,
  OFFICIAL_HACIENDA_POI,
} from './officialLocations'

export type EventVenueKey =
  | 'estate'
  | 'restaurant_estate'
  | 'restaurant_center'
  | 'cabins'
  | 'boutique'

export type EventVenue = {
  key: EventVenueKey
  title: string
  eyebrow: string
  description: string
  image: string
  poi: typeof OFFICIAL_HACIENDA_POI
  locationKinds: EventVenueKey[]
}

export const EVENT_VENUES: EventVenue[] = [
  {
    key: 'estate',
    title: 'Hacienda de Letras',
    eyebrow: 'Viñedo y bodega',
    description: 'Festivales, vendimias, conciertos y encuentros entre viñedos.',
    image: '/Hacienda-de-Letras hacienda.jpg',
    poi: OFFICIAL_HACIENDA_POI,
    locationKinds: ['estate'],
  },
  {
    key: 'restaurant_estate',
    title: 'Restaurante Hacienda',
    eyebrow: 'Gastronomía en viñedo',
    description: 'Eventos de mesa, vino y cocina dentro de la Hacienda.',
    image: '/experience-restaurante.svg',
    poi: OFFICIAL_ESTATE_RESTAURANT_POI,
    locationKinds: ['restaurant_estate'],
  },
  {
    key: 'restaurant_center',
    title: 'Restaurante Centro',
    eyebrow: 'Centro de Aguascalientes',
    description: 'Atardeceres, música, terraza y experiencias urbanas.',
    image: '/hacienda 2.jpg',
    poi: OFFICIAL_CENTRO_RESTAURANT_POI,
    locationKinds: ['restaurant_center'],
  },
  {
    key: 'cabins',
    title: 'Cabañas',
    eyebrow: 'Hospedaje',
    description: 'Eventos vinculados a estancia y convivencia en Hacienda.',
    image: '/hacienda-portada-landing.webp',
    poi: OFFICIAL_CABINS_POI,
    locationKinds: ['cabins'],
  },
  {
    key: 'boutique',
    title: 'Boutique',
    eyebrow: 'Tienda de la casa',
    description: 'Activaciones, lanzamientos y experiencias alrededor del vino.',
    image: '/Logo-Vino-en-Colores fesitval.webp',
    poi: OFFICIAL_BOUTIQUE_POI,
    locationKinds: ['boutique'],
  },
]

export function venueByKey(key?: string | null) {
  return EVENT_VENUES.find((venue) => venue.key === key) ?? null
}

export function eventMetadata(record: ContentRecord | Record<string, unknown> | null | undefined) {
  const value = record?.metadata
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
}

export function eventLocationKind(record: ContentRecord | Record<string, unknown> | null | undefined): EventVenueKey {
  const value = eventMetadata(record).location_kind
  return typeof value === 'string' && venueByKey(value)
    ? value as EventVenueKey
    : 'estate'
}

export function eventVenueForRecord(record: ContentRecord | Record<string, unknown> | null | undefined) {
  return venueByKey(eventLocationKind(record)) ?? EVENT_VENUES[0]
}

export function eventMatchesVenue(record: ContentRecord | Record<string, unknown>, venueKey?: string | null) {
  if (!venueKey) return true
  const venue = venueByKey(venueKey)
  if (!venue) return true
  return venue.locationKinds.includes(eventLocationKind(record))
}

export function eventKindLabel(value?: string | null) {
  if (value === 'sunset') return 'Atardecer'
  if (value === 'festival') return 'Festival'
  if (value === 'harvest') return 'Vendimia'
  if (value === 'gastronomy') return 'Gastronomía'
  if (value === 'private') return 'Encuentro privado'
  if (value === 'race') return 'Carrera'
  if (value === 'concert') return 'Concierto'
  return 'Especial'
}
