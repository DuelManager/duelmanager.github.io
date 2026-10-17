// =============================================================
// base.js — strumenti comuni: stato dell'app, salvataggio, suoni, avvisi
// =============================================================

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];

const CHIAVE_SALVATAGGIO = "ygo-gestore-v2";
const CHIAVE_VECCHIA = "ygo-partita-v1";
const AVVISO_MS = 5 * 60 * 1000;

function statoIniziale() {
  return {
    schermata: "home",
    duello: null,        // { partita, impostazioni } del duello libero
    torneo: null,        // il torneo (vedi torneo.js)
    matchAperto: null,   // id del match del torneo mostrato sul tavolo
    bozzaTorneo: null,   // scelte del setup torneo, ricordate per la volta dopo
    suono: true,
    lingua: null,        // "it" | "en"; null = scelta in base al browser all'avvio
    cronologia: [],      // ultime partite concluse (massimo MAX_CRONOLOGIA), la più recente prima
    preferiti: [],       // partite salvate con la stella, senza limite
  };
}

// Tutto ciò che va ricordato tra una ricarica e l'altra
let app = statoIniziale();
// La partita mostrata sul tavolo: il duello libero oppure un match del torneo
let partita = null;

// ---------- Testo ----------

function esc(t) {
  return String(t).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function formatTempo(ms) {
  const s = Math.ceil(ms / 1000);
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

function segno(n) { return n > 0 ? `+${n}` : `−${Math.abs(n)}`; }

// "2400" o "-2400" = danno, "+1000" = guadagno. Ritorna null se non valido.
function leggiValore(testo) {
  const t = testo.replace(/\s/g, "").replace("−", "-");
  const m = /^([+-]?)(\d{1,6})$/.exec(t);
  if (!m) return null;
  const n = parseInt(m[2], 10);
  if (n === 0) return null;
  return m[1] === "+" ? n : -n;
}

// ---------- Salvataggio nel browser ----------

function salva() {
  try {
    localStorage.setItem(CHIAVE_SALVATAGGIO, JSON.stringify(app));
  } catch (e) { /* salvataggio non disponibile: l'app funziona lo stesso */ }
}

function carica() {
  try {
    const dati = JSON.parse(localStorage.getItem(CHIAVE_SALVATAGGIO));
    if (dati && dati.schermata) {
      // Salvataggio di prima della cronologia: le partite già finite non vanno
      // aggiunte adesso con l'ora sbagliata, quindi le segniamo come già registrate.
      if (!Array.isArray(dati.cronologia)) {
        const p = dati.duello && dati.duello.partita;
        if (p && p.finita) p.idCronologia = "precedente";
        if (p && p.duel && p.duel.esito !== null) p.duel.idCronologia = "precedente";
        if (dati.torneo && dati.torneo.concluso) dati.torneo.idCronologia = "precedente";
      }
      return Object.assign(statoIniziale(), dati);
    }
  } catch (e) { /* niente da caricare */ }

  // Duello salvato dalla versione precedente: lo recuperiamo
  try {
    const vecchio = JSON.parse(localStorage.getItem(CHIAVE_VECCHIA));
    if (vecchio && vecchio.partita) {
      const p = vecchio.partita;
      if (p.modalita === "torneo") p.modalita = "standard";
      if (p.vittoriePerMatch === undefined) p.vittoriePerMatch = p.modalita === "standard" ? 2 : null;
      const imp = vecchio.impostazioni || null;
      if (imp && imp.modalita === "torneo") imp.modalita = "standard";
      localStorage.removeItem(CHIAVE_VECCHIA);
      return Object.assign(statoIniziale(), {
        duello: { partita: p, impostazioni: imp },
        suono: vecchio.suono !== false,
      });
    }
  } catch (e) { /* niente da recuperare */ }
  return null;
}

// ---------- Suoni ----------

let audioCtx = null;
function contestoAudio() {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === "suspended") audioCtx.resume();
  } catch (e) { audioCtx = null; }
  return audioCtx;
}
// Il browser permette l'audio solo dopo un'interazione: lo sblocchiamo al primo clic o tasto,
// così anche gli avvisi del timer (che partono da soli) si sentono.
["pointerdown", "keydown"].forEach((t) => document.addEventListener(t, contestoAudio, { passive: true }));

// note: [frequenza in Hz, inizio in s, durata in s]
function suona(note, forma = "sine", volume = 0.2) {
  if (!app.suono) return;
  const ctx = contestoAudio();
  if (!ctx) return;
  const t0 = ctx.currentTime + 0.01;
  for (const [freq, inizio, durata] of note) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    const t = t0 + inizio;
    o.type = forma;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(volume, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + durata);
    o.connect(g).connect(ctx.destination);
    o.start(t);
    o.stop(t + durata + 0.02);
  }
}

const SUONI = {
  danno:    () => suona([[392, 0, 0.09], [262, 0.08, 0.16]], "triangle", 0.22),
  guadagno: () => suona([[523, 0, 0.08], [784, 0.07, 0.16]], "sine", 0.2),
  fase:     () => suona([[660, 0, 0.06]], "sine", 0.12),
  turno:    () => suona([[440, 0, 0.09], [660, 0.1, 0.14]], "sine", 0.16),
  annulla:  () => suona([[330, 0, 0.08]], "sine", 0.12),
  moneta:   () => suona([[1320, 0, 0.05], [1760, 0.06, 0.09]], "triangle", 0.14),
  dado:     () => suona([[700, 0, 0.03], [820, 0.06, 0.03], [600, 0.12, 0.03], [900, 0.18, 0.06]], "square", 0.06),
  fineDuel: () => suona([[523, 0, 0.12], [659, 0.12, 0.12], [784, 0.24, 0.32]], "triangle", 0.2),
  avviso:   () => suona([[880, 0, 0.22]], "sine", 0.25),
  scaduto:  () => suona([[880, 0, 0.22], [880, 0.35, 0.22], [880, 0.7, 0.4]], "sine", 0.25),
};

// Pulsanti "Suono" nelle barre e interruttore nelle impostazioni
function aggiornaBottoniSuono() {
  $$(".btn-suono").forEach((b) => {
    b.textContent = tr(app.suono ? "suono.si" : "suono.no");
    b.setAttribute("aria-pressed", String(app.suono));
  });
  const interruttore = $("#imp-suono");
  if (interruttore) interruttore.setAttribute("aria-checked", String(app.suono));
}

document.addEventListener("click", (ev) => {
  if (!ev.target.closest(".btn-suono, #imp-suono")) return;
  app.suono = !app.suono;
  if (app.suono) SUONI.fase();
  aggiornaBottoniSuono();
  salva();
});

// ---------- Telefono: pagina ferma come un'app ----------

// Schermo da telefono (verticale stretto o orizzontale basso): il tavolo usa la versione compatta.
// Deve corrispondere alle @media "TELEFONO — tavolo del duello" in index.html.
const MQ_COMPATTO = window.matchMedia(
  "(max-width: 600px) and (orientation: portrait), (max-height: 540px) and (orientation: landscape)");
function compatto() { return MQ_COMPATTO.matches; }
function quandoCambiaSchermo(funzione) {
  if (MQ_COMPATTO.addEventListener) MQ_COMPATTO.addEventListener("change", funzione);
  else if (MQ_COMPATTO.addListener) MQ_COMPATTO.addListener(funzione);   // Safari vecchi
}

// Niente zoom con due dita: l'iPhone ignora "user-scalable=no", quindi lo blocchiamo qui
["gesturestart", "gesturechange", "gestureend"].forEach((tipo) =>
  document.addEventListener(tipo, (ev) => ev.preventDefault(), { passive: false }));
document.addEventListener("touchmove", (ev) => {
  if (ev.touches.length > 1 || (typeof ev.scale === "number" && ev.scale !== 1)) ev.preventDefault();
}, { passive: false });
// Serve all'iPhone per mostrare l'effetto "premuto" sui pulsanti
document.addEventListener("touchstart", () => {}, { passive: true });

// Dopo aver scritto (tastiera chiusa) l'iPhone a volte lascia la pagina spostata: la rimettiamo a posto
document.addEventListener("focusout", () => {
  setTimeout(() => {
    const attivo = document.activeElement;
    if (!attivo || !attivo.matches("input, select, textarea")) window.scrollTo(0, 0);
  }, 120);
});

// ---------- Avvisi a comparsa ----------

let timerToast = null;
function avvisa(testo) {
  const el = $("#toast");
  el.textContent = testo;
  el.hidden = false;
  clearTimeout(timerToast);
  timerToast = setTimeout(() => { el.hidden = true; }, 5000);
}

// ---------- Schermo sempre acceso durante il duel ----------

let wakeLock = null;
async function tieniSchermoAcceso() {
  try {
    if ("wakeLock" in navigator && document.visibilityState === "visible" && !wakeLock) {
      wakeLock = await navigator.wakeLock.request("screen");
      wakeLock.addEventListener("release", () => { wakeLock = null; });
    }
  } catch (e) { /* non concesso: nessun problema */ }
}

function rilasciaSchermo() {
  try { if (wakeLock) wakeLock.release(); } catch (e) {}
  wakeLock = null;
}

document.addEventListener("visibilitychange", () => {
  if (app.schermata === "tavolo" && document.visibilityState === "visible") tieniSchermoAcceso();
});

// ---------- Conferma con un secondo clic ----------

function richiediConferma(bottone, testo, azione) {
  if (bottone.dataset.conferma === "1") {
    clearTimeout(Number(bottone.dataset.timer));
    bottone.dataset.conferma = "";
    bottone.textContent = bottone.dataset.testo;
    azione();
    return;
  }
  bottone.dataset.testo = bottone.textContent;
  bottone.dataset.conferma = "1";
  bottone.textContent = testo;
  bottone.dataset.timer = String(setTimeout(() => {
    bottone.dataset.conferma = "";
    bottone.textContent = bottone.dataset.testo;
  }, 3000));
}
