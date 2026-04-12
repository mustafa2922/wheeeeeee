import { Outlet } from 'react-router-dom'
import TopBar   from './TopBar.jsx'
import BottomNav from '../ui/BottomNav.jsx'

/**
 * Wraps every authenticated page.
 * title and rightSlot are passed via React Router's layout pattern
 * or overridden per-page by rendering TopBar directly.
 */
function AppShell({ title = '', showBack = false, rightSlot = null }) {
  return (
    <>
      <TopBar title={title} showBack={showBack} rightSlot={rightSlot} />
      <main className="page-content">
        <Outlet />
      </main>
      <BottomNav />
    </>
  )
}

export default AppShell