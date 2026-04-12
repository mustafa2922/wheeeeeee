import { useState, useEffect }   from 'react'
import { useNavigate } from 'react-router-dom'
import { useLang }    from '../../context/LangContext.jsx'
import { useAuth }    from '../../context/AuthContext.jsx'
import { useToast }   from '../../components/ui/Toast.jsx'
import Button         from '../../components/ui/Button.jsx'
import './SignIn.css'

function SignIn() {
  const { t }      = useLang()
  const { signIn, user, role, loading: authLoading } = useAuth()
  const navigate   = useNavigate()
  const toast      = useToast()

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)

  // If already signed in on mount, redirect immediately
  useEffect(() => {
    if (authLoading) return
    if (user) {
      console.log('Already signed in, redirecting to:', role?.role || 'home')
      setTimeout(() => {
        if (role?.role === 'super_admin') navigate('/super', { replace: true })
        else if (role?.role === 'city_admin') navigate('/admin', { replace: true })
        else if (role?.role === 'imam') navigate('/imam', { replace: true })
        else navigate('/', { replace: true })
      }, 100)
    }
  }, [user, role, authLoading, navigate])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email || !password) return
    setLoading(true)
    try {
      console.log('Attempting sign in with:', email)
      await signIn(email, password)
      console.log('Sign in successful')
      toast({ message: 'Signed in successfully!', type: 'success' })
    } catch (err) {
      setLoading(false)
      console.error('Sign in error:', err)
      toast({ message: err.message || 'Failed to sign in', type: 'error' })
    }
  }

  // Don't show form if loading auth context on initial mount
  if (authLoading) {
    return (
      <div className="signin">
        <div className="signin__card">
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
            {t('common.loading')}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="signin">
      <div className="signin__card">
        {/* Brand */}
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
              required
            />
          </div>

          <div className="signin__field">
            <label htmlFor="password" className="signin__label">
              {t('auth.password')}
            </label>
            <input
              id="password"
              type="password"
              className="signin__input"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            loading={loading}
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