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
  if (rawMessage.includes('LODGING_UNAVAILABLE')) throw httpError(409, 'No hay cabañas disponibles para esas fechas')
  if (rawMessage.includes('LODGING_HOLD_EXPIRED')) throw httpError(409, 'El bloqueo temporal de la cabaña expiró')
  if (rawMessage.includes('INVALID_LODGING_DATES')) throw httpError(422, 'Las fechas de hospedaje no son válidas')
  if (rawMessage.includes('LODGING_CHECKIN_NOT_DUE')) throw httpError(409, 'La estancia no está dentro de su ventana de check-in')
  if (rawMessage.includes('LODGING_STAY_NOT_FOUND')) throw httpError(404, 'Estancia de hospedaje no encontrada')
  if (rawMessage.includes('CABIN_PACKAGE_NOT_FOUND')) throw httpError(404, 'Paquete de cabaña no encontrado')
  if (rawMessage.includes('SLOT_NOT_BOOKABLE')) throw httpError(409, 'El horario no está disponible')
  if (rawMessage.includes('INVALID_STATUS_TRANSITION')) throw httpError(422, 'Transición de estado inválida')
  if (rawMessage.includes('INVALID_PEOPLE_COUNT')) throw httpError(422, 'Número de personas inválido')
  if (rawMessage.includes('INVALID_SLOT')) throw httpError(422, 'Horario inválido')
  if (rawMessage.includes('CUSTOMER_PROFILE_REQUIRED')) throw httpError(404, 'Cliente no vinculado a la sesión')
  if (rawMessage.includes('CUSTOMER_REQUIRED')) throw httpError(422, 'Datos del cliente requeridos')
  if (rawMessage.includes('ORDER_ITEMS_REQUIRED')) throw httpError(422, 'La orden requiere al menos una partida')
  if (rawMessage.includes('INVALID_ORDER_ITEM')) throw httpError(422, 'Partida de orden inválida')
  if (rawMessage.includes('CART_EMPTY')) throw httpError(422, 'El carrito no tiene partidas')
  if (rawMessage.includes('CART_ITEM_NOT_FOUND')) throw httpError(404, 'Partida de carrito no encontrada')
  if (rawMessage.includes('ITEM_NOT_AVAILABLE')) throw httpError(409, 'El producto no está disponible')
  if (rawMessage.includes('STOCK_UNAVAILABLE')) throw httpError(409, 'Existencia insuficiente')
  if (rawMessage.includes('INVALID_QUANTITY')) throw httpError(422, 'Cantidad inválida')
  if (rawMessage.includes('INVALID_PRICE')) throw httpError(422, 'Precio inválido')
  if (rawMessage.includes('IDEMPOTENCY_KEY_REQUIRED')) throw httpError(422, 'Idempotencia requerida')
  if (rawMessage.includes('ITEM_TYPE_NOT_ALLOWED')) throw httpError(422, 'Tipo de producto no permitido')
  if (rawMessage.includes('USE_RESERVATIONS_FLOW')) throw httpError(409, 'La experiencia debe reservarse desde disponibilidad')
  if (rawMessage.includes('INVALID_PAYMENT')) throw httpError(422, 'Pago inválido')
  if (rawMessage.includes('PAYMENT_EXCEEDS_TOTAL')) throw httpError(409, 'El pago excede el total de la orden')
  if (rawMessage.includes('REFUND_EXCEEDS_PAYMENT')) throw httpError(409, 'El reembolso excede el monto disponible')
  if (rawMessage.includes('SHIPPING_ADDRESS_INCOMPLETE')) throw httpError(422, 'Domicilio de envío incompleto')
  if (rawMessage.includes('SHIPPING_ADDRESS_REQUIRED')) throw httpError(422, 'Domicilio de envío requerido')
  if (rawMessage.includes('ORDER_NOT_PAID')) throw httpError(409, 'La orden aún no está pagada')
  if (rawMessage.includes('INVALID_QR_TOKEN')) throw httpError(422, 'Código QR inválido')
  if (rawMessage.includes('PASS_OWNER_REQUIRED')) throw httpError(422, 'El pase requiere orden o reservación')
  if (rawMessage.includes('PASS_NOT_ACCESS')) throw httpError(422, 'Este código no corresponde a una entrada o reservación')
  if (rawMessage.includes('ORDER_ACCESS_PASS_NOT_ALLOWED')) throw httpError(422, 'Las compras y órdenes de envío no generan QR de entrada')
  if (rawMessage.includes('PASS_ALREADY_USED')) throw httpError(409, 'El pase ya fue utilizado')
  if (rawMessage.includes('PASS_REVOKED')) throw httpError(409, 'El pase está revocado')
  if (rawMessage.includes('PASS_NOT_VALID')) throw httpError(409, 'El pase no está vigente')
  if (rawMessage.includes('CHECKIN_ALREADY_REVERSED')) throw httpError(409, 'El check-in ya fue revertido')
  if (rawMessage.includes('ORDER_NOT_FOUND')) throw httpError(404, 'Orden no encontrada')
  if (rawMessage.includes('PAYMENT_NOT_FOUND')) throw httpError(404, 'Pago no encontrado')
  if (rawMessage.includes('PASS_NOT_FOUND')) throw httpError(404, 'Pase no encontrado')
  if (rawMessage.includes('CHECKIN_NOT_FOUND')) throw httpError(404, 'Check-in no encontrado')
  if (rawMessage.includes('PLAN_NOT_FOUND')) throw httpError(404, 'Plan de membresía no encontrado')
  if (rawMessage.includes('MEMBERSHIP_NOT_FOUND')) throw httpError(404, 'Membresía no encontrada')
  if (rawMessage.includes('WINE_NOT_FOUND')) throw httpError(404, 'Vino no encontrado')
  if (rawMessage.includes('LOCATION_NOT_FOUND')) throw httpError(404, 'Ubicación no encontrada')
  if (rawMessage.includes('INVENTORY_ITEM_NOT_FOUND')) throw httpError(404, 'Inventario no encontrado')
  if (rawMessage.includes('SHIPMENT_NOT_FOUND')) throw httpError(404, 'Envío no encontrado')
  if (rawMessage.includes('SHIPMENT_NOT_REQUIRED')) throw httpError(422, 'Esta orden no requiere envío')
  if (rawMessage.includes('CARRIER_NOT_FOUND')) throw httpError(404, 'Transportista no encontrado')
  if (rawMessage.includes('DISTRIBUTOR_NOT_FOUND')) throw httpError(404, 'Distribuidor no encontrado')
  if (rawMessage.includes('DISTRIBUTOR_ORDER_NOT_FOUND')) throw httpError(404, 'Pedido de distribuidor no encontrado')
  if (rawMessage.includes('MEMBERSHIP_DUPLICATE')) throw httpError(409, 'El cliente ya tiene una membresía vigente')
  if (rawMessage.includes('LOYALTY_NEGATIVE_BALANCE')) throw httpError(409, 'El saldo de puntos no puede quedar negativo')
  if (rawMessage.includes('STOCK_NEGATIVE')) throw httpError(409, 'La existencia disponible no puede quedar negativa')
  if (rawMessage.includes('INVALID_LOYALTY_ADJUSTMENT')) throw httpError(422, 'Ajuste de puntos inválido')
  if (rawMessage.includes('INVALID_LOYALTY_ORDER')) throw httpError(422, 'La orden no puede acumular puntos')
  if (rawMessage.includes('INVALID_INVENTORY_MOVEMENT')) throw httpError(422, 'Movimiento de inventario inválido')
  if (rawMessage.includes('INVALID_SHIPMENT')) throw httpError(422, 'Envío inválido')

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
    423: 'LOCKED',
    422: 'UNPROCESSABLE',
    503: 'SERVICE_UNAVAILABLE',
  }
  const isOperational =
    error && typeof error === 'object' && 'isOperational' in error
      ? Boolean((error as { isOperational?: unknown }).isOperational)
      : false

  res.status(safeStatus).json({
    ok: false,
    error: {
      code: codeMap[safeStatus] ?? 'INTERNAL_ERROR',
      message:
        error instanceof Error && (safeStatus < 500 || isOperational)
          ? error.message
          : 'No fue posible completar la operación',
      requestId: (res.locals.requestId as string | undefined) ?? null,
    },
  })
}
