import { verifyToken, extractToken } from '../lib/auth.js'

export function requireAuth(req, res, next) {
  const token = extractToken(req.headers.authorization)
  if (!token) return res.status(401).json({ error: 'Unauthorized' })

  const decoded = verifyToken(token)
  if (!decoded) return res.status(401).json({ error: 'Invalid or expired token' })

  req.user = decoded
  next()
}