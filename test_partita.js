const assert = require("assert");
const P = require("./partita.js");

// LP, cronologia, annulla
let p = P.creaPartita("standard", ["A", "B"], 50);
P.modificaLP(p, 1, -2400);
P.modificaLP(p, 1, 1000);
assert.strictEqual(P.lp(p.duel, 1), 6600);
P.annulla(p);
assert.strictEqual(P.lp(p.duel, 1), 5600);
assert.strictEqual(p.duel.eventi.length, 1);

// Metà (dispari arrotonda per eccesso)
P.modificaLP(p, 0, -6999);           // A: 1001
P.dimezzaLP(p, 0);
assert.strictEqual(P.lp(p.duel, 0), 501);

// Fasi: il primo turno parte dalla Standby e salta Battle (e quindi Main 2)
assert.strictEqual(P.FASI[p.duel.fase], "Standby");
P.avanzaFase(p);                      // Main 1
P.avanzaFase(p);                      // -> End
assert.strictEqual(P.FASI[p.duel.fase], "End");
P.avanzaFase(p);                      // turno 2, giocatore B, si riparte dalla Draw
assert.strictEqual(p.duel.turno, 2);
assert.strictEqual(p.duel.giocatoreAttivo, 1);
assert.strictEqual(P.FASI[p.duel.fase], "Draw");
P.vaiAFase(p, 2); P.avanzaFase(p);    // Main 1 -> Battle al turno 2
assert.strictEqual(P.FASI[p.duel.fase], "Battle");
assert.strictEqual(p.duel.eventi[0].fase, "Standby");

// Fine duel, annullabile finché non si chiude
P.modificaLP(p, 0, -600);
assert.strictEqual(p.duel.esito, 1);
P.annulla(p);
assert.strictEqual(p.duel.esito, null);
P.modificaLP(p, 0, -600);
P.chiudiDuel(p, 0);
assert.deepStrictEqual(p.vittorie, [0, 1]);
assert.strictEqual(P.lp(p.duel, 0), 8000);   // nuovo duel

// Pareggio (danno a entrambi in un evento), poi B vince il match
P.modificaLPEntrambi(p, -8000, -8000);
assert.strictEqual(p.duel.esito, "pareggio");
P.annulla(p);                                  // un solo annulla toglie tutto
assert.strictEqual(P.lp(p.duel, 0), 8000);
assert.strictEqual(P.lp(p.duel, 1), 8000);
P.modificaLPEntrambi(p, -8000, -8000);
P.chiudiDuel(p, 0);
assert.deepStrictEqual(p.risultatiDuel, [1, "pareggio"]);
assert.strictEqual(p.finita, false);
P.modificaLP(p, 0, -8000); P.chiudiDuel(p, 0);
assert.strictEqual(p.finita, true);
assert.strictEqual(p.risultato, 1);

// Timer: pausa e scadenza = doppia sconfitta
p = P.creaPartita("standard", ["A", "B"], 50);
P.avviaTimer(p.timer, 0);
P.fermaTimer(p.timer, 10 * 60000);            // 10 min trascorsi, in pausa
assert.strictEqual(P.tempoRimanente(p.timer, 99 * 60000), 40 * 60000);
P.avviaTimer(p.timer, 100 * 60000);
P.controllaTempo(p, 139 * 60000);
assert.strictEqual(p.finita, false);
P.controllaTempo(p, 140 * 60000);
assert.strictEqual(p.risultato, "doppia sconfitta");

// Casual senza tempo
p = P.creaPartita("casual", ["A", "B"], null);
assert.strictEqual(P.tempoRimanente(p.timer, 123), null);
P.modificaLP(p, 1, -8000); P.chiudiDuel(p, 1);
assert.deepStrictEqual(p.vittorie, [1, 0]);
assert.strictEqual(p.finita, false);

console.log("Tutti i test superati");

// Casual nei tornei: un duel decide il match, il pareggio si rigioca
p = P.creaPartita("casual", ["A", "B"], null, 0, 1);
P.modificaLPEntrambi(p, -8000, -8000); P.chiudiDuel(p, 0);
assert.strictEqual(p.finita, false);
P.modificaLP(p, 0, -8000); P.chiudiDuel(p, 0);
assert.strictEqual(p.finita, true);
assert.strictEqual(p.risultato, 1);

// Il timer in Casual non decide il risultato
p = P.creaPartita("casual", ["A", "B"], 1, 0, 1);
P.avviaTimer(p.timer, 0);
P.controllaTempo(p, 120000);
assert.strictEqual(p.finita, false);

console.log("Test duello superati");
