import type { PublicMapPoi } from '../../services/customer.service'

export const HACIENDA_ADDRESS = 'Teodoro Olivares S/N, 20668 San Luis de Letras, Ags.'
export const NIETO_RESTAURANT_ADDRESS = 'Calle Nieto #106, Zona Centro, Aguascalientes, Ags.'
export const CENTRO_RESTAURANT_ADDRESS = NIETO_RESTAURANT_ADDRESS

export const OFFICIAL_HACIENDA_POI: PublicMapPoi = {
  id: 'official-hacienda-de-letras',
  slug: 'vinedos-bodegas-hacienda-de-letras',
  name: 'Viñedos y Bodegas Hacienda de Letras',
  description: 'Viñedo, bodega y restaurante de Hacienda de Letras',
  category: 'hacienda',
  coordinates: [-102.2945108, 22.1395015],
  address: HACIENDA_ADDRESS,
  searchKeywords: ['hacienda', 'vino', 'viñedo', 'bodega', 'restaurante', 'san luis de letras', 'teodoro olivares'],
  metadata: { official: true, placeType: 'estate_restaurant' },
  sortOrder: 10,
  updatedAt: '2026-08-13T00:00:00.000Z',
}

export const OFFICIAL_CABINS_POI: PublicMapPoi = {
  id: 'official-cabins-hacienda-de-letras',
  slug: 'cabanas-hacienda-de-letras',
  name: 'Cabañas Hacienda de Letras',
  description: 'Hospedaje dentro de Hacienda de Letras',
  category: 'lodging',
  coordinates: [-102.2947807, 22.1356581],
  address: HACIENDA_ADDRESS,
  searchKeywords: ['cabañas', 'hospedaje', 'hacienda', 'san luis de letras', 'teodoro olivares'],
  metadata: { official: true, placeType: 'lodging' },
  sortOrder: 20,
  updatedAt: '2026-08-13T00:00:00.000Z',
}

export const OFFICIAL_CENTRO_RESTAURANT_POI: PublicMapPoi = {
  id: 'official-restaurant-centro-aguascalientes',
  slug: 'restaurante-centro-aguascalientes',
  name: 'Restaurante Hacienda de Letras Nieto',
  description: 'Restaurante de Hacienda de Letras en Calle Nieto 106',
  category: 'restaurant',
  coordinates: [-102.2965412, 21.8799798],
  address: CENTRO_RESTAURANT_ADDRESS,
  searchKeywords: ['restaurante', 'nieto', 'calle nieto', 'zona centro', 'hacienda de letras', 'aguascalientes'],
  metadata: { official: true, placeType: 'restaurant' },
  sortOrder: 30,
  updatedAt: '2026-08-13T00:00:00.000Z',
}

export const OFFICIAL_ESTATE_RESTAURANT_POI: PublicMapPoi = {
  id: 'official-restaurant-hacienda-de-letras',
  slug: 'restaurante-hacienda-de-letras',
  name: 'Restaurante Hacienda de Letras',
  description: 'Restaurante dentro de Hacienda de Letras',
  category: 'restaurant',
  coordinates: OFFICIAL_HACIENDA_POI.coordinates,
  address: HACIENDA_ADDRESS,
  searchKeywords: ['restaurante', 'hacienda', 'viñedo', 'san luis de letras', 'teodoro olivares'],
  metadata: { official: true, placeType: 'restaurant', location_kind: 'restaurant_estate' },
  sortOrder: 24,
  updatedAt: '2026-08-13T00:00:00.000Z',
}

export const OFFICIAL_BOUTIQUE_POI: PublicMapPoi = {
  id: 'official-boutique-hacienda-de-letras',
  slug: 'boutique-hacienda-de-letras',
  name: 'Boutique Hacienda de Letras',
  description: 'Boutique de vino y productos de la casa',
  category: 'boutique',
  coordinates: OFFICIAL_HACIENDA_POI.coordinates,
  address: HACIENDA_ADDRESS,
  searchKeywords: ['boutique', 'tienda', 'vino', 'hacienda', 'san luis de letras'],
  metadata: { official: true, placeType: 'boutique', location_kind: 'boutique' },
  sortOrder: 26,
  updatedAt: '2026-08-13T00:00:00.000Z',
}

export const OFFICIAL_MAP_POIS = [
  OFFICIAL_HACIENDA_POI,
  OFFICIAL_CABINS_POI,
  OFFICIAL_ESTATE_RESTAURANT_POI,
  OFFICIAL_BOUTIQUE_POI,
  OFFICIAL_CENTRO_RESTAURANT_POI,
]

type RestaurantReference = string | {
  slug?: string | null
  name?: string | null
  address?: string | null
  location?: string | null
  fullAddress?: string | null
  metadata?: Record<string, unknown> | null
}

function normalizeLocationText(value: unknown) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function restaurantReferenceText(reference: RestaurantReference) {
  if (typeof reference === 'string') return reference
  return [
    reference.slug,
    reference.name,
    reference.address,
    reference.location,
    reference.fullAddress,
    reference.metadata?.slug,
    reference.metadata?.address,
    reference.metadata?.location,
    reference.metadata?.placeType,
    reference.metadata?.location_kind,
  ].filter(Boolean).join(' ')
}

export function officialRestaurantPoi(reference: RestaurantReference) {
  const text = normalizeLocationText(restaurantReferenceText(reference))
  if (
    text.includes('restaurante-centro') ||
    text.includes('restaurante-nieto') ||
    text.includes('zona centro') ||
    text.includes('calle nieto') ||
    text.includes('nieto 106') ||
    text.includes('teatro morelos') ||
    text.includes('restaurant_center')
  ) {
    return OFFICIAL_CENTRO_RESTAURANT_POI
  }
  if (
    text.includes('boutique') ||
    text.includes('tienda')
  ) {
    return OFFICIAL_BOUTIQUE_POI
  }
  if (
    text.includes('restaurant_estate') ||
    text.includes('restaurante hacienda') ||
    text.includes('restaurante de hacienda')
  ) {
    return OFFICIAL_ESTATE_RESTAURANT_POI
  }
  return OFFICIAL_HACIENDA_POI
}

export function navigationUrl(provider: 'google' | 'waze', poi: PublicMapPoi) {
  const [longitude, latitude] = poi.coordinates
  const label = encodeURIComponent(`${poi.name}, ${poi.address ?? ''}`.trim())
  if (provider === 'waze') {
    return `https://www.waze.com/ul?q=${label}&ll=${latitude},${longitude}&navigate=yes`
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&travelmode=driving`
}
