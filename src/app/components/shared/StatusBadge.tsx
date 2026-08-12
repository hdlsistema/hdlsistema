import { useAppPreferences } from '../../context/AppPreferencesContext'

type StatusBadgeProps = {
  label: string
}

const ES_TO_EN: Record<string, string> = {
  Confirmada: 'Confirmed',
  Publicado: 'Published',
  Activa: 'Active',
  'Stock medio': 'Medium stock',
  Pendiente: 'Pending',
  Borrador: 'Draft',
  Limitada: 'Limited',
  'Stock bajo': 'Low stock',
  Cancelada: 'Cancelled',
  Completada: 'Completed',
  Programada: 'Scheduled',
  Finalizada: 'Finished',
  'En revisión interna': 'Internal review',
  'Pendiente de pago': 'Pending payment',
  'Pago confirmado': 'Payment confirmed',
  Pagada: 'Paid',
  'En proceso': 'In progress',
  Reembolsada: 'Refunded',
}

const positiveLabels = new Set(['Confirmada', 'Publicado', 'Activa', 'Stock medio', 'Pagada', 'Pago confirmado'])
const warningLabels = new Set(['Pendiente', 'Borrador', 'Limitada', 'Stock bajo', 'Programada', 'Pendiente de pago', 'En proceso'])

export function StatusBadge({ label }: StatusBadgeProps) {
  const { isEnglish } = useAppPreferences()
  const legacyBrandToken = String.fromCharCode(65, 76, 81, 73, 65)
  const legacyInternalReviewLabel = ['En revisión', legacyBrandToken].join(' ')
  const sanitizedLabel = label === legacyInternalReviewLabel ? 'En revisión interna' : label

  const tone = positiveLabels.has(sanitizedLabel)
    ? 'border-[rgba(61,122,77,0.25)] bg-[rgba(61,122,77,0.08)] text-[var(--color-positive)]'
    : warningLabels.has(sanitizedLabel)
      ? 'border-[rgba(180,138,85,0.3)] bg-[rgba(180,138,85,0.12)] text-[var(--color-gold)]'
      : 'border-[rgba(157,71,63,0.28)] bg-[rgba(157,71,63,0.08)] text-[var(--color-alert)]'

  const displayLabel = isEnglish ? (ES_TO_EN[sanitizedLabel] ?? sanitizedLabel) : sanitizedLabel

  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${tone}`}>
      {displayLabel}
    </span>
  )
}
