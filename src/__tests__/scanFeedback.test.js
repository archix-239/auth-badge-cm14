import { describe, it, expect, vi, beforeEach } from 'vitest'
import { playScanFeedback } from '../utils/scanFeedback'

describe('playScanFeedback', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('déclenche une vibration pour le résultat "autorisé"', () => {
    playScanFeedback('autorisé')
    expect(navigator.vibrate).toHaveBeenCalledWith([80, 60, 80])
  })

  it('déclenche une vibration longue pour le résultat "révoqué"', () => {
    playScanFeedback('révoqué')
    expect(navigator.vibrate).toHaveBeenCalledWith([300, 100, 300, 100, 300])
  })

  it('déclenche une vibration pour "zone-refusée"', () => {
    playScanFeedback('zone-refusée')
    expect(navigator.vibrate).toHaveBeenCalledWith([150, 80, 250])
  })

  it('déclenche une vibration pour "inconnu"', () => {
    playScanFeedback('inconnu')
    expect(navigator.vibrate).toHaveBeenCalledWith([400, 100, 200])
  })

  it('utilise le feedback "inconnu" pour un résultat non reconnu', () => {
    playScanFeedback('resultat-inexistant')
    // Fallback vers inconnu
    expect(navigator.vibrate).toHaveBeenCalledWith([400, 100, 200])
  })

  it('crée un AudioContext et joue les notes pour "autorisé"', () => {
    playScanFeedback('autorisé')
    expect(AudioContext).toHaveBeenCalled()
  })
})
