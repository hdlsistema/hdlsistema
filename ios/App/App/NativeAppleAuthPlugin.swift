import AuthenticationServices
import Capacitor
import CryptoKit
import Security

@objc(NativeAppleAuthPlugin)
class NativeAppleAuthPlugin: CAPPlugin, CAPBridgedPlugin, ASAuthorizationControllerDelegate, ASAuthorizationControllerPresentationContextProviding {
    let identifier = "NativeAppleAuth"
    let jsName = "NativeAppleAuth"
    let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "signIn", returnType: CAPPluginReturnPromise)
    ]

    private var activeCall: CAPPluginCall?
    private var activeNonce: String?

    @objc func signIn(_ call: CAPPluginCall) {
        if activeCall != nil {
            call.reject("Ya hay un inicio de sesión con Apple en curso.", "apple_auth_in_progress")
            return
        }

        guard #available(iOS 13.0, *) else {
            call.reject("Sign in with Apple requiere iOS 13 o superior.", "apple_auth_unavailable")
            return
        }

        do {
            let nonce = try randomNonceString()
            activeCall = call
            activeNonce = nonce

            let request = ASAuthorizationAppleIDProvider().createRequest()
            request.requestedScopes = [.fullName, .email]
            request.nonce = sha256(nonce)

            let controller = ASAuthorizationController(authorizationRequests: [request])
            controller.delegate = self
            controller.presentationContextProvider = self
            controller.performRequests()
        } catch {
            call.reject("No fue posible preparar el acceso con Apple.", "apple_nonce_failed")
            clearActiveRequest()
        }
    }

    @available(iOS 13.0, *)
    func authorizationController(controller: ASAuthorizationController, didCompleteWithAuthorization authorization: ASAuthorization) {
        guard let call = activeCall else { return }
        defer { clearActiveRequest() }

        guard let credential = authorization.credential as? ASAuthorizationAppleIDCredential else {
            call.reject("Apple no devolvió una credencial válida.", "apple_invalid_credential")
            return
        }

        guard let tokenData = credential.identityToken,
              let identityToken = String(data: tokenData, encoding: .utf8),
              let nonce = activeNonce else {
            call.reject("Apple no devolvió un identity token válido.", "apple_missing_identity_token")
            return
        }

        var result: JSObject = [
            "identityToken": identityToken,
            "nonce": nonce
        ]

        if let email = credential.email {
            result["email"] = email
        }
        if let givenName = credential.fullName?.givenName {
            result["givenName"] = givenName
        }
        if let familyName = credential.fullName?.familyName {
            result["familyName"] = familyName
        }

        call.resolve(result)
    }

    @available(iOS 13.0, *)
    func authorizationController(controller: ASAuthorizationController, didCompleteWithError error: Error) {
        guard let call = activeCall else { return }
        defer { clearActiveRequest() }

        let nsError = error as NSError

        guard let authError = error as? ASAuthorizationError else {
            NSLog(
                "NativeAppleAuth error domain=%@ description=%@",
                nsError.domain,
                nsError.localizedDescription
            )
            call.reject(
                nsError.localizedDescription,
                "apple_auth_failed",
                error,
                [
                    "domain": nsError.domain,
                    "localizedDescription": nsError.localizedDescription
                ]
            )
            return
        }

        let appleErrorCode = appleAuthorizationErrorCode(authError.code)
        let rejectionCode = authError.code == .canceled
            ? "apple_cancelled"
            : "apple_authorization_\(appleErrorCode)"

        NSLog(
            "NativeAppleAuth error code=%@ rawCode=%ld domain=%@ description=%@",
            appleErrorCode,
            authError.code.rawValue,
            nsError.domain,
            nsError.localizedDescription
        )
        call.reject(
            nsError.localizedDescription,
            rejectionCode,
            error,
            [
                "appleErrorCode": appleErrorCode,
                "appleErrorRawValue": authError.code.rawValue,
                "domain": nsError.domain,
                "localizedDescription": nsError.localizedDescription
            ]
        )
    }

    @available(iOS 13.0, *)
    func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        return bridge?.viewController?.view.window ?? ASPresentationAnchor()
    }

    private func clearActiveRequest() {
        activeCall = nil
        activeNonce = nil
    }

    @available(iOS 13.0, *)
    private func appleAuthorizationErrorCode(_ code: ASAuthorizationError.Code) -> String {
        switch code {
        case .canceled:
            return "canceled"
        case .failed:
            return "failed"
        case .invalidResponse:
            return "invalidResponse"
        case .notHandled:
            return "notHandled"
        case .unknown:
            return "unknown"
        case .notInteractive:
            return "notInteractive"
        @unknown default:
            return "unknown"
        }
    }

    private func randomNonceString(length: Int = 32) throws -> String {
        let charset = Array("0123456789ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvwxyz-._")
        var result = ""
        var remainingLength = length

        while remainingLength > 0 {
            var randomByte: UInt8 = 0
            let status = SecRandomCopyBytes(kSecRandomDefault, 1, &randomByte)
            if status != errSecSuccess {
                throw NSError(domain: "NativeAppleAuthPlugin", code: Int(status))
            }
            if randomByte < charset.count {
                result.append(charset[Int(randomByte)])
                remainingLength -= 1
            }
        }

        return result
    }

    private func sha256(_ input: String) -> String {
        let data = Data(input.utf8)
        let digest = SHA256.hash(data: data)
        return digest.map { String(format: "%02x", $0) }.joined()
    }
}
