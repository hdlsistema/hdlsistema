import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import type { ReactNode } from 'react'

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const location = useLocation()
  const { isAuthenticated, isLoading } = useAuth()
  const loginPath = location.pathname.startsWith('/app') ? '/app/login' : '/login'

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fffaf3] text-[#681126]">
        Verificando sesión...
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to={loginPath} replace state={{ from: location.pathname }} />
  }

  return children
}
