import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import type { ReactNode } from 'react'
import { firstPermittedControlRoute } from '../app/routes/controlNavigation'

type PermissionRouteProps = {
  permission: string | string[]
  children: ReactNode
}

export function PermissionRoute({ permission, children }: PermissionRouteProps) {
  const location = useLocation()
  const { isAuthenticated, isLoading, hasPermission } = useAuth()

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

  if (!hasPermission(permission)) {
    if (location.pathname.startsWith('/control')) {
      const fallback = firstPermittedControlRoute(hasPermission)
      if (fallback && fallback.path !== location.pathname) {
        return <Navigate to={fallback.path} replace />
      }
    }

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
