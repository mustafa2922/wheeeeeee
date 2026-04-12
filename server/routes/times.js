import { Router } from 'express'
import { supabaseAdmin } from '../lib/supabase.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requireRole } from '../middleware/requireRole.js'
import { queuePushNotification } from '../lib/push.js'
import SunCalc from 'suncalc'

const router = Router()

const PRAYER_FIELDS = ['fajr', 'zuhr', 'asr', 'isha', 'jumma']

// Imam updates prayer times for their mosque
router.patch('/:mosque_id', requireAuth, requireRole('imam', 'city_admin', 'super_admin'), async (req, res) => {
  const { mosque_id } = req.params

  // Imam can only update their own mosque
  if (req.role.role === 'imam' && req.role.mosque_id !== mosque_id)
    return res.status(403).json({ error: 'Not your mosque' })

  const updates = {}
  for (const field of PRAYER_FIELDS) {
    if (req.body[field] !== undefined) updates[field] = req.body[field]
  }
  if (req.body.maghrib_auto !== undefined) updates.maghrib_auto = req.body.maghrib_auto
  if (!Object.keys(updates).length)
    return res.status(400).json({ error: 'No valid fields provided' })

  updates.updated_by = req.user.sub
  updates.updated_at = new Date().toISOString()

  // Fetch old values for audit log
  const { data: old } = await supabaseAdmin
    .from('prayer_times').select('*').eq('mosque_id', mosque_id).single()

  const { error } = await supabaseAdmin
    .from('prayer_times').update(updates).eq('mosque_id', mosque_id)
  if (error) return res.status(500).json({ error: error.message })

  // Write audit log entries for each changed field
  const auditRows = Object.keys(updates)
    .filter(f => f !== 'updated_by' && f !== 'updated_at')
    .map(field => ({
      mosque_id,
      changed_by: req.user.sub,
      field,
      old_value: old?.[field]?.toString() ?? null,
      new_value: updates[field]?.toString() ?? null
    }))

  if (auditRows.length) await supabaseAdmin.from('audit_log').insert(auditRows)

  // Queue push notifications to all subscribers of this mosque
  await queuePushNotification({ mosque_id, type: 'times_updated', changes: updates })

  res.json({ success: true })
})

// Post Eid prayer
router.post('/:mosque_id/eid', requireAuth, requireRole('imam', 'city_admin', 'super_admin'), async (req, res) => {
  const { mosque_id } = req.params
  const { eid_type, prayer_date, prayer_time } = req.body

  if (!eid_type || !prayer_date || !prayer_time)
    return res.status(400).json({ error: 'eid_type, prayer_date, prayer_time required' })
  if (!['fitr', 'adha'].includes(eid_type))
    return res.status(400).json({ error: 'eid_type must be fitr or adha' })

  if (req.role.role === 'imam' && req.role.mosque_id !== mosque_id)
    return res.status(403).json({ error: 'Not your mosque' })

  const year = new Date(prayer_date).getFullYear()

  const { data, error } = await supabaseAdmin.from('eid_prayers').insert({
    mosque_id, eid_type, prayer_date, prayer_time, year, posted_by: req.user.sub
  }).select().single()

  if (error) return res.status(500).json({ error: error.message })

  await queuePushNotification({ mosque_id, type: 'eid_posted', eid_type, prayer_date, prayer_time })

  res.json(data)
})

// Get computed Maghrib time for a mosque (uses SunCalc)
router.get('/:mosque_id/maghrib', async (req, res) => {
  const { data: mosque } = await supabaseAdmin
    .from('mosques').select('lat, lng').eq('id', req.params.mosque_id).single()
  if (!mosque) return res.status(404).json({ error: 'Mosque not found' })

  const times = SunCalc.getTimes(new Date(), mosque.lat, mosque.lng)
  const sunset = times.sunset
  const hh = sunset.getHours().toString().padStart(2, '0')
  const mm = sunset.getMinutes().toString().padStart(2, '0')

  res.json({ maghrib: `${hh}:${mm}` })
})

// Audit log for a mosque
router.get('/:mosque_id/audit', requireAuth, requireRole('imam', 'city_admin', 'super_admin'), async (req, res) => {
  if (req.role.role === 'imam' && req.role.mosque_id !== req.params.mosque_id)
    return res.status(403).json({ error: 'Not your mosque' })

  const { data } = await supabaseAdmin
    .from('audit_log')
    .select('*, users:changed_by(display_name)')
    .eq('mosque_id', req.params.mosque_id)
    .order('created_at', { ascending: false })
    .limit(100)

  res.json(data)
})

export default router