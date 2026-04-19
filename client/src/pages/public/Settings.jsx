import { useNavigate } from 'react-router-dom'
import { useLang }   from '../../context/LangContext.jsx'
import { useTheme, THEMES } from '../../context/ThemeContext.jsx'
import { useAuth }   from '../../context/AuthContext.jsx'
import TopBar        from '../../components/layout/TopBar.jsx'
import Card          from '../../components/ui/Card.jsx'
import Button        from '../../components/ui/Button.jsx'
import { LOCALES }   from '../../i18n/index.js'
import './Settings.css'

// Map theme name to a visual swatch color
const THEME_SWATCHES = {
  light:    '#ffffff',
  dark:     '#1c1c1e',
  warm:     '#fdf8f0',
  midnight: '#03111e',
}

function Settings() {
  const { t, lang, setLang, locales } = useLang()
  const { theme, setTheme }           = useTheme()
  const { user, role, signOut }       = useAuth()
  const navigate                      = useNavigate()

  return (
    <>
      <TopBar title={t('settings.title')} />

      <div className="page-content">

        {/* ── Language ── */}
        <h2 className="settings__section-label">{t('settings.language')}</h2>
        <Card className="settings__card">
          {Object.values(locales).map((locale, idx, arr) => (
            <div
              key={locale.meta.lang}
              className={[
                'settings__row',
                idx < arr.length - 1 && 'settings__row--bordered',
                lang === locale.meta.lang && 'settings__row--active',
              ].filter(Boolean).join(' ')}
              role="button"
              tabIndex={0}
              onClick={() => setLang(locale.meta.lang)}
              onKeyDown={e => (e.key === 'Enter') && setLang(locale.meta.lang)}
              aria-pressed={lang === locale.meta.lang}
            >
              <span className="settings__row-label">{locale.meta.label}</span>
              {lang === locale.meta.lang && (
                <span className="settings__check" aria-hidden="true" />
              )}
            </div>
          ))}
        </Card>

        {/* ── Theme ── */}
        <h2 className="settings__section-label">{t('settings.theme')}</h2>
        <div className="settings__themes">
          {THEMES.map(th => (
            <button
              key={th}
              className={`settings__theme-btn ${theme === th ? 'settings__theme-btn--active' : ''}`}
              onClick={() => setTheme(th)}
              aria-label={t(`themes.${th}`)}
              aria-pressed={theme === th}
            >
              <span
                className="settings__theme-swatch"
                style={{ background: THEME_SWATCHES[th] }}
              />
              <span className="settings__theme-label">{t(`themes.${th}`)}</span>
            </button>
          ))}
        </div>

        {/* ── Account ── */}
        {user && (
          <>
            <h2 className="settings__section-label">{t('common.save')}</h2>
            <Card className="settings__card">
              <div className="settings__row settings__row--bordered">
                <span className="settings__row-label">{user.email}</span>
                {role && (
                  <span className="settings__role-badge">{role.role}</span>
                )}
              </div>
              {/* Quick-jump to role dashboard */}
              {role?.role === 'imam' && (
                <div className="settings__row settings__row--bordered"
                  role="button" tabIndex={0}
                  onClick={() => navigate('/imam')}>
                  <span className="settings__row-label">{t('imam.updateTimes')}</span>
                  <span className="settings__chevron">›</span>
                </div>
              )}
              {(role?.role === 'admin') && (
                <div className="settings__row settings__row--bordered"
                  role="button" tabIndex={0}
                  onClick={() => navigate('/admin')}>
                  <span className="settings__row-label">Admin Dashboard</span>
                  <span className="settings__chevron">›</span>
                </div>
              )}
              {role?.role === 'super_admin' && (
                <div className="settings__row settings__row--bordered"
                  role="button" tabIndex={0}
                  onClick={() => navigate('/super')}>
                  <span className="settings__row-label">Super Admin Dashboard</span>
                  <span className="settings__chevron">›</span>
                </div>
              )}
              <div className="settings__row">
                <Button variant="danger" size="sm" onClick={signOut}>
                  {t('auth.signOut')}
                </Button>
              </div>
            </Card>
          </>
        )}

        {!user && (
          <Button variant="primary" fullWidth onClick={() => navigate('/sign-in')}>
            {t('auth.signIn')}
          </Button>
        )}

        {/* ── Donate ── */}
        <Card className="settings__donate">
          <Card.Body>
            <p className="settings__donate-title">{t('settings.donate')}</p>
            <p className="settings__donate-hint">{t('settings.donateHint')}</p>
          </Card.Body>
        </Card>

        {/* ── Version ── */}
        <p className="settings__version">v1.0.0 — MVP</p>

      </div>
    </>
  )
}

export default Settings