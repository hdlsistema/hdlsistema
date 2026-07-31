export type ReservationItem = {
  id: string
  guest: string
  experience: string
  date: string
}

export const reservations: ReservationItem[] = [
  {
    id: 'res-001',
    guest: 'Sofia Herrera',
    experience: 'Cata Sensorial',
    date: '2026-07-05',
  },
  {
    id: 'res-002',
    guest: 'Diego Ramos',
    experience: 'Recorrido por Bodega',
    date: '2026-07-08',
  },
]
