import { Router } from 'express'
import * as OTPAuth from 'otpauth'
import bcrypt from 'bcryptjs'
import { query } from '../db/postgres.js'
import { blacklistToken, isTokenBlacklisted } from '../db/redis.js'
import {
  signAccessToken, createRefreshToken,
  rotateRefreshToken, revokeAllUserTokens,
} from '../utils/jwt.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

// ─── POST /api/auth/login ──────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { id, password, otp } = req.body

  if (!id || !password || !otp) {
    return res.status(400).json({ error: 'Champs id, password et otp requis.' })
  }

  if (!/^\d{6}$/.test(otp)) {
    return res.status(400).json({ error: 'Code OTP invalide (6 chiffres requis).' })
  }

  try {
    const result = await query(
      `SELECT id, password_hash, role, name, zone, title, totp_secret, is_locked
       FROM users WHERE id = $1`,
      [id]
    )

    const user = result.rows[0]

    if (!user) {
      // Délai constant pour éviter l'énumération de comptes
      await new Promise(r => setTimeout(r, 400 + Math.random() * 200))
      return res.status(401).json({ error: 'Identifiants incorrects.' })
    }

    if (user.is_locked) {
      return res.status(403).json({ error: 'Compte bloqué. Contactez l\'administrateur.' })
    }

    const passwordOk = await bcrypt.compare(password, user.password_hash)
    if (!passwordOk) {
      return res.status(401).json({ error: 'Identifiants incorrects.' })
    }

    // Validation TOTP (RFC 6238, SHA-1, 6 digits, 30s, window=1)
    const totp = new OTPAuth.TOTP({
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(user.totp_secret),
    })
    const delta = totp.validate({ token: otp, window: 1 })
    if (delta === null) {
      return res.status(401).json({ error: 'Code OTP invalide ou expiré.' })
    }

    const publicUser = { id: user.id, role: user.role, name: user.name, zone: user.zone, title: user.title }
    const accessToken  = signAccessToken(publicUser)
    const refreshToken = await createRefreshToken(user.id)

    return res.json({ accessToken, refreshToken, user: publicUser })
  } catch (err) {
    console.error('[auth/login]', err)
    return res.status(500).json({ error: 'Erreur serveur.' })
  }
})

// ─── POST /api/auth/refresh ────────────────────────────────────────────────────
router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body
  if (!refreshToken) return res.status(400).json({ error: 'refreshToken requis.' })

  try {
    const userId = await rotateRefreshToken(refreshToken)
    if (!userId) {
      return res.status(401).json({ error: 'Token de rafraîchissement invalide ou expiré.' })
    }

    const result = await query(
      `SELECT id, role, name, zone, title FROM users WHERE id = $1`,
      [userId]
    )
    const user = result.rows[0]
    if (!user) return res.status(401).json({ error: 'Utilisateur introuvable.' })

    const newAccessToken  = signAccessToken(user)
    const newRefreshToken = await createRefreshToken(userId)

    return res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken })
  } catch (err) {
    console.error('[auth/refresh]', err)
    return res.status(500).json({ error: 'Erreur serveur.' })
  }
})

// ─── POST /api/auth/logout ────────────────────────────────────────────────────
router.post('/logout', requireAuth, async (req, res) => {
  try {
    // Blackliste l'access token courant jusqu'à son expiration naturelle
    const ttl = req.user.exp - Math.floor(Date.now() / 1000)
    if (ttl > 0) await blacklistToken(req.user.jti, ttl)

    await revokeAllUserTokens(req.user.id)
    return res.json({ success: true })
  } catch (err) {
    console.error('[auth/logout]', err)
    return res.status(500).json({ error: 'Erreur serveur.' })
  }
})

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user })
})

export default router
