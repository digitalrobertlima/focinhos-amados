/* Focinhos Amados — Service Worker
   HTML e config: rede primeiro (sempre atualizado). Estáticos: cache primeiro, atualizando em segundo plano. */
const SW_URL = new URL(self.location.href);
const V = SW_URL.searchParams.get('v') || '0.4.0';
const CACHE = `fa-static-${V}`;
const q = `?v=${V}`;
const ESTATICOS = [
  './', './index.html', './agendar.html', './fidelidade.html', './sobre.html', './404.html', './painel.html',
  './assets/css/app.css' + q,
  './assets/js/ilustracoes.js' + q, './assets/js/config.js' + q, './assets/js/core.js' + q,
  './assets/js/agendar.js' + q, './assets/js/inicio.js' + q, './assets/js/fidelidade.js' + q, './assets/js/sobre.js' + q, './assets/js/selo.js' + q, './assets/js/painel.js' + q,
  './assets/img/logo.png', './assets/img/pwa-192.png', './assets/img/pwa-512.png',
  './assets/img/gallery-pet-1.webp', './assets/img/gallery-pet-2.webp', './assets/img/gallery-pet-3.webp', './assets/img/gallery-pet-4.webp',
  './manifest.webmanifest',
];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    const base = self.registration.scope;
    await Promise.allSettled(ESTATICOS.map(async (p) => {
      const url = new URL(p, base).href;
      const r = await fetch(url, { cache: 'no-store' });
      if (r.ok) await cache.put(url, r);
    }));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const chaves = await caches.keys();
    await Promise.all(chaves.filter((k) => k.startsWith('fa-static-') && k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // ViaCEP, Meta etc.: direto na rede

  const ehHtml = req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html');
  const ehConfig = url.pathname.endsWith('/config.json');
  if (ehHtml || ehConfig) {
    e.respondWith((async () => {
      try {
        const fresco = await fetch(req);
        if (fresco.ok) { const c = await caches.open(CACHE); c.put(req, fresco.clone()); }
        return fresco;
      } catch (_) {
        const guardado = await caches.match(req, { ignoreSearch: ehHtml });
        if (guardado) return guardado;
        if (ehHtml) return (await caches.match('./index.html')) || Response.error();
        return new Response('{}', { headers: { 'Content-Type': 'application/json' } });
      }
    })());
    return;
  }

  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const guardado = await cache.match(req);
    const rede = fetch(req).then((r) => { if (r && r.ok) cache.put(req, r.clone()); return r; }).catch(() => null);
    if (guardado) { e.waitUntil(rede); return guardado; }
    return (await rede) || Response.error();
  })());
});
