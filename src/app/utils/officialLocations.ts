import type { PublicMapPoi } from '../../services/customer.service'

export const HACIENDA_ADDRESS = 'Teodoro Olivares S/N, 20668 San Luis de Letras, Ags.'
export const CENTRO_RESTAURANT_ADDRESS = 'Nieto 106, Zona Centro, 20000 Aguascalientes, Ags.'

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
  name: 'Restaurante Hacienda de Letras Centro',
  description: 'Restaurante de Hacienda de Letras en el Centro de Aguascalientes',
  category: 'restaurant',
  coordinates: [-102.2965412, 21.8799798],
  address: CENTRO_RESTAURANT_ADDRESS,
  searchKeywords: ['restaurante', 'centro', 'nieto', 'hacienda de letras', 'aguascalientes'],
  metadata: { official: true, placeType: 'restaurant' },
  sortOrder: 30,
  updatedAt: '2026-08-13T00:00:00.000Z',
}

export const OFFICIAL_MAP_POIS = [
  OFFICIAL_HACIENDA_POI,
  OFFICIAL_CABINS_POI,
  OFFICIAL_CENTRO_RESTAURANT_POI,
]

export function officialRestaurantPoi(slug: string) {
  if (slug === 'restaurante-centro-aguascalientes') return OFFICIAL_CENTRO_RESTAURANT_POI
  return OFFICIAL_HACIENDA_POI
}

export function navigationUrl(provider: 'google' | 'waze', poi: PublicMapPoi) {
  const [longitude, latitude] = poi.coordinates
  if (provider === 'waze') {
    return `https://www.waze.com/ul?ll=${latitude},${longitude}&navigate=yes`
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&travelmode=driving`
}
