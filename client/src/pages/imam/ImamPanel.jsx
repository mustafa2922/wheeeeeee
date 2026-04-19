import { useState, useEffect }  from 'react'
import { Routes, Route, NavLink } from 'react-router-dom'
import { useLang }               from '../../context/LangContext.jsx'
import { useAuth }               from '../../context/AuthContext.jsx'
import { useToast }              from '../../components/ui/Toast.jsx'
import { useMosque }             from '../../hooks/useMosques.js'
import { timesApi }              from '../../lib/api.js'
import TopBar                    from '../../components/layout/TopBar.jsx'
import Button                    from '../../components/ui/Button.jsx'
import Skeleton                  from '../../components/ui/Skeleton.jsx'
import EidForm                   from './EidForm.jsx'
import AuditLog                  from './AuditLog.jsx'
import '../super/SuperPanel.css'

// The five prayers an imam can edit + Jumma
const EDITABLE_PRAYERS = ['fajr', 'zuhr', 'asr', 'isha', 'jumma']

function ImamPanel() {
  const { t }             = useLang()
  const { role }          = useAuth()
  const toast             = useToast()
  const mosqueId          = role?.mosque_id
  const { mosque, loading } = useMosque(mosqueId)
  const basePath = '/imam'

  const tabs = [
    { to: basePath,        label: t('imam.tabs.times'),  end: true },
    { to: `${basePath}/eid`,   label: t('imam.tabs.eid') },
    { to: `${basePath}/history`, label: t('imam.tabs.history') },
  ]

  return (
    <div className="super">
      <TopBar title={t('imam.updateTimes')} showBack />

      <div className="super__tabs">
        {tabs.map(tab => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              `super__tab ${isActive ? 'super__tab--active' : ''}`
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </div>

      <div className="page-content super__content">
        {loading ? (
          <div>
            <Skeleton w="50%" h="20px" />
            <div style={{ marginTop: 'var(--space-5)' }}>
              <Skeleton w="100%" h="96px" radius="lg" />
            </div>
          </div>
        ) : (
          <Routes>
            <Route index element={<TimesTab mosque={mosque} mosqueId={mosqueId} />} />
            <Route path="eid" element={<EidForm mosqueId={mosqueId} />} />
            <Route path="history" element={<AuditLog mosqueId={mosqueId} />} />
          </Routes>
        )}
      </div>
    </div>
  )
}

// ── Times Tab ──
function TimesTab({ mosque, mosqueId }) {
  const { t } = useLang()
  const toast = useToast()
  
  // Local form state — mirrors current DB values
  const [fields,  setFields]  = useState({})
  const [saving,  setSaving]  = useState(false)
  const [dirty,   setDirty]   = useState(false)
  const [successFlash, setSuccessFlash] = useState(false)

  // Populate form from fetched mosque data
  useEffect(() => {
    if (!mosque?.prayer_times) return
    const pt = mosque.prayer_times
    setFields({
      fajr:    pt.fajr    ?? '',
      zuhr:    pt.zuhr    ?? '',
      asr:     pt.asr     ?? '',
      isha:    pt.isha    ?? '',
      jumma:   pt.jumma   ?? '',
    })
  }, [mosque])

  function handleChange(prayer, value) {
    setFields(prev => ({ ...prev, [prayer]: value }))
    setDirty(true)
  }

  async function handleSave() {
    setSaving(true)
    try {
      const payload = Object.fromEntries(
        Object.entries(fields).filter(([, v]) => v !== '')
      )
      await timesApi.update(mosqueId, payload)
      sessionStorage.removeItem('mosques_cache')
      setDirty(false)
      
      // Success flash animation
      setSuccessFlash(true)
      setTimeout(() => setSuccessFlash(false), 600)
      
      toast({ message: t('imam.saved'), type: 'success' })
    } catch (err) {
      toast({ message: err.message || t('errors.generic'), type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      {/* ── Mosque identity ── */}
      <div className="super__section-header">
        <div>
          <span className="imam__mosque-label">{t('imam.mosque')}</span>
          <h1 className="imam__mosque-title">{mosque?.name}</h1>
        </div>
      </div>

      {/* ── Prayer time fields ── */}
      <div className={`super__list ${successFlash ? 'super__list--success' : ''}`}>
        {EDITABLE_PRAYERS.map((prayer, idx) => (
          <div
            key={prayer}
            className="super__row"
          >
            <div className="super__row-info">
              <div className="super__row-title">{t(`prayers.${prayer}`)}</div>
            </div>
            <input
              type="time"
              className="super__form-input"
              style={{ width: '140px', textAlign: 'end', paddingInline: 'var(--space-3)' }}
              value={fields[prayer] ?? ''}
              onChange={e => handleChange(prayer, e.target.value)}
              aria-label={t(`prayers.${prayer}`)}
            />
          </div>
        ))}
        
        {/* Maghrib row — auto-computed */}
        <div className="super__row">
          <div className="super__row-info">
            <div className="super__row-title">{t('prayers.maghrib')}</div>
          </div>
          <div className="super__row-sub">{t('imam.maghribAuto')}</div>
        </div>
      </div>

      {/* Maghrib note — always auto-computed */}
      <p className="imam__maghrib-note">
        {t('prayers.maghrib')} — {t('common.auto')}
      </p>

      {/* ── Save button with dirty indicator ── */}
      <Button
        variant="primary"
        size="lg"
        fullWidth
        loading={saving}
        disabled={!dirty}
        onClick={handleSave}
        style={{ marginBottom: 'var(--space-6)' }}
      >
        {t('imam.saveChanges')}
        {dirty && <span className="imam__dirty-dot" />}
      </Button>
    </>
  )
}

export default ImamPanel