const assert = require("assert");
const P = require("./partita.js");
const T = require("./torneo.js");

// Generatore casuale ripetibile, così i test danno sempre lo stesso sorteggio
function seme(s) {
  return () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; };
}
const nomi = (n) => Array.from({ length: n }, (_, i) => `G${i + 1}`);

// ---------- Eliminazione diretta: ogni numero da 4 a 16 ----------
for (let n = 4; n <= 16; n++) {
  const t = T.creaTorneo({ tipo: "casual", formato: "eliminazione", nomi: nomi(n), minuti: null }, seme(n));
  const s = T.potenzaDiDue(n);
  assert.strictEqual(t.numeroTurni, Math.log2(s));
  const primo = t.turni[0].partite;
  assert.strictEqual(primo.length, s / 2);

  // tutti i giocatori compaiono una volta sola
  const presenti = primo.flatMap((m) => [m.a, m.b]).filter((x) => x !== null).sort((a, b) => a - b);
  assert.deepStrictEqual(presenti, [...Array(n).keys()]);

  // bye giusti, mai due bye nello stesso match, sparsi nel tabellone
  const bye = s - n;
  assert.strictEqual(primo.filter((m) => m.esito === "bye").length, bye);
  assert.ok(primo.every((m) => m.a !== null || m.b !== null));
  let coppieDiBye = 0;
  for (let i = 0; i < primo.length; i += 2) {
    if (primo[i].esito === "bye" && primo[i + 1].esito === "bye") coppieDiBye++;
  }
  assert.strictEqual(coppieDiBye, Math.max(0, bye - s / 4), `bye sparsi con ${n} giocatori`);

  // si gioca tutto: vince sempre chi è in alto
  let giocate = 0;
  let guardia = 0;
  while (!t.concluso && guardia++ < 10) {
    for (const m of t.turni[t.turnoCorrente].partite) {
      if (m.stato !== "conclusa") {
        assert.ok(T.assegnaRisultato(t, m.id, "a", null, 0));
        giocate++;
      }
    }
    assert.ok(T.prosegui(t));
  }
  assert.ok(t.concluso);
  assert.strictEqual(giocate, n - 1, `partite giocate con ${n} giocatori`);
  assert.notStrictEqual(t.campione, null);
}

// ---------- Non si prosegue con partite aperte; la finale è senza tempo ----------
{
  const t = T.creaTorneo({ tipo: "standard", formato: "eliminazione", nomi: nomi(4), minuti: 50 }, seme(2));
  const m = t.turni[0].partite[0];
  assert.strictEqual(T.prosegui(t), false);

  const p = T.iniziaMatch(t, m.id, 0, 1000);
  assert.strictEqual(p.timer.durataMs, 50 * 60000);
  assert.strictEqual(p.vittoriePerMatch, 2);
  assert.strictEqual(m.stato, "in corso");
  assert.strictEqual(T.iniziaMatch(t, m.id, 0, 1000), null);   // già iniziato

  // "b" vince 2-1 giocando sul tavolo
  P.modificaLP(p, 0, -8000); P.chiudiDuel(p, 1);
  P.modificaLP(p, 1, -8000); P.chiudiDuel(p, 0);
  P.modificaLP(p, 0, -8000); P.chiudiDuel(p, 0);
  assert.ok(p.finita);
  assert.ok(T.registraDaPartita(t, m.id));
  assert.strictEqual(m.vincitore, m.b);
  assert.deepStrictEqual(m.punteggio, [1, 2]);

  // correzione a mano prima di proseguire
  T.assegnaRisultato(t, m.id, "a", [2, 1], 0);
  assert.strictEqual(m.vincitore, m.a);
  assert.strictEqual(p.risultato, 0);

  T.assegnaRisultato(t, t.turni[0].partite[1].id, "b", null, 0);
  assert.ok(T.prosegui(t));
  assert.strictEqual(T.assegnaRisultato(t, m.id, "b", null, 0), false);   // turno chiuso
  const finale = t.turni[1].partite[0];
  assert.strictEqual(finale.a, m.a);
  const f = T.iniziaMatch(t, finale.id, 0, 0);
  assert.strictEqual(f.timer.durataMs, null);
}

// ---------- Doppia sconfitta: l'avversario del turno dopo passa ----------
{
  const t = T.creaTorneo({ tipo: "standard", formato: "eliminazione", nomi: nomi(4), minuti: 50 }, seme(1));
  const [m0, m1] = t.turni[0].partite;
  T.assegnaRisultato(t, m0.id, null, null, 0);
  T.assegnaRisultato(t, m1.id, "b", null, 0);
  assert.deepStrictEqual(m1.punteggio, [0, 2]);
  assert.ok(T.prosegui(t));
  const finale = t.turni[1].partite[0];
  assert.strictEqual(finale.esito, "bye");
  assert.strictEqual(finale.vincitore, m1.b);
  assert.ok(T.prosegui(t));
  assert.strictEqual(t.campione, m1.b);
}

// ---------- Tempo scaduto in un match del torneo ----------
{
  const t = T.creaTorneo({ tipo: "standard", formato: "punti", nomi: nomi(4), minuti: 1 }, seme(3));
  const m = t.turni[0].partite[0];
  const p = T.iniziaMatch(t, m.id, 0, 0);
  P.controllaTempo(p, 60000);
  assert.ok(T.registraDaPartita(t, m.id));
  assert.strictEqual(m.esito, "doppia sconfitta");
  assert.strictEqual(m.vincitore, null);
}

// ---------- Torneo casual: un duel decide, il pareggio si rigioca ----------
{
  const t = T.creaTorneo({ tipo: "casual", formato: "eliminazione", nomi: nomi(4), minuti: null }, seme(4));
  const m = t.turni[0].partite[0];
  const p = T.iniziaMatch(t, m.id, 0, 0);
  assert.strictEqual(p.timer.durataMs, null);
  P.modificaLPEntrambi(p, -8000, -8000); P.chiudiDuel(p, 0);
  assert.strictEqual(p.finita, false);
  P.modificaLP(p, 1, -8000); P.chiudiDuel(p, 0);
  assert.ok(p.finita);
  T.registraDaPartita(t, m.id);
  assert.strictEqual(m.vincitore, m.a);
  assert.deepStrictEqual(m.punteggio, [1, 0]);

  // azzerare riporta il match da giocare
  assert.ok(T.azzeraMatch(t, m.id));
  assert.strictEqual(m.stato, "da giocare");
  assert.strictEqual(m.partita, null);
}

// ---------- A punti: tutti contro tutti, una volta sola ----------
for (let n = 4; n <= 16; n++) {
  const t = T.creaTorneo({ tipo: "casual", formato: "punti", nomi: nomi(n), minuti: null }, seme(100 + n));
  assert.strictEqual(t.numeroTurni, n % 2 === 0 ? n - 1 : n);
  const coppie = new Set();
  const riposi = new Map();
  for (const turno of t.turni) {
    const visti = new Set();
    for (const m of turno.partite) {
      for (const g of [m.a, m.b]) {
        assert.ok(!visti.has(g), "un giocatore due volte nello stesso turno");
        visti.add(g);
      }
      const k = [m.a, m.b].sort((x, y) => x - y).join("-");
      assert.ok(!coppie.has(k), "coppia ripetuta");
      coppie.add(k);
    }
    if (n % 2 === 1) {
      assert.notStrictEqual(turno.riposa, null);
      assert.ok(!visti.has(turno.riposa));
      riposi.set(turno.riposa, (riposi.get(turno.riposa) || 0) + 1);
    } else {
      assert.strictEqual(turno.riposa, null);
    }
  }
  assert.strictEqual(coppie.size, n * (n - 1) / 2);
  if (n % 2 === 1) {
    assert.strictEqual(riposi.size, n);                      // ognuno riposa una volta
    assert.ok([...riposi.values()].every((v) => v === 1));
  }
}

// ---------- Classifica: vittorie, differenza duel, scontro diretto ----------
function giocaTutto(t, tabella) {
  while (!t.concluso) {
    for (const m of t.turni[t.turnoCorrente].partite) {
      const na = T.nomeGiocatore(t, m.a);
      const nb = T.nomeGiocatore(t, m.b);
      const r = tabella[na + nb] || tabella[nb + na];   // [vincitore, duel vincitore, duel perdente]
      const lato = r[0] === na ? "a" : "b";
      const punteggio = lato === "a" ? [r[1], r[2]] : [r[2], r[1]];
      T.assegnaRisultato(t, m.id, lato, punteggio, 0);
    }
    assert.ok(T.prosegui(t));
  }
}
{
  // A e B a pari vittorie e differenza: A ha battuto B, quindi A primo
  const t = T.creaTorneo({ tipo: "standard", formato: "punti", nomi: ["A", "B", "C", "D"], minuti: null }, seme(7));
  giocaTutto(t, {
    AB: ["A", 2, 1], AC: ["C", 2, 1], AD: ["A", 2, 0],
    BC: ["B", 2, 0], BD: ["B", 2, 1], CD: ["D", 2, 0],
  });
  const c = T.classifica(t);
  assert.deepStrictEqual(c.map((r) => r.nome), ["A", "B", "D", "C"]);
  assert.deepStrictEqual(c.map((r) => r.pos), [1, 2, 3, 4]);
  assert.strictEqual(c[0].vinte, 2);
  assert.strictEqual(c[0].duelVinti, 5);
}
{
  // A, B, C si battono a vicenda in cerchio: pari merito a tre, stessa posizione
  const t = T.creaTorneo({ tipo: "standard", formato: "punti", nomi: ["A", "B", "C", "D"], minuti: null }, seme(8));
  giocaTutto(t, {
    AB: ["A", 2, 1], BC: ["B", 2, 1], AC: ["C", 2, 1],
    AD: ["A", 2, 0], BD: ["B", 2, 0], CD: ["C", 2, 0],
  });
  const c = T.classifica(t);
  assert.deepStrictEqual(c.map((r) => r.pos), [1, 1, 1, 4]);
  assert.strictEqual(c[3].nome, "D");
}

console.log("Test torneo superati");
