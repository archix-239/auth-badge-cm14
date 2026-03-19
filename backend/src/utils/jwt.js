import jwt from 'jsonwebtoken'
import { createHash, randomBytes } from 'crypto'
import { query } from '../db/postgres.js'
import 'dotenv/config'

const ACCESS_SECRET  = process.env.JWT_ACCESS_SECRET
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET
const ACCESS_EXP     = process.env.JWT_ACCESS_EXPIRES  || '60m'
const REFRESH_EXP    = process.env.JWT_REFRESH_EXPIRES || '7d'

if (!ACCESS_SECRET || !REFRESH_SECRET) {
  throw new Error('JWT secrets manquants — vérifiez votre fichier .env')
}

export function signAccessToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, name: user.name, jti: randomBytes(16).toString('hex') },
    ACCESS_SECRET,
    { expiresIn: ACCESS_EXP }
  )
}

export async function createRefreshToken(userId) {
  const raw   = randomBytes(40).toString('hex')
  const hash  = createHash('sha256').update(raw).digest('hex')
  const exp   = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 jours

  await query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
    [userId, hash, exp]
  )
  return raw
}

export async function rotateRefreshToken(raw) {
  const hash = createHash('sha256').update(raw).digest('hex')
  const result = await query(
    `DELETE FROM refresh_tokens WHERE token_hash = $1 AND expires_at > NOW() RETURNING user_id`,
    [hash]
  )
  if (result.rowCount === 0) return null
  return result.rows[0].user_id
}

export function verifyAccessToken(token) {
  return jwt.verify(token, ACCESS_SECRET)
}

export async function revokeAllUserTokens(userId) {
  await query(`DELETE FROM refresh_tokens WHERE user_id = $1`, [userId])
}
