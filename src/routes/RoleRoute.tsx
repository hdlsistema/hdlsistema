import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import type { UserRole } from '../services/auth.service'
import type { ReactNode } from 'react'

type RoleRouteProps = {
  allowedRoles: UserRole[]
  children: ReactNode
}

export function RoleRoute({ allowedRoles, children }: RoleRouteProps) {
  const location = useLocation()
  const { isAuthenticated, isLoading, hasRole } = useAuth()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fffaf3] text-[#681126]">
        Verificando permisos...
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (!hasRole([...allowedRoles])) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fffaf3] px-6 text-center text-[#681126]">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#b48a55]">
            Acceso restringido
          </p>
          <h1 className="mt-3 text-3xl">No tienes permisos para esta sección.</h1>
        </div>
      </div>
    )
  }

  return children
}
