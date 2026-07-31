import {
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react'
import {
  Activity,
  ArrowRight,
  BellRing,
  BrainCircuit,
  Check,
  ChevronDown,
  ClipboardCheck,
  Clock3,
  Copy,
  Download,
  Gauge,
  History,
  Lightbulb,
  Play,
  Radar,
  Send,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  WalletCards,
  X,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { SectionTitle } from '../../components/shared/SectionTitle'
import { useAppPreferences } from '../../context/AppPreferencesContext'

type OpportunityPriority = 'Alta' | 'Media' | 'Oportunidad'
type OpportunityEffort = 'Bajo' | 'Medio' | 'Alto'
type RiskLevel = 'Crítico' | 'Alto' | 'Medio'
type ActionStatus = 'Pendiente' | 'En proceso' | 'Completada'
type PanelKey =
  | 'opportunities'
  | 'forecast'
  | 'simulator'
  | 'actions'
  | 'memory'

type Opportunity = {
  id: string
  title: string
  area: string
  description: string
  impact: number
  confidence: number
  priority: OpportunityPriority
  effort: OpportunityEffort
  action: string
  routeLabel: string
  x: number
  y: number
}

type RiskSignal = {
  id: string
  title: string
  level: RiskLevel
  what: string
  why: string
  consequence: string
  recommendation: string
}

type ActionItem = {
  id: string
  title: string
  priority: OpportunityPriority
  owner: string
  due: string
  impact: number
  status: ActionStatus
}

type SimulationKey =
  | 'extra-tasting'
  | 'reactivation'
  | 'price-up'
  | 'reduce-discount'
  | 'close-slot'

type SimulationResult = {
  attendance: number
  revenue: number
  probability: number
  risk: string
  recommendation: string
}

function getPulseMetrics(isEnglish: boolean) {
  return [
    {
      label: isEnglish ? 'Demand' : 'Demanda',
      value: 86,
      note: isEnglish ? 'Reservations and traffic' : 'Reservaciones y tráfico',
    },
    {
      label: isEnglish ? 'Conversion' : 'Conversión',
      value: 74,
      note: isEnglish ? 'Visit to purchase' : 'Visita a compra',
    },
    {
      label: isEnglish ? 'Occupancy' : 'Ocupación',
      value: 91,
      note: isEnglish ? 'Published slots' : 'Cupos publicados',
    },
    {
      label: isEnglish ? 'Customer value' : 'Valor del cliente',
      value: 68,
      note: isEnglish ? 'Ticket and recurrence' : 'Ticket y recurrencia',
    },
    {
      label: isEnglish ? 'Campaigns' : 'Campañas',
      value: 72,
      note: isEnglish ? 'Attendance and revenue' : 'Afluencia e ingresos',
    },
    {
      label: isEnglish ? 'Retention' : 'Retención',
      value: 64,
      note: isEnglish ? 'Returning customers' : 'Clientes que regresan',
    },
    {
      label: isEnglish ? 'Monetization' : 'Monetización',
      value: 79,
      note: isEnglish ? 'Revenue per capacity' : 'Ingresos por capacidad',
    },
  ]
}

function getOpportunities(isEnglish: boolean): Opportunity[] {
  return [
    {
      id: 'extra-tasting',
      title: isEnglish ? 'Open a second Saturday tasting' : 'Abrir una segunda cata el sábado',
      area: isEnglish ? 'Availability' : 'Disponibilidad',
      description: isEnglish
        ? 'Tasting occupancy will hit its limit before Thursday. An additional slot can capture existing demand.'
        : 'La ocupación de catas llegará al límite antes del jueves. Un horario adicional puede capturar demanda ya existente.',
      impact: 28500,
      confidence: 91,
      priority: 'Alta',
      effort: 'Bajo',
      action: isEnglish ? 'Create availability' : 'Crear disponibilidad',
      routeLabel: isEnglish ? 'Availability' : 'Disponibilidad',
      x: 68,
      y: 30,
    },
    {
      id: 'recover-payments',
      title: isEnglish ? 'Recover pending payments' : 'Recuperar pagos pendientes',
      area: isEnglish ? 'Reservations' : 'Reservaciones',
      description: isEnglish
        ? 'There are 19 reservations with incomplete payment and a potential value of $31,800.'
        : 'Hay 19 reservaciones iniciadas con pago incompleto y valor potencial de $31,800.',
      impact: 31800,
      confidence: 88,
      priority: 'Alta',
      effort: 'Bajo',
      action: isEnglish ? 'Open reservations' : 'Abrir reservaciones',
      routeLabel: isEnglish ? 'Reservations' : 'Reservaciones',
      x: 76,
      y: 58,
    },
    {
      id: 'reactivate-high-value',
      title: isEnglish ? 'Reactivate high-value customers' : 'Reactivar clientes de alto valor',
      area: isEnglish ? 'Customers' : 'Clientes',
      description: isEnglish
        ? '86 customers with above-average ticket have not returned in 75 days.'
        : '86 clientes con ticket superior al promedio no han regresado en 75 días.',
      impact: 41000,
      confidence: 82,
      priority: 'Media',
      effort: 'Medio',
      action: isEnglish ? 'Create segment' : 'Crear segmento',
      routeLabel: isEnglish ? 'Customers' : 'Clientes',
      x: 46,
      y: 22,
    },
    {
      id: 'wine-club',
      title: isEnglish ? 'Rethink Wine Club' : 'Replantear Wine Club',
      area: isEnglish ? 'Campaigns' : 'Campañas',
      description: isEnglish
        ? 'The campaign generates engagement, but conversion is 19% below the expected target.'
        : 'La campaña genera interacción, pero está 19% debajo de la conversión esperada.',
      impact: 26400,
      confidence: 79,
      priority: 'Media',
      effort: 'Medio',
      action: isEnglish ? 'Adjust campaign' : 'Ajustar campaña',
      routeLabel: isEnglish ? 'Promotions' : 'Promociones',
      x: 32,
      y: 62,
    },
    {
      id: 'romantic-dinner',
      title: isEnglish ? 'Increase romantic dinner ticket' : 'Elevar ticket de cenas románticas',
      area: isEnglish ? 'Experiences' : 'Experiencias',
      description: isEnglish
        ? 'Occupancy is high but the ticket remains flat. A premium pairing can boost revenue without increasing capacity.'
        : 'La ocupación es alta, pero el ticket se mantiene plano. Un maridaje premium puede elevar el ingreso sin aumentar aforo.',
      impact: 36400,
      confidence: 76,
      priority: 'Oportunidad',
      effort: 'Bajo',
      action: isEnglish ? 'Create promotion' : 'Crear promoción',
      routeLabel: isEnglish ? 'Experiences' : 'Experiencias',
      x: 57,
      y: 75,
    },
  ]
}

function getRisks(isEnglish: boolean): RiskSignal[] {
  return [
    {
      id: 'saturday-capacity',
      title: isEnglish ? 'Saturday will hit capacity' : 'El sábado llegará al límite',
      level: 'Alto',
      what: isEnglish
        ? 'Tastings and dinners exceed 92% of projected occupancy.'
        : 'Catas y cenas superan 92% de ocupación proyectada.',
      why: isEnglish
        ? 'Demand will remain active over the next 72 hours.'
        : 'La demanda seguirá activa durante las próximas 72 horas.',
      consequence: isEnglish
        ? '14 to 21 bookings could be lost due to lack of capacity.'
        : 'Podrían perderse entre 14 y 21 reservaciones por falta de cupo.',
      recommendation: isEnglish
        ? 'Open an additional slot and stop ads once it fills up.'
        : 'Abrir un horario adicional y detener pauta cuando se complete.',
    },
    {
      id: 'pending-payments',
      title: isEnglish ? '19 payments are still pending' : '19 pagos siguen pendientes',
      level: 'Alto',
      what: isEnglish
        ? 'Reservations started without payment confirmation.'
        : 'Reservaciones iniciadas sin confirmación de pago.',
      why: isEnglish
        ? 'Most originate from campaign mobile traffic.'
        : 'La mayoría proviene de tráfico móvil de campañas.',
      consequence: isEnglish
        ? 'Value at risk is $31,800 and the slots remain held.'
        : 'El valor en riesgo es de $31,800 y los cupos siguen retenidos.',
      recommendation: isEnglish
        ? 'Send a reminder and auto-release after 12 hours.'
        : 'Enviar recordatorio y liberar automáticamente después de 12 horas.',
    },
    {
      id: 'wine-club-conversion',
      title: isEnglish ? 'Wine Club converts below target' : 'Wine Club convierte por debajo de la meta',
      level: 'Medio',
      what: isEnglish
        ? 'Conversion is 19% below the expected scenario.'
        : 'La conversión está 19% debajo del escenario esperado.',
      why: isEnglish
        ? 'The current discount is not differentiating the offer.'
        : 'El descuento actual no está diferenciando la propuesta.',
      consequence: isEnglish
        ? 'The cost per new membership may rise during the week.'
        : 'El costo por nueva membresía podría subir durante la semana.',
      recommendation: isEnglish
        ? 'Replace the discount with early access and an exclusive benefit.'
        : 'Cambiar descuento por acceso anticipado y beneficio exclusivo.',
    },
    {
      id: 'new-customer-return',
      title: isEnglish ? 'New customers are not returning' : 'Clientes nuevos no están regresando',
      level: 'Medio',
      what: isEnglish
        ? 'Only 21% took a second action within 45 days.'
        : 'Solo 21% realizó una segunda acción en 45 días.',
      why: isEnglish
        ? 'There is no follow-up after the first experience.'
        : 'No existe seguimiento posterior a la primera experiencia.',
      consequence: isEnglish
        ? 'Acquisition is growing faster than retention.'
        : 'La adquisición crece más rápido que la retención.',
      recommendation: isEnglish
        ? 'Activate a post-visit sequence with a personalized recommendation.'
        : 'Activar una secuencia post-visita con recomendación personalizada.',
    },
  ]
}

function getForecastScenarios(isEnglish: boolean) {
  return [
    {
      id: 'conservative',
      label: isEnglish ? 'Conservative' : 'Conservador',
      value: 1310000,
      reservations: 376,
      occupancy: 78,
      note: isEnglish ? 'No operational changes' : 'Sin cambios operativos',
    },
    {
      id: 'expected',
      label: isEnglish ? 'Expected' : 'Esperado',
      value: 1420000,
      reservations: 412,
      occupancy: 84,
      note: isEnglish ? 'With current behavior' : 'Con comportamiento actual',
    },
    {
      id: 'optimized',
      label: isEnglish ? 'Optimized' : 'Optimizado',
      value: 1560000,
      reservations: 448,
      occupancy: 88,
      note: isEnglish ? 'With recommended actions' : 'Con acciones recomendadas',
    },
  ]
}

function getSimulationOptions(isEnglish: boolean): Array<{
  id: SimulationKey
  label: string
  description: string
  baseResult: SimulationResult
}> {
  return [
    {
      id: 'extra-tasting',
      label: isEnglish ? 'Open another tasting slot' : 'Abrir otro horario de cata',
      description: isEnglish
        ? 'Adds capacity on the highest-demand day.'
        : 'Agrega capacidad durante el día de mayor demanda.',
      baseResult: {
        attendance: 16,
        revenue: 22400,
        probability: 87,
        risk: isEnglish ? 'Low' : 'Bajo',
        recommendation: isEnglish ? 'Open' : 'Abrir',
      },
    },
    {
      id: 'reactivation',
      label: isEnglish ? 'Reactivate inactive customers' : 'Reactivar clientes inactivos',
      description: isEnglish
        ? 'Sends a campaign to high-value customers with no activity.'
        : 'Envía una campaña a clientes de alto valor sin actividad.',
      baseResult: {
        attendance: 27,
        revenue: 46800,
        probability: 78,
        risk: isEnglish ? 'Low' : 'Bajo',
        recommendation: isEnglish ? 'Activate campaign' : 'Activar campaña',
      },
    },
    {
      id: 'price-up',
      label: isEnglish ? 'Increase price 10%' : 'Aumentar precio 10%',
      description: isEnglish
        ? 'Tests price sensitivity in high-occupancy experiences.'
        : 'Prueba sensibilidad de precio en experiencias de alta ocupación.',
      baseResult: {
        attendance: -4,
        revenue: 31800,
        probability: 74,
        risk: isEnglish ? 'Medium' : 'Medio',
        recommendation: isEnglish ? 'Apply only to premium slots' : 'Aplicar solo a horarios premium',
      },
    },
    {
      id: 'reduce-discount',
      label: isEnglish ? 'Reduce campaign discount' : 'Reducir descuento de campaña',
      description: isEnglish
        ? 'Protects ticket without fully stopping the promotion.'
        : 'Protege el ticket sin detener completamente la promoción.',
      baseResult: {
        attendance: -7,
        revenue: 24600,
        probability: 71,
        risk: isEnglish ? 'Medium' : 'Medio',
        recommendation: isEnglish ? 'Replace discount with benefit' : 'Cambiar descuento por beneficio',
      },
    },
    {
      id: 'close-slot',
      label: isEnglish ? 'Close low-demand time slot' : 'Cerrar horario de baja demanda',
      description: isEnglish
        ? 'Concentrates demand and reduces slot dispersion.'
        : 'Concentra demanda y reduce dispersión de cupos.',
      baseResult: {
        attendance: 5,
        revenue: 8400,
        probability: 69,
        risk: isEnglish ? 'Low' : 'Bajo',
        recommendation: isEnglish ? 'Close and redirect demand' : 'Cerrar y redirigir demanda',
      },
    },
  ]
}

function getDecisionMemory(isEnglish: boolean) {
  return [
    {
      date: '24 Jun 2026',
      recommendation: isEnglish ? 'Open a second Saturday tasting.' : 'Abrir una segunda cata el sábado.',
      action: isEnglish ? 'Time slot created at 18:00.' : 'Horario creado a las 18:00.',
      result: isEnglish ? '17 reservations and $23,800 in revenue.' : '17 reservaciones y $23,800 en ingresos.',
      accuracy: 94,
    },
    {
      date: '18 Jun 2026',
      recommendation: isEnglish ? 'Stop picnic campaign when capacity is full.' : 'Detener campaña de picnic al completar cupo.',
      action: isEnglish ? 'Campaign automatically stopped.' : 'Campaña detenida automáticamente.',
      result: isEnglish ? 'Capacity protected and average ticket stable.' : 'Cupo protegido y ticket promedio sin caída.',
      accuracy: 91,
    },
    {
      date: '07 Jun 2026',
      recommendation: isEnglish ? 'Contact Wine Club customers due for renewal.' : 'Contactar clientes Wine Club próximos a renovar.',
      action: isEnglish ? 'Segmented campaign sent.' : 'Campaña segmentada enviada.',
      result: isEnglish ? '19 renewals and $68,400 recovered.' : '19 renovaciones y $68,400 recuperados.',
      accuracy: 88,
    },
  ]
}

const quickQuestions = [
  '¿Qué debo atender hoy?',
  '¿Cómo vamos a cerrar el mes?',
  '¿Qué campaña deja más dinero?',
  '¿Dónde estamos perdiendo clientes?',
  '¿Conviene abrir otro horario?',
]

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(value)
}

function priorityStyles(priority: OpportunityPriority) {
  const styles: Record<OpportunityPriority, string> = {
    Alta: 'bg-[#f5e5df] text-[#944b3d]',
    Media: 'bg-[#f3eadb] text-[#8a642f]',
    Oportunidad: 'bg-[#e8efe6] text-[#5e7b62]',
  }

  return styles[priority]
}

function riskStyles(level: RiskLevel) {
  const styles: Record<RiskLevel, string> = {
    Crítico: 'bg-[#f1dedf] text-[#8d3641]',
    Alto: 'bg-[#f6e7dc] text-[#995333]',
    Medio: 'bg-[#efeae2] text-[#7b6b5f]',
  }

  return styles[level]
}

function actionStatusStyles(status: ActionStatus) {
  const styles: Record<ActionStatus, string> = {
    Pendiente: 'bg-[#f3eadb] text-[#8a642f]',
    'En proceso': 'bg-[#e8eaf1] text-[#59627e]',
    Completada: 'bg-[#e7efe6] text-[#5f7d63]',
  }

  return styles[status]
}

function getRadarQuadrant(opportunity: Opportunity, isEnglish: boolean) {
  const highImpact = opportunity.x >= 50
  const highUrgency = opportunity.y < 50

  if (highImpact && highUrgency) {
    return isEnglish ? 'Act now' : 'Actuar ahora'
  }

  if (!highImpact && highUrgency) {
    return isEnglish ? 'Resolve soon' : 'Resolver pronto'
  }

  if (highImpact && !highUrgency) {
    return isEnglish ? 'Plan and capture' : 'Planear y capturar'
  }

  return isEnglish ? 'Monitor' : 'Monitorear'
}

function getRadarExplanation(opportunity: Opportunity, isEnglish: boolean) {
  const highImpact = opportunity.x >= 50
  const highUrgency = opportunity.y < 50

  if (highImpact && highUrgency) {
    return isEnglish
      ? 'Top right: urgent with high economic impact — convert to immediate action.'
      : 'Está arriba y a la derecha: es urgente, tiene impacto económico alto y conviene convertirla en acción inmediata.'
  }

  if (!highImpact && highUrgency) {
    return isEnglish
      ? 'Top left: needs attention soon, though economic impact is lower than other decisions.'
      : 'Está en la zona superior izquierda: requiere atención pronto, aunque su impacto económico es menor que otras decisiones.'
  }

  if (highImpact && !highUrgency) {
    return isEnglish
      ? 'Bottom right: can generate significant value, but does not require action today. Schedule and measure it.'
      : 'Está abajo y a la derecha: puede generar valor importante, pero no exige actuar hoy. Conviene programarla y medirla.'
  }

  return isEnglish
    ? 'Bottom left: monitor for now without displacing more urgent or profitable decisions.'
    : 'Está abajo y a la izquierda: por ahora debe vigilarse, sin desplazar decisiones más urgentes o rentables.'
}

function MetricCard({
  label,
  value,
  note,
  icon: Icon,
  highlighted = false,
}: {
  label: string
  value: string
  note: string
  icon: LucideIcon
  highlighted?: boolean
}) {
  return (
    <article
      className={`relative min-w-0 overflow-hidden rounded-[1.1rem] border p-5 shadow-[var(--shadow-card)] ${
        highlighted
          ? 'border-[rgba(54,64,74,0.28)] bg-[linear-gradient(145deg,#252d35,#11181f)]'
          : 'border-[var(--color-line)] bg-[var(--color-panel)]'
      }`}
    >
      <div
        className={`absolute -right-8 -top-8 h-24 w-24 rounded-full border ${
          highlighted
            ? 'border-white/10'
            : 'border-[rgba(180,138,85,0.14)]'
        }`}
      />

      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p
            className={`truncate text-xs ${
              highlighted
                ? 'text-white/60'
                : 'text-[var(--color-muted)]'
            }`}
          >
            {label}
          </p>

          <p
            className={`mt-3 text-[2rem] leading-none ${
              highlighted
                ? 'text-white'
                : 'text-[var(--color-ink)]'
            }`}
            style={{
              fontFamily: 'Montserrat, sans-serif',
            }}
          >
            {value}
          </p>
        </div>

        <span
          className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
            highlighted
              ? 'bg-white/10 text-[#d8b578]'
              : 'bg-[var(--color-soft)] text-[var(--color-burgundy)]'
          }`}
        >
          <Icon size={18} />
        </span>
      </div>

      <p
        className={`relative mt-4 truncate text-[11px] ${
          highlighted
            ? 'text-white/52'
            : 'text-[var(--color-muted)]'
        }`}
      >
        {note}
      </p>
    </article>
  )
}

function ExpandablePanel({
  title,
  subtitle,
  icon: Icon,
  open,
  onToggle,
  actions,
  children,
}: {
  title: string
  subtitle: string
  icon: LucideIcon
  open: boolean
  onToggle: () => void
  actions?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="overflow-hidden rounded-[1.25rem] border border-[var(--color-line)] bg-[var(--color-panel)] shadow-[var(--shadow-card)]">
      <div className="flex flex-col gap-4 px-5 py-5 md:flex-row md:items-center">
        <button
          type="button"
          onClick={onToggle}
          className="flex min-w-0 flex-1 items-center gap-4 text-left"
          style={{
            background: 'transparent',
            border: 0,
            padding: 0,
            outline: 'none',
          }}
        >
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--color-soft)] text-[var(--color-burgundy)]">
            <Icon size={19} />
          </span>

          <span className="min-w-0">
            <span
              className="block text-[1.35rem] leading-tight text-[var(--color-ink)]"
              style={{
                fontFamily: 'Montserrat, sans-serif',
              }}
            >
              {title}
            </span>

            <span className="mt-1 block text-xs leading-5 text-[var(--color-muted)]">
              {subtitle}
            </span>
          </span>

          <ChevronDown
            size={18}
            className={`ml-auto shrink-0 text-[var(--color-muted)] transition-transform ${
              open ? 'rotate-180' : ''
            }`}
          />
        </button>

        {actions ? (
          <div className="flex shrink-0 flex-wrap gap-2">
            {actions}
          </div>
        ) : null}
      </div>

      {open ? (
        <div className="border-t border-[var(--color-line)] p-5">
          {children}
        </div>
      ) : null}
    </section>
  )
}

function getAssistantAnswer(
  question: string,
  language: 'es' | 'en',
) {
  const normalized = question
    .toLocaleLowerCase('es-MX')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

  if (
    normalized.includes('hoy') ||
    normalized.includes('atender') ||
    normalized.includes('prioridad') ||
    normalized.includes('today') ||
    normalized.includes('priority')
  ) {
    return {
      title:
        language === 'en'
          ? 'Three decisions deserve attention today'
          : 'Tres decisiones merecen atención hoy',
      answer:
        language === 'en'
          ? 'First, open an extra tasting slot for Saturday. Then recover 19 pending payments worth $31,800. Finally, adjust Wine Club, whose conversion is 19% below target. The combined estimated impact sits between $74,000 and $96,000.'
          : 'Primero abre un horario adicional de cata para el sábado. Después recupera 19 pagos pendientes por $31,800. Finalmente ajusta Wine Club, cuya conversión está 19% debajo de la meta. El impacto conjunto estimado está entre $74,000 y $96,000.',
      confidence: 91,
    }
  }

  if (
    normalized.includes('mes') ||
    normalized.includes('cerrar') ||
    normalized.includes('proyeccion') ||
    normalized.includes('month') ||
    normalized.includes('close')
  ) {
    return {
      title:
        language === 'en'
          ? 'Expected month-end close'
          : 'Cierre esperado del mes',
      answer:
        language === 'en'
          ? 'With the current behavior, the digital channel would close near $1.42M, 412 bookings and 84% occupancy. If the recommended actions are executed, the optimized scenario reaches $1.56M.'
          : 'Con el comportamiento actual, el canal digital cerraría cerca de $1.42 M, 412 reservaciones y 84% de ocupación. Ejecutando las acciones recomendadas, el escenario optimizado alcanza $1.56 M.',
      confidence: 86,
    }
  }

  if (
    normalized.includes('campana') ||
    normalized.includes('promocion') ||
    normalized.includes('campaign') ||
    normalized.includes('promotion')
  ) {
    return {
      title:
        language === 'en'
          ? 'The best campaign depends on the objective'
          : 'La mejor campaña depende del objetivo',
      answer:
        language === 'en'
          ? 'Vendimia delivers the highest total revenue. VIP Tasting has the strongest return and attracts higher-value guests. Wine Club needs adjustment because it generates interaction, but not enough memberships.'
          : 'Vendimia genera el mayor ingreso total. Cata VIP tiene mejor retorno y atrae clientes de mayor valor. Wine Club necesita ajuste porque produce interacción, pero no suficientes membresías.',
      confidence: 88,
    }
  }

  if (
    normalized.includes('cliente') ||
    normalized.includes('perdiendo') ||
    normalized.includes('retencion') ||
    normalized.includes('customer') ||
    normalized.includes('retention')
  ) {
    return {
      title:
        language === 'en'
          ? 'The leak happens after the first purchase'
          : 'La fuga está después de la primera compra',
      answer:
        language === 'en'
          ? 'Acquisition is growing, but only 21% of new customers take a second action within 45 days. There are 86 high-value customers with no recent activity. The priority is to activate post-visit follow-up and a personalized campaign.'
          : 'La adquisición crece, pero solo 21% de clientes nuevos realiza una segunda acción en 45 días. Hay 86 clientes de alto valor sin actividad reciente. La prioridad es activar seguimiento post-visita y una campaña personalizada.',
      confidence: 82,
    }
  }

  if (
    normalized.includes('horario') ||
    normalized.includes('cata') ||
    normalized.includes('sabado') ||
    normalized.includes('slot') ||
    normalized.includes('saturday')
  ) {
    return {
      title:
        language === 'en'
          ? 'Yes, opening another slot makes sense'
          : 'Sí conviene abrir otro horario',
      answer:
        language === 'en'
          ? 'The probability of filling an additional tasting on Saturday is 87%. The estimate is 16 attendees, $22,400 in revenue and low cannibalization risk.'
          : 'La probabilidad de ocupar una cata adicional el sábado es de 87%. Se estiman 16 asistentes, $22,400 de ingreso y riesgo bajo de canibalización.',
      confidence: 87,
    }
  }

  return {
    title:
      language === 'en'
        ? 'Executive reading of the digital channel'
        : 'Lectura ejecutiva del canal digital',
    answer:
      language === 'en'
        ? 'Demand remains strong and monetization is healthy. The main bottleneck is Saturday availability; the main leak is incomplete payments and new customers who do not return. Capacity, recovery and retention should stay at the top of the priority list.'
        : 'El negocio mantiene demanda fuerte y monetización saludable. El principal cuello de botella es disponibilidad en sábado; la principal fuga está en pagos incompletos y clientes nuevos que no regresan. Conviene priorizar capacidad, recuperación y retención.',
    confidence: 84,
  }
}

export function IntelligencePage() {
  const { language, isEnglish } = useAppPreferences()
  const localizedQuickQuestions = isEnglish
    ? [
        'What should I focus on today?',
        'How are we likely to close the month?',
        'Which campaign makes the most money?',
        'Where are we losing customers?',
        'Should we open another slot?',
      ]
    : quickQuestions
  const pulseMetrics = useMemo(() => getPulseMetrics(isEnglish), [isEnglish])
  const opportunities = useMemo(() => getOpportunities(isEnglish), [isEnglish])
  const risks = useMemo(() => getRisks(isEnglish), [isEnglish])
  const forecastScenarios = useMemo(() => getForecastScenarios(isEnglish), [isEnglish])
  const simulationOptions = useMemo(() => getSimulationOptions(isEnglish), [isEnglish])
  const decisionMemory = useMemo(() => getDecisionMemory(isEnglish), [isEnglish])
  const [assistantInput, setAssistantInput] = useState('')
  const [assistantResponse, setAssistantResponse] = useState(
    getAssistantAnswer('¿Qué debo atender hoy?', language),
  )
  const [selectedOpportunityId, setSelectedOpportunityId] = useState(
    opportunities[0].id,
  )
  const [selectedRiskId, setSelectedRiskId] = useState(risks[0].id)
  const [simulationKey, setSimulationKey] =
    useState<SimulationKey>('extra-tasting')
  const [simulationIntensity, setSimulationIntensity] = useState(100)
  const [simulationRun, setSimulationRun] = useState(false)
  const [briefCopied, setBriefCopied] = useState(false)
  const [toast, setToast] = useState('')
  const [panels, setPanels] = useState<Record<PanelKey, boolean>>({
    opportunities: true,
    forecast: true,
    simulator: false,
    actions: true,
    memory: false,
  })
  const [actionStatuses, setActionStatuses] = useState<Record<string, ActionStatus>>({
    'action-1': 'Pendiente',
    'action-2': 'En proceso',
    'action-3': 'Pendiente',
    'action-4': 'Pendiente',
  })

  const actionItems: ActionItem[] = useMemo(
    () =>
      [
        {
          id: 'action-1',
          title: isEnglish ? 'Open additional slot for Saturday' : 'Abrir horario adicional para el sábado',
          priority: 'Alta' as OpportunityPriority,
          owner: isEnglish ? 'Operations' : 'Operación',
          due: isEnglish ? 'Today' : 'Hoy',
          impact: 28500,
        },
        {
          id: 'action-2',
          title: isEnglish ? 'Recover 19 pending payments' : 'Recuperar 19 pagos pendientes',
          priority: 'Alta' as OpportunityPriority,
          owner: isEnglish ? 'Reservations' : 'Reservaciones',
          due: isEnglish ? 'Today' : 'Hoy',
          impact: 31800,
        },
        {
          id: 'action-3',
          title: isEnglish ? 'Review Wine Club proposal' : 'Revisar propuesta de Wine Club',
          priority: 'Media' as OpportunityPriority,
          owner: isEnglish ? 'Commercial' : 'Comercial',
          due: isEnglish ? 'Tomorrow' : 'Mañana',
          impact: 26400,
        },
        {
          id: 'action-4',
          title: isEnglish ? 'Create campaign for high-value customers' : 'Crear campaña para clientes de alto valor',
          priority: 'Oportunidad' as OpportunityPriority,
          owner: 'Marketing',
          due: isEnglish ? 'This week' : 'Esta semana',
          impact: 41000,
        },
      ].map((base) => ({
        ...base,
        status: actionStatuses[base.id] ?? 'Pendiente',
      })),
    [isEnglish, actionStatuses],
  )

  const selectedOpportunity =
    opportunities.find(
      (opportunity) => opportunity.id === selectedOpportunityId,
    ) ?? opportunities[0]

  const selectedRisk =
    risks.find((risk) => risk.id === selectedRiskId) ?? risks[0]

  const selectedSimulation =
    simulationOptions.find(
      (simulation) => simulation.id === simulationKey,
    ) ?? simulationOptions[0]

  const simulationResult = useMemo(() => {
    const multiplier = simulationIntensity / 100
    const result = selectedSimulation.baseResult

    return {
      attendance: Math.round(result.attendance * multiplier),
      revenue: Math.round(result.revenue * multiplier),
      probability: Math.min(
        Math.round(result.probability + (multiplier - 1) * 8),
        96,
      ),
      risk: result.risk,
      recommendation: result.recommendation,
    }
  }, [selectedSimulation, simulationIntensity])

  const businessScore = Math.round(
    pulseMetrics.reduce((sum, metric) => sum + metric.value, 0) /
      pulseMetrics.length,
  )

  const togglePanel = (panel: PanelKey) => {
    setPanels((current) => ({
      ...current,
      [panel]: !current[panel],
    }))
  }

  const showToast = (message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(''), 4200)
  }

  const askAlqia = (
    event?: FormEvent<HTMLFormElement>,
    forcedQuestion?: string,
  ) => {
    event?.preventDefault()

    const question = forcedQuestion ?? assistantInput

    if (!question.trim()) {
      return
    }

    setAssistantInput(question)
    setAssistantResponse(getAssistantAnswer(question, language))
  }

  const cycleActionStatus = (actionId: string) => {
    setActionStatuses((current) => {
      const currentStatus = current[actionId] ?? 'Pendiente'
      const nextStatus: ActionStatus =
        currentStatus === 'Pendiente'
          ? 'En proceso'
          : currentStatus === 'En proceso'
            ? 'Completada'
            : 'Pendiente'
      return { ...current, [actionId]: nextStatus }
    })
  }

  const copyBrief = async () => {
    const brief = isEnglish
      ? 'Hacienda de Letras maintains strong demand and healthy monetization. The priority is to open capacity on Saturday, recover pending payments, and reactivate high-value customers. The estimated impact of these actions is between $74,000 and $96,000.'
      : 'Hacienda de Letras mantiene demanda alta y monetización saludable. La prioridad es abrir capacidad el sábado, recuperar pagos pendientes y reactivar clientes de alto valor. El impacto estimado de estas acciones está entre $74,000 y $96,000.'

    try {
      await navigator.clipboard.writeText(brief)
      setBriefCopied(true)
      window.setTimeout(() => setBriefCopied(false), 2500)
    } catch {
      showToast(isEnglish ? 'Could not copy the summary in this browser.' : 'No fue posible copiar el resumen en este navegador.')
    }
  }

  const exportExecutiveCsv = () => {
    const rows = [
      ['ALQIA Intelligence', 'Resumen ejecutivo'],
      ['Estado del negocio', `${businessScore}/100`],
      ['Ingresos proyectados', '$1,420,000'],
      ['Reservaciones proyectadas', '412'],
      ['Ocupación esperada', '84%'],
      ['Oportunidades prioritarias', '3'],
      ['Riesgos activos', '2'],
      [],
      ['Decisión', 'Impacto estimado', 'Confianza'],
      ...opportunities.slice(0, 3).map((opportunity) => [
        opportunity.title,
        opportunity.impact,
        `${opportunity.confidence}%`,
      ]),
    ]

    const csv = rows
      .map((row) =>
        row
          .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
          .join(','),
      )
      .join('\n')

    const blob = new Blob([`\uFEFF${csv}`], {
      type: 'text/csv;charset=utf-8;',
    })

    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = 'alqia-intelligence-resumen.csv'
    link.click()

    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-w-0 space-y-6" style={{ fontFamily: 'Montserrat, sans-serif' }}>
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <SectionTitle
          eyebrow="Business Command"
          title="ALQIA Intelligence"
          subtitle={isEnglish
            ? 'Monitoring, prediction and decisions for the Hacienda de Letras digital channel.'
            : 'Vigilancia, predicción y decisiones para el canal digital de Hacienda de Letras.'}
        />

        <div className="flex flex-wrap gap-2">
          <span className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[var(--color-line)] bg-[var(--color-panel)] px-4 text-[10px] font-semibold text-[#5f7d63]">
            <Activity size={13} />
            {isEnglish ? 'Business stable' : 'Negocio estable'}
          </span>

          <span className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[var(--color-line)] bg-[var(--color-panel)] px-4 text-[10px] font-semibold text-[var(--color-burgundy)]">
            <BellRing size={13} />
            {isEnglish ? '2 attention signals' : '2 señales de atención'}
          </span>

          <span className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[var(--color-line)] bg-[var(--color-panel)] px-4 text-[10px] font-semibold text-[var(--color-muted)]">
            <Clock3 size={13} />
            {isEnglish ? 'Analyzed 3 min ago' : 'Analizado hace 3 min'}
          </span>
        </div>
      </div>

      <section className="relative overflow-hidden rounded-[1.35rem] border border-[rgba(54,64,74,0.28)] bg-[linear-gradient(145deg,#252d35,#11181f)] p-5 shadow-[0_22px_60px_rgba(14,20,26,0.22)]">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.16]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.12) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />

        <div className="relative grid gap-5 2xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.6fr)]">
          <div>
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] text-[#d8b578]">
                <BrainCircuit size={19} />
              </span>

              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#d8b578]">
                  {isEnglish ? 'Executive query' : 'Consulta ejecutiva'}
                </p>
                <p className="mt-1 text-xs text-white/52">
                  {isEnglish
                    ? 'Ask about sales, customers, campaigns or capacity.'
                    : 'Pregunta sobre ventas, clientes, campañas o capacidad.'}
                </p>
              </div>
            </div>

            <form
              onSubmit={(event) => askAlqia(event)}
              className="mt-5 flex min-w-0 flex-col gap-3 sm:flex-row"
            >
              <label className="flex min-h-12 min-w-0 flex-1 items-center gap-3 rounded-xl border border-white/10 bg-white/[0.06] px-4 backdrop-blur">
                <Sparkles
                  size={17}
                  className="shrink-0 text-[#d8b578]"
                />

                <input
                  type="text"
                  value={assistantInput}
                  onChange={(event) =>
                    setAssistantInput(event.target.value)
                  }
                  placeholder={
                    isEnglish
                      ? 'Ask ALQIA anything about the business...'
                      : 'Pregúntale a ALQIA cualquier cosa sobre el negocio...'
                  }
                  className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/36"
                />
              </label>

              <button
                type="submit"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-semibold text-[#202933]"
              >
                {isEnglish ? 'Ask' : 'Consultar'}
                <Send size={15} />
              </button>
            </form>

            <div className="mt-4 flex flex-wrap gap-2">
              {localizedQuickQuestions.map((question) => (
                <button
                  key={question}
                  type="button"
                  onClick={() => askAlqia(undefined, question)}
                  className="rounded-full border border-white/10 bg-white/[0.045] px-3 py-2 text-[10px] font-semibold text-white/62 transition hover:bg-white/[0.09]"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>

          <article className="rounded-[1.05rem] border border-white/10 bg-white/[0.07] p-5 backdrop-blur">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-[#d8b578]">
                  {isEnglish ? 'ALQIA response' : 'Respuesta ALQIA'}
                </p>

                <h3
                  className="mt-2 text-[1.35rem] leading-tight text-white"
                  style={{
                    fontFamily: 'Montserrat, sans-serif',
                  }}
                >
                  {assistantResponse.title}
                </h3>
              </div>

              <span className="rounded-full border border-white/10 bg-white/[0.07] px-3 py-1.5 text-[9px] font-semibold text-white/60">
                {assistantResponse.confidence}%{' '}
                {isEnglish ? 'confidence' : 'confianza'}
              </span>
            </div>

            <p className="mt-4 text-xs leading-6 text-white/66">
              {assistantResponse.answer}
            </p>
          </article>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label={isEnglish ? 'Business health' : 'Salud del negocio'}
          value={`${businessScore}/100`}
          note={isEnglish ? 'Consolidated digital channel pulse' : 'Pulso consolidado del canal digital'}
          icon={Gauge}
          highlighted
        />

        <MetricCard
          label={isEnglish ? 'Projected revenue' : 'Ingresos proyectados'}
          value="$1.42 M"
          note={isEnglish ? 'Expected monthly scenario' : 'Escenario esperado del mes'}
          icon={WalletCards}
        />

        <MetricCard
          label={isEnglish ? 'Active opportunities' : 'Oportunidades activas'}
          value="5"
          note={isEnglish ? '$164,100 potential impact' : '$164,100 de impacto potencial'}
          icon={Lightbulb}
        />

        <MetricCard
          label={isEnglish ? 'Risk signals' : 'Señales de riesgo'}
          value="4"
          note={isEnglish ? '2 require attention today' : '2 requieren atención hoy'}
          icon={ShieldAlert}
        />
      </section>

      <section className="grid gap-5 2xl:grid-cols-[minmax(0,1.24fr)_minmax(350px,0.76fr)]">
        <article className="rounded-[1.25rem] border border-[var(--color-line)] bg-[var(--color-panel)] p-5 shadow-[var(--shadow-card)]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-gold)]">
                {isEnglish ? 'Executive brief' : 'Brief ejecutivo'}
              </p>

              <h2
                className="mt-2 text-[1.75rem] leading-tight text-[var(--color-ink)]"
                style={{
                  fontFamily: 'Montserrat, sans-serif',
                }}
              >
                {isEnglish ? 'What deserves attention today' : 'Lo que merece atención hoy'}
              </h2>
            </div>

            <button
              type="button"
              onClick={copyBrief}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--color-line)] bg-[var(--color-panel-strong)] px-4 text-xs font-semibold text-[var(--color-ink)]"
            >
              <Copy size={14} />
              {briefCopied ? (isEnglish ? 'Copied' : 'Copiado') : (isEnglish ? 'Copy brief' : 'Copiar brief')}
            </button>
          </div>

          <p className="mt-5 max-w-5xl text-sm leading-7 text-[var(--color-muted-strong)]">
            {isEnglish
              ? 'Reservations are 14% above average, but Saturday is already operating near its limit. The Vendimia campaign maintains good momentum; Wine Club remains below the expected conversion. There is an immediate opportunity to open capacity, recover incomplete payments, and reactivate high-value customers.'
              : 'Las reservaciones están 14% arriba del promedio, pero el sábado ya opera cerca de su límite. La campaña de Vendimia mantiene buen ritmo; Wine Club continúa por debajo de la conversión esperada. Hay una oportunidad inmediata de abrir capacidad, recuperar pagos incompletos y reactivar clientes de alto valor.'}
          </p>

          <div className="mt-6 grid gap-3 xl:grid-cols-3">
            {opportunities.slice(0, 3).map((opportunity, index) => (
              <button
                key={opportunity.id}
                type="button"
                onClick={() => {
                  setSelectedOpportunityId(opportunity.id)
                  setPanels((current) => ({
                    ...current,
                    opportunities: true,
                  }))
                }}
                className="rounded-[1rem] border border-[var(--color-line)] bg-[var(--color-panel-strong)] p-4 text-left transition hover:-translate-y-0.5"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-burgundy)] text-[10px] font-bold text-white">
                    {index + 1}
                  </span>

                  <span
                    className={`rounded-full px-3 py-1 text-[9px] font-semibold ${priorityStyles(
                      opportunity.priority,
                    )}`}
                  >
                    {opportunity.priority}
                  </span>
                </div>

                <p className="mt-4 text-sm font-semibold leading-5 text-[var(--color-ink)]">
                  {opportunity.title}
                </p>

                <p className="mt-3 text-[10px] text-[var(--color-muted)]">
                    {isEnglish ? 'Estimated impact' : 'Impacto estimado'}
                </p>

                <p className="mt-1 text-lg font-bold text-[var(--color-burgundy)]">
                  {formatCurrency(opportunity.impact)}
                </p>
              </button>
            ))}
          </div>
        </article>

        <article className="rounded-[1.25rem] border border-[var(--color-line)] bg-[var(--color-panel)] p-5 shadow-[var(--shadow-card)]">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-soft)] text-[var(--color-burgundy)]">
              <Activity size={18} />
            </span>

            <div>
              <p className="text-sm font-semibold text-[var(--color-ink)]">
                {isEnglish ? 'Business pulse' : 'Pulso del negocio'}
              </p>
              <p className="mt-1 text-[10px] text-[var(--color-muted)]">
                {isEnglish ? 'Cross-channel digital health' : 'Salud transversal del canal digital'}
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {pulseMetrics.map((metric) => (
              <div key={metric.label}>
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-[var(--color-ink)]">
                      {metric.label}
                    </p>
                    <p className="mt-1 truncate text-[9px] text-[var(--color-muted)]">
                      {metric.note}
                    </p>
                  </div>

                  <span className="text-xs font-bold text-[var(--color-burgundy)]">
                    {metric.value}/100
                  </span>
                </div>

                <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--color-soft)]">
                  <div
                    className="h-full rounded-full bg-[linear-gradient(90deg,var(--color-gold),var(--color-burgundy))]"
                    style={{ width: `${metric.value}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-[1rem] border border-[rgba(180,138,85,0.24)] bg-[#fbf6ee] p-4">
            <p className="text-xs leading-6 text-[var(--color-muted-strong)]">
              {isEnglish
                ? 'Demand is growing faster than retention. The business is acquiring customers, but not yet converting enough into returning ones.'
                : 'La demanda crece más rápido que la retención. El negocio está captando clientes, pero todavía no convierte suficientes en recurrentes.'}
            </p>
          </div>
        </article>
      </section>

      <div className="space-y-4">
        <ExpandablePanel
          title="Radar de oportunidades"
          subtitle="Cada punto es una decisión: arriba significa más urgencia, a la derecha más impacto económico y el tamaño mayor confianza del cálculo."
          icon={Radar}
          open={panels.opportunities}
          onToggle={() => togglePanel('opportunities')}
        >
          <div className="grid gap-5 2xl:grid-cols-[minmax(0,1.18fr)_minmax(360px,0.82fr)]">
            <article className="relative min-h-[540px] overflow-hidden rounded-[1.2rem] border border-[rgba(54,64,74,0.28)] bg-[linear-gradient(145deg,#222b33,#11171d)] p-5">
              <div
                className="absolute inset-0 opacity-[0.16]"
                style={{
                  backgroundImage:
                    'linear-gradient(rgba(255,255,255,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.12) 1px, transparent 1px)',
                  backgroundSize: '32px 32px',
                }}
              />

              <div className="relative flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div>
                  <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[#d8b578]">
                    Mapa de decisiones
                  </p>

                  <h3 className="mt-2 text-[1.35rem] font-semibold text-white">
                    ¿Qué conviene hacer primero y por qué?
                  </h3>

                  <p className="mt-2 max-w-2xl text-xs leading-5 text-white/52">
                    Cada punto representa una acción posible. Su posición combina
                    urgencia e impacto económico; el tamaño muestra qué tanta
                    confianza tiene ALQIA en la estimación.
                  </p>
                </div>

                <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-[9px] font-semibold text-white/58">
                  <Activity size={12} />
                  5 decisiones detectadas
                </span>
              </div>

              <div className="relative mt-5 grid gap-2 sm:grid-cols-3">
                <div className="rounded-xl border border-white/10 bg-white/[0.045] px-3 py-3">
                  <p className="text-[8px] font-semibold uppercase tracking-[0.12em] text-[#d8b578]">
                    Eje vertical
                  </p>
                  <p className="mt-1 text-[10px] leading-4 text-white/58">
                    Más arriba = mayor urgencia.
                  </p>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/[0.045] px-3 py-3">
                  <p className="text-[8px] font-semibold uppercase tracking-[0.12em] text-[#d8b578]">
                    Eje horizontal
                  </p>
                  <p className="mt-1 text-[10px] leading-4 text-white/58">
                    Más a la derecha = mayor ingreso potencial.
                  </p>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/[0.045] px-3 py-3">
                  <p className="text-[8px] font-semibold uppercase tracking-[0.12em] text-[#d8b578]">
                    Tamaño del punto
                  </p>
                  <p className="mt-1 text-[10px] leading-4 text-white/58">
                    Más grande = mayor confianza del cálculo.
                  </p>
                </div>
              </div>

              <div className="relative mx-auto mt-5 h-[350px] max-w-[720px] overflow-hidden rounded-[1rem] border border-white/10 bg-black/10">
                <div className="absolute left-0 top-0 h-1/2 w-1/2 border-b border-r border-white/10 bg-white/[0.012]" />
                <div className="absolute right-0 top-0 h-1/2 w-1/2 border-b border-white/10 bg-[#d8b578]/[0.035]" />
                <div className="absolute bottom-0 left-0 h-1/2 w-1/2 border-r border-white/10 bg-white/[0.008]" />
                <div className="absolute bottom-0 right-0 h-1/2 w-1/2 bg-[#7f9b86]/[0.025]" />

                <div className="absolute left-1/2 top-1/2 h-[280px] w-[280px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/[0.08]" />
                <div className="absolute left-1/2 top-1/2 h-[190px] w-[190px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/[0.08]" />
                <div className="absolute left-1/2 top-1/2 h-[100px] w-[100px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/[0.08]" />

                <span className="absolute left-4 top-4 rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-[8px] font-semibold uppercase tracking-[0.11em] text-white/52">
                  Resolver pronto
                </span>

                <span className="absolute right-4 top-4 rounded-full border border-[#d8b578]/20 bg-[#d8b578]/10 px-3 py-1.5 text-[8px] font-semibold uppercase tracking-[0.11em] text-[#e4c895]">
                  Actuar ahora
                </span>

                <span className="absolute bottom-10 left-4 rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-[8px] font-semibold uppercase tracking-[0.11em] text-white/42">
                  Monitorear
                </span>

                <span className="absolute bottom-10 right-4 rounded-full border border-[#7f9b86]/20 bg-[#7f9b86]/10 px-3 py-1.5 text-[8px] font-semibold uppercase tracking-[0.11em] text-[#a9c2ae]">
                  Planear y capturar
                </span>

                {opportunities.map((opportunity, index) => {
                  const selected =
                    selectedOpportunityId === opportunity.id
                  const pointSize =
                    17 + Math.round(opportunity.confidence / 12)

                  return (
                    <button
                      key={opportunity.id}
                      type="button"
                      onClick={() =>
                        setSelectedOpportunityId(opportunity.id)
                      }
                      className="absolute z-10 -translate-x-1/2 -translate-y-1/2 rounded-full text-[9px] font-bold text-[#192129] transition duration-200 hover:scale-110"
                      style={{
                        left: `${opportunity.x}%`,
                        top: `${opportunity.y}%`,
                        width: selected ? pointSize + 8 : pointSize,
                        height: selected ? pointSize + 8 : pointSize,
                        background:
                          opportunity.priority === 'Alta'
                            ? '#e2be79'
                            : opportunity.priority === 'Media'
                              ? '#c58c69'
                              : '#8da795',
                        boxShadow: selected
                          ? '0 0 0 8px rgba(226,190,121,0.14), 0 0 30px rgba(226,190,121,0.46)'
                          : '0 0 18px rgba(216,181,120,0.22)',
                      }}
                      aria-label={`${index + 1}. ${opportunity.title}`}
                      title={`${opportunity.title}: ${getRadarQuadrant(opportunity, isEnglish)}`}
                    >
                      {index + 1}
                    </button>
                  )
                })}

                <span className="absolute bottom-2 left-4 text-[8px] font-semibold uppercase tracking-[0.1em] text-white/28">
                  Menor impacto
                </span>

                <span className="absolute bottom-2 right-4 text-[8px] font-semibold uppercase tracking-[0.1em] text-white/44">
                  Mayor impacto económico →
                </span>

                <span className="absolute left-2 top-1/2 -translate-y-1/2 -rotate-90 text-[8px] font-semibold uppercase tracking-[0.1em] text-white/38">
                  Mayor urgencia →
                </span>
              </div>

              <div className="relative mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[9px] text-white/48">
                <span className="font-semibold text-white/64">
                  Prioridad:
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#e2be79]" />
                  Alta
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#c58c69]" />
                  Media
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#8da795]" />
                  Oportunidad
                </span>
                <span className="ml-auto text-white/36">
                  Selecciona un punto para ver la decisión completa.
                </span>
              </div>
            </article>

            <aside className="space-y-4">
              <article className="rounded-[1.15rem] border border-[var(--color-line)] bg-[var(--color-panel-strong)] p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-[var(--color-gold)]">
                      {selectedOpportunity.area}
                    </p>

                    <h3
                      className="mt-2 text-[1.5rem] leading-tight text-[var(--color-ink)]"
                      style={{
                        fontFamily:
                          'Montserrat, sans-serif',
                      }}
                    >
                      {selectedOpportunity.title}
                    </h3>
                  </div>

                  <span
                    className={`rounded-full px-3 py-1.5 text-[9px] font-semibold ${priorityStyles(
                      selectedOpportunity.priority,
                    )}`}
                  >
                    {selectedOpportunity.priority}
                  </span>
                </div>

                <p className="mt-4 text-xs leading-6 text-[var(--color-muted-strong)]">
                  {selectedOpportunity.description}
                </p>

                <div className="mt-4 rounded-xl border border-[rgba(180,138,85,0.24)] bg-[#fbf6ee] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--color-gold)]">
                      Qué significa su posición
                    </p>

                    <span className="rounded-full bg-white px-3 py-1.5 text-[9px] font-bold text-[var(--color-burgundy)] shadow-sm">
                      {getRadarQuadrant(selectedOpportunity, isEnglish)}
                    </span>
                  </div>

                  <p className="mt-3 text-[11px] leading-5 text-[var(--color-muted-strong)]">
                    {getRadarExplanation(selectedOpportunity, isEnglish)}
                  </p>
                </div>

                <div className="mt-5 grid grid-cols-3 gap-3">
                  <div className="rounded-xl bg-white p-3">
                    <p className="text-[8px] uppercase tracking-[0.1em] text-[var(--color-muted)]">
                      Impacto
                    </p>
                    <p className="mt-1 text-sm font-bold text-[var(--color-ink)]">
                      {formatCurrency(selectedOpportunity.impact)}
                    </p>
                  </div>

                  <div className="rounded-xl bg-white p-3">
                    <p className="text-[8px] uppercase tracking-[0.1em] text-[var(--color-muted)]">
                      Confianza
                    </p>
                    <p className="mt-1 text-sm font-bold text-[var(--color-ink)]">
                      {selectedOpportunity.confidence}%
                    </p>
                  </div>

                  <div className="rounded-xl bg-white p-3">
                    <p className="text-[8px] uppercase tracking-[0.1em] text-[var(--color-muted)]">
                      Esfuerzo
                    </p>
                    <p className="mt-1 text-sm font-bold text-[var(--color-ink)]">
                      {selectedOpportunity.effort}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    showToast(
                      `${selectedOpportunity.action}: acción simulada enviada al módulo ${selectedOpportunity.routeLabel}.`,
                    )
                  }
                  className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-burgundy)] px-4 text-xs font-semibold"
                  style={{ color: '#ffffff' }}
                >
                  {selectedOpportunity.action}
                  <ArrowRight size={14} color="#ffffff" />
                </button>
              </article>

              <div className="space-y-2">
                {opportunities.map((opportunity, index) => (
                  <button
                    key={opportunity.id}
                    type="button"
                    onClick={() =>
                      setSelectedOpportunityId(opportunity.id)
                    }
                    className="flex w-full items-center gap-3 rounded-xl border border-[var(--color-line)] bg-[var(--color-panel)] p-3 text-left transition hover:-translate-y-0.5"
                    style={{
                      borderColor:
                        selectedOpportunityId === opportunity.id
                          ? 'var(--color-burgundy)'
                          : 'var(--color-line)',
                    }}
                  >
                    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-soft)] text-[10px] font-bold text-[var(--color-burgundy)]">
                      {index + 1}
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[11px] font-semibold text-[var(--color-ink)]">
                        {opportunity.title}
                      </span>
                      <span className="mt-1 block text-[9px] text-[var(--color-muted)]">
                        {getRadarQuadrant(opportunity, isEnglish)}
                      </span>
                    </span>

                    <span className="shrink-0 text-[10px] font-bold text-[var(--color-burgundy)]">
                      {formatCurrency(opportunity.impact)}
                    </span>
                  </button>
                ))}
              </div>
            </aside>
          </div>

          <div className="mt-5 grid gap-4 2xl:grid-cols-[0.72fr_1.28fr]">
            <article className="rounded-[1.15rem] border border-[var(--color-line)] bg-[var(--color-panel-strong)] p-5">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[var(--color-burgundy)] shadow-sm">
                  <ShieldAlert size={18} />
                </span>

                <div>
                  <p className="text-sm font-semibold text-[var(--color-ink)]">
                    Señales tempranas
                  </p>
                  <p className="mt-1 text-[10px] text-[var(--color-muted)]">
                    Riesgos antes de convertirse en problemas
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-2">
                {risks.map((risk) => (
                  <button
                    key={risk.id}
                    type="button"
                    onClick={() => setSelectedRiskId(risk.id)}
                    className="flex w-full items-center justify-between gap-3 rounded-xl border border-[var(--color-line)] bg-white px-4 py-3 text-left"
                    style={{
                      borderColor:
                        selectedRiskId === risk.id
                          ? 'var(--color-burgundy)'
                          : 'var(--color-line)',
                    }}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-semibold text-[var(--color-ink)]">
                        {risk.title}
                      </span>
                    </span>

                    <span
                      className={`shrink-0 rounded-full px-3 py-1 text-[8px] font-semibold ${riskStyles(
                        risk.level,
                      )}`}
                    >
                      {risk.level}
                    </span>
                  </button>
                ))}
              </div>
            </article>

            <article className="rounded-[1.15rem] border border-[var(--color-line)] bg-[var(--color-panel)] p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[var(--color-gold)]">
                    Señal seleccionada
                  </p>
                  <h3
                    className="mt-2 text-[1.45rem] text-[var(--color-ink)]"
                    style={{
                      fontFamily:
                        'Montserrat, sans-serif',
                    }}
                  >
                    {selectedRisk.title}
                  </h3>
                </div>

                <span
                  className={`rounded-full px-3 py-1.5 text-[9px] font-semibold ${riskStyles(
                    selectedRisk.level,
                  )}`}
                >
                  {selectedRisk.level}
                </span>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {[
                  ['Qué pasó', selectedRisk.what],
                  ['Por qué importa', selectedRisk.why],
                  ['Qué podría ocurrir', selectedRisk.consequence],
                  ['Qué recomienda ALQIA', selectedRisk.recommendation],
                ].map(([label, text]) => (
                  <div
                    key={label}
                    className="rounded-xl bg-[var(--color-panel-strong)] p-4"
                  >
                    <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-[var(--color-muted)]">
                      {label}
                    </p>
                    <p className="mt-2 text-[11px] leading-5 text-[var(--color-muted-strong)]">
                      {text}
                    </p>
                  </div>
                ))}
              </div>
            </article>
          </div>
        </ExpandablePanel>

        <ExpandablePanel
          title="Predicción de cierre"
          subtitle="Tres futuros posibles según el comportamiento y las decisiones tomadas."
          icon={TrendingUp}
          open={panels.forecast}
          onToggle={() => togglePanel('forecast')}
          actions={
            <button
              type="button"
              onClick={exportExecutiveCsv}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--color-line)] bg-[var(--color-panel-strong)] px-4 text-xs font-semibold text-[var(--color-ink)]"
            >
              <Download size={14} />
              Exportar resumen
            </button>
          }
        >
          <div className="grid gap-4 xl:grid-cols-3">
            {forecastScenarios.map((scenario) => {
              const optimized = scenario.id === 'optimized'

              return (
                <article
                  key={scenario.id}
                  className={`rounded-[1.15rem] border p-5 ${
                    optimized
                      ? 'border-[rgba(54,64,74,0.28)] bg-[linear-gradient(145deg,#252d35,#11181f)]'
                      : 'border-[var(--color-line)] bg-[var(--color-panel-strong)]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p
                        className={`text-[9px] font-semibold uppercase tracking-[0.14em] ${
                          optimized
                            ? 'text-[#d8b578]'
                            : 'text-[var(--color-gold)]'
                        }`}
                      >
                        {scenario.label}
                      </p>

                      <p
                        className={`mt-3 text-[2rem] leading-none ${
                          optimized
                            ? 'text-white'
                            : 'text-[var(--color-ink)]'
                        }`}
                        style={{
                          fontFamily:
                            'Montserrat, sans-serif',
                        }}
                      >
                        {formatCurrency(scenario.value)}
                      </p>
                    </div>

                    {optimized ? (
                      <span className="rounded-full border border-white/10 bg-white/[0.07] px-3 py-1.5 text-[8px] font-semibold text-white/62">
                        Recomendado
                      </span>
                    ) : null}
                  </div>

                  <p
                    className={`mt-3 text-xs ${
                      optimized
                        ? 'text-white/52'
                        : 'text-[var(--color-muted)]'
                    }`}
                  >
                    {scenario.note}
                  </p>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <div
                      className={`rounded-xl p-3 ${
                        optimized
                          ? 'bg-white/[0.06]'
                          : 'bg-white'
                      }`}
                    >
                      <p
                        className={`text-[8px] uppercase tracking-[0.1em] ${
                          optimized
                            ? 'text-white/40'
                            : 'text-[var(--color-muted)]'
                        }`}
                      >
                        Reservaciones
                      </p>
                      <p
                        className={`mt-1 text-sm font-bold ${
                          optimized
                            ? 'text-white'
                            : 'text-[var(--color-ink)]'
                        }`}
                      >
                        {scenario.reservations}
                      </p>
                    </div>

                    <div
                      className={`rounded-xl p-3 ${
                        optimized
                          ? 'bg-white/[0.06]'
                          : 'bg-white'
                      }`}
                    >
                      <p
                        className={`text-[8px] uppercase tracking-[0.1em] ${
                          optimized
                            ? 'text-white/40'
                            : 'text-[var(--color-muted)]'
                        }`}
                      >
                        Ocupación
                      </p>
                      <p
                        className={`mt-1 text-sm font-bold ${
                          optimized
                            ? 'text-white'
                            : 'text-[var(--color-ink)]'
                        }`}
                      >
                        {scenario.occupancy}%
                      </p>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>

          <div className="mt-5 rounded-[1.05rem] border border-[rgba(180,138,85,0.24)] bg-[#fbf6ee] p-5">
            <div className="flex items-start gap-3">
              <Sparkles
                size={18}
                className="mt-0.5 shrink-0 text-[var(--color-burgundy)]"
              />
              <div>
                <p className="text-sm font-semibold text-[var(--color-ink)]">
                  Cómo alcanzar el escenario optimizado
                </p>
                <p className="mt-2 text-xs leading-6 text-[var(--color-muted-strong)]">
                  Abrir capacidad el sábado, recuperar pagos pendientes y
                  activar a los clientes de alto valor elevaría el cierre
                  proyectado en aproximadamente $140,000.
                </p>
              </div>
            </div>
          </div>
        </ExpandablePanel>

        <ExpandablePanel
          title="Simulador de decisiones"
          subtitle="Prueba una acción antes de ejecutarla y compara su impacto."
          icon={Zap}
          open={panels.simulator}
          onToggle={() => togglePanel('simulator')}
        >
          <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_minmax(340px,0.7fr)]">
            <section className="rounded-[1.15rem] border border-[var(--color-line)] bg-[var(--color-panel-strong)] p-5">
              <p className="text-sm font-semibold text-[var(--color-ink)]">
                ¿Qué pasaría si...?
              </p>

              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {simulationOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => {
                      setSimulationKey(option.id)
                      setSimulationRun(false)
                    }}
                    className="rounded-[1rem] border p-4 text-left transition"
                    style={{
                      borderColor:
                        simulationKey === option.id
                          ? 'var(--color-burgundy)'
                          : 'var(--color-line)',
                      backgroundColor:
                        simulationKey === option.id
                          ? 'rgba(104,17,38,0.045)'
                          : '#ffffff',
                    }}
                  >
                    <p className="text-sm font-semibold text-[var(--color-ink)]">
                      {option.label}
                    </p>
                    <p className="mt-2 text-[10px] leading-5 text-[var(--color-muted)]">
                      {option.description}
                    </p>
                  </button>
                ))}
              </div>

              <div className="mt-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-[var(--color-ink)]">
                      Intensidad de la acción
                    </p>
                    <p className="mt-1 text-[10px] text-[var(--color-muted)]">
                      Ajusta alcance, capacidad o presupuesto.
                    </p>
                  </div>

                  <span className="text-sm font-bold text-[var(--color-burgundy)]">
                    {simulationIntensity}%
                  </span>
                </div>

                <input
                  type="range"
                  min="50"
                  max="150"
                  step="10"
                  value={simulationIntensity}
                  onChange={(event) => {
                    setSimulationIntensity(
                      Number(event.target.value),
                    )
                    setSimulationRun(false)
                  }}
                  className="mt-4 w-full accent-[var(--color-burgundy)]"
                />
              </div>

              <button
                type="button"
                onClick={() => setSimulationRun(true)}
                className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--color-burgundy)] px-5 text-xs font-semibold"
                style={{ color: '#ffffff' }}
              >
                <Play size={14} color="#ffffff" />
                Ejecutar simulación
              </button>
            </section>

            <aside className="rounded-[1.15rem] border border-[rgba(54,64,74,0.28)] bg-[linear-gradient(145deg,#252d35,#11181f)] p-5">
              <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-[#d8b578]">
                Resultado estimado
              </p>

              <h3
                className="mt-2 text-[1.5rem] leading-tight text-white"
                style={{
                  fontFamily: 'Montserrat, sans-serif',
                }}
              >
                {selectedSimulation.label}
              </h3>

              {simulationRun ? (
                <>
                  <div className="mt-6 grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-white/[0.07] p-4">
                      <p className="text-[8px] uppercase tracking-[0.1em] text-white/40">
                        Afluencia
                      </p>
                      <p className="mt-2 text-xl font-bold text-white">
                        {simulationResult.attendance > 0 ? '+' : ''}
                        {simulationResult.attendance}
                      </p>
                    </div>

                    <div className="rounded-xl bg-white/[0.07] p-4">
                      <p className="text-[8px] uppercase tracking-[0.1em] text-white/40">
                        Ingreso
                      </p>
                      <p className="mt-2 text-xl font-bold text-white">
                        {formatCurrency(simulationResult.revenue)}
                      </p>
                    </div>

                    <div className="rounded-xl bg-white/[0.07] p-4">
                      <p className="text-[8px] uppercase tracking-[0.1em] text-white/40">
                        Probabilidad
                      </p>
                      <p className="mt-2 text-xl font-bold text-white">
                        {simulationResult.probability}%
                      </p>
                    </div>

                    <div className="rounded-xl bg-white/[0.07] p-4">
                      <p className="text-[8px] uppercase tracking-[0.1em] text-white/40">
                        Riesgo
                      </p>
                      <p className="mt-2 text-xl font-bold text-white">
                        {simulationResult.risk}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.05] p-4">
                    <p className="text-[9px] uppercase tracking-[0.1em] text-[#d8b578]">
                      Recomendación ALQIA
                    </p>
                    <p className="mt-2 text-xs leading-6 text-white/64">
                      {simulationResult.recommendation}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      showToast(
                        `Escenario "${selectedSimulation.label}" enviado como acción simulada.`,
                      )
                    }
                    className="mt-5 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-white px-4 text-xs font-semibold text-[#202933]"
                  >
                    Convertir en acción
                    <ArrowRight size={14} />
                  </button>
                </>
              ) : (
                <div className="mt-6 rounded-[1rem] border border-dashed border-white/14 bg-white/[0.035] px-5 py-10 text-center">
                  <Radar
                    size={24}
                    className="mx-auto text-white/30"
                  />
                  <p className="mt-4 text-xs leading-5 text-white/48">
                    Ejecuta la simulación para ver afluencia, ingreso,
                    probabilidad y riesgo.
                  </p>
                </div>
              )}
            </aside>
          </div>
        </ExpandablePanel>

        <ExpandablePanel
          title="Centro de acciones"
          subtitle="Recomendaciones convertidas en tareas con impacto, responsable y resultado."
          icon={ClipboardCheck}
          open={panels.actions}
          onToggle={() => togglePanel('actions')}
        >
          <div className="space-y-3">
            {actionItems.map((action) => (
              <article
                key={action.id}
                className="grid gap-4 rounded-[1rem] border border-[var(--color-line)] bg-[var(--color-panel-strong)] p-4 xl:grid-cols-[minmax(220px,1.25fr)_130px_120px_140px_130px] xl:items-center"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-semibold text-[var(--color-ink)]">
                      {action.title}
                    </p>

                    <span
                      className={`rounded-full px-3 py-1 text-[8px] font-semibold ${priorityStyles(
                        action.priority,
                      )}`}
                    >
                      {action.priority}
                    </span>
                  </div>

                  <p className="mt-1 text-[10px] text-[var(--color-muted)]">
                    Responsable: {action.owner}
                  </p>
                </div>

                <div>
                  <p className="text-[8px] uppercase tracking-[0.1em] text-[var(--color-muted)]">
                    Fecha sugerida
                  </p>
                  <p className="mt-1 text-xs font-semibold text-[var(--color-ink)]">
                    {action.due}
                  </p>
                </div>

                <div>
                  <p className="text-[8px] uppercase tracking-[0.1em] text-[var(--color-muted)]">
                    Impacto
                  </p>
                  <p className="mt-1 text-xs font-bold text-[var(--color-burgundy)]">
                    {formatCurrency(action.impact)}
                  </p>
                </div>

                <span
                  className={`w-fit rounded-full px-3 py-1.5 text-[9px] font-semibold ${actionStatusStyles(
                    action.status,
                  )}`}
                >
                  {action.status}
                </span>

                <button
                  type="button"
                  onClick={() => cycleActionStatus(action.id)}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[var(--color-line)] bg-white px-3 text-[10px] font-semibold text-[var(--color-burgundy)]"
                >
                  Actualizar
                  <ArrowRight size={13} />
                </button>
              </article>
            ))}
          </div>
        </ExpandablePanel>

        <ExpandablePanel
          title="Memoria de decisiones"
          subtitle="Qué recomendó ALQIA, qué se hizo y cuál fue el resultado."
          icon={History}
          open={panels.memory}
          onToggle={() => togglePanel('memory')}
        >
          <div className="grid gap-4 xl:grid-cols-3">
            {decisionMemory.map((decision) => (
              <article
                key={`${decision.date}-${decision.recommendation}`}
                className="rounded-[1.1rem] border border-[var(--color-line)] bg-[var(--color-panel-strong)] p-5"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
                    {decision.date}
                  </span>

                  <span className="rounded-full bg-white px-3 py-1.5 text-[9px] font-bold text-[var(--color-burgundy)] shadow-sm">
                    {decision.accuracy}% precisión
                  </span>
                </div>

                <p className="mt-5 text-[9px] uppercase tracking-[0.1em] text-[var(--color-gold)]">
                  Recomendación
                </p>
                <p className="mt-2 text-sm font-semibold leading-5 text-[var(--color-ink)]">
                  {decision.recommendation}
                </p>

                <p className="mt-5 text-[9px] uppercase tracking-[0.1em] text-[var(--color-muted)]">
                  Acción tomada
                </p>
                <p className="mt-2 text-[11px] leading-5 text-[var(--color-muted-strong)]">
                  {decision.action}
                </p>

                <div className="mt-5 rounded-xl bg-white p-4">
                  <p className="text-[9px] uppercase tracking-[0.1em] text-[var(--color-muted)]">
                    Resultado
                  </p>
                  <p className="mt-2 text-xs font-semibold leading-5 text-[var(--color-ink)]">
                    {decision.result}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </ExpandablePanel>
      </div>

      <section className="rounded-[1.2rem] border border-[var(--color-line)] bg-[var(--color-panel)] p-5 shadow-[var(--shadow-card)]">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--color-soft)] text-[var(--color-burgundy)]">
              <BrainCircuit size={19} />
            </span>

            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--color-ink)]">
                Hoy ALQIA cuida el canal digital
              </p>

              <p className="mt-2 max-w-4xl text-xs leading-6 text-[var(--color-muted)]">
                Cruza app, reservaciones, disponibilidad, eventos,
                experiencias, clientes, promociones, campañas y pagos. Puede
                evolucionar para integrar restaurante, inventario, logística,
                personal, costos y operación completa de Hacienda de Letras.
              </p>
            </div>
          </div>

          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[var(--color-line)] bg-[var(--color-panel-strong)] px-4 py-2 text-[10px] font-semibold text-[var(--color-burgundy)]">
            <Sparkles size={13} />
            Guardián del negocio
          </span>
        </div>
      </section>

      {toast ? (
        <div className="fixed bottom-6 right-6 z-[150] flex max-w-md items-start gap-3 rounded-[1rem] border border-[#cfddca] bg-white p-4 shadow-[0_22px_50px_rgba(45,22,14,0.18)]">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#e7efe6] text-[#5f7d63]">
            <Check size={16} />
          </span>

          <div>
            <p className="text-sm font-semibold text-[var(--color-ink)]">
              Acción registrada
            </p>

            <p className="mt-1 text-[11px] leading-5 text-[var(--color-muted)]">
              {toast}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setToast('')}
            className="ml-auto text-[var(--color-muted)]"
          >
            <X size={15} />
          </button>
        </div>
      ) : null}
    </div>
  )
}
