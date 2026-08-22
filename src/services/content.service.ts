import { apiFetch } from './api'

export const contentEntities = [
  'wines',
  'experiences',
  'events',
  'grand-events',
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

export type EventTicketType = {
  id: string
  event_id: string
  name: string
  description?: string | null
  price: number
  capacity: number
  sold_count: number
  reserved_count?: number | null
  sales_start_at?: string | null
  sales_end_at?: string | null
  active: boolean
  status: 'draft' | 'published' | 'scheduled' | 'archived' | 'inactive' | string
  visible_in_app: boolean
  sort_order: number
  publish_at?: string | null
  unpublish_at?: string | null
  published_at?: string | null
  created_at?: string | null
  updated_at?: string | null
}

export type EventTicketTypePayload = {
  name: string
  description?: string | null
  price: number
  capacity: number
  sales_start_at?: string | null
  sales_end_at?: string | null
  active: boolean
  status: 'draft' | 'published' | 'scheduled' | 'archived' | 'inactive'
  visible_in_app: boolean
  sort_order: number
  publish_at?: string | null
  unpublish_at?: string | null
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

export type EditorialApprover = {
  id: string
  displayName: string
  email?: string | null
  roles: string[]
}

export type ApprovalRequestResponse = {
  ok: true
  data: {
    content: ContentRecord
    approval: Record<string, unknown>
    previewUrl?: string
  }
}

export type PreviewResponse = {
  ok: true
  entity: ContentEntity | 'wine' | 'experience' | 'event' | 'promotion' | 'membership_plan' | 'campaign'
  data: ContentRecord
}

export type CampaignAudienceFilters = {
  channels?: Array<'email' | 'push' | 'in_app'>
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
    channels: Array<'email' | 'push' | 'in_app'>
    channelTotals: Record<'email' | 'push' | 'in_app', number>
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
    channels: Array<'email' | 'push' | 'in_app'>
    sent: number
    pending: number
    failed: number
  }
}

export type CampaignMetricsResponse = {
  ok: true
  data: {
    campaignId: string
    recipients: number
    channels: Array<{
      channel: 'email' | 'push' | 'in_app'
      total: number
      delivered: number
      pending: number
      failed: number
      opened: number
      clicked: number
    }>
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

  approvers(entity: ContentEntity, token: string | null | undefined) {
    return apiFetch<{ ok: true; data: EditorialApprover[] }>(`/api/admin/${entity}/approvers`, {
      headers: adminHeaders(token),
    })
  },

  requestApproval(
    entity: ContentEntity,
    id: string,
    payload: { approverUserId: string; note?: string; expiresInMinutes?: number; locale?: string },
    token: string | null | undefined,
  ) {
    return apiFetch<ApprovalRequestResponse>(`/api/admin/${entity}/${encodeURIComponent(id)}/request-approval`, {
      method: 'POST',
      headers: adminHeaders(token),
      body: JSON.stringify(payload),
    })
  },

  approvalDecision(
    entity: ContentEntity,
    id: string,
    payload: { decision: 'approved' | 'rejected'; note?: string },
    token: string | null | undefined,
  ) {
    return apiFetch<ApprovalRequestResponse>(`/api/admin/${entity}/${encodeURIComponent(id)}/approval-decision`, {
      method: 'POST',
      headers: adminHeaders(token),
      body: JSON.stringify(payload),
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

  campaignMetrics(id: string, token: string | null | undefined) {
    return apiFetch<CampaignMetricsResponse>(`/api/admin/campaigns/${encodeURIComponent(id)}/metrics`, {
      headers: adminHeaders(token),
    })
  },

  eventTicketTypes(eventId: string, token: string | null | undefined) {
    return apiFetch<{ ok: true; data: EventTicketType[] }>(
      `/api/admin/events/${encodeURIComponent(eventId)}/ticket-types`,
      { headers: adminHeaders(token) },
    )
  },

  createEventTicketType(eventId: string, payload: EventTicketTypePayload, token: string | null | undefined) {
    return apiFetch<{ ok: true; data: EventTicketType }>(
      `/api/admin/events/${encodeURIComponent(eventId)}/ticket-types`,
      { method: 'POST', headers: adminHeaders(token), body: JSON.stringify(payload) },
    )
  },

  updateEventTicketType(eventId: string, ticketId: string, payload: Partial<EventTicketTypePayload>, token: string | null | undefined) {
    return apiFetch<{ ok: true; data: EventTicketType }>(
      `/api/admin/events/${encodeURIComponent(eventId)}/ticket-types/${encodeURIComponent(ticketId)}`,
      { method: 'PATCH', headers: adminHeaders(token), body: JSON.stringify(payload) },
    )
  },

  removeEventTicketType(eventId: string, ticketId: string, token: string | null | undefined) {
    return apiFetch<{ ok: true; data: EventTicketType }>(
      `/api/admin/events/${encodeURIComponent(eventId)}/ticket-types/${encodeURIComponent(ticketId)}`,
      { method: 'DELETE', headers: adminHeaders(token) },
    )
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
