const CACHE_NAME = 'nostalgy-core-v6'; // Versión nueva

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
  
  // IMÁGENES (Verifica que todas existan en la carpeta recursos)
  './recursos/fondo.webp',
  './recursos/fondo2.webp',
  './recursos/logoNC.webp',
  './recursos/cursor-pixel.png',
  './recursos/manoPixel.wepb',
  './recursos/coral-1.wepb',
  './recursos/coral-2.wepb',
  './recursos/coral-3.wepb',
  './recursos/cybercore.wepb',
  './recursos/frutiger.wepb',
  './recursos/oldweb.wepb',
  './recursos/y2k.wepb',
  './recursos/tvrota.mp4',
  './recursos/fish.glb',
  // Si agregaste avatares u otras imágenes, agrégalos aquí
  
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

  // FUENTES (Solo los CSS)
  'https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap',
  'https://fonts.googleapis.com/css2?family=Fredoka:wght@700&display=swap',
  'https://fonts.googleapis.com/css2?family=Sora:wght@400;700&display=swap'
];

self.addEventListener('install', event => {
  console.log('[SW] Instalando...');
  // Usamos skipWaiting para que se active rápido
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        // Intentamos cachear todo. Si algo falla, lo veremos en consola.
        return cache.addAll(urlsToCache);
      })
      .catch(err => {
        console.error('[SW] CRÍTICO: Falló la caché de instalación. Revisa urlsToCache.', err);
      })
  );
});

self.addEventListener('activate', event => {
  console.log('[SW] Activado.');
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

  // --- ESTRATEGIA 1: FUENTES REALES (gstatic.com) ---
  // Esto es lo que faltaba para que la tipografía se quede guardada
  if (url.origin.includes('fonts.gstatic.com')) {
    event.respondWith(
      caches.match(event.request).then(response => {
        if (response) return response; // Si ya la tengo, la uso

        // Si no, la bajo, la guardo y la devuelvo
        return fetch(event.request).then(newResponse => {
          return caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, newResponse.clone());
            return newResponse;
          });
        });
      })
    );
    return;
  }

  // --- ESTRATEGIA 2: CACHÉ FIRST (Resto de archivos) ---
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) return response;
        
        return fetch(event.request)
          .then(networkResponse => {
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic' && networkResponse.type !== 'cors') {
              return networkResponse;
            }
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
            return networkResponse;
          })
          .catch(() => console.log('Offline y sin caché:', event.request.url));
      })
  );
});
