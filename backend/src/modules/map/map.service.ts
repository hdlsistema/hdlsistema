import { supabaseAdminClient } from '../../config/supabase'
import { assertNoError } from '../operations/operationErrors'

type MapPoiRow = {
  id: string
  slug: string
  name: string
  description?: string | null
  category: string
  latitude?: number | string | null
  longitude?: number | string | null
  address?: string | null
  search_keywords?: string[] | null
  metadata?: Record<string, unknown> | null
  sort_order: number
  updated_at: string
}

function coordinate(value: number | string | null | undefined) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export async function listPublicMapPois(query: { search?: string }) {
  const now = new Date().toISOString()
  let request: any = supabaseAdminClient
    .from('map_pois')
    .select('id,slug,name,description,category,latitude,longitude,address,search_keywords,metadata,sort_order,updated_at')
    .eq('visible_in_app', true)
    .eq('status', 'published')
    .is('deleted_at', null)
    .is('archived_at', null)
    .not('latitude', 'is', null)
    .not('longitude', 'is', null)
    .or(`publish_at.is.null,publish_at.lte.${now}`)
    .or(`unpublish_at.is.null,unpublish_at.gt.${now}`)
    .order('sort_order', { ascending: true })

  const term = query.search?.replace(/[%(),]/g, '').trim()
  if (term) {
    request = request.or(`name.ilike.%${term}%,description.ilike.%${term}%,address.ilike.%${term}%,category.ilike.%${term}%`)
  }

  const result = await request
  const rows = assertNoError<MapPoiRow[]>(result).data ?? []

  return {
    data: rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      description: row.description ?? null,
      category: row.category,
      coordinates: [coordinate(row.longitude), coordinate(row.latitude)] as const,
      address: row.address ?? null,
      searchKeywords: row.search_keywords ?? [],
      metadata: row.metadata ?? {},
      sortOrder: row.sort_order,
      updatedAt: row.updated_at,
    })).filter((row) => row.coordinates[0] !== null && row.coordinates[1] !== null),
  }
}
