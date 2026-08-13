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
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { ControlSidebar } from '../components/control/ControlSidebar'
import { ControlTopbar } from '../components/control/ControlTopbar'
import { useAppPreferences } from '../context/AppPreferencesContext'
import { useAuth } from '../../contexts/AuthContext'
import { InitialPasswordChangeModal } from '../components/control/InitialPasswordChangeModal'

export function ControlLayout() {
  const { t, isEnglish } = useAppPreferences()
  const { mustChangePassword } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(() => (
    typeof window === 'undefined' ? true : window.matchMedia('(min-width: 1024px)').matches
  ))

  useEffect(() => {
    const closeWithEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSidebarOpen(false)
    }
    window.addEventListener('keydown', closeWithEscape)
    return () => window.removeEventListener('keydown', closeWithEscape)
  }, [])

  useEffect(() => {
    const compactViewport = window.matchMedia('(max-width: 1023px)')
    const syncViewport = (event: MediaQueryListEvent) => setSidebarOpen(!event.matches)

    compactViewport.addEventListener('change', syncViewport)
    return () => compactViewport.removeEventListener('change', syncViewport)
  }, [])

  useEffect(() => {
    if (!sidebarOpen || !window.matchMedia('(max-width: 1023px)').matches) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [sidebarOpen])

  const closeSidebarOnCompactView = () => {
    if (window.matchMedia('(max-width: 1023px)').matches) setSidebarOpen(false)
  }

  const sidebarGroups = [
    {
      label: isEnglish ? 'Operations' : 'Operación',
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
          label: isEnglish ? 'Quotes' : 'Cotizaciones',
          icon: FileText,
        },
        {
          to: '/control/ordenes',
          label: t('control.orders'),
          icon: ShoppingBag,
        },
        {
          to: '/control/disponibilidad',
          label: `${t('control.availability')} / ${isEnglish ? 'Cabins' : 'Cabañas'}`,
          icon: CalendarRange,
        },
        {
          to: '/control/inventario',
          label: isEnglish ? 'Inventory' : 'Inventario',
          icon: Boxes,
        },
        {
          to: '/control/logistica',
          label: isEnglish ? 'Logistics' : 'Logística',
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
      label: isEnglish ? 'Commercial' : 'Comercial',
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
          label: isEnglish ? 'Carts' : 'Carritos',
          icon: ShoppingCart,
        },
        {
          to: '/control/wine-club',
          label: 'Wine Club',
          icon: BadgeCheck,
        },
        {
          to: '/control/distribuidores',
          label: isEnglish ? 'Distributors' : 'Distribuidores',
          icon: Building2,
        },
      ],
    },
    {
      label: isEnglish ? 'Content' : 'Contenido',
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
          label: isEnglish ? 'Services and venues' : 'Servicios y sedes',
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
      label: isEnglish ? 'Administration' : 'Administración',
      items: [
        {
          to: '/control/reportes',
          label: isEnglish ? 'Reports' : 'Reportes',
          icon: BarChart3,
        },
        {
          to: '/control/actividad',
          label: isEnglish ? 'App activity' : 'Actividad App',
          icon: Activity,
        },
        {
          to: '/control/app',
          label: t('control.appView'),
          icon: Smartphone,
        },
        {
          to: '/control/eliminacion-cuentas',
          label: isEnglish ? 'Account deletion' : 'Eliminación de cuentas',
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
      <div className={`control-layout mx-auto max-w-[1600px] ${sidebarOpen ? 'is-sidebar-open' : 'is-sidebar-collapsed'}`}>
        {sidebarOpen ? (
          <button
            type="button"
            className="control-sidebar__backdrop"
            aria-label={isEnglish ? 'Close navigation' : 'Cerrar navegación'}
            onClick={() => setSidebarOpen(false)}
          />
        ) : null}
        <button
          type="button"
          className="control-sidebar__tab"
          onClick={() => setSidebarOpen((current) => !current)}
          aria-expanded={sidebarOpen}
          aria-controls="control-navigation"
          aria-label={sidebarOpen
            ? (isEnglish ? 'Collapse navigation' : 'Ocultar navegación')
            : (isEnglish ? 'Open navigation' : 'Abrir navegación')}
          title={sidebarOpen
            ? (isEnglish ? 'Collapse navigation' : 'Ocultar navegación')
            : (isEnglish ? 'Open navigation' : 'Abrir navegación')}
        >
          {sidebarOpen ? <PanelLeftClose size={17} /> : <PanelLeftOpen size={17} />}
        </button>
        <ControlSidebar groups={sidebarGroups} onNavigate={closeSidebarOnCompactView} />
        <main className="control-main min-w-0">
          <Outlet />
        </main>
      </div>
      {mustChangePassword ? <InitialPasswordChangeModal /> : null}
    </div>
  )
}
