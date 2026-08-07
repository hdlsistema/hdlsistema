import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '../contexts/AuthContext'
import { AppPreferencesAuthSync } from '../app/context/AppPreferencesAuthSync'
import { AppPreferencesProvider } from '../app/context/AppPreferencesContext'
import { MobileRouter } from './MobileRouter'

export default function AppMobile() {
  return (
    <AppPreferencesProvider>
      <AuthProvider>
        <AppPreferencesAuthSync />
        <BrowserRouter>
          <MobileRouter />
        </BrowserRouter>
      </AuthProvider>
    </AppPreferencesProvider>
  )
}
