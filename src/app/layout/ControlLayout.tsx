import {
  Activity,
  CalendarDays,
  Cog,
  FileText,
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
      label: 'Operación',
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
          to: '/control/cotizaciones',
          label: 'Cotizaciones',
          icon: FileText,
        },
        {
          to: '/control/ordenes',
          label: t('control.orders'),
          icon: ShoppingBag,
        },
        {
          to: '/control/disponibilidad',
          label: t('control.availability'),
          icon: Package,
        },
        {
          to: '/control/check-in',
          label: 'Check-in',
          icon: QrCode,
        },
      ],
    },
    {
      label: 'Comercial',
      items: [
        {
          to: '/control/clientes',
          label: t('control.customers'),
          icon: Users,
        },
        {
          to: '/control/pagos',
          label: t('control.payments'),
          icon: PackageSearch,
        },
        {
          to: '/control/carritos',
          label: 'Carritos',
          icon: ShoppingCart,
        },
        {
          to: '/control/wine-club',
          label: 'Wine Club',
          icon: Sparkles,
        },
      ],
    },
    {
      label: 'Contenido',
      items: [
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
          to: '/control/campanas',
          label: t('control.campaigns'),
          icon: Megaphone,
        },
      ],
    },
    {
      label: 'Administración',
      items: [
        {
          to: '/control/actividad',
          label: 'Actividad App',
          icon: Activity,
        },
        {
          to: '/control/app',
          label: t('control.appView'),
          icon: WineOff,
        },
        {
          to: '/control/configuracion',
          label: t('control.settings'),
          icon: Cog,
        },
      ],
    },
  ]

  return (
    <div className="control-shell min-h-screen bg-[var(--color-page)] text-[var(--color-ink)]">
      <ControlTopbar />
      <div className="control-layout mx-auto grid max-w-[1600px] md:grid-cols-[var(--control-sidebar-width)_minmax(0,1fr)]">
        <ControlSidebar groups={sidebarGroups} />
        <main className="control-main min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
