import 'dotenv/config'
import express from 'express'
import { createServer as createHttpServer } from 'http'
import { createServer as createHttpsServer } from 'https'
import { readFileSync, existsSync, mkdirSync } from 'fs'
import { Server as SocketIO } from 'socket.io'
import cors from 'cors'
import helmet from 'helmet'
import { rateLimit } from 'express-rate-limit'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

import authRouter        from './routes/auth.js'
import participantsRouter from './routes/participants.js'
import scansRouter       from './routes/scans.js'
import terminalsRouter   from './routes/terminals.js'
import alertsRouter      from './routes/alerts.js'
import zonesRouter       from './routes/zones.js'
import usersRouter       from './routes/users.js'
import { setupSocket }   from './socket/index.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PORT      = parseInt(process.env.PORT || '3001')
const FRONTEND  = process.env.FRONTEND_URL || 'http://localhost:5173'
// Origines autorisées : web dev + app Capacitor Android
const ALLOWED_ORIGINS = [
  FRONTEND,
  'capacitor://localhost',
  'https://localhost',
  'http://localhost',
]

// ─── Dossier uploads ─────────────────────────────────────────────────────────
const uploadDir = join(__dirname, '..', process.env.UPLOAD_DIR || 'uploads')
mkdirSync(uploadDir, { recursive: true })

// ─── Express ─────────────────────────────────────────────────────────────────
const app = express()

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // pour les photos
}))

const corsOptions = {
  origin: true, // reflète l'origine exacte — compatible credentials, sécurisé en Phase 3
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 204,
}
app.options('*', cors(corsOptions))
app.use(cors(corsOptions))

app.use(express.json({ limit: '1mb' }))

// Limite globale — configurable via RATE_LIMIT_MAX (ex: augmenter pour les tests de charge)
app.use(rateLimit({ windowMs: 60_000, max: parseInt(process.env.RATE_LIMIT_MAX ?? '300'), standardHeaders: true, legacyHeaders: false }))

// Limite stricte sur /auth/login — configurable via RATE_LIMIT_AUTH_MAX
app.use('/api/auth/login', rateLimit({ windowMs: 60_000, max: parseInt(process.env.RATE_LIMIT_AUTH_MAX ?? '10') }))

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use('/api/auth',         authRouter)
app.use('/api/participants', participantsRouter)
app.use('/api/scans',        scansRouter)
app.use('/api/terminals',    terminalsRouter)
app.use('/api/alerts',       alertsRouter)
app.use('/api/zones',        zonesRouter)
app.use('/api/users',        usersRouter)

// Fichiers uploadés (photos participants)
app.use('/uploads', express.static(uploadDir))

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }))

// ─── Serveur HTTP ou HTTPS selon la présence des certificats ─────────────────
const certPath = join(__dirname, '..', 'certs', 'cert.pem')
const keyPath  = join(__dirname, '..', 'certs', 'key.pem')
const useHttps = existsSync(certPath) && existsSync(keyPath)

const server = useHttps
  ? createHttpsServer({ cert: readFileSync(certPath), key: readFileSync(keyPath) }, app)
  : createHttpServer(app)

const protocol = useHttps ? 'https' : 'http'

// ─── Socket.io ────────────────────────────────────────────────────────────────
const io = new SocketIO(server, {
  cors: { origin: ALLOWED_ORIGINS, methods: ['GET', 'POST'], credentials: true },
})
setupSocket(io)

// ─── Démarrage ───────────────────────────────────────────────────────────────
server.listen(PORT, () => {
  console.log(`[server] AUTH-BADGE CM14 backend démarré — ${protocol}://localhost:${PORT}`)
  console.log(`[server] Frontend autorisé : ${FRONTEND}`)
  if (useHttps) console.log('[server] TLS activé — Certificate Pinning opérationnel')
})
