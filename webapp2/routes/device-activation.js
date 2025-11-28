const express = require('express');
const router = express.Router();

/**
 * GET /activate
 * Page d'activation d'appareil (Device Flow)
 * Permet à l'utilisateur d'entrer le code device depuis l'interface webapp
 */
router.get('/activate', (req, res) => {
    const code = req.query.code || ''; // Code pré-rempli depuis QR code

    res.render('pages/activate', {
        title: 'Activer un appareil',
        prefilledCode: code
    });
});

/**
 * POST /activate
 * Traite le code device et redirige vers Keycloak
 */
router.post('/activate', (req, res) => {
    const userCode = req.body.user_code;

    if (!userCode) {
        return res.render('pages/activate', {
            title: 'Activer un appareil',
            error: 'Veuillez entrer un code d\'activation',
            prefilledCode: ''
        });
    }

    // Formater le code (enlever espaces, tirets, mettre en majuscules)
    const formattedCode = userCode.replace(/[\s-]/g, '').toUpperCase();

    // Construire l'URL Keycloak avec le code pré-rempli
    const KEYCLOAK_URL = process.env.KEYCLOAK_URL || 'http://localhost:8080';
    const REALM = process.env.REALM || 'projetcis';

    // Keycloak accepte le code via query parameter
    const keycloakDeviceUrl = `${KEYCLOAK_URL}/realms/${REALM}/device?user_code=${formattedCode}`;

    // Rediriger vers Keycloak
    res.redirect(keycloakDeviceUrl);
});

module.exports = router;
