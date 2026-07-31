import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '../contexts/AuthContext'
import { AppPreferencesProvider } from './context/AppPreferencesContext'
import { AppRouter } from './routes/AppRouter'

export default function App() {
  return (
    <AppPreferencesProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppRouter />
        </BrowserRouter>
      </AuthProvider>
    </AppPreferencesProvider>
  )
}
