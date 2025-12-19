const CACHE_NAME = 'ib-pyp-games-cache-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/manifest.json',
    '/icon-192.png',
    '/icon-512.png',
    '/literacy/spelling_bee.html',
    '/literacy/pronunciation.html',
    '/math/Kangaroo_Math.html',
    '/science/3D_camara_galaxy.html',
    '/science/3D_camara_galaxy2.html',
    '/science/3D_camara_milkyway.html',
    '/science/3D_camara_obj.html',
    '/science/3D_camara_solar.html',
    '/science/3D_camera_blueball.html',
    '/science/3D_camera_dragonball.html',
    '/science/3D_camera_test.html',
    '/science/solar_system.html'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) {
                    return response;
                }
                return fetch(event.request);
            })
    );
});

self.addEventListener('activate', event => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});
