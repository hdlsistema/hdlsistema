export type Wine = {
  id: string
  name: string
  type: string
  vintage: number
  price: number
}

export const wines: Wine[] = [
  {
    id: 'gran-reserva',
    name: 'Gran Reserva',
    type: 'Tinto',
    vintage: 2021,
    price: 890,
  },
  {
    id: 'rosado-jardin',
    name: 'Rosado Jardin',
    type: 'Rosado',
    vintage: 2024,
    price: 540,
  },
]
