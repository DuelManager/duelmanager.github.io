const assert = require("assert");
const P = require("./partita.js");
const T = require("./torneo.js");

// Generatore casuale ripetibile, così i test danno sempre lo stesso sorteggio
function seme(s) {
  return () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; };
}
const nomi = (n) => Array.from({ length: n }, (_, i) => `G${i + 1}`);

// ---------- Eliminazione diretta: ogni numero da 4 a 32 ----------
for (let n = 4; n <= 32; n++) {
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

// ---------- Tutti contro tutti, una volta sola ----------
for (let n = 4; n <= 32; n++) {
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

// =============================================================
// SVIZZERO
// =============================================================

// Turni e top cut consigliati (tabella del regolamento Konami)
assert.strictEqual(T.turniSvizzeriConsigliati(4), 3);
assert.strictEqual(T.turniSvizzeriConsigliati(8), 3);
assert.strictEqual(T.turniSvizzeriConsigliati(9), 4);
assert.strictEqual(T.turniSvizzeriConsigliati(16), 4);
assert.strictEqual(T.turniSvizzeriConsigliati(17), 5);
assert.strictEqual(T.turniSvizzeriConsigliati(32), 5);
assert.strictEqual(T.topCutConsigliato(8), 0);
assert.strictEqual(T.topCutConsigliato(9), 4);
assert.strictEqual(T.topCutConsigliato(32), 4);
assert.deepStrictEqual(T.topCutPossibili(4), [0]);
assert.deepStrictEqual(T.topCutPossibili(5), [0, 4]);
assert.deepStrictEqual(T.topCutPossibili(9), [0, 4, 8]);
assert.deepStrictEqual(T.ordineTesteDiSerie(4), [1, 4, 2, 3]);
assert.deepStrictEqual(T.ordineTesteDiSerie(8), [1, 8, 4, 5, 2, 7, 3, 6]);
assert.throws(() => T.creaTorneo({ tipo: "casual", formato: "svizzero", nomi: nomi(4), minuti: null, turni: 4 }));
assert.throws(() => T.creaTorneo({ tipo: "casual", formato: "svizzero", nomi: nomi(8), minuti: null, taglio: 8 }));

// Gioca il turno in corso: vince a sorte, ogni tanto doppia sconfitta (solo nello svizzero)
function giocaTurno(t, caso, doppie = true) {
  for (const m of t.turni[t.turnoCorrente].partite) {
    if (m.stato === "conclusa") continue;
    const x = caso();
    const lato = doppie && t.turni[t.turnoCorrente].fase === "svizzero" && x < 0.08 ? null : x < 0.54 ? "a" : "b";
    assert.ok(T.assegnaRisultato(t, m.id, lato, null, 0));
  }
}

// Tornei completi da 4 a 32 giocatori, con turni e top cut consigliati
const statistiche = { uguali: 0, totali: 0 };
for (let n = 4; n <= 32; n++) {
  const caso = seme(500 + n);
  const t = T.creaTorneo({ tipo: "standard", formato: "svizzero", nomi: nomi(n), minuti: 50 }, caso);
  const turniSv = T.turniSvizzeriConsigliati(n);
  const taglio = T.topCutConsigliato(n);
  assert.strictEqual(t.turniSvizzeri, turniSv);
  assert.strictEqual(t.numeroTurni, turniSv + (taglio ? Math.log2(taglio) : 0));

  const coppie = new Set();
  const bye = new Map();
  let guardia = 0;
  while (!t.concluso && guardia++ < 20) {
    const turno = t.turni[t.turnoCorrente];
    if (turno.fase === "svizzero") {
      // tutti giocano una volta (o hanno il bye), nessuna rivincita
      const visti = new Set();
      for (const m of turno.partite) {
        for (const g of [m.a, m.b]) { assert.ok(!visti.has(g), `n=${n}: giocatore due volte`); visti.add(g); }
        const k = [m.a, m.b].sort((x, y) => x - y).join("-");
        assert.ok(!coppie.has(k), `n=${n}: rivincita ${k} al turno ${t.turnoCorrente + 1}`);
        coppie.add(k);
      }
      if (n % 2 === 1) {
        assert.notStrictEqual(turno.riposa, null);
        assert.ok(!visti.has(turno.riposa));
        bye.set(turno.riposa, (bye.get(turno.riposa) || 0) + 1);
        visti.add(turno.riposa);
      } else {
        assert.strictEqual(turno.riposa, null);
      }
      assert.strictEqual(visti.size, n, `n=${n}: manca qualcuno al turno ${t.turnoCorrente + 1}`);
      // dal secondo turno si gioca tra vittorie uguali o vicine: in media la differenza
      // non supera 1 (a volte i bye e le rivincite da evitare costringono a scendere)
      if (t.turnoCorrente > 0) {
        const v = new Map(T.classificaSvizzera(t).map((r) => [r.id, r.vinte - (r.id === turno.riposa ? 1 : 0)]));
        const scarto = turno.partite.reduce((x, m) => x + Math.abs(v.get(m.a) - v.get(m.b)), 0);
        assert.ok(scarto <= turno.partite.length, `n=${n}: abbinamenti troppo lontani per vittorie`);
        const uguali = turno.partite.filter((m) => v.get(m.a) === v.get(m.b)).length;
        statistiche.uguali += uguali; statistiche.totali += turno.partite.length;
      }
    }
    giocaTurno(t, caso);
    assert.ok(T.prosegui(t, caso));
  }
  assert.ok(t.concluso, `n=${n}: torneo non concluso`);
  assert.ok([...bye.values()].every((x) => x === 1), `n=${n}: qualcuno ha avuto due bye`);
  assert.notStrictEqual(t.campione, null);

  // Top cut: i primi della classifica svizzera, 1° contro ultimo del taglio
  const tagli = t.turni.filter((tu) => tu.fase === "taglio");
  assert.strictEqual(tagli.length, taglio ? Math.log2(taglio) : 0);
  if (taglio) {
    const classif = T.classificaSvizzera(t);
    const primi = classif.slice(0, taglio).map((r) => r.id);
    const posti = T.ordineTesteDiSerie(taglio).map((s) => primi[s - 1]);
    assert.deepStrictEqual(tagli[0].partite.flatMap((m) => [m.a, m.b]), posti);
    const finale = tagli[tagli.length - 1].partite[0];
    assert.strictEqual(t.campione, finale.vincitore);
    // la finale si gioca senza tempo, gli altri turni del taglio con il timer
    const rFinale = t.turni.length - 1;
    assert.strictEqual(T.durataMatch(t, rFinale), null);
    if (tagli.length > 1) assert.strictEqual(T.durataMatch(t, rFinale - 1), 50);
  }

  // Piazzamenti: tutti presenti, il campione primo
  const pz = T.piazzamenti(t);
  assert.strictEqual(pz.length, n);
  assert.strictEqual(pz[0].id, t.campione);
  assert.deepStrictEqual(pz.map((x) => x.id).sort((a, b) => a - b), [...Array(n).keys()]);
  for (let i = 1; i < pz.length; i++) assert.ok(pz[i].pos >= pz[i - 1].pos);
}

// Nel complesso quasi tutte le coppie hanno le stesse vittorie
assert.ok(statistiche.uguali / statistiche.totali > 0.8, `solo ${statistiche.uguali} su ${statistiche.totali} a pari vittorie`);
console.log(`  svizzero: ${statistiche.uguali} coppie su ${statistiche.totali} a pari vittorie dal 2° turno`);

// Turni massimi (tutti contro tutti): nessun errore, tutti sempre abbinati
for (let n = 4; n <= 12; n++) {
  const caso = seme(900 + n);
  const lim = T.limitiTurniSvizzeri(n);
  const t = T.creaTorneo({ tipo: "casual", formato: "svizzero", nomi: nomi(n), minuti: null, turni: lim.max, taglio: 0 }, caso);
  while (!t.concluso) { giocaTurno(t, caso, false); assert.ok(T.prosegui(t, caso)); }
  assert.strictEqual(t.turni.length, lim.max);
}

// Spareggi: vittorie, % vittorie degli avversari, % degli avversari degli avversari
{
  // 4 giocatori, 2 turni. Turno 1: A batte B, C batte D. Turno 2 (a mano): A batte C, D batte B.
  const t = T.creaTorneo({ tipo: "casual", formato: "svizzero", nomi: ["A", "B", "C", "D"], minuti: null, turni: 2, taglio: 0 },
    () => 0.99);   // sorteggio fisso
  const id = (nome) => t.giocatori.find((g) => g.nome === nome).id;
  const turno1 = t.turni[0].partite;
  // sistemo le coppie del primo turno per il test
  turno1[0].a = id("A"); turno1[0].b = id("B");
  turno1[1].a = id("C"); turno1[1].b = id("D");
  T.assegnaRisultato(t, turno1[0].id, "a", null, 0);
  T.assegnaRisultato(t, turno1[1].id, "a", null, 0);
  assert.ok(T.prosegui(t, () => 0.5));
  const turno2 = t.turni[1].partite;
  for (const m of turno2) {
    const nomiM = [T.nomeGiocatore(t, m.a), T.nomeGiocatore(t, m.b)];
    const vince = nomiM.includes("A") ? "A" : "D";
    T.assegnaRisultato(t, m.id, T.nomeGiocatore(t, m.a) === vince ? "a" : "b", null, 0);
  }
  assert.ok(T.prosegui(t, () => 0.5));
  assert.ok(t.concluso);
  const c = T.classificaSvizzera(t);
  // A 2-0; C e D 1-1; B 0-2. C ha incontrato D (50%) e A (100%) = 75%; D ha incontrato C (50%) e B (0%) = 25%
  assert.deepStrictEqual(c.map((r) => r.nome), ["A", "C", "D", "B"]);
  const C = c.find((r) => r.nome === "C");
  const D = c.find((r) => r.nome === "D");
  assert.ok(Math.abs(C.omw - 0.75) < 1e-9);
  assert.ok(Math.abs(D.omw - 0.25) < 1e-9);
  assert.deepStrictEqual(c.map((r) => r.pos), [1, 2, 3, 4]);
  assert.strictEqual(t.campione, id("A"));
}

// Ritiri: chi si ritira non viene più abbinato e non entra nel top cut
{
  const caso = seme(77);
  const t = T.creaTorneo({ tipo: "standard", formato: "svizzero", nomi: nomi(10), minuti: 50 }, caso);
  giocaTurno(t, caso, false);
  const ritirato = t.turni[0].partite[0].a;
  assert.ok(T.puoRitirare(t));
  assert.ok(T.impostaRitiro(t, ritirato, true));
  assert.ok(T.prosegui(t, caso));
  const turno2 = t.turni[1];
  assert.ok(turno2.partite.every((m) => m.a !== ritirato && m.b !== ritirato));
  assert.notStrictEqual(turno2.riposa, ritirato);
  assert.strictEqual(turno2.partite.length, 4);            // 9 attivi: 4 match e un bye
  assert.notStrictEqual(turno2.riposa, null);
  // riammesso e di nuovo ritirato: resta fuori una volta sola
  assert.ok(T.impostaRitiro(t, ritirato, false));
  assert.ok(T.impostaRitiro(t, ritirato, true));
  assert.deepStrictEqual(t.ritirati, [ritirato]);
  while (t.turni[t.turnoCorrente].fase === "svizzero") { giocaTurno(t, caso, false); assert.ok(T.prosegui(t, caso)); }
  const taglio = t.turni[t.turnoCorrente];
  assert.strictEqual(taglio.fase, "taglio");
  assert.ok(taglio.partite.every((m) => m.a !== ritirato && m.b !== ritirato));
  assert.strictEqual(T.puoRitirare(t), false);              // nel top cut non ci si ritira
  assert.strictEqual(T.impostaRitiro(t, 3, true), false);
}

// Top cut ridotto se per i ritiri restano pochi giocatori
{
  const caso = seme(78);
  const t = T.creaTorneo({ tipo: "casual", formato: "svizzero", nomi: nomi(9), minuti: null, turni: 2, taglio: 8 }, caso);
  giocaTurno(t, caso, false);
  for (const id of [0, 1, 2]) T.impostaRitiro(t, id, true);
  assert.ok(T.prosegui(t, caso));
  giocaTurno(t, caso, false);
  assert.ok(T.prosegui(t, caso));
  assert.strictEqual(t.taglio, 4);                           // 6 attivi: top 8 impossibile, diventa top 4
  assert.strictEqual(t.turni[t.turnoCorrente].partite.length, 2);
  assert.strictEqual(t.numeroTurni, 2 + 2);
}

console.log("Test torneo superati");
