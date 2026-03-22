# AUTH-BADGE CM14 — Suivi d'avancement du projet

> **Objectif de ce document** : Permettre à toute l'équipe de savoir en un coup d'œil ce qui est fait, ce qui est en cours, et ce qui reste à faire. Ce fichier est mis à jour à chaque étape complétée.

---

## Légende

| Symbole | Signification |
|---|---|
| ✅ | Terminé et validé |
| 🔄 | En cours |
| ⏳ | À faire |
| ❌ | Bloqué (dépendance non résolue) |

---

## Décisions architecturales clés

Ces décisions sont prises et ne sont plus à discuter. Elles guident toutes les étapes ci-dessous.

| Décision | Détail |
|---|---|
| Application unique | Une seule web app React — interface agent (mobile) ou admin (desktop) selon le rôle |
| Export natif | Capacitor pour produire les apps iOS et Android depuis le code web existant |
| Méthode | Agile — documentation "juste assez", au fur et à mesure |
| Rédaction | Les 7 règles de Bob appliquées à toute documentation |

---

## Phase 0 — Fondations du projet

> **But** : Poser les bases avant de coder. Aucune fonctionnalité livrable dans cette phase.

| # | Tâche | État |
|---|---|---|
| 0.1 | Analyse complète du cahier des charges (CDC) | ✅ |
| 0.2 | Choix architectural validé (web app unique + Capacitor) | ✅ |
| 0.3 | Validation des user stories (US-01 à US-15) | ✅ |
| 0.4 | Création du document de suivi (ce fichier) | ✅ |
| 0.5 | Mise à jour du README selon la nouvelle architecture | ✅ |

---

## Phase 1 — Interface complète et responsive

> **But** : L'application doit être parfaitement utilisable sur tous les appareils (téléphone, tablette, ordinateur) avant d'ajouter les vraies fonctionnalités.

| # | Tâche | User Story | État |
|---|---|---|---|
| 1.1 | Rendre l'interface admin responsive (sidebar drawer sur mobile) | — | ✅ |
| 1.2 | Ajouter le multilingue : Français, Anglais, Espagnol | — | ✅ |
| 1.3 | Compléter la saisie manuelle de badge (US-07) | US-07 | ✅ |
| 1.4 | Indicateur offline précis avec âge du cache | — | ✅ |

---

## Phase 2 — Fonctionnalités core (sans backend)

> **But** : Implémenter les vraies fonctionnalités de scan et de sécurité, en utilisant les APIs web modernes. Pas encore de serveur requis.

| # | Tâche | User Story | État |
|---|---|---|---|
| 2.1 | Vrai scan QR Code via caméra (`html5-qrcode`) | US-03 | ✅ |
| 2.2 | Vrai TOTP 2FA (RFC 6238, librairie `otpauth`) | US-01 | ✅ |
| 2.3 | Vérification ECDSA P-256 réelle (Web Crypto API) | US-03/04 | ✅ |
| 2.4 | Alerte sonore + vibration au scan (Web Audio + Vibration API) | US-05 | ✅ |
| 2.5 | Mode offline 4h (Service Worker + IndexedDB + AES-256) | US-06 | ✅ |
| 2.6 | Scan NFC via plugin Capacitor (Android + iOS) | US-02 | ✅ |

---

## Phase 3 — Backend et temps réel

> **But** : Connecter l'application à un vrai serveur pour que les données soient partagées entre tous les terminaux en temps réel.

| # | Tâche | User Story | État |
|---|---|---|---|
| 3.1 | Mise en place du backend API (Node.js + Express) | — | ✅ |
| 3.2 | Schéma PostgreSQL + Redis (connexions, seed, migrate) | — | ✅ |
| 3.3 | Authentification JWT (60 min access + 7j refresh + rotation) | US-01 | ✅ |
| 3.4 | Photo du titulaire dans le résultat de scan | US-04 | ✅ |
| 3.5 | Propagation révocation badge en < 60 secondes (WebSocket + Redis Pub/Sub) | US-11 | ✅ |
| 3.6 | Notifications push temps réel superviseurs + admins (Socket.io) | US-08 | ✅ |
| 3.7 | Alerte de masse depuis la console | US-14 | ✅ |
| 3.8 | Décommissionnement d'urgence d'un terminal | US-15 | ✅ |
| 3.9 | Supervision des terminaux (en ligne / hors ligne via heartbeat Redis) | US-09 | ✅ |
| 3.10 | Export JSON + CSV des journaux d'accès | US-13 | ✅ |
| 3.11 | Modèle Zone → Porte → Agent (zone_id sur points_controle, CRUD /api/zones) | US-12 | ✅ |
| 3.12 | Gestion des utilisateurs (CRUD /api/users, verrouillage compte) | US-10 | ✅ |
| 3.13 | Invalidation cache IndexedDB sur révocation (updateBadgeStatus) | US-11 | ✅ |
| 3.14 | Scanner écoute badge:revoked en temps réel (useSocket) | US-11 | ✅ |
| 3.15 | Stats journalières agent (scans du jour vs total checkpoint) | US-09 | ✅ |

---

## Phase 4 — Export Capacitor et déploiement

> **But** : Transformer la web app en vraies applications iOS et Android distribuables via MDM.

| # | Tâche | État |
|---|---|---|
| 4.1 | Intégration de Capacitor dans le projet React/Vite | ✅ |
| 4.2 | Configuration plugin NFC (`@capgo/capacitor-nfc`, Android natif) | ✅ |
| 4.3 | Certificate Pinning (TLS auto-signé + `network_security_config.xml`) | ✅ |
| 4.4 | Détection root/jailbreak (`@basecom-gmbh/capacitor-jailbreak-root-detection`) | ✅ |
| 4.5 | Préparation production (env, Vite prod, ProGuard, Capacitor config) | ✅ |
| 4.6 | Test build production local validé (web admin + mobile agent) | ✅ |
| 4.7 | Pipeline CI/CD GitHub Actions (build, sign APK/AAB, deploy backend) | 🔄 |
| 4.8 | Build Android signé (keystore + APK/AAB release) | ⏳ |
| 4.9 | Distribution via MDM sur les terminaux agents | — géré par l'administrateur de l'événement |

---

## Phase 5 — Tests et validation

> **But** : Valider que chaque user story est réellement satisfaite avant la mise en production.

| # | Tâche | État |
|---|---|---|
| 5.1 | Tests unitaires (Vitest) — couverture ≥ 80 % | ⏳ |
| 5.2 | Tests de charge (500 terminaux simultanés) | ⏳ |
| 5.3 | Test de basculement mode offline (4h autonomie) | ⏳ |
| 5.4 | Pentest (zéro vulnérabilité critique) | ⏳ |
| 5.5 | UAT avec agents de sécurité (min. 10 agents) | ⏳ |

---

## Phase 6 — Documentation finale

> **But** : Livrer une documentation complète, rédigée selon les 7 règles de Bob.

| # | Tâche | État |
|---|---|---|
| 6.1 | README mis à jour (architecture, Capacitor, choix techniques) | ⏳ |
| 6.2 | Guide utilisateur agent (comment scanner, mode offline, alertes) | ⏳ |
| 6.3 | Guide administrateur (gestion badges, zones, révocation) | ⏳ |
| 6.4 | Documentation technique API (endpoints, schéma DB) | ⏳ |
| 6.5 | Plan de continuité d'activité (PCA) documenté et testé | ⏳ |

---

## Suivi des user stories

| ID | Description | Phase | État |
|---|---|---|---|
| US-01 | Authentification 2FA agent | Phase 2 | ✅ |
| US-02 | Scan NFC | Phase 4 | ✅ |
| US-03 | Scan QR Code caméra | Phase 2 | ✅ |
| US-04 | Résultat plein écran avec photo | Phase 3 | ✅ |
| US-05 | Alerte visuelle + sonore + vibration | Phase 2 | ✅ |
| US-06 | Mode offline 4h | Phase 2 | ✅ |
| US-07 | Saisie manuelle badge | Phase 1 | ✅ |
| US-08 | Notification push superviseur | Phase 3 | ✅ |
| US-09 | Stats temps réel point de contrôle | Phase 3 | ✅ |
| US-10 | Créer/gérer profils participants | Phase 3 | ✅ |
| US-11 | Révocation badge < 60 secondes | Phase 3 | ✅ |
| US-12 | Configurer zones et catégories | Phase 3 | ✅ |
| US-13 | Export JSON / CSV journaux | Phase 3 | ✅ |
| US-14 | Alerte de masse | Phase 3 | ✅ |
| US-15 | Décommissionnement terminal | Phase 3 | ✅ |

---

*Dernière mise à jour : 2026-03-22 — Phase 1 ✅ — Phase 2 ✅ — Phase 3 ✅ — Phase 4 (4.1–4.6) ✅ — 4.7 CI/CD en cours*
