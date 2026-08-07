import { Outlet } from 'react-router-dom'
import { AppEdgePanel } from './AppEdgePanel'
import { AppHeader } from './AppHeader'
import { AppBottomNavigation } from './BottomTabs'
import { useCartCount } from '../../hooks/useCartCount'

export function MobileShell() {
  const cartCount = useCartCount()

  return (
    <div className="app-preview-shell relative flex min-h-[100dvh] w-full flex-col overflow-hidden bg-[#FBF7F0]">
      <AppHeader />
      <main className="app-scrollbar-none min-h-0 flex-1 overflow-y-auto pb-[calc(76px+var(--safe-bottom))]">
        <Outlet />
      </main>
      <AppBottomNavigation cartCount={cartCount} />
      <AppEdgePanel />
    </div>
  )
}
