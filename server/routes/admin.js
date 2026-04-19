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
    if (error) {
      console.error(`[${req.method} ${req.path}]`, error)
      return res.status(500).json({ error: error.message })
    }
    
    // Filter by city_id of the mosque being acted upon
    const filtered = data.filter(log => log.mosques?.areas?.city_id === cityId)
    return res.json(filtered)
  }

  const { data, error } = await query
  if (error) {
    console.error(`[${req.method} ${req.path}]`, error)
    return res.status(500).json({ error: error.message })
  }
  res.json(data || [])
})

// Scoped Activity Stats
router.get('/activity', requireAuth, requireRole('admin', 'super_admin'), async (req, res) => {
  const isSuper = req.user.role === 'super_admin'
  const cityId  = req.role.city_id
  const last7Days = new Date()
  last7Days.setDate(last7Days.getDate() - 7)

  // Fetch prayer updates for last 7 days
  let auditQuery = supabaseAdmin
    .from('audit_log')
    .select('created_at, mosques:mosque_id(areas(city_id))')
    .gte('created_at', last7Days.toISOString())

  // Fetch recent mosques, users, announcements in parallel
  const [
    auditData,
    recentMosques,
    recentUsers,
    recentAnnouncements
  ] = await Promise.all([
    auditQuery,
    supabaseAdmin.from('mosques')
      .select('id, name, created_at, areas(city_id)')
      .order('created_at', { ascending: false })
      .limit(3),
    supabaseAdmin.from('users')
      .select('id, display_name, role, created_at, city_id')
      .order('created_at', { ascending: false })
      .limit(3),
    supabaseAdmin.from('announcements')
      .select('id, title, created_at')
      .order('created_at', { ascending: false })
      .limit(3)
  ])

  if (auditData.error) {
    console.error(`[${req.method} ${req.path}]`, auditData.error)
    return res.status(500).json({ error: auditData.error.message })
  }
  if (recentMosques.error) {
    console.error(`[${req.method} ${req.path}]`, recentMosques.error)
    return res.status(500).json({ error: recentMosques.error.message })
  }
  if (recentUsers.error) {
    console.error(`[${req.method} ${req.path}]`, recentUsers.error)
    return res.status(500).json({ error: recentUsers.error.message })
  }
  if (recentAnnouncements.error) {
    console.error(`[${req.method} ${req.path}]`, recentAnnouncements.error)
    return res.status(500).json({ error: recentAnnouncements.error.message })
  }

  // Filter audit data by city for city admin
  const filteredAuditData = isSuper
    ? auditData.data
    : auditData.data.filter(log => log.mosques?.areas?.city_id === cityId)

  // Build prayer updates array
  const prayer_updates = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]
    const count = filteredAuditData.filter(a => a.created_at.startsWith(dateStr)).length
    return { date: dateStr, count }
  }).reverse()

  // Filter recent mosques by city for city admin
  const filteredRecentMosques = isSuper
    ? recentMosques.data
    : recentMosques.data.filter(m => m.areas?.city_id === cityId)

  // Filter recent users by city for city admin
  const filteredRecentUsers = isSuper
    ? recentUsers.data
    : recentUsers.data.filter(u => u.city_id === cityId)

  res.json({
    prayer_updates,
    recent_mosques: filteredRecentMosques,
    recent_users: filteredRecentUsers,
    recent_announcements: recentAnnouncements.data
  })
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
    if (error) {
      console.error(`[${req.method} ${req.path}]`, error)
      return res.status(500).json({ error: error.message })
    }
    
    const scoped = data.filter(u => 
      u.role === 'imam' && (u.city_id === cityId || u.mosques?.areas?.city_id === cityId)
    )
    return res.json(scoped)
  }

  const { data, error } = await query
  if (error) {
    console.error(`[${req.method} ${req.path}]`, error)
    return res.status(500).json({ error: error.message })
  }
  res.json(data || [])
})

// Scoped User Creation
router.post('/users', requireAuth, requireRole('admin', 'super_admin'), async (req, res) => {
  let { email, password, display_name, role, country_id, city_id, mosque_id, phone } = req.body
  const dbRole = role
  const isSuper = req.user.role === 'super_admin'
  const myCity  = req.role.city_id

  if (!email || !password || !display_name || !role) {
    return res.status(400).json({ error: 'Email, password, name, and role are required' })
  }

  // Role assignment validation
  const allowedRoles = isSuper
    ? ['admin', 'imam', 'user', 'super_admin']
    : ['imam']

  if (!allowedRoles.includes(dbRole)) {
    return res.status(403).json({ error: 'You cannot create this role' })
  }

  // Security Scoping
  if (!isSuper) {
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

  if (error) {
    console.error(`[${req.method} ${req.path}]`, error)
    return res.status(500).json({ error: error.message })
  }
  
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
     updates.role = role
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
  if (error) {
    console.error(`[${req.method} ${req.path}]`, error)
    return res.status(500).json({ error: error.message })
  }
  
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
  if (error) {
    console.error(`[${req.method} ${req.path}]`, error)
    return res.status(500).json({ error: error.message })
  }
  
  await logAudit(null, req.user.sub, 'user_delete', id, 'deleted')
  res.json({ success: true })
})

// Super admin ONLY — add a new country
router.post('/countries', requireAuth, requireRole('super_admin'), async (req, res) => {
  const { name, code } = req.body
  if (!name) return res.status(400).json({ error: 'Country name required' })
  const { data, error } = await supabaseAdmin
    .from('countries').insert({ name, code }).select().single()
  if (error) {
    console.error(`[${req.method} ${req.path}]`, error)
    return res.status(500).json({ error: error.message })
  }
  res.json(data)
})

// Super admin ONLY — add a new city
router.post('/cities', requireAuth, requireRole('super_admin'), async (req, res) => {
  const { country_id, name, timezone } = req.body
  if (!country_id || !name || !timezone)
    return res.status(400).json({ error: 'country_id, name, timezone required' })
  const { data, error } = await supabaseAdmin
    .from('cities').insert({ country_id, name, timezone }).select().single()
  if (error) {
    console.error(`[${req.method} ${req.path}]`, error)
    return res.status(500).json({ error: error.message })
  }
  res.json(data)
})

// Scoped — add a new area
router.post('/areas', requireAuth, requireRole('super_admin', 'admin'), async (req, res) => {
  let { city_id, name } = req.body
  const isSuper = req.user.role === 'super_admin'
  
  if (!isSuper) {
    city_id = req.role.city_id
  }

  if (!city_id || !name)
    return res.status(400).json({ error: 'city_id and name required' })

  const { data, error } = await supabaseAdmin
    .from('areas').insert({ city_id, name }).select().single()
  if (error) {
    console.error(`[${req.method} ${req.path}]`, error)
    return res.status(500).json({ error: error.message })
  }
  res.json(data)
})

// Scoped Stats
router.get('/my-stats', requireAuth, requireRole('admin', 'super_admin'), async (req, res) => {
  const city_id = req.role.city_id
  const isSuper = req.user.role === 'super_admin'

  if (isSuper) {
    // Super admin gets global stats
    const [
      mosques,
      imams,
      areas,
      subscribers
    ] = await Promise.all([
      supabaseAdmin.from('mosques').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('users').select('id', { count: 'exact', head: true }).eq('role', 'imam'),
      supabaseAdmin.from('areas').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('push_subscriptions').select('user_id', { count: 'exact', head: true })
    ])

    return res.json({
      mosque_count: mosques.count || 0,
      imam_count: imams.count || 0,
      area_count: areas.count || 0,
      subscribers: subscribers.count || 0
    })
  }

  // City admin gets city-scoped stats
  const [mosques, imams, areas] = await Promise.all([
    supabaseAdmin.from('mosques').select('id', { count: 'exact', head: true })
      .eq('city_id', city_id),
    supabaseAdmin.from('users').select('id', { count: 'exact', head: true })
      .eq('role', 'imam').eq('city_id', city_id),
    supabaseAdmin.from('areas').select('id', { count: 'exact', head: true })
      .eq('city_id', city_id)
  ])

  // Get mosque IDs for subscriber query
  const { data: mosqueIds } = await supabaseAdmin.from('mosques')
    .select('id').eq('city_id', city_id)

  const mosqueIdList = mosqueIds?.map(m => m.id) || []
  const subscribers = mosqueIdList.length > 0
    ? await supabaseAdmin.from('push_subscriptions').select('user_id', { count: 'exact', head: true })
        .in('mosque_id', mosqueIdList)
    : { count: 0 }

  res.json({
    mosque_count: mosques.count || 0,
    imam_count: imams.count || 0,
    area_count: areas.count || 0,
    subscribers: subscribers.count || 0
  })
})

// Global stats (super admin only)
router.get('/global-stats', requireAuth, requireRole('super_admin'), async (req, res) => {
  const [
    countries,
    cities,
    areas,
    mosques,
    mosques_active,
    users_by_role,
    subscribers,
    announcements
  ] = await Promise.all([
    supabaseAdmin.from('countries').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('cities').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('areas').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('mosques').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('users').select('role'),
    supabaseAdmin.from('push_subscriptions').select('user_id', { count: 'exact', head: true }),
    supabaseAdmin.from('announcements').select('id', { count: 'exact', head: true })
  ])

  // Derive role counts from users_by_role
  const admins = users_by_role?.data?.filter(u => u.role === 'admin').length || 0
  const imams = users_by_role?.data?.filter(u => u.role === 'imam').length || 0
  const users = users_by_role?.data?.filter(u => u.role === 'user').length || 0

  res.json({
    countries: countries.count || 0,
    cities: cities.count || 0,
    neighborhoods: areas.count || 0,
    mosques_total: mosques.count || 0,
    mosques_active: mosques_active.count || 0,
    admins,
    imams,
    users,
    subscribers: subscribers.count || 0,
    announcements_sent: announcements.count || 0
  })
})

// Get announcements (Super Admin only)
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

// Scoped — update mosque (name, location, imam assignment)
router.patch('/mosques/:id', requireAuth, requireRole('admin', 'super_admin'), async (req, res) => {
  const { id } = req.params
  const isSuper = req.user.role === 'super_admin'
  const myCity  = req.role.city_id
  const { name, area_id, imam_id } = req.body

  // Check permissions
  if (!isSuper) {
    const { data: m } = await supabaseAdmin.from('mosques').select('areas(city_id)').eq('id', id).single()
    if (!m || m.areas?.city_id !== myCity) {
      return res.status(403).json({ error: 'Unauthorized to edit mosques outside your city' })
    }
  }

  // If area_id is changing, validate it's in the correct city
  if (area_id !== undefined && !isSuper) {
    const { data: area } = await supabaseAdmin.from('areas').select('city_id').eq('id', area_id).single()
    if (!area || area.city_id !== myCity) {
      return res.status(403).json({ error: 'Area not in your city' })
    }
  }

  // Update mosque
  const updates = {}
  if (name !== undefined) updates.name = name
  if (area_id !== undefined) updates.area_id = area_id

  const { data: mosque, error } = await supabaseAdmin.from('mosques').update(updates).eq('id', id).select().single()
  if (error) {
    console.error(`[${req.method} ${req.path}]`, error)
    return res.status(500).json({ error: error.message })
  }

  // Handle imam assignment/unassignment
  if (imam_id !== undefined) {
    if (imam_id === null) {
      // Unassign current imam
      await supabaseAdmin.from('users').update({ mosque_id: null, city_id: null }).eq('mosque_id', id)
    } else {
      // Assign new imam
      const { data: imam } = await supabaseAdmin.from('users').select('id, role, city_id').eq('id', imam_id).single()
      if (!imam || imam.role !== 'imam') {
        return res.status(400).json({ error: 'Invalid imam ID' })
      }

      // Check if imam is in the correct city
      if (!isSuper && imam.city_id !== myCity) {
        return res.status(403).json({ error: 'Imam not in your city' })
      }

      // Unassign any previous imam from this mosque
      await supabaseAdmin.from('users').update({ mosque_id: null, city_id: null }).eq('mosque_id', id)

      // Assign new imam
      await supabaseAdmin.from('users').update({ mosque_id: id, city_id: mosque.city_id }).eq('id', imam_id)
    }
  }

  // Fetch updated mosque with location and imam info
  const { data: updatedMosque } = await supabaseAdmin
    .from('mosques')
    .select(`
      *,
      areas(id, name, cities(id, name, timezone)),
      users:imam_id(id, display_name)
    `)
    .eq('id', id)
    .single()

  // Add computed location field
  const location = updatedMosque.areas?.cities
    ? `${updatedMosque.areas.name}, ${updatedMosque.areas.cities.name}`
    : updatedMosque.areas?.name || ''

  await logAudit(id, req.user.sub, 'mosque_update', 'edit', name || 'updated')
  res.json({ ...updatedMosque, location })
})

// Scoped — permanent delete mosque (with imam assignment check)
router.delete('/mosques/:id', requireAuth, requireRole('admin', 'super_admin'), async (req, res) => {
  const { id } = req.params
  const isSuper = req.user.role === 'super_admin'
  const myCity  = req.role.city_id

  // Check permissions
  if (!isSuper) {
    const { data: m } = await supabaseAdmin.from('mosques').select('areas(city_id)').eq('id', id).single()
    if (!m || m.areas?.city_id !== myCity) {
      return res.status(403).json({ error: 'Unauthorized to delete mosques outside your city' })
    }
  }

  // Check if any imam is assigned to this mosque
  const { data: assignedImam } = await supabaseAdmin
    .from('users')
    .select('id, display_name')
    .eq('role', 'imam')
    .eq('mosque_id', id)
    .single()

  if (assignedImam) {
    return res.status(400).json({ 
      error: `Cannot delete mosque: Imam ${assignedImam.display_name} is assigned to this mosque. Please unassign the imam first.` 
    })
  }

  // Delete related data in a transaction-like sequence
  // Note: Supabase doesn't support transactions, but we delete in dependency order
  try {
    await supabaseAdmin.from('prayer_times').delete().eq('mosque_id', id)
    await supabaseAdmin.from('eid_prayers').delete().eq('mosque_id', id)
    await supabaseAdmin.from('push_subscriptions').delete().eq('mosque_id', id)
    await supabaseAdmin.from('audit_log').delete().eq('mosque_id', id)
    await supabaseAdmin.from('mosques').delete().eq('id', id)
  } catch (err) {
    console.error(`[${req.method} ${req.path}]`, err)
    return res.status(500).json({ error: err.message })
  }

  await logAudit(id, req.user.sub, 'mosque_delete', id, 'deleted')
  res.json({ success: true, message: 'Mosque permanently deleted' })
})

export default router