import { apiFetch } from './api'

export type AccountDeletionStatus =
  | 'awaiting_email_confirmation'
  | 'pending_processing'
  | 'in_progress'
  | 'completed'
  | 'technical_error'

export type AccountDeletionRecord = {
  id: string
  requestNumber: string
  userId?: string | null
  customerId?: string | null
  email: string
  requestedName?: string | null
  source: 'public_web' | 'mobile_app' | 'admin'
  status: AccountDeletionStatus
  explicitConfirmationAt: string
  legalRetentionAcknowledgedAt: string
  identityVerifiedAt?: string | null
  reviewedAt?: string | null
  completedAt?: string | null
  cancelledAt?: string | null
  confirmationSentAt?: string | null
  confirmationExpiresAt?: string | null
  confirmationUsedAt?: string | null
  confirmedAt?: string | null
  processingStartedAt?: string | null
  processingDueAt?: string | null
  technicalErrorAt?: string | null
  technicalErrorCode?: string | null
  sessionsRevokedAt?: string | null
  authDeletedAt?: string | null
  appleTokenRevokedAt?: string | null
  appleTokenRevokeStatus?: string | null
  personalDataErasedAt?: string | null
  completionEmailSentAt?: string | null
  processingWindowDays?: number
  adminNotes?: string | null
  retentionNotes?: string | null
  deletionScope?: Record<string, unknown>
  deletionSummary?: Record<string, unknown>
  createdAt: string
  updatedAt: string
  history?: Array<{
    id: string
    fromStatus?: string | null
    toStatus: string
    notes?: string | null
    actorUserId?: string | null
    createdAt: string
  }>
}

function authHeaders(token: string | null | undefined): HeadersInit {
  if (!token) throw Object.assign(new Error('Sesión requerida'), { status: 401 })
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
}

function queryString(query: Record<string, unknown> = {}) {
  const params = new URLSearchParams()
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value))
  })
  const value = params.toString()
  return value ? `?${value}` : ''
}

export const publicPrivacyClient = {
  requestAccountDeletion(payload: {
    email: string
    name?: string | null
    confirmation: true
    retentionAcknowledged: true
    locale?: 'es' | 'en'
    companyWebsite?: ''
  }) {
    return apiFetch<{ ok: true; data: { accepted: true } }>('/api/public/account-deletion-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  },
  confirmAccountDeletion(token: string) {
    return apiFetch<{
      ok: true
      data: {
        requestNumber: string
        status: 'pending_processing'
        confirmedAt: string
        processingDueAt: string
        processingWindowDays: number
      }
    }>('/api/public/account-deletion-requests/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
  },
}

export const customerPrivacyClient = {
  requestAccountDeletion(token: string | null | undefined, payload: {
    name?: string | null
    confirmation: true
    retentionAcknowledged: true
    locale?: 'es' | 'en'
  }) {
    return apiFetch<{ ok: true; data: AccountDeletionRecord; duplicate: boolean; confirmationEmailStatus?: string | null }>('/api/customer/account-deletion-requests', {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    })
  },
}

export const adminPrivacyClient = {
  list(token: string | null | undefined, query?: Record<string, unknown>) {
    return apiFetch<{
      ok: true
      data: AccountDeletionRecord[]
      pagination: { page: number; perPage: number; total: number }
    }>(`/api/admin/account-deletion-requests${queryString(query)}`, {
      headers: authHeaders(token),
    })
  },
  get(token: string | null | undefined, id: string) {
    return apiFetch<{ ok: true; data: AccountDeletionRecord }>(`/api/admin/account-deletion-requests/${encodeURIComponent(id)}`, {
      headers: authHeaders(token),
    })
  },
  update(token: string | null | undefined, id: string, payload: {
    status?: AccountDeletionStatus
    adminNotes?: string | null
    retentionNotes?: string | null
  }) {
    return apiFetch<{ ok: true; data: AccountDeletionRecord }>(`/api/admin/account-deletion-requests/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    })
  },
  process(token: string | null | undefined, id: string) {
    return apiFetch<{ ok: true; data: AccountDeletionRecord }>(`/api/admin/account-deletion-requests/${encodeURIComponent(id)}/process`, {
      method: 'POST',
      headers: authHeaders(token),
    })
  },
}
