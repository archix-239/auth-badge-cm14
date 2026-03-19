/**
 * Scan feedback — Web Audio API (tones) + Vibration API
 * No external audio files; tones are generated programmatically.
 */

let _ctx = null

function getCtx() {
  if (!_ctx) _ctx = new (window.AudioContext || window.webkitAudioContext)()
  if (_ctx.state === 'suspended') _ctx.resume()
  return _ctx
}

/**
 * Play a sequence of beeps.
 * @param {Array<{freq: number, duration: number, delay: number}>} notes
 * @param {number} volume  0–1
 */
function playTone(notes, volume = 0.4) {
  try {
    const ctx = getCtx()
    notes.forEach(({ freq, duration, delay }) => {
      const osc  = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.type = 'sine'
      osc.frequency.value = freq

      const start = ctx.currentTime + delay
      gain.gain.setValueAtTime(volume, start)
      gain.gain.exponentialRampToValueAtTime(0.001, start + duration)

      osc.start(start)
      osc.stop(start + duration + 0.05)
    })
  } catch { /* AudioContext unavailable — silent degradation */ }
}

function vibrate(pattern) {
  if (navigator.vibrate) navigator.vibrate(pattern)
}

const FEEDBACK = {
  'autorisé': {
    // Double bip aigu — succès
    notes: [
      { freq: 880, duration: 0.08, delay: 0 },
      { freq: 1046, duration: 0.12, delay: 0.12 },
    ],
    vibration: [80, 60, 80],
  },
  'révoqué': {
    // Alarme grave — danger
    notes: [
      { freq: 220, duration: 0.25, delay: 0 },
      { freq: 180, duration: 0.35, delay: 0.3 },
    ],
    vibration: [300, 100, 300, 100, 300],
  },
  'zone-refusée': {
    // Bip descendant — avertissement
    notes: [
      { freq: 660, duration: 0.12, delay: 0 },
      { freq: 440, duration: 0.2,  delay: 0.18 },
    ],
    vibration: [150, 80, 250],
  },
  'inconnu': {
    // Bip grave unique — alerte
    notes: [
      { freq: 330, duration: 0.3, delay: 0 },
    ],
    vibration: [400, 100, 200],
  },
}

/**
 * Trigger audio + vibration feedback for a scan result.
 * @param {'autorisé'|'révoqué'|'zone-refusée'|'inconnu'} resultat
 */
export function playScanFeedback(resultat) {
  const fb = FEEDBACK[resultat] ?? FEEDBACK['inconnu']
  playTone(fb.notes)
  vibrate(fb.vibration)
}
