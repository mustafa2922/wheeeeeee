import { useState, useEffect, useMemo } from 'react'
import { Routes, Route, NavLink, useNavigate, Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { useToast } from '../../components/ui/Toast.jsx'
import { adminApi, mosquesApi } from '../../lib/api.js'
import TopBar from '../../components/layout/TopBar.jsx'
import Card from '../../components/ui/Card.jsx'
import Button from '../../components/ui/Button.jsx'
import Skeleton from '../../components/ui/Skeleton.jsx'
import Badge from '../../components/ui/Badge.jsx'
import MosqueRegisterForm from '../admin/MosqueRegisterForm.jsx'
import './SuperPanel.css'

// ── Minimalist SVG Icon Components ──
const Icons = {
  Edit: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/>
    </svg>
  ),
  Trash: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/>
    </svg>
  ),
  X: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18"/><path d="M6 6l12 12"/>
    </svg>
  ),
  Eye: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  ),
  EyeOff: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/>
    </svg>
  ),
  Plus: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/>
    </svg>
  ),
  Globe: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="2" x2="22" y1="12" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
    </svg>
  ),
  Building: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><line x1="9" x2="9" y1="22" y2="22"/><line x1="15" x2="15" y1="22" y2="22"/><line x1="8" x2="8" y1="6" y2="6"/><line x1="12" x2="12" y1="6" y2="6"/><line x1="16" x2="16" y1="6" y2="6"/><line x1="8" x2="8" y1="10" y2="10"/><line x1="12" x2="12" y1="10" y2="10"/><line x1="16" x2="16" y1="10" y2="10"/><line x1="8" x2="8" y1="14" y2="14"/><line x1="12" x2="12" y1="14" y2="14"/><line x1="16" x2="16" y1="14" y2="14"/><line x1="8" x2="8" y1="18" y2="18"/><line x1="12" x2="12" y1="18" y2="18"/><line x1="16" x2="16" y1="18" y2="18"/>
    </svg>
  ),
  MapPin: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
    </svg>
  )
}

// ── Futuristic iOS Modal ──
function Modal({ title, isOpen, onClose, children }) {
  if (!isOpen) return null
  return (
    <div className="super__modal-overlay" onClick={onClose}>
      <div className="super__modal" onClick={e => e.stopPropagation()}>
        <div className="super__modal-header">
          <h3 className="super__modal-title">{title}</h3>
        </div>
        {children}
      </div>
    </div>
  )
}

// ── iOS Style Confirm Dialog ──
function ConfirmDialog({ isOpen, title, message, onConfirm, onCancel, confirmText = 'Delete', isDanger = true }) {
  if (!isOpen) return null
  return (
    <div className="super__modal-overlay" onClick={onCancel}>
      <div className="super__modal super__modal--confirm" onClick={e => e.stopPropagation()}>
        <div className="super__modal-header">
          <h3 className="super__modal-title">{title}</h3>
          <p className="super__modal-msg">{message}</p>
        </div>
        <div className="super__confirm-actions">
          <button className="super__confirm-btn super__confirm-btn--cancel" onClick={onCancel}>
            Cancel
          </button>
          <button 
            className={`super__confirm-btn ${isDanger ? 'super__confirm-btn--danger' : 'super__confirm-btn--primary'}`} 
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}

function SuperPanel() {
  const { role } = useAuth()
  const isSuper = role?.role === 'super_admin'
  const isCityAdmin = role?.role === 'admin'
  const basePath = isSuper ? '/super' : '/admin'

  const tabs = [
    { to: basePath,           label: 'Overview',  end: true },
  ]
  
  if (isSuper) {
    tabs.push({ to: `${basePath}/admins`,    label: 'Admins' })
    tabs.push({ to: `${basePath}/imams`,     label: 'Imams' })
    tabs.push({ to: `${basePath}/users`,     label: 'Users' })
  } else {
    tabs.push({ to: `${basePath}/imams`,     label: 'Imams' })
  }

  tabs.push({ to: `${basePath}/mosques`,   label: 'Masjids' })
  tabs.push({ to: `${basePath}/systems`,   label: 'Systems' })
  tabs.push({ to: `${basePath}/audit`,     label: 'Audit' })
  tabs.push({ to: `${basePath}/account`,   label: 'Account' })

  if (isSuper) {
    tabs.push({ to: '/super/broadcast', label: 'Broadcast' })
  }

  return (
    <div className="super">
      <TopBar
        title={isSuper ? "Global Control" : "City Dashboard"}
        showBack
        rightSlot={<Badge variant={isSuper ? "danger" : "accent"}>{isSuper ? "Super" : "Admin"}</Badge>}
      />

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
        <Routes>
          <Route index             element={<SuperOverview />} />
          
          {/* USER MANAGEMENT SEGMENTS */}
          <Route path="admins"     element={isSuper ? <AdminManager roleFilter="admin" /> : <Navigate to={basePath} />} />
          <Route path="imams"      element={<AdminManager roleFilter="imam" />} />
          <Route path="users"      element={isSuper ? <AdminManager roleFilter="user" /> : <Navigate to={basePath} />} />

          <Route path="mosques/*"  element={<MosqueManager />} />
          <Route path="systems"    element={<RegionManager />} />
          <Route path="audit"      element={<GlobalAudit />} />
          <Route path="account"    element={<AccountSettings />} />
          {isSuper && <Route path="broadcast"  element={<Broadcast />} />}
        </Routes>
      </div>
    </div>
  )
}

/* ── Activity Graph (Real Data SVG) ── */
function ActivityChart({ data = [] }) {
  const points = useMemo(() => {
    if (!data.length) return ""
    const max = Math.max(...data.map(d => d.count), 5)
    return data.map((d, i) => {
      const x = (i / (data.length - 1)) * 400
      const y = 100 - (d.count / max) * 80
      return `${x},${y}`
    }).join(' ')
  }, [data])

  const pathD = `M${points} L400,120 L0,120 Z`
  const strokeD = `M${points}`

  return (
    <div className="super__graph-card">
      <p className="super__graph-title">System Activity</p>
      <svg className="super__graph-svg" viewBox="0 0 400 120" preserveAspectRatio="none">
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.4" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={pathD} fill="url(#gradient)" />
        <path d={strokeD} fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" strokeJoin="round" />
        {data.map((d, i) => {
           const x = (i / (data.length - 1)) * 400
           const y = 100 - (d.count / Math.max(...data.map(d => d.count), 5)) * 80
           return <circle key={i} cx={x} cy={y} r="4" fill="white" stroke="var(--accent)" strokeWidth="2" />
        })}
      </svg>
    </div>
  )
}

/* ── Status Widget ── */
function Widget({ label, value, trend, isPositive = true }) {
  return (
    <div className="super__widget">
      <p className="super__widget-label">{label}</p>
      <div className="super__widget-value">
        {value}
        <span className="super__widget-trend" style={{ color: isPositive ? 'var(--success)' : 'var(--danger)' }}>
          {trend}
        </span>
      </div>
    </div>
  )
}

/* ── Overview ── */
function SuperOverview() {
  const [stats, setStats] = useState(null)
  const [activity, setActivity] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      adminApi.getStats(),
      adminApi.getActivity()
    ]).then(([s, a]) => {
      setStats(s)
      setActivity(a)
    }).finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="super__grid">
      {[1,2,3,4].map(i => <Skeleton key={i} h="96px" radius="20px" />)}
    </div>
  )

  return (
    <>
      <div className="super__grid">
        <Widget label="Live Masjids" value={stats?.mosque_count ?? 0} trend="+ Verified" />
        <Widget label="Active Imams"  value={stats?.imam_count   ?? 0} trend="+ Trusted" />
        <Widget label="Health"  value="100%" trend="Optimal" />
        <Widget label="Uptime"  value="99.9%" trend="Stable" />
      </div>

      <ActivityChart data={activity} />

      <Card variant="glass" className="super__info-card">
        <Card.Body>
          <p style={{ fontWeight: 800, fontSize: '14px', marginBottom: '8px', letterSpacing: '-0.02em' }}>OPERATIONAL CLEARANCE</p>
          <p className="super__info-text">
            Your credentials have been verified. All regional actions are now being logged to the tamper-proof ledger.
          </p>
        </Card.Body>
      </Card>
    </>
  )
}

/* ── Admin Management ── */
function AdminManager({ roleFilter }) {
  const { role, user } = useAuth()
  const isSuper = role?.role === 'super_admin'
  const isCityAdmin = role?.role === 'admin'
  const myCityId = role?.city_id
  const myId = user?.id

  const toast = useToast()
  const [users, setUsers] = useState([])
  const [countries, setCountries] = useState([])
  const [cities, setCities] = useState([])
  const [mosques, setMosques] = useState([])
  const [selectedCountryId, setSelectedCountryId] = useState('')
  const [selectedCityId, setSelectedCityId]       = useState('')

  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [editUser, setEditUser] = useState(null)
  const [isAddMode, setIsAddMode] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)

  const [selectedRole, setSelectedRole] = useState(roleFilter || 'imam')

  const fetchUsers = () => adminApi.getUsers().then(setUsers).finally(() => setLoading(false))
  
  const fetchCountries = () => {
    if (isSuper) {
      mosquesApi.getCountries().then(setCountries)
    }
  }

  // Chain: Country -> City
  useEffect(() => {
    if (selectedCountryId && isSuper) {
      mosquesApi.getCities(selectedCountryId).then(setCities)
      setSelectedCityId('')
    }
  }, [selectedCountryId, isSuper])

  // Chain: City -> Mosques
  const displayMosques = useMemo(() => {
    if (isSuper) {
      if (!selectedCityId) return []
      return mosques.filter(m => m.city_id == selectedCityId || m.areas?.city_id == selectedCityId)
    }
    return mosques.filter(m => m.city_id == myCityId || m.areas?.city_id == myCityId)
  }, [selectedCityId, mosques, isSuper, myCityId])

  const fetchInitialData = () => {
    fetchUsers()
    fetchCountries()
    mosquesApi.getAll().then(setMosques)
  }

  useEffect(() => { 
    setLoading(true)
    fetchInitialData()
  }, [roleFilter])

  const filtered = useMemo(() => 
    users.filter(u => 
      u.id !== myId && 
      u.role === (roleFilter === 'admin' ? 'admin' : roleFilter) && // Filter by specific tab role
      (
        u.display_name?.toLowerCase().includes(search.toLowerCase()) || 
        u.email?.toLowerCase().includes(search.toLowerCase())
      )
    ), [users, search, myId, roleFilter]
  )

  async function handleDelete() {
    setActionLoading(true)
    try {
      await adminApi.deleteUser(confirmDelete.id)
      toast({ message: 'Account erased successfully', type: 'success' })
      setConfirmDelete(null)
      fetchUsers()
    } catch (err) {
      toast({ message: err.message, type: 'error' })
    } finally {
      setActionLoading(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setActionLoading(true)
    const formData = new FormData(e.target)
    const data = Object.fromEntries(formData)
    
    if (isCityAdmin) {
      data.role = 'imam'
      data.city_id = myCityId
    }

    if (!data.password && !isAddMode) delete data.password

    try {
      if (isAddMode) {
        await adminApi.createAdmin(data)
        toast({ message: 'New profile initialized', type: 'success' })
      } else {
        await adminApi.updateUser(editUser.id, data)
        toast({ message: 'Profile updated', type: 'success' })
      }
      setEditUser(null)
      setIsAddMode(false)
      fetchUsers()
    } catch (err) {
      toast({ message: err.message, type: 'error' })
    } finally {
      setActionLoading(false)
    }
  }

  const getRoleLabel = (r) => {
    if (r === 'super_admin') return 'Super Admin'
    if (r === 'admin') return 'City Admin'
    if (r === 'user') return 'Member'
    return 'Imam'
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <input 
          type="text" className="super__search" 
          placeholder={`Filter ${roleFilter}s...`}
          style={{ marginBottom: 0 }}
          value={search} onChange={e => setSearch(e.target.value)}
        />
        <Button variant="primary" style={{ height: '40px', borderRadius: '12px', minWidth: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => { setIsAddMode(true); setSelectedRole(roleFilter); setShowPass(false); }}>
          <Icons.Plus />
        </Button>
      </div>

      <div className="super__list">
        {loading ? <Skeleton h="100px" /> : filtered.length === 0 ? (
           <div style={{ padding: '40px', textAlign: 'center', opacity: 0.5 }}>No {roleFilter}s found.</div>
        ) : filtered.map(u => (
          <div key={u.id} className="super__row">
            <div className="super__row-info">
              <p className="super__row-title">{u.display_name || 'System User'}</p>
              <p className="super__row-sub">
                <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{getRoleLabel(u.role)}</span>
                {u.mosques?.name ? ` · ${u.mosques.name}` : ''} · {u.email}
              </p>
            </div>
            <div className="super__row-actions">
              <button className="super__btn-icon" onClick={() => { setEditUser(u); setSelectedRole(u.role === 'admin' ? 'admin' : u.role); setShowPass(false); }}>
                <Icons.Edit />
              </button>
              <button className="super__btn-icon super__btn-icon--danger" onClick={() => setConfirmDelete(u)}>
                <Icons.Trash />
              </button>
            </div>
          </div>
        ))}
      </div>

      {isAddMode || !!editUser ? (
       <Modal 
        title={isAddMode ? `Create ${roleFilter}` : `Edit ${roleFilter}`} 
        isOpen={isAddMode || !!editUser} 
        onClose={() => { setEditUser(null); setIsAddMode(false); }}
      >
        <form onSubmit={handleSubmit}>
          {isAddMode && (
            <div className="super__form-group">
              <label className="super__form-label">Email Address</label>
              <input name="email" type="email" className="super__form-input" placeholder="user@example.com" required />
            </div>
          )}
          <div className="super__form-group">
            <label className="super__form-label">Display Name</label>
            <input name="display_name" className="super__form-input" defaultValue={editUser?.display_name} placeholder="Full Name" required />
          </div>
          <div className="super__form-group">
            <label className="super__form-label">Phone Number</label>
            <input name="phone" className="super__form-input" defaultValue={editUser?.phone} placeholder="+92 3xx..." required />
          </div>
          
          {isSuper && (
            <div className="super__form-group">
              <label className="super__form-label">Country Scope</label>
              <select 
                name="country_id" 
                className="super__form-input" 
                value={selectedCountryId}
                onChange={e => setSelectedCountryId(e.target.value)}
                required
              >
                <option value="">Select country...</option>
                {countries.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}

          {selectedRole === 'admin' && isSuper && (
            <div className="super__form-group">
              <label className="super__form-label">Regional Scope (City)</label>
              <select 
                name="city_id" 
                className="super__form-input" 
                value={selectedCityId}
                onChange={e => setSelectedCityId(e.target.value)}
                disabled={!selectedCountryId}
                required
              >
                <option value="">Select city...</option>
                {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}

          {selectedRole === 'imam' && (
            <div className="super__form-group">
              <label className="super__form-label">Location Scope (Masjid)</label>
              <select name="mosque_id" className="super__form-input" defaultValue={editUser?.mosque_id} required>
                <option value="">Select masjid...</option>
                {displayMosques.map(m => (
                   <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
              {isSuper && !selectedCityId && (
                <p className="mosque-reg__helper" style={{ fontSize: '11px', marginTop: '4px' }}>
                  Please select a country & city to see masjids.
                </p>
              )}
            </div>
          )}

          <div className="super__form-group">
            <label className="super__form-label">{isAddMode ? 'Secret Password' : 'New Password (leave blank to keep)'}</label>
            <div className="super__password-container">
               <input name="password" type={showPass ? "text" : "password"} className="super__form-input" required={isAddMode} />
               <button type="button" className="super__eye-btn" onClick={() => setShowPass(!showPass)}>
                 {showPass ? <Icons.Eye /> : <Icons.EyeOff />}
               </button>
            </div>
          </div>
          <Button variant="primary" fullWidth loading={actionLoading} style={{ marginTop: '12px' }}>
            {isAddMode ? 'Initialize Profile' : 'Confirm Updates'}
          </Button>
        </form>
      </Modal>
      ) : null}

      <ConfirmDialog 
        isOpen={!!confirmDelete} 
        title="Revoke Access?" 
        message={`Are you sure you want to completely erase ${confirmDelete?.display_name || 'this user'}?`} 
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  )
}

/* ── Account / Personal Profile Settings ── */
function AccountSettings() {
  const { user, signOut } = useAuth()
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)
  
  const [formData, setFormData] = useState({ 
    display_name: '', 
    phone: '',
    password: '' 
  })

  // Sync with current user data on load
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        display_name: user.display_name || '',
        phone: user.phone || ''
      }))
    }
  }, [user])

  async function handleUpdate(e) {
    e.preventDefault()
    setLoading(true)
    try {
      const data = { ...formData }
      if (!data.password) delete data.password
      
      await adminApi.updateUser(user.id, data)
      toast({ message: 'Personal profile updated', type: 'success' })
      setFormData(prev => ({ ...prev, password: '' }))
      setShowPass(false)
    } catch (err) {
      toast({ message: err.message, type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="super__account">
      <h3 className="super__form-title">Personal Settings</h3>
      <Card variant="glass">
        <Card.Body>
          <form onSubmit={handleUpdate}>
            <div className="super__form-group">
              <label className="super__form-label">Display Name</label>
              <input 
                className="super__form-input" 
                value={formData.display_name} 
                onChange={e => setFormData(p => ({ ...p, display_name: e.target.value }))}
                placeholder="Your name" required 
              />
            </div>
            <div className="super__form-group">
              <label className="super__form-label">Phone Number</label>
              <input 
                className="super__form-input" 
                value={formData.phone} 
                onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))}
                placeholder="+92 3xx..." required
              />
            </div>
            <div className="super__form-group">
              <label className="super__form-label">Update Password</label>
              <div className="super__password-container">
                <input 
                  type={showPass ? "text" : "password"} className="super__form-input" 
                  value={formData.password}
                onChange={e => setFormData(p => ({ ...p, password: e.target.value }))}
                  placeholder="Leave blank to keep current" 
                />
                <button type="button" className="super__eye-btn" onClick={() => setShowPass(!showPass)}>
                  {showPass ? <Icons.Eye /> : <Icons.EyeOff />}
                </button>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
              <Button variant="primary" fullWidth loading={loading}>Save Account Changes</Button>
              <Button variant="danger" type="button" onClick={signOut}>Sign Out</Button>
            </div>
          </form>
        </Card.Body>
      </Card>

      <Card variant="glass" style={{ marginTop: '20px', borderColor: 'rgba(255,255,255,0.05)' }}>
        <Card.Body>
          <p style={{ opacity: 0.5, fontSize: '12px' }}>
            Account ID: {user?.id}
            <br />
            Email: {user?.email}
            <br />
            Level: {user?.role?.toUpperCase()}
          </p>
        </Card.Body>
      </Card>
    </div>
  )
}

/* ── Mosque Management ── */
function MosqueManager() {
  const toast = useToast()
  const navigate = useNavigate()
  const { role } = useAuth()
  const isSuper = role?.role === 'super_admin'
  const myCityId = role?.city_id

  const [mosques, setMosques] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [confirmDeactivate, setConfirmDeactivate] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)

  const fetchMosques = () => mosquesApi.getAll().then(setMosques).finally(() => setLoading(false))
  useEffect(() => { fetchMosques() }, [])

  const filtered = useMemo(() => 
    mosques.filter(m => (isSuper || m.areas?.city_id == myCityId) && m.name?.toLowerCase().includes(search.toLowerCase())),
    [mosques, search, isSuper, myCityId]
  )

  async function handleSoftDelete() {
    setActionLoading(true)
    try {
      await adminApi.deleteMosque(confirmDeactivate.id)
      toast({ message: 'Masjid status changed to Inactive', type: 'success' })
      setConfirmDeactivate(null)
      fetchMosques()
    } catch (err) {
      toast({ message: err.message, type: 'error' })
    } finally {
      setActionLoading(false)
    }
  }

  const navigatePath = isSuper ? '/super/mosques' : '/admin/mosques'

  return (
    <div>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <input 
          type="text" className="super__search" 
          placeholder="Filter masjids..." 
          style={{ marginBottom: 0 }}
          value={search} onChange={e => setSearch(e.target.value)}
        />
        <Button variant="primary" style={{ height: '40px', borderRadius: '12px', minWidth: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => navigate(`${navigatePath}/new`)}>
          <Icons.Plus />
        </Button>
      </div>

      <div className="super__list">
        {loading ? <Skeleton h="300px" /> : filtered.map(m => (
          <div key={m.id} className="super__row">
            <div className="super__row-info">
              <p className="super__row-title">{m.name}</p>
              <p className="super__row-sub">
                {m.areas?.name ?? 'Assigned Area'} · {m.is_active ? 'Active' : 'Inactive'}
              </p>
            </div>
            <div className="super__row-actions">
              <Badge variant={m.is_active ? 'success' : 'neutral'}>
                {m.is_active ? 'Live' : 'Off'}
              </Badge>
              <button 
                className="super__btn-icon super__btn-icon--danger" 
                onClick={() => setConfirmDeactivate(m)}
                disabled={!m.is_active}
              >
                <Icons.X />
              </button>
            </div>
          </div>
        ))}
      </div>

      <ConfirmDialog 
        isOpen={!!confirmDeactivate} 
        title="Deactivate Masjid?" 
        message={`Are you sure you want to turn off ${confirmDeactivate?.name}?`} 
        onConfirm={handleSoftDelete}
        onCancel={() => setConfirmDeactivate(null)}
        confirmText="Deactivate"
      />

      <Routes>
        <Route path="new" element={
          <Modal title="Register Masjid" isOpen onClose={() => navigate(navigatePath)}>
             <MosqueRegisterForm onSuccess={() => { fetchMosques(); navigate(navigatePath) }} />
          </Modal>
        } />
      </Routes>
    </div>
  )
}

/* ── Hierarchical Territorial Command Center ── */
function RegionManager() {
  const { role } = useAuth()
  const isSuper = role?.role === 'super_admin'
  const myCityId = role?.city_id

  const toast = useToast()
  
  // Data State
  const [countries, setCountries] = useState([])
  const [cities, setCities]       = useState([])
  const [areas, setAreas]         = useState([])
  
  // Selection State
  const [selCountry, setSelCountry] = useState(null)
  const [selCity, setSelCity]       = useState(null)
  
  // Loading State
  const [loading, setLoading] = useState(true)
  
  // UI State
  const [modalType, setModalType] = useState(null) // 'country' | 'city' | 'area' | null

  // Init: Fetch countries (Super) or resolve Admin's City metadata
  useEffect(() => {
    setLoading(true)
    if (isSuper) {
      mosquesApi.getCountries().then(setCountries).finally(() => setLoading(false))
    } else {
      // Dynamic Resolution for Admins
      mosquesApi.getCityDetail(myCityId).then(data => {
        if (data) {
          setSelCountry(data.countries)
          setCities([data])
          setSelCity(data)
        }
      }).finally(() => setLoading(false))
    }
  }, [isSuper, myCityId])

  // Drill Down: Cities
  useEffect(() => {
    if (selCountry) {
      setCities([])
      setSelCity(null)
      mosquesApi.getCities(selCountry.id).then(setCities)
    }
  }, [selCountry])

  // Drill Down: Areas
  useEffect(() => {
    if (selCity) {
      setAreas([])
      mosquesApi.getAreas(selCity.id).then(setAreas)
    }
  }, [selCity])

  async function handleAdd(e) {
    e.preventDefault()
    const data = Object.fromEntries(new FormData(e.target))
    try {
      if (modalType === 'country') {
        await adminApi.addCountry(data)
        toast({ message: 'Global territory registered', type: 'success' })
        mosquesApi.getCountries().then(setCountries)
      } else if (modalType === 'city') {
        data.country_id = selCountry.id
        await adminApi.addCity(data)
        toast({ message: 'New regional hub initialized', type: 'success' })
        mosquesApi.getCities(selCountry.id).then(setCities)
      } else if (modalType === 'area') {
        data.city_id = selCity.id
        await adminApi.addArea(data)
        toast({ message: 'Neighborhood mapping complete', type: 'success' })
        mosquesApi.getAreas(selCity.id).then(setAreas)
      }
      setModalType(null)
    } catch (err) { toast({ message: err.message, type: 'error' }) }
  }

  return (
    <div className="super__regions">
      <div className="super__territory-container">
        
        {/* Tier 1: Countries (Super Admin Only) */}
        {isSuper && (
          <div className="super__tier-column">
            <div className="super__tier-header">
              <h4 className="super__tier-title">Countries</h4>
              <button className="super__tier-add" onClick={() => setModalType('country')}>
                <Icons.Plus /> ADD
              </button>
            </div>
            <div className="super__tier-list">
              {loading ? <Skeleton h="120px" /> : countries.map(c => (
                <div key={c.id} 
                  className={`super__tier-item ${selCountry?.id === c.id ? 'super__tier-item--active' : ''}`}
                  onClick={() => setSelCountry(c)}
                >
                  <div className="super__row-info">
                    <p className="super__row-title">{c.name}</p>
                    <p className="super__row-sub">{c.code || 'GLO'}</p>
                  </div>
                  <Icons.Globe />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tier 2: Cities */}
        <div className="super__tier-column">
          <div className="super__tier-header">
            <h4 className="super__tier-title">Cities</h4>
            {isSuper && selCountry && (
              <button className="super__tier-add" onClick={() => setModalType('city')}>
                <Icons.Plus /> ADD
              </button>
            )}
          </div>
          <div className="super__tier-list">
            {!selCountry && isSuper ? (
              <div className="super__empty-state">Select a country</div>
            ) : cities.map(c => (
              <div key={c.id} 
                className={`super__tier-item ${selCity?.id === c.id ? 'super__tier-item--active' : ''}`}
                onClick={() => setSelCity(c)}
              >
                <div className="super__row-info">
                  <p className="super__row-title">{c.name}</p>
                  <p className="super__row-sub">{c.timezone}</p>
                </div>
                <Icons.Building />
              </div>
            ))}
          </div>
        </div>

        {/* Tier 3: Neighborhoods */}
        <div className="super__tier-column">
          <div className="super__tier-header">
            <h4 className="super__tier-title">Areas</h4>
            {selCity && (
              <button className="super__tier-add" onClick={() => setModalType('area')}>
                <Icons.Plus /> ADD
              </button>
            )}
          </div>
          <div className="super__tier-list">
            {!selCity ? (
              <div className="super__empty-state">Select a city</div>
            ) : areas.length === 0 ? (
              <div className="super__empty-state">No areas found</div>
            ) : areas.map(a => (
              <div key={a.id} className="super__tier-item">
                <div className="super__row-info">
                  <p className="super__row-title">{a.name}</p>
                </div>
                <Icons.MapPin />
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Futuristic Addition Modals */}
      <Modal 
        isOpen={!!modalType} 
        title={`Register New ${modalType === 'area' ? 'Neighborhood' : modalType}`} 
        onClose={() => setModalType(null)}
      >
        <form onSubmit={handleAdd}>
          <div className="super__form-group">
            <label className="super__form-label">Display Name</label>
            <input name="name" className="super__form-input" placeholder="Enter name..." required />
          </div>
          {modalType === 'city' && (
            <div className="super__form-group">
               <label className="super__form-label">Timezone</label>
               <input name="timezone" className="super__form-input" defaultValue="Asia/Karachi" required />
            </div>
          )}
          {modalType === 'country' && (
             <div className="super__form-group">
                <label className="super__form-label">Country Code</label>
                <input name="code" className="super__form-input" placeholder="e.g. PK" />
             </div>
          )}
          <Button variant="primary" fullWidth style={{ marginTop: '12px' }}>Initialize Region</Button>
        </form>
      </Modal>
    </div>
  )
}

/* ── Global Audit Log ── */
function GlobalAudit() {
  const [log, setLog] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminApi.getAuditLog().then(setLog).finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <div className="super__section-header">
        <h3 className="super__form-title">Regional Ledger</h3>
        <Badge variant="neutral">{log.length} Entries</Badge>
      </div>
      <div className="super__list">
        {loading ? <Skeleton h="400px" /> : (
          log.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', opacity: 0.5 }}>No recorded activity found.</div>
          ) : log.map((entry) => (
            <div key={entry.id} className="super__row">
              <div className="super__row-info">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <p className="super__row-title">{entry.mosques?.name ?? 'Global System'}</p>
                  <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', fontWeight: 600 }}>
                    {new Date(entry.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
                  <Badge variant="neutral" style={{ fontSize: '9px', textTransform: 'uppercase' }}>{entry.field.replace('_', ' ')}</Badge>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    → <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{entry.new_value}</span>
                  </p>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '4px' }}>
                  <p className="super__row-sub">
                    {entry.users?.display_name || 'System Auto'} · {new Date(entry.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

/* ── Broadcast ── */
function Broadcast() {
  const toast = useToast()
  const [form, setForm] = useState({ title: '', body: '', city_id: '' })
  const [loading, setLoading] = useState(false)
  const [cities, setCities] = useState([])

  useEffect(() => { mosquesApi.getCities(1).then(setCities) }, [])

  async function handleSend() {
    if (!form.title || !form.body) {
      toast({ message: 'Title and body required', type: 'error' })
      return
    }
    setLoading(true)
    try {
      const { queued } = await adminApi.announce(form)
      toast({ message: `Sent to ${queued} mosques`, type: 'success' })
      setForm({ title: '', body: '', city_id: '' })
    } catch {
      toast({ message: 'Failed to send', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card variant="glass">
      <Card.Body>
        <div className="super__form-group">
          <label className="super__form-label">Message Title</label>
          <input type="text" className="super__form-input"
            value={form.title} placeholder="Announcement Title"
            onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
          />
        </div>
        <div className="super__form-group">
          <label className="super__form-label">Body Content</label>
          <textarea
            className="super__form-input" 
            style={{ height: '120px', paddingBlock: '12px' }}
            value={form.body} placeholder="Write your system message..."
            onChange={e => setForm(p => ({ ...p, body: e.target.value }))}
          />
        </div>
        <div className="super__form-group">
          <label className="super__form-label">Broadcast Target</label>
          <select className="super__form-input"
            value={form.city_id}
            onChange={e => setForm(p => ({ ...p, city_id: e.target.value }))}
          >
            <option value="">All Regions (Global)</option>
            {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <Button variant="primary" fullWidth loading={loading} onClick={handleSend} style={{ marginTop: '12px' }}>
          Transmit Announcement
        </Button>
      </Card.Body>
    </Card>
  )
}

export default SuperPanel