import {
  Bolt,
  CalendarDays,
  ChartColumn,
  Cog,
  Gift,
  LayoutDashboard,
  Megaphone,
  Package,
  PackageSearch,
  ShoppingBag,
  Sparkles,
  Users,
  Warehouse,
  Wine,
  WineOff,
} from 'lucide-react'
import { Outlet, useLocation } from 'react-router-dom'
import { ControlSidebar } from '../components/control/ControlSidebar'
import { ControlTopbar } from '../components/control/ControlTopbar'
import { useAppPreferences } from '../context/AppPreferencesContext'

export function ControlLayout() {
  const location = useLocation()
  const isAppRoute = location.pathname.startsWith('/control/app')
  const { isEnglish } = useAppPreferences()

  const sidebarGroups = [
    {
      label: isEnglish ? 'App control center' : 'Centro de control app',
      items: [
        {
          to: '/control/dashboard',
          label: 'Dashboard',
          icon: LayoutDashboard,
        },
        {
          to: '/control/reservaciones',
          label: isEnglish ? 'Reservations' : 'Reservaciones',
          icon: CalendarDays,
        },
        {
          to: '/control/experiencias',
          label: isEnglish ? 'Experiences' : 'Experiencias',
          icon: Wine,
        },
        {
          to: '/control/eventos',
          label: isEnglish ? 'Events' : 'Eventos',
          icon: Sparkles,
        },
        {
          to: '/control/clientes',
          label: isEnglish ? 'Customers' : 'Clientes',
          icon: Users,
        },
        {
          to: '/control/promociones',
          label: isEnglish ? 'Promotions' : 'Promociones',
          icon: Gift,
        },
        {
          to: '/control/disponibilidad',
          label: isEnglish ? 'Availability' : 'Disponibilidad',
          icon: Package,
        },
        {
          to: '/control/app',
          label: isEnglish ? 'App View' : 'Vista App',
          icon: WineOff,
        },
        {
          to: '/control/dashboard',
          label: isEnglish ? 'Sales' : 'Ventas',
          icon: ShoppingBag,
        },
        {
          to: '/control/reportes',
          label: isEnglish ? 'Reports' : 'Reportes',
          icon: Bolt,
        },
      ],
    },
    {
      label: isEnglish ? 'Additional functions' : 'Funciones adicionales',
      items: [
        {
          to: '/control/futuro/inventario',
          label: isEnglish ? 'Inventory' : 'Inventario',
          icon: Warehouse,
        },
        {
          to: '/control/futuro/logistica',
          label: isEnglish ? 'Logistics' : 'Logistica',
          icon: PackageSearch,
        },
        {
          to: '/control/futuro/campanas',
          label: isEnglish ? 'Campaigns' : 'Campañas',
          icon: Megaphone,
        },
        {
          to: '/control/futuro/intelligence',
          label: 'ALQIA Intelligence',
          icon: ChartColumn,
        },
        {
          to: '/control/configuracion',
          label: isEnglish ? 'Settings' : 'Configuracion',
          icon: Cog,
        },
      ],
    },
  ]

  return (
    <div className="min-h-screen bg-[var(--color-page)] text-[var(--color-ink)]">
      <div className={isAppRoute ? 'hidden md:block' : 'block'}>
        <ControlTopbar />
      </div>
      <div
        className={
          isAppRoute
            ? 'mx-auto md:grid md:max-w-[1500px] md:grid-cols-[292px_minmax(0,1fr)] md:gap-6 md:px-6 md:py-6 xl:px-8'
            : 'mx-auto grid max-w-[1560px] gap-6 px-4 py-6 md:grid-cols-[270px_minmax(0,1fr)] xl:px-8'
        }
      >
        <div className={isAppRoute ? 'hidden md:block' : 'block'}>
          <ControlSidebar groups={sidebarGroups} />
        </div>
        <main className={`min-w-0 ${isAppRoute ? 'md:pt-0' : ''}`}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
