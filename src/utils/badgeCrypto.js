/**
 * Badge ECDSA P-256 signing & verification (Web Crypto API — RFC 6979)
 *
 * Phase 2 — prototype: the key pair is generated once and stored in
 * localStorage. In Phase 3, the private key moves server-side; only
 * the public key stays bundled with the agent app.
 */

const KEY_ALGO   = { name: 'ECDSA', namedCurve: 'P-256' }
const SIGN_ALGO  = { name: 'ECDSA', hash: 'SHA-256' }
const STORAGE_KEY = 'cm14_badge_keys'

let _cachedPair = null

async function getKeyPair() {
  if (_cachedPair) return _cachedPair

  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored) {
    try {
      const { priv, pub } = JSON.parse(stored)
      const privateKey = await crypto.subtle.importKey('jwk', priv, KEY_ALGO, false, ['sign'])
      const publicKey  = await crypto.subtle.importKey('jwk', pub,  KEY_ALGO, false, ['verify'])
      _cachedPair = { privateKey, publicKey }
      return _cachedPair
    } catch { /* keys corrupted — regenerate */ }
  }

  const kp = await crypto.subtle.generateKey(KEY_ALGO, true, ['sign', 'verify'])
  const priv = await crypto.subtle.exportKey('jwk', kp.privateKey)
  const pub  = await crypto.subtle.exportKey('jwk', kp.publicKey)
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ priv, pub }))
  _cachedPair = kp
  return _cachedPair
}

/** Fields signed — order is fixed to guarantee deterministic serialisation. */
function canonicalData(p) {
  return new TextEncoder().encode(JSON.stringify({
    id:         p.id,
    nom:        p.nom,
    prenom:     p.prenom,
    delegation: p.delegation,
    categorie:  p.categorie,
    zones:      p.zones,
    exp:        p.exp,
  }))
}

function toBase64url(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

function fromBase64url(str) {
  return Uint8Array.from(
    atob(str.replace(/-/g, '+').replace(/_/g, '/')),
    c => c.charCodeAt(0)
  )
}

/**
 * Sign a badge payload. Returns a base64url ECDSA signature string.
 * @param {{ id, nom, prenom, delegation, categorie, zones, exp }} payload
 */
export async function signBadge(payload) {
  const { privateKey } = await getKeyPair()
  const sigBuf = await crypto.subtle.sign(SIGN_ALGO, privateKey, canonicalData(payload))
  return toBase64url(sigBuf)
}

/**
 * Verify a QR payload's signature.
 * Returns { valid: true }  — signature OK (or legacy unsigned badge)
 * Returns { valid: false } — signature missing, wrong, or tampered
 */
export async function verifyBadge(payload) {
  // Legacy / mock badge — no real signature yet, accept gracefully
  if (!payload.sig || payload.sig === 'ECDSA-P256-MOCK') {
    return { valid: true, signed: false }
  }
  try {
    const { publicKey } = await getKeyPair()
    const sigBytes = fromBase64url(payload.sig)
    const valid = await crypto.subtle.verify(SIGN_ALGO, publicKey, sigBytes, canonicalData(payload))
    return { valid, signed: true }
  } catch {
    return { valid: false, signed: true }
  }
}
