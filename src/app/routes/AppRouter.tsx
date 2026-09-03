import { Navigate, Route, Routes, useParams } from 'react-router-dom'
import { adminRoles, useAuth } from '../../contexts/AuthContext'
import { ProtectedRoute } from '../../routes/ProtectedRoute'
import { PermissionRoute } from '../../routes/PermissionRoute'
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
import { UserPermissionsPage } from '../pages/control/UserPermissionsPage'
import { LandingPage } from '../pages/public/LandingPage'
import { LegalPage } from '../pages/public/LegalPage'
import { AccountDeletionPage } from '../pages/public/AccountDeletionPage'
import { AccountDeletionConfirmationPage } from '../pages/public/AccountDeletionConfirmationPage'
import { ContentPreviewPage } from '../pages/public/ContentPreviewPage'
import { AccessPassPage } from '../pages/public/AccessPassPage'
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
import { EventVenuesScreen } from '../pages/mobile/EventVenuesScreen'
import { PromotionsScreen } from '../pages/mobile/PromotionsScreen'
import { QuoteRequestsPage } from '../pages/control/QuoteRequestsPage'
import { AccountDeletionRequestsPage } from '../pages/control/AccountDeletionRequestsPage'
import { PrivacyAccountScreen } from '../pages/mobile/PrivacyAccountScreen'
import { DeleteAccountScreen } from '../pages/mobile/DeleteAccountScreen'
import { MobileLegalScreen } from '../pages/mobile/MobileLegalScreen'
import { firstPermittedControlRoute } from './controlNavigation'

function TrackedMobileShell() {
  return <><AppActivityTracker /><MobileShell /></>
}

function RedirectWineDetail() {
  const { wineId } = useParams<{ wineId: string }>()
  return <Navigate to={`/app/tienda/${wineId ?? ''}`} replace />
}

function RedirectEventDetail() {
  const { eventId } = useParams<{ eventId: string }>()
  return <Navigate to={`/app/eventos-magnos/${eventId ?? ''}`} replace />
}

function RedirectEventVenue() {
  const { venueId } = useParams<{ venueId: string }>()
  return <Navigate to={`/app/nuestros-eventos/${venueId ?? ''}`} replace />
}

function ControlIndexRedirect() {
  const { hasPermission } = useAuth()
  const target = firstPermittedControlRoute(hasPermission)?.to ?? 'dashboard'
  return <Navigate to={target} replace />
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
      <Route path="/eliminar-cuenta/confirmar" element={<AccountDeletionConfirmationPage />} />
      <Route path="/vista-previa/:token" element={<ContentPreviewPage />} />
      <Route path="/acceso/:token" element={<AccessPassPage />} />
      <Route path="/acceso" element={<AccessPassPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/registro" element={<Navigate to="/login" replace />} />
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
        <Route path="promociones" element={<PromotionsScreen />} />
        <Route path="tienda" element={<StoreScreen />} />
        <Route path="tienda/:wineId" element={<WineDetailScreen />} />
        <Route path="vinos" element={<StoreScreen />} />
        <Route path="vinos/:wineId" element={<WineDetailScreen />} />
        <Route path="experiencias" element={<ExperiencesScreen />} />
        <Route path="experiencias/:experienceId" element={<ExperienceDetailScreen />} />
        <Route path="eventos" element={<Navigate to="nuestros-eventos" replace />} />
        <Route path="eventos/:eventId" element={<RedirectEventDetail />} />
        <Route path="nuestros-eventos" element={<EventVenuesScreen />} />
        <Route path="nuestros-eventos/:venueId" element={<EventsScreen />} />
        <Route path="eventos-magnos" element={<EventsScreen />} />
        <Route path="eventos-magnos/:eventId" element={<EventDetailScreen />} />
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
        <Route path="sommelier" element={<ProtectedRoute><SommelierScreen /></ProtectedRoute>} />
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
        <Route path="politica-de-privacidad" element={<MobileLegalScreen kind="privacy" />} />
        <Route path="terminos-y-condiciones" element={<MobileLegalScreen kind="terms" />} />
        <Route path="eliminar-cuenta" element={<ProtectedRoute><DeleteAccountScreen /></ProtectedRoute>} />
        <Route path="eliminar-cuenta/confirmar" element={<AccountDeletionConfirmationPage />} />
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
        <Route index element={<ControlIndexRedirect />} />
        <Route path="dashboard" element={<PermissionRoute permission="dashboard.view"><DashboardPage /></PermissionRoute>} />
        <Route path="reservaciones" element={<PermissionRoute permission="reservations.view"><ReservationsPage /></PermissionRoute>} />
        <Route path="cotizaciones" element={<PermissionRoute permission="quotes.view"><QuoteRequestsPage /></PermissionRoute>} />
        <Route path="cotizaciones/:quoteId" element={<PermissionRoute permission="quotes.view"><QuoteRequestsPage /></PermissionRoute>} />
        <Route path="vinos" element={<PermissionRoute permission="content.wines.manage"><EditorialContentPage entity="wines" /></PermissionRoute>} />
        <Route path="experiencias" element={<PermissionRoute permission="content.experiences.manage"><EditorialContentPage entity="experiences" /></PermissionRoute>} />
        <Route path="eventos" element={<Navigate to="/control/eventos-magnos" replace />} />
        <Route path="eventos-magnos" element={<PermissionRoute permission="content.events.manage"><EditorialContentPage entity="grand-events" /></PermissionRoute>} />
        <Route path="servicios" element={<PermissionRoute permission="content.services.manage"><CommercialCatalogPage /></PermissionRoute>} />
        <Route path="clientes" element={<PermissionRoute permission="customers.view"><CustomersPage /></PermissionRoute>} />
        <Route path="actividad" element={<PermissionRoute permission="activity.view"><AppActivityPage /></PermissionRoute>} />
        <Route path="carritos" element={<PermissionRoute permission="carts.view"><CartsPage /></PermissionRoute>} />
        <Route path="promociones" element={<PermissionRoute permission="content.promotions.manage"><EditorialContentPage entity="promotions" /></PermissionRoute>} />
        <Route path="membresias" element={<PermissionRoute permission="content.memberships.manage"><EditorialContentPage entity="membership-plans" /></PermissionRoute>} />
        <Route path="campanas" element={<PermissionRoute permission="content.campaigns.manage"><EditorialContentPage entity="campaigns" /></PermissionRoute>} />
        <Route path="disponibilidad" element={<PermissionRoute permission="availability.view"><AvailabilityPage /></PermissionRoute>} />
        <Route path="hospedaje" element={<Navigate to="/control/disponibilidad?view=hospedaje" replace />} />
        <Route path="inventario" element={<PermissionRoute permission="inventory.view"><InventoryPage /></PermissionRoute>} />
        <Route path="logistica" element={<PermissionRoute permission="logistics.view"><LogisticsPage /></PermissionRoute>} />
        <Route path="ordenes" element={<PermissionRoute permission="orders.view"><OrdersPage /></PermissionRoute>} />
        <Route path="pagos" element={<PermissionRoute permission="payments.view"><PaymentsPage /></PermissionRoute>} />
        <Route path="check-in" element={<PermissionRoute permission="entries.view"><CheckInPage /></PermissionRoute>} />
        <Route path="entradas" element={<PermissionRoute permission="entries.view"><CheckInPage /></PermissionRoute>} />
        <Route path="wine-club" element={<PermissionRoute permission="wineclub.view"><WineClubPage /></PermissionRoute>} />
        <Route path="distribuidores" element={<PermissionRoute permission="distributors.view"><DistributorsPage /></PermissionRoute>} />
        <Route path="reportes" element={<PermissionRoute permission="reports.view"><ReportsPage /></PermissionRoute>} />
        <Route path="eliminacion-cuentas" element={<PermissionRoute permission="privacy.manage"><AccountDeletionRequestsPage /></PermissionRoute>} />
        <Route path="usuarios-permisos" element={<PermissionRoute permission="users.manage"><UserPermissionsPage /></PermissionRoute>} />
        <Route path="configuracion" element={<PermissionRoute permission="settings.manage"><SettingsPage /></PermissionRoute>} />
        <Route path="app" element={<PermissionRoute permission="dashboard.view"><AppPreviewPage /></PermissionRoute>} />

        {/* Redirecciones temporales: rutas antiguas /control/app/* → /app/* */}
        <Route path="app/home" element={<Navigate to="/app/home" replace />} />
        <Route path="app/promociones" element={<Navigate to="/app/promociones" replace />} />
        <Route path="app/tienda" element={<Navigate to="/app/tienda" replace />} />
        <Route path="app/tienda/:wineId" element={<RedirectWineDetail />} />
        <Route path="app/experiencias" element={<Navigate to="/app/experiencias" replace />} />
        <Route path="app/eventos" element={<Navigate to="/app/nuestros-eventos" replace />} />
        <Route path="app/nuestros-eventos" element={<Navigate to="/app/nuestros-eventos" replace />} />
        <Route path="app/nuestros-eventos/:venueId" element={<RedirectEventVenue />} />
        <Route path="app/eventos-magnos" element={<Navigate to="/app/eventos-magnos" replace />} />
        <Route path="app/eventos/:eventId" element={<RedirectEventDetail />} />
        <Route path="app/eventos-magnos/:eventId" element={<RedirectEventDetail />} />
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
