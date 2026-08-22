import { useCallback, useEffect, useState } from 'react'
import { publicContentClient, type ContentEntity, type ContentRecord } from '../../services/content.service'
import { useAppPreferences } from '../context/AppPreferencesContext'

type PublicContentState = {
  records: ContentRecord[]
  loading: boolean
  error: string | null
  retry: () => void
}

export function usePublicContent(entity: ContentEntity, localeOverride?: 'es-MX' | 'en-US'): PublicContentState {
  const { locale, t } = useAppPreferences()
  const activeLocale = localeOverride ?? locale
  const [records, setRecords] = useState<ContentRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  const retry = useCallback(() => setReloadKey((value) => value + 1), [])

  useEffect(() => {
    const refresh = () => setReloadKey((value) => value + 1)
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') refresh()
    }

    window.addEventListener('focus', refresh)
    window.addEventListener('hdl:content-updated', refresh)
    window.addEventListener('hdl:push-received', refresh)
    document.addEventListener('visibilitychange', refreshWhenVisible)

    return () => {
      window.removeEventListener('focus', refresh)
      window.removeEventListener('hdl:content-updated', refresh)
      window.removeEventListener('hdl:push-received', refresh)
      document.removeEventListener('visibilitychange', refreshWhenVisible)
    }
  }, [])

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)

    publicContentClient
      .list(entity, { locale: activeLocale })
      .then((response) => {
        if (!active) return
        setRecords(response.data)
      })
      .catch((err: unknown) => {
        if (!active) return
        setRecords([])
        void err
        setError(t('app.publishedContentError'))
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [activeLocale, entity, reloadKey, t])

  return { records, loading, error, retry }
}
