import { describe, it, expect, beforeEach, vi } from 'vitest'

const PAYLOAD = {
  id: 'P-001', nom: 'Dupont', prenom: 'Jean',
  delegation: 'France', categorie: 'MIN',
  zones: ['Z1'], exp: '2026-12-31',
}

describe('signBadge / verifyBadge', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.resetModules()
  })

  it('génère une signature base64url valide', async () => {
    const { signBadge } = await import('../utils/badgeCrypto')
    const sig = await signBadge(PAYLOAD)
    expect(typeof sig).toBe('string')
    expect(sig.length).toBeGreaterThan(0)
    // base64url ne contient pas +, /, =
    expect(sig).not.toMatch(/[+/=]/)
  })

  it('vérifie correctement une signature valide', async () => {
    const { signBadge, verifyBadge } = await import('../utils/badgeCrypto')
    const sig = await signBadge(PAYLOAD)
    const { valid, signed } = await verifyBadge({ ...PAYLOAD, sig })
    expect(valid).toBe(true)
    expect(signed).toBe(true)
  })

  it('rejette un payload falsifié', async () => {
    const { signBadge, verifyBadge } = await import('../utils/badgeCrypto')
    const sig = await signBadge(PAYLOAD)
    const { valid } = await verifyBadge({ ...PAYLOAD, nom: 'Hacker', sig })
    expect(valid).toBe(false)
  })

  it('accepte les badges legacy sans signature (rétrocompatibilité)', async () => {
    const { verifyBadge } = await import('../utils/badgeCrypto')
    const { valid, signed } = await verifyBadge({ ...PAYLOAD })
    expect(valid).toBe(true)
    expect(signed).toBe(false)
  })

  it('accepte la signature ECDSA-P256-MOCK (badges de démonstration)', async () => {
    const { verifyBadge } = await import('../utils/badgeCrypto')
    const { valid, signed } = await verifyBadge({ ...PAYLOAD, sig: 'ECDSA-P256-MOCK' })
    expect(valid).toBe(true)
    expect(signed).toBe(false)
  })

  it('rejette une signature invalide', async () => {
    const { verifyBadge } = await import('../utils/badgeCrypto')
    const { valid } = await verifyBadge({ ...PAYLOAD, sig: 'signature_invalide_123' })
    expect(valid).toBe(false)
  })

  it('réutilise la paire de clés depuis localStorage', async () => {
    const { signBadge, verifyBadge } = await import('../utils/badgeCrypto')
    const sig = await signBadge(PAYLOAD)
    // La clé est maintenant en localStorage — vérification doit réussir
    const { valid } = await verifyBadge({ ...PAYLOAD, sig })
    expect(valid).toBe(true)
    expect(localStorage.getItem('cm14_badge_keys')).not.toBeNull()
  })
})
