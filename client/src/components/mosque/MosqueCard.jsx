import { useNavigate }       from 'react-router-dom'
import { Bell, BellOff, MapPin } from 'lucide-react'
import { useLang }           from '../../context/LangContext.jsx'
import { useNextPrayer }     from '../../hooks/useNextPrayer.js'
import { useAuth }           from '../../context/AuthContext.jsx'
import { formatTime12 }      from '../../lib/utils.js'
import Card                  from '../ui/Card.jsx'
import Badge                 from '../ui/Badge.jsx'
import Button                from '../ui/Button.jsx'
import './MosqueCard.css'

// Prayer display order — Jumma always last
const PRAYER_ORDER = ['fajr', 'zuhr', 'asr', 'maghrib', 'isha', 'jumma']

function MosqueCard({ mosque, isSubscribed, onSubscribeToggle }) {
  const navigate       = useNavigate()
  const { t }          = useLang()
  const { user }       = useAuth()
  const pt             = mosque.prayer_times ?? {}

  // Next prayer computed from this mosque's times — no server call
  const { next, countdown } = useNextPrayer(pt, mosque.lat, mosque.lng)

  function goToDetail(e) {
    // Prevent navigation if user tapped the subscribe button
    if (e.target.closest('.mosque-card__subscribe')) return
    navigate(`/mosque/${mosque.id}`)
  }

  return (
    <Card pressable className="mosque-card" onClick={goToDetail}>

      {/* ── Header ── */}
      <Card.Header className="mosque-card__header">
        <div className="mosque-card__title-wrap">
          <h2 className="mosque-card__name">{mosque.name}</h2>
          {mosque.name_roman && (
            <span className="mosque-card__name-roman">{mosque.name_roman}</span>
          )}
          {mosque.areas?.name && (
            <span className="mosque-card__area">
              <MapPin size={12} aria-hidden="true" />
              {mosque.areas.name}
            </span>
          )}
        </div>

        {/* Subscribe toggle — only shown to signed-in users */}
        {user && (
          <button
            className={`mosque-card__subscribe ${isSubscribed ? 'mosque-card__subscribe--active' : ''}`}
            onClick={e => { e.stopPropagation(); onSubscribeToggle() }}
            aria-label={isSubscribed ? t('mosque.unsubscribe') : t('mosque.subscribe')}
            aria-pressed={isSubscribed}
          >
            {isSubscribed
              ? <Bell    size={20} aria-hidden="true" />
              : <BellOff size={20} aria-hidden="true" />
            }
          </button>
        )}
      </Card.Header>

      {/* ── Next prayer highlight ── */}
      {next && (
        <div className="mosque-card__next-prayer">
          <span className="mosque-card__next-label">{t('home.nextPrayer')}</span>
          <span className="mosque-card__next-name">{t(`prayers.${next.name}`)}</span>
          <span className="mosque-card__next-time">{formatTime12(next.time)}</span>
          <Badge variant="accent" className="mosque-card__countdown">
            {countdown}
          </Badge>
        </div>
      )}

      {/* ── Prayer times grid ── */}
      <Card.Body className="mosque-card__times">
        {PRAYER_ORDER.map(prayer => {
          const time   = pt[prayer]
          const isNext = next?.name === prayer

          // Skip Jumma if not set
          if (prayer === 'jumma' && !time) return null

          return (
            <div
              key={prayer}
              className={`mosque-card__prayer ${isNext ? 'mosque-card__prayer--next' : ''}`}
            >
              <span className="mosque-card__prayer-name">
                {t(`prayers.${prayer}`)}
              </span>
              <span className="mosque-card__prayer-time">
                {time ? formatTime12(time) : (
                  <span className="mosque-card__pending">{t('mosque.pending')}</span>
                )}
              </span>
            </div>
          )
        })}
      </Card.Body>

      {/* ── Eid badge — shown when Eid prayer is posted and upcoming ── */}
      {hasUpcomingEid(mosque.eid_prayers) && (
        <Card.Footer className="mosque-card__eid">
          <Badge variant="success">
            {t('mosque.eidPrayer')} — {getUpcomingEidLabel(mosque.eid_prayers, t)}
          </Badge>
        </Card.Footer>
      )}

    </Card>
  )
}

/* ── Helpers — Eid logic ── */
function hasUpcomingEid(eidPrayers) {
  if (!eidPrayers?.length) return false
  const today = new Date().toISOString().split('T')[0]
  return eidPrayers.some(e => e.prayer_date >= today)
}

function getUpcomingEidLabel(eidPrayers, t) {
  if (!eidPrayers?.length) return ''
  const today = new Date().toISOString().split('T')[0]
  const next  = eidPrayers
    .filter(e => e.prayer_date >= today)
    .sort((a, b) => a.prayer_date.localeCompare(b.prayer_date))[0]
  if (!next) return ''
  return `${t(`eid.${next.eid_type}`)} · ${next.prayer_date}`
}

export default MosqueCard