import { useState }    from 'react'
import { useNavigate } from 'react-router-dom'
import { useLang }     from '../../context/LangContext.jsx'
import { useToast }    from '../../components/ui/Toast.jsx'
import { adminApi }    from '../../lib/api.js'
import Button          from '../../components/ui/Button.jsx'
import './SignIn.css'   // reuses same styles

function Register() {
  const { t }    = useLang()
  const navigate = useNavigate()
  const toast    = useToast()

  const [form,    setForm]    = useState({ display_name: '', email: '', password: '' })
  const [loading, setLoading] = useState(false)

  function handleChange(key, value) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.email || !form.password || !form.display_name) return
    setLoading(true)
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/api/auth/register`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(form),
      }).then(r => { if (!r.ok) throw new Error(); return r.json() })
      toast({ message: 'Account created! Please sign in.', type: 'success' })
      navigate('/sign-in')
    } catch {
      toast({ message: t('errors.generic'), type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="signin">
      <div className="signin__card">
        <div className="signin__brand">
          <div className="signin__brand-icon" aria-hidden="true" />
          <h1 className="signin__title">Waqt-e-Namaz</h1>
          <p className="signin__subtitle">{t('auth.signUp')}</p>
        </div>

        <form className="signin__form" onSubmit={handleSubmit} noValidate>
          <div className="signin__field">
            <label htmlFor="name" className="signin__label">{t('auth.displayName')}</label>
            <input id="name" type="text" className="signin__input"
              value={form.display_name}
              onChange={e => handleChange('display_name', e.target.value)}
              autoComplete="name" required />
          </div>
          <div className="signin__field">
            <label htmlFor="email" className="signin__label">{t('auth.email')}</label>
            <input id="email" type="email" className="signin__input"
              value={form.email}
              onChange={e => handleChange('email', e.target.value)}
              autoComplete="email" required />
          </div>
          <div className="signin__field">
            <label htmlFor="password" className="signin__label">{t('auth.password')}</label>
            <input id="password" type="password" className="signin__input"
              value={form.password}
              onChange={e => handleChange('password', e.target.value)}
              autoComplete="new-password" required />
          </div>
          <Button type="submit" variant="primary" size="lg" fullWidth loading={loading}>
            {t('auth.signUp')}
          </Button>
        </form>

        <p className="signin__register-hint">
          {t('auth.haveAccount')}{' '}
          <a href="/sign-in" className="signin__link">{t('auth.signIn')}</a>
        </p>
      </div>
    </div>
  )
}

export default Register