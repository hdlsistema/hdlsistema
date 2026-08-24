import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { adminContentClient } from '../services/content.service'
import { customerClient } from '../services/customer.service'

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('flujo mobile de reservaciones y boletos', () => {
  it('administra tipos de boleto del evento mediante endpoints protegidos', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(jsonResponse({ ok: true, data: [] }))
    vi.stubGlobal('fetch', fetchSpy)

    await adminContentClient.eventTicketTypes('event-1', 'jwt-admin')

    expect(fetchSpy).toHaveBeenCalledWith(
      'http://localhost:3001/api/admin/events/event-1/ticket-types',
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer jwt-admin' }) }),
    )
  })

  it('consulta los pases emitidos para mostrar el QR al cliente', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(jsonResponse({ ok: true, data: [{ id: 'pass-1', accessType: 'event_ticket' }] }))
    vi.stubGlobal('fetch', fetchSpy)

    const response = await customerClient.accessPasses('jwt-customer')

    expect(response.data[0].accessType).toBe('event_ticket')
    expect(fetchSpy).toHaveBeenCalledWith(
      'http://localhost:3001/api/customer/access-passes',
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer jwt-customer' }) }),
    )
  })

  it('mantiene horarios de restaurante y reprogramacion alimentados por la entidad correcta', () => {
    const reservations = readFileSync(resolve(__dirname, '../app/pages/mobile/ReservationScreen.tsx'), 'utf8')
    const profile = readFileSync(resolve(__dirname, '../app/pages/mobile/ProfileScreen.tsx'), 'utf8')
    const ticketSheet = readFileSync(resolve(__dirname, '../app/components/mobile/AccessTicketSheet.tsx'), 'utf8')
    const restaurants = readFileSync(resolve(__dirname, '../app/pages/mobile/RestaurantsScreen.tsx'), 'utf8')
    const catalog = readFileSync(resolve(__dirname, '../app/pages/control/CommercialCatalogPage.tsx'), 'utf8')
    const paymentStatus = readFileSync(resolve(__dirname, '../app/pages/mobile/PaymentStatusScreen.tsx'), 'utf8')

    expect(reservations).not.toContain('customerClient.reservations')
    expect(reservations).not.toContain('yourBookings')
    expect(profile).toContain('customerClient.accessPasses(token)')
    expect(profile).toContain('<AccessTicketSheet pass={selectedTicket}')
    expect(ticketSheet).toContain("pass.accessType === 'event_ticket'")
    expect(ticketSheet).toContain('downloadAccessCredentialPdf')
    expect(ticketSheet).toContain('shareAccessCredential')
    expect(profile).toContain('slot.experienceId === reservation.experienceId')
    expect(profile).toContain("reservation.reservationType === 'experience'")
    expect(restaurants).toContain('selectedRestaurantRecord?.metadata?.reservationTimes')
    expect(restaurants).not.toContain("const restaurantTimes = ['12:00'")
    expect(catalog).toContain('Horarios de solicitud (uno por línea, HH:mm)')
    expect(paymentStatus).toContain("appPath('/perfil')}#accesses")
    expect(paymentStatus).not.toContain("appPath('/reservacion')}#boletos")
    expect(paymentStatus).toContain('Ver boletos y códigos QR')
  })

  it('abre un boleto HTTPS público sin consumirlo hasta confirmación autorizada', () => {
    const publicPass = readFileSync(resolve(__dirname, '../app/pages/public/AccessPassPage.tsx'), 'utf8')
    const routes = readFileSync(resolve(__dirname, '../app/routes/AppRouter.tsx'), 'utf8')
    const pdf = readFileSync(resolve(__dirname, '../app/utils/accessCredentialPdf.ts'), 'utf8')

    expect(routes).toContain('path="/acceso/:token"')
    expect(publicPass).toContain('publicAccessPassClient.get(token)')
    expect(publicPass).toContain('accessPassClient.validate(session.access_token, token)')
    expect(publicPass).toContain('checkinsClient.register(session.access_token')
    expect(pdf).toContain("margin: 4")
    expect(pdf).toContain("type: 'application/pdf'")
  })

  it('muestra campana conectada y crea el canal nativo de notificaciones', () => {
    const header = readFileSync(resolve(__dirname, '../app/components/mobile/AppHeader.tsx'), 'utf8')
    const push = readFileSync(resolve(__dirname, '../mobile/MobilePushRegistration.tsx'), 'utf8')
    const nativeFcm = readFileSync(resolve(__dirname, '../../ios/App/App/NativeFcmTokenPlugin.swift'), 'utf8')
    const appDelegate = readFileSync(resolve(__dirname, '../../ios/App/App/AppDelegate.swift'), 'utf8')
    const xcodeProject = readFileSync(resolve(__dirname, '../../ios/App/App.xcodeproj/project.pbxproj'), 'utf8')
    const entitlements = readFileSync(resolve(__dirname, '../../ios/App/App/App.entitlements'), 'utf8')
    const infoPlist = readFileSync(resolve(__dirname, '../../ios/App/App/Info.plist'), 'utf8')
    const delivery = readFileSync(resolve(__dirname, '../../backend/src/modules/notifications/notifications.service.ts'), 'utf8')

    expect(header).toContain("customerClient.notifications(session.access_token, 1)")
    expect(header).toContain("`${appPath('/perfil')}#notifications`")
    expect(header).toContain('unreadNotifications > 99')
    expect(push).toContain('PushNotifications.createChannel')
    expect(push).toContain("id: 'orders'")
    expect(push).toContain("registerPlugin<NativeFcmTokenPlugin>('NativeFcmToken')")
    expect(push).toContain("persistFirebaseToken(firebaseToken, 'ios')")
    expect(push).not.toContain("persistFirebaseToken(token.value, 'ios')")
    expect(push).toContain("window.dispatchEvent(new CustomEvent('hdl:push-received'))")
    expect(nativeFcm).toContain('Messaging.messaging().token')
    expect(nativeFcm).toContain('didReceiveRegistrationToken fcmToken')
    expect(appDelegate.match(/FirebaseApp\.configure\(\)/g)).toHaveLength(1)
    expect(xcodeProject).toContain('FirebaseMessaging in Frameworks')
    expect(xcodeProject).toContain('GoogleService-Info.plist in Resources')
    expect(xcodeProject).toContain('APS_ENVIRONMENT = production')
    expect(entitlements).toContain('$(APS_ENVIRONMENT)')
    expect(infoPlist).toContain('<string>remote-notification</string>')
    expect(delivery).toContain('return sendPushNotification(message)')
    expect(delivery).not.toContain('sendApplePushNotification(message)')
  })
})
