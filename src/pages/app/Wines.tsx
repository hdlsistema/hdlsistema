import { Link } from 'react-router-dom'
import { wines } from '../../data/wines'
import { Badge } from '../../components/ui/Badge'
import { Card } from '../../components/ui/Card'
import { SectionTitle } from '../../components/ui/SectionTitle'

export function Wines() {
  return (
    <div className="space-y-6">
      <SectionTitle title="Vinos" subtitle="Listado base para pegar el diseño del catálogo." />
      <div className="grid gap-4 md:grid-cols-2">
        {wines.map((wine) => (
          <Card key={wine.id} title={wine.name} subtitle={`${wine.type} · ${wine.vintage}`}>
            <div className="flex items-center justify-between">
              <Badge label={`$${wine.price} MXN`} />
              <Link
                to={`/app/wines/${wine.id}`}
                className="inline-flex items-center rounded-xl border border-stone-300 px-4 py-2 text-sm font-medium text-stone-900 transition hover:bg-stone-50"
              >
                Ver detalle
              </Link>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
