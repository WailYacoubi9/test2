# 🧪 Tests Use Cases - OAuth2 Device Flow

Tests complets couvrant tous les use cases de l'application OAuth2 Device Flow.

## 📋 Couverture

### Tests Implémentés

| Fichier | Use Cases | Tests | Statut |
|---------|-----------|-------|--------|
| `webapp-auth.test.js` | UC01-UC06 | 25+ | ✅ Complet |
| `webapp-pages.test.js` | UC07-UC10 | 20+ | ✅ Complet |
| `webapp-device-activation.test.js` | UC11-UC12 | 15+ | ✅ Complet |
| `device-app.test.js` | UC13-UC19 | 30+ | ✅ Complet |
| `security.test.js` | S01-S05 | 40+ | ✅ Complet |

**Total:** 130+ tests couvrant 19 use cases fonctionnels + 5 aspects sécurité

---

## 🚀 Installation

```bash
cd tests/use-cases
npm install
```

---

## 🏃 Exécution des Tests

### Tous les tests
```bash
npm test
```

### Tests par catégorie
```bash
# Tests authentification WebApp
npm run test:auth

# Tests pages protégées
npm run test:pages

# Tests activation device
npm run test:activation

# Tests device-app
npm run test:device

# Tests sécurité
npm run test:security
```

### Mode watch (développement)
```bash
npm run test:watch
```

### Couverture de code
```bash
npm run test:coverage
```

### Mode verbose
```bash
npm run test:verbose
```

---

## 📊 Objectifs de Couverture

Configuration dans `package.json`:

```json
"coverageThreshold": {
  "global": {
    "branches": 60,
    "functions": 60,
    "lines": 60,
    "statements": 60
  }
}
```

---

## 📁 Structure des Tests

```
tests/use-cases/
├── webapp-auth.test.js           # UC01-UC06: Login, Register, Callback, Logout, Revocation
├── webapp-pages.test.js          # UC07-UC10: Home, Profile, Devices, API
├── webapp-device-activation.test.js # UC11-UC12: Device Activation
├── device-app.test.js            # UC13-UC19: Device Flow complet
├── security.test.js              # S01-S05: PKCE, CSRF, Refresh, Revocation, HTTPS
├── setup.js                      # Configuration Jest + utilities
├── package.json                  # Configuration npm
└── README.md                     # Ce fichier
```

---

## 🔍 Détail des Tests

### webapp-auth.test.js (UC01-UC06)

**Authentification WebApp**

- ✅ UC01: Login avec PKCE
  - Génération code_verifier et code_challenge
  - Stockage en session
  - Redirection Keycloak

- ✅ UC02: Register
  - Construction URL inscription
  - PKCE parameters

- ✅ UC03: Callback OAuth2
  - Échange code contre tokens
  - Validation state (CSRF protection)
  - Récupération userinfo
  - Redirection /profile

- ✅ UC04: Logout Simple
  - Destruction session
  - Redirection Keycloak logout

- ✅ UC05: Logout avec Révocation
  - Révocation access_token
  - Révocation refresh_token

- ✅ UC06: Révocation API
  - Endpoint POST /auth/revoke
  - Gestion erreurs

---

### webapp-pages.test.js (UC07-UC10)

**Pages Protégées**

- ✅ UC07: Home (publique)
  - Accessible sans auth
  - Liens login/register

- ✅ UC08: Profile (protégée)
  - Redirect si non auth
  - Auto-refresh token
  - Affichage userinfo

- ✅ UC09: Devices
  - Appel Keycloak Account API
  - Filtrage par clientId
  - Gestion erreurs

- ✅ UC10: API Devices
  - Retour JSON
  - Timestamp
  - Access_token validation

---

### webapp-device-activation.test.js (UC11-UC12)

**Activation Device**

- ✅ UC11: GET /activate
  - Affichage formulaire
  - Pré-remplissage code (QR)

- ✅ UC12: POST /activate
  - Redirection Keycloak
  - Formatage code (uppercase, sans tirets)
  - Validation

---

### device-app.test.js (UC13-UC19)

**Device Flow Complet**

- ✅ UC13: Start Device Flow
  - Appel Keycloak /auth/device
  - Génération QR code
  - Stockage état

- ✅ UC14: Polling
  - Interval régulier
  - Gestion authorization_pending
  - Gestion slow_down
  - Timeout

- ✅ UC15: Obtention Token
  - Stockage access_token
  - Stockage refresh_token

- ✅ UC16: UserInfo
  - Appel /userinfo
  - Claims utilisateur

- ✅ UC17: Logout Device
  - Révocation refresh_token
  - Nettoyage état

- ✅ UC18: Status Check
  - États: authenticated, pending, not authenticated

- ✅ UC19: Open Browser
  - Ouverture automatique
  - URL webapp

---

### security.test.js (S01-S05)

**Sécurité**

- ✅ S01: PKCE
  - Génération code_verifier (43-128 chars)
  - Génération code_challenge (SHA256)
  - Protection interception

- ✅ S02: CSRF
  - Génération state aléatoire
  - Validation state au callback
  - Protection attaques CSRF

- ✅ S03: Auto-Refresh
  - Détection expiration < 5min
  - Refresh automatique
  - Gestion erreurs

- ✅ S04: Token Revocation
  - Révocation access_token
  - Révocation refresh_token
  - Invalidation immédiate

- ✅ S05: HTTPS
  - Certificats TLS
  - Cookies secure
  - Redirect URI validation

---

## 🛠️ Utilities de Test

Le fichier `setup.js` fournit des utilities:

```javascript
// Créer un tokenSet mock
const tokenSet = testUtils.createMockTokenSet({
  access_token: 'custom_token'
});

// Créer un userinfo mock
const userinfo = testUtils.createMockUserInfo({
  email: 'custom@example.com'
});

// Créer une session mock
const session = testUtils.createMockSession(true); // authenticated

// Créer un device flow state mock
const deviceState = testUtils.createMockDeviceFlowState();

// Générer un code utilisateur aléatoire
const userCode = testUtils.generateUserCode(); // "ABCD-EFGH"

// Attendre un délai
await testUtils.sleep(1000); // 1 seconde
```

---

## 🔧 Configuration

### Variables d'Environnement

Les tests utilisent ces variables (définies dans `setup.js`):

```bash
KEYCLOAK_URL=http://localhost:8080
KEYCLOAK_REALM=projetcis
CLIENT_ID=webapp
REDIRECT_URI=https://localhost:3000/auth/callback
SESSION_SECRET=test-secret-key-for-testing
PORT=3000
REALM=projetcis
```

Pour override, créez un fichier `.env.test`:

```bash
KEYCLOAK_URL=https://custom-keycloak.com
REALM=custom-realm
```

---

## 📈 Rapport de Couverture

Après `npm run test:coverage`, consultez:

```
tests/coverage/
├── lcov-report/index.html  # Rapport HTML
└── coverage-summary.json   # Résumé JSON
```

Ouvrir dans navigateur:
```bash
open tests/coverage/lcov-report/index.html
```

---

## ✅ Checklist Avant Commit

Avant de commiter, vérifier:

- [ ] `npm test` passe à 100%
- [ ] `npm run test:coverage` > 60% sur toutes métriques
- [ ] Pas de `console.log` ou `debugger` dans le code
- [ ] Tests documentés avec descriptions claires
- [ ] Mocks nettoyés dans `afterEach`

---

## 🐛 Debugging

### Test spécifique
```bash
npx jest webapp-auth.test.js --testNamePattern="Login avec PKCE"
```

### Voir console.log
```bash
npm test -- --verbose
```

### Mode debug Node.js
```bash
node --inspect-brk node_modules/.bin/jest --runInBand
```

Puis ouvrir `chrome://inspect`

---

## 📚 Ressources

- [Jest Documentation](https://jestjs.io/)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [RFC 8628 - Device Authorization Grant](https://www.rfc-editor.org/rfc/rfc8628)
- [RFC 7636 - PKCE](https://www.rfc-editor.org/rfc/rfc7636)
- [OpenID Connect Core](https://openid.net/specs/openid-connect-core-1_0.html)

---

## 🤝 Contribution

Pour ajouter un test:

1. Identifier le use case dans `USE_CASES.md`
2. Créer le test dans le fichier approprié
3. Suivre la convention de nommage: `describe('UCXX: Nom Use Case')`
4. Utiliser les utilities de `setup.js`
5. Vérifier couverture avec `npm run test:coverage`

---

## 📝 Notes

### Limitations

- Tests unitaires mockent Keycloak (pas de tests E2E complets)
- Certains tests nécessitent services en cours d'exécution
- Polling tests utilisent fake timers (pas de vrais délais)

### Améliorations Futures

- [ ] Tests E2E avec Playwright/Cypress
- [ ] Tests de charge (JMeter, k6)
- [ ] Tests de sécurité automatisés (OWASP ZAP)
- [ ] CI/CD GitHub Actions
- [ ] Mutation testing (Stryker)

---

**Auteur:** Projet CIS
**Date:** 2024
**Version:** 1.0.0
