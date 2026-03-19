import { Router } from 'express'
import { query } from '../db/postgres.js'
import { setTerminalOnline, getTerminalStatus, publish } from '../db/redis.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { revokeAllUserTokens } from '../utils/jwt.js'

const router = Router()

// ─── GET /api/terminals ───────────────────────────────────────────────────────
router.get('/', requireAuth, requireRole('admin', 'supervisor'), async (req, res) => {
  try {
    const result = await query(
      `SELECT pc.id, pc.nom, pc.agent_id, u.name AS agent_name, pc.statut, pc.scans, pc.last_seen
       FROM points_controle pc
       LEFT JOIN users u ON u.id = pc.agent_id
       ORDER BY pc.id`
    )

    // Enrichit chaque terminal avec son statut Redis (en ligne / hors ligne)
    const terminals = await Promise.all(result.rows.map(async (pc) => {
      const live = await getTerminalStatus(pc.id)
      return {
        ...pc,
        online:    !!live,
        lastPing:  live?.lastSeen ?? null,
      }
    }))

    res.json(terminals)
  } catch (err) {
    console.error('[terminals/list]', err)
    res.status(500).json({ error: 'Erreur serveur.' })
  }
})

// ─── POST /api/terminals/:id/heartbeat ────────────────────────────────────────
// Appelé toutes les 60s par chaque terminal pour signaler qu'il est en ligne.
router.post('/:id/heartbeat', requireAuth, async (req, res) => {
  try {
    await setTerminalOnline(req.params.id, req.user.id)
    await query(
      `UPDATE points_controle SET last_seen = NOW() WHERE id = $1`,
      [req.params.id]
    )
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur.' })
  }
})

// ─── POST /api/terminals/:id/decommission ─────────────────────────────────────
// Décommissionnement d'urgence — révoque la session de l'agent assigné.
router.post('/:id/decommission', requireAuth, requireRole('admin', 'supervisor'), async (req, res) => {
  try {
    const result = await query(
      `SELECT agent_id FROM points_controle WHERE id = $1`,
      [req.params.id]
    )
    if (result.rowCount === 0) return res.status(404).json({ error: 'Terminal introuvable.' })

    const { agent_id } = result.rows[0]

    // Révoque tous les refresh tokens de l'agent
    if (agent_id) await revokeAllUserTokens(agent_id)

    // Passe le terminal en hors-ligne dans la DB
    await query(
      `UPDATE points_controle SET statut = 'hors-ligne', agent_id = NULL WHERE id = $1`,
      [req.params.id]
    )

    // Notifie en temps réel
    await publish('terminal:decommissioned', {
      terminalId: req.params.id,
      agentId:    agent_id,
      by:         req.user.id,
      at:         new Date().toISOString(),
    })

    res.json({ ok: true, terminalId: req.params.id, agentDeconnected: agent_id })
  } catch (err) {
    console.error('[terminals/decommission]', err)
    res.status(500).json({ error: 'Erreur serveur.' })
  }
})

// ─── PATCH /api/terminals/:id ─────────────────────────────────────────────────
router.patch('/:id', requireAuth, requireRole('admin', 'supervisor'), async (req, res) => {
  const { statut, agent_id } = req.body
  try {
    const result = await query(
      `UPDATE points_controle SET
         statut   = COALESCE($1, statut),
         agent_id = COALESCE($2, agent_id)
       WHERE id = $3 RETURNING *`,
      [statut || null, agent_id || null, req.params.id]
    )
    if (result.rowCount === 0) return res.status(404).json({ error: 'Terminal introuvable.' })
    res.json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur.' })
  }
})

export default router
