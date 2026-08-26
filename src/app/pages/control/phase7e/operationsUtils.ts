export function formatMoney(value: number, currency = 'MXN') {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency }).format(value)
}

const MEXICO_TIME_ZONE = 'America/Mexico_City'

export function formatDate(value?: string | null) {
  if (!value) return 'Sin fecha'
  return new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short', timeZone: MEXICO_TIME_ZONE }).format(new Date(value))
}

export function operationKey(prefix: string) {
  return `${prefix}_${globalThis.crypto?.randomUUID?.() ?? Date.now()}`
}

export type ShipmentAction = 'preparing' | 'ready' | 'shipped' | 'in_transit' | 'delivered' | 'cancelled'

export function shipmentActionsFor(status?: string | null): ShipmentAction[] {
  switch (status) {
    case 'pending':
    case 'pending_preparation':
      return ['preparing', 'delivered', 'cancelled']
    case 'preparing':
      return ['ready', 'delivered', 'cancelled']
    case 'ready':
    case 'awaiting_tracking':
      return ['shipped', 'delivered', 'cancelled']
    case 'tracking_assigned':
      return ['shipped', 'in_transit', 'delivered', 'cancelled']
    case 'shipped':
      return ['in_transit', 'delivered', 'cancelled']
    case 'in_transit':
    case 'failed':
      return ['delivered', 'cancelled']
    default:
      return []
  }
}

export async function downloadCsv(response: Response, filename: string) {
  if (!response.ok) throw new Error('No fue posible exportar CSV.')
  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
