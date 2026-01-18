# 📋 Use Cases - OAuth2 Device Flow Application

Documentation complète des use cases de l'application et de leurs tests.

---

## 📑 Table des Matières

1. [WebApp - Authentification](#webapp---authentification)
2. [WebApp - Pages Protégées](#webapp---pages-protégées)
3. [WebApp - Device Activation](#webapp---device-activation)
4. [Device-App - Device Flow](#device-app---device-flow)
5. [Sécurité](#sécurité)

---

## WebApp - Authentification

### UC01: Login avec PKCE
**Actor:** Utilisateur non authentifié
**Préconditions:** Keycloak configuré, WebApp démarrée
**Flow:**
1. User accède à `/login`
2. Système génère code_verifier et code_challenge (PKCE)
3. Système génère state (CSRF protection)
4. Système stocke code_verifier et state en session
5. Système redirige vers Keycloak avec parameters OAuth2
6. User s'authentifie sur Keycloak
7. Keycloak redirige vers `/auth/callback` avec authorization code

**Postconditions:** Session créée avec PKCE values

**Fichier:** `webapp2/routes/auth.js:10-30`

---

### UC02: Register (Inscription)
**Actor:** Utilisateur non inscrit
**Préconditions:** Keycloak accepte registrations
**Flow:**
1. User accède à `/register`
2. Système génère PKCE parameters
3. Système construit URL Keycloak `/registrations`
4. Système redirige vers page inscription Keycloak
5. User crée compte
6. Keycloak redirige vers `/auth/callback`

**Postconditions:** Compte créé + session initiée

**Fichier:** `webapp2/routes/auth.js:36-62`

---

### UC03: Callback OAuth2
**Actor:** Système (callback automatique)
**Préconditions:** Authorization code reçu de Keycloak
**Flow:**
1. Keycloak redirige vers `/auth/callback?code=XXX&state=YYY`
2. Système vérifie state (protection CSRF)
3. Système exchange code contre tokens avec code_verifier
4. Système récupère userinfo avec access_token
5. Système stocke tokenSet et userinfo en session
6. Système nettoie code_verifier et state
7. Système redirige vers `/profile`

**Postconditions:** User authentifié, tokens en session

**Fichier:** `webapp2/routes/auth.js:68-117`

---

### UC04: Logout Simple
**Actor:** Utilisateur authentifié
**Préconditions:** User a une session active
**Flow:**
1. User clique sur logout
2. Système détruit session locale
3. Système construit URL Keycloak end_session
4. Système redirige vers Keycloak logout
5. Keycloak redirige vers home page

**Postconditions:** Session détruite, user déconnecté

**Fichier:** `webapp2/routes/auth.js:123-142`

---

### UC05: Logout avec Révocation
**Actor:** Utilisateur authentifié
**Préconditions:** User a tokens valides
**Flow:**
1. User accède `/auth/revoke-and-logout`
2. Système révoque access_token via Keycloak
3. Système révoque refresh_token via Keycloak
4. Système détruit session locale
5. Système redirige vers Keycloak logout

**Postconditions:** Tokens révoqués, session détruite

**Fichier:** `webapp2/routes/auth.js:181-220`

---

### UC06: Révocation Manuelle (API)
**Actor:** Device ou script externe
**Préconditions:** User authentifié, requête POST avec token
**Flow:**
1. Client POST `/auth/revoke` avec credentials
2. Système vérifie auth (middleware requireAuth)
3. Système révoque access_token dans Keycloak
4. Système détruit session
5. Système retourne JSON success

**Postconditions:** Token révoqué

**Fichier:** `webapp2/routes/auth.js:149-175`

---

## WebApp - Pages Protégées

### UC07: Page Home (Publique)
**Actor:** Visiteur anonyme
**Préconditions:** Aucune
**Flow:**
1. User accède à `/`
2. Système affiche page d'accueil
3. Page contient liens login/register

**Postconditions:** Page affichée

**Fichier:** `webapp2/routes/pages.js:9-13`

---

### UC08: Page Profile (Protégée)
**Actor:** Utilisateur authentifié
**Préconditions:** User a session active
**Flow:**
1. User accède à `/profile`
2. Middleware refreshTokenIfNeeded vérifie expiration token
3. Si expire < 5min, refresh automatique
4. Middleware requireAuth vérifie session
5. Système calcule temps restant avant expiration
6. Système affiche profil avec userinfo + tokenSet

**Postconditions:** Profil affiché, tokens potentiellement refreshed

**Fichier:** `webapp2/routes/pages.js:20-35`

---

### UC09: Page Devices (Liste depuis Keycloak)
**Actor:** Utilisateur authentifié
**Préconditions:** User a access_token valide
**Flow:**
1. User accède à `/devices`
2. Middleware refresh + require auth
3. Système appelle Keycloak Account API `/account/sessions/devices`
4. Système filtre devices par clientId='devicecis'
5. Système affiche liste des devices

**Postconditions:** Liste devices affichée

**Fichier:** `webapp2/routes/pages.js:80-88`

---

### UC10: API Devices (JSON)
**Actor:** Frontend (AJAX call)
**Préconditions:** User authentifié
**Flow:**
1. Frontend GET `/api/devices`
2. Middleware refresh + auth
3. Système fetch devices depuis Keycloak
4. Système retourne JSON avec devices + timestamp

**Postconditions:** JSON retourné (auto-refresh frontend)

**Fichier:** `webapp2/routes/pages.js:94-103`

---

## WebApp - Device Activation

### UC11: GET /activate (Form)
**Actor:** User avec device code
**Préconditions:** Device a généré user_code
**Flow:**
1. User scanne QR code → `/activate?code=XXXX-YYYY`
2. OU User va manuellement sur `/activate`
3. Système affiche formulaire
4. Si code dans query param, pré-remplir champ

**Postconditions:** Form affiché

**Fichier:** `webapp2/routes/device-activation.js:9-16`

---

### UC12: POST /activate (Redirection Keycloak)
**Actor:** User qui soumet form
**Préconditions:** User a entré code
**Flow:**
1. User soumet form avec user_code
2. Système valide présence du code
3. Système formate code (uppercase, sans espaces/tirets)
4. Système construit URL Keycloak `/device?user_code=XXX`
5. Système redirige vers Keycloak
6. Keycloak affiche page de vérification
7. User confirme autorisation
8. Device reçoit token via polling

**Postconditions:** Redirection Keycloak effectuée

**Fichier:** `webapp2/routes/device-activation.js:22-45`

---

## Device-App - Device Flow

### UC13: Démarrer Device Flow
**Actor:** Device (IoT, CLI, etc.)
**Préconditions:** Keycloak client 'devicecis' configuré
**Flow:**
1. User clique "Démarrer authentification" sur device
2. Device POST `/start-device-flow`
3. Système POST vers Keycloak `/auth/device` avec client_id
4. Keycloak retourne:
   - device_code
   - user_code
   - verification_uri
   - expires_in
5. Système génère QR code pointant vers webapp
6. Système stocke état en mémoire
7. Système démarre polling automatique
8. Système retourne JSON avec code + QR

**Postconditions:** Device Flow initié, polling démarré

**Fichier:** `device-app/server.js:35-94`

---

### UC14: Polling Autorisation
**Actor:** Système (automatique)
**Préconditions:** Device Flow démarré
**Flow:**
1. Polling loop POST vers `/token` toutes les N secondes
2. Keycloak retourne:
   - `authorization_pending` → Continuer polling
   - `slow_down` → Augmenter interval
   - `expired_token` → Arrêter polling
   - `200 + tokens` → Succès, arrêter polling
3. Si succès, stocker access_token + refresh_token
4. Récupérer userinfo
5. Nettoyer deviceFlowState

**Postconditions:** Tokens obtenus ou timeout

**Fichier:** `device-app/server.js:97-158`

---

### UC15: Obtention Access Token
**Actor:** Système (après autorisation)
**Préconditions:** User a approuvé device
**Flow:**
1. Polling détecte réponse 200 de Keycloak
2. Système extrait access_token + refresh_token
3. Système log succès
4. Système call getUserInfo()
5. Système affiche user connecté

**Postconditions:** Device authentifié

**Fichier:** `device-app/server.js:120-128`

---

### UC16: Récupération User Info
**Actor:** Système
**Préconditions:** access_token valide
**Flow:**
1. Système GET `/userinfo` avec Bearer token
2. Keycloak retourne claims (email, preferred_username, etc.)
3. Système affiche ou stocke userinfo

**Postconditions:** User info disponible

**Fichier:** `device-app/server.js:161-174`

---

### UC17: Logout Device avec Révocation
**Actor:** User sur device
**Préconditions:** Device authentifié
**Flow:**
1. User clique "Déconnexion"
2. Device POST `/logout`
3. Si refresh_token existe:
   - POST vers Keycloak `/revoke` avec token
4. Nettoyer variables locales (accessToken, refreshToken, state)
5. Retourner JSON success

**Postconditions:** Token révoqué, device déconnecté

**Fichier:** `device-app/server.js:202-249`

---

### UC18: Status Check Interne
**Actor:** Frontend du device
**Préconditions:** Aucune
**Flow:**
1. Frontend GET `/status`
2. Système vérifie état:
   - Si accessToken → authenticated=true
   - Si deviceFlowState → pending=true
   - Sinon → not authenticated
3. Retourne JSON avec état

**Postconditions:** État retourné

**Fichier:** `device-app/server.js:178-199`

---

### UC19: Ouvrir Navigateur Auto
**Actor:** User sur device
**Préconditions:** Device Flow démarré
**Flow:**
1. User clique "Ouvrir navigateur"
2. Device POST `/open-browser`
3. Système vérifie webapp_activation_url existe
4. Système ouvre navigateur avec URL
5. Navigateur affiche `/activate` avec code pré-rempli

**Postconditions:** Navigateur ouvert

**Fichier:** `device-app/server.js:252-259`

---

## Sécurité

### S01: PKCE (Proof Key for Code Exchange)
**Protège contre:** Interception authorization code
**Implémentation:**
- code_verifier généré (random 43-128 chars)
- code_challenge = SHA256(code_verifier)
- Keycloak vérifie challenge au callback

**Fichiers:** `webapp2/routes/auth.js:13-14, 39-40`

---

### S02: CSRF Protection via State
**Protège contre:** Cross-Site Request Forgery
**Implémentation:**
- state random généré au login
- state stocké en session
- state vérifié au callback
- Erreur si mismatch

**Fichiers:** `webapp2/routes/auth.js:15, 75-77`

---

### S03: Token Auto-Refresh
**Protège contre:** Token expiration en cours d'utilisation
**Implémentation:**
- Middleware vérifie expiration < 5 minutes
- Si proche expiration, refresh automatique
- Utilise refresh_token pour obtenir nouveau access_token

**Fichiers:** `webapp2/middleware/auth.js`

---

### S04: Token Revocation
**Protège contre:** Tokens compromis
**Implémentation:**
- Endpoint POST `/auth/revoke`
- Appel à Keycloak `/revoke`
- Invalide immédiatement token

**Fichiers:** `webapp2/routes/auth.js:149-220`, `device-app/server.js:202-249`

---

### S05: HTTPS Obligatoire
**Protège contre:** Man-in-the-middle
**Implémentation:**
- Certificats mkcert pour dev
- HTTPS pour webapp (port 3000)
- HTTP pour Keycloak en local (prod: HTTPS obligatoire)

**Fichiers:** `webapp2/server.js`, `device-app/server.js:266-280`

---

## Matrice de Couverture

| Use Case | Fichier | Tests Unitaires | Tests Intégration | Tests E2E |
|----------|---------|-----------------|-------------------|-----------|
| UC01: Login PKCE | auth.js:10-30 | ❌ | ❌ | ❌ |
| UC02: Register | auth.js:36-62 | ❌ | ❌ | ❌ |
| UC03: Callback | auth.js:68-117 | ❌ | ❌ | ❌ |
| UC04: Logout | auth.js:123-142 | ❌ | ❌ | ❌ |
| UC05: Logout+Revoke | auth.js:181-220 | ❌ | ❌ | ❌ |
| UC06: Revoke API | auth.js:149-175 | ❌ | ❌ | ❌ |
| UC07: Home | pages.js:9-13 | ❌ | ✅ | ❌ |
| UC08: Profile | pages.js:20-35 | ❌ | ⚠️ | ❌ |
| UC09: Devices | pages.js:80-88 | ❌ | ❌ | ❌ |
| UC10: API Devices | pages.js:94-103 | ❌ | ❌ | ❌ |
| UC11: GET /activate | device-activation.js:9-16 | ❌ | ✅ | ❌ |
| UC12: POST /activate | device-activation.js:22-45 | ❌ | ❌ | ❌ |
| UC13: Start Device Flow | server.js:35-94 | ❌ | ❌ | ❌ |
| UC14: Polling | server.js:97-158 | ❌ | ❌ | ❌ |
| UC15: Get Token | server.js:120-128 | ❌ | ❌ | ❌ |
| UC16: Get UserInfo | server.js:161-174 | ❌ | ❌ | ❌ |
| UC17: Logout Device | server.js:202-249 | ❌ | ❌ | ❌ |
| UC18: Status Check | server.js:178-199 | ❌ | ⚠️ | ❌ |
| UC19: Open Browser | server.js:252-259 | ❌ | ❌ | ❌ |

**Légende:**
- ✅ : Tests existants et fonctionnels
- ⚠️ : Tests partiels (seulement check HTTP status)
- ❌ : Aucun test

---

## Conclusion

**19 Use Cases identifiés**
**Couverture actuelle:** ~10% (tests basiques endpoints HTTP)
**Couverture cible:** 80%+ (tests unitaires + intégration + E2E)
