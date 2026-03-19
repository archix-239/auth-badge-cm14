/**
 * Applique le schéma SQL sur la base de données.
 * Usage : node src/db/migrate.js
 */
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import pool from './postgres.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf8')

try {
  await pool.query(schema)
  console.log('[migrate] Schéma appliqué avec succès.')
} catch (err) {
  console.error('[migrate] Erreur :', err.message)
  process.exit(1)
} finally {
  await pool.end()
}
