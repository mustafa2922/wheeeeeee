import { useState, useEffect } from 'react'
import { getNextPrayer, formatCountdown } from '../lib/utils.js'

/**
 * Computes and live-counts down to the next prayer.
 * Updates every 30 seconds — sufficient precision, battery-friendly.
 * prayerTimes: { fajr, zuhr, asr, maghrib, isha }
 */
export function useNextPrayer(prayerTimes, lat, lng) {
  const [next,      setNext]      = useState(null)
  const [countdown, setCountdown] = useState('')

  useEffect(() => {
    if (!prayerTimes) return

    function tick() {
      const result = getNextPrayer(prayerTimes, lat, lng)
      if (result) {
        setNext(result)
        setCountdown(formatCountdown(result.msUntil))
      }
    }

    tick()
    const id = setInterval(tick, 30_000)
    return () => clearInterval(id)
  }, [prayerTimes, lat, lng])

  return { next, countdown }
}