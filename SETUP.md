# 🚀 Guide de démarrage du projet

Ce guide vous explique comment installer et démarrer l'ensemble du projet OAuth2/OIDC avec Keycloak.

## 📋 Table des matières

1. [Prérequis](#prérequis)
2. [Architecture du projet](#architecture-du-projet)
3. [Installation](#installation)
4. [Configuration](#configuration)
5. [Démarrage](#démarrage)
6. [Utilisation](#utilisation)
7. [Dépannage](#dépannage)

---

## Prérequis

Avant de commencer, assurez-vous d'avoir installé:

- **Node.js** (version 14 ou supérieure)
- **npm** (généralement installé avec Node.js)
- **Docker** (pour Keycloak)
- **mkcert** (pour les certificats HTTPS locaux)

### Installation de mkcert

**Windows:**
```bash
choco install mkcert
```

**macOS:**
```bash
brew install mkcert
```

**Linux:**
```bash
# Suivre les instructions sur: https://github.com/FiloSottile/mkcert
```

---

## Architecture du projet

Le projet est composé de 3 composants:

```
test2/
├── webapp2/          # Application web (port 3000 HTTPS)
├── device-app/       # Application device (port 4000 HTTP)
├── device-client/    # Client CLI pour devices
└── Keycloak         # Serveur d'autorisation (port 8080 HTTP)
```

**Flow OAuth2:**
- **webapp2**: Utilise Authorization Code Flow avec PKCE
- **device-app**: Utilise Device Authorization Grant (RFC 8628)

---

## Installation

### Étape 1: Générer les certificats SSL

Les certificats sont nécessaires pour HTTPS (requis par PKCE).

```bash
# Générer les certificats
mkcert localhost 127.0.0.1 ::1

# Créer le dossier certs
mkdir certs

# Déplacer les certificats
mv localhost+2.pem certs/
mv localhost+2-key.pem certs/
```

Les fichiers générés:
- `certs/localhost+2.pem` (certificat)
- `certs/localhost+2-key.pem` (clé privée)

### Étape 2: Installer Keycloak avec Docker

```bash
# Pull de l'image Keycloak
docker pull quay.io/keycloak/keycloak

# Créer un volume pour la persistance
docker volume create keycloak-data

# Démarrer Keycloak (remplacer <password> par votre mot de passe)
docker run -d \
  --name keycloak-dev \
  -p 127.0.0.1:8080:8080 \
  -e KC_BOOTSTRAP_ADMIN_USERNAME=admin \
  -e KC_BOOTSTRAP_ADMIN_PASSWORD=<password> \
  -e KEYCLOAK_DEFAULT_REALM=projetcis \
  -v ${PWD}/imports:/opt/keycloak/data/import \
  quay.io/keycloak/keycloak:latest \
  start-dev --import-realm
```

**Note:** Si le dossier `imports` existe avec `realm.json`, le realm sera importé automatiquement.

Attendez environ 30 secondes que Keycloak démarre, puis vérifiez:
```bash
curl http://localhost:8080
```

### Étape 3: Configurer Keycloak

1. Accédez à l'interface admin: http://localhost:8080
2. Connectez-vous avec:
   - Username: `admin`
   - Password: `<password>` (celui que vous avez défini)
3. Allez dans **Manage realms** → Sélectionnez le realm **projetcis**
4. Vérifiez que les clients existent:
   - **webapp** (OpenID Connect, confidential)
   - **devicecis** (OpenID Connect, public)

### Étape 4: Récupérer le Client Secret

1. Dans Keycloak Admin Console
2. Allez à **Clients** → **webapp**
3. Onglet **Credentials**
4. Copiez la valeur du champ **Client Secret**

### Étape 5: Installer les dépendances Node.js

Installez les dépendances pour chaque composant:

```bash
# webapp2
cd webapp2
npm install
cd ..

# device-app
cd device-app
npm install
cd ..

# device-client (optionnel)
cd device-client
npm install
cd ..
```

---

## Configuration

### Configuration de webapp2

Créez le fichier `webapp2/.env`:

```bash
# Configuration Keycloak
KEYCLOAK_URL=http://localhost:8080
REALM=projetcis
CLIENT_ID=webapp
CLIENT_SECRET=<collez ici le secret copié depuis Keycloak>

# Configuration serveur
PORT=3000
REDIRECT_URI=https://localhost:3000/auth/callback

# Session
SESSION_SECRET=dev-secret-change-in-production-min-32-chars
```

**Important:** Remplacez `<collez ici le secret copié depuis Keycloak>` par le secret récupéré à l'étape 4.

### Configuration de device-app

Le device-app utilise la configuration dans le code. Aucun fichier .env n'est nécessaire.

---

## Démarrage

### Option 1: Démarrage manuel (recommandé pour débogage)

Ouvrez 2 terminaux séparés:

**Terminal 1 - webapp2:**
```bash
cd webapp2
npm run dev
# OU: npm start
```

Attendez le message: `Server running on https://localhost:3000`

**Terminal 2 - device-app:**
```bash
cd device-app
npm run dev
# OU: npm start
```

Attendez le message: `Server running on http://localhost:4000`

### Option 2: Vérifier que tout fonctionne

Vérifiez les services:

```bash
# Keycloak
curl http://localhost:8080/realms/projetcis/.well-known/openid-configuration

# webapp2
curl -k https://localhost:3000

# device-app
curl http://localhost:4000
```

---

## Utilisation

### 1. Tester le flow webapp (Authorization Code + PKCE)

1. Ouvrez votre navigateur sur: https://localhost:3000
2. Cliquez sur "Se connecter"
3. Vous serez redirigé vers Keycloak
4. Connectez-vous avec un utilisateur Keycloak (ou créez-en un)
5. Vous serez redirigé vers l'application avec succès ✅

### 2. Tester le Device Flow

**A. Démarrer l'authentification du device:**

1. Ouvrez votre navigateur sur: http://localhost:4000
2. Cliquez sur "Démarrer l'authentification"
3. Notez le **code utilisateur** affiché (ex: `WDJB-MJHT`)
4. Scannez le **QR code** OU copiez l'URL de vérification

**B. Autoriser le device:**

1. Sur un autre appareil (ou même navigateur):
   - Allez sur l'URL de vérification
   - OU scannez le QR code
2. Connectez-vous à Keycloak si nécessaire
3. Entrez le **code utilisateur**
4. Cliquez sur "Confirmer" pour autoriser le device

**C. Vérification:**

Le device reçoit automatiquement le token et affiche:
- ✅ Access Token reçu
- Informations de l'utilisateur
- Statut: Authentifié

### 3. Voir les devices connectés dans webapp

1. Connectez-vous sur https://localhost:3000
2. Allez sur la page `/devices`
3. Vous verrez la liste des devices autorisés avec:
   - Adresse IP
   - Session ID
   - Date de connexion
   - Dernière activité
   - Date d'expiration

---

## Architecture OAuth2 (important!)

Le projet implémente l'architecture **correcte** selon RFC 8628:

```
✅ ARCHITECTURE CORRECTE:

webapp2 ─────→ Keycloak ←───── device-app
              (hub central)

- webapp2 ne contacte JAMAIS device-app directement
- Toutes les données passent par Keycloak
- device-app n'expose AUCUNE API publique
- Keycloak est la seule source de vérité
```

**Ce qui a été supprimé** (car incorrect):
- ❌ Endpoint `/api/status` sur device-app
- ❌ Appels HTTP directs de webapp vers device-app
- ❌ État en mémoire dans device-app

**Avantages:**
- ✅ Conforme aux standards OAuth2
- ✅ Scalable (fonctionne sur internet, pas seulement localhost)
- ✅ Sécurisé (Keycloak gère tout)
- ✅ Maintenable

Voir `ARCHITECTURE_FIX.md` pour plus de détails.

---

## Dépannage

### Problème: Keycloak ne démarre pas

**Solution:**
```bash
# Vérifier les logs
docker logs keycloak-dev

# Redémarrer Keycloak
docker restart keycloak-dev

# Ou recréer le conteneur
docker stop keycloak-dev
docker rm keycloak-dev
# Relancer la commande docker run...
```

### Problème: webapp2 ne démarre pas

**Erreur:** `Error: Cannot find module 'dotenv'`

**Solution:**
```bash
cd webapp2
npm install
```

**Erreur:** `ENOENT: no such file or directory, open '.env'`

**Solution:**
Créez le fichier `webapp2/.env` (voir section Configuration)

### Problème: Certificats SSL invalides

**Erreur:** `Error: unable to verify the first certificate`

**Solution:**
```bash
# Installer le certificat root de mkcert
mkcert -install

# Régénérer les certificats
cd /chemin/vers/projet
rm -rf certs
mkdir certs
mkcert localhost 127.0.0.1 ::1
mv localhost+2*.pem certs/
```

### Problème: Device Flow ne fonctionne pas

**Symptôme:** Le device ne reçoit jamais de token

**Vérifications:**
1. Keycloak est démarré et accessible
2. Le realm `projetcis` existe
3. Le client `devicecis` est configuré avec:
   - Client authentication: OFF (public)
   - OAuth 2.0 Device Authorization Grant: ON
4. Vous avez bien confirmé le code sur la page de vérification

### Problème: 404 sur /devices

**Erreur:** `Cannot GET /devices`

**Cause:** Vous n'êtes pas connecté

**Solution:**
1. Allez sur https://localhost:3000
2. Cliquez sur "Se connecter"
3. Authentifiez-vous
4. Ensuite allez sur /devices

---

## Commandes utiles

```bash
# Voir les conteneurs Docker
docker ps

# Arrêter Keycloak
docker stop keycloak-dev

# Démarrer Keycloak
docker start keycloak-dev

# Voir les logs Keycloak
docker logs -f keycloak-dev

# Nettoyer tout
docker stop keycloak-dev
docker rm keycloak-dev
docker volume rm keycloak-data

# Vérifier les ports utilisés
netstat -an | grep LISTEN | grep -E ":(3000|4000|8080)"
# OU sur Linux:
ss -tuln | grep -E ":(3000|4000|8080)"
```

---

## Ressources

- [README principal](./README.md) - Configuration Keycloak détaillée
- [ARCHITECTURE_FIX.md](./ARCHITECTURE_FIX.md) - Explications techniques détaillées
- [TESTS.md](./TESTS.md) - Tests et validation
- [RFC 8628 - Device Authorization Grant](https://www.rfc-editor.org/rfc/rfc8628)
- [Keycloak Documentation](https://www.keycloak.org/docs/latest/)

---

## Support

Pour toute question ou problème:
1. Vérifiez les logs (`docker logs keycloak-dev`, console des apps)
2. Consultez `ARCHITECTURE_FIX.md` pour comprendre l'architecture
3. Consultez `TESTS.md` pour les scénarios de test

---

**Projet:** OAuth2/OIDC avec Keycloak
**Version:** 1.0.0
**Dernière mise à jour:** 2026-01-18
