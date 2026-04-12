import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production'
const JWT_EXPIRES_IN = '7d'
const BCRYPT_ROUNDS = 10

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password) {
  return bcrypt.hash(password, BCRYPT_ROUNDS)
}

/**
 * Compare password against hash
 */
export async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash)
}

/**
 * Sign a JWT token with user data
 */
export function signToken(userId, email, role, mosque_id = null, city_id = null) {
  return jwt.sign(
    { userId, email, role, mosque_id, city_id },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  )
}

/**
 * Verify and decode JWT token
 */
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET)
  } catch (err) {
    return null
  }
}

/**
 * Extract token from Authorization header
 */
export function extractToken(authHeader) {
  if (!authHeader) return null
  const parts = authHeader.split(' ')
  if (parts.length !== 2 || parts[0] !== 'Bearer') return null
  return parts[1]
}
