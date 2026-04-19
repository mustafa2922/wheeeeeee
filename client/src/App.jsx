import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ToastProvider }  from './components/ui/Toast.jsx'
import { useAuth }        from './context/AuthContext.jsx'
import { useLang }        from './context/LangContext.jsx'
import AppShell           from './components/layout/AppShell.jsx'

/* Pages — lazy loaded for fast initial paint */
import { lazy, Suspense } from 'react'
import Skeleton           from './components/ui/Skeleton.jsx'

const Home          = lazy(() => import('./pages/public/Home.jsx'))
const Nearby        = lazy(() => import('./pages/public/Nearby.jsx'))
const MosqueDetail  = lazy(() => import('./pages/public/MosqueDetail.jsx'))
const Subscriptions = lazy(() => import('./pages/public/Subscriptions.jsx'))
const SettingsPage  = lazy(() => import('./pages/public/Settings.jsx'))
const SignIn        = lazy(() => import('./pages/public/SignIn.jsx'))
const ImamPanel     = lazy(() => import('./pages/imam/ImamPanel.jsx'))
const AdminPanel    = lazy(() => import('./pages/admin/AdminPanel.jsx'))
const SuperPanel    = lazy(() => import('./pages/super/SuperPanel.jsx'))
const Register = lazy(() => import('./pages/public/Register.jsx'))

/* Route guard — redirects unauthenticated or unauthorized users */
function Protected({ children, requiredRole }) {
  const { user, role, loading } = useAuth()
  if (loading) return <PageFallback />
  if (!user)   return <Navigate to="/sign-in" replace />

  // Super admin can access everything
  if (role?.role === 'super_admin') return children

  if (requiredRole && role?.role !== requiredRole) {
    return <Navigate to="/" replace />
  }
  return children
}

/* Reverse guard — redirects signed-in users away from auth pages */
function PublicOnly({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <PageFallback />
  if (user) return <Navigate to="/" replace />
  return children
}

function PageFallback() {
  return (
    <div className="page-content">
      <Skeleton.MosqueCard />
      <div style={{ marginTop: 'var(--space-4)' }}>
        <Skeleton.MosqueCard />
      </div>
    </div>
  )
}

function App() {
  const { t }  = useLang()

  return (
    <ToastProvider>
      <BrowserRouter>
        <Suspense fallback={<PageFallback />}>
          <Routes>
            {/* ── Public shell ── */}
            <Route element={<AppShell />}>
              <Route index            element={<Home />} />
              <Route path="nearby"    element={<Nearby />} />
              <Route path="mosque/:id" element={<MosqueDetail />} />
              <Route path="subscriptions" element={<Subscriptions />} />
              <Route path="settings"  element={<SettingsPage />} />
            </Route>

            {/* ── Auth ── */}
            <Route path="sign-in" element={<PublicOnly><SignIn /></PublicOnly>} />
            <Route path="register" element={<PublicOnly><Register /></PublicOnly>} />

            {/* ── Imam ── */}
            <Route
              path="imam/*"
              element={
                <Protected requiredRole="imam">
                  <ImamPanel />
                </Protected>
              }
            />

            {/* ── City admin ── */}
            <Route
              path="admin/*"
              element={
                <Protected requiredRole="admin">
                  <SuperPanel />
                </Protected>
              }
            />

            {/* ── Super admin ── */}
            <Route
              path="super/*"
              element={
                <Protected requiredRole="super_admin">
                  <SuperPanel />
                </Protected>
              }
            />

            {/* ── Fallback ── */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ToastProvider>
  )
}

export default App