import type { Request, Response, NextFunction } from 'express'

export interface AppError extends Error {
  statusCode?: number
  isOperational?: boolean
}

function httpCodeToString(status: number): string {
  const map: Record<number, string> = {
    400: 'BAD_REQUEST',
    401: 'UNAUTHORIZED',
    403: 'FORBIDDEN',
    404: 'NOT_FOUND',
    409: 'CONFLICT',
    422: 'UNPROCESSABLE',
    429: 'TOO_MANY_REQUESTS',
    500: 'INTERNAL_ERROR',
    503: 'SERVICE_UNAVAILABLE',
  }
  return map[status] ?? 'ERROR'
}

/**
 * Manejador centralizado de errores.
 * Formato uniforme: { ok: false, error: { code, message, requestId } }
 * En producción oculta stack traces y detalles internos.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const statusCode = err.statusCode ?? 500
  const isProduction = process.env.NODE_ENV === 'production'

  console.error(
    `[error] ${statusCode} ${httpCodeToString(statusCode)}: ${err.message}`,
  )

  const safeMessage =
    isProduction && statusCode >= 500 ? 'Internal server error' : err.message

  res.status(statusCode).json({
    ok: false,
    error: {
      code: httpCodeToString(statusCode),
      message: safeMessage,
      requestId: (res.locals.requestId as string | undefined) ?? null,
    },
  })
}
