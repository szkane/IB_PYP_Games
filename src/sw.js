// Cache version - auto-updated by build script
const CACHE_VERSION = '20260703110533';
const CACHE_NAME = `ib-pyp-games-${CACHE_VERSION}`;

// Static assets to pre-cache during install
const PRECACHE_URLS = [
    '/',
    '/Chinese/g1_chinese-practice-print.html',
    '/Chinese/g1_pinyin_training.html',
    '/Chinese/g1_word_spinner.html',
    '/icon-192.png',
    '/icon-512.png',
    '/index.html',
    '/literacy/g1_before_after.html?mode=days',
    '/literacy/g1_before_after.html?mode=months',
    '/literacy/g1_pronunciation.html',
    '/literacy/g1_spelling_bee.html',
    '/literacy/mc_words/index.html',
    '/literacy/movespelling/index.html',
    '/manifest.json',
    '/math/g1_3D_shape.html',
    '/math/g1_arithmetic.html',
    '/math/g1_Kangaroo_Math.html',
    '/math/g1_living_things_eco_detective.html',
    '/math/g1_pictograph_tally_quiz_arcade.html',
    '/math/g1_pictograph_tally_story_journey.html',
    '/math/g1_position_explorer.html',
    '/science/g1_3D_camera_blueball.html',
    '/science/g1_3D_camera_dragonball.html',
    '/science/g1_3D_camera_test.html',
    '/science/g1_bike_gear.html',
    '/science/g1_day_and_night_detectives.html',
    '/science/g1_moon_phases.html',
    '/science/gesture-cosmos-hub.html',
    '/uoi/g1_community_helpers_sort.html',
    '/uoi/g1_goal_steps_quest.html',
    '/uoi/g1_life_cycle_builder.html',
    '/uoi/g1_needs_of_living_things.html',
    '/uoi/g1_story_sequencer.html',
    '/uoi/g2_vocabulary.html?scheme=math',
    '/uoi/g2_vocabulary.html?scheme=uoi'
];

// Install: Pre-cache essential assets and activate immediately
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('[SW] Pre-caching essential assets');
                return cache.addAll(PRECACHE_URLS);
            })
            .then(() => self.skipWaiting()) // Activate new SW immediately
    );
});

// Activate: Clean up old caches and take control of all clients
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames
                        .filter(name => name.startsWith('ib-pyp-games-') && name !== CACHE_NAME)
                        .map(name => {
                            console.log('[SW] Deleting old cache:', name);
                            return caches.delete(name);
                        })
                );
            })
            .then(() => self.clients.claim()) // Take control of all open tabs
    );
});

// Fetch: Network-first with cache fallback for HTML, cache-first for assets
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);

    // Only handle same-origin requests
    if (url.origin !== location.origin) {
        return;
    }

    // HTML pages: Network-first (always try to get fresh content)
    if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
        event.respondWith(
            fetch(request)
                .then(response => {
                    // Clone and cache the fresh response
                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(request, responseToCache);
                    });
                    return response;
                })
                .catch(() => {
                    // Offline: serve from cache
                    return caches.match(request).then(cached => {
                        return cached || caches.match('/index.html');
                    });
                })
        );
        return;
    }

    // Static assets (JS, CSS, images): Stale-while-revalidate
    event.respondWith(
        caches.open(CACHE_NAME).then(cache => {
            return cache.match(request).then(cachedResponse => {
                const fetchPromise = fetch(request).then(networkResponse => {
                    // Update cache with fresh response
                    cache.put(request, networkResponse.clone());
                    return networkResponse;
                }).catch(() => cachedResponse); // Fallback to cache if offline

                // Return cached immediately, update in background
                return cachedResponse || fetchPromise;
            });
        })
    );
});

// Listen for messages to trigger cache refresh
self.addEventListener('message', event => {
    if (event.data === 'skipWaiting') {
        self.skipWaiting();
    }
});
