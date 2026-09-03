import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { LockKeyhole, X } from 'lucide-react'
import { useAuth } from '../../../contexts/AuthContext'
import { useAppPreferences } from '../../context/AppPreferencesContext'
import { appPath } from '../../utils/appRoutes'
import {
  MobileGuestAccessContext,
  isMobileGuestPublicPath,
  type GuestLinkEvent,
  type GuestPromptOptions,
} from './MobileGuestAccessContext'

export function MobileGuestAccessProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth()
  const { isEnglish } = useAppPreferences()
  const location = useLocation()
  const navigate = useNavigate()
  const [prompt, setPrompt] = useState<Required<GuestPromptOptions> | null>(null)

  const currentTarget = `${location.pathname}${location.search}${location.hash}`

  const requestAuth = useCallback((options?: GuestPromptOptions) => {
    const from = options?.from ?? currentTarget
    setPrompt({
      from,
      title: options?.title ?? (isEnglish ? 'Account required' : 'Cuenta requerida'),
      message: options?.message ?? (isEnglish ? 'Sign in or create your account to continue.' : 'Inicia sesión o crea tu cuenta para continuar'),
    })
  }, [currentTarget, isEnglish])

  const guardLink = useCallback((event: GuestLinkEvent, target: string, options?: GuestPromptOptions) => {
    if (isAuthenticated || isMobileGuestPublicPath(target)) return true
    event.preventDefault()
    requestAuth({ from: target, ...options })
    return false
  }, [isAuthenticated, requestAuth])

  const value = useMemo(() => ({ requestAuth, guardLink }), [guardLink, requestAuth])

  const closePrompt = () => setPrompt(null)
  const continueTo = (target: string) => {
    if (!prompt) return
    const from = prompt.from
    closePrompt()
    navigate(target, { state: { from } })
  }

  return (
    <MobileGuestAccessContext.Provider value={value}>
      {children}
      {prompt ? (
        <div
          className="mobile-guest-lock"
          role="dialog"
          aria-modal="true"
          aria-labelledby="mobile-guest-lock-title"
          aria-describedby="mobile-guest-lock-message"
        >
          <button
            type="button"
            className="mobile-guest-lock__shade"
            aria-label={isEnglish ? 'Cancel' : 'Cancelar'}
            onClick={closePrompt}
          />
          <section className="mobile-guest-lock__modal">
            <button
              type="button"
              className="mobile-guest-lock__close"
              aria-label={isEnglish ? 'Cancel' : 'Cancelar'}
              onClick={closePrompt}
            >
              <X size={16} strokeWidth={1.7} />
            </button>
            <span className="mobile-guest-lock__icon" aria-hidden="true">
              <LockKeyhole size={20} strokeWidth={1.6} />
            </span>
            <h2 id="mobile-guest-lock-title">{prompt.title}</h2>
            <p id="mobile-guest-lock-message">{prompt.message}</p>
            <div className="mobile-guest-lock__actions">
              <button type="button" className="mobile-guest-lock__primary" onClick={() => continueTo(appPath('/login'))}>
                {isEnglish ? 'Sign in' : 'Iniciar sesión'}
              </button>
              <button type="button" className="mobile-guest-lock__secondary" onClick={() => continueTo(appPath('/registro'))}>
                {isEnglish ? 'Create account' : 'Crear cuenta'}
              </button>
              <button type="button" className="mobile-guest-lock__ghost" onClick={closePrompt}>
                {isEnglish ? 'Cancel' : 'Cancelar'}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </MobileGuestAccessContext.Provider>
  )
}
