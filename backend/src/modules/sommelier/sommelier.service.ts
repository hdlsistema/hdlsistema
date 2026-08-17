import { env } from '../../config/env'
import { supabaseAdminClient } from '../../config/supabase'
import { assertNoError, httpError, requireOperationRole, type UserContext } from '../operations/operationErrors'
import type { SommelierMessagePayload } from './sommelier.schemas'

const customerRoles = ['customer', 'super_admin', 'admin']

type CustomerRow = {
  id: string
  user_id: string | null
  first_name?: string | null
  last_name?: string | null
  email?: string | null
}

type SommelierSessionRow = {
  id: string
  user_id: string | null
  customer_id: string | null
}

type KnowledgeRow = {
  title: string
  content: string
  namespace: string
  source_type?: string | null
  metadata?: Record<string, unknown> | null
}

type PublicWineRow = {
  name?: string | null
  description?: string | null
  grape_variety?: string | null
  price?: number | string | null
}

type PublicExperienceRow = {
  title?: string | null
  short_description?: string | null
  base_price?: number | string | null
  duration_minutes?: number | string | null
  location?: string | null
}

type PublicEventRow = {
  title?: string | null
  venue?: string | null
  start_at?: string | null
  end_at?: string | null
  capacity?: number | string | null
  sold_count?: number | string | null
}

type PublicPromotionRow = {
  name?: string | null
  description?: string | null
  promotion_type?: string | null
  starts_at?: string | null
  ends_at?: string | null
}

type PublicMembershipPlanRow = {
  name?: string | null
  description?: string | null
  price?: number | string | null
  billing_period?: string | null
  benefits?: unknown
}

type ChatResponse = {
  choices?: Array<{ message?: { content?: string } }>
  usage?: {
    prompt_tokens?: number
    completion_tokens?: number
    total_tokens?: number
  }
}

function todayKey() {
  return new Date().toISOString().slice(0, 10)
}

function customerName(customer: CustomerRow | null) {
  return [customer?.first_name, customer?.last_name].filter(Boolean).join(' ').trim() || customer?.email || 'Cliente'
}

async function getCustomer(user: UserContext) {
  if (!user.userId) throw httpError(401, 'Sesión requerida')
  const result = await supabaseAdminClient
    .from('customers')
    .select('id,user_id,first_name,last_name,email')
    .eq('user_id', user.userId)
    .maybeSingle()
  return assertNoError<CustomerRow | null>(result).data
}

async function getDailyLimit() {
  const result = await supabaseAdminClient
    .from('system_settings')
    .select('value')
    .eq('key', 'sommelier.daily_limit')
    .maybeSingle()
  const value = assertNoError<{ value?: unknown } | null>(result).data?.value
  const parsed = typeof value === 'number' ? value : Number(value ?? 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 10
}

async function assertUsageAllowed(user: UserContext, customer: CustomerRow | null) {
  const dailyLimit = await getDailyLimit()
  let request = supabaseAdminClient
    .from('sommelier_usage')
    .select('id,interaction_count,token_count')
    .eq('user_id', user.userId)
    .eq('usage_date', todayKey())
  request = customer?.id ? request.eq('customer_id', customer.id) : request.is('customer_id', null)
  const result = await request
    .maybeSingle()
  const usage = assertNoError<{ id: string; interaction_count: number; token_count: number } | null>(result).data
  if (usage && Number(usage.interaction_count) >= dailyLimit) {
    throw httpError(409, 'Límite diario de Sommelier alcanzado')
  }
  return { usage, dailyLimit }
}

async function upsertUsage(user: UserContext, customer: CustomerRow | null, existing: { id: string; interaction_count: number; token_count: number } | null, tokens: number) {
  if (existing) {
    await supabaseAdminClient
      .from('sommelier_usage')
      .update({
        interaction_count: Number(existing.interaction_count) + 1,
        token_count: Number(existing.token_count) + tokens,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
    return
  }

  await supabaseAdminClient.from('sommelier_usage').insert({
    user_id: user.userId ?? null,
    customer_id: customer?.id ?? null,
    usage_date: todayKey(),
    interaction_count: 1,
    token_count: tokens,
  })
}

async function getOrCreateSession(user: UserContext, customer: CustomerRow | null, sessionId?: string) {
  if (sessionId) {
    const result = await supabaseAdminClient
      .from('sommelier_sessions')
      .select('id,user_id,customer_id')
      .eq('id', sessionId)
      .maybeSingle()
    const session = assertNoError<SommelierSessionRow | null>(result).data
    if (!session || session.user_id !== user.userId || session.customer_id !== (customer?.id ?? null)) {
      throw httpError(404, 'Sesión de Sommelier no encontrada')
    }
    return session
  }

  const result = await supabaseAdminClient
    .from('sommelier_sessions')
    .insert({
      user_id: user.userId ?? null,
      customer_id: customer?.id ?? null,
    })
    .select('id,user_id,customer_id')
    .single()
  return assertNoError<SommelierSessionRow>(result).data
}

async function saveMessage(sessionId: string, role: 'user' | 'assistant', content: string, model?: string | null, promptTokens?: number, completionTokens?: number) {
  const result = await supabaseAdminClient
    .from('sommelier_messages')
    .insert({
      session_id: sessionId,
      role,
      content,
      model: model ?? null,
      prompt_tokens: promptTokens ?? null,
      completion_tokens: completionTokens ?? null,
    })
    .select('id,created_at')
    .single()
  return assertNoError<{ id: string; created_at: string }>(result).data
}

async function getKnowledgeContext() {
  const now = new Date().toISOString()
  const live = (request: any, status = 'published') => request
    .eq('visible_in_app', true)
    .eq('status', status)
    .is('deleted_at', null)
    .is('archived_at', null)
    .or(`publish_at.is.null,publish_at.lte.${now}`)
    .or(`unpublish_at.is.null,unpublish_at.gt.${now}`)

  const [
    knowledgeResult,
    winesResult,
    experiencesResult,
    eventsResult,
    promotionsResult,
    membershipPlansResult,
  ] = await Promise.all([
    supabaseAdminClient
      .from('sommelier_knowledge')
      .select('namespace,title,content,source_type,metadata')
      .eq('active', true)
      .order('updated_at', { ascending: false })
      .limit(8),
    supabaseAdminClient
      .from('wines')
      .select('name,description,grape_variety,price')
      .eq('visible_in_app', true)
      .eq('status', 'published')
      .is('deleted_at', null)
      .is('archived_at', null)
      .or(`publish_at.is.null,publish_at.lte.${now}`)
      .or(`unpublish_at.is.null,unpublish_at.gt.${now}`)
      .order('sort_order', { ascending: true })
      .limit(8),
    live(
      supabaseAdminClient
        .from('experiences')
        .select('title,short_description,base_price,duration_minutes,location'),
    )
      .order('sort_order', { ascending: true })
      .limit(6),
    live(
      supabaseAdminClient
        .from('events')
        .select('title,venue,start_at,end_at,capacity,sold_count')
        .eq('sales_enabled', true),
    )
      .order('start_at', { ascending: true })
      .limit(6),
    live(
      supabaseAdminClient
        .from('promotions')
        .select('name,description,promotion_type,starts_at,ends_at'),
    )
      .order('sort_order', { ascending: true })
      .limit(6),
    live(
      supabaseAdminClient
        .from('membership_plans')
        .select('name,description,price,billing_period,benefits')
        .eq('active', true),
    )
      .order('sort_order', { ascending: true })
      .limit(6),
  ])

  const knowledge = assertNoError<KnowledgeRow[]>(knowledgeResult).data ?? []
  const wines = assertNoError<PublicWineRow[]>(winesResult).data ?? []
  const experiences = assertNoError<PublicExperienceRow[]>(experiencesResult).data ?? []
  const events = assertNoError<PublicEventRow[]>(eventsResult).data ?? []
  const promotions = assertNoError<PublicPromotionRow[]>(promotionsResult).data ?? []
  const membershipPlans = assertNoError<PublicMembershipPlanRow[]>(membershipPlansResult).data ?? []

  const operationalContext = [
    ...wines.map((wine) => `Vino publicado: ${wine.name ?? 'Sin nombre'} | Uva: ${wine.grape_variety ?? 'N/D'} | Precio: ${wine.price ?? 'por confirmar'} | ${wine.description ?? ''}`),
    ...experiences.map((experience) => `Experiencia publicada: ${experience.title ?? 'Sin título'} | Precio base: ${experience.base_price ?? 'por confirmar'} | Duración: ${experience.duration_minutes ?? 'por confirmar'} min | Lugar: ${experience.location ?? 'por confirmar'} | ${experience.short_description ?? ''}`),
    ...events.map((event) => `Evento publicado: ${event.title ?? 'Sin título'} | Inicio: ${event.start_at ?? 'por confirmar'} | Fin: ${event.end_at ?? 'por confirmar'} | Lugar: ${event.venue ?? 'por confirmar'} | Cupo: ${event.capacity ?? 'por confirmar'} | Vendidos: ${event.sold_count ?? 0}`),
    ...promotions.map((promotion) => `Promoción publicada: ${promotion.name ?? 'Sin nombre'} | Tipo: ${promotion.promotion_type ?? 'N/D'} | Vigencia: ${promotion.starts_at ?? 'sin inicio'} a ${promotion.ends_at ?? 'sin cierre'} | ${promotion.description ?? ''}`),
    ...membershipPlans.map((plan) => `Plan Wine Club publicado: ${plan.name ?? 'Sin nombre'} | Precio: ${plan.price ?? 'por confirmar'} | Periodo: ${plan.billing_period ?? 'por confirmar'} | Beneficios: ${JSON.stringify(plan.benefits ?? [])} | ${plan.description ?? ''}`),
  ]
  const referenceContext = knowledge.map((item) => {
    const sourceUrl = typeof item.metadata?.source_url === 'string' ? item.metadata.source_url : 'sin URL registrada'
    const validation = item.metadata?.requires_client_validation === true ? 'requiere validación de Hacienda' : 'referencia verificada'
    return `Referencia ${item.namespace}: ${item.title} | Fuente: ${item.source_type ?? 'no especificada'} | ${validation} | ${sourceUrl}\n${item.content}`
  })

  return [
    'DATOS OPERATIVOS ACTUALES DEL BACKEND (prioridad máxima):',
    ...operationalContext,
    'REFERENCIAS PÚBLICAS E HISTÓRICAS (no sustituyen operación):',
    ...referenceContext,
  ].join('\n\n').slice(0, 15000)
}

async function callOpenAi(payload: SommelierMessagePayload, customer: CustomerRow | null, context: string) {
  if (env.AI_PROVIDER !== 'openai') throw httpError(503, 'Proveedor de Sommelier IA no configurado')
  if (!env.OPENAI_API_KEY) throw httpError(503, 'Sommelier IA no configurado')

  const language = payload.locale === 'en-US' ? 'English' : 'español de México'
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: env.OPENAI_MODEL,
      temperature: 0.45,
      max_tokens: 420,
      messages: [
        {
          role: 'system',
          content: [
            `Eres el Sommelier IA de Hacienda de Letras. Usa ${language} como idioma predeterminado.`,
            'Eres conocedor, cálido, elegante sin ser pretencioso y explicas el vino con claridad incluso a quien no sabe nada. Vendes la experiencia, no sólo la botella.',
            'Si la persona pide explícitamente inglés, español u otro idioma, responde íntegramente en el idioma solicitado desde esa misma respuesta.',
            'Nunca mezcles idiomas salvo que la persona pida una traducción o comparación lingüística.',
            'Jerarquía obligatoria de verdad: datos actuales del backend, documentos oficiales de Hacienda, sitio oficial, fuentes históricas verificables.',
            'Disponibilidad, inventario, precios, horarios, eventos, cupos, promociones y reservas se responden únicamente con datos actuales del backend; una referencia web jamás los sustituye.',
            'Distingue siempre historia de operación actual y avisa cuando una referencia requiere validación del cliente.',
            'Si no hay dato real, dilo con elegancia y ofrece consultar disponibilidad o vinos publicados.',
            'No inventes precios, promociones, horarios, beneficios ni disponibilidad.',
            'Nunca inventes parentescos, romances, homenajes, fundadores, premios ni el origen de nombres o etiquetas. Si no está documentado, di claramente que Hacienda aún no ha proporcionado el origen oficial.',
            'No solicites datos sensibles ni recomiendes consumo a menores.',
          ].join(' '),
        },
        {
          role: 'user',
          content: `Cliente: ${customerName(customer)}\nContexto disponible:\n${context || 'Sin contexto publicado.'}\n\nPregunta:\n${payload.message}`,
        },
      ],
    }),
  })

  if (!response.ok) throw httpError(503, 'Sommelier IA no disponible')
  const data = (await response.json()) as ChatResponse
  const content = data.choices?.[0]?.message?.content?.trim()
  if (!content) throw httpError(503, 'Sommelier IA no disponible')
  return {
    content,
    promptTokens: data.usage?.prompt_tokens ?? 0,
    completionTokens: data.usage?.completion_tokens ?? 0,
    totalTokens: data.usage?.total_tokens ?? 0,
  }
}

export async function sendSommelierMessage(payload: SommelierMessagePayload, user: UserContext) {
  requireOperationRole(user, customerRoles)
  const customer = await getCustomer(user)
  const { usage, dailyLimit } = await assertUsageAllowed(user, customer)
  const session = await getOrCreateSession(user, customer, payload.sessionId)
  await saveMessage(session.id, 'user', payload.message)
  const context = await getKnowledgeContext()
  const ai = await callOpenAi(payload, customer, context)
  const saved = await saveMessage(session.id, 'assistant', ai.content, env.OPENAI_MODEL, ai.promptTokens, ai.completionTokens)
  await upsertUsage(user, customer, usage, ai.totalTokens)

  return {
    data: {
      sessionId: session.id,
      message: {
        id: saved.id,
        role: 'assistant' as const,
        content: ai.content,
        createdAt: saved.created_at,
      },
      usage: {
        dailyLimit,
        usedToday: Number(usage?.interaction_count ?? 0) + 1,
      },
    },
  }
}
