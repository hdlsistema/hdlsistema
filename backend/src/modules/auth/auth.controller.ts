import type { Request, Response } from 'express'
import { supabaseAdminClient } from '../../config/supabase'
import { enqueueAndProcessTransactionalEmail } from '../communications/communications.service'
import { ensureCustomerWelcomeEmail } from '../customer/customer.service'
import { httpError, sendOperationError } from '../operations/operationErrors'
import { customerRegistrationSchema, initialPasswordSchema } from './auth.schemas'

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

export async function ensureCustomerWelcome(req: Request, res: Response): Promise<void> {
  try {
    const user = req.authUser
    if (!user) {
      res.status(401).json({ ok: false, error: { code: 'UNAUTHORIZED', message: 'Sesión requerida' } })
      return
    }
    const result = await ensureCustomerWelcomeEmail({ userId: user.id, accessToken: req.authToken, roles: [] })
    res.json({ ok: true, data: result.data })
  } catch (error) {
    sendOperationError(res, error)
  }
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
    const { data, error } = await supabaseAdminClient.auth.admin.updateUserById(user.id, {
      password,
      app_metadata: {
        ...(user.app_metadata ?? {}),
        must_change_password: false,
        password_changed_at: changedAt,
      },
    })
    if (error || !data.user) throw error ?? httpError(500, 'No fue posible confirmar el cambio de contraseña')
    if (
      data.user.app_metadata?.must_change_password !== false
      || data.user.app_metadata?.password_changed_at !== changedAt
    ) {
      throw httpError(500, 'No fue posible confirmar el cambio de contraseña')
    }

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

export async function registerCustomer(req: Request, res: Response): Promise<void> {
  try {
    const input = customerRegistrationSchema.parse(req.body)
    const displayName = `${input.firstName} ${input.lastName}`.trim()
    const { data, error } = await supabaseAdminClient.auth.admin.createUser({
      email: input.email,
      password: input.password,
      email_confirm: true,
      user_metadata: {
        first_name: input.firstName,
        last_name: input.lastName,
        display_name: displayName,
        phone: input.phone || undefined,
        preferred_language: input.preferredLanguage,
      },
    })

    if (error) {
      const raw = `${error.code ?? ''} ${error.message ?? ''}`.toLowerCase()
      if (error.status === 422 || raw.includes('already') || raw.includes('registered') || raw.includes('exists')) {
        throw httpError(409, 'La cuenta ya existe. Inicia sesión o recupera tu contraseña.')
      }
      throw error
    }
    if (!data.user) throw new Error('No se recibió el usuario registrado')

    await supabaseAdminClient.from('audit_logs').insert({
      actor_user_id: data.user.id,
      action: 'customer_self_registered',
      entity_type: 'profiles',
      entity_id: data.user.id,
      after_data: {
        source: 'customer_app',
        preferredLanguage: input.preferredLanguage,
        emailConfirmedAtRegistration: true,
      },
    })

    const recipientEmail = data.user.email ?? input.email
    await enqueueAndProcessTransactionalEmail({
      eventType: 'customer.welcome',
      aggregateType: 'profiles',
      aggregateId: data.user.id,
      userId: data.user.id,
      recipientEmail,
      locale: input.preferredLanguage,
      payload: {
        customerName: displayName,
      },
      idempotencyKey: `customer.welcome:${data.user.id}`,
    }).catch(() => undefined)

    res.status(201).json({
      ok: true,
      data: {
        userId: data.user.id,
        email: recipientEmail,
        emailConfirmed: true,
      },
    })
  } catch (error) {
    sendOperationError(res, error)
  }
}
