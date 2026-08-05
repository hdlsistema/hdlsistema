import type { Request, Response } from 'express'
import { sendOperationError } from '../operations/operationErrors'
import {
  manualPaymentSchema,
  paymentListQuerySchema,
  paymentWebhookSchema,
  refundPaymentSchema,
} from './payments.schemas'
import {
  exportPayments,
  getPayment,
  getPaymentReceipt,
  listPayments,
  processPaymentWebhook,
  recordManualPayment,
  refundPayment,
} from './payments.service'

function userContext(req: Request) {
  return {
    userId: req.authUser?.id,
    accessToken: req.authToken,
    roles: req.authRoles,
  }
}

export async function getPaymentsAdmin(req: Request, res: Response): Promise<void> {
  try {
    const query = paymentListQuerySchema.parse(req.query)
    const { data, count } = await listPayments(query, userContext(req))
    res.json({ ok: true, data, pagination: { page: query.page, perPage: query.perPage, total: count } })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function getPaymentAdmin(req: Request, res: Response): Promise<void> {
  try {
    const { data } = await getPayment(req.params.id, userContext(req))
    res.json({ ok: true, data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function postManualPaymentAdmin(req: Request, res: Response): Promise<void> {
  try {
    const payload = manualPaymentSchema.parse(req.body)
    const { data } = await recordManualPayment(payload, userContext(req))
    res.status(201).json({ ok: true, data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function postRefundPaymentAdmin(req: Request, res: Response): Promise<void> {
  try {
    const payload = refundPaymentSchema.parse(req.body)
    const { data } = await refundPayment(req.params.id, payload, userContext(req))
    res.json({ ok: true, data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function getPaymentReceiptAdmin(req: Request, res: Response): Promise<void> {
  try {
    const { data } = await getPaymentReceipt(req.params.id, userContext(req))
    res.json({ ok: true, data })
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function getPaymentsExportAdmin(req: Request, res: Response): Promise<void> {
  try {
    const query = paymentListQuerySchema.parse(req.query)
    const csv = await exportPayments(query, userContext(req))
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename="pagos-hacienda-de-letras.csv"')
    res.send(`\uFEFF${csv}`)
  } catch (error) {
    sendOperationError(res, error)
  }
}

export async function postPaymentWebhook(req: Request, res: Response): Promise<void> {
  try {
    const payload = req.params.provider === 'stripe'
      ? Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body ?? {}))
      : paymentWebhookSchema.parse(req.body)
    const result = await processPaymentWebhook(req.params.provider, payload, req.headers['stripe-signature'])
    res.status(202).json({ ok: true, data: result.data })
  } catch (error) {
    sendOperationError(res, error)
  }
}
