import { Router } from 'express'
import { supabaseAdmin } from '../lib/supabase.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requireRole } from '../middleware/requireRole.js'

const router = Router()

// Super admin — full audit log across all mosques
router.get('/audit', requireAuth, requireRole('super_admin'), async (req, res) => {
  const { limit = 200, offset = 0 } = req.query
  const { data } = await supabaseAdmin
    .from('audit_log')
    .select('*, mosques(name), users:changed_by(display_name)')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)
  res.json(data)
})

// Super admin — list all users with roles
router.get('/users', requireAuth, requireRole('super_admin'), async (req, res) => {
  const { data } = await supabaseAdmin
    .from('user_roles')
    .select('*, mosques(name), cities(name)')
  res.json(data)
})

// Super admin — add a new city
router.post('/cities', requireAuth, requireRole('super_admin'), async (req, res) => {
  const { country_id, name, timezone } = req.body
  if (!country_id || !name || !timezone)
    return res.status(400).json({ error: 'country_id, name, timezone required' })
  const { data, error } = await supabaseAdmin
    .from('cities').insert({ country_id, name, timezone }).select().single()
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// Super admin — add a new area
router.post('/areas', requireAuth, requireRole('super_admin', 'city_admin'), async (req, res) => {
  const { city_id, name } = req.body
  if (!city_id || !name)
    return res.status(400).json({ error: 'city_id and name required' })
  const { data, error } = await supabaseAdmin
    .from('areas').insert({ city_id, name }).select().single()
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// City admin stats — mosques and imams under them
router.get('/my-stats', requireAuth, requireRole('city_admin', 'super_admin'), async (req, res) => {
  const city_id = req.role.city_id

  const { data: mosques } = await supabaseAdmin
    .from('mosques')
    .select('id, name, is_active, areas(city_id)')
    .eq('is_active', true)

  const scoped = city_id
    ? mosques.filter(m => m.areas?.city_id === city_id)
    : mosques

  const { data: imams } = await supabaseAdmin
    .from('user_roles')
    .select('*, mosques(name, area_id, areas(city_id))')
    .eq('role', 'imam')

  const scopedImams = city_id
    ? imams.filter(i => i.mosques?.areas?.city_id === city_id)
    : imams

  res.json({ mosque_count: scoped.length, imam_count: scopedImams.length })
})

export default router