import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Capacitor } from '@capacitor/core'
import AppMobile from './AppMobile'
import '../app/styles/theme.css'
import '../app/styles/globals.css'

document.documentElement.classList.add('hdl-mobile-app')
const platform = Capacitor.getPlatform()
document.documentElement.dataset.platform = platform

if (platform === 'ios') {
  document
    .querySelector<HTMLMetaElement>('meta[name="viewport"]')
    ?.setAttribute(
      'content',
      'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover',
    )
}

document.body.classList.add('hdl-mobile-app')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppMobile />
  </StrictMode>,
)
