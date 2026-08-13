import { Navigate, Route, Routes, useParams } from 'react-router-dom'
import { adminRoles } from '../../contexts/AuthContext'
import { ProtectedRoute } from '../../routes/ProtectedRoute'
import { RoleRoute } from '../../routes/RoleRoute'
import { MobileShell } from '../components/mobile/MobileShell'
import { AppActivityTracker } from '../components/mobile/AppActivityTracker'
import { ControlLayout } from '../layout/ControlLayout'
import { AppPreviewPage } from '../pages/control/AppPreviewPage'
import { AvailabilityPage } from '../pages/control/AvailabilityPage'
import { AppActivityPage } from '../pages/control/AppActivityPage'
import { CartsPage } from '../pages/control/CartsPage'
import { CheckInPage } from '../pages/control/CheckInPage'
import { CustomersPage } from '../pages/control/CustomersPage'
import { DashboardPage } from '../pages/control/DashboardPage'
import { EditorialContentPage } from '../pages/control/EditorialContentPage'
import { OrdersPage } from '../pages/control/OrdersPage'
import { InventoryPage } from '../pages/control/InventoryPage'
import { LogisticsPage } from '../pages/control/LogisticsPage'
import { DistributorsPage } from '../pages/control/DistributorsPage'
import { CommercialCatalogPage } from '../pages/control/CommercialCatalogPage'
import { ReportsPage } from '../pages/control/ReportsPage'
import { PaymentsPage } from '../pages/control/PaymentsPage'
import { ReservationsPage } from '../pages/control/ReservationsPage'
import { SettingsPage } from '../pages/control/SettingsPage'
import { WineClubPage } from '../pages/control/WineClubPage'
import { LandingPage } from '../pages/public/LandingPage'
import { LegalPage } from '../pages/public/LegalPage'
import { AccountDeletionPage } from '../pages/public/AccountDeletionPage'
import { ContentPreviewPage } from '../pages/public/ContentPreviewPage'
import {
  AppAuthCallbackPage,
  LoginPage,
  RecoverPage,
  RegisterPage,
  ResetPasswordPage,
} from '../pages/public/AuthPages'
import { EventsScreen } from '../pages/mobile/EventsScreen'
import { CabinsScreen } from '../pages/mobile/CabinsScreen'
import { ExperienceDetailScreen } from '../pages/mobile/ExperienceDetailScreen'
import { ExperiencesScreen } from '../pages/mobile/ExperiencesScreen'
import { HomeScreen } from '../pages/mobile/HomeScreen'
import { MapScreen } from '../pages/mobile/MapScreen'
import { QuoteRequestScreen } from '../pages/mobile/QuoteRequestScreen'
import { RestaurantsScreen } from '../pages/mobile/RestaurantsScreen'
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
import { QuoteRequestsPage } from '../pages/control/QuoteRequestsPage'
import { AccountDeletionRequestsPage } from '../pages/control/AccountDeletionRequestsPage'
import { PrivacyAccountScreen } from '../pages/mobile/PrivacyAccountScreen'
import { DeleteAccountScreen } from '../pages/mobile/DeleteAccountScreen'

function TrackedMobileShell() {
  return <><AppActivityTracker /><MobileShell /></>
}

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
      <Route path="/privacidad" element={<LegalPage type="privacy" />} />
      <Route path="/politica-de-privacidad" element={<LegalPage type="privacy" />} />
      <Route path="/terminos" element={<LegalPage type="terms" />} />
      <Route path="/terminos-y-condiciones" element={<LegalPage type="terms" />} />
      <Route path="/eliminar-cuenta" element={<AccountDeletionPage />} />
      <Route path="/vista-previa/:token" element={<ContentPreviewPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/registro" element={<RegisterPage />} />
      <Route path="/recuperar" element={<RecoverPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      {/* App Hacienda de Letras — independiente del Centro de Control */}
      <Route path="/app" element={<TrackedMobileShell />}>
        <Route index element={<Navigate to="home" replace />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="registro" element={<RegisterPage />} />
        <Route path="recuperar" element={<RecoverPage />} />
        <Route path="reset-password" element={<ResetPasswordPage />} />
        <Route path="auth/callback" element={<AppAuthCallbackPage />} />
        <Route path="home" element={<HomeScreen />} />
        <Route path="tienda" element={<StoreScreen />} />
        <Route path="tienda/:wineId" element={<WineDetailScreen />} />
        <Route path="vinos" element={<StoreScreen />} />
        <Route path="vinos/:wineId" element={<WineDetailScreen />} />
        <Route path="experiencias" element={<ExperiencesScreen />} />
        <Route path="experiencias/:experienceId" element={<ExperienceDetailScreen />} />
        <Route path="eventos" element={<EventsScreen />} />
        <Route path="eventos/:eventId" element={<EventDetailScreen />} />
        <Route path="cabanas" element={<CabinsScreen />} />
        <Route path="restaurantes" element={<RestaurantsScreen />} />
        <Route
          path="celebra"
          element={
            <ProtectedRoute>
              <QuoteRequestScreen />
            </ProtectedRoute>
          }
        />
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
        <Route
          path="membresias"
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
        <Route path="privacidad-cuenta" element={<ProtectedRoute><PrivacyAccountScreen /></ProtectedRoute>} />
        <Route path="eliminar-cuenta" element={<ProtectedRoute><DeleteAccountScreen /></ProtectedRoute>} />
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
        <Route path="cotizaciones" element={<QuoteRequestsPage />} />
        <Route path="cotizaciones/:quoteId" element={<QuoteRequestsPage />} />
        <Route path="vinos" element={<EditorialContentPage entity="wines" />} />
        <Route path="experiencias" element={<EditorialContentPage entity="experiences" />} />
        <Route path="eventos" element={<EditorialContentPage entity="events" />} />
        <Route path="servicios" element={<CommercialCatalogPage />} />
        <Route path="clientes" element={<CustomersPage />} />
        <Route path="actividad" element={<AppActivityPage />} />
        <Route path="carritos" element={<CartsPage />} />
        <Route path="promociones" element={<EditorialContentPage entity="promotions" />} />
        <Route path="membresias" element={<EditorialContentPage entity="membership-plans" />} />
        <Route path="campanas" element={<EditorialContentPage entity="campaigns" />} />
        <Route path="disponibilidad" element={<AvailabilityPage />} />
        <Route path="hospedaje" element={<Navigate to="/control/disponibilidad?view=hospedaje" replace />} />
        <Route path="inventario" element={<InventoryPage />} />
        <Route path="logistica" element={<LogisticsPage />} />
        <Route path="ordenes" element={<OrdersPage />} />
        <Route path="pagos" element={<PaymentsPage />} />
        <Route path="check-in" element={<CheckInPage />} />
        <Route path="wine-club" element={<WineClubPage />} />
        <Route path="distribuidores" element={<DistributorsPage />} />
        <Route path="reportes" element={<ReportsPage />} />
        <Route path="eliminacion-cuentas" element={<AccountDeletionRequestsPage />} />
        <Route path="configuracion" element={<SettingsPage />} />
        <Route path="app" element={<AppPreviewPage />} />

        {/* Redirecciones temporales: rutas antiguas /control/app/* → /app/* */}
        <Route path="app/home" element={<Navigate to="/app/home" replace />} />
        <Route path="app/tienda" element={<Navigate to="/app/tienda" replace />} />
        <Route path="app/tienda/:wineId" element={<RedirectWineDetail />} />
        <Route path="app/experiencias" element={<Navigate to="/app/experiencias" replace />} />
        <Route path="app/eventos" element={<Navigate to="/app/eventos" replace />} />
        <Route path="app/eventos/:eventId" element={<RedirectEventDetail />} />
        <Route path="app/cabanas" element={<Navigate to="/app/cabanas" replace />} />
        <Route path="app/restaurantes" element={<Navigate to="/app/restaurantes" replace />} />
        <Route path="app/celebra" element={<Navigate to="/app/celebra" replace />} />
        <Route path="app/reservacion" element={<Navigate to="/app/reservacion" replace />} />
        <Route path="app/mapa" element={<Navigate to="/app/mapa" replace />} />
        <Route path="app/club" element={<Navigate to="/app/club" replace />} />
        <Route path="app/sommelier" element={<Navigate to="/app/sommelier" replace />} />
        <Route path="app/carrito" element={<Navigate to="/app/carrito" replace />} />
        <Route path="app/checkout" element={<Navigate to="/app/checkout" replace />} />
        <Route path="app/perfil" element={<Navigate to="/app/perfil" replace />} />

        {/* Módulos futuros */}
        <Route path="futuro/intelligence" element={<Navigate to="/control/dashboard" replace />} />
        <Route
          path="futuro/campanas"
          element={<Navigate to="/control/campanas" replace />}
        />
        <Route path="futuro/reportes" element={<Navigate to="/control/dashboard" replace />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
