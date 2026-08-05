import { useEffect, useRef } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { customerClient } from '../../services/customer.service'
import { normalizeLanguage } from '../i18n'
import { useAppPreferences } from './AppPreferencesContext'

export function AppPreferencesAuthSync() {
  const { session, profile, roles, isLoading } = useAuth()
  const { language, setLanguage } = useAppPreferences()
  const loadedUser = useRef<string | null>(null)
  const persisted = useRef<string | null>(null)

  useEffect(() => {
    if (!session?.user?.id || isLoading) return
    if (loadedUser.current === session.user.id) return
    loadedUser.current = session.user.id

    const preferred = normalizeLanguage(profile?.preferred_language)
    persisted.current = preferred
    if (preferred !== language) setLanguage(preferred)
  }, [isLoading, language, profile?.preferred_language, session?.user?.id, setLanguage])

  useEffect(() => {
    if (!session?.access_token || isLoading) return
    if (!roles.includes('customer')) return
    if (persisted.current === language) return
    persisted.current = language

    customerClient
      .updateMe(session.access_token, { preferredLanguage: language })
      .catch(() => {
        persisted.current = null
      })
  }, [isLoading, language, roles, session?.access_token])

  return null
}
