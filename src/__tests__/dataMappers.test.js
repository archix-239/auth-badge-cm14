import { describe, it, expect } from 'vitest'
import { mapParticipant, mapScanLog } from '../utils/dataMappers'

describe('mapParticipant', () => {
  const base = { id: 'P-001', nom: 'Dupont', prenom: 'Jean', delegation: 'France', categorie: 'MIN', statut: 'actif' }

  it('convertit les champs snake_case vers camelCase', () => {
    const result = mapParticipant({ ...base, date_expiration: '2026-12-31', photo_url: '/uploads/photo.jpg', zones: ['Z1', 'Z2'] })
    expect(result.dateExpiration).toBe('2026-12-31')
    expect(result.photoUrl).toBe('/uploads/photo.jpg')
    expect(result.zones).toEqual(['Z1', 'Z2'])
  })

  it('utilise le fallback camelCase quand snake_case est absent', () => {
    const result = mapParticipant({ ...base, dateExpiration: '2027-01-01', photo_url: null })
    expect(result.dateExpiration).toBe('2027-01-01')
    expect(result.photoUrl).toBeNull()
  })

  it('retourne un tableau vide pour zones si absent', () => {
    const result = mapParticipant(base)
    expect(result.zones).toEqual([])
  })

  it('conserve tous les champs identitaires', () => {
    const result = mapParticipant(base)
    expect(result.id).toBe('P-001')
    expect(result.nom).toBe('Dupont')
    expect(result.prenom).toBe('Jean')
    expect(result.delegation).toBe('France')
    expect(result.categorie).toBe('MIN')
    expect(result.statut).toBe('actif')
  })
})

describe('mapScanLog', () => {
  const base = {
    id: 1, nom: 'Dupont', resultat: 'autorisé',
    agent_id: 'AG-001', timestamp: '2026-03-23T10:00:00Z',
  }

  it('convertit les champs snake_case correctement', () => {
    const result = mapScanLog({
      ...base,
      participant_id: 'P-001',
      delegation: 'France',
      categorie: 'MIN',
      zone: 'Z1',
      point_controle_id: 'PC-01',
    })
    expect(result.participantId).toBe('P-001')
    expect(result.pointControle).toBe('PC-01')
    expect(result.agentId).toBe('AG-001')
    expect(result.delegation).toBe('France')
    expect(result.zone).toBe('Z1')
  })

  it('convertit le timestamp en objet Date', () => {
    const result = mapScanLog(base)
    expect(result.timestamp).toBeInstanceOf(Date)
    expect(result.timestamp.getFullYear()).toBe(2026)
  })

  it('applique les valeurs par défaut pour les champs optionnels manquants', () => {
    const result = mapScanLog(base)
    expect(result.delegation).toBe('—')
    expect(result.categorie).toBe('—')
    expect(result.zone).toBe('—')
    expect(result.participantId).toBeNull()
  })

  it('conserve le résultat du scan', () => {
    const result = mapScanLog({ ...base, resultat: 'révoqué' })
    expect(result.resultat).toBe('révoqué')
  })
})
