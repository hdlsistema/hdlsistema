export type Reservation = {
  id: string
  guest: string
  plan: string
  date: string
  bookedAt: string
  people: number
  amount: string
  source: string
  travelOrigin: string
  paymentMethod: string
  paymentReference: string
  appPayment: boolean
  phone: string
  email: string
  status: 'Confirmada' | 'Pendiente' | 'Cancelada' | 'Completada'
}

export const reservations: Reservation[] = [
  {
    id: 'r1',
    guest: 'Sofia Herrera',
    plan: 'Catas de vino',
    date: '03 Jul 2026',
    bookedAt: '28 Jun 2026 · 11:32',
    people: 4,
    amount: '$5,000',
    source: 'App',
    travelOrigin: 'CDMX',
    paymentMethod: 'Tarjeta Visa terminacion 1845',
    paymentReference: 'APP-HDL-500381',
    appPayment: true,
    phone: '+52 55 2184 9981',
    email: 'sofia.herrera@correo.mx',
    status: 'Confirmada',
  },
  {
    id: 'r2',
    guest: 'Diego Ramos',
    plan: 'Recorrido por vinedos',
    date: '04 Jul 2026',
    bookedAt: '29 Jun 2026 · 18:14',
    people: 2,
    amount: '$1,960',
    source: 'Concierge',
    travelOrigin: 'Monterrey',
    paymentMethod: 'Transferencia SPEI',
    paymentReference: 'SP-88419375',
    appPayment: false,
    phone: '+52 81 3345 7751',
    email: 'diego.ramos@correo.mx',
    status: 'Pendiente',
  },
  {
    id: 'r3',
    guest: 'Lucia Mercado',
    plan: 'Cena romantica',
    date: '05 Jul 2026',
    bookedAt: '27 Jun 2026 · 09:08',
    people: 2,
    amount: '$5,600',
    source: 'WhatsApp',
    travelOrigin: 'Guadalajara',
    paymentMethod: 'Tarjeta Mastercard',
    paymentReference: 'WA-93217411',
    appPayment: false,
    phone: '+52 33 4410 2088',
    email: 'lucia.mercado@correo.mx',
    status: 'Completada',
  },
  {
    id: 'r4',
    guest: 'Andres Murillo',
    plan: 'Picnic entre vinedos',
    date: '06 Jul 2026',
    bookedAt: '26 Jun 2026 · 16:55',
    people: 5,
    amount: '$7,400',
    source: 'Instagram',
    travelOrigin: 'Leon',
    paymentMethod: 'Tarjeta AMEX',
    paymentReference: 'IG-55120918',
    appPayment: false,
    phone: '+52 47 7120 5581',
    email: 'andres.murillo@correo.mx',
    status: 'Cancelada',
  },
  {
    id: 'r5',
    guest: 'Patricia Solis',
    plan: 'Evento privado',
    date: '10 Jul 2026',
    bookedAt: '25 Jun 2026 · 13:20',
    people: 18,
    amount: '$28,000',
    source: 'Ventas',
    travelOrigin: 'Aguascalientes',
    paymentMethod: 'Factura corporativa',
    paymentReference: 'CORP-220761',
    appPayment: false,
    phone: '+52 44 9332 7810',
    email: 'patricia.solis@empresa.mx',
    status: 'Confirmada',
  },
]
