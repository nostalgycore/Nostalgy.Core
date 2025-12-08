const CACHE_NAME = 'nostalgy-core-v4'; // Subimos versión para forzar actualización

// Archivos estáticos (Tu código, imágenes y CSS iniciales)
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
  
  // IMÁGENES
  './recursos/fondo.webp',
  './recursos/fondo2.webp',
  './recursos/logoNC.webp',
  './recursos/cursor-pixel.webp',
  './recursos/mano-pixel.png',
  './recursos/fish.glb',
  // Agrega aquí cualquier otra imagen nueva que uses (ej: avatares de nosotros)
  
  // LIBRERÍAS EXTERNAS (CSS y JS)
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
  'https://fonts.googleapis.com/css2?family=Sora:wght@400;700&display=swap'
];

self.addEventListener('install', event => {
  console.log('[SW] Instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Cacheando archivos estáticos...');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  console.log('[SW] Activado. Limpiando versiones viejas...');
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

  // --- ESTRATEGIA ESPECIAL PARA FUENTES DE GOOGLE (.woff2) ---
  // Detectamos si la petición va hacia fonts.gstatic.com
  if (url.origin.includes('fonts.gstatic.com')) {
    event.respondWith(
      caches.match(event.request).then(response => {
        // Si ya tengo la fuente guardada, la devuelvo
        if (response) return response;

        // Si no, la busco en internet, la CLONO y la guardo para siempre
        return fetch(event.request).then(newResponse => {
          return caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, newResponse.clone());
            return newResponse;
          });
        });
      })
    );
    return; // Terminamos aquí para no mezclar con la otra lógica
  }

  // --- ESTRATEGIA STANDARD (Cache First) PARA EL RESTO ---
  
  // Ignorar protocolos no soportados
  if (!url.protocol.startsWith('http')) return;
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        
        return fetch(event.request)
          .then(networkResponse => {
            // Validamos respuesta
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
          .catch(() => {
            console.log('[SW] Modo Offline: Recurso no encontrado');
          });
      })
  );
});