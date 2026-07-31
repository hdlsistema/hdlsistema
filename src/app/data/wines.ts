export type Wine = {
  id: string
  name: string
  kind: string
  varietal: string
  harvest: string
  price: string
  stock: string
  image: string
  status: 'Stock medio' | 'Stock bajo' | 'Critico'
}

export const wines: Wine[] = [
  {
    id: '3-mosqueteros',
    name: '3 Mosqueteros',
    kind: 'Vino Tinto',
    varietal: 'Cabernet Sauvignon',
    harvest: 'Cosecha 2021',
    price: '$300.00',
    stock: 'Stock: 132 cajas',
    image: '/Tres-Mosqueteros-Vino-Hacienda-de-Letras.svg',
    status: 'Stock medio',
  },
  {
    id: 'precioso-regalo',
    name: 'Precioso Regalo',
    kind: 'Vino Tinto',
    varietal: 'Tempranillo',
    harvest: 'Cosecha 2021',
    price: '$300.00',
    stock: 'Stock: 85 cajas',
    image: '/Precioso-Regalo-Vino-Hacienda-de-Letras.svg',
    status: 'Stock bajo',
  },
  {
    id: 'ruby-amor-eterno',
    name: 'Ruby - Amor Eterno',
    kind: 'Vino Tinto',
    varietal: 'Ensamble',
    harvest: 'Cosecha 2022',
    price: '$300.00',
    stock: 'Stock: 60 cajas',
    image: '/Ruby-Vino-Hacienda-de-Letras.svg',
    status: 'Stock bajo',
  },
  {
    id: 'el-greco',
    name: 'El Greco',
    kind: 'Vino Tinto',
    varietal: 'Syrah',
    harvest: 'Cosecha 2021',
    price: '$350.00',
    stock: 'Stock: 26 cajas',
    image: '/El-greco-Vino-Hacienda-de-Letras.svg',
    status: 'Critico',
  },
  {
    id: 'dartagnan',
    name: 'DArtagnan',
    kind: 'Vino Tinto',
    varietal: 'Malbec',
    harvest: 'Cosecha 2022',
    price: '$380.00',
    stock: 'Stock: 44 cajas',
    image: '/DArtagnan-Vino-Hacienda-de-Letras.svg',
    status: 'Stock medio',
  },
  {
    id: 'muscat',
    name: 'Muscat',
    kind: 'Vino Blanco',
    varietal: 'Muscat',
    harvest: 'Cosecha 2023',
    price: '$320.00',
    stock: 'Stock: 58 cajas',
    image: '/Muscat-Vino-Hacienda-de-Letras.svg',
    status: 'Stock medio',
  },
]
