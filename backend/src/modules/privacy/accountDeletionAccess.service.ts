import { supabaseAdminClient } from '../../config/supabase'
import { assertNoError, httpError } from '../operations/operationErrors'

export const accountDeletionBlockingStatuses = ['pending_processing', 'in_progress', 'technical_error', 'completed'] as const

type AccountDeletionBlockingStatus = typeof accountDeletionBlockingStatuses[number]

type AccountDeletionAccessRow = {
  id: string
  request_number: string
  status: AccountDeletionBlockingStatus
  processing_due_at?: string | null
  confirmed_at?: string | null
  completed_at?: string | null
}

function normalizeEmail(value?: string | null) {
  return String(value ?? '').trim().toLowerCase()
}

function isBlockingStatus(value: unknown): value is AccountDeletionBlockingStatus {
  return accountDeletionBlockingStatuses.includes(value as AccountDeletionBlockingStatus)
}

function mapBlockingRow(row: AccountDeletionAccessRow | null) {
  if (!row || !isBlockingStatus(row.status)) return { blocked: false as const }
  return {
    blocked: true as const,
    requestId: row.id,
    requestNumber: row.request_number,
    status: row.status,
    processingDueAt: row.processing_due_at ?? null,
    confirmedAt: row.confirmed_at ?? null,
  }
}

export type AccountDeletionAccessState = ReturnType<typeof mapBlockingRow>

export async function getAccountDeletionAccessState(input: {
  userId?: string | null
  email?: string | null
}): Promise<AccountDeletionAccessState> {
  const email = normalizeEmail(input.email)
  if (!input.userId && !email) return { blocked: false }

  let byUser: AccountDeletionAccessRow | null = null
  if (input.userId) {
    const result = await supabaseAdminClient
      .from('account_deletion_requests')
      .select('id,request_number,status,processing_due_at,confirmed_at,completed_at')
      .eq('user_id', input.userId)
      .in('status', [...accountDeletionBlockingStatuses])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    byUser = assertNoError<AccountDeletionAccessRow | null>(result).data
  }

  if (byUser) return mapBlockingRow(byUser)

  if (email) {
    const result = await supabaseAdminClient
      .from('account_deletion_requests')
      .select('id,request_number,status,processing_due_at,confirmed_at,completed_at')
      .eq('email', email)
      .in('status', [...accountDeletionBlockingStatuses])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    return mapBlockingRow(assertNoError<AccountDeletionAccessRow | null>(result).data)
  }

  return { blocked: false }
}

export async function assertAccountDeletionAccessAllowed(input: {
  userId?: string | null
  email?: string | null
}) {
  const state = await getAccountDeletionAccessState(input)
  if (!state.blocked) return state

  const due = state.processingDueAt ? ` antes de ${state.processingDueAt}` : ''
  const statusMessage = state.status === 'completed'
    ? 'La eliminación de esta cuenta fue completada'
    : `La eliminación de esta cuenta fue confirmada y está en proceso${due}`
  throw httpError(
    423,
    `${statusMessage}. No es posible iniciar sesión ni operar la cuenta.`,
  )
}
