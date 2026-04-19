import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider } from './context/ThemeContext.jsx'
import { LangProvider }  from './context/LangContext.jsx'
import { AuthProvider }  from './context/AuthContext.jsx'
import App from './App.jsx'
import './styles/global.css'

// Register service worker for offline support + push notifications
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(async reg => {
        const token = localStorage.getItem('waqt_token')
        if (!token) return  // not logged in, skip

        const existing = await reg.pushManager.getSubscription()
        if (!existing) return  // user hasn't granted permission yet

        // Save device subscription (fire and forget)
        fetch(`${import.meta.env.VITE_API_URL}/api/push/device-subscribe`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            subscription: existing.toJSON(),
            user_agent: navigator.userAgent
          })
        }).catch(() => {})  // silent failure OK
      })
      .catch(console.error)
  })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <LangProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </LangProvider>
    </ThemeProvider>
  </StrictMode>
)