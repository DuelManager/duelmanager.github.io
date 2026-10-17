// =============================================================
// app.js — navigazione tra le schermate, Home, regole e impostazioni,
// timer di sottofondo, tastiera e avvio. Va caricato per ultimo.
// =============================================================

const SCHERMATE = {
  "home": "#home",
  "setup-duello": "#setup",
  "setup-torneo": "#setup-torneo",
  "setup-giocatori": "#setup-giocatori",
  "caricamento": "#caricamento",
  "tabellone": "#tabellone",
  "tavolo": "#tavolo",
};

// Schermate pensate per il telefono in orizzontale
const SCHERMATE_ORIZZONTALI = ["tavolo", "setup-giocatori", "caricamento", "tabellone"];

function mostraSoloElemento(nomeSchermata) {
  for (const [k, sel] of Object.entries(SCHERMATE)) $(sel).hidden = k !== nomeSchermata;
  document.documentElement.dataset.schermata = nomeSchermata;   // serve al CSS ("Gira il telefono")
  $("#schermo").scrollTop = 0;
  window.scrollTo(0, 0);
}

// ---------- Finestre (regole, impostazioni, pannello del match, life point) ----------
// Con una finestra aperta la pagina sotto non si tocca e non scorre: scorre solo la finestra.

function aggiornaBloccoPagina() {
  document.documentElement.classList.toggle("con-finestra", $$("dialog").some((d) => d.open));
}

function apriDialogo(d) {
  if (d.open) return;
  if (typeof d.showModal === "function") d.showModal();
  else d.setAttribute("open", "");
  // L'attenzione va alla finestra, non al suo primo pulsante (che si vedrebbe evidenziato)
  d.tabIndex = -1;
  d.focus({ preventScroll: true });
  const corpo = $(".finestra-corpo", d);
  if (corpo) corpo.scrollTop = 0;
  aggiornaBloccoPagina();
}

function chiudiDialogo(d) {
  if (!d.open) return;
  if (typeof d.close === "function") d.close();
  else d.removeAttribute("open");
  aggiornaBloccoPagina();
}

function chiudiTutteLeFinestre() {
  $$("dialog").forEach(chiudiDialogo);
  chiudiMenuStrumenti();
  pannelloId = null;
}

$$("dialog").forEach((d) => {
  // Tocco sullo sfondo scuro: chiude la finestra
  d.addEventListener("click", (ev) => {
    if (ev.target === d) chiudiDialogo(d);
  });
  // Chiusa anche con Esc o dal browser
  d.addEventListener("close", aggiornaBloccoPagina);
});

// ---------- Orientamento ----------
// Su Android (app installata) il tavolo e il torneo si girano da soli in orizzontale.
// Sull'iPhone non si può: in verticale compare l'invito a girare il telefono.

function telefonoTouch() {
  return window.matchMedia("(pointer: coarse)").matches && Math.min(screen.width, screen.height) <= 600;
}

function orientaSchermo(s) {
  try {
    const o = screen.orientation;
    if (!o || !telefonoTouch()) return;
    if (SCHERMATE_ORIZZONTALI.includes(s)) {
      if (o.lock) o.lock("landscape").catch(() => {});
    } else if (o.unlock) {
      o.unlock();
    }
  } catch (e) { /* non supportato: nessun problema */ }
}

$("#ruota-continua").addEventListener("click", () => {
  document.documentElement.classList.add("verticale-ok");
});
document.addEventListener("click", (ev) => {
  const b = ev.target.closest("[data-chiudi]");
  if (b) chiudiDialogo(b.closest("dialog"));
});

// ---------- Navigazione ----------

// Cambia schermata e ridisegna quella nuova
function vai(s) {
  chiudiTutteLeFinestre();
  if (s !== "tavolo") {
    app.matchAperto = null;
    partita = null;
    rilasciaSchermo();
  }
  app.schermata = s;
  mostraSoloElemento(s);
  disegnaSchermata();
  if (s === "tavolo") {
    azzeraDelta();
    tieniSchermoAcceso();
  }
  orientaSchermo(s);
  salva();
}

// Ridisegna la schermata aperta (dopo un cambio di lingua o di dati)
function disegnaSchermata() {
  sincronizzaCronologia();
  const s = app.schermata;
  if (s === "home") disegnaHome();
  else if (s === "setup-duello") preparaSetupDuello();
  else if (s === "setup-torneo") preparaSetupTorneo();
  else if (s === "setup-giocatori") preparaSetupGiocatori();
  else if (s === "tabellone") disegnaTabellone();
  else if (s === "tavolo") disegnaTavolo();
}

// Qualsiasi pulsante con data-vai="schermata"
document.addEventListener("click", (ev) => {
  const b = ev.target.closest("[data-vai]");
  if (b) vai(b.dataset.vai);
});

// ---------- Home ----------

function disegnaHome() {
  const d = app.duello && app.duello.partita;
  if (d) {
    const esito = esitoDuelloLibero(d);   // nel Casual conta anche un duel finito senza "Rivincita"
    const finito = esito !== null;
    let dettaglio;
    if (!finito) {
      dettaglio = `${esc(d.giocatori[0].nome)} ${lp(d.duel, 0)} · ${esc(d.giocatori[1].nome)} ${lp(d.duel, 1)}`;
    } else if (esito === "doppia sconfitta") {
      dettaglio = tr("home.doppia");
    } else if (esito === "pareggio") {
      dettaglio = tr("cr.pareggio");
    } else {
      dettaglio = tr("home.havinto", { nome: esc(d.giocatori[esito].nome) });
    }
    // In corso: riquadro con il bordo arancione e il pallino, come le partite in corso nel tabellone
    $("#azioni-duello").innerHTML = `
      <div class="in-corso-info ${finito ? "" : "attiva"}">
        <span class="label">${tr(finito ? "home.duello.ultimo" : "home.duello.incorso")}</span>
        <span class="dett">${dettaglio}</span>
      </div>
      <button type="button" class="btn btn-primario" data-home="riprendi-duello">${tr(finito ? "home.vedi" : "home.riprendi.duello")}</button>
      <button type="button" class="btn" data-home="nuovo-duello">${tr("home.nuovo.duello")}</button>`;
  } else {
    $("#azioni-duello").innerHTML =
      `<button type="button" class="btn btn-primario btn-grande" data-home="nuovo-duello">${tr("home.nuovo.duello")}</button>`;
  }

  const t = app.torneo;
  if (t) {
    let dettaglio;
    if (t.concluso) {
      if (t.formato === "eliminazione") {
        dettaglio = t.campione !== null
          ? tr("home.campione", { nome: esc(nomeGiocatore(t, t.campione)) })
          : tr("home.senzavincitore");
      } else {
        dettaglio = tr("home.primo", { nome: esc(classifica(t)[0].nome) });
      }
    } else {
      const turno = t.turni[t.turnoCorrente];
      const reali = turno.partite.filter(matchReale);
      const fatte = reali.filter((m) => m.stato === "conclusa").length;
      const nomeT = t.formato === "punti"
        ? tr("tab.turnodi", { n: t.turnoCorrente + 1, tot: t.numeroTurni })
        : nomeTurno(t, t.turnoCorrente);
      dettaglio = tr("home.concluse", { turno: esc(nomeT), fatte, tot: reali.length });
    }
    $("#azioni-torneo").innerHTML = `
      <div class="in-corso-info ${t.concluso ? "" : "attiva"}">
        <span class="label">${tr(t.concluso ? "home.torneo.ultimo" : "home.torneo.incorso")}</span>
        <span class="dett">${dettaglio}</span>
      </div>
      <button type="button" class="btn btn-primario" data-vai="tabellone">${tr(t.concluso ? "home.vedi" : "home.riprendi.torneo")}</button>
      <button type="button" class="btn" data-home="nuovo-torneo">${tr("home.nuovo.torneo")}</button>`;
  } else {
    $("#azioni-torneo").innerHTML =
      `<button type="button" class="btn btn-primario btn-grande" data-home="nuovo-torneo">${tr("home.nuovo.torneo")}</button>`;
  }
}

$("#home").addEventListener("click", (ev) => {
  const b = ev.target.closest("[data-home]");
  if (!b) return;
  const azione = b.dataset.home;
  if (azione === "riprendi-duello" && app.duello) {
    app.matchAperto = null;
    apriTavolo(app.duello.partita);
  } else if (azione === "nuovo-duello") {
    // Una partita nuova dalla Home riparte con i nomi di base
    impostaNomiSetup(null);
    vai("setup-duello");
  } else if (azione === "nuovo-torneo") {
    bozza().nomi = [];
    vai("setup-torneo");
  }
});

// ---------- Regole e impostazioni ----------

$("#apri-regole").addEventListener("click", () => {
  $("#regole-corpo").scrollTop = 0;
  apriDialogo($("#dialogo-regole"));
});

$("#apri-impostazioni").addEventListener("click", () => {
  $(`#lingua-${lingua()}`).checked = true;
  aggiornaBottoniSuono();
  apriDialogo($("#dialogo-impostazioni"));
});

$$("input[name=lingua]").forEach((r) => r.addEventListener("change", () => {
  app.lingua = r.value;
  applicaLingua();
  disegnaSchermata();
  salva();
}));

// ---------- Timer di sottofondo ----------
// Controlla tutte le partite con il tempo che scorre, anche quelle non mostrate:
// i match del torneo vanno avanti sui loro tavoli mentre sullo schermo c'è altro.

function partiteAttive() {
  const lista = [];
  if (app.duello && app.duello.partita && !app.duello.partita.finita) {
    lista.push({ p: app.duello.partita, match: null });
  }
  if (app.torneo) {
    for (const m of matchInCorso(app.torneo)) {
      if (m.partita && !m.partita.finita) lista.push({ p: m.partita, match: m });
    }
  }
  return lista;
}

function ridisegnaSchermata() {
  disegnaSchermata();
  if (app.schermata === "tabellone" && pannelloId) disegnaPannello();
  salva();
}

setInterval(() => {
  const ora = Date.now();
  let cambiato = false;
  for (const { p, match } of partiteAttive()) {
    const resto = tempoRimanente(p.timer, ora);
    if (resto !== null && p.timer.avviatoAlle !== null && !p.avvisoDato && resto > 0 && resto <= AVVISO_MS) {
      p.avvisoDato = true;
      SUONI.avviso();
      if (p !== partita) avvisa(tr("toast.5min", { chi: match ? descriviMatch(app.torneo, match) : tr("duello") }));
      cambiato = true;
    }
    const eraFinita = p.finita;
    controllaTempo(p, ora);
    if (!eraFinita && p.finita) {
      SUONI.scaduto();
      if (match) registraDaPartita(app.torneo, match.id);
      if (p !== partita) {
        avvisa(match ? tr("toast.scadutoIn", { chi: descriviMatch(app.torneo, match) }) : tr("toast.scaduto"));
      }
      cambiato = true;
    }
  }
  if (cambiato) {
    ridisegnaSchermata();
  } else if (app.schermata === "tavolo") {
    disegnaTimer();
  } else if (app.schermata === "tabellone") {
    aggiornaOrologiTabellone();
  }
}, 250);

// ---------- Tastiera (solo sul tavolo) ----------

document.addEventListener("keydown", (ev) => {
  if (app.schermata !== "tavolo" || !partita || $("dialog[open]")) return;
  const t = ev.target;
  if (t.matches("input, select, textarea")) {
    if (ev.key === "Escape") t.blur();
    return;
  }
  if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
  const k = ev.key.toLowerCase();
  if (k === " " || k === "n") {
    ev.preventDefault();
    faseSuccessiva();
  } else if (k === "z") {
    annullaConSuono();
  } else if (k === "p" && partita.timer.durataMs !== null && !partita.finita) {
    $("#btn-pausa").click();
  } else if (k === "1" || k === "2") {
    const g = Number(k) - 1;
    const input = $(`#input-lp-${g}`);
    if (!input.disabled) {
      ev.preventDefault();
      // Sul telefono (o finestra stretta) il campo è nascosto: si apre il tastierino
      if (compatto()) apriEditorLP(g);
      else input.focus();
    }
  }
});

// ---------- Apertura (solo telefoni) ----------
// La schermata con logo e nome al neon è già visibile dal CSS: qui la si chiude
// dopo poco (o subito toccandola). Sul computer il CSS non la mostra e si passa oltre.

function avviaApertura() {
  const schermata = $("#apertura");
  const radice = document.documentElement;
  if (getComputedStyle(schermata).display === "none") {
    radice.classList.add("app-aperta");
    return;
  }
  const ridotto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let chiusa = false;
  const chiudi = () => {
    if (chiusa) return;
    chiusa = true;
    schermata.classList.add("chiude");                       // sfuma
    setTimeout(() => radice.classList.add("app-aperta"), ridotto ? 0 : 400);
  };
  setTimeout(chiudi, ridotto ? 800 : 1600);
  schermata.addEventListener("click", chiudi);
}

// ---------- Avvio ----------

(function avvio() {
  const salvato = carica();
  if (salvato) app = salvato;
  if (!LINGUE.includes(app.lingua)) app.lingua = linguaPredefinita();
  applicaLingua();

  // Non far suonare avvisi dei 5 minuti già passati
  for (const { p } of partiteAttive()) {
    const r = tempoRimanente(p.timer, Date.now());
    if (r !== null && r <= AVVISO_MS) p.avvisoDato = true;
  }

  // All'apertura si parte sempre dalla Home: un duello o un torneo lasciati a metà
  // si riprendono da lì con "Riprendi"
  vai("home");
  avviaApertura();
})();
