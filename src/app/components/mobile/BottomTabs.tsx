import { Home, ShoppingBag, UserRound, Wine, ShoppingCart } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useAppPreferences } from '../../context/AppPreferencesContext'

export function AppBottomNavigation({ cartCount = 0 }: { cartCount?: number }) {
  const { t } = useAppPreferences()

  const tabs = [
    { to: '/app/home', label: t('app.nav.home'), icon: Home },
    { to: '/app/vinos', label: t('app.nav.store'), icon: ShoppingBag },
    { to: '/app/experiencias', label: t('app.nav.experiences'), icon: Wine },
    { to: '/app/carrito', label: t('app.nav.cart'), icon: ShoppingCart, count: cartCount },
    { to: '/app/perfil', label: t('app.nav.profile'), icon: UserRound },
  ]

  return (
    <nav className="absolute inset-x-0 bottom-0 z-30 grid grid-cols-5 bg-[rgba(255,250,242,0.94)] px-2 pb-[var(--safe-bottom)] pt-2 shadow-[0_-12px_32px_rgba(78,46,26,0.1)] backdrop-blur-xl">
      {tabs.map(({ to, label, icon: Icon, count }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `flex min-w-0 flex-col items-center gap-1 px-1 py-2 text-[10px] font-semibold transition-colors ${
              isActive ? 'text-[var(--color-burgundy)]' : 'text-[var(--color-muted)]'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <span
                className={`relative inline-flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
                  isActive
                    ? 'bg-[rgba(84,17,36,0.12)] text-[var(--color-burgundy)]'
                    : 'bg-transparent text-[var(--color-muted-strong)]'
                }`}
              >
                <Icon size={18} strokeWidth={1.85} />
                {count && count > 0 ? (
                  <span className="absolute -right-1 -top-1 inline-flex min-h-4 min-w-4 items-center justify-center rounded-full bg-[var(--color-gold)] px-1 text-[9px] font-bold text-white">
                    {count > 99 ? '99+' : count}
                  </span>
                ) : null}
              </span>
              <span className="max-w-full truncate">
                {label}
              </span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}

export function BottomTabs() {
  return <AppBottomNavigation />
}
