import type { ReactElement } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { MobileShell } from '../app/components/mobile/MobileShell'
import { CartScreen } from '../app/pages/mobile/CartScreen'
import { CheckoutScreen } from '../app/pages/mobile/CheckoutScreen'
import { ClubScreen } from '../app/pages/mobile/ClubScreen'
import { EventDetailScreen } from '../app/pages/mobile/EventDetailScreen'
import { EventsScreen } from '../app/pages/mobile/EventsScreen'
import { ExperienceDetailScreen } from '../app/pages/mobile/ExperienceDetailScreen'
import { ExperiencesScreen } from '../app/pages/mobile/ExperiencesScreen'
import { HomeScreen } from '../app/pages/mobile/HomeScreen'
import { MapScreen } from '../app/pages/mobile/MapScreen'
import { PaymentStatusScreen } from '../app/pages/mobile/PaymentStatusScreen'
import { ProfileScreen } from '../app/pages/mobile/ProfileScreen'
import { ReservationScreen } from '../app/pages/mobile/ReservationScreen'
import { SommelierScreen } from '../app/pages/mobile/SommelierScreen'
import { StoreScreen } from '../app/pages/mobile/StoreScreen'
import { WineDetailScreen } from '../app/pages/mobile/WineDetailScreen'
import {
  MobileAuthCallbackPage,
  MobileLoginPage,
  MobileRecoverPage,
  MobileRegisterPage,
  MobileResetPasswordPage,
} from './MobileAuthPages'
import { MobileProtectedRoute } from './MobileProtectedRoute'

function RootRedirect() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fffaf3] text-[#681126]">
        Verificando sesión...
      </div>
    )
  }

  return <Navigate to={isAuthenticated ? '/home' : '/login'} replace />
}

function protectedScreen(screen: ReactElement) {
  return <MobileProtectedRoute>{screen}</MobileProtectedRoute>
}

export function MobileRouter() {
  return (
    <Routes>
      <Route path="/" element={<MobileShell />}>
        <Route index element={<RootRedirect />} />
        <Route path="login" element={<MobileLoginPage />} />
        <Route path="registro" element={<MobileRegisterPage />} />
        <Route path="recuperar" element={<MobileRecoverPage />} />
        <Route path="reset-password" element={<MobileResetPasswordPage />} />
        <Route path="auth/callback" element={<MobileAuthCallbackPage />} />
        <Route path="home" element={<HomeScreen />} />
        <Route path="vinos" element={<StoreScreen />} />
        <Route path="vinos/:wineId" element={<WineDetailScreen />} />
        <Route path="experiencias" element={<ExperiencesScreen />} />
        <Route path="experiencias/:experienceId" element={<ExperienceDetailScreen />} />
        <Route path="eventos" element={<EventsScreen />} />
        <Route path="eventos/:eventId" element={<EventDetailScreen />} />
        <Route path="reservacion" element={protectedScreen(<ReservationScreen />)} />
        <Route path="mapa" element={<MapScreen />} />
        <Route path="membresias" element={protectedScreen(<ClubScreen />)} />
        <Route path="sommelier" element={<SommelierScreen />} />
        <Route path="carrito" element={protectedScreen(<CartScreen />)} />
        <Route path="checkout" element={protectedScreen(<CheckoutScreen />)} />
        <Route path="pago/procesando" element={protectedScreen(<PaymentStatusScreen mode="processing" />)} />
        <Route path="pago/exitoso" element={protectedScreen(<PaymentStatusScreen mode="success" />)} />
        <Route path="pago/fallido" element={protectedScreen(<PaymentStatusScreen mode="failed" />)} />
        <Route path="perfil" element={protectedScreen(<ProfileScreen />)} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
