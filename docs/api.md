# AUTH-BADGE CM14 — Documentation API

> **Objectif de ce document**
> Après lecture, un développeur comprend la totalité des endpoints exposés par le backend AUTH-BADGE CM14, les règles d'authentification associées, et peut intégrer l'API dans un client web ou mobile sans ambiguïté.

---

## Table des matières

1. [Informations générales](#1-informations-générales)
2. [Authentification](#2-authentification--apiauth)
3. [Participants](#3-participants--apiparticipants)
4. [Scans](#4-scans--apiscans)
5. [Terminaux / Points de contrôle](#5-terminaux--apiterminals)
6. [Zones](#6-zones--apizones)
7. [Utilisateurs](#7-utilisateurs--apiusers)
8. [Alertes](#8-alertes--apialerts)
9. [Santé](#9-santé--health)
10. [WebSocket — événements temps réel](#10-websocket--événements-temps-réel)
11. [Codes d'erreur communs](#11-codes-derreur-communs)

---

## 1. Informations générales

### Base URL

| Environnement | URL de base |
|---|---|
| Développement | `http://localhost:3001` |
| Production (TLS activé) | `https://<hôte-production>:3001` |

Le backend démarre en HTTP si aucun certificat TLS n'est présent dans `backend/certs/`. En production, les fichiers `cert.pem` et `key.pem` activent automatiquement HTTPS.

### Content-Type

Toutes les requêtes envoyant un corps JSON doivent inclure l'en-tête :

```
Content-Type: application/json
```

L'upload de photo utilise `multipart/form-data` (voir section [Participants](#3-participants--apiparticipants)).

### Authentification — JWT Bearer

Le backend utilise deux types de tokens JWT :

| Token | Durée de vie | Usage |
|---|---|---|
| **Access token** | Courte (ex. 15 min) | Envoyé dans chaque requête protégée |
| **Refresh token** | Longue (ex. 7 jours) | Échangé contre un nouvel access token |

Toutes les routes marquées `requireAuth` exigent l'en-tête suivant :

```
Authorization: Bearer <access_token>
```

L'access token absent ou blacklisté renvoie `401 Unauthorized`.

### Rôles disponibles

| Rôle | Description |
|---|---|
| `agent` | Agent de terrain — effectue les scans à un point de contrôle |
| `supervisor` | Superviseur — consulte les scans et diffuse des alertes |
| `admin` | Administrateur — accès complet à toutes les ressources |

### Rate limiting

| Périmètre | Limite |
|---|---|
| Toutes les routes | 300 requêtes / minute / IP |
| `POST /api/auth/login` uniquement | 10 requêtes / minute / IP |

---

## 2. Authentification — `/api/auth`

### Vue d'ensemble des endpoints

| Méthode | URL | Rôle requis | Description |
|---|---|---|---|
| POST | `/api/auth/login` | Public | Connexion (mot de passe + OTP TOTP) |
| POST | `/api/auth/refresh` | Public | Renouvellement de l'access token |
| POST | `/api/auth/logout` | Tout utilisateur connecté | Déconnexion et invalidation des tokens |
| GET | `/api/auth/me` | Tout utilisateur connecté | Profil de l'utilisateur courant |

---

### POST `/api/auth/login`

Authentifie un utilisateur avec son identifiant, son mot de passe et un code OTP TOTP à 6 chiffres (RFC 6238, SHA-1, période 30 s).

**Rôle requis :** public (aucun token nécessaire)

**Corps de la requête :**

```json
{
  "id": "ADMIN01",
  "password": "motdepasse",
  "otp": "482031"
}
```

| Champ | Type | Obligatoire | Description |
|---|---|---|---|
| `id` | string | Oui | Identifiant de connexion (insensible à la casse côté DB) |
| `password` | string | Oui | Mot de passe en clair |
| `otp` | string | Oui | Code TOTP à 6 chiffres |

**Réponse 200 :**

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "a1b2c3d4e5f6...",
  "user": {
    "id": "ADMIN01",
    "role": "admin",
    "name": "Alice Dupont",
    "zone": null,
    "title": "Responsable sécurité",
    "checkpoint": null
  }
}
```

Pour un utilisateur de rôle `agent`, le champ `checkpoint` contient le point de contrôle assigné :

```json
{
  "accessToken": "eyJ...",
  "refreshToken": "...",
  "user": {
    "id": "AGENT03",
    "role": "agent",
    "name": "Marc Leroy",
    "zone": "ZONE-A",
    "title": null,
    "checkpoint": {
      "id": "PC-01",
      "nom": "Entrée principale",
      "zone_id": "ZONE-A",
      "zone_nom": "Zone VIP"
    }
  }
}
```

**Erreurs possibles :**

| Code HTTP | Message | Cause |
|---|---|---|
| 400 | `Champs id, password et otp requis.` | Un champ est absent |
| 400 | `Code OTP invalide (6 chiffres requis).` | Le format OTP n'est pas `^\d{6}$` |
| 401 | `Identifiants incorrects.` | Identifiant ou mot de passe invalide |
| 401 | `Code OTP invalide ou expiré.` | Le TOTP ne correspond pas |
| 403 | `Compte bloqué. Contactez l'administrateur.` | Le compte est verrouillé (`is_locked = true`) |

**Exemple curl :**

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"id":"ADMIN01","password":"motdepasse","otp":"482031"}'
```

---

### POST `/api/auth/refresh`

Échange un refresh token valide contre un nouveau couple access token / refresh token. L'ancien refresh token est immédiatement révoqué (rotation).

**Rôle requis :** public

**Corps de la requête :**

```json
{
  "refreshToken": "a1b2c3d4e5f6..."
}
```

**Réponse 200 :**

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "z9y8x7w6v5u4..."
}
```

**Erreurs possibles :**

| Code HTTP | Message | Cause |
|---|---|---|
| 400 | `refreshToken requis.` | Corps absent ou champ manquant |
| 401 | `Token de rafraîchissement invalide ou expiré.` | Token inconnu ou expiré en Redis |
| 401 | `Utilisateur introuvable.` | L'utilisateur lié au token a été supprimé |

**Exemple curl :**

```bash
curl -X POST http://localhost:3001/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"a1b2c3d4e5f6..."}'
```

---

### POST `/api/auth/logout`

Invalide l'access token courant (blacklist Redis jusqu'à expiration naturelle) et révoque tous les refresh tokens de l'utilisateur.

**Rôle requis :** tout utilisateur connecté

**Corps de la requête :** aucun

**Réponse 200 :**

```json
{ "success": true }
```

**Exemple curl :**

```bash
curl -X POST http://localhost:3001/api/auth/logout \
  -H "Authorization: Bearer eyJ..."
```

---

### GET `/api/auth/me`

Retourne le profil de l'utilisateur extrait du JWT courant.

**Rôle requis :** tout utilisateur connecté

**Réponse 200 :**

```json
{
  "user": {
    "id": "ADMIN01",
    "role": "admin",
    "name": "Alice Dupont",
    "zone": null,
    "title": "Responsable sécurité"
  }
}
```

**Exemple curl :**

```bash
curl http://localhost:3001/api/auth/me \
  -H "Authorization: Bearer eyJ..."
```

---

## 3. Participants — `/api/participants`

Un participant représente une personne accréditée (délégué, journaliste, VIP, etc.). Chaque participant possède un badge numérique identifié par son `id`.

### Vue d'ensemble des endpoints

| Méthode | URL | Rôle requis | Description |
|---|---|---|---|
| GET | `/api/participants` | Tout utilisateur connecté | Liste des participants (avec filtres) |
| GET | `/api/participants/:id` | Tout utilisateur connecté | Détail d'un participant |
| POST | `/api/participants` | admin, supervisor | Créer un participant |
| PATCH | `/api/participants/:id` | admin, supervisor | Modifier un participant |
| DELETE | `/api/participants/:id` | admin, supervisor | Supprimer un participant |
| POST | `/api/participants/:id/photo` | admin, supervisor | Uploader la photo du participant |

---

### GET `/api/participants`

Retourne la liste de tous les participants. Trois paramètres de filtre sont acceptés en query string.

**Paramètres de requête (optionnels) :**

| Paramètre | Type | Description |
|---|---|---|
| `search` | string | Recherche partielle sur `nom`, `prenom` ou `delegation` (insensible à la casse) |
| `statut` | string | Filtre par statut exact (`actif`, `révoqué`, `expiré`) |
| `categorie` | string | Filtre par catégorie (ex. `DELEGATION`, `PRESSE`, `VIP`) |

**Réponse 200 :**

```json
[
  {
    "id": "P-001",
    "nom": "Mbeki",
    "prenom": "Thabo",
    "delegation": "Afrique du Sud",
    "categorie": "DELEGATION",
    "zones": ["ZONE-A", "ZONE-B"],
    "statut": "actif",
    "date_expiration": "2024-12-15T00:00:00.000Z",
    "photo_url": "/uploads/a3f8b21c4e.jpg"
  }
]
```

**Exemple curl :**

```bash
curl "http://localhost:3001/api/participants?search=mbeki&statut=actif" \
  -H "Authorization: Bearer eyJ..."
```

---

### GET `/api/participants/:id`

Retourne les détails complets d'un participant.

**Réponse 200 :**

```json
{
  "id": "P-001",
  "nom": "Mbeki",
  "prenom": "Thabo",
  "delegation": "Afrique du Sud",
  "categorie": "DELEGATION",
  "zones": ["ZONE-A", "ZONE-B"],
  "statut": "actif",
  "date_expiration": "2024-12-15T00:00:00.000Z",
  "photo_url": "/uploads/a3f8b21c4e.jpg"
}
```

**Exemple curl :**

```bash
curl http://localhost:3001/api/participants/P-001 \
  -H "Authorization: Bearer eyJ..."
```

---

### POST `/api/participants`

Crée un nouveau participant. Si le champ `id` est omis, le backend génère automatiquement un identifiant au format `P-NNN` (ex. `P-042`).

**Rôle requis :** admin, supervisor

**Corps de la requête :**

```json
{
  "nom": "Dupont",
  "prenom": "Jean",
  "delegation": "France",
  "categorie": "DELEGATION",
  "zones": ["ZONE-A"],
  "statut": "actif",
  "date_expiration": "2024-12-31"
}
```

| Champ | Type | Obligatoire | Description |
|---|---|---|---|
| `id` | string | Non | Identifiant personnalisé. Généré automatiquement si absent |
| `nom` | string | Oui | Nom de famille |
| `prenom` | string | Oui | Prénom |
| `delegation` | string | Oui | Pays ou organisation représentée |
| `categorie` | string | Oui | Catégorie d'accréditation |
| `zones` | array | Oui | Liste des zones autorisées |
| `date_expiration` | string (date) | Oui | Date d'expiration du badge |
| `statut` | string | Non | Valeur par défaut : `actif` |

**Réponse 201 :**

```json
{
  "id": "P-042",
  "nom": "Dupont",
  "prenom": "Jean",
  "delegation": "France",
  "categorie": "DELEGATION",
  "zones": ["ZONE-A"],
  "statut": "actif",
  "date_expiration": "2024-12-31T00:00:00.000Z",
  "photo_url": null
}
```

**Exemple curl :**

```bash
curl -X POST http://localhost:3001/api/participants \
  -H "Authorization: Bearer eyJ..." \
  -H "Content-Type: application/json" \
  -d '{
    "nom":"Dupont","prenom":"Jean","delegation":"France",
    "categorie":"DELEGATION","zones":["ZONE-A"],"date_expiration":"2024-12-31"
  }'
```

---

### PATCH `/api/participants/:id`

Met à jour un ou plusieurs champs d'un participant. Seuls les champs fournis dans le corps sont modifiés.

**Rôle requis :** admin, supervisor

**Champs modifiables :** `nom`, `prenom`, `delegation`, `categorie`, `zones`, `statut`, `date_expiration`

**Corps de la requête (exemple — révocation d'un badge) :**

```json
{
  "statut": "révoqué"
}
```

Lorsque `statut` passe à `révoqué`, le backend publie automatiquement l'événement `badge:revoked` via Redis, ce qui propage la révocation en temps réel à tous les terminaux agents connectés.

**Réponse 200 :**

```json
{
  "id": "P-001",
  "nom": "Mbeki",
  "prenom": "Thabo",
  "delegation": "Afrique du Sud",
  "categorie": "DELEGATION",
  "zones": ["ZONE-A"],
  "statut": "révoqué",
  "date_expiration": "2024-12-15T00:00:00.000Z",
  "photo_url": "/uploads/a3f8b21c4e.jpg"
}
```

**Exemple curl :**

```bash
curl -X PATCH http://localhost:3001/api/participants/P-001 \
  -H "Authorization: Bearer eyJ..." \
  -H "Content-Type: application/json" \
  -d '{"statut":"révoqué"}'
```

---

### DELETE `/api/participants/:id`

Supprime définitivement un participant et publie l'événement `badge:deleted` via Redis.

**Rôle requis :** admin, supervisor

**Réponse 200 :**

```json
{ "success": true, "id": "P-001" }
```

**Exemple curl :**

```bash
curl -X DELETE http://localhost:3001/api/participants/P-001 \
  -H "Authorization: Bearer eyJ..."
```

---

### POST `/api/participants/:id/photo`

Upload une photo de profil pour le participant. La requête doit utiliser `multipart/form-data` avec le champ `photo`.

**Rôle requis :** admin, supervisor

**Contraintes :**
- Formats acceptés : `image/jpeg`, `image/png`, `image/webp`
- Taille maximale : 2 Mo (configurable via `MAX_FILE_SIZE_MB`)

**Réponse 200 :**

```json
{ "photo_url": "/uploads/3f9a21b4c8d7e6f0.jpg" }
```

La photo est accessible publiquement à l'URL `/uploads/<filename>`.

**Exemple curl :**

```bash
curl -X POST http://localhost:3001/api/participants/P-001/photo \
  -H "Authorization: Bearer eyJ..." \
  -F "photo=@/chemin/vers/photo.jpg"
```

---

## 4. Scans — `/api/scans`

Un scan représente le passage d'un participant devant un agent à un point de contrôle. Chaque scan est persisté en base et diffusé en temps réel aux superviseurs.

### Vue d'ensemble des endpoints

| Méthode | URL | Rôle requis | Description |
|---|---|---|---|
| POST | `/api/scans` | Tout utilisateur connecté | Enregistrer un scan |
| GET | `/api/scans` | Tout utilisateur connecté | Historique des scans (filtrable) |
| GET | `/api/scans/stats` | admin, supervisor | Statistiques sur 24 heures |
| GET | `/api/scans/export` | admin, supervisor | Export JSON ou CSV |

---

### POST `/api/scans`

Enregistre un scan effectué par un agent. Le frontend transmet le résultat déjà déterminé après vérification locale du badge. Le backend persiste le log et propage l'événement `scan:new` en temps réel.

**Corps de la requête :**

```json
{
  "participant_id": "P-001",
  "nom": "Mbeki Thabo",
  "delegation": "Afrique du Sud",
  "categorie": "DELEGATION",
  "zone": "ZONE-A",
  "point_controle_id": "PC-01",
  "resultat": "autorisé"
}
```

| Champ | Type | Obligatoire | Valeurs acceptées |
|---|---|---|---|
| `nom` | string | Oui | Nom du porteur tel qu'affiché sur le badge |
| `resultat` | string | Oui | `autorisé`, `révoqué`, `zone-refusée`, `inconnu` |
| `participant_id` | string | Non | ID du participant si connu |
| `delegation` | string | Non | Délégation |
| `categorie` | string | Non | Catégorie |
| `zone` | string | Non | Identifiant de la zone scannée |
| `point_controle_id` | string | Non | ID du point de contrôle |

**Réponse 201 :**

```json
{
  "id": 1042,
  "participant_id": "P-001",
  "nom": "Mbeki Thabo",
  "delegation": "Afrique du Sud",
  "categorie": "DELEGATION",
  "zone": "ZONE-A",
  "point_controle_id": "PC-01",
  "resultat": "autorisé",
  "agent_id": "AGENT03",
  "timestamp": "2024-11-20T14:32:05.123Z"
}
```

**Exemple curl :**

```bash
curl -X POST http://localhost:3001/api/scans \
  -H "Authorization: Bearer eyJ..." \
  -H "Content-Type: application/json" \
  -d '{
    "participant_id":"P-001",
    "nom":"Mbeki Thabo",
    "delegation":"Afrique du Sud",
    "zone":"ZONE-A",
    "point_controle_id":"PC-01",
    "resultat":"autorisé"
  }'
```

---

### GET `/api/scans`

Retourne l'historique paginé des scans. Un agent ne voit que les scans qu'il a lui-même effectués. Les superviseurs et admins peuvent filtrer par `agent_id`.

**Paramètres de requête (optionnels) :**

| Paramètre | Type | Description |
|---|---|---|
| `limit` | number | Nombre de résultats (défaut : 50) |
| `offset` | number | Décalage pour la pagination (défaut : 0) |
| `agent_id` | string | Filtrer par agent (admin/supervisor uniquement) |
| `resultat` | string | Filtrer par résultat (`autorisé`, `révoqué`, `zone-refusée`, `inconnu`) |
| `from` | ISO 8601 | Borne inférieure de la plage temporelle |
| `to` | ISO 8601 | Borne supérieure de la plage temporelle |

**Réponse 200 :**

```json
[
  {
    "id": 1042,
    "participant_id": "P-001",
    "nom": "Mbeki Thabo",
    "delegation": "Afrique du Sud",
    "categorie": "DELEGATION",
    "zone": "ZONE-A",
    "point_controle_id": "PC-01",
    "resultat": "autorisé",
    "agent_id": "AGENT03",
    "timestamp": "2024-11-20T14:32:05.123Z"
  }
]
```

**Exemple curl :**

```bash
curl "http://localhost:3001/api/scans?limit=20&resultat=révoqué&from=2024-11-20T00:00:00Z" \
  -H "Authorization: Bearer eyJ..."
```

---

### GET `/api/scans/stats`

Retourne des compteurs agrégés sur les 24 dernières heures.

**Rôle requis :** admin, supervisor

**Réponse 200 :**

```json
{
  "total_24h": "248",
  "autorises_24h": "231",
  "alertes_24h": "12",
  "zones_refusees_24h": "5"
}
```

> Les valeurs sont retournées sous forme de chaînes (comportement natif de PostgreSQL pour les agrégats `COUNT`).

**Exemple curl :**

```bash
curl http://localhost:3001/api/scans/stats \
  -H "Authorization: Bearer eyJ..."
```

---

### GET `/api/scans/export`

Exporte l'intégralité des scans (ou une plage temporelle) au format JSON ou CSV.

**Rôle requis :** admin, supervisor

**Paramètres de requête (optionnels) :**

| Paramètre | Type | Description |
|---|---|---|
| `format` | string | `json` (défaut) ou `csv` |
| `from` | ISO 8601 | Borne inférieure de la plage |
| `to` | ISO 8601 | Borne supérieure de la plage |

**Réponse 200 (format=json) :** tableau d'objets scan (même structure que `GET /api/scans`)

**Réponse 200 (format=csv) :**
- `Content-Type: text/csv`
- `Content-Disposition: attachment; filename="scans.csv"`
- Colonnes : `id`, `participant_id`, `nom`, `delegation`, `categorie`, `zone`, `point_controle_id`, `resultat`, `agent_id`, `timestamp`

**Exemple curl :**

```bash
# Export CSV de la journée
curl "http://localhost:3001/api/scans/export?format=csv&from=2024-11-20T00:00:00Z&to=2024-11-20T23:59:59Z" \
  -H "Authorization: Bearer eyJ..." \
  -o scans_20241120.csv
```

---

## 5. Terminaux — `/api/terminals`

Un terminal correspond à un point de contrôle physique (porte, portique) auquel un agent est assigné. Le terme "terminal" et "point de contrôle" désignent la même entité dans la table `points_controle`.

### Vue d'ensemble des endpoints

| Méthode | URL | Rôle requis | Description |
|---|---|---|---|
| GET | `/api/terminals` | admin, supervisor | Liste des terminaux avec statut temps réel |
| POST | `/api/terminals` | admin, supervisor | Créer un terminal |
| PATCH | `/api/terminals/:id` | admin, supervisor | Modifier un terminal |
| DELETE | `/api/terminals/:id` | admin, supervisor | Supprimer un terminal |
| POST | `/api/terminals/:id/heartbeat` | Tout utilisateur connecté | Signaler qu'un terminal est en ligne |
| POST | `/api/terminals/:id/decommission` | admin, supervisor | Décommissionner un terminal d'urgence |

---

### GET `/api/terminals`

Retourne la liste de tous les terminaux enrichie du statut temps réel (issu de Redis).

**Réponse 200 :**

```json
[
  {
    "id": "PC-01",
    "nom": "Entrée principale",
    "agent_id": "AGENT03",
    "agent_name": "Marc Leroy",
    "statut": "en-ligne",
    "scans": 84,
    "last_seen": "2024-11-20T14:35:00.000Z",
    "zone_id": "ZONE-A",
    "zone_nom": "Zone VIP",
    "online": true,
    "lastPing": "2024-11-20T14:35:00.000Z"
  }
]
```

**Exemple curl :**

```bash
curl http://localhost:3001/api/terminals \
  -H "Authorization: Bearer eyJ..."
```

---

### POST `/api/terminals`

Crée un nouveau terminal (point de contrôle).

**Rôle requis :** admin, supervisor

**Corps de la requête :**

```json
{
  "id": "PC-05",
  "nom": "Sortie de secours Est",
  "zone_id": "ZONE-B"
}
```

| Champ | Type | Obligatoire | Description |
|---|---|---|---|
| `id` | string | Oui | Identifiant unique du terminal |
| `nom` | string | Oui | Nom lisible du point de contrôle |
| `zone_id` | string | Non | Identifiant de la zone associée |

**Réponse 201 :**

```json
{
  "id": "PC-05",
  "nom": "Sortie de secours Est",
  "agent_id": null,
  "statut": "hors-ligne",
  "scans": 0,
  "last_seen": null,
  "zone_id": "ZONE-B"
}
```

**Exemple curl :**

```bash
curl -X POST http://localhost:3001/api/terminals \
  -H "Authorization: Bearer eyJ..." \
  -H "Content-Type: application/json" \
  -d '{"id":"PC-05","nom":"Sortie de secours Est","zone_id":"ZONE-B"}'
```

---

### PATCH `/api/terminals/:id`

Modifie les propriétés d'un terminal (nom, statut, agent assigné, zone).

**Rôle requis :** admin, supervisor

**Corps de la requête (exemple — assignation d'un agent) :**

```json
{
  "agent_id": "AGENT04",
  "statut": "en-ligne"
}
```

**Champs modifiables :** `statut`, `agent_id`, `zone_id`, `nom`

**Réponse 200 :** objet terminal mis à jour (même structure que `POST /api/terminals` 201)

**Exemple curl :**

```bash
curl -X PATCH http://localhost:3001/api/terminals/PC-05 \
  -H "Authorization: Bearer eyJ..." \
  -H "Content-Type: application/json" \
  -d '{"agent_id":"AGENT04","statut":"en-ligne"}'
```

---

### DELETE `/api/terminals/:id`

Supprime définitivement un terminal.

**Rôle requis :** admin, supervisor

**Réponse 200 :**

```json
{ "success": true }
```

---

### POST `/api/terminals/:id/heartbeat`

Appelé par l'application agent toutes les 60 secondes pour maintenir le terminal en ligne. Met à jour `last_seen` en base et inscrit le terminal dans Redis avec une expiration automatique.

**Rôle requis :** tout utilisateur connecté

**Corps de la requête :** aucun

**Réponse 200 :**

```json
{ "ok": true }
```

**Exemple curl :**

```bash
curl -X POST http://localhost:3001/api/terminals/PC-01/heartbeat \
  -H "Authorization: Bearer eyJ..."
```

---

### POST `/api/terminals/:id/decommission`

Décommissionne un terminal d'urgence : révoque tous les refresh tokens de l'agent assigné, passe le terminal en `hors-ligne`, dissocie l'agent, puis publie l'événement `terminal:decommissioned` via Redis pour déconnecter l'application agent en temps réel.

**Rôle requis :** admin, supervisor

**Corps de la requête :** aucun

**Réponse 200 :**

```json
{
  "ok": true,
  "terminalId": "PC-01",
  "agentDeconnected": "AGENT03"
}
```

**Exemple curl :**

```bash
curl -X POST http://localhost:3001/api/terminals/PC-01/decommission \
  -H "Authorization: Bearer eyJ..."
```

---

## 6. Zones — `/api/zones`

Une zone représente un périmètre physique sécurisé (salle plénière, espace presse, zone VIP, etc.). Chaque zone dispose d'un niveau d'accès numérique.

### Vue d'ensemble des endpoints

| Méthode | URL | Rôle requis | Description |
|---|---|---|---|
| GET | `/api/zones` | Tout utilisateur connecté | Liste des zones |
| POST | `/api/zones` | admin | Créer une zone |
| PATCH | `/api/zones/:id` | admin | Modifier une zone |
| DELETE | `/api/zones/:id` | admin | Supprimer une zone |

---

### GET `/api/zones`

Retourne toutes les zones avec le nombre de points de contrôle associés.

**Réponse 200 :**

```json
[
  {
    "id": "ZONE-A",
    "nom": "Zone VIP",
    "description": "Accès délégations officielles uniquement",
    "niveau_acces": 3,
    "portes_count": "2"
  },
  {
    "id": "ZONE-B",
    "nom": "Espace Presse",
    "description": "Journalistes accrédités",
    "niveau_acces": 2,
    "portes_count": "1"
  }
]
```

**Exemple curl :**

```bash
curl http://localhost:3001/api/zones \
  -H "Authorization: Bearer eyJ..."
```

---

### POST `/api/zones`

Crée une nouvelle zone. L'identifiant est automatiquement converti en majuscules.

**Rôle requis :** admin

**Corps de la requête :**

```json
{
  "id": "zone-c",
  "nom": "Salle plénière",
  "description": "Séances officielles",
  "niveau_acces": 2
}
```

| Champ | Type | Obligatoire | Description |
|---|---|---|---|
| `id` | string | Oui | Identifiant (converti en majuscules, ex. `ZONE-C`) |
| `nom` | string | Oui | Nom de la zone |
| `description` | string | Non | Description libre |
| `niveau_acces` | number | Non | Niveau d'accès (défaut : 1) |

**Réponse 201 :**

```json
{
  "id": "ZONE-C",
  "nom": "Salle plénière",
  "description": "Séances officielles",
  "niveau_acces": 2
}
```

**Exemple curl :**

```bash
curl -X POST http://localhost:3001/api/zones \
  -H "Authorization: Bearer eyJ..." \
  -H "Content-Type: application/json" \
  -d '{"id":"zone-c","nom":"Salle plénière","niveau_acces":2}'
```

---

### PATCH `/api/zones/:id`

Modifie les champs `nom`, `description` ou `niveau_acces` d'une zone. Seuls les champs fournis sont mis à jour.

**Rôle requis :** admin

**Corps de la requête :**

```json
{
  "niveau_acces": 3
}
```

**Réponse 200 :** objet zone mis à jour

**Exemple curl :**

```bash
curl -X PATCH http://localhost:3001/api/zones/ZONE-C \
  -H "Authorization: Bearer eyJ..." \
  -H "Content-Type: application/json" \
  -d '{"niveau_acces":3}'
```

---

### DELETE `/api/zones/:id`

Supprime une zone. La suppression est bloquée si des points de contrôle référencent encore la zone (`409 Conflict`).

**Rôle requis :** admin

**Réponse 200 :**

```json
{ "success": true }
```

**Réponse 409 (zone utilisée) :**

```json
{ "error": "Impossible de supprimer : des portes utilisent encore cette zone." }
```

**Exemple curl :**

```bash
curl -X DELETE http://localhost:3001/api/zones/ZONE-C \
  -H "Authorization: Bearer eyJ..."
```

---

## 7. Utilisateurs — `/api/users`

Les utilisateurs sont les membres du personnel opérationnel (agents, superviseurs, administrateurs). La création d'un utilisateur génère automatiquement un secret TOTP.

### Vue d'ensemble des endpoints

| Méthode | URL | Rôle requis | Description |
|---|---|---|---|
| GET | `/api/users` | admin, supervisor | Liste des utilisateurs |
| POST | `/api/users` | admin | Créer un utilisateur |
| PATCH | `/api/users/:id` | admin | Modifier un utilisateur |
| PATCH | `/api/users/:id/lock` | admin | Basculer le verrou du compte |
| DELETE | `/api/users/:id` | admin | Supprimer un utilisateur |

---

### GET `/api/users`

Retourne la liste des utilisateurs avec leur point de contrôle assigné.

**Rôle requis :** admin, supervisor

**Réponse 200 :**

```json
[
  {
    "id": "ADMIN01",
    "loginId": "ADMIN01",
    "name": "Alice Dupont",
    "role": "admin",
    "zone": "",
    "statut": "HORS LIGNE",
    "title": "Responsable sécurité"
  },
  {
    "id": "AGENT03",
    "loginId": "AGENT03",
    "name": "Marc Leroy",
    "role": "agent",
    "zone": "Entrée principale",
    "statut": "HORS LIGNE",
    "title": null
  }
]
```

> Le champ `statut` est `BLOQUÉ` si `is_locked = true`, sinon `HORS LIGNE`. Le statut en ligne est géré par Socket.io (voir section [WebSocket](#10-websocket--événements-temps-réel)).

**Exemple curl :**

```bash
curl http://localhost:3001/api/users \
  -H "Authorization: Bearer eyJ..."
```

---

### POST `/api/users`

Crée un compte utilisateur. Le backend hache automatiquement le mot de passe et génère un secret TOTP base32 de 16 caractères. L'identifiant est converti en majuscules.

**Rôle requis :** admin

**Corps de la requête :**

```json
{
  "loginId": "agent05",
  "name": "Sophie Martin",
  "password": "MotDePasseSecurisé!",
  "role": "agent",
  "zone": "ZONE-B"
}
```

| Champ | Type | Obligatoire | Valeurs acceptées |
|---|---|---|---|
| `loginId` | string | Oui | Identifiant de connexion (converti en majuscules) |
| `name` | string | Oui | Nom complet |
| `password` | string | Oui | Mot de passe en clair (haché avec bcrypt, coût 12) |
| `role` | string | Oui | `agent`, `admin`, `supervisor` |
| `zone` | string | Non | Zone de rattachement |

**Réponse 201 :**

```json
{
  "id": "AGENT05",
  "loginId": "AGENT05",
  "name": "Sophie Martin",
  "role": "agent",
  "zone": "ZONE-B",
  "statut": "HORS LIGNE"
}
```

> Le secret TOTP n'est pas retourné dans la réponse. L'administrateur doit le récupérer directement en base pour l'enrôler dans l'application d'authentification de l'utilisateur.

**Exemple curl :**

```bash
curl -X POST http://localhost:3001/api/users \
  -H "Authorization: Bearer eyJ..." \
  -H "Content-Type: application/json" \
  -d '{
    "loginId":"agent05","name":"Sophie Martin",
    "password":"MotDePasseSecurisé!","role":"agent","zone":"ZONE-B"
  }'
```

---

### PATCH `/api/users/:id`

Modifie les champs `name`, `role` et/ou `zone` d'un utilisateur.

**Rôle requis :** admin

**Corps de la requête :**

```json
{
  "role": "supervisor"
}
```

**Réponse 200 :** objet utilisateur mis à jour (même structure que `GET /api/users`)

**Exemple curl :**

```bash
curl -X PATCH http://localhost:3001/api/users/AGENT05 \
  -H "Authorization: Bearer eyJ..." \
  -H "Content-Type: application/json" \
  -d '{"role":"supervisor"}'
```

---

### PATCH `/api/users/:id/lock`

Bascule l'état de verrouillage (`is_locked`) d'un compte. Un compte verrouillé ne peut plus se connecter. Un administrateur ne peut pas verrouiller son propre compte.

**Rôle requis :** admin

**Corps de la requête :** aucun

**Réponse 200 :**

```json
{ "id": "AGENT03", "is_locked": true }
```

**Exemple curl :**

```bash
# Verrouille (ou déverrouille) le compte AGENT03
curl -X PATCH http://localhost:3001/api/users/AGENT03/lock \
  -H "Authorization: Bearer eyJ..."
```

---

### DELETE `/api/users/:id`

Supprime définitivement un compte utilisateur. Un administrateur ne peut pas supprimer son propre compte.

**Rôle requis :** admin

**Réponse 200 :**

```json
{ "success": true }
```

**Exemple curl :**

```bash
curl -X DELETE http://localhost:3001/api/users/AGENT05 \
  -H "Authorization: Bearer eyJ..."
```

---

## 8. Alertes — `/api/alerts`

Le système d'alertes permet à un superviseur ou un administrateur de diffuser un message immédiat à tous les terminaux connectés via Socket.io.

### Vue d'ensemble des endpoints

| Méthode | URL | Rôle requis | Description |
|---|---|---|---|
| POST | `/api/alerts` | admin, supervisor | Créer et diffuser une alerte |
| GET | `/api/alerts` | Tout utilisateur connecté | 50 dernières alertes |

---

### POST `/api/alerts`

Crée une alerte, la persiste en base et la diffuse immédiatement à tous les sockets connectés via l'événement `alert:broadcast`.

**Rôle requis :** admin, supervisor

**Corps de la requête :**

```json
{
  "message": "Évacuation immédiate de la salle B — procédure d'urgence déclenchée.",
  "level": "critical"
}
```

| Champ | Type | Obligatoire | Valeurs acceptées |
|---|---|---|---|
| `message` | string | Oui | Texte de l'alerte (espaces seuls refusés) |
| `level` | string | Non | `info` (défaut), `warning`, `critical` |

**Réponse 201 :**

```json
{
  "id": 7,
  "message": "Évacuation immédiate de la salle B — procédure d'urgence déclenchée.",
  "level": "critical",
  "author_id": "ADMIN01",
  "created_at": "2024-11-20T15:02:11.456Z"
}
```

**Exemple curl :**

```bash
curl -X POST http://localhost:3001/api/alerts \
  -H "Authorization: Bearer eyJ..." \
  -H "Content-Type: application/json" \
  -d '{"message":"Évacuation immédiate de la salle B.","level":"critical"}'
```

---

### GET `/api/alerts`

Retourne les 50 alertes les plus récentes avec le nom de l'auteur.

**Rôle requis :** tout utilisateur connecté

**Réponse 200 :**

```json
[
  {
    "id": 7,
    "message": "Évacuation immédiate de la salle B — procédure d'urgence déclenchée.",
    "level": "critical",
    "author_id": "ADMIN01",
    "author_name": "Alice Dupont",
    "created_at": "2024-11-20T15:02:11.456Z"
  }
]
```

**Exemple curl :**

```bash
curl http://localhost:3001/api/alerts \
  -H "Authorization: Bearer eyJ..."
```

---

## 9. Santé — `/health`

Endpoint de vérification de vie du serveur. Ne nécessite aucun token.

| Méthode | URL | Rôle requis |
|---|---|---|
| GET | `/health` | Public |

**Réponse 200 :**

```json
{
  "status": "ok",
  "ts": "2024-11-20T14:00:00.000Z"
}
```

**Exemple curl :**

```bash
curl http://localhost:3001/health
```

---

## 10. WebSocket — événements temps réel

Le backend expose un serveur Socket.io sur le même port que l'API REST. La connexion WebSocket remplace le polling pour les scénarios temps réel : scans en direct, révocations de badge et alertes d'urgence.

### Connexion et authentification

Le client Socket.io doit passer l'access token dans le handshake. Sans token valide, la connexion est refusée immédiatement.

```javascript
import { io } from 'socket.io-client'

const socket = io('http://localhost:3001', {
  auth: { token: accessToken }
})
```

À la connexion, le backend inscrit automatiquement le socket dans deux rooms :
- `user:<userId>` — room personnelle de l'utilisateur
- `role:<role>` — room partagée par tous les utilisateurs du même rôle

### Rooms et routage des événements

| Room | Membres | Événements reçus |
|---|---|---|
| `role:admin` | Tous les admins connectés | `scan:new`, `user:status` |
| `role:supervisor` | Tous les superviseurs connectés | `scan:new`, `user:status` |
| `role:agent` | Tous les agents connectés | `badge:revoked`, `terminal:decommissioned` |
| `user:<id>` | Socket personnel | `terminal:decommissioned` (ciblé) |
| `terminal:<id>` | Socket ayant envoyé `terminal:heartbeat` | — |
| Tous connectés | — | `alert:broadcast` |

---

### Événements émis par le serveur → reçus par le client

#### `scan:new`

Diffusé aux rooms `role:supervisor` et `role:admin` à chaque nouveau scan enregistré.

```javascript
socket.on('scan:new', (data) => {
  // data : objet scan complet
})
```

**Payload :**

```json
{
  "id": 1042,
  "participant_id": "P-001",
  "nom": "Mbeki Thabo",
  "delegation": "Afrique du Sud",
  "categorie": "DELEGATION",
  "zone": "ZONE-A",
  "point_controle_id": "PC-01",
  "resultat": "autorisé",
  "agent_id": "AGENT03",
  "timestamp": "2024-11-20T14:32:05.123Z"
}
```

---

#### `badge:revoked`

Diffusé à la room `role:agent` lorsqu'un badge est révoqué (`PATCH /api/participants/:id` avec `statut: "révoqué"`). Les agents mettent à jour leur cache local pour fonctionner hors connexion.

```javascript
socket.on('badge:revoked', (data) => {
  // mettre à jour le cache local offline
})
```

**Payload :**

```json
{
  "id": "P-001",
  "nom": "Mbeki",
  "prenom": "Thabo"
}
```

---

#### `alert:broadcast`

Diffusé à **tous** les sockets connectés (agents, superviseurs, admins) lors de la création d'une alerte via `POST /api/alerts`.

```javascript
socket.on('alert:broadcast', (data) => {
  // afficher la notification d'urgence
})
```

**Payload :**

```json
{
  "id": 7,
  "message": "Évacuation immédiate de la salle B — procédure d'urgence déclenchée.",
  "level": "critical",
  "author": "Alice Dupont",
  "timestamp": "2024-11-20T15:02:11.456Z"
}
```

---

#### `terminal:decommissioned`

Envoyé uniquement à la room `user:<agentId>` lorsque `POST /api/terminals/:id/decommission` est appelé. L'application agent doit déconnecter l'utilisateur et effacer les données locales.

```javascript
socket.on('terminal:decommissioned', (data) => {
  // forcer la déconnexion et effacer le stockage local
})
```

**Payload :**

```json
{
  "terminalId": "PC-01",
  "agentId": "AGENT03",
  "by": "ADMIN01",
  "at": "2024-11-20T16:45:00.000Z"
}
```

---

#### `user:status`

Diffusé aux rooms `role:admin` et `role:supervisor` lors de la connexion ou déconnexion d'un utilisateur.

```javascript
socket.on('user:status', (data) => {
  // mettre à jour l'indicateur de présence dans l'interface
})
```

**Payload (connexion) :**

```json
{ "userId": "AGENT03", "status": "EN LIGNE" }
```

**Payload (déconnexion) :**

```json
{ "userId": "AGENT03", "status": "HORS LIGNE" }
```

---

### Événements émis par le client → reçus par le serveur

#### `terminal:heartbeat`

Envoyé par l'application agent toutes les 60 secondes. Permet au socket de rejoindre la room `terminal:<terminalId>` pour les ciblages futurs.

```javascript
socket.emit('terminal:heartbeat', { terminalId: 'PC-01' })
```

**Payload :**

```json
{ "terminalId": "PC-01" }
```

> Ce mécanisme complète `POST /api/terminals/:id/heartbeat` qui maintient le statut Redis. Les deux doivent être appelés conjointement.

---

## 11. Codes d'erreur communs

| Code HTTP | Signification | Causes fréquentes |
|---|---|---|
| 400 | Bad Request | Champ obligatoire manquant, format invalide |
| 401 | Unauthorized | Token absent, expiré, blacklisté ou credentials incorrects |
| 403 | Forbidden | Rôle insuffisant, ou opération auto-interdite (verrouiller son propre compte) |
| 404 | Not Found | Ressource inexistante en base |
| 409 | Conflict | Identifiant déjà existant, ou suppression bloquée par contrainte de clé étrangère |
| 500 | Internal Server Error | Erreur base de données ou Redis non catchée |

**Format d'erreur standard :**

```json
{ "error": "Description lisible de l'erreur." }
```

---

*Documentation générée pour AUTH-BADGE CM14 — backend Node.js / Express / PostgreSQL / Redis / Socket.io*
