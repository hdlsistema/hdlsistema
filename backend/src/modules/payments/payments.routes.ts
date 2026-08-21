import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate'
import { authorize } from '../../middleware/authorize'
import { requireControlPermission } from '../../middleware/controlPermission'
import { requireFinancialAccess } from '../../middleware/financialAccess'
import { rateLimit } from '../../middleware/rateLimit'
import {
  getPaymentAdmin,
  getPaymentReceiptAdmin,
  getPaymentsAdmin,
  getPaymentsExportAdmin,
  postManualPaymentAdmin,
  postPaymentWebhook,
  postRefundPaymentAdmin,
} from './payments.controller'

const adminRouter = Router()
const webhookRouter = Router()
const paymentRoles = ['super_admin', 'admin', 'operations', 'finance', 'viewer']
const protectedPayments = [authenticate, authorize(paymentRoles), requireControlPermission('payments.view'), requireFinancialAccess()]

adminRouter.use(rateLimit(240, 60_000))
adminRouter.get('/payments/export', ...protectedPayments, getPaymentsExportAdmin)
adminRouter.get('/payments', ...protectedPayments, getPaymentsAdmin)
adminRouter.post('/payments/manual', ...protectedPayments, postManualPaymentAdmin)
adminRouter.get('/payments/:id', ...protectedPayments, getPaymentAdmin)
adminRouter.post('/payments/:id/refund', ...protectedPayments, postRefundPaymentAdmin)
adminRouter.get('/payments/:id/receipt', ...protectedPayments, getPaymentReceiptAdmin)

webhookRouter.use(rateLimit(60, 60_000))
webhookRouter.post('/payments/:provider', postPaymentWebhook)

export { adminRouter as adminPaymentsRouter, webhookRouter as paymentWebhooksRouter }
