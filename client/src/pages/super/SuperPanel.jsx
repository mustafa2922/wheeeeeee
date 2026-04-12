import { useState, useEffect }  from 'react'
import { Routes, Route, NavLink } from 'react-router-dom'
import { useToast }             from '../../components/ui/Toast.jsx'
import { adminApi, mosquesApi } from '../../lib/api.js'
import TopBar                   from '../../components/layout/TopBar.jsx'
import Card                     from '../../components/ui/Card.jsx'
import Button                   from '../../components/ui/Button.jsx'
import Skeleton                 from '../../components/ui/Skeleton.jsx'
import Badge                    from '../../components/ui/Badge.jsx'
import MosqueRegisterForm       from '../admin/MosqueRegisterForm.jsx'
import './SuperPanel.css'

// Super admin reuses admin panels + adds its own global views
function SuperPanel() {
  return (
    <div className="super">
      <TopBar
        title="Super Admin"
        showBack
        rightSlot={<Badge variant="danger">Super</Badge>}
      />

      <div className="super__tabs">
        {[
          { to: '/super',           label: 'Overview',  end: true },
          { to: '/super/admins',    label: 'Admins' },
          { to: '/super/mosques',   label: 'Mosques' },
          { to: '/super/users',     label: 'Users' },
          { to: '/super/audit',     label: 'Audit Log' },
          { to: '/super/broadcast', label: 'Broadcast' },
        ].map(tab => (
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
        <Routes>
          <Route index             element={<SuperOverview />} />
          <Route path="admins"     element={<AdminManager />} />
          <Route path="mosques"    element={<MosqueRegisterForm />} />
          <Route path="users"      element={<UserList />} />
          <Route path="audit"      element={<GlobalAudit />} />
          <Route path="broadcast"  element={<Broadcast />} />
        </Routes>
      </div>
    </div>
  )
}

/* ── Global overview ── */
function SuperOverview() {
  const [stats,   setStats]   = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminApi.getStats().then(setStats).finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="super__stats">
      {[1,2,3,4].map(i => <Skeleton key={i} w="100%" h="96px" radius="lg" />)}
    </div>
  )

  return (
    <>
      <div className="super__stats">
        {[
          { label: 'Mosques',  value: stats?.mosque_count  ?? 0 },
          { label: 'Imams',    value: stats?.imam_count    ?? 0 },
        ].map(s => (
          <Card key={s.label} className="super__stat-card">
            <Card.Body>
              <p className="super__stat-label">{s.label}</p>
              <p className="super__stat-value">{s.value}</p>
            </Card.Body>
          </Card>
        ))}
      </div>

      <Card className="super__info-card">
        <Card.Body>
          <p className="super__info-text">
            You have full system access. Use tabs above to manage admins,
            mosques, users, audit logs, and broadcast announcements.
          </p>
        </Card.Body>
      </Card>
    </>
  )
}

/* ── Create city admin ── */
function AdminManager() {
  const toast  = useToast()
  const [users,   setUsers]   = useState([])
  const [cities,  setCities]  = useState([])
  const [form,    setForm]    = useState({ display_name: '', email: '', password: '', city_id: '' })
  const [loading, setLoading] = useState(false)
  const [loadingUsers, setLoadingUsers] = useState(true)

  useEffect(() => {
    adminApi.getUsers().then(setUsers).finally(() => setLoadingUsers(false))
    mosquesApi.getCities(1).then(setCities)
  }, [])

  function handleChange(key, val) {
    setForm(prev => ({ ...prev, [key]: val }))
  }

  async function handleCreate() {
    if (!form.email || !form.password || !form.display_name || !form.city_id) {
      toast({ message: 'All fields required', type: 'error' })
      return
    }
    setLoading(true)
    try {
      await adminApi.createAdmin({ ...form, city_id: Number(form.city_id) })
      toast({ message: 'City admin created', type: 'success' })
      setForm({ display_name: '', email: '', password: '', city_id: '' })
      adminApi.getUsers().then(setUsers)
    } catch (err) {
      toast({ message: err.message, type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h2 className="super__form-title">Create City Admin</h2>

      <Card className="super__form-card">
        {[
          { key: 'display_name', label: 'Name',     type: 'text'     },
          { key: 'email',        label: 'Email',    type: 'email'    },
          { key: 'password',     label: 'Password', type: 'password' },
        ].map(f => (
          <div key={f.key} className="super__field">
            <label className="super__label">{f.label}</label>
            <input type={f.type} className="super__input"
              value={form[f.key]}
              onChange={e => handleChange(f.key, e.target.value)}
            />
          </div>
        ))}
        <div className="super__field">
          <label className="super__label">City</label>
          <select className="super__input"
            value={form.city_id}
            onChange={e => handleChange('city_id', e.target.value)}
          >
            <option value="">Select city...</option>
            {cities.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </Card>

      <Button variant="primary" fullWidth loading={loading} onClick={handleCreate}>
        Create Admin
      </Button>

      {/* Existing users / roles list */}
      <h2 className="super__form-title" style={{ marginTop: 'var(--space-8)' }}>
        All Users &amp; Roles
      </h2>

      {loadingUsers
        ? <Skeleton w="100%" h="200px" radius="lg" />
        : (
          <Card>
            {users.map((u, idx) => (
              <div
                key={u.id}
                className={`super__user-row ${idx < users.length - 1 ? 'super__user-row--bordered' : ''}`}
              >
                <div>
                  <p className="super__user-role">{u.role}</p>
                  <p className="super__user-scope">
                    {u.mosques?.name ?? u.cities?.name ?? 'Global'}
                  </p>
                </div>
                <Badge
                  variant={
                    u.role === 'super_admin' ? 'danger'
                    : u.role === 'city_admin' ? 'warning'
                    : 'neutral'
                  }
                >
                  {u.role}
                </Badge>
              </div>
            ))}
          </Card>
        )
      }
    </div>
  )
}

/* ── Global user list ── */
function UserList() {
  const [users,   setUsers]   = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminApi.getUsers().then(setUsers).finally(() => setLoading(false))
  }, [])

  if (loading) return <Skeleton w="100%" h="300px" radius="lg" />

  return (
    <Card>
      {users.length === 0 && (
        <Card.Body>
          <p style={{ color: 'var(--text-tertiary)', textAlign: 'center' }}>No users yet</p>
        </Card.Body>
      )}
      {users.map((u, idx) => (
        <div
          key={u.id}
          className={`super__user-row ${idx < users.length - 1 ? 'super__user-row--bordered' : ''}`}
        >
          <div>
            <p className="super__user-role">{u.role}</p>
            <p className="super__user-scope">
              {u.mosques?.name ?? u.cities?.name ?? 'Global'}
            </p>
          </div>
          <Badge variant={u.role === 'super_admin' ? 'danger' : u.role === 'city_admin' ? 'warning' : 'neutral'}>
            {u.role}
          </Badge>
        </div>
      ))}
    </Card>
  )
}

/* ── Global audit log ── */
function GlobalAudit() {
  const [log,     setLog]     = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminApi.getAuditLog().then(setLog).finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
      {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} w="100%" h="60px" radius="md" />)}
    </div>
  )

  return (
    <Card>
      {log.length === 0 && (
        <Card.Body>
          <p style={{ color: 'var(--text-tertiary)', textAlign: 'center' }}>No changes yet</p>
        </Card.Body>
      )}
      {log.map((entry, idx) => (
        <div
          key={entry.id}
          className={`super__audit-row ${idx < log.length - 1 ? 'super__audit-row--bordered' : ''}`}
        >
          <div className="super__audit-mosque">{entry.mosques?.name ?? '—'}</div>
          <div className="super__audit-detail">
            <span className="super__audit-field">{entry.field}</span>
            <span>→</span>
            <span className="super__audit-new">{entry.new_value}</span>
          </div>
          <div className="super__audit-meta">
            {entry.users?.display_name} · {new Date(entry.created_at).toLocaleDateString()}
          </div>
        </div>
      ))}
    </Card>
  )
}

/* ── Broadcast announcement ── */
function Broadcast() {
  const toast  = useToast()
  const [form,    setForm]    = useState({ title: '', body: '', city_id: '' })
  const [loading, setLoading] = useState(false)
  const [cities,  setCities]  = useState([])

  useEffect(() => { mosquesApi.getCities(1).then(setCities) }, [])

  async function handleSend() {
    if (!form.title || !form.body) {
      toast({ message: 'Title and body required', type: 'error' })
      return
    }
    setLoading(true)
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/push/announce`,
        {
          method:  'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          },
          body: JSON.stringify(form),
        }
      )
      const { queued } = await res.json()
      toast({ message: `Sent to ${queued} mosques`, type: 'success' })
      setForm({ title: '', body: '', city_id: '' })
    } catch {
      toast({ message: 'Failed to send', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h2 className="super__form-title">Broadcast Announcement</h2>
      <Card className="super__form-card">
        <div className="super__field">
          <label className="super__label">Title</label>
          <input type="text" className="super__input"
            value={form.title}
            onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
          />
        </div>
        <div className="super__field">
          <label className="super__label">Message</label>
          <textarea
            className="super__input super__textarea"
            value={form.body}
            onChange={e => setForm(p => ({ ...p, body: e.target.value }))}
            rows={4}
          />
        </div>
        <div className="super__field">
          <label className="super__label">Scope (leave blank for global)</label>
          <select className="super__input"
            value={form.city_id}
            onChange={e => setForm(p => ({ ...p, city_id: e.target.value }))}
          >
            <option value="">All cities</option>
            {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </Card>
      <Button variant="primary" fullWidth loading={loading} onClick={handleSend}>
        Send Announcement
      </Button>
    </div>
  )
}

export default SuperPanel