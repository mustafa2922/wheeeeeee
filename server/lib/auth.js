import bcrypt     from 'bcryptjs'
import jwt        from 'jsonwebtoken'
import { supabaseAdmin } from './supabase.js'

const JWT_SECRET  = process.env.JWT_SECRET
const JWT_EXPIRES = '30d' // 30 days — long enough for mobile users

/** Hash a plain password */
export async function hashPassword(plain) {
  return bcrypt.hash(plain, 12)
}

/** Compare plain password against stored hash */
export async function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash)
}

/** Sign a JWT for a user row */
export function signToken(user) {
  return jwt.sign(
    {
      sub:       user.id,
      email:     user.email,
      role:      user.role,
      mosque_id: user.mosque_id ?? null,
      city_id:   user.city_id   ?? null,
      country_id: user.country_id ?? null,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  )
}

/** Verify and decode a JWT — throws if invalid */
export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET)
}

/** Fetch a full user row by id */
export async function getUserById(id) {
  const { data } = await supabaseAdmin
    .from('users')
    .select('id, email, display_name, role, mosque_id, city_id, country_id, is_active, created_at')
    .eq('id', id)
    .single()
  return data
}