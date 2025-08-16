/* sw.js (v2) — PWA Service Worker
   Estratégia: 
   - Precache de assets críticos
   - Network-first para navegação (HTML), com fallback para cache/offline
   - Cache-first para estáticos (CSS/JS/IMG)
   - Limpeza automática de caches antigos por versão
*/

const SW_VERSION = 'fa-2025-08-16.v2';
const CACHE_NAME = `fa-cache-${SW_VERSION}`;
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/config.js',
  '/main.js',
  '/agendar.html',
  '/taxi.html',
  '/delivery.html',
  '/sobre.html',
  '/404.html',
  '/components/resumo.html',
  '/components/wizard.html',
  '/manifest.webmanifest',
  '/assets/img/logo.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(CORE_ASSETS);
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys.filter(k => k.startsWith('fa-cache-') && k !== CACHE_NAME)
          .map(k => caches.delete(k))
    );
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  if(event.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if(req.method !== 'GET') return; // só cacheia GET

  const url = new URL(req.url);

  // Navegações/HTML → network-first
  const isHTML = req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html');
  if(isHTML){
    event.respondWith(networkFirst(req));
    return;
  }

  // Estáticos comuns → cache-first
  const isStatic = [
    'style', 'script', 'image', 'font'
  ].includes(req.destination);
  if(isStatic){
    event.respondWith(cacheFirst(req));
    return;
  }

  // Default → tenta cache, cai para rede
  event.respondWith(cacheFirst(req));
});

async function networkFirst(request){
  const cache = await caches.open(CACHE_NAME);
  try{
    const fresh = await fetch(request);
    if(fresh && (fresh.status === 200 || fresh.type === 'opaqueredirect')){
      cache.put(request, fresh.clone());
    }
    return fresh;
  }catch(err){
    const cached = await cache.match(request);
    if(cached) return cached;
    // fallback para a home ou 404 offline
    return cache.match('/404.html') || cache.match('/index.html');
  }
}

async function cacheFirst(request){
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if(cached) return cached;
  try{
    const fresh = await fetch(request);
    if(fresh && fresh.status === 200){
      cache.put(request, fresh.clone());
    }
    return fresh;
  }catch(err){
    // Falha de rede sem cache: tenta um fallback genérico
    if(request.destination === 'image'){
      // poderia retornar um SVG inline de placeholder aqui
      return new Response('', { status: 204 });
    }
    return new Response('Offline', { status: 503, statusText: 'Offline' });
  }
}
