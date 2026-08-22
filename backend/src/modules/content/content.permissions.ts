import type { ContentAction, ContentEntityType } from './content.types'

const adminRoles = ['super_admin', 'admin', 'operations', 'marketing', 'finance', 'viewer']

const allActions: ContentAction[] = [
  'read',
  'create',
  'update',
  'publish',
  'unpublish',
  'schedule',
  'archive',
  'restore',
  'delete',
  'duplicate',
  'preview',
]

const editorActions: ContentAction[] = [
  'create',
  'update',
  'publish',
  'unpublish',
  'schedule',
  'archive',
  'restore',
  'delete',
  'duplicate',
  'preview',
]

const operationsEntities: ContentEntityType[] = ['experience', 'event']
const marketingEntities: ContentEntityType[] = ['promotion', 'campaign', 'event', 'experience', 'wine']
const financeEntities: ContentEntityType[] = ['wine', 'membership_plan']
const marketingActions: ContentAction[] = [
  'create',
  'update',
  'publish',
  'unpublish',
  'schedule',
  'archive',
  'restore',
  'duplicate',
  'preview',
]

export const contentAdminRoles = adminRoles

export function canAccessContent(
  roles: string[] | undefined,
  entityType: ContentEntityType,
  action: ContentAction,
): boolean {
  const roleSet = new Set(roles ?? [])
  if (roleSet.has('super_admin')) return true
  if (roleSet.has('admin')) return allActions.includes(action)
  if (action === 'read') {
    return adminRoles.some((role) => roleSet.has(role))
  }
  if (action === 'preview') {
    return ['operations', 'marketing', 'finance'].some((role) => roleSet.has(role))
  }
  if (
    roleSet.has('operations') &&
    operationsEntities.includes(entityType) &&
    ['create', 'update', 'schedule', 'archive', 'restore', 'duplicate'].includes(action)
  ) {
    return true
  }
  if (
    roleSet.has('marketing') &&
    marketingEntities.includes(entityType) &&
    marketingActions.includes(action)
  ) {
    return true
  }
  if (
    roleSet.has('finance') &&
    financeEntities.includes(entityType) &&
    ['update'].includes(action)
  ) {
    return true
  }
  return false
}
