import { Card } from '../../components/ui/Card'
import { SectionTitle } from '../../components/ui/SectionTitle'

export function Profile() {
  return (
    <div className="space-y-6">
      <SectionTitle title="Perfil" subtitle="Pantalla base para cuenta, beneficios y preferencias." />
      <Card title="Perfil del cliente" subtitle="Placeholder listo para personalización visual." />
    </div>
  )
}
