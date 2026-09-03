import { Outlet, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { AppHeader } from './AppHeader'
import { AppBottomNavigation } from './BottomTabs'
import { AppEdgePanel } from './AppEdgePanel'
import { MobileGuestAccessProvider } from './MobileGuestAccess'
import { useCartCount } from '../../hooks/useCartCount'
import { appActivityEventKey, trackAppActivity } from '../../../services/appActivity.service'

export function MobileShell() {
  const cartCount = useCartCount()
  const location = useLocation()
  const appPath = location.pathname.replace(/^\/app(?=\/|$)/, '') || '/'
  const isAuthRoute = ['/login', '/registro', '/recuperar', '/reset-password', '/auth/callback'].includes(appPath)
  const showAppChrome = !isAuthRoute

  useEffect(() => {
    trackAppActivity({
      eventName: 'app_session_started',
      eventKey: appActivityEventKey('app_session_started', null, 'session'),
      metadata: { route: appPath },
    })
  }, [appPath])

  return (
    <MobileGuestAccessProvider>
      <div className="app-preview-shell relative flex h-[100dvh] min-h-[100dvh] w-full touch-pan-y flex-col overflow-hidden overscroll-none">
        {showAppChrome ? <AppHeader /> : null}
        <main className={`mobile-shell-scroll app-scrollbar-none min-h-0 flex-1 touch-pan-y overflow-x-hidden overflow-y-auto overscroll-contain ${showAppChrome ? 'pb-[calc(82px+var(--safe-bottom))]' : ''}`}>
          <Outlet />
        </main>
        {showAppChrome ? <AppBottomNavigation cartCount={cartCount} /> : null}
        {showAppChrome ? <AppEdgePanel /> : null}
      </div>
    </MobileGuestAccessProvider>
  )
}
