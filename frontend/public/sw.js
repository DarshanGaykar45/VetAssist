/**
 * VetAssist Service Worker
 * Strictly caches the static App Shell only (HTML, CSS, JS, Fonts, Icons)
 * NEVER caches API calls (/api/*); dynamic data lives securely in IndexedDB.
 */

const CACHE_NAME = 'vetassist-app-shell-v1';
const APP_SHELL_URLS = [
  '/',
  '/index.html',
  '/favicon.svg',
  '/icons.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_SHELL_URLS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. NEVER intercept or cache API requests: let IndexedDB + dataService handle API data
  if (url.pathname.startsWith('/api')) {
    return;
  }

  // 2. Only handle GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // 3. App Shell Cache-first strategy with network fallback
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Return cached asset immediately, and update cache in background if online
        fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
            }
          })
          .catch(() => {/* Ignore background fetch failure when offline */});

        return cachedResponse;
      }

      // Network fallback
      return fetch(event.request)
        .then((response) => {
          // If valid response, cache static asset
          if (
            response &&
            response.status === 200 &&
            (url.pathname.endsWith('.js') ||
              url.pathname.endsWith('.css') ||
              url.pathname.endsWith('.svg') ||
              url.pathname.endsWith('.woff2') ||
              event.request.mode === 'navigate')
          ) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
          }
          return response;
        })
        .catch(() => {
          // If offline and navigating to another route, fallback to index.html app shell
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html') || caches.match('/');
          }
        });
    })
  );
});
