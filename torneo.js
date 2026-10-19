// =============================================================
// torneo.js — logica dei tornei: sorteggio, tabellone, classifica
// Tre formati: "eliminazione" (eliminazione diretta), "punti" (tutti contro tutti)
// e "svizzero" (turni a pari vittorie, con top cut facoltativo).
// Nessuna interfaccia qui. Ogni match usa una partita di partita.js.
// =============================================================

const DUEL = typeof module !== "undefined" ? require("./partita.js") : globalThis;

const MIN_GIOCATORI = 4;
const MAX_GIOCATORI = 32;

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
  if (partiteNelTurno === 16) return "Sedicesimi di finale";
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

// impostazioni: { tipo: "standard" | "casual", formato: "eliminazione" | "punti" | "svizzero",
//                 nomi: [...], minuti: numero o null,
//                 solo svizzero: turni (numero di turni), taglio (0 | 4 | 8) }
// Se turni e taglio mancano si usano quelli consigliati dal regolamento.
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
  } else if (formato === "svizzero") {
    const n = nomi.length;
    const turni = impostazioni.turni ?? turniSvizzeriConsigliati(n);
    const taglio = impostazioni.taglio ?? topCutConsigliato(n);
    const lim = limitiTurniSvizzeri(n);
    if (turni < lim.min || turni > lim.max) throw new Error(`Turni svizzeri da ${lim.min} a ${lim.max}`);
    if (!topCutPossibili(n).includes(taglio)) throw new Error("Top cut non valido");
    t.turniSvizzeri = turni;
    t.taglio = taglio;
    t.numeroTurni = turni + (taglio ? Math.log2(taglio) : 0);
    t.ritirati = [];
    t.ordine = ordine;   // il sorteggio: decide il primo turno e gli spareggi rimasti pari
    t.turni.push(primoTurnoSvizzero(ordine));
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


// ---------- Svizzero ----------
// Regolamento Konami (eventi Tier 1 e 2): turni e top cut consigliati in base ai giocatori.

function turniSvizzeriConsigliati(n) {
  if (n <= 8) return 3;
  if (n <= 16) return 4;
  if (n <= 32) return 5;
  return Math.ceil(Math.log2(n));
}

function topCutConsigliato(n) {
  return n <= 8 ? 0 : n <= 32 ? 4 : 8;
}

// Il top cut deve lasciare fuori almeno un giocatore
function topCutPossibili(n) {
  return [0, 4, 8].filter((k) => k === 0 || n > k);
}

// Senza rivincite si possono giocare al massimo n - 1 turni
function limitiTurniSvizzeri(n) {
  return { min: 2, max: Math.min(n - 1, 9) };
}

// Primo turno: le coppie del sorteggio. Con un numero dispari l'ultimo ha il bye.
function primoTurnoSvizzero(ordine) {
  const partite = [];
  let riposa = null;
  for (let i = 0; i < ordine.length; i += 2) {
    if (i + 1 >= ordine.length) { riposa = ordine[i]; break; }
    partite.push(creaMatch(`0-${partite.length}`, ordine[i], ordine[i + 1]));
  }
  return { nome: "Turno 1", partite, riposa, fase: "svizzero" };
}

// Vittorie, sconfitte e avversari di ognuno nei turni svizzeri.
// Il bye conta come match vinto, ma senza avversario (non entra negli spareggi degli altri).
function bilanciSvizzeri(t) {
  const b = t.giocatori.map((g) => ({ id: g.id, vinte: 0, perse: 0, giocate: 0, bye: 0, avversari: [] }));
  for (const turno of t.turni) {
    if (turno.fase !== "svizzero") continue;
    if (turno.riposa !== null && turno.riposa !== undefined) {
      const r = b[turno.riposa];
      r.vinte++; r.giocate++; r.bye++;
    }
    for (const m of turno.partite) {
      if (m.stato !== "conclusa" || !matchReale(m)) continue;
      const ra = b[m.a];
      const rb = b[m.b];
      ra.giocate++; rb.giocate++;
      ra.avversari.push(m.b); rb.avversari.push(m.a);
      if (m.vincitore === m.a) { ra.vinte++; rb.perse++; }
      else if (m.vincitore === m.b) { rb.vinte++; ra.perse++; }
      else { ra.perse++; rb.perse++; }   // doppia sconfitta
    }
  }
  return b;
}

const media = (valori) => (valori.length ? valori.reduce((x, y) => x + y, 0) / valori.length : 0);

// Classifica dello svizzero, come il programma ufficiale Konami:
// 1) match vinti, 2) percentuale di vittorie degli avversari,
// 3) percentuale di vittorie degli avversari degli avversari.
// Chi resta pari su tutti e tre condivide la posizione (l'ordine segue il sorteggio).
function classificaSvizzera(t) {
  const b = bilanciSvizzeri(t);
  const perc = b.map((r) => (r.giocate ? r.vinte / r.giocate : 0));
  const omw = b.map((r) => media(r.avversari.map((o) => perc[o])));
  const oomw = b.map((r) => media(r.avversari.map((o) => omw[o])));
  const sorteggio = new Map((t.ordine || []).map((id, i) => [id, i]));
  const ritirati = new Set(t.ritirati || []);
  const righe = b.map((r) => ({
    id: r.id, nome: t.giocatori[r.id].nome,
    vinte: r.vinte, perse: r.perse, giocate: r.giocate, bye: r.bye,
    omw: omw[r.id], oomw: oomw[r.id], ritirato: ritirati.has(r.id), pos: 0,
  }));
  const confronta = (x, y) => (Math.abs(x - y) < 1e-9 ? 0 : x - y);
  const pari = (x, y) => x.vinte === y.vinte && confronta(x.omw, y.omw) === 0 && confronta(x.oomw, y.oomw) === 0;
  righe.sort((x, y) => y.vinte - x.vinte || confronta(y.omw, x.omw) || confronta(y.oomw, x.oomw) ||
    (sorteggio.get(x.id) ?? x.id) - (sorteggio.get(y.id) ?? y.id));
  righe.forEach((r, k) => { r.pos = k > 0 && pari(righe[k - 1], r) ? righe[k - 1].pos : k + 1; });
  return righe;
}

function chiaveCoppia(x, y) {
  return x < y ? `${x}-${y}` : `${y}-${x}`;
}

// Le coppie già giocate nello svizzero (per non ripeterle)
function coppieGiocate(t) {
  const giocate = new Set();
  for (const turno of t.turni) {
    if (turno.fase !== "svizzero") continue;
    for (const m of turno.partite) if (matchReale(m)) giocate.add(chiaveCoppia(m.a, m.b));
  }
  return giocate;
}

// Abbina in ordine: il primo con il primo libero che non ha già incontrato, tornando
// indietro se più avanti non si riesce. "passi" limita la ricerca nei casi senza soluzione.
function abbinaInOrdine(ids, giocate, consentiRivincite, passi) {
  if (ids.length === 0) return [];
  if (--passi.restanti < 0) return null;
  const [x, ...resto] = ids;
  for (let k = 0; k < resto.length; k++) {
    const y = resto[k];
    if (!consentiRivincite && giocate.has(chiaveCoppia(x, y))) continue;
    const sotto = abbinaInOrdine(resto.slice(0, k).concat(resto.slice(k + 1)), giocate, consentiRivincite, passi);
    if (sotto) return [[x, y], ...sotto];
  }
  return null;
}

// Turno svizzero r (dal secondo in poi): si gioca contro chi ha le stesse vittorie
// (a sorte tra loro), mai due volte lo stesso avversario finché è possibile.
// Con un numero dispari di giocatori il bye va a chi ha meno vittorie e meno bye.
function abbinaTurnoSvizzero(t, r, casuale = Math.random) {
  const bilanci = bilanciSvizzeri(t);
  const ritirati = new Set(t.ritirati || []);
  const attivi = bilanci.filter((x) => !ritirati.has(x.id));

  // In ordine di vittorie, a sorte dentro ogni gruppo
  const gruppi = new Map();
  for (const x of attivi) {
    if (!gruppi.has(x.vinte)) gruppi.set(x.vinte, []);
    gruppi.get(x.vinte).push(x.id);
  }
  const lista = [...gruppi.keys()].sort((a, b) => b - a).flatMap((v) => mescola(gruppi.get(v), casuale));
  const giocate = coppieGiocate(t);

  // Candidati al bye: dal fondo della lista, prima chi ha avuto meno bye
  let candidati = [null];
  if (lista.length % 2 === 1) {
    const minimo = Math.min(...lista.map((id) => bilanci[id].bye));
    const dalFondo = lista.slice().reverse();
    candidati = dalFondo.filter((id) => bilanci[id].bye === minimo).concat(dalFondo.filter((id) => bilanci[id].bye > minimo));
  }

  let coppie = null;
  let riposa = null;
  for (const consentiRivincite of [false, true]) {
    for (const c of candidati) {
      const ids = c === null ? lista : lista.filter((id) => id !== c);
      coppie = abbinaInOrdine(ids, giocate, consentiRivincite, { restanti: 50000 });
      if (coppie) { riposa = c; break; }
    }
    if (coppie) break;
  }
  const partite = coppie.map(([a, b], i) => creaMatch(`${r}-${i}`, a, b));
  return { nome: `Turno ${r + 1}`, partite, riposa, fase: "svizzero" };
}

// Ordine dei posti nel tabellone del top cut: 1-8, 4-5, 2-7, 3-6
// (così il primo e il secondo si possono incontrare solo in finale)
function ordineTesteDiSerie(k) {
  let o = [1, 2];
  while (o.length < k) {
    const n = o.length * 2;
    o = o.flatMap((s) => [s, n + 1 - s]);
  }
  return o;
}

// Primo turno del top cut, dai primi della classifica (chi si è ritirato non entra).
// Se per i ritiri restano troppo pochi giocatori, il top cut si riduce.
function primoTurnoTaglio(t, r) {
  const classif = classificaSvizzera(t).filter((x) => !x.ritirato);
  let k = t.taglio;
  while (k > 1 && k > classif.length) k /= 2;
  if (k < 2) return null;
  t.taglio = k;
  t.numeroTurni = t.turniSvizzeri + Math.log2(k);
  const posti = ordineTesteDiSerie(k).map((s) => classif[s - 1].id);
  const partite = [];
  for (let i = 0; i < posti.length; i += 2) partite.push(creaMatch(`${r}-${i / 2}`, posti[i], posti[i + 1]));
  return { nome: nomeTurnoEliminazione(k / 2), partite, riposa: null, fase: "taglio" };
}

// Ritiri: valgono dal prossimo abbinamento. Si possono segnare finché si gioca lo svizzero
// (anche dopo l'ultimo turno: chi si ritira non entra nel top cut).
function puoRitirare(t) {
  return t.formato === "svizzero" && !t.concluso && t.turni[t.turnoCorrente].fase === "svizzero";
}

function impostaRitiro(t, id, ritirato) {
  if (!puoRitirare(t) || !t.giocatori[id]) return false;
  const i = t.ritirati.indexOf(id);
  if (ritirato && i === -1) t.ritirati.push(id);
  if (!ritirato && i !== -1) t.ritirati.splice(i, 1);
  return true;
}

function eTaglio(t, r) {
  return t.formato === "svizzero" && !!t.turni[r] && t.turni[r].fase === "taglio";
}

function proseguiSvizzero(t, casuale) {
  const r = t.turnoCorrente;
  const turno = t.turni[r];

  if (turno.fase === "svizzero") {
    const attivi = t.giocatori.length - t.ritirati.length;
    if (r < t.turniSvizzeri - 1 && attivi >= 2) {
      t.turni.push(abbinaTurnoSvizzero(t, r + 1, casuale));
      t.turnoCorrente += 1;
      return true;
    }
    // Fine dello svizzero (prima del previsto se quasi tutti si sono ritirati)
    t.turniSvizzeri = r + 1;
    const taglio = t.taglio ? primoTurnoTaglio(t, r + 1) : null;
    if (taglio) {
      t.turni.push(taglio);
      t.turnoCorrente += 1;
      return true;
    }
    t.taglio = 0;
    t.numeroTurni = t.turniSvizzeri;
    t.concluso = true;
    const classif = classificaSvizzera(t);
    t.campione = (classif.find((x) => !x.ritirato) || classif[0]).id;
    return true;
  }

  // Top cut: come l'eliminazione diretta
  const precedenti = turno.partite;
  if (precedenti.length === 1) {
    t.concluso = true;
    t.campione = precedenti[0].vincitore;
    return true;
  }
  const partite = [];
  for (let i = 0; i < precedenti.length; i += 2) {
    const m = creaMatch(`${r + 1}-${i / 2}`, precedenti[i].vincitore, precedenti[i + 1].vincitore);
    risolviAutomatico(m);
    partite.push(m);
  }
  t.turni.push({ nome: nomeTurnoEliminazione(partite.length), partite, riposa: null, fase: "taglio" });
  t.turnoCorrente += 1;
  return true;
}

// Classifica finale dello svizzero: chi è entrato nel top cut è piazzato dal tabellone
// (vincitore 1°, finalista 2°, semifinalisti 3°...), gli altri seguono nell'ordine dello svizzero.
function piazzamentiSvizzero(t) {
  const classif = classificaSvizzera(t);
  const turniTaglio = t.turni.map((tu, r) => ({ tu, r })).filter((x) => x.tu.fase === "taglio");
  const righe = classif.map((x) => ({ id: x.id, nome: x.nome, pos: 0, turnoEliminato: null, nelTaglio: false }));
  const perId = new Map(righe.map((x) => [x.id, x]));
  if (turniTaglio.length) {
    for (const m of turniTaglio[0].tu.partite) for (const id of [m.a, m.b]) {
      if (id !== null) { perId.get(id).nelTaglio = true; perId.get(id).pos = 1; }
    }
    for (const { tu, r } of turniTaglio) {
      for (const m of tu.partite) {
        if (m.stato !== "conclusa") continue;
        for (const id of [m.a, m.b]) {
          if (id === null || id === m.vincitore) continue;
          perId.get(id).pos = tu.partite.length + 1;
          perId.get(id).turnoEliminato = r;
        }
      }
    }
  }
  const quanti = righe.filter((x) => x.nelTaglio).length;
  let k = quanti;
  for (const x of righe) if (!x.nelTaglio) x.pos = ++k;
  const ordine = new Map(righe.map((x, i) => [x.id, i]));
  return righe.sort((x, y) => x.pos - y.pos || ordine.get(x.id) - ordine.get(y.id));
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
  if (t.formato === "svizzero") return eTaglio(t, r) && t.turni[r].partite.length === 1;
  return t.formato === "eliminazione" && r === t.numeroTurni - 1;
}

// Policy 2.5: la finale a eliminazione diretta (anche quella del top cut) non ha limite di tempo
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

// Chiude il turno in corso e prepara il successivo (o conclude il torneo).
// "casuale" serve agli abbinamenti dello svizzero (nei test si sostituisce).
function prosegui(t, casuale = Math.random) {
  if (t.concluso || !turnoCompleto(t)) return false;
  if (t.formato === "svizzero") return proseguiSvizzero(t, casuale);

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
  if (t.formato === "svizzero") return piazzamentiSvizzero(t);
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
    turniSvizzeriConsigliati, topCutConsigliato, topCutPossibili, limitiTurniSvizzeri,
    classificaSvizzera, ordineTesteDiSerie, puoRitirare, impostaRitiro, eTaglio,
  };
}
