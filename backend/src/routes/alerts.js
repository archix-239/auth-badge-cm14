import { Router } from 'express'
import { query } from '../db/postgres.js'
import { publish } from '../db/redis.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

const router = Router()

// ─── POST /api/alerts ─────────────────────────────────────────────────────────
// Alerte de masse depuis la console superviseur/admin.
router.post('/', requireAuth, requireRole('admin', 'supervisor'), async (req, res) => {
  const { message, level = 'info' } = req.body
  if (!message?.trim()) return res.status(400).json({ error: 'Message requis.' })

  const validLevels = ['info', 'warning', 'critical']
  if (!validLevels.includes(level)) return res.status(400).json({ error: 'Niveau invalide.' })

  try {
    const result = await query(
      `INSERT INTO alerts (message, level, author_id) VALUES ($1,$2,$3) RETURNING *`,
      [message.trim(), level, req.user.id]
    )
    const alert = result.rows[0]

    // Diffuse immédiatement à tous les terminaux connectés
    await publish('alert:broadcast', {
      id:        alert.id,
      message:   alert.message,
      level:     alert.level,
      author:    req.user.name,
      timestamp: alert.created_at,
    })

    res.status(201).json(alert)
  } catch (err) {
    console.error('[alerts/create]', err)
    res.status(500).json({ error: 'Erreur serveur.' })
  }
})

// ─── GET /api/alerts ──────────────────────────────────────────────────────────
router.get('/', requireAuth, async (req, res) => {
  try {
    const result = await query(
      `SELECT a.id, a.message, a.level, a.author_id, u.name AS author_name, a.created_at
       FROM alerts a
       LEFT JOIN users u ON u.id = a.author_id
       ORDER BY a.created_at DESC
       LIMIT 50`
    )
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur.' })
  }
})

export default router
