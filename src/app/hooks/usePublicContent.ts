import { useCallback, useEffect, useState } from 'react'
import { publicContentClient, type ContentEntity, type ContentRecord } from '../../services/content.service'

type PublicContentState = {
  records: ContentRecord[]
  loading: boolean
  error: string | null
  retry: () => void
}

export function usePublicContent(entity: ContentEntity, locale: 'es-MX' | 'en-US' = 'es-MX'): PublicContentState {
  const [records, setRecords] = useState<ContentRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  const retry = useCallback(() => setReloadKey((value) => value + 1), [])

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)

    publicContentClient
      .list(entity, { locale })
      .then((response) => {
        if (!active) return
        setRecords(response.data)
      })
      .catch(() => {
        if (!active) return
        setRecords([])
        setError('No fue posible cargar el contenido publicado.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [entity, locale, reloadKey])

  return { records, loading, error, retry }
}
