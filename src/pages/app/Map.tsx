import { Card } from '../../components/ui/Card'
import { SectionTitle } from '../../components/ui/SectionTitle'

export function Map() {
  return (
    <div className="space-y-6">
      <SectionTitle title="Mapa" subtitle="Espacio reservado para mapa, wayfinding y puntos de interés." />
      <Card title="Mapa de Hacienda de Letras" subtitle="Placeholder navegable, sin APIs externas." />
    </div>
  )
}
