export type Metric = {
  id: string
  label: string
  value: string
  note: string
}

export const metrics: Metric[] = [
  { id: 'ventas-mes', label: 'Ventas del mes', value: '$1,248,750', note: '18.6% vs. mes anterior' },
  { id: 'reservaciones', label: 'Reservaciones activas', value: '368', note: '14.2% vs. mes anterior' },
  { id: 'eventos', label: 'Eventos proximos', value: '14', note: '27.3% vs. mes anterior' },
  { id: 'club', label: 'Wine Club', value: '412', note: '12 nuevos este mes' },
  { id: 'inventario', label: 'Inventario critico', value: '6', note: 'Productos en alerta' },
]
