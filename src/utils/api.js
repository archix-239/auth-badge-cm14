/**
 * Client API AUTH-BADGE CM14
 *
 * - Injecte automatiquement le Bearer token
 * - Rafraîchit silencieusement l'access token sur 401
 * - Détecte le mode offline et retourne une erreur exploitable
 */

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

// Tokens stockés en mémoire (access) + localStorage (refresh)
let _accessToken  = null
let _refreshing   = null  // Promise de refresh en cours (évite les requêtes parallèles)

export function setAccessToken(token) { _accessToken = token }
export function clearTokens() {
  _accessToken = null
  localStorage.removeItem('cm14_refresh_token')
}

function getRefreshToken() { return localStorage.getItem('cm14_refresh_token') }
function saveRefreshToken(t) { localStorage.setItem('cm14_refresh_token', t) }

// ─── Refresh silencieux ───────────────────────────────────────────────────────
async function refreshAccessToken() {
  const rt = getRefreshToken()
  if (!rt) throw new Error('NO_REFRESH_TOKEN')

  const res = await fetch(`${BASE_URL}/api/auth/refresh`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ refreshToken: rt }),
  })
  if (!res.ok) {
    clearTokens()
    throw new Error('REFRESH_FAILED')
  }
  const data = await res.json()
  setAccessToken(data.accessToken)
  saveRefreshToken(data.refreshToken)
  return data.accessToken
}

// ─── Fetch central ───────────────────────────────────────────────────────────
// Timeout en ms : 8s pour les scans offline (évite les requêtes qui restent
// pendantes sur Android quand le réseau est coupé mais navigator.onLine=true)
const REQUEST_TIMEOUT_MS = 8_000

export async function apiFetch(path, options = {}) {
  if (!navigator.onLine) {
    const err = new Error('OFFLINE')
    err.offline = true
    throw err
  }

  const doRequest = async (token) => {
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    }
    const signal = options.signal ?? (
      AbortSignal.timeout
        ? AbortSignal.timeout(REQUEST_TIMEOUT_MS)
        : (() => { const c = new AbortController(); setTimeout(() => c.abort(), REQUEST_TIMEOUT_MS); return c.signal })()
    )
    return fetch(`${BASE_URL}${path}`, { ...options, headers, signal })
  }

  let res = await doRequest(_accessToken)

  // Token expiré → tente un refresh unique
  if (res.status === 401 && _accessToken) {
    if (!_refreshing) _refreshing = refreshAccessToken().finally(() => { _refreshing = null })
    const newToken = await _refreshing
    res = await doRequest(newToken)
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const err  = new Error(body.error || `HTTP ${res.status}`)
    err.status = res.status
    err.body   = body
    throw err
  }

  const ct = res.headers.get('Content-Type') || ''
  return ct.includes('application/json') ? res.json() : res.text()
}

// ─── Raccourcis ───────────────────────────────────────────────────────────────
export const api = {
  get:    (path, opts = {}) => apiFetch(path, { ...opts, method: 'GET' }),
  post:   (path, body, opts = {}) => apiFetch(path, { ...opts, method: 'POST',  body: JSON.stringify(body) }),
  patch:  (path, body, opts = {}) => apiFetch(path, { ...opts, method: 'PATCH', body: JSON.stringify(body) }),
  delete: (path, opts = {}) => apiFetch(path, { ...opts, method: 'DELETE' }),
}

export const apiUrl = (path) => `${BASE_URL}${path}`
