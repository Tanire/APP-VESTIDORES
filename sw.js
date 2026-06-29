const CACHE_NAME = 'vestidores-v0.6.4';
const ASSETS = [
    './',
    './index.html',
    './settings.html',
    './css/style.css',
    './js/main.js',
    './js/vestidores.js',
    './js/storage.js',
    './js/ofrendas.js',
    './js/sync-service.js',
    './js/notifications.js',
    './manifest.json',
    './assets/vestidores.jpeg',
    './assets/virgen.jpeg',
    './assets/manto_placeholder.png',
    './assets/icon-192.png',
    './assets/icon-512.png'
];

self.addEventListener('install', (e) => {
    self.skipWaiting();
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
    );
});

self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) {
                        return caches.delete(key);
                    }
                })
            );
        })
    );
    return self.clients.claim();
});

self.addEventListener('fetch', (e) => {
    // Only cache GET requests and skip browser extensions or chrome-extension URLs
    if (e.request.method !== 'GET' || !e.request.url.startsWith(self.location.origin)) {
        return;
    }

    e.respondWith(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.match(e.request).then((cachedResponse) => {
                const fetchPromise = fetch(e.request).then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        cache.put(e.request, networkResponse.clone());
                    }
                    return networkResponse;
                }).catch(() => {
                    // Fallback to cache silently on network error
                });
                return cachedResponse || fetchPromise;
            });
        })
    );
});

