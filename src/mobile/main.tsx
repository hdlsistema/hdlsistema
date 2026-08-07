import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import AppMobile from './AppMobile'
import '../app/styles/theme.css'
import '../app/styles/globals.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppMobile />
  </StrictMode>,
)
