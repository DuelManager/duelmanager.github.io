const assert = require("assert");
const P = require("./partita.js");
const T = require("./torneo.js");
const C = require("./cronologia.js");

function seme(s) {
  return () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; };
}

// ---------- Match Standard: tutti i duel con il loro registro ----------
{
  const p = P.creaPartita("standard", ["Alessio", "Marco"], null, 0);
  P.modificaLP(p, 1, -2400);
  P.modificaLP(p, 1, -5600); P.chiudiDuel(p, 1);           // duel 1: vince Alessio
  P.lanciaMoneta(p);
  P.modificaLP(p, 0, -8000); P.chiudiDuel(p, 0);           // duel 2: vince Marco
  P.modificaLP(p, 1, -8000); P.chiudiDuel(p, 0);           // duel 3: vince Alessio, match chiuso
  assert.ok(p.finita);
  assert.strictEqual(p.duelGiocati.length, 2);

  const v = C.voceMatch(p, 1000);
  assert.strictEqual(v.tipo, "duello");
  assert.strictEqual(v.terminato, 1000);
  assert.deepStrictEqual(v.giocatori, ["Alessio", "Marco"]);
  assert.strictEqual(v.risultato, 0);
  assert.deepStrictEqual(v.punteggio, [2, 1]);
  assert.strictEqual(v.duel.length, 3);
  assert.deepStrictEqual(v.duel.map((d) => d.esito), [0, 1, 0]);
  assert.strictEqual(v.duel[0].eventi.length, 2);
  assert.strictEqual(v.duel[1].eventi[0].tipo, "moneta");

  // la voce è una copia: cambiare la partita non la tocca
  p.duel.eventi.push({ tipo: "dado", esito: 6 });
  assert.strictEqual(v.duel[2].eventi.length, 1);
}

// ---------- Duel Casual ----------
{
  const p = P.creaPartita("casual", ["A", "B"], null, 0);
  P.modificaLPEntrambi(p, -8000, -8000);
  const v = C.voceDuelCasual(p, 5);
  assert.strictEqual(v.modalita, "casual");
  assert.strictEqual(v.risultato, "pareggio");
  assert.strictEqual(v.duel.length, 1);
  assert.deepStrictEqual(v.duel[0].eventi[0].variazioni, [-8000, -8000]);
}

// ---------- Torneo: copia senza i duel del tavolo ----------
{
  const t = T.creaTorneo({ tipo: "standard", formato: "eliminazione", nomi: ["A", "B", "C", "D"], minuti: 50 }, seme(3));
  const m = t.turni[0].partite[0];
  T.iniziaMatch(t, m.id, 0, 0);
  T.assegnaRisultato(t, m.id, "a", null, 0);
  T.assegnaRisultato(t, t.turni[0].partite[1].id, "b", null, 0);
  T.prosegui(t);
  T.assegnaRisultato(t, t.turni[1].partite[0].id, "a", [2, 1], 0);
  T.prosegui(t);
  t.idCronologia = "x";
  const v = C.voceTorneo(t, 9);
  assert.strictEqual(v.tipo, "torneo");
  assert.strictEqual(v.torneo.turni[0].partite[0].partita, undefined);
  assert.notStrictEqual(m.partita, null);                      // l'originale non cambia
  assert.strictEqual(v.torneo.idCronologia, undefined);
  assert.strictEqual(v.torneo.campione, t.campione);
}

// ---------- Limite di 15: si cancella la più vecchia ----------
{
  const lista = [];
  for (let i = 1; i <= 20; i++) C.aggiungiVoce(lista, { id: `v${i}`, terminato: i });
  assert.strictEqual(lista.length, C.MAX_CRONOLOGIA);
  assert.strictEqual(lista[0].id, "v20");                      // la più nuova in alto
  assert.strictEqual(lista[14].id, "v6");                      // v1…v5 cancellate
}

// ---------- Preferiti ----------
{
  const pref = [];
  const vecchia = { id: "a", terminato: 1, dati: [1] };
  const nuova = { id: "b", terminato: 2 };
  C.impostaPreferito(pref, vecchia, true);
  C.impostaPreferito(pref, nuova, true);
  C.impostaPreferito(pref, nuova, true);                       // due volte: resta una sola
  assert.deepStrictEqual(pref.map((v) => v.id), ["b", "a"]);
  vecchia.dati.push(2);
  assert.deepStrictEqual(pref[1].dati, [1]);                   // copia indipendente
  C.impostaPreferito(pref, nuova, false);
  assert.deepStrictEqual(pref.map((v) => v.id), ["a"]);
}

// ---------- Piazzamenti (eliminazione diretta) ----------
{
  const t = T.creaTorneo({ tipo: "casual", formato: "eliminazione", nomi: ["A", "B", "C", "D", "E", "F"], minuti: null }, seme(6));
  while (!t.concluso) {
    for (const m of t.turni[t.turnoCorrente].partite) if (m.stato !== "conclusa") T.assegnaRisultato(t, m.id, "a", null, 0);
    T.prosegui(t);
  }
  const pz = T.piazzamenti(t);
  assert.deepStrictEqual(pz.map((r) => r.pos), [1, 2, 3, 3, 5, 5]);
  assert.strictEqual(pz[0].id, t.campione);
  assert.strictEqual(pz[0].turnoEliminato, null);
  assert.strictEqual(pz[1].turnoEliminato, 2);                 // perso in finale
  assert.strictEqual(pz[4].turnoEliminato, 0);                 // perso ai quarti
}

console.log("Test cronologia superati");
