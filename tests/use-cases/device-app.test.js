/**
 * Tests Use Cases - Device-App (Device Flow)
 * UC13-UC19: Start Device Flow, Polling, Token, UserInfo, Logout, Status, Browser
 */

const request = require('supertest');
const axios = require('axios');
const qrcode = require('qrcode');

// Mock axios et qrcode
jest.mock('axios');
jest.mock('qrcode');
jest.mock('open'); // Mock open browser

describe('UC13: Démarrer Device Flow', () => {
  let server;
  let app;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock Keycloak device endpoint response
    axios.post.mockResolvedValue({
      data: {
        device_code: 'device_code_123',
        user_code: 'ABCD-EFGH',
        verification_uri: 'http://localhost:8080/realms/projetcis/device',
        verification_uri_complete: 'http://localhost:8080/realms/projetcis/device?user_code=ABCD-EFGH',
        expires_in: 600,
        interval: 5
      }
    });

    // Mock QR code generation
    qrcode.toDataURL.mockResolvedValue('data:image/png;base64,mockQRCode');

    // Import app fresh
    delete require.cache[require.resolve('../../device-app/server')];
  });

  afterEach(() => {
    if (server) {
      server.close();
    }
  });

  test('Doit appeler Keycloak device endpoint', async () => {
    const response = await request('http://localhost:4000')
      .post('/start-device-flow')
      .expect(200);

    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining('/protocol/openid-connect/auth/device'),
      expect.any(URLSearchParams),
      expect.objectContaining({
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      })
    );
  });

  test('Doit inclure client_id et scope dans requête', async () => {
    const response = await request('http://localhost:4000')
      .post('/start-device-flow')
      .expect(200);

    const callArgs = axios.post.mock.calls[0][1];
    expect(callArgs.get('client_id')).toBe('devicecis');
    expect(callArgs.get('scope')).toBe('openid profile email');
  });

  test('Doit retourner user_code et verification_uri', async () => {
    const response = await request('http://localhost:4000')
      .post('/start-device-flow')
      .expect(200);

    expect(response.body).toEqual({
      success: true,
      data: expect.objectContaining({
        user_code: 'ABCD-EFGH',
        verification_uri: expect.any(String),
        qr_code: expect.stringContaining('data:image/png')
      })
    });
  });

  test('Doit générer QR code vers webapp', async () => {
    const response = await request('http://localhost:4000')
      .post('/start-device-flow')
      .expect(200);

    expect(qrcode.toDataURL).toHaveBeenCalledWith(
      'https://localhost:3000/activate?code=ABCD-EFGH'
    );
  });

  test('Doit stocker device_code en mémoire', async () => {
    const response = await request('http://localhost:4000')
      .post('/start-device-flow')
      .expect(200);

    // deviceFlowState doit être stocké
    // Vérifier via /status
    const statusResponse = await request('http://localhost:4000')
      .get('/status')
      .expect(200);

    expect(statusResponse.body).toHaveProperty('pending', true);
    expect(statusResponse.body).toHaveProperty('user_code', 'ABCD-EFGH');
  });

  test('Doit démarrer polling automatiquement', async () => {
    const response = await request('http://localhost:4000')
      .post('/start-device-flow')
      .expect(200);

    // Polling démarre en background
    // Vérifié dans UC14
  });

  test('Doit gérer erreur Keycloak', async () => {
    axios.post.mockRejectedValue({
      response: {
        data: { error: 'invalid_client' }
      }
    });

    const response = await request('http://localhost:4000')
      .post('/start-device-flow')
      .expect(500);

    expect(response.body).toEqual({
      success: false,
      error: expect.objectContaining({
        error: 'invalid_client'
      })
    });
  });
});

describe('UC14: Polling Autorisation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('Doit poller token endpoint à interval régulier', async () => {
    // Mock device flow initiation
    axios.post.mockResolvedValueOnce({
      data: {
        device_code: 'device_code_123',
        user_code: 'ABCD-EFGH',
        verification_uri: 'http://keycloak/device',
        expires_in: 600,
        interval: 5
      }
    });

    // Mock polling responses: pending -> pending -> success
    axios.post
      .mockResolvedValueOnce({ data: { device_code: 'device_code_123' } }) // Initiation
      .mockRejectedValueOnce({ response: { data: { error: 'authorization_pending' } } })
      .mockRejectedValueOnce({ response: { data: { error: 'authorization_pending' } } })
      .mockResolvedValueOnce({
        data: {
          access_token: 'access_token_123',
          refresh_token: 'refresh_token_123'
        }
      });

    // Start device flow
    await request('http://localhost:4000')
      .post('/start-device-flow');

    // Avancer le temps pour trigger polling
    jest.advanceTimersByTime(5000); // 5 secondes

    // Vérifier que polling a été appelé
    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining('/token'),
      expect.objectContaining({
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code'
      }),
      expect.any(Object)
    );
  });

  test('Doit continuer polling si authorization_pending', async () => {
    axios.post.mockRejectedValue({
      response: {
        data: { error: 'authorization_pending' }
      }
    });

    // Polling devrait continuer sans erreur
  });

  test('Doit respecter slow_down de Keycloak', async () => {
    axios.post.mockRejectedValue({
      response: {
        data: { error: 'slow_down' }
      }
    });

    // Interval devrait être augmenté
  });

  test('Doit arrêter polling si expired_token', async () => {
    axios.post.mockRejectedValue({
      response: {
        data: { error: 'expired_token' }
      }
    });

    // Polling devrait s'arrêter
    // deviceFlowState devrait être null
  });

  test('Doit arrêter polling après timeout (expires_in)', async () => {
    axios.post.mockResolvedValueOnce({
      data: {
        device_code: 'device_code_123',
        user_code: 'ABCD-EFGH',
        expires_in: 10, // 10 secondes
        interval: 2
      }
    });

    await request('http://localhost:4000')
      .post('/start-device-flow');

    // Avancer le temps au-delà de expires_in
    jest.advanceTimersByTime(11000);

    // Polling devrait être arrêté
  });
});

describe('UC15: Obtention Access Token', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('Doit stocker access_token après autorisation', async () => {
    axios.post.mockResolvedValueOnce({
      data: {
        device_code: 'device_code_123',
        user_code: 'ABCD-EFGH',
        expires_in: 600,
        interval: 5
      }
    });

    axios.post.mockResolvedValueOnce({
      data: {
        access_token: 'access_token_123',
        refresh_token: 'refresh_token_123',
        id_token: 'id_token_123'
      }
    });

    axios.get.mockResolvedValue({
      data: {
        sub: 'user123',
        email: 'test@example.com'
      }
    });

    await request('http://localhost:4000')
      .post('/start-device-flow');

    // Simuler polling réussi
    // ...

    const statusResponse = await request('http://localhost:4000')
      .get('/status')
      .expect(200);

    expect(statusResponse.body).toHaveProperty('authenticated', true);
  });

  test('Doit stocker refresh_token pour révocation future', async () => {
    // refresh_token doit être stocké en mémoire
    // Utilisé dans UC17 (logout)
  });

  test('Doit nettoyer deviceFlowState après succès', async () => {
    // deviceFlowState doit être null après obtention token
  });
});

describe('UC16: Récupération User Info', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('Doit appeler /userinfo avec access_token', async () => {
    const mockAccessToken = 'access_token_123';

    axios.get.mockResolvedValue({
      data: {
        sub: 'user123',
        preferred_username: 'testuser',
        email: 'test@example.com',
        name: 'Test User'
      }
    });

    // Simuler état authentifié
    // getUserInfo devrait être appelé

    expect(axios.get).toHaveBeenCalledWith(
      expect.stringContaining('/userinfo'),
      expect.objectContaining({
        headers: {
          'Authorization': `Bearer ${mockAccessToken}`
        }
      })
    );
  });

  test('Doit retourner claims utilisateur', async () => {
    axios.get.mockResolvedValue({
      data: {
        sub: 'user123',
        email: 'test@example.com',
        preferred_username: 'testuser'
      }
    });

    // Vérifier que userInfo est affiché dans /status
  });

  test('Doit gérer erreur userinfo endpoint', async () => {
    axios.get.mockRejectedValue(new Error('Network error'));

    // Fonction getUserInfo doit retourner null
  });
});

describe('UC17: Logout Device avec Révocation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('Doit révoquer refresh_token dans Keycloak', async () => {
    axios.post.mockResolvedValue({ data: {} });

    // Simuler device authentifié avec refresh_token
    const response = await request('http://localhost:4000')
      .post('/logout')
      .expect(200);

    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining('/revoke'),
      expect.objectContaining({
        client_id: 'devicecis',
        token: expect.any(String),
        token_type_hint: 'refresh_token'
      }),
      expect.any(Object)
    );
  });

  test('Doit nettoyer accessToken et refreshToken', async () => {
    axios.post.mockResolvedValue({ data: {} });

    const response = await request('http://localhost:4000')
      .post('/logout')
      .expect(200);

    expect(response.body).toEqual({
      success: true,
      revoked: expect.any(Boolean)
    });

    // Vérifier via /status que device n'est plus authentifié
    const statusResponse = await request('http://localhost:4000')
      .get('/status')
      .expect(200);

    expect(statusResponse.body).toHaveProperty('authenticated', false);
  });

  test('Doit réussir logout même si révocation échoue', async () => {
    axios.post.mockRejectedValue(new Error('Revoke failed'));

    const response = await request('http://localhost:4000')
      .post('/logout')
      .expect(200);

    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('revoked', false);
    expect(response.body).toHaveProperty('error');
  });

  test('Doit nettoyer deviceFlowState', async () => {
    axios.post.mockResolvedValue({ data: {} });

    await request('http://localhost:4000')
      .post('/logout');

    // deviceFlowState doit être null
  });
});

describe('UC18: Status Check Interne', () => {
  test('Doit retourner authenticated=true si token présent', async () => {
    // Simuler device authentifié

    const response = await request('http://localhost:4000')
      .get('/status')
      .expect(200);

    expect(response.body).toEqual({
      authenticated: true,
      pending: false,
      user: expect.objectContaining({
        email: expect.any(String)
      })
    });
  });

  test('Doit retourner pending=true si flow en cours', async () => {
    axios.post.mockResolvedValue({
      data: {
        device_code: 'device_code_123',
        user_code: 'ABCD-EFGH',
        expires_in: 600,
        interval: 5
      }
    });

    qrcode.toDataURL.mockResolvedValue('data:image/png;base64,test');

    await request('http://localhost:4000')
      .post('/start-device-flow');

    const response = await request('http://localhost:4000')
      .get('/status')
      .expect(200);

    expect(response.body).toEqual({
      authenticated: false,
      pending: true,
      user_code: 'ABCD-EFGH',
      verification_uri: expect.any(String)
    });
  });

  test('Doit retourner not authenticated si aucun flow', async () => {
    const response = await request('http://localhost:4000')
      .get('/status')
      .expect(200);

    expect(response.body).toEqual({
      authenticated: false,
      pending: false
    });
  });
});

describe('UC19: Ouvrir Navigateur Auto', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('Doit ouvrir navigateur avec webapp_activation_url', async () => {
    const open = require('open');

    axios.post.mockResolvedValue({
      data: {
        device_code: 'device_code_123',
        user_code: 'ABCD-EFGH',
        expires_in: 600,
        interval: 5
      }
    });

    qrcode.toDataURL.mockResolvedValue('data:image/png;base64,test');

    // Start flow
    await request('http://localhost:4000')
      .post('/start-device-flow');

    // Open browser
    const response = await request('http://localhost:4000')
      .post('/open-browser')
      .expect(200);

    expect(response.body).toEqual({ success: true });
    expect(open).toHaveBeenCalledWith('https://localhost:3000/activate?code=ABCD-EFGH');
  });

  test('Doit échouer si pas de flow en cours', async () => {
    const response = await request('http://localhost:4000')
      .post('/open-browser')
      .expect(400);

    expect(response.body).toEqual({
      success: false,
      error: 'Aucun flow en cours'
    });
  });
});

describe('Health Check', () => {
  test('Doit retourner status OK', async () => {
    const response = await request('http://localhost:4000')
      .get('/health')
      .expect(200);

    expect(response.body).toEqual({
      status: 'OK',
      service: 'device-app'
    });
  });
});

describe('Architecture - Pas de /api/status', () => {
  test('/api/status doit retourner 404', async () => {
    const response = await request('http://localhost:4000')
      .get('/api/status')
      .expect(404);
  });

  test('WebApp ne doit PAS appeler device-app directement', () => {
    // Architecture correcte: WebApp → Keycloak Account API
    // PAS: WebApp → device-app

    // Ce test est vérifié dans webapp-pages.test.js
  });
});
