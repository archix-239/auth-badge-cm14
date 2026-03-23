/**
 * File d'attente des scans hors ligne.
 * Les scans non envoyés au serveur sont stockés dans localStorage
 * et synchronisés dès que la connexion est rétablie.
 */

const KEY = 'cm14_scan_queue'

/** Retourne tous les scans en attente (non synchronisés). */
export function getPendingScans() {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]')
  } catch {
    return []
  }
}

/** Ajoute un scan dans la file d'attente. */
export function enqueueScan(scan) {
  const queue = getPendingScans()
  queue.push({ ...scan, _queued: true })
  localStorage.setItem(KEY, JSON.stringify(queue))
}

/** Supprime les scans dont les IDs sont fournis (synchronisés avec succès). */
export function removeSyncedScans(ids) {
  const set = new Set(ids)
  const remaining = getPendingScans().filter(s => !set.has(s.id))
  localStorage.setItem(KEY, JSON.stringify(remaining))
}

/** Vide complètement la file (après sync totale). */
export function clearScanQueue() {
  localStorage.removeItem(KEY)
}
