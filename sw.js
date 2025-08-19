/* Focinhos Amados — Service Worker (cache-first para estáticos, network-first para HTML) */
// Derive version from sw.js?v=... to bust CDN caches per deploy
const SW_URL = new URL(self.location.href);
const V = SW_URL.searchParams.get('v') || '';
const SW_VERSION = `fa-${V || '0.1.2'}`;
const STATIC_CACHE = `fa-static-${SW_VERSION}`;
const q = V ? (`?v=${V}`) : '';
const STATIC_ASSETS = [
  './',
  './index.html',
  './assets/css/style.css'+q,
  './assets/js/config.js'+q,
  './assets/js/main.js'+q,
  './assets/img/pwa-192.png',
  './assets/img/pwa-512.png',
  './assets/img/gallery-pet-1.webp',
  './assets/img/gallery-pet-2.webp',
  './assets/img/gallery-pet-3.webp',
  './assets/img/gallery-pet-4.webp',
  './assets/img/sprite.svg',
  './manifest.webmanifest'+q
];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(STATIC_CACHE);
    // Resolve assets relative to SW scope
    const base = self.registration.scope || '/';
    const resolved = STATIC_ASSETS.map(p=> new URL(p, base).href);
    const results = await Promise.allSettled(resolved.map(u=> fetch(u, {cache: 'no-store'})));
    // put successful responses into cache and log failures
    await Promise.all(results.map(async (r, i)=>{
      if(r.status === 'fulfilled' && r.value && r.value.ok){
        try{ await cache.put(resolved[i], r.value.clone()); }catch(e){ console.warn('cache.put failed', resolved[i], e); }
      } else {
        console.warn('SW asset fetch failed:', resolved[i], r.reason || (r.value && r.value.status));
      }
    }));
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

// Listen to messages from the page (e.g., to trigger skipWaiting)
self.addEventListener('message', (e)=>{
  try{
    if(!e.data) return;
    if(e.data.type === 'SKIP_WAITING'){
      self.skipWaiting();
    }
  }catch(err){ console.warn('sw message handler failed', err); }
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);

  // Só GET
  if (req.method !== 'GET') return;

  // Treat config.js as network-first so administrators can update messaging/config quickly
  if (url.pathname.endsWith('/assets/js/config.js') || url.pathname.endsWith('/config.json')) {
    e.respondWith((async ()=>{
      try{ const fresh = await fetch(req); const cache = await caches.open(STATIC_CACHE); cache.put(req, fresh.clone()); return fresh; }catch(err){ const cached = await caches.match(req); return cached || new Response('', { status: 504 }); }
    })());
    return;
  }

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

  // Estáticos -> stale-while-revalidate (responde rápido e atualiza em background)
  e.respondWith((async () => {
    const cache = await caches.open(STATIC_CACHE);
    const cached = await cache.match(req);
    const fetchAndUpdate = fetch(req).then(res=>{ if(res && res.ok) cache.put(req, res.clone()); return res; }).catch(()=> null);
    if (cached) { e.waitUntil(fetchAndUpdate); return cached; }
    const fresh = await fetchAndUpdate; if (fresh) return fresh; return new Response('', { status: 504 });
  })());
});
