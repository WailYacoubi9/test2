/**
 * Jest Setup File
 * Configuration et mocks globaux pour tous les tests
 */

// Augmenter timeout pour tests d'intégration
jest.setTimeout(10000);

// Mock variables d'environnement
process.env.KEYCLOAK_URL = process.env.KEYCLOAK_URL || 'http://localhost:8080';
process.env.KEYCLOAK_REALM = process.env.KEYCLOAK_REALM || 'projetcis';
process.env.CLIENT_ID = process.env.CLIENT_ID || 'webapp';
process.env.CLIENT_SECRET = process.env.CLIENT_SECRET || '';
process.env.REDIRECT_URI = process.env.REDIRECT_URI || 'https://localhost:3000/auth/callback';
process.env.SESSION_SECRET = process.env.SESSION_SECRET || 'test-secret-key-for-testing';
process.env.PORT = process.env.PORT || '3000';
process.env.REALM = process.env.REALM || 'projetcis';

// Supprimer warnings inutiles
const originalWarn = console.warn;
console.warn = (...args) => {
  const msg = args[0];
  if (
    typeof msg === 'string' &&
    (msg.includes('deprecated') || msg.includes('experimental'))
  ) {
    return;
  }
  originalWarn.apply(console, args);
};

// Global test utilities
global.testUtils = {
  /**
   * Crée un tokenSet mock pour les tests
   */
  createMockTokenSet: (overrides = {}) => ({
    access_token: 'mock_access_token',
    id_token: 'mock_id_token',
    refresh_token: 'mock_refresh_token',
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    ...overrides
  }),

  /**
   * Crée un userinfo mock pour les tests
   */
  createMockUserInfo: (overrides = {}) => ({
    sub: 'user123',
    preferred_username: 'testuser',
    email: 'test@example.com',
    name: 'Test User',
    email_verified: true,
    ...overrides
  }),

  /**
   * Crée une session mock pour les tests
   */
  createMockSession: (authenticated = true) => {
    if (!authenticated) {
      return {};
    }

    return {
      tokenSet: global.testUtils.createMockTokenSet(),
      userinfo: global.testUtils.createMockUserInfo(),
      codeVerifier: 'mock_code_verifier',
      state: 'mock_state'
    };
  },

  /**
   * Crée un device flow state mock
   */
  createMockDeviceFlowState: (overrides = {}) => ({
    device_code: 'mock_device_code_123',
    user_code: 'ABCD-EFGH',
    verification_uri: 'http://localhost:8080/realms/projetcis/device',
    verification_uri_complete: 'http://localhost:8080/realms/projetcis/device?user_code=ABCD-EFGH',
    expires_in: 600,
    interval: 5,
    started_at: Date.now(),
    qr_code: 'data:image/png;base64,mockQRCode',
    webapp_activation_url: 'https://localhost:3000/activate?code=ABCD-EFGH',
    ...overrides
  }),

  /**
   * Attend un certain délai (pour tests asynchrones)
   */
  sleep: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

  /**
   * Génère un code utilisateur aléatoire (format XXXX-YYYY)
   */
  generateUserCode: () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclut caractères ambigus
    const part1 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    const part2 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    return `${part1}-${part2}`;
  }
};

// Nettoyer après chaque test
afterEach(() => {
  jest.clearAllMocks();
});

// Afficher message au démarrage
console.log('🧪 Jest setup complete - Use Cases Tests');
console.log('📍 Environment:', {
  KEYCLOAK_URL: process.env.KEYCLOAK_URL,
  REALM: process.env.REALM,
  CLIENT_ID: process.env.CLIENT_ID
});
