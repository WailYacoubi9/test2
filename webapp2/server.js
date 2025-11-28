require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const { initializeKeycloak } = require('./config/keycloak');
const https = require('https');
const fs = require('fs');


const app = express();
const PORT = process.env.PORT || 3000;

// Configuration du moteur de templates
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Configuration de session
app.use(session({
    secret: process.env.SESSION_SECRET || require('crypto').randomBytes(32).toString('hex'),
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: true,
        httpOnly: true,
        maxAge: 3600000 // 1 heure
    }
}));

// Middleware pour rendre l'utilisateur disponible dans toutes les vues
app.use((req, res, next) => {
    res.locals.user = req.session.userinfo || null;
    res.locals.isAuthenticated = !!req.session.tokenSet;
    next();
});

// Initialisation et démarrage
async function start() {
    try {
        // Initialiser Keycloak
        const keycloakClient = await initializeKeycloak();

        // Rendre le client Keycloak disponible pour les routes
        app.locals.keycloakClient = keycloakClient;

        // Import des routes (après initialisation de Keycloak)
        const authRoutes = require('./routes/auth');
        const pageRoutes = require('./routes/pages');
        const deviceActivationRoutes = require('./routes/device-activation');

        // Utilisation des routes
        app.use('/', authRoutes);
        app.use('/', pageRoutes);
        app.use('/', deviceActivationRoutes);

        // Gestion des erreurs 404
        app.use((req, res) => {
            res.status(404).render('pages/404', {
                title: 'Page non trouvée',
                message: 'La page que vous recherchez n\'existe pas.'
            });
        });

        // Gestion des erreurs globales
        app.use((err, req, res, next) => {
            console.error('Erreur:', err);
            res.status(500).render('pages/error', {
                title: 'Erreur',
                message: err.message || 'Une erreur est survenue.'
            });
        });

        // Lire les certificats
        const httpsOptions = {
            key: fs.readFileSync(path.join(__dirname, 'certs', 'localhost+2-key.pem')),
            cert: fs.readFileSync(path.join(__dirname, 'certs', 'localhost+2.pem'))
        };

        // Création du serveur HTTPS
        https.createServer(httpsOptions, app).listen(PORT, () => {
            console.log(`\nServeur HTTPS démarré sur https://localhost:${PORT}`);
            console.log(`Configuration:`);
            console.log(`   - Keycloak: ${process.env.KEYCLOAK_URL}`);
            console.log(`   - Realm: ${process.env.REALM}`);
            console.log(`   - Client ID: ${process.env.CLIENT_ID}`);
            console.log(`   - Redirect URI: ${process.env.REDIRECT_URI}\n`);
        });

    } catch (error) {
        console.error('Erreur lors du démarrage:', error);
        process.exit(1);
    }
}

start();