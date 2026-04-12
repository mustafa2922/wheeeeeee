// Usage: requireRole('super_admin')
//        requireRole('admin', 'super_admin')  ← accepts either
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user?.role) return res.status(403).json({ error: 'No role assigned' })
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' })
    }
    next()
  }
}