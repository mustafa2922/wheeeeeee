import { createContext, useContext, useEffect, useState, useCallback } from 'react'

const AuthContext  = createContext(null)
const TOKEN_KEY    = 'waqt_token'
const USER_KEY     = 'waqt_user'
const API_BASE     = import.meta.env.VITE_API_URL ?? 'http://localhost:4000'

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(() => {
    try { return JSON.parse(localStorage.getItem(USER_KEY)) } catch { return null }
  })
  const [loading, setLoading] = useState(true)

  // On mount: check if the user account is still valid/active
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) {
      setLoading(false)
      return
    }

    // Attempt a lightweight request to verify account status
    fetch(`${API_BASE}/api/auth/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => {
      if (res.status === 401) signOut()
    })
    .finally(() => setLoading(false))
  }, [])

  // Role convenience — derived from user.role directly
  const role         = user ? { role: user.role, mosque_id: user.mosque_id, city_id: user.city_id } : null
  const isSuperAdmin = user?.role === 'super_admin'
  const isAdmin      = user?.role === 'admin' || isSuperAdmin
  const isImam       = user?.role === 'imam'

  /** Attach token to every API request */
  function getToken() {
    return localStorage.getItem(TOKEN_KEY)
  }

  async function signIn(email, password, phone) {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, password, phone }),
      })

      const contentType = res.headers.get('content-type')
      if (contentType && contentType.includes('application/json')) {
        const data = await res.json()
        if (!res.ok) {
          console.error(`Login failed [${res.status}]:`, data.error)
          throw new Error(data.error ?? 'Login failed')
        }
        localStorage.setItem(TOKEN_KEY, data.token)
        localStorage.setItem(USER_KEY,  JSON.stringify(data.user))
        setUser(data.user)
        return data.user
      } else {
        const text = await res.text()
        console.error(`Unexpected response [${res.status}]:`, text.slice(0, 200))
        throw new Error(`Server error: ${res.status} ${res.statusText}`)
      }
    } finally {
      setLoading(false)
    }
  }

  async function register(email, password, display_name) {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, password, display_name }),
      })

      const contentType = res.headers.get('content-type')
      if (contentType && contentType.includes('application/json')) {
        const data = await res.json()
        if (!res.ok) {
          console.error(`Registration failed [${res.status}]:`, data.error)
          throw new Error(data.error ?? 'Registration failed')
        }
        localStorage.setItem(TOKEN_KEY, data.token)
        localStorage.setItem(USER_KEY,  JSON.stringify(data.user))
        setUser(data.user)
        return data.user
      } else {
        const text = await res.text()
        console.error(`Unexpected response [${res.status}]:`, text.slice(0, 200))
        throw new Error(`Server error: ${res.status} ${res.statusText}`)
      }
    } finally {
      setLoading(false)
    }
  }

  function signOut() {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{
      user, role, loading,
      signIn, register, signOut, getToken,
      isSuperAdmin, isAdmin, isImam,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}