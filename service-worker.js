/* service-worker.js — Vanilla PWA hardening */
/* eslint-disable no-restricted-globals */

const VERSION = 'v2025.08.17-1'; // ⚠️ Atualize a cada release
const CACHE_NAME = `app-cache-${VERSION}`;
const CORE_ASSETS = [
  './',
  'index.html',
  'offline.html',
  'manifest.webmanifest',
  'register-sw.js',
  // Ícones mínimos — ajuste conforme seu projeto
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/maskable-192.png',
  'icons/maskable-512.png'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.allSettled(CORE_ASSETS.map(async (url) => {
      try { await cache.add(new Request(url, {cache:'reload'})); } catch(e) {/* ignora faltantes */}
    }));
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    if ('navigationPreload' in self.registration) {
      try { await self.registration.navigationPreload.enable(); } catch(e){}
    }
    const keys = await caches.keys();
    await Promise.all(keys.map(k => k !== CACHE_NAME && caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

function isHtmlRequest(request) {
  return request.mode === 'navigate' || (request.headers.get('accept')||'').includes('text/html');
}

async function networkFirstHtml(event) {
  const cache = await caches.open(CACHE_NAME);
  const preload = event.preloadResponse?.catch?.(()=>null);
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 4000); // 4s
  try {
    const res = await (preload || fetch(event.request, {signal: ctrl.signal}));
    clearTimeout(timeout);
    if (res && res.ok) cache.put(event.request, res.clone());
    return res;
  } catch (e) {
    clearTimeout(timeout);
    const cached = await cache.match(event.request);
    return cached || cache.match('offline.html');
  }
}

async function staleWhileRevalidate(event) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(event.request);
  const fetchPromise = fetch(event.request).then((res) => {
    if (res && res.ok) cache.put(event.request, res.clone());
    return res;
  }).catch(()=>null);
  return cached || fetchPromise || new Response('', {status: 504});
}

async function cacheFirst(event) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(event.request);
  if (cached) return cached;
  try {
    const res = await fetch(event.request);
    if (res && res.ok) cache.put(event.request, res.clone());
    return res;
  } catch(e) {
    return new Response('', {status: 504});
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;

  if (isHtmlRequest(request)) {
    event.respondWith(networkFirstHtml(event));
    return;
  }

  if (url.origin === self.location.origin) {
    if (/\.(png|jpg|jpeg|webp|svg|ico)$/i.test(url.pathname)) {
      event.respondWith(cacheFirst(event));
      return;
    }
    if (/\.(css|js|mjs|wasm)$/i.test(url.pathname)) {
      event.respondWith(staleWhileRevalidate(event));
      return;
    }
  }

  event.respondWith((async () => {
    try { return await fetch(request); }
    catch { return new Response('', {status: 502}); }
  })());
});
