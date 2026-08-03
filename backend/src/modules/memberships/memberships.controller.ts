import type { Request, Response } from 'express'
import { sendOperationError } from '../operations/operationErrors'
import {
  createMembershipSchema,
  loyaltyAdjustmentSchema,
  membershipListQuerySchema,
  membershipReasonSchema,
  orderLoyaltySchema,
  patchMembershipSchema,
} from './memberships.schemas'
import {
  adjustLoyalty,
  createMembership,
  exportMemberships,
  getMembership,
  grantOrderLoyalty,
  listMembershipBenefits,
  listMembershipHistory,
  listMembershipLoyalty,
  listMemberships,
  patchMembership,
  runMembershipAction,
} from './memberships.service'

function userContext(req: Request) {
  return { userId: req.authUser?.id, accessToken: req.authToken, roles: req.authRoles }
}

export async function getMembershipsAdmin(req: Request, res: Response): Promise<void> {
  try {
    const query = membershipListQuerySchema.parse(req.query)
    const { data, count } = await listMemberships(query, userContext(req))
    res.json({ ok: true, data, pagination: { page: query.page, perPage: query.perPage, total: count } })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function getMembershipAdmin(req: Request, res: Response): Promise<void> {
  try {
    const { data } = await getMembership(req.params.id, userContext(req))
    res.json({ ok: true, data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function postMembershipAdmin(req: Request, res: Response): Promise<void> {
  try {
    const payload = createMembershipSchema.parse(req.body)
    const { data } = await createMembership(payload, userContext(req))
    res.status(201).json({ ok: true, data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function patchMembershipAdmin(req: Request, res: Response): Promise<void> {
  try {
    const payload = patchMembershipSchema.parse(req.body)
    const { data } = await patchMembership(req.params.id, payload, userContext(req))
    res.json({ ok: true, data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function membershipActionAdmin(req: Request, res: Response): Promise<void> {
  try {
    const payload = membershipReasonSchema.parse(req.body ?? {})
    const { data } = await runMembershipAction(req.params.id, req.params.action as 'activate' | 'pause' | 'resume' | 'cancel' | 'renew', payload.reason, userContext(req))
    res.json({ ok: true, data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function getMembershipBenefitsAdmin(req: Request, res: Response): Promise<void> {
  try {
    const { data } = await listMembershipBenefits(req.params.id, userContext(req))
    res.json({ ok: true, data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function getMembershipLoyaltyAdmin(req: Request, res: Response): Promise<void> {
  try {
    const { data } = await listMembershipLoyalty(req.params.id, userContext(req))
    res.json({ ok: true, data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function postMembershipLoyaltyAdjustmentAdmin(req: Request, res: Response): Promise<void> {
  try {
    const payload = loyaltyAdjustmentSchema.parse(req.body)
    const { data } = await adjustLoyalty(req.params.id, payload.points, payload.reason, payload.idempotencyKey, userContext(req))
    res.status(201).json({ ok: true, data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function postMembershipOrderLoyaltyAdmin(req: Request, res: Response): Promise<void> {
  try {
    const payload = orderLoyaltySchema.parse(req.body)
    const { data } = await grantOrderLoyalty(req.params.id, payload.orderId, payload.points, userContext(req))
    res.status(201).json({ ok: true, data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function getMembershipHistoryAdmin(req: Request, res: Response): Promise<void> {
  try {
    const { data } = await listMembershipHistory(req.params.id, userContext(req))
    res.json({ ok: true, data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function getMembershipsExportAdmin(req: Request, res: Response): Promise<void> {
  try {
    const query = membershipListQuerySchema.parse(req.query)
    const csv = await exportMemberships(query, userContext(req))
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename="wine-club-hacienda-de-letras.csv"')
    res.send(`\uFEFF${csv}`)
  } catch (error) {
    sendOperationError(res, error)
  }
}
