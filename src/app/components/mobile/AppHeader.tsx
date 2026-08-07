import { Link } from 'react-router-dom'
import { ShoppingBag } from 'lucide-react'
import { useAppPreferences } from '../../context/AppPreferencesContext'
import { useCartCount } from '../../hooks/useCartCount'
import { appPath } from '../../utils/appRoutes'

export function AppHeader() {
  const { t } = useAppPreferences()
  const cartCount = useCartCount()

  return (
    <header className="sticky top-0 z-50 bg-[rgba(251,247,240,0.96)] px-[var(--app-pad)] pt-[var(--safe-top)] backdrop-blur-xl">
      <div className="grid min-h-[58px] grid-cols-[44px_1fr_44px] items-center gap-2">
        <span aria-hidden="true" />
        <Link to={appPath('/home')} className="flex min-w-0 flex-1 items-center justify-center">
          <img
            src="/hacienda de letras logo 2.png"
            alt="Hacienda de Letras"
            className="h-auto w-[116px] object-contain"
          />
        </Link>
        <Link
          to={appPath('/carrito')}
          className="relative inline-flex h-11 w-11 items-center justify-center justify-self-end text-[#690D2B]"
          aria-label={t('app.premium.openCart')}
        >
          <ShoppingBag size={21} strokeWidth={1.8} />
          {cartCount > 0 ? (
            <span className="absolute right-0 top-1 inline-flex min-h-4 min-w-4 items-center justify-center rounded-full bg-[#D7B67A] px-1 text-[9px] font-bold text-[#690D2B]">
              {cartCount > 99 ? '99+' : cartCount}
            </span>
          ) : null}
        </Link>
      </div>
    </header>
  )
}
