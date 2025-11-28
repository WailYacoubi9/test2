# Configuration Keycloak & Application Node.js

## Etape préliminaire: Configuration de Https locale
L’application utilise HTTPS obligatoire pour respecter PKCE + OIDC.
Pour cela, on génère un certificat SSL local avec mkcert.

### Installer mkcert

Pour Windows:
```bash
choco install mkcert
```

### Générer les certificats HTTPS

```bash
mkcert localhost 127.0.0.1 ::1
```
Cela génère :

localhost+2.pem (certificat)

localhost+2-key.pem (clé privée)

### Placer les certificats dans votre projet
Créer le dossier :
```bash
/certs
```
Puis déplacer les fichiers générés dedans :
```bash
/certs/localhost+2.pem
/certs/localhost+2-key.pem
```
/certs est déjà placé dans .gitignore

## 1. Installation et lancement de Keycloak

### 1.1 Pull de l’image Keycloak

```bash
docker pull quay.io/keycloak/keycloak
```

### 1.2 Lancement du conteneur Keycloak (mode dev)

#### 1.2.1 Création d'un volume pour keycloak:

```bash
docker volume create keycloak-data
```
#### 1.2.2 Commande de lancement du conteneur pour Windows:

```bash
docker run -d --name keycloak-dev -p 127.0.0.1:8080:8080 -e KC_BOOTSTRAP_ADMIN_USERNAME=admin -e KC_BOOTSTRAP_ADMIN_PASSWORD=<password> -e KEYCLOAK_DEFAULT_REALM=projetcis -v ${PWD}/imports:/opt/keycloak/data/import quay.io/keycloak/keycloak:latest start-dev --import-realm
```

### 1.3 Accéder à Keycloak

Ouvrir dans le navigateur :

http://localhost:8080

Identifiants admin :

- **username** : admin  
- **password** : <password>


---

## 2. Configuration Keycloak

### 2.1 Création du Realm

1. Aller dans la sidebar gauche  
2. Cliquer sur **Manage realms**   
3. Cliquer sur le realm : **projetcis** pour qu'il devient le realm courant

---

### 2.2 Le Client WebApp

Aller dans : **Clients → webapp**

#### Paramètres configurées par realm.json :

| Champ | Valeur |
|-------|--------|
| **Client ID** | webapp |
| **Name** | WebApp Client |
| **Client type** | OpenID Connect |
| **Client authentication** | ON |
| **Authorization** | OFF |
| **Standard flow** | ON |
| **Direct access grants** | OFF |
| **Service accounts** | OFF |
| **OAuth Device Flow** | OFF |
| **PKCE** | Required |
| **Code challenge method** | S256 |

#### Redirections :

| Paramètre Keycloak | Valeur |
|--------------------|--------|
| **Valid Redirect URIs** | http://localhost:3000/auth/callback |
| **Valid Post Logout Redirect URIs** | http://localhost:3000/* |
| **Web Origins** | http://localhost:3000/ |

---

### 2.3 Récupérer le secret du client

1. Aller dans l’onglet **Credentials**  
2. Copier le champ **Client Secret**

---

## 3. Configuration de l’application Node.js

Créer un fichier **.env** à la racine du projet :

```
# Configuration Keycloak
KEYCLOAK_URL=http://localhost:8080
REALM=projetcis
CLIENT_ID=webapp
CLIENT_SECRET=<collez ici le secret que vous avez copié>

# Configuration serveur
PORT=3000
REDIRECT_URI=http://localhost:3000/auth/callback

```

---

## 4. Lancer l’application

Installer les dépendances :

```bash
npm install
```

Démarrer le serveur :

```bash
nodemon server.js
```

Accéder à l’application :

http://localhost:3000
