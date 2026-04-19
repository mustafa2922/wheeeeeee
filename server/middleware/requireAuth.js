import { verifyToken, getUserById } from '../lib/auth.js'

/**
 * Verifies the Bearer JWT from Authorization header and 
 * synchronously checks the database for account status.
 */
export async function requireAuth(req, res, next) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const token = header.slice(7)

  try {
    const payload = verifyToken(token)
    
    // Immediate Revocation Check:
    // We must query the DB to ensure account wasn't deleted or deactivated
    const user = await getUserById(payload.sub)
    
    if (!user || user.is_active === false) {
      return res.status(401).json({ error: 'Account revoked or deleted' })
    }

    // Attach verified user and role info. Adding 'sub' for backward compatibility 
    // with existing routes that expect payload structure.
    req.user = { ...user, sub: user.id }
    req.role = {
      role:      user.role,
      mosque_id: user.mosque_id,
      city_id:   user.city_id,
    }
    
    next()
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token' })
  }
}