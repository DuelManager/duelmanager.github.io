// =============================================================
// pwa.js — rende l'app installabile e utilizzabile senza internet.
// Registra il service worker (sw.js) solo sul sito pubblicato (https)
// o in prova sul proprio computer (localhost).
// =============================================================

if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => { /* senza service worker l'app funziona lo stesso */ });
  });
}
