import { useParams } from 'react-router-dom'
import { wines } from '../../data/wines'
import { Card } from '../../components/ui/Card'
import { SectionTitle } from '../../components/ui/SectionTitle'

export function WineDetail() {
  const { wineId } = useParams()
  const wine = wines.find((item) => item.id === wineId)

  return (
    <div className="space-y-6">
      <SectionTitle
        title={wine ? wine.name : 'Detalle de vino'}
        subtitle="Pantalla vacía para diseño de ficha de producto."
      />
      <Card title="Contenido base" subtitle="Espacio reservado para galería, notas y compra.">
        <p className="text-sm text-stone-500">
          {wine ? `${wine.type} ${wine.vintage} · $${wine.price} MXN` : 'Selecciona un vino desde el listado.'}
        </p>
      </Card>
    </div>
  )
}
