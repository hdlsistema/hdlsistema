import { apiFetch } from './api'

export type PublicAccessPass = {
  id: string
  passNumber?: string | null
  reservationNumber?: string | null
  orderNumber?: string | null
  accessType: string
  title?: string | null
  startsAt?: string | null
  endsAt?: string | null
  peopleCount?: number | null
  customerName?: string | null
  status: string
  usedAt?: string | null
  validFrom?: string | null
  validUntil?: string | null
  qrPayload: string
  valid: boolean
  state: 'valid' | 'used' | 'cancelled' | 'expired' | 'not_yet_valid' | string
}

export const publicAccessPassClient = {
  get(token: string) {
    return apiFetch<{ ok: true; data: PublicAccessPass }>(
      `/api/public/access/${encodeURIComponent(token)}`,
    )
  },
}
