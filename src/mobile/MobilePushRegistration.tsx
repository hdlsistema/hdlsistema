import { useEffect, useRef } from 'react'
import { Capacitor } from '@capacitor/core'
import { PushNotifications } from '@capacitor/push-notifications'
import { useAuth } from '../contexts/AuthContext'
import { customerClient } from '../services/customer.service'

export function MobilePushRegistration() {
  const { session } = useAuth()
  const registeredToken = useRef('')
  const previousRegistration = useRef<{ accessToken: string; firebaseToken: string } | null>(null)

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    if (!session?.access_token) {
      const previous = previousRegistration.current
      if (previous) {
        previousRegistration.current = null
        registeredToken.current = ''
        void customerClient.disableDevice(previous.accessToken, previous.firebaseToken).catch(() => undefined)
      }
      return
    }

    let active = true
    const accessToken = session.access_token

    async function registerPush() {
      try {
        const permission = await PushNotifications.requestPermissions()
        if (permission.receive !== 'granted') return

        if (Capacitor.getPlatform() === 'android') {
          await PushNotifications.createChannel({
            id: 'orders',
            name: 'Reservaciones y pedidos',
            description: 'Confirmaciones, cambios y avisos importantes de Hacienda de Letras.',
            importance: 5,
            visibility: 1,
            sound: 'default',
            vibration: true,
          })
        }

        await PushNotifications.removeAllListeners()
        await PushNotifications.addListener('registration', (token) => {
          if (!active || !token.value || registeredToken.current === token.value) return
          registeredToken.current = token.value
          previousRegistration.current = { accessToken, firebaseToken: token.value }
          const platform = Capacitor.getPlatform()
          void customerClient.registerDevice(accessToken, {
            firebaseToken: token.value,
            platform: platform === 'ios' ? 'ios' : 'android',
          }).catch(() => undefined)
        })
        await PushNotifications.addListener('registrationError', () => undefined)
        await PushNotifications.addListener('pushNotificationReceived', () => {
          window.dispatchEvent(new CustomEvent('hdl:push-received'))
        })
        await PushNotifications.addListener('pushNotificationActionPerformed', (event) => {
          const data = event.notification.data as Record<string, unknown> | undefined
          const deepLink = typeof data?.deepLink === 'string'
            ? data.deepLink
            : typeof data?.url === 'string'
              ? data.url
              : ''
          if (deepLink.startsWith('/app/')) window.location.assign(deepLink)
        })
        await PushNotifications.register()
      } catch {
        // Push is optional at runtime; the app remains functional if the OS denies permission.
      }
    }

    void registerPush()

    return () => {
      active = false
    }
  }, [session?.access_token])

  return null
}
