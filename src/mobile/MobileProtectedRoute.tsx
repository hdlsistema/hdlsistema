import { useEffect, type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useMobileGuestAccess } from '../app/components/mobile/MobileGuestAccessContext'
import { MobileBrandSplash } from './MobileLaunchGate'

export function MobileProtectedRoute({ children }: { children: ReactNode }) {
  const location = useLocation()
  const { isAuthenticated, isLoading } = useAuth()
  const { requestAuth } = useMobileGuestAccess()
  const targetPath = `${location.pathname}${location.search}${location.hash}`

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      requestAuth({ from: targetPath })
    }
  }, [isAuthenticated, isLoading, requestAuth, targetPath])

  if (isLoading) {
    return <MobileBrandSplash />
  }

  if (!isAuthenticated) {
    return <Navigate to="/home" replace />
  }

  return children
}
