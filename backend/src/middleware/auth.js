import { verifyAccessToken } from '../utils/jwt.js'
import { isTokenBlacklisted } from '../db/redis.js'

/**
 * Vérifie le JWT access token. Enrichit req.user avec { id, role, name }.
 */
export async function requireAuth(req, res, next) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token manquant.' })
  }

  try {
    const token   = header.slice(7)
    const payload = verifyAccessToken(token)

    // Vérifie la blacklist Redis (déconnexion forcée)
    if (await isTokenBlacklisted(payload.jti)) {
      return res.status(401).json({ error: 'Session révoquée.' })
    }

    req.user = { id: payload.sub, role: payload.role, name: payload.name, jti: payload.jti, exp: payload.exp }
    next()
  } catch {
    return res.status(401).json({ error: 'Token invalide ou expiré.' })
  }
}

/**
 * Restreint l'accès aux rôles spécifiés.
 * Usage : requireRole('admin', 'supervisor')
 */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Accès refusé.' })
    }
    next()
  }
}
