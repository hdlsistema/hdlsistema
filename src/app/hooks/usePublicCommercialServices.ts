import { useCallback, useEffect, useState } from 'react'
import { publicCommercialClient, type CommercialServices } from '../../services/commercial.service'
import { useAppPreferences } from '../context/AppPreferencesContext'

const emptyServices: CommercialServices = {
  experiences: [],
  cabins: [],
  restaurants: [],
  venueSpaces: [],
}

export type PublicCommercialServicesState = {
  services: CommercialServices
  loading: boolean
  error: string | null
  retry: () => void
}

export function usePublicCommercialServices(): PublicCommercialServicesState {
  const { locale, t } = useAppPreferences()
  const [services, setServices] = useState<CommercialServices>(emptyServices)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  const retry = useCallback(() => setReloadKey((value) => value + 1), [])

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)

    publicCommercialClient
      .services(locale)
      .then((response) => {
        if (!active) return
        setServices(response.data)
      })
      .catch((err: unknown) => {
        if (!active) return
        setServices(emptyServices)
        void err
        setError(t('app.publishedContentError'))
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [locale, reloadKey, t])

  return { services, loading, error, retry }
}
