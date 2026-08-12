import { BrowserRouter } from 'react-router-dom'
import { App as CapacitorApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { AuthProvider } from '../contexts/AuthContext'
import { AppPreferencesAuthSync } from '../app/context/AppPreferencesAuthSync'
import { AppPreferencesProvider } from '../app/context/AppPreferencesContext'
import { MobileRouter } from './MobileRouter'
import { MobileLaunchGate } from './MobileLaunchGate'
import { MobilePushRegistration } from './MobilePushRegistration'
import { completeNativeOAuthCallback, isNativeAuthCallback } from '../services/auth.service'
import { useEffect } from 'react'

export default function AppMobile() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return undefined

    let disposed = false
    let removeListener: (() => void) | undefined

    CapacitorApp.addListener('appUrlOpen', ({ url }) => {
      if (!isNativeAuthCallback(url)) return
      void completeNativeOAuthCallback(url)
    }).then((handle) => {
      if (disposed) {
        void handle.remove()
        return
      }
      removeListener = () => void handle.remove()
    })

    return () => {
      disposed = true
      removeListener?.()
    }
  }, [])

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
