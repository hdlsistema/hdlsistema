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
  'En revisión ALQIA': 'ALQIA review',
}

const positiveLabels = new Set(['Confirmada', 'Publicado', 'Activa', 'Stock medio'])
const warningLabels = new Set(['Pendiente', 'Borrador', 'Limitada', 'Stock bajo', 'Programada'])

export function StatusBadge({ label }: StatusBadgeProps) {
  const { isEnglish } = useAppPreferences()

  const tone = positiveLabels.has(label)
    ? 'border-[rgba(61,122,77,0.25)] bg-[rgba(61,122,77,0.08)] text-[var(--color-positive)]'
    : warningLabels.has(label)
      ? 'border-[rgba(180,138,85,0.3)] bg-[rgba(180,138,85,0.12)] text-[var(--color-gold)]'
      : 'border-[rgba(157,71,63,0.28)] bg-[rgba(157,71,63,0.08)] text-[var(--color-alert)]'

  const displayLabel = isEnglish ? (ES_TO_EN[label] ?? label) : label

  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${tone}`}>
      {displayLabel}
    </span>
  )
}
