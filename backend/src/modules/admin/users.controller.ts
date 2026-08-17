import type { Request, Response } from 'express'
import { supabaseAdminClient } from '../../config/supabase'

const ROLE_PRIORITY = ['super_admin', 'admin', 'operations', 'marketing', 'finance', 'viewer', 'customer']

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

async function audit(actorUserId: string | undefined, action: string, entityType: string, entityId: string, afterData?: unknown) {
  await supabaseAdminClient.from('audit_logs').insert({
    actor_user_id: actorUserId ?? null,
    action,
    entity_type: entityType,
    entity_id: entityId,
    after_data: afterData ?? null,
  })
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

  let users = data.users.map((user) => ({
    id: user.id,
    email: user.email ?? null,
    emailVerified: Boolean(user.email_confirmed_at),
    createdAt: user.created_at,
    lastSignInAt: user.last_sign_in_at ?? null,
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

  const { data: roles } = await supabaseAdminClient
    .from('user_roles')
    .select('roles(code)')
    .eq('user_id', data.user.id)

  res.json({
    user: {
      id: data.user.id,
      email: data.user.email ?? null,
      emailVerified: Boolean(data.user.email_confirmed_at),
      createdAt: data.user.created_at,
      roles: (roles ?? []).map((row) => extractRoleCode(row.roles)).filter(Boolean),
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
    ? req.body.roles.filter((role: unknown): role is string => typeof role === 'string' && ROLE_PRIORITY.includes(role))
    : []

  const { data, error } = await supabaseAdminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: Boolean(req.body.emailConfirmed),
    app_metadata: {
      must_change_password: true,
      temporary_credentials_issued_at: new Date().toISOString(),
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

  for (const role of requestedRoles) {
    const roleId = await getRoleId(role)
    if (roleId) {
      await supabaseAdminClient.from('user_roles').insert({ user_id: data.user.id, role_id: roleId })
    }
  }

  await audit(req.authUser?.id, 'admin_user_created', 'auth.users', data.user.id, { roles: requestedRoles })
  res.status(201).json({ id: data.user.id, email: data.user.email ?? null })
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
