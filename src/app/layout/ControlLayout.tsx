import {
  Activity,
  CalendarDays,
  Cog,
  Gift,
  LayoutDashboard,
  Megaphone,
  Package,
  PackageSearch,
  QrCode,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Users,
  Wine,
  WineOff,
} from 'lucide-react'
import { Outlet } from 'react-router-dom'
import { ControlSidebar } from '../components/control/ControlSidebar'
import { ControlTopbar } from '../components/control/ControlTopbar'
import { useAppPreferences } from '../context/AppPreferencesContext'

export function ControlLayout() {
  const { t } = useAppPreferences()

  const sidebarGroups = [
    {
      label: t('control.groupMain'),
      items: [
        {
          to: '/control/dashboard',
          label: t('control.dashboard'),
          icon: LayoutDashboard,
        },
        {
          to: '/control/reservaciones',
          label: t('control.reservations'),
          icon: CalendarDays,
        },
        {
          to: '/control/vinos',
          label: t('control.wines'),
          icon: Wine,
        },
        {
          to: '/control/experiencias',
          label: t('control.experiences'),
          icon: Sparkles,
        },
        {
          to: '/control/eventos',
          label: t('control.events'),
          icon: CalendarDays,
        },
        {
          to: '/control/clientes',
          label: t('control.customers'),
          icon: Users,
        },
        {
          to: '/control/actividad',
          label: 'Actividad App',
          icon: Activity,
        },
        {
          to: '/control/carritos',
          label: 'Carritos',
          icon: ShoppingCart,
        },
        {
          to: '/control/promociones',
          label: t('control.promotions'),
          icon: Gift,
        },
        {
          to: '/control/membresias',
          label: t('control.memberships'),
          icon: PackageSearch,
        },
        {
          to: '/control/wine-club',
          label: 'Wine Club',
          icon: Sparkles,
        },
        {
          to: '/control/campanas',
          label: t('control.campaigns'),
          icon: Megaphone,
        },
        {
          to: '/control/disponibilidad',
          label: t('control.availability'),
          icon: Package,
        },
        {
          to: '/control/ordenes',
          label: t('control.orders'),
          icon: ShoppingBag,
        },
        {
          to: '/control/pagos',
          label: t('control.payments'),
          icon: PackageSearch,
        },
        {
          to: '/control/check-in',
          label: 'Check-in',
          icon: QrCode,
        },
        {
          to: '/control/app',
          label: t('control.appView'),
          icon: WineOff,
        },
      ],
    },
    {
      label: t('control.groupAdditional'),
      items: [
        {
          to: '/control/configuracion',
          label: t('control.settings'),
          icon: Cog,
        },
      ],
    },
  ]

  return (
    <div className="min-h-screen bg-[var(--color-page)] text-[var(--color-ink)]">
      <ControlTopbar />
      <div className="mx-auto grid max-w-[1560px] gap-6 px-4 py-6 md:grid-cols-[270px_minmax(0,1fr)] xl:px-8">
        <ControlSidebar groups={sidebarGroups} />
        <main className="min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
