import type { Request, Response } from 'express'
import { sendOperationError } from '../operations/operationErrors'
import {
  createCabinReservationSchema,
  createAdminQuoteRequestSchema,
  createQuoteRequestSchema,
  createRestaurantReservationSchema,
  cabinCatalogSchema,
  commercialCatalogEntitySchema,
  patchQuoteRequestSchema,
  publicCommercialQuerySchema,
  quoteRequestListQuerySchema,
  sendQuoteRequestEmailSchema,
  restaurantCatalogSchema,
  venueCatalogSchema,
} from './commercial.schemas'
import {
  createCabinReservation,
  createQuoteRequestAdmin,
  createQuoteRequest,
  createRestaurantReservation,
  listAdminCommercialCatalog,
  getQuoteRequest,
  listPublicCommercialServices,
  listQuoteRequests,
  sendQuoteRequestEmail,
  saveCommercialCatalogItem,
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
    const query = publicCommercialQuerySchema.parse(req.query)
    const { data } = await listPublicCommercialServices(query.locale ?? 'es-MX')
    res.json({ ok: true, data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function listCommercialCatalogAdmin(req: Request, res: Response): Promise<void> {
  try { res.json({ ok: true, ...(await listAdminCommercialCatalog(userContext(req))) }) }
  catch (error) { sendOperationError(res, error) }
}

export async function saveCommercialCatalogAdmin(req: Request, res: Response): Promise<void> {
  try {
    const entity = commercialCatalogEntitySchema.parse(req.params.entity)
    const schema = entity === 'cabins' ? cabinCatalogSchema : entity === 'restaurants' ? restaurantCatalogSchema : venueCatalogSchema
    const payload = schema.parse(req.body)
    const response = await saveCommercialCatalogItem(entity, req.params.id ?? null, payload, userContext(req))
    res.status(req.params.id ? 200 : 201).json({ ok: true, ...response })
  } catch (error) { sendOperationError(res, error) }
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

export async function createQuoteRequestAdminController(req: Request, res: Response): Promise<void> {
  try {
    const payload = createAdminQuoteRequestSchema.parse(req.body)
    const { data, duplicate } = await createQuoteRequestAdmin(payload, userContext(req))
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

export async function sendQuoteRequestEmailAdmin(req: Request, res: Response): Promise<void> {
  try {
    const payload = sendQuoteRequestEmailSchema.parse(req.body)
    const { data } = await sendQuoteRequestEmail(req.params.id, payload, userContext(req))
    res.status(202).json({ ok: true, data })
  } catch (error) {
    sendOperationError(res, error)
  }
}
