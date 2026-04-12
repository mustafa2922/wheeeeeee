import { useState } from 'react'
import { useLang }  from '../../context/LangContext.jsx'
import { useToast } from '../../components/ui/Toast.jsx'
import { timesApi } from '../../lib/api.js'
import Card         from '../../components/ui/Card.jsx'
import Button       from '../../components/ui/Button.jsx'
import './ImamPanel.css'

function EidForm({ mosqueId }) {
  const { t }   = useLang()
  const toast   = useToast()
  const [form,    setForm]    = useState({ eid_type: 'fitr', prayer_date: '', prayer_time: '' })
  const [saving,  setSaving]  = useState(false)

  function handleChange(key, value) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function handleSubmit() {
    if (!form.prayer_date || !form.prayer_time) {
      toast({ message: t('errors.generic'), type: 'error' })
      return
    }
    setSaving(true)
    try {
      await timesApi.postEid(mosqueId, form)
      toast({ message: t('imam.saved'), type: 'success' })
      setForm({ eid_type: 'fitr', prayer_date: '', prayer_time: '' })
    } catch (err) {
      toast({ message: err.message || t('errors.generic'), type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="imam__section" aria-labelledby="eid-form-heading">
      <h2 id="eid-form-heading" className="imam__section-title">
        {t('imam.postEid')}
      </h2>

      <Card className="imam__times-card">
        {/* Eid type */}
        <div className="imam__row imam__row--bordered">
          <label htmlFor="eid-type" className="imam__row-label">
            {t('imam.eidType')}
          </label>
          <select
            id="eid-type"
            className="imam__select"
            value={form.eid_type}
            onChange={e => handleChange('eid_type', e.target.value)}
          >
            <option value="fitr">{t('eid.fitr')}</option>
            <option value="adha">{t('eid.adha')}</option>
          </select>
        </div>

        {/* Date */}
        <div className="imam__row imam__row--bordered">
          <label htmlFor="eid-date" className="imam__row-label">
            {t('imam.eidDate')}
          </label>
          <input
            id="eid-date"
            type="date"
            className="imam__time-input"
            value={form.prayer_date}
            onChange={e => handleChange('prayer_date', e.target.value)}
          />
        </div>

        {/* Time */}
        <div className="imam__row">
          <label htmlFor="eid-time" className="imam__row-label">
            {t('imam.eidTime')}
          </label>
          <input
            id="eid-time"
            type="time"
            className="imam__time-input"
            value={form.prayer_time}
            onChange={e => handleChange('prayer_time', e.target.value)}
          />
        </div>
      </Card>

      <Button
        variant="primary"
        fullWidth
        loading={saving}
        onClick={handleSubmit}
        className="imam__save-btn"
      >
        {t('imam.postEid')}
      </Button>
    </section>
  )
}

export default EidForm