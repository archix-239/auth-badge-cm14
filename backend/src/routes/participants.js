import { Router } from 'express'
import multer from 'multer'
import { join, extname } from 'path'
import { randomBytes } from 'crypto'
import { query } from '../db/postgres.js'
import { publish } from '../db/redis.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import 'dotenv/config'

const router = Router()

// ─── Upload photo ─────────────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: process.env.UPLOAD_DIR || 'uploads',
  filename: (req, file, cb) => {
    cb(null, `${randomBytes(16).toString('hex')}${extname(file.originalname)}`)
  },
})
const upload = multer({
  storage,
  limits: { fileSize: (parseInt(process.env.MAX_FILE_SIZE_MB) || 2) * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/image\/(jpeg|png|webp)/.test(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname))
    }
  },
})

// ─── GET /api/participants ────────────────────────────────────────────────────
router.get('/', requireAuth, async (req, res) => {
  try {
    const { search, statut, categorie } = req.query
    let sql = `SELECT id, nom, prenom, delegation, categorie, zones, statut, date_expiration, photo_url
               FROM participants WHERE 1=1`
    const params = []

    if (search) {
      params.push(`%${search}%`)
      sql += ` AND (nom ILIKE $${params.length} OR prenom ILIKE $${params.length} OR delegation ILIKE $${params.length})`
    }
    if (statut) {
      params.push(statut)
      sql += ` AND statut = $${params.length}`
    }
    if (categorie) {
      params.push(categorie)
      sql += ` AND categorie = $${params.length}`
    }

    sql += ' ORDER BY nom, prenom'
    const result = await query(sql, params)
    res.json(result.rows)
  } catch (err) {
    console.error('[participants/list]', err)
    res.status(500).json({ error: 'Erreur serveur.' })
  }
})

// ─── GET /api/participants/:id ────────────────────────────────────────────────
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const result = await query(
      `SELECT id, nom, prenom, delegation, categorie, zones, statut, date_expiration, photo_url
       FROM participants WHERE id = $1`,
      [req.params.id]
    )
    if (result.rowCount === 0) return res.status(404).json({ error: 'Participant introuvable.' })
    res.json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur.' })
  }
})

// ─── POST /api/participants ───────────────────────────────────────────────────
router.post('/', requireAuth, requireRole('admin', 'supervisor'), async (req, res) => {
  const { id, nom, prenom, delegation, categorie, zones, statut, date_expiration } = req.body
  if (!id || !nom || !prenom || !delegation || !categorie || !zones || !date_expiration) {
    return res.status(400).json({ error: 'Champs obligatoires manquants.' })
  }
  try {
    const result = await query(
      `INSERT INTO participants (id, nom, prenom, delegation, categorie, zones, statut, date_expiration)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [id, nom, prenom, delegation, categorie, zones, statut || 'actif', date_expiration]
    )
    res.status(201).json(result.rows[0])
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'ID déjà existant.' })
    console.error('[participants/create]', err)
    res.status(500).json({ error: 'Erreur serveur.' })
  }
})

// ─── PATCH /api/participants/:id ──────────────────────────────────────────────
router.patch('/:id', requireAuth, requireRole('admin', 'supervisor'), async (req, res) => {
  const allowed = ['nom', 'prenom', 'delegation', 'categorie', 'zones', 'statut', 'date_expiration']
  const fields  = Object.keys(req.body).filter(k => allowed.includes(k))
  if (fields.length === 0) return res.status(400).json({ error: 'Aucun champ valide.' })

  const sets   = fields.map((f, i) => `${f} = $${i + 1}`)
  const values = fields.map(f => req.body[f])
  values.push(req.params.id)

  try {
    const result = await query(
      `UPDATE participants SET ${sets.join(', ')}, updated_at = NOW()
       WHERE id = $${values.length} RETURNING *`,
      values
    )
    if (result.rowCount === 0) return res.status(404).json({ error: 'Participant introuvable.' })

    // Si révocation → propagation temps réel via Redis Pub/Sub
    if (req.body.statut === 'révoqué') {
      await publish('badge:revoked', { id: req.params.id, nom: result.rows[0].nom, prenom: result.rows[0].prenom })
    }

    res.json(result.rows[0])
  } catch (err) {
    console.error('[participants/update]', err)
    res.status(500).json({ error: 'Erreur serveur.' })
  }
})

// ─── POST /api/participants/:id/photo ─────────────────────────────────────────
router.post('/:id/photo', requireAuth, requireRole('admin', 'supervisor'),
  upload.single('photo'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Fichier image requis (jpeg/png/webp, max 2 Mo).' })
    const url = `/uploads/${req.file.filename}`
    try {
      await query(`UPDATE participants SET photo_url = $1, updated_at = NOW() WHERE id = $2`, [url, req.params.id])
      res.json({ photo_url: url })
    } catch (err) {
      res.status(500).json({ error: 'Erreur serveur.' })
    }
  }
)

export default router
