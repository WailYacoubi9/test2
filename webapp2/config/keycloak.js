// config/keycloak.js
require('dotenv').config();
const { Issuer, generators } = require('openid-client');

async function initializeKeycloak() {
    try {
        const config = {
            keycloakUrl: process.env.KEYCLOAK_URL,
            realm: process.env.REALM,
            clientId: process.env.CLIENT_ID,
            clientSecret: process.env.CLIENT_SECRET,
            redirectUri: process.env.REDIRECT_URI
        };

        if (!config.keycloakUrl || !config.realm || !config.clientId || !config.redirectUri) {
            throw new Error("Missing Keycloak configuration in .env");
        }

        const issuerUrl = `${config.keycloakUrl}/realms/${config.realm}`;
        console.log(`Découverte de l'issuer: ${issuerUrl}`);

        // Discover OpenID configuration
        const issuer = await Issuer.discover(issuerUrl);

        console.log('Issuer découvert:', issuer.metadata.issuer);

        // Create client
        const keycloakClient = new issuer.Client({
            client_id: config.clientId,
            client_secret: config.clientSecret,
            redirect_uris: [config.redirectUri],
            response_types: ['code']
        });

        console.log('Client OpenID Connect initialisé');
        console.log('Configuration client:');
        console.log(`   - Client ID: ${config.clientId}`);
        console.log(`   - Client Secret: ${config.clientSecret ? '***' + config.clientSecret.slice(-4) : '(none)'}`);
        console.log(`   - Redirect URI: ${config.redirectUri}`);

        return keycloakClient;

    } catch (error) {
        console.error("Erreur lors de l'initialisation de Keycloak:", error);
        throw error;
    }
}

module.exports = {
    initializeKeycloak
};
