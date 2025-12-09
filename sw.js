const CACHE_NAME = 'nostalgy-core-v9'; // Versión nueva

const urlsToCache = [
  './',
  './index.html',
  './inicio.html',
  './admin.html', 
  './nosotros.html',
  './manifest.webmanifest',
  './style/style.css',
  './scripts/pwa.js',
  './scripts/script.js',
  './scripts/productos.js',
  
  // IMÁGENES (Corregidas según tus archivos reales)
  './recursos/fondo.webp',
  './recursos/fondo2.webp',
  './recursos/logoNC.webp',
  
  // OJO: En tu carpeta son PNG, no WEBP
  './recursos/cursor-pixel.png', 
  './recursos/mano-pixel.png',
  
  './recursos/fish.glb',
  
  // LIBRERÍAS EXTERNAS
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css',
  'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js',
  'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js',
  'https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.css',
  'https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/js/bootstrap.bundle.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jquery/3.6.0/jquery.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jquery.ripples/0.5.3/jquery.ripples.js',

  // FUENTES (Solo los CSS iniciales)
  'https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap',
  'https://fonts.googleapis.com/css2?family=Fredoka:wght@700&display=swap',
  'https://fonts.googleapis.com/css2?family=Sora:wght@400;800&display=swap'
];

self.addEventListener('install', event => {
  // Forzamos la espera para que se active rápido
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        // Intentamos guardar todo. Si un archivo falta, esto fallará.
        return cache.addAll(urlsToCache);
      })
      .catch(err => {
        console.error('[SW] ERROR CRÍTICO EN INSTALL: Revisa que todos los archivos de urlsToCache existan.', err);
      })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // --- FIX 1: IGNORAR EXTENSIONES DE CHROME ---
  // Si no empieza con http o https (ej: chrome-extension://), no hacemos nada.
  if (!url.protocol.startsWith('http')) return;

  // --- ESTRATEGIA 1: FUENTES DE GOOGLE ---
  if (url.origin.includes('fonts.gstatic.com')) {
    event.respondWith(
      caches.match(event.request).then(res => {
        if (res) return res;
        return fetch(event.request).then(newRes => {
          return caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, newRes.clone());
            return newRes;
          });
        });
      })
    );
    return;
  }

  // --- ESTRATEGIA 2: CACHÉ FIRST (RESTO) ---
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cachedRes => {
      if (cachedRes) return cachedRes;

      return fetch(event.request).then(networkRes => {
        // Validamos que la respuesta sea correcta antes de guardar
        if (!networkRes || networkRes.status !== 200 || networkRes.type !== 'basic' && networkRes.type !== 'cors') {
          return networkRes;
        }

        const resClone = networkRes.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, resClone);
        });

        return networkRes;
      }).catch(() => console.log('Offline: recurso no encontrado'));
    })
  );
});
