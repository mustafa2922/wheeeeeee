import { useState, useEffect, useCallback } from 'react'
import { pushApi } from '../lib/api.js'
import { useAuth } from '../context/AuthContext.jsx'

/**
 * Manages push subscriptions for the current user.
 * subscribedIds — Set of mosque IDs the user has subscribed to
 */
export function useSubscriptions() {
  const { user }  = useAuth()
  const [subscribedIds, setSubscribedIds] = useState(new Set())
  const [loading,       setLoading]       = useState(false)

  useEffect(() => {
    if (!user) return
    pushApi.mySubscriptions()
      .then(ids => setSubscribedIds(new Set(ids)))
      .catch(() => {}) // silent — not critical
  }, [user])

  const toggle = useCallback(async (mosqueId, subscription) => {
    const isSubbed = subscribedIds.has(mosqueId)
    // Optimistic update
    setSubscribedIds(prev => {
      const next = new Set(prev)
      isSubbed ? next.delete(mosqueId) : next.add(mosqueId)
      return next
    })
    try {
      if (isSubbed) {
        await pushApi.unsubscribe({ mosque_id: mosqueId })
      } else {
        await pushApi.subscribe({ mosque_id: mosqueId, subscription })
      }
    } catch {
      // Revert on failure
      setSubscribedIds(prev => {
        const next = new Set(prev)
        isSubbed ? next.add(mosqueId) : next.delete(mosqueId)
        return next
      })
    }
  }, [subscribedIds])

  return { subscribedIds, toggle, loading }
}