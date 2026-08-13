import { apiFetch } from './api'

export const contentEntities = [
  'wines',
  'experiences',
  'events',
  'promotions',
  'membership-plans',
  'campaigns',
] as const

export type ContentEntity = (typeof contentEntities)[number]
export type PublicationAction = 'publish' | 'unpublish' | 'archive' | 'restore'

export type ContentRecord = {
  id: string
  status?: string | null
  name?: string | null
  title?: string | null
  slug?: string | null
  code?: string | null
  sku?: string | null
  locale?: string | null
  version?: number | null
  visible_in_app?: boolean | null
  visible_in_control?: boolean | null
  sort_order?: number | null
  published_at?: string | null
  publish_at?: string | null
  unpublish_at?: string | null
  updated_at?: string | null
  created_at?: string | null
  [key: string]: unknown
}

export type ContentListQuery = {
  page?: number
  perPage?: number
  search?: string
  status?: string
  locale?: 'es' | 'en' | 'es-MX' | 'en-US'
  orderBy?: 'sort_order' | 'created_at' | 'updated_at' | 'published_at' | 'name' | 'title'
  orderDirection?: 'asc' | 'desc'
}

export type ContentListResponse = {
  ok: true
  data: ContentRecord[]
  pagination: {
    page: number
    perPage: number
    total: number
  }
}

export type ContentItemResponse = {
  ok: true
  data: ContentRecord
}

export type ContentVersionsResponse = {
  ok: true
  data: Array<{
    id?: string
    version: number
    created_at?: string | null
    changed_by?: string | null
    snapshot?: Record<string, unknown>
  }>
}

export type PreviewTokenResponse = {
  ok: true
  data: {
    token: string
    expires_at: string
  }
}

export type PreviewResponse = {
  ok: true
  entity: ContentEntity | 'wine' | 'experience' | 'event' | 'promotion' | 'membership_plan' | 'campaign'
  data: ContentRecord
}

export type CampaignAudienceFilters = {
  search?: string
  segment?: string
  source?: string
  location?: string
  tagId?: string
  hasOrders?: boolean
  hasReservations?: boolean
  hasMembership?: boolean
  minAge?: number
  maxAge?: number
  minTotalSpend?: number
  maxTotalSpend?: number
  minTotalVisits?: number
  maxTotalVisits?: number
  createdFrom?: string
  createdTo?: string
  locale?: 'es' | 'en' | 'es-MX' | 'en-US'
  limit?: number
}

export type CampaignAudiencePreviewResponse = {
  ok: true
  data: {
    total: number
    consentRequired: string
    filters: CampaignAudienceFilters
    sample: Array<{
      id: string
      customerNumber?: string | null
      name: string
      email?: string | null
      segment?: string | null
      source?: string | null
      preferredLanguage?: string | null
      totalSpend: number
      totalVisits: number
    }>
  }
}

export type CampaignSendResponse = {
  ok: true
  data: {
    campaignId: string
    sentAt: string
    recipients: number
    sent: number
    pending: number
    failed: number
  }
}

function assertToken(token: string | null | undefined): string {
  if (!token) {
    throw Object.assign(new Error('Sesión requerida'), { status: 401 })
  }
  return token
}

function adminHeaders(token: string | null | undefined): HeadersInit {
  return {
    Authorization: `Bearer ${assertToken(token)}`,
    'Content-Type': 'application/json',
  }
}

function listPath(scope: 'admin' | 'public', entity: ContentEntity, query: ContentListQuery = {}) {
  const params = new URLSearchParams()

  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value))
    }
  })

  const suffix = params.toString()
  return `/api/${scope}/${entity}${suffix ? `?${suffix}` : ''}`
}

export const adminContentClient = {
  list(entity: ContentEntity, token: string | null | undefined, query?: ContentListQuery) {
    return apiFetch<ContentListResponse>(listPath('admin', entity, query), {
      headers: adminHeaders(token),
    })
  },

  get(entity: ContentEntity, id: string, token: string | null | undefined) {
    return apiFetch<ContentItemResponse>(`/api/admin/${entity}/${encodeURIComponent(id)}`, {
      headers: adminHeaders(token),
    })
  },

  create(entity: ContentEntity, payload: Record<string, unknown>, token: string | null | undefined) {
    return apiFetch<ContentItemResponse>(`/api/admin/${entity}`, {
      method: 'POST',
      headers: adminHeaders(token),
      body: JSON.stringify(payload),
    })
  },

  update(entity: ContentEntity, id: string, payload: Record<string, unknown>, token: string | null | undefined) {
    return apiFetch<ContentItemResponse>(`/api/admin/${entity}/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: adminHeaders(token),
      body: JSON.stringify(payload),
    })
  },

  remove(entity: ContentEntity, id: string, token: string | null | undefined) {
    return apiFetch<ContentItemResponse>(`/api/admin/${entity}/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: adminHeaders(token),
    })
  },

  action(entity: ContentEntity, id: string, action: PublicationAction, token: string | null | undefined) {
    return apiFetch<ContentItemResponse>(`/api/admin/${entity}/${encodeURIComponent(id)}/${action}`, {
      method: 'POST',
      headers: adminHeaders(token),
    })
  },

  schedule(
    entity: ContentEntity,
    id: string,
    payload: { action: PublicationAction; run_at: string; timezone?: string },
    token: string | null | undefined,
  ) {
    return apiFetch<ContentItemResponse>(`/api/admin/${entity}/${encodeURIComponent(id)}/schedule`, {
      method: 'POST',
      headers: adminHeaders(token),
      body: JSON.stringify({
        timezone: 'America/Mexico_City',
        ...payload,
      }),
    })
  },

  duplicate(entity: ContentEntity, id: string, token: string | null | undefined) {
    return apiFetch<ContentItemResponse>(`/api/admin/${entity}/${encodeURIComponent(id)}/duplicate`, {
      method: 'POST',
      headers: adminHeaders(token),
    })
  },

  versions(entity: ContentEntity, id: string, token: string | null | undefined) {
    return apiFetch<ContentVersionsResponse>(`/api/admin/${entity}/${encodeURIComponent(id)}/versions`, {
      headers: adminHeaders(token),
    })
  },

  restoreVersion(entity: ContentEntity, id: string, version: number, token: string | null | undefined) {
    return apiFetch<ContentItemResponse>(
      `/api/admin/${entity}/${encodeURIComponent(id)}/versions/${version}/restore`,
      {
        method: 'POST',
        headers: adminHeaders(token),
      },
    )
  },

	  previewToken(entity: ContentEntity, id: string, token: string | null | undefined) {
	    return apiFetch<PreviewTokenResponse>(`/api/admin/${entity}/${encodeURIComponent(id)}/preview-token`, {
	      method: 'POST',
	      headers: adminHeaders(token),
	      body: JSON.stringify({ expiresInMinutes: 30, locale: 'es-MX' }),
	    })
	  },

  previewCampaignAudience(payload: CampaignAudienceFilters, token: string | null | undefined) {
    return apiFetch<CampaignAudiencePreviewResponse>('/api/admin/campaigns/audience-preview', {
      method: 'POST',
      headers: adminHeaders(token),
      body: JSON.stringify(payload),
    })
  },

  sendCampaign(id: string, payload: Record<string, unknown>, token: string | null | undefined) {
    return apiFetch<CampaignSendResponse>(`/api/admin/campaigns/${encodeURIComponent(id)}/send`, {
      method: 'POST',
      headers: adminHeaders(token),
      body: JSON.stringify(payload),
    })
  },
	}

export const publicContentClient = {
  list(entity: ContentEntity, query?: Pick<ContentListQuery, 'locale'>) {
    return apiFetch<{ ok: true; data: ContentRecord[] }>(listPath('public', entity, query))
  },

  getBySlug(entity: ContentEntity, slug: string, locale: ContentListQuery['locale'] = 'es-MX') {
    const params = new URLSearchParams({ locale: locale ?? 'es-MX' })
    return apiFetch<{ ok: true; data: ContentRecord }>(
      `/api/public/${entity}/${encodeURIComponent(slug)}?${params.toString()}`,
    )
  },
}

export const previewContentClient = {
  get(token: string) {
    return apiFetch<PreviewResponse>(`/api/preview/${encodeURIComponent(token)}`)
  },
}

export function getPreviewUrl(token: string) {
  const origin = typeof window !== 'undefined' && window.location?.origin
    ? window.location.origin
    : 'https://admhaciendadeletras.com'
  return `${origin}/vista-previa/${encodeURIComponent(token)}`
}
