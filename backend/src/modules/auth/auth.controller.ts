import type { Request, Response } from 'express'
import { supabaseAdminClient } from '../../config/supabase'

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
