export const CONTENT_ROUTE_ENTITIES = [
  'wines',
  'experiences',
  'events',
  'promotions',
  'membership-plans',
  'campaigns',
] as const

export type ContentRouteEntity = (typeof CONTENT_ROUTE_ENTITIES)[number]

export type ContentEntityType =
  | 'wine'
  | 'experience'
  | 'event'
  | 'promotion'
  | 'membership_plan'
  | 'campaign'

export type ContentAction =
  | 'read'
  | 'create'
  | 'update'
  | 'publish'
  | 'unpublish'
  | 'schedule'
  | 'archive'
  | 'restore'
  | 'delete'
  | 'duplicate'
  | 'preview'

export type ContentConfig = {
  route: ContentRouteEntity
  entityType: ContentEntityType
  table: string
  slugColumn?: string
  codeColumn?: string
  publicEnabled: boolean
  searchColumns: string[]
  adminSelect: string
  publicSelect: string
  publishStatus: string
  unpublishStatus: string
  archiveStatus: string
  restoreStatus: string
}

export type ContentListQuery = {
  page: number
  perPage: number
  search?: string
  status?: string
  locale: string
  orderBy: string
  orderDirection: 'asc' | 'desc'
}

export type PublicationAction = 'publish' | 'unpublish' | 'archive' | 'restore'
