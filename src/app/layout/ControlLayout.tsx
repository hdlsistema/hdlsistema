import {
  Activity,
  BadgeCheck,
  BarChart3,
  Boxes,
  Building2,
  CalendarDays,
  CalendarRange,
  Cog,
  FileText,
  Gift,
  IdCard,
  LayoutDashboard,
  Megaphone,
  MapPinned,
  QrCode,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
  Tickets,
  Users,
  Truck,
  Wine,
  WalletCards,
  UserRoundX,
} from 'lucide-react'
import { Outlet } from 'react-router-dom'
import { ControlSidebar } from '../components/control/ControlSidebar'
import { ControlTopbar } from '../components/control/ControlTopbar'
import { useAppPreferences } from '../context/AppPreferencesContext'
import { useAuth } from '../../contexts/AuthContext'
import { InitialPasswordChangeModal } from '../components/control/InitialPasswordChangeModal'

export function ControlLayout() {
  const { t } = useAppPreferences()
  const { mustChangePassword } = useAuth()

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
          label: `${t('control.availability')} / Hotel`,
          icon: CalendarRange,
        },
        {
          to: '/control/inventario',
          label: 'Inventario',
          icon: Boxes,
        },
        {
          to: '/control/logistica',
          label: 'Logística',
          icon: Truck,
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
          icon: WalletCards,
        },
        {
          to: '/control/carritos',
          label: 'Carritos',
          icon: ShoppingCart,
        },
        {
          to: '/control/wine-club',
          label: 'Wine Club',
          icon: BadgeCheck,
        },
        {
          to: '/control/distribuidores',
          label: 'Distribuidores',
          icon: Building2,
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
          icon: Tickets,
        },
        {
          to: '/control/eventos',
          label: t('control.events'),
          icon: CalendarDays,
        },
        {
          to: '/control/servicios',
          label: 'Servicios y sedes',
          icon: MapPinned,
        },
        {
          to: '/control/promociones',
          label: t('control.promotions'),
          icon: Gift,
        },
        {
          to: '/control/membresias',
          label: t('control.memberships'),
          icon: IdCard,
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
          to: '/control/reportes',
          label: 'Reportes',
          icon: BarChart3,
        },
        {
          to: '/control/actividad',
          label: 'Actividad App',
          icon: Activity,
        },
        {
          to: '/control/app',
          label: t('control.appView'),
          icon: Smartphone,
        },
        {
          to: '/control/eliminacion-cuentas',
          label: 'Eliminación de cuentas',
          icon: UserRoundX,
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
      {mustChangePassword ? <InitialPasswordChangeModal /> : null}
    </div>
  )
}
