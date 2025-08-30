// sw.js
// Change the cache name when updating to cause cache refresh on progressive web apps

const CACHE_NAME = 'space-invader-cache-Aug-17-2025-20:39';
const FILES_TO_CACHE = [
  '/spaceinvaders/',
  '/spaceinvaders/index.html',
  'index.html',
  'howler.min.js',
  'main.js',
  'Cannon.js',
  'Invader.js',
  'Shield.js',
  'Missile.js',
  'Ufo.js',
  'invaderIcon.png',
  'images/invaderLogo.png',
  'images/soundOff.png',
  'images/soundOn.png',
  'images/controls.png',
  'sounds/duffAudioSprite.ac3',
  'sounds/duffAudioSprite.m4a',
  'sounds/duffAudioSprite.mp3',
  'sounds/duffAudioSprite.ogg',
  'sounds/cannonHit.wav',
  'sounds/laserShoot.wav',
  'sounds/explosion.wav',
  'sounds/ufoExplosion.wav',
  'sounds/ufo.wav'
];

// Install & cache files
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      for (const file of FILES_TO_CACHE) {
        try {
          await cache.add(file);
          console.log('✅ Cached:', file);
        } catch (err) {
          console.warn('❌ Failed to cache:', file, err);
        }
      }
    })
  );
});

// Activate & remove old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    (async () => {
      await clients.claim(); // <-- this is the correct usage
      const keys = await caches.keys();
      await Promise.all(keys.map(key => {
        if (key !== CACHE_NAME) return caches.delete(key);
      }));
    })()
  );
});


// Serve cached files or fetch from network
self.addEventListener('fetch', event => {
  // Always fetch fresh for HTML navigation requests
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/spaceinvaders/index.html'))
    );
    return;
  }

  // Otherwise serve from cache or fall back to network
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});
