import { useAppPreferences } from '../../context/AppPreferencesContext'
import { statusLabel } from '../../pages/control/controlCopy'

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
  'Por preparar': 'Preparing',
  Preparando: 'Preparing',
  'Lista para salida': 'Ready to ship',
  'Guía pendiente': 'Tracking pending',
  'Guía asignada': 'Tracking assigned',
  Enviado: 'Shipped',
  Enviada: 'Shipped',
  Entregado: 'Delivered',
  Entregada: 'Delivered',
  'En tránsito': 'In transit',
  'No requiere envío': 'Shipping not required',
  Pagada: 'Paid',
  'En proceso': 'In progress',
  Reembolsada: 'Refunded',
  Reembolsado: 'Refunded',
  Completado: 'Completed',
}

const positiveLabels = new Set(['Confirmada', 'Publicado', 'Activa', 'Stock medio', 'Pagada', 'Pago confirmado', 'Completado', 'Entregado', 'Entregada', 'No requiere envío'])
const warningLabels = new Set(['Pendiente', 'Por preparar', 'Preparando', 'Lista para salida', 'Guía pendiente', 'Guía asignada', 'Enviado', 'Enviada', 'En tránsito', 'Borrador', 'Limitada', 'Stock bajo', 'Programada', 'Pendiente de pago', 'En proceso'])

export function StatusBadge({ label }: StatusBadgeProps) {
  const { isEnglish } = useAppPreferences()
  const legacyBrandToken = String.fromCharCode(65, 76, 81, 73, 65)
  const legacyInternalReviewLabel = ['En revisión', legacyBrandToken].join(' ')
  const mappedLabel = statusLabel(label)
  const labelLooksDisplayReady = /^[A-ZÁÉÍÓÚÑ]/.test(label) || /[\sáéíóúñ]/i.test(label)
  const isUnrecognized = mappedLabel === 'Estado no identificado' || mappedLabel === 'Unrecognized status'
  const sanitizedLabel = label === legacyInternalReviewLabel
    ? 'En revisión interna'
    : isUnrecognized && labelLooksDisplayReady
      ? label
      : mappedLabel

  const tone = positiveLabels.has(sanitizedLabel)
    ? 'border-[rgba(37,47,55,0.24)] bg-[rgba(37,47,55,0.08)] text-[var(--color-positive)]'
    : warningLabels.has(sanitizedLabel)
      ? 'border-[rgba(180,138,85,0.3)] bg-[rgba(180,138,85,0.12)] text-[var(--color-gold)]'
      : 'border-[rgba(157,71,63,0.28)] bg-[rgba(157,71,63,0.08)] text-[var(--color-alert)]'

  const displayLabel = isEnglish ? (ES_TO_EN[sanitizedLabel] ?? sanitizedLabel) : sanitizedLabel

  return (
    <span className={`control-status-badge inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${tone}`}>
      {displayLabel}
    </span>
  )
}
