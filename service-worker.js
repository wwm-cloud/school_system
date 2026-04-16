const CACHE_NAME = 'sms-pwa-v1';
const APP_SHELL = [
  './',
  './index.html',
  './index_updated_pwa_offline_sync.html',
  './manifest.webmanifest',
  './school-icon.svg'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(APP_SHELL.map(url => new Request(url, { cache: 'reload' })));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name !== CACHE_NAME).map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request, { ignoreSearch: true });
    try {
      const response = await fetch(request);
      if (response && (response.ok || response.type === 'opaque')) {
        cache.put(request, response.clone()).catch(() => {});
      }
      return response;
    } catch (error) {
      if (cached) return cached;
      const navigateAccept = request.headers.get('accept') || '';
      if (request.mode === 'navigate' || navigateAccept.includes('text/html')) {
        return (await cache.match('./index_updated_pwa_offline_sync.html')) || (await cache.match('./index.html'));
      }
      throw error;
    }
  })());
});
