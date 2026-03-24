# AUTH-BADGE CM14 — Guide de déploiement complet

> **Objectif de ce document** : Après lecture, l'opérateur est capable de déployer le système AUTH-BADGE CM14 de zéro — serveur, backend, frontend, application Android — et de maintenir ce système opérationnel pendant toute la durée de la 14e Conférence Ministérielle de l'OMC (CM14).

> **Public cible** : Technicien ou administrateur système responsable du déploiement sur site. Aucune connaissance préalable du projet n'est requise.

---

## Vue d'ensemble de l'architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        RÉSEAU CM14-STAFF                        │
│                                                                 │
│  ┌──────────────┐    WiFi     ┌───────────────────────────────┐ │
│  │ Smartphones  │ ◄────────── │       Mini-PC serveur         │ │
│  │ agents (APK) │             │                               │ │
│  └──────────────┘             │  Nginx :443 (HTTPS/TLS 1.3)  │ │
│                               │    ├── /          → dist/     │ │
│  ┌──────────────┐    WiFi     │    ├── /api       → :3001     │ │
│  │  PC admin    │ ◄────────── │    └── /socket.io → :3001     │ │
│  │ (navigateur) │             │                               │ │
│  └──────────────┘             │  PM2 → Node.js :3001          │ │
│                               │  PostgreSQL 17 :5432          │ │
│                               │  Redis 7 :6379                │ │
│                               └───────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

Le backend Node.js détecte automatiquement la présence des fichiers `backend/certs/cert.pem` et `backend/certs/key.pem` :
- Fichiers présents → le backend démarre en **HTTPS**
- Fichiers absents → le backend démarre en **HTTP** (Nginx gère alors le TLS en frontal)

---

## Sommaire

- [Partie 1 — Préparation (avant l'événement)](#partie-1--préparation-avant-lévénement)
  - [1.1 Prérequis matériels](#11-prérequis-matériels)
  - [1.2 Installation du serveur Ubuntu 22](#12-installation-du-serveur-ubuntu-22)
  - [1.3 Déploiement du backend](#13-déploiement-du-backend)
  - [1.4 Déploiement du frontend](#14-déploiement-du-frontend)
  - [1.5 Configuration Nginx](#15-configuration-nginx)
  - [1.6 Certificat TLS et Certificate Pinning](#16-certificat-tls-et-certificate-pinning)
  - [1.7 Build et distribution APK release](#17-build-et-distribution-apk-release)
  - [1.8 Checklist pré-événement](#18-checklist-pré-événement)
- [Partie 2 — Jour J](#partie-2--jour-j)
  - [2.1 Démarrage du système (ordre exact)](#21-démarrage-du-système-ordre-exact)
  - [2.2 Commandes de surveillance](#22-commandes-de-surveillance)
- [Partie 3 — Mise à jour en cours d'événement](#partie-3--mise-à-jour-en-cours-dévénement)
  - [3.1 Publier une nouvelle version APK](#31-publier-une-nouvelle-version-apk)
  - [3.2 Redémarrer le backend sans interruption](#32-redémarrer-le-backend-sans-interruption)
- [Partie 4 — Après l'événement](#partie-4--après-lévénement)
  - [4.1 Export des journaux](#41-export-des-journaux)
  - [4.2 Arrêt du système](#42-arrêt-du-système)

---

## Partie 1 — Préparation (avant l'événement)

### 1.1 Prérequis matériels

Vérifier que le matériel ci-dessous est disponible et testé **avant le jour J**.

#### Serveur central

| Composant | Spécification minimale | Recommandé |
|---|---|---|
| Unité centrale | Mini-PC x86_64 | Intel NUC ou équivalent |
| OS | Ubuntu 22.04 LTS (64 bits) | Ubuntu 22.04 LTS Server |
| RAM | 8 Go | 16 Go |
| Stockage | SSD 256 Go | SSD 512 Go NVMe |
| Réseau | 1 port Ethernet Gigabit | 1 port Ethernet Gigabit |
| Alimentation | Onduleur (UPS) conseillé | UPS avec autonomie 2h min. |

#### Infrastructure réseau

| Composant | Rôle |
|---|---|
| Switch Ethernet Gigabit | Relier le serveur au point d'accès WiFi |
| Point d'accès WiFi pro | SSID : **CM14-STAFF** — WPA2/WPA3 Entreprise ou PSK fort |
| Câble RJ45 | Relier le serveur au switch |

> Le réseau CM14-STAFF doit être **isolé d'Internet** le jour J. Le serveur est la seule source d'autorité. Toutes les connexions restent locales.

#### Terminaux agents

| Composant | Exigence |
|---|---|
| Smartphone Android | Android 10 minimum, NFC activé |
| APK AUTH-BADGE CM14 | Version release signée (voir section 1.7) |
| Connexion réseau | Connecté au SSID CM14-STAFF |

---

### 1.2 Installation du serveur Ubuntu 22

Ces commandes s'exécutent sur le mini-PC serveur, en session SSH ou directement en terminal local. Chaque bloc de commandes doit être exécuté **dans l'ordre indiqué**.

#### Mise à jour du système

```bash
sudo apt update && sudo apt upgrade -y
```

#### Node.js 22

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
node --version   # Doit afficher v22.x.x
npm --version    # Doit afficher 10.x.x ou supérieur
```

#### PostgreSQL 17

```bash
sudo apt install -y curl ca-certificates
sudo install -d /usr/share/postgresql-common/pgdg
sudo curl -o /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc \
  --fail https://www.postgresql.org/media/keys/ACCC4CF8.asc
sudo sh -c 'echo "deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] \
  https://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" \
  > /etc/apt/sources.list.d/pgdg.list'
sudo apt update
sudo apt install -y postgresql-17
sudo systemctl enable postgresql
sudo systemctl start postgresql
psql --version   # Doit afficher psql (PostgreSQL) 17.x
```

#### Redis 7

```bash
sudo apt install -y redis-server
sudo systemctl enable redis-server
sudo systemctl start redis-server
redis-cli ping   # Doit répondre : PONG
```

#### Nginx

```bash
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
nginx -v   # Doit afficher nginx version: nginx/1.x.x
```

#### PM2

```bash
sudo npm install -g pm2
pm2 --version   # Doit afficher 5.x.x ou supérieur
```

#### Certbot (Let's Encrypt)

```bash
sudo apt install -y certbot python3-certbot-nginx
certbot --version   # Doit afficher certbot 2.x.x
```

#### Git

```bash
sudo apt install -y git
git --version   # Doit afficher git version 2.x.x
```

---

### 1.3 Déploiement du backend

#### Cloner le dépôt

```bash
cd /opt
sudo git clone https://github.com/<organisation>/authbadge-cm14.git
sudo chown -R $USER:$USER /opt/authbadge-cm14
cd /opt/authbadge-cm14
```

> Remplacer `<organisation>` par le nom de l'organisation GitHub du projet.

#### Installer les dépendances Node.js du backend

```bash
cd /opt/authbadge-cm14/backend
npm ci
```

#### Créer le fichier de configuration backend

Copier l'exemple et remplir les valeurs réelles :

```bash
cp .env.example .env
nano .env
```

Le fichier `.env` du backend doit contenir au minimum les variables suivantes :

```ini
# Serveur
NODE_ENV=production
PORT=3001

# Base de données PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=authbadge_cm14
DB_USER=authbadge
DB_PASSWORD=<mot_de_passe_fort_à_définir>

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=<chaîne_aléatoire_256_bits>
JWT_REFRESH_SECRET=<chaîne_aléatoire_256_bits_différente>
JWT_ACCESS_EXPIRES=60m
JWT_REFRESH_EXPIRES=7d

# Sécurité
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
```

> Générer les secrets JWT avec la commande suivante :
> ```bash
> node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
> ```
> Exécuter cette commande deux fois pour obtenir deux valeurs distinctes (`JWT_SECRET` et `JWT_REFRESH_SECRET`).

#### Créer la base de données PostgreSQL

```bash
sudo -u postgres psql -c "CREATE DATABASE authbadge_cm14;"
sudo -u postgres psql -c "CREATE USER authbadge WITH PASSWORD '<mot_de_passe_fort_à_définir>';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE authbadge_cm14 TO authbadge;"
sudo -u postgres psql -c "ALTER DATABASE authbadge_cm14 OWNER TO authbadge;"
```

> Utiliser le même mot de passe que celui renseigné dans `DB_PASSWORD` du fichier `.env`.

#### Exécuter les migrations

```bash
cd /opt/authbadge-cm14/backend
npm run db:migrate
```

Une sortie sans erreur confirme que le schéma de base de données est en place. En cas d'erreur de connexion, vérifier que PostgreSQL est démarré (`pg_isready -h localhost`) et que les identifiants dans `.env` correspondent à ceux créés à l'étape précédente.

#### Démarrer le backend avec PM2

```bash
cd /opt/authbadge-cm14/backend
pm2 start src/index.js --name authbadge-backend --interpreter node
pm2 status   # Le processus doit afficher "online"
```

#### Configurer le démarrage automatique au boot

```bash
pm2 startup
# PM2 affiche une commande à exécuter avec sudo — l'exécuter exactement telle quelle
# Exemple : sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u ubuntu --hp /home/ubuntu
pm2 save
```

Vérifier que le backend répond :

```bash
curl http://localhost:3001/api/health
# Réponse attendue : {"status":"ok",...}
```

---

### 1.4 Déploiement du frontend

Le frontend est une application React/Vite compilée en fichiers statiques (`dist/`). Nginx sert ces fichiers directement.

> **Important pour CM14 :** le réseau de la conférence est **isolé d'Internet** le jour J. Le build frontend et les APK Android doivent donc être entièrement préparés **avant l'arrivée sur site**, sur un poste de développement connecté à Internet.

#### Étape 1 — Build sur le poste de développement (avant isolement réseau)

Sur le poste de développement, configurer l'URL de production et compiler :

```bash
# Définir l'URL du serveur CM14 (IP fixe ou nom DNS local)
echo "VITE_API_URL=https://<ip_ou_nom_serveur_cm14>" > .env.production

# Compiler le frontend
npm ci
npm run build:prod
# → Le dossier dist/ est généré
```

Pour produire l'APK Android en même temps, utiliser le workflow GitHub Actions (disponible depuis un poste avec accès Internet, avant l'événement) :

```bash
git tag v1.0.0
git push origin v1.0.0
# → GitHub Actions compile le dist/ ET génère l'APK signé dans la Release v1.0.0
```

#### Étape 2 — Copier le dist/ sur le serveur CM14

Transférer le dossier `dist/` généré vers le serveur (par clé USB, SCP en pré-déploiement, ou tout autre support) :

```bash
# Via SCP depuis le poste de développement (réseau disponible en phase de préparation)
scp -r dist/ ubuntu@<ip_serveur>:/var/www/authbadge/

# Ou via clé USB si le transfert réseau n'est pas possible
sudo cp -r /media/usb/dist/* /var/www/authbadge/
sudo chown -R www-data:www-data /var/www/authbadge
```

---

### 1.5 Configuration Nginx

#### Créer le fichier de configuration du site

```bash
sudo nano /etc/nginx/sites-available/authbadge
```

Coller la configuration suivante dans le fichier :

```nginx
server {
    listen 80;
    server_name <domaine_ou_ip_serveur>;

    # Redirection HTTPS automatique
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name <domaine_ou_ip_serveur>;

    # Certificats TLS (générés par Certbot — voir section 1.6)
    ssl_certificate     /etc/letsencrypt/live/<domaine>/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/<domaine>/privkey.pem;

    # TLS 1.3 exclusivement (exigence CDC CM14)
    ssl_protocols TLSv1.3;
    ssl_prefer_server_ciphers off;

    # En-têtes de sécurité
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;

    # Frontend React — fichiers statiques
    root /var/www/authbadge;
    index index.html;

    # SPA routing : toutes les routes non-API renvoient index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API REST vers le backend Node.js
    location /api {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 30s;
    }

    # Proxy WebSocket Socket.io vers le backend Node.js
    location /socket.io {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 3600s;
    }
}
```

> Remplacer `<domaine_ou_ip_serveur>` et `<domaine>` par les valeurs réelles (ex. `authbadge.cm14.local` ou l'adresse IP du serveur).

#### Activer le site et recharger Nginx

```bash
sudo ln -s /etc/nginx/sites-available/authbadge /etc/nginx/sites-enabled/
sudo nginx -t        # Vérifier la syntaxe — doit afficher "syntax is ok"
sudo systemctl reload nginx
```

---

### 1.6 Certificat TLS et Certificate Pinning

Cette section est critique pour la sécurité. Le Certificate Pinning garantit que l'application Android n'accepte **que** le certificat du serveur CM14, bloquant toute attaque de type man-in-the-middle.

> **Pour CM14 :** le réseau de la conférence est isolé d'Internet. Let's Encrypt n'est donc pas utilisable. La procédure normale est le **certificat auto-signé** décrite ci-dessous. Générer ce certificat **avant l'événement** (il sera intégré dans l'APK via le Certificate Pinning).

#### Générer le certificat auto-signé (procédure CM14)

```bash
sudo mkdir -p /etc/ssl/authbadge
sudo openssl req -x509 -nodes -days 730 -newkey rsa:4096 \
  -keyout /etc/ssl/authbadge/privkey.pem \
  -out /etc/ssl/authbadge/fullchain.pem \
  -subj "/CN=authbadge-cm14/O=CM14/C=CM"
```

Mettre à jour les chemins dans la configuration Nginx :
```nginx
ssl_certificate     /etc/ssl/authbadge/fullchain.pem;
ssl_certificate_key /etc/ssl/authbadge/privkey.pem;
```

> **Note :** si le serveur dispose d'un accès Internet pendant la phase de préparation (avant l'isolement réseau), Let's Encrypt peut être utilisé à la place pour un certificat reconnu par les navigateurs :
> ```bash
> sudo certbot --nginx -d <domaine_serveur> --email <email_responsable> --agree-tos --no-eff-email
> ```

#### Extraire le pin SHA-256 pour le Certificate Pinning

```bash
openssl x509 -in /etc/letsencrypt/live/<domaine>/fullchain.pem \
  -pubkey -noout \
  | openssl pkey -pubin -outform DER \
  | openssl dgst -sha256 -binary \
  | openssl enc -base64
```

> Pour un certificat auto-signé, remplacer le chemin par `/etc/ssl/authbadge/fullchain.pem`.

La commande affiche une chaîne de type :
```
AbCdEfGhIjKlMnOpQrStUvWxYz1234567890abcdefghijk=
```

#### Mettre à jour le Certificate Pinning dans l'application Android

Ouvrir le fichier `android/app/src/main/res/xml/network_security_config.xml` dans le projet et remplacer la valeur du pin :

```xml
<domain-config cleartextTrafficPermitted="false">
    <domain includeSubdomains="false">authbadge-cm14</domain>
    <pin-set expiration="2028-03-22">
        <pin digest="SHA-256">AbCdEfGhIjKlMnOpQrStUvWxYz1234567890abcdefghijk=</pin>
    </pin-set>
</domain-config>
```

> Mettre à jour la date d'expiration `expiration` en conséquence (2 ans après la date de génération du certificat).

#### IMPORTANT — Désactiver le trafic HTTP avant le build release

Dans le même fichier `network_security_config.xml`, vérifier que `cleartextTrafficPermitted` est bien à `"false"` dans la `<base-config>` :

```xml
<base-config cleartextTrafficPermitted="false">
    <trust-anchors>
        <certificates src="system" />
    </trust-anchors>
</base-config>
```

> Cette valeur est parfois mise à `"true"` pendant le développement pour permettre les tests en HTTP local. Elle **doit impérativement** être à `"false"` avant tout build de production. Un APK release avec `cleartextTrafficPermitted="true"` expose les communications en clair et ne sera pas accepté.

Committer le fichier modifié avant de déclencher le build release :

```bash
git add android/app/src/main/res/xml/network_security_config.xml
git commit -m "chore: update certificate pin + enforce HTTPS for production release"
```

---

### 1.7 Build et distribution APK release

#### Configurer les secrets GitHub (une seule fois)

Ces secrets sont utilisés par le workflow `android-release.yml`. Les configurer dans **Settings → Secrets and variables → Actions** du dépôt GitHub.

| Secret | Description | Comment l'obtenir |
|---|---|---|
| `KEYSTORE_BASE64` | Keystore Android encodé en base64 | `base64 -w 0 android/app/authbadge-cm14.jks` |
| `KEY_ALIAS` | Alias de la clé dans le keystore | Défini à la création du keystore |
| `KEY_PASSWORD` | Mot de passe de la clé | Défini à la création du keystore |
| `STORE_PASSWORD` | Mot de passe du keystore | Défini à la création du keystore |
| `VITE_API_URL` | URL du backend en production | Ex. `https://authbadge.cm14.local` |

> Le fichier `android/app/authbadge-cm14.jks` ne doit **jamais** être commité dans le dépôt Git. Le fichier `.gitignore` doit inclure `*.jks`.

#### Déclencher le build release via un tag Git

```bash
git tag v1.0.0
git push origin v1.0.0
```

Le workflow GitHub Actions démarre automatiquement. Durée estimée : 8 à 12 minutes.

#### Télécharger l'APK depuis GitHub Releases

Une fois le workflow terminé, l'APK est disponible dans la section **Releases** du dépôt GitHub, sous le tag `v1.0.0`. Le fichier s'appelle `app-release.apk`.

```
https://github.com/<organisation>/authbadge-cm14/releases/tag/v1.0.0
```

#### Installer l'APK sur les terminaux agents

**Méthode 1 — Via ADB (recommandé pour déploiement en masse)**

Brancher le téléphone en USB avec le débogage USB activé :

```bash
adb devices                           # Vérifier que le téléphone est détecté
adb install -r app-release.apk        # -r remplace l'installation existante
```

**Méthode 2 — Transfert direct APK**

1. Copier le fichier `app-release.apk` sur le téléphone (câble USB ou partage de fichiers)
2. Sur le téléphone : Paramètres → Sécurité → Autoriser les sources inconnues (pour cette installation uniquement)
3. Ouvrir le fichier APK via le gestionnaire de fichiers pour déclencher l'installation

---

### 1.8 Checklist pré-événement

À compléter **la veille du jour J**. Cocher chaque élément avant de valider la mise en production.

| # | Élément à vérifier | Commande / Action | Résultat attendu |
|---|---|---|---|
| 1 | Serveur accessible sur le réseau CM14-STAFF | `ping <ip_serveur>` | Réponse sans perte de paquets |
| 2 | Backend Node.js en ligne | `pm2 status` | Processus `authbadge-backend` : **online** |
| 3 | Backend répond sur /api/health | `curl https://<domaine>/api/health` | `{"status":"ok"}` |
| 4 | PostgreSQL opérationnel | `pg_isready -h localhost` | `/tmp/.s.PGSQL.5432 - accepting connections` |
| 5 | Redis opérationnel | `redis-cli ping` | `PONG` |
| 6 | Nginx opérationnel | `systemctl status nginx` | `active (running)` |
| 7 | Certificat TLS valide | `curl -Iv https://<domaine>` | `SSL certificate verify ok` |
| 8 | Redirection HTTP → HTTPS | `curl -I http://<domaine>` | Code `301 Moved Permanently` |
| 9 | `cleartextTrafficPermitted="false"` dans network_security_config.xml | Lire le fichier | Valeur `"false"` |
| 10 | APK installé sur tous les téléphones agents | Ouvrir l'app sur chaque téléphone | Écran de connexion affiché |
| 11 | Certificate Pinning fonctionnel | Connexion depuis l'APK | Connexion réussie sans erreur TLS |
| 12 | Connexion admin testée | Navigateur → `https://<domaine>` | Dashboard admin accessible |
| 13 | Au moins un compte admin créé en base | Connexion admin réussie | Dashboard affiche 0 agent connecté |
| 14 | Migrations appliquées | `npm run db:migrate` dans `/opt/authbadge-cm14/backend` | Aucune migration en attente |
| 15 | PM2 configuré au démarrage | `pm2 save` + `pm2 startup` exécutés | Redémarrage automatique après reboot |
| 16 | Sauvegarde initiale de la base | `pg_dump authbadge_cm14 > backup_initial.sql` | Fichier SQL créé sans erreur |

---

## Partie 2 — Jour J

### 2.1 Démarrage du système (ordre exact)

Si le serveur a redémarré depuis la veille, suivre cet ordre précis.

**Étape 1 — Vérifier que les services système sont actifs**

```bash
systemctl status postgresql   # Doit afficher : active (running)
systemctl status redis-server # Doit afficher : active (running)
systemctl status nginx        # Doit afficher : active (running)
```

Si un service n'est pas démarré :

```bash
sudo systemctl start postgresql
sudo systemctl start redis-server
sudo systemctl start nginx
```

**Étape 2 — Vérifier que le backend est en ligne**

```bash
pm2 status
```

Sortie attendue :

```
┌─────┬──────────────────────┬─────────────┬─────────┬─────────┐
│ id  │ name                 │ mode        │ status  │ uptime  │
├─────┼──────────────────────┼─────────────┼─────────┼─────────┤
│ 0   │ authbadge-backend    │ fork        │ online  │ 1h      │
└─────┴──────────────────────┴─────────────┴─────────┴─────────┘
```

Si le backend n'est pas démarré :

```bash
cd /opt/authbadge-cm14/backend
pm2 start src/index.js --name authbadge-backend
```

**Étape 3 — Vérifications rapides de santé**

```bash
pg_isready -h localhost && echo "PostgreSQL OK"
redis-cli ping && echo "Redis OK"
curl -s http://localhost:3001/api/health | python3 -m json.tool
```

**Étape 4 — Connexion du PC administrateur**

1. Connecter le PC administrateur au réseau WiFi **CM14-STAFF**
2. Ouvrir un navigateur et accéder à `https://<domaine_ou_ip_serveur>`
3. Se connecter avec les identifiants administrateur
4. Vérifier que le dashboard affiche 0 agent connecté (état normal avant ouverture des points de contrôle)

**Étape 5 — Connexion des agents**

1. Chaque agent connecte son téléphone au réseau WiFi **CM14-STAFF**
2. Chaque agent ouvre l'application AUTH-BADGE CM14
3. Chaque agent se connecte avec ses identifiants (identifiant + mot de passe + code TOTP 2FA)

**Étape 6 — Vérification superviseur**

Le superviseur vérifie sur le dashboard que tous les agents attendus apparaissent avec le statut **en ligne**. Si un agent n'apparaît pas :
- Vérifier que le téléphone est connecté au SSID CM14-STAFF (et non à un autre réseau)
- Vérifier que l'application n'affiche pas d'erreur de connexion
- Vérifier que le compte agent existe et n'est pas verrouillé (admin → Gestion utilisateurs)

---

### 2.2 Commandes de surveillance

Ces commandes permettent de surveiller le système en temps réel pendant l'événement.

#### Surveiller les logs du backend en temps réel

```bash
pm2 logs authbadge-backend
```

Appuyer sur `Ctrl+C` pour quitter la vue des logs sans arrêter le processus.

#### Tableau de bord PM2 en temps réel (CPU, mémoire, logs)

```bash
pm2 monit
```

Appuyer sur `q` pour quitter.

#### Surveiller les accès Nginx en temps réel

```bash
sudo tail -f /var/log/nginx/access.log
```

#### Surveiller les erreurs Nginx

```bash
sudo tail -f /var/log/nginx/error.log
```

#### Vérifier l'utilisation des ressources système

```bash
htop   # Vue interactive CPU/RAM/processus (installer avec : sudo apt install htop)
```

#### Vérifier l'espace disque disponible

```bash
df -h /
```

---

## Partie 3 — Mise à jour en cours d'événement

### 3.1 Publier une nouvelle version APK

Une correction urgente peut être déployée sur les téléphones agents sans interrompre l'événement.

> **Contrainte CM14 :** le réseau est isolé d'Internet pendant la conférence. GitHub Actions et GitHub Releases ne sont **pas accessibles**. La mise à jour d'APK se fait entièrement en local, depuis un poste de développement apporté sur site.

**Étape 1 — Corriger et recompiler sur le poste de développement (apporté sur site)**

```bash
# Corriger le code, puis compiler
npm run build:prod

# Synchroniser Capacitor et compiler l'APK
npx cap sync android
cd android
./gradlew assembleRelease

# Signer l'APK manuellement avec le keystore
jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256 \
  -keystore android/app/authbadge-cm14.jks \
  android/app/build/outputs/apk/release/app-release-unsigned.apk \
  authbadge-cm14
zipalign -v 4 app-release-unsigned.apk authbadge-cm14-v1.1.0.apk
```

> Si le build CI/CD a déjà été déclenché depuis une connexion Internet avant l'événement, l'APK signé peut être stocké sur une clé USB apportée sur site — évitant ainsi la recompilation locale.

**Étape 2 — Copier le nouvel APK sur une clé USB**

```bash
cp authbadge-cm14-v1.1.0.apk /media/usb/
```

**Étape 3 — Installer sur chaque téléphone agent**

Puisque tous les appareils (téléphones agents et poste de développement) sont sur le **même réseau local CM14**, utiliser ADB over WiFi — pas besoin de câble USB.

Activer ADB WiFi sur chaque téléphone (une seule fois, en USB) :

```bash
# Brancher le téléphone en USB une première fois pour le jumeler
adb tcpip 5555
# Débrancher le câble USB — le téléphone reste joignable via WiFi
```

Puis déployer l'APK sur chaque téléphone **sans câble** :

```bash
# Remplacer <ip_telephone> par l'IP du téléphone sur le réseau CM14
adb connect <ip_telephone>:5555
adb -s <ip_telephone>:5555 install -r authbadge-cm14-v1.1.0.apk
```

> L'option `-r` (replace) met à jour l'application existante **sans effacer les données** ni déconnecter l'agent. L'IP du téléphone est visible dans Paramètres → À propos → Statut réseau WiFi.

**Exemple concret — mise à jour simultanée de 3 téléphones :**

```bash
adb connect 192.168.10.11:5555
adb connect 192.168.10.12:5555
adb connect 192.168.10.13:5555
adb devices   # Les 3 appareils doivent apparaître

# Déployer sur les 3 en parallèle (3 terminaux séparés)
adb -s 192.168.10.11:5555 install -r authbadge-cm14-v1.1.0.apk
adb -s 192.168.10.12:5555 install -r authbadge-cm14-v1.1.0.apk
adb -s 192.168.10.13:5555 install -r authbadge-cm14-v1.1.0.apk
```

**Procédure de repli si ADB WiFi n'est pas disponible :**

1. Copier l'APK sur une clé USB
2. Transférer le fichier sur le téléphone via USB
3. Ouvrir le fichier APK depuis le gestionnaire de fichiers Android
4. Confirmer la mise à jour, relancer l'application

---

### 3.2 Redémarrer le backend sans interruption

PM2 propose un rechargement à zéro interruption (`reload`) qui garantit qu'aucune requête en cours n'est perdue.

```bash
pm2 reload authbadge-backend
```

PM2 démarre un nouveau processus, lui transfère le trafic, puis arrête l'ancien. Le temps d'indisponibilité est nul.

Vérifier après rechargement :

```bash
pm2 status
curl -s http://localhost:3001/api/health
```

> Ne pas utiliser `pm2 restart authbadge-backend` pendant l'événement : cette commande arrête le processus complètement avant de le redémarrer, ce qui provoque une interruption de quelques secondes.

---

## Partie 4 — Après l'événement

### 4.1 Export des journaux

#### Export depuis la console d'administration

1. Se connecter à la console admin dans le navigateur
2. Naviguer vers **Journaux d'accès**
3. Sélectionner la plage de dates de l'événement
4. Exporter au format **CSV** (pour traitement tableur) ou **JSON** (pour archivage)
5. Enregistrer les fichiers dans un répertoire sécurisé et chiffré

#### Sauvegarde complète de la base de données PostgreSQL

```bash
pg_dump -U authbadge -h localhost -F c -b -v \
  -f "/opt/backups/authbadge_cm14_$(date +%Y%m%d_%H%M%S).dump" \
  authbadge_cm14
```

| Option | Signification |
|---|---|
| `-U authbadge` | Se connecter avec l'utilisateur `authbadge` |
| `-F c` | Format custom PostgreSQL (compressé, restaurable avec `pg_restore`) |
| `-b` | Inclure les large objects |
| `-v` | Mode verbeux |
| `-f <fichier>` | Fichier de sortie avec horodatage dans le nom |

Vérifier que le fichier a bien été créé :

```bash
ls -lh /opt/backups/
```

Copier le fichier de sauvegarde sur un support externe ou un stockage distant sécurisé.

#### Restauration d'une sauvegarde (si nécessaire)

```bash
pg_restore -U authbadge -h localhost -d authbadge_cm14 -v \
  /opt/backups/authbadge_cm14_<horodatage>.dump
```

---

### 4.2 Arrêt du système

Arrêter les services dans l'ordre suivant après que tous les exports sont effectués et validés.

**Étape 1 — Arrêter le backend Node.js**

```bash
pm2 stop all
pm2 delete all   # Optionnel : supprimer les processus de la liste PM2
```

**Étape 2 — Arrêter Nginx**

```bash
sudo systemctl stop nginx
```

**Étape 3 — Arrêter Redis**

```bash
sudo systemctl stop redis-server
```

**Étape 4 — Arrêter PostgreSQL**

```bash
sudo systemctl stop postgresql
```

**Étape 5 — Vérifier l'arrêt complet**

```bash
pm2 status           # Aucun processus actif
systemctl is-active nginx       # Doit afficher : inactive
systemctl is-active redis-server # Doit afficher : inactive
systemctl is-active postgresql  # Doit afficher : inactive
```

**Étape 6 — Archiver les logs Nginx**

```bash
sudo cp /var/log/nginx/access.log /opt/backups/nginx_access_$(date +%Y%m%d).log
sudo cp /var/log/nginx/error.log  /opt/backups/nginx_error_$(date +%Y%m%d).log
```

**Étape 7 — Éteindre le serveur**

```bash
sudo shutdown -h now
```

---

## Référence rapide — Commandes essentielles

| Action | Commande |
|---|---|
| Statut de tous les services | `pm2 status && systemctl is-active postgresql redis-server nginx` |
| Logs backend en direct | `pm2 logs authbadge-backend` |
| Tableau de bord PM2 | `pm2 monit` |
| Redémarrer backend (zéro interruption) | `pm2 reload authbadge-backend` |
| Redémarrer Nginx | `sudo systemctl reload nginx` |
| Vérifier PostgreSQL | `pg_isready -h localhost` |
| Vérifier Redis | `redis-cli ping` |
| Vérifier le backend | `curl -s http://localhost:3001/api/health` |
| Sauvegarder la base | `pg_dump -U authbadge -h localhost -F c -f backup.dump authbadge_cm14` |
| Déclencher un build APK | `git tag v1.x.x && git push origin v1.x.x` |

---

*Document rédigé selon les 7 règles de Bob — Version 1.0 — 2026-03-22*
