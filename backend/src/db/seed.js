/**
 * Insère les données initiales (utilisateurs, zones, points de contrôle, participants).
 * Usage : node src/db/seed.js
 * Idempotent — utilise INSERT … ON CONFLICT DO NOTHING.
 */
import bcrypt from 'bcryptjs'
import pool from './postgres.js'

// ─── Zones ────────────────────────────────────────────────────────────────────
const ZONES = [
  { id: 'Z1', nom: 'Accès général',        description: 'Halls, couloirs, espaces communs',  niveau_acces: 1 },
  { id: 'Z2', nom: 'Salles de conférence', description: 'Salles plénières et réunions',       niveau_acces: 2 },
  { id: 'Z3', nom: 'Zone délégués',        description: 'Réservé aux délégués officiels',     niveau_acces: 3 },
  { id: 'Z4', nom: 'Zone restreinte',      description: 'Accès très limité',                  niveau_acces: 4 },
  { id: 'Z5', nom: 'Zone VIP/Presse',      description: 'Presse accréditée et VIP',           niveau_acces: 5 },
]

// ─── Users ────────────────────────────────────────────────────────────────────
const USERS_PLAIN = [
  { id: 'AG-8824',   password: 'Agent@CM14!', role: 'agent', name: 'Alima Nkemba', zone: 'Entrée Nord', totp_secret: 'JBSWY3DPEHPK3PXP' },
  { id: 'ADMIN-001', password: 'Admin@CM14!', role: 'admin', name: 'Jean Dupont',  title: 'Admin Principal', totp_secret: 'MFRA2YTNJFQWCYLB' },
]

// ─── Points de contrôle ───────────────────────────────────────────────────────
const POINTS_CONTROLE = [
  { id: 'PC-01', nom: 'Entrée Nord', agent_id: 'AG-8824', statut: 'actif', scans: 0, zone_id: 'Z1' },
]

// ─── Participants ─────────────────────────────────────────────────────────────
const PARTICIPANTS = []

// ─── Seed ─────────────────────────────────────────────────────────────────────
const client = await pool.connect()
try {
  await client.query('BEGIN')

  // Nettoyage des anciennes données de test
  await client.query(`DELETE FROM points_controle WHERE id NOT IN ('PC-01')`)
  await client.query(`DELETE FROM users WHERE id NOT IN ('AG-8824', 'ADMIN-001')`)
  await client.query(`DELETE FROM participants WHERE id LIKE 'P-%'`)
  console.log('[seed] Anciennes données de test supprimées.')

  // Zones
  for (const z of ZONES) {
    await client.query(
      `INSERT INTO zones (id, nom, description, niveau_acces)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (id) DO UPDATE SET niveau_acces = EXCLUDED.niveau_acces`,
      [z.id, z.nom, z.description, z.niveau_acces]
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
       ON CONFLICT (id) DO UPDATE SET nom = EXCLUDED.nom, agent_id = EXCLUDED.agent_id, statut = EXCLUDED.statut, scans = EXCLUDED.scans, zone_id = EXCLUDED.zone_id`,
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
