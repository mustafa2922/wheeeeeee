import { useMemo }             from 'react'
import { useLang }             from '../../context/LangContext.jsx'
import { useAuth }             from '../../context/AuthContext.jsx'
import { useMosques }          from '../../hooks/useMosques.js'
import { useSubscriptions }    from '../../hooks/useSubscriptions.js'
import { usePushSubscription } from '../../hooks/usePushSubscription.js'
import TopBar                  from '../../components/layout/TopBar.jsx'
import MosqueCard              from '../../components/mosque/MosqueCard.jsx'
import Skeleton                from '../../components/ui/Skeleton.jsx'
import Button                  from '../../components/ui/Button.jsx'
import { Bell }                from 'lucide-react'
import './Subscriptions.css'

function Subscriptions() {
  const { t }                      = useLang()
  const { user }                   = useAuth()
  const { mosques, loading }       = useMosques({ cityId: 1 })
  const { subscribedIds, toggle }  = useSubscriptions()
  const { requestSubscription }    = usePushSubscription()

  const subscribed = useMemo(
    () => mosques.filter(m => subscribedIds.has(m.id)),
    [mosques, subscribedIds]
  )

  async function handleToggle(mosque) {
    let sub = null
    if (!subscribedIds.has(mosque.id)) sub = await requestSubscription()
    toggle(mosque.id, sub)
  }

  if (!user) return (
    <>
      <TopBar title={t('nav.subscriptions')} />
      <div className="page-content subs__guest">
        <Bell size={40} aria-hidden="true" />
        <p className="subs__guest-title">{t('auth.signIn')}</p>
        <Button variant="primary" onClick={() => location.href = '/sign-in'}>
          {t('auth.signIn')}
        </Button>
      </div>
    </>
  )

  return (
    <>
      <TopBar title={t('nav.subscriptions')} />
      <div className="page-content">
        {loading && (
          <div className="subs__list">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton.MosqueCard key={i} />)}
          </div>
        )}

        {!loading && subscribed.length === 0 && (
          <div className="subs__empty">
            <Bell size={36} aria-hidden="true" />
            <p className="subs__empty-title">{t('home.noMosques')}</p>
            <p className="subs__empty-hint">{t('home.noMosquesHint')}</p>
          </div>
        )}

        {!loading && subscribed.length > 0 && (
          <div className="subs__list" role="list">
            {subscribed.map(mosque => (
              <MosqueCard
                key={mosque.id}
                mosque={mosque}
                isSubscribed={true}
                onSubscribeToggle={() => handleToggle(mosque)}
                role="listitem"
              />
            ))}
          </div>
        )}
      </div>
    </>
  )
}

export default Subscriptions