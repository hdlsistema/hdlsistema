import type { NextFunction, Request, Response } from 'express'

type RateBucket = {
  count: number
  resetAt: number
}

const buckets = new Map<string, RateBucket>()

export function rateLimit(maxRequests: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const key = `${req.ip}:${req.path}`
    const now = Date.now()
    const current = buckets.get(key)

    if (!current || current.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs })
      next()
      return
    }

    current.count += 1
    if (current.count > maxRequests) {
      res.status(429).json({
        ok: false,
        error: { code: 'TOO_MANY_REQUESTS', message: 'Demasiadas solicitudes' },
      })
      return
    }

    next()
  }
}
