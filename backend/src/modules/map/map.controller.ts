import type { Request, Response } from 'express'
import { z } from 'zod'
import { sendOperationError } from '../operations/operationErrors'
import { listPublicMapPois } from './map.service'

const mapQuerySchema = z.object({
  search: z.string().trim().min(1).max(120).optional(),
})

export async function getPublicMapPois(req: Request, res: Response): Promise<void> {
  try {
    const query = mapQuerySchema.parse(req.query)
    const result = await listPublicMapPois(query)
    res.json({ ok: true, data: result.data })
  } catch (error) {
    sendOperationError(res, error)
  }
}
