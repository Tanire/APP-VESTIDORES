/**
 * Notifications Service - Toast alerts and Web Notifications for PWA
 */
const Toast = {
    initContainer() {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                display: flex;
                flex-direction: column;
                gap: 10px;
                z-index: 10000;
                max-width: 380px;
                width: 90vw;
                pointer-events: none;
            `;
            document.body.appendChild(container);
        }
        return container;
    },

    show(message, type = 'info', duration = 4000) {
        const container = this.initContainer();
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.style.pointerEvents = 'auto';
        
        let icon = 'ℹ️';
        let borderColor = 'var(--primary)';
        
        if (type === 'success') {
            icon = '✅';
            borderColor = '#10B981'; // Tailwind Green-500
        } else if (type === 'warning') {
            icon = '⚠️';
            borderColor = '#F59E0B'; // Tailwind Amber-500
        } else if (type === 'error') {
            icon = '❌';
            borderColor = '#EF4444'; // Tailwind Red-500
        } else if (type === 'event') {
            icon = '📅';
            borderColor = '#1B365D'; // Navy Primary
        }

        toast.style.cssText = `
            background: #FFFFFF;
            border-left: 4px solid ${borderColor};
            color: #1F2937;
            padding: 0.85rem 1.25rem;
            border-radius: 8px;
            box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05);
            display: flex;
            align-items: center;
            gap: 12px;
            font-family: 'Inter', sans-serif;
            font-size: 0.9rem;
            font-weight: 500;
            opacity: 0;
            transform: translateY(-20px);
            transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
            margin-bottom: 5px;
            cursor: pointer;
        `;
        
        toast.innerHTML = `
            <span style="font-size: 1.2rem; flex-shrink: 0;">${icon}</span>
            <div style="flex-grow: 1; line-height: 1.4;">${message}</div>
        `;
        container.appendChild(toast);

        // Click to dismiss early
        toast.onclick = () => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(-20px)';
            setTimeout(() => toast.remove(), 250);
        };

        // Trigger slide down
        requestAnimationFrame(() => {
            setTimeout(() => {
                toast.style.opacity = '1';
                toast.style.transform = 'translateY(0)';
            }, 10);
        });

        // Trigger slide up and remove
        setTimeout(() => {
            if (toast.parentElement) {
                toast.style.opacity = '0';
                toast.style.transform = 'translateY(-20px)';
                setTimeout(() => {
                    toast.remove();
                }, 300);
            }
        }, duration);
    },

    success(message, duration) { this.show(message, 'success', duration); },
    warning(message, duration) { this.show(message, 'warning', duration); },
    error(message, duration) { this.show(message, 'error', duration); },
    info(message, duration) { this.show(message, 'info', duration); },
    event(message, duration = 6000) { this.show(message, 'event', duration); }
};

/**
 * System / Web Notifications Manager
 */
const NotificationManager = {
    isSupported() {
        return ('Notification' in window);
    },

    getPermission() {
        if (!this.isSupported()) return 'unsupported';
        return Notification.permission;
    },

    async requestPermission() {
        if (!this.isSupported()) {
            Toast.warning('Este navegador no soporta notificaciones de escritorio/móvil.');
            return false;
        }

        try {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                Toast.success('¡Notificaciones activadas con éxito!');
                this.sendNotification('Vestidores de la Virgen', {
                    body: 'Las notificaciones y recordatorios de eventos están activados.',
                    icon: 'assets/icon-192.png'
                });
                return true;
            } else if (permission === 'denied') {
                Toast.warning('Permiso de notificaciones denegado en el navegador.');
                return false;
            } else {
                return false;
            }
        } catch (error) {
            console.error('Error solicitando permisos de notificación:', error);
            return false;
        }
    },

    sendNotification(title, options = {}) {
        if (!this.isSupported() || Notification.permission !== 'granted') {
            return false;
        }

        try {
            const defaultOptions = {
                icon: 'assets/icon-192.png',
                badge: 'assets/icon-192.png',
                vibrate: [200, 100, 200]
            };

            const notif = new Notification(title, { ...defaultOptions, ...options });
            notif.onclick = () => {
                window.focus();
                notif.close();
            };
            return true;
        } catch (e) {
            // Fallback to ServiceWorkerRegistration notification if supported
            if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                navigator.serviceWorker.ready.then(reg => {
                    reg.showNotification(title, options).catch(err => console.error('SW notif error:', err));
                });
                return true;
            }
            console.warn('No se pudo enviar notificación nativa:', e);
            return false;
        }
    }
};
