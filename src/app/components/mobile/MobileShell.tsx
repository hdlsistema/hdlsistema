import { Outlet } from 'react-router-dom'
import { AppHeader } from './AppHeader'
import { AppBottomNavigation } from './BottomTabs'
import { FloatingCartButton } from './PremiumMobileUi'
import { useCartCount } from '../../hooks/useCartCount'

export function MobileShell() {
  const cartCount = useCartCount()

  return (
    <div className="relative mx-auto flex h-full min-h-screen w-full max-w-[520px] flex-col overflow-x-hidden bg-[var(--color-panel-strong)] md:my-6 md:min-h-[860px] md:rounded-[2rem] md:shadow-[0_24px_70px_rgba(42,26,20,0.18)]">
      <AppHeader />
      <main className="app-scrollbar-none flex-1 space-y-5 overflow-y-auto px-4 pb-[calc(var(--safe-bottom)+6.2rem)] pt-2 sm:px-5">
        <Outlet />
      </main>
      <FloatingCartButton count={cartCount} />
      <AppBottomNavigation cartCount={cartCount} />
    </div>
  )
}
