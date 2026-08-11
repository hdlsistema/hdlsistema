import type { Request, Response } from 'express'
import { sendOperationError } from '../operations/operationErrors'
import {
  createCabinReservationSchema,
  createQuoteRequestSchema,
  createRestaurantReservationSchema,
  patchQuoteRequestSchema,
  publicCommercialQuerySchema,
  quoteRequestListQuerySchema,
} from './commercial.schemas'
import {
  createCabinReservation,
  createQuoteRequest,
  createRestaurantReservation,
  getQuoteRequest,
  listPublicCommercialServices,
  listQuoteRequests,
  updateQuoteRequest,
} from './commercial.service'

function userContext(req: Request) {
  return {
    userId: req.authUser?.id,
    accessToken: req.authToken,
    roles: req.authRoles,
  }
}

export async function listPublicCommercial(req: Request, res: Response): Promise<void> {
  try {
    publicCommercialQuerySchema.parse(req.query)
    const { data } = await listPublicCommercialServices()
    res.json({ ok: true, data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function createCabinReservationCustomer(req: Request, res: Response): Promise<void> {
  try {
    const payload = createCabinReservationSchema.parse(req.body)
    const { data, duplicate } = await createCabinReservation(payload, userContext(req))
    res.status(duplicate ? 200 : 201).json({ ok: true, data, duplicate })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function createRestaurantReservationCustomer(req: Request, res: Response): Promise<void> {
  try {
    const payload = createRestaurantReservationSchema.parse(req.body)
    const { data, duplicate } = await createRestaurantReservation(payload, userContext(req))
    res.status(duplicate ? 200 : 201).json({ ok: true, data, duplicate })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function createQuoteRequestCustomer(req: Request, res: Response): Promise<void> {
  try {
    const payload = createQuoteRequestSchema.parse(req.body)
    const { data, duplicate } = await createQuoteRequest(payload, userContext(req))
    res.status(duplicate ? 200 : 201).json({ ok: true, data, duplicate })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function listQuoteRequestsAdmin(req: Request, res: Response): Promise<void> {
  try {
    const query = quoteRequestListQuerySchema.parse(req.query)
    const { data, count } = await listQuoteRequests(query, userContext(req))
    res.json({ ok: true, data, pagination: { page: query.page, perPage: query.perPage, total: count } })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function getQuoteRequestAdmin(req: Request, res: Response): Promise<void> {
  try {
    const { data } = await getQuoteRequest(req.params.id, userContext(req))
    res.json({ ok: true, data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function patchQuoteRequestAdmin(req: Request, res: Response): Promise<void> {
  try {
    const payload = patchQuoteRequestSchema.parse(req.body)
    const { data } = await updateQuoteRequest(req.params.id, payload, userContext(req))
    res.json({ ok: true, data })
  } catch (error) {
    sendOperationError(res, error)
  }
}
