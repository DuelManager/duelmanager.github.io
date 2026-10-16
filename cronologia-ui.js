// =============================================================
// cronologia-ui.js — finestra Cronologia / Preferiti, stelle e
// registrazione automatica delle partite finite.
// =============================================================

const SVG_STELLA = `<svg viewBox="0 0 24 24" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`;

let schedaCronologia = "cronologia";   // "cronologia" | "preferiti"
let voceAperta = null;                  // id della voce mostrata nel dettaglio
let elencoPreferiti = [];               // preferiti mostrati: una stella tolta resta visibile finché non riapri
const cacheVoci = new Map();            // voci già mostrate, per poter rimettere una stella appena tolta

// ---------- Registrazione automatica ----------
// Controlla duello libero e torneo: se una partita è appena finita la aggiunge alla cronologia.
// Si può chiamare quante volte si vuole: ogni partita viene registrata una volta sola.
function sincronizzaCronologia() {
  const ora = Date.now();
  const p = app.duello && app.duello.partita;
  if (p) {
    if (p.modalita === "standard") {
      if (p.finita && !p.idCronologia) {
        const v = voceMatch(p, ora);
        aggiungiVoce(app.cronologia, v);
        p.idCronologia = v.id;
      }
    } else {
      const duel = p.duel;
      if (duel.esito !== null && !duel.idCronologia) {
        const v = voceDuelCasual(p, ora);
        aggiungiVoce(app.cronologia, v);
        duel.idCronologia = v.id;
      } else if (duel.esito === null && duel.idCronologia) {
        // "Annulla" dopo la fine del duel: il duel riprende, la voce sparisce
        togliVoce(app.cronologia, duel.idCronologia);
        togliVoce(app.preferiti, duel.idCronologia);
        delete duel.idCronologia;
      }
    }
  }
  const t = app.torneo;
  if (t && t.concluso && !t.idCronologia) {
    const v = voceTorneo(t, ora);
    aggiungiVoce(app.cronologia, v);
    t.idCronologia = v.id;
  }
}

// ---------- Stelle ----------

function trovaVoce(id) {
  if (!id) return null;
  return app.cronologia.find((v) => v.id === id) || app.preferiti.find((v) => v.id === id) || cacheVoci.get(id) || null;
}

function ePreferito(id) {
  return app.preferiti.some((v) => v.id === id);
}

// conTesto: stella con scritta (fine duello, fine torneo, dettaglio); senza: solo icona (elenchi)
function bottoneStella(id, conTesto) {
  if (!trovaVoce(id)) return "";
  return `<button type="button" class="stella ${conTesto ? "con-testo" : ""}" data-stella="${id}" aria-pressed="false">${SVG_STELLA}${conTesto ? `<span class="stella-testo"></span>` : ""}</button>`;
}

// Allinea tutte le stelle sulla pagina allo stato dei preferiti
function aggiornaStelle() {
  $$("[data-stella]").forEach((b) => {
    const attivo = ePreferito(b.dataset.stella);
    const etichetta = tr(attivo ? "pref.togli" : "pref.salva");
    b.setAttribute("aria-pressed", String(attivo));
    b.setAttribute("aria-label", etichetta);
    b.title = etichetta;
    const testo = $(".stella-testo", b);
    if (testo) testo.textContent = tr(attivo ? "pref.salvato" : "pref.salva");
  });
}

function cambiaPreferito(id) {
  const voce = trovaVoce(id);
  if (!voce) return;
  const attivo = !ePreferito(id);
  impostaPreferito(app.preferiti, voce, attivo);
  if (attivo) SUONI.guadagno(); else SUONI.annulla();
  salva();
  aggiornaStelle();
}

document.addEventListener("click", (ev) => {
  const b = ev.target.closest("[data-stella]");
  if (b) cambiaPreferito(b.dataset.stella);
});

// ---------- Testi delle voci ----------

function formatData(ms) {
  try {
    return new Intl.DateTimeFormat(lingua() === "it" ? "it-IT" : "en-GB", {
      day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
    }).format(new Date(ms));
  } catch (e) {
    return new Date(ms).toLocaleString();
  }
}

function tagData(ms) {
  return `<time datetime="${new Date(ms).toISOString()}">${formatData(ms)}</time>`;
}

// Etichetta, titolo e riga sotto di una voce (testo già sicuro per l'HTML)
function sintesiVoce(v) {
  if (v.tipo === "torneo") {
    const t = v.torneo;
    let titolo;
    if (t.formato === "eliminazione") {
      titolo = t.campione !== null
        ? tr("home.campione", { nome: esc(nomeGiocatore(t, t.campione)) })
        : tr("home.senzavincitore");
    } else {
      const primi = classifica(t).filter((r) => r.pos === 1).map((r) => esc(r.nome));
      titolo = tr("home.primo", { nome: primi.join(", ") });
    }
    return {
      etichetta: `${tr("cr.torneo")} · ${tr(t.formato === "eliminazione" ? "st.elim" : "st.punti")} · ${t.tipo === "standard" ? "Standard" : "Casual"}`,
      titolo,
      sotto: tr("tab.giocatori", { n: t.giocatori.length }),
    };
  }

  const [A, B] = v.giocatori.map(esc);
  const etichetta = `${tr("cr.duello")} · ${v.modalita === "standard" ? "Standard" : "Casual"}`;
  if (v.risultato === 0 || v.risultato === 1) {
    const vincitore = v.risultato === 0 ? A : B;
    const perdente = v.risultato === 0 ? B : A;
    const titolo = v.punteggio
      ? tr("cr.vince.punti", { nome: vincitore, a: Math.max(...v.punteggio), b: Math.min(...v.punteggio) })
      : tr("cr.vince", { nome: vincitore });
    return { etichetta, titolo, sotto: tr("cr.contro", { nome: perdente }) };
  }
  const titolo = tr(v.risultato === "pareggio" ? "cr.pareggio" : "cr.doppia");
  const punti = v.punteggio ? ` · ${v.punteggio[0]}–${v.punteggio[1]}` : "";
  return { etichetta, titolo, sotto: tr("cr.tra", { a: A, b: B }) + punti };
}

// ---------- Finestra ----------

function apriCronologia(scheda) {
  sincronizzaCronologia();
  schedaCronologia = scheda;
  voceAperta = null;
  elencoPreferiti = app.preferiti.slice();
  disegnaCronologia();
  apriDialogo($("#dialogo-cronologia"));
}

function disegnaCronologia() {
  $$("#dialogo-cronologia [data-scheda]").forEach((b) => {
    b.setAttribute("aria-selected", String(b.dataset.scheda === schedaCronologia));
  });
  const corpo = $("#cronologia-corpo");

  if (voceAperta) {
    const v = trovaVoce(voceAperta);
    if (v) {
      corpo.innerHTML = dettaglioVoce(v);
      aggiornaStelle();
      return;
    }
    voceAperta = null;
  }

  const lista = schedaCronologia === "cronologia" ? app.cronologia : elencoPreferiti;
  lista.forEach((v) => cacheVoci.set(v.id, v));
  if (lista.length === 0) {
    corpo.innerHTML = `<p class="vuoto-cronologia">${tr(schedaCronologia === "cronologia" ? "cr.vuota" : "pref.vuota")}</p>`;
    return;
  }
  const intro = schedaCronologia === "cronologia"
    ? tr("cr.intro", { max: MAX_CRONOLOGIA })
    : tr("pref.intro");
  corpo.innerHTML = `
    <p class="nota">${intro}</p>
    <ul class="lista-partite">${lista.map(rigaVoce).join("")}</ul>`;
  aggiornaStelle();
}

function rigaVoce(v) {
  const s = sintesiVoce(v);
  return `<li class="voce">
    ${bottoneStella(v.id, false)}
    <button type="button" class="voce-apri" data-apri="${v.id}">
      <span class="voce-testa"><span class="label">${s.etichetta}</span>${tagData(v.terminato)}</span>
      <span class="voce-titolo">${s.titolo}</span>
      <span class="voce-sotto">${s.sotto}</span>
    </button>
  </li>`;
}

// ---------- Dettaglio ----------

function dettaglioVoce(v) {
  const s = sintesiVoce(v);
  const indietro = tr(schedaCronologia === "cronologia" ? "cr.indietro" : "pref.indietro");
  return `
    <div class="dettaglio-testa">
      <button type="button" class="indietro" data-indietro>${indietro}</button>
      ${bottoneStella(v.id, true)}
    </div>
    <div class="dettaglio-titolo">
      <div class="meta"><span class="label">${s.etichetta}</span>${tagData(v.terminato)}</div>
      <h3>${s.titolo}</h3>
      <p>${s.sotto}</p>
    </div>
    ${v.tipo === "duello" ? dettaglioDuello(v) : dettaglioTorneo(v)}`;
}

// Registro dei life point: per ogni duel, in ordine di gioco
function dettaglioDuello(v) {
  const unico = v.duel.length === 1;
  return v.duel.map((d, i) => {
    let esito;
    if (d.esito === 0 || d.esito === 1) esito = tr("cr.duel.vince", { nome: esc(v.giocatori[d.esito]) });
    else if (d.esito === "pareggio") esito = tr("cr.duel.pareggio");
    else esito = tr("cr.duel.interrotto");
    const titolo = unico ? tr("cr.registro") : `${tr("tav.duel", { n: i + 1 })} <span class="nota">· ${esito}</span>`;
    const righe = righeRegistro(d.eventi, v.giocatori);
    return `<section class="registro">
      <h4>${titolo}</h4>
      ${righe.length ? `<ol class="log">${righe.join("")}</ol>` : `<p class="nota">${tr("cr.nessunevento")}</p>`}
    </section>`;
  }).join("");
}

// Classifica (a punti) oppure piazzamenti e risultati (eliminazione diretta)
function dettaglioTorneo(v) {
  const t = v.torneo;
  if (t.formato === "punti") {
    return `<section class="registro"><h4>${tr("tab.classfinale")}</h4>${tabellaClassifica(t)}</section>`;
  }
  const pz = piazzamenti(t).map((p) => {
    const nota = p.turnoEliminato === null
      ? (p.pos === 1 ? tr("cr.campione") : "")
      : tr("cr.eliminato", { turno: nomeTurno(t, p.turnoEliminato) });
    return `<li class="${p.pos === 1 ? "oro" : ""}">
      <span class="pos">${p.pos}°</span><span class="chi">${esc(p.nome)}</span><span class="nota">${nota}</span>
    </li>`;
  }).join("");
  const risultati = t.turni.map((turno, r) => {
    const righe = turno.partite.map((m) => rigaRisultato(t, m)).join("");
    return `<div class="risultati-turno"><span class="label">${nomeTurno(t, r)}</span><ul>${righe}</ul></div>`;
  }).reverse().join("");
  return `
    <section class="registro"><h4>${tr("cr.piazzamenti")}</h4><ol class="piazzamenti">${pz}</ol></section>
    <section class="registro"><h4>${tr("cr.risultati")}</h4>${risultati}</section>`;
}

function rigaRisultato(t, m) {
  if (m.esito === "vuota") return "";
  if (m.esito === "bye") return `<li>${tr("cr.r.bye", { nome: esc(nomeGiocatore(t, m.vincitore)) })}</li>`;
  const A = esc(nomeGiocatore(t, m.a));
  const B = esc(nomeGiocatore(t, m.b));
  if (m.esito === "doppia sconfitta") return `<li>${tr("cr.r.doppia", { a: A, b: B })}</li>`;
  const perdente = m.vincitore === m.a ? B : A;
  return `<li>${tr("cr.r.vince", { v: esc(nomeGiocatore(t, m.vincitore)), p: perdente, punti: punteggioTesto(m.punteggio) })}</li>`;
}

// ---------- Eventi della finestra ----------

$("#dialogo-cronologia").addEventListener("click", (ev) => {
  const scheda = ev.target.closest("[data-scheda]");
  if (scheda) {
    schedaCronologia = scheda.dataset.scheda;
    voceAperta = null;
    if (schedaCronologia === "preferiti") elencoPreferiti = app.preferiti.slice();
    disegnaCronologia();
    return;
  }
  const apri = ev.target.closest("[data-apri]");
  if (apri) {
    voceAperta = apri.dataset.apri;
    disegnaCronologia();
    $("#dialogo-cronologia").scrollTop = 0;
    return;
  }
  if (ev.target.closest("[data-indietro]")) {
    voceAperta = null;
    if (schedaCronologia === "preferiti") elencoPreferiti = app.preferiti.slice();
    disegnaCronologia();
  }
});

$("#apri-cronologia").addEventListener("click", () => apriCronologia("cronologia"));
$("#apri-preferiti").addEventListener("click", () => apriCronologia("preferiti"));
