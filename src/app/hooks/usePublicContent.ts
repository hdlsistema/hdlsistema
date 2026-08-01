import { useEffect, useState } from 'react'
import { publicContentClient, type ContentEntity, type ContentRecord } from '../../services/content.service'

type PublicContentState = {
  records: ContentRecord[]
  loading: boolean
  error: string | null
}

export function usePublicContent(entity: ContentEntity): PublicContentState {
  const [records, setRecords] = useState<ContentRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)

    publicContentClient
      .list(entity, { locale: 'es-MX' })
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
  }, [entity])

  return { records, loading, error }
}
