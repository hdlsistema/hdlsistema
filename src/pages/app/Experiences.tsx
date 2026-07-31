import { experiences } from '../../data/experiences'
import { Card } from '../../components/ui/Card'
import { SectionTitle } from '../../components/ui/SectionTitle'

export function Experiences() {
  return (
    <div className="space-y-6">
      <SectionTitle title="Experiencias" subtitle="Pantalla base del catálogo de experiencias." />
      <div className="grid gap-4 md:grid-cols-2">
        {experiences.map((experience) => (
          <Card key={experience.id} title={experience.name} subtitle={`Duración mock: ${experience.duration}`} />
        ))}
      </div>
    </div>
  )
}
