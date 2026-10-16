// =============================================================
// partita.js — stato di una partita di Yu-Gi-Oh e regole
// Nessuna interfaccia qui: solo dati e funzioni che li modificano.
// =============================================================

const LP_INIZIALI = 8000;
const FASI = ["Draw", "Standby", "Main 1", "Battle", "Main 2", "End"];
const FASE_END = FASI.length - 1;

// ---------- Creazione ----------

// modalita: "standard" | "casual"
// nomi: ["Alessio", "Marco"]
// durataMinuti: numero, oppure null = senza tempo
// vittoriePerMatch: quanti duel servono per vincere il match.
//   Standard = 2 (al meglio di 3). Casual libero = null (rivincite senza fine).
//   Nei tornei casual = 1 (un duel decide il match).
function creaPartita(modalita, nomi, durataMinuti, primoGiocatore = 0, vittoriePerMatch) {
  if (vittoriePerMatch === undefined) vittoriePerMatch = modalita === "standard" ? 2 : null;
  return {
    modalita,
    vittoriePerMatch,
    giocatori: [{ nome: nomi[0] }, { nome: nomi[1] }],
    vittorie: [0, 0],          // duel vinti nel match, o vittorie tra rivincite (casual)
    risultatiDuel: [],         // es. [0, "pareggio", 1] = chi ha vinto ogni duel
    timer: creaTimer(durataMinuti),
    duel: creaDuel(primoGiocatore),
    duelGiocati: [],           // duel già chiusi, con il loro registro (per la cronologia)
    finita: false,
    risultato: null,           // 0 | 1 = vincitore del match, "doppia sconfitta"
  };
}

function creaDuel(primoGiocatore) {
  return {
    eventi: [],                // UNICA fonte di verità per LP, moneta e dado
    primoGiocatore,
    giocatoreAttivo: primoGiocatore,
    turno: 1,
    fase: 1,                   // indice in FASI: il primo turno parte dalla Standby (niente Draw)
    esito: null,               // null = in corso, 0 | 1 = vincitore, "pareggio"
  };
}

// ---------- Life point (calcolati dagli eventi) ----------

// Ogni evento "lp" ha variazioni = [variazione giocatore 0, variazione giocatore 1]
function lp(duel, giocatore) {
  let totale = LP_INIZIALI;
  for (const e of duel.eventi) {
    if (e.tipo === "lp") totale += e.variazioni[giocatore];
  }
  return Math.max(0, totale);
}

// Modifica i LP di entrambi in un solo evento (es. danno a tutti e due).
// Un unico evento = un unico annulla, e il pareggio è possibile.
function modificaLPEntrambi(partita, variazione0, variazione1) {
  const duel = partita.duel;
  if (duel.esito !== null || partita.finita) return;
  if (variazione0 === 0 && variazione1 === 0) return;
  duel.eventi.push({
    tipo: "lp", variazioni: [variazione0, variazione1],
    turno: duel.turno, fase: FASI[duel.fase],
  });
  aggiornaEsito(duel);
}

// valore: es. -2400 o +1000
function modificaLP(partita, giocatore, valore) {
  if (giocatore === 0) modificaLPEntrambi(partita, valore, 0);
  else modificaLPEntrambi(partita, 0, valore);
}

// Dimezza i LP attuali (se dispari arrotonda per eccesso i LP rimasti)
function dimezzaLP(partita, giocatore) {
  const attuali = lp(partita.duel, giocatore);
  const rimasti = Math.ceil(attuali / 2);
  modificaLP(partita, giocatore, rimasti - attuali);
}

function aggiornaEsito(duel) {
  const a = lp(duel, 0), b = lp(duel, 1);
  if (a === 0 && b === 0) duel.esito = "pareggio";
  else if (a === 0) duel.esito = 1;
  else if (b === 0) duel.esito = 0;
  else duel.esito = null;
}

// Annulla: toglie l'ultimo evento e ricalcola tutto
function annulla(partita) {
  const duel = partita.duel;
  if (partita.finita || duel.eventi.length === 0) return;
  duel.eventi.pop();
  aggiornaEsito(duel);
}

// ---------- Moneta e dado (anche loro eventi) ----------

// Esito salvato come codice ("testa" | "croce"): l'interfaccia lo traduce
function lanciaMoneta(partita) {
  const esito = Math.random() < 0.5 ? "testa" : "croce";
  partita.duel.eventi.push({ tipo: "moneta", esito, turno: partita.duel.turno, fase: FASI[partita.duel.fase] });
  return esito;
}

function lanciaDado(partita) {
  const esito = 1 + Math.floor(Math.random() * 6);
  partita.duel.eventi.push({ tipo: "dado", esito, turno: partita.duel.turno, fase: FASI[partita.duel.fase] });
  return esito;
}

// ---------- Fasi e turni ----------

function avanzaFase(partita) {
  const duel = partita.duel;
  if (duel.fase === FASE_END) {
    duel.turno += 1;
    duel.giocatoreAttivo = 1 - duel.giocatoreAttivo;
    duel.fase = 0;
  } else if (duel.turno === 1 && FASI[duel.fase] === "Main 1") {
    duel.fase = FASE_END;      // primo turno: niente Battle Phase
  } else {
    duel.fase += 1;
  }
}

// Salto diretto a una fase del turno corrente
function vaiAFase(partita, indice) {
  partita.duel.fase = indice;
}

// ---------- Fine duel e fine match ----------

// Da chiamare quando il duel ha un esito e i giocatori sono pronti al prossimo.
// primoProssimo: chi inizia il duel successivo.
function chiudiDuel(partita, primoProssimo) {
  const esito = partita.duel.esito;
  if (esito === null || partita.finita) return;
  partita.risultatiDuel.push(esito);
  if (esito !== "pareggio") partita.vittorie[esito] += 1;

  const necessarie = partita.vittoriePerMatch;
  if (necessarie != null && esito !== "pareggio" && partita.vittorie[esito] >= necessarie) {
    partita.finita = true;
    partita.risultato = esito;
    fermaTimer(partita.timer, Date.now());
    return;
  }
  // Match non ancora deciso (anche dopo pareggi) o casual libero: nuovo duel.
  // Il duel chiuso resta nei duelGiocati, così il registro dei life point non si perde.
  if (!partita.duelGiocati) partita.duelGiocati = [];
  partita.duelGiocati.push(partita.duel);
  partita.duel = creaDuel(primoProssimo);
}

// ---------- Timer ----------
// Non si decrementa un contatore ogni secondo (impreciso):
// si salva quando è partito e quanto era già trascorso prima delle pause.

function creaTimer(durataMinuti) {
  return {
    durataMs: durataMinuti === null ? null : durataMinuti * 60 * 1000,
    avviatoAlle: null,         // timestamp dell'ultimo avvio, null se fermo
    trascorsoMs: 0,            // tempo accumulato prima dell'ultimo avvio
  };
}

function avviaTimer(timer, ora) {
  if (timer.durataMs === null || timer.avviatoAlle !== null) return;
  timer.avviatoAlle = ora;
}

function fermaTimer(timer, ora) {
  if (timer.avviatoAlle === null) return;
  timer.trascorsoMs += ora - timer.avviatoAlle;
  timer.avviatoAlle = null;
}

function tempoRimanente(timer, ora) {
  if (timer.durataMs === null) return null;
  const trascorso = timer.trascorsoMs + (timer.avviatoAlle === null ? 0 : ora - timer.avviatoAlle);
  return Math.max(0, timer.durataMs - trascorso);
}

// Da chiamare periodicamente: allo scadere, in Standard il match finisce.
// Policy 2.5: se nessuno ha già vinto il match è doppia sconfitta.
// In Casual il timer è solo un promemoria.
function controllaTempo(partita, ora) {
  if (partita.finita || partita.modalita !== "standard") return;
  if (tempoRimanente(partita.timer, ora) === 0) {
    fermaTimer(partita.timer, ora);
    partita.finita = true;
    partita.risultato = "doppia sconfitta";
  }
}

// Per i test con Node (nel browser viene ignorato)
if (typeof module !== "undefined") {
  module.exports = {
    LP_INIZIALI, FASI, creaPartita, lp, modificaLP, modificaLPEntrambi, dimezzaLP, annulla,
    lanciaMoneta, lanciaDado, avanzaFase, vaiAFase, chiudiDuel,
    avviaTimer, fermaTimer, tempoRimanente, controllaTempo,
  };
}
