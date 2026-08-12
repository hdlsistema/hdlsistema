import type { Request, Response } from 'express'
import { sendOperationError } from '../operations/operationErrors'
import {
  createCustomerStripePaymentSession,
  getCustomerStripePaymentStatus,
  retryCustomerStripePayment,
} from '../payments/payments.service'
import {
  addCustomerCartItem,
  cancelCustomerReservation,
  clearCustomerCart,
  createCustomerAddress,
  createCustomerOrder,
  createCustomerReservation,
  deleteCustomerAddress,
  disableCustomerDevice,
  getCustomerCart,
  getCustomerMe,
  getCustomerMembership,
  getCustomerMembershipLoyalty,
  getCustomerOrder,
  getCustomerReservation,
  listCustomerAvailability,
  listCustomerAccessPassesForMe,
  listCustomerAddresses,
  listCustomerMembershipBenefits,
  listCustomerMembershipHistory,
  listCustomerOrders,
  listCustomerReservations,
  registerCustomerDevice,
  removeCustomerCartItem,
  rescheduleCustomerReservation,
  updateCustomerCartItem,
  updateCustomerAddress,
  updateCustomerMe,
} from './customer.service'
import {
  addCustomerCartItemSchema,
  cancelCustomerReservationSchema,
  customerAddressSchema,
  customerAddressUpdateSchema,
  createCustomerOrderSchema,
  createCustomerReservationSchema,
  customerPaymentActionSchema,
  customerAvailabilityQuerySchema,
  customerProfilePatchSchema,
  customerReservationListQuerySchema,
  registerCustomerDeviceSchema,
  rescheduleCustomerReservationSchema,
  updateCustomerCartItemSchema,
} from './customer.schemas'

function userContext(req: Request) {
  return {
    userId: req.authUser?.id,
    accessToken: req.authToken,
    roles: req.authRoles ?? [],
  }
}

export async function getCustomerMeController(req: Request, res: Response): Promise<void> {
  try {
    const result = await getCustomerMe(userContext(req))
    res.json({ ok: true, data: result.data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function patchCustomerMeController(req: Request, res: Response): Promise<void> {
  try {
    const payload = customerProfilePatchSchema.parse(req.body)
    const result = await updateCustomerMe(payload, userContext(req))
    res.json({ ok: true, data: result.data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function registerCustomerDeviceController(req: Request, res: Response): Promise<void> {
  try {
    const payload = registerCustomerDeviceSchema.parse(req.body)
    const result = await registerCustomerDevice(payload, userContext(req))
    res.status(201).json({ ok: true, data: result.data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function disableCustomerDeviceController(req: Request, res: Response): Promise<void> {
  try {
    const payload = registerCustomerDeviceSchema.pick({ firebaseToken: true }).parse(req.body)
    const result = await disableCustomerDevice(payload.firebaseToken, userContext(req))
    res.json({ ok: true, data: result.data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function getCustomerAvailabilityController(req: Request, res: Response): Promise<void> {
  try {
    const query = customerAvailabilityQuerySchema.parse(req.query)
    const result = await listCustomerAvailability(query, userContext(req))
    res.json({ ok: true, data: result.data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function getCustomerExperienceAvailabilityController(req: Request, res: Response): Promise<void> {
  try {
    const query = customerAvailabilityQuerySchema.parse({
      ...req.query,
      experienceId: req.params.experienceId,
    })
    const result = await listCustomerAvailability(query, userContext(req))
    res.json({ ok: true, data: result.data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function listCustomerReservationsController(req: Request, res: Response): Promise<void> {
  try {
    const query = customerReservationListQuerySchema.parse(req.query)
    const result = await listCustomerReservations(query, userContext(req))
    res.json({
      ok: true,
      data: result.data,
      pagination: {
        page: query.page,
        perPage: query.perPage,
        total: result.count,
      },
    })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function listCustomerAccessPassesController(req: Request, res: Response): Promise<void> {
  try {
    const result = await listCustomerAccessPassesForMe(userContext(req))
    res.json({ ok: true, data: result.data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function getCustomerReservationController(req: Request, res: Response): Promise<void> {
  try {
    const result = await getCustomerReservation(req.params.id, userContext(req))
    res.json({ ok: true, data: result.data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function createCustomerReservationController(req: Request, res: Response): Promise<void> {
  try {
    const payload = createCustomerReservationSchema.parse(req.body)
    const result = await createCustomerReservation(payload, userContext(req))
    res.status(201).json({ ok: true, data: result.data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function cancelCustomerReservationController(req: Request, res: Response): Promise<void> {
  try {
    const payload = cancelCustomerReservationSchema.parse(req.body)
    const result = await cancelCustomerReservation(req.params.id, payload, userContext(req))
    res.json({ ok: true, data: result.data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function rescheduleCustomerReservationController(req: Request, res: Response): Promise<void> {
  try {
    const payload = rescheduleCustomerReservationSchema.parse(req.body)
    const result = await rescheduleCustomerReservation(req.params.id, payload, userContext(req))
    res.json({ ok: true, data: result.data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function getCustomerMembershipController(req: Request, res: Response): Promise<void> {
  try {
    const result = await getCustomerMembership(userContext(req))
    res.json({ ok: true, data: result.data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function getCustomerMembershipBenefitsController(req: Request, res: Response): Promise<void> {
  try {
    const result = await listCustomerMembershipBenefits(userContext(req))
    res.json({ ok: true, data: result.data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function getCustomerMembershipLoyaltyController(req: Request, res: Response): Promise<void> {
  try {
    const result = await getCustomerMembershipLoyalty(userContext(req))
    res.json({ ok: true, data: result.data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function getCustomerMembershipHistoryController(req: Request, res: Response): Promise<void> {
  try {
    const result = await listCustomerMembershipHistory(userContext(req))
    res.json({ ok: true, data: result.data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function getCustomerCartController(req: Request, res: Response): Promise<void> {
  try {
    const result = await getCustomerCart(userContext(req))
    res.json({ ok: true, data: result.data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function addCustomerCartItemController(req: Request, res: Response): Promise<void> {
  try {
    const payload = addCustomerCartItemSchema.parse(req.body)
    const result = await addCustomerCartItem(payload, userContext(req))
    res.status(201).json({ ok: true, data: result.data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function updateCustomerCartItemController(req: Request, res: Response): Promise<void> {
  try {
    const payload = updateCustomerCartItemSchema.parse(req.body)
    const result = await updateCustomerCartItem(req.params.id, payload, userContext(req))
    res.json({ ok: true, data: result.data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function removeCustomerCartItemController(req: Request, res: Response): Promise<void> {
  try {
    const result = await removeCustomerCartItem(req.params.id, userContext(req))
    res.json({ ok: true, data: result.data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function clearCustomerCartController(req: Request, res: Response): Promise<void> {
  try {
    const result = await clearCustomerCart(userContext(req))
    res.json({ ok: true, data: result.data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function listCustomerAddressesController(req: Request, res: Response): Promise<void> {
  try {
    const result = await listCustomerAddresses(userContext(req))
    res.json({ ok: true, data: result.data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function createCustomerAddressController(req: Request, res: Response): Promise<void> {
  try {
    const payload = customerAddressSchema.parse(req.body)
    const result = await createCustomerAddress(payload, userContext(req))
    res.status(201).json({ ok: true, data: result.data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function updateCustomerAddressController(req: Request, res: Response): Promise<void> {
  try {
    const payload = customerAddressUpdateSchema.parse(req.body)
    const result = await updateCustomerAddress(req.params.id, payload, userContext(req))
    res.json({ ok: true, data: result.data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function deleteCustomerAddressController(req: Request, res: Response): Promise<void> {
  try {
    const result = await deleteCustomerAddress(req.params.id, userContext(req))
    res.json({ ok: true, data: result.data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function createCustomerOrderController(req: Request, res: Response): Promise<void> {
  try {
    const payload = createCustomerOrderSchema.parse(req.body)
    const result = await createCustomerOrder(payload, userContext(req))
    res.status(201).json({ ok: true, data: result.data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function listCustomerOrdersController(req: Request, res: Response): Promise<void> {
  try {
    const result = await listCustomerOrders(userContext(req))
    res.json({ ok: true, data: result.data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function getCustomerOrderController(req: Request, res: Response): Promise<void> {
  try {
    const result = await getCustomerOrder(req.params.id, userContext(req))
    res.json({ ok: true, data: result.data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function createCustomerPaymentSessionController(req: Request, res: Response): Promise<void> {
  try {
    customerPaymentActionSchema.parse(req.body ?? {})
    const result = await createCustomerStripePaymentSession(req.params.id, userContext(req))
    res.status(201).json({ ok: true, data: result.data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function getCustomerPaymentStatusController(req: Request, res: Response): Promise<void> {
  try {
    const result = await getCustomerStripePaymentStatus(req.params.id, userContext(req))
    res.json({ ok: true, data: result.data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function retryCustomerPaymentController(req: Request, res: Response): Promise<void> {
  try {
    customerPaymentActionSchema.parse(req.body ?? {})
    const result = await retryCustomerStripePayment(req.params.id, userContext(req))
    res.status(201).json({ ok: true, data: result.data })
  } catch (error) {
    sendOperationError(res, error)
  }
}
