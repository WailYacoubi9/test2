// Animations et interactions

document.addEventListener('DOMContentLoaded', () => {
    // Animation au scroll
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    // Observer les cartes
    document.querySelectorAll('.feature-card, .card').forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        observer.observe(card);
    });

    // Confirmation avant déconnexion
    const logoutLinks = document.querySelectorAll('a[href="/logout"]');
    logoutLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            if (!confirm('Êtes-vous sûr de vouloir vous déconnecter ?')) {
                e.preventDefault();
            }
        });
    });

    // Copier l'ID utilisateur au clic
    const userIdElements = document.querySelectorAll('.info-value.monospace');
    userIdElements.forEach(el => {
        el.style.cursor = 'pointer';
        el.title = 'Cliquer pour copier';

        el.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(el.textContent);

                // Feedback visuel
                const originalText = el.textContent;
                el.textContent = '✓ Copié !';
                el.style.color = '#10b981';

                setTimeout(() => {
                    el.textContent = originalText;
                    el.style.color = '';
                }, 2000);
            } catch (err) {
                console.error('Erreur lors de la copie:', err);
            }
        });
    });

    // Avertissement si le token va expirer
    const sessionStatus = document.querySelector('.session-item.valid .session-value');
    if (sessionStatus) {
        const expiresInText = sessionStatus.textContent;
        const expiresIn = parseInt(expiresInText);

        if (expiresIn > 0 && expiresIn < 300) { // Moins de 5 minutes
            const alert = document.createElement('div');
            alert.className = 'alert alert-warning';
            alert.textContent = '⚠️ Votre session expire bientôt. Pensez à recharger la page ou à vous reconnecter.';
            document.querySelector('.session-info').appendChild(alert);
        }
    }

    console.log('Application chargée avec succès');
});