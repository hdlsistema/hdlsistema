import type { ContentConfig, ContentRouteEntity } from './content.types'

export const contentConfigs: Record<ContentRouteEntity, ContentConfig> = {
  wines: {
    route: 'wines',
    entityType: 'wine',
    table: 'wines',
    slugColumn: 'slug',
    publicEnabled: true,
    searchColumns: ['name', 'sku', 'slug', 'subtitle'],
    adminSelect: '*',
    publicSelect:
      'id,sku,slug,name,subtitle,description,category_id,vintage,grape_variety,alcohol_percentage,volume_ml,origin,tasting_notes,pairing_notes,serving_temperature,price,compare_at_price,stock_quantity,stock_control_enabled,featured,status,cover_image_url,visible_in_app,sort_order,publish_at,unpublish_at,published_at,locale,version,wine_images(id,url,alt_text,sort_order,status,visible_in_app,publish_at,unpublish_at,archived_at,deleted_at)',
    publishStatus: 'published',
    unpublishStatus: 'inactive',
    archiveStatus: 'archived',
    restoreStatus: 'draft',
  },
  experiences: {
    route: 'experiences',
    entityType: 'experience',
    table: 'experiences',
    slugColumn: 'slug',
    publicEnabled: true,
    searchColumns: ['title', 'slug', 'subtitle', 'short_description'],
    adminSelect: '*',
    publicSelect:
      'id,slug,title,subtitle,description,short_description,duration_minutes,base_price,min_people,max_people,capacity,location,featured,status,cover_image_url,visible_in_app,sort_order,publish_at,unpublish_at,published_at,locale,version,experience_images(id,url,alt_text,sort_order,status,visible_in_app,publish_at,unpublish_at,archived_at,deleted_at)',
    publishStatus: 'published',
    unpublishStatus: 'inactive',
    archiveStatus: 'archived',
    restoreStatus: 'draft',
  },
  events: {
    route: 'events',
    entityType: 'event',
    table: 'events',
    slugColumn: 'slug',
    publicEnabled: true,
    searchColumns: ['title', 'slug', 'subtitle', 'venue'],
    adminSelect: '*',
    publicSelect:
      'id,slug,title,subtitle,description,short_description,venue,start_at,end_at,capacity,sold_count,reserved_count,featured,status,visible_in_app,sales_enabled,cover_image_url,sort_order,publish_at,unpublish_at,published_at,locale,version,event_images(id,url,alt_text,sort_order,status,visible_in_app,publish_at,unpublish_at,archived_at,deleted_at),event_ticket_types(id,name,description,price,capacity,sold_count,reserved_count,active,status,visible_in_app,sales_start_at,sales_end_at,publish_at,unpublish_at,archived_at,deleted_at)',
    publishStatus: 'published',
    unpublishStatus: 'inactive',
    archiveStatus: 'archived',
    restoreStatus: 'draft',
  },
  promotions: {
    route: 'promotions',
    entityType: 'promotion',
    table: 'promotions',
    codeColumn: 'code',
    publicEnabled: true,
    searchColumns: ['name', 'code', 'description', 'target_segment'],
    adminSelect: '*',
    publicSelect:
      'id,code,name,description,promotion_type,discount_type,discount_value,minimum_amount,maximum_discount,starts_at,ends_at,usage_limit,usage_per_customer,target_segment,status,visible_in_app,sort_order,publish_at,unpublish_at,published_at,locale,version',
    publishStatus: 'published',
    unpublishStatus: 'inactive',
    archiveStatus: 'archived',
    restoreStatus: 'draft',
  },
  'membership-plans': {
    route: 'membership-plans',
    entityType: 'membership_plan',
    table: 'membership_plans',
    codeColumn: 'code',
    publicEnabled: true,
    searchColumns: ['name', 'code', 'description', 'billing_period'],
    adminSelect: '*',
    publicSelect:
      'id,code,name,description,price,billing_period,benefits,daily_sommelier_limit,active,status,visible_in_app,sort_order,publish_at,unpublish_at,published_at,locale,version',
    publishStatus: 'published',
    unpublishStatus: 'inactive',
    archiveStatus: 'archived',
    restoreStatus: 'draft',
  },
  campaigns: {
    route: 'campaigns',
    entityType: 'campaign',
    table: 'campaigns',
    publicEnabled: false,
    searchColumns: ['name', 'channel'],
    adminSelect: '*',
    publicSelect:
      'id,name,channel,audience_definition,content,scheduled_at,status,visible_in_app,sort_order,publish_at,unpublish_at,published_at,locale,version',
    publishStatus: 'active',
    unpublishStatus: 'paused',
    archiveStatus: 'cancelled',
    restoreStatus: 'draft',
  },
}

export function getContentConfig(routeEntity: string): ContentConfig | null {
  return contentConfigs[routeEntity as ContentRouteEntity] ?? null
}
