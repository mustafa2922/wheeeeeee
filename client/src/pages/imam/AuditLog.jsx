import { useState, useEffect } from 'react'
import { useLang }             from '../../context/LangContext.jsx'
import { timesApi }            from '../../lib/api.js'
import Card                    from '../../components/ui/Card.jsx'
import Skeleton                from '../../components/ui/Skeleton.jsx'
import './ImamPanel.css'

function AuditLog({ mosqueId }) {
  const { t }                    = useLang()
  const [log,     setLog]        = useState([])
  const [loading, setLoading]    = useState(true)

  useEffect(() => {
    if (!mosqueId) return
    timesApi.getAudit(mosqueId)
      .then(setLog)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [mosqueId])

  return (
    <section className="imam__section" aria-labelledby="audit-heading">
      <h2 id="audit-heading" className="imam__section-title">
        {t('imam.auditLog')}
      </h2>

      {loading && (
        <div className="imam__audit-list">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} w="100%" h="52px" radius="md" />
          ))}
        </div>
      )}

      {!loading && (
        <Card>
          {log.length === 0 && (
            <Card.Body>
              <p className="imam__audit-empty">{t('common.today')}</p>
            </Card.Body>
          )}
          {log.map((entry, idx) => (
            <div
              key={entry.id}
              className={`imam__audit-row ${idx < log.length - 1 ? 'imam__audit-row--bordered' : ''}`}
            >
              <div className="imam__audit-field">
                {t(`prayers.${entry.field}`) ?? entry.field}
              </div>
              <div className="imam__audit-change">
                <span className="imam__audit-old">{entry.old_value ?? '—'}</span>
                <span className="imam__audit-arrow">→</span>
                <span className="imam__audit-new">{entry.new_value ?? '—'}</span>
              </div>
              <div className="imam__audit-meta">
                {new Date(entry.created_at).toLocaleDateString()}
              </div>
            </div>
          ))}
        </Card>
      )}
    </section>
  )
}

export default AuditLog