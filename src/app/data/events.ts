export type EventItem = {
  id: string
  title: string
  date: string
  schedule: string
  venue: string
  image: string
  summary: string
  includes: string
  capacity: number
  sold: number
  revenue: string
  price: string
  status: 'Publicado' | 'Borrador' | 'Privado'
}

export const events: EventItem[] = [
  {
    id: '1000-copas',
    title: 'Festival 1000 Copas',
    date: '18 de julio, 2026',
    schedule: '5:00 PM - 11:00 PM',
    venue: 'Hacienda de Letras',
    image: '/Slide-1.webp',
    summary: 'Una tarde de vino, musica en vivo y vistas al atardecer dentro de la hacienda.',
    includes: 'Cata libre, musica en vivo, gastronomia y acceso a vinedos.',
    capacity: 280,
    sold: 214,
    revenue: '$421,600',
    price: 'Desde $950.00',
    status: 'Publicado',
  },
  {
    id: 'vendimia-hdl',
    title: 'Vendimia Hacienda de Letras',
    date: '01 de agosto, 2026',
    schedule: '1:00 PM - 8:30 PM',
    venue: 'Hacienda de Letras',
    image: '/Slide-1.webp',
    summary: 'Celebracion de temporada con recorrido, pisado de uva y cena premium.',
    includes: 'Recorrido, cata dirigida, cena maridaje y acceso preferente.',
    capacity: 360,
    sold: 298,
    revenue: '$738,400',
    price: 'Desde $1,200.00',
    status: 'Publicado',
  },
  {
    id: 'espuma-vino',
    title: 'Espuma y Vino',
    date: '15 de agosto, 2026',
    schedule: '6:30 PM - 10:30 PM',
    venue: 'Terraza 1854',
    image: '/Slide-1.webp',
    summary: 'Sesion nocturna con espumosos, musica lounge y maridajes ligeros.',
    includes: 'Degustacion de espumosos, canapes y DJ session.',
    capacity: 140,
    sold: 89,
    revenue: '$160,200',
    price: 'Desde $850.00',
    status: 'Borrador',
  },
  {
    id: 'cena-maridaje',
    title: 'Cena de Maridaje',
    date: '29 de agosto, 2026',
    schedule: '7:00 PM - 10:30 PM',
    venue: 'Restaurante',
    image: '/Slide-1.webp',
    summary: 'Cena de varios tiempos con etiquetas seleccionadas por el sommelier.',
    includes: 'Menu degustacion, maridaje completo y mesa reservada.',
    capacity: 64,
    sold: 52,
    revenue: '$124,800',
    price: 'Desde $1,600.00',
    status: 'Publicado',
  },
  {
    id: 'corporativo',
    title: 'Evento corporativo privado',
    date: '10 de octubre, 2026',
    schedule: 'Horario por definir',
    venue: 'Cava Subterranea',
    image: '/Slide-1.webp',
    summary: 'Experiencia privada para grupos con agenda personalizada y hospitalidad premium.',
    includes: 'Cotizacion privada, montaje especial y concierge dedicado.',
    capacity: 90,
    sold: 90,
    revenue: '$198,000',
    price: 'Cotizacion privada',
    status: 'Privado',
  },
]
