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
router.get('/devices', refreshTokenIfNeeded, requireAuth, async (req, res) => {
    // Récupérer les devices depuis Keycloak Account API
    let devices = [];

    try {
        const axios = require('axios');
        const userToken = req.session.tokenSet.access_token;
        const KEYCLOAK_URL = process.env.KEYCLOAK_URL || 'http://localhost:8080';
        const REALM = process.env.REALM || 'projetcis';

        // Appel à Keycloak Account API pour récupérer les sessions
        const response = await axios.get(
            `${KEYCLOAK_URL}/realms/${REALM}/account/sessions/devices`,
            {
                headers: {
                    'Authorization': `Bearer ${userToken}`
                },
                timeout: 5000
            }
        );

        // Filtrer pour ne garder que les devices (client_id: devicecis)
        devices = response.data.filter(device =>
            device.sessions && device.sessions.some(session =>
                session.clients && session.clients.some(client =>
                    client.clientId === 'devicecis'
                )
            )
        );

        console.log('✅ Devices récupérés depuis Keycloak:', devices.length);

    } catch (error) {
        console.log('⚠️ Erreur Keycloak Account API:', error.message);
        // En cas d'erreur, devices reste un tableau vide
    }

    res.render('pages/devices', {
        title: 'Mes Appareils',
        devices: devices
    });
});

module.exports = router;