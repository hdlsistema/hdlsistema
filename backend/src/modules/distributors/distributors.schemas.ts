import { z } from 'zod'

const uuid = z.string().uuid()

export const distributorStatusSchema = z.enum(['prospect', 'active', 'inactive', 'suspended', 'archived'])
export const distributorOrderStatusSchema = z.enum(['draft', 'submitted', 'approved', 'rejected', 'preparing', 'shipped', 'delivered', 'cancelled'])

export const distributorListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().max(120).optional(),
  zone: z.string().max(100).optional(),
  type: z.string().max(80).optional(),
  status: distributorStatusSchema.optional(),
  orderBy: z.enum(['created_at', 'updated_at', 'name', 'operational_status']).default('created_at'),
  orderDirection: z.enum(['asc', 'desc']).default('desc'),
})

export const distributorOrderListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
  distributorId: uuid.optional(),
  status: distributorOrderStatusSchema.optional(),
  search: z.string().max(120).optional(),
  from: z.string().date().optional(),
  to: z.string().date().optional(),
})

export const createDistributorSchema = z.object({
  name: z.string().min(1).max(180),
  contactName: z.string().max(160).nullable().optional(),
  email: z.string().email().nullable().optional(),
  phone: z.string().max(40).nullable().optional(),
  address: z.string().max(500).nullable().optional(),
  taxId: z.string().max(80).nullable().optional(),
  zone: z.string().max(100).nullable().optional(),
  distributorType: z.string().max(80).default('wholesale'),
  operationalStatus: distributorStatusSchema.default('prospect'),
  commercialTerms: z.string().max(1000).nullable().optional(),
  priceListName: z.string().max(160).nullable().optional(),
  creditLimit: z.coerce.number().min(0).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
}).strict()

export const patchDistributorSchema = createDistributorSchema.partial().strict()

export const createDistributorContactSchema = z.object({
  name: z.string().min(1).max(160),
  roleTitle: z.string().max(120).nullable().optional(),
  email: z.string().email().nullable().optional(),
  phone: z.string().max(40).nullable().optional(),
  isPrimary: z.boolean().optional(),
  active: z.boolean().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
}).strict()

export const patchDistributorContactSchema = createDistributorContactSchema.partial().strict()

export const distributorOrderItemSchema = z.object({
  wineId: uuid.nullable().optional(),
  skuSnapshot: z.string().max(80).nullable().optional(),
  nameSnapshot: z.string().min(1).max(180),
  quantity: z.coerce.number().int().min(1),
  unitPrice: z.coerce.number().min(0),
  metadata: z.record(z.string(), z.unknown()).optional(),
}).strict()

export const createDistributorOrderSchema = z.object({
  distributorId: uuid,
  items: z.array(distributorOrderItemSchema).min(1),
  idempotencyKey: z.string().max(160).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
}).strict()

export const patchDistributorOrderSchema = z.object({
  metadata: z.record(z.string(), z.unknown()).optional(),
}).strict()

export const distributorReasonSchema = z.object({
  reason: z.string().max(500).nullable().optional(),
}).strict()

export type DistributorListQuery = z.infer<typeof distributorListQuerySchema>
export type DistributorOrderListQuery = z.infer<typeof distributorOrderListQuerySchema>
export type CreateDistributorPayload = z.infer<typeof createDistributorSchema>
export type PatchDistributorPayload = z.infer<typeof patchDistributorSchema>
export type CreateDistributorContactPayload = z.infer<typeof createDistributorContactSchema>
export type PatchDistributorContactPayload = z.infer<typeof patchDistributorContactSchema>
export type CreateDistributorOrderPayload = z.infer<typeof createDistributorOrderSchema>
export type PatchDistributorOrderPayload = z.infer<typeof patchDistributorOrderSchema>
