export const MOBILE_ONBOARDING_REPLAY_EVENT = 'hdl:mobile-onboarding-replay'

export function requestMobileOnboardingReplay() {
  window.dispatchEvent(new Event(MOBILE_ONBOARDING_REPLAY_EVENT))
}
