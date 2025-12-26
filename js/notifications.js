const NotificationSystem = {
    async requestPermission() {
        if (!("Notification" in window)) {
            alert("Tu navegador no soporta notificaciones.");
            return false;
        }
        const result = await Notification.requestPermission();
        if (result === 'granted') {
            new Notification('¡Notificaciones Activadas!', {
                body: 'Te avisaremos de los gastos y listas.',
                icon: 'assets/icon-192.png'
            });
        }
        return result === 'granted';
    },

    send(title, body) {
        if (Notification.permission === 'granted') {
            try {
                // Try catch for mobile browsers quirks
                // Service Worker registration is required for Android notifications usually,
                // but local Notification() works if page is open.
                // For "Push" when closed, we need specific SW logic, but we are doing Local only.
                new Notification(title, {
                    body,
                    icon: 'assets/icon-192.png',
                    vibrate: [200, 100, 200]
                });
            } catch (e) {
                console.error("Error showing notification:", e);
            }
        }
    },

    checkDailyBills(bills) {
        if (Notification.permission !== 'granted') return;

        const now = new Date();
        const today = now.getDate(); // 1-31
        const month = now.getMonth(); // 0-11
        const keyPrefix = `notif_bill_${month}_${today}_`;

        // Filter bills due today
        const billsToday = bills.filter(bill => bill.day === today && !bill._deleted);

        billsToday.forEach(bill => {
            const key = keyPrefix + bill.id;
            // Check if already notified THIS MONTH for THIS DAY
            if (!localStorage.getItem(key)) {
                this.send('📅 Recibo Pendiente', `Hoy día ${today} se pasa el recibo: ${bill.title} (${bill.amount}€)`);
                localStorage.setItem(key, 'true');
            }
        });
    },

    checkNewShoppingItems(oldList, newList) {
        if (Notification.permission !== 'granted') return;
        if (!oldList || !newList) return;

        const oldIds = new Set(oldList.map(i => i.id));

        // Find items that exist in newList but NOT in oldList (and are not deleted)
        const newItems = newList.filter(i => !oldIds.has(i.id) && !i._deleted);

        if (newItems.length > 0) {
            // Summary logic
            const names = newItems.map(i => i.name).join(', ');
            const othersCount = newItems.length > 3 ? ` y ${newItems.length - 3} más` : '';
            const preview = names.split(',').slice(0, 3).join(',') + othersCount;

            this.send('🛒 Lista de la Compra', `Se han añadido: ${preview}`);
        }
    }
};
