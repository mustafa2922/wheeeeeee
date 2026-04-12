import { Queue } from 'bullmq'
import { Redis } from 'ioredis'

const connection = new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: null })

export const pushQueue = new Queue('push-notifications', { connection })

export async function queuePushNotification(payload) {
  await pushQueue.add('send', payload, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 }
  })
}