import { useEffect, useRef } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { updateCurrentPreferredLanguage } from '../../services/auth.service'
import { normalizeLanguage } from '../i18n'
import { useAppPreferences } from './AppPreferencesContext'

export function AppPreferencesAuthSync() {
  const { session, profile, isLoading } = useAuth()
  const { language, setLanguage } = useAppPreferences()
  const loadedUser = useRef<string | null>(null)
  const persisted = useRef<string | null>(null)

  useEffect(() => {
    if (!session?.user?.id || isLoading) return
    if (loadedUser.current === session.user.id) return
    loadedUser.current = session.user.id

    const profilePreferred = normalizeLanguage(profile?.preferred_language)
    const preferred = profilePreferred
    persisted.current = profilePreferred
    if (preferred !== language) setLanguage(preferred)
  }, [isLoading, language, profile?.preferred_language, session?.user?.id, setLanguage])

  useEffect(() => {
    if (!session?.user?.id || isLoading) return
    if (persisted.current === language) return
    persisted.current = language

    updateCurrentPreferredLanguage(session.user.id, language)
      .catch(() => {
        persisted.current = null
      })
  }, [isLoading, language, session?.user?.id])

  return null
}
