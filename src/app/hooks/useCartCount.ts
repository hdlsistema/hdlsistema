import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { customerClient } from '../../services/customer.service'

export function useCartCount() {
  const { session } = useAuth()
  const [count, setCount] = useState(0)

  useEffect(() => {
    let active = true
    const token = session?.access_token
    if (!token) {
      setCount(0)
      return
    }

    customerClient
      .cart(token)
      .then((response) => {
        if (!active) return
        setCount(response.data.items.reduce((sum, item) => sum + Number(item.quantity ?? 0), 0))
      })
      .catch(() => {
        if (active) setCount(0)
      })

    return () => {
      active = false
    }
  }, [session?.access_token])

  return count
}
