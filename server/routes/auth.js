import { Router } from 'express'
import { supabaseAdmin } from '../lib/supabase.js'
import { hashPassword, signToken, verifyPassword } from '../lib/auth.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requireRole } from '../middleware/requireRole.js'

const router = Router()

// Public user self-registration
router.post('/register', async (req, res) => {
  const { email, password, phone } = req.body
  console.log('DEBUG: Registration request for:', email)
  if (!email || !password)
    return res.status(400).json({ error: 'email and password required' })

  try {
    const { data: existing, error: existsError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    if (existsError) return res.status(500).json({ error: existsError.message })
    if (existing) return res.status(400).json({ error: 'User already exists' })

    const hashedPassword = await hashPassword(password)
    const { data, error } = await supabaseAdmin
      .from('users')
      .insert({
        email,
        password: hashedPassword,
        phone: phone || null,
        role: 'user'
      })
      .select('id, email, role, mosque_id, city_id')
      .single()

    if (error) {
      console.error('DEBUG: Registration DB error:', error)
      return res.status(400).json({ error: error.message })
    }

    console.log('DEBUG: Registration successful for:', data.email)
    const token = signToken(data.id, data.email, data.role, data.mosque_id, data.city_id)
    res.json({ token, user: data })
  } catch (err) {
    console.error('DEBUG: Registration catch block error:', err)
    res.status(500).json({ error: err.message })
  }
})

// User sign-in
router.post('/sign-in', async (req, res) => {
  const { email, password } = req.body
  console.log('DEBUG: Sign-in request for:', email)
  if (!email || !password)
    return res.status(400).json({ error: 'email and password required' })

  try {
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('id, email, password, role, mosque_id, city_id')
      .eq('email', email)
      .maybeSingle()

    if (error) {
      console.error('DEBUG: Sign-in DB error:', error)
      return res.status(500).json({ error: error.message })
    }
    if (!user) {
      console.log('DEBUG: User not found for email:', email)
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const isValid = await verifyPassword(password, user.password)
    console.log('DEBUG: Password validity for', email, 'is:', isValid)
    if (!isValid) return res.status(401).json({ error: 'Invalid credentials' })

    const token = signToken(user.id, user.email, user.role, user.mosque_id, user.city_id)
    res.json({ token, user: { id: user.id, email: user.email, role: user.role, mosque_id: user.mosque_id, city_id: user.city_id } })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Super admin creates a city_admin account
router.post('/create-admin', requireAuth, requireRole('super_admin'), async (req, res) => {
  const { email, password, phone, city_id } = req.body
  if (!email || !password || !city_id)
    return res.status(400).json({ error: 'email, password and city_id required' })

  try {
    const { data: existing, error: existsError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    if (existsError) return res.status(500).json({ error: existsError.message })
    if (existing) return res.status(400).json({ error: 'User already exists' })

    const hashedPassword = await hashPassword(password)
    const { data, error } = await supabaseAdmin
      .from('users')
      .insert({
        email,
        password: hashedPassword,
        phone: phone || null,
        role: 'city_admin',
        city_id
      })
      .select('id, email, role, city_id')
      .single()

    if (error) return res.status(400).json({ error: error.message })

    res.json({ user: data })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// City admin or super admin creates an imam account
router.post('/create-imam', requireAuth, requireRole('city_admin', 'super_admin'), async (req, res) => {
  const { email, password, phone, mosque_id } = req.body
  if (!email || !password || !mosque_id)
    return res.status(400).json({ error: 'email, password and mosque_id required' })

  try {
    const { data: existing, error: existsError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    if (existsError) return res.status(500).json({ error: existsError.message })
    if (existing) return res.status(400).json({ error: 'User already exists' })

    const hashedPassword = await hashPassword(password)
    const { data, error } = await supabaseAdmin
      .from('users')
      .insert({
        email,
        password: hashedPassword,
        phone: phone || null,
        role: 'imam',
        mosque_id
      })
      .select('id, email, role, mosque_id')
      .single()

    if (error) return res.status(400).json({ error: error.message })

    res.json({ user: data })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Update credentials (super admin can update anyone, others only themselves)
router.patch('/update-credentials', requireAuth, async (req, res) => {
  const { target_user_id, email, password, phone } = req.body
  const isSuperAdmin = req.user.role === 'super_admin'
  const userId = isSuperAdmin && target_user_id ? target_user_id : req.user.userId

  try {
    const updates = {}
    if (email) updates.email = email
    if (password) updates.password = await hashPassword(password)
    if (phone !== undefined) updates.phone = phone

    const { error } = await supabaseAdmin
      .from('users')
      .update(updates)
      .eq('id', userId)

    if (error) return res.status(400).json({ error: error.message })

    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Get own user data
router.get('/me', requireAuth, async (req, res) => {
  try {
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('id, email, phone, role')
      .eq('id', req.user.userId)
      .single()

    if (error) return res.status(404).json({ error: 'User not found' })

    res.json({ user })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router