import { useState, useEffect, useMemo } from 'react'
import { useLang }   from '../../context/LangContext.jsx'
import { useMosques } from '../../hooks/useMosques.js'
import { useSubscriptions }    from '../../hooks/useSubscriptions.js'
import { usePushSubscription } from '../../hooks/usePushSubscription.js'
import TopBar        from '../../components/layout/TopBar.jsx'
import MosqueCard    from '../../components/mosque/MosqueCard.jsx'
import Skeleton      from '../../components/ui/Skeleton.jsx'
import Button        from '../../components/ui/Button.jsx'
import { MapPin }    from 'lucide-react'
import './Nearby.css'

function haversineKm(lat1, lng1, lat2, lng2) {
  const R    = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a    = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180)
    * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function Nearby() {
  const { t }                         = useLang()
  const { mosques, loading }          = useMosques({ cityId: 1 })
  const { subscribedIds, toggle }     = useSubscriptions()
  const { requestSubscription }       = usePushSubscription()
  const [coords,    setCoords]        = useState(null)
  const [gpsError,  setGpsError]      = useState(false)
  const [gpsLoading, setGpsLoading]   = useState(false)

  function requestLocation() {
    if (!navigator.geolocation) { setGpsError(true); return }
    setGpsLoading(true)
    navigator.geolocation.getCurrentPosition(
      pos => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setGpsLoading(false)
      },
      () => { setGpsError(true); setGpsLoading(false) }
    )
  }

  // Auto-request on mount
  useEffect(() => { requestLocation() }, [])

  // Sort by distance once we have GPS coords
  const sorted = useMemo(() => {
    if (!coords || !mosques.length) return []
    return [...mosques]
      .map(m => ({
        ...m,
        _distKm: (m.lat && m.lng)
          ? haversineKm(coords.lat, coords.lng, m.lat, m.lng)
          : Infinity,
      }))
      .sort((a, b) => a._distKm - b._distKm)
      .slice(0, 20) // show nearest 20
  }, [coords, mosques])

  async function handleSubscribeToggle(mosque) {
    let sub = null
    if (!subscribedIds.has(mosque.id)) sub = await requestSubscription()
    toggle(mosque.id, sub)
  }

  return (
    <>
      <TopBar title={t('nav.nearby')} />

      <div className="page-content">
        {/* GPS denied — manual retry */}
        {gpsError && (
          <div className="nearby__gps-error">
            <MapPin size={24} aria-hidden="true" />
            <p>{t('errors.generic')}</p>
            <Button variant="secondary" size="sm" onClick={requestLocation}>
              {t('home.nearbyFirst')}
            </Button>
          </div>
        )}

        {/* Waiting for GPS */}
        {(gpsLoading || (!coords && !gpsError)) && (
          <div className="nearby__list">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton.MosqueCard key={i} />
            ))}
          </div>
        )}

        {/* Sorted list */}
        {coords && !loading && (
          <div className="nearby__list" role="list">
            {sorted.map(mosque => (
              <div key={mosque.id} className="nearby__item">
                {mosque._distKm < Infinity && (
                  <span className="nearby__distance">
                    {mosque._distKm < 1
                      ? `${Math.round(mosque._distKm * 1000)}m`
                      : `${mosque._distKm.toFixed(1)}km`
                    }
                  </span>
                )}
                <MosqueCard
                  mosque={mosque}
                  isSubscribed={subscribedIds.has(mosque.id)}
                  onSubscribeToggle={() => handleSubscribeToggle(mosque)}
                  role="listitem"
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}

export default Nearby