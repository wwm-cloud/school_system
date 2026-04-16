const CACHE_NAME = 'sms-pwa-v2';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './school-icon.svg'
];

const isSameOrigin = (url) => {
  try {
    return new URL(url).origin === self.location.origin;
  } catch (e) {
    return false;
  }
};

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(APP_SHELL);
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

  const reqUrl = request.url;

  if (!isSameOrigin(reqUrl)) {
    return;
  }

  const isNavigation = request.mode === 'navigate' || (request.headers.get('accept') || '').includes('text/html');
  const isStaticAsset = /\.(?:css|js|json|svg|png|jpg|jpeg|webp|gif|ico|woff2?)$/i.test(new URL(reqUrl).pathname);

  if (isNavigation) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        const fresh = await fetch(request, { cache: 'no-store' });
        if (fresh && fresh.ok) {
          cache.put('./index.html', fresh.clone()).catch(() => {});
        }
        return fresh;
      } catch (error) {
        return (await cache.match('./index.html')) || (await cache.match('./'));
      }
    })());
    return;
  }

  if (isStaticAsset) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(request, { ignoreSearch: true });
      if (cached) return cached;
      const fresh = await fetch(request);
      if (fresh && fresh.ok) cache.put(request, fresh.clone()).catch(() => {});
      return fresh;
    })());
  }
});
