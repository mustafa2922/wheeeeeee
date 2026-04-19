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

  if (error) {
    console.error(`[${req.method} ${req.path}]`, error)
    return res.status(500).json({ error: error.message })
  }
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

// Subscribe device (browser push subscription, not mosque-specific)
router.post('/device-subscribe', requireAuth, async (req, res) => {
  const { subscription, user_agent } = req.body
  if (!subscription)
    return res.status(400).json({ error: 'subscription required' })

  const endpoint = subscription.endpoint

  const { error } = await supabaseAdmin.from('device_subscriptions').upsert({
    user_id: req.user.sub,
    subscription_json: subscription,
    endpoint,
    user_agent: user_agent || null,
    updated_at: new Date().toISOString()
  }, { onConflict: 'user_id,endpoint' })

  if (error) {
    console.error(`[${req.method} ${req.path}]`, error)
    return res.status(500).json({ error: error.message })
  }
  res.json({ success: true })
})

// Unsubscribe device
router.delete('/device-unsubscribe', requireAuth, async (req, res) => {
  const { endpoint } = req.body
  if (!endpoint)
    return res.status(400).json({ error: 'endpoint required' })

  const { error } = await supabaseAdmin.from('device_subscriptions')
    .delete()
    .eq('user_id', req.user.sub)
    .eq('endpoint', endpoint)

  if (error) {
    console.error(`[${req.method} ${req.path}]`, error)
    return res.status(500).json({ error: error.message })
  }
  res.json({ success: true })
})

// Super admin broadcasts an announcement
router.post('/announce', requireAuth, requireRole('super_admin'), async (req, res) => {
  const { title, body, target_imams, target_admins, target_users, city_id } = req.body

  if (!title || !body)
    return res.status(400).json({ error: 'title and body required' })

  if (!target_imams && !target_admins && !target_users)
    return res.status(400).json({ error: 'at least one target role must be selected' })

  // Build target roles array
  const targetRoles = []
  if (target_imams) targetRoles.push('imam')
  if (target_admins) targetRoles.push('admin')
  if (target_users) targetRoles.push('user')

  // Query users with device subscriptions
  let query = supabaseAdmin
    .from('users')
    .select('id, role, city_id, mosque_id, device_subscriptions(subscription_json)')
    .in('role', targetRoles)

  const { data: users, error: usersError } = await query
  if (usersError) {
    console.error(`[${req.method} ${req.path}]`, usersError)
    return res.status(500).json({ error: usersError.message })
  }

  // Filter by city_id if provided
  let filteredUsers = users
  if (city_id) {
    filteredUsers = users.filter(u => {
      if (u.role === 'imam') {
        // Imam: mosque must be in that city
        return u.mosque_id // Will need to check mosque city - skip for now, assume mosque_id implies city
      } else if (u.role === 'admin') {
        // Admin: user.city_id must match
        return u.city_id === city_id
      } else if (u.role === 'user') {
        // User: must have subscribed to at least one mosque in that city
        // This requires additional query - skip for now
        return true
      }
      return true
    })
  }

  // Collect all subscription_json values
  const subscriptions = []
  for (const user of filteredUsers) {
    if (user.device_subscriptions && user.device_subscriptions.length > 0) {
      for (const ds of user.device_subscriptions) {
        subscriptions.push(ds.subscription_json)
      }
    }
  }

  // Queue push notifications with pre-fetched subscription
  for (const subscription of subscriptions) {
    await queuePushNotification({
      subscription_json: subscription,
      type: 'announcement',
      title,
      body
    })
  }

  // Save to announcements table
  const { data: announcement, error: annError } = await supabaseAdmin
    .from('announcements')
    .insert({
      sent_by: req.user.sub,
      title,
      body,
      target_imams: target_imams || false,
      target_admins: target_admins || false,
      target_users: target_users || false,
      city_id: city_id || null,
      push_count: subscriptions.length
    })
    .select()
    .single()

  if (annError) {
    console.error(`[${req.method} ${req.path}]`, annError)
    return res.status(500).json({ error: annError.message })
  }

  res.json({ queued: subscriptions.length, announcement_id: announcement.id })
})

// Get announcements history
router.get('/announcements', requireAuth, requireRole('super_admin'), async (req, res) => {
  const { limit = 20, offset = 0 } = req.query
  const { data, error } = await supabaseAdmin
    .from('announcements')
    .select('*, users:sent_by(display_name)')
    .order('created_at', { ascending: false })
    .range(Number(offset), Number(offset) + Number(limit) - 1)
  if (error) {
    console.error(`[${req.method} ${req.path}]`, error)
    return res.status(500).json({ error: error.message })
  }
  res.json(data || [])
})

export default router