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
  return (data ?? []).map((row) => extractRoleCode(row.roles)).filter((role): role is string => Boolean(role))
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

  const { data, error } = await supabaseAdminClient.auth.admin.listUsers({
    page,
    perPage,
  })

  if (error) {
    res.status(500).json({ ok: false, error: { code: 'INTERNAL_ERROR', message: 'No fue posible listar usuarios' } })
    return
  }

  let users = await Promise.all(data.users.map(async (user) => {
    const roles = await getUserRoles(user.id)
    const financialAccess = await userHasFinancialAccess({ userId: user.id, roles })
    return {
      id: user.id,
      email: user.email ?? null,
      emailVerified: Boolean(user.email_confirmed_at),
      createdAt: user.created_at,
      lastSignInAt: user.last_sign_in_at ?? null,
      roles,
      financialAccess,
      managedPasswordLocked: Boolean(user.app_metadata?.managed_password_locked),
    }
  }))

  if (search) {
    users = users.filter((user) => user.email?.toLowerCase().includes(search.toLowerCase()))
  }

  res.json({ users, page, perPage })
}

export async function getUserById(req: Request, res: Response): Promise<void> {
  const { data, error } = await supabaseAdminClient.auth.admin.getUserById(req.params.id)
  if (error || !data.user) {
    res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: 'Usuario no encontrado' } })
    return
  }

  const roles = await getUserRoles(data.user.id)
  const access = await resolveControlAccess({ userId: data.user.id, roles })

  res.json({
    user: {
      id: data.user.id,
      email: data.user.email ?? null,
      emailVerified: Boolean(data.user.email_confirmed_at),
      createdAt: data.user.created_at,
      roles,
      permissions: access.permissions,
      financialAccess: access.financialAccess,
      managedPasswordLocked: Boolean(data.user.app_metadata?.managed_password_locked),
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

  const { data, error } = await supabaseAdminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: {
      staff_account: true,
      managed_password_locked: true,
      must_change_password: false,
      static_credentials_issued_at: new Date().toISOString(),
    },
    user_metadata: {
      first_name: firstName,
      last_name: lastName,
      display_name: `${firstName} ${lastName}`.trim(),
    },
  })

  if (error || !data.user) {
    res.status(409).json({ ok: false, error: { code: 'CONFLICT', message: 'No fue posible crear usuario' } })
    return
  }

  await replaceUserRoles(data.user.id, roles)
  await replaceUserPermissions(data.user.id, requestedPermissions, req.authUser?.id)
  if (financialAccess) await setFinancialGrant(data.user.id, true, req.authUser?.id)

  await audit(req.authUser?.id, 'admin_user_created', 'auth.users', data.user.id, {
    roles,
    permissions: requestedPermissions,
    financialAccess,
    managedPasswordLocked: true,
  })
  res.status(201).json({ id: data.user.id, email: data.user.email ?? null, roles, permissions: requestedPermissions, financialAccess })
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
  const roles = targetIsElevatedAdmin ? existingRoles : requestedRoles.length ? requestedRoles : ['operations']
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
