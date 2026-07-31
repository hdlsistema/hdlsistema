import { events } from '../../data/events'
import { Badge } from '../../components/ui/Badge'
import { Card } from '../../components/ui/Card'
import { SectionTitle } from '../../components/ui/SectionTitle'

export function Events() {
  return (
    <div className="space-y-6">
      <SectionTitle title="Eventos" subtitle="Vista inicial para agenda y venta de eventos." />
      <div className="grid gap-4 md:grid-cols-2">
        {events.map((event) => (
          <Card key={event.id} title={event.title} subtitle={event.date}>
            <Badge label={event.status} />
          </Card>
        ))}
      </div>
    </div>
  )
}
