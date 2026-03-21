import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { query } from '../db/postgres.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

const router = Router()

// Génère un secret TOTP base32 de 16 caractères
function generateTotpSecret() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  return Array.from({ length: 16 }, () => chars[Math.floor(Math.random() * 32)]).join('')
}

// ─── GET /api/users ───────────────────────────────────────────────────────────
router.get('/', requireAuth, requireRole('admin', 'supervisor'), async (req, res) => {
  try {
    const result = await query(
      `SELECT u.id, u.name, u.role, u.zone, u.title, u.is_locked,
              pc.id   AS checkpoint_id,
              pc.nom  AS checkpoint_nom
       FROM users u
       LEFT JOIN points_controle pc ON pc.agent_id = u.id
       ORDER BY
         CASE u.role WHEN 'admin' THEN 1 WHEN 'supervisor' THEN 2 ELSE 3 END,
         u.name`
    )
    res.json(result.rows.map(u => ({
      id:      u.id,
      loginId: u.id,
      name:    u.name,
      role:    u.role,
      zone:    u.checkpoint_nom ?? u.zone ?? '',
      statut:  u.is_locked ? 'BLOQUÉ' : 'HORS LIGNE',
      title:   u.title ?? null,
    })))
  } catch (err) {
    console.error('[users/list]', err)
    res.status(500).json({ error: 'Erreur serveur.' })
  }
})

// ─── POST /api/users ──────────────────────────────────────────────────────────
router.post('/', requireAuth, requireRole('admin'), async (req, res) => {
  const { loginId, name, password, role, zone } = req.body
  if (!loginId || !name || !password || !role) {
    return res.status(400).json({ error: 'Champs obligatoires manquants (loginId, name, password, role).' })
  }
  if (!['agent', 'admin', 'supervisor'].includes(role)) {
    return res.status(400).json({ error: 'Rôle invalide.' })
  }
  try {
    const hash   = await bcrypt.hash(password, 12)
    const secret = generateTotpSecret()
    const result = await query(
      `INSERT INTO users (id, name, password_hash, role, zone, totp_secret)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, role, zone, is_locked`,
      [loginId.toUpperCase(), name, hash, role, zone || null, secret]
    )
    const u = result.rows[0]
    res.status(201).json({
      id:      u.id,
      loginId: u.id,
      name:    u.name,
      role:    u.role,
      zone:    u.zone ?? '',
      statut:  'HORS LIGNE',
    })
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Identifiant déjà utilisé.' })
    console.error('[users/create]', err)
    res.status(500).json({ error: 'Erreur serveur.' })
  }
})

// ─── PATCH /api/users/:id ─────────────────────────────────────────────────────
router.patch('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const { name, role, zone } = req.body
  if (role && !['agent', 'admin', 'supervisor'].includes(role)) {
    return res.status(400).json({ error: 'Rôle invalide.' })
  }
  try {
    const result = await query(
      `UPDATE users SET
         name       = COALESCE($1, name),
         role       = COALESCE($2, role),
         zone       = COALESCE($3, zone),
         updated_at = NOW()
       WHERE id = $4
       RETURNING id, name, role, zone, is_locked`,
      [name || null, role || null, zone ?? null, req.params.id]
    )
    if (result.rowCount === 0) return res.status(404).json({ error: 'Utilisateur introuvable.' })
    const u = result.rows[0]
    res.json({
      id:      u.id,
      loginId: u.id,
      name:    u.name,
      role:    u.role,
      zone:    u.zone ?? '',
      statut:  u.is_locked ? 'BLOQUÉ' : 'HORS LIGNE',
    })
  } catch (err) {
    console.error('[users/update]', err)
    res.status(500).json({ error: 'Erreur serveur.' })
  }
})

// ─── PATCH /api/users/:id/lock — toggle verrouillage ─────────────────────────
router.patch('/:id/lock', requireAuth, requireRole('admin'), async (req, res) => {
  if (req.params.id === req.user.id) {
    return res.status(403).json({ error: 'Vous ne pouvez pas verrouiller votre propre compte.' })
  }
  try {
    const result = await query(
      `UPDATE users SET is_locked = NOT is_locked, updated_at = NOW()
       WHERE id = $1
       RETURNING id, is_locked`,
      [req.params.id]
    )
    if (result.rowCount === 0) return res.status(404).json({ error: 'Utilisateur introuvable.' })
    res.json({ id: result.rows[0].id, is_locked: result.rows[0].is_locked })
  } catch (err) {
    console.error('[users/lock]', err)
    res.status(500).json({ error: 'Erreur serveur.' })
  }
})

// ─── DELETE /api/users/:id ────────────────────────────────────────────────────
router.delete('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  if (req.params.id === req.user.id) {
    return res.status(403).json({ error: 'Vous ne pouvez pas supprimer votre propre compte.' })
  }
  try {
    const result = await query(
      `DELETE FROM users WHERE id = $1 RETURNING id`,
      [req.params.id]
    )
    if (result.rowCount === 0) return res.status(404).json({ error: 'Utilisateur introuvable.' })
    res.json({ success: true })
  } catch (err) {
    console.error('[users/delete]', err)
    res.status(500).json({ error: 'Erreur serveur.' })
  }
})

export default router
