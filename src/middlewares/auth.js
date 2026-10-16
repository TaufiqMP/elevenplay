import { supabase } from '../config/supabase.js'

export async function requireAdmin(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Token tidak ada' } })
  }

  const { data, error } = await supabase.auth.getClaims(token)
  if (error || !data) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Token tidak valid' } })
  }
  if (data.claims.app_metadata?.role !== 'admin') {
    return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Bukan admin' } })
  }

  req.user = data.claims
  next()
}