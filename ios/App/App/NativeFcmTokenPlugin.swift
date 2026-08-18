import Capacitor
import FirebaseMessaging

@objc(NativeFcmTokenPlugin)
class NativeFcmTokenPlugin: CAPPlugin, CAPBridgedPlugin, MessagingDelegate {
    let identifier = "NativeFcmToken"
    let jsName = "NativeFcmToken"
    let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getToken", returnType: CAPPluginReturnPromise)
    ]

    override func load() {
        Messaging.messaging().delegate = self
    }

    @objc func getToken(_ call: CAPPluginCall) {
        Messaging.messaging().token { token, error in
            if let error {
                call.reject("No fue posible obtener el token FCM.", "fcm_token_unavailable", error)
                return
            }
            guard let token, !token.isEmpty else {
                call.reject("Firebase no devolvió un token FCM.", "fcm_token_empty")
                return
            }
            call.resolve(["token": token])
        }
    }

    func messaging(_ messaging: Messaging, didReceiveRegistrationToken fcmToken: String?) {
        guard let fcmToken, !fcmToken.isEmpty else { return }
        notifyListeners("tokenReceived", data: ["token": fcmToken])
    }
}
