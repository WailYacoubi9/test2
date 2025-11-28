/**
 * Middleware pour vérifier si l'utilisateur est authentifié
 */
function requireAuth(req, res, next) {
    if (!req.session.tokenSet) {
        return res.redirect('/login');
    }
    next();
}

/**
 * Middleware pour vérifier si le token est expiré
 */
function checkTokenExpiration(req, res, next) {
    if (req.session.tokenSet) {
        const expiresAt = req.session.tokenSet.expires_at;
        const now = Math.floor(Date.now() / 1000);

        if (expiresAt && now >= expiresAt) {
            // Token expiré, on pourrait implémenter le refresh token ici
            console.log('⚠️ Token expiré, déconnexion de l\'utilisateur');
            req.session.destroy();
            return res.redirect('/login');
        }
    }
    next();
}

/**
 * Middleware pour rediriger les utilisateurs authentifiés
 */
function redirectIfAuthenticated(req, res, next) {
    if (req.session.tokenSet) {
        return res.redirect('/profile');
    }
    next();
}

// Middleware pour gestion des Refresh Tokens
async function refreshTokenIfNeeded(req, res, next) {
    // Si pas de session, on passe
    if (!req.session.tokenSet) {
        return next();
    }

    try {
        const tokenSet = req.session.tokenSet;
        const expiresAt = tokenSet.expires_at;
        const now = Math.floor(Date.now() / 1000);

        // Si expire dans moins de 5 minutes (300 secondes), on rafraîchit
        const timeLeft = expiresAt - now;

        if (timeLeft < 300) {
            console.log(`Token expire dans ${timeLeft} secondes, rafraîchissement...`);

            // Vérifier qu'on a un refresh_token
            if (!tokenSet.refresh_token) {
                console.log('Pas de refresh_token disponible, déconnexion');
                req.session.destroy();
                return res.redirect('/login');
            }

            const keycloakClient = req.app.locals.keycloakClient;

            // Rafraîchir le token
            const newTokenSet = await keycloakClient.refresh(tokenSet.refresh_token);

            // Mettre à jour la session avec les nouveaux tokens
            req.session.tokenSet = newTokenSet;

            // Mettre à jour aussi les informations utilisateur
            const userinfo = await keycloakClient.userinfo(newTokenSet.access_token);
            req.session.userinfo = userinfo;

            console.log('Token rafraîchi automatiquement');
            console.log(`- Nouveau token expire dans ${newTokenSet.expires_in} secondes`);
        }

        next();
    } catch (error) {
        console.error('Erreur lors du rafraîchissement du token:', error.message);

        // Si le refresh échoue (refresh_token expiré), on déconnecte
        req.session.destroy();
        return res.redirect('/login');
    }
}


module.exports = {
    requireAuth,
    refreshTokenIfNeeded,
    checkTokenExpiration,
    redirectIfAuthenticated
};