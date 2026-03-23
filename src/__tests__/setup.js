import { vi } from 'vitest'
import 'fake-indexeddb/auto'

// ─── Web Crypto API ───────────────────────────────────────────────────────────
// jsdom n'expose pas crypto.subtle — on le prend depuis Node.js
import { webcrypto } from 'node:crypto'
Object.defineProperty(globalThis, 'crypto', { value: webcrypto, writable: true })

// ─── AudioContext mock ────────────────────────────────────────────────────────
const mockOscillator = {
  connect: vi.fn(),
  type: 'sine',
  frequency: { value: 0 },
  start: vi.fn(),
  stop: vi.fn(),
}
const mockGain = {
  connect: vi.fn(),
  gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
}
const mockAudioCtx = {
  state: 'running',
  currentTime: 0,
  destination: {},
  createOscillator: vi.fn(() => mockOscillator),
  createGain: vi.fn(() => mockGain),
  resume: vi.fn(),
}
// Dans jsdom, window.AudioContext est undefined — il faut définir la propriété sur window
const AudioContextMock = vi.fn(() => mockAudioCtx)
globalThis.AudioContext = AudioContextMock
Object.defineProperty(window, 'AudioContext', {
  value: AudioContextMock,
  writable: true,
  configurable: true,
})

// ─── navigator.vibrate mock ───────────────────────────────────────────────────
Object.defineProperty(navigator, 'vibrate', {
  value: vi.fn(),
  writable: true,
  configurable: true,
})

// ─── navigator.onLine ─────────────────────────────────────────────────────────
Object.defineProperty(navigator, 'onLine', {
  value: true,
  writable: true,
  configurable: true,
})
