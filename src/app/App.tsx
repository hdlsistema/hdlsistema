import { BrowserRouter } from 'react-router-dom'
import { AppPreferencesProvider } from './context/AppPreferencesContext'
import { AppRouter } from './routes/AppRouter'

export default function App() {
  return (
    <AppPreferencesProvider>
      <BrowserRouter>
        <AppRouter />
      </BrowserRouter>
    </AppPreferencesProvider>
  )
}
