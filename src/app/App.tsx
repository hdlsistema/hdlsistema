import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '../contexts/AuthContext'
import { AppPreferencesAuthSync } from './context/AppPreferencesAuthSync'
import { AppPreferencesProvider } from './context/AppPreferencesContext'
import { AppRouter } from './routes/AppRouter'

export default function App() {
  return (
    <AppPreferencesProvider>
      <AuthProvider>
        <AppPreferencesAuthSync />
        <BrowserRouter>
          <AppRouter />
        </BrowserRouter>
      </AuthProvider>
    </AppPreferencesProvider>
  )
}
