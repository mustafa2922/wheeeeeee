import { useState, useEffect }  from 'react'
import { useLang }               from '../../context/LangContext.jsx'
import { useAuth }               from '../../context/AuthContext.jsx'
import { useToast }              from '../../components/ui/Toast.jsx'
import { useMosque }             from '../../hooks/useMosques.js'
import { timesApi }              from '../../lib/api.js'
import TopBar                    from '../../components/layout/TopBar.jsx'
import Card                      from '../../components/ui/Card.jsx'
import Button                    from '../../components/ui/Button.jsx'
import Skeleton                  from '../../components/ui/Skeleton.jsx'
import EidForm                   from './EidForm.jsx'
import AuditLog                  from './AuditLog.jsx'
import './ImamPanel.css'

// The five prayers an imam can edit + Jumma
const EDITABLE_PRAYERS = ['fajr', 'zuhr', 'asr', 'isha', 'jumma']

function ImamPanel() {
  const { t }             = useLang()
  const { role }          = useAuth()
  const toast             = useToast()
  const mosqueId          = role?.mosque_id
  const { mosque, loading } = useMosque(mosqueId)

  // Local form state — mirrors current DB values
  const [fields,  setFields]  = useState({})
  const [saving,  setSaving]  = useState(false)
  const [dirty,   setDirty]   = useState(false)

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
      // Only send fields that have a value
      const payload = Object.fromEntries(
        Object.entries(fields).filter(([, v]) => v !== '')
      )
      await timesApi.update(mosqueId, payload)
      // Bust session cache so home page reflects update
      sessionStorage.removeItem('mosques_cache')
      setDirty(false)
      toast({ message: t('imam.saved'), type: 'success' })
    } catch (err) {
      toast({ message: err.message || t('errors.generic'), type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <>
      <TopBar title={t('imam.updateTimes')} />
      <div className="page-content">
        <Skeleton w="50%" h="20px" />
        <div style={{ marginTop: 'var(--space-5)' }}>
          <Skeleton.MosqueCard />
        </div>
      </div>
    </>
  )

  return (
    <>
      <TopBar title={t('imam.updateTimes')} />

      <div className="page-content">

        {/* ── Mosque identity ── */}
        <div className="imam__mosque-name">
          <span className="imam__mosque-label">{t('imam.mosque')}</span>
          <h1 className="imam__mosque-title">{mosque?.name}</h1>
        </div>

        {/* ── Prayer time fields ── */}
        <Card className="imam__times-card">
          {EDITABLE_PRAYERS.map((prayer, idx) => (
            <div
              key={prayer}
              className={`imam__row ${idx < EDITABLE_PRAYERS.length - 1 ? 'imam__row--bordered' : ''}`}
            >
              <label
                htmlFor={`time-${prayer}`}
                className="imam__row-label"
              >
                {t(`prayers.${prayer}`)}
              </label>
              <input
                id={`time-${prayer}`}
                type="time"
                className="imam__time-input"
                value={fields[prayer] ?? ''}
                onChange={e => handleChange(prayer, e.target.value)}
                aria-label={t(`prayers.${prayer}`)}
              />
            </div>
          ))}
        </Card>

        {/* Maghrib note — always auto-computed */}
        <p className="imam__maghrib-note">
          {t('prayers.maghrib')} — {t('common.auto')}
        </p>

        {/* ── Save button ── */}
        <Button
          variant="primary"
          size="lg"
          fullWidth
          loading={saving}
          disabled={!dirty}
          onClick={handleSave}
          className="imam__save-btn"
        >
          {t('imam.saveChanges')}
        </Button>

        {/* ── Post Eid prayer ── */}
        <EidForm mosqueId={mosqueId} />

        {/* ── Audit / change history ── */}
        <AuditLog mosqueId={mosqueId} />

      </div>
    </>
  )
}

export default ImamPanel