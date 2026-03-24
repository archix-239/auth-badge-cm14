# AUTH-BADGE CM14 — Système de contrôle d'accès OMC

> Application de gestion des accréditations et de contrôle d'accès pour la **14ème Conférence Ministérielle de l'Organisation Mondiale du Commerce** — Yaoundé, Cameroun, 2026.

Après avoir lu ce document, vous saurez **lancer l'application** (avec ou sans backend), **comprendre son architecture**, et **où en est le développement**.

---

## Démarrage avec backend

### Prérequis

- Node.js 22+
- PostgreSQL 17+
- Redis 7+

### Étape 1 — Configurer et démarrer le backend

```bash
cd backend

# Copier et remplir le fichier de configuration
cp .env.example .env
# → Renseigner POSTGRES_*, REDIS_URL, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET

# Installer les dépendances backend
npm install

# Créer les tables en base de données
npm run db:migrate

# Insérer les données initiales (utilisateurs, zones, participants)
npm run db:seed

# Démarrer le serveur (port 3001 par défaut)
npm run dev
```

Le serveur est prêt quand vous voyez :
```
[server] AUTH-BADGE CM14 backend démarré — http://localhost:3001
[postgres] Connected
[redis] Connected
```

### Étape 2 — Configurer et démarrer le frontend

```bash
# Revenir à la racine du projet
cd ..

# Créer le fichier de configuration frontend
echo "VITE_API_URL=http://localhost:3001" > .env

# Installer les dépendances frontend (si pas encore fait)
npm install

# Lancer le serveur de développement
npm run dev
```

Ouvrir [http://localhost:5173](http://localhost:5173). L'application contacte maintenant le vrai backend.

---

## Comptes de démonstration

| Rôle | Identifiant | Mot de passe | Interface |
|---|---|---|---|
| Agent | `AG-8824` | `Agent@CM14!` | Mobile — scanner, dashboard, historique |
| Agent | `AG-0031` | `Agent@CM14!` | Mobile |
| Administrateur | `ADMIN-001` | `Admin@CM14!` | Desktop — console complète |
| Superviseur | `SUPER-001` | `Supervisor@CM14!` | Desktop — supervision |

> **Code OTP** : l'authentification utilise le protocole TOTP (RFC 6238, SHA-1, 6 chiffres, 30 secondes). Utiliser une application comme **Google Authenticator** ou **Authy** avec les secrets TOTP du fichier `backend/src/db/seed.js`. Le QR Code de configuration TOTP de chaque agent est accessible dans **Admin → Gestion des utilisateurs**.

---

## Architecture

AUTH-BADGE CM14 est une **application web unique** qui adapte son interface selon le rôle de l'utilisateur connecté.

```
┌─────────────────────────────────────────────────────────┐
│                  Navigateur / Terminal                  │
│                                                         │
│   Rôle AGENT ──────────────► Interface mobile (PWA)     │
│   Rôle ADMIN/SUPERVISEUR ──► Interface desktop          │
└────────────────────┬────────────────────────────────────┘
                     │ HTTPS + WebSocket
┌────────────────────▼────────────────────────────────────┐
│                Backend Node.js (Express)                │
│                                                         │
│  REST API  ──► JWT access (60 min) + refresh (7 jours)  │
│  Socket.io ──► scans temps réel, révocations, alertes   │
└──────────┬────────────────────────┬─────────────────────┘
           │                        │
    ┌──────▼──────┐          ┌──────▼──────┐
    │ PostgreSQL  │          │    Redis    │
    │  (données)  │          │ (sessions,  │
    │             │          │  pub/sub,   │
    └─────────────┘          │  heartbeat) │
                             └─────────────┘
```

### Flux temps réel

Quand un agent scanne un badge, voici ce qui se passe en moins d'une seconde :

```
Agent scanne → POST /api/scans → Redis publish("scan:new")
                                       │
                              Socket.io broadcast
                                       │
                    ┌──────────────────┼──────────────────┐
                    ▼                  ▼                   ▼
             Superviseur         Administrateur      Autres agents
             (scan:new)          (scan:new)        (badge:revoked si
                                                    révocation)
```

### Modèle : Zone → Porte → Agent

Chaque **zone** représente un espace physique du site. Une zone est associée à une ou plusieurs **portes** (points de contrôle). Chaque **porte** peut avoir un **agent** assigné.

```
Zone (accès physique)
 └── Porte / Point de contrôle (device de scan)
       └── Agent (opérateur du terminal)
```

Quand un agent scanne un badge, le système détermine automatiquement la **zone contrôlée** à partir de la porte assignée à l'agent — pas besoin que l'agent saisisse la zone manuellement.

**Exemple concret :**

| Porte | Nom | Zone contrôlée | Agent assigné |
|---|---|---|---|
| PC-01 | Entrée Nord | Z1 — Accès général | AG-8824 (Alima Nkemba) |
| PC-04 | Salle Plénière | Z2 — Salles de conférence | AG-8824 (Alima Nkemba) |
| PC-VIP | Accueil VIP | Z5 — Zone VIP/Presse | AG-0031 (Bruno Essomba) |

**Règle de vérification au scan :**

```
badge.zones.includes(porte.zone_id)
   → true  : ACCÈS AUTORISÉ
   → false : ZONE REFUSÉE
```

> Un observateur (`OBS`, zones = `[Z1]`) présenté à la porte `PC-04` (zone `Z2`) sera refusé. Le même badge présenté à `PC-01` (zone `Z1`) sera accepté.

**Ajouter une zone à une porte :**
1. Aller dans **Admin → Portes & Entrées**
2. Créer ou modifier une porte
3. Sélectionner la zone dans le menu déroulant "Zone contrôlée"

---

### Un code, trois plateformes

```
Code React (source unique)
       │
       ├── npm run dev/build ──► Web (console admin, agents navigateur)
       │
       └── Capacitor (Phase 4)
             ├── iOS (.ipa)     ──► Terminaux agents Apple
             └── Android (.apk) ──► Terminaux agents Android
```

---

## Structure des fichiers

```
authbadge-cm14/
├── .env.example                        # Variables frontend (VITE_API_URL)
├── package.json
├── vite.config.js                      # PWA (Service Worker, manifest)
├── PROGRESS.md                         # Suivi d'avancement détaillé
│
├── backend/                            # ── Serveur Node.js ──
│   ├── .env.example                    # Variables backend (DB, JWT, Redis)
│   ├── package.json
│   └── src/
│       ├── index.js                    # Express + Socket.io (point d'entrée)
│       ├── db/
│       │   ├── schema.sql              # Schéma PostgreSQL
│       │   ├── migrate.js              # Applique le schéma
│       │   ├── seed.js                 # Données initiales
│       │   ├── postgres.js             # Pool de connexions pg
│       │   └── redis.js                # ioredis + helpers pub/sub
│       ├── middleware/
│       │   └── auth.js                 # requireAuth + requireRole
│       ├── routes/
│       │   ├── auth.js                 # Login, refresh, logout, /me
│       │   ├── participants.js         # CRUD badges + upload photo
│       │   ├── scans.js                # Logs, stats, export CSV/JSON
│       │   ├── terminals.js            # Supervision + décommissionnement
│       │   └── alerts.js               # Alertes de masse
│       ├── socket/
│       │   └── index.js                # WebSocket (Redis Pub/Sub → Socket.io)
│       └── utils/
│           └── jwt.js                  # Génération et rotation des tokens
│
└── src/                                # ── Frontend React ──
    ├── context/
    │   ├── AuthContext.jsx             # Auth : gestion session JWT (login, refresh, logout)
    │   └── ThemeContext.jsx            # Mode sombre / clair
    ├── hooks/
    │   └── useSocket.js                # Hook Socket.io authentifié (temps réel admin)
    ├── utils/
    │   ├── api.js                      # Client fetch (Bearer token, auto-refresh, offline)
    │   ├── badgeCanvas.js              # Génération du badge PNG vertical (canvas 840×1320)
    │   ├── badgeCrypto.js              # ECDSA P-256 : signature et vérification QR
    │   ├── badgeStore.js               # IndexedDB + AES-256-GCM (cache offline)
    │   ├── dataMappers.js              # Normalise les réponses backend → format frontend
    │   └── scanFeedback.js             # Web Audio + Vibration API
    ├── data/
    │   └── mockData.js                 # Données simulées (utilisées en mode mock)
    └── pages/
        ├── Login.jsx                   # Connexion 2FA (TOTP RFC 6238)
        ├── agent/
        │   ├── AgentDashboard.jsx      # Dashboard, statut réseau, cache offline
        │   ├── Scanner.jsx             # Scan QR (html5-qrcode) + ECDSA + résultat
        │   ├── AgentHistory.jsx        # Historique de la session
        │   └── AgentProfile.jsx        # Profil et déconnexion
        └── admin/
            ├── AdminDashboard.jsx      # KPIs + flux en direct (Socket.io + API réelle)
            ├── BadgeInscription.jsx    # Inscription participant + QR signé ECDSA
            ├── PassageHistory.jsx      # Historique + export CSV
            ├── UserManagement.jsx      # Gestion des comptes agents
            ├── ParticipantManagement.jsx # CRUD participants
            ├── DoorManagement.jsx      # Gestion des portes et zones associées
            ├── ZoneManagement.jsx      # Gestion des zones d'accès
            └── SupervisionConsole.jsx  # War Room : alertes, révocations, terminaux
```

---

## Stack technique

### Frontend

| Outil | Rôle | Version |
|---|---|---|
| React | Interface utilisateur | 18.x |
| React Router | Routing et routes protégées | v6 |
| Tailwind CSS | Styles | 3.x |
| Vite + vite-plugin-pwa | Build + Service Worker PWA | 5.x |
| html5-qrcode | Lecture QR Code via caméra | 2.x |
| qrcode.react | Génération QR Code | 4.x |
| otpauth | TOTP RFC 6238 (démo live) | 9.x |
| react-i18next | Multilingue FR / EN / ES | — |
| Web Crypto API | ECDSA P-256, AES-256-GCM | Natif |
| IndexedDB | Cache offline chiffré | Natif |

### Backend

| Outil | Rôle | Version |
|---|---|---|
| Node.js + Express | Serveur HTTP | 22.x / 4.x |
| Socket.io | WebSocket temps réel | 4.x |
| PostgreSQL + pg | Base de données principale | 15.x |
| Redis + ioredis | Sessions, Pub/Sub, heartbeat | 7.x |
| jsonwebtoken | Access token (60 min) + refresh (7 j) | 9.x |
| bcryptjs | Hachage des mots de passe | — |
| otpauth | Validation TOTP côté serveur | 9.x |
| multer | Upload photos participants | 1.x |

---

## Fonctionnalités principales

### Sécurité
- Authentification 2FA : identifiant + mot de passe + TOTP (RFC 6238, SHA-1, 30 s)
- Déconnexion automatique après inactivité (configurable via `VITE_SESSION_TIMEOUT_MIN`, défaut 30 min)
- Blocage du compte après 5 tentatives échouées
- JWT access token (60 min) avec rotation du refresh token (7 jours)
- Révocation de session à distance (décommissionnement terminal)

### Agent (mobile)
- Scan QR Code par caméra avec cadre adaptatif (html5-qrcode)
- Vérification cryptographique ECDSA P-256 de chaque badge
- 4 résultats de scan : Autorisé · Zone refusée · Révoqué · Inconnu
- Retour sonore (Web Audio API) et haptique (Vibration API) par résultat
- Mode offline 4h : base locale chiffrée AES-256-GCM dans IndexedDB
- Réception des alertes de masse et révocations en temps réel (WebSocket)

### Admin / Superviseur (desktop)
- Flux de scans en direct (WebSocket)
- Révocation badge avec propagation < 60 secondes sur tous les terminaux
- Alerte de masse vers tous les agents connectés
- Décommissionnement d'urgence d'un terminal (révocation session agent)
- Supervision des terminaux : en ligne / hors ligne (heartbeat Redis, TTL 90 s)
- Export des journaux en JSON et CSV

---

## Build de production

```bash
# Frontend (web)
npm run build:prod
# → Génère dist/ — déployer sur Nginx

# Frontend + APK Android (via CI/CD)
git tag v1.x.x
git push origin v1.x.x
# → GitHub Actions génère l'APK/AAB signé → GitHub Releases

# Backend
cd backend
NODE_ENV=production node src/index.js
# → Avec PM2 en production : pm2 start src/index.js --name authbadge-backend
```

Configuration Nginx minimale :

```nginx
server {
  listen 443 ssl;
  root /var/www/authbadge-cm14/dist;
  index index.html;

  # Frontend (React SPA)
  location / {
    try_files $uri $uri/ /index.html;
  }

  # Backend API et WebSocket
  location /api/ {
    proxy_pass http://localhost:3001;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
  }
  location /socket.io/ {
    proxy_pass http://localhost:3001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
  }

  # Photos des participants
  location /uploads/ {
    proxy_pass http://localhost:3001;
  }
}
```

---

## Avancement du projet

Le détail complet est disponible dans [PROGRESS.md](PROGRESS.md).

## Documentation

| Document | Contenu |
|---|---|
| [Guide agent](docs/guide-agent.md) | Prise en main, scan, résultats, mode offline |
| [Guide administrateur](docs/guide-admin.md) | Gestion badges, agents, zones, incidents |
| [Procédure de déploiement](docs/deploiement.md) | Installation serveur, Nginx, CI/CD, jour J |
| [Documentation API](docs/api.md) | Endpoints REST + événements WebSocket |

| Phase | Description | État |
|---|---|---|
| 0 | Fondations et documentation | ✅ |
| 1 | Interface complète et responsive (FR/EN/ES) | ✅ |
| 2 | Fonctionnalités core : QR, TOTP, ECDSA, NFC, offline 4h | ✅ |
| 3 | Backend : API REST, JWT, WebSocket, PostgreSQL, Redis | ✅ |
| 4 | Capacitor Android, CI/CD, APK signé, sécurité mobile | ✅ |
| 5 | Tests et validation | ✅ |
| 6 | Documentation finale | ✅ |

---

*AUTH-BADGE CM14 · OMC Yaoundé 2026 · v1.0.0*
