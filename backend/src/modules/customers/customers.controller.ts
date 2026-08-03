import type { Request, Response } from 'express'
import { sendOperationError } from '../operations/operationErrors'
import {
  assignTagSchema,
  customerListQuerySchema,
  customerNotePayloadSchema,
  customerPatchSchema,
  customerPayloadSchema,
  customerTagPatchSchema,
  customerTagPayloadSchema,
} from './customers.schemas'
import {
  addCustomerNote,
  archiveCustomer,
  assignCustomerTag,
  createCustomer,
  createCustomerTag,
  deleteCustomerNote,
  deleteCustomerTag,
  exportCustomers,
  getCustomer,
  listCustomerHistory,
  listCustomerMemberships,
  listCustomerOrders,
  listCustomerReservations,
  listCustomers,
  listCustomerTags,
  restoreCustomer,
  unassignCustomerTag,
  updateCustomer,
  updateCustomerNote,
  updateCustomerTag,
} from './customers.service'

function userContext(req: Request) {
  return {
    userId: req.authUser?.id,
    accessToken: req.authToken,
    roles: req.authRoles,
  }
}

export async function getCustomers(req: Request, res: Response): Promise<void> {
  try {
    const query = customerListQuerySchema.parse(req.query)
    const { data, count } = await listCustomers(query, userContext(req))
    res.json({ ok: true, data, pagination: { page: query.page, perPage: query.perPage, total: count } })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function getCustomerById(req: Request, res: Response): Promise<void> {
  try {
    const { data } = await getCustomer(req.params.id, userContext(req))
    res.json({ ok: true, data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function postCustomer(req: Request, res: Response): Promise<void> {
  try {
    const payload = customerPayloadSchema.parse(req.body)
    const { data } = await createCustomer(payload, userContext(req))
    res.status(201).json({ ok: true, data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function patchCustomer(req: Request, res: Response): Promise<void> {
  try {
    const payload = customerPatchSchema.parse(req.body)
    const { data } = await updateCustomer(req.params.id, payload, userContext(req))
    res.json({ ok: true, data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function postArchiveCustomer(req: Request, res: Response): Promise<void> {
  try {
    const { data } = await archiveCustomer(req.params.id, userContext(req))
    res.json({ ok: true, data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function postRestoreCustomer(req: Request, res: Response): Promise<void> {
  try {
    const { data } = await restoreCustomer(req.params.id, userContext(req))
    res.json({ ok: true, data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function getCustomerReservations(req: Request, res: Response): Promise<void> {
  try {
    const { data } = await listCustomerReservations(req.params.id, userContext(req))
    res.json({ ok: true, data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function getCustomerOrders(req: Request, res: Response): Promise<void> {
  try {
    const { data } = await listCustomerOrders(req.params.id, userContext(req))
    res.json({ ok: true, data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function getCustomerMemberships(req: Request, res: Response): Promise<void> {
  try {
    const { data } = await listCustomerMemberships(req.params.id, userContext(req))
    res.json({ ok: true, data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function getCustomerHistory(req: Request, res: Response): Promise<void> {
  try {
    const { data } = await listCustomerHistory(req.params.id, userContext(req))
    res.json({ ok: true, data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function postCustomerNote(req: Request, res: Response): Promise<void> {
  try {
    const payload = customerNotePayloadSchema.parse(req.body)
    const { data } = await addCustomerNote(req.params.id, payload, userContext(req))
    res.status(201).json({ ok: true, data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function patchCustomerNote(req: Request, res: Response): Promise<void> {
  try {
    const payload = customerNotePayloadSchema.parse(req.body)
    const { data } = await updateCustomerNote(req.params.id, req.params.noteId, payload, userContext(req))
    res.json({ ok: true, data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function removeCustomerNote(req: Request, res: Response): Promise<void> {
  try {
    const { data } = await deleteCustomerNote(req.params.id, req.params.noteId, userContext(req))
    res.json({ ok: true, data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function postCustomerTag(req: Request, res: Response): Promise<void> {
  try {
    const payload = assignTagSchema.parse(req.body)
    const { data } = await assignCustomerTag(req.params.id, payload.tagId, userContext(req))
    res.status(201).json({ ok: true, data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function removeCustomerTag(req: Request, res: Response): Promise<void> {
  try {
    const { data } = await unassignCustomerTag(req.params.id, req.params.tagId, userContext(req))
    res.json({ ok: true, data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function getCustomerTags(req: Request, res: Response): Promise<void> {
  try {
    const { data } = await listCustomerTags(userContext(req))
    res.json({ ok: true, data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function postCustomerTagDefinition(req: Request, res: Response): Promise<void> {
  try {
    const payload = customerTagPayloadSchema.parse(req.body)
    const { data } = await createCustomerTag(payload, userContext(req))
    res.status(201).json({ ok: true, data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function patchCustomerTagDefinition(req: Request, res: Response): Promise<void> {
  try {
    const payload = customerTagPatchSchema.parse(req.body)
    const { data } = await updateCustomerTag(req.params.id, payload, userContext(req))
    res.json({ ok: true, data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function removeCustomerTagDefinition(req: Request, res: Response): Promise<void> {
  try {
    const { data } = await deleteCustomerTag(req.params.id, userContext(req))
    res.json({ ok: true, data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function getCustomersExport(req: Request, res: Response): Promise<void> {
  try {
    const query = customerListQuerySchema.parse(req.query)
    const csv = await exportCustomers(query, userContext(req))
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename="clientes-hacienda-de-letras.csv"')
    res.send(`\uFEFF${csv}`)
  } catch (error) {
    sendOperationError(res, error)
  }
}
