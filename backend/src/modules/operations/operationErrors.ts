import type { Response } from 'express'
import { ZodError } from 'zod'

export type UserContext = {
  userId?: string
  accessToken?: string
  roles?: string[]
}

export function httpError(statusCode: number, message: string) {
  return Object.assign(new Error(message), { statusCode, isOperational: true })
}

export function requireOperationRole(user: UserContext, allowedRoles: string[]) {
  if (!user.roles?.some((role) => allowedRoles.includes(role))) {
    throw httpError(403, 'Permisos insuficientes')
  }
}

export function requireAccessToken(user: UserContext) {
  if (!user.accessToken) throw httpError(401, 'Token requerido')
  return user.accessToken
}

export function normalizeDatabaseError(error: unknown): never {
  const rawMessage =
    error && typeof error === 'object' && 'message' in error
      ? String((error as { message?: unknown }).message)
      : error instanceof Error
        ? error.message
        : 'Error de base de datos'

  if (rawMessage.includes('FORBIDDEN')) throw httpError(403, 'Permisos insuficientes')
  if (rawMessage.includes('NOT_FOUND')) throw httpError(404, 'Registro no encontrado')
  if (rawMessage.includes('CAPACITY_EXCEEDED')) throw httpError(409, 'No hay cupo suficiente')
  if (rawMessage.includes('SLOT_NOT_BOOKABLE')) throw httpError(409, 'El horario no está disponible')
  if (rawMessage.includes('INVALID_STATUS_TRANSITION')) throw httpError(422, 'Transición de estado inválida')
  if (rawMessage.includes('INVALID_PEOPLE_COUNT')) throw httpError(422, 'Número de personas inválido')
  if (rawMessage.includes('INVALID_SLOT')) throw httpError(422, 'Horario inválido')
  if (rawMessage.includes('CUSTOMER_REQUIRED')) throw httpError(422, 'Datos del cliente requeridos')

  throw httpError(500, 'No fue posible completar la operación')
}

export function assertNoError<T>(result: { data: T | null; error: unknown; count?: number | null }) {
  if (result.error) normalizeDatabaseError(result.error)
  return { data: result.data as T, count: result.count }
}

export function sendOperationError(res: Response, error: unknown) {
  if (error instanceof ZodError) {
    res.status(422).json({
      ok: false,
      error: {
        code: 'UNPROCESSABLE',
        message: 'Payload inválido',
        requestId: (res.locals.requestId as string | undefined) ?? null,
      },
    })
    return
  }

  const statusCode =
    error && typeof error === 'object' && 'statusCode' in error
      ? Number((error as { statusCode?: unknown }).statusCode)
      : 500
  const safeStatus = Number.isInteger(statusCode) && statusCode >= 400 ? statusCode : 500
  const codeMap: Record<number, string> = {
    400: 'BAD_REQUEST',
    401: 'UNAUTHORIZED',
    403: 'FORBIDDEN',
    404: 'NOT_FOUND',
    409: 'CONFLICT',
    422: 'UNPROCESSABLE',
  }

  res.status(safeStatus).json({
    ok: false,
    error: {
      code: codeMap[safeStatus] ?? 'INTERNAL_ERROR',
      message:
        error instanceof Error && safeStatus < 500
          ? error.message
          : 'No fue posible completar la operación',
      requestId: (res.locals.requestId as string | undefined) ?? null,
    },
  })
}
