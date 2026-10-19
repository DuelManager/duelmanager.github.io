// =============================================================
// duello.js — il tavolo (life point, fasi, timer) e il setup del duello
// Il tavolo mostra sempre la variabile globale "partita":
// il duello libero oppure un match del torneo.
// I testi arrivano da lingua.js tramite tr().
// =============================================================

const SIGLE_FASI = ["DP", "SP", "M1", "BP", "M2", "EP"];
const NOMI_FASI = ["Draw Phase", "Standby Phase", "Main Phase 1", "Battle Phase", "Main Phase 2", "End Phase"];

function nome(g) { return partita.giocatori[g].nome; }

function partitaInCorso() {
  return partita && !partita.finita && partita.duel.esito === null;
}

// Risultato del duello libero se è finito, altrimenti null.
// Standard: finito quando il match è chiuso. Casual: quando il duel in corso ha un vincitore
// o è in pareggio, anche se non si è ancora premuto "Rivincita".
// Ritorna 0 | 1 | "doppia sconfitta" | "pareggio" | null
function esitoDuelloLibero(p) {
  if (p.finita) return p.risultato;
  if (p.modalita === "casual" && p.duel.esito !== null) return p.duel.esito;
  return null;
}

// Il match del torneo sul tavolo, se c'è
function matchSulTavolo() {
  return app.matchAperto && app.torneo ? trovaMatch(app.torneo, app.matchAperto) : null;
}

// "testa" / "croce" (anche i vecchi "Testa" / "Croce") nella lingua scelta
function testoMoneta(esito) {
  return tr(`moneta.${String(esito).toLowerCase()}`);
}

// ---------- Suoni legati alle azioni ----------

// Dopo un cambio di LP: fine duel se il duel si è appena chiuso, altrimenti danno o guadagno
function suonoLP(variazione) {
  if (partita.duel.esito !== null) SUONI.fineDuel();
  else if (variazione < 0) SUONI.danno();
  else if (variazione > 0) SUONI.guadagno();
}

function annullaConSuono() {
  if (!partita || partita.finita || partita.duel.eventi.length === 0) return;
  annulla(partita);
  SUONI.annulla();
  aggiorna();
}

// ---------- Pannelli giocatore (creati una volta) ----------

function costruisciGiocatore(sezione) {
  const g = Number(sezione.dataset.g);
  sezione.innerHTML = `
    <div class="testa-g">
      <span class="nome" data-ruolo="nome"></span>
      <span class="badge-turno" data-ruolo="badge" data-t="tav.diturno" hidden></span>
    </div>
    <div class="vittorie" data-ruolo="vittorie"></div>
    <button type="button" class="lp-box" data-ruolo="lp-apri">
      <span class="lp" data-ruolo="lp">8000</span>
      <span class="lp-sotto" data-t="tav.lp"></span>
      <span class="lp-tocca" data-t="tav.tocca.lp"></span>
      <span class="delta" data-ruolo="delta"></span>
    </button>
    <form class="form-lp" novalidate>
      <input class="input" id="input-lp-${g}" data-t-ph="tav.lp.ph" data-t-aria="tav.lp.aria" inputmode="text" autocomplete="off">
      <button type="submit" class="btn btn-primario">OK</button>
    </form>
    <p class="msg-errore" data-ruolo="errore" aria-live="polite"></p>
    <div class="rapidi">
      <button type="button" class="btn" data-delta="-50">−50</button>
      <button type="button" class="btn" data-delta="-100">−100</button>
      <button type="button" class="btn" data-delta="-500">−500</button>
      <button type="button" class="btn" data-delta="-1000">−1000</button>
      <button type="button" class="btn piu" data-delta="50">+50</button>
      <button type="button" class="btn piu" data-delta="100">+100</button>
      <button type="button" class="btn piu" data-delta="500">+500</button>
      <button type="button" class="btn piu" data-delta="1000">+1000</button>
      <button type="button" class="btn meta" data-meta data-t="tav.meta"></button>
    </div>`;

  const form = $("form", sezione);
  const input = $("input", sezione);
  const errore = $("[data-ruolo=errore]", sezione);
  form.addEventListener("submit", (ev) => {
    ev.preventDefault();
    const v = leggiValore(input.value);
    if (v === null) {
      input.classList.remove("errore"); void input.offsetWidth; input.classList.add("errore");
      errore.textContent = tr("tav.lp.errore");
      return;
    }
    errore.textContent = "";
    input.classList.remove("errore");
    input.value = "";
    cambiaLP(g, v);
  });
  input.addEventListener("input", () => { errore.textContent = ""; input.classList.remove("errore"); });

  $$("[data-delta]", sezione).forEach((b) => b.addEventListener("click", () => cambiaLP(g, Number(b.dataset.delta))));
  $("[data-meta]", sezione).addEventListener("click", () => dimezza(g));
  // Tocco sui life point: tastierino con i tasti rapidi
  $("[data-ruolo=lp-apri]", sezione).addEventListener("click", () => apriEditorLP(g));
}

function cambiaLP(g, valore) {
  if (!partitaInCorso()) return;
  const prima = lp(partita.duel, g);
  modificaLP(partita, g, valore);
  const d = lp(partita.duel, g) - prima;
  mostraDelta(g, d);
  suonoLP(d);
  aggiorna();
}

function dimezza(g) {
  if (!partitaInCorso()) return;
  const prima = lp(partita.duel, g);
  dimezzaLP(partita, g);
  const d = lp(partita.duel, g) - prima;
  mostraDelta(g, d);
  suonoLP(d);
  aggiorna();
}

// Stesso valore a entrambi i giocatori (negativo = danno)
function cambiaLPEntrambi(valore) {
  if (!partitaInCorso()) return;
  const prima = [lp(partita.duel, 0), lp(partita.duel, 1)];
  modificaLPEntrambi(partita, valore, valore);
  mostraDelta(0, lp(partita.duel, 0) - prima[0]);
  mostraDelta(1, lp(partita.duel, 1) - prima[1]);
  suonoLP(valore);
  aggiorna();
}

// ---------- Tastierino dei life point ----------
// Si scrive il numero e si sceglie "Togli" o "Aggiungi"; i tasti rapidi valgono subito.
// Ogni modifica chiude il tastierino: il nuovo valore si vede sul tavolo.

const MAX_CIFRE = 6;
let editorLP = { chi: 0, valore: "" };   // chi: 0 | 1 | "entrambi"

function apriEditorLP(chi) {
  if (!partitaInCorso()) return;
  chiudiMenuStrumenti();
  editorLP = { chi, valore: "" };
  disegnaEditorLP();
  apriDialogo($("#dialogo-lp"));
}

function disegnaEditorLP() {
  if (!partita) return;
  const { chi, valore } = editorLP;
  const entrambi = chi === "entrambi";
  const finestra = $("#dialogo-lp");
  finestra.dataset.g = entrambi ? "" : String(chi);
  $("#lp-titolo").textContent = entrambi ? tr("lp.entrambi") : nome(chi);
  $("#lp-attuali").textContent = entrambi
    ? `${lp(partita.duel, 0)} · ${lp(partita.duel, 1)}`
    : `${lp(partita.duel, chi)} LP`;

  const display = $("#lp-display");
  display.textContent = valore || "0";
  display.classList.toggle("vuoto", !valore);

  // Sui due pulsanti si vede già il risultato: "Togli → 5600"
  const n = Number(valore) || 0;
  const dopo = (v) => {
    const calcola = (g) => Math.max(0, lp(partita.duel, g) + v);
    return entrambi ? `${calcola(0)} · ${calcola(1)}` : String(calcola(chi));
  };
  [["#lp-togli", -n], ["#lp-aggiungi", n]].forEach(([id, v]) => {
    $(id).disabled = n === 0;
    $(`${id} .anteprima`).textContent = n ? `→ ${dopo(v)}` : "";
  });
  $("#lp-meta").hidden = entrambi;
}

function scriviCifre(cifre) {
  let v = editorLP.valore;
  if (v === "" && cifre.startsWith("0")) return;          // niente zeri all'inizio
  v = (v + cifre).slice(0, MAX_CIFRE);
  editorLP.valore = v;
  disegnaEditorLP();
}

function cancellaCifra() {
  editorLP.valore = editorLP.valore.slice(0, -1);
  disegnaEditorLP();
}

// valore con segno: -2400 toglie, +1000 aggiunge
function applicaEditorLP(valore) {
  if (!valore) return;
  const chi = editorLP.chi;
  chiudiDialogo($("#dialogo-lp"));
  if (chi === "entrambi") cambiaLPEntrambi(valore);
  else cambiaLP(chi, valore);
}

$("#dialogo-lp").addEventListener("click", (ev) => {
  const b = ev.target.closest("button");
  if (!b || b.disabled) return;
  if (b.dataset.cifra) scriviCifre(b.dataset.cifra);
  else if (b.hasAttribute("data-cancella")) cancellaCifra();
  else if (b.id === "lp-togli") applicaEditorLP(-Number(editorLP.valore));
  else if (b.id === "lp-aggiungi") applicaEditorLP(Number(editorLP.valore));
  else if (b.dataset.delta) applicaEditorLP(Number(b.dataset.delta));
  else if (b.id === "lp-meta") {
    const g = editorLP.chi;
    chiudiDialogo($("#dialogo-lp"));
    dimezza(g);
  }
});

// Con la tastiera del computer: cifre, Canc, Invio (o -) toglie, + aggiunge
$("#dialogo-lp").addEventListener("keydown", (ev) => {
  if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
  const n = Number(editorLP.valore);
  if (/^[0-9]$/.test(ev.key)) { ev.preventDefault(); scriviCifre(ev.key); }
  else if (ev.key === "Backspace" || ev.key === "Delete") { ev.preventDefault(); cancellaCifra(); }
  else if ((ev.key === "Enter" || ev.key === "-") && n) { ev.preventDefault(); applicaEditorLP(-n); }
  else if (ev.key === "+" && n) { ev.preventDefault(); applicaEditorLP(n); }
});

// ---------- Menu Strumenti (telefono) ----------

function apriMenuStrumenti() {
  $("#menu-strumenti").hidden = false;
  $("#btn-strumenti").setAttribute("aria-expanded", "true");
}

function chiudiMenuStrumenti() {
  const menu = $("#menu-strumenti");
  if (!menu || menu.hidden) return;
  menu.hidden = true;
  $("#btn-strumenti").setAttribute("aria-expanded", "false");
}

$("#btn-strumenti").addEventListener("click", () => {
  if ($("#menu-strumenti").hidden) apriMenuStrumenti();
  else chiudiMenuStrumenti();
});

$("#menu-strumenti").addEventListener("click", (ev) => {
  const b = ev.target.closest("[data-strumento]");
  if (!b || b.disabled) return;
  chiudiMenuStrumenti();
  const s = b.dataset.strumento;
  if (s === "moneta") tiraMoneta();
  else if (s === "dado") tiraDado();
  else if (s === "entrambi") apriEditorLP("entrambi");
  else if (s === "registro") apriDialogo($("#dialogo-registro"));
});

// Tocco fuori dal menu (o Esc): si chiude
document.addEventListener("click", (ev) => {
  if (!ev.target.closest("#menu-strumenti, #btn-strumenti")) chiudiMenuStrumenti();
});
document.addEventListener("keydown", (ev) => {
  if (ev.key === "Escape") chiudiMenuStrumenti();
});

// L'animazione viene tolta a fine corsa: se la classe restasse, il browser la
// rifarebbe ogni volta che il tavolo torna visibile.
const timerDelta = [null, null];
function mostraDelta(g, d) {
  if (!d) return;
  const el = $(`.giocatore[data-g="${g}"] [data-ruolo=delta]`);
  el.textContent = segno(d);
  el.className = `delta ${d < 0 ? "meno" : "piu"}`;
  void el.offsetWidth;
  el.classList.add("mostra");
  clearTimeout(timerDelta[g]);
  timerDelta[g] = setTimeout(() => { el.className = "delta"; el.textContent = ""; }, 1400);
}

function azzeraDelta() {
  [0, 1].forEach((g) => {
    clearTimeout(timerDelta[g]);
    const el = $(`.giocatore[data-g="${g}"] [data-ruolo=delta]`);
    el.className = "delta";
    el.textContent = "";
  });
}

// ---------- Fasi (create una volta; i nomi delle fasi sono uguali in tutte le lingue) ----------

function costruisciFasi() {
  const box = $("#fasi");
  box.innerHTML = SIGLE_FASI.map((s, i) =>
    `<button type="button" data-fase="${i}" title="${NOMI_FASI[i]}" aria-label="${NOMI_FASI[i]}">${s}</button>`).join("");
  $$("button", box).forEach((b) => b.addEventListener("click", () => {
    if (!partitaInCorso()) return;
    vaiAFase(partita, Number(b.dataset.fase));
    SUONI.fase();
    aggiorna();
  }));
}

function faseSuccessiva() {
  if (!partitaInCorso()) return;
  const turnoPrima = partita.duel.turno;
  avanzaFase(partita);
  if (partita.duel.turno !== turnoPrima) SUONI.turno(); else SUONI.fase();
  aggiorna();
}

// ---------- Disegno ----------

function aggiorna() {
  if (!partita) return;
  sincronizzaCronologia();   // prima di disegnare: la stella di fine duello ha bisogno della voce
  disegnaTavolo();
  salva();
}

// Stella "Salva nei preferiti" e "Condividi" per il duello libero appena finito (i match dei
// tornei non vanno in cronologia uno per uno: c'è la stella del torneo, e si condivide il torneo)
function stellaEsito() {
  if (matchSulTavolo() || !app.duello || partita !== app.duello.partita) return "";
  const id = partita.modalita === "standard" ? partita.idCronologia : partita.duel.idCronologia;
  if (!trovaVoce(id)) return "";
  return `<div class="voce-azioni">${bottoneStella(id, true)}${bottoneCondividi(id)}</div>`;
}

function disegnaTavolo() {
  if (!partita) return;
  disegnaBarra();
  disegnaGiocatori();
  disegnaCentro();
  disegnaLog();
  disegnaTimer();
  // Duel finito (o tempo scaduto) con il tastierino aperto: non serve più
  const editor = $("#dialogo-lp");
  if (editor.open) {
    if (partitaInCorso()) disegnaEditorLP();
    else chiudiDialogo(editor);
  }
}

function disegnaBarra() {
  const mt = matchSulTavolo();
  if (mt) {
    $("#info-modalita").textContent = etichettaMatch(app.torneo, mt.turno, mt.indice);
  } else {
    $("#info-modalita").textContent = tr(partita.modalita === "standard" ? "tav.standard" : "tav.casual");
  }
  // A match finito l'ultimo duel è già tra i risultati: non va contato un duel in più
  $("#info-duel").textContent = tr("tav.duel", { n: partita.risultatiDuel.length + (partita.finita ? 0 : 1) });
  $("#info-precedenti").textContent = partita.risultatiDuel.map((r, i) =>
    `D${i + 1}: ${r === "pareggio" ? tr("tav.pareggio") : nome(r)}`).join(" · ");
  $("#btn-esci").textContent = tr(mt ? "tav.tabellone" : "home");
  aggiornaBottoniSuono();
}

function disegnaGiocatori() {
  const necessarie = partita.vittoriePerMatch;
  $$(".giocatore").forEach((sez) => {
    const g = Number(sez.dataset.g);
    const attivo = partitaInCorso() && partita.duel.giocatoreAttivo === g;
    sez.classList.toggle("attivo", attivo);
    sez.setAttribute("aria-label", nome(g));
    $("[data-ruolo=nome]", sez).textContent = nome(g);
    $("[data-ruolo=badge]", sez).hidden = !attivo;
    const valore = lp(partita.duel, g);
    const elLP = $("[data-ruolo=lp]", sez);
    elLP.textContent = String(valore);
    elLP.classList.toggle("zero", valore === 0);
    elLP.classList.toggle("lungo", valore >= 10000);
    $("[data-ruolo=lp-apri]", sez).setAttribute("aria-label", tr("lp.aria", { nome: nome(g), lp: valore }));

    const v = $("[data-ruolo=vittorie]", sez);
    if (necessarie != null) {
      v.innerHTML = Array.from({ length: necessarie }, (_, i) =>
        `<span class="pip ${partita.vittorie[g] > i ? "piena" : ""}"></span>`).join("") +
        `<span class="label" style="margin-left:4px">${tr("tav.duelvinti")}</span>`;
    } else {
      v.innerHTML = `<span class="vittorie-num">${tr("tav.vittorie", { n: partita.vittorie[g] })}</span>`;
    }

    const bloccato = !partitaInCorso();
    $$("input, button", sez).forEach((el) => { el.disabled = bloccato; });
  });
}

function disegnaCentro() {
  const duel = partita.duel;
  $("#turno-num").textContent = tr("tav.turno", { n: duel.turno });
  $("#turno-chi").textContent = tr("tav.tocca", { nome: nome(duel.giocatoreAttivo) });
  $("#turno-chi").style.color = `var(--p${duel.giocatoreAttivo})`;
  $("#fase-nome").textContent = NOMI_FASI[duel.fase];
  // Primo turno: niente Draw e Battle (e quindi niente Main 2), compaiono dal turno 2
  const nascoste = duel.turno === 1 ? [0, 3, 4] : [];
  $$("#fasi button").forEach((b, i) => {
    b.hidden = nascoste.includes(i);
    b.classList.toggle("corrente", i === duel.fase);
    b.classList.toggle("passata", i < duel.fase);
    b.setAttribute("aria-pressed", String(i === duel.fase));
  });
  $("#btn-fase").textContent = tr(duel.fase === FASI.length - 1 ? "tav.passaturno" : "tav.fasesucc");
  $("#nota-turno").textContent = duel.turno === 1
    ? tr("tav.primoturno", { nome: nome(duel.primoGiocatore) }) : "";

  const inCorso = partitaInCorso();
  $("#zona-turno").hidden = !inCorso;
  $("#btn-moneta").disabled = !inCorso;
  $("#btn-dado").disabled = !inCorso;
  $("#btn-annulla").disabled = partita.finita || duel.eventi.length === 0;
  $$("#form-entrambi input, #form-entrambi button").forEach((el) => { el.disabled = !inCorso; });
  $$("#menu-strumenti [data-strumento]").forEach((b) => {
    b.disabled = !inCorso && b.dataset.strumento !== "registro";
  });

  disegnaEsito();
  // Sul telefono, a duel finito il centro mostra solo l'esito
  $(".centro").classList.toggle("con-esito", !$("#esito").hidden);
}

function disegnaEsito() {
  const box = $("#esito");
  const duel = partita.duel;
  const mt = matchSulTavolo();
  const necessarie = partita.vittoriePerMatch;

  if (partita.finita) {
    let titolo, sotto;
    if (partita.risultato === "doppia sconfitta") {
      titolo = tr("es.scaduto");
      sotto = tr("es.scaduto.sotto", { a: partita.vittorie[0], b: partita.vittorie[1] });
    } else {
      const v = partita.risultato;
      titolo = tr("es.vincematch", { nome: nome(v) });
      sotto = tr("es.risultato", { a: partita.vittorie[v], b: partita.vittorie[1 - v] });
    }
    let azioni;
    if (mt) {
      sotto += tr("es.giatab");
      azioni = `<button type="button" class="btn btn-primario" data-az="tabellone">${tr("es.tornatab")}</button>`;
    } else {
      azioni = (app.duello && app.duello.impostazioni
        ? `<button type="button" class="btn btn-primario" data-az="rigioca">${tr("es.rigioca")}</button>` : "") +
        `<button type="button" class="btn" data-az="setup">${tr("es.nuova")}</button>`;
    }
    box.innerHTML = `
      <span class="label">${tr("es.matchconcluso")}</span>
      <h2>${esc(titolo)}</h2>
      <p>${esc(sotto)}</p>
      ${stellaEsito()}
      <div class="azioni">${azioni}</div>`;
    box.hidden = false;
    aggiornaStelle();
  } else if (duel.esito !== null) {
    const pareggio = duel.esito === "pareggio";
    const titolo = pareggio ? tr("es.pareggio") : tr("es.vinceduel", { nome: nome(duel.esito) });
    const chiudeMatch = !pareggio && necessarie != null && partita.vittorie[duel.esito] + 1 >= necessarie;
    let azioni;
    if (chiudeMatch) {
      azioni = `<button type="button" class="btn btn-primario" data-az="chiudi" data-primo="0">${tr("es.chiudimatch")}</button>`;
    } else {
      const etichetta = tr(necessarie == null ? "es.rivincita" : "es.prossimo");
      const domanda = tr(pareggio ? "es.dom.pareggio" : necessarie == null ? "es.dom.rivincita" : "es.dom.perso");
      azioni = `
        <p>${domanda}</p>
        <button type="button" class="btn btn-primario" data-az="chiudi" data-primo="0">${tr("es.inizia", { etichetta, nome: esc(nome(0)) })}</button>
        <button type="button" class="btn btn-primario" data-az="chiudi" data-primo="1">${tr("es.inizia", { etichetta, nome: esc(nome(1)) })}</button>`;
    }
    box.innerHTML = `
      <span class="label">${tr("es.fineduel")}</span>
      <h2>${esc(titolo)}</h2>
      ${partita.modalita === "casual" ? stellaEsito() : ""}
      <div class="azioni">
        ${azioni}
        <button type="button" class="btn" data-az="annulla">${tr("es.annulla")}</button>
      </div>`;
    box.hidden = false;
    aggiornaStelle();
  } else {
    box.hidden = true;
    box.innerHTML = "";
  }
}

// Righe del registro di un duel, in ordine di gioco, con il totale di LP dopo ogni cambio.
// Usato dal tavolo e dalla cronologia. nomi: ["Alessio", "Marco"]
function righeRegistro(eventi, nomi) {
  const totali = [LP_INIZIALI, LP_INIZIALI];
  return eventi.map((e) => {
    const quando = `T${e.turno} · ${SIGLE_FASI[FASI.indexOf(e.fase)] || e.fase}`;
    let cosa;
    if (e.tipo === "lp") {
      const parti = [];
      for (const g of [0, 1]) {
        const d = e.variazioni[g];
        if (!d) continue;
        totali[g] = Math.max(0, totali[g] + d);
        parti.push(`<span class="g${g}">${esc(nomi[g])}</span> ${segno(d)} → ${totali[g]}`);
      }
      cosa = parti.join(" · ");
    } else if (e.tipo === "moneta") {
      cosa = tr("tav.log.moneta", { esito: testoMoneta(e.esito) });
    } else {
      cosa = tr("tav.log.dado", { esito: e.esito });
    }
    return `<li><span class="quando">${quando}</span><span class="cosa">${cosa}</span></li>`;
  });
}

// Cronologia del duel: sotto il tavolo e, sul telefono, nella finestra aperta da "Strumenti"
function disegnaLog() {
  const eventi = partita.duel.eventi;
  // Sul tavolo il più recente sta in alto
  const html = eventi.length === 0
    ? `<li class="vuoto">${tr("tav.log.vuoto")}</li>`
    : righeRegistro(eventi, [nome(0), nome(1)]).reverse().join("");
  $("#log").innerHTML = html;
  $("#log-finestra").innerHTML = html;
}

// Il timer sta al centro del tavolo; sul telefono sale nella barra in alto per lasciare spazio
function posizionaTimer() {
  const box = $("#timer-box");
  if (compatto()) {
    const barra = $(".barra-tavolo");
    if (box.parentElement !== barra) barra.insertBefore(box, $(".barra-azioni", barra));
  } else {
    const centro = $(".centro");
    if (box.parentElement !== centro) centro.prepend(box);
  }
}

function disegnaTimer() {
  if (!partita) return;
  const t = partita.timer;
  const el = $("#timer");
  const box = $("#timer-box");
  if (t.durataMs === null) {
    box.hidden = partita.modalita === "casual";
    el.textContent = tr("tav.senzatempo");
    el.className = "timer senza-tempo";
    $("#btn-pausa").hidden = true;
    return;
  }
  box.hidden = false;
  $("#btn-pausa").hidden = partita.finita;
  const resto = tempoRimanente(t, Date.now());
  el.textContent = formatTempo(resto);
  const inPausa = t.avviatoAlle === null && !partita.finita;
  el.className = "timer" + (resto === 0 ? " scaduto" : resto <= AVVISO_MS ? " avviso" : "") + (inPausa ? " pausa" : "");
  $("#btn-pausa").textContent = tr(inPausa ? "tav.riprendi" : "tav.pausa");
}

// ---------- Aprire il tavolo ----------

function apriTavolo(p, messaggio = "") {
  partita = p;
  vai("tavolo");
  $("#risultato-tiro").textContent = messaggio;
}

// Duello libero (dalla Home)
function avviaDuello(imp) {
  let primo = imp.primo;
  let msg = "";
  if (primo === "moneta") {
    primo = Math.random() < 0.5 ? 0 : 1;
    msg = tr("moneta.inizia", { nome: imp.nomi[primo] });
  }
  const p = creaPartita(imp.modalita, imp.nomi, imp.minuti, primo);
  if (p.timer.durataMs !== null) avviaTimer(p.timer, Date.now());
  app.duello = { partita: p, impostazioni: imp };
  app.matchAperto = null;
  apriTavolo(p, msg);
}

// ---------- Setup del duello ----------

function aggiornaOpzioniPrimo() {
  ["#nome0", "#nome1"].forEach((id, i) => {
    $(`#primo option[value="${i}"]`).textContent = $(id).value.trim() || tr("giocatore.n", { n: i + 1 });
  });
}

// Nomi nel setup del duello: null = nomi di base ("Giocatore 1", "Giocatore 2")
function impostaNomiSetup(nomi) {
  [0, 1].forEach((i) => {
    $(`#nome${i}`).value = nomi ? nomi[i] : tr("giocatore.n", { n: i + 1 });
  });
}

// Modalità e timer ripartono dall'ultima scelta; i nomi li decide chi apre il setup
// (dalla Home tornano quelli di base, da "Nuova partita" restano quelli del duello appena giocato)
function preparaSetupDuello() {
  const imp = app.duello && app.duello.impostazioni;
  if (imp) {
    const radio = $(`#mod-${imp.modalita}`);
    if (radio) radio.checked = true;
    $("#usa-timer").checked = imp.minuti !== null;
    if (imp.minuti !== null) $("#minuti").value = imp.minuti;
  }
  const p = app.duello && app.duello.partita;
  $("#nota-sostituisci").hidden = !(p && esitoDuelloLibero(p) === null);
  aggiornaSetup();
}

function aggiornaSetup() {
  const standard = $("#mod-standard").checked;
  $("#usa-timer-testo").textContent = tr(standard ? "sd.timer.standard" : "sd.timer.casual");
  $("#minuti").disabled = !$("#usa-timer").checked;
  $("#nota-setup").textContent = tr(standard ? "sd.nota.standard" : "sd.nota.casual");
  aggiornaOpzioniPrimo();
}

$$("input[name=modalita]").forEach((r) => r.addEventListener("change", () => {
  // Standard: timer acceso di base. Casual: spento di base.
  $("#usa-timer").checked = $("#mod-standard").checked;
  aggiornaSetup();
}));
$("#usa-timer").addEventListener("change", aggiornaSetup);

$("#setup").addEventListener("submit", (ev) => {
  ev.preventDefault();
  const nomi = [0, 1].map((i) => $(`#nome${i}`).value.trim() || tr("giocatore.n", { n: i + 1 }));
  const usaTimer = $("#usa-timer").checked;
  const minuti = parseInt($("#minuti").value, 10);
  if (usaTimer && (!minuti || minuti < 1)) {
    $("#minuti").focus();
    $("#nota-setup").textContent = tr("minuti.errore");
    return;
  }
  const p = $("#primo").value;
  avviaDuello({
    modalita: $("#mod-standard").checked ? "standard" : "casual",
    nomi,
    minuti: usaTimer ? Math.min(minuti, 180) : null,
    primo: p === "moneta" ? "moneta" : Number(p),
  });
});

// Le opzioni "Chi inizia" seguono i nomi scritti
["#nome0", "#nome1"].forEach((id) => $(id).addEventListener("input", aggiornaOpzioniPrimo));

// ---------- Pulsanti del tavolo ----------

$("#btn-fase").addEventListener("click", faseSuccessiva);
$("#btn-annulla").addEventListener("click", annullaConSuono);

function tiraMoneta() {
  if (!partitaInCorso()) return;
  $("#risultato-tiro").textContent = tr("tav.log.moneta", { esito: testoMoneta(lanciaMoneta(partita)) });
  SUONI.moneta();
  aggiorna();
}

function tiraDado() {
  if (!partitaInCorso()) return;
  $("#risultato-tiro").textContent = tr("tav.log.dado", { esito: lanciaDado(partita) });
  SUONI.dado();
  aggiorna();
}

$("#btn-moneta").addEventListener("click", tiraMoneta);
$("#btn-dado").addEventListener("click", tiraDado);

$("#form-entrambi").addEventListener("submit", (ev) => {
  ev.preventDefault();
  const input = $("#input-entrambi");
  const v = leggiValore(input.value);
  if (v === null) { input.classList.add("errore"); return; }
  input.classList.remove("errore");
  input.value = "";
  cambiaLPEntrambi(v);
});

$("#btn-pausa").addEventListener("click", () => {
  const t = partita.timer;
  if (t.avviatoAlle === null) avviaTimer(t, Date.now());
  else fermaTimer(t, Date.now());
  aggiorna();
});

$("#btn-esci").addEventListener("click", () => {
  vai(app.matchAperto ? "tabellone" : "home");
});

// Pulsanti nel riquadro dell'esito
$("#esito").addEventListener("click", (ev) => {
  const b = ev.target.closest("button[data-az]");
  if (!b) return;
  const az = b.dataset.az;
  if (az === "annulla") { annullaConSuono(); return; }
  if (az === "rigioca") { avviaDuello(app.duello.impostazioni); return; }
  if (az === "setup") {
    impostaNomiSetup(app.duello && app.duello.impostazioni ? app.duello.impostazioni.nomi : null);
    vai("setup-duello");
    return;
  }
  if (az === "tabellone") { vai("tabellone"); return; }
  if (az === "chiudi") {
    chiudiDuel(partita, Number(b.dataset.primo));
    if (partita.finita) {
      SUONI.fineDuel();
      if (app.matchAperto) registraDaPartita(app.torneo, app.matchAperto);
    } else {
      SUONI.turno();
    }
    azzeraDelta();
    $("#risultato-tiro").textContent = "";
    aggiorna();
  }
});

// ---------- Preparazione ----------

$$(".giocatore").forEach(costruisciGiocatore);
costruisciFasi();
posizionaTimer();
// Girando il telefono il tavolo passa da una versione all'altra
quandoCambiaSchermo(() => {
  posizionaTimer();
  chiudiMenuStrumenti();
});
