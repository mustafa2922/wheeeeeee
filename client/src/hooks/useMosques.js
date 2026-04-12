import { useState, useEffect, useCallback } from 'react'
import { mosquesApi } from '../lib/api.js'
import { getMaghribTime } from '../lib/utils.js'

const CACHE_KEY = 'mosques_cache'
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

/**
 * Central mosque data hook.
 * - Serves from sessionStorage cache if fresh (avoids refetch on tab switch)
 * - Enriches each mosque with computed Maghrib time client-side
 * - Exposes filter helpers so pages don't repeat logic
 */
export function useMosques({ areaId = null, cityId = 1 } = {}) {
  const [mosques,  setMosques]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)

  const enrich = useCallback((list) =>
    list.map(m => {
      const pt = m.prayer_times?.[0] ?? m.prayer_times ?? {}
      const maghrib = (pt.maghrib_auto !== false && m.lat && m.lng)
        ? getMaghribTime(m.lat, m.lng)
        : pt.maghrib ?? null
      return { ...m, prayer_times: { ...pt, maghrib } }
    }), [])

  const fetchMosques = useCallback(async () => {
    // Check session cache first
    try {
      const raw = sessionStorage.getItem(CACHE_KEY)
      if (raw) {
        const { data, ts } = JSON.parse(raw)
        if (Date.now() - ts < CACHE_TTL) {
          setMosques(enrich(data))
          setLoading(false)
          return
        }
      }
    } catch { /* ignore corrupt cache */ }

    try {
      setLoading(true)
      const params = areaId  ? `?area_id=${areaId}`
                   : cityId  ? `?city_id=${cityId}`
                   : ''
      const data = await mosquesApi.getAll(params)
      sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() }))
      setMosques(enrich(data))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [areaId, cityId, enrich])

  useEffect(() => { fetchMosques() }, [fetchMosques])

  /** Call this after an imam updates times to bust cache */
  const invalidateCache = useCallback(() => {
    sessionStorage.removeItem(CACHE_KEY)
    fetchMosques()
  }, [fetchMosques])

  return { mosques, loading, error, refetch: invalidateCache }
}

/** Returns a single mosque from cache or fetches it */
export function useMosque(id) {
  const [mosque,  setMosque]  = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    if (!id) return

    // Try to find in session cache before making a network call
    try {
      const raw = sessionStorage.getItem(CACHE_KEY)
      if (raw) {
        const { data } = JSON.parse(raw)
        const found = data?.find(m => m.id === id)
        if (found) {
          const pt = found.prayer_times?.[0] ?? found.prayer_times ?? {}
          const maghrib = pt.maghrib_auto !== false && found.lat && found.lng
            ? getMaghribTime(found.lat, found.lng)
            : pt.maghrib ?? null
          setMosque({ ...found, prayer_times: { ...pt, maghrib } })
          setLoading(false)
          return
        }
      }
    } catch { /* fall through to fetch */ }

    mosquesApi.getOne(id)
      .then(data => {
        const pt = data.prayer_times ?? {}
        const maghrib = pt.maghrib_auto !== false && data.lat && data.lng
          ? getMaghribTime(data.lat, data.lng)
          : pt.maghrib ?? null
        setMosque({ ...data, prayer_times: { ...pt, maghrib } })
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [id])

  return { mosque, loading, error }
}