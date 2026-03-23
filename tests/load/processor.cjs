'use strict'
/**
 * Artillery processor — AUTH-BADGE CM14
 * Artillery v2 : les fonctions async n'utilisent PAS le callback `done`.
 * Elles retournent une Promise — Artillery attend la résolution automatiquement.
 */

const https  = require('https')
const crypto = require('crypto')

// ─── TOTP RFC 6238 (Node.js natif, sans dépendance externe) ──────────────────

function base32Decode(encoded) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  let bits = 0, value = 0
  const result = []
  for (const char of encoded.toUpperCase().replace(/=+$/, '')) {
    const idx = alphabet.indexOf(char)
    if (idx < 0) continue
    value = (value << 5) | idx
    bits += 5
    if (bits >= 8) { result.push((value >>> (bits - 8)) & 0xff); bits -= 8 }
  }
  return Buffer.from(result)
}

function generateTotp(secret) {
  const key     = base32Decode(secret)
  const counter = Math.floor(Date.now() / 1000 / 30)
  const buf     = Buffer.alloc(8)
  buf.writeBigUInt64BE(BigInt(counter))
  const hmac   = crypto.createHmac('sha1', key).update(buf).digest()
  const offset = hmac[hmac.length - 1] & 0xf
  const code   = (
    ((hmac[offset]     & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) <<  8) |
     (hmac[offset + 3] & 0xff)
  ) % 1_000_000
  return String(code).padStart(6, '0')
}

// ─── Login partagé ────────────────────────────────────────────────────────────

let sharedToken  = null
let loginPromise = null

function doLogin() {
  return new Promise((resolve, reject) => {
    const otp  = generateTotp('JBSWY3DPEHPK3PXP')
    const body = JSON.stringify({ id: 'AG-8824', password: 'Agent@CM14!', otp })

    const req = https.request({
      hostname: 'localhost', port: 3001,
      path: '/api/auth/login', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
      rejectUnauthorized: false,
    }, (res) => {
      let data = ''
      res.on('data', c => { data += c })
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data)
          if (parsed.accessToken) resolve(parsed.accessToken)
          else reject(new Error(`Login échoué (${res.statusCode}): ${data}`))
        } catch (e) { reject(e) }
      })
    })
    req.on('error', reject)
    req.write(body)
    req.end()
  })
}

// ─── Exports Artillery v2 (async = pas de done) ───────────────────────────────

module.exports = {
  /** Obtient un token partagé — un seul login pour tous les virtual users. */
  async ensureLogin(context, _events) {
    if (sharedToken) {
      context.vars.accessToken = sharedToken
      return
    }
    if (!loginPromise) {
      loginPromise = doLogin()
        .then(t  => { sharedToken = t; return t })
        .catch(e => { loginPromise = null; throw e })
    }
    context.vars.accessToken = await loginPromise
  },

  /** Choisit un participant aléatoire parmi les données de test. */
  pickParticipant(context, _events, done) {
    const list = [
      { participant_id: 'P-001', nom: 'Jean Dupont',  delegation: 'France',  categorie: 'MIN', zone: 'Z1', point_controle_id: 'PC-01', resultat: 'autorisé'     },
      { participant_id: 'P-002', nom: 'Maria Garcia', delegation: 'Espagne', categorie: 'OBS', zone: 'Z1', point_controle_id: 'PC-01', resultat: 'autorisé'     },
      { participant_id: 'P-003', nom: 'John Smith',   delegation: 'USA',     categorie: 'DEL', zone: 'Z2', point_controle_id: 'PC-02', resultat: 'zone-refusée' },
    ]
    Object.assign(context.vars, list[Math.floor(Math.random() * list.length)])
    done()
  },
}
