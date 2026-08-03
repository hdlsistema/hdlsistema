import type { Request, Response } from 'express'
import { sendOperationError } from '../operations/operationErrors'
import {
  createDistributorContactSchema,
  createDistributorOrderSchema,
  createDistributorSchema,
  distributorListQuerySchema,
  distributorOrderListQuerySchema,
  distributorReasonSchema,
  patchDistributorContactSchema,
  patchDistributorOrderSchema,
  patchDistributorSchema,
} from './distributors.schemas'
import {
  archiveDistributor,
  createDistributor,
  createDistributorContact,
  createDistributorOrder,
  deactivateDistributorContact,
  exportDistributorOrders,
  exportDistributors,
  getDistributor,
  getDistributorOrder,
  listDistributorContacts,
  listDistributorOrderItems,
  listDistributorOrders,
  listDistributors,
  patchDistributor,
  patchDistributorContact,
  patchDistributorOrder,
  runDistributorOrderAction,
} from './distributors.service'

function userContext(req: Request) {
  return { userId: req.authUser?.id, accessToken: req.authToken, roles: req.authRoles }
}

export async function getDistributorsAdmin(req: Request, res: Response): Promise<void> {
  try {
    const query = distributorListQuerySchema.parse(req.query)
    const { data, count } = await listDistributors(query, userContext(req))
    res.json({ ok: true, data, pagination: { page: query.page, perPage: query.perPage, total: count } })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function getDistributorAdmin(req: Request, res: Response): Promise<void> {
  try {
    const { data } = await getDistributor(req.params.id, userContext(req))
    res.json({ ok: true, data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function postDistributorAdmin(req: Request, res: Response): Promise<void> {
  try {
    const payload = createDistributorSchema.parse(req.body)
    const { data } = await createDistributor(payload, userContext(req))
    res.status(201).json({ ok: true, data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function patchDistributorAdmin(req: Request, res: Response): Promise<void> {
  try {
    const payload = patchDistributorSchema.parse(req.body)
    const { data } = await patchDistributor(req.params.id, payload, userContext(req))
    res.json({ ok: true, data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function archiveDistributorAdmin(req: Request, res: Response): Promise<void> {
  try {
    const { data } = await archiveDistributor(req.params.id, true, userContext(req))
    res.json({ ok: true, data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function restoreDistributorAdmin(req: Request, res: Response): Promise<void> {
  try {
    const { data } = await archiveDistributor(req.params.id, false, userContext(req))
    res.json({ ok: true, data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function getDistributorContactsAdmin(req: Request, res: Response): Promise<void> {
  try {
    const { data } = await listDistributorContacts(req.params.id, userContext(req))
    res.json({ ok: true, data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function postDistributorContactAdmin(req: Request, res: Response): Promise<void> {
  try {
    const payload = createDistributorContactSchema.parse(req.body)
    const { data } = await createDistributorContact(req.params.id, payload, userContext(req))
    res.status(201).json({ ok: true, data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function patchDistributorContactAdmin(req: Request, res: Response): Promise<void> {
  try {
    const payload = patchDistributorContactSchema.parse(req.body)
    const { data } = await patchDistributorContact(req.params.id, req.params.contactId, payload, userContext(req))
    res.json({ ok: true, data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function deleteDistributorContactAdmin(req: Request, res: Response): Promise<void> {
  try {
    const { data } = await deactivateDistributorContact(req.params.id, req.params.contactId, userContext(req))
    res.json({ ok: true, data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function getDistributorOrdersAdmin(req: Request, res: Response): Promise<void> {
  try {
    const query = distributorOrderListQuerySchema.parse(req.query)
    const { data, count } = await listDistributorOrders(query, userContext(req))
    res.json({ ok: true, data, pagination: { page: query.page, perPage: query.perPage, total: count } })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function getDistributorOrderAdmin(req: Request, res: Response): Promise<void> {
  try {
    const { data } = await getDistributorOrder(req.params.id, userContext(req))
    res.json({ ok: true, data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function postDistributorOrderAdmin(req: Request, res: Response): Promise<void> {
  try {
    const payload = createDistributorOrderSchema.parse(req.body)
    const { data } = await createDistributorOrder(payload, userContext(req))
    res.status(201).json({ ok: true, data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function patchDistributorOrderAdmin(req: Request, res: Response): Promise<void> {
  try {
    const payload = patchDistributorOrderSchema.parse(req.body)
    const { data } = await patchDistributorOrder(req.params.id, payload, userContext(req))
    res.json({ ok: true, data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function distributorOrderActionAdmin(req: Request, res: Response): Promise<void> {
  try {
    const payload = distributorReasonSchema.parse(req.body ?? {})
    const { data } = await runDistributorOrderAction(req.params.id, req.params.action as 'approve' | 'reject' | 'prepare' | 'ship' | 'deliver' | 'cancel', payload.reason, userContext(req))
    res.json({ ok: true, data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function getDistributorOrderItemsAdmin(req: Request, res: Response): Promise<void> {
  try {
    const { data } = await listDistributorOrderItems(req.params.id, userContext(req))
    res.json({ ok: true, data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function getDistributorsExportAdmin(req: Request, res: Response): Promise<void> {
  try {
    const query = distributorListQuerySchema.parse(req.query)
    const csv = await exportDistributors(query, userContext(req))
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename="distribuidores-hacienda-de-letras.csv"')
    res.send(`\uFEFF${csv}`)
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function getDistributorOrdersExportAdmin(req: Request, res: Response): Promise<void> {
  try {
    const query = distributorOrderListQuerySchema.parse(req.query)
    const csv = await exportDistributorOrders(query, userContext(req))
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename="pedidos-distribuidores-hacienda-de-letras.csv"')
    res.send(`\uFEFF${csv}`)
  } catch (error) {
    sendOperationError(res, error)
  }
}
