/**
 * Normalise les réponses backend (snake_case) vers le format frontend (camelCase).
 * Utilisé par toutes les pages qui consomment l'API réelle.
 */

export function mapParticipant(p) {
  return {
    id:             p.id,
    nom:            p.nom,
    prenom:         p.prenom,
    delegation:     p.delegation,
    categorie:      p.categorie,
    zones:          p.zones ?? [],
    statut:         p.statut,
    dateExpiration: p.date_expiration ?? p.dateExpiration ?? '',
    photoUrl:       p.photo_url ?? null,
  }
}

export function mapScanLog(l) {
  return {
    id:            l.id,
    participantId: l.participant_id ?? l.participantId ?? null,
    nom:           l.nom,
    delegation:    l.delegation   ?? '—',
    categorie:     l.categorie    ?? '—',
    zone:          l.zone         ?? '—',
    pointControle: l.point_controle_id ?? l.pointControle ?? null,
    resultat:      l.resultat,
    agentId:       l.agent_id     ?? l.agentId,
    timestamp:     new Date(l.timestamp),
  }
}
