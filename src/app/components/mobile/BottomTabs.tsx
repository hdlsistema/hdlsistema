import { CircleUserRound, GlassWater, House, ShoppingCart, Wine } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useAppPreferences } from '../../context/AppPreferencesContext'
import { appPath } from '../../utils/appRoutes'

export function AppBottomNavigation({ cartCount = 0 }: { cartCount?: number }) {
  const { t } = useAppPreferences()

  const tabs = [
    { to: appPath('/home'), label: t('app.nav.home'), icon: House },
    { to: appPath('/vinos'), label: t('app.nav.store'), icon: Wine },
    { to: appPath('/experiencias'), label: t('app.nav.experiences'), icon: GlassWater },
    { to: appPath('/carrito'), label: t('app.nav.cart'), icon: ShoppingCart, count: cartCount },
    { to: appPath('/perfil'), label: t('app.nav.profile'), icon: CircleUserRound },
  ]

  return (
    <nav aria-label="Navegación principal" className="app-bottom-nav z-[90] grid grid-cols-5">
      {tabs.map(({ to, label, icon: Icon, count }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) => `app-bottom-nav__item ${isActive ? 'is-active' : ''}`}
        >
          <span className="app-bottom-nav__content">
            <span className="app-bottom-nav__icon">
              <Icon size={20} strokeWidth={1.65} />
              {count && count > 0 ? (
                <span className="app-bottom-nav__count">
                  {count > 99 ? '99+' : count}
                </span>
              ) : null}
            </span>
            <span className="app-bottom-nav__label">{label}</span>
          </span>
        </NavLink>
      ))}
    </nav>
  )
}

export function BottomTabs() {
  return <AppBottomNavigation />
}
