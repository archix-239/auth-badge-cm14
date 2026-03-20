/**
 * Insère les données initiales (utilisateurs, zones, points de contrôle, participants).
 * Usage : node src/db/seed.js
 * Idempotent — utilise INSERT … ON CONFLICT DO NOTHING.
 */
import bcrypt from 'bcryptjs'
import pool from './postgres.js'

// ─── Zones ────────────────────────────────────────────────────────────────────
const ZONES = [
  { id: 'Z1', nom: 'Accès général',        description: 'Halls, couloirs, espaces communs' },
  { id: 'Z2', nom: 'Salles de conférence', description: 'Salles plénières et réunions' },
  { id: 'Z3', nom: 'Zone délégués',        description: 'Réservé aux délégués officiels' },
  { id: 'Z4', nom: 'Zone restreinte',      description: 'Accès très limité' },
  { id: 'Z5', nom: 'Zone VIP/Presse',      description: 'Presse accréditée et VIP' },
]

// ─── Users ────────────────────────────────────────────────────────────────────
const USERS_PLAIN = [
  { id: 'AG-8824',   password: 'Agent@CM14!',    role: 'agent',      name: 'Alima Nkemba',        zone: 'Entrée Nord — Salle Plénière', totp_secret: 'JBSWY3DPEHPK3PXP' },
  { id: 'AG-0031',   password: 'Agent@CM14!',    role: 'agent',      name: 'Bruno Essomba',       zone: 'Entrée Est — Accueil VIP',     totp_secret: 'KVKFKRCPNZQUYMLX' },
  { id: 'ADMIN-001', password: 'Admin@CM14!',    role: 'admin',      name: 'Jean Dupont',         title: 'Admin Principal',             totp_secret: 'MFRA2YTNJFQWCYLB' },
  { id: 'SUPER-001', password: 'Supervisor@CM14!', role: 'supervisor', name: 'Marie Claire Owono', title: 'Superviseure Sécurité',       totp_secret: 'GEZDGNBVGY3TQOJQ' },
]

// ─── Points de contrôle ───────────────────────────────────────────────────────
const POINTS_CONTROLE = [
  { id: 'PC-01',  nom: 'Entrée Nord',    agent_id: 'AG-8824',  statut: 'actif',   scans: 47, zone_id: 'Z1' },
  { id: 'PC-02',  nom: 'Entrée Est',     agent_id: 'AG-0031',  statut: 'actif',   scans: 31, zone_id: 'Z1' },
  { id: 'PC-03',  nom: 'Entrée Sud',     agent_id: null,       statut: 'alerte',  scans: 12, zone_id: 'Z1' },
  { id: 'PC-04',  nom: 'Salle Plénière', agent_id: 'AG-8824',  statut: 'actif',   scans: 28, zone_id: 'Z2' },
  { id: 'PC-VIP', nom: 'Accueil VIP',    agent_id: 'AG-0031',  statut: 'actif',   scans: 9,  zone_id: 'Z5' },
]

// ─── Participants ─────────────────────────────────────────────────────────────
const PARTICIPANTS = [
  { id: 'P-001', nom: 'Mbeki',        prenom: 'Thabo',       delegation: 'Afrique du Sud', categorie: 'DEL',   zones: ['Z1','Z2','Z3'],          statut: 'actif',    date_expiration: '2025-03-28' },
  { id: 'P-002', nom: 'Okonkwo',      prenom: 'Ada',         delegation: 'Nigeria',        categorie: 'DEL',   zones: ['Z1','Z2','Z3'],          statut: 'actif',    date_expiration: '2025-03-28' },
  { id: 'P-003', nom: 'Diallo',       prenom: 'Fatoumata',   delegation: 'Sénégal',        categorie: 'OBS',   zones: ['Z1'],                    statut: 'actif',    date_expiration: '2025-03-28' },
  { id: 'P-004', nom: 'Chen',         prenom: 'Wei',         delegation: 'Chine',          categorie: 'DEL',   zones: ['Z1','Z2','Z3','Z4'],     statut: 'actif',    date_expiration: '2025-03-26' },
  { id: 'P-005', nom: 'Müller',       prenom: 'Klaus',       delegation: 'Allemagne',      categorie: 'PRESS', zones: ['Z1','Z5'],               statut: 'actif',    date_expiration: '2025-03-28' },
  { id: 'P-006', nom: 'Okonkwo',      prenom: 'Chidera',     delegation: 'Nigeria',        categorie: 'STAFF', zones: ['Z1','Z2'],               statut: 'révoqué',  date_expiration: '2025-03-28' },
  { id: 'P-007', nom: 'Traoré',       prenom: 'Moussa',      delegation: 'Mali',           categorie: 'DEL',   zones: ['Z1','Z2','Z3'],          statut: 'actif',    date_expiration: '2025-03-28' },
  { id: 'P-008', nom: 'Fernandez',    prenom: 'Carlos',      delegation: 'Espagne',        categorie: 'VIP',   zones: ['Z1','Z2','Z3','Z4','Z5'], statut: 'actif',   date_expiration: '2025-03-28' },
  { id: 'P-009', nom: 'Johnson',      prenom: 'Sarah',       delegation: 'États-Unis',     categorie: 'PRESS', zones: ['Z1','Z5'],               statut: 'actif',    date_expiration: '2025-03-28' },
  { id: 'P-010', nom: 'Dubois',       prenom: 'Amélie',      delegation: 'France',         categorie: 'STAFF', zones: ['Z1','Z2'],               statut: 'suspendu', date_expiration: '2025-03-28' },
  { id: 'P-011', nom: 'Nakamura',     prenom: 'Hiroshi',     delegation: 'Japon',          categorie: 'DEL',   zones: ['Z1','Z2','Z3'],          statut: 'actif',    date_expiration: '2025-03-28' },
  { id: 'P-012', nom: 'El Amine',     prenom: 'Karim',       delegation: 'Maroc',          categorie: 'OBS',   zones: ['Z1'],                    statut: 'actif',    date_expiration: '2025-03-27' },
]

// ─── Seed ─────────────────────────────────────────────────────────────────────
const client = await pool.connect()
try {
  await client.query('BEGIN')

  // Zones
  for (const z of ZONES) {
    await client.query(
      `INSERT INTO zones (id, nom, description) VALUES ($1,$2,$3) ON CONFLICT (id) DO NOTHING`,
      [z.id, z.nom, z.description]
    )
  }
  console.log('[seed] Zones insérées.')

  // Users
  for (const u of USERS_PLAIN) {
    const hash = await bcrypt.hash(u.password, 12)
    await client.query(
      `INSERT INTO users (id, password_hash, role, name, zone, title, totp_secret)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (id) DO NOTHING`,
      [u.id, hash, u.role, u.name, u.zone ?? null, u.title ?? null, u.totp_secret]
    )
  }
  console.log('[seed] Utilisateurs insérés.')

  // Points de contrôle
  for (const pc of POINTS_CONTROLE) {
    await client.query(
      `INSERT INTO points_controle (id, nom, agent_id, statut, scans, zone_id)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (id) DO UPDATE SET zone_id = EXCLUDED.zone_id`,
      [pc.id, pc.nom, pc.agent_id, pc.statut, pc.scans, pc.zone_id ?? null]
    )
  }
  console.log('[seed] Points de contrôle insérés.')

  // Participants
  for (const p of PARTICIPANTS) {
    await client.query(
      `INSERT INTO participants (id, nom, prenom, delegation, categorie, zones, statut, date_expiration)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (id) DO NOTHING`,
      [p.id, p.nom, p.prenom, p.delegation, p.categorie, p.zones, p.statut, p.date_expiration]
    )
  }
  console.log('[seed] Participants insérés.')

  await client.query('COMMIT')
  console.log('[seed] Terminé avec succès.')
} catch (err) {
  await client.query('ROLLBACK')
  console.error('[seed] Erreur :', err.message)
  process.exit(1)
} finally {
  client.release()
  await pool.end()
}
