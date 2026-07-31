import { events } from '../../data/events'
import { experiences } from '../../data/experiences'
import { wines } from '../../data/wines'
import { Card } from '../../components/ui/Card'
import { SectionTitle } from '../../components/ui/SectionTitle'

export function MobileHome() {
  return (
    <div className="space-y-6">
      <SectionTitle
        title="App Cliente"
        subtitle="Home inicial para la maqueta móvil de Hacienda de Letras."
      />
      <div className="grid gap-4 md:grid-cols-3">
        <Card title="Vinos" subtitle={`${wines.length} etiquetas mock disponibles`} />
        <Card title="Experiencias" subtitle={`${experiences.length} opciones mock activas`} />
        <Card title="Eventos" subtitle={`${events.length} eventos mock cargados`} />
      </div>
    </div>
  )
}
