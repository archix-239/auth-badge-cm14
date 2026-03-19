# AUTH-BADGE CM14 — Application Web de Contrôle d'Accès

> **Application web responsive (React + Tailwind CSS) de gestion des accréditations pour la 14ème Conférence Ministérielle de l'OMC — Yaoundé, Cameroun.**

---

## 🚀 Démarrage rapide — 3 commandes, c'est tout

```bash
npm install      # Installer les dépendances
npm run dev      # Lancer le serveur de développement
# → Ouvrir http://localhost:5173
```

---

## 🔐 Comptes de démonstration

| Rôle | Identifiant | Mot de passe | OTP | Interface |
|------|-------------|--------------|-----|-----------|
| **Agent** | `AG-8824` | `Agent@CM14!` | `123456` | Mobile — scanner, dashboard, historique |
| **Agent** | `AG-0031` | `Agent@CM14!` | `123456` | Mobile |
| **Admin** | `ADMIN-001` | `Admin@CM14!` | `123456` | Desktop — console complète |

> Mode OTP démo : tout code de 6 chiffres est accepté.

---

## 🗺️ Architecture de navigation

```
Login (ID + MDP + OTP 2FA)
│
├── AGENT → Interface mobile-first (bottom nav)
│   ├── /agent/dashboard   → Stats du jour + bouton scan rapide
│   ├── /agent/scanner     → Scanner QR + résultat plein écran
│   └── /agent/history     → Historique de session + filtres
│
└── ADMIN → Interface desktop (sidebar fixe)
    ├── /admin/dashboard   → KPIs + flux live + statut terminaux
    ├── /admin/inscription → Inscription participants + QR Code
    ├── /admin/passages    → Historique complet + export CSV
    ├── /admin/supervision → Console War Room + alertes temps réel
    └── /admin/scanner     → Scanner web (QR / NFC / Manuel)
```

---

## 📁 Structure des fichiers

```
authbadge-cm14/
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
└── src/
    ├── main.jsx                    # Point d'entrée
    ├── App.jsx                     # Routage complet (React Router v6)
    ├── index.css                   # Styles + animations scanner
    ├── context/AuthContext.jsx     # Auth : 2FA, timer 15min, blocage
    ├── data/mockData.js            # Participants, logs, zones, helpers
    ├── components/layout/
    │   ├── AgentLayout.jsx         # Layout mobile + navigation bas
    │   ├── AdminLayout.jsx         # Layout desktop
    │   └── AdminSidebar.jsx        # Sidebar avec liens actifs
    └── pages/
        ├── Login.jsx               # Connexion sécurisée
        ├── agent/
        │   ├── AgentDashboard.jsx  # Dashboard mobile
        │   ├── Scanner.jsx         # Scanner QR plein écran
        │   └── AgentHistory.jsx    # Historique mobile
        └── admin/
            ├── AdminDashboard.jsx        # KPIs + flux
            ├── BadgeInscription.jsx      # Formulaire + QR
            ├── PassageHistory.jsx        # Table + CSV
            ├── SupervisionConsole.jsx    # War Room sombre
            └── WebScanner.jsx           # Scanner 3 modes
```

---

## ✅ Fonctionnalités implémentées

**Sécurité**
- Authentification ID + mot de passe + OTP 2FA
- Déconnexion automatique après 15 minutes d'inactivité
- Blocage du compte après 5 tentatives échouées
- Routes protégées par rôle

**Interface Agent (mobile-first)**
- Dashboard avec statistiques et bouton scan central
- Scanner QR avec animation de balayage et résultat plein écran
- 4 statuts : Autorisé 🟢 · Zone refusée 🟠 · Révoqué 🔴 · Inconnu 🟣
- Indicateurs de connectivité et état du cache
- Historique de session avec filtres par résultat et période

**Interface Admin (desktop)**
- Dashboard KPIs temps réel
- Inscription + génération de QR Code (JSON signé ECDSA mock)
- Révocation de badge avec confirmation et propagation simulée
- Historique filtrable (nom, résultat, zone) + export CSV
- Console de supervision War Room (thème sombre, événements live)
- Alerte générale de masse
- Scanner web : QR Code · NFC · Saisie manuelle

---

## ⚙️ Stack technique

| Couche | Outil | Version |
|--------|-------|---------|
| UI | React | 18.x |
| Routing | React Router | v6 |
| Style | Tailwind CSS | 3.x |
| QR Code | qrcode.react | 4.x |
| Icônes | Material Symbols | — |
| Build | Vite | 5.x |

---

## 🏗️ Build de production

```bash
npm run build
# → Génère le dossier dist/ prêt à déployer avec Nginx
```

```nginx
server {
  listen 443 ssl;
  root /var/www/authbadge-cm14/dist;
  index index.html;
  location / { try_files $uri $uri/ /index.html; }
}
```

---

## 🔌 Phase 2 — Connexion Supabase

```bash
npm install @supabase/supabase-js
```

```env
# .env.local
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=votre_clé_anon
```

Créer `src/lib/supabase.js` puis remplacer les imports `mockData` par des appels Supabase dans chaque page.

---

## 📅 Roadmap Phase 2

- [ ] Base de données Supabase (remplacer les données mock)
- [ ] Cryptographie ECDSA P-256 réelle pour les badges
- [ ] Caméra réelle avec `html5-qrcode`
- [ ] Cache hors ligne chiffré AES-256 (PWA)
- [ ] Notifications push (FCM / APNs)
- [ ] Tests unitaires (Vitest) + E2E (Playwright)
- [ ] CI/CD vers serveur dédié

---

*AUTH-BADGE CM14 · OMC Yaoundé 2025 · v1.0.0*
