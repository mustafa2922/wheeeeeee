import { createContext, useContext, useEffect, useState } from 'react'

const AuthContext = createContext(null)

function decodeToken(token) {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const decoded = JSON.parse(atob(parts[1]))
    return decoded
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null)
  const [role,    setRole]    = useState(null)
  const [loading, setLoading] = useState(true)

  // Hydrate from localStorage on mount
  useEffect(() => {
    const token = localStorage.getItem('auth_token')
    if (token) {
      const decoded = decodeToken(token)
      if (decoded && decoded.exp * 1000 > Date.now()) {
        // Token is valid
        setUser({ 
          userId: decoded.userId, 
          email: decoded.email, 
          mosque_id: decoded.mosque_id, 
          city_id: decoded.city_id 
        })
        setRole({ role: decoded.role })
      } else {
        // Token expired, clear it
        localStorage.removeItem('auth_token')
      }
    }
    setLoading(false)
  }, [])

  async function signIn(email, password) {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/sign-in`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    })

    if (!response.ok) {
      const err = await response.json()
      throw new Error(err.error || 'Sign in failed')
    }

    const { token, user } = await response.json()
    localStorage.setItem('auth_token', token)
    setUser({ 
      userId: user.id, 
      email: user.email, 
      mosque_id: user.mosque_id, 
      city_id: user.city_id 
    })
    setRole({ role: user.role })
    return { token, user }
  }

  async function signOut() {
    localStorage.removeItem('auth_token')
    setUser(null)
    setRole(null)
  }

  /* Convenience role checks */
  const isSuperAdmin = role?.role === 'super_admin'
  const isAdmin      = role?.role === 'admin'
  const isImam       = role?.role === 'imam'

  return (
    <AuthContext.Provider value={{
      user, role, loading,
      signIn, signOut,
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