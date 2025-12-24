const CACHE_NAME = 'familia-app-v1';
const ASSETS = [
    './',
    './index.html',
    './calendar.html',
    './expenses.html',
    './shopping.html',
    './settings.html',
    './css/style.css',
    './js/main.js',
    './js/calendar.js',
    './js/expenses.js',
    './js/shopping.js',
    './js/storage.js',
    './js/sync-service.js',
    './manifest.json'
];

self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
    );
});

self.addEventListener('fetch', (e) => {
    e.respondWith(
        caches.match(e.request).then((response) => response || fetch(e.request))
    );
});
