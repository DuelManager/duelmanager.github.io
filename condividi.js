// =============================================================
// condividi.js — immagine e PDF del risultato di un duello o di un torneo.
// Si parte sempre da una voce della cronologia (vedi cronologia.js): così
// funziona alla fine della partita e anche per quelle già giocate.
// Tutto è disegnato qui con il canvas, senza librerie e senza internet:
//  - immagine scura, larga 1080 px: il riepilogo da mandare su WhatsApp o sui social;
//  - PDF chiaro su fogli A4: tutti i dettagli, da stampare o archiviare.
// =============================================================

const SITO_APP = "duelmanager.github.io";
const CARATTERE_NUM = '"Barlow Condensed", "Arial Narrow", "Roboto Condensed", sans-serif';
const CARATTERE_TESTO = '"Barlow", "Segoe UI", system-ui, sans-serif';
const SVG_CONDIVIDI = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15V3.5M7.5 8 12 3.5 16.5 8M5 12.5V19a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const IOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

// ---------- Testi (senza HTML: qui si disegna, non si scrive nella pagina) ----------

const testoPuro = (x) => String(x);

function maiuscola(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function testoEsitoDuel(v, d) {
  if (d.esito === 0 || d.esito === 1) return tr("cr.duel.vince", { nome: v.giocatori[d.esito] });
  if (d.esito === "pareggio") return tr("cr.duel.pareggio");
  return tr("cr.duel.interrotto");
}

// Eventi di un duel in ordine di gioco, con i life point dopo ogni cambio
function eventiDuel(d) {
  const totali = [LP_INIZIALI, LP_INIZIALI];
  return d.eventi.map((e) => {
    const quando = `T${e.turno} · ${SIGLE_FASI[FASI.indexOf(e.fase)] || e.fase}`;
    if (e.tipo === "lp") {
      const celle = [0, 1].map((g) => {
        const diff = e.variazioni[g];
        if (!diff) return null;
        totali[g] = Math.max(0, totali[g] + diff);
        return { diff, totale: totali[g] };
      });
      return { quando, celle, lp: totali.slice() };
    }
    const testo = e.tipo === "moneta"
      ? tr("tav.log.moneta", { esito: testoMoneta(e.esito) })
      : tr("tav.log.dado", { esito: e.esito });
    return { quando, testo };
  });
}

function turniTaglio(t) {
  return t.turni.filter((tu) => tu.fase === "taglio").length;
}

function infoTorneo(t) {
  const parti = [nomeFormato(t.formato), t.tipo === "standard" ? "Standard" : "Casual", tr("tab.giocatori", { n: t.giocatori.length })];
  if (t.formato === "svizzero") {
    const k = turniTaglio(t) ? 2 ** turniTaglio(t) : 0;
    parti.push(tr("cd.turni", { n: t.turniSvizzeri }) + (k ? ` + ${tr("sv.top", { k })}` : ""));
  } else {
    parti.push(tr("cd.turni", { n: t.turni.length }));
  }
  parti.push(t.minuti ? tr("cd.minuti", { n: t.minuti }) : tr("cd.senzatempo"));
  return parti;
}

// Il riquadro del vincitore: etichetta, nome e una riga sotto
function vincitoreTorneo(t) {
  const conFinale = t.formato === "eliminazione" || (t.formato === "svizzero" && turniTaglio(t) > 0);
  if (conFinale) {
    if (t.campione === null) return { etichetta: tr("tab.concluso"), nome: tr("tab.nessuno"), riga: tr("tab.finalesenza"), nessuno: true };
    const finale = t.turni[t.turni.length - 1].partite[0];
    let riga;
    if (finale.esito === "bye") {
      riga = tr("tab.finalebye");
    } else {
      const perdente = finale.vincitore === finale.a ? finale.b : finale.a;
      riga = tr("tab.finale", {
        v: nomeGiocatore(t, finale.vincitore), p: nomeGiocatore(t, perdente), punti: punteggioTesto(finale.punteggio),
      });
    }
    return { etichetta: tr("tab.campione"), nome: nomeGiocatore(t, t.campione), riga };
  }
  if (t.formato === "svizzero") {
    const c = classificaSvizzera(t);
    const r = c.find((x) => x.id === t.campione) || c[0];
    return { etichetta: tr("tab.campione"), nome: r.nome, riga: tr("cd.bilancio", { v: r.vinte, p: r.perse }) };
  }
  const primi = classifica(t).filter((r) => r.pos === 1);
  return {
    etichetta: tr(primi.length > 1 ? "cd.primi" : "cd.primo"),
    nome: primi.map((r) => r.nome).join(", "),
    riga: tr(primi[0].vinte === 1 ? "tab.vittoria1" : "tab.vittorieN", { n: primi[0].vinte }),
  };
}

// Classifica finale per tutti i formati.
// nota: per l'immagine (una colonna); breve: per l'immagine su due colonne; colonne: per il PDF
function classificaFinale(t) {
  if (t.formato === "punti") {
    return classifica(t).map((r) => ({
      pos: r.pos, nome: r.nome, ritirato: false,
      nota: tr("cd.bilancio", { v: r.vinte, p: r.perse }), breve: `${r.vinte}–${r.perse}`,
      colonne: [r.vinte, r.perse, `${r.duelVinti}–${r.duelPersi}`, r.giocate],
    }));
  }
  const sv = t.formato === "svizzero" ? new Map(classificaSvizzera(t).map((r) => [r.id, r])) : null;
  return piazzamenti(t).map((p) => {
    const s = sv && sv.get(p.id);
    const campione = p.pos === 1 && p.id === t.campione;
    const turno = p.turnoEliminato !== null ? nomeTurno(t, p.turnoEliminato) : "";
    let nota, breve, esteso;
    if (campione) {
      nota = breve = esteso = tr("cr.campione");
    } else if (turno) {
      nota = turno;
      esteso = tr("cr.eliminato", { turno });
      breve = s ? `${s.vinte}–${s.perse}` : "";
    } else {
      nota = breve = s ? `${s.vinte}–${s.perse}` : "";
      esteso = "";
    }
    if (s && s.ritirato) {
      nota = `${nota} · ${tr("sv.ritirato")}`;
      breve = `${breve} · ${tr("sv.ritirato")}`;
      esteso = esteso ? `${esteso} · ${tr("sv.ritirato")}` : maiuscola(tr("sv.ritirato"));
    }
    return {
      pos: p.pos, nome: p.nome, ritirato: !!(s && s.ritirato), nota, breve,
      colonne: s ? [s.vinte, s.perse, percentuale(s.omw), percentuale(s.oomw), esteso] : [esteso],
    };
  });
}

function dataFile(ms) {
  const d = new Date(ms);
  const due = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${due(d.getMonth() + 1)}-${due(d.getDate())}`;
}

function perFile(s) {
  return String(s).normalize("NFKD").replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 32) || "x";
}

function nomeFile(v, estensione) {
  const cosa = v.tipo === "torneo"
    ? `${perFile(tr("cr.torneo"))}-${perFile(nomeFormato(v.torneo.formato))}`
    : `${perFile(v.giocatori[0])}-vs-${perFile(v.giocatori[1])}`;
  return `DuelManager_${cosa}_${dataFile(v.terminato)}.${estensione}`;
}

function titoloDocumento(v) {
  const cosa = v.tipo === "torneo"
    ? `${tr("cr.torneo")} ${nomeFormato(v.torneo.formato)}`
    : `${v.giocatori[0]} vs ${v.giocatori[1]}`;
  return `DuelManager · ${cosa} · ${formatData(v.terminato)}`;
}

// Tutto il testo che verrà disegnato (serve a caricare i caratteri giusti)
function testoVoce(v) {
  const nomi = v.tipo === "torneo" ? v.torneo.giocatori.map((g) => g.nome) : v.giocatori;
  return "DuelManager 0123456789–·%°…" + nomi.join("");
}

// ---------- Strumenti di disegno ----------

function carattere(peso, px, numeri = true) {
  return `${peso} ${px}px ${numeri ? CARATTERE_NUM : CARATTERE_TESTO}`;
}

// Taglia con "…" se il testo non entra
function taglia(ctx, testo, max) {
  testo = String(testo);
  if (ctx.measureText(testo).width <= max) return testo;
  const lettere = Array.from(testo);
  while (lettere.length > 1 && ctx.measureText(lettere.join("") + "…").width > max) lettere.pop();
  return lettere.join("").trimEnd() + "…";
}

// Rimpicciolisce il carattere fino a "min"; se non basta taglia. Ritorna la dimensione usata.
function scriviAdattato(ctx, testo, x, y, max, peso, px, min, numeri = true) {
  let dim = px;
  ctx.font = carattere(peso, dim, numeri);
  while (dim > min && ctx.measureText(testo).width > max) {
    dim = Math.max(min, dim - Math.max(1, px / 24));
    ctx.font = carattere(peso, dim, numeri);
  }
  ctx.fillText(taglia(ctx, testo, max), x, y);
  return dim;
}

// A capo sulle parole (il carattere va impostato prima)
function aCapo(ctx, testo, max) {
  const righe = [];
  let riga = "";
  for (const parola of String(testo).split(/\s+/)) {
    const prova = riga ? `${riga} ${parola}` : parola;
    if (riga && ctx.measureText(prova).width > max) {
      righe.push(riga);
      riga = parola;
    } else {
      riga = prova;
    }
  }
  if (riga) righe.push(riga);
  return righe.map((r) => taglia(ctx, r, max));
}

function rettangoloTondo(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function riquadro(ctx, x, y, w, h, r, fondo, bordo, spessore = 2) {
  rettangoloTondo(ctx, x, y, w, h, r);
  if (fondo) { ctx.fillStyle = fondo; ctx.fill(); }
  if (bordo) { ctx.strokeStyle = bordo; ctx.lineWidth = spessore; ctx.stroke(); }
}

function stella(ctx, cx, cy, raggio, colore) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? raggio * 0.42 : raggio;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    ctx.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a));
  }
  ctx.closePath();
  ctx.fillStyle = colore;
  ctx.fill();
}

// Testo in maiuscolo con le lettere un po' distanziate (dove il browser lo permette)
function scriviSpaziato(ctx, testo, x, y, spazio) {
  ctx.save();
  if ("letterSpacing" in ctx) ctx.letterSpacing = `${spazio}px`;
  ctx.fillText(String(testo).toLocaleUpperCase(), x, y);
  ctx.restore();
}

// Numeri "A – B" allineati a destra, ognuno con il colore del suo giocatore
function scriviCoppiaDestra(ctx, a, b, xDestra, y, coloreA, coloreB, coloreTrattino) {
  const sep = " – ";
  ctx.textAlign = "left";
  const wa = ctx.measureText(String(a)).width;
  const ws = ctx.measureText(sep).width;
  const wb = ctx.measureText(String(b)).width;
  let x = xDestra - wa - ws - wb;
  ctx.fillStyle = coloreA; ctx.fillText(String(a), x, y); x += wa;
  ctx.fillStyle = coloreTrattino; ctx.fillText(sep, x, y); x += ws;
  ctx.fillStyle = coloreB; ctx.fillText(String(b), x, y);
}

// "DuelManager": Duel blu e Manager magenta, inclinato come nell'apertura.
// neon: contorno chiaro con la luce intorno (sfondo scuro); senza: lettere piene (carta bianca)
function scriviNomeApp(ctx, x, y, px, neon) {
  ctx.save();
  ctx.translate(x, y);
  ctx.transform(1, 0, -Math.tan((8 * Math.PI) / 180), 1, 0, 0);
  ctx.font = carattere(700, px);
  ctx.textAlign = "left";
  const wDuel = ctx.measureText("Duel").width;
  const parti = neon
    ? [["Duel", 0, "#d9edff", "#3d9bff"], ["Manager", wDuel, "#ffdcec", "#ff3d93"]]
    : [["Duel", 0, "#1d6aab"], ["Manager", wDuel, "#a92d65"]];
  for (const [testo, dx, tubo, luce] of parti) {
    if (neon) {
      ctx.lineJoin = "round";
      ctx.strokeStyle = tubo;
      for (const [sfocatura, spessore] of [[px * 0.42, px * 0.05], [px * 0.16, px * 0.045], [px * 0.04, px * 0.03]]) {
        ctx.shadowColor = luce;
        ctx.shadowBlur = sfocatura;
        ctx.lineWidth = spessore;
        ctx.strokeText(testo, dx, 0);
      }
    } else {
      ctx.fillStyle = tubo;
      ctx.fillText(testo, dx, 0);
    }
  }
  ctx.restore();
  ctx.font = carattere(700, px);
  return ctx.measureText("DuelManager").width;
}

// ---------- Risorse: caratteri e logo ----------

function attesa(ms) {
  return new Promise((ok) => setTimeout(ok, ms));
}

async function caricaCaratteri(testo) {
  if (!document.fonts || !document.fonts.load) return;
  const facce = ["500 20px \"Barlow Condensed\"", "600 20px \"Barlow Condensed\"", "700 20px \"Barlow Condensed\"",
    "400 20px \"Barlow\"", "500 20px \"Barlow\"", "600 20px \"Barlow\""];
  try {
    await Promise.race([Promise.all(facce.map((f) => document.fonts.load(f, testo))), attesa(3000)]);
  } catch (e) { /* senza i caratteri si usano quelli del sistema */ }
}

// Il logo dell'apertura (senza cornice). Chiaro = senza aloni, per la carta bianca.
const loghi = {};
function caricaLogo(chiaro) {
  const k = chiaro ? "chiaro" : "scuro";
  if (!loghi[k]) {
    loghi[k] = new Promise((ok) => {
      const svg = document.querySelector("#apertura svg");
      if (!svg) { ok(null); return; }
      const copia = svg.cloneNode(true);
      copia.removeAttribute("class");
      copia.setAttribute("width", "864");
      copia.setAttribute("height", "672");
      if (chiaro) copia.querySelectorAll("[filter]").forEach((el) => el.remove());
      const img = new Image();
      img.onload = () => ok(img);
      img.onerror = () => ok(null);
      setTimeout(() => ok(null), 3000);
      img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(new XMLSerializer().serializeToString(copia));
    });
  }
  return loghi[k];
}
const PROPORZIONE_LOGO = 432 / 336;

function telaInBlob(tela, tipo, qualita) {
  return new Promise((ok, no) => {
    try {
      tela.toBlob((b) => (b ? ok(b) : no(new Error("toBlob"))), tipo, qualita);
    } catch (e) {
      no(e);
    }
  });
}

// Se un browser non permette di salvare il disegno con il logo dentro, si rifà senza logo
async function conLogoSePossibile(crea) {
  try {
    return await crea();
  } catch (e) {
    if (!e || e.name !== "SecurityError") throw e;
    loghi.scuro = loghi.chiaro = Promise.resolve(null);
    return crea();
  }
}

// ---------- Grafico dei life point di un duel ----------

function graficoLP(ctx, d, x, y, w, h, colori) {
  const punti = [[LP_INIZIALI, LP_INIZIALI]];
  for (const e of eventiDuel(d)) if (e.lp) punti.push(e.lp);
  const massimo = Math.max(LP_INIZIALI, ...punti.flat());
  const sx = 46 * colori.unita;
  const px = (k) => x + sx + ((w - sx) * k) / Math.max(1, punti.length - 1);
  const py = (val) => y + h - (h * val) / massimo;

  ctx.save();
  ctx.font = carattere(600, 13 * colori.unita);
  ctx.textAlign = "right";
  ctx.lineWidth = colori.unita;
  for (const val of [0, LP_INIZIALI / 2, LP_INIZIALI]) {
    ctx.strokeStyle = colori.griglia;
    ctx.beginPath();
    ctx.moveTo(x + sx, py(val));
    ctx.lineTo(x + w, py(val));
    ctx.stroke();
    ctx.fillStyle = colori.tenue;
    ctx.fillText(String(val), x + sx - 8 * colori.unita, py(val) + 4.5 * colori.unita);
  }
  for (const g of [1, 0]) {
    ctx.beginPath();
    ctx.moveTo(px(0), py(punti[0][g]));
    for (let k = 1; k < punti.length; k++) {
      ctx.lineTo(px(k), py(punti[k - 1][g]));
      ctx.lineTo(px(k), py(punti[k][g]));
    }
    if (punti.length === 1) ctx.lineTo(x + w, py(punti[0][g]));
    ctx.strokeStyle = colori.giocatori[g];
    ctx.lineWidth = colori.linea;
    ctx.lineJoin = "round";
    if (colori.luce) { ctx.shadowColor = colori.giocatori[g]; ctx.shadowBlur = colori.luce; }
    ctx.stroke();
    ctx.shadowBlur = 0;
  }
  ctx.restore();
}

// =============================================================
// IMMAGINE (scura)
// =============================================================

const IMG_L = 1080;
const IMG_M = 64;
const IMG_MIN_ALTEZZA = 1350;   // 4:5, il formato che i social mostrano più grande
const SCURO = {
  testo: "#eef1f6", tenue: "#9aa3b6", linea: "rgba(255,255,255,.12)", fondo: "rgba(255,255,255,.045)",
  blu: "#5ba5e6", mag: "#e2689f", oro: "#f2c14e", argento: "#cfd6e0", bronzo: "#dc9a64",
};

function testataImmagine(ctx, logo, y) {
  const hLogo = 118;
  const wLogo = logo ? hLogo * PROPORZIONE_LOGO : 0;
  ctx.font = carattere(700, 92);
  const wNome = ctx.measureText("DuelManager").width;
  const spazio = logo ? 14 : 0;
  const x0 = (IMG_L - (wLogo + spazio + wNome)) / 2;
  if (logo) ctx.drawImage(logo, x0, y, wLogo, hLogo);
  scriviNomeApp(ctx, x0 + wLogo + spazio, y + hLogo / 2 + 32, 92, true);
  return y + hLogo + 24;
}

// Etichetta, data e righe di informazioni, centrate
function intestazioneImmagine(ctx, etichetta, righe, y) {
  ctx.textAlign = "center";
  ctx.fillStyle = SCURO.tenue;
  ctx.font = carattere(600, 30);
  scriviSpaziato(ctx, etichetta, IMG_L / 2, y + 30, 5);
  y += 30;
  ctx.font = carattere(500, 28, false);
  for (const r of righe) {
    y += 42;
    ctx.fillText(taglia(ctx, r, IMG_L - 2 * IMG_M), IMG_L / 2, y);
  }
  return y;
}

function corpoDuelloImmagine(ctx, v, y) {
  const s = sintesiVoce(v, testoPuro);
  const L = IMG_L - 2 * IMG_M;
  const standard = !!v.punteggio;
  y = intestazioneImmagine(ctx, s.etichetta, [formatData(v.terminato)], y);

  // Titolo
  y += 34;
  ctx.textAlign = "center";
  ctx.fillStyle = SCURO.testo;
  scriviAdattato(ctx, s.titolo, IMG_L / 2, y + 66, L, 700, 84, 46);
  y += 66;
  ctx.fillStyle = SCURO.tenue;
  ctx.font = carattere(500, 32, false);
  ctx.fillText(taglia(ctx, s.sotto, L), IMG_L / 2, y + 50);
  y += 50;

  // Tabellone dei punti: una riga per giocatore
  y += 40;
  const hRiga = 128;
  const hTesta = 46;
  const hTab = hTesta + 2 * hRiga + 14;
  riquadro(ctx, IMG_M, y, L, hTab, 30, SCURO.fondo, SCURO.linea);
  ctx.textAlign = "right";
  ctx.fillStyle = SCURO.tenue;
  ctx.font = carattere(600, 24);
  scriviSpaziato(ctx, standard ? tr("cd.duelvinti") : tr("cd.lp.finali"), IMG_L - IMG_M - 40, y + 44, 3);
  const finali = v.duel[v.duel.length - 1];
  for (const g of [0, 1]) {
    const top = y + hTesta + g * hRiga;
    const mezzo = top + hRiga / 2;
    const vince = v.risultato === g;
    const colore = g === 0 ? SCURO.blu : SCURO.mag;
    if (g === 1) {
      ctx.fillStyle = SCURO.linea;
      ctx.fillRect(IMG_M + 32, top, L - 64, 2);
    }
    ctx.save();
    ctx.shadowColor = colore;
    ctx.shadowBlur = 18;
    riquadro(ctx, IMG_M + 34, mezzo - 34, 10, 68, 5, colore);
    ctx.restore();
    // Numero a destra
    const numero = standard ? v.punteggio[g] : lp(finali, g);
    ctx.textAlign = "right";
    ctx.font = carattere(700, 96);
    ctx.save();
    if (vince) { ctx.shadowColor = "rgba(242,193,78,.6)"; ctx.shadowBlur = 22; }
    ctx.fillStyle = vince ? SCURO.oro : SCURO.testo;
    ctx.fillText(String(numero), IMG_L - IMG_M - 40, mezzo + 34);
    ctx.restore();
    const wNumero = Math.max(ctx.measureText(String(numero)).width, 80);
    // Nome, e "Vince" in oro accanto al vincitore
    ctx.font = carattere(600, 26);
    const etichetta = tr("cd.vince").toLocaleUpperCase();
    const wEtichetta = vince ? ctx.measureText(etichetta).width + 70 : 0;
    const xNome = IMG_M + 72;
    const maxNome = IMG_L - IMG_M - 40 - wNumero - 36 - xNome - (vince ? wEtichetta + 18 : 0);
    ctx.textAlign = "left";
    ctx.fillStyle = SCURO.testo;
    scriviAdattato(ctx, v.giocatori[g], xNome, mezzo + 22, maxNome, 700, 64, 38);
    if (vince) {
      const wNome = Math.min(ctx.measureText(taglia(ctx, v.giocatori[g], maxNome)).width, maxNome);
      const xp = xNome + wNome + 22;
      riquadro(ctx, xp, mezzo - 22, wEtichetta, 44, 22, "rgba(242,193,78,.16)", "rgba(242,193,78,.55)", 2);
      stella(ctx, xp + 26, mezzo, 12, SCURO.oro);
      ctx.fillStyle = SCURO.oro;
      ctx.font = carattere(600, 26);
      scriviSpaziato(ctx, etichetta, xp + 46, mezzo + 9, 2);
    }
  }
  y += hTab;

  if (standard) {
    // I duel del match, con i life point finali di ognuno
    y += 30;
    const hD = 72;
    const hBox = 60 + v.duel.length * hD + 12;
    riquadro(ctx, IMG_M, y, L, hBox, 30, SCURO.fondo, SCURO.linea);
    ctx.textAlign = "left";
    ctx.fillStyle = SCURO.tenue;
    ctx.font = carattere(600, 24);
    scriviSpaziato(ctx, tr("cd.duelmatch"), IMG_M + 40, y + 44, 3);
    ctx.textAlign = "right";
    scriviSpaziato(ctx, tr("cd.lp.finali"), IMG_L - IMG_M - 40, y + 44, 3);
    v.duel.forEach((d, i) => {
      const base = y + 60 + i * hD;
      ctx.fillStyle = SCURO.linea;
      ctx.fillRect(IMG_M + 32, base, L - 64, 2);
      const yt = base + hD / 2 + 12;
      ctx.textAlign = "left";
      ctx.fillStyle = SCURO.tenue;
      ctx.font = carattere(700, 36);
      ctx.fillText(tr("tav.duel", { n: i + 1 }), IMG_M + 40, yt);
      ctx.fillStyle = d.esito === 0 || d.esito === 1 ? SCURO.testo : SCURO.tenue;
      ctx.font = carattere(500, 32, false);
      ctx.fillText(taglia(ctx, maiuscola(testoEsitoDuel(v, d)), 470), IMG_M + 170, yt);
      ctx.font = carattere(600, 38);
      scriviCoppiaDestra(ctx, lp(d, 0), lp(d, 1), IMG_L - IMG_M - 40, yt, SCURO.blu, SCURO.mag, SCURO.tenue);
    });
    y += hBox;
  } else {
    // Duel casual: come sono andati i life point
    y += 30;
    const hBox = 400;
    riquadro(ctx, IMG_M, y, L, hBox, 30, SCURO.fondo, SCURO.linea);
    ctx.textAlign = "left";
    ctx.fillStyle = SCURO.tenue;
    ctx.font = carattere(600, 24);
    scriviSpaziato(ctx, tr("cd.andamento"), IMG_M + 40, y + 44, 3);
    ctx.textAlign = "right";
    ctx.font = carattere(500, 26, false);
    ctx.fillText(taglia(ctx, tr("cd.inizia", { nome: v.giocatori[v.duel[0].primoGiocatore] }), 420), IMG_L - IMG_M - 40, y + 44);
    graficoLP(ctx, v.duel[0], IMG_M + 40, y + 84, L - 96, hBox - 130, {
      unita: 2, tenue: SCURO.tenue, griglia: "rgba(255,255,255,.10)", giocatori: [SCURO.blu, SCURO.mag], linea: 6, luce: 14,
    });
    y += hBox;
  }
  return y;
}

function corpoTorneoImmagine(ctx, v, y) {
  const t = v.torneo;
  const L = IMG_L - 2 * IMG_M;
  const [formato, tipo, ...resto] = infoTorneo(t);
  y = intestazioneImmagine(ctx, `${tr("cr.torneo")} · ${formato} · ${tipo}`, [formatData(v.terminato), resto.join(" · ")], y);

  // Riquadro del vincitore
  y += 40;
  const vin = vincitoreTorneo(t);
  ctx.font = carattere(500, 32, false);
  const righe = aCapo(ctx, vin.riga, L - 100).slice(0, 2);
  const hBox = 50 + 64 + 30 + 34 + 112 + righe.length * 44 + 34;
  riquadro(ctx, IMG_M, y, L, hBox, 30, "rgba(242,193,78,.07)", "rgba(242,193,78,.6)", 3);
  let yy = y + 50;
  if (!vin.nessuno) {
    ctx.save();
    ctx.shadowColor = "rgba(242,193,78,.8)";
    ctx.shadowBlur = 26;
    stella(ctx, IMG_L / 2, yy + 32, 34, SCURO.oro);
    ctx.restore();
  }
  yy += 64 + 30 + 4;
  ctx.textAlign = "center";
  ctx.fillStyle = SCURO.oro;
  ctx.font = carattere(600, 30);
  scriviSpaziato(ctx, vin.etichetta, IMG_L / 2, yy, 5);
  yy += 30 + 96;
  ctx.save();
  if (!vin.nessuno) { ctx.shadowColor = "rgba(242,193,78,.55)"; ctx.shadowBlur = 24; }
  ctx.fillStyle = vin.nessuno ? SCURO.testo : SCURO.oro;
  scriviAdattato(ctx, vin.nome, IMG_L / 2, yy, L - 80, 700, 112, 54);
  ctx.restore();
  yy += 16;
  ctx.fillStyle = SCURO.tenue;
  ctx.font = carattere(500, 32, false);
  for (const r of righe) {
    yy += 44;
    ctx.fillText(r, IMG_L / 2, yy);
  }
  y += hBox;

  // Classifica finale (su due colonne se i giocatori sono tanti)
  y += 30;
  const elenco = classificaFinale(t);
  const due = elenco.length > 12;
  const perColonna = due ? Math.ceil(elenco.length / 2) : elenco.length;
  const hR = due ? 58 : 66;
  const hC = 64 + perColonna * hR + 18;
  riquadro(ctx, IMG_M, y, L, hC, 30, SCURO.fondo, SCURO.linea);
  ctx.textAlign = "left";
  ctx.fillStyle = SCURO.tenue;
  ctx.font = carattere(600, 24);
  scriviSpaziato(ctx, t.formato === "punti" ? tr("tab.classfinale") : tr("cr.piazzamenti"), IMG_M + 40, y + 44, 3);
  const spazioColonne = 44;
  const wCol = due ? (L - 80 - spazioColonne) / 2 : L - 80;
  elenco.forEach((r, i) => {
    const col = due ? Math.floor(i / perColonna) : 0;
    const riga = due ? i % perColonna : i;
    const x = IMG_M + 40 + col * (wCol + spazioColonne);
    const top = y + 64 + riga * hR;
    const yt = top + hR / 2 + 13;
    if (riga > 0) {
      ctx.fillStyle = SCURO.linea;
      ctx.fillRect(x, top, wCol, 2);
    }
    const medaglia = { 1: SCURO.oro, 2: SCURO.argento, 3: SCURO.bronzo }[r.pos];
    const px = due ? 34 : 38;
    ctx.textAlign = "right";
    ctx.fillStyle = medaglia || SCURO.tenue;
    ctx.font = carattere(700, px);
    ctx.fillText(`${r.pos}°`, x + 52, yt);
    const nota = due ? r.breve : r.nota;
    ctx.font = carattere(500, due ? 26 : 28, false);
    const wNota = nota ? Math.min(ctx.measureText(nota).width, wCol * 0.45) : 0;
    ctx.fillStyle = SCURO.tenue;
    if (nota) ctx.fillText(taglia(ctx, nota, wCol * 0.45), x + wCol, yt);
    ctx.textAlign = "left";
    ctx.fillStyle = r.ritirato ? SCURO.tenue : r.pos === 1 && !vin.nessuno ? SCURO.oro : SCURO.testo;
    ctx.font = carattere(600, px);
    ctx.fillText(taglia(ctx, r.nome, wCol - 70 - wNota - 18), x + 70, yt);
  });
  y += hC;
  return y;
}

// Disegna tutta l'immagine; con "altezza" null misura soltanto e ritorna l'altezza che serve
function disegnaImmagine(ctx, v, logo, altezza) {
  const corpo = (y) => (v.tipo === "torneo" ? corpoTorneoImmagine(ctx, v, y) : corpoDuelloImmagine(ctx, v, y));
  const hTesta = testataImmagine(ctx, logo, 60);
  const hCorpo = corpo(0);
  const hPiede = 120;
  const necessaria = Math.max(IMG_MIN_ALTEZZA, Math.ceil(hTesta + 20 + hCorpo + hPiede));
  if (altezza === null) return necessaria;

  // Sfondo come l'apertura dell'app
  const sfondo = ctx.createLinearGradient(0, 0, 0, altezza);
  sfondo.addColorStop(0, "#14122a");
  sfondo.addColorStop(0.45, "#0d0c18");
  sfondo.addColorStop(1, "#07080d");
  ctx.fillStyle = sfondo;
  ctx.fillRect(0, 0, IMG_L, altezza);
  for (const [cx, cy, r, colore] of [[150, 140, 520, "rgba(61,155,255,.16)"], [930, 220, 520, "rgba(255,61,147,.14)"],
    [540, altezza, 700, "rgba(120,90,255,.10)"]]) {
    const alone = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    alone.addColorStop(0, colore);
    alone.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = alone;
    ctx.fillRect(0, 0, IMG_L, altezza);
  }

  testataImmagine(ctx, logo, 60);
  // Il contenuto sta al centro dello spazio tra il logo e il fondo
  const libero = altezza - hTesta - hPiede - hCorpo;
  corpo(hTesta + Math.max(20, libero / 2));

  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(255,255,255,.10)";
  ctx.fillRect(IMG_L / 2 - 40, altezza - 92, 80, 2);
  ctx.fillStyle = SCURO.tenue;
  ctx.font = carattere(500, 28, false);
  ctx.fillText(SITO_APP, IMG_L / 2, altezza - 48);
  return altezza;
}

async function creaImmagine(v) {
  await caricaCaratteri(testoVoce(v));
  return conLogoSePossibile(async () => {
    const logo = await caricaLogo(false);
    const misura = document.createElement("canvas").getContext("2d");
    const altezza = disegnaImmagine(misura, v, logo, null);
    const tela = document.createElement("canvas");
    tela.width = IMG_L;
    tela.height = altezza;
    disegnaImmagine(tela.getContext("2d"), v, logo, altezza);
    const blob = await telaInBlob(tela, "image/png");
    tela.width = tela.height = 0;   // libera la memoria (conta sull'iPhone)
    const file = new File([blob], nomeFile(v, "png"), { type: "image/png" });
    return { file, anteprime: [URL.createObjectURL(blob)] };
  });
}

// =============================================================
// PDF (chiaro, A4)
// =============================================================

const PDF_L = 595.28;     // A4 in punti tipografici
const PDF_A = 841.89;
const PDF_SCALA = 3;      // pixel per punto: circa 216 dpi
const PDF_M = 42;
const PDF_INIZIO_1 = 112;
const PDF_INIZIO = 66;
const PDF_FINE = PDF_A - 54;
const CHIARO = {
  testo: "#151a24", tenue: "#596173", linea: "#d3d8e1", riga: "#f4f6f9", testa: "#e9edf3",
  blu: "#1d6aab", mag: "#a92d65", oro: "#94680a", oroFondo: "#fbf6e8", oroBordo: "#d9b85c",
  meno: "#c22a2a", piu: "#24764a",
};

// Un blocco è un pezzo di pagina alto h. tieni: resta sulla stessa pagina del blocco dopo.
// ripeti: intestazione da rimettere in cima se il blocco finisce su una pagina nuova.
function blocco(h, disegna, opzioni = {}) {
  return { h, disegna, ...opzioni };
}

function titoloPDF(etichetta, titolo, sotto) {
  const L = PDF_L - 2 * PDF_M;
  return blocco(74, (ctx, y) => {
    ctx.textAlign = "left";
    ctx.fillStyle = CHIARO.tenue;
    ctx.font = carattere(600, 10);
    scriviSpaziato(ctx, etichetta, PDF_M, y + 10, 1.2);
    ctx.fillStyle = CHIARO.testo;
    scriviAdattato(ctx, titolo, PDF_M, y + 42, L, 700, 28, 16);
    ctx.fillStyle = CHIARO.tenue;
    ctx.font = carattere(500, 11, false);
    ctx.fillText(taglia(ctx, sotto, L), PDF_M, y + 60);
  });
}

function sezionePDF(titolo, dettaglio, sotto) {
  return blocco(sotto ? 44 : 32, (ctx, y) => {
    ctx.textAlign = "left";
    ctx.fillStyle = CHIARO.testo;
    ctx.font = carattere(700, 15);
    ctx.fillText(titolo, PDF_M, y + 22);
    if (dettaglio) {
      const w = ctx.measureText(titolo).width;
      ctx.fillStyle = CHIARO.tenue;
      ctx.font = carattere(500, 11, false);
      ctx.fillText(taglia(ctx, ` · ${dettaglio}`, PDF_L - 2 * PDF_M - w), PDF_M + w, y + 22);
    }
    if (sotto) {
      ctx.fillStyle = CHIARO.tenue;
      ctx.font = carattere(500, 9.5, false);
      ctx.fillText(taglia(ctx, sotto, PDF_L - 2 * PDF_M), PDF_M, y + 36);
    }
  }, { tieni: true });
}

function spazioPDF(h) {
  return blocco(h, () => {}, { spazio: true });
}

function notaPDF(misura, testo) {
  misura.font = carattere(500, 8.5, false);
  const righe = aCapo(misura, testo, PDF_L - 2 * PDF_M);
  return blocco(6 + righe.length * 11, (ctx, y) => {
    ctx.textAlign = "left";
    ctx.fillStyle = CHIARO.tenue;
    ctx.font = carattere(500, 8.5, false);
    righe.forEach((r, i) => ctx.fillText(r, PDF_M, y + 12 + i * 11));
  });
}

// Tabella: colonne = [{ titolo, w, allinea, colore }]; l'ultima prende lo spazio che resta.
// Ogni riga è un array di celle: testo, oppure { testo, colore, grassetto }, oppure una funzione di disegno.
function tabellaPDF(colonne, righe, opzioni = {}) {
  const L = PDF_L - 2 * PDF_M;
  const fisse = colonne.slice(0, -1).reduce((s, c) => s + c.w, 0);
  const larghezze = colonne.map((c, i) => (i === colonne.length - 1 ? L - fisse : c.w));
  const xs = larghezze.map((_, i) => PDF_M + larghezze.slice(0, i).reduce((s, w) => s + w, 0));
  const pad = 6;
  const hR = opzioni.hRiga || 16;
  const testa = blocco(20, (ctx, y) => {
    ctx.fillStyle = CHIARO.testa;
    ctx.fillRect(PDF_M, y, L, 20);
    colonne.forEach((c, i) => {
      ctx.font = carattere(700, c.coloreTitolo ? 11 : 9.5);
      ctx.fillStyle = c.coloreTitolo || CHIARO.tenue;
      ctx.textAlign = c.allinea || "left";
      const x = c.allinea === "right" ? xs[i] + larghezze[i] - pad : c.allinea === "center" ? xs[i] + larghezze[i] / 2 : xs[i] + pad;
      ctx.fillText(taglia(ctx, c.titolo, larghezze[i] - 2 * pad), x, y + 14);
    });
  }, { tieni: true });
  const blocchi = [testa];
  righe.forEach((riga, k) => {
    blocchi.push(blocco(hR, (ctx, y) => {
      if (k % 2 === 1) {
        ctx.fillStyle = CHIARO.riga;
        ctx.fillRect(PDF_M, y, L, hR);
      }
      if (typeof riga === "function") { riga(ctx, y, xs, larghezze, hR); return; }
      riga.forEach((cella, i) => {
        if (cella === null || cella === undefined || cella === "") return;
        const c = colonne[i];
        const dato = typeof cella === "object" ? cella : { testo: cella };
        ctx.font = c.numeri || dato.numeri
          ? carattere(dato.grassetto ? 700 : 600, 10.5)
          : carattere(dato.grassetto ? 600 : 500, 9.5, false);
        ctx.fillStyle = dato.colore || CHIARO.testo;
        ctx.textAlign = c.allinea || "left";
        const x = c.allinea === "right" ? xs[i] + larghezze[i] - pad : c.allinea === "center" ? xs[i] + larghezze[i] / 2 : xs[i] + pad;
        ctx.fillText(taglia(ctx, dato.testo, larghezze[i] - 2 * pad), x, y + hR / 2 + 3.4);
      });
    }, { ripeti: testa }));
  });
  return blocchi;
}

function tabelloneDuelloPDF(v) {
  const L = PDF_L - 2 * PDF_M;
  const standard = !!v.punteggio;
  const finali = v.duel[v.duel.length - 1];
  const hR = 30;
  return blocco(18 + 2 * hR + 10, (ctx, y) => {
    riquadro(ctx, PDF_M, y, L, 18 + 2 * hR + 4, 7, CHIARO.riga, CHIARO.linea, 0.8);
    ctx.textAlign = "right";
    ctx.fillStyle = CHIARO.tenue;
    ctx.font = carattere(600, 8);
    scriviSpaziato(ctx, standard ? tr("cd.duelvinti") : tr("cd.lp.finali"), PDF_M + L - 14, y + 14, 1);
    for (const g of [0, 1]) {
      const mezzo = y + 18 + g * hR + hR / 2;
      const vince = v.risultato === g;
      if (g === 1) { ctx.fillStyle = CHIARO.linea; ctx.fillRect(PDF_M + 10, mezzo - hR / 2, L - 20, 0.8); }
      riquadro(ctx, PDF_M + 12, mezzo - 9, 3.5, 18, 1.75, g === 0 ? CHIARO.blu : CHIARO.mag);
      const numero = String(standard ? v.punteggio[g] : lp(finali, g));
      ctx.textAlign = "right";
      ctx.fillStyle = vince ? CHIARO.oro : CHIARO.testo;
      ctx.font = carattere(700, 21);
      ctx.fillText(numero, PDF_M + L - 14, mezzo + 7.5);
      ctx.textAlign = "left";
      ctx.fillStyle = CHIARO.testo;
      ctx.font = carattere(700, 17);
      const maxNome = L - 150;
      const nome = taglia(ctx, v.giocatori[g], maxNome);
      ctx.fillText(nome, PDF_M + 24, mezzo + 6);
      if (vince) {
        const x = PDF_M + 24 + ctx.measureText(nome).width + 10;
        ctx.font = carattere(600, 8.5);
        const etichetta = tr("cd.vince").toLocaleUpperCase();
        const w = ctx.measureText(etichetta).width + 24;
        riquadro(ctx, x, mezzo - 7.5, w, 15, 7.5, CHIARO.oroFondo, CHIARO.oroBordo, 0.8);
        stella(ctx, x + 8, mezzo, 4, CHIARO.oro);
        ctx.fillStyle = CHIARO.oro;
        scriviSpaziato(ctx, etichetta, x + 15, mezzo + 3, 0.6);
      }
    }
  });
}

function blocchiDuelloPDF(v, misura) {
  const s = sintesiVoce(v, testoPuro);
  const blocchi = [titoloPDF(s.etichetta, s.titolo, s.sotto), tabelloneDuelloPDF(v), spazioPDF(14)];
  const unico = v.duel.length === 1;
  const nomi = v.giocatori;
  v.duel.forEach((d, i) => {
    const titolo = unico ? tr("cr.registro") : tr("tav.duel", { n: i + 1 });
    const dettaglio = unico ? "" : testoEsitoDuel(v, d);
    const sotto = `${tr("cd.inizia", { nome: nomi[d.primoGiocatore] })} · ${tr("cd.lp.finali")} ${lp(d, 0)} – ${lp(d, 1)}`;
    blocchi.push(sezionePDF(titolo, dettaglio, sotto));
    const eventi = eventiDuel(d);
    if (eventi.some((e) => e.lp)) {
      blocchi.push(blocco(96, (ctx, y) => {
        graficoLP(ctx, d, PDF_M, y + 6, PDF_L - 2 * PDF_M, 76, {
          unita: 0.62, tenue: CHIARO.tenue, griglia: CHIARO.linea, giocatori: [CHIARO.blu, CHIARO.mag], linea: 1.6, luce: 0,
        });
      }, { tieni: true }));
    }
    if (eventi.length === 0) {
      blocchi.push(notaPDF(misura, tr("cr.nessunevento")));
    } else {
      const cella = (c) => (c ? (ctx, x, y) => {
        ctx.textAlign = "left";
        ctx.font = carattere(700, 10);
        const diff = segno(c.diff);
        ctx.fillStyle = c.diff < 0 ? CHIARO.meno : CHIARO.piu;
        ctx.fillText(diff, x, y);
        const w = ctx.measureText(diff).width;
        ctx.font = carattere(600, 10);
        ctx.fillStyle = CHIARO.testo;
        ctx.fillText(` → ${c.totale}`, x + w, y);
      } : null);
      const colonne = [
        { titolo: tr("cd.quando"), w: 80, numeri: true },
        { titolo: nomi[0], w: (PDF_L - 2 * PDF_M - 80) / 2, coloreTitolo: CHIARO.blu },
        { titolo: nomi[1], coloreTitolo: CHIARO.mag },
      ];
      const righe = eventi.map((e) => (ctx, y, xs, larghezze, hR) => {
        const base = y + hR / 2 + 3.4;
        ctx.textAlign = "left";
        ctx.fillStyle = CHIARO.tenue;
        ctx.font = carattere(600, 9.5);
        ctx.fillText(e.quando, xs[0] + 6, base);
        if (e.celle) {
          e.celle.forEach((c, g) => { const f = cella(c); if (f) f(ctx, xs[g + 1] + 6, base); });
        } else {
          ctx.fillStyle = CHIARO.tenue;
          ctx.font = carattere(500, 9.5, false);
          ctx.fillText(e.testo, xs[1] + 6, base);
        }
      });
      blocchi.push(...tabellaPDF(colonne, righe));
    }
    blocchi.push(spazioPDF(16));
  });
  return blocchi;
}

function vincitorePDF(misura, t) {
  const L = PDF_L - 2 * PDF_M;
  const vin = vincitoreTorneo(t);
  misura.font = carattere(500, 10.5, false);
  const righe = aCapo(misura, vin.riga, L - 40).slice(0, 2);
  const h = 66 + righe.length * 14;
  return blocco(h + 14, (ctx, y) => {
    riquadro(ctx, PDF_M, y, L, h, 8, vin.nessuno ? CHIARO.riga : CHIARO.oroFondo, vin.nessuno ? CHIARO.linea : CHIARO.oroBordo, 1);
    ctx.textAlign = "center";
    const cx = PDF_M + L / 2;
    let yy = y + 20;
    if (!vin.nessuno) stella(ctx, cx - 4 - misuraSpaziata(ctx, vin.etichetta) / 2 - 8, yy - 3.5, 5.5, CHIARO.oro);
    ctx.fillStyle = vin.nessuno ? CHIARO.tenue : CHIARO.oro;
    ctx.font = carattere(600, 9.5);
    scriviSpaziato(ctx, vin.etichetta, cx, yy, 1.4);
    yy += 30;
    ctx.fillStyle = vin.nessuno ? CHIARO.testo : CHIARO.oro;
    scriviAdattato(ctx, vin.nome, cx, yy, L - 40, 700, 30, 16);
    ctx.fillStyle = CHIARO.tenue;
    ctx.font = carattere(500, 10.5, false);
    righe.forEach((r, i) => ctx.fillText(r, cx, yy + 18 + i * 14));
  });
}

function misuraSpaziata(ctx, testo) {
  ctx.save();
  ctx.font = carattere(600, 9.5);
  if ("letterSpacing" in ctx) ctx.letterSpacing = "1.4px";
  const w = ctx.measureText(String(testo).toLocaleUpperCase()).width;
  ctx.restore();
  return w;
}

function righeRisultatiPDF(t, turno) {
  const L = PDF_L - 2 * PDF_M;
  const mezzo = PDF_M + L / 2;
  const maxNome = L / 2 - 52;
  const righe = [];
  const nome = (id) => nomeGiocatore(t, id);
  const scrivi = (ctx, testo, x, y, allinea, forte) => {
    ctx.textAlign = allinea;
    ctx.font = carattere(forte ? 600 : 500, 10, false);
    ctx.fillStyle = forte ? CHIARO.testo : CHIARO.tenue;
    ctx.fillText(taglia(ctx, testo, maxNome), x, y);
  };
  for (const m of turno.partite) {
    if (m.esito === "vuota") continue;
    righe.push((ctx, y, xs, larghezze, hR) => {
      const base = y + hR / 2 + 3.5;
      if (m.esito === "bye") {
        scrivi(ctx, nome(m.vincitore), mezzo - 40, base, "right", true);
        ctx.textAlign = "center";
        ctx.fillStyle = CHIARO.tenue;
        ctx.font = carattere(600, 9.5);
        ctx.fillText(tr("carta.bye"), mezzo, base);
        return;
      }
      const doppia = m.esito === "doppia sconfitta";
      scrivi(ctx, nome(m.a), mezzo - 40, base, "right", m.vincitore === m.a);
      scrivi(ctx, nome(m.b), mezzo + 40, base, "left", m.vincitore === m.b);
      ctx.textAlign = "center";
      ctx.fillStyle = doppia ? CHIARO.meno : CHIARO.testo;
      ctx.font = carattere(doppia ? 600 : 700, doppia ? 8.5 : 10.5);
      const centro = doppia ? tr("cd.ds") : m.punteggio ? `${m.punteggio[0]} – ${m.punteggio[1]}` : "–";
      ctx.fillText(taglia(ctx, centro, 76), mezzo, base);
    });
  }
  const riposa = turno.riposa;
  if (riposa !== null && riposa !== undefined) {
    righe.push((ctx, y, xs, larghezze, hR) => {
      const base = y + hR / 2 + 3.5;
      scrivi(ctx, nome(riposa), mezzo - 40, base, "right", t.formato === "svizzero");
      ctx.textAlign = "center";
      ctx.fillStyle = CHIARO.tenue;
      ctx.font = carattere(600, 9.5);
      ctx.fillText(t.formato === "svizzero" ? tr("carta.bye") : tr("cd.riposa"), mezzo, base);
    });
  }
  return righe;
}

function blocchiTorneoPDF(v, misura) {
  const t = v.torneo;
  const [formato, tipo, ...resto] = infoTorneo(t);
  const blocchi = [
    titoloPDF(`${tr("cr.torneo")} · ${formato} · ${tipo}`, sintesiVoce(v, testoPuro).titolo, resto.join(" · ")),
    vincitorePDF(misura, t),
  ];

  // Classifica
  const elenco = classificaFinale(t);
  const pos = (r) => ({ testo: `${r.pos}°`, grassetto: true, colore: r.pos === 1 ? CHIARO.oro : CHIARO.testo });
  const chi = (r) => ({ testo: r.nome, grassetto: r.pos === 1, colore: r.ritirato ? CHIARO.tenue : r.pos === 1 ? CHIARO.oro : CHIARO.testo });
  let colonne, legenda = null;
  if (t.formato === "punti") {
    colonne = [{ titolo: "#", w: 30, numeri: true }, { titolo: tr("cl.giocatore"), w: 250 },
      { titolo: tr("cl.V"), w: 50, allinea: "right", numeri: true }, { titolo: tr("cl.P"), w: 50, allinea: "right", numeri: true },
      { titolo: tr("cl.duel"), w: 70, allinea: "right", numeri: true }, { titolo: tr("cl.G"), allinea: "right", numeri: true }];
    legenda = tr("cl.legenda");
  } else if (t.formato === "svizzero") {
    colonne = [{ titolo: "#", w: 30, numeri: true }, { titolo: tr("cl.giocatore"), w: 148 },
      { titolo: tr("cl.V"), w: 32, allinea: "right", numeri: true }, { titolo: tr("cl.P"), w: 32, allinea: "right", numeri: true },
      { titolo: tr("sv.omw"), w: 56, allinea: "right", numeri: true }, { titolo: tr("sv.oomw"), w: 70, allinea: "right", numeri: true },
      { titolo: tr("cd.note") }];
    legenda = tr("sv.legenda");
  } else {
    colonne = [{ titolo: "#", w: 30, numeri: true }, { titolo: tr("cl.giocatore"), w: 250 }, { titolo: tr("cd.risultato") }];
  }
  blocchi.push(sezionePDF(t.formato === "punti" ? tr("tab.classfinale") : tr("cr.piazzamenti")));
  blocchi.push(...tabellaPDF(colonne, elenco.map((r) => [pos(r), chi(r), ...r.colonne.map((c, i) =>
    (i === r.colonne.length - 1 && t.formato !== "punti" ? { testo: c, colore: CHIARO.tenue } : c))])));
  if (legenda) blocchi.push(spazioPDF(4), notaPDF(misura, legenda));
  blocchi.push(spazioPDF(16));

  // Risultati, turno per turno
  blocchi.push(sezionePDF(tr("cr.risultati")));
  t.turni.forEach((turno, r) => {
    const righe = righeRisultatiPDF(t, turno);
    if (!righe.length) return;
    blocchi.push(blocco(24, (ctx, y) => {
      ctx.textAlign = "left";
      ctx.fillStyle = CHIARO.testo;
      ctx.font = carattere(700, 12);
      ctx.fillText(titoloTurno(t, r), PDF_M, y + 17);
      ctx.fillStyle = CHIARO.linea;
      ctx.fillRect(PDF_M, y + 21, PDF_L - 2 * PDF_M, 0.8);
    }, { tieni: true }));
    righe.forEach((riga, k) => {
      blocchi.push(blocco(16, (ctx, y) => {
        if (k % 2 === 1) { ctx.fillStyle = CHIARO.riga; ctx.fillRect(PDF_M, y, PDF_L - 2 * PDF_M, 16); }
        riga(ctx, y, null, null, 16);
      }));
    });
    blocchi.push(spazioPDF(8));
  });
  return blocchi;
}

// Mette i blocchi nelle pagine
function impagina(blocchi) {
  const pagine = [];
  let pagina = [];
  let y = PDF_INIZIO_1;
  blocchi.forEach((b, i) => {
    let serve = b.h;
    for (let j = i; j < blocchi.length - 1 && blocchi[j].tieni; j++) serve += blocchi[j + 1].h;
    if (y + serve > PDF_FINE && pagina.some((x) => !x.b.spazio)) {
      pagine.push(pagina);
      pagina = [];
      y = PDF_INIZIO;
      if (b.ripeti) { pagina.push({ b: b.ripeti, y }); y += b.ripeti.h; }
    }
    if (b.spazio && pagina.length === 0) return;   // niente spazi vuoti in cima a una pagina
    pagina.push({ b, y });
    y += b.h;
  });
  if (pagina.length) pagine.push(pagina);
  return pagine;
}

function testataPDF(ctx, v, logo, prima) {
  const L = PDF_L - 2 * PDF_M;
  ctx.textAlign = "right";
  ctx.fillStyle = CHIARO.tenue;
  if (prima) {
    const h = 42;
    const w = logo ? h * PROPORZIONE_LOGO : 0;
    if (logo) ctx.drawImage(logo, PDF_M - 4, 36, w, h);
    scriviNomeApp(ctx, PDF_M + w + (logo ? 4 : 0), 66, 26, false);
    ctx.font = carattere(500, 9.5, false);
    ctx.textAlign = "right";
    ctx.fillStyle = CHIARO.tenue;
    ctx.fillText(formatData(v.terminato), PDF_M + L, 54);
    ctx.fillText(SITO_APP, PDF_M + L, 67);
    ctx.fillStyle = CHIARO.linea;
    ctx.fillRect(PDF_M, 88, L, 0.8);
  } else {
    scriviNomeApp(ctx, PDF_M, 42, 13, false);
    ctx.font = carattere(500, 9, false);
    ctx.textAlign = "right";
    ctx.fillStyle = CHIARO.tenue;
    ctx.fillText(taglia(ctx, sintesiVoce(v, testoPuro).titolo + " · " + formatData(v.terminato), L - 90), PDF_M + L, 42);
    ctx.fillStyle = CHIARO.linea;
    ctx.fillRect(PDF_M, 50, L, 0.8);
  }
}

function piedePDF(ctx, n, totale) {
  const L = PDF_L - 2 * PDF_M;
  ctx.fillStyle = CHIARO.linea;
  ctx.fillRect(PDF_M, PDF_A - 40, L, 0.8);
  ctx.font = carattere(500, 8.5, false);
  ctx.fillStyle = CHIARO.tenue;
  ctx.textAlign = "left";
  ctx.fillText(`${tr("cd.creato")} · ${SITO_APP}`, PDF_M, PDF_A - 26);
  ctx.textAlign = "right";
  ctx.fillText(tr("cd.pagina", { n: n + 1, tot: totale }), PDF_M + L, PDF_A - 26);
}

// File PDF con una pagina A4 per ogni immagine JPEG
function creaFilePDF(pagine, titolo) {
  const codifica = new TextEncoder();
  const parti = [];
  const posizioni = [];
  let lunghezza = 0;
  const scrivi = (x) => {
    const b = typeof x === "string" ? codifica.encode(x) : x;
    parti.push(b);
    lunghezza += b.length;
  };
  const oggetto = (n, corpo) => {
    posizioni[n] = lunghezza;
    scrivi(`${n} 0 obj\n`);
    corpo();
    scrivi("\nendobj\n");
  };
  const testoUnicode = (s) => {
    let h = "FEFF";
    for (let i = 0; i < s.length; i++) h += s.charCodeAt(i).toString(16).padStart(4, "0").toUpperCase();
    return `<${h}>`;
  };
  const d = new Date();
  const due = (n) => String(n).padStart(2, "0");
  const data = `D:${d.getFullYear()}${due(d.getMonth() + 1)}${due(d.getDate())}${due(d.getHours())}${due(d.getMinutes())}${due(d.getSeconds())}`;

  scrivi("%PDF-1.4\n");
  scrivi(new Uint8Array([37, 226, 227, 207, 211, 10]));   // segnala che il file contiene dati binari
  const idPagina = (i) => 4 + i * 3;
  oggetto(1, () => scrivi("<< /Type /Catalog /Pages 2 0 R >>"));
  oggetto(2, () => scrivi(`<< /Type /Pages /Count ${pagine.length} /Kids [${pagine.map((_, i) => `${idPagina(i)} 0 R`).join(" ")}] >>`));
  oggetto(3, () => scrivi(`<< /Title ${testoUnicode(titolo)} /Creator (DuelManager) /Producer (DuelManager) /CreationDate (${data}) >>`));
  pagine.forEach((p, i) => {
    const id = idPagina(i);
    oggetto(id, () => scrivi(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PDF_L} ${PDF_A}] ` +
      `/Resources << /XObject << /Im0 ${id + 2} 0 R >> >> /Contents ${id + 1} 0 R >>`));
    const contenuto = `q ${PDF_L} 0 0 ${PDF_A} 0 0 cm /Im0 Do Q`;
    oggetto(id + 1, () => {
      scrivi(`<< /Length ${contenuto.length} >>\nstream\n${contenuto}\nendstream`);
    });
    oggetto(id + 2, () => {
      scrivi(`<< /Type /XObject /Subtype /Image /Width ${p.larghezza} /Height ${p.altezza} /ColorSpace /DeviceRGB ` +
        `/BitsPerComponent 8 /Filter /DCTDecode /Length ${p.jpeg.length} >>\nstream\n`);
      scrivi(p.jpeg);
      scrivi("\nendstream");
    });
  });
  const totale = 4 + pagine.length * 3;
  const inizioXref = lunghezza;
  let xref = `xref\n0 ${totale}\n0000000000 65535 f \n`;
  for (let k = 1; k < totale; k++) xref += `${String(posizioni[k]).padStart(10, "0")} 00000 n \n`;
  scrivi(xref);
  scrivi(`trailer\n<< /Size ${totale} /Root 1 0 R /Info 3 0 R >>\nstartxref\n${inizioXref}\n%%EOF\n`);
  return new Blob(parti, { type: "application/pdf" });
}

async function creaPDF(v) {
  await caricaCaratteri(testoVoce(v));
  return conLogoSePossibile(async () => {
    const logo = await caricaLogo(true);
    const misura = document.createElement("canvas").getContext("2d");
    const blocchi = v.tipo === "torneo" ? blocchiTorneoPDF(v, misura) : blocchiDuelloPDF(v, misura);
    const pagine = impagina(blocchi);
    const tela = document.createElement("canvas");
    tela.width = Math.round(PDF_L * PDF_SCALA);
    tela.height = Math.round(PDF_A * PDF_SCALA);
    const ctx = tela.getContext("2d");
    const fatte = [];
    const anteprime = [];
    for (let n = 0; n < pagine.length; n++) {
      ctx.setTransform(PDF_SCALA, 0, 0, PDF_SCALA, 0, 0);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, PDF_L, PDF_A);
      testataPDF(ctx, v, logo, n === 0);
      for (const { b, y } of pagine[n]) {
        ctx.save();
        b.disegna(ctx, y);
        ctx.restore();
      }
      piedePDF(ctx, n, pagine.length);
      const blob = await telaInBlob(tela, "image/jpeg", 0.9);
      fatte.push({ jpeg: new Uint8Array(await blob.arrayBuffer()), larghezza: tela.width, altezza: tela.height });
      anteprime.push(URL.createObjectURL(blob));
    }
    tela.width = tela.height = 0;
    const file = new File([creaFilePDF(fatte, titoloDocumento(v))], nomeFile(v, "pdf"), { type: "application/pdf" });
    return { file, anteprime };
  });
}

// =============================================================
// FINESTRA "Condividi"
// =============================================================

let condivisione = null;   // { v, formato: "img" | "pdf", img, pdf, errore: {} }
let generazione = 0;       // cambia a ogni apertura: i file di una finestra già chiusa si buttano

function bottoneCondividi(id) {
  if (!trovaVoce(id)) return "";
  return `<button type="button" class="condividi" data-condividi="${id}">${SVG_CONDIVIDI}<span>${tr("cd.condividi")}</span></button>`;
}

function liberaAnteprime() {
  if (!condivisione) return;
  for (const f of ["img", "pdf"]) {
    const dato = condivisione[f];
    if (dato) dato.anteprime.forEach((u) => URL.revokeObjectURL(u));
  }
}

async function apriCondividi(id) {
  const v = trovaVoce(id);
  if (!v) return;
  liberaAnteprime();
  const gen = ++generazione;
  condivisione = { v, formato: "img", img: null, pdf: null, errore: {} };
  const box = $("#cd-anteprima");
  delete box.dataset.mostra;
  disegnaCondividi();
  apriDialogo($("#dialogo-condividi"));
  for (const formato of ["img", "pdf"]) {
    try {
      const dato = formato === "img" ? await creaImmagine(v) : await creaPDF(v);
      if (gen !== generazione) { dato.anteprime.forEach((u) => URL.revokeObjectURL(u)); return; }
      condivisione[formato] = dato;
    } catch (e) {
      if (gen !== generazione) return;
      condivisione.errore[formato] = true;
      console.warn("Condividi:", e);
    }
    disegnaCondividi();
  }
}

function puoCondividere(file) {
  try {
    return !!(navigator.share && navigator.canShare && navigator.canShare({ files: [file] }));
  } catch (e) {
    return false;
  }
}

function puoCopiare() {
  return !!(navigator.clipboard && navigator.clipboard.write && window.ClipboardItem);
}

// Quali pulsanti: sul telefono si condivide (dal menu del telefono si salva o si stampa),
// sul computer si salva il file
function azioniCondividi(formato, file) {
  const condivisibile = file ? puoCondividere(file) : !!(navigator.share && navigator.canShare);
  const tocco = window.matchMedia("(pointer: coarse)").matches;
  if (IOS && condivisibile) return [["condividi", "cd.condividi.salva", true]];
  if (tocco && condivisibile) return [["condividi", "cd.condividi", true], ["salva", "cd.salva", false]];
  const azioni = [["salva", "cd.salva", true]];
  if (formato === "pdf") azioni.push(["stampa", "cd.stampa", false]);
  if (formato === "img" && puoCopiare()) azioni.push(["copia", "cd.copia", false]);
  if (condivisibile) azioni.push(["condividi", "cd.condividi", false]);
  return azioni;
}

function disegnaCondividi() {
  const c = condivisione;
  if (!c) return;
  const f = c.formato;
  const dato = c[f];
  $$("#dialogo-condividi [data-cd-formato]").forEach((b) => {
    b.setAttribute("aria-selected", String(b.dataset.cdFormato === f));
  });

  // Anteprima (si ridisegna solo se cambia, così non torna in cima da sola)
  const box = $("#cd-anteprima");
  const stato = `${f}:${dato ? "pronto" : c.errore[f] ? "errore" : "attesa"}`;
  if (box.dataset.mostra !== stato) {
    box.dataset.mostra = stato;
    box.classList.toggle("pdf", f === "pdf");
    if (dato) {
      box.innerHTML = dato.anteprime.map((u, i) =>
        `<img src="${u}" alt="${f === "img" ? tr("cd.anteprima") : tr("cd.pagina", { n: i + 1, tot: dato.anteprime.length })}">`).join("");
    } else if (c.errore[f]) {
      box.innerHTML = `<p class="cd-attesa">${tr("cd.errore")}</p>`;
    } else {
      box.innerHTML = `<p class="cd-attesa"><span class="cd-rotella" aria-hidden="true"></span>${tr(f === "img" ? "cd.preparo" : "cd.preparo.pdf")}</p>`;
    }
    box.scrollTop = 0;
  }

  // Nota e pulsanti
  let nota;
  if (f === "img") nota = tr("cd.nota.img");
  else if (dato) nota = tr(dato.anteprime.length === 1 ? "cd.nota.pdf1" : "cd.nota.pdfN", { n: dato.anteprime.length });
  else nota = tr("cd.nota.pdf");
  const file = dato ? dato.file : null;
  const azioni = azioniCondividi(f, file);
  if (IOS && azioni.length === 1) nota += " " + tr(f === "img" ? "cd.nota.ios.img" : "cd.nota.ios.pdf");
  $("#cd-nota").textContent = nota;
  const icona = { condividi: SVG_CONDIVIDI, salva: SVG_SALVA, stampa: SVG_STAMPA, copia: SVG_COPIA };
  $("#cd-bottoni").innerHTML = azioni.map(([azione, testo, primario]) =>
    `<button type="button" class="btn ${primario ? "btn-primario" : ""}" data-cd-azione="${azione}" ${file ? "" : "disabled"}>${icona[azione]}<span>${tr(testo)}</span></button>`).join("");
}

const SVG_SALVA = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5V15M7.5 10.5 12 15l4.5-4.5M5 19.5h14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const SVG_STAMPA = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 8V3.5h10V8M7 17H5a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M7 14h10v6.5H7z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>`;
const SVG_COPIA = `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8.5" y="8.5" width="12" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M15.5 8.5V5.5a2 2 0 0 0-2-2h-8a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h3" fill="none" stroke="currentColor" stroke-width="2"/></svg>`;

function salvaFile(file) {
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

function eseguiAzione(azione) {
  const c = condivisione;
  const dato = c && c[c.formato];
  if (!dato) return;
  const file = dato.file;
  if (azione === "condividi") {
    // Va chiamato subito dentro il tocco, senza attese: per questo i file sono già pronti
    navigator.share({ files: [file] }).catch((e) => {
      if (e && e.name !== "AbortError") avvisa(tr("cd.condividi.no"));
    });
  } else if (azione === "salva") {
    salvaFile(file);
  } else if (azione === "stampa") {
    const url = URL.createObjectURL(file);
    const w = window.open(url, "_blank");
    if (!w) salvaFile(file);
    setTimeout(() => URL.revokeObjectURL(url), 120000);
  } else if (azione === "copia") {
    navigator.clipboard.write([new ClipboardItem({ [file.type]: file })])
      .then(() => avvisa(tr("cd.copiata")), () => avvisa(tr("cd.copia.no")));
  }
}

document.addEventListener("click", (ev) => {
  const b = ev.target.closest("[data-condividi]");
  if (b) apriCondividi(b.dataset.condividi);
});

$("#dialogo-condividi").addEventListener("click", (ev) => {
  const scheda = ev.target.closest("[data-cd-formato]");
  if (scheda && condivisione) {
    condivisione.formato = scheda.dataset.cdFormato;
    disegnaCondividi();
    return;
  }
  const azione = ev.target.closest("[data-cd-azione]");
  if (azione && !azione.disabled) eseguiAzione(azione.dataset.cdAzione);
});

$("#dialogo-condividi").addEventListener("close", (ev) => {
  if (ev.target.open) return;   // riaperta subito per un'altra partita: niente da pulire
  generazione++;
  liberaAnteprime();
  condivisione = null;
  const box = $("#cd-anteprima");
  box.innerHTML = "";
  delete box.dataset.mostra;
});
