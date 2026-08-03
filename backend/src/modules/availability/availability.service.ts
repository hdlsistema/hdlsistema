import {
  createSupabaseUserRequestClient,
  supabaseAdminClient,
} from '../../config/supabase'
import {
  assertNoError,
  normalizeDatabaseError,
  requireAccessToken,
  requireOperationRole,
  type UserContext,
} from '../operations/operationErrors'
import type {
  AvailabilityQuery,
  BlockoutPatch,
  BlockoutPayload,
  DuplicateSlotsPayload,
  SlotPatch,
  SlotPayload,
} from './availability.schemas'

const readRoles = ['super_admin', 'admin', 'operations', 'marketing', 'finance', 'viewer']
const writeRoles = ['super_admin', 'admin', 'operations']

function operationRpcClient(user: UserContext) {
  return createSupabaseUserRequestClient(requireAccessToken(user))
}

type SlotRow = {
  id: string
  experience_id: string
  start_at: string
  end_at: string
  capacity: number
  reserved_count: number
  confirmed_count?: number | null
  waitlist_count?: number | null
  price_override?: number | null
  status: string
  notes?: string | null
  is_bookable?: boolean | null
  operational_status?: string | null
  blocked_reason?: string | null
  metadata?: Record<string, unknown> | null
  experiences?: {
    id: string
    title: string
    slug: string
    base_price: number
    location?: string | null
    duration_minutes?: number | null
    cover_image_url?: string | null
  } | Array<{
    id: string
    title: string
    slug: string
    base_price: number
    location?: string | null
    duration_minutes?: number | null
    cover_image_url?: string | null
  }> | null
}

type BlockoutRow = {
  id: string
  experience_id?: string | null
  start_at: string
  end_at: string
  reason?: string | null
  block_type?: string | null
  applies_to_all_experiences?: boolean | null
  metadata?: Record<string, unknown> | null
}

function toDateRange(query: AvailabilityQuery) {
  const from = query.from ? new Date(`${query.from}T00:00:00.000Z`) : new Date()
  const to = query.to ? new Date(`${query.to}T23:59:59.999Z`) : new Date(from.getTime() + 30 * 24 * 60 * 60 * 1000)
  return { from: from.toISOString(), to: to.toISOString() }
}

function slotAvailability(slot: SlotRow) {
  const confirmed = Number(slot.confirmed_count ?? slot.reserved_count ?? 0)
  const capacity = Number(slot.capacity)
  const available = Math.max(capacity - confirmed, 0)
  const occupancy = capacity > 0 ? Math.min(Math.round((confirmed / capacity) * 100), 100) : 0
  return { confirmed, available, occupancy }
}

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null
}

function mapSlot(slot: SlotRow) {
  const availability = slotAvailability(slot)
  const experience = firstRelation(slot.experiences)
  return {
    id: slot.id,
    experienceId: slot.experience_id,
    experienceTitle: experience?.title ?? 'Experiencia',
    experienceSlug: experience?.slug ?? null,
    location: experience?.location ?? null,
    durationMinutes: experience?.duration_minutes ?? null,
    coverImageUrl: experience?.cover_image_url ?? null,
    startAt: slot.start_at,
    endAt: slot.end_at,
    capacity: slot.capacity,
    reserved: slot.reserved_count,
    confirmed: availability.confirmed,
    available: availability.available,
    waitlist: slot.waitlist_count ?? 0,
    occupancy: availability.occupancy,
    price: slot.price_override ?? experience?.base_price ?? 0,
    priceOverride: slot.price_override ?? null,
    status: slot.status,
    operationalStatus: slot.operational_status ?? 'open',
    isBookable: Boolean(slot.is_bookable ?? slot.status === 'published'),
    blockedReason: slot.blocked_reason ?? null,
    notes: slot.notes ?? null,
    metadata: slot.metadata ?? {},
  }
}

function applySlotFilters(rows: SlotRow[], query: AvailabilityQuery) {
  return rows.filter((slot) => {
    const mapped = mapSlot(slot)
    if (query.status === 'published' || query.status === 'inactive') {
      if (slot.status !== query.status) return false
    } else if (query.status && mapped.operationalStatus !== query.status) {
      return false
    }
    if (query.availability === 'available') return mapped.isBookable && mapped.available > 0
    if (query.availability === 'full') return mapped.available <= 0
    if (query.availability === 'blocked') return mapped.operationalStatus === 'blocked'
    return true
  })
}

export async function listAvailability(query: AvailabilityQuery, user: UserContext) {
  requireOperationRole(user, readRoles)
  const { from, to } = toDateRange(query)
  const slots = await listSlots({ ...query, from: from.slice(0, 10), to: to.slice(0, 10) }, user)
  const blockouts = await listBlockouts(query, user)
  let experiencesRequest: any = supabaseAdminClient
    .from('experiences')
    .select('id,title,capacity,status')
    .is('deleted_at', null)
    .eq('visible_in_control', true)
    .order('title', { ascending: true })
  if (query.experienceId) experiencesRequest = experiencesRequest.eq('id', query.experienceId)
  const experienceRows = assertNoError<Array<{ id: string; title: string; capacity: number }>>(
    await experiencesRequest,
  ).data ?? []

  const byExperience = new Map<string, { id: string; title: string; slots: unknown[]; capacity: number; confirmed: number }>()
  for (const experience of experienceRows) {
    byExperience.set(experience.id, {
      id: experience.id,
      title: experience.title,
      slots: [],
      capacity: 0,
      confirmed: 0,
    })
  }
  for (const slot of slots.data) {
    const current = byExperience.get(slot.experienceId) ?? {
      id: slot.experienceId,
      title: slot.experienceTitle,
      slots: [],
      capacity: 0,
      confirmed: 0,
    }
    current.slots.push(slot)
    current.capacity += slot.capacity
    current.confirmed += slot.confirmed
    byExperience.set(slot.experienceId, current)
  }

  return {
    data: {
      experiences: Array.from(byExperience.values()).map((item) => ({
        ...item,
        available: Math.max(item.capacity - item.confirmed, 0),
        occupancy: item.capacity > 0 ? Math.round((item.confirmed / item.capacity) * 100) : 0,
      })),
      slots: slots.data,
      blockouts: blockouts.data,
    },
  }
}

export async function listCalendar(query: AvailabilityQuery, user: UserContext) {
  requireOperationRole(user, readRoles)
  const { data } = await listSlots(query, user)
  const days = new Map<string, { date: string; capacity: number; confirmed: number; slots: number; blocked: number }>()

  for (const slot of data) {
    const date = slot.startAt.slice(0, 10)
    const current = days.get(date) ?? { date, capacity: 0, confirmed: 0, slots: 0, blocked: 0 }
    current.capacity += slot.capacity
    current.confirmed += slot.confirmed
    current.slots += 1
    if (slot.operationalStatus === 'blocked') current.blocked += 1
    days.set(date, current)
  }

  return {
    data: Array.from(days.values()).map((day) => ({
      ...day,
      available: Math.max(day.capacity - day.confirmed, 0),
      occupancy: day.capacity > 0 ? Math.round((day.confirmed / day.capacity) * 100) : 0,
    })),
  }
}

export async function listSlots(query: AvailabilityQuery, user: UserContext) {
  requireOperationRole(user, readRoles)
  const { from, to } = toDateRange(query)
  let request: any = supabaseAdminClient
    .from('experience_slots')
    .select(`
      id, experience_id, start_at, end_at, capacity, reserved_count, confirmed_count,
      waitlist_count, price_override, status, notes, is_bookable, operational_status,
      blocked_reason, metadata,
      experiences(id,title,slug,base_price,location,duration_minutes,cover_image_url)
    `)
    .gte('start_at', from)
    .lte('start_at', to)
    .is('deleted_at', null)
    .order('start_at', { ascending: true })

  if (query.experienceId) request = request.eq('experience_id', query.experienceId)

  const result = await request
  const rows = assertNoError<SlotRow[]>(result).data ?? []
  return { data: applySlotFilters(rows, query).map(mapSlot) }
}

export async function createSlot(payload: SlotPayload, user: UserContext) {
  requireOperationRole(user, writeRoles)
  const result = await operationRpcClient(user).rpc('create_experience_slot', {
    p_experience_id: payload.experienceId,
    p_start_at: payload.startAt,
    p_end_at: payload.endAt,
    p_capacity: payload.capacity,
    p_price_override: payload.priceOverride ?? null,
    p_notes: payload.notes ?? null,
    p_is_bookable: payload.isBookable ?? true,
    p_operational_status: payload.operationalStatus ?? 'open',
    p_metadata: payload.metadata ?? {},
  })
  if (result.error) normalizeDatabaseError(result.error)
  return getSlot(String(result.data), user)
}

export async function updateSlot(id: string, payload: SlotPatch, user: UserContext) {
  requireOperationRole(user, writeRoles)
  const result = await operationRpcClient(user).rpc('update_experience_slot', {
    p_slot_id: id,
    p_start_at: payload.startAt ?? null,
    p_end_at: payload.endAt ?? null,
    p_capacity: payload.capacity ?? null,
    p_price_override: payload.priceOverride ?? null,
    p_notes: payload.notes ?? null,
    p_is_bookable: payload.isBookable ?? null,
    p_operational_status: payload.operationalStatus ?? null,
    p_metadata: payload.metadata ?? null,
  })
  if (result.error) normalizeDatabaseError(result.error)
  return getSlot(id, user)
}

export async function blockSlot(id: string, reason: string | null | undefined, user: UserContext) {
  requireOperationRole(user, writeRoles)
  const result = await operationRpcClient(user).rpc('block_experience_slot', {
    p_slot_id: id,
    p_reason: reason ?? null,
  })
  if (result.error) normalizeDatabaseError(result.error)
  return getSlot(id, user)
}

export async function unblockSlot(id: string, user: UserContext) {
  requireOperationRole(user, writeRoles)
  const result = await operationRpcClient(user).rpc('unblock_experience_slot', {
    p_slot_id: id,
  })
  if (result.error) normalizeDatabaseError(result.error)
  return getSlot(id, user)
}

async function getSlot(id: string, user: UserContext) {
  const result = await supabaseAdminClient
    .from('experience_slots')
    .select(`
      id, experience_id, start_at, end_at, capacity, reserved_count, confirmed_count,
      waitlist_count, price_override, status, notes, is_bookable, operational_status,
      blocked_reason, metadata,
      experiences(id,title,slug,base_price,location,duration_minutes,cover_image_url)
    `)
    .eq('id', id)
    .maybeSingle()
  const data = assertNoError<SlotRow | null>(result).data
  if (!data) normalizeDatabaseError(new Error('SLOT_NOT_FOUND'))
  return { data: mapSlot(data), roles: user.roles ?? [] }
}

export async function listBlockouts(query: AvailabilityQuery, user: UserContext) {
  requireOperationRole(user, readRoles)
  const { from, to } = toDateRange(query)
  let request: any = supabaseAdminClient
    .from('experience_blockouts')
    .select('id,experience_id,start_at,end_at,reason,block_type,applies_to_all_experiences,metadata')
    .gte('end_at', from)
    .lte('start_at', to)
    .order('start_at', { ascending: true })

  if (query.experienceId) {
    request = request.or(`experience_id.eq.${query.experienceId},applies_to_all_experiences.eq.true`)
  }

  const result = await request
  const rows = assertNoError<BlockoutRow[]>(result).data ?? []
  return {
    data: rows.map((blockout) => ({
      id: blockout.id,
      experienceId: blockout.experience_id ?? null,
      startAt: blockout.start_at,
      endAt: blockout.end_at,
      reason: blockout.reason ?? null,
      blockType: blockout.block_type ?? 'manual',
      appliesToAllExperiences: Boolean(blockout.applies_to_all_experiences),
      metadata: blockout.metadata ?? {},
    })),
  }
}

export async function createBlockout(payload: BlockoutPayload, user: UserContext) {
  requireOperationRole(user, writeRoles)
  const result = await supabaseAdminClient
    .from('experience_blockouts')
    .insert({
      experience_id: payload.experienceId ?? null,
      start_at: payload.startAt,
      end_at: payload.endAt,
      reason: payload.reason ?? null,
      block_type: payload.blockType ?? 'manual',
      applies_to_all_experiences: payload.appliesToAllExperiences ?? false,
      created_by: user.userId,
      updated_by: user.userId,
      metadata: payload.metadata ?? {},
    })
    .select('id,experience_id,start_at,end_at,reason,block_type,applies_to_all_experiences,metadata')
    .single()

  return { data: assertNoError<BlockoutRow>(result).data }
}

export async function updateBlockout(id: string, payload: BlockoutPatch, user: UserContext) {
  requireOperationRole(user, writeRoles)
  const patch: Record<string, unknown> = { updated_by: user.userId, updated_at: new Date().toISOString() }
  if ('experienceId' in payload) patch.experience_id = payload.experienceId ?? null
  if (payload.startAt) patch.start_at = payload.startAt
  if (payload.endAt) patch.end_at = payload.endAt
  if ('reason' in payload) patch.reason = payload.reason ?? null
  if (payload.blockType) patch.block_type = payload.blockType
  if ('appliesToAllExperiences' in payload) patch.applies_to_all_experiences = payload.appliesToAllExperiences
  if (payload.metadata) patch.metadata = payload.metadata

  const result = await supabaseAdminClient
    .from('experience_blockouts')
    .update(patch)
    .eq('id', id)
    .select('id,experience_id,start_at,end_at,reason,block_type,applies_to_all_experiences,metadata')
    .single()

  return { data: assertNoError<BlockoutRow>(result).data }
}

export async function deleteBlockout(id: string, user: UserContext) {
  requireOperationRole(user, writeRoles)
  const result = await supabaseAdminClient
    .from('experience_blockouts')
    .delete()
    .eq('id', id)
    .select('id')
    .single()
  return { data: assertNoError<{ id: string }>(result).data }
}

export async function duplicateSlots(payload: DuplicateSlotsPayload, user: UserContext) {
  requireOperationRole(user, writeRoles)
  const sourceStart = `${payload.sourceDate}T00:00:00.000Z`
  const sourceEnd = `${payload.sourceDate}T23:59:59.999Z`
  const result = await supabaseAdminClient
    .from('experience_slots')
    .select('start_at,end_at,capacity,price_override,notes,is_bookable,operational_status,metadata')
    .eq('experience_id', payload.experienceId)
    .gte('start_at', sourceStart)
    .lte('start_at', sourceEnd)
    .order('start_at', { ascending: true })

  const sourceSlots = assertNoError<Array<{
    start_at: string
    end_at: string
    capacity: number
    price_override?: number | null
    notes?: string | null
    is_bookable?: boolean | null
    operational_status?: string | null
    metadata?: Record<string, unknown> | null
  }>>(result).data ?? []

  const created: unknown[] = []
  for (const targetDate of payload.targetDates) {
    for (const slot of sourceSlots) {
      const sourceStartDate = new Date(slot.start_at)
      const sourceEndDate = new Date(slot.end_at)
      const duration = sourceEndDate.getTime() - sourceStartDate.getTime()
      const [, timePart] = slot.start_at.split('T')
      const nextStart = new Date(`${targetDate}T${timePart}`)
      const nextEnd = new Date(nextStart.getTime() + duration)
      const createdSlot = await createSlot({
        experienceId: payload.experienceId,
        startAt: nextStart.toISOString(),
        endAt: nextEnd.toISOString(),
        capacity: slot.capacity,
        priceOverride: slot.price_override ?? null,
        notes: slot.notes ?? null,
        isBookable: slot.is_bookable ?? true,
        operationalStatus: (slot.operational_status as 'open' | 'blocked' | 'closed' | null) ?? 'open',
        metadata: slot.metadata ?? {},
      }, user)
      created.push(createdSlot.data)
    }
  }

  return { data: created }
}
