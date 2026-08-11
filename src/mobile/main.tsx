import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import AppMobile from './AppMobile'
import '../app/styles/theme.css'
import '../app/styles/globals.css'

document.documentElement.classList.add('hdl-mobile-app')
document.body.classList.add('hdl-mobile-app')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppMobile />
  </StrictMode>,
)
