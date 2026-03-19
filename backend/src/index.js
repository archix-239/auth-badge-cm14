import 'dotenv/config'
import express from 'express'
import { createServer } from 'http'
import { Server as SocketIO } from 'socket.io'
import cors from 'cors'
import helmet from 'helmet'
import { rateLimit } from 'express-rate-limit'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { mkdirSync } from 'fs'

import authRouter        from './routes/auth.js'
import participantsRouter from './routes/participants.js'
import scansRouter       from './routes/scans.js'
import terminalsRouter   from './routes/terminals.js'
import alertsRouter      from './routes/alerts.js'
import { setupSocket }   from './socket/index.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PORT      = parseInt(process.env.PORT || '3001')
const FRONTEND  = process.env.FRONTEND_URL || 'http://localhost:5173'

// ─── Dossier uploads ─────────────────────────────────────────────────────────
const uploadDir = join(__dirname, '..', process.env.UPLOAD_DIR || 'uploads')
mkdirSync(uploadDir, { recursive: true })

// ─── Express ─────────────────────────────────────────────────────────────────
const app = express()

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // pour les photos
}))

app.use(cors({
  origin: FRONTEND,
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}))

app.use(express.json({ limit: '1mb' }))

// Limite globale : 300 req/min par IP
app.use(rateLimit({ windowMs: 60_000, max: 300, standardHeaders: true, legacyHeaders: false }))

// Limite stricte sur /auth/login : 10 req/min par IP
app.use('/api/auth/login', rateLimit({ windowMs: 60_000, max: 10 }))

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use('/api/auth',         authRouter)
app.use('/api/participants', participantsRouter)
app.use('/api/scans',        scansRouter)
app.use('/api/terminals',    terminalsRouter)
app.use('/api/alerts',       alertsRouter)

// Fichiers uploadés (photos participants)
app.use('/uploads', express.static(uploadDir))

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }))

// ─── Socket.io ────────────────────────────────────────────────────────────────
const httpServer = createServer(app)
const io = new SocketIO(httpServer, {
  cors: { origin: FRONTEND, methods: ['GET', 'POST'], credentials: true },
})
setupSocket(io)

// ─── Démarrage ───────────────────────────────────────────────────────────────
httpServer.listen(PORT, () => {
  console.log(`[server] AUTH-BADGE CM14 backend démarré — http://localhost:${PORT}`)
  console.log(`[server] Frontend autorisé : ${FRONTEND}`)
})
