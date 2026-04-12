import { useState, useMemo }    from 'react'
import { useLang }              from '../../context/LangContext.jsx'
import { useMosques }           from '../../hooks/useMosques.js'
import { useAreas }             from '../../hooks/useAreas.js'
import { useSubscriptions }     from '../../hooks/useSubscriptions.js'
import { usePushSubscription }  from '../../hooks/usePushSubscription.js'
import TopBar                   from '../../components/layout/TopBar.jsx'
import MosqueCard               from '../../components/mosque/MosqueCard.jsx'
import Skeleton                 from '../../components/ui/Skeleton.jsx'
import { ChevronDown }          from 'lucide-react'
import './Home.css'

function Home() {
  const { t }                            = useLang()
  const [selectedArea, setSelectedArea]  = useState('')

  const { mosques, loading, error }      = useMosques({ cityId: 1 })
  const { areas }                        = useAreas(1)
  const { subscribedIds, toggle }        = useSubscriptions()
  const { requestSubscription }          = usePushSubscription()

  // Filter mosques by selected area — pure derived state, no extra fetch
  const filtered = useMemo(() => {
    if (!selectedArea) return mosques
    return mosques.filter(m => String(m.area_id) === selectedArea)
  }, [mosques, selectedArea])

  async function handleSubscribeToggle(mosque) {
    let sub = null
    // Only request push permission if user is subscribing (not unsubscribing)
    if (!subscribedIds.has(mosque.id)) {
      sub = await requestSubscription()
    }
    toggle(mosque.id, sub)
  }

  return (
    <>
      <TopBar title={t('home.title')} />

      <div className="page-content">
        {/* ── Area filter ── */}
        <div className="home__filter">
          <div className="home__select-wrap">
            <select
              className="home__select"
              value={selectedArea}
              onChange={e => setSelectedArea(e.target.value)}
              aria-label={t('home.filterByArea')}
            >
              <option value="">{t('home.allAreas')}</option>
              {areas.map(a => (
                <option key={a.id} value={String(a.id)}>{a.name}</option>
              ))}
            </select>
            <ChevronDown
              className="home__select-icon"
              size={16}
              aria-hidden="true"
            />
          </div>
        </div>

        {/* ── Error state ── */}
        {error && (
          <p className="home__error" role="alert">{t('errors.network')}</p>
        )}

        {/* ── Loading skeletons ── */}
        {loading && !error && (
          <div className="home__list">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton.MosqueCard key={i} />
            ))}
          </div>
        )}

        {/* ── Mosque list ── */}
        {!loading && (
          <div className="home__list" role="list">
            {filtered.length === 0 && (
              <div className="home__empty">
                <p className="home__empty-title">{t('home.noMosques')}</p>
                <p className="home__empty-hint">{t('home.noMosquesHint')}</p>
              </div>
            )}

            {filtered.map(mosque => (
              <MosqueCard
                key={mosque.id}
                mosque={mosque}
                isSubscribed={subscribedIds.has(mosque.id)}
                onSubscribeToggle={() => handleSubscribeToggle(mosque)}
                role="listitem"
              />
            ))}
          </div>
        )}
      </div>
    </>
  )
}

export default Home