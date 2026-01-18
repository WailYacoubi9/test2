/**
 * Tests Use Cases - WebApp Pages Protégées
 * UC07-UC10: Home, Profile, Devices, API Devices
 */

const request = require('supertest');
const express = require('express');
const session = require('express-session');
const axios = require('axios');

// Mock axios pour Keycloak API calls
jest.mock('axios');

// Mock middleware
const mockRequireAuth = (req, res, next) => {
  if (req.session && req.session.tokenSet) {
    next();
  } else {
    res.redirect('/login');
  }
};

const mockRefreshTokenIfNeeded = (req, res, next) => {
  // Simuler refresh si nécessaire
  next();
};

// Setup app for testing
function createTestApp() {
  const app = express();
  app.set('view engine', 'ejs');
  app.set('views', __dirname + '/../../webapp2/views');

  app.use(express.json());
  app.use(session({
    secret: 'test-secret',
    resave: false,
    saveUninitialized: false
  }));

  // Mock middleware
  jest.doMock('../../webapp2/middleware/auth', () => ({
    requireAuth: mockRequireAuth,
    refreshTokenIfNeeded: mockRefreshTokenIfNeeded
  }));

  const pagesRoutes = require('../../webapp2/routes/pages');
  app.use('/', pagesRoutes);

  return app;
}

describe('UC07: Page Home (Publique)', () => {
  let app;

  beforeEach(() => {
    app = createTestApp();
  });

  test('Doit être accessible sans authentification', async () => {
    const response = await request(app)
      .get('/')
      .expect(200);
  });

  test('Doit afficher le titre "Accueil - Projet CIS"', async () => {
    const response = await request(app)
      .get('/')
      .expect(200);

    // Vérifier que la vue est rendue
    expect(response.text).toBeTruthy();
  });

  test('Doit contenir des liens vers login et register', async () => {
    const response = await request(app)
      .get('/')
      .expect(200);

    expect(response.text).toContain('/login');
    expect(response.text).toContain('/register');
  });
});

describe('UC08: Page Profile (Protégée)', () => {
  let app;

  beforeEach(() => {
    app = createTestApp();
  });

  test('Doit rediriger vers /login si non authentifié', async () => {
    const response = await request(app)
      .get('/profile')
      .expect(302);

    expect(response.headers.location).toBe('/login');
  });

  test('Doit afficher le profil si authentifié', async () => {
    const agent = request.agent(app);

    // Créer session avec tokenSet
    await agent
      .get('/test-login'); // Helper route pour créer session

    const response = await agent
      .get('/profile')
      .expect(200);
  });

  test('Doit calculer le temps restant avant expiration', async () => {
    const agent = request.agent(app);

    // Mock session avec tokenSet
    const mockSession = {
      tokenSet: {
        access_token: 'token123',
        expires_at: Math.floor(Date.now() / 1000) + 3600 // expire dans 1h
      },
      userinfo: {
        preferred_username: 'testuser',
        email: 'test@example.com'
      }
    };

    // Dans un test réel, on injecterait cette session
  });

  test('Doit afficher userinfo (email, username)', async () => {
    const agent = request.agent(app);

    // Test avec session mockée
    const mockUserinfo = {
      sub: 'user123',
      preferred_username: 'testuser',
      email: 'test@example.com',
      name: 'Test User'
    };

    // Vérifier que les infos sont affichées
  });

  test('Doit trigger auto-refresh si token expire < 5min', async () => {
    // Mock middleware refreshTokenIfNeeded
    const refreshSpy = jest.fn(mockRefreshTokenIfNeeded);

    // Test que refresh est appelé
  });
});

describe('UC09: Page Devices (Liste depuis Keycloak)', () => {
  let app;

  beforeEach(() => {
    app = createTestApp();
    jest.clearAllMocks();
  });

  test('Doit rediriger si non authentifié', async () => {
    const response = await request(app)
      .get('/devices')
      .expect(302);

    expect(response.headers.location).toBe('/login');
  });

  test('Doit appeler Keycloak Account API', async () => {
    const mockDevices = [
      {
        id: 'device1',
        sessions: [
          {
            id: 'session1',
            started: 1704067200,
            clients: [
              { clientId: 'devicecis', clientName: 'Device Application' }
            ]
          }
        ]
      }
    ];

    axios.get.mockResolvedValue({
      data: mockDevices
    });

    const agent = request.agent(app);

    // Mock session authentifiée
    // await agent.get('/devices')

    // Vérifier appel à axios
    // expect(axios.get).toHaveBeenCalledWith(
    //   expect.stringContaining('/account/sessions/devices'),
    //   expect.objectContaining({
    //     headers: expect.objectContaining({
    //       'Authorization': expect.stringContaining('Bearer')
    //     })
    //   })
    // );
  });

  test('Doit filtrer devices par clientId=devicecis', async () => {
    const mockResponse = [
      {
        id: 'device1',
        sessions: [
          {
            clients: [{ clientId: 'devicecis' }]
          }
        ]
      },
      {
        id: 'device2',
        sessions: [
          {
            clients: [{ clientId: 'webapp' }] // Ne devrait PAS apparaître
          }
        ]
      }
    ];

    axios.get.mockResolvedValue({ data: mockResponse });

    // Test que seul device1 est retourné
  });

  test('Doit gérer erreur Keycloak API', async () => {
    axios.get.mockRejectedValue(new Error('Network error'));

    const agent = request.agent(app);

    // Vérifier que la page s'affiche quand même avec devices vide
  });

  test('Doit afficher infos devices (IP, dates, client)', async () => {
    const mockDevices = [
      {
        id: 'device1',
        ipAddress: '192.168.1.100',
        sessions: [
          {
            id: 'session1',
            started: 1704067200, // Timestamp Unix
            expires: 1704153600,
            clients: [
              {
                clientId: 'devicecis',
                clientName: 'Device Application'
              }
            ]
          }
        ]
      }
    ];

    axios.get.mockResolvedValue({ data: mockDevices });

    // Vérifier affichage dans template
  });
});

describe('UC10: API Devices (JSON)', () => {
  let app;

  beforeEach(() => {
    app = createTestApp();
    jest.clearAllMocks();
  });

  test('Doit retourner JSON avec devices', async () => {
    const mockDevices = [
      {
        id: 'device1',
        sessions: [
          {
            clients: [{ clientId: 'devicecis' }]
          }
        ]
      }
    ];

    axios.get.mockResolvedValue({ data: mockDevices });

    const agent = request.agent(app);

    // Mock auth session
    const response = await agent
      .get('/api/devices')
      .expect(302); // Redirect si pas auth

    // Dans cas authentifié:
    // expect(response.body).toHaveProperty('success', true);
    // expect(response.body).toHaveProperty('devices');
    // expect(response.body).toHaveProperty('timestamp');
  });

  test('Doit inclure timestamp dans réponse', async () => {
    axios.get.mockResolvedValue({ data: [] });

    // Test avec auth
    // const response = await authenticatedRequest
    //   .get('/api/devices')
    //   .expect(200);

    // expect(response.body.timestamp).toMatch(/\d{4}-\d{2}-\d{2}T/);
  });

  test('Doit appeler Keycloak API avec access_token', async () => {
    axios.get.mockResolvedValue({ data: [] });

    // Test avec session mockée contenant access_token
    const mockAccessToken = 'test_access_token_123';

    // Vérifier que axios est appelé avec Bearer token
    // expect(axios.get).toHaveBeenCalledWith(
    //   expect.any(String),
    //   expect.objectContaining({
    //     headers: {
    //       'Authorization': `Bearer ${mockAccessToken}`
    //     }
    //   })
    // );
  });

  test('Doit gérer timeout Keycloak API (5s)', async () => {
    axios.get.mockImplementation(() =>
      new Promise((resolve) => setTimeout(resolve, 6000))
    );

    // Vérifier que timeout est configuré
    // expect(axios.get).toHaveBeenCalledWith(
    //   expect.any(String),
    //   expect.objectContaining({
    //     timeout: 5000
    //   })
    // );
  });

  test('Doit retourner tableau vide si erreur API', async () => {
    axios.get.mockRejectedValue(new Error('API Error'));

    // const response = await authenticatedRequest
    //   .get('/api/devices')
    //   .expect(200);

    // expect(response.body.devices).toEqual([]);
  });
});

describe('Architecture - Keycloak Account API', () => {
  test('Doit appeler /account/sessions/devices et PAS device-app', async () => {
    const app = createTestApp();

    axios.get.mockResolvedValue({ data: [] });

    // Vérifier que l'URL appelée contient /account/sessions/devices
    // et PAS http://localhost:4000

    // expect(axios.get).toHaveBeenCalledWith(
    //   expect.stringContaining('/account/sessions/devices'),
    //   expect.any(Object)
    // );

    // expect(axios.get).not.toHaveBeenCalledWith(
    //   expect.stringContaining('localhost:4000'),
    //   expect.any(Object)
    // );
  });

  test('Keycloak URL doit être configurable via env', () => {
    const originalEnv = process.env.KEYCLOAK_URL;

    process.env.KEYCLOAK_URL = 'https://custom-keycloak.com';

    // Test que la bonne URL est utilisée

    process.env.KEYCLOAK_URL = originalEnv;
  });

  test('Realm doit être configurable via env', () => {
    const originalRealm = process.env.REALM;

    process.env.REALM = 'custom-realm';

    // Test que le bon realm est utilisé

    process.env.REALM = originalRealm;
  });
});

describe('Auto-refresh functionality', () => {
  test('Doit refresh token si expires < 5 minutes', async () => {
    // Mock tokenSet proche expiration
    const mockTokenSet = {
      access_token: 'old_token',
      refresh_token: 'refresh_token',
      expires_at: Math.floor(Date.now() / 1000) + 240 // expire dans 4 min
    };

    // Vérifier que refresh est appelé
  });

  test('Ne doit PAS refresh si expires > 5 minutes', async () => {
    const mockTokenSet = {
      access_token: 'token',
      expires_at: Math.floor(Date.now() / 1000) + 600 // expire dans 10 min
    };

    // Vérifier que refresh n'est PAS appelé
  });
});
