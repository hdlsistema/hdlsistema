import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../../../contexts/AuthContext'
import { trackAppActivity } from '../../../services/appActivity.service'
import { eventForAppPath } from '../../../services/appActivity.routes'
import { useAppPreferences } from '../../context/AppPreferencesContext'

export function AppActivityTracker() {
  const location = useLocation()
  const { session } = useAuth()
  const { language } = useAppPreferences()

  useEffect(() => {
    const event = eventForAppPath(location.pathname)
    if (!event) return
    trackAppActivity({
      ...event,
      accessToken: session?.access_token,
      metadata: { route: location.pathname, locale: language },
    })
  }, [language, location.pathname, session?.access_token])

  return null
}
