// ─── Mock users ──────────────────────────────────────────────────────────────
export const USERS = [
  {
    id: 'AG-8824',
    password: 'Agent@CM14!',
    role: 'agent',
    name: 'Alima Nkemba',
    zone: 'Entrée Nord — Salle Plénière',
    avatar: null,
    totpSecret: 'JBSWY3DPEHPK3PXP',
  },
  {
    id: 'AG-0031',
    password: 'Agent@CM14!',
    role: 'agent',
    name: 'Bruno Essomba',
    zone: 'Entrée Est — Accueil VIP',
    avatar: null,
    totpSecret: 'KVKFKRCPNZQUYMLX',
  },
  {
    id: 'ADMIN-001',
    password: 'Admin@CM14!',
    role: 'admin',
    name: 'Jean Dupont',
    title: 'Admin Principal',
    avatar: null,
    totpSecret: 'MFRA2YTNJFQWCYLB',
  },
  {
    id: 'SUPER-001',
    password: 'Super@CM14!',
    role: 'supervisor',
    name: 'Marie Claire Owono',
    title: 'Superviseure Sécurité',
    avatar: null,
    totpSecret: 'GEZDGNBVGY3TQOJQ',
  },
]

// ─── Mock participants / badges ───────────────────────────────────────────────
export const PARTICIPANTS = [
  { id: 'P-001', nom: 'Kofi Asante', prenom: 'Emmanuel', delegation: 'Ghana', categorie: 'DEL', zones: ['Z1','Z2','Z3'], statut: 'actif', dateExpiration: '2025-03-28' },
  { id: 'P-002', nom: 'Nakamura', prenom: 'Yuki', delegation: 'Japon', categorie: 'DEL', zones: ['Z1','Z2','Z3','Z4'], statut: 'actif', dateExpiration: '2025-03-28' },
  { id: 'P-003', nom: 'Mbeki', prenom: 'Sipho', delegation: 'Afrique du Sud', categorie: 'DEL', zones: ['Z1','Z2'], statut: 'actif', dateExpiration: '2025-03-28' },
  { id: 'P-004', nom: 'Fernandez', prenom: 'Carlos', delegation: 'Mexique', categorie: 'OBS', zones: ['Z1'], statut: 'actif', dateExpiration: '2025-03-26' },
  { id: 'P-005', nom: 'Laurent', prenom: 'Sophie', delegation: 'France', categorie: 'PRESS', zones: ['Z1','Z5'], statut: 'actif', dateExpiration: '2025-03-28' },
  { id: 'P-006', nom: 'Okonkwo', prenom: 'Chidera', delegation: 'Nigeria', categorie: 'DEL', zones: ['Z1','Z2','Z3'], statut: 'révoqué', dateExpiration: '2025-03-28' },
  { id: 'P-007', nom: 'Ahmed', prenom: 'Fatima', delegation: 'Égypte', categorie: 'DEL', zones: ['Z1','Z2','Z3','Z4'], statut: 'actif', dateExpiration: '2025-03-28' },
  { id: 'P-008', nom: 'Chen', prenom: 'Wei', delegation: 'Chine', categorie: 'VIP', zones: ['Z1','Z2','Z3','Z4','Z5'], statut: 'actif', dateExpiration: '2025-03-28' },
  { id: 'P-009', nom: 'Smith', prenom: 'James', delegation: 'États-Unis', categorie: 'DEL', zones: ['Z1','Z2','Z3'], statut: 'actif', dateExpiration: '2025-03-28' },
  { id: 'P-010', nom: 'Dubois', prenom: 'Amélie', delegation: 'Belgique', categorie: 'STAFF', zones: ['Z1','Z2'], statut: 'suspendu', dateExpiration: '2025-03-28' },
  { id: 'P-011', nom: 'Diallo', prenom: 'Moussa', delegation: 'Sénégal', categorie: 'DEL', zones: ['Z1','Z2','Z3'], statut: 'actif', dateExpiration: '2025-03-28' },
  { id: 'P-012', nom: 'Rodrigues', prenom: 'Ana', delegation: 'Brésil', categorie: 'OBS', zones: ['Z1'], statut: 'actif', dateExpiration: '2025-03-27' },
]

// ─── Mock access logs ─────────────────────────────────────────────────────────
export const LOGS = [
  { id: 'L-001', participantId: 'P-001', nom: 'Emmanuel Kofi Asante', delegation: 'Ghana', categorie: 'DEL', zone: 'Entrée Nord', pointControle: 'PC-01', resultat: 'autorisé', agentId: 'AG-8824', timestamp: new Date(Date.now() - 2 * 60000) },
  { id: 'L-002', participantId: 'P-002', nom: 'Yuki Nakamura', delegation: 'Japon', categorie: 'DEL', zone: 'Entrée Nord', pointControle: 'PC-01', resultat: 'autorisé', agentId: 'AG-8824', timestamp: new Date(Date.now() - 8 * 60000) },
  { id: 'L-003', participantId: 'P-006', nom: 'Chidera Okonkwo', delegation: 'Nigeria', categorie: 'DEL', zone: 'Entrée Est', pointControle: 'PC-02', resultat: 'révoqué', agentId: 'AG-0031', timestamp: new Date(Date.now() - 15 * 60000) },
  { id: 'L-004', participantId: 'P-005', nom: 'Sophie Laurent', delegation: 'France', categorie: 'PRESS', zone: 'Entrée Nord', pointControle: 'PC-01', resultat: 'autorisé', agentId: 'AG-8824', timestamp: new Date(Date.now() - 22 * 60000) },
  { id: 'L-005', participantId: 'P-008', nom: 'Wei Chen', delegation: 'Chine', categorie: 'VIP', zone: 'Accueil VIP', pointControle: 'PC-VIP', resultat: 'autorisé', agentId: 'AG-0031', timestamp: new Date(Date.now() - 35 * 60000) },
  { id: 'L-006', participantId: null, nom: 'Inconnu', delegation: '—', categorie: '—', zone: 'Entrée Sud', pointControle: 'PC-03', resultat: 'inconnu', agentId: 'AG-0031', timestamp: new Date(Date.now() - 41 * 60000) },
  { id: 'L-007', participantId: 'P-003', nom: 'Sipho Mbeki', delegation: 'Afrique du Sud', categorie: 'DEL', zone: 'Entrée Nord', pointControle: 'PC-01', resultat: 'autorisé', agentId: 'AG-8824', timestamp: new Date(Date.now() - 58 * 60000) },
  { id: 'L-008', participantId: 'P-004', nom: 'Carlos Fernandez', delegation: 'Mexique', categorie: 'OBS', zone: 'Entrée Nord', pointControle: 'PC-01', resultat: 'zone-refusée', agentId: 'AG-8824', timestamp: new Date(Date.now() - 70 * 60000) },
  { id: 'L-009', participantId: 'P-007', nom: 'Fatima Ahmed', delegation: 'Égypte', categorie: 'DEL', zone: 'Salle Plénière', pointControle: 'PC-04', resultat: 'autorisé', agentId: 'AG-0031', timestamp: new Date(Date.now() - 85 * 60000) },
  { id: 'L-010', participantId: 'P-009', nom: 'James Smith', delegation: 'États-Unis', categorie: 'DEL', zone: 'Entrée Nord', pointControle: 'PC-01', resultat: 'autorisé', agentId: 'AG-8824', timestamp: new Date(Date.now() - 95 * 60000) },
  { id: 'L-011', participantId: 'P-011', nom: 'Moussa Diallo', delegation: 'Sénégal', categorie: 'DEL', zone: 'Entrée Est', pointControle: 'PC-02', resultat: 'autorisé', agentId: 'AG-0031', timestamp: new Date(Date.now() - 110 * 60000) },
  { id: 'L-012', participantId: 'P-012', nom: 'Ana Rodrigues', delegation: 'Brésil', categorie: 'OBS', zone: 'Entrée Nord', pointControle: 'PC-01', resultat: 'autorisé', agentId: 'AG-8824', timestamp: new Date(Date.now() - 125 * 60000) },
]

// ─── Zones ─────────────────────────────────────────────────────────────────────
export const ZONES = [
  { id: 'Z1', nom: 'Accès général', description: 'Zones communes, hall, couloirs' },
  { id: 'Z2', nom: 'Salles de conférence', description: 'Salles plénières et réunions' },
  { id: 'Z3', nom: 'Zone délégués', description: 'Réservée aux délégués officiels' },
  { id: 'Z4', nom: 'Zone restreinte', description: 'Accès très limité' },
  { id: 'Z5', nom: 'Zone VIP/Presse', description: 'Presse accréditée et VIP' },
]

// ─── Categories ─────────────────────────────────────────────────────────────
export const CATEGORIES = [
  { code: 'DEL', label: 'Délégué', color: 'blue' },
  { code: 'OBS', label: 'Observateur', color: 'slate' },
  { code: 'PRESS', label: 'Presse', color: 'amber' },
  { code: 'STAFF', label: 'Personnel', color: 'green' },
  { code: 'VIP', label: 'VIP', color: 'purple' },
  { code: 'SEC', label: 'Sécurité', color: 'red' },
]

// ─── Points de contrôle ────────────────────────────────────────────────────────
export const POINTS_CONTROLE = [
  { id: 'PC-01', nom: 'Entrée Nord', agentId: 'AG-8824', statut: 'actif', scans: 47 },
  { id: 'PC-02', nom: 'Entrée Est', agentId: 'AG-0031', statut: 'actif', scans: 31 },
  { id: 'PC-03', nom: 'Entrée Sud', agentId: null, statut: 'alerte', scans: 12 },
  { id: 'PC-04', nom: 'Salle Plénière', agentId: 'AG-8824', statut: 'actif', scans: 28 },
  { id: 'PC-VIP', nom: 'Accueil VIP', agentId: 'AG-0031', statut: 'actif', scans: 9 },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────
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

export function getResultConfig(resultat) {
  switch (resultat) {
    case 'autorisé':     return { label: 'ACCÈS AUTORISÉ',    bg: 'bg-emerald-500', text: 'text-white', border: 'border-emerald-400', icon: 'check_circle', light: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
    case 'révoqué':      return { label: 'BADGE RÉVOQUÉ',     bg: 'bg-red-500',     text: 'text-white', border: 'border-red-400',     icon: 'cancel',       light: 'bg-red-50 text-red-700 border-red-200' }
    case 'zone-refusée': return { label: 'ZONE NON AUTORISÉE',bg: 'bg-orange-500',  text: 'text-white', border: 'border-orange-400',  icon: 'block',        light: 'bg-orange-50 text-orange-700 border-orange-200' }
    case 'inconnu':      return { label: 'BADGE INCONNU',     bg: 'bg-violet-600',  text: 'text-white', border: 'border-violet-500',  icon: 'help',         light: 'bg-violet-50 text-violet-700 border-violet-200' }
    default:             return { label: resultat,             bg: 'bg-slate-400',   text: 'text-white', border: 'border-slate-300',   icon: 'info',         light: 'bg-slate-50 text-slate-700 border-slate-200' }
  }
}

export function getCategoryColor(code) {
  const map = {
    DEL: 'bg-blue-100 text-blue-800',
    OBS: 'bg-slate-100 text-slate-700',
    PRESS: 'bg-amber-100 text-amber-800',
    STAFF: 'bg-green-100 text-green-800',
    VIP: 'bg-purple-100 text-purple-800',
    SEC: 'bg-red-100 text-red-800',
  }
  return map[code] || 'bg-slate-100 text-slate-600'
}

export function getStatutColor(statut) {
  switch (statut) {
    case 'actif':    return 'bg-emerald-100 text-emerald-800'
    case 'révoqué':  return 'bg-red-100 text-red-800'
    case 'suspendu': return 'bg-amber-100 text-amber-800'
    default:         return 'bg-slate-100 text-slate-600'
  }
}
