// Service worker: de app blijft werken zonder internetverbinding.
const CACHE = 'elek-v1';

const BESTANDEN = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/app.css',
  './js/app.js',
  './js/store.js',
  './js/model.js',
  './js/symbols.js',
  './js/geometry.js',
  './js/canvas.js',
  './js/circuits.js',
  './js/panels.js',
  './js/board.js',
  './js/exporters.js',
  './icons/icoon.svg',
  './icons/icoon-192.png',
  './icons/icoon-512.png',
  './icons/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(BESTANDEN))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((namen) => Promise.all(namen.filter((n) => n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const verzoek = e.request;
  if (verzoek.method !== 'GET' || new URL(verzoek.url).origin !== self.location.origin) return;

  // Navigatie: eerst het netwerk, anders de opgeslagen pagina.
  if (verzoek.mode === 'navigate') {
    e.respondWith(
      fetch(verzoek)
        .then((antwoord) => {
          const kopie = antwoord.clone();
          caches.open(CACHE).then((c) => c.put('./index.html', kopie));
          return antwoord;
        })
        .catch(() => caches.match('./index.html').then((r) => r || caches.match('./')))
    );
    return;
  }

  // Overige bestanden: eerst uit de cache, daarna bijwerken.
  e.respondWith(
    caches.match(verzoek).then((gevonden) => {
      const vanNet = fetch(verzoek)
        .then((antwoord) => {
          if (antwoord && antwoord.status === 200) {
            const kopie = antwoord.clone();
            caches.open(CACHE).then((c) => c.put(verzoek, kopie));
          }
          return antwoord;
        })
        .catch(() => gevonden);
      return gevonden || vanNet;
    })
  );
});
