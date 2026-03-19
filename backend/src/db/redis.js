import Redis from 'ioredis'
import 'dotenv/config'

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => Math.min(times * 200, 3000),
  lazyConnect: true,
})

redis.on('connect',   () => console.log('[redis] Connected'))
redis.on('error',     (err) => console.error('[redis] Error:', err.message))
redis.on('reconnecting', () => console.log('[redis] Reconnecting…'))

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Stocke le statut d'un terminal (en ligne / hors ligne).
 * TTL = 90 secondes — le terminal doit heartbeat toutes les 60s.
 */
export async function setTerminalOnline(terminalId, agentId) {
  await redis.setex(`terminal:${terminalId}`, 90, JSON.stringify({
    agentId,
    lastSeen: new Date().toISOString(),
  }))
}

export async function getTerminalStatus(terminalId) {
  const data = await redis.get(`terminal:${terminalId}`)
  return data ? JSON.parse(data) : null
}

/**
 * Publie un événement en temps réel (scan, révocation, alerte).
 */
export async function publish(channel, payload) {
  await redis.publish(channel, JSON.stringify(payload))
}

/**
 * Blacklist d'un access token révoqué (déconnexion forcée).
 * TTL calé sur l'expiration restante du token.
 */
export async function blacklistToken(jti, ttlSeconds) {
  await redis.setex(`blacklist:${jti}`, ttlSeconds, '1')
}

export async function isTokenBlacklisted(jti) {
  return (await redis.exists(`blacklist:${jti}`)) === 1
}

export default redis
