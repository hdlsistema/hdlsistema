import { events } from '../../data/events'
import { reservations } from '../../data/reservations'
import { wines } from '../../data/wines'
import { Card } from '../../components/ui/Card'
import { SectionTitle } from '../../components/ui/SectionTitle'

export function Dashboard() {
  return (
    <div className="space-y-6">
      <SectionTitle title="Dashboard Operativo" subtitle="Resumen simple para la maqueta del panel." />
      <div className="grid gap-4 md:grid-cols-3">
        <Card title="Reservaciones" subtitle={`${reservations.length} registros mock`} />
        <Card title="Eventos" subtitle={`${events.length} registros mock`} />
        <Card title="Vinos" subtitle={`${wines.length} registros mock`} />
      </div>
    </div>
  )
}
