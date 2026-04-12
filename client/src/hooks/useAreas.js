import { useState, useEffect } from 'react'
import { mosquesApi } from '../lib/api.js'

/** Fetches and caches area list for a city. Rarely changes — cached in memory. */
const _areaCache = {}

export function useAreas(cityId = 1) {
  const [areas,   setAreas]   = useState(_areaCache[cityId] ?? [])
  const [loading, setLoading] = useState(!_areaCache[cityId])

  useEffect(() => {
    if (_areaCache[cityId]) { setAreas(_areaCache[cityId]); return }
    mosquesApi.getAreas(cityId)
      .then(data => { _areaCache[cityId] = data; setAreas(data) })
      .finally(() => setLoading(false))
  }, [cityId])

  return { areas, loading }
}