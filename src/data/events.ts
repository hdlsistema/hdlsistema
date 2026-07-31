export type EventItem = {
  id: string
  title: string
  date: string
  status: 'Draft' | 'Published'
}

export const events: EventItem[] = [
  {
    id: 'vendimia-privada',
    title: 'Vendimia Privada',
    date: '2026-08-14',
    status: 'Published',
  },
  {
    id: 'cena-maridaje',
    title: 'Cena Maridaje',
    date: '2026-09-03',
    status: 'Draft',
  },
]
