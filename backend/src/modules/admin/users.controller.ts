import type { Request, Response } from 'express'
import { supabaseAdminClient } from '../../config/supabase'
import {
  permissionCatalogForActor,
  normalizePermissionCodes,
  resolveControlAccess,
  rolesGrantFinancialAccess,
  userHasFinancialAccess,
} from './controlPermissions'

const ROLE_PRIORITY = ['super_admin', 'admin', 'operations', 'marketing', 'finance', 'viewer', 'customer']
const STAFF_ROLE_PRIORITY = ['operations', 'marketing', 'finance', 'viewer']
const STAFF_DIRECTORY_ROLES = new Set(STAFF_ROLE_PRIORITY)
const ADMIN_DIRECTORY_ROLES = new Set(['super_admin', 'admin'])

type AuthDirectoryUser = {
  id: string
  email?: string | null
  created_at: string
  email_confirmed_at?: string | null
  last_sign_in_at?: string | null
  app_metadata?: Record<string, unknown>
  user_metadata?: Record<string, unknown>
}

type StaffAccountKind = 'admin' | 'staff' | 'customer_staff'

type DirectoryIdentity = {
  firstName?: string | null
  lastName?: string | null
  displayName?: string | null
  email?: string | null
}

function extractRoleCode(value: unknown): string | null {
  if (Array.isArray(value)) {
    const first = value[0] as { code?: unknown } | undefined
    return typeof first?.code === 'string' ? first.code : null
  }
  if (value && typeof value === 'object') {
    const code = (value as { code?: unknown }).code
    return typeof code === 'string' ? code : null
  }
  return null
}

function cleanEmail(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

function cleanString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

async function getRoleId(roleCode: string): Promise<string | null> {
  const { data } = await supabaseAdminClient
    .from('roles')
    .select('id')
    .eq('code', roleCode)
    .maybeSingle()
  return data?.id ?? null
}

async function getUserRoles(userId: string): Promise<string[]> {
  const { data } = await supabaseAdminClient
    .from('user_roles')
    .select('roles(code)')
    .eq('user_id', userId)
  return sortRoles((data ?? []).map((row) => extractRoleCode(row.roles)).filter((role): role is string => Boolean(role)))
}

async function getUserRolesMap(userIds: string[]): Promise<Map<string, string[]>> {
  if (!userIds.length) return new Map()
  const { data } = await supabaseAdminClient
    .from('user_roles')
    .select('user_id,roles(code)')
    .in('user_id', userIds)
  const roles = new Map<string, string[]>()
  for (const row of data ?? []) {
    const userId = typeof row.user_id === 'string' ? row.user_id : ''
    const role = extractRoleCode(row.roles)
    if (!userId || !role) continue
    roles.set(userId, [...(roles.get(userId) ?? []), role])
  }
  return new Map([...roles.entries()].map(([userId, values]) => [userId, sortRoles(values)]))
}

async function getCustomerUserIds(userIds: string[]): Promise<Set<string>> {
  if (!userIds.length) return new Set()
  const { data, error } = await supabaseAdminClient
    .from('customers')
    .select('user_id')
    .in('user_id', userIds)
  if (error) return new Set()
  return new Set((data ?? []).map((row) => typeof row.user_id === 'string' ? row.user_id : '').filter(Boolean))
}

async function getCustomerIdentityMap(userIds: string[]): Promise<Map<string, DirectoryIdentity>> {
  if (!userIds.length) return new Map()
  const { data, error } = await supabaseAdminClient
    .from('customers')
    .select('user_id,first_name,last_name,display_name,email')
    .in('user_id', userIds)
  if (error) return new Map()
  const customers = new Map<string, DirectoryIdentity>()
  for (const row of data ?? []) {
    const userId = typeof row.user_id === 'string' ? row.user_id : ''
    if (!userId) continue
    customers.set(userId, {
      firstName: typeof row.first_name === 'string' ? row.first_name : null,
      lastName: typeof row.last_name === 'string' ? row.last_name : null,
      displayName: typeof row.display_name === 'string' ? row.display_name : null,
      email: typeof row.email === 'string' ? row.email : null,
    })
  }
  return customers
}

async function getProfileIdentityMap(userIds: string[]): Promise<Map<string, DirectoryIdentity>> {
  if (!userIds.length) return new Map()
  const { data, error } = await supabaseAdminClient
    .from('profiles')
    .select('id,first_name,last_name,display_name')
    .in('id', userIds)
  if (error) return new Map()
  const profiles = new Map<string, DirectoryIdentity>()
  for (const row of data ?? []) {
    const userId = typeof row.id === 'string' ? row.id : ''
    if (!userId) continue
    profiles.set(userId, {
      firstName: typeof row.first_name === 'string' ? row.first_name : null,
      lastName: typeof row.last_name === 'string' ? row.last_name : null,
      displayName: typeof row.display_name === 'string' ? row.display_name : null,
    })
  }
  return profiles
}

async function getFinancialGrantUserIds(userIds: string[]): Promise<Set<string>> {
  if (!userIds.length) return new Set()
  const { data, error } = await supabaseAdminClient
    .from('financial_access_grants')
    .select('user_id')
    .in('user_id', userIds)
    .is('revoked_at', null)
  if (error) return new Set()
  return new Set((data ?? []).map((row) => typeof row.user_id === 'string' ? row.user_id : '').filter(Boolean))
}

async function getExplicitPermissionsMap(userIds: string[]): Promise<Map<string, string[]>> {
  if (!userIds.length) return new Map()
  const { data, error } = await supabaseAdminClient
    .from('user_control_permissions')
    .select('user_id,permission_code')
    .in('user_id', userIds)
  if (error) return new Map()
  const permissions = new Map<string, string[]>()
  for (const row of data ?? []) {
    const userId = typeof row.user_id === 'string' ? row.user_id : ''
    const permission = typeof row.permission_code === 'string' ? row.permission_code : ''
    if (!userId || !permission) continue
    permissions.set(userId, [...(permissions.get(userId) ?? []), permission])
  }
  return permissions
}

function sortRoles(roles: string[]) {
  return [...new Set(roles)].sort((a, b) => {
    const priorityA = ROLE_PRIORITY.indexOf(a)
    const priorityB = ROLE_PRIORITY.indexOf(b)
    return (priorityA === -1 ? 999 : priorityA) - (priorityB === -1 ? 999 : priorityB)
  })
}

function roleIsStaffDirectoryVisible(role: string) {
  return STAFF_DIRECTORY_ROLES.has(role)
}

function hasStaffMetadata(user: AuthDirectoryUser) {
  return Boolean(user.app_metadata?.staff_account || user.app_metadata?.managed_password_locked)
}

function classifyStaffAccount(roles: string[], isCustomer: boolean): StaffAccountKind {
  if (isCustomer && roles.some((role) => STAFF_ROLE_PRIORITY.includes(role))) return 'customer_staff'
  if (rolesGrantFinancialAccess(roles)) return 'admin'
  return 'staff'
}

function accountLabel(kind: StaffAccountKind, roles: string[] = []) {
  if (roles.includes('super_admin')) return 'Super administrador'
  if (kind === 'customer_staff') return 'Cliente + staff'
  if (kind === 'admin') return 'Administrador'
  return 'Staff'
}

function cleanOptionalString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function cleanIdentityString(value: unknown, email?: string | null) {
  const cleaned = cleanOptionalString(value)
  if (!cleaned) return null
  const normalized = cleanEmail(cleaned)
  if (normalized && normalized === cleanEmail(email)) return null
  if (cleaned.includes('@')) return null
  return cleaned
}

function firstIdentityValue(email: string | null | undefined, ...values: unknown[]) {
  for (const value of values) {
    const cleaned = cleanIdentityString(value, email)
    if (cleaned) return cleaned
  }
  return null
}

function authIdentity(user: AuthDirectoryUser): DirectoryIdentity {
  return {
    firstName: firstIdentityValue(user.email, user.user_metadata?.first_name, user.user_metadata?.firstName, user.user_metadata?.given_name),
    lastName: firstIdentityValue(user.email, user.user_metadata?.last_name, user.user_metadata?.lastName, user.user_metadata?.family_name),
    displayName: firstIdentityValue(
      user.email,
      user.user_metadata?.display_name,
      user.user_metadata?.displayName,
      user.user_metadata?.full_name,
      user.user_metadata?.fullName,
      user.user_metadata?.name,
    ),
    email: user.email ?? null,
  }
}

function mergeIdentity(user: AuthDirectoryUser, profile?: DirectoryIdentity, customer?: DirectoryIdentity): Required<Pick<DirectoryIdentity, 'firstName' | 'lastName' | 'displayName'>> {
  const auth = authIdentity(user)
  const email = auth.email ?? user.email ?? profile?.email ?? customer?.email ?? null
  const firstName = firstIdentityValue(email, auth.firstName, profile?.firstName, customer?.firstName)
  const lastName = firstIdentityValue(email, auth.lastName, profile?.lastName, customer?.lastName)
  const fullName = cleanOptionalString([firstName, lastName].filter(Boolean).join(' '))
  const displayName = firstIdentityValue(email, auth.displayName, profile?.displayName, customer?.displayName) ??
    fullName
  return { firstName, lastName, displayName }
}

function visibleInStaffDirectory(user: AuthDirectoryUser, roles: string[], explicitPermissions: string[], hasExplicitFinancialGrant: boolean) {
  return hasStaffMetadata(user) ||
    roles.some(roleIsStaffDirectoryVisible) ||
    explicitPermissions.length > 0 ||
    hasExplicitFinancialGrant ||
    roles.some((role) => ADMIN_DIRECTORY_ROLES.has(role))
}

function mergeAssignableRoles(existingRoles: string[], staffRoles: string[]) {
  const preservedRoles = existingRoles.filter((role) => role === 'customer' || role === 'admin' || role === 'super_admin')
  return sortRoles([...preservedRoles, ...staffRoles])
}

async function listAllAuthUsers(): Promise<{ users: AuthDirectoryUser[]; error: unknown }> {
  const users: AuthDirectoryUser[] = []
  const perPage = 100
  const maxPages = 25
  for (let page = 1; page <= maxPages; page += 1) {
    const { data, error } = await supabaseAdminClient.auth.admin.listUsers({ page, perPage })
    if (error) return { users: [], error }
    const pageUsers = ((data?.users ?? []) as AuthDirectoryUser[])
    users.push(...pageUsers)
    if (pageUsers.length < perPage) break
  }
  return { users, error: null }
}

async function findAuthUserByEmail(email: string) {
  const { users } = await listAllAuthUsers()
  return users.find((user) => cleanEmail(user.email) === email) ?? null
}

function directoryRecord(user: AuthDirectoryUser, roles: string[], financialAccess: boolean, isCustomer: boolean, profile?: DirectoryIdentity, customer?: DirectoryIdentity) {
  const accountType = classifyStaffAccount(roles, isCustomer)
  const identity = mergeIdentity(user, profile, customer)
  return {
    id: user.id,
    email: user.email ?? null,
    firstName: identity.firstName,
    lastName: identity.lastName,
    displayName: identity.displayName,
    emailVerified: Boolean(user.email_confirmed_at),
    createdAt: user.created_at,
    lastSignInAt: user.last_sign_in_at ?? null,
    roles,
    financialAccess,
    managedPasswordLocked: Boolean(user.app_metadata?.managed_password_locked),
    isCustomer,
    isStaff: true,
    accountType,
    accountLabel: accountLabel(accountType, roles),
  }
}

async function audit(actorUserId: string | undefined, action: string, entityType: string, entityId: string, afterData?: unknown) {
  await supabaseAdminClient.from('audit_logs').insert({
    actor_user_id: actorUserId ?? null,
    action,
    entity_type: entityType,
    entity_id: entityId,
    after_data: afterData ?? null,
  })
}

async function replaceUserRoles(userId: string, roles: string[]) {
  await supabaseAdminClient.from('user_roles').delete().eq('user_id', userId)
  for (const role of roles) {
    const roleId = await getRoleId(role)
    if (roleId) {
      await supabaseAdminClient.from('user_roles').upsert({ user_id: userId, role_id: roleId }, { onConflict: 'user_id,role_id' })
    }
  }
}

async function replaceUserPermissions(userId: string, permissionCodes: string[], actorUserId?: string) {
  await supabaseAdminClient.from('user_control_permissions').delete().eq('user_id', userId)
  if (!permissionCodes.length) return
  await supabaseAdminClient.from('user_control_permissions').insert(
    permissionCodes.map((permissionCode) => ({
      user_id: userId,
      permission_code: permissionCode,
      granted_by: actorUserId ?? null,
    })),
  )
}

async function setFinancialGrant(userId: string, enabled: boolean, actorUserId?: string) {
  if (enabled) {
    await supabaseAdminClient.from('financial_access_grants').upsert({
      user_id: userId,
      granted_by: actorUserId ?? null,
      reason: 'Asignado desde Usuarios y permisos',
      revoked_at: null,
      revoked_by: null,
      revocation_reason: null,
    }, { onConflict: 'user_id' })
    return
  }

  await supabaseAdminClient
    .from('financial_access_grants')
    .update({
      revoked_at: new Date().toISOString(),
      revoked_by: actorUserId ?? null,
      revocation_reason: 'Retirado desde Usuarios y permisos',
    })
    .eq('user_id', userId)
}

function userContext(req: Request) {
  return {
    userId: req.authUser?.id,
    accessToken: req.authToken,
    roles: req.authRoles,
  }
}

export async function listUsers(req: Request, res: Response): Promise<void> {
  const page = Math.max(Number(req.query.page ?? 1), 1)
  const perPage = Math.min(Math.max(Number(req.query.perPage ?? 20), 1), 100)
  const search = cleanString(req.query.search)

  const { users: authUsers, error } = await listAllAuthUsers()

  if (error) {
    res.status(500).json({ ok: false, error: { code: 'INTERNAL_ERROR', message: 'No fue posible listar usuarios' } })
    return
  }

  const userIds = authUsers.map((user) => user.id)
  const [rolesMap, explicitPermissionsMap, customerUserIds, customerIdentityMap, profileIdentityMap, financialGrantUserIds] = await Promise.all([
    getUserRolesMap(userIds),
    getExplicitPermissionsMap(userIds),
    getCustomerUserIds(userIds),
    getCustomerIdentityMap(userIds),
    getProfileIdentityMap(userIds),
    getFinancialGrantUserIds(userIds),
  ])

  let users = authUsers.flatMap((user) => {
    const roles = rolesMap.get(user.id) ?? []
    const explicitPermissions = explicitPermissionsMap.get(user.id) ?? []
    const hasExplicitFinancialGrant = financialGrantUserIds.has(user.id)
    const financialAccess = rolesGrantFinancialAccess(roles) || hasExplicitFinancialGrant
    const profileIdentity = profileIdentityMap.get(user.id)
    const customerIdentity = customerIdentityMap.get(user.id)
    if (!visibleInStaffDirectory(user, roles, explicitPermissions, hasExplicitFinancialGrant)) return []
    return [directoryRecord(
      user,
      roles,
      financialAccess,
      customerUserIds.has(user.id) || roles.includes('customer'),
      profileIdentity,
      customerIdentity,
    )]
  })

  if (search) {
    const normalizedSearch = search.toLowerCase()
    users = users.filter((user) => [
      user.displayName,
      user.firstName,
      user.lastName,
      user.email,
      user.accountLabel,
    ].filter(Boolean).some((value) => String(value).toLowerCase().includes(normalizedSearch)))
  }

  users.sort((a, b) => (a.displayName ?? '').localeCompare(b.displayName ?? '', 'es-MX', { sensitivity: 'base' }))

  const from = (page - 1) * perPage
  res.json({ users: users.slice(from, from + perPage), page, perPage, total: users.length })
}

export async function getUserById(req: Request, res: Response): Promise<void> {
  const { data, error } = await supabaseAdminClient.auth.admin.getUserById(req.params.id)
  if (error || !data.user) {
    res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: 'Usuario no encontrado' } })
    return
  }

  const roles = await getUserRoles(data.user.id)
  const access = await resolveControlAccess({ userId: data.user.id, roles })
  const [customerUserIds, customerIdentityMap, profileIdentityMap] = await Promise.all([
    getCustomerUserIds([data.user.id]),
    getCustomerIdentityMap([data.user.id]),
    getProfileIdentityMap([data.user.id]),
  ])
  const isCustomer = customerUserIds.has(data.user.id) || roles.includes('customer')
  const accountType = classifyStaffAccount(roles, isCustomer)
  const identity = mergeIdentity(data.user, profileIdentityMap.get(data.user.id), customerIdentityMap.get(data.user.id))
  const isStaff = visibleInStaffDirectory(
    data.user,
    roles,
    access.permissions,
    access.financialAccess && !rolesGrantFinancialAccess(roles),
  )

  res.json({
    user: {
      id: data.user.id,
      email: data.user.email ?? null,
      firstName: identity.firstName,
      lastName: identity.lastName,
      displayName: identity.displayName,
      emailVerified: Boolean(data.user.email_confirmed_at),
      createdAt: data.user.created_at,
      roles,
      permissions: access.permissions,
      financialAccess: access.financialAccess,
      managedPasswordLocked: Boolean(data.user.app_metadata?.managed_password_locked),
      isCustomer,
      isStaff,
      accountType,
      accountLabel: accountLabel(accountType, roles),
    },
  })
}

export async function createUser(req: Request, res: Response): Promise<void> {
  const email = cleanEmail(req.body.email)
  const password = cleanString(req.body.password)
  const firstName = cleanString(req.body.firstName)
  const lastName = cleanString(req.body.lastName)

  if (!email || password.length < 8) {
    res.status(422).json({ ok: false, error: { code: 'UNPROCESSABLE', message: 'Payload inválido' } })
    return
  }

  const requestedRoles = Array.isArray(req.body.roles)
    ? req.body.roles.filter((role: unknown): role is string => typeof role === 'string' && STAFF_ROLE_PRIORITY.includes(role))
    : []
  const roles = requestedRoles.length ? requestedRoles : ['operations']
  const actorCanGrantFinancial = await userHasFinancialAccess(userContext(req))
  const financialAccess = actorCanGrantFinancial && Boolean(req.body.financialAccess)
  const requestedPermissions = normalizePermissionCodes(req.body.permissions, actorCanGrantFinancial)
    .filter((code) => code !== 'users.manage')

  const existingUser = await findAuthUserByEmail(email)
  const timestamp = new Date().toISOString()
  const userMetadata = {
    ...(existingUser?.user_metadata ?? {}),
    ...(firstName ? { first_name: firstName } : {}),
    ...(lastName ? { last_name: lastName } : {}),
    ...(`${firstName} ${lastName}`.trim() ? { display_name: `${firstName} ${lastName}`.trim() } : {}),
  }

  const target = existingUser
    ? await supabaseAdminClient.auth.admin.updateUserById(existingUser.id, {
        password,
        app_metadata: {
          ...(existingUser.app_metadata ?? {}),
          staff_account: true,
          managed_password_locked: true,
          must_change_password: false,
          static_credentials_rotated_at: timestamp,
        },
        user_metadata: userMetadata,
      })
    : await supabaseAdminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        app_metadata: {
          staff_account: true,
          managed_password_locked: true,
          must_change_password: false,
          static_credentials_issued_at: timestamp,
        },
        user_metadata: {
          first_name: firstName,
          last_name: lastName,
          display_name: `${firstName} ${lastName}`.trim(),
        },
      })

  if (target.error || !target.data.user) {
    res.status(409).json({ ok: false, error: { code: 'CONFLICT', message: 'No fue posible crear o convertir usuario staff' } })
    return
  }

  const targetUser = target.data.user as AuthDirectoryUser
  const existingRoles = existingUser ? await getUserRoles(targetUser.id) : []
  const nextRoles = mergeAssignableRoles(existingRoles, roles)
  const [customerUserIds, customerIdentityMap, profileIdentityMap] = await Promise.all([
    getCustomerUserIds([targetUser.id]),
    getCustomerIdentityMap([targetUser.id]),
    getProfileIdentityMap([targetUser.id]),
  ])
  const isCustomer = customerUserIds.has(targetUser.id) || nextRoles.includes('customer')
  const identity = mergeIdentity(targetUser, profileIdentityMap.get(targetUser.id), customerIdentityMap.get(targetUser.id))
  await replaceUserRoles(targetUser.id, nextRoles)
  await replaceUserPermissions(targetUser.id, requestedPermissions, req.authUser?.id)
  if (financialAccess) await setFinancialGrant(targetUser.id, true, req.authUser?.id)

  await audit(req.authUser?.id, existingUser ? 'admin_customer_promoted_to_staff' : 'admin_user_created', 'auth.users', targetUser.id, {
    roles: nextRoles,
    permissions: requestedPermissions,
    financialAccess,
    managedPasswordLocked: true,
    accountType: classifyStaffAccount(nextRoles, isCustomer),
  })
  res.status(existingUser ? 200 : 201).json({
    id: targetUser.id,
    email: targetUser.email ?? email,
    firstName: identity.firstName,
    lastName: identity.lastName,
    displayName: identity.displayName,
    roles: nextRoles,
    permissions: requestedPermissions,
    financialAccess,
    isCustomer,
    isStaff: true,
    accountType: classifyStaffAccount(nextRoles, isCustomer),
    accountLabel: accountLabel(classifyStaffAccount(nextRoles, isCustomer), nextRoles),
  })
}

export async function updateUser(req: Request, res: Response): Promise<void> {
  const updates = {
    first_name: cleanString(req.body.firstName),
    last_name: cleanString(req.body.lastName),
    display_name: cleanString(req.body.displayName),
    phone: cleanString(req.body.phone),
  }

  const { error } = await supabaseAdminClient
    .from('profiles')
    .update(updates)
    .eq('id', req.params.id)

  if (error) {
    res.status(500).json({ ok: false, error: { code: 'INTERNAL_ERROR', message: 'No fue posible actualizar usuario' } })
    return
  }

  await audit(req.authUser?.id, 'admin_user_updated', 'profiles', req.params.id, updates)
  res.json({ ok: true })
}

export async function assignUserRole(req: Request, res: Response): Promise<void> {
  const roleCode = cleanString(req.body.roleCode)
  if (!ROLE_PRIORITY.includes(roleCode)) {
    res.status(422).json({ ok: false, error: { code: 'UNPROCESSABLE', message: 'Rol inválido' } })
    return
  }

  const roleId = await getRoleId(roleCode)
  if (!roleId) {
    res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: 'Rol no encontrado' } })
    return
  }

  await supabaseAdminClient
    .from('user_roles')
    .upsert({ user_id: req.params.id, role_id: roleId }, { onConflict: 'user_id,role_id' })
  await audit(req.authUser?.id, 'admin_role_assigned', 'user_roles', req.params.id, { roleCode })
  res.json({ ok: true })
}

export async function removeUserRole(req: Request, res: Response): Promise<void> {
  const roleId = await getRoleId(req.params.roleCode)
  if (!roleId) {
    res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: 'Rol no encontrado' } })
    return
  }

  await supabaseAdminClient
    .from('user_roles')
    .delete()
    .eq('user_id', req.params.id)
    .eq('role_id', roleId)
  await audit(req.authUser?.id, 'admin_role_removed', 'user_roles', req.params.id, { roleCode: req.params.roleCode })
  res.json({ ok: true })
}

export async function disableUser(req: Request, res: Response): Promise<void> {
  const { error } = await supabaseAdminClient.auth.admin.updateUserById(req.params.id, {
    ban_duration: '876000h',
  } as never)
  if (error) {
    res.status(500).json({ ok: false, error: { code: 'INTERNAL_ERROR', message: 'No fue posible deshabilitar usuario' } })
    return
  }
  await audit(req.authUser?.id, 'admin_user_disabled', 'auth.users', req.params.id)
  res.json({ ok: true })
}

export async function enableUser(req: Request, res: Response): Promise<void> {
  const { error } = await supabaseAdminClient.auth.admin.updateUserById(req.params.id, {
    ban_duration: 'none',
  } as never)
  if (error) {
    res.status(500).json({ ok: false, error: { code: 'INTERNAL_ERROR', message: 'No fue posible habilitar usuario' } })
    return
  }
  await audit(req.authUser?.id, 'admin_user_enabled', 'auth.users', req.params.id)
  res.json({ ok: true })
}

export async function getCurrentControlAccess(req: Request, res: Response): Promise<void> {
  const access = await resolveControlAccess(userContext(req))
  res.json({ ok: true, data: access })
}

export async function getControlPermissionCatalog(req: Request, res: Response): Promise<void> {
  const financialAccess = await userHasFinancialAccess(userContext(req))
  res.json({ ok: true, data: permissionCatalogForActor(financialAccess), financialAccess })
}

export async function getUserPermissions(req: Request, res: Response): Promise<void> {
  const roles = await getUserRoles(req.params.id)
  const access = await resolveControlAccess({ userId: req.params.id, roles })
  res.json({ ok: true, data: { roles, permissions: access.permissions, financialAccess: access.financialAccess } })
}

export async function updateUserPermissions(req: Request, res: Response): Promise<void> {
  const actorCanGrantFinancial = await userHasFinancialAccess(userContext(req))
  const existingRoles = await getUserRoles(req.params.id)
  const targetIsElevatedAdmin = rolesGrantFinancialAccess(existingRoles)
  const requestedRoles = Array.isArray(req.body.roles)
    ? req.body.roles.filter((role: unknown): role is string => typeof role === 'string' && STAFF_ROLE_PRIORITY.includes(role))
    : []
  const roles = targetIsElevatedAdmin ? existingRoles : mergeAssignableRoles(existingRoles, requestedRoles.length ? requestedRoles : ['operations'])
  const permissions = normalizePermissionCodes(req.body.permissions, actorCanGrantFinancial)
    .filter((code) => targetIsElevatedAdmin || code !== 'users.manage')

  if (!targetIsElevatedAdmin) await replaceUserRoles(req.params.id, roles)
  await replaceUserPermissions(req.params.id, permissions, req.authUser?.id)
  if ('financialAccess' in req.body && actorCanGrantFinancial) {
    await setFinancialGrant(req.params.id, Boolean(req.body.financialAccess), req.authUser?.id)
  }

  const access = await resolveControlAccess({ userId: req.params.id, roles })
  await audit(req.authUser?.id, 'admin_permissions_updated', 'auth.users', req.params.id, {
    roles,
    permissions,
    financialAccess: access.financialAccess,
  })
  res.json({ ok: true, data: { roles, permissions: access.permissions, financialAccess: access.financialAccess } })
}

export async function rotateUserPassword(req: Request, res: Response): Promise<void> {
  const password = cleanString(req.body.password)
  if (password.length < 8) {
    res.status(422).json({ ok: false, error: { code: 'UNPROCESSABLE', message: 'La contraseña debe tener al menos 8 caracteres' } })
    return
  }

  const current = await supabaseAdminClient.auth.admin.getUserById(req.params.id)
  const { error } = await supabaseAdminClient.auth.admin.updateUserById(req.params.id, {
    password,
    app_metadata: {
      ...(current.data.user?.app_metadata ?? {}),
      managed_password_locked: true,
      must_change_password: false,
      static_credentials_rotated_at: new Date().toISOString(),
    },
  })
  if (error) {
    res.status(500).json({ ok: false, error: { code: 'INTERNAL_ERROR', message: 'No fue posible actualizar contraseña' } })
    return
  }

  await audit(req.authUser?.id, 'admin_staff_password_rotated', 'auth.users', req.params.id)
  res.json({ ok: true })
}
