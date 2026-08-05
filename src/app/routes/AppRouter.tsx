import { Navigate, Route, Routes, useParams } from 'react-router-dom'
import { adminRoles } from '../../contexts/AuthContext'
import { ProtectedRoute } from '../../routes/ProtectedRoute'
import { RoleRoute } from '../../routes/RoleRoute'
import { MobileShell } from '../components/mobile/MobileShell'
import { ControlLayout } from '../layout/ControlLayout'
import { AppPreviewPage } from '../pages/control/AppPreviewPage'
import { AvailabilityPage } from '../pages/control/AvailabilityPage'
import { CheckInPage } from '../pages/control/CheckInPage'
import { CustomersPage } from '../pages/control/CustomersPage'
import { DashboardPage } from '../pages/control/DashboardPage'
import { DistributorsOperationsPage } from '../pages/control/DistributorsOperationsPage'
import { EditorialContentPage } from '../pages/control/EditorialContentPage'
import { InventoryOperationsPage } from '../pages/control/InventoryOperationsPage'
import { LogisticsOperationsPage } from '../pages/control/LogisticsOperationsPage'
import { OrdersPage } from '../pages/control/OrdersPage'
import { PaymentsPage } from '../pages/control/PaymentsPage'
import { ReservationsPage } from '../pages/control/ReservationsPage'
import { SettingsPage } from '../pages/control/SettingsPage'
import { WineClubPage } from '../pages/control/WineClubPage'
import { LandingPage } from '../pages/public/LandingPage'
import {
  AppAuthCallbackPage,
  LoginPage,
  RecoverPage,
  RegisterPage,
  ResetPasswordPage,
} from '../pages/public/AuthPages'
import { EventsScreen } from '../pages/mobile/EventsScreen'
import { ExperienceDetailScreen } from '../pages/mobile/ExperienceDetailScreen'
import { ExperiencesScreen } from '../pages/mobile/ExperiencesScreen'
import { HomeScreen } from '../pages/mobile/HomeScreen'
import { MapScreen } from '../pages/mobile/MapScreen'
import { ProfileScreen } from '../pages/mobile/ProfileScreen'
import { ReservationScreen } from '../pages/mobile/ReservationScreen'
import { StoreScreen } from '../pages/mobile/StoreScreen'
import { ClubScreen } from '../pages/mobile/ClubScreen'
import { SommelierScreen } from '../pages/mobile/SommelierScreen'
import { CartScreen } from '../pages/mobile/CartScreen'
import { CheckoutScreen } from '../pages/mobile/CheckoutScreen'
import { PaymentStatusScreen } from '../pages/mobile/PaymentStatusScreen'
import { WineDetailScreen } from '../pages/mobile/WineDetailScreen'
import { EventDetailScreen } from '../pages/mobile/EventDetailScreen'
import { IntelligencePage } from '../pages/future/IntelligencePage'
import { ReportsPage } from '../pages/future/ReportsPage'

function RedirectWineDetail() {
  const { wineId } = useParams<{ wineId: string }>()
  return <Navigate to={`/app/tienda/${wineId ?? ''}`} replace />
}

function RedirectEventDetail() {
  const { eventId } = useParams<{ eventId: string }>()
  return <Navigate to={`/app/eventos/${eventId ?? ''}`} replace />
}

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/registro" element={<RegisterPage />} />
      <Route path="/recuperar" element={<RecoverPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      {/* App móvil del huésped — independiente del Centro de Control */}
      <Route path="/app" element={<MobileShell />}>
        <Route index element={<Navigate to="home" replace />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="registro" element={<RegisterPage />} />
        <Route path="recuperar" element={<RecoverPage />} />
        <Route path="reset-password" element={<ResetPasswordPage />} />
        <Route path="auth/callback" element={<AppAuthCallbackPage />} />
        <Route path="home" element={<HomeScreen />} />
        <Route path="tienda" element={<StoreScreen />} />
        <Route path="tienda/:wineId" element={<WineDetailScreen />} />
        <Route path="experiencias" element={<ExperiencesScreen />} />
        <Route path="experiencias/:experienceId" element={<ExperienceDetailScreen />} />
        <Route path="eventos" element={<EventsScreen />} />
        <Route path="eventos/:eventId" element={<EventDetailScreen />} />
        <Route
          path="reservacion"
          element={
            <ProtectedRoute>
              <ReservationScreen />
            </ProtectedRoute>
          }
        />
        <Route path="mapa" element={<MapScreen />} />
        <Route
          path="club"
          element={
            <ProtectedRoute>
              <ClubScreen />
            </ProtectedRoute>
          }
        />
        <Route path="sommelier" element={<SommelierScreen />} />
        <Route
          path="carrito"
          element={
            <ProtectedRoute>
              <CartScreen />
            </ProtectedRoute>
          }
        />
        <Route
          path="checkout"
          element={
            <ProtectedRoute>
              <CheckoutScreen />
            </ProtectedRoute>
          }
        />
        <Route
          path="pago/procesando"
          element={
            <ProtectedRoute>
              <PaymentStatusScreen mode="processing" />
            </ProtectedRoute>
          }
        />
        <Route
          path="pago/exitoso"
          element={
            <ProtectedRoute>
              <PaymentStatusScreen mode="success" />
            </ProtectedRoute>
          }
        />
        <Route
          path="pago/fallido"
          element={
            <ProtectedRoute>
              <PaymentStatusScreen mode="failed" />
            </ProtectedRoute>
          }
        />
        <Route
          path="perfil"
          element={
            <ProtectedRoute>
              <ProfileScreen />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* Centro de Control administrativo */}
      <Route
        path="/control"
        element={
          <RoleRoute allowedRoles={adminRoles}>
            <ControlLayout />
          </RoleRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="reservaciones" element={<ReservationsPage />} />
        <Route path="vinos" element={<EditorialContentPage entity="wines" />} />
        <Route path="experiencias" element={<EditorialContentPage entity="experiences" />} />
        <Route path="eventos" element={<EditorialContentPage entity="events" />} />
        <Route path="clientes" element={<CustomersPage />} />
        <Route path="promociones" element={<EditorialContentPage entity="promotions" />} />
        <Route path="membresias" element={<EditorialContentPage entity="membership-plans" />} />
        <Route path="campanas" element={<EditorialContentPage entity="campaigns" />} />
        <Route path="disponibilidad" element={<AvailabilityPage />} />
        <Route path="ordenes" element={<OrdersPage />} />
        <Route path="pagos" element={<PaymentsPage />} />
        <Route path="check-in" element={<CheckInPage />} />
        <Route path="wine-club" element={<WineClubPage />} />
        <Route path="inventario" element={<InventoryOperationsPage />} />
        <Route path="logistica" element={<LogisticsOperationsPage />} />
        <Route path="distribuidores" element={<DistributorsOperationsPage />} />
        <Route path="reportes" element={<ReportsPage />} />
        <Route path="configuracion" element={<SettingsPage />} />
        <Route path="app" element={<AppPreviewPage />} />

        {/* Redirecciones temporales: rutas antiguas /control/app/* → /app/* */}
        <Route path="app/home" element={<Navigate to="/app/home" replace />} />
        <Route path="app/tienda" element={<Navigate to="/app/tienda" replace />} />
        <Route path="app/tienda/:wineId" element={<RedirectWineDetail />} />
        <Route path="app/experiencias" element={<Navigate to="/app/experiencias" replace />} />
        <Route path="app/eventos" element={<Navigate to="/app/eventos" replace />} />
        <Route path="app/eventos/:eventId" element={<RedirectEventDetail />} />
        <Route path="app/reservacion" element={<Navigate to="/app/reservacion" replace />} />
        <Route path="app/mapa" element={<Navigate to="/app/mapa" replace />} />
        <Route path="app/club" element={<Navigate to="/app/club" replace />} />
        <Route path="app/sommelier" element={<Navigate to="/app/sommelier" replace />} />
        <Route path="app/carrito" element={<Navigate to="/app/carrito" replace />} />
        <Route path="app/checkout" element={<Navigate to="/app/checkout" replace />} />
        <Route path="app/perfil" element={<Navigate to="/app/perfil" replace />} />

        {/* Módulos futuros */}
        <Route path="futuro/inventario" element={<Navigate to="/control/inventario" replace />} />
        <Route
          path="futuro/vinedos"
          element={<Navigate to="/control/futuro/inventario" replace />}
        />
        <Route path="futuro/logistica" element={<Navigate to="/control/logistica" replace />} />
        <Route
          path="futuro/distribuidores"
          element={<Navigate to="/control/distribuidores" replace />}
        />
        <Route
          path="futuro/intelligence"
          element={<IntelligencePage />}
        />
        <Route
          path="futuro/campanas"
          element={<Navigate to="/control/campanas" replace />}
        />
        <Route path="futuro/reportes" element={<ReportsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
