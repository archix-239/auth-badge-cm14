/**
 * Offline badge store — IndexedDB + AES-256-GCM (Web Crypto API)
 *
 * Each badge record is individually encrypted before being written
 * to IndexedDB. The encryption key is stored as a JWK in localStorage
 * (Phase 2 prototype). In Phase 3 it will be derived server-side.
 */

const DB_NAME    = 'cm14_offline'
const DB_VERSION = 1
const STORE      = 'badges'
const KEY_ITEM   = 'cm14_enc_key'

// ─── AES-256-GCM key ────────────────────────────────────────────────────────

let _encKey = null

async function getEncKey() {
  if (_encKey) return _encKey

  const stored = localStorage.getItem(KEY_ITEM)
  if (stored) {
    try {
      _encKey = await crypto.subtle.importKey(
        'jwk', JSON.parse(stored),
        { name: 'AES-GCM', length: 256 },
        false, ['encrypt', 'decrypt']
      )
      return _encKey
    } catch { /* key corrupted — regenerate */ }
  }

  _encKey = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']
  )
  const jwk = await crypto.subtle.exportKey('jwk', _encKey)
  localStorage.setItem(KEY_ITEM, JSON.stringify(jwk))
  return _encKey
}

async function encryptRecord(data) {
  const key = await getEncKey()
  const iv  = crypto.getRandomValues(new Uint8Array(12))
  const ct  = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(JSON.stringify(data))
  )
  return { iv: Array.from(iv), ct: Array.from(new Uint8Array(ct)) }
}

async function decryptRecord(enc) {
  const key  = await getEncKey()
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: new Uint8Array(enc.iv) },
    key,
    new Uint8Array(enc.ct)
  )
  return JSON.parse(new TextDecoder().decode(plain))
}

// ─── IndexedDB helpers ───────────────────────────────────────────────────────

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = e => {
      e.target.result.createObjectStore(STORE, { keyPath: 'id' })
    }
    req.onsuccess = e => resolve(e.target.result)
    req.onerror   = e => reject(e.target.error)
  })
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Write the full participant list into IndexedDB (encrypted).
 * Called after login / sync. Records the sync timestamp.
 * @param {Array} participants
 */
export async function syncBadgeStore(participants) {
  const db = await openDB()
  const tx = db.transaction(STORE, 'readwrite')
  const st = tx.objectStore(STORE)

  st.clear()
  for (const p of participants) {
    const enc = await encryptRecord(p)
    st.put({ id: p.id, enc })
  }

  await new Promise((res, rej) => {
    tx.oncomplete = res
    tx.onerror    = e => rej(e.target.error)
  })
  db.close()

  localStorage.setItem('cm14_last_sync', new Date().toISOString())
}

/**
 * Look up a participant by badge ID from the encrypted local store.
 * Falls back to null if not found or store empty.
 * @param {string} id
 * @returns {Promise<object|null>}
 */
export async function lookupBadge(id) {
  try {
    const db = await openDB()
    const result = await new Promise((res, rej) => {
      const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(id)
      req.onsuccess = e => res(e.target.result ?? null)
      req.onerror   = () => res(null)
    })
    db.close()
    if (!result) return null
    return await decryptRecord(result.enc)
  } catch {
    return null
  }
}

/**
 * Met à jour le statut d'un badge dans le cache offline (ex: révocation temps réel).
 * Si le badge n'est pas dans le cache, l'opération est ignorée silencieusement.
 * @param {string} id   — identifiant du badge (ex: "P-006")
 * @param {string} statut — nouveau statut ("révoqué" | "suspendu" | "actif")
 */
export async function updateBadgeStatus(id, statut) {
  try {
    const db = await openDB()
    const existing = await new Promise((res) => {
      const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(id)
      req.onsuccess = e => res(e.target.result ?? null)
      req.onerror   = () => res(null)
    })
    if (!existing) { db.close(); return }

    const data = await decryptRecord(existing.enc)
    data.statut = statut
    const enc = await encryptRecord(data)

    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put({ id, enc })
    await new Promise((res, rej) => {
      tx.oncomplete = res
      tx.onerror    = e => rej(e.target.error)
    })
    db.close()
  } catch { /* silently ignore — cache best-effort */ }
}

/**
 * Count records currently in the store (for diagnostics).
 * @returns {Promise<number>}
 */
export async function getBadgeStoreSize() {
  try {
    const db = await openDB()
    const count = await new Promise((res, rej) => {
      const req = db.transaction(STORE, 'readonly').objectStore(STORE).count()
      req.onsuccess = e => res(e.target.result)
      req.onerror   = () => res(0)
    })
    db.close()
    return count
  } catch {
    return 0
  }
}
