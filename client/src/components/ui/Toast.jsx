import { createContext, useContext, useCallback, useRef, useState } from 'react'
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react'
import './Toast.css'

const ToastContext = createContext(null)

const ICONS = {
  success: CheckCircle,
  error:   AlertCircle,
  info:    Info,
}

let _id = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timers = useRef({})

  const dismiss = useCallback((id) => {
    clearTimeout(timers.current[id])
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const toast = useCallback(({ message, type = 'info', duration = 3500 }) => {
    const id = ++_id
    setToasts(prev => [...prev.slice(-3), { id, message, type }])
    timers.current[id] = setTimeout(() => dismiss(id), duration)
    return id
  }, [dismiss])

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="toast-stack" role="region" aria-label="Notifications" aria-live="polite">
        {toasts.map(t => {
          const Icon = ICONS[t.type] ?? Info
          return (
            <div key={t.id} className={`toast toast--${t.type}`} role="alert">
              <Icon className="toast__icon" size={18} aria-hidden="true" />
              <span className="toast__message">{t.message}</span>
              <button
                className="toast__close"
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss"
              >
                <X size={16} />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside ToastProvider')
  return ctx
}