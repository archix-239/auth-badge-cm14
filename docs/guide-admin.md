# Guide Administrateur — AUTH-BADGE CM14

**Conférence OMC CM14 · Yaoundé · ~4 000 participants**
**Version 1.0 — Mars 2026**

---

> **Objectif de ce guide :** À la fin de la lecture, chaque administrateur ou superviseur sait gérer les participants, générer des badges, configurer les zones, administrer les comptes agents, superviser le tableau de bord en temps réel, révoquer un badge en moins de 60 secondes et appliquer les procédures d'urgence — sans avoir besoin de chercher autre chose.

---

## Sommaire

1. [Introduction — Rôles et périmètres](#1-introduction--rôles-et-périmètres)
2. [Tableau de bord temps réel](#2-tableau-de-bord-temps-réel)
3. [Gestion des participants](#3-gestion-des-participants)
4. [Génération des badges](#4-génération-des-badges)
5. [Gestion des zones et points de contrôle](#5-gestion-des-zones-et-points-de-contrôle)
6. [Gestion des comptes agents](#6-gestion-des-comptes-agents)
7. [Révocation d'un badge](#7-révocation-dun-badge)
8. [Console de supervision](#8-console-de-supervision)
9. [Journaux d'accès](#9-journaux-daccès)
10. [Procédures d'urgence](#10-procédures-durgence)

---

## 1. Introduction — Rôles et périmètres

AUTH-BADGE CM14 est la console web d'administration du dispositif de contrôle d'accès de la 14e Conférence Ministérielle de l'OMC. La console s'ouvre dans un navigateur de bureau (Chrome, Firefox ou Edge, version récente). Les agents de terrain utilisent une application mobile séparée (voir *Guide Agent*).

La console distingue deux profils d'utilisateurs côté administration.

### Tableau des permissions

| Fonctionnalité | Administrateur | Superviseur |
|---|:---:|:---:|
| Consulter le tableau de bord | Oui | Oui |
| Voir les journaux d'accès | Oui | Oui |
| Exporter les journaux CSV | Oui | Oui |
| Recevoir et visualiser les alertes broadcast | Oui | Oui |
| Ajouter / modifier un participant | Oui | Non |
| Télécharger un badge PNG | Oui | Non |
| Révoquer un badge | Oui | Non |
| Créer / modifier une zone | Oui | Non |
| Assigner un agent à un point de contrôle | Oui | Non |
| Créer / modifier un compte agent | Oui | Non |
| Bloquer / débloquer un compte agent | Oui | Non |
| Afficher le QR TOTP d'un agent | Oui | Non |
| Envoyer une alerte broadcast | Oui | Non |
| Décommissionner un terminal | Oui | Non |

**En résumé :** le rôle Superviseur peut observer et exporter — le rôle Administrateur peut agir sur l'ensemble du système.

### Connexion à la console

1. Ouvrir l'URL de la console dans le navigateur (exemple : `https://authbadge-cm14.omc.int`)
2. Saisir l'identifiant de connexion (exemple : `ADMIN-001`)
3. Saisir le mot de passe (12 caractères minimum, fourni par le responsable technique)
4. Ouvrir Google Authenticator et saisir le code TOTP à 6 chiffres correspondant à l'entrée **AUTH-BADGE CM14**
5. La session expire automatiquement après 15 minutes d'inactivité
6. Après 5 tentatives échouées, le compte est verrouillé — contacter le responsable technique pour déverrouiller

```
  Écran de connexion

  ┌────────────────────────────────────┐
  │        AUTH-BADGE  CM14            │
  │  ─────────────────────────────     │
  │  Identifiant  [ ADMIN-001       ]  │
  │  Mot de passe [ ●●●●●●●●●●●●   ]  │
  │  Code TOTP    [ 4 8 7 2 1 3    ]  │
  │               [   Connexion    ]  │
  └────────────────────────────────────┘
```

---

## 2. Tableau de bord temps réel

### 2.1 Accès

Menu latéral → **Tableau de bord**

### 2.2 Ce que le tableau de bord affiche

Le tableau de bord se rafraîchit en temps réel via Socket.io. Chaque nouveau scan ou événement de sécurité apparaît immédiatement, sans recharger la page.

#### Indicateurs KPI (ligne du haut)

```
  ┌──────────────────┬──────────────────┬──────────────────┬──────────────────┐
  │  SCANS DU JOUR   │  AUTORISÉS       │  ALERTES         │  BADGES ACTIFS   │
  │  [  247 ]        │  [  231 ]  94 %  │  [   4 ]         │  [ 3 842 ]       │
  │  depuis minuit   │  accès accordés  │  révoqués+inconnu│  sur 4 000 total │
  └──────────────────┴──────────────────┴──────────────────┴──────────────────┘
```

| Indicateur | Ce qu'il mesure | Seuil d'attention |
|---|---|---|
| Scans du jour | Nombre total de scans traités depuis minuit | Chute brutale = terminal ou réseau en panne |
| Autorisés | Pourcentage d'accès accordés | En dessous de 85 % = vérifier les cas refusés |
| Alertes | Scans résultant en `révoqué` ou `inconnu` | Toute valeur > 0 mérite un contrôle |
| Badges actifs | Participants dont le statut est `actif` | Écart inattendu = vérifier les révocations |

#### Statut des points de contrôle

Sous les KPI, la liste affiche chaque terminal avec son état en temps réel.

| Couleur du point | Signification | Action recommandée |
|---|---|---|
| Vert fixe | Terminal actif, scans en cours | Rien à faire |
| Rouge clignotant | Alerte détectée sur ce terminal | Appeler l'agent affecté au terminal |
| Gris | Terminal inactif ou déconnecté | Vérifier la connexion réseau de l'agent |

#### Flux d'événements en direct

Le flux liste les 8 derniers scans avec : nom du participant, zone, point de contrôle et résultat coloré. Un clic sur **"Voir tout"** ouvre les journaux d'accès complets.

### 2.3 Scénario concret — surveiller une entrée à risque

> Il est 9h14. Le tableau de bord affiche un point de contrôle **PC-03 · Entrée Sud** avec un voyant rouge clignotant et 3 alertes consécutives en 5 minutes (résultat `inconnu`). L'administrateur appelle immédiatement l'agent affecté à PC-03 pour vérifier si des personnes non accréditées tentent d'entrer. Pendant ce temps, l'administrateur ouvre les journaux d'accès (section 9) et filtre sur PC-03 pour identifier les badges incriminés.

---

## 3. Gestion des participants

### 3.1 Accès

Menu latéral → **Participants**

### 3.2 Catégories d'accréditation

Chaque participant appartient à une catégorie qui détermine les zones accessibles par défaut. L'administrateur peut affiner les zones lors de la création.

| Code | Libellé | Zones habituelles |
|---|---|---|
| `DEL` | Délégué officiel | Z1, Z2, Z3 |
| `OBS` | Observateur | Z1 |
| `PRESS` | Presse accréditée | Z1, Z5 |
| `STAFF` | Personnel | Z1, Z2 |
| `VIP` | VIP | Z1, Z2, Z3, Z4, Z5 |
| `SEC` | Sécurité | toutes zones selon affectation |

### 3.3 Ajouter un participant

1. Cliquer sur **"+ Nouveau participant"** en haut à droite de la liste
2. Remplir le formulaire :
   - **Prénom** et **Nom** (obligatoires)
   - **Délégation** (pays ou organisation)
   - **Catégorie** (liste déroulante — voir tableau ci-dessus)
   - **Zones autorisées** (cases à cocher — plusieurs zones possibles)
   - **Date d'expiration** (laisser vide pour calculer automatiquement à J+365)
3. Cliquer sur **"Enregistrer"**
4. L'identifiant du participant est généré automatiquement (format `P-001`, `P-002`…)
5. Le badge est prêt à être généré depuis la page **Badges** (voir section 4)

### 3.4 Modifier un participant

1. Cliquer sur le nom du participant dans la liste
2. Cliquer sur **"Modifier"** dans le panneau de droite
3. Modifier les champs souhaités
4. Cliquer sur **"Enregistrer"**

> Modifier les zones d'un participant ne révoque pas le badge existant automatiquement. Si la modification est urgente (suppression d'accès), révoquer le badge (section 7) et en générer un nouveau.

### 3.5 Ajouter ou remplacer une photo

La photo apparaît sur le badge imprimé et dans la liste des participants.

1. Cliquer sur le participant dans la liste
2. Cliquer sur **"Modifier"**
3. Cliquer sur la zone photo (miniature ou icône de caméra)
4. Sélectionner le fichier image (formats acceptés : JPG, PNG, taille recommandée : 400×400 px minimum)
5. Recadrer si nécessaire
6. Cliquer sur **"Enregistrer"**

### 3.6 Filtrer et rechercher

La barre de recherche accepte le nom, le prénom, la délégation ou l'identifiant du participant. Les filtres **Catégorie** et **Statut** permettent de réduire la liste.

```
  ┌───────────────────────────────────────────────────────────────────────┐
  │  [ Recherche : "Nakamura"   ]  [ Catégorie : DEL ▼ ]  [ Statut : actif ▼ ] │
  └───────────────────────────────────────────────────────────────────────┘
  Résultat : 1 participant — Yuki Nakamura · Japon · DEL · actif
```

### 3.7 Scénario concret — enregistrement d'un délégué de dernière minute

> À 8h45, un délégué brésilien se présente à l'accréditation sans avoir été pré-enregistré. L'administrateur ouvre **Participants → + Nouveau participant**, renseigne "Ana Rodrigues / Brésil / DEL", coche Z1, Z2 et Z3, laisse la date d'expiration vide, puis clique Enregistrer. En moins de 2 minutes, Ana Rodrigues est dans le système. L'administrateur bascule sur **Badges** pour générer et imprimer le badge.

---

## 4. Génération des badges

### 4.1 Accès

Menu latéral → **Badges**

### 4.2 Comment fonctionne un badge AUTH-BADGE CM14

Chaque badge embarque un **QR Code signé cryptographiquement** (ECDSA P-256). La signature garantit qu'un badge ne peut pas être falsifié. Les agents mobiles vérifient cette signature à chaque scan — en ligne comme hors ligne.

```
  Contenu du QR Code (JSON signé)
  ┌──────────────────────────────────────────┐
  │  {                                       │
  │    "id":         "P-002",               │
  │    "nom":        "Nakamura",            │
  │    "prenom":     "Yuki",               │
  │    "delegation": "Japon",              │
  │    "categorie":  "DEL",               │
  │    "zones":      ["Z1","Z2","Z3","Z4"],│
  │    "exp":        "2026-03-28",         │
  │    "sig":        "MEYCIQDx..."         │
  │  }                                       │
  └──────────────────────────────────────────┘
```

### 4.3 Générer un badge QR Code

1. Sur la page **Badges**, retrouver le participant dans la liste (recherche ou scroll)
2. Cliquer sur le participant pour ouvrir le formulaire de badge
3. Vérifier les informations pré-remplies (nom, catégorie, zones, date d'expiration)
4. Cliquer sur **"Générer le badge"**
5. Le QR Code apparaît instantanément dans le panneau de droite

> Le QR Code est signé côté client au moment de la génération. La signature utilise la clé privée ECDSA stockée dans le navigateur. Ne jamais générer de badge sur un poste de travail non sécurisé.

### 4.4 Télécharger le badge en PNG

1. Une fois le QR Code généré (étape 4.3 complète), cliquer sur **"Télécharger PNG"**
2. Le fichier se télécharge sous le nom `badge_P-002_Nakamura.png` (format automatique)
3. Imprimer le fichier PNG sur le support badge prévu (carte plastifiée A7)

**Format du fichier PNG généré :**

```
  Badge CM14 — format vertical
  ┌─────────────────────────────┐  Dimensions : 840 × 1 320 px
  │  █████ CM14 ████████████   │  (résolution 2× pour impression nette)
  │  ─── DÉLÉGUÉ ──────────    │
  │          ┌────┐             │
  │          │ YN │ Avatar      │
  │          └────┘             │
  │      Yuki Nakamura          │
  │         Japon               │
  │  [Z1] [Z2] [Z3] [Z4]       │
  │  ┌──────────────────────┐  │
  │  │  ████ QR Code ██████ │  │
  │  │  ██   190 × 190 px   │  │
  │  └──────────────────────┘  │
  │  ID : P-002                 │
  │  AUTH-BADGE CM14 — OMC     │
  └─────────────────────────────┘
```

| Caractéristique | Valeur |
|---|---|
| Dimensions du fichier PNG | 840 × 1 320 pixels |
| Orientation | Verticale |
| Résolution effective | 2× (impression jusqu'à 200 DPI sans perte) |
| Taille d'impression recommandée | 54 × 85 mm (format carte ID-1) |
| Fond | Blanc avec bandeau catégorie coloré |

> Le badge téléchargé depuis la page **Participants** (fiche participant → "Télécharger le badge") utilise le même format que depuis la page **Badges**. Les deux sources produisent un fichier identique.

### 4.5 Procédure d'écriture NFC

Les badges NFC permettent un scan plus rapide à la puce. La procédure d'écriture est réalisée sur le poste d'accréditation équipé d'un encodeur NFC.

```
  POSTE D'ACCRÉDITATION
  ┌───────────────────────────────────────────────────────┐
  │                                                       │
  │   Console admin (navigateur)    Encodeur NFC USB      │
  │   ┌─────────────────────┐       ┌──────────────┐      │
  │   │  Fiche participant  │──────>│  Lecture QR  │      │
  │   │  + QR Code généré   │       │  Code value  │      │
  │   └─────────────────────┘       │  → Écriture  │      │
  │                                 │    sur carte │      │
  │                                 └──────────────┘      │
  └───────────────────────────────────────────────────────┘
```

**Étapes :**

1. Générer le badge QR Code dans la console (section 4.3)
2. Copier la valeur JSON du QR Code affichée dans la console (bouton **"Copier la valeur NFC"**)
3. Ouvrir le logiciel d'encodage NFC fourni avec le matériel
4. Coller la valeur JSON dans le champ "Données à écrire"
5. Placer la carte NFC vierge sur l'encodeur
6. Cliquer sur **"Écrire"** dans le logiciel d'encodage
7. Vérifier le retour du logiciel : `Écriture réussie — ISO 14443/15693`
8. Tester le badge en le scannant avec l'application agent

> Un badge NFC et son QR Code embarquent exactement les mêmes données. Les deux méthodes sont interchangeables sur le terrain.

### 4.6 Scénario concret — badge perdu, remplacement immédiat

> La délégation japonaise signale que Yuki Nakamura a perdu son badge. L'administrateur révoque d'abord le badge perdu (section 7 — propagation < 60 s), puis retourne sur **Badges**, sélectionne Yuki Nakamura, clique **"Générer le badge"** et télécharge le nouveau PNG. Le badge perdu est inutilisable en moins d'une minute. Le nouveau badge est imprimé et remis au délégué.

---

## 5. Gestion des zones et points de contrôle

### 5.1 Accès

Menu latéral → **Zones**

### 5.2 Zones de la conférence

Les zones représentent des espaces physiques avec un niveau de restriction. Le niveau d'accès va de 1 (public) à 5 (ultra-restreint).

| ID | Nom | Description | Niveau |
|---|---|---|:---:|
| Z1 | Accès général | Hall, couloirs, zones communes | 1 |
| Z2 | Salles de conférence | Salles plénières et réunions | 2 |
| Z3 | Zone délégués | Réservée aux délégués officiels | 3 |
| Z4 | Zone restreinte | Accès très limité | 4 |
| Z5 | Zone VIP / Presse | Presse accréditée et VIP | 5 |

### 5.3 Créer une nouvelle zone

1. Cliquer sur **"+ Nouvelle zone"**
2. Remplir le formulaire :
   - **ID de zone** : identifiant court, sans espaces (exemple : `Z6`)
   - **Nom** : libellé affiché aux agents (exemple : `Zone négociation privée`)
   - **Description** : précision sur l'espace physique
   - **Niveau d'accès** : de 1 à 5 (1 = le plus ouvert)
3. Cliquer sur **"Enregistrer"**

> Créer une zone ne l'assigne pas automatiquement à des participants. Aller sur la fiche de chaque participant concerné pour cocher la nouvelle zone.

### 5.4 Modifier ou supprimer une zone

- **Modifier** : cliquer sur l'icône crayon à droite de la zone, mettre à jour les champs, cliquer **"Enregistrer"**
- **Supprimer** : cliquer sur l'icône corbeille — une confirmation est demandée. La suppression est impossible si des participants ont encore cette zone dans leur accréditation

### 5.5 Points de contrôle (terminaux agents)

Un point de contrôle est un terminal physique (téléphone Android) sur lequel un agent est connecté. Chaque point de contrôle est associé à une zone.

```
  Architecture zones / points de contrôle

  Zone Z1 — Accès général
  ├── PC-01 · Entrée Nord   [agent : AG-8824 · Alima Nkemba]   ● actif
  ├── PC-02 · Entrée Est    [agent : AG-0031 · Bruno Essomba]  ● actif
  └── PC-03 · Entrée Sud    [agent : aucun assigné]            ● alerte

  Zone Z2 — Salles de conférence
  └── PC-04 · Salle Plénière [agent : AG-8824]                 ● actif

  Zone Z5 — Zone VIP / Presse
  └── PC-VIP · Accueil VIP   [agent : AG-0031]                 ● actif
```

### 5.6 Assigner un agent à un point de contrôle

Menu latéral → **Gestion des agents** (ou section **Points de contrôle** dans la page Zones)

1. Sélectionner le point de contrôle dans la liste
2. Cliquer sur **"Modifier"**
3. Dans le champ **Agent assigné**, sélectionner le compte agent dans la liste déroulante
4. Cliquer sur **"Enregistrer"**
5. L'agent voit son point de contrôle mis à jour dès la prochaine synchronisation de l'application mobile (< 30 secondes si connexion active)

### 5.7 Scénario concret — ouverture d'une nouvelle salle de négociation

> À J+2, une salle de négociation bilatérale est ouverte pour accueillir 15 délégués. L'administrateur crée la zone `Z6 / Salle bilatérale A / niveau 3`, puis met à jour les 15 fiches participants concernés pour ajouter Z6. L'administrateur crée ensuite le point de contrôle `PC-06 · Salle bilatérale A` rattaché à Z6 et l'assigne à l'agent AG-3310. En moins de 5 minutes, la zone est opérationnelle.

---

## 6. Gestion des comptes agents

### 6.1 Accès

Menu latéral → **Gestion des agents**

### 6.2 Structure d'un compte agent

| Champ | Description | Exemple |
|---|---|---|
| Identifiant de connexion | Utilisé par l'agent pour se connecter | `AG-8824` |
| Nom complet | Nom affiché dans la console | `Alima Nkemba` |
| Rôle | `agent`, `supervisor` ou `admin` | `agent` |
| Zone / point de contrôle | Point d'affectation principal | `Entrée Nord — PC-01` |
| Statut | `EN LIGNE`, `HORS LIGNE` ou `BLOQUÉ` | `EN LIGNE` |
| Secret TOTP | Seed de l'authentification 2FA | Généré automatiquement |

### 6.3 Créer un compte agent

1. Cliquer sur **"+ Nouvel agent"**
2. Remplir le formulaire :
   - **Nom complet**
   - **Identifiant de connexion** (format `AG-XXXX` pour les agents, `SUP-XXXX` pour les superviseurs)
   - **Mot de passe provisoire** (minimum 12 caractères, combinant majuscules, chiffres et caractère spécial — exemple : `Agent@CM14!`)
   - **Rôle** : `agent` ou `supervisor`
   - **Zone / point de contrôle** d'affectation
3. Cliquer sur **"Enregistrer"**
4. Le compte est créé avec statut `HORS LIGNE`

### 6.4 Configurer Google Authenticator (TOTP) pour un agent

Chaque compte agent génère automatiquement un secret TOTP unique. Ce secret est présenté sous forme de QR Code à scanner avec Google Authenticator.

1. Ouvrir la fiche de l'agent
2. Cliquer sur **"Afficher le QR TOTP"**
3. La console affiche un QR Code valable pour une seule session d'affichage

```
  ┌─────────────────────────────────────────┐
  │         TOTP — Alima Nkemba             │
  │         Identifiant : AG-8824           │
  │                                         │
  │   ████████████████████████████          │
  │   ██  ██  ████ ██ ████████  ██          │
  │   ██ █████   ████   █████ ████          │
  │   ████████████████████████████          │
  │                                         │
  │   Scanner ce QR Code avec               │
  │   Google Authenticator                  │
  │                                         │
  │   Secret manuel : JBSWY3DPEHPK3PXP     │
  └─────────────────────────────────────────┘
```

4. L'agent ouvre Google Authenticator sur son téléphone
5. L'agent appuie sur **"+"** puis **"Scanner un QR code"**
6. L'agent scanne le QR Code affiché sur l'écran de la console
7. L'entrée **"AUTH-BADGE CM14"** apparaît dans Authenticator avec un code à 6 chiffres
8. Fermer la fenêtre TOTP dans la console — le QR Code ne peut pas être ré-affiché (pour des raisons de sécurité). En cas de perte, régénérer un nouveau secret (voir 6.5)

> Ne jamais photographier le QR Code TOTP. Procéder à la configuration en présence physique de l'agent uniquement.

### 6.5 Bloquer un compte agent

Bloquer un compte empêche immédiatement toute nouvelle connexion. Les scans en cours sur le terminal actif ne sont pas interrompus — l'agent est déconnecté à la prochaine action nécessitant une authentification (expiration du token JWT).

1. Cliquer sur l'agent dans la liste
2. Cliquer sur **"Bloquer"**
3. Confirmer dans la boîte de dialogue
4. Le statut passe à `BLOQUÉ` (voyant rouge)

### 6.6 Débloquer un compte agent

1. Cliquer sur l'agent bloqué dans la liste
2. Cliquer sur **"Débloquer"**
3. Confirmer dans la boîte de dialogue
4. Le statut repasse à `HORS LIGNE` — l'agent peut se reconnecter

### 6.7 Scénario concret — agent qui perd son téléphone

> L'agent Bruno Essomba (AG-0031) signale la perte de son téléphone à 11h22. L'administrateur bloque immédiatement le compte AG-0031 (section 6.5) pour empêcher toute utilisation frauduleuse. L'administrateur décommissionne ensuite le terminal depuis la Console de supervision (section 8.4) pour forcer la déconnexion. Un téléphone de remplacement est remis à Bruno Essomba. L'administrateur débloque le compte AG-0031, remet le téléphone en service, et régénère le QR TOTP si nécessaire.

---

## 7. Révocation d'un badge

### 7.1 Qu'est-ce que la révocation

Révoquer un badge change le statut du participant de `actif` à `révoqué`. En moins de **60 secondes**, tous les terminaux actifs reçoivent l'information via Socket.io et signaleront le badge en **rouge** à chaque scan. Les terminaux en mode hors ligne intègreront la révocation à la prochaine synchronisation (maximum 30 minutes).

```
  Flux de révocation

  Console admin ──────────────────────────────────────────────> Serveur
  [Clic "Révoquer"]    PATCH /api/participants/P-006            backend
                       { statut: "révoqué" }
                                    │
                                    ├──> Base de données mise à jour
                                    │
                                    └──> Socket.io  broadcast
                                         événement : badge:revoked
                                              │
                                 ┌───────────┴───────────┐
                              PC-01                    PC-02   …  PC-VIP
                           Reçu en < 60s           Reçu en < 60s
```

### 7.2 Procédure de révocation (depuis la page Participants)

1. Menu latéral → **Participants**
2. Rechercher le participant par nom ou identifiant
3. Cliquer sur la ligne du participant pour ouvrir le panneau de détail
4. Cliquer sur le bouton rouge **"Révoquer le badge"**
5. Lire le message de confirmation : *"Révoquer le badge de [Nom Prénom] ? Cette action est immédiate et irréversible sans re-génération de badge."*
6. Cliquer sur **"Confirmer la révocation"**
7. Le statut du participant passe à `révoqué` (badge rouge dans la liste)
8. Sur la Console de supervision, le participant apparaît dans la liste **Badges révoqués** dans les secondes qui suivent

### 7.3 Révocation rapide depuis la Console de supervision

En situation d'urgence, la révocation peut être effectuée directement depuis la Console de supervision sans naviguer vers la liste des participants.

1. Menu latéral → **Console de supervision**
2. Dans le panneau **"Actions critiques"**, repérer le champ **"Révocation rapide"**
3. Saisir l'identifiant du participant (format `P-006`) dans le champ texte
4. Cliquer sur **"Révoquer"**
5. La révocation est appliquée immédiatement

> La révocation rapide ne demande pas de confirmation. Vérifier l'identifiant avant de cliquer.

### 7.4 Vérifier que la révocation a bien été propagée

- Dans les **Journaux d'accès** (section 9), filtrer sur le résultat `révoqué` et vérifier que les scans suivants du badge concerné affichent bien ce résultat
- La Console de supervision liste les badges révoqués actifs dans le panneau latéral droit
- Un scan d'un badge révoqué sur n'importe quel terminal retourne une réponse rouge en moins de 2 secondes si le terminal est en ligne

### 7.5 Scénario concret — détection d'un badge falsifié

> À 14h30, l'agent PC-02 (Entrée Est) signale qu'une personne présente un badge dont la photo ne correspond pas au porteur. Le superviseur contacte l'administrateur. L'administrateur ouvre **Participants**, identifie le badge suspect (identifiant communiqué par l'agent), clique **"Révoquer le badge"** et confirme. En moins de 30 secondes, le badge s'affiche rouge sur tous les terminaux. L'agent retient le badge et attend les forces de sécurité.

---

## 8. Console de supervision

### 8.1 Accès

Menu latéral → **Console de supervision** (intitulée *War Room* dans l'interface)

### 8.2 Vue d'ensemble

La console est la page de commandement en temps réel. Elle centralise le flux d'événements, le statut des terminaux, les actions critiques et la liste des badges révoqués.

```
  ┌──────────────────────────────────────────────────────────────────────┐
  │  CONSOLE DE SUPERVISION — War Room           ● SYSTÈME ACTIF  09:47 │
  ├──────────────────────────────────────────────────────────────────────┤
  │  [247 scans] [94% autorisés] [4 alertes] [5 terminaux actifs]        │
  ├──────────────────────┬───────────────────────────────────────────────┤
  │  FLUX EN DIRECT      │  POINTS DE CONTRÔLE                           │
  │  ──────────────────  │  PC-01 · Entrée Nord    ●  actif   47 scans  │
  │  Emmanuel Kofi Asante│  PC-02 · Entrée Est     ●  actif   31 scans  │
  │  Zone Z1 · AUTORISÉ  │  PC-03 · Entrée Sud     ●  alerte  12 scans  │
  │  Yuki Nakamura       │  PC-04 · Salle Plénière ●  actif   28 scans  │
  │  Zone Z2 · AUTORISÉ  │  PC-VIP · Accueil VIP   ●  actif    9 scans  │
  │  Chidera Okonkwo     │                                               │
  │  Zone Z1 · RÉVOQUÉ   │  ACTIONS CRITIQUES                           │
  │  ...                 │  [ ALERTE D'URGENCE ]                         │
  │                      │  Révocation rapide : [ P-006 ] [Révoquer]     │
  │                      │  [ Décommissionner terminal ]                 │
  │                      │  [ Exporter les journaux ]                    │
  └──────────────────────┴───────────────────────────────────────────────┘
```

### 8.3 Envoyer une alerte broadcast

Une alerte broadcast envoie instantanément un message d'urgence sur **tous les terminaux agents actifs** simultanément. L'alerte s'affiche en superposition sur l'application agent, avec son, vibration et obligation de confirmer réception.

**Procédure :**

1. Ouvrir la Console de supervision
2. Dans le panneau **"Actions critiques"**, cliquer sur le bouton rouge **"ALERTE D'URGENCE"**
3. Un bandeau rouge apparaît sur la Console confirmant l'envoi : *"Alerte d'urgence — Tous les terminaux ont été notifiés"*
4. Sur chaque terminal agent, le message s'affiche immédiatement (Socket.io, délai < 1 seconde)
5. Chaque agent doit appuyer sur **"Confirmer réception"** sur son terminal
6. Pour désactiver le bandeau d'alerte côté console, cliquer sur **"Désactiver"**

> L'alerte broadcast n'est pas un moyen de communication textuelle personnalisée. L'alerte signifie "sécurité maximale activée". Pour des instructions précises, utiliser la radio.

### 8.4 Décommissionner un terminal

Décommissionner un terminal le verrouille à distance. L'application agent affiche un écran de verrouillage et ne permet plus aucun scan. L'opération est irréversible sans intervention de l'administrateur.

**Procédure :**

1. Dans la Console de supervision, cliquer sur **"Décommissionner terminal"**
2. La console renvoie vers la page **Gestion des agents → Points de contrôle**
3. Sélectionner le terminal à décommissionner dans la liste
4. Cliquer sur **"Décommissionner"**
5. Confirmer dans la boîte de dialogue
6. Le terminal reçoit l'ordre de verrouillage via Socket.io
7. Le statut du terminal passe à `inactif` (voyant gris) dans la console

**Cas d'usage :** perte ou vol d'un terminal, soupçon de compromission, fin de mission d'un agent.

### 8.5 Scénario concret — alerte d'intrusion

> À 16h05, la sécurité périmétrique signale une tentative d'intrusion par l'entrée nord. L'administrateur clique immédiatement sur **"ALERTE D'URGENCE"** dans la Console. En moins d'une seconde, tous les agents reçoivent l'alerte sur leur terminal et savent qu'une situation d'urgence est en cours. L'administrateur communique simultanément par radio avec le superviseur de terrain pour coordonner la réponse. Une fois la situation résolue, l'administrateur clique sur **"Désactiver"** pour fermer le bandeau d'alerte.

---

## 9. Journaux d'accès

### 9.1 Accès

Menu latéral → **Journaux d'accès** (libellé *Historique des passages* dans l'interface)

### 9.2 Colonnes du journal

| Colonne | Description |
|---|---|
| Horodatage | Date et heure exacte du scan (format ISO 8601) |
| Participant | Nom et prénom du porteur du badge |
| Délégation | Pays ou organisation d'appartenance |
| Catégorie | Code d'accréditation (`DEL`, `PRESS`…) |
| Zone | Zone dans laquelle le scan a eu lieu |
| Point de contrôle | Terminal ayant effectué le scan (ex. `PC-01`) |
| Résultat | `autorisé`, `zone-refusée`, `révoqué` ou `inconnu` |
| Agent | Identifiant de l'agent ayant scanné |

### 9.3 Filtrer les journaux

Trois filtres sont disponibles en combinaison :

| Filtre | Valeurs possibles |
|---|---|
| Recherche texte | Nom, délégation ou zone (recherche partielle) |
| Résultat | Tous / autorisé / révoqué / zone-refusée / inconnu |
| Zone | Toutes / Entrée Nord / Entrée Est / Entrée Sud / Accueil VIP / Salle Plénière |

L'ordre de tri (du plus récent au plus ancien, ou l'inverse) se bascule en cliquant sur l'en-tête de la colonne **Horodatage**.

**Exemple — retrouver tous les scans refusés à l'Entrée Nord depuis ce matin :**

```
  [ Recherche : vide ] [ Résultat : révoqué ▼ ] [ Zone : Entrée Nord ▼ ]
  → Résultat : 2 événements filtrés sur 247
```

### 9.4 Exporter en CSV

1. Appliquer les filtres souhaités (ou aucun filtre pour tout exporter)
2. Cliquer sur **"Exporter CSV"** en haut à droite
3. Le fichier se télécharge sous le nom `cm14_passages_[timestamp].csv`
4. Le CSV contient les colonnes : ID, Nom, Délégation, Catégorie, Zone, Point de contrôle, Résultat, Agent, Horodatage

**Exemple de fichier exporté :**

```csv
ID,Nom,Délégation,Catégorie,Zone,Point de contrôle,Résultat,Agent,Horodatage
L-001,Emmanuel Kofi Asante,Ghana,DEL,Entrée Nord,PC-01,autorisé,AG-8824,2026-03-22T09:12:44Z
L-003,Chidera Okonkwo,Nigeria,DEL,Entrée Est,PC-02,révoqué,AG-0031,2026-03-22T08:59:07Z
```

### 9.5 Export JSON (via API)

Pour les intégrations avec les systèmes de sécurité de l'OMC, les journaux sont également disponibles en JSON via l'API :

```
GET /api/scans?limit=500&statut=révoqué
Authorization: Bearer <access_token>
```

Le format JSON respecte la même structure que le CSV. Consulter la documentation API (`docs/api.md`) pour les paramètres de pagination et de filtrage avancé.

### 9.6 Conservation des journaux

Les journaux sont immuables et conservés **5 ans après la clôture de la conférence**, conformément aux exigences du cahier des charges sécuritaire OMC. Il est impossible de supprimer un enregistrement depuis la console.

---

## 10. Procédures d'urgence

Cette section décrit les trois scénarios critiques les plus probables pendant la conférence. Pour chaque scénario, les étapes sont listées dans l'ordre chronologique avec le responsable de chaque action.

---

### 10.1 Badge perdu

**Contexte :** un participant signale la perte de son badge à un agent ou au bureau d'accréditation.

```
  Badge perdu — Arbre de décision

  Participant signale la perte
           │
           v
  L'administrateur RÉVOQUE immédiatement le badge perdu (< 60 s de propagation)
           │
           v
  Le badge perdu devient ROUGE sur tous les terminaux
           │
           v
  L'administrateur GÉNÈRE un nouveau badge pour le même participant
           │
           v
  Le nouveau badge est imprimé et remis au participant
           │
           v
  L'événement est consigné dans les journaux — aucune action supplémentaire
```

**Étapes détaillées :**

| # | Action | Qui | Où |
|---|---|---|---|
| 1 | Demander à l'agent ou au bureau d'accréditation l'identifiant du participant | Administrateur | Par radio ou téléphone |
| 2 | Révoquer le badge (section 7.2 ou 7.3) | Administrateur | Console → Participants ou Console de supervision |
| 3 | Confirmer la révocation (statut `révoqué` visible dans la liste) | Administrateur | Console |
| 4 | Générer un nouveau badge (section 4.3) | Administrateur | Console → Badges |
| 5 | Télécharger le PNG et imprimer le nouveau badge | Administrateur | Console → Badges |
| 6 | Remettre le nouveau badge au participant avec vérification d'identité | Agent accréditation | Bureau d'accréditation |

**Temps total estimé :** moins de 5 minutes.

---

### 10.2 Usurpation d'identité suspectée

**Contexte :** un agent ou superviseur soupçonne qu'une personne utilise le badge d'une autre personne (photo non concordante, comportement suspect).

```
  Usurpation suspectée — Chaîne d'action

  Agent détecte l'anomalie
       │
       v
  Agent retient la personne et appelle le superviseur par radio
       │
       v
  Superviseur contacte l'administrateur
       │
       v
  Administrateur identifie le badge dans le système
       │
       ├─── Badge déjà révoqué ? ──> Confirmer à l'agent : porteur non autorisé
       │
       └─── Badge actif ? ──> Administrateur RÉVOQUE le badge immédiatement
                                    │
                                    v
                          Sécurité physique prend en charge la personne
                                    │
                                    v
                          Administrateur consigne l'incident dans les journaux
```

**Étapes détaillées :**

| # | Action | Qui | Où |
|---|---|---|---|
| 1 | Retenir calmement la personne, ne pas provoquer | Agent | Point de contrôle |
| 2 | Appeler le superviseur par radio avec l'identifiant du badge | Agent | Radio |
| 3 | Vérifier le statut du badge dans le système | Administrateur | Console → Participants |
| 4 | Si le badge est actif : révoquer immédiatement (section 7) | Administrateur | Console |
| 5 | Envoyer la sécurité physique vers le point de contrôle | Superviseur | Radio |
| 6 | Exporter les journaux d'accès du badge suspect (section 9) pour documenter les tentatives d'entrée | Administrateur | Console → Journaux |
| 7 | Rédiger un rapport d'incident pour les forces de sécurité | Superviseur/Administrateur | Hors console |

**Important :** ne jamais confronter seul une personne suspectée d'usurpation. Attendre les forces de sécurité.

---

### 10.3 Panne système (serveur ou réseau)

**Contexte :** le tableau de bord ne se rafraîchit plus, le statut de connexion Socket.io passe à "Reconnexion…", ou la console ne répond plus.

```
  Diagnostic — Arbre de décision panne

  Console ne répond plus
          │
          v
  Recharger la page dans le navigateur
          │
     ┌────┴────┐
  Fonctionne  Toujours en panne
          │         │
          v         v
  Reprise   Vérifier la connexion réseau du poste admin
  normale           │
               ┌────┴────┐
            Réseau OK   Réseau KO
                │           │
                v           v
         Contacter     Appeler le
         l'équipe      responsable
         technique     réseau
         CM14
```

**Étapes en cas de panne confirmée :**

| # | Action | Qui | Impact terrain |
|---|---|---|---|
| 1 | Notifier le responsable technique CM14 immédiatement | Administrateur | — |
| 2 | Informer tous les agents via radio : "mode hors ligne activé" | Superviseur | Les terminaux continuent à fonctionner jusqu'à 4 heures sur leur cache local |
| 3 | Renforcer la vérification visuelle des badges sur tous les points de contrôle | Superviseur | Instructions aux agents par radio |
| 4 | Suspendre les révocations jusqu'au rétablissement du service (révocations non propagées en hors ligne immédiat) | Administrateur | Tenir un registre papier des révocations urgentes |
| 5 | Une fois le serveur rétabli, appliquer les révocations en attente et vérifier la synchronisation des terminaux | Administrateur | Console → Participants |
| 6 | Exporter les journaux complets dès le rétablissement pour documenter la fenêtre de panne | Administrateur | Console → Journaux |

**Fonctionnement des terminaux en mode hors ligne :**

- Les agents peuvent scanner normalement jusqu'à **4 heures** après la dernière synchronisation
- Les révocations effectuées après la panne **ne sont pas propagées** aux terminaux hors ligne
- Les terminaux hors ligne continuent à enregistrer les scans localement — ces scans sont synchronisés automatiquement dès le rétablissement

**Contact technique :**

En cas de panne, contacter le responsable technique CM14 par le canal de communication d'urgence prévu au plan de continuité d'activité.

---

## Référence rapide — Raccourcis de navigation

```
  ┌────────────────────────────────────────────────────────────────────────┐
  │           AUTH-BADGE CM14 — GUIDE ADMIN — RAPPEL RAPIDE               │
  ├─────────────────────────┬──────────────────────────────────────────────┤
  │  Urgence                │  Action                                      │
  ├─────────────────────────┼──────────────────────────────────────────────┤
  │  Badge perdu/volé       │  Participants → Révoquer → Badges → Générer  │
  │  Usurpation             │  Participants → Révoquer + appel sécurité    │
  │  Panne système          │  Radio agents + responsable technique        │
  │  Alerte broadcast       │  Console de supervision → Alerte d'urgence   │
  │  Terminal compromis     │  Console → Décommissionner + bloquer agent   │
  ├─────────────────────────┼──────────────────────────────────────────────┤
  │  Propagation révocation │  < 60 secondes (terminaux en ligne)          │
  │  Mode hors ligne agents │  Jusqu'à 4 heures sur cache local            │
  │  Timeout session admin  │  15 minutes d'inactivité                     │
  │  Blocage compte         │  Après 5 tentatives de connexion échouées    │
  └─────────────────────────┴──────────────────────────────────────────────┘
```

---

*Document interne — Conférence OMC CM14 · Yaoundé 2026*
*Diffusion réservée aux administrateurs et superviseurs accrédités*
*Conserver ce document en lieu sûr — ne pas laisser sans surveillance*
