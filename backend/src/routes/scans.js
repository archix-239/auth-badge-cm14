import { Router } from 'express'
import { query } from '../db/postgres.js'
import { publish } from '../db/redis.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

const router = Router()

// ─── POST /api/scans ──────────────────────────────────────────────────────────
// Endpoint principal de scan — appelé par l'agent après lecture du QR/NFC.
// Le frontend a déjà déterminé le résultat (autorisé / révoqué / zone-refusée / inconnu).
// Le backend persiste le log et propage en temps réel.
router.post('/', requireAuth, async (req, res) => {
  const { participant_id, nom, delegation, categorie, zone, point_controle_id, resultat } = req.body

  if (!nom || !resultat) {
    return res.status(400).json({ error: 'Champs nom et resultat requis.' })
  }
  const validResults = ['autorisé', 'révoqué', 'zone-refusée', 'inconnu']
  if (!validResults.includes(resultat)) {
    return res.status(400).json({ error: `Résultat invalide. Valeurs acceptées : ${validResults.join(', ')}` })
  }

  try {
    // Persist le log
    const logResult = await query(
      `INSERT INTO scan_logs (participant_id, nom, delegation, categorie, zone, point_controle_id, resultat, agent_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING id, timestamp`,
      [participant_id || null, nom, delegation || null, categorie || null,
       zone || null, point_controle_id || null, resultat, req.user.id]
    )

    // Met à jour le compteur du point de contrôle
    if (point_controle_id) {
      await query(
        `UPDATE points_controle SET scans = scans + 1, last_seen = NOW() WHERE id = $1`,
        [point_controle_id]
      )
    }

    const log = {
      id:               logResult.rows[0].id,
      participant_id,
      nom,
      delegation,
      categorie,
      zone,
      point_controle_id,
      resultat,
      agent_id:  req.user.id,
      timestamp: logResult.rows[0].timestamp,
    }

    // Diffuse le scan en temps réel (superviseurs, admin)
    await publish('scan:new', log)

    return res.status(201).json(log)
  } catch (err) {
    console.error('[scans/create]', err)
    return res.status(500).json({ error: 'Erreur serveur.' })
  }
})

// ─── GET /api/scans ───────────────────────────────────────────────────────────
router.get('/', requireAuth, async (req, res) => {
  try {
    const { limit = 50, offset = 0, agent_id, resultat, from, to } = req.query
    let sql = `SELECT l.id, l.participant_id, l.nom, l.delegation, l.categorie,
                      l.zone, l.point_controle_id, l.resultat, l.agent_id, l.timestamp
               FROM scan_logs l WHERE 1=1`
    const params = []

    // Un agent ne voit que ses propres logs
    const effectiveAgentId = req.user.role === 'agent' ? req.user.id : agent_id
    if (effectiveAgentId) {
      params.push(effectiveAgentId)
      sql += ` AND l.agent_id = $${params.length}`
    }
    if (resultat) {
      params.push(resultat)
      sql += ` AND l.resultat = $${params.length}`
    }
    if (from) {
      params.push(from)
      sql += ` AND l.timestamp >= $${params.length}`
    }
    if (to) {
      params.push(to)
      sql += ` AND l.timestamp <= $${params.length}`
    }

    params.push(parseInt(limit))
    params.push(parseInt(offset))
    sql += ` ORDER BY l.timestamp DESC LIMIT $${params.length - 1} OFFSET $${params.length}`

    const result = await query(sql, params)
    res.json(result.rows)
  } catch (err) {
    console.error('[scans/list]', err)
    res.status(500).json({ error: 'Erreur serveur.' })
  }
})

// ─── GET /api/scans/stats ─────────────────────────────────────────────────────
router.get('/stats', requireAuth, requireRole('admin', 'supervisor'), async (req, res) => {
  try {
    const result = await query(`
      SELECT
        COUNT(*) FILTER (WHERE timestamp > NOW() - INTERVAL '24h')            AS total_24h,
        COUNT(*) FILTER (WHERE resultat = 'autorisé' AND timestamp > NOW() - INTERVAL '24h')    AS autorises_24h,
        COUNT(*) FILTER (WHERE resultat IN ('révoqué','inconnu') AND timestamp > NOW() - INTERVAL '24h') AS alertes_24h,
        COUNT(*) FILTER (WHERE resultat = 'zone-refusée' AND timestamp > NOW() - INTERVAL '24h') AS zones_refusees_24h
      FROM scan_logs
    `)
    res.json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur.' })
  }
})

// ─── GET /api/scans/export ────────────────────────────────────────────────────
router.get('/export', requireAuth, requireRole('admin', 'supervisor'), async (req, res) => {
  try {
    const { format = 'json', from, to } = req.query
    let sql = `SELECT l.id, l.participant_id, l.nom, l.delegation, l.categorie,
                      l.zone, l.point_controle_id, l.resultat, l.agent_id, l.timestamp
               FROM scan_logs l WHERE 1=1`
    const params = []
    if (from) { params.push(from); sql += ` AND l.timestamp >= $${params.length}` }
    if (to)   { params.push(to);   sql += ` AND l.timestamp <= $${params.length}` }
    sql += ' ORDER BY l.timestamp DESC'

    const result = await query(sql, params)
    const rows   = result.rows

    if (format === 'csv') {
      const cols = ['id','participant_id','nom','delegation','categorie','zone','point_controle_id','resultat','agent_id','timestamp']
      const csv  = [cols.join(','), ...rows.map(r => cols.map(c => `"${r[c] ?? ''}"`).join(','))].join('\n')
      res.setHeader('Content-Type', 'text/csv')
      res.setHeader('Content-Disposition', 'attachment; filename="scans.csv"')
      return res.send(csv)
    }

    res.json(rows)
  } catch (err) {
    console.error('[scans/export]', err)
    res.status(500).json({ error: 'Erreur serveur.' })
  }
})

export default router
