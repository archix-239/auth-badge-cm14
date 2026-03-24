/**
 * Passerelle WebSocket (Socket.io) — temps réel bidirectionnel.
 *
 * Flux couverts :
 *   scan:new             → superviseurs reçoivent chaque scan en direct
 *   badge:revoked        → tous les terminaux agents mettent à jour leur cache local
 *   alert:broadcast      → alerte de masse envoyée à tous les connectés
 *   terminal:decommissioned → agent ciblé reçoit l'ordre de déconnexion
 *
 * Authentification : le client envoie son access token dans le handshake.
 */
import Redis from 'ioredis'
import { verifyAccessToken } from '../utils/jwt.js'
import { setUserOnline, setUserOffline } from '../db/redis.js'
import 'dotenv/config'

export function setupSocket(io) {
  // Client Redis dédié au subscribe (ioredis ne peut pas faire pub et sub avec la même instance)
  const sub = new Redis(process.env.REDIS_URL || 'redis://localhost:6379')

  // ─── Authentification Socket.io ─────────────────────────────────────────────
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token
    if (!token) return next(new Error('Token manquant'))
    try {
      socket.user = verifyAccessToken(token)
      next()
    } catch {
      next(new Error('Token invalide'))
    }
  })

  // ─── Connexion ────────────────────────────────────────────────────────────
  io.on('connection', (socket) => {
    const { sub: userId, role } = socket.user
    socket.join(`user:${userId}`)
    socket.join(`role:${role}`)

    console.log(`[socket] Connecté : ${userId} (${role}) — socket ${socket.id}`)

    // Notifie admins/superviseurs du changement de statut
    setUserOnline(userId).catch(() => {})
    socket.to('role:admin').to('role:supervisor').emit('user:status', { userId, status: 'EN LIGNE' })

    // Heartbeat terminal (agent envoie toutes les 60s)
    socket.on('terminal:heartbeat', ({ terminalId }) => {
      socket.join(`terminal:${terminalId}`)
    })

    socket.on('disconnect', () => {
      console.log(`[socket] Déconnecté : ${userId} — socket ${socket.id}`)
      // Ne supprime la clé Redis que s'il n'y a plus d'autres sockets pour cet utilisateur
      const roomSize = io.sockets.adapter.rooms.get(`user:${userId}`)?.size ?? 0
      if (roomSize === 0) {
        setUserOffline(userId).catch(() => {})
        socket.to('role:admin').to('role:supervisor').emit('user:status', { userId, status: 'HORS LIGNE' })
      }
    })
  })

  // ─── Redis Pub/Sub → Socket.io broadcast ─────────────────────────────────
  sub.subscribe('scan:new', 'badge:revoked', 'alert:broadcast', 'terminal:decommissioned',
    (err) => {
      if (err) console.error('[socket] Redis subscribe error:', err.message)
    }
  )

  sub.on('message', (channel, message) => {
    let payload
    try { payload = JSON.parse(message) } catch { return }

    switch (channel) {
      // Nouveau scan → superviseurs et admin uniquement
      case 'scan:new':
        io.to('role:supervisor').to('role:admin').emit('scan:new', payload)
        break

      // Badge révoqué → TOUS les terminaux agents (mise à jour cache offline)
      case 'badge:revoked':
        io.to('role:agent').emit('badge:revoked', payload)
        break

      // Alerte de masse → tout le monde
      case 'alert:broadcast':
        io.emit('alert:broadcast', payload)
        break

      // Décommissionnement → agent ciblé uniquement
      case 'terminal:decommissioned':
        io.to(`user:${payload.agentId}`).emit('terminal:decommissioned', payload)
        break
    }
  })
}
