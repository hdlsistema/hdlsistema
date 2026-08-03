import { z } from 'zod'

const uuid = z.string().uuid()

export const inventoryListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().max(120).optional(),
  locationId: uuid.optional(),
  wineId: uuid.optional(),
  sku: z.string().max(80).optional(),
  lowStock: z.coerce.boolean().optional(),
  outOfStock: z.coerce.boolean().optional(),
  withReservation: z.coerce.boolean().optional(),
  status: z.enum(['active', 'inactive', 'archived']).optional(),
  orderBy: z.enum(['created_at', 'updated_at', 'quantity', 'reserved_quantity', 'minimum_quantity', 'status']).default('updated_at'),
  orderDirection: z.enum(['asc', 'desc']).default('desc'),
})

export const movementListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(50),
  inventoryItemId: uuid.optional(),
  locationId: uuid.optional(),
  movementType: z.string().max(60).optional(),
  from: z.string().date().optional(),
  to: z.string().date().optional(),
})

export const createInventoryLocationSchema = z.object({
  name: z.string().min(1).max(160),
  code: z.string().max(60).optional(),
  type: z.string().min(1).max(80),
  address: z.string().max(500).nullable().optional(),
  active: z.boolean().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
}).strict()

export const patchInventoryLocationSchema = createInventoryLocationSchema.partial().strict()

export const createInventoryItemSchema = z.object({
  wineId: uuid,
  locationId: uuid,
  sku: z.string().max(80).optional(),
  productName: z.string().max(180).optional(),
  lotCode: z.string().max(80).optional(),
  unitOfMeasure: z.string().max(40).default('bottle'),
  minimumQuantity: z.coerce.number().int().min(0).default(0),
  maximumQuantity: z.coerce.number().int().min(0).nullable().optional(),
  unitCost: z.coerce.number().min(0).nullable().optional(),
}).strict()

export const patchInventoryItemSchema = z.object({
  sku: z.string().max(80).nullable().optional(),
  productName: z.string().max(180).nullable().optional(),
  lotCode: z.string().max(80).nullable().optional(),
  unitOfMeasure: z.string().max(40).optional(),
  minimumQuantity: z.coerce.number().int().min(0).optional(),
  maximumQuantity: z.coerce.number().int().min(0).nullable().optional(),
  unitCost: z.coerce.number().min(0).nullable().optional(),
  status: z.enum(['active', 'inactive', 'archived']).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
}).strict()

export const receiveInventorySchema = z.object({
  inventoryItemId: uuid,
  quantity: z.coerce.number().int().min(1),
  reason: z.string().min(1).max(500),
  idempotencyKey: z.string().max(160).optional(),
}).strict()

export const reserveInventorySchema = z.object({
  inventoryItemId: uuid,
  quantity: z.coerce.number().int().min(1),
  referenceType: z.string().max(80).nullable().optional(),
  referenceId: uuid.nullable().optional(),
  idempotencyKey: z.string().max(160).optional(),
}).strict()

export const releaseInventorySchema = z.object({
  inventoryItemId: uuid,
  quantity: z.coerce.number().int().min(1),
  reason: z.string().max(500).optional(),
  idempotencyKey: z.string().max(160).optional(),
}).strict()

export const transferInventorySchema = z.object({
  inventoryItemId: uuid,
  toLocationId: uuid,
  quantity: z.coerce.number().int().min(1),
  reason: z.string().min(1).max(500),
  idempotencyKey: z.string().max(160).optional(),
}).strict()

export const adjustInventorySchema = z.object({
  inventoryItemId: uuid,
  quantityDelta: z.coerce.number().int().refine((value) => value !== 0),
  reason: z.string().min(1).max(500),
  idempotencyKey: z.string().max(160).optional(),
}).strict()

export type InventoryListQuery = z.infer<typeof inventoryListQuerySchema>
export type MovementListQuery = z.infer<typeof movementListQuerySchema>
export type CreateInventoryLocationPayload = z.infer<typeof createInventoryLocationSchema>
export type PatchInventoryLocationPayload = z.infer<typeof patchInventoryLocationSchema>
export type CreateInventoryItemPayload = z.infer<typeof createInventoryItemSchema>
export type PatchInventoryItemPayload = z.infer<typeof patchInventoryItemSchema>
