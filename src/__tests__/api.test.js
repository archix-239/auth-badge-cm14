import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { apiFetch, setAccessToken, clearTokens, api, apiUrl } from '../utils/api'

describe('apiFetch', () => {
  beforeEach(() => {
    clearTokens()
    localStorage.clear()
    vi.stubGlobal('fetch', vi.fn())
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('lance une erreur OFFLINE quand navigator.onLine est false', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true })
    await expect(apiFetch('/api/test')).rejects.toThrow('OFFLINE')
  })

  it('retourne le JSON de la réponse si la requête réussit', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({ data: 'ok' }),
    })
    const result = await apiFetch('/api/test')
    expect(result).toEqual({ data: 'ok' })
  })

  it('injecte le Bearer token dans les headers', async () => {
    setAccessToken('mon-token-jwt')
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({}),
    })
    await apiFetch('/api/test')
    const [, options] = vi.mocked(fetch).mock.calls[0]
    expect(options.headers.Authorization).toBe('Bearer mon-token-jwt')
  })

  it('lance une erreur avec le statut HTTP sur une réponse non-ok', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 403,
      headers: { get: () => 'application/json' },
      json: async () => ({ error: 'Accès refusé' }),
    })
    await expect(apiFetch('/api/protege')).rejects.toThrow('Accès refusé')
  })

  it('rafraîchit le token sur 401 et réessaie la requête', async () => {
    setAccessToken('token-expire')
    localStorage.setItem('cm14_refresh_token', 'refresh-valide')

    vi.mocked(fetch)
      // 1ère requête → 401
      .mockResolvedValueOnce({
        ok: false, status: 401,
        headers: { get: () => 'application/json' },
        json: async () => ({}),
      })
      // Appel refresh → 200 avec nouveaux tokens
      .mockResolvedValueOnce({
        ok: true, status: 200,
        headers: { get: () => 'application/json' },
        json: async () => ({ accessToken: 'nouveau-token', refreshToken: 'nouveau-refresh' }),
      })
      // 2ème requête avec nouveau token → 200
      .mockResolvedValueOnce({
        ok: true, status: 200,
        headers: { get: () => 'application/json' },
        json: async () => ({ data: 'succès après refresh' }),
      })

    const result = await apiFetch('/api/protege')
    expect(result).toEqual({ data: 'succès après refresh' })
    expect(fetch).toHaveBeenCalledTimes(3)
  })

  it('retourne du texte quand Content-Type n\'est pas JSON', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => 'text/csv' },
      text: async () => 'id,nom\n1,Dupont',
    })
    const result = await apiFetch('/api/export')
    expect(result).toBe('id,nom\n1,Dupont')
  })

  it('clearTokens supprime l\'access token et le refresh token', () => {
    setAccessToken('token-a-supprimer')
    localStorage.setItem('cm14_refresh_token', 'refresh-a-supprimer')
    clearTokens()
    expect(localStorage.getItem('cm14_refresh_token')).toBeNull()
  })
})

describe('api shortcuts', () => {
  beforeEach(() => {
    clearTokens()
    vi.stubGlobal('fetch', vi.fn())
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  const mockOk = (body = {}) => vi.mocked(fetch).mockResolvedValueOnce({
    ok: true, status: 200,
    headers: { get: () => 'application/json' },
    json: async () => body,
  })

  it('api.get envoie une requête GET', async () => {
    mockOk({ items: [] })
    await api.get('/api/participants')
    const [, opts] = vi.mocked(fetch).mock.calls[0]
    expect(opts.method).toBe('GET')
  })

  it('api.post envoie une requête POST avec le body JSON', async () => {
    mockOk({ id: 'P-001' })
    await api.post('/api/participants', { nom: 'Dupont' })
    const [, opts] = vi.mocked(fetch).mock.calls[0]
    expect(opts.method).toBe('POST')
    expect(JSON.parse(opts.body)).toEqual({ nom: 'Dupont' })
  })

  it('api.patch envoie une requête PATCH', async () => {
    mockOk({ updated: true })
    await api.patch('/api/participants/P-001', { statut: 'révoqué' })
    const [, opts] = vi.mocked(fetch).mock.calls[0]
    expect(opts.method).toBe('PATCH')
  })

  it('api.delete envoie une requête DELETE', async () => {
    mockOk()
    await api.delete('/api/participants/P-001')
    const [, opts] = vi.mocked(fetch).mock.calls[0]
    expect(opts.method).toBe('DELETE')
  })
})

describe('apiUrl', () => {
  it('retourne l\'URL complète avec le chemin fourni', () => {
    const url = apiUrl('/api/health')
    expect(url).toContain('/api/health')
  })
})
