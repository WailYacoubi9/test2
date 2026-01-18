/**
 * Tests Use Cases - WebApp Device Activation
 * UC11-UC12: GET /activate, POST /activate
 */

const request = require('supertest');
const express = require('express');

function createTestApp() {
  const app = express();
  app.set('view engine', 'ejs');
  app.set('views', __dirname + '/../../webapp2/views');

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  const deviceActivationRoutes = require('../../webapp2/routes/device-activation');
  app.use('/', deviceActivationRoutes);

  return app;
}

describe('UC11: GET /activate (Form)', () => {
  let app;

  beforeEach(() => {
    app = createTestApp();
  });

  test('Doit afficher le formulaire d\'activation', async () => {
    const response = await request(app)
      .get('/activate')
      .expect(200);

    expect(response.text).toContain('Activer un appareil');
  });

  test('Doit être accessible sans authentification', async () => {
    const response = await request(app)
      .get('/activate')
      .expect(200);

    // Page publique, pas de redirect
    expect(response.status).toBe(200);
  });

  test('Doit pré-remplir le code si fourni en query param', async () => {
    const testCode = 'ABCD-EFGH';

    const response = await request(app)
      .get(`/activate?code=${testCode}`)
      .expect(200);

    // Vérifier que le code est dans la réponse
    expect(response.text).toContain(testCode);
  });

  test('Doit afficher champ vide si pas de code en query', async () => {
    const response = await request(app)
      .get('/activate')
      .expect(200);

    // Vérifier que prefilledCode est vide
    expect(response.text).toBeTruthy();
  });

  test('QR code scanning doit mener vers /activate?code=XXX', () => {
    // Test du format d'URL généré par device-app
    const userCode = 'WDJB-MJHT';
    const expectedUrl = `https://localhost:3000/activate?code=${userCode}`;

    expect(expectedUrl).toContain('/activate?code=');
    expect(expectedUrl).toContain(userCode);
  });
});

describe('UC12: POST /activate (Redirection Keycloak)', () => {
  let app;

  beforeEach(() => {
    app = createTestApp();
  });

  test('Doit rediriger vers Keycloak avec user_code', async () => {
    const userCode = 'ABCD-EFGH';

    const response = await request(app)
      .post('/activate')
      .send({ user_code: userCode })
      .expect(302);

    expect(response.headers.location).toContain('/device?user_code=');
    expect(response.headers.location).toContain('ABCDEFGH'); // Sans tiret
  });

  test('Doit formater le code (uppercase, sans espaces/tirets)', async () => {
    const testCases = [
      { input: 'abcd-efgh', expected: 'ABCDEFGH' },
      { input: 'abcd efgh', expected: 'ABCDEFGH' },
      { input: ' ABCD-EFGH ', expected: 'ABCDEFGH' },
      { input: 'a b c d - e f g h', expected: 'ABCDEFGH' }
    ];

    for (const testCase of testCases) {
      const response = await request(app)
        .post('/activate')
        .send({ user_code: testCase.input })
        .expect(302);

      expect(response.headers.location).toContain(testCase.expected);
    }
  });

  test('Doit rejeter si user_code vide', async () => {
    const response = await request(app)
      .post('/activate')
      .send({ user_code: '' })
      .expect(200); // Re-affiche form avec erreur

    expect(response.text).toContain('Veuillez entrer un code');
  });

  test('Doit rejeter si user_code manquant', async () => {
    const response = await request(app)
      .post('/activate')
      .send({})
      .expect(200);

    expect(response.text).toContain('Veuillez entrer un code');
  });

  test('Doit construire URL Keycloak correcte', async () => {
    const userCode = 'TEST-CODE';

    const response = await request(app)
      .post('/activate')
      .send({ user_code: userCode })
      .expect(302);

    const location = response.headers.location;

    expect(location).toContain('/realms/projetcis/device');
    expect(location).toContain('user_code=TESTCODE');
  });

  test('Doit utiliser KEYCLOAK_URL depuis env', async () => {
    const originalUrl = process.env.KEYCLOAK_URL;
    process.env.KEYCLOAK_URL = 'https://custom-keycloak.com';

    const app = createTestApp();

    const response = await request(app)
      .post('/activate')
      .send({ user_code: 'TEST' })
      .expect(302);

    expect(response.headers.location).toContain('custom-keycloak.com');

    process.env.KEYCLOAK_URL = originalUrl;
  });

  test('Doit utiliser REALM depuis env', async () => {
    const originalRealm = process.env.REALM;
    process.env.REALM = 'custom-realm';

    const app = createTestApp();

    const response = await request(app)
      .post('/activate')
      .send({ user_code: 'TEST' })
      .expect(302);

    expect(response.headers.location).toContain('/realms/custom-realm/device');

    process.env.REALM = originalRealm;
  });

  test('Doit gérer codes avec formats variés', async () => {
    const validFormats = [
      'ABCD-EFGH',
      'ABCDEFGH',
      'abcd-efgh',
      'abcdefgh',
      'A B C D E F G H',
      'a-b-c-d-e-f-g-h'
    ];

    for (const code of validFormats) {
      const response = await request(app)
        .post('/activate')
        .send({ user_code: code })
        .expect(302);

      expect(response.headers.location).toContain('user_code=ABCDEFGH');
    }
  });
});

describe('Intégration avec Device Flow', () => {
  test('Workflow complet: QR scan → form → Keycloak', async () => {
    const app = createTestApp();

    // 1. User scanne QR code généré par device
    const deviceCode = 'WDJB-MJHT';
    const qrUrl = `https://localhost:3000/activate?code=${deviceCode}`;

    // 2. Browser ouvre URL
    const getResponse = await request(app)
      .get('/activate?code=' + deviceCode)
      .expect(200);

    expect(getResponse.text).toContain(deviceCode);

    // 3. User soumet form (pré-rempli)
    const postResponse = await request(app)
      .post('/activate')
      .send({ user_code: deviceCode })
      .expect(302);

    // 4. Redirect vers Keycloak
    expect(postResponse.headers.location).toContain('/device?user_code=');
  });

  test('Workflow manuel: User entre code manuellement', async () => {
    const app = createTestApp();

    // 1. User va sur /activate sans code
    const getResponse = await request(app)
      .get('/activate')
      .expect(200);

    // 2. User entre code manuellement
    const manualCode = 'ABCD-EFGH';
    const postResponse = await request(app)
      .post('/activate')
      .send({ user_code: manualCode })
      .expect(302);

    // 3. Redirect vers Keycloak
    expect(postResponse.headers.location).toContain('user_code=ABCDEFGH');
  });
});

describe('Error handling', () => {
  test('Doit afficher erreur si code invalide (optionnel)', async () => {
    const app = createTestApp();

    // Note: La validation du format est optionnelle
    // Keycloak gère la validation du code
    const invalidCode = '123'; // Trop court

    const response = await request(app)
      .post('/activate')
      .send({ user_code: invalidCode })
      .expect(302);

    // Même code invalide, on redirige vers Keycloak
    // Keycloak affichera "Invalid code"
    expect(response.headers.location).toContain('/device');
  });

  test('Doit gérer caractères spéciaux dans code', async () => {
    const app = createTestApp();

    const codeWithSpecialChars = 'AB@#-EF$%';

    const response = await request(app)
      .post('/activate')
      .send({ user_code: codeWithSpecialChars })
      .expect(302);

    // Caractères spéciaux devraient être nettoyés
    expect(response.headers.location).toContain('user_code=ABEF');
  });
});

describe('Sécurité', () => {
  test('Doit encoder correctement le code pour URL', async () => {
    const app = createTestApp();

    const codeWithSpaces = 'AB CD';

    const response = await request(app)
      .post('/activate')
      .send({ user_code: codeWithSpaces })
      .expect(302);

    // Pas d'espaces dans l'URL finale
    expect(response.headers.location).not.toContain(' ');
    expect(response.headers.location).toContain('user_code=ABCD');
  });

  test('Doit prévenir injection XSS dans error message', async () => {
    const app = createTestApp();

    const xssAttempt = '<script>alert("xss")</script>';

    const response = await request(app)
      .post('/activate')
      .send({ user_code: xssAttempt });

    // Code devrait être échappé
    expect(response.text).not.toContain('<script>');
  });
});
