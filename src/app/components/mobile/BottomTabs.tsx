import { Grape, Home, ShoppingBag, UserRound, Wine } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useAppPreferences } from '../../context/AppPreferencesContext'

export function BottomTabs() {
  const { isEnglish } = useAppPreferences()

  const tabs = [
    { to: '/app/home', label: isEnglish ? 'Home' : 'Inicio', icon: Home },
    { to: '/app/tienda', label: isEnglish ? 'Store' : 'Tienda', icon: ShoppingBag },
    { to: '/app/experiencias', label: isEnglish ? 'Experiences' : 'Experiencias', icon: Wine },
    { to: '/app/club', label: 'Club', icon: Grape },
    { to: '/app/perfil', label: isEnglish ? 'Account' : 'Mi cuenta', icon: UserRound },
  ]

  return (
    <nav className="sticky bottom-0 z-30 grid grid-cols-5 border-t border-[rgba(156,124,76,0.22)] bg-[rgba(228,214,192,0.96)] pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-[0_-10px_30px_rgba(78,46,26,0.12)] backdrop-blur-xl">
      {tabs.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `flex flex-col items-center gap-1.5 px-1 py-3 text-[11px] outline-none ring-0 shadow-none transition-colors focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 focus:shadow-none focus-visible:shadow-none ${
              isActive ? 'text-[#6f1024]' : 'text-[#5d4c3e]'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <span
                className={`inline-flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
                  isActive
                    ? 'bg-[rgba(111,16,36,0.12)] text-[#6f1024]'
                    : 'bg-transparent text-[#7b1028]'
                }`}
              >
                <Icon size={18} strokeWidth={1.85} />
              </span>
              <span className={isActive ? 'font-semibold' : 'font-medium'}>
                {label}
              </span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
