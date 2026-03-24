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
      `SELECT pc.id, pc.nom, pc.agent_id, u.name AS agent_name, pc.statut, pc.scans, pc.last_seen,
              pc.zone_id, z.nom AS zone_nom
       FROM points_controle pc
       LEFT JOIN users u ON u.id = pc.agent_id
       LEFT JOIN zones z ON z.id = pc.zone_id
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
    const wasOnline = await getTerminalStatus(req.params.id)
    await setTerminalOnline(req.params.id, req.user.id)
    await query(
      `UPDATE points_controle SET last_seen = NOW() WHERE id = $1`,
      [req.params.id]
    )
    // Publie un événement socket uniquement lors du premier heartbeat (passage hors-ligne → en ligne)
    if (!wasOnline) {
      await publish('terminal:online', { terminalId: req.params.id, agentId: req.user.id })
    }
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

// ─── POST /api/terminals ──────────────────────────────────────────────────────
router.post('/', requireAuth, requireRole('admin', 'supervisor'), async (req, res) => {
  const { id, nom, zone_id } = req.body
  if (!id || !nom) {
    return res.status(400).json({ error: 'Les champs id et nom sont obligatoires.' })
  }
  try {
    const result = await query(
      `INSERT INTO points_controle (id, nom, zone_id) VALUES ($1, $2, $3) RETURNING *`,
      [id, nom, zone_id ?? null]
    )
    res.status(201).json(result.rows[0])
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'ID déjà existant.' })
    console.error('[terminals/create]', err)
    res.status(500).json({ error: 'Erreur serveur.' })
  }
})

// ─── DELETE /api/terminals/:id ────────────────────────────────────────────────
router.delete('/:id', requireAuth, requireRole('admin', 'supervisor'), async (req, res) => {
  try {
    const result = await query(
      `DELETE FROM points_controle WHERE id = $1 RETURNING id`,
      [req.params.id]
    )
    if (result.rowCount === 0) return res.status(404).json({ error: 'Terminal introuvable.' })
    res.json({ success: true })
  } catch (err) {
    console.error('[terminals/delete]', err)
    res.status(500).json({ error: 'Erreur serveur.' })
  }
})

// ─── PATCH /api/terminals/:id ─────────────────────────────────────────────────
router.patch('/:id', requireAuth, requireRole('admin', 'supervisor'), async (req, res) => {
  try {
    const fields = []
    const values = []
    let i = 1

    if ('statut'   in req.body) { fields.push(`statut   = $${i++}`); values.push(req.body.statut   || null) }
    if ('nom'      in req.body) { fields.push(`nom      = $${i++}`); values.push(req.body.nom      || null) }
    if ('zone_id'  in req.body) { fields.push(`zone_id  = $${i++}`); values.push(req.body.zone_id  || null) }
    if ('agent_id' in req.body) { fields.push(`agent_id = $${i++}`); values.push(req.body.agent_id || null) }

    if (fields.length === 0) return res.status(400).json({ error: 'Aucun champ à modifier.' })

    values.push(req.params.id)
    const result = await query(
      `UPDATE points_controle SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
      values
    )
    if (result.rowCount === 0) return res.status(404).json({ error: 'Terminal introuvable.' })
    res.json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur.' })
  }
})

export default router
