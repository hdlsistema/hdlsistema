export type Experience = {
  id: string
  title: string
  duration: string
  category: string
  summary: string
  image: string
  price: string
  capacity: number
  reservations: number
  occupancy: number
  status: 'Activa' | 'Alta demanda' | 'Limitada'
}

export const experiences: Experience[] = [
  { id: 'catas-vino', title: 'Catas de vino', duration: '60 min', category: 'Degustacion', summary: 'Descubre nuestras etiquetas emblematicas con guia especializada.', image: '/turismo.jpeg', price: '$1,250', capacity: 28, reservations: 164, occupancy: 78, status: 'Alta demanda' },
  { id: 'recorrido-vinedos', title: 'Recorrido por vinedos', duration: '90 min', category: 'Tour', summary: 'Conoce el proceso del vino entre hileras y terrazas de la hacienda.', image: '/Hacienda-de-Letras hacienda.jpg', price: '$980', capacity: 32, reservations: 112, occupancy: 63, status: 'Activa' },
  { id: 'cenas-romanticas', title: 'Cena romantica', duration: '120 min', category: 'Gastronomia', summary: 'Una experiencia intima con menu especial y maridaje al atardecer.', image: '/boda 2.webp', price: '$2,800', capacity: 18, reservations: 38, occupancy: 82, status: 'Alta demanda' },
  { id: 'picnic-vinedos', title: 'Picnic entre vinedos', duration: '150 min', category: 'Exterior', summary: 'Disfruta una tarde relajada entre vides con seleccion de la casa.', image: '/bodas.webp', price: '$1,480', capacity: 22, reservations: 26, occupancy: 57, status: 'Activa' },
  { id: 'restaurante', title: 'Restaurante', duration: 'Libre', category: 'Hospitalidad', summary: 'Cocina de temporada con vista a la hacienda y servicio premium.', image: '/hacienda 2.jpg', price: '$640', capacity: 120, reservations: 216, occupancy: 71, status: 'Activa' },
  { id: 'evento-privado', title: 'Evento privado', duration: 'Variable', category: 'Celebracion', summary: 'Montaje exclusivo para celebraciones con hospitalidad personalizada.', image: '/turismo.jpeg', price: '$12,500', capacity: 1, reservations: 24, occupancy: 88, status: 'Limitada' },
]
