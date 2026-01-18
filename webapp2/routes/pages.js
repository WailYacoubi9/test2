const express = require('express');
const { requireAuth, refreshTokenIfNeeded } = require('../middleware/auth');
const router = express.Router();

/**
 * GET /
 * Page d'accueil
 */
router.get('/', (req, res) => {
    res.render('pages/home', {
        title: 'Accueil - Projet CIS'
    });
});

/**
 * GET /profile
 * Page de profil utilisateur (protégée)
 * Le refresh token sera automatiquement vérifié et renouvelé si nécessaire
 */
router.get('/profile', refreshTokenIfNeeded, requireAuth, (req, res) => {
    const userinfo = req.session.userinfo;
    const tokenSet = req.session.tokenSet;

    // Calcul du temps restant avant expiration
    const expiresIn = tokenSet.expires_at - Math.floor(Date.now() / 1000);
    const isExpired = expiresIn <= 0;

    res.render('pages/profile', {
        title: 'Mon Profil',
        userinfo,
        tokenSet,
        expiresIn,
        isExpired
    });
});

/**
 * GET /devices
 * Page de gestion des appareils connectés via Keycloak
 * Architecture correcte: WebApp interroge Keycloak (pas device-app directement)
 */
/**
 * Helper function to fetch devices from Keycloak Account API
 */
async function fetchDevicesFromKeycloak(accessToken) {
    const axios = require('axios');
    const KEYCLOAK_URL = process.env.KEYCLOAK_URL || 'http://localhost:8080';
    const REALM = process.env.REALM || 'projetcis';

    try {
        // Appel à Keycloak Account API pour récupérer les sessions
        const response = await axios.get(
            `${KEYCLOAK_URL}/realms/${REALM}/account/sessions/devices`,
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                },
                timeout: 5000
            }
        );

        // Filtrer pour ne garder que les devices (client_id: devicecis)
        const devices = response.data.filter(device =>
            device.sessions && device.sessions.some(session =>
                session.clients && session.clients.some(client =>
                    client.clientId === 'devicecis'
                )
            )
        );

        console.log('✅ Devices récupérés depuis Keycloak:', devices.length);
        return devices;

    } catch (error) {
        console.log('⚠️ Erreur Keycloak Account API:', error.message);
        return [];
    }
}

router.get('/devices', refreshTokenIfNeeded, requireAuth, async (req, res) => {
    // Récupérer les devices depuis Keycloak Account API
    const devices = await fetchDevicesFromKeycloak(req.session.tokenSet.access_token);

    res.render('pages/devices', {
        title: 'Mes Appareils',
        devices: devices
    });
});

/**
 * GET /api/devices
 * API endpoint pour récupérer les devices en JSON (auto-refresh)
 */
router.get('/api/devices', refreshTokenIfNeeded, requireAuth, async (req, res) => {
    // Récupérer les devices depuis Keycloak Account API
    const devices = await fetchDevicesFromKeycloak(req.session.tokenSet.access_token);

    res.json({
        success: true,
        devices: devices,
        timestamp: new Date().toISOString()
    });
});

module.exports = router;