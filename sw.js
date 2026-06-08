const CACHE = 'zhigankuangan-v1';

const FILES = [
  './', './index.html', './css/style.css',
  './js/main.js', './js/chart.js', './js/data-bridge.js',
  './js/gas.js', './js/roller.js', './js/temperature.js',
  './js/three-scene.js', './libs/echarts.min.js', './libs/gsap.min.js',
  './pages/gas.html', './pages/roller.html', './pages/temperature.html',
  './manifest.json',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request).then(res => {
      return caches.open(CACHE).then(c => { c.put(e.request, res.clone()); return res; });
    }))
  );
});
