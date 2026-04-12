import { Worker } from 'bullmq'
import { Redis } from 'ioredis'
import webpush from 'web-push'
import { supabaseAdmin } from '../lib/supabase.js'
import dotenv from 'dotenv'
dotenv.config()

webpush.setVapidDetails(
  process.env.VAPID_MAILTO,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
)

const connection = new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: null })

const worker = new Worker('push-notifications', async (job) => {
  const { mosque_id, type, ...rest } = job.data

  // Fetch mosque name for notification body
  const { data: mosque } = await supabaseAdmin
    .from('mosques').select('name').eq('id', mosque_id).single()

  // Fetch all push subscriptions for this mosque
  const { data: subs } = await supabaseAdmin
    .from('push_subscriptions')
    .select('subscription_json')
    .eq('mosque_id', mosque_id)

  if (!subs?.length) return

  let title, body

  if (type === 'times_updated') {
    const changedFields = Object.keys(rest.changes)
      .filter(f => f !== 'updated_by' && f !== 'updated_at' && f !== 'maghrib_auto')
      .join(', ')
    title = `${mosque.name}`
    body = `اوقات تبدیل ہوئے: ${changedFields}`
  } else if (type === 'eid_posted') {
    title = `${mosque.name} — عید نماز`
    body = `${rest.eid_type === 'fitr' ? 'عید الفطر' : 'عید الاضحی'}: ${rest.prayer_date} ${rest.prayer_time}`
  } else if (type === 'announcement') {
    title = rest.title || 'اعلان'
    body = rest.body || ''
  }

  const payload = JSON.stringify({ title, body, mosque_id, type })

  // Send to all subscribers, collect failed ones to remove
  const failed = []
  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(sub.subscription_json, payload)
      } catch (err) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          // Subscription expired — mark for removal
          failed.push(sub.subscription_json.endpoint)
        }
      }
    })
  )

  // Clean up dead subscriptions
  if (failed.length) {
    for (const endpoint of failed) {
      await supabaseAdmin
        .from('push_subscriptions')
        .delete()
        .eq('subscription_json->>endpoint', endpoint)
    }
  }
}, { connection })

worker.on('failed', (job, err) => console.error(`Push job ${job.id} failed:`, err))

export default worker