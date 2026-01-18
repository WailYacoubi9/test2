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

    // Auto-refresh de la page /devices
    if (window.location.pathname === '/devices') {
        console.log('🔄 Auto-refresh activé pour la page /devices');

        let lastDevicesData = null;
        let isRefreshing = false;

        async function refreshDevices() {
            if (isRefreshing) {
                console.log('⏳ Rafraîchissement déjà en cours, skip...');
                return;
            }

            try {
                isRefreshing = true;

                // Afficher l'indicateur de rafraîchissement
                const refreshIndicator = document.getElementById('refresh-indicator');
                if (refreshIndicator) {
                    refreshIndicator.style.opacity = '1';
                }

                const response = await fetch('/api/devices');
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }

                const data = await response.json();

                // Vérifier s'il y a des changements
                const newDevicesJSON = JSON.stringify(data.devices);
                if (lastDevicesData !== newDevicesJSON) {
                    console.log('🔄 Changement détecté dans la liste des devices');
                    lastDevicesData = newDevicesJSON;
                    updateDevicesUI(data.devices);
                } else {
                    console.log('✓ Aucun changement dans la liste des devices');
                }

                // Masquer l'indicateur de rafraîchissement
                if (refreshIndicator) {
                    setTimeout(() => {
                        refreshIndicator.style.opacity = '0';
                    }, 300);
                }

            } catch (error) {
                console.error('❌ Erreur lors du rafraîchissement des devices:', error);
            } finally {
                isRefreshing = false;
            }
        }

        function updateDevicesUI(devices) {
            const devicesList = document.querySelector('.devices-list');
            const noDevicesBox = document.querySelector('.info-box');
            const card = document.querySelector('.card');

            if (!card) return;

            if (devices && devices.length > 0) {
                // Il y a des devices
                if (noDevicesBox) {
                    noDevicesBox.remove();
                }

                if (!devicesList) {
                    // Créer la section devices-list si elle n'existe pas
                    const newDevicesList = document.createElement('div');
                    newDevicesList.className = 'devices-list';
                    newDevicesList.innerHTML = generateDevicesHTML(devices);

                    // Insérer avant le bouton de rafraîchissement
                    const refreshButton = document.querySelector('button[onclick="location.reload()"]');
                    if (refreshButton && refreshButton.parentElement) {
                        card.insertBefore(newDevicesList, refreshButton.parentElement);
                    } else {
                        card.appendChild(newDevicesList);
                    }
                } else {
                    // Mettre à jour la liste existante
                    devicesList.innerHTML = generateDevicesHTML(devices);
                }

                // Animation flash pour indiquer le changement
                const deviceCards = document.querySelectorAll('.device-card');
                deviceCards.forEach(card => {
                    card.style.animation = 'flash 0.5s ease';
                    setTimeout(() => {
                        card.style.animation = '';
                    }, 500);
                });

            } else {
                // Aucun device
                if (devicesList) {
                    devicesList.remove();
                }

                if (!noDevicesBox) {
                    // Créer le message "aucun appareil"
                    const newNoDevicesBox = document.createElement('div');
                    newNoDevicesBox.className = 'info-box';
                    newNoDevicesBox.innerHTML = `
                        <div class="info-content">
                            <h4>Aucun appareil connecté</h4>
                            <p>Démarrez device-app sur <a href="http://localhost:4000" target="_blank" style="color: #3b82f6; font-weight: 600;">http://localhost:4000</a> et authentifiez-vous pour voir vos appareils ici.</p>
                            <p style="margin-top: 10px; color: #6b7280; font-size: 0.95rem;">
                                Les appareils authentifiés via le Device Flow OAuth2 apparaîtront automatiquement dans cette liste.
                            </p>
                        </div>
                    `;

                    const refreshButton = document.querySelector('button[onclick="location.reload()"]');
                    if (refreshButton && refreshButton.parentElement) {
                        card.insertBefore(newNoDevicesBox, refreshButton.parentElement);
                    } else {
                        card.appendChild(newNoDevicesBox);
                    }
                }
            }
        }

        function generateDevicesHTML(devices) {
            let html = `
                <h3 class="card-title">Appareils connectés</h3>
                <p class="card-description" style="margin-bottom: 20px;">
                    Liste des appareils authentifiés via le Device Flow OAuth2 (récupérés depuis Keycloak).
                </p>
            `;

            let deviceIndex = 0;
            devices.forEach(device => {
                device.sessions.forEach(session => {
                    const deviceClients = session.clients ? session.clients.filter(c => c.clientId === 'devicecis') : [];

                    if (deviceClients.length > 0) {
                        deviceIndex++;
                        const startedDate = new Date(session.started * 1000).toLocaleString('fr-FR');
                        const lastAccessDate = new Date(session.lastAccess * 1000).toLocaleString('fr-FR');
                        const expiresDate = session.expires ? new Date(session.expires * 1000).toLocaleString('fr-FR') : null;
                        const sessionIdShort = session.id.substring(0, 20);

                        html += `
                            <div class="device-card" style="background: white; border: 2px solid #10b981; padding: 20px; border-radius: 8px; margin-bottom: 15px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                                <h4 style="margin: 0 0 15px 0; color: #047857; display: flex; align-items: center; gap: 10px;">
                                    Device #${deviceIndex}
                                </h4>

                                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; background: #f9fafb; padding: 15px; border-radius: 5px;">
                                    <div>
                                        <p style="margin: 5px 0; color: #374151;"><strong>Adresse IP:</strong> ${session.ipAddress}</p>
                                        <p style="margin: 5px 0; color: #374151;"><strong>Session ID:</strong> <code style="background: #e5e7eb; padding: 2px 6px; border-radius: 3px; font-size: 0.85rem; color: #1f2937;">${sessionIdShort}...</code></p>
                                    </div>
                                    <div>
                                        <p style="margin: 5px 0; color: #374151;"><strong>Connecté le:</strong> ${startedDate}</p>
                                        <p style="margin: 5px 0; color: #374151;"><strong>Dernière activité:</strong> ${lastAccessDate}</p>
                                    </div>
                                </div>

                                ${expiresDate ? `<p style="margin: 15px 0 5px 0; color: #374151;"><strong>Expire le:</strong> ${expiresDate}</p>` : ''}

                                <div style="margin-top: 15px; padding: 12px; background: #d1fae5; border-radius: 5px; border-left: 4px solid #10b981;">
                                    ${deviceClients.map(client => `
                                        <p style="margin: 0; color: #065f46; font-weight: 600;">
                                            ${client.clientName || client.clientId}
                                            ${client.clientId !== client.clientName ? `<span style="color: #047857; font-size: 0.9rem; font-weight: 400;"> (<code>${client.clientId}</code>)</span>` : ''}
                                        </p>
                                    `).join('')}
                                </div>
                            </div>
                        `;
                    }
                });
            });

            html += `
                <div style="margin-top: 20px; padding: 15px; background: #f0fdf4; border: 1px solid #86efac; border-radius: 5px;">
                    <p style="margin: 0; color: #166534;">
                        <strong>Architecture correcte:</strong> Les devices sont récupérés depuis Keycloak Account API
                        (source unique de vérité). WebApp n'interroge jamais device-app directement.
                    </p>
                </div>
            `;

            return html;
        }

        // Rafraîchir immédiatement puis toutes les 5 secondes
        refreshDevices();
        setInterval(refreshDevices, 5000);
    }
});