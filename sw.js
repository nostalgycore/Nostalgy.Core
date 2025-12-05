const CACHE_NAME = 'nostalgy-core-v3'; // Cambié a v2 para forzar actualización

// Archivos vitales para que la app se vea bien sin internet
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
  
  // IMÁGENES (Corregidas a .webp según tu proyecto)
  './recursos/fondo.webp',
  './recursos/fondo2.webp',
  './recursos/logoNC.webp',  // Corregido de png a webp
  './recursos/cursor-pixel.webp', // O .png si usaste el del paso anterior
  './recursos/mano-pixel.png',
  './recursos/fish.glb', // IMPORTANTE: El modelo 3D
  
  // LIBRERÍAS EXTERNAS (Bootstrap, Three.js, Swiper)
  // Necesarias para que no se rompa el diseño offline
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css',
  'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css',
  'https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap',
  'https://fonts.googleapis.com/css2?family=Fredoka:wght@700&display=swap',
  'https://fonts.googleapis.com/css2?family=Sora:wght@400;800&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js',
  'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js',
  'https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.css',
  'https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/js/bootstrap.bundle.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jquery/3.6.0/jquery.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jquery.ripples/0.5.3/jquery.ripples.js'
];

self.addEventListener('install', event => {
  console.log('[SW] Instalando y cacheando activos...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        // addAll es atómico: si uno falla, todo falla.
        // Asegúrate que todas las rutas existan.
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  console.log('[SW] Activado. Limpiando caché antiguo...');
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
  
  // Solo interceptar http/https (ignorar chrome-extension, etc)
  if (!url.protocol.startsWith('http')) return;
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // 1. Estrategia: Cache First (Si está en caché, úsalo)
        if (cachedResponse) {
          return cachedResponse;
        }
        
        // 2. Si no, ve a la red
        return fetch(event.request)
          .then(networkResponse => {
            // Verificar respuesta válida
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              return networkResponse;
            }

            // 3. Guardar copia en caché para la próxima
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return networkResponse;
          })
          .catch(() => {
            // Fallback opcional si falla red y no hay caché
            // Podrías retornar una imagen genérica o página offline.html aquí
            console.log('Offline: Recurso no disponible');
          });
      })
  );
});
