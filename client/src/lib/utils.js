import SunCalc from 'suncalc'

/**
 * Computes Maghrib time (sunset) for given coordinates and date.
 * Returns a "HH:MM" string in local time.
 */
export function getMaghribTime(lat, lng, date = new Date()) {
  const { sunset } = SunCalc.getTimes(date, lat, lng)
  if (!sunset || isNaN(sunset)) return null
  return sunset.toLocaleTimeString('en-GB', {
    hour: '2-digit', minute: '2-digit', hour12: false
  })
}

/**
 * Returns milliseconds until the next prayer from now.
 * prayerTimes: { fajr: "05:10", zuhr: "13:00", ... }
 */
export function getNextPrayer(prayerTimes, lat, lng) {
  const now = new Date()
  const today = now.toISOString().split('T')[0]

  const resolved = {
    ...prayerTimes,
    maghrib: getMaghribTime(lat, lng) ?? prayerTimes.maghrib,
  }

  const order = ['fajr', 'zuhr', 'asr', 'maghrib', 'isha']

  for (const name of order) {
    const time = resolved[name]
    if (!time) continue
    const [h, m] = time.split(':').map(Number)
    const prayerDate = new Date(`${today}T${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:00`)
    if (prayerDate > now) {
      return { name, time, msUntil: prayerDate - now }
    }
  }

  /* All prayers passed — next is Fajr tomorrow */
  const fajr = resolved.fajr
  if (fajr) {
    const [h, m] = fajr.split(':').map(Number)
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = tomorrow.toISOString().split('T')[0]
    const fajrTomorrow = new Date(`${tomorrowStr}T${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:00`)
    return { name: 'fajr', time: fajr, msUntil: fajrTomorrow - now }
  }

  return null
}

/** Formats milliseconds into "Xh Ym" or "Xm" */
export function formatCountdown(ms) {
  const totalMin = Math.floor(ms / 60000)
  const hours    = Math.floor(totalMin / 60)
  const minutes  = totalMin % 60
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

/** Formats a "HH:MM" 24h time string to 12h with AM/PM */
export function formatTime12(time24) {
  if (!time24) return '—'
  const [h, m] = time24.split(':').map(Number)
  const suffix = h >= 12 ? 'PM' : 'AM'
  const hour   = h % 12 || 12
  return `${hour}:${String(m).padStart(2,'0')} ${suffix}`
}

/** Returns true if today is Friday */
export function isFriday() {
  return new Date().getDay() === 5
}

/** Clamp a value between min and max */
export function clamp(val, min, max) {
  return Math.min(Math.max(val, min), max)
}