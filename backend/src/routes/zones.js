import { Router } from 'express'
import { query } from '../db/postgres.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

const router = Router()

// ─── GET /api/zones ───────────────────────────────────────────────────────────
router.get('/', requireAuth, async (req, res) => {
  try {
    const result = await query(
      `SELECT z.id, z.nom, z.description, z.niveau_acces,
              COUNT(DISTINCT pc.id) AS portes_count
       FROM zones z
       LEFT JOIN points_controle pc ON pc.zone_id = z.id
       GROUP BY z.id
       ORDER BY z.id`
    )
    res.json(result.rows)
  } catch (err) {
    console.error('[zones/list]', err)
    res.status(500).json({ error: 'Erreur serveur.' })
  }
})

// ─── POST /api/zones ──────────────────────────────────────────────────────────
router.post('/', requireAuth, requireRole('admin'), async (req, res) => {
  const { id, nom, description, niveau_acces } = req.body
  if (!id || !nom) {
    return res.status(400).json({ error: 'Les champs id et nom sont obligatoires.' })
  }
  try {
    const result = await query(
      `INSERT INTO zones (id, nom, description, niveau_acces)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [id.toUpperCase(), nom, description ?? null, niveau_acces ?? 1]
    )
    res.status(201).json(result.rows[0])
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Identifiant de zone déjà existant.' })
    console.error('[zones/create]', err)
    res.status(500).json({ error: 'Erreur serveur.' })
  }
})

// ─── PATCH /api/zones/:id ─────────────────────────────────────────────────────
router.patch('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const { nom, description, niveau_acces } = req.body
  try {
    const result = await query(
      `UPDATE zones SET
         nom          = COALESCE($1, nom),
         description  = COALESCE($2, description),
         niveau_acces = COALESCE($3, niveau_acces)
       WHERE id = $4 RETURNING *`,
      [nom || null, description ?? null, niveau_acces ?? null, req.params.id]
    )
    if (result.rowCount === 0) return res.status(404).json({ error: 'Zone introuvable.' })
    res.json(result.rows[0])
  } catch (err) {
    console.error('[zones/update]', err)
    res.status(500).json({ error: 'Erreur serveur.' })
  }
})

// ─── DELETE /api/zones/:id ────────────────────────────────────────────────────
router.delete('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    // Vérifie s'il reste des portes liées à cette zone
    const used = await query(
      `SELECT COUNT(*) AS n FROM points_controle WHERE zone_id = $1`,
      [req.params.id]
    )
    if (parseInt(used.rows[0].n) > 0) {
      return res.status(409).json({
        error: 'Impossible de supprimer : des portes utilisent encore cette zone.',
      })
    }
    const result = await query(`DELETE FROM zones WHERE id = $1 RETURNING id`, [req.params.id])
    if (result.rowCount === 0) return res.status(404).json({ error: 'Zone introuvable.' })
    res.json({ success: true })
  } catch (err) {
    console.error('[zones/delete]', err)
    res.status(500).json({ error: 'Erreur serveur.' })
  }
})

export default router
