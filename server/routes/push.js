import { Router } from 'express'
import { supabaseAdmin } from '../lib/supabase.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requireRole } from '../middleware/requireRole.js'
import { queuePushNotification } from '../lib/push.js'

const router = Router()

// Subscribe to a mosque
router.post('/subscribe', requireAuth, async (req, res) => {
  const { mosque_id, subscription } = req.body
  if (!mosque_id || !subscription)
    return res.status(400).json({ error: 'mosque_id and subscription required' })

  const { error } = await supabaseAdmin.from('push_subscriptions').upsert({
    user_id: req.user.sub,
    mosque_id,
    subscription_json: subscription
  }, { onConflict: 'user_id,mosque_id' })

  if (error) return res.status(500).json({ error: error.message })
  res.json({ success: true })
})

// Unsubscribe from a mosque
router.delete('/unsubscribe', requireAuth, async (req, res) => {
  const { mosque_id } = req.body
  await supabaseAdmin.from('push_subscriptions')
    .delete()
    .eq('user_id', req.user.sub)
    .eq('mosque_id', mosque_id)
  res.json({ success: true })
})

// Get which mosques the current user is subscribed to
router.get('/my-subscriptions', requireAuth, async (req, res) => {
  const { data } = await supabaseAdmin
    .from('push_subscriptions')
    .select('mosque_id')
    .eq('user_id', req.user.sub)
  res.json(data?.map(r => r.mosque_id) ?? [])
})

// Super admin broadcasts an announcement
router.post('/announce', requireAuth, requireRole('super_admin', 'city_admin'), async (req, res) => {
  const { title, body, city_id } = req.body

  // City admin scoped to their city
  const scope = req.role.role === 'city_admin' ? req.role.city_id : city_id

  // Get all mosque IDs in scope
  let mosquesQuery = supabaseAdmin
    .from('mosques').select('id, areas(city_id)').eq('is_active', true)

  const { data: mosques } = await mosquesQuery

  const targeted = scope
    ? mosques.filter(m => m.areas?.city_id === scope)
    : mosques

  for (const mosque of targeted) {
    await queuePushNotification({
      mosque_id: mosque.id, type: 'announcement', title, body
    })
  }

  res.json({ queued: targeted.length })
})

export default router