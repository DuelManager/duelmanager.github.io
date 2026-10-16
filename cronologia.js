// =============================================================
// cronologia.js — voci della cronologia partite e dei preferiti
// Nessuna interfaccia qui. Ogni voce è una copia indipendente:
// resta uguale anche se la partita originale viene cancellata.
// =============================================================

const MAX_CRONOLOGIA = 15;

function nuovoIdVoce() {
  return "v" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function copia(oggetto) {
  return JSON.parse(JSON.stringify(oggetto));
}

function copiaDuel(d) {
  return { esito: d.esito, primoGiocatore: d.primoGiocatore, eventi: copia(d.eventi) };
}

// Match Standard finito: tutti i duel giocati, ognuno con il suo registro dei life point
function voceMatch(p, ora) {
  const duel = (p.duelGiocati || []).concat([p.duel]);
  return {
    id: nuovoIdVoce(),
    tipo: "duello",
    terminato: ora,
    modalita: p.modalita,
    giocatori: p.giocatori.map((g) => g.nome),
    risultato: p.risultato,                       // 0 | 1 | "doppia sconfitta"
    punteggio: [p.vittorie[0], p.vittorie[1]],
    duel: duel.map(copiaDuel),
  };
}

// Singolo duel Casual finito (nel casual ogni duel è una partita a sé)
function voceDuelCasual(p, ora) {
  return {
    id: nuovoIdVoce(),
    tipo: "duello",
    terminato: ora,
    modalita: "casual",
    giocatori: p.giocatori.map((g) => g.nome),
    risultato: p.duel.esito,                      // 0 | 1 | "pareggio"
    punteggio: null,
    duel: [copiaDuel(p.duel)],
  };
}

// Torneo concluso: copia del torneo senza i duel giocati sul tavolo (pesano e non servono)
function voceTorneo(t, ora) {
  const torneo = JSON.parse(JSON.stringify(t, (k, v) => (k === "partita" ? undefined : v)));
  delete torneo.idCronologia;
  return { id: nuovoIdVoce(), tipo: "torneo", terminato: ora, torneo };
}

// Aggiunge in cima; oltre il massimo si cancellano le più vecchie
function aggiungiVoce(lista, voce, max = MAX_CRONOLOGIA) {
  lista.unshift(voce);
  if (lista.length > max) lista.length = max;
  return lista;
}

function togliVoce(lista, id) {
  const i = lista.findIndex((v) => v.id === id);
  if (i !== -1) lista.splice(i, 1);
}

// Mette o toglie una voce dai preferiti (ordinati dalla partita più recente)
function impostaPreferito(preferiti, voce, attivo) {
  togliVoce(preferiti, voce.id);
  if (attivo) {
    preferiti.push(copia(voce));
    preferiti.sort((a, b) => b.terminato - a.terminato);
  }
  return preferiti;
}

// Per i test con Node (nel browser viene ignorato)
if (typeof module !== "undefined") {
  module.exports = {
    MAX_CRONOLOGIA, voceMatch, voceDuelCasual, voceTorneo, aggiungiVoce, togliVoce, impostaPreferito,
  };
}
