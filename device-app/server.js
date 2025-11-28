const express = require('express');
const axios = require('axios');
const qrcode = require('qrcode');
const open = require('open');
const https = require('https');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 4000;

// Configuration
const KEYCLOAK_URL = process.env.KEYCLOAK_URL || 'http://localhost:8080';  // Keycloak reste en HTTP
const REALM = process.env.KEYCLOAK_REALM || 'projetcis';
const CLIENT_ID = process.env.CLIENT_ID || 'devicecis';

// Variables pour stocker l'état du device flow
let deviceFlowState = null;
let accessToken = null;

app.set('view engine', 'ejs');
app.use(express.json());

// Page principale
app.get('/', async (req, res) => {
  res.render('device-home', {
    deviceFlowState,
    accessToken,
    keycloakUrl: KEYCLOAK_URL
  });
});

// Initier le Device Flow
app.post('/start-device-flow', async (req, res) => {
  try {
    console.log('🚀 Démarrage du Device Flow...');
    
    const deviceEndpoint = `${KEYCLOAK_URL}/realms/${REALM}/protocol/openid-connect/auth/device`;
    
    const response = await axios.post(deviceEndpoint, 
      new URLSearchParams({
        client_id: CLIENT_ID,
        scope: 'openid profile email'
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    deviceFlowState = {
      device_code: response.data.device_code,
      user_code: response.data.user_code,
      verification_uri: response.data.verification_uri,
      verification_uri_complete: response.data.verification_uri_complete,
      expires_in: response.data.expires_in,
      interval: response.data.interval || 5,
      started_at: Date.now()
    };

    // Générer le QR code qui pointe vers webapp avec le code pré-rempli
    const webappActivationUrl = `https://localhost:3000/activate?code=${deviceFlowState.user_code}`;
    const qrCodeDataUrl = await qrcode.toDataURL(webappActivationUrl);
    deviceFlowState.qr_code = qrCodeDataUrl;
    deviceFlowState.webapp_activation_url = webappActivationUrl;

    console.log('✅ Device Flow initié avec succès');
    console.log(`📱 Code utilisateur: ${deviceFlowState.user_code}`);
    console.log(`🔗 URL: ${deviceFlowState.verification_uri}`);

    // Démarrer le polling automatique
    startPolling();

    res.json({
      success: true,
      data: {
        user_code: deviceFlowState.user_code,
        verification_uri: deviceFlowState.verification_uri,
        verification_uri_complete: deviceFlowState.verification_uri_complete,
        qr_code: qrCodeDataUrl,
        expires_in: deviceFlowState.expires_in
      }
    });

  } catch (error) {
    console.error('❌ Erreur lors du démarrage du Device Flow:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: error.response?.data || error.message
    });
  }
});

// Fonction de polling pour vérifier l'autorisation
async function startPolling() {
  if (!deviceFlowState) return;

  const tokenEndpoint = `${KEYCLOAK_URL}/realms/${REALM}/protocol/openid-connect/token`;
  const interval = deviceFlowState.interval * 1000;
  
  const pollInterval = setInterval(async () => {
    try {
      console.log('🔄 Vérification de l\'autorisation...');
      
      const response = await axios.post(tokenEndpoint,
        new URLSearchParams({
          grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
          device_code: deviceFlowState.device_code,
          client_id: CLIENT_ID
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      // Autorisation réussie !
      accessToken = response.data.access_token;
      console.log('✅ Autorisation accordée ! Token obtenu.');
      
      // Récupérer les infos utilisateur
      const userInfo = await getUserInfo(accessToken);
      console.log('👤 Utilisateur connecté:', userInfo.email || userInfo.preferred_username);
      
      // Notifier la webapp si nécessaire (via webhook ou API)
      // await notifyWebApp(userInfo);
      
      // Arrêter le polling
      clearInterval(pollInterval);
      deviceFlowState = null;

    } catch (error) {
      if (error.response?.data?.error === 'authorization_pending') {
        console.log('⏳ En attente d\'autorisation...');
      } else if (error.response?.data?.error === 'slow_down') {
        console.log('⚠️ Ralentissement demandé par le serveur');
      } else if (error.response?.data?.error === 'expired_token') {
        console.log('❌ Le code a expiré');
        clearInterval(pollInterval);
        deviceFlowState = null;
      }
    }
  }, interval);

  // Arrêter le polling après expiration
  setTimeout(() => {
    if (pollInterval) {
      clearInterval(pollInterval);
      console.log('⏱️ Polling arrêté (timeout)');
      deviceFlowState = null;
    }
  }, deviceFlowState.expires_in * 1000);
}

// Récupérer les informations utilisateur
async function getUserInfo(token) {
  try {
    const userInfoEndpoint = `${KEYCLOAK_URL}/realms/${REALM}/protocol/openid-connect/userinfo`;
    const response = await axios.get(userInfoEndpoint, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Erreur lors de la récupération des infos utilisateur:', error.message);
    return null;
  }
}

// Route interne pour l'UI du device (PAS pour webapp externe)
// Cette route est utilisée par le frontend du device pour afficher son état
app.get('/status', async (req, res) => {
  if (accessToken) {
    const userInfo = await getUserInfo(accessToken);
    res.json({
      authenticated: true,
      pending: false,
      user: userInfo
    });
  } else if (deviceFlowState) {
    res.json({
      authenticated: false,
      pending: true,
      user_code: deviceFlowState.user_code,
      verification_uri: deviceFlowState.verification_uri
    });
  } else {
    res.json({
      authenticated: false,
      pending: false
    });
  }
});

// Déconnexion
app.post('/logout', (req, res) => {
  accessToken = null;
  deviceFlowState = null;
  console.log('👋 Déconnexion effectuée');
  res.json({ success: true });
});

// Ouvrir le navigateur automatiquement
app.post('/open-browser', async (req, res) => {
  if (deviceFlowState?.webapp_activation_url) {
    await open(deviceFlowState.webapp_activation_url);
    res.json({ success: true });
  } else {
    res.status(400).json({ success: false, error: 'Aucun flow en cours' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'device-app' });
});

// Démarrage du serveur HTTPS
try {
  // Essayer de charger les certificats HTTPS
  const httpsOptions = {
    key: fs.readFileSync(path.join(__dirname, 'certs', 'localhost+2-key.pem')),
    cert: fs.readFileSync(path.join(__dirname, 'certs', 'localhost+2.pem'))
  };

  https.createServer(httpsOptions, app).listen(PORT, () => {
    console.log(`🔒 Device App HTTPS démarrée sur https://localhost:${PORT}`);
    console.log(`📝 Instructions:`);
    console.log(`   1. Accédez à https://localhost:${PORT}`);
    console.log(`   2. Cliquez sur "Démarrer l'authentification"`);
    console.log(`   3. Suivez les instructions affichées`);
  });
} catch (error) {
  // Fallback sur HTTP si pas de certificats
  console.log('⚠️ Certificats HTTPS non trouvés, démarrage en HTTP...');
  app.listen(PORT, () => {
    console.log(`🖥️ Device App HTTP démarrée sur http://localhost:${PORT}`);
    console.log(`   Pour HTTPS, générez les certificats avec mkcert`);
  });
}