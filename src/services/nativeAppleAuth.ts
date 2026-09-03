import { registerPlugin } from '@capacitor/core'

export type NativeAppleCredential = {
  identityToken: string
  authorizationCode?: string
  nonce: string
  email?: string
  givenName?: string
  familyName?: string
}

type NativeAppleAuthPlugin = {
  signIn: () => Promise<NativeAppleCredential>
}

const NativeAppleAuth = registerPlugin<NativeAppleAuthPlugin>('NativeAppleAuth')

export function requestNativeAppleCredential() {
  return NativeAppleAuth.signIn()
}
