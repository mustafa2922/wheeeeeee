import { useState, useEffect } from 'react'
import { Routes, Route, NavLink, useNavigate } from 'react-router-dom'
import { useLang }    from '../../context/LangContext.jsx'
import { useAuth }    from '../../context/AuthContext.jsx'
import { useToast }   from '../../components/ui/Toast.jsx'
import { adminApi, mosquesApi } from '../../lib/api.js'
import TopBar         from '../../components/layout/TopBar.jsx'
import Card           from '../../components/ui/Card.jsx'
import Button         from '../../components/ui/Button.jsx'
import Skeleton       from '../../components/ui/Skeleton.jsx'
import Badge          from '../../components/ui/Badge.jsx'
import MosqueRegisterForm from './MosqueRegisterForm.jsx'
import './AdminPanel.css'

function AdminPanel() {
  const { t }  = useLang()
  const { role } = useAuth()

  return (
    <div className="admin">
      <TopBar
        title="Admin Dashboard"
        showBack
        rightSlot={
          <Badge variant="accent">
            {role?.role === 'super_admin' ? 'Super Admin' : 'City Admin'}
          </Badge>
        }
      />

      {/* Sub-navigation tabs */}
      <div className="admin__tabs">
        {[
          { to: '/admin',          label: 'Overview',  end: true },
          { to: '/admin/mosque',   label: 'Mosques' },
          { to: '/admin/imam',     label: 'Imams' },
          { to: '/admin/audit',    label: 'Audit Log' },
        ].map(tab => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              `admin__tab ${isActive ? 'admin__tab--active' : ''}`
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </div>

      <div className="page-content admin__content">
        <Routes>
          <Route index              element={<AdminOverview />} />
          <Route path="mosque"      element={<MosqueRegisterForm />} />
          <Route path="imam"        element={<ImamManager />} />
          <Route path="audit"       element={<AdminAudit />} />
        </Routes>
      </div>
    </div>
  )
}

/* ── Overview stats ── */
function AdminOverview() {
  const [stats,   setStats]   = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminApi.getStats()
      .then(setStats)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="admin__stats">
      {[1,2].map(i => <Skeleton key={i} w="100%" h="96px" radius="lg" />)}
    </div>
  )

  return (
    <div className="admin__stats">
      <Card className="admin__stat-card">
        <Card.Body>
          <p className="admin__stat-label">Total Mosques</p>
          <p className="admin__stat-value">{stats?.mosque_count ?? 0}</p>
        </Card.Body>
      </Card>
      <Card className="admin__stat-card">
        <Card.Body>
          <p className="admin__stat-label">Total Imams</p>
          <p className="admin__stat-value">{stats?.imam_count ?? 0}</p>
        </Card.Body>
      </Card>
    </div>
  )
}

/* ── Imam manager — create imam credentials ── */
function ImamManager() {
  const toast    = useToast()
  const [mosques,  setMosques]  = useState([])
  const [form,     setForm]     = useState({ display_name: '', email: '', password: '', mosque_id: '' })
  const [loading,  setLoading]  = useState(false)

  useEffect(() => {
    mosquesApi.getAll('?city_id=1').then(setMosques)
  }, [])

  function handleChange(key, val) {
    setForm(prev => ({ ...prev, [key]: val }))
  }

  async function handleCreate() {
    if (!form.email || !form.password || !form.display_name || !form.mosque_id) {
      toast({ message: 'All fields required', type: 'error' })
      return
    }
    setLoading(true)
    try {
      await adminApi.createImam(form)
      toast({ message: 'Imam account created', type: 'success' })
      setForm({ display_name: '', email: '', password: '', mosque_id: '' })
    } catch (err) {
      toast({ message: err.message, type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h2 className="admin__form-title">Create Imam Account</h2>
      <Card className="admin__form-card">
        {[
          { key: 'display_name', label: 'Name',     type: 'text'     },
          { key: 'email',        label: 'Email',    type: 'email'    },
          { key: 'password',     label: 'Password', type: 'password' },
        ].map(field => (
          <div key={field.key} className="admin__field">
            <label className="admin__label">{field.label}</label>
            <input
              type={field.type}
              className="admin__input"
              value={form[field.key]}
              onChange={e => handleChange(field.key, e.target.value)}
            />
          </div>
        ))}

        <div className="admin__field">
          <label className="admin__label">Assign to Mosque</label>
          <select
            className="admin__input"
            value={form.mosque_id}
            onChange={e => handleChange('mosque_id', e.target.value)}
          >
            <option value="">Select mosque...</option>
            {mosques.map(m => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>
      </Card>

      <Button
        variant="primary"
        fullWidth
        loading={loading}
        onClick={handleCreate}
      >
        Create Imam
      </Button>
    </div>
  )
}

/* ── Audit log for city admin ── */
function AdminAudit() {
  const [log,     setLog]     = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminApi.getAuditLog().then(setLog).finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} w="100%" h="60px" radius="md" />
      ))}
    </div>
  )

  return (
    <Card>
      {log.length === 0 && (
        <Card.Body>
          <p style={{ color: 'var(--text-tertiary)', textAlign: 'center' }}>
            No changes yet
          </p>
        </Card.Body>
      )}
      {log.map((entry, idx) => (
        <div
          key={entry.id}
          className={`admin__audit-row ${idx < log.length - 1 ? 'admin__audit-row--bordered' : ''}`}
        >
          <div className="admin__audit-mosque">{entry.mosques?.name}</div>
          <div className="admin__audit-detail">
            <span className="admin__audit-field">{entry.field}</span>
            <span className="admin__audit-arrow">→</span>
            <span className="admin__audit-new">{entry.new_value}</span>
          </div>
          <div className="admin__audit-meta">
            {entry.users?.display_name} · {new Date(entry.created_at).toLocaleDateString()}
          </div>
        </div>
      ))}
    </Card>
  )
}

export default AdminPanel