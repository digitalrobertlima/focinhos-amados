/* Focinhos Amados — Service Worker (cache-first para estáticos, network-first para HTML) */
const SW_VERSION = 'fa-1.0.0';
const STATIC_CACHE = `fa-static-${SW_VERSION}`;
const STATIC_ASSETS = [
  './',
  './index.html',
  './assets/css/style.css',
  './assets/js/config.js',
  './assets/js/main.js',
  './assets/img/generic-placeholder.svg',
  './assets/img/pwa-192.png',
  './assets/img/pwa-512.png',
  './manifest.webmanifest'
];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(STATIC_CACHE);
    await cache.addAll(STATIC_ASSETS);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith('fa-static-') && k !== STATIC_CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);

  // Só GET
  if (req.method !== 'GET') return;

  // HTML -> network-first
  if (req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html')) {
    e.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(STATIC_CACHE);
        cache.put(req, fresh.clone());
        return fresh;
      } catch {
        const cache = await caches.match(req);
        if (cache) return cache;
        // Fallback offline HTML simples
        return new Response(
          `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
          <title>Offline • Focinhos Amados</title>
          <style>body{font:16px/1.5 system-ui;margin:0;background:#FFFCFE;color:#030302;display:grid;place-items:center;height:100vh;padding:24px}
          .card{max-width:640px;background:#fff;border:1px solid #E6E6E6;border-radius:16px;padding:20px;box-shadow:0 8px 28px rgba(0,0,0,.08)}</style>
          <div class="card"><h1>Você está offline</h1><p>Tente novamente quando a conexão voltar. Os recursos estáticos ficam disponíveis offline após a primeira visita.</p></div>`,
          { headers: { 'Content-Type': 'text/html; charset=utf-8' }, status: 200 }
        );
      }
    })());
    return;
  }

  // Estáticos -> cache-first
  e.respondWith((async () => {
    const cached = await caches.match(req);
    if (cached) return cached;
    try {
      const fresh = await fetch(req);
      const cache = await caches.open(STATIC_CACHE);
      cache.put(req, fresh.clone());
      return fresh;
    } catch {
      return new Response('', { status: 504 });
    }
  })());
});
