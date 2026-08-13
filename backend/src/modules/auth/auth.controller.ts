import type { Request, Response } from 'express'
import { supabaseAdminClient } from '../../config/supabase'
import { sendOperationError } from '../operations/operationErrors'
import { initialPasswordSchema } from './auth.schemas'

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

export function getMe(req: Request, res: Response): void {
  const user = req.authUser
  if (!user) {
    res.status(401).json({ ok: false, error: { code: 'UNAUTHORIZED', message: 'Sesión requerida' } })
    return
  }

  res.json({
    id: user.id,
    email: user.email ?? null,
    emailVerified: Boolean(user.email_confirmed_at),
    createdAt: user.created_at,
  })
}

export async function getRoles(req: Request, res: Response): Promise<void> {
  const user = req.authUser
  if (!user) {
    res.status(401).json({ ok: false, error: { code: 'UNAUTHORIZED', message: 'Sesión requerida' } })
    return
  }

  const { data, error } = await supabaseAdminClient
    .from('user_roles')
    .select('roles(code)')
    .eq('user_id', user.id)

  if (error) {
    res.status(500).json({ ok: false, error: { code: 'INTERNAL_ERROR', message: 'No fue posible cargar roles' } })
    return
  }

  res.json({
    roles: (data ?? []).map((row) => extractRoleCode(row.roles)).filter(Boolean),
  })
}

export async function getProfile(req: Request, res: Response): Promise<void> {
  const user = req.authUser
  if (!user) {
    res.status(401).json({ ok: false, error: { code: 'UNAUTHORIZED', message: 'Sesión requerida' } })
    return
  }

  const { data, error } = await supabaseAdminClient
    .from('profiles')
    .select('id, first_name, last_name, display_name, phone, avatar_url, preferred_language, birth_date, created_at, updated_at')
    .eq('id', user.id)
    .maybeSingle()

  if (error) {
    res.status(500).json({ ok: false, error: { code: 'INTERNAL_ERROR', message: 'No fue posible cargar perfil' } })
    return
  }

  res.json({ profile: data })
}

export async function changeInitialPassword(req: Request, res: Response): Promise<void> {
  try {
    const user = req.authUser
    if (!user) {
      res.status(401).json({ ok: false, error: { code: 'UNAUTHORIZED', message: 'Sesión requerida' } })
      return
    }

    const { password } = initialPasswordSchema.parse(req.body)
    const changedAt = new Date().toISOString()
    const { error } = await supabaseAdminClient.auth.admin.updateUserById(user.id, {
      password,
      app_metadata: {
        ...(user.app_metadata ?? {}),
        must_change_password: false,
        password_changed_at: changedAt,
      },
    })
    if (error) throw error

    await supabaseAdminClient.from('audit_logs').insert({
      actor_user_id: user.id,
      action: 'initial_password_changed',
      entity_type: 'profiles',
      entity_id: user.id,
      after_data: { changedAt, source: 'required_first_login' },
    })

    res.json({ ok: true, data: { changedAt, mustChangePassword: false } })
  } catch (error) {
    sendOperationError(res, error)
  }
}
