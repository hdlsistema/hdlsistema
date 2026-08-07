import { Home, ShoppingBag, UserRound, Wine, ShoppingCart } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useAppPreferences } from '../../context/AppPreferencesContext'
import { appPath } from '../../utils/appRoutes'

export function AppBottomNavigation({ cartCount = 0 }: { cartCount?: number }) {
  const { t } = useAppPreferences()

  const tabs = [
    { to: appPath('/home'), label: t('app.nav.home'), icon: Home },
    { to: appPath('/vinos'), label: t('app.nav.store'), icon: ShoppingBag },
    { to: appPath('/experiencias'), label: t('app.nav.experiences'), icon: Wine },
    { to: appPath('/carrito'), label: t('app.nav.cart'), icon: ShoppingCart, count: cartCount },
    { to: appPath('/perfil'), label: t('app.nav.profile'), icon: UserRound },
  ]

  return (
    <nav className="app-bottom-nav z-40 grid h-[calc(76px+var(--safe-bottom))] grid-cols-5 bg-[#690D2B] px-2 pb-[var(--safe-bottom)] pt-2 shadow-[0_-12px_26px_rgba(65,8,27,0.18)]">
      {tabs.map(({ to, label, icon: Icon, count }) => (
        <NavLink
          key={to}
          to={to}
          className="flex min-w-0 flex-col items-center justify-center gap-1 px-0.5 text-[12px] font-extrabold leading-none transition-colors"
        >
          {({ isActive }) => (
            <span className="flex min-w-0 flex-col items-center justify-center gap-1" style={{ color: isActive ? '#D7B67A' : '#FFF9F1' }}>
              <span
                className="relative inline-flex h-8 w-8 items-center justify-center"
              >
                <Icon size={22} strokeWidth={2} style={{ color: isActive ? '#D7B67A' : '#FFF9F1' }} />
                {count && count > 0 ? (
                  <span className="absolute -right-1 top-0 inline-flex min-h-4 min-w-4 items-center justify-center rounded-full bg-[#D7B67A] px-1 text-[9px] font-bold text-[#690D2B]">
                    {count > 99 ? '99+' : count}
                  </span>
                ) : null}
              </span>
              <span className="max-w-full whitespace-nowrap text-center text-[12px]" style={{ color: isActive ? '#D7B67A' : '#FFF9F1', textShadow: '0 1px 1px rgba(25, 5, 12, .32)' }}>
                {label}
              </span>
            </span>
          )}
        </NavLink>
      ))}
    </nav>
  )
}

export function BottomTabs() {
  return <AppBottomNavigation />
}
