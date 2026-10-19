// =============================================================
// torneo-ui.js — setup del torneo, sorteggio, tabellone e pannello dei match
// I testi arrivano da lingua.js tramite tr().
// =============================================================

let pannelloId = null;       // match aperto nel pannello
let giocatiAperto = false;   // "Turni giocati" aperto o chiuso (torneo a punti)

// turni e taglio (solo svizzero): null = quelli consigliati dal regolamento per il numero di giocatori
function bozzaPredefinita() {
  return { tipo: "standard", formato: "eliminazione", usaTimer: true, minuti: 50, numero: 8, nomi: [], turni: null, taglio: null };
}

function bozza() {
  if (!app.bozzaTorneo) app.bozzaTorneo = bozzaPredefinita();
  return app.bozzaTorneo;
}

function nomePredefinito(i) { return tr("giocatore.n", { n: i + 1 }); }

// Nome di un turno nella lingua scelta
function nomeTurnoDaPartite(partiteNelTurno) {
  const chiave = { 1: "turno.finale", 2: "turno.semi", 4: "turno.quarti", 8: "turno.ottavi", 16: "turno.sedicesimi" }[partiteNelTurno];
  return chiave ? tr(chiave) : nomeTurnoEliminazione(partiteNelTurno);
}

function nomeFormato(formato) {
  return tr({ eliminazione: "st.elim", punti: "st.punti", svizzero: "st.sv" }[formato]);
}

// Svizzero: il turno r è del top cut? (vale anche per turni non ancora creati)
function turnoDelTaglio(t, r) {
  return t.formato === "svizzero" && r >= t.turniSvizzeri;
}

// Partite del turno r a eliminazione (tabellone o top cut)
function partiteEliminazione(t, r) {
  if (t.formato === "svizzero") return t.taglio / 2 ** (r - t.turniSvizzeri + 1);
  return t.dimensione / 2 ** (r + 1);
}

function nomeTurno(t, r) {
  if (t.formato === "eliminazione" || turnoDelTaglio(t, r)) return nomeTurnoDaPartite(partiteEliminazione(t, r));
  return tr("turno.n", { n: r + 1 });
}

// "Turno 2 di 4" nello svizzero e nel tutti contro tutti, "Top 4 · Semifinali" nel top cut
function titoloTurno(t, r) {
  if (t.formato === "punti") return tr("tab.turnodi", { n: r + 1, tot: t.numeroTurni });
  if (t.formato === "svizzero") {
    return turnoDelTaglio(t, r)
      ? `${tr("sv.top", { k: t.taglio })} · ${nomeTurno(t, r)}`
      : tr("tab.turnodi", { n: r + 1, tot: t.turniSvizzeri });
  }
  return nomeTurno(t, r);
}

function etichettaMatch(t, r, i) {
  if (t.formato === "eliminazione" || turnoDelTaglio(t, r)) {
    const partite = partiteEliminazione(t, r);
    return partite > 1 ? `${nomeTurno(t, r)} · ${tr("match.n", { n: i + 1 })}` : nomeTurno(t, r);
  }
  if (t.formato === "svizzero") return `${nomeTurno(t, r)} · ${tr("sv.tavolo", { n: i + 1 })}`;
  return `${nomeTurno(t, r)} · ${tr("partita.n", { n: i + 1 })}`;
}

function descriviMatch(t, m) {
  return `${nomeGiocatore(t, m.a)} ${tr("contro")} ${nomeGiocatore(t, m.b)}`;
}

// "2–1" con il punteggio più alto prima
function punteggioTesto(p) {
  return p ? ` ${Math.max(p[0], p[1])}–${Math.min(p[0], p[1])}` : "";
}

// ---------- Passo 1: tipo e formato ----------

function preparaSetupTorneo() {
  const b = bozza();
  $(`#tt-${b.tipo}`).checked = true;
  $(`#tf-${b.formato}`).checked = true;
  $("#t-usa-timer").checked = b.usaTimer;
  $("#t-minuti").value = b.minuti;
  aggiornaSetupTorneo();
}

function aggiornaSetupTorneo() {
  const b = bozza();
  b.tipo = $("#tt-standard").checked ? "standard" : "casual";
  b.formato = $("#tf-eliminazione").checked ? "eliminazione" : $("#tf-svizzero").checked ? "svizzero" : "punti";
  b.usaTimer = $("#t-usa-timer").checked;
  const m = parseInt($("#t-minuti").value, 10);
  if (m >= 1) b.minuti = Math.min(m, 180);
  $("#t-minuti").disabled = !b.usaTimer;
  $("#t-usa-timer-testo").textContent = tr(b.tipo === "standard" ? "st.timer.standard" : "st.timer.casual");
  let nota;
  if (b.tipo === "standard") {
    nota = tr("st.nota.standard");
    if (b.formato === "eliminazione") nota += tr("st.nota.finale");
    if (b.formato === "svizzero") nota += tr("st.nota.taglio");
  } else {
    nota = tr("st.nota.casual");
  }
  $("#nota-torneo").textContent = nota;
}

$$("input[name=t-tipo]").forEach((r) => r.addEventListener("change", () => {
  // Standard: timer acceso di base. Casual: spento di base.
  $("#t-usa-timer").checked = $("#tt-standard").checked;
  aggiornaSetupTorneo();
  salva();
}));
$$("input[name=t-formato], #t-usa-timer, #t-minuti").forEach((el) => el.addEventListener("change", () => {
  aggiornaSetupTorneo();
  salva();
}));

$("#setup-torneo").addEventListener("submit", (ev) => {
  ev.preventDefault();
  aggiornaSetupTorneo();
  const m = parseInt($("#t-minuti").value, 10);
  if (bozza().usaTimer && (!m || m < 1)) {
    $("#t-minuti").focus();
    $("#nota-torneo").textContent = tr("minuti.errore");
    return;
  }
  vai("setup-giocatori");
});

// ---------- Passo 2: giocatori ----------

function preparaSetupGiocatori() {
  const b = bozza();
  $("#riepilogo-torneo").textContent = [
    b.tipo === "standard" ? "Standard" : "Casual",
    nomeFormato(b.formato),
    b.usaTimer ? tr("sg.timer", { m: b.minuti }) : tr("sg.senzatimer"),
  ].join(" · ");
  $("#nota-sostituisci-torneo").hidden = !(app.torneo && !app.torneo.concluso);
  $("#errore-nomi").textContent = "";
  disegnaNomi();
}

function descriviFormato(formato, n) {
  if (formato === "svizzero") {
    const { turni, taglio } = opzioniSvizzero(n);
    return tr("sg.info.sv", { turni, partite: Math.floor(n / 2) }) +
      (n % 2 === 1 ? tr("sg.info.sv.bye") : "") +
      (taglio ? tr("sg.info.sv.taglio", { k: taglio }) : "") + ".";
  }
  if (formato === "eliminazione") {
    const s = potenzaDiDue(n);
    const bye = s - n;
    const base = tr("sg.info.elim", { turni: Math.log2(s), partite: n - 1 });
    if (bye === 0) return base;
    return (bye === 1 ? tr("sg.info.bye1") : tr("sg.info.byeN", { n: bye })) + base;
  }
  const turni = n % 2 === 0 ? n - 1 : n;
  return tr("sg.info.punti", { turni, partite: n * (n - 1) / 2 }) + (n % 2 === 1 ? tr("sg.info.riposo") : "");
}

function disegnaNomi() {
  const b = bozza();
  const n = b.numero;
  $("#num-g").textContent = n;
  $("#meno-g").disabled = n <= MIN_GIOCATORI;
  $("#piu-g").disabled = n >= MAX_GIOCATORI;
  $("#griglia-nomi").innerHTML = Array.from({ length: n }, (_, i) => {
    const v = typeof b.nomi[i] === "string" ? b.nomi[i] : nomePredefinito(i);
    return `<li>
      <label class="num" for="nome-g-${i}">${i + 1}</label>
      <input class="input" id="nome-g-${i}" data-i="${i}" maxlength="20" value="${esc(v)}" placeholder="${esc(nomePredefinito(i))}" autocomplete="off">
    </li>`;
  }).join("");
  $("#info-giocatori").textContent = descriviFormato(b.formato, n);
  disegnaOpzioniSvizzero();
}

// ---------- Svizzero: turni e top cut ----------
// Valori scelti (o consigliati), sempre validi per n giocatori
function opzioniSvizzero(n) {
  const b = bozza();
  const lim = limitiTurniSvizzeri(n);
  const turni = Math.max(lim.min, Math.min(lim.max, b.turni ?? turniSvizzeriConsigliati(n)));
  const possibili = topCutPossibili(n);
  let taglio = b.taglio ?? topCutConsigliato(n);
  while (!possibili.includes(taglio)) taglio = taglio / 2 >= 4 ? taglio / 2 : 0;
  return { turni, taglio, lim, possibili };
}

function disegnaOpzioniSvizzero() {
  const b = bozza();
  const box = $("#sg-svizzero");
  box.hidden = b.formato !== "svizzero";
  if (box.hidden) return;
  const n = b.numero;
  const { turni, taglio, lim, possibili } = opzioniSvizzero(n);
  $("#num-turni").textContent = turni;
  $("#meno-turni").disabled = turni <= lim.min;
  $("#piu-turni").disabled = turni >= lim.max;
  $$("input[name=taglio]").forEach((r) => {
    const k = Number(r.value);
    r.checked = k === taglio;
    r.disabled = !possibili.includes(k);
    r.closest("label").hidden = r.disabled;
  });
  const consT = turniSvizzeriConsigliati(n);
  const consK = topCutConsigliato(n);
  $("#sg-consigliati").textContent = tr("sg.consigliati", {
    n, turni: consT, taglio: consK ? tr("sg.consigliati.top", { k: consK }) : tr("sg.consigliati.notop"),
  });
  $("#sg-ripristina").hidden = turni === consT && taglio === consK;
}

$("#meno-turni").addEventListener("click", () => cambiaTurniSvizzeri(-1));
$("#piu-turni").addEventListener("click", () => cambiaTurniSvizzeri(1));
function cambiaTurniSvizzeri(d) {
  const b = bozza();
  const { turni, lim } = opzioniSvizzero(b.numero);
  b.turni = Math.max(lim.min, Math.min(lim.max, turni + d));
  disegnaNomi();
  salva();
}
$$("input[name=taglio]").forEach((r) => r.addEventListener("change", () => {
  bozza().taglio = Number(r.value);
  disegnaNomi();
  salva();
}));
$("#sg-ripristina").addEventListener("click", () => {
  const b = bozza();
  b.turni = null;
  b.taglio = null;
  disegnaNomi();
  salva();
});

function cambiaNumero(d) {
  const b = bozza();
  b.numero = Math.max(MIN_GIOCATORI, Math.min(MAX_GIOCATORI, b.numero + d));
  $("#errore-nomi").textContent = "";
  disegnaNomi();
  salva();
}

$("#meno-g").addEventListener("click", () => cambiaNumero(-1));
$("#piu-g").addEventListener("click", () => cambiaNumero(1));

$("#griglia-nomi").addEventListener("input", (ev) => {
  const i = Number(ev.target.dataset.i);
  if (!Number.isInteger(i)) return;
  // Un nome di base ("Giocatore N" / "Player N") resta "non scritto", così segue la lingua
  bozza().nomi[i] = eNomePredefinito(ev.target.value, i + 1) ? undefined : ev.target.value;
  $("#errore-nomi").textContent = "";
});
$("#griglia-nomi").addEventListener("change", salva);
// Se il nome è ancora quello di base, lo selezioniamo: basta scrivere per sostituirlo
$("#griglia-nomi").addEventListener("focusin", (ev) => {
  const el = ev.target;
  if (el.matches("input") && eNomePredefinito(el.value, Number(el.dataset.i) + 1)) {
    setTimeout(() => el.select(), 0);
  }
});

$("#setup-giocatori").addEventListener("submit", (ev) => {
  ev.preventDefault();
  const b = bozza();
  const nomi = Array.from({ length: b.numero }, (_, i) =>
    (typeof b.nomi[i] === "string" ? b.nomi[i] : "").trim() || nomePredefinito(i));
  const visti = new Set();
  for (const n of nomi) {
    const k = n.toLowerCase();
    if (visti.has(k)) {
      $("#errore-nomi").textContent = tr("sg.doppione", { nome: n });
      return;
    }
    visti.add(k);
  }
  avviaSorteggio(nomi);
});

// ---------- Sorteggio (caricamento finto, per la suspense) ----------

function avviaSorteggio(nomi) {
  const b = bozza();
  const impostazioni = { tipo: b.tipo, formato: b.formato, nomi, minuti: b.usaTimer ? b.minuti : null };
  if (b.formato === "svizzero") {
    const { turni, taglio } = opzioniSvizzero(nomi.length);
    Object.assign(impostazioni, { turni, taglio });
  }
  app.torneo = creaTorneo(impostazioni);
  app.matchAperto = null;
  giocatiAperto = false;
  app.schermata = "tabellone";   // se si ricarica durante il sorteggio, si riparte dal tabellone
  salva();
  mostraCaricamento(nomi, () => {
    SUONI.turno();
    vai("tabellone");
  });
}

function mostraCaricamento(nomi, poi) {
  mostraSoloElemento("caricamento");
  const ridotto = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const durata = ridotto ? 1200 : 2600;

  const fill = $("#riempimento");
  fill.style.transition = "none";
  fill.style.width = "0%";
  void fill.offsetWidth;
  fill.style.transition = `width ${durata}ms cubic-bezier(.3,.1,.3,1)`;
  fill.style.width = "100%";

  const messaggi = [tr("car.m1"), tr("car.m2"), tr("car.m3")];
  let k = 0;
  $("#msg-carico").textContent = messaggi[0];
  const tMsg = setInterval(() => {
    k = Math.min(k + 1, messaggi.length - 1);
    $("#msg-carico").textContent = messaggi[k];
  }, durata / messaggi.length);

  const mostraCoppia = () => {
    const [x, y] = mescola(nomi).slice(0, 2);
    $("#sorteggio").innerHTML = `<span class="s0">${esc(x)}</span><span class="contro">${tr("contro")}</span><span class="s1">${esc(y)}</span>`;
  };
  mostraCoppia();
  const tNomi = setInterval(mostraCoppia, ridotto ? 400 : 90);

  setTimeout(() => {
    clearInterval(tMsg);
    clearInterval(tNomi);
    poi();
  }, durata + 200);
}

// ---------- Tabellone ----------

function disegnaTabellone() {
  const t = app.torneo;
  if (!t) return;
  // Sicurezza: un match finito sul tavolo ma non ancora copiato nel tabellone
  for (const m of matchInCorso(t)) {
    if (m.partita && m.partita.finita) registraDaPartita(t, m.id);
  }
  sincronizzaCronologia();   // torneo appena concluso: va in cronologia (serve alla stella)
  $("#info-torneo").textContent = [
    nomeFormato(t.formato),
    t.tipo === "standard" ? "Standard" : "Casual",
    tr("tab.giocatori", { n: t.giocatori.length }),
  ].join(" · ");
  disegnaAvanzamento(t);
  if (t.formato === "eliminazione") disegnaBracket(t);
  else if (t.formato === "svizzero") disegnaSvizzero(t);
  else disegnaPunti(t);
  aggiornaBottoniSuono();
  aggiornaStelle();
}

function disegnaAvanzamento(t) {
  const box = $("#avanzamento");
  if (t.concluso) {
    box.innerHTML = bannerFinale(t);
    return;
  }
  const r = t.turnoCorrente;
  const turno = t.turni[r];
  const reali = turno.partite.filter(matchReale);
  const fatte = reali.filter((m) => m.stato === "conclusa").length;
  const mancano = turno.partite.filter((m) => m.stato !== "conclusa").length;
  const completo = mancano === 0;
  const ultimo = r === t.numeroTurni - 1;
  // Dall'ultimo turno svizzero si va al top cut
  const prossimo = t.formato === "svizzero" && r === t.turniSvizzeri - 1 && t.taglio
    ? tr("sv.top", { k: t.taglio }) : nomeTurno(t, r + 1);
  const testoBottone = ultimo ? tr("tab.concludi") : tr("tab.prosegui", { turno: prossimo });
  const titolo = titoloTurno(t, r);
  const conteggio = tr(reali.length === 1 ? "tab.concluse1" : "tab.concluseN", { f: fatte, t: reali.length });
  const riposa = turno.riposa !== null && turno.riposa !== undefined
    ? tr(t.formato === "svizzero" ? "tab.bye" : "tab.riposa", { nome: esc(nomeGiocatore(t, turno.riposa)) }) : "";
  const nota = completo ? tr("tab.tutte") : mancano === 1 ? tr("tab.manca1") : tr("tab.mancanoN", { n: mancano });
  box.innerHTML = `
    <div class="avanzamento">
      <div class="avanz-info">
        <span class="label">${tr("tab.incorso")}</span>
        <strong>${esc(titolo)}</strong>
        <span class="avanz-conta">${conteggio}${riposa}</span>
      </div>
      <div class="avanz-azione">
        <button type="button" class="btn btn-prosegui ${completo ? "btn-primario" : ""}" id="btn-prosegui" ${completo ? "" : "disabled"}>${esc(testoBottone)}</button>
        <span class="nota">${nota}</span>
      </div>
    </div>`;
}

function bannerFinale(t) {
  const tornaHome = `${bottoneStella(t.idCronologia, true)}
    <button type="button" class="btn" data-vai="home">${tr("tab.tornahome")}</button>`;
  const conFinale = t.formato === "eliminazione" || (t.formato === "svizzero" && t.turni.some((tu) => tu.fase === "taglio"));
  if (conFinale) {
    const finale = t.turni[t.turni.length - 1].partite[0];
    if (t.campione === null) {
      return `<div class="finale-torneo">
        <span class="label">${tr("tab.concluso")}</span>
        <div class="nome-campione">${tr("tab.nessuno")}</div>
        <p>${tr("tab.finalesenza")}</p>
        ${tornaHome}
      </div>`;
    }
    let riga;
    if (finale.esito === "bye") {
      riga = tr("tab.finalebye");
    } else {
      const perdente = finale.vincitore === finale.a ? finale.b : finale.a;
      riga = tr("tab.finale", {
        v: esc(nomeGiocatore(t, finale.vincitore)),
        p: esc(nomeGiocatore(t, perdente)),
        punti: punteggioTesto(finale.punteggio),
      });
    }
    return `<div class="finale-torneo">
      <span class="label">${tr("tab.campione")}</span>
      <div class="nome-campione">${esc(nomeGiocatore(t, t.campione))}</div>
      <p>${riga}</p>
      ${tornaHome}
    </div>`;
  }
  const c = t.formato === "svizzero" ? classificaSvizzera(t) : classifica(t);
  const gradino = (r, classe) => r ? `<div class="gradino ${classe}">
      <span class="pos">${r.pos}°</span>
      <strong>${esc(r.nome)}</strong>
      <span>${tr(r.vinte === 1 ? "tab.vittoria1" : "tab.vittorieN", { n: r.vinte })}</span>
    </div>` : "<div></div>";
  return `<div class="finale-torneo">
    <span class="label">${tr("tab.classfinale")}</span>
    <div class="podio">${gradino(c[1], "p2")}${gradino(c[0], "p1")}${gradino(c[2], "p3")}</div>
    ${tornaHome}
  </div>`;
}

function cartaMatch(t, m, r) {
  const reale = matchReale(m);
  const attivo = modificabile(t, r);
  const conclusa = m.stato === "conclusa";
  const pt = m.stato === "in corso" && m.partita ? m.partita.vittorie : m.punteggio;

  const riga = (id, k) => {
    if (id === null) {
      const testo = m.esito === "bye" && r === 0 ? tr("carta.bye") : "—";
      return `<span class="riga vuoto"><span class="n">${testo}</span></span>`;
    }
    let cls = "riga";
    if (conclusa) cls += m.vincitore === id ? " vince" : " perde";
    const punti = reale && pt ? pt[k] : "";
    return `<span class="${cls}"><span class="n">${esc(nomeGiocatore(t, id))}</span><span class="pt">${punti}</span></span>`;
  };

  let stato;
  let classe = "";
  if (m.stato === "da giocare") {
    stato = tr(attivo ? "carta.dagiocare" : "carta.attesa");
    if (attivo) classe = "da-giocare";
  } else if (m.stato === "in corso") {
    const conTimer = m.partita && m.partita.timer.durataMs !== null;
    stato = tr("carta.incorso") + (conTimer
      ? ` · <span data-orologio="${m.id}">${formatTempo(tempoRimanente(m.partita.timer, Date.now()))}</span>` : "");
    classe = "in-corso";
  } else {
    stato = tr({ bye: "carta.passa", vuota: "carta.vuota", "doppia sconfitta": "carta.doppia", vittoria: "carta.conclusa" }[m.esito]);
    classe = "conclusa";
  }

  if (t.formato === "svizzero" && !turnoDelTaglio(t, r)) {
    stato = `${tr("sv.tavolo", { n: t.turni[r].partite.indexOf(m) + 1 })} · ${stato}`;
  }
  const contenuto = `${riga(m.a, 0)}${riga(m.b, 1)}<span class="st">${stato}</span>`;
  if (!reale) return `<div class="match automatico ${classe}">${contenuto}</div>`;
  const etichetta = `${etichettaMatch(t, r, t.turni[r].partite.indexOf(m))}: ${descriviMatch(t, m)}`;
  return `<button type="button" class="match ${classe}" data-match="${m.id}" aria-label="${esc(etichetta)}">${contenuto}</button>`;
}

function cartaSegnaposto() {
  const d = tr("carta.definire");
  return `<div class="match segnaposto">
    <span class="riga vuoto"><span class="n">${d}</span></span>
    <span class="riga vuoto"><span class="n">${d}</span></span>
    <span class="st">${tr("carta.attesa")}</span>
  </div>`;
}

function disegnaBracket(t) {
  $("#vista-torneo").innerHTML = htmlBracket(t, 0, t.numeroTurni);
}

// Colonne da "primo" (indice del turno) per "quante" colonne; i turni non ancora creati
// sono segnaposto "da definire"
function htmlBracket(t, primo, quante) {
  const colonne = [];
  for (let r = primo; r < primo + quante; r++) {
    const turno = t.turni[r];
    const nPartite = partiteEliminazione(t, r);
    const carte = [];
    for (let i = 0; i < nPartite; i++) {
      carte.push(`<div class="slot">${turno ? cartaMatch(t, turno.partite[i], r) : cartaSegnaposto()}</div>`);
    }
    const gruppi = [];
    for (let i = 0; i < nPartite; i += 2) gruppi.push(`<div class="coppia">${carte[i]}${carte[i + 1] || ""}</div>`);
    const attiva = r === t.turnoCorrente && !t.concluso;
    colonne.push(`
      <div class="colonna ${attiva ? "attiva" : ""}">
        <div class="colonna-testa"><span class="label">${nomeTurno(t, r)}</span></div>
        <div class="colonna-corpo">${gruppi.join("")}</div>
      </div>`);
  }
  return `
    <div class="bracket-scroll">
      <div class="bracket" style="--colonne:${quante}; --righe:${partiteEliminazione(t, primo)}">${colonne.join("")}</div>
    </div>`;
}

function tabellaClassifica(t) {
  const righe = classifica(t).map((r) => `
    <tr class="${r.pos === 1 && r.giocate > 0 ? "testa" : ""}">
      <td class="pos">${r.pos}</td>
      <td class="chi">${esc(r.nome)}</td>
      <td class="num">${r.vinte}</td>
      <td class="num">${r.perse}</td>
      <td class="num">${r.duelVinti}–${r.duelPersi}</td>
      <td class="num">${r.giocate}</td>
    </tr>`).join("");
  return `
    <div class="tabella-scroll">
      <table class="classifica">
        <thead><tr>
          <th scope="col">#</th><th scope="col">${tr("cl.giocatore")}</th>
          <th scope="col" class="num" title="${tr("cl.V.t")}">${tr("cl.V")}</th>
          <th scope="col" class="num" title="${tr("cl.P.t")}">${tr("cl.P")}</th>
          <th scope="col" class="num" title="${tr("cl.duel.t")}">${tr("cl.duel")}</th>
          <th scope="col" class="num" title="${tr("cl.G.t")}">${tr("cl.G")}</th>
        </tr></thead>
        <tbody>${righe}</tbody>
      </table>
    </div>
    <p class="nota">${tr("cl.legenda")}</p>`;
}

function disegnaPunti(t) {
  const r = t.turnoCorrente;
  const turno = t.turni[r];
  const carte = turno.partite.map((m) => cartaMatch(t, m, r)).join("");
  // Il nome di chi riposa nel turno in corso è già nella barra sopra
  const riposa = t.concluso && turno.riposa !== null
    ? `<span class="nota">${tr("punti.riposaTitolo", { nome: esc(nomeGiocatore(t, turno.riposa)) })}</span>` : "";
  const fino = t.concluso ? t.turni.length - 1 : r;
  const giocati = t.turni.slice(0, fino).map((tu, i) => `
    <div class="turno-giocato">
      <h3>${nomeTurno(t, i)}${tu.riposa !== null ? ` <span class="nota">${tr("punti.riposa", { nome: esc(nomeGiocatore(t, tu.riposa)) })}</span>` : ""}</h3>
      <div class="griglia-match">${tu.partite.map((m) => cartaMatch(t, m, i)).join("")}</div>
    </div>`).reverse().join("");
  const restano = t.numeroTurni - r - 1;
  const notaRestano = !t.concluso && restano > 0
    ? `<p class="nota">${restano === 1 ? tr("punti.manca1") : tr("punti.mancanoN", { n: restano })}</p>` : "";

  $("#vista-torneo").innerHTML = `
    <div class="vista-punti">
      <section class="blocco">
        <div class="blocco-testa"><h2>${tr(t.concluso ? "punti.ultimo" : "punti.partite")}</h2>${riposa}</div>
        <div class="griglia-match">${carte}</div>
        ${notaRestano}
      </section>
      <section class="blocco">
        <div class="blocco-testa"><h2>${tr(t.concluso ? "tab.classfinale" : "cl.titolo")}</h2></div>
        ${tabellaClassifica(t)}
      </section>
    </div>
    ${fino > 0 ? `<details class="blocco giocati" ${giocatiAperto ? "open" : ""}>
      <summary>${tr("punti.giocati", { n: fino })}</summary>
      ${giocati}
    </details>` : ""}`;
}

// ---------- Svizzero ----------

const percentuale = (x) => `${Math.round(x * 100)}%`;

function tabellaSvizzera(t) {
  const righe = classificaSvizzera(t).map((r) => `
    <tr class="${r.pos === 1 && r.giocate > 0 ? "testa" : ""} ${r.ritirato ? "ritirato" : ""}">
      <td class="pos">${r.pos}</td>
      <td class="chi">${esc(r.nome)}${r.ritirato ? ` <span class="nota">${tr("sv.ritirato")}</span>` : ""}</td>
      <td class="num">${r.vinte}</td>
      <td class="num">${r.perse}</td>
      <td class="num">${percentuale(r.omw)}</td>
      <td class="num col-oomw">${percentuale(r.oomw)}</td>
    </tr>`).join("");
  return `
    <div class="tabella-scroll">
      <table class="classifica">
        <thead><tr>
          <th scope="col">#</th><th scope="col">${tr("cl.giocatore")}</th>
          <th scope="col" class="num" title="${tr("cl.V.t")}">${tr("cl.V")}</th>
          <th scope="col" class="num" title="${tr("cl.P.t")}">${tr("cl.P")}</th>
          <th scope="col" class="num" title="${tr("sv.omw.t")}">${tr("sv.omw")}</th>
          <th scope="col" class="num col-oomw" title="${tr("sv.oomw.t")}">${tr("sv.oomw")}</th>
        </tr></thead>
        <tbody>${righe}</tbody>
      </table>
    </div>
    <p class="nota">${tr("sv.legenda")}</p>`;
}

// Turni svizzeri già giocati (dal più recente), in un riquadro che si apre
function turniSvizzeriGiocati(t, fino) {
  if (fino <= 0) return "";
  const giocati = t.turni.slice(0, fino).map((tu, i) => `
    <div class="turno-giocato">
      <h3>${nomeTurno(t, i)}${tu.riposa !== null ? ` <span class="nota">${tr("punti.bye", { nome: esc(nomeGiocatore(t, tu.riposa)) })}</span>` : ""}</h3>
      <div class="griglia-match">${tu.partite.map((m) => cartaMatch(t, m, i)).join("")}</div>
    </div>`).reverse().join("");
  return `<details class="blocco giocati" ${giocatiAperto ? "open" : ""}>
      <summary>${tr("sv.giocati", { n: fino })}</summary>
      ${giocati}
    </details>`;
}

function disegnaSvizzero(t) {
  const r = t.turnoCorrente;
  const turno = t.turni[r];
  const ritiri = puoRitirare(t)
    ? `<button type="button" class="btn btn-leggero btn-piccolo" data-azione="ritiri">${tr("sv.ritiri")}</button>` : "";
  const blocco = (titolo) => `<section class="blocco">
      <div class="blocco-testa"><h2>${titolo}</h2>${ritiri}</div>
      ${tabellaSvizzera(t)}
    </section>`;

  if (turno.fase === "svizzero" && !t.concluso) {
    const restano = t.turniSvizzeri - r - 1;
    const nota = restano > 0
      ? `<p class="nota">${restano === 1 ? tr("sv.manca1") : tr("sv.mancanoN", { n: restano })}</p>`
      : `<p class="nota">${t.taglio ? tr("sv.poitaglio", { k: t.taglio }) : tr("sv.ultimo")}</p>`;
    $("#vista-torneo").innerHTML = `
      <div class="vista-punti">
        <section class="blocco">
          <div class="blocco-testa"><h2>${tr("punti.partite")}</h2></div>
          <div class="griglia-match">${turno.partite.map((m) => cartaMatch(t, m, r)).join("")}</div>
          ${nota}
        </section>
        ${blocco(tr("cl.titolo"))}
      </div>
      ${turniSvizzeriGiocati(t, r)}`;
    return;
  }

  // Top cut (o torneo finito): tabellone del taglio, poi la classifica dello svizzero
  const conTaglio = t.turni.some((tu) => tu.fase === "taglio");
  const tabellone = conTaglio ? htmlBracket(t, t.turniSvizzeri, Math.log2(t.taglio)) : "";
  $("#vista-torneo").innerHTML = `
    ${tabellone}
    <div class="vista-svizzero-fine">${blocco(tr("sv.classifica"))}</div>
    ${turniSvizzeriGiocati(t, t.turniSvizzeri)}`;
}

// ---------- Ritiri ----------

function apriRitiri() {
  disegnaRitiri();
  apriDialogo($("#dialogo-ritiri"));
}

function disegnaRitiri() {
  const t = app.torneo;
  if (!t || t.formato !== "svizzero") return;
  const righe = classificaSvizzera(t).slice().sort((x, y) => Number(x.ritirato) - Number(y.ritirato) || x.pos - y.pos);
  $("#lista-ritiri").innerHTML = righe.map((r) => `
    <li class="riga-ritiro ${r.ritirato ? "ritirato" : ""}">
      <span class="chi">${esc(r.nome)}</span>
      <span class="nota">${r.vinte}–${r.perse}</span>
      <button type="button" class="btn ${r.ritirato ? "" : "btn-leggero-bordo"}" data-ritiro="${r.id}" data-stato="${r.ritirato ? "1" : "0"}">
        ${tr(r.ritirato ? "sv.riammetti" : "sv.ritira")}
      </button>
    </li>`).join("");
}

$("#lista-ritiri").addEventListener("click", (ev) => {
  const b = ev.target.closest("[data-ritiro]");
  const t = app.torneo;
  if (!b || !t) return;
  if (!impostaRitiro(t, Number(b.dataset.ritiro), b.dataset.stato !== "1")) return;
  SUONI.fase();
  disegnaRitiri();
  disegnaTabellone();
  salva();
});

// Aggiorna solo i minuti rimasti, senza ridisegnare il tabellone
function aggiornaOrologiTabellone() {
  const t = app.torneo;
  if (!t) return;
  $$("[data-orologio]").forEach((el) => {
    const tr2 = trovaMatch(t, el.dataset.orologio);
    if (tr2 && tr2.match.partita) el.textContent = formatTempo(tempoRimanente(tr2.match.partita.timer, Date.now()));
  });
}

$("#vista-torneo").addEventListener("click", (ev) => {
  if (ev.target.closest("[data-azione=ritiri]")) { apriRitiri(); return; }
  const b = ev.target.closest("[data-match]");
  if (b) apriPannello(b.dataset.match);
});
$("#vista-torneo").addEventListener("toggle", (ev) => {
  if (ev.target.matches("details.giocati")) giocatiAperto = ev.target.open;
}, true);

$("#avanzamento").addEventListener("click", (ev) => {
  if (!ev.target.closest("#btn-prosegui")) return;
  const t = app.torneo;
  if (!prosegui(t)) return;
  if (t.concluso) SUONI.fineDuel(); else SUONI.turno();
  disegnaTabellone();
  salva();
});

// ---------- Pannello del match ----------

function apriPannello(id) {
  if (!trovaMatch(app.torneo, id)) return;
  pannelloId = id;
  disegnaPannello();
  apriDialogo($("#pannello-match"));
}

function chiudiPannello() {
  chiudiDialogo($("#pannello-match"));
  pannelloId = null;
}

function testoStatoMatch(t, m, r) {
  const A = esc(nomeGiocatore(t, m.a));
  const B = esc(nomeGiocatore(t, m.b));
  if (m.stato === "da giocare") return tr("pm.dagiocare");
  if (m.stato === "in corso") {
    const p = m.partita;
    const tempo = p.timer.durataMs !== null
      ? ` · ${tr("pm.rimasti", { tempo: `<span data-orologio="${m.id}">${formatTempo(tempoRimanente(p.timer, Date.now()))}</span>` })}`
      : "";
    return tr("pm.incorso", { d: p.risultatiDuel.length + 1, a: A, va: p.vittorie[0], vb: p.vittorie[1], b: B }) + tempo;
  }
  if (m.esito === "doppia sconfitta") {
    return tr(t.formato === "eliminazione" || turnoDelTaglio(t, r) ? "pm.doppia.elim" : "pm.doppia.punti");
  }
  return tr("pm.vince", { v: esc(nomeGiocatore(t, m.vincitore)), punti: punteggioTesto(m.punteggio) });
}

function disegnaPannello() {
  const t = app.torneo;
  const tr2 = trovaMatch(t, pannelloId);
  if (!tr2) { chiudiPannello(); return; }
  const { match: m, turno: r, indice: i } = tr2;
  const A = esc(nomeGiocatore(t, m.a));
  const B = esc(nomeGiocatore(t, m.b));
  const edit = modificabile(t, r);
  const standard = t.tipo === "standard";
  const minuti = durataMatch(t, r);

  let gioca = "";
  if (edit && m.stato === "da giocare") {
    const tempo = minuti === null
      ? tr("pm.senzatempo") + (eFinale(t, r) ? tr("pm.finale") : "")
      : tr("pm.timer", { m: minuti });
    gioca = `<section class="pannello-sezione">
      <h3 class="label">${tr("pm.gioca")}</h3>
      <div class="campo-form">
        <label class="label" for="pm-primo">${tr("chi.inizia")}</label>
        <select class="input" id="pm-primo">
          <option value="moneta">${tr("moneta.decide")}</option>
          <option value="0">${A}</option>
          <option value="1">${B}</option>
        </select>
      </div>
      <p class="nota">${tr(standard ? "pm.bo3" : "pm.uno")} · ${tempo}</p>
      <button type="button" class="btn btn-primario btn-grande" data-pa="gioca">${tr("pm.giocaduel")}</button>
    </section>`;
  } else if (m.partita) {
    const inCorso = m.stato === "in corso";
    gioca = `<section class="pannello-sezione">
      <button type="button" class="btn ${inCorso ? "btn-primario btn-grande" : ""}" data-pa="apri">${tr(inCorso ? "pm.riprendi" : "pm.apri")}</button>
    </section>`;
  }

  let risultato;
  if (edit) {
    risultato = `<section class="pannello-sezione">
      <h3 class="label">${tr(m.stato === "conclusa" ? "pm.correggi" : "pm.assegna")}</h3>
      ${standard ? `<div class="riga-punteggio">
        <span class="nota">${tr("pm.punteggio")}</span>
        <div class="segmenti" role="radiogroup" aria-label="${tr("pm.punteggio.aria")}">
          <label><input type="radio" name="pm-punti" value="0" checked><span>2–0</span></label>
          <label><input type="radio" name="pm-punti" value="1"><span>2–1</span></label>
        </div>
      </div>` : ""}
      <div class="pannello-bottoni">
        <button type="button" class="btn" data-pa="vince" data-lato="a">${tr("pm.vincebtn", { nome: A })}</button>
        <button type="button" class="btn" data-pa="vince" data-lato="b">${tr("pm.vincebtn", { nome: B })}</button>
        ${standard ? `<button type="button" class="btn intera" data-pa="doppia">${tr("pm.doppiabtn")}</button>` : ""}
      </div>
      ${m.stato !== "da giocare" ? `<button type="button" class="btn btn-leggero" data-pa="azzera">${tr("pm.azzera")}</button>` : ""}
    </section>`;
  } else {
    risultato = `<p class="nota">${tr(t.concluso ? "pm.chiuso.torneo" : "pm.chiuso.turno")}</p>`;
  }

  $("#pannello-testa").innerHTML = `
    <span class="label">${esc(etichettaMatch(t, r, i))}</span>
    <button type="button" class="btn btn-leggero" data-chiudi>${tr("chiudi")}</button>`;
  $("#pannello-corpo").innerHTML = `
    <h2 class="pannello-titolo"><span>${A}</span><span class="contro">${tr("contro")}</span><span>${B}</span></h2>
    <p class="pannello-stato">${testoStatoMatch(t, m, r)}</p>
    ${gioca}
    ${risultato}`;
}

$("#pannello-corpo").addEventListener("click", (ev) => {
  const b = ev.target.closest("[data-pa]");
  if (!b) return;
  const t = app.torneo;
  const trovato = trovaMatch(t, pannelloId);
  if (!trovato) return;
  const m = trovato.match;
  const az = b.dataset.pa;
  const ora = Date.now();

  if (az === "gioca") {
    let primo = $("#pm-primo").value;
    let msg = "";
    if (primo === "moneta") {
      primo = Math.random() < 0.5 ? 0 : 1;
      msg = tr("moneta.inizia", { nome: nomeGiocatore(t, primo === 0 ? m.a : m.b) });
    }
    const p = iniziaMatch(t, m.id, Number(primo), ora);
    if (!p) return;
    chiudiPannello();
    app.matchAperto = m.id;
    apriTavolo(p, msg);
    return;
  }

  if (az === "apri") {
    chiudiPannello();
    app.matchAperto = m.id;
    apriTavolo(m.partita);
    return;
  }

  if (az === "vince") {
    const lato = b.dataset.lato;
    let punteggio = null;
    if (t.tipo === "standard") {
      const scelto = $("input[name=pm-punti]:checked");
      const perdente = scelto ? Number(scelto.value) : 0;
      punteggio = lato === "a" ? [2, perdente] : [perdente, 2];
    }
    assegnaRisultato(t, m.id, lato, punteggio, ora);
    SUONI.fineDuel();
    chiudiPannello();
    disegnaTabellone();
    salva();
    return;
  }

  if (az === "doppia") {
    assegnaRisultato(t, m.id, null, null, ora);
    SUONI.annulla();
    chiudiPannello();
    disegnaTabellone();
    salva();
    return;
  }

  if (az === "azzera") {
    richiediConferma(b, tr("pm.azzera.conf"), () => {
      azzeraMatch(t, m.id);
      disegnaPannello();
      disegnaTabellone();
      salva();
    });
  }
});

$("#pannello-match").addEventListener("close", () => { pannelloId = null; });
