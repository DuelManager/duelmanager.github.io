// =============================================================
// lingua.js — tutti i testi dell'app, in italiano e in inglese.
// Per aggiungere una lingua basta un nuovo blocco con le stesse chiavi.
// Nel testo, {nome} viene sostituito con il valore passato a tr().
// =============================================================

const LINGUE = ["it", "en"];

const TESTI = {
  it: {
    // ---------- Comuni ----------
    "suono.si": "Suono: sì",
    "suono.no": "Suono: no",
    "home": "Home",
    "indietro.home": "← Home",
    "chiudi": "Chiudi",
    "giocatore.n": "Giocatore {n}",
    "giocatore.1": "Giocatore 1",
    "giocatore.2": "Giocatore 2",
    "contro": "contro",
    "tempo": "Tempo",
    "minuti": "Minuti",
    "chi.inizia": "Chi inizia",
    "moneta.decide": "Decide la moneta",
    "moneta.inizia": "Moneta: inizia {nome}",
    "moneta.testa": "Testa",
    "moneta.croce": "Croce",
    "minuti.errore": "Inserisci i minuti del timer (almeno 1).",
    "duello": "Duello",

    // ---------- Home ----------
    "home.sopra": "Yu-Gi-Oh! con le carte fisiche",
    "home.titolo": "Gestore partite",
    "home.desc": "Life point, fasi e timer per i duel al tavolo. Tornei con sorteggio, tabellone e classifica.",
    "home.regole": "Regole",
    "home.impostazioni": "Impostazioni",
    "home.duello": "Duello",
    "home.duello.desc": "Due giocatori, 8000 life point a testa. Cronologia, fasi del turno e timer da match.",
    "home.duello.tipi": "Standard · Casual",
    "home.torneo": "Torneo",
    "home.torneo.desc": "Da 4 a 16 giocatori. Abbinamenti sorteggiati, tabellone e risultati salvati match per match.",
    "home.torneo.tipi": "Eliminazione diretta · A punti",
    "home.nuovo.duello": "Nuovo duello",
    "home.nuovo.torneo": "Nuovo torneo",
    "home.duello.incorso": "Duello in corso",
    "home.duello.ultimo": "Ultimo duello",
    "home.riprendi.duello": "Riprendi il duello",
    "home.vedi": "Vedi il risultato",
    "home.torneo.incorso": "Torneo in corso",
    "home.torneo.ultimo": "Ultimo torneo",
    "home.riprendi.torneo": "Riprendi il torneo",
    "home.doppia": "Doppia sconfitta",
    "home.havinto": "Ha vinto {nome}",
    "home.campione": "Campione: {nome}",
    "home.senzavincitore": "Concluso senza vincitore",
    "home.primo": "Primo posto: {nome}",
    "home.concluse": "{turno} · {fatte} di {tot} partite concluse",

    // ---------- Impostazioni e regole ----------
    "imp.titolo": "Impostazioni",
    "imp.suono": "Suono",
    "imp.suono.desc": "Effetti per life point, fasi, moneta, dado e avvisi del timer.",
    "imp.lingua": "Lingua",
    "imp.lingua.desc": "Cambia la lingua di tutta l'app.",
    "regole.titolo": "Regole e funzionamento",

    // ---------- Setup duello ----------
    "sd.titolo": "Duello",
    "sd.sotto": "Nuova partita",
    "sd.desc": "Scegli la modalità, i giocatori e il tempo. Tutto il resto si gestisce dal tavolo.",
    "sd.modalita": "Modalità",
    "sd.standard.desc": "Match al meglio di 3, timer da match",
    "sd.casual.desc": "Duello singolo con rivincite",
    "sd.timer.standard": "Timer da match",
    "sd.timer.casual": "Usa un timer",
    "sd.nota.standard": "Regolamento attuale: 50 minuti per match. Allo scadere, se nessuno ha vinto 2 duel, è doppia sconfitta. Togli il timer per finali e top cut.",
    "sd.nota.casual": "Nel casual il timer è solo un promemoria: allo scadere non cambia il risultato.",
    "sd.sostituisci": "Iniziando, il duello in corso verrà chiuso.",
    "sd.inizia": "Inizia la partita",

    // ---------- Setup torneo ----------
    "st.titolo": "Torneo",
    "st.passo1": "Nuovo torneo · passo 1 di 2",
    "st.desc": "Scegli come si giocano i match e il formato del torneo.",
    "st.tipo": "Tipo di match",
    "st.standard.desc": "Al meglio di 3, timer da match",
    "st.casual.desc": "Un duel decide il match",
    "st.formato": "Formato",
    "st.elim": "Eliminazione diretta",
    "st.elim.desc": "Chi perde è fuori, fino alla finale",
    "st.punti": "A punti",
    "st.punti.desc": "Tutti contro tutti, vince chi ha più vittorie",
    "st.timer.standard": "Timer per ogni match",
    "st.timer.casual": "Usa un timer",
    "st.nota.standard": "Ogni match è al meglio di 3. Allo scadere del tempo, se nessuno ha vinto 2 duel, è doppia sconfitta.",
    "st.nota.finale": " La finale si gioca senza limite di tempo, come da regolamento.",
    "st.nota.casual": "Ogni match è un solo duel: in caso di pareggio si rigioca. Il timer è solo un promemoria.",
    "st.avanti": "Avanti: i giocatori",

    // ---------- Setup giocatori ----------
    "sg.indietro": "← Tipo e formato",
    "sg.titolo": "Giocatori",
    "sg.passo2": "Nuovo torneo · passo 2 di 2",
    "sg.numero": "Numero di giocatori",
    "sg.meno": "Un giocatore in meno",
    "sg.piu": "Un giocatore in più",
    "sg.nomi": "Nomi",
    "sg.sostituisci": "Creando il nuovo torneo, quello in corso verrà chiuso.",
    "sg.crea": "Crea il torneo",
    "sg.timer": "timer di {m} minuti",
    "sg.senzatimer": "senza timer",
    "sg.info.elim": "{turni} turni, {partite} partite.",
    "sg.info.bye1": "1 giocatore passa direttamente al secondo turno (bye), scelto dal sorteggio. ",
    "sg.info.byeN": "{n} giocatori passano direttamente al secondo turno (bye), scelti dal sorteggio. ",
    "sg.info.punti": "Tutti contro tutti: {turni} turni, {partite} partite.",
    "sg.info.riposo": " A ogni turno un giocatore riposa.",
    "sg.doppione": "Due giocatori si chiamano \"{nome}\": cambia uno dei due nomi.",

    // ---------- Sorteggio ----------
    "car.sopra": "Nuovo torneo",
    "car.titolo": "Sorteggio degli abbinamenti",
    "car.m1": "Mescolo i giocatori",
    "car.m2": "Creo gli abbinamenti",
    "car.m3": "Preparo il tabellone",

    // ---------- Nomi dei turni ----------
    "turno.finale": "Finale",
    "turno.semi": "Semifinali",
    "turno.quarti": "Quarti di finale",
    "turno.ottavi": "Ottavi di finale",
    "turno.n": "Turno {n}",
    "match.n": "Match {n}",
    "partita.n": "Partita {n}",

    // ---------- Tabellone ----------
    "tab.titolo": "Torneo",
    "tab.giocatori": "{n} giocatori",
    "tab.incorso": "Turno in corso",
    "tab.turnodi": "Turno {n} di {tot}",
    "tab.concluse1": "{f} di {t} partita conclusa",
    "tab.concluseN": "{f} di {t} partite concluse",
    "tab.riposa": " · Riposa {nome}",
    "tab.concludi": "Concludi il torneo",
    "tab.prosegui": "Prosegui: {turno}",
    "tab.tutte": "Tutte le partite del turno sono concluse.",
    "tab.manca1": "Manca 1 partita. Tocca una partita per giocarla o assegnare il risultato.",
    "tab.mancanoN": "Mancano {n} partite. Tocca una partita per giocarla o assegnare il risultato.",
    "tab.concluso": "Torneo concluso",
    "tab.nessuno": "Nessun vincitore",
    "tab.finalesenza": "La finale si è chiusa senza vincitore.",
    "tab.tornahome": "Torna alla home",
    "tab.finalebye": "Ha vinto la finale senza giocare: l'avversario era stato eliminato.",
    "tab.finale": "Finale: {v} batte {p}{punti}",
    "tab.campione": "Campione del torneo",
    "tab.classfinale": "Classifica finale",
    "tab.vittoria1": "{n} vittoria",
    "tab.vittorieN": "{n} vittorie",

    "carta.bye": "Bye",
    "carta.dagiocare": "Da giocare",
    "carta.attesa": "In attesa",
    "carta.incorso": "In corso",
    "carta.passa": "Passa il turno",
    "carta.vuota": "Nessun giocatore",
    "carta.doppia": "Doppia sconfitta",
    "carta.conclusa": "Conclusa",
    "carta.definire": "Da definire",

    "cl.titolo": "Classifica",
    "cl.giocatore": "Giocatore",
    "cl.V": "V",
    "cl.P": "P",
    "cl.duel": "Duel",
    "cl.G": "G",
    "cl.V.t": "Match vinti",
    "cl.P.t": "Match persi",
    "cl.duel.t": "Duel vinti e persi",
    "cl.G.t": "Match giocati",
    "cl.legenda": "V vinte · P perse · G giocate. A pari vittorie conta la differenza duel, poi lo scontro diretto.",

    "punti.partite": "Partite del turno",
    "punti.ultimo": "Ultimo turno",
    "punti.manca1": "Dopo questo turno ne manca 1.",
    "punti.mancanoN": "Dopo questo turno ne mancano {n}.",
    "punti.giocati": "Turni giocati ({n})",
    "punti.riposa": " · riposa {nome}",
    "punti.riposaTitolo": "Riposa: {nome}",

    // ---------- Pannello del match ----------
    "pm.aria": "Match del torneo",
    "pm.dagiocare": "Da giocare.",
    "pm.incorso": "In corso: duel {d}, {a} {va}–{vb} {b}",
    "pm.rimasti": "{tempo} rimasti",
    "pm.doppia.elim": "Doppia sconfitta: nessuno dei due passa il turno.",
    "pm.doppia.punti": "Doppia sconfitta: la partita conta come persa per entrambi.",
    "pm.vince": "{v} vince{punti}.",
    "pm.gioca": "Gioca il match",
    "pm.bo3": "Al meglio di 3",
    "pm.uno": "Un solo duel",
    "pm.senzatempo": "senza limite di tempo",
    "pm.finale": " (finale)",
    "pm.timer": "timer di {m} minuti",
    "pm.giocaduel": "Gioca il duel",
    "pm.riprendi": "Riprendi il duel",
    "pm.apri": "Apri il duel giocato",
    "pm.correggi": "Correggi il risultato",
    "pm.assegna": "Assegna il risultato senza giocare",
    "pm.punteggio": "Punteggio",
    "pm.punteggio.aria": "Punteggio del match",
    "pm.vincebtn": "Vince {nome}",
    "pm.doppiabtn": "Doppia sconfitta",
    "pm.azzera": "Azzera la partita",
    "pm.azzera.conf": "Clicca di nuovo: il duel giocato si perde",
    "pm.chiuso.torneo": "Il torneo è concluso: il risultato non si può più cambiare.",
    "pm.chiuso.turno": "Questo turno è chiuso: il risultato non si può più cambiare.",

    "toast.5min": "{chi}: mancano 5 minuti",
    "toast.scaduto": "Tempo scaduto: doppia sconfitta",
    "toast.scadutoIn": "Tempo scaduto in {chi}: doppia sconfitta",

    // ---------- Tavolo ----------
    "tav.tempo": "Tempo del match",
    "tav.pausa": "Pausa",
    "tav.riprendi": "Riprendi",
    "tav.senzatempo": "Senza tempo",
    "tav.standard": "Standard · al meglio di 3",
    "tav.casual": "Casual",
    "tav.duel": "Duel {n}",
    "tav.pareggio": "pareggio",
    "tav.tabellone": "Tabellone",
    "tav.duelvinti": "Duel vinti",
    "tav.vittorie": "Vittorie: {n}",
    "tav.turno": "Turno {n}",
    "tav.tocca": "Tocca a {nome}",
    "tav.passaturno": "Passa il turno",
    "tav.fasesucc": "Fase successiva",
    "tav.primoturno": "Primo turno: {nome} non pesca e non ha la Battle Phase.",
    "tav.annulla": "Annulla",
    "tav.moneta": "Moneta",
    "tav.dado": "Dado",
    "tav.entrambi": "Danno a entrambi",
    "tav.entrambi.aria": "Danno a entrambi i giocatori",
    "tav.applica": "Applica",
    "tav.tasti": "<kbd>Spazio</kbd> fase · <kbd>Z</kbd> annulla · <kbd>P</kbd> pausa · <kbd>1</kbd> <kbd>2</kbd> scrivi LP",
    "tav.cronologia": "Cronologia del duel",
    "tav.recente": "Più recente in alto",
    "tav.log.vuoto": "Ancora nessuna modifica in questo duel. Ogni cambio di life point, moneta o dado comparirà qui con turno e fase.",
    "tav.log.moneta": "Moneta: {esito}",
    "tav.log.dado": "Dado: {esito}",
    "tav.diturno": "Di turno",
    "tav.lp": "LIFE POINTS",
    "tav.lp.ph": "es. 2400 o +1000",
    "tav.lp.aria": "Variazione life point",
    "tav.meta": "Metà",
    "tav.lp.errore": "Scrivi un numero: 2400 toglie, +1000 aggiunge.",
    "tav.aria.partita": "Partita",
    "tav.aria.cronologia": "Cronologia",
    "tav.aria.fasi": "Vai a una fase",

    "es.scaduto": "Tempo scaduto: doppia sconfitta",
    "es.scaduto.sotto": "Nessuno ha vinto il match prima della fine del tempo ({a}–{b}).",
    "es.vincematch": "{nome} vince il match",
    "es.risultato": "Risultato {a}–{b}.",
    "es.giatab": " Il risultato è già nel tabellone.",
    "es.tornatab": "Torna al tabellone",
    "es.rigioca": "Rigioca con le stesse impostazioni",
    "es.nuova": "Nuova partita",
    "es.matchconcluso": "Match concluso",
    "es.pareggio": "Duel in pareggio",
    "es.vinceduel": "{nome} vince il duel",
    "es.chiudimatch": "Conferma e chiudi il match",
    "es.rivincita": "Rivincita",
    "es.prossimo": "Prossimo duel",
    "es.dom.pareggio": "Si gioca un altro duel. Chi inizia?",
    "es.dom.rivincita": "Chi inizia la rivincita?",
    "es.dom.perso": "Chi ha perso sceglie chi inizia.",
    "es.inizia": "{etichetta}: inizia {nome}",
    "es.fineduel": "Fine del duel",
    "es.annulla": "Errore? Annulla l'ultima modifica",

    // ---------- Cronologia e preferiti ----------
    "home.cronologia": "Cronologia partite",
    "home.preferiti": "Preferiti",
    "cr.aria": "Cronologia e preferiti",
    "cr.titolo": "Cronologia",
    "pref.titolo": "Preferiti",
    "cr.intro": "Le ultime {max} partite concluse, la più recente in alto. Quando ne arriva una nuova, la più vecchia si cancella. Tocca la stella per salvarne una nei preferiti.",
    "pref.intro": "Le partite salvate restano qui finché non togli la stella.",
    "cr.vuota": "Ancora nessuna partita conclusa. Duelli e tornei finiti compaiono qui con data e ora.",
    "pref.vuota": "Nessun preferito. Tocca la stella di una partita nella cronologia, o alla fine di un duello o di un torneo, per salvarla qui.",
    "pref.salva": "Salva nei preferiti",
    "pref.salvato": "Nei preferiti",
    "pref.togli": "Togli dai preferiti",
    "cr.indietro": "← Cronologia",
    "pref.indietro": "← Preferiti",
    "cr.duello": "Duello",
    "cr.torneo": "Torneo",
    "cr.vince.punti": "{nome} vince {a}–{b}",
    "cr.vince": "{nome} vince",
    "cr.contro": "contro {nome}",
    "cr.doppia": "Doppia sconfitta",
    "cr.pareggio": "Pareggio",
    "cr.tra": "{a} e {b}",
    "cr.registro": "Registro dei life point",
    "cr.duel.vince": "vince {nome}",
    "cr.duel.pareggio": "pareggio",
    "cr.duel.interrotto": "interrotto dal tempo",
    "cr.nessunevento": "Nessun cambio di life point in questo duel.",
    "cr.piazzamenti": "Piazzamenti",
    "cr.risultati": "Risultati",
    "cr.campione": "Campione",
    "cr.eliminato": "Eliminato · {turno}",
    "cr.r.bye": "{nome} passa il turno",
    "cr.r.doppia": "{a} e {b}: doppia sconfitta",
    "cr.r.vince": "{v} batte {p}{punti}",
  },

  en: {
    // ---------- Common ----------
    "suono.si": "Sound: on",
    "suono.no": "Sound: off",
    "home": "Home",
    "indietro.home": "← Home",
    "chiudi": "Close",
    "giocatore.n": "Player {n}",
    "giocatore.1": "Player 1",
    "giocatore.2": "Player 2",
    "contro": "vs",
    "tempo": "Time",
    "minuti": "Minutes",
    "chi.inizia": "Who goes first",
    "moneta.decide": "Coin toss decides",
    "moneta.inizia": "Coin: {nome} goes first",
    "moneta.testa": "Heads",
    "moneta.croce": "Tails",
    "minuti.errore": "Enter the timer minutes (at least 1).",
    "duello": "Duel",

    // ---------- Home ----------
    "home.sopra": "Yu-Gi-Oh! with physical cards",
    "home.titolo": "Match manager",
    "home.desc": "Life points, phases and timer for duels at the table. Tournaments with random pairings, a bracket and standings.",
    "home.regole": "Rules",
    "home.impostazioni": "Settings",
    "home.duello": "Duel",
    "home.duello.desc": "Two players, 8000 life points each. History, turn phases and a match timer.",
    "home.duello.tipi": "Standard · Casual",
    "home.torneo": "Tournament",
    "home.torneo.desc": "4 to 16 players. Random pairings, a bracket and results saved match by match.",
    "home.torneo.tipi": "Single elimination · Round robin",
    "home.nuovo.duello": "New duel",
    "home.nuovo.torneo": "New tournament",
    "home.duello.incorso": "Duel in progress",
    "home.duello.ultimo": "Last duel",
    "home.riprendi.duello": "Resume duel",
    "home.vedi": "See the result",
    "home.torneo.incorso": "Tournament in progress",
    "home.torneo.ultimo": "Last tournament",
    "home.riprendi.torneo": "Resume tournament",
    "home.doppia": "Double loss",
    "home.havinto": "{nome} won",
    "home.campione": "Champion: {nome}",
    "home.senzavincitore": "Ended with no winner",
    "home.primo": "First place: {nome}",
    "home.concluse": "{turno} · {fatte} of {tot} matches finished",

    // ---------- Settings and rules ----------
    "imp.titolo": "Settings",
    "imp.suono": "Sound",
    "imp.suono.desc": "Effects for life points, phases, coin, die and timer alerts.",
    "imp.lingua": "Language",
    "imp.lingua.desc": "Changes the language of the whole app.",
    "regole.titolo": "Rules and how it works",

    // ---------- Duel setup ----------
    "sd.titolo": "Duel",
    "sd.sotto": "New game",
    "sd.desc": "Choose the mode, the players and the time. Everything else is handled at the table.",
    "sd.modalita": "Mode",
    "sd.standard.desc": "Best of 3 match, match timer",
    "sd.casual.desc": "Single duel with rematches",
    "sd.timer.standard": "Match timer",
    "sd.timer.casual": "Use a timer",
    "sd.nota.standard": "Current tournament policy: 50 minutes per match. When time runs out and nobody has won 2 duels, it's a double loss. Turn the timer off for finals and top cut.",
    "sd.nota.casual": "In casual the timer is only a reminder: it doesn't change the result when it runs out.",
    "sd.sostituisci": "Starting will close the duel in progress.",
    "sd.inizia": "Start the game",

    // ---------- Tournament setup ----------
    "st.titolo": "Tournament",
    "st.passo1": "New tournament · step 1 of 2",
    "st.desc": "Choose how matches are played and the tournament format.",
    "st.tipo": "Match type",
    "st.standard.desc": "Best of 3, match timer",
    "st.casual.desc": "One duel decides the match",
    "st.formato": "Format",
    "st.elim": "Single elimination",
    "st.elim.desc": "Lose and you're out, all the way to the final",
    "st.punti": "Round robin",
    "st.punti.desc": "Everyone plays everyone, most wins takes it",
    "st.timer.standard": "Timer for each match",
    "st.timer.casual": "Use a timer",
    "st.nota.standard": "Each match is best of 3. When time runs out and nobody has won 2 duels, it's a double loss.",
    "st.nota.finale": " The final has no time limit, as in the official policy.",
    "st.nota.casual": "Each match is a single duel: a draw is replayed. The timer is only a reminder.",
    "st.avanti": "Next: players",

    // ---------- Players setup ----------
    "sg.indietro": "← Type and format",
    "sg.titolo": "Players",
    "sg.passo2": "New tournament · step 2 of 2",
    "sg.numero": "Number of players",
    "sg.meno": "One player fewer",
    "sg.piu": "One more player",
    "sg.nomi": "Names",
    "sg.sostituisci": "Creating a new tournament will close the one in progress.",
    "sg.crea": "Create tournament",
    "sg.timer": "{m}-minute timer",
    "sg.senzatimer": "no timer",
    "sg.info.elim": "{turni} rounds, {partite} matches.",
    "sg.info.bye1": "1 player goes straight to round 2 (bye), chosen by the draw. ",
    "sg.info.byeN": "{n} players go straight to round 2 (bye), chosen by the draw. ",
    "sg.info.punti": "Everyone plays everyone: {turni} rounds, {partite} matches.",
    "sg.info.riposo": " Each round, one player sits out.",
    "sg.doppione": "Two players are named \"{nome}\": change one of the names.",

    // ---------- Draw ----------
    "car.sopra": "New tournament",
    "car.titolo": "Drawing the pairings",
    "car.m1": "Shuffling the players",
    "car.m2": "Making the pairings",
    "car.m3": "Building the bracket",

    // ---------- Round names ----------
    "turno.finale": "Final",
    "turno.semi": "Semifinals",
    "turno.quarti": "Quarterfinals",
    "turno.ottavi": "Round of 16",
    "turno.n": "Round {n}",
    "match.n": "Match {n}",
    "partita.n": "Match {n}",

    // ---------- Bracket ----------
    "tab.titolo": "Tournament",
    "tab.giocatori": "{n} players",
    "tab.incorso": "Current round",
    "tab.turnodi": "Round {n} of {tot}",
    "tab.concluse1": "{f} of {t} match finished",
    "tab.concluseN": "{f} of {t} matches finished",
    "tab.riposa": " · {nome} sits out",
    "tab.concludi": "Finish the tournament",
    "tab.prosegui": "Continue: {turno}",
    "tab.tutte": "All matches in this round are finished.",
    "tab.manca1": "1 match left. Tap a match to play it or set the result.",
    "tab.mancanoN": "{n} matches left. Tap a match to play it or set the result.",
    "tab.concluso": "Tournament over",
    "tab.nessuno": "No winner",
    "tab.finalesenza": "The final ended with no winner.",
    "tab.tornahome": "Back to home",
    "tab.finalebye": "Won the final without playing: the opponent had been eliminated.",
    "tab.finale": "Final: {v} beat {p}{punti}",
    "tab.campione": "Tournament champion",
    "tab.classfinale": "Final standings",
    "tab.vittoria1": "{n} win",
    "tab.vittorieN": "{n} wins",

    "carta.bye": "Bye",
    "carta.dagiocare": "To play",
    "carta.attesa": "Waiting",
    "carta.incorso": "In progress",
    "carta.passa": "Advances",
    "carta.vuota": "No players",
    "carta.doppia": "Double loss",
    "carta.conclusa": "Finished",
    "carta.definire": "TBD",

    "cl.titolo": "Standings",
    "cl.giocatore": "Player",
    "cl.V": "W",
    "cl.P": "L",
    "cl.duel": "Duels",
    "cl.G": "Pld",
    "cl.V.t": "Matches won",
    "cl.P.t": "Matches lost",
    "cl.duel.t": "Duels won and lost",
    "cl.G.t": "Matches played",
    "cl.legenda": "W won · L lost · Pld played. Ties on wins are broken by duel difference, then head-to-head.",

    "punti.partite": "Matches this round",
    "punti.ultimo": "Last round",
    "punti.manca1": "1 round left after this one.",
    "punti.mancanoN": "{n} rounds left after this one.",
    "punti.giocati": "Rounds played ({n})",
    "punti.riposa": " · {nome} sits out",
    "punti.riposaTitolo": "Sitting out: {nome}",

    // ---------- Match panel ----------
    "pm.aria": "Tournament match",
    "pm.dagiocare": "To play.",
    "pm.incorso": "In progress: duel {d}, {a} {va}–{vb} {b}",
    "pm.rimasti": "{tempo} left",
    "pm.doppia.elim": "Double loss: neither player advances.",
    "pm.doppia.punti": "Double loss: the match counts as a loss for both.",
    "pm.vince": "{v} wins{punti}.",
    "pm.gioca": "Play the match",
    "pm.bo3": "Best of 3",
    "pm.uno": "Single duel",
    "pm.senzatempo": "no time limit",
    "pm.finale": " (final)",
    "pm.timer": "{m}-minute timer",
    "pm.giocaduel": "Play the duel",
    "pm.riprendi": "Resume the duel",
    "pm.apri": "Open the played duel",
    "pm.correggi": "Correct the result",
    "pm.assegna": "Set the result without playing",
    "pm.punteggio": "Score",
    "pm.punteggio.aria": "Match score",
    "pm.vincebtn": "{nome} wins",
    "pm.doppiabtn": "Double loss",
    "pm.azzera": "Reset the match",
    "pm.azzera.conf": "Click again: the played duel will be lost",
    "pm.chiuso.torneo": "The tournament is over: the result can't be changed.",
    "pm.chiuso.turno": "This round is closed: the result can't be changed.",

    "toast.5min": "{chi}: 5 minutes left",
    "toast.scaduto": "Time's up: double loss",
    "toast.scadutoIn": "Time's up in {chi}: double loss",

    // ---------- Table ----------
    "tav.tempo": "Match time",
    "tav.pausa": "Pause",
    "tav.riprendi": "Resume",
    "tav.senzatempo": "No time limit",
    "tav.standard": "Standard · best of 3",
    "tav.casual": "Casual",
    "tav.duel": "Duel {n}",
    "tav.pareggio": "draw",
    "tav.tabellone": "Bracket",
    "tav.duelvinti": "Duels won",
    "tav.vittorie": "Wins: {n}",
    "tav.turno": "Turn {n}",
    "tav.tocca": "{nome}'s turn",
    "tav.passaturno": "End turn",
    "tav.fasesucc": "Next phase",
    "tav.primoturno": "First turn: {nome} doesn't draw and has no Battle Phase.",
    "tav.annulla": "Undo",
    "tav.moneta": "Coin",
    "tav.dado": "Die",
    "tav.entrambi": "Damage to both",
    "tav.entrambi.aria": "Damage to both players",
    "tav.applica": "Apply",
    "tav.tasti": "<kbd>Space</kbd> phase · <kbd>Z</kbd> undo · <kbd>P</kbd> pause · <kbd>1</kbd> <kbd>2</kbd> type LP",
    "tav.cronologia": "Duel history",
    "tav.recente": "Newest first",
    "tav.log.vuoto": "No changes in this duel yet. Every life point change, coin toss or die roll will show up here with its turn and phase.",
    "tav.log.moneta": "Coin: {esito}",
    "tav.log.dado": "Die: {esito}",
    "tav.diturno": "Active",
    "tav.lp": "LIFE POINTS",
    "tav.lp.ph": "e.g. 2400 or +1000",
    "tav.lp.aria": "Life point change",
    "tav.meta": "Half",
    "tav.lp.errore": "Type a number: 2400 subtracts, +1000 adds.",
    "tav.aria.partita": "Game",
    "tav.aria.cronologia": "History",
    "tav.aria.fasi": "Go to a phase",

    "es.scaduto": "Time's up: double loss",
    "es.scaduto.sotto": "Nobody won the match before time ran out ({a}–{b}).",
    "es.vincematch": "{nome} wins the match",
    "es.risultato": "Result {a}–{b}.",
    "es.giatab": " The result is already in the bracket.",
    "es.tornatab": "Back to bracket",
    "es.rigioca": "Play again with the same settings",
    "es.nuova": "New game",
    "es.matchconcluso": "Match over",
    "es.pareggio": "The duel is a draw",
    "es.vinceduel": "{nome} wins the duel",
    "es.chiudimatch": "Confirm and close the match",
    "es.rivincita": "Rematch",
    "es.prossimo": "Next duel",
    "es.dom.pareggio": "Play another duel. Who goes first?",
    "es.dom.rivincita": "Who goes first in the rematch?",
    "es.dom.perso": "The loser chooses who goes first.",
    "es.inizia": "{etichetta}: {nome} goes first",
    "es.fineduel": "Duel over",
    "es.annulla": "Mistake? Undo the last change",

    // ---------- History and favorites ----------
    "home.cronologia": "Match history",
    "home.preferiti": "Favorites",
    "cr.aria": "History and favorites",
    "cr.titolo": "History",
    "pref.titolo": "Favorites",
    "cr.intro": "The last {max} finished games, newest first. When a new one arrives, the oldest is deleted. Tap the star to save one to your favorites.",
    "pref.intro": "Saved games stay here until you remove the star.",
    "cr.vuota": "No finished games yet. Finished duels and tournaments show up here with date and time.",
    "pref.vuota": "No favorites yet. Tap the star on a game in the history, or at the end of a duel or tournament, to save it here.",
    "pref.salva": "Save to favorites",
    "pref.salvato": "In favorites",
    "pref.togli": "Remove from favorites",
    "cr.indietro": "← History",
    "pref.indietro": "← Favorites",
    "cr.duello": "Duel",
    "cr.torneo": "Tournament",
    "cr.vince.punti": "{nome} wins {a}–{b}",
    "cr.vince": "{nome} wins",
    "cr.contro": "against {nome}",
    "cr.doppia": "Double loss",
    "cr.pareggio": "Draw",
    "cr.tra": "{a} and {b}",
    "cr.registro": "Life point log",
    "cr.duel.vince": "{nome} wins",
    "cr.duel.pareggio": "draw",
    "cr.duel.interrotto": "stopped by time",
    "cr.nessunevento": "No life point changes in this duel.",
    "cr.piazzamenti": "Placements",
    "cr.risultati": "Results",
    "cr.campione": "Champion",
    "cr.eliminato": "Out · {turno}",
    "cr.r.bye": "{nome} advances (bye)",
    "cr.r.doppia": "{a} and {b}: double loss",
    "cr.r.vince": "{v} beat {p}{punti}",
  },
};

// ---------- Regole (finestra del punto interrogativo) ----------

const REGOLE = {
  it: `
    <section>
      <h3>Duello</h3>
      <ul>
        <li><strong>Standard</strong>: match al meglio di 3 con un timer unico per tutto il match (50 minuti di base). Vince chi arriva per primo a 2 duel vinti. Se il tempo finisce prima, il match è una doppia sconfitta, come nella Tournament Policy attuale. Se dopo 3 duel nessuno ha 2 vittorie (per dei pareggi) e c'è ancora tempo, si gioca un 4° duel.</li>
        <li><strong>Casual</strong>: un duel alla volta, con rivincite e un contatore delle vittorie. Il timer è spento di base e, se lo accendi, è solo un promemoria.</li>
      </ul>
    </section>
    <section>
      <h3>Life point</h3>
      <ul>
        <li>Ognuno parte da 8000. Scrivi <kbd>2400</kbd> per togliere o <kbd>+1000</kbd> per aggiungere, oppure usa i tasti rapidi e "Metà".</li>
        <li>"Danno a entrambi" toglie lo stesso valore ai due giocatori in un colpo solo: se arrivano a 0 insieme, il duel è in pareggio.</li>
        <li>Ogni cambio finisce nella cronologia con turno e fase. "Annulla" toglie l'ultimo, anche a duel finito, finché non confermi il risultato.</li>
      </ul>
    </section>
    <section>
      <h3>Fasi</h3>
      <ul>
        <li>Il pulsante grande passa alla fase successiva. Dopo la End Phase il turno passa all'avversario. Le sigle (DP, SP, M1…) saltano direttamente a una fase.</li>
        <li>Al primo turno chi inizia non pesca e non ha la Battle Phase: Draw, Battle e Main Phase 2 compaiono dal turno 2.</li>
        <li>Le fasi sono un promemoria: life point e timer funzionano anche se la fase indicata è sbagliata.</li>
      </ul>
    </section>
    <section>
      <h3>Torneo</h3>
      <ul>
        <li>Da 4 a 16 giocatori, abbinamenti sorteggiati. I match sono <strong>Standard</strong> (al meglio di 3, con timer) o <strong>Casual</strong> (un duel decide il match, un pareggio si rigioca).</li>
        <li><strong>Eliminazione diretta</strong>: chi perde è fuori. Se i giocatori non sono 4, 8 o 16, alcuni passano direttamente al secondo turno (bye), scelti dal sorteggio. Con una doppia sconfitta non passa nessuno dei due e l'avversario del turno dopo avanza. La finale si gioca senza limite di tempo.</li>
        <li><strong>A punti</strong>: tutti contro tutti, una volta sola. Con un numero dispari di giocatori, a ogni turno uno riposa. In classifica contano i match vinti; a parità, la differenza tra duel vinti e persi, poi lo scontro diretto.</li>
        <li>Tocca un match nel tabellone per giocarlo sul tavolo, riprenderlo o assegnare il risultato senza giocarlo. Dal tavolo, "Tabellone" torna indietro senza fermare il duel.</li>
        <li>Quando tutte le partite del turno sono concluse, "Prosegui" prepara il turno successivo. Da quel momento i risultati del turno chiuso non si possono più cambiare.</li>
      </ul>
    </section>
    <section>
      <h3>Cronologia e preferiti</h3>
      <ul>
        <li>L'orologio nella Home apre la cronologia: le ultime 15 partite concluse, con data e ora. Quando ne arriva una nuova, la più vecchia si cancella.</li>
        <li>Nello Standard una partita è il match intero; nel Casual ogni duel finito è una partita a sé. Aprendo un duello vedi il registro dei life point di ogni duel; aprendo un torneo vedi la classifica o i piazzamenti.</li>
        <li>Tocca la stella, nella cronologia o alla fine di un duello o di un torneo: diventa gialla e la partita va nei preferiti, dove resta anche quando esce dalla cronologia.</li>
      </ul>
    </section>
    <section>
      <h3>Tasti rapidi sul tavolo</h3>
      <ul class="tasti-regole">
        <li><kbd>Spazio</kbd> fase successiva</li>
        <li><kbd>Z</kbd> annulla l'ultima modifica</li>
        <li><kbd>P</kbd> mette in pausa il timer</li>
        <li><kbd>1</kbd> <kbd>2</kbd> scrivi i life point del giocatore 1 o 2</li>
      </ul>
    </section>
    <p class="nota">Duelli e tornei restano salvati in questo browser anche se chiudi o ricarichi la pagina.</p>`,

  en: `
    <section>
      <h3>Duel</h3>
      <ul>
        <li><strong>Standard</strong>: best of 3 match with a single timer for the whole match (50 minutes by default). The first player to win 2 duels wins. If time runs out first, the match is a double loss, as in the current Tournament Policy. If after 3 duels nobody has 2 wins (because of draws) and there is time left, a 4th duel is played.</li>
        <li><strong>Casual</strong>: one duel at a time, with rematches and a win counter. The timer is off by default and, if you turn it on, it's only a reminder.</li>
      </ul>
    </section>
    <section>
      <h3>Life points</h3>
      <ul>
        <li>Everyone starts at 8000. Type <kbd>2400</kbd> to subtract or <kbd>+1000</kbd> to add, or use the quick buttons and "Half".</li>
        <li>"Damage to both" takes the same amount from both players at once: if both reach 0 together, the duel is a draw.</li>
        <li>Every change goes into the history with its turn and phase. "Undo" removes the last one, even after a duel ends, until you confirm the result.</li>
      </ul>
    </section>
    <section>
      <h3>Phases</h3>
      <ul>
        <li>The big button moves to the next phase. After the End Phase the turn passes to the opponent. The short labels (DP, SP, M1…) jump straight to a phase.</li>
        <li>On the first turn the starting player doesn't draw and has no Battle Phase: Draw, Battle and Main Phase 2 appear from turn 2.</li>
        <li>Phases are a reminder: life points and the timer keep working even if the phase shown is wrong.</li>
      </ul>
    </section>
    <section>
      <h3>Tournament</h3>
      <ul>
        <li>4 to 16 players, random pairings. Matches are <strong>Standard</strong> (best of 3, with a timer) or <strong>Casual</strong> (one duel decides the match, a draw is replayed).</li>
        <li><strong>Single elimination</strong>: lose and you're out. If there aren't 4, 8 or 16 players, some go straight to round 2 (bye), chosen by the draw. After a double loss neither player advances, and their next-round opponent goes through. The final has no time limit.</li>
        <li><strong>Round robin</strong>: everyone plays everyone once. With an odd number of players, one sits out each round. Standings count matches won; ties are broken by the difference between duels won and lost, then head-to-head.</li>
        <li>Tap a match in the bracket to play it at the table, resume it, or set the result without playing. From the table, "Bracket" goes back without stopping the duel.</li>
        <li>When every match in the round is finished, "Continue" sets up the next round. From then on, the results of the closed round can't be changed.</li>
      </ul>
    </section>
    <section>
      <h3>History and favorites</h3>
      <ul>
        <li>The clock on the Home screen opens the history: the last 15 finished games, with date and time. When a new one arrives, the oldest is deleted.</li>
        <li>In Standard a game is the whole match; in Casual every finished duel is a game of its own. Open a duel to see the life point log of each duel; open a tournament to see the standings or placements.</li>
        <li>Tap the star, in the history or at the end of a duel or tournament: it turns yellow and the game goes to your favorites, where it stays even after it leaves the history.</li>
      </ul>
    </section>
    <section>
      <h3>Table shortcuts</h3>
      <ul class="tasti-regole">
        <li><kbd>Space</kbd> next phase</li>
        <li><kbd>Z</kbd> undo the last change</li>
        <li><kbd>P</kbd> pause the timer</li>
        <li><kbd>1</kbd> <kbd>2</kbd> type life points for player 1 or 2</li>
      </ul>
    </section>
    <p class="nota">Duels and tournaments stay saved in this browser even if you close or reload the page.</p>`,
};

// ---------- Funzioni ----------

function linguaPredefinita() {
  try {
    const l = (navigator.language || "it").slice(0, 2).toLowerCase();
    return l === "it" ? "it" : "en";
  } catch (e) {
    return "it";
  }
}

function lingua() {
  return LINGUE.includes(app.lingua) ? app.lingua : "it";
}

// tr("tav.tocca", { nome: "Marco" }) -> "Tocca a Marco"
function tr(chiave, valori = {}) {
  const testo = TESTI[lingua()][chiave] ?? TESTI.it[chiave] ?? chiave;
  return testo.replace(/\{(\w+)\}/g, (_, n) => (valori[n] !== undefined ? valori[n] : `{${n}}`));
}

// Il nome di base di un giocatore è "Giocatore N" o "Player N" a seconda della lingua
function eNomePredefinito(testo, n) {
  return LINGUE.some((l) => testo === TESTI[l]["giocatore.n"].replace("{n}", n));
}

// Aggiorna tutti i testi fissi della pagina (attributi data-t…)
function applicaLingua() {
  document.documentElement.lang = lingua();
  $$("[data-t]").forEach((el) => { el.textContent = tr(el.dataset.t); });
  $$("[data-t-html]").forEach((el) => { el.innerHTML = tr(el.dataset.tHtml); });
  $$("[data-t-ph]").forEach((el) => { el.placeholder = tr(el.dataset.tPh); });
  $$("[data-t-aria]").forEach((el) => { el.setAttribute("aria-label", tr(el.dataset.tAria)); });
  $$("[data-t-title]").forEach((el) => { el.title = tr(el.dataset.tTitle); });
  $("#regole-corpo").innerHTML = REGOLE[lingua()];
  // I nomi di base nel setup del duello seguono la lingua; quelli scritti a mano restano
  ["#nome0", "#nome1"].forEach((id, i) => {
    const el = $(id);
    if (eNomePredefinito(el.value, i + 1)) el.value = tr("giocatore.n", { n: i + 1 });
  });
  aggiornaBottoniSuono();
}
