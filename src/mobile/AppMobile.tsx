import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '../contexts/AuthContext'
import { AppPreferencesAuthSync } from '../app/context/AppPreferencesAuthSync'
import { AppPreferencesProvider } from '../app/context/AppPreferencesContext'
import { MobileRouter } from './MobileRouter'
import { MobileLaunchGate } from './MobileLaunchGate'
import { MobilePushRegistration } from './MobilePushRegistration'

export default function AppMobile() {
  return (
    <AppPreferencesProvider>
      <AuthProvider>
        <AppPreferencesAuthSync />
        <MobilePushRegistration />
        <MobileLaunchGate>
          <BrowserRouter>
            <MobileRouter />
          </BrowserRouter>
        </MobileLaunchGate>
      </AuthProvider>
    </AppPreferencesProvider>
  )
}
