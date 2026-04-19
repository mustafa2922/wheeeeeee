import { Router }       from 'express'
import { supabaseAdmin } from '../lib/supabase.js'
import {
  hashPassword,
  verifyPassword,
  signToken,
  getUserById,
} from '../lib/auth.js'
import { requireAuth }  from '../middleware/requireAuth.js'
import { requireRole }  from '../middleware/requireRole.js'

const router = Router()

// ─── Public: self-registration (role = 'user' always) ───
router.post('/register', async (req, res) => {
  const { email, password, display_name, phone } = req.body

  if (!email || !password || !display_name)
    return res.status(400).json({ error: 'email, password, display_name required' })

  // Check duplicate email
  const { data: existing } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('email', email.toLowerCase())
    .single()

  if (existing)
    return res.status(409).json({ error: 'Email already registered' })

  const hashed = await hashPassword(password)
  console.log(`Registering user: ${email.toLowerCase()}`)

  const { data: user, error } = await supabaseAdmin
    .from('users')
    .insert({
      email:        email.toLowerCase(),
      password:     hashed,
      phone:        phone ?? null,
      role:         'user',
      display_name: display_name,
    })
    .select('id, email, role')
    .single()

  if (error) {
    console.error(`Registration DB error for ${email}:`, error)
    return res.status(500).json({ error: error.message })
  }

  const token = signToken(user)
  res.status(201).json({ token, user: { id: user.id, email: user.email, role: user.role } })
})

// ─── Public: sign in ───
router.post('/login',   async (req, res) => loginHandler(req, res))
router.post('/sign-in', async (req, res) => loginHandler(req, res))

async function loginHandler(req, res) {
  const { email, password, phone } = req.body
  console.log(`Login attempt: ${email?.toLowerCase()} via ${req.path}`)

  if (!email || !password || !phone)
    return res.status(400).json({ error: 'email, password and phone required' })

  const { data: user, error } = await supabaseAdmin
    .from('users')
    .select('id, email, password, role, mosque_id, city_id')
    .eq('email', email.toLowerCase())
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      console.log(`Login failed: user not found: ${email}`)
      return res.status(401).json({ error: 'Invalid credentials' })
    }
    console.error(`Login DB error for ${email}:`, error)
    return res.status(500).json({ error: error.message })
  }

  if (!user)
    return res.status(401).json({ error: 'Invalid credentials' })

  const valid = await verifyPassword(password, user.password)
  if (!valid || user.phone !== phone) {
    console.log(`Login failed: invalid creds (pass or phone) for ${email}`)
    return res.status(401).json({ error: 'Invalid credentials' })
  }

  // Never send password hash to client
  const { password: _, ...safeUser } = user
  const token = signToken(safeUser)

  res.json({ token, user: safeUser })
}

// ─── Protected: get own profile ───
router.get('/me', requireAuth, async (req, res) => {
  const user = await getUserById(req.user.sub)
  if (!user) return res.status(404).json({ error: 'User not found' })
  res.json(user)
})

// ─── Super admin: create any role account ───
router.post('/create-admin', requireAuth, requireRole('super_admin'), async (req, res) => {
  const { email, password, display_name, city_id, phone } = req.body

  if (!email || !password || !display_name || !city_id || !phone)
    return res.status(400).json({ error: 'All fields including phone are required' })

  const hashed = await hashPassword(password)

  const { data, error } = await supabaseAdmin
    .from('users')
    .insert({
      email:    email.toLowerCase(),
      password: hashed,
      role:     'admin',
      city_id:  Number(city_id),
      phone,
      display_name
    })
    .select('id, email, role, city_id')
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.json({ user_id: data.id })
})

// ─── Admin or super admin: create imam account ───
router.post('/create-imam', requireAuth, requireRole('admin', 'super_admin'), async (req, res) => {
  const { email, password, display_name, mosque_id, phone } = req.body

  if (!email || !password || !display_name || !mosque_id || !phone)
    return res.status(400).json({ error: 'All fields including phone are required' })

  // Admin can only assign imams to mosques in their city
  if (req.role.role === 'admin') {
    const { data: mosque } = await supabaseAdmin
      .from('mosques')
      .select('area_id, areas(city_id)')
      .eq('id', mosque_id)
      .single()

    if (!mosque || mosque.areas?.city_id !== req.role.city_id)
      return res.status(403).json({ error: 'Mosque not in your city' })
  }

  const resolvedCity = await supabaseAdmin
    .from('mosques')
    .select('city_id, area_id, areas(city_id)')
    .eq('id', mosque_id)
    .single()
    
  const city_id = resolvedCity.data?.city_id || resolvedCity.data?.areas?.city_id
  
  if (!city_id) {
    return res.status(400).json({ error: 'Could not resolve city for this mosque' })
  }

  const hashed = await hashPassword(password)

  const { data, error } = await supabaseAdmin
    .from('users')
    .insert({
      email:     email.toLowerCase(),
      password:  hashed,
      role:      'imam',
      mosque_id,
      city_id,
      phone,
      display_name
    })
    .select('id, email, role, mosque_id')
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.json({ user_id: data.id })
})

// ─── Super admin: update any user's credentials ───
router.patch('/update-credentials', requireAuth, requireRole('super_admin'), async (req, res) => {
  const { target_user_id, email, password } = req.body

  if (!target_user_id)
    return res.status(400).json({ error: 'target_user_id required' })

  const updates = {}
  if (email)    updates.email    = email.toLowerCase()
  if (password) updates.password = await hashPassword(password)

  if (!Object.keys(updates).length)
    return res.status(400).json({ error: 'Nothing to update' })

  const { error } = await supabaseAdmin
    .from('users')
    .update(updates)
    .eq('id', target_user_id)

  if (error) return res.status(500).json({ error: error.message })
  res.json({ success: true })
})

export default router