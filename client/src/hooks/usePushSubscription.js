import { useCallback, useState } from 'react'

const VAPID_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY

/** Converts the VAPID base64 key to Uint8Array for the browser API */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw     = window.atob(base64)
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)))
}

/**
 * Returns a function that requests push permission and returns
 * the PushSubscription object ready to send to the server.
 */
export function usePushSubscription() {
  const [permissionState, setPermissionState] = useState(
    () => typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
  )

  const requestSubscription = useCallback(async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return null

    const reg = await navigator.serviceWorker.ready
    const existing = await reg.pushManager.getSubscription()
    if (existing) return existing

    const sub = await reg.pushManager.subscribe({
      userVisibleOnly:      true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_KEY),
    })
    setPermissionState(Notification.permission)
    return sub
  }, [])

  return { permissionState, requestSubscription }
}