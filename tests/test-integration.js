#!/usr/bin/env node

/**
 * Tests d'intégration pour OAuth2 Device Flow
 *
 * Usage: node tests/test-integration.js
 *
 * Prérequis:
 * - Keycloak lancé sur http://localhost:8080
 * - WebApp lancée sur https://localhost:3000
 * - Device-app lancée sur http://localhost:4000
 */

const axios = require('axios');
const https = require('https');

// Configuration
const KEYCLOAK_URL = 'http://localhost:8080';
const WEBAPP_URL = 'https://localhost:3000';
const DEVICE_URL = 'http://localhost:4000';
const REALM = 'projetcis';

// Ignorer les certificats self-signed
const httpsAgent = new https.Agent({
  rejectUnauthorized: false
});

// Couleurs pour console
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

let passedTests = 0;
let failedTests = 0;

// Helper pour afficher résultats
function logSuccess(message) {
  console.log(`${colors.green}✅ ${message}${colors.reset}`);
  passedTests++;
}

function logError(message, error) {
  console.log(`${colors.red}❌ ${message}${colors.reset}`);
  if (error) {
    console.log(`   ${colors.red}Erreur: ${error.message}${colors.reset}`);
  }
  failedTests++;
}

function logInfo(message) {
  console.log(`${colors.cyan}ℹ️  ${message}${colors.reset}`);
}

function logSection(message) {
  console.log(`\n${colors.blue}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.blue}${message}${colors.reset}`);
  console.log(`${colors.blue}${'='.repeat(60)}${colors.reset}\n`);
}

// Tests
async function runTests() {
  console.log(`${colors.cyan}
╔════════════════════════════════════════════════════════════╗
║   Tests d'intégration OAuth2 Device Flow                  ║
║   Projet CIS - Keycloak + WebApp + Device-app             ║
╚════════════════════════════════════════════════════════════╝
${colors.reset}\n`);

  // Test 1: Keycloak accessible
  logSection('TEST 1: Services disponibles');

  try {
    const response = await axios.get(`${KEYCLOAK_URL}/health/ready`, {
      timeout: 5000
    });
    logSuccess('Keycloak est accessible (GET /health/ready)');
  } catch (error) {
    // Essayer endpoint alternatif
    try {
      await axios.get(`${KEYCLOAK_URL}/realms/${REALM}/.well-known/openid-configuration`, {
        timeout: 5000
      });
      logSuccess('Keycloak est accessible (GET /.well-known/openid-configuration)');
    } catch (e) {
      logError('Keycloak non accessible', error);
    }
  }

  // Test 2: WebApp accessible
  try {
    const response = await axios.get(`${WEBAPP_URL}/`, {
      httpsAgent,
      timeout: 5000,
      maxRedirects: 0,
      validateStatus: (status) => status < 500
    });
    logSuccess(`WebApp est accessible (GET / → ${response.status})`);
  } catch (error) {
    logError('WebApp non accessible', error);
  }

  


  // Test 6: WebApp - Accès /profile sans auth → redirect
  logSection('TEST 4: WebApp - Authentification requise');

  try {
    const response = await axios.get(`${WEBAPP_URL}/profile`, {
      httpsAgent,
      timeout: 5000,
      maxRedirects: 0,
      validateStatus: (status) => status < 500
    });

    if (response.status === 302 || response.status === 301) {
      logSuccess('Accès /profile sans auth → redirect (302/301)');
      if (response.headers.location) {
        logInfo(`   Redirige vers: ${response.headers.location}`);
      }
    } else {
      logError(`/profile devrait rediriger mais retourne ${response.status}`);
    }
  } catch (error) {
    if (error.response && (error.response.status === 302 || error.response.status === 301)) {
      logSuccess('Accès /profile sans auth → redirect');
    } else {
      logError('Erreur lors du test /profile', error);
    }
  }

  // Test 7: WebApp - Page /activate accessible
  logSection('TEST 5: WebApp - Page d\'activation');

  try {
    const response = await axios.get(`${WEBAPP_URL}/activate`, {
      httpsAgent,
      timeout: 5000,
      maxRedirects: 0,
      validateStatus: (status) => status < 500
    });

    if (response.status === 200) {
      logSuccess('Page /activate accessible (GET /activate → 200)');
      if (response.data.includes('Activer un appareil')) {
        logInfo('   Page contient le titre attendu');
      }
    } else {
      logError(`/activate devrait retourner 200 mais retourne ${response.status}`);
    }
  } catch (error) {
    logError('Page /activate non accessible', error);
  }

  // Test 8: WebApp - Page /devices nécessite auth
  try {
    const response = await axios.get(`${WEBAPP_URL}/devices`, {
      httpsAgent,
      timeout: 5000,
      maxRedirects: 0,
      validateStatus: (status) => status < 500
    });

    if (response.status === 302 || response.status === 301) {
      logSuccess('Accès /devices sans auth → redirect (protection OK)');
    } else {
      logError(`/devices devrait rediriger mais retourne ${response.status}`);
    }
  } catch (error) {
    if (error.response && (error.response.status === 302 || error.response.status === 301)) {
      logSuccess('Accès /devices sans auth → redirect');
    } else {
      logError('Erreur lors du test /devices', error);
    }
  }

  // Test 9: Keycloak - Endpoint Device Flow accessible
  logSection('TEST 6: Keycloak - Endpoints OAuth2');

  try {
    const wellKnown = await axios.get(
      `${KEYCLOAK_URL}/realms/${REALM}/.well-known/openid-configuration`,
      { timeout: 5000 }
    );

    if (wellKnown.data.device_authorization_endpoint) {
      logSuccess('Keycloak Device Flow endpoint configuré');
      logInfo(`   Endpoint: ${wellKnown.data.device_authorization_endpoint}`);
    } else {
      logError('Device Flow endpoint non trouvé dans .well-known');
    }
  } catch (error) {
    logError('Erreur lors de la vérification des endpoints Keycloak', error);
  }

  // Résumé
  logSection('RÉSUMÉ DES TESTS');

  const total = passedTests + failedTests;
  const successRate = total > 0 ? ((passedTests / total) * 100).toFixed(1) : 0;

  console.log(`${colors.green}✅ Tests réussis: ${passedTests}${colors.reset}`);
  console.log(`${colors.red}❌ Tests échoués: ${failedTests}${colors.reset}`);
  console.log(`${colors.cyan}📊 Taux de réussite: ${successRate}%${colors.reset}\n`);

  if (failedTests > 0) {
    console.log(`${colors.yellow}⚠️  Certains services ne sont peut-être pas démarrés.${colors.reset}`);
    console.log(`${colors.yellow}   Vérifiez que Keycloak, WebApp et Device-app sont lancés.${colors.reset}\n`);
  } else {
    console.log(`${colors.green}🎉 Tous les tests passent ! L'architecture est correcte.${colors.reset}\n`);
  }

  // Code de sortie
  process.exit(failedTests > 0 ? 1 : 0);
}

// Lancer les tests
runTests().catch(error => {
  console.error(`${colors.red}Erreur fatale lors de l'exécution des tests:${colors.reset}`, error);
  process.exit(1);
});
