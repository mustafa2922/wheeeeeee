import { Router } from 'express'
import { supabaseAdmin } from '../lib/supabase.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requireRole } from '../middleware/requireRole.js'

const router = Router()

// Public — get all mosques with today's times, filterable by area/city
router.get('/', async (req, res) => {
  const { area_id, city_id, lat, lng } = req.query

  let query = supabaseAdmin
    .from('mosques')
    .select(`
      id, name, name_roman, lat, lng,
      areas(id, name, city_id, cities(id, name, timezone)),
      prayer_times(fajr, zuhr, asr, isha, jumma, maghrib_auto, updated_at)
    `)
    .eq('is_active', true)

  if (area_id) query = query.eq('area_id', area_id)
  if (city_id) query = query.eq('areas.city_id', city_id)

  const { data, error } = await query
  if (error) return res.status(500).json({ error: error.message })

  // If lat/lng provided, sort by distance (Haversine)
  if (lat && lng) {
    const uLat = parseFloat(lat)
    const uLng = parseFloat(lng)
    data.sort((a, b) => {
      const distA = haversine(uLat, uLng, a.lat, a.lng)
      const distB = haversine(uLat, uLng, b.lat, b.lng)
      return distA - distB
    })
  }

  res.json(data)
})

// Public — single mosque detail
router.get('/:id', async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('mosques')
    .select(`
      *,
      areas(id, name, cities(id, name, timezone)),
      prayer_times(*),
      eid_prayers(*)
    `)
    .eq('id', req.params.id)
    .single()

  if (error) return res.status(404).json({ error: 'Mosque not found' })
  res.json(data)
})

// Admin registers a mosque
router.post('/', requireAuth, requireRole('city_admin', 'super_admin'), async (req, res) => {
  const { name, name_roman, area_id, lat, lng } = req.body
  if (!name || !area_id || !lat || !lng)
    return res.status(400).json({ error: 'name, area_id, lat, lng required' })

  // City admin scope check
  if (req.role.role === 'city_admin') {
    const { data: area } = await supabaseAdmin
      .from('areas').select('city_id').eq('id', area_id).single()
    if (!area || area.city_id !== req.role.city_id)
      return res.status(403).json({ error: 'Area not in your city' })
  }

  const { data: mosque, error } = await supabaseAdmin
    .from('mosques')
    .insert({ name, name_roman, area_id, lat, lng, created_by: req.user.sub })
    .select().single()

  if (error) return res.status(500).json({ error: error.message })

  // Create empty prayer_times row for this mosque
  await supabaseAdmin.from('prayer_times').insert({ mosque_id: mosque.id })

  res.json(mosque)
})

// Admin deactivates a mosque
router.patch('/:id/deactivate', requireAuth, requireRole('city_admin', 'super_admin'), async (req, res) => {
  const { error } = await supabaseAdmin
    .from('mosques').update({ is_active: false }).eq('id', req.params.id)
  if (error) return res.status(500).json({ error: error.message })
  res.json({ success: true })
})

// Geography — public
router.get('/geo/countries', async (_req, res) => {
  const { data } = await supabaseAdmin.from('countries').select('*')
  res.json(data)
})

router.get('/geo/cities/:country_id', async (req, res) => {
  const { data } = await supabaseAdmin
    .from('cities').select('*').eq('country_id', req.params.country_id)
  res.json(data)
})

router.get('/geo/areas/:city_id', async (req, res) => {
  const { data } = await supabaseAdmin
    .from('areas').select('*').eq('city_id', req.params.city_id)
  res.json(data)
})

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat/2) ** 2 +
    Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) * Math.sin(dLon/2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export default router