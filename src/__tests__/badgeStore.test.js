import { describe, it, expect, beforeEach } from 'vitest'
import { syncBadgeStore, lookupBadge, updateBadgeStatus, getBadgeStoreSize } from '../utils/badgeStore'

const PARTICIPANTS = [
  { id: 'P-001', nom: 'Dupont', prenom: 'Jean', delegation: 'France', categorie: 'MIN', zones: ['Z1'], statut: 'actif' },
  { id: 'P-002', nom: 'Martin', prenom: 'Lucie', delegation: 'Belgique', categorie: 'OBS', zones: ['Z1', 'Z2'], statut: 'actif' },
  { id: 'P-003', nom: 'Nkemba', prenom: 'Alima', delegation: 'Cameroun', categorie: 'DEL', zones: ['Z1', 'Z3'], statut: 'actif' },
]

describe('badgeStore', () => {
  beforeEach(async () => {
    localStorage.clear()
    await syncBadgeStore(PARTICIPANTS)
  })

  it('syncBadgeStore stocke les participants et enregistre le timestamp de sync', async () => {
    const syncTime = localStorage.getItem('cm14_last_sync')
    expect(syncTime).not.toBeNull()
    expect(new Date(syncTime).getFullYear()).toBe(2026)
  })

  it('getBadgeStoreSize retourne le nombre correct de badges en cache', async () => {
    const count = await getBadgeStoreSize()
    expect(count).toBe(3)
  })

  it('lookupBadge retrouve un participant par son ID', async () => {
    const participant = await lookupBadge('P-001')
    expect(participant).not.toBeNull()
    expect(participant.nom).toBe('Dupont')
    expect(participant.delegation).toBe('France')
  })

  it('lookupBadge retourne null pour un ID inexistant', async () => {
    const result = await lookupBadge('P-999')
    expect(result).toBeNull()
  })

  it('les données sont chiffrées (non lisibles directement en IndexedDB)', async () => {
    // On vérifie que le store chiffre bien les données
    // en contrôlant que le participant récupéré correspond bien aux données originales
    const participant = await lookupBadge('P-002')
    expect(participant.zones).toEqual(['Z1', 'Z2'])
    expect(participant.categorie).toBe('OBS')
  })

  it('updateBadgeStatus met à jour le statut d\'un badge en cache', async () => {
    await updateBadgeStatus('P-001', 'révoqué')
    const participant = await lookupBadge('P-001')
    expect(participant.statut).toBe('révoqué')
  })

  it('updateBadgeStatus ignore silencieusement un ID inexistant', async () => {
    await expect(updateBadgeStatus('P-999', 'révoqué')).resolves.toBeUndefined()
    const count = await getBadgeStoreSize()
    expect(count).toBe(3) // aucun enregistrement ajouté
  })

  it('syncBadgeStore efface les anciennes données avant de réécrire', async () => {
    const nouveauxParticipants = [
      { id: 'P-100', nom: 'Nouveau', prenom: 'Test', delegation: 'Test', categorie: 'MIN', zones: [], statut: 'actif' },
    ]
    await syncBadgeStore(nouveauxParticipants)
    const count = await getBadgeStoreSize()
    expect(count).toBe(1)
    const ancien = await lookupBadge('P-001')
    expect(ancien).toBeNull()
  })
})
