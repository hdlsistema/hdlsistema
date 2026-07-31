import { Navigate, Route, Routes } from 'react-router-dom'
import { MobileShell } from '../components/mobile/MobileShell'
import { ControlLayout } from '../layout/ControlLayout'
import { AppPreviewPage } from '../pages/control/AppPreviewPage'
import { AvailabilityPage } from '../pages/control/AvailabilityPage'
import { CustomersPage } from '../pages/control/CustomersPage'
import { DashboardPage } from '../pages/control/DashboardPage'
import { EventsPage } from '../pages/control/EventsPage'
import { ExperiencesPage } from '../pages/control/ExperiencesPage'
import { PromotionsPage } from '../pages/control/PromotionsPage'
import { ReservationsPage } from '../pages/control/ReservationsPage'
import { SettingsPage } from '../pages/control/SettingsPage'
import { LandingPage } from '../pages/public/LandingPage'
import { EventsScreen } from '../pages/mobile/EventsScreen'
import { ExperiencesScreen } from '../pages/mobile/ExperiencesScreen'
import { HomeScreen } from '../pages/mobile/HomeScreen'
import { MapScreen } from '../pages/mobile/MapScreen'
import { ProfileScreen } from '../pages/mobile/ProfileScreen'
import { ReservationScreen } from '../pages/mobile/ReservationScreen'
import { StoreScreen } from '../pages/mobile/StoreScreen'
import { ClubScreen } from '../pages/mobile/ClubScreen'
import { SommelierScreen } from '../pages/mobile/SommelierScreen'
import { CartScreen } from '../pages/mobile/CartScreen'
import { WineDetailScreen } from '../pages/mobile/WineDetailScreen'
import { EventDetailScreen } from '../pages/mobile/EventDetailScreen'
import { DistributorsPage } from '../pages/future/DistributorsPage'
import { IntelligencePage } from '../pages/future/IntelligencePage'
import { InventoryPage } from '../pages/future/InventoryPage'
import { LogisticsPage } from '../pages/future/LogisticsPage'
import { ReportsPage } from '../pages/future/ReportsPage'
import { CampaignsPage } from '../pages/future/CampaignsPage'

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />

      <Route path="/control" element={<ControlLayout />}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="reservaciones" element={<ReservationsPage />} />
        <Route path="experiencias" element={<ExperiencesPage />} />
        <Route path="eventos" element={<EventsPage />} />
        <Route path="clientes" element={<CustomersPage />} />
        <Route path="promociones" element={<PromotionsPage />} />
        <Route path="disponibilidad" element={<AvailabilityPage />} />
        <Route path="reportes" element={<ReportsPage />} />
        <Route path="configuracion" element={<SettingsPage />} />

        <Route path="app" element={<AppPreviewPage />}>
          <Route element={<MobileShell />}>
            <Route index element={<Navigate to="home" replace />} />
            <Route path="home" element={<HomeScreen />} />
            <Route path="tienda" element={<StoreScreen />} />
            <Route path="tienda/:wineId" element={<WineDetailScreen />} />
            <Route path="experiencias" element={<ExperiencesScreen />} />
            <Route path="eventos" element={<EventsScreen />} />
            <Route path="eventos/:eventId" element={<EventDetailScreen />} />
            <Route path="reservacion" element={<ReservationScreen />} />
            <Route path="mapa" element={<MapScreen />} />
            <Route path="club" element={<ClubScreen />} />
            <Route path="sommelier" element={<SommelierScreen />} />
            <Route path="carrito" element={<CartScreen />} />
            <Route path="perfil" element={<ProfileScreen />} />
          </Route>
        </Route>

        <Route path="futuro/inventario" element={<InventoryPage />} />
        <Route
          path="futuro/vinedos"
          element={<Navigate to="/control/futuro/inventario" replace />}
        />
        <Route path="futuro/logistica" element={<LogisticsPage />} />
        <Route
          path="futuro/distribuidores"
          element={<DistributorsPage />}
        />
        <Route
          path="futuro/intelligence"
          element={<IntelligencePage />}
        />
        <Route
          path="futuro/campanas"
          element={<CampaignsPage />}
        />
        <Route path="futuro/reportes" element={<ReportsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
