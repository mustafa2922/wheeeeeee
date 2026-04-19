import { useState, useEffect }  from 'react'
import { useNavigate }           from 'react-router-dom'
import { useLang }               from '../../context/LangContext.jsx'
import { useAuth }               from '../../context/AuthContext.jsx'
import { useToast }              from '../../components/ui/Toast.jsx'
import Button                    from '../../components/ui/Button.jsx'
import './SignIn.css'

// ── Minimalist SVG Icon Components ──
const Icons = {
  Eye: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  ),
  EyeOff: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/>
    </svg>
  )
}

/** Maps a user role to its dashboard route */
function dashboardFor(role) {
  if (role === 'super_admin') return '/super'
  if (role === 'admin')       return '/admin'
  if (role === 'imam')        return '/imam'
  return '/'
}

function SignIn() {
  const { t }                      = useLang()
  const { signIn, user }           = useAuth()
  const navigate                   = useNavigate()
  const toast                      = useToast()

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [showPass, setShowPass] = useState(false)

  // Already logged in — redirect immediately on mount
  useEffect(() => {
    if (user) navigate(dashboardFor(user.role), { replace: true })
  }, [user, navigate])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email.trim() || !password.trim()) {
      toast({ message: 'Email and password are required', type: 'error' })
      return
    }

    setLoading(true)
    try {
      // signIn returns the user object on success
      const loggedIn = await signIn(email.trim(), password)
      toast({ message: 'Signed in successfully!', type: 'success' })
      // Redirect based on the freshly returned user — no stale state
      navigate(dashboardFor(loggedIn.role), { replace: true })
    } catch (err) {
      toast({ message: err.message || t('errors.generic'), type: 'error' })
    } finally {
      // Always stop the spinner — success or failure
      setLoading(false)
    }
  }

  return (
    <div className="signin">
      <div className="signin__card">

        <div className="signin__brand">
          <div className="signin__brand-icon" aria-hidden="true" />
          <h1 className="signin__title">Waqt-e-Namaz</h1>
          <p className="signin__subtitle">{t('auth.signIn')}</p>
        </div>

        <form className="signin__form" onSubmit={handleSubmit} noValidate>
          <div className="signin__field">
            <label htmlFor="email" className="signin__label">
              {t('auth.email')}
            </label>
            <input
              id="email"
              type="email"
              className="signin__input"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
              autoCapitalize="none"
              inputMode="email"
              required
            />
          </div>

          <div className="signin__field">
            <label htmlFor="password" className="signin__label">
              {t('auth.password')}
            </label>
            <div className="signin__input-wrapper">
              <input
                id="password"
                type={showPass ? "text" : "password"}
                className="signin__input"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="signin__eye-btn"
                onClick={() => setShowPass(!showPass)}
                aria-label={showPass ? "Hide password" : "Show password"}
              >
                {showPass ? <Icons.Eye /> : <Icons.EyeOff />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            loading={loading}
            disabled={loading}
          >
            {t('auth.signIn')}
          </Button>
        </form>

        <p className="signin__register-hint">
          {t('auth.noAccount')}{' '}
          <a href="/register" className="signin__link">
            {t('auth.signUp')}
          </a>
        </p>

      </div>
    </div>
  )
}

export default SignIn