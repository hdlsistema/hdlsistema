import { CalendarDays, Grape, MapPinned, Menu, ShoppingBag, Sparkles, Ticket, UserRound, Wine, X } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAppPreferences } from '../../context/AppPreferencesContext'
import { LanguageSelector } from '../shared/LanguageSelector'
import { useCartCount } from '../../hooks/useCartCount'

export function AppHeader() {
  const { t } = useAppPreferences()
  const [open, setOpen] = useState(false)
  const cartCount = useCartCount()

  const menuItems = [
    { to: '/app/home', label: t('app.nav.home'), icon: Sparkles },
    { to: '/app/vinos', label: t('app.nav.store'), icon: ShoppingBag },
    { to: '/app/experiencias', label: t('app.nav.experiences'), icon: Wine },
    { to: '/app/eventos', label: t('app.nav.events'), icon: Ticket },
    { to: '/app/club', label: t('app.nav.club'), icon: Grape },
    { to: '/app/sommelier', label: t('app.nav.sommelier'), icon: Sparkles },
    { to: '/app/mapa', label: t('app.nav.map'), icon: MapPinned },
    { to: '/app/reservacion', label: t('app.nav.reservations'), icon: CalendarDays },
    { to: '/app/perfil', label: t('app.nav.profile'), icon: UserRound },
  ]

  return (
    <header className="relative z-50 px-4 pt-[var(--safe-top)] sm:px-5">
      <div className="flex min-h-[68px] items-center justify-between gap-3 rounded-[1.2rem] bg-[rgba(255,250,242,0.88)] px-3 shadow-[inset_0_0_0_1px_rgba(170,125,67,0.16),var(--shadow-soft)] backdrop-blur-xl">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-label={open ? t('app.premium.closeMenu') : t('app.premium.openMenu')}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full text-[var(--color-burgundy)]"
        >
          {open ? <X size={22} strokeWidth={1.9} /> : <Menu size={22} strokeWidth={1.9} />}
        </button>
        <Link to="/app/home" className="flex min-w-0 flex-1 items-center justify-center">
          <img
            src="/Logo-HDL-2.svg"
            alt="Hacienda de Letras"
            className="h-[48px] w-auto max-w-[160px] object-contain"
          />
        </Link>
        <div className="flex items-center justify-end gap-2">
          <LanguageSelector compact />
          <Link to="/app/carrito" className="relative inline-flex h-11 w-11 items-center justify-center rounded-full bg-[var(--color-burgundy)] text-white">
            <ShoppingBag size={22} strokeWidth={1.8} />
            {cartCount > 0 ? (
              <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-[var(--color-gold)] px-1 text-[10px] font-bold">
                {cartCount > 99 ? '99+' : cartCount}
              </span>
            ) : null}
          </Link>
        </div>
      </div>
      {open ? (
        <div className="absolute inset-x-4 top-full z-50 mt-2 rounded-[1.2rem] bg-[rgba(255,250,242,0.98)] p-3 shadow-[var(--shadow-float)] backdrop-blur-xl sm:inset-x-5">
          <div className="grid gap-2">
            {menuItems.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                onClick={() => setOpen(false)}
                className="flex min-h-11 items-center gap-3 rounded-[0.95rem] px-3 text-[13px] font-semibold text-[var(--color-ink)] hover:bg-[var(--color-soft)]"
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
