import { CalendarDays, Grape, MapPinned, Menu, ShoppingBag, Sparkles, Ticket, UserRound, Wine } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAppPreferences } from '../../context/AppPreferencesContext'
import { LanguageSelector } from '../shared/LanguageSelector'

export function AppHeader() {
  const { t } = useAppPreferences()
  const [open, setOpen] = useState(false)

  const menuItems = [
    { to: '/app/home', label: t('app.nav.home'), icon: Sparkles },
    { to: '/app/tienda', label: t('app.nav.store'), icon: ShoppingBag },
    { to: '/app/experiencias', label: t('app.nav.experiences'), icon: Wine },
    { to: '/app/eventos', label: t('app.nav.events'), icon: Ticket },
    { to: '/app/club', label: t('app.nav.club'), icon: Grape },
    { to: '/app/sommelier', label: t('app.nav.sommelier'), icon: Sparkles },
    { to: '/app/mapa', label: t('app.nav.map'), icon: MapPinned },
    { to: '/app/reservacion', label: t('app.nav.reservations'), icon: CalendarDays },
    { to: '/app/perfil', label: t('app.nav.profile'), icon: UserRound },
  ]

  return (
    <header className="relative overflow-visible px-5 pb-2 pt-1">
      <div className="mb-3 overflow-hidden rounded-[1.45rem] border border-[rgba(137,47,58,0.14)] bg-[linear-gradient(135deg,#54101f,#6e1528_52%,#8b2135)] px-4 py-3 shadow-[0_18px_36px_rgba(79,15,31,0.16)]">
        <div className="pointer-events-none absolute left-10 top-1 h-20 w-20 rounded-full bg-[rgba(255,255,255,0.05)] blur-2xl" />
        <div className="pointer-events-none absolute right-8 top-4 h-16 w-16 rounded-full border border-white/8" />
        <div className="grid grid-cols-[44px_minmax(0,1fr)_84px] items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full text-white outline-none focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0"
        >
          <Menu size={24} strokeWidth={1.9} />
        </button>
        <div className="flex justify-center">
          <img
            src="/Logo-HDL-2.svg"
            alt="Hacienda de Letras"
            className="h-[112px] w-auto max-w-[220px] object-contain brightness-[0] invert"
          />
        </div>
        <div className="flex items-center justify-end gap-2">
          <LanguageSelector variant="dark" compact />
          <Link to="/app/carrito" className="inline-flex h-11 w-11 items-center justify-center rounded-full text-white outline-none focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0">
            <ShoppingBag size={22} strokeWidth={1.8} />
          </Link>
        </div>
      </div>
      </div>
      {open ? (
        <div className="absolute inset-x-4 top-full z-20 mt-2 rounded-[1.25rem] border border-[rgba(220,202,181,0.86)] bg-white p-3 shadow-[0_18px_36px_rgba(43,29,24,0.16)]">
          <div className="grid gap-2">
            {menuItems.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-[1rem] px-3 py-3 text-[14px] text-[var(--color-ink)] hover:bg-[var(--color-soft)]"
              >
                <Icon size={18} className="text-[var(--color-burgundy)]" />
                <span>{label}</span>
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </header>
  )
}
