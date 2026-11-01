/* Service worker de Radio Bilbo.
   Sirve para que el navegador ofrezca "Instalar app" y para abrir la pantalla del reproductor
   rápido. El streaming de la radio y cualquier sitio externo NUNCA pasan por acá: van directo. */

const CACHE = "radio-bilbo-v1";
const BASICOS = ["app.html", "logo.png", "icon-192.png", "icon-512.png", "manifest.json"];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE)
      .then(function (c) { return c.addAll(BASICOS); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (claves) {
        return Promise.all(claves.filter(function (k) { return k !== CACHE; })
          .map(function (k) { return caches.delete(k); }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  var req = e.request;
  var url = new URL(req.url);

  // Solo archivos propios de la página. El streaming (otro dominio), los audios mp3 y
  // los pedidos parciales (range) se dejan pasar sin tocar.
  if (req.method !== "GET" || url.origin !== self.location.origin) return;
  if (req.headers.has("range") || url.pathname.endsWith(".mp3")) return;

  // Primero internet (así siempre se ve la versión nueva); si no hay, lo guardado.
  e.respondWith(
    fetch(req).then(function (res) {
      if (res && res.ok) {
        var copia = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copia); });
      }
      return res;
    }).catch(function () {
      return caches.match(req).then(function (r) { return r || caches.match("app.html"); });
    })
  );
});
