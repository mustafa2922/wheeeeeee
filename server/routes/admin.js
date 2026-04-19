import { Router } from 'express'
import { supabaseAdmin } from '../lib/supabase.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requireRole } from '../middleware/requireRole.js'
import { hashPassword } from '../lib/auth.js'

const router = Router()

/** Internal helper for system audit logging */
async function logAudit(mosqueId, changedBy, field, oldVal, newVal) {
  await supabaseAdmin
    .from('audit_log')
    .insert({
      mosque_id:  mosqueId || null,
      changed_by: changedBy,
      field,
      old_value: String(oldVal || ''),
      new_value: String(newVal || ''),
    })
}

/** 
 * Helper to resolve city_id from mosque_id if missing 
 */
async function resolveTerritory(mosqueId) {
  if (!mosqueId) return { city_id: null, country_id: null }
  const { data } = await supabaseAdmin
    .from('mosques')
    .select('city_id, country_id, areas(city_id)')
    .eq('id', mosqueId)
    .single()
    
  return {
    city_id:    data?.city_id    || data?.areas?.city_id || null,
    country_id: data?.country_id || null
  }
}

// Scoped Audit Log
router.get('/audit', requireAuth, requireRole('admin', 'super_admin'), async (req, res) => {
  const { limit = 200, offset = 0 } = req.query
  const isSuper = req.user.role === 'super_admin'
  const cityId  = req.role.city_id

  let query = supabaseAdmin
    .from('audit_log')
    .select('*, mosques:mosque_id(name, areas(city_id)), users:changed_by(display_name)')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (!isSuper) {
    const { data, error } = await query
    if (error) return res.status(500).json({ error: error.message })
    
    // Filter by city_id of the mosque being acted upon
    const filtered = data.filter(log => log.mosques?.areas?.city_id === cityId)
    return res.json(filtered)
  }

  const { data, error } = await query
  if (error) return res.status(500).json({ error: error.message })
  res.json(data || [])
})

// Scoped Activity Stats
router.get('/activity', requireAuth, requireRole('admin', 'super_admin'), async (req, res) => {
  const isSuper = req.user.role === 'super_admin'
  const cityId  = req.role.city_id
  const last7Days = new Date()
  last7Days.setDate(last7Days.getDate() - 7)

  let query = supabaseAdmin
    .from('audit_log')
    .select('created_at, mosques:mosque_id(areas(city_id))')
    .gte('created_at', last7Days.toISOString())

  const { data, error } = await query
  if (error) return res.status(500).json({ error: error.message })

  const filteredData = isSuper ? data : data.filter(log => log.mosques?.areas?.city_id === cityId)

  const activity = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]
    const count = filteredData.filter(a => a.created_at.startsWith(dateStr)).length
    return { date: dateStr, count }
  }).reverse()

  res.json(activity)
})

// Scoped User List
router.get('/users', requireAuth, requireRole('admin', 'super_admin'), async (req, res) => {
  const isSuper = req.user.role === 'super_admin'
  const cityId  = req.role.city_id

  let query = supabaseAdmin
    .from('users')
    .select('*, mosques!mosque_id(name, area_id, areas(city_id)), cities(name)')
  
  if (!isSuper) {
    // We fetch and filter in JS to catch cases where city_id is null but mosque is in this city
    const { data, error } = await query
    if (error) return res.status(500).json({ error: error.message })
    
    const scoped = data.filter(u => 
      u.role === 'imam' && (u.city_id === cityId || u.mosques?.areas?.city_id === cityId)
    )
    return res.json(scoped)
  }

  const { data, error } = await query
  if (error) return res.status(500).json({ error: error.message })
  res.json(data || [])
})

// Scoped User Creation
router.post('/users', requireAuth, requireRole('admin', 'super_admin'), async (req, res) => {
  let { email, password, display_name, role, country_id, city_id, mosque_id, phone } = req.body
  const isSuper = req.user.role === 'super_admin'
  const myCity  = req.role.city_id

  if (!email || !password || !display_name || !role) {
    return res.status(400).json({ error: 'Email, password, name, and role are required' })
  }

  // Security Scoping
  if (!isSuper) {
    if (role !== 'imam') {
      return res.status(403).json({ error: 'City Admins can only create Imams' })
    }
    city_id = myCity // Enforce their own city
  }

  // Automatic Territory Resolution for Imams
  if (dbRole === 'imam' && mosque_id && (!city_id || !country_id)) {
    const territory = await resolveTerritory(mosque_id)
    city_id = territory.city_id
    country_id = territory.country_id
  }

  if (dbRole === 'admin' && (!city_id || !country_id)) {
    return res.status(400).json({ error: 'City and Country ID are required for City Admins' })
  }
  if (dbRole === 'imam' && !mosque_id) {
    return res.status(400).json({ error: 'Mosque ID is required for Imams' })
  }
  if (dbRole === 'imam' && (!city_id || !country_id)) {
    return res.status(400).json({ error: 'Could not resolve full territory for this mosque' })
  }

  const hashed = await hashPassword(password)
  
  const { data, error } = await supabaseAdmin
    .from('users')
    .insert({
      email:    email.toLowerCase(),
      password: hashed,
      display_name,
      role:     dbRole,
      phone:    phone || null,
      country_id: country_id ? Number(country_id) : null,
      city_id:  city_id   ? Number(city_id) : null,
      mosque_id: mosque_id || null,
    })
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })
  
  await logAudit(null, req.user.sub, 'user_create', 'new', `${dbRole}: ${email}`)
  res.status(201).json(data)
})

// Scoped User Update
router.patch('/users/:id', requireAuth, requireRole('admin', 'super_admin'), async (req, res) => {
  const { id } = req.params
  const isSuper = req.user.role === 'super_admin'
  const myCity  = req.role.city_id
  const { display_name, role, password, mosque_id, city_id, country_id, phone, is_active } = req.body

  // Check visibility/permissions
  const { data: target } = await supabaseAdmin
    .from('users')
    .select('role, city_id, mosques!mosque_id(areas(city_id))')
    .eq('id', id)
    .single()
  
  if (!target) return res.status(404).json({ error: 'User not found' })

  if (!isSuper) {
    const isTargetInMyCity = target.city_id === myCity || target.mosques?.areas?.city_id === myCity
    if (target.role !== 'imam' || !isTargetInMyCity) {
      return res.status(403).json({ error: 'Unauthorized to edit this user' })
    }
  }

  const updates = {}
  if (display_name !== undefined) updates.display_name = display_name
  if (role !== undefined && isSuper) {
     updates.role = role === 'city_admin' ? 'admin' : role
  }
  if (mosque_id !== undefined) {
    updates.mosque_id = mosque_id
    // Auto-resolve full territory whenever mosque changes
    const territory = await resolveTerritory(mosque_id)
    updates.city_id = territory.city_id
    updates.country_id = territory.country_id
  }
  if (isSuper && country_id !== undefined) updates.country_id = Number(country_id)
  if (city_id !== undefined && isSuper) updates.city_id = Number(city_id)
  if (phone !== undefined)              updates.phone      = phone
  if (password) {
    updates.password = await hashPassword(password)
  }

  const { data, error } = await supabaseAdmin.from('users').update(updates).eq('id', id).select().single()
  if (error) return res.status(500).json({ error: error.message })
  
  await logAudit(null, req.user.sub, 'user_update', id, 'updated')
  res.json(data)
})

// Scoped User Delete
router.delete('/users/:id', requireAuth, requireRole('admin', 'super_admin'), async (req, res) => {
  const { id } = req.params
  const isSuper = req.user.role === 'super_admin'
  const myCity  = req.role.city_id

  const { data: target } = await supabaseAdmin
    .from('users')
    .select('role, city_id, mosques!mosque_id(areas(city_id))')
    .eq('id', id)
    .single()

  if (!isSuper) {
    if (!target) return res.json({ success: true }) // already gone
    const isTargetInMyCity = target.city_id === myCity || target.mosques?.areas?.city_id === myCity
    if (target.role !== 'imam' || !isTargetInMyCity) {
      return res.status(403).json({ error: 'Unauthorized to delete this user' })
    }
  }

  const { error } = await supabaseAdmin.from('users').delete().eq('id', id)
  if (error) return res.status(500).json({ error: error.message })
  
  await logAudit(null, req.user.sub, 'user_delete', id, 'deleted')
  res.json({ success: true })
})

// Super admin ONLY — add a new country
router.post('/countries', requireAuth, requireRole('super_admin'), async (req, res) => {
  const { name, code } = req.body
  if (!name) return res.status(400).json({ error: 'Country name required' })
  const { data, error } = await supabaseAdmin
    .from('countries').insert({ name, code }).select().single()
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// Super admin ONLY — add a new city
router.post('/cities', requireAuth, requireRole('super_admin'), async (req, res) => {
  const { country_id, name, timezone } = req.body
  if (!country_id || !name || !timezone)
    return res.status(400).json({ error: 'country_id, name, timezone required' })
  const { data, error } = await supabaseAdmin
    .from('cities').insert({ country_id, name, timezone }).select().single()
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// Scoped — add a new area
router.post('/areas', requireAuth, requireRole('super_admin', 'city_admin'), async (req, res) => {
  let { city_id, name } = req.body
  const isSuper = req.user.role === 'super_admin'
  
  if (!isSuper) {
    city_id = req.role.city_id
  }

  if (!city_id || !name)
    return res.status(400).json({ error: 'city_id and name required' })

  const { data, error } = await supabaseAdmin
    .from('areas').insert({ city_id, name }).select().single()
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// Scoped Stats
router.get('/my-stats', requireAuth, requireRole('city_admin', 'super_admin'), async (req, res) => {
  const city_id = req.role.city_id
  const isSuper = req.user.role === 'super_admin'

  const { data: mosques, error: mError } = await supabaseAdmin
    .from('mosques')
    .select('id, name, is_active, areas(city_id)')
    .eq('is_active', true)

  if (mError) return res.status(500).json({ error: mError.message })

  const scoped = (!isSuper && city_id && mosques)
    ? mosques.filter(m => m.areas?.city_id === city_id)
    : (mosques || [])

  const { data: imams, error: iError } = await supabaseAdmin
    .from('users')
    .select('id, role, city_id, mosques!mosque_id(areas(city_id))')
    .eq('role', 'imam')

  if (iError) return res.status(500).json({ error: iError.message })

  const scopedImams = (!isSuper && city_id && imams)
    ? imams.filter(i => i.city_id === city_id || i.mosques?.areas?.city_id === city_id)
    : (imams || [])

  res.json({ mosque_count: scoped.length, imam_count: scopedImams.length })
})

// Scoped — update mosque
router.patch('/mosques/:id', requireAuth, requireRole('admin', 'super_admin'), async (req, res) => {
  const { id } = req.params
  const isSuper = req.user.role === 'super_admin'
  const myCity  = req.role.city_id
  const { name, area_id, is_active } = req.body

  if (!isSuper) {
    const { data: m } = await supabaseAdmin.from('mosques').select('areas(city_id)').eq('id', id).single()
    if (!m || m.areas?.city_id !== myCity) {
      return res.status(403).json({ error: 'Unauthorized to edit mosques outside your city' })
    }
  }

  const updates = {}
  if (name !== undefined)      updates.name      = name
  if (area_id !== undefined)   updates.area_id   = area_id
  if (is_active !== undefined) updates.is_active = is_active

  const { data, error } = await supabaseAdmin.from('mosques').update(updates).eq('id', id).select().single()
  if (error) return res.status(500).json({ error: error.message })
  
  await logAudit(id, req.user.sub, 'mosque_update', 'edit', name || 'updated')
  res.json(data)
})

// Scoped — soft delete mosque
router.delete('/mosques/:id', requireAuth, requireRole('admin', 'super_admin'), async (req, res) => {
  const { id } = req.params
  const isSuper = req.user.role === 'super_admin'
  const myCity  = req.role.city_id

  if (!isSuper) {
    const { data: m } = await supabaseAdmin.from('mosques').select('areas(city_id)').eq('id', id).single()
    if (!m || m.areas?.city_id !== myCity) {
      return res.status(403).json({ error: 'Unauthorized to delete mosques outside your city' })
    }
  }

  const { error } = await supabaseAdmin.from('mosques').update({ is_active: false }).eq('id', id)
  if (error) return res.status(500).json({ error: error.message })
  
  await logAudit(id, req.user.sub, 'mosque_deactivate', 'active', 'inactive')
  res.json({ success: true, message: 'Mosque deactivated (soft delete)' })
})

export default router