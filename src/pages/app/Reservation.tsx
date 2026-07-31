import { reservations } from '../../data/reservations'
import { Card } from '../../components/ui/Card'
import { SectionTitle } from '../../components/ui/SectionTitle'

export function Reservation() {
  return (
    <div className="space-y-6">
      <SectionTitle title="Reservación" subtitle="Pantalla vacía para flujo de reserva sin backend." />
      <div className="grid gap-4 md:grid-cols-2">
        {reservations.map((reservation) => (
          <Card
            key={reservation.id}
            title={reservation.guest}
            subtitle={`${reservation.experience} · ${reservation.date}`}
          />
        ))}
      </div>
    </div>
  )
}
