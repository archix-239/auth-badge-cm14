# Guide Agent — AUTH-BADGE CM14

**Conférence OMC CM14 · Yaoundé · ~4 000 participants**
**Version 1.0 — Mars 2026**

---

> **Objectif de ce guide :** À la fin de la lecture, chaque agent sait installer l'application, se connecter, scanner un badge, interpréter le résultat en moins de 3 secondes et gérer une urgence — même sans connexion internet.

---

## Sommaire

1. [Introduction — Le rôle de l'agent CM14](#1-introduction)
2. [Première connexion](#2-première-connexion)
3. [Scanner un badge](#3-scanner-un-badge)
4. [Comprendre les résultats](#4-comprendre-les-résultats)
5. [Mode hors ligne](#5-mode-hors-ligne)
6. [Alertes reçues](#6-alertes-reçues)
7. [Historique et statistiques](#7-historique-et-statistiques)
8. [Problèmes fréquents](#8-problèmes-fréquents)

---

## 1. Introduction

Bienvenue dans l'équipe de sécurité CM14.

L'application AUTH-BADGE est l'outil principal de contrôle d'accès pendant toute la conférence. Chaque agent porte un téléphone Android avec l'application installée. Le travail de l'agent est simple : scanner le badge d'un participant et agir en fonction de la couleur affichée.

**Ce que fait l'application :**

- Vérifie en temps réel si un badge est valide pour une zone donnée
- Fonctionne même sans connexion internet (jusqu'à 4 heures)
- Envoie des alertes de sécurité en direct sur l'écran de l'agent
- Garde un historique complet de tous les scans effectués

**Ce que fait l'agent :**

- Contrôle les badges à l'entrée de chaque zone
- Réagit immédiatement selon la couleur affichée
- Signale toute anomalie au superviseur

```
  AGENT                    APPLICATION             SERVEUR CENTRAL
    |                           |                        |
    |--- Scan du badge -------->|                        |
    |                           |--- Vérification ------>|
    |                           |<-- Résultat -----------|
    |<-- Couleur + Vibration ---|                        |
    |                           |                        |
    |--- Décision d'accès       |                        |
```

---

## 2. Première connexion

### 2.1 Installer l'application

L'application AUTH-BADGE n'est pas disponible sur le Play Store. L'agent reçoit un fichier APK à installer manuellement.

**Étapes d'installation :**

1. Ouvrir les **Paramètres** du téléphone Android
2. Aller dans **Sécurité** (ou **Applications**) puis activer **"Sources inconnues"** (ou **"Installer des applications inconnues"**)
3. Ouvrir le fichier `authbadge-cm14.apk` reçu par l'équipe technique
4. Appuyer sur **Installer**
5. Attendre la fin de l'installation — l'icône AUTH-BADGE apparaît sur l'écran d'accueil
6. Désactiver à nouveau les sources inconnues dans les paramètres (bonne pratique de sécurité)

> **Important :** Ne jamais installer un APK reçu par WhatsApp ou email d'un inconnu. Récupérer l'APK uniquement auprès du responsable technique CM14.

---

### 2.2 Se connecter (authentification 2FA)

L'application utilise une connexion en deux étapes pour protéger l'accès aux données des participants.

**Étape 1 — Identifiants**

1. Ouvrir l'application AUTH-BADGE
2. Saisir l'**identifiant** fourni par le superviseur (exemple : `agent_nord_01`)
3. Saisir le **mot de passe** fourni par le superviseur
4. Appuyer sur **Connexion**

**Étape 2 — Code TOTP (Google Authenticator)**

5. Ouvrir l'application **Google Authenticator** sur le même téléphone
6. Trouver l'entrée **"AUTH-BADGE CM14"** dans la liste
7. Lire le code à **6 chiffres** affiché — ce code change toutes les 30 secondes
8. Saisir ce code dans AUTH-BADGE dans le champ **"Code de vérification"**
9. Appuyer sur **Valider**

```
  Google Authenticator
  ┌─────────────────────────┐
  │  AUTH-BADGE CM14        │
  │  [ 4 8 7 2 1 3 ]        │  <- Saisir ce code
  │  ████████░░  (22 sec)   │  <- Temps restant
  └─────────────────────────┘
```

> **Astuce :** Si le code expire pendant la saisie, attendre le prochain code (30 secondes maximum). Ne pas paniquer.

---

### 2.3 Configurer Google Authenticator (premier usage)

Si Google Authenticator n'est pas encore configuré pour AUTH-BADGE CM14 :

1. Ouvrir **Google Authenticator** sur le téléphone
2. Appuyer sur le **"+"** en bas à droite
3. Choisir **"Scanner un QR code"**
4. Scanner le QR code fourni par le responsable technique CM14
5. L'entrée **"AUTH-BADGE CM14"** apparaît dans Authenticator avec un code à 6 chiffres
6. La configuration est terminée

> **Attention :** Chaque agent a son propre QR code de configuration. Ne pas partager ce QR code avec quelqu'un d'autre.

---

## 3. Scanner un badge

Un badge peut être scanné de trois façons. Choisir la méthode selon la situation.

```
  ┌─────────────────────────────────────────────────┐
  │             3 MÉTHODES DE SCAN                  │
  ├──────────────┬──────────────┬───────────────────┤
  │  QR CODE     │     NFC      │  SAISIE MANUELLE  │
  │  (caméra)    │  (contact)   │   (clavier)       │
  │              │              │                   │
  │  Rapide,     │  Très rapide │  Badge abîmé ou   │
  │  standard    │  puce NFC    │  NFC/QR illisible  │
  └──────────────┴──────────────┴───────────────────┘
```

---

### 3.1 Scanner par QR Code (méthode principale)

1. Depuis l'écran principal, appuyer sur **"Scanner QR Code"**
2. Pointer la caméra vers le QR Code du badge du participant
3. Maintenir le téléphone stable à environ **15–20 cm** du badge
4. L'application détecte automatiquement le QR Code — pas besoin d'appuyer
5. Le résultat s'affiche immédiatement à l'écran avec une couleur et une vibration

> Si le scan échoue après 5 secondes, nettoyer la caméra avec un chiffon propre ou passer en saisie manuelle.

---

### 3.2 Scanner par NFC (badges à puce)

1. Depuis l'écran principal, appuyer sur **"Scanner NFC"**
2. Approcher l'arrière du téléphone du badge du participant
3. Placer le badge **au centre de l'arrière du téléphone**, là où se trouve l'antenne NFC
4. Maintenir le contact pendant **1 à 2 secondes**
5. Le résultat s'affiche immédiatement

```
  Vue de dos du téléphone

  ┌───────────────┐
  │               │
  │  ┌─────────┐  │
  │  │  Zone   │  │  <- Placer le badge ici
  │  │   NFC   │  │
  │  └─────────┘  │
  │               │
  └───────────────┘
```

> **Remarque :** Si le NFC ne fonctionne pas, vérifier que la fonction NFC est activée dans les paramètres Android du téléphone.

---

### 3.3 Saisie manuelle du numéro de badge

Utiliser cette méthode quand le QR Code est illisible (badge abîmé, sale ou plastifié).

1. Depuis l'écran principal, appuyer sur **"Saisie manuelle"**
2. Saisir le **numéro de badge** inscrit au dos du badge (exemple : `CM14-00847`)
3. Vérifier le numéro saisi — une erreur de frappe donne un résultat incorrect
4. Appuyer sur **"Valider"**
5. Le résultat s'affiche à l'écran

> La saisie manuelle est plus lente. En cas de longue file d'attente, signaler le problème au superviseur pour obtenir un remplacement de badge.

---

## 4. Comprendre les résultats

Après chaque scan, l'écran affiche une couleur et le téléphone vibre. L'agent dispose de **moins de 3 secondes** pour prendre une décision.

### 4.1 Tableau des couleurs

| Couleur | Signification | Vibration | Action de l'agent |
|---------|--------------|-----------|-------------------|
| **VERT** | Badge valide — accès autorisé pour cette zone | Court (1 bip) | Laisser passer le participant |
| **ORANGE** | Badge valide — mais zone refusée pour ce badge | Long (1 bip long) | Refuser poliment l'accès, rediriger vers la bonne zone |
| **ROUGE** | Badge révoqué — accès refusé | Long (1 bip long) | Refuser l'accès, retenir le badge, appeler le superviseur |
| **VIOLET** | Badge inconnu — non enregistré dans le système | Long (1 bip long) | Refuser l'accès, demander une pièce d'identité, appeler le superviseur |

---

### 4.2 Schéma de décision rapide

```
  Scan du badge
       |
       v
  ┌─────────┐      VERT ?  ──────────────> Laisser passer
  │ Couleur │
  │affichée │      ORANGE ? ─────────────> Refuser + rediriger
  └─────────┘
       |           ROUGE ?  ─────────────> Refuser + retenir + superviseur
       |
       └─────────  VIOLET ? ─────────────> Refuser + vérifier identité + superviseur
```

---

### 4.3 Exemples concrets

**Exemple 1 — Résultat VERT**

> Un délégué présente son badge à l'entrée de la salle plénière. L'agent scanne le badge. L'écran devient **vert**, le téléphone vibre **une fois brièvement**. L'agent dit : *"Bonne journée, vous pouvez entrer."*

**Exemple 2 — Résultat ORANGE**

> Un stagiaire accrédité pour le hall principal essaie d'entrer dans la salle VIP. L'agent scanne le badge. L'écran devient **orange**, le téléphone émet une **longue vibration**. L'agent lit le message affiché : *"Zone VIP — accès non autorisé."* L'agent répond : *"Votre badge ne donne pas accès à cette zone. Je vous accompagne vers le hall principal."*

**Exemple 3 — Résultat ROUGE**

> Une personne présente un badge à l'entrée. L'écran devient **rouge**. L'agent retient calmement le badge et appelle immédiatement le superviseur via radio. L'agent ne donne pas d'explication au participant — c'est le rôle du superviseur.

**Exemple 4 — Résultat VIOLET**

> Une personne présente un badge qui n'est pas reconnu par le système. L'écran devient **violet**. L'agent demande une pièce d'identité officielle et appelle le superviseur. Il est possible que le badge n'ait pas encore été enregistré dans le système.

---

## 5. Mode hors ligne

### 5.1 Comment savoir si l'application est hors ligne

Quand le téléphone perd la connexion internet, un **indicateur orange** apparaît en haut de l'écran :

```
  ┌─────────────────────────────────────────┐
  │  ⚠  MODE HORS LIGNE — Synchro dans 47mn │  <- Bandeau orange
  ├─────────────────────────────────────────┤
  │                                         │
  │           AUTH-BADGE CM14               │
  │                                         │
  │  [  Scanner QR Code  ]                  │
  │  [  Scanner NFC      ]                  │
  │  [  Saisie manuelle  ]                  │
  └─────────────────────────────────────────┘
```

### 5.2 Ce qui change en mode hors ligne

| Fonctionnalité | En ligne | Hors ligne |
|----------------|----------|------------|
| Scanner les badges | Oui | Oui (jusqu'à 4h) |
| Résultats en temps réel | Oui | Non — données locales du dernier sync |
| Alertes de sécurité | Oui | Non |
| Historique des scans | Synchronisé | Enregistré localement |
| Statistiques | Temps réel | Figées |

### 5.3 Que faire en mode hors ligne

L'application fonctionne normalement en mode hors ligne pendant **jusqu'à 4 heures** grâce aux données mises en cache lors de la dernière synchronisation.

1. **Continuer à scanner** normalement — les résultats restent fiables pour les 4 premières heures
2. **Signaler la perte de connexion** au superviseur dès que le bandeau orange apparaît
3. **Ne pas éteindre l'application** — redémarrer l'application efface le cache local
4. Si le mode hors ligne dépasse **4 heures**, arrêter les scans et attendre les instructions du superviseur
5. Dès que la connexion revient, l'application se synchronise automatiquement — le bandeau orange disparaît

> **Important :** En mode hors ligne, les révocations de badges effectuées après la dernière synchronisation ne sont pas prises en compte. En cas de doute sur un badge rouge ou violet, toujours appeler le superviseur.

---

## 6. Alertes reçues

Le superviseur ou le centre de commandement peut envoyer des alertes directement sur l'écran de l'agent. Ces alertes apparaissent en superposition sur l'application, même pendant un scan.

### 6.1 Alerte générale (broadcast)

Une alerte générale s'affiche sur tous les terminaux des agents simultanément.

```
  ┌─────────────────────────────────────────┐
  │  !  ALERTE SÉCURITÉ                     │
  │─────────────────────────────────────────│
  │  Fermeture immédiate de l'entrée Nord.  │
  │  Rediriger tous les participants vers   │
  │  l'entrée principale.                   │
  │                                         │
  │  Envoyée par : Centre de commandement   │
  │  14:32 — 22/03/2026                     │
  │                                         │
  │  [ Confirmer réception ]                │
  └─────────────────────────────────────────┘
```

**Conduite à tenir :**

1. Lire l'alerte entièrement
2. Appuyer sur **"Confirmer réception"** pour accuser réception
3. Appliquer immédiatement les instructions de l'alerte
4. En cas de doute sur une instruction, contacter le superviseur par radio

---

### 6.2 Décommissionnement du terminal

Si le terminal de l'agent est désactivé à distance par le centre de commandement (perte, vol, incident), un message s'affiche :

```
  ┌─────────────────────────────────────────┐
  │  TERMINAL DÉSACTIVÉ                     │
  │─────────────────────────────────────────│
  │  Ce terminal a été désactivé par        │
  │  l'administration CM14.                 │
  │                                         │
  │  Contacter votre superviseur.           │
  └─────────────────────────────────────────┘
```

L'application se verrouille et ne permet plus de scanner. L'agent doit **contacter immédiatement le superviseur** pour recevoir un terminal de remplacement.

> Ce message n'apparaît jamais par accident. Si un terminal est désactivé, c'est une décision volontaire de l'administration.

---

## 7. Historique et statistiques

### 7.1 Consulter l'historique des scans

L'historique permet de retrouver n'importe quel scan effectué pendant le service.

1. Depuis l'écran principal, appuyer sur **"Historique"** (icône horloge)
2. La liste des scans s'affiche du plus récent au plus ancien
3. Chaque ligne indique : heure, numéro de badge, couleur du résultat
4. Appuyer sur une ligne pour voir le détail complet (nom du participant, zone, heure exacte)
5. Pour rechercher un badge précis, utiliser la barre de recherche en haut

```
  HISTORIQUE DU JOUR
  ┌──────────┬──────────────┬────────┐
  │  Heure   │  Badge       │  Résultat │
  ├──────────┼──────────────┼────────┤
  │  14:47   │  CM14-00847  │  VERT  │
  │  14:45   │  CM14-02341  │  ORANGE│
  │  14:43   │  CM14-00012  │  ROUGE │
  │  14:41   │  CM14-09999  │  VERT  │
  └──────────┴──────────────┴────────┘
```

### 7.2 Consulter les statistiques journalières

Les statistiques donnent une vue globale de l'activité de l'agent pour la journée.

1. Depuis l'écran principal, appuyer sur **"Statistiques"** (icône graphique)
2. Les données affichées incluent :
   - Nombre total de scans effectués
   - Répartition par couleur (combien de VERT, ORANGE, ROUGE, VIOLET)
   - Heure du dernier scan
   - Zone(s) couverte(s)

> Les statistiques sont utiles pour les rapports de fin de service. L'agent peut faire une capture d'écran et la transmettre au superviseur.

---

## 8. Problèmes fréquents

| Problème | Cause probable | Solution |
|----------|---------------|----------|
| Le code TOTP est refusé | Le code a expiré avant la saisie | Attendre le prochain code (30 sec max) et ressaisir |
| Le QR Code n'est pas détecté | Lumière insuffisante ou caméra sale | Améliorer l'éclairage, nettoyer la caméra, essayer NFC ou saisie manuelle |
| Le NFC ne répond pas | NFC désactivé sur le téléphone | Aller dans Paramètres → Connexions → NFC et activer |
| L'application se ferme seule | Mémoire insuffisante ou bug | Relancer l'application, ne pas ouvrir d'autres applications en même temps |
| Bandeau orange depuis plus de 2h | Problème réseau persistant | Signaler au superviseur, continuer à scanner avec vigilance renforcée |
| Résultat VIOLET sur un badge valide | Badge non encore synchronisé | Appeler le superviseur, ne pas laisser passer sans autorisation orale |
| Terminal désactivé sans raison apparente | Action administrative ou incident | Contacter le superviseur immédiatement |
| Mot de passe oublié | — | Contacter le responsable technique CM14 — ne pas tenter de se connecter plus de 5 fois |
| L'écran reste noir après le scan | Bug d'affichage | Appuyer sur le bouton d'accueil, relancer AUTH-BADGE |
| Le participant refuse le scan | Situation de terrain | Appeler le superviseur — ne jamais forcer physiquement |

---

## Rappel rapide — Fiche de poche

```
  ┌──────────────────────────────────────────────────┐
  │           AUTH-BADGE CM14 — FICHE RAPIDE         │
  ├────────┬─────────────────┬─────────────────────  │
  │ VERT   │ Accès autorisé  │ Laisser passer        │
  │ ORANGE │ Mauvaise zone   │ Refuser + rediriger   │
  │ ROUGE  │ Badge révoqué   │ Refuser + superviseur │
  │ VIOLET │ Badge inconnu   │ Refuser + superviseur │
  ├────────┴─────────────────┴─────────────────────  │
  │ Hors ligne (bandeau orange) → signaler sup.      │
  │ Alerte → lire, confirmer, appliquer              │
  │ Doute → toujours appeler le superviseur          │
  └──────────────────────────────────────────────────┘
```

---

*Document interne — Conférence OMC CM14 · Yaoundé 2026*
*Diffusion réservée aux agents de sécurité accrédités*
