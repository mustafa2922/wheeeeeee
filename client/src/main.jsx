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
    navigator.serviceWorker.register('/sw.js').catch(console.error)
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