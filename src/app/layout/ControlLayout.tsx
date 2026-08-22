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
  Tickets,
  Users,
  UserCog,
  Truck,
  Wine,
  WalletCards,
  UserRoundX,
  ChevronLeft,
  ChevronRight,
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
  const { mustChangePassword, hasPermission } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(() => (
    typeof window === 'undefined' ? true : window.matchMedia('(min-width: 1024px)').matches
  ))

  useEffect(() => {
    const controlFavicon = '/favicon-control-center.png?v=20260818'
    const iconLinks = Array.from(
      document.querySelectorAll<HTMLLinkElement>('link[rel="icon"], link[rel="apple-touch-icon"]'),
    )
    const previousHrefs = iconLinks.map((link) => ({
      link,
      href: link.getAttribute('href'),
    }))

    iconLinks.forEach((link) => link.setAttribute('href', controlFavicon))

    return () => {
      previousHrefs.forEach(({ link, href }) => {
        if (href === null) link.removeAttribute('href')
        else link.setAttribute('href', href)
      })
    }
  }, [])

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
          permission: 'dashboard.view',
        },
        {
          to: '/control/reservaciones',
          label: t('control.reservations'),
          icon: CalendarDays,
          permission: 'reservations.view',
        },
        {
          to: '/control/cotizaciones',
          label: isEnglish ? 'Quotes' : 'Cotizaciones',
          icon: FileText,
          permission: 'quotes.view',
        },
        {
          to: '/control/ordenes',
          label: t('control.orders'),
          icon: ShoppingBag,
          permission: 'orders.view',
        },
        {
          to: '/control/disponibilidad',
          label: t('control.availability'),
          icon: CalendarRange,
          permission: 'availability.view',
        },
        {
          to: '/control/inventario',
          label: isEnglish ? 'Inventory' : 'Inventario',
          icon: Boxes,
          permission: 'inventory.view',
        },
        {
          to: '/control/logistica',
          label: isEnglish ? 'Logistics' : 'Logística',
          icon: Truck,
          permission: 'logistics.view',
        },
        {
          to: '/control/entradas',
          label: isEnglish ? 'Entry control' : 'Control de entradas',
          icon: QrCode,
          permission: 'entries.view',
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
          permission: 'customers.view',
        },
        {
          to: '/control/pagos',
          label: t('control.payments'),
          icon: WalletCards,
          permission: 'payments.view',
        },
        {
          to: '/control/carritos',
          label: isEnglish ? 'Carts' : 'Carritos',
          icon: ShoppingCart,
          permission: 'carts.view',
        },
        {
          to: '/control/wine-club',
          label: 'Wine Club',
          icon: BadgeCheck,
          permission: 'wineclub.view',
        },
        {
          to: '/control/distribuidores',
          label: isEnglish ? 'Distributors' : 'Distribuidores',
          icon: Building2,
          permission: 'distributors.view',
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
          permission: 'content.wines.manage',
        },
        {
          to: '/control/experiencias',
          label: t('control.experiences'),
          icon: Tickets,
          permission: 'content.experiences.manage',
        },
        {
          to: '/control/eventos-magnos',
          label: t('control.events'),
          icon: CalendarDays,
          permission: 'content.events.manage',
        },
        {
          to: '/control/servicios',
          label: isEnglish ? 'Services and venues' : 'Servicios y sedes',
          icon: MapPinned,
          permission: 'content.services.manage',
        },
        {
          to: '/control/promociones',
          label: t('control.promotions'),
          icon: Gift,
          permission: 'content.promotions.manage',
        },
        {
          to: '/control/membresias',
          label: t('control.memberships'),
          icon: IdCard,
          permission: 'content.memberships.manage',
        },
        {
          to: '/control/campanas',
          label: t('control.campaigns'),
          icon: Megaphone,
          permission: 'content.campaigns.manage',
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
          permission: 'reports.view',
        },
        {
          to: '/control/actividad',
          label: isEnglish ? 'App activity' : 'Actividad App',
          icon: Activity,
          permission: 'activity.view',
        },
        {
          to: '/control/eliminacion-cuentas',
          label: isEnglish ? 'Account deletion' : 'Eliminación de cuentas',
          icon: UserRoundX,
          permission: 'privacy.manage',
        },
        {
          to: '/control/usuarios-permisos',
          label: isEnglish ? 'Users and permissions' : 'Usuarios y permisos',
          icon: UserCog,
          permission: 'users.manage',
        },
        {
          to: '/control/configuracion',
          label: t('control.settings'),
          icon: Cog,
          permission: 'settings.manage',
        },
      ],
    },
  ]

  const visibleSidebarGroups = sidebarGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !item.permission || hasPermission(item.permission)),
    }))
    .filter((group) => group.items.length > 0)

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
          {sidebarOpen ? <ChevronLeft size={15} strokeWidth={2} /> : <ChevronRight size={15} strokeWidth={2} />}
        </button>
        <ControlSidebar groups={visibleSidebarGroups} onNavigate={closeSidebarOnCompactView} />
        <main className="control-main min-w-0">
          <Outlet />
        </main>
      </div>
      {mustChangePassword ? <InitialPasswordChangeModal /> : null}
    </div>
  )
}
