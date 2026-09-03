import { useEffect, useRef } from 'react'
import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core'
import { PushNotifications } from '@capacitor/push-notifications'
import { useAuth } from '../contexts/AuthContext'
import { customerClient } from '../services/customer.service'

type NativeFcmTokenPlugin = {
  getToken(): Promise<{ token: string }>
  addListener(eventName: 'tokenReceived', listener: (event: { token: string }) => void): Promise<PluginListenerHandle>
}

const NativeFcmToken = registerPlugin<NativeFcmTokenPlugin>('NativeFcmToken')

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
    let nativeFcmListener: PluginListenerHandle | null = null
    const accessToken = session.access_token

    function persistFirebaseToken(firebaseToken: string, platform: 'android' | 'ios') {
      const registrationKey = `${accessToken}:${firebaseToken}`
      if (!active || !firebaseToken || registeredToken.current === registrationKey) return
      registeredToken.current = registrationKey
      previousRegistration.current = { accessToken, firebaseToken }
      void customerClient.registerDevice(accessToken, {
        firebaseToken,
        platform,
      }).catch(() => undefined)
    }

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
        const platform = Capacitor.getPlatform()
        if (platform === 'ios') {
          nativeFcmListener = await NativeFcmToken.addListener('tokenReceived', ({ token }) => {
            persistFirebaseToken(token, 'ios')
          })
        }
        await PushNotifications.addListener('registration', (token) => {
          if (!active || !token.value) return
          if (platform === 'ios') {
            // Capacitor entrega aquí el token APNs. Firebase lo asocia de forma
            // nativa y sólo persistimos el token FCM devuelto por Messaging.
            void NativeFcmToken.getToken()
              .then(({ token: firebaseToken }) => persistFirebaseToken(firebaseToken, 'ios'))
              .catch(() => undefined)
            return
          }
          persistFirebaseToken(token.value, 'android')
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
          if (deepLink.startsWith('/app/')) {
            const nativeDeepLink = deepLink.replace(/^\/app(?=\/|$)/, '') || '/'
            const nativePath = nativeDeepLink.split('#')[0]?.split('?')[0] || '/'
            if (nativePath !== '/control' && !nativePath.startsWith('/control/')) {
              window.location.assign(nativeDeepLink)
            }
          }
        })
        await PushNotifications.register()
      } catch {
        // Push is optional at runtime; the app remains functional if the OS denies permission.
      }
    }

    void registerPush()

    return () => {
      active = false
      void nativeFcmListener?.remove()
    }
  }, [session?.access_token])

  return null
}
