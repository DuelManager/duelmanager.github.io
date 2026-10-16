// =============================================================
// torneo.js — logica dei tornei: sorteggio, tabellone, classifica
// Nessuna interfaccia qui. Ogni match usa una partita di partita.js.
// =============================================================

const DUEL = typeof module !== "undefined" ? require("./partita.js") : globalThis;

const MIN_GIOCATORI = 4;
const MAX_GIOCATORI = 16;

// ---------- Utilità ----------

// Mescola una lista (Fisher-Yates). "casuale" si può sostituire nei test.
function mescola(lista, casuale = Math.random) {
  const a = lista.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(casuale() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// La più piccola potenza di 2 che contiene n giocatori (6 -> 8, 9 -> 16)
function potenzaDiDue(n) {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

// Inverte i bit: con 2 bit 0,1,2,3 -> 0,2,1,3. Serve a spargere i bye nel tabellone.
function invertiBit(i, bit) {
  let r = 0;
  for (let k = 0; k < bit; k++) r = (r << 1) | ((i >> k) & 1);
  return r;
}

function nomeTurnoEliminazione(partiteNelTurno) {
  if (partiteNelTurno === 1) return "Finale";
  if (partiteNelTurno === 2) return "Semifinali";
  if (partiteNelTurno === 4) return "Quarti di finale";
  if (partiteNelTurno === 8) return "Ottavi di finale";
  return `Turno da ${partiteNelTurno} partite`;
}

function vittorieNecessarie(t) {
  return t.tipo === "standard" ? 2 : 1;
}

function nomeGiocatore(t, id) {
  return id === null || id === undefined ? null : t.giocatori[id].nome;
}

// ---------- Match ----------

// a, b: id dei giocatori, oppure null = posto vuoto
function creaMatch(id, a, b) {
  return {
    id, a, b,
    stato: "da giocare",   // "da giocare" | "in corso" | "conclusa"
    esito: null,           // "vittoria" | "doppia sconfitta" | "bye" | "vuota"
    vincitore: null,       // id di chi vince o passa il turno, null = nessuno
    punteggio: null,       // duel vinti [a, b]
    partita: null,         // la partita di partita.js, se giocata con l'app
  };
}

function matchReale(m) {
  return m.a !== null && m.b !== null;
}

// Un posto vuoto: chi c'è passa il turno (bye). Entrambi vuoti: nessuno passa.
function risolviAutomatico(m) {
  if (matchReale(m)) return;
  m.stato = "conclusa";
  if (m.a === null && m.b === null) {
    m.esito = "vuota";
    m.vincitore = null;
  } else {
    m.esito = "bye";
    m.vincitore = m.a !== null ? m.a : m.b;
  }
}

// ---------- Creazione ----------

// impostazioni: { tipo: "standard" | "casual", formato: "eliminazione" | "punti",
//                 nomi: [...], minuti: numero o null }
function creaTorneo(impostazioni, casuale = Math.random) {
  const { tipo, formato, nomi, minuti } = impostazioni;
  if (nomi.length < MIN_GIOCATORI || nomi.length > MAX_GIOCATORI) {
    throw new Error(`Servono da ${MIN_GIOCATORI} a ${MAX_GIOCATORI} giocatori`);
  }
  const giocatori = nomi.map((nome, id) => ({ id, nome }));
  const ordine = mescola(giocatori.map((g) => g.id), casuale);   // il sorteggio
  const t = {
    tipo, formato, minuti, giocatori,
    turni: [],
    turnoCorrente: 0,
    numeroTurni: 0,
    concluso: false,
    campione: null,
  };
  if (formato === "eliminazione") {
    t.dimensione = potenzaDiDue(nomi.length);
    t.numeroTurni = Math.log2(t.dimensione);
    t.turni.push(primoTurnoEliminazione(ordine, t.dimensione));
  } else {
    t.turni = calendarioPunti(ordine);
    t.numeroTurni = t.turni.length;
  }
  return t;
}

// Tabellone da "dimensione" posti (potenza di 2). I posti in più sono bye,
// sparsi in modo che due bye non si incontrino finché è possibile.
function primoTurnoEliminazione(ordine, dimensione) {
  const nPartite = dimensione / 2;
  const nBye = dimensione - ordine.length;
  const bit = Math.log2(nPartite);
  const conBye = new Set();
  for (let i = 0; i < nBye; i++) conBye.add(invertiBit(i, bit));

  const partite = [];
  let k = 0;
  for (let i = 0; i < nPartite; i++) {
    const a = ordine[k++];
    const b = conBye.has(i) ? null : ordine[k++];
    const m = creaMatch(`0-${i}`, a, b);
    risolviAutomatico(m);
    partite.push(m);
  }
  return { nome: nomeTurnoEliminazione(nPartite), partite, riposa: null };
}

// Girone all'italiana col metodo "a cerchio": il primo resta fermo, gli altri ruotano.
// Con un numero dispari si aggiunge un posto vuoto: chi lo pesca riposa quel turno.
function calendarioPunti(ordine) {
  const lista = ordine.slice();
  if (lista.length % 2 === 1) lista.push(null);
  const n = lista.length;
  const turni = [];
  for (let r = 0; r < n - 1; r++) {
    const partite = [];
    let riposa = null;
    for (let i = 0; i < n / 2; i++) {
      const a = lista[i];
      const b = lista[n - 1 - i];
      if (a === null || b === null) {
        riposa = a === null ? b : a;
        continue;
      }
      partite.push(creaMatch(`${r}-${partite.length}`, a, b));
    }
    turni.push({ nome: `Turno ${r + 1}`, partite, riposa });
    lista.splice(1, 0, lista.pop());
  }
  return turni;
}

// ---------- Ricerca e regole ----------

function trovaMatch(t, id) {
  for (let r = 0; r < t.turni.length; r++) {
    const indice = t.turni[r].partite.findIndex((m) => m.id === id);
    if (indice !== -1) return { match: t.turni[r].partite[indice], turno: r, indice };
  }
  return null;
}

function eFinale(t, r) {
  return t.formato === "eliminazione" && r === t.numeroTurni - 1;
}

// Policy 2.5: la finale a eliminazione diretta non ha limite di tempo
function durataMatch(t, r) {
  return eFinale(t, r) ? null : t.minuti;
}

// I risultati si possono cambiare solo nel turno in corso
function modificabile(t, r) {
  return !t.concluso && r === t.turnoCorrente;
}

function matchInCorso(t) {
  if (t.concluso) return [];
  return t.turni[t.turnoCorrente].partite.filter((m) => m.stato === "in corso");
}

function turnoCompleto(t) {
  return t.turni[t.turnoCorrente].partite.every((m) => m.stato === "conclusa");
}

// ---------- Giocare un match ----------

// primo: 0 = inizia il giocatore "a", 1 = inizia "b"
function iniziaMatch(t, id, primo, ora) {
  const tr = trovaMatch(t, id);
  if (!tr) return null;
  const { match: m, turno: r } = tr;
  if (!modificabile(t, r) || !matchReale(m) || m.stato !== "da giocare") return null;
  const minuti = durataMatch(t, r);
  m.partita = DUEL.creaPartita(
    t.tipo, [nomeGiocatore(t, m.a), nomeGiocatore(t, m.b)], minuti, primo, vittorieNecessarie(t));
  if (minuti !== null) DUEL.avviaTimer(m.partita.timer, ora);
  m.stato = "in corso";
  return m.partita;
}

// Copia nel tabellone il risultato di una partita finita sul tavolo
function registraDaPartita(t, id) {
  const tr = trovaMatch(t, id);
  if (!tr) return false;
  const m = tr.match;
  const p = m.partita;
  if (m.stato !== "in corso" || !p || !p.finita) return false;
  m.stato = "conclusa";
  m.punteggio = [p.vittorie[0], p.vittorie[1]];
  if (p.risultato === 0 || p.risultato === 1) {
    m.esito = "vittoria";
    m.vincitore = p.risultato === 0 ? m.a : m.b;
  } else {
    m.esito = "doppia sconfitta";
    m.vincitore = null;
  }
  return true;
}

// Risultato deciso a mano, senza passare dal tavolo (o per correggerlo).
// lato: "a" | "b" | null = doppia sconfitta. punteggio: [a, b] oppure null = automatico.
function assegnaRisultato(t, id, lato, punteggio, ora) {
  const tr = trovaMatch(t, id);
  if (!tr) return false;
  const { match: m, turno: r } = tr;
  if (!modificabile(t, r) || !matchReale(m)) return false;

  const p = m.partita;
  if (p) {
    if (!p.finita) DUEL.fermaTimer(p.timer, ora);
    p.finita = true;
    p.risultato = lato === "a" ? 0 : lato === "b" ? 1 : "doppia sconfitta";
  }
  m.stato = "conclusa";
  if (lato === null) {
    m.esito = "doppia sconfitta";
    m.vincitore = null;
    m.punteggio = punteggio || (p ? [p.vittorie[0], p.vittorie[1]] : [0, 0]);
  } else {
    const v = vittorieNecessarie(t);
    m.esito = "vittoria";
    m.vincitore = lato === "a" ? m.a : m.b;
    m.punteggio = punteggio || (lato === "a" ? [v, 0] : [0, v]);
  }
  return true;
}

// Riporta il match a "da giocare" (si perde il duel giocato sul tavolo)
function azzeraMatch(t, id) {
  const tr = trovaMatch(t, id);
  if (!tr || !modificabile(t, tr.turno) || !matchReale(tr.match)) return false;
  const m = tr.match;
  Object.assign(m, creaMatch(m.id, m.a, m.b));
  return true;
}

// ---------- Avanzamento ----------

// Chiude il turno in corso e prepara il successivo (o conclude il torneo)
function prosegui(t) {
  if (t.concluso || !turnoCompleto(t)) return false;

  if (t.turnoCorrente === t.numeroTurni - 1) {
    t.concluso = true;
    if (t.formato === "eliminazione") t.campione = t.turni[t.turnoCorrente].partite[0].vincitore;
    return true;
  }

  if (t.formato === "eliminazione") {
    const precedenti = t.turni[t.turnoCorrente].partite;
    const r = t.turnoCorrente + 1;
    const partite = [];
    for (let i = 0; i < precedenti.length; i += 2) {
      const m = creaMatch(`${r}-${i / 2}`, precedenti[i].vincitore, precedenti[i + 1].vincitore);
      risolviAutomatico(m);   // avversario eliminato da una doppia sconfitta: passa il turno
      partite.push(m);
    }
    t.turni.push({ nome: nomeTurnoEliminazione(partite.length), partite, riposa: null });
  }
  t.turnoCorrente += 1;
  return true;
}

// ---------- Classifica (torneo a punti) ----------

function vincitoreScontroDiretto(t, x, y) {
  for (const turno of t.turni) {
    for (const m of turno.partite) {
      if (m.stato !== "conclusa" || m.esito !== "vittoria") continue;
      if ((m.a === x && m.b === y) || (m.a === y && m.b === x)) return m.vincitore;
    }
  }
  return null;
}

// Ordine: match vinti, poi differenza duel, poi scontro diretto (solo tra due a pari merito).
// Chi resta pari condivide la posizione.
function classifica(t) {
  const righe = t.giocatori.map((g) => ({
    id: g.id, nome: g.nome, giocate: 0, vinte: 0, perse: 0, duelVinti: 0, duelPersi: 0, pos: 0,
  }));
  for (const turno of t.turni) {
    for (const m of turno.partite) {
      if (m.stato !== "conclusa" || !matchReale(m)) continue;
      const ra = righe[m.a];
      const rb = righe[m.b];
      ra.giocate++;
      rb.giocate++;
      if (m.vincitore === m.a) { ra.vinte++; rb.perse++; }
      else if (m.vincitore === m.b) { rb.vinte++; ra.perse++; }
      else { ra.perse++; rb.perse++; }
      if (m.punteggio) {
        ra.duelVinti += m.punteggio[0]; ra.duelPersi += m.punteggio[1];
        rb.duelVinti += m.punteggio[1]; rb.duelPersi += m.punteggio[0];
      }
    }
  }
  const diff = (r) => r.duelVinti - r.duelPersi;
  const pari = (x, y) => x.vinte === y.vinte && diff(x) === diff(y);
  righe.sort((x, y) => y.vinte - x.vinte || diff(y) - diff(x) || x.id - y.id);

  const separati = new Set();
  for (let i = 0; i < righe.length;) {
    let j = i + 1;
    while (j < righe.length && pari(righe[i], righe[j])) j++;
    if (j - i === 2) {
      const v = vincitoreScontroDiretto(t, righe[i].id, righe[i + 1].id);
      if (v !== null) {
        if (v === righe[i + 1].id) [righe[i], righe[i + 1]] = [righe[i + 1], righe[i]];
        separati.add(righe[i + 1].id);
      }
    }
    i = j;
  }
  righe.forEach((r, k) => {
    const prec = righe[k - 1];
    r.pos = k > 0 && pari(prec, r) && !separati.has(r.id) ? prec.pos : k + 1;
  });
  return righe;
}

// ---------- Piazzamenti (eliminazione diretta) ----------

// Chi perde in un turno con N partite si piazza (N + 1)°: in finale 2°, in semifinale 3°,
// nei quarti 5°, negli ottavi 9°. Chi perde nello stesso turno è a pari merito.
function piazzamenti(t) {
  if (t.formato !== "eliminazione") return [];
  const righe = t.giocatori.map((g) => ({ id: g.id, nome: g.nome, pos: 1, turnoEliminato: null }));
  t.turni.forEach((turno, r) => {
    const nPartite = t.dimensione / 2 ** (r + 1);
    for (const m of turno.partite) {
      if (m.stato !== "conclusa") continue;
      for (const id of [m.a, m.b]) {
        if (id === null || id === m.vincitore) continue;
        righe[id].pos = nPartite + 1;
        righe[id].turnoEliminato = r;
      }
    }
  });
  return righe.sort((x, y) => x.pos - y.pos || x.id - y.id);
}

// Per i test con Node (nel browser viene ignorato)
if (typeof module !== "undefined") {
  module.exports = {
    MIN_GIOCATORI, MAX_GIOCATORI, mescola, potenzaDiDue, nomeTurnoEliminazione,
    creaTorneo, trovaMatch, eFinale, durataMatch, modificabile, matchReale, matchInCorso,
    turnoCompleto, iniziaMatch, registraDaPartita, assegnaRisultato, azzeraMatch,
    prosegui, classifica, piazzamenti, nomeGiocatore,
  };
}
