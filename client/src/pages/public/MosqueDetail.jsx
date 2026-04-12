import { useParams, useNavigate } from 'react-router-dom'
import { MapPin, ExternalLink }   from 'lucide-react'
import { useLang }                from '../../context/LangContext.jsx'
import { useAuth }                from '../../context/AuthContext.jsx'
import { useMosque }              from '../../hooks/useMosques.js'
import { useNextPrayer }          from '../../hooks/useNextPrayer.js'
import { useSubscriptions }       from '../../hooks/useSubscriptions.js'
import { usePushSubscription }    from '../../hooks/usePushSubscription.js'
import { formatTime12 }           from '../../lib/utils.js'
import TopBar                     from '../../components/layout/TopBar.jsx'
import Card                       from '../../components/ui/Card.jsx'
import Badge                      from '../../components/ui/Badge.jsx'
import Button                     from '../../components/ui/Button.jsx'
import Skeleton                   from '../../components/ui/Skeleton.jsx'
import { Bell, BellOff }          from 'lucide-react'
import './MosqueDetail.css'

const PRAYER_ORDER = ['fajr', 'zuhr', 'asr', 'maghrib', 'isha', 'jumma']

function MosqueDetail() {
  const { id }                       = useParams()
  const { t }                        = useLang()
  const { user }                     = useAuth()
  const { mosque, loading, error }   = useMosque(id)
  const { subscribedIds, toggle }    = useSubscriptions()
  const { requestSubscription }      = usePushSubscription()
  const pt                           = mosque?.prayer_times ?? {}
  const { next, countdown }          = useNextPrayer(pt, mosque?.lat, mosque?.lng)
  const isSubscribed                 = subscribedIds.has(id)

  async function handleSubscribeToggle() {
    let sub = null
    if (!isSubscribed) sub = await requestSubscription()
    toggle(id, sub)
  }

  function openInMaps() {
    const url = `https://www.google.com/maps?q=${mosque.lat},${mosque.lng}`
    window.open(url, '_blank', 'noopener')
  }

  if (loading) return (
    <>
      <TopBar showBack />
      <div className="page-content">
        <Skeleton w="70%" h="28px" radius="md" />
        <div style={{ marginTop: 'var(--space-3)' }}>
          <Skeleton w="45%" h="16px" radius="md" />
        </div>
        <div style={{ marginTop: 'var(--space-6)' }}>
          <Skeleton.MosqueCard />
        </div>
      </div>
    </>
  )

  if (error || !mosque) return (
    <>
      <TopBar showBack title={t('errors.notFound')} />
      <div className="page-content">
        <p className="detail__error">{t('errors.generic')}</p>
      </div>
    </>
  )

  return (
    <>
      <TopBar
        showBack
        title={mosque.name_roman || mosque.name}
        rightSlot={
          user && (
            <button
              className={`detail__sub-btn ${isSubscribed ? 'detail__sub-btn--active' : ''}`}
              onClick={handleSubscribeToggle}
              aria-label={isSubscribed ? t('mosque.unsubscribe') : t('mosque.subscribe')}
              aria-pressed={isSubscribed}
            >
              {isSubscribed ? <Bell size={20} /> : <BellOff size={20} />}
            </button>
          )
        }
      />

      <div className="page-content">

        {/* ── Mosque identity ── */}
        <div className="detail__identity">
          <h1 className="detail__name">{mosque.name}</h1>
          {mosque.name_roman && (
            <p className="detail__name-roman">{mosque.name_roman}</p>
          )}
          {mosque.areas?.name && (
            <span className="detail__area">
              <MapPin size={13} aria-hidden="true" />
              {mosque.areas.name}
              {mosque.areas.cities?.name && ` · ${mosque.areas.cities.name}`}
            </span>
          )}
        </div>

        {/* ── Next prayer hero ── */}
        {next && (
          <div className="detail__hero">
            <div className="detail__hero-label">{t('home.nextPrayer')}</div>
            <div className="detail__hero-prayer">{t(`prayers.${next.name}`)}</div>
            <div className="detail__hero-time">{formatTime12(next.time)}</div>
            <div className="detail__hero-countdown">
              <Badge variant="accent" size="md">{countdown}</Badge>
            </div>
          </div>
        )}

        {/* ── Full prayer times ── */}
        <Card className="detail__times-card">
          {PRAYER_ORDER.map((prayer, idx) => {
            const time   = pt[prayer]
            const isNext = next?.name === prayer
            if (prayer === 'jumma' && !time) return null
            const isLast = idx === PRAYER_ORDER.length - 1 || !pt['jumma']

            return (
              <div
                key={prayer}
                className={[
                  'detail__prayer-row',
                  isNext && 'detail__prayer-row--next',
                  !isLast && 'detail__prayer-row--bordered',
                ].filter(Boolean).join(' ')}
              >
                <span className="detail__prayer-name">
                  {t(`prayers.${prayer}`)}
                </span>
                <span className="detail__prayer-time">
                  {time
                    ? formatTime12(time)
                    : <span className="detail__pending">{t('mosque.pending')}</span>
                  }
                </span>
                {isNext && (
                  <Badge variant="accent" className="detail__next-badge">
                    {countdown}
                  </Badge>
                )}
              </div>
            )
          })}
        </Card>

        {/* ── Upcoming Eid ── */}
        {mosque.eid_prayers?.length > 0 && (
          <section className="detail__eid-section" aria-labelledby="eid-heading">
            <h2 id="eid-heading" className="detail__section-title">
              {t('eid.upcoming')}
            </h2>
            <div className="detail__eid-list">
              {mosque.eid_prayers
                .filter(e => e.prayer_date >= new Date().toISOString().split('T')[0])
                .sort((a, b) => a.prayer_date.localeCompare(b.prayer_date))
                .map(eid => (
                  <Card key={eid.id} className="detail__eid-card">
                    <Card.Body>
                      <Badge variant="success" size="md">
                        {t(`eid.${eid.eid_type}`)}
                      </Badge>
                      <p className="detail__eid-datetime">
                        {t('eid.prayerAt', {
                          time: formatTime12(eid.prayer_time),
                          date: eid.prayer_date,
                        })}
                      </p>
                    </Card.Body>
                  </Card>
                ))
              }
            </div>
          </section>
        )}

        {/* ── Map link ── */}
        {mosque.lat && mosque.lng && (
          <Button
            variant="secondary"
            fullWidth
            leftIcon={<MapPin size={18} />}
            rightIcon={<ExternalLink size={16} />}
            onClick={openInMaps}
            className="detail__map-btn"
          >
            {t('common.today')} · {mosque.areas?.name}
          </Button>
        )}

        {/* ── Last updated ── */}
        {pt.updated_at && (
          <p className="detail__updated">
            {t('mosque.updatedAt', {
              date: new Date(pt.updated_at).toLocaleDateString(),
            })}
          </p>
        )}

      </div>
    </>
  )
}

export default MosqueDetail