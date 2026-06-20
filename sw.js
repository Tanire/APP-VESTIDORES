const CACHE_NAME = 'vestidores-v0.4.3b';
const ASSETS = [
    './',
    './index.html',
    './settings.html',
    './css/style.css',
    './js/main.js',
    './js/vestidores.js',
    './js/storage.js',
    './js/sync-service.js',
    './js/notifications.js',
    './manifest.json',
    './assets/vestidores.jpeg',
    './assets/virgen.jpeg'
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
    e.respondWith(
        caches.match(e.request).then((response) => response || fetch(e.request))
    );
});
