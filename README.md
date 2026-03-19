# AUTH-BADGE CM14 — Système de contrôle d'accès OMC

> Application web de gestion des accréditations et de contrôle d'accès pour la **14ème Conférence Ministérielle de l'Organisation Mondiale du Commerce** — Yaoundé, Cameroun.

Après avoir lu ce document, vous serez capable de **lancer l'application en local**, de **comprendre son architecture**, et de **savoir où en est le développement**.

---

## Démarrage rapide

Deux commandes suffisent pour lancer l'application :

```bash
npm install       # Installer les dépendances
npm run dev       # Lancer le serveur de développement
```

Ouvrir ensuite [http://localhost:5173](http://localhost:5173) dans le navigateur.

---

## Comptes de démonstration

L'application fonctionne actuellement avec des données simulées. Voici les comptes disponibles :

| Rôle | Identifiant | Mot de passe | OTP | Interface |
|---|---|---|---|---|
| Agent | `AG-8824` | `Agent@CM14!` | `123456` | Mobile — scanner, dashboard, historique |
| Agent | `AG-0031` | `Agent@CM14!` | `123456` | Mobile |
| Administrateur | `ADMIN-001` | `Admin@CM14!` | `123456` | Desktop — console complète |
| Superviseur | `SUPER-001` | `Super@CM14!` | `123456` | Desktop — console supervision |

> **Mode démonstration** : n'importe quel code de 6 chiffres est accepté comme OTP. Le vrai TOTP (RFC 6238) sera implémenté en Phase 2.

---

## Architecture de l'application

AUTH-BADGE CM14 est une **application web unique** qui adapte son interface selon le rôle de l'utilisateur connecté. Un agent voit l'interface mobile. Un administrateur voit la console desktop.

```
Connexion (ID + Mot de passe + OTP 2FA)
         │
         ├── Rôle AGENT ──────────────────────── Interface mobile
         │     ├── /agent/dashboard    → Statistiques du jour
         │     ├── /agent/scanner      → Scanner QR + résultat plein écran
         │     ├── /agent/history      → Historique de session
         │     └── /agent/profile      → Paramètres et déconnexion
         │
         └── Rôle ADMIN / SUPERVISEUR ────────── Interface desktop
               ├── /admin/dashboard       → KPIs + flux en direct
               ├── /admin/inscription     → Enregistrement participants + QR
               ├── /admin/passages        → Historique accès + export CSV
               ├── /admin/utilisateurs    → Gestion des comptes agents
               └── /admin/supervision     → Console War Room temps réel
```

### Choix architectural : Web App + Capacitor

L'application est développée en React (web), puis exportée en applications **iOS et Android natives** grâce à **Capacitor**. Ce choix permet de :

- Maintenir **un seul code source** pour le web, iOS et Android
- Accéder au **hardware natif** des terminaux (NFC, caméra, vibration, biométrie)
- Distribuer les applications via **MDM** sur les terminaux agents de la CM14

```
Code React (un seul fichier source)
          │
          ├── Navigateur web    → Console admin (superviseurs, PC)
          │
          └── Capacitor build
                ├── iOS (.ipa)  → Terminaux agents Apple
                └── Android (.apk) → Terminaux agents Android
```

---

## Structure des fichiers

```
authbadge-cm14/
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
├── PROGRESS.md                         # Suivi d'avancement du projet
└── src/
    ├── main.jsx                        # Point d'entrée React
    ├── App.jsx                         # Routage (React Router v6) + routes protégées
    ├── index.css                       # Styles globaux + animations
    ├── context/
    │   ├── AuthContext.jsx             # Authentification : 2FA, timeout 15min, blocage
    │   └── ThemeContext.jsx            # Mode sombre / clair (persisté)
    ├── data/
    │   └── mockData.js                 # Données simulées : participants, logs, zones
    ├── components/layout/
    │   ├── AgentLayout.jsx             # Layout mobile : header + navigation bas
    │   ├── AdminLayout.jsx             # Layout desktop : sidebar + contenu
    │   └── AdminSidebar.jsx            # Sidebar admin avec navigation
    └── pages/
        ├── Login.jsx                   # Connexion sécurisée (ID + MDP + OTP)
        ├── OTPRecovery.jsx             # Récupération du code OTP (4 étapes)
        ├── agent/
        │   ├── AgentDashboard.jsx      # Tableau de bord agent
        │   ├── Scanner.jsx             # Scanner QR (3 phases : attente, scan, résultat)
        │   ├── AgentHistory.jsx        # Historique des scans de la session
        │   └── AgentProfile.jsx        # Profil, paramètres, déconnexion
        └── admin/
            ├── AdminDashboard.jsx      # KPIs + points de contrôle + flux live
            ├── BadgeInscription.jsx    # Inscription participant + génération QR
            ├── PassageHistory.jsx      # Historique complet + export CSV
            ├── UserManagement.jsx      # Gestion des comptes utilisateurs
            └── SupervisionConsole.jsx  # Console War Room + alertes + révocation
```

---

## Stack technique

| Couche | Outil | Version |
|---|---|---|
| Interface | React | 18.x |
| Routing | React Router | v6 |
| Style | Tailwind CSS | 3.x |
| Icônes | Material Symbols (Google) + Lucide React | — |
| QR Code — génération | qrcode.react | 4.x |
| QR Code — lecture | html5-qrcode | 2.x |
| Dates | date-fns | 3.x |
| Build | Vite | 5.x |
| Export natif | Capacitor | À intégrer (Phase 4) |

---

## Fonctionnalités actuelles

### Sécurité et authentification
- Connexion par identifiant unique + mot de passe fort + OTP 2FA
- Déconnexion automatique après **15 minutes d'inactivité**
- Blocage du compte après **5 tentatives échouées**
- Routes protégées par rôle (agent / admin / superviseur)
- Récupération du code OTP en 4 étapes

### Interface Agent (mobile-first)
- Tableau de bord avec statistiques du jour et état du réseau
- Scanner QR avec animation et résultat en plein écran
- 4 statuts visuels : Autorisé (vert) · Zone refusée (orange) · Révoqué (rouge) · Inconnu (violet)
- Historique de session filtrable par résultat et période
- Mode sombre / clair

### Interface Admin (desktop)
- Tableau de bord KPIs : scans, taux d'autorisation, alertes, badges actifs
- Inscription des participants et génération du QR Code
- Révocation de badge avec confirmation et propagation simulée
- Historique des passages filtrable + export CSV
- Console de supervision War Room avec événements en direct
- Gestion des comptes agents (création, modification, blocage)

---

## Build de production

```bash
npm run build
# Génère le dossier dist/ — à déployer sur un serveur Nginx
```

Configuration Nginx minimale :

```nginx
server {
  listen 443 ssl;
  root /var/www/authbadge-cm14/dist;
  index index.html;
  location / { try_files $uri $uri/ /index.html; }
}
```

---

## Avancement du projet

Le détail complet des tâches, phases et user stories est disponible dans [PROGRESS.md](PROGRESS.md).

**Résumé des phases :**

| Phase | Description | État |
|---|---|---|
| 0 | Fondations et documentation | ✅ Terminé |
| 1 | Interface complète et responsive | 🔄 En cours |
| 2 | Fonctionnalités core (scan réel, TOTP, offline) | ⏳ À faire |
| 3 | Backend et temps réel | ⏳ À faire |
| 4 | Export Capacitor (iOS + Android) | ⏳ À faire |
| 5 | Tests et validation | ⏳ À faire |
| 6 | Documentation finale | ⏳ À faire |

---

*AUTH-BADGE CM14 · OMC Yaoundé · v1.0.0*
