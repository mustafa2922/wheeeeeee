import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, User } from 'lucide-react'
import { useLang } from '../../context/LangContext.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import './TopBar.css'

/**
 * title      — string shown in center
 * showBack   — shows back chevron (RTL-aware)
 * rightSlot  — optional JSX rendered on the right
 */
function TopBar({ title, showBack = false, rightSlot = null }) {
  const navigate    = useNavigate()
  const { meta }    = useLang()
  const { user }    = useAuth()
  const isRTL       = meta.dir === 'rtl'

  /* In RTL, "back" visually points right */
  const BackIcon = isRTL ? ChevronRight : ChevronLeft

  /* Profile icon: show user initial or default icon */
  const userInitial = user?.email?.charAt(0).toUpperCase() ?? null

  return (
    <header className="top-bar" role="banner">
      <div className="top-bar__left">
        {showBack && (
          <button
            className="top-bar__back"
            onClick={() => navigate(-1)}
            aria-label="Go back"
          >
            <BackIcon size={24} aria-hidden="true" />
          </button>
        )}
      </div>

      <h1 className="top-bar__title">{title}</h1>

      <div className="top-bar__right">
        {user && userInitial && (
          <div className="top-bar__profile" title={user.email}>
            {userInitial}
          </div>
        )}
        {rightSlot}
      </div>
    </header>
  )
}

export default TopBar