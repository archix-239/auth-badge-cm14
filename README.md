# AUTH-BADGE CM14 — Système de contrôle d'accès OMC

> Application de gestion des accréditations et de contrôle d'accès pour la **14ème Conférence Ministérielle de l'Organisation Mondiale du Commerce** — Yaoundé, Cameroun, 2025.

Après avoir lu ce document, vous saurez **lancer l'application** (avec ou sans backend), **comprendre son architecture**, et **où en est le développement**.

---

## Deux modes de fonctionnement

AUTH-BADGE CM14 peut fonctionner de deux façons selon vos besoins :

| Mode | Quand l'utiliser | Prérequis |
|---|---|---|
| **Mock** (sans backend) | Développement frontend, démonstrations | Node.js uniquement |
| **API réelle** (avec backend) | Intégration complète, recette, production | Node.js + PostgreSQL + Redis |

---

## Mode mock — démarrage en 2 commandes

Aucune base de données nécessaire. Les données sont simulées en mémoire.

```bash
# 1. Installer les dépendances frontend
npm install

# 2. Lancer le serveur de développement
npm run dev
```

Ouvrir ensuite [http://localhost:5173](http://localhost:5173).

> **Comment ça fonctionne ?** Si la variable `VITE_API_URL` n'est pas définie, l'application utilise automatiquement les données de `src/data/mockData.js`. Aucune configuration supplémentaire n'est requise.

---

## Mode API réelle — démarrage avec backend

### Prérequis

- Node.js 20+
- PostgreSQL 15+
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

Les deux modes utilisent les mêmes identifiants. La seule différence : en mode mock, les codes OTP sont affichés en direct sur la page de connexion.

| Rôle | Identifiant | Mot de passe | OTP | Interface |
|---|---|---|---|---|
| Agent | `AG-8824` | `Agent@CM14!` | Code TOTP live | Mobile — scanner, dashboard, historique |
| Agent | `AG-0031` | `Agent@CM14!` | Code TOTP live | Mobile |
| Administrateur | `ADMIN-001` | `Admin@CM14!` | Code TOTP live | Desktop — console complète |
| Superviseur | `SUPER-001` | `Supervisor@CM14!` | Code TOTP live | Desktop — supervision |

> **Code OTP** : l'authentification utilise le vrai protocole TOTP (RFC 6238, SHA-1, 6 chiffres, 30 secondes). En mode mock, les codes sont affichés sur la page de connexion avec un compte à rebours. En mode API réelle, utiliser une application comme **Google Authenticator** ou **Authy** avec les secrets TOTP du fichier `backend/src/db/seed.js`.

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
    │   ├── AuthContext.jsx             # Auth : API réelle ou mock selon VITE_API_URL
    │   └── ThemeContext.jsx            # Mode sombre / clair
    ├── utils/
    │   ├── api.js                      # Client fetch (Bearer token, auto-refresh, offline)
    │   ├── badgeCrypto.js              # ECDSA P-256 : signature et vérification QR
    │   ├── badgeStore.js               # IndexedDB + AES-256-GCM (cache offline)
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
            ├── AdminDashboard.jsx      # KPIs + flux en direct
            ├── BadgeInscription.jsx    # Inscription participant + QR signé ECDSA
            ├── PassageHistory.jsx      # Historique + export CSV
            ├── UserManagement.jsx      # Gestion des comptes agents
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
| Node.js + Express | Serveur HTTP | 20.x / 4.x |
| Socket.io | WebSocket temps réel | 4.x |
| PostgreSQL + pg | Base de données principale | 15.x |
| Redis + ioredis | Sessions, Pub/Sub, heartbeat | 7.x |
| jsonwebtoken | Access token (60 min) + refresh (7 j) | 9.x |
| argon2 | Hachage des mots de passe | — |
| otpauth | Validation TOTP côté serveur | 9.x |
| multer | Upload photos participants | 1.x |

---

## Fonctionnalités principales

### Sécurité
- Authentification 2FA : identifiant + mot de passe + TOTP (RFC 6238, SHA-1, 30 s)
- Déconnexion automatique après 15 minutes d'inactivité
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
# Frontend
npm run build
# → Génère dist/ — déployer sur Nginx

# Backend
cd backend
NODE_ENV=production node src/index.js
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

| Phase | Description | État |
|---|---|---|
| 0 | Fondations et documentation | ✅ |
| 1 | Interface complète et responsive (FR/EN/ES) | ✅ |
| 2 | Fonctionnalités core : QR, TOTP, ECDSA, offline 4h | ✅ |
| 3 | Backend : API REST, JWT, WebSocket, PostgreSQL, Redis | ✅ |
| 4 | Export Capacitor (iOS + Android) | ⏳ |
| 5 | Tests et validation | ⏳ |
| 6 | Documentation finale | ⏳ |

---

*AUTH-BADGE CM14 · OMC Yaoundé 2025 · v3.0.0*
