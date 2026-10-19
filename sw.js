// =============================================================
// sw.js — service worker: l'app funziona anche senza internet.
// Strategia "prima la rete": con la connessione si scarica sempre la versione
// aggiornata (e se ne salva una copia); senza connessione si usa l'ultima copia.
// Così ogni modifica caricata su GitHub arriva subito, senza cambiare questo file.
// =============================================================

const CACHE = "duelmanager-v1";
const FILE_APP = [
  "./", "index.html", "manifest.webmanifest", "pwa.js",
  "partita.js", "torneo.js", "cronologia.js", "base.js", "lingua.js",
  "duello.js", "torneo-ui.js", "cronologia-ui.js", "condividi.js", "app.js",
  "icona-192.png", "icona-512.png", "icona-180.png", "icona-32.png", "icona-tonda-512.png",
];

self.addEventListener("install", (ev) => {
  ev.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILE_APP)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (ev) => {
  ev.waitUntil(
    caches.keys()
      .then((nomi) => Promise.all(nomi.filter((n) => n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (ev) => {
  const richiesta = ev.request;
  if (richiesta.method !== "GET") return;
  const url = new URL(richiesta.url);
  // Solo i file dell'app e i caratteri di Google Fonts (le future connessioni online passano dirette)
  const daSalvare = url.origin === self.location.origin ||
    url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";
  if (!daSalvare) return;

  // Per i file dell'app chiediamo sempre al server se sono cambiati ("no-cache"):
  // senza, il browser potrebbe riusare per qualche minuto una copia vecchia.
  const daScaricare = url.origin === self.location.origin
    ? new Request(richiesta.url, { cache: "no-cache", credentials: "same-origin" })
    : richiesta;

  ev.respondWith(
    fetch(daScaricare)
      .then((risposta) => {
        if (risposta && (risposta.ok || risposta.type === "opaque")) {
          const copia = risposta.clone();
          caches.open(CACHE).then((c) => c.put(richiesta, copia));
        }
        return risposta;
      })
      .catch(() =>
        caches.match(richiesta, { ignoreSearch: true })
          .then((salvata) => salvata || (richiesta.mode === "navigate" ? caches.match("index.html") : undefined))
      )
  );
});
