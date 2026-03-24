/**
 * Helpers UI — couleurs, formats, configurations d'affichage.
 * Aucune donnée métier ici : tout vient de l'API.
 */

// Catégories de badges (configuration statique, reflet du schéma DB)
export const CATEGORIES = [
  { code: 'DEL',   label: 'Délégué',     color: 'blue'   },
  { code: 'OBS',   label: 'Observateur', color: 'slate'  },
  { code: 'PRESS', label: 'Presse',      color: 'amber'  },
  { code: 'STAFF', label: 'Personnel',   color: 'green'  },
  { code: 'VIP',   label: 'VIP',         color: 'purple' },
  { code: 'SEC',   label: 'Sécurité',    color: 'red'    },
]

// ─── Formatage dates ───────────────────────────────────────────────────────────

export function formatTime(date) {
  return new Date(date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

export function formatDateTime(date) {
  return new Date(date).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  })
}

export function timeAgo(date) {
  const diff = Math.floor((Date.now() - new Date(date)) / 1000)
  if (diff < 60) return `Il y a ${diff}s`
  if (diff < 3600) return `Il y a ${Math.floor(diff / 60)} min`
  return `Il y a ${Math.floor(diff / 3600)}h`
}

// ─── Couleurs résultat de scan ─────────────────────────────────────────────────

export function getResultConfig(resultat) {
  switch (resultat) {
    case 'autorisé':     return { label: 'ACCÈS AUTORISÉ',     bg: 'bg-emerald-500', text: 'text-white', border: 'border-emerald-400', icon: 'check_circle', light: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
    case 'révoqué':      return { label: 'BADGE RÉVOQUÉ',      bg: 'bg-red-500',     text: 'text-white', border: 'border-red-400',     icon: 'cancel',       light: 'bg-red-50 text-red-700 border-red-200' }
    case 'zone-refusée': return { label: 'ZONE NON AUTORISÉE', bg: 'bg-orange-500',  text: 'text-white', border: 'border-orange-400',  icon: 'block',        light: 'bg-orange-50 text-orange-700 border-orange-200' }
    case 'inconnu':      return { label: 'BADGE INCONNU',      bg: 'bg-violet-600',  text: 'text-white', border: 'border-violet-500',  icon: 'help',         light: 'bg-violet-50 text-violet-700 border-violet-200' }
    default:             return { label: resultat,              bg: 'bg-slate-400',   text: 'text-white', border: 'border-slate-300',   icon: 'info',         light: 'bg-slate-50 text-slate-700 border-slate-200' }
  }
}

// ─── Couleurs catégorie badge ──────────────────────────────────────────────────

export function getCategoryColor(code) {
  const map = {
    DEL:   'bg-blue-100 text-blue-800',
    OBS:   'bg-slate-100 text-slate-700',
    PRESS: 'bg-amber-100 text-amber-800',
    STAFF: 'bg-green-100 text-green-800',
    VIP:   'bg-purple-100 text-purple-800',
    SEC:   'bg-red-100 text-red-800',
  }
  return map[code] || 'bg-slate-100 text-slate-600'
}

// ─── Couleurs statut participant ───────────────────────────────────────────────

export function getStatutColor(statut) {
  switch (statut) {
    case 'actif':    return 'bg-emerald-100 text-emerald-800'
    case 'révoqué':  return 'bg-red-100 text-red-800'
    case 'suspendu': return 'bg-amber-100 text-amber-800'
    default:         return 'bg-slate-100 text-slate-600'
  }
}
