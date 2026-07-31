import { events } from '../../data/events'
import { Card } from '../../components/ui/Card'
import { SectionTitle } from '../../components/ui/SectionTitle'

export function EventsAdmin() {
  return (
    <div className="space-y-6">
      <SectionTitle title="Administración de Eventos" subtitle="Placeholder para publicar, editar y calendarizar." />
      <div className="grid gap-4 md:grid-cols-2">
        {events.map((event) => (
          <Card key={event.id} title={event.title} subtitle={`${event.date} · ${event.status}`} />
        ))}
      </div>
    </div>
  )
}
