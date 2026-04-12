import { NavLink } from 'react-router-dom'
import { Home, MapPin, Bell, Settings } from 'lucide-react'
import { useLang } from '../../context/LangContext.jsx'
import './BottomNav.css'

const NAV_ITEMS = [
  { to: '/',              labelKey: 'nav.home',          Icon: Home     },
  { to: '/nearby',        labelKey: 'nav.nearby',        Icon: MapPin   },
  { to: '/subscriptions', labelKey: 'nav.subscriptions', Icon: Bell     },
  { to: '/settings',      labelKey: 'nav.settings',      Icon: Settings },
]

function BottomNav() {
  const { t } = useLang()

  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      {NAV_ITEMS.map(({ to, labelKey, Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) =>
            ['bottom-nav__item', isActive && 'bottom-nav__item--active']
              .filter(Boolean).join(' ')
          }
          aria-label={t(labelKey)}
        >
          <Icon className="bottom-nav__icon" size={24} aria-hidden="true" />
          <span className="bottom-nav__label">{t(labelKey)}</span>
        </NavLink>
      ))}
    </nav>
  )
}

export default BottomNav