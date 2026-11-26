/**
 * Die Präsentationen ausser dem Briefing: Wochenrückblick, Morgen Check-in,
 * Auswertung, Monatsrückblick, Ende eines Trainingsblocks, Abschluss eines
 * Trainings und Kopf leeren.
 *
 * Alle laufen über dieselbe Bühne wie das Briefing, `briefingZeigen` in
 * briefing-show.js, mit denselben Gesten und denselben Karten. Hier steht nur,
 * welche Karten in welcher Reihenfolge kommen. Gerechnet wird vorher, im Kern
 * oder in assistant.js: jede Zahl auf einer Karte stammt aus einer Funktion,
 * die auch der Text für Chat und Bericht benutzt.
 *
 * Eine Karte trägt eine Zahl, einen Gedanken oder höchstens fünf Zeilen. Eine
 * Karte ohne Inhalt fällt weg, statt leer dazustehen. Am Ende steht immer
 * eine Karte mit Knöpfen, sie läuft nicht von selbst weiter.
 *
 * Nichts hier fasst `document` oder `window` an, die Tests laufen ohne
 * Browser.
 */

/** Die Farben aus den Familien von Makros und Bereichen im dunklen Modus. */
export const STORY_TON = {
  marke: "#96d8f0", gruen: "#2ec28c", tuerkis: "#42bad3", rose: "#e694ad",
  violett: "#b6a0e9", gelb: "#e5b55c", gruen2: "#2ec379",
};

const zahlDe = (x, stellen = 1) => new Intl.NumberFormat("de-DE", { maximumFractionDigits: stellen }).format(x);
const mehrzahl = (n, eins, viele) => `${n} ${n === 1 ? eins : viele}`;
const nurMit = (liste) => liste.filter(Boolean);

/* ---------- 1. Wochenrückblick ---------- */

/** `r` ist das Ergebnis von `wochenrueckblick` im Kern, mit `zahlen`. */
export function rueckblickFolien(r) {
  if (!r) return [];
  const z = r.zahlen ?? {};
  const woche = r.art === "woche";
  const zeitraum = woche ? "diese Woche" : "seit Montag";
  const folien = [];
  folien.push({
    art: "titel", zeichen: "kalender", ton: STORY_TON.marke,
    etikett: woche ? "Wochenrückblick" : "Zwischenstand",
    titel: woche ? "Deine Woche" : "Halbzeit",
    unter: `${mehrzahl(z.tage ?? 0, "Tag", "Tage")} ${zeitraum}`,
    zeile: "Die Zahlen, was gut lief, was besser geht, und ein Fokus.",
  });
  folien.push({
    art: "zahl", zeichen: "essen", ton: STORY_TON.tuerkis, etikett: "Eingetragen",
    zahl: String(z.eingetragen ?? 0), einheit: `von ${z.tage ?? 0} Tagen`,
    unter: z.eingetragen === z.tage ? "Jeden Tag eingetragen." : "Ernährung eingetragen.",
    satz: z.gezaehlt < z.eingetragen
      ? `${mehrzahl(z.eingetragen - z.gezaehlt, "Tag sieht", "Tage sehen")} unvollständig aus und ${z.eingetragen - z.gezaehlt === 1 ? "zählt" : "zählen"} nicht mit.`
      : "",
    anpassen: { id: "nachtragen", text: "Essen nachtragen" },
  });
  if (z.proteinSchnitt != null && z.kcalSchnitt != null) {
    folien.push({
      art: "ringe", zeichen: "ziel", ton: STORY_TON.gruen, etikett: "Im Schnitt",
      ringe: [
        { wert: z.proteinSchnitt, ziel: z.proteinZiel, ton: STORY_TON.gruen, beschriftung: "Protein", einheit: "g" },
        { wert: z.kcalSchnitt, ziel: z.kcalZiel, ton: STORY_TON.marke, beschriftung: "Kalorien", einheit: "kcal" },
      ],
      satz: `Protein an ${z.proteinGedeckt} von ${z.gezaehlt} Tagen gedeckt, Kalorien ${z.kcalGetroffen ? `an ${z.kcalGetroffen} getroffen` : "an keinem Tag getroffen"}.`,
    });
  }
  const zeilen = nurMit([
    z.wasserProzent != null ? { name: "Wasser", wert: `${z.wasserProzent} %` } : null,
    z.schlafStunden != null ? { name: "Schlaf im Schnitt", wert: `${zahlDe(z.schlafStunden)} h` } : null,
    z.gewichtDiff != null ? { name: "Gewicht", wert: `${z.gewichtDiff > 0 ? "+" : ""}${zahlDe(z.gewichtDiff)} kg` } : null,
  ]);
  if ((z.geplant ?? 0) > 0 || (z.trainiert ?? 0) > 0) {
    folien.push({
      art: "zahl", zeichen: "hantel", ton: STORY_TON.violett, etikett: "Training",
      zahl: String(z.trainiert ?? 0), einheit: z.geplant ? `von ${z.geplant} Einheiten` : (z.trainiert === 1 ? "Einheit" : "Einheiten"),
      unter: z.geplant && z.trainiert >= z.geplant ? "Alles gemacht, was geplant war." : "Aus App, Apple Health und Kalender.",
      zeilen,
    });
  } else if (zeilen.length) {
    folien.push({ art: "zahl", zeichen: "bett", ton: STORY_TON.violett, etikett: "Dazu", zahl: zeilen[0].wert, einheit: zeilen[0].name, zeilen: zeilen.slice(1) });
  }
  if (r.gut?.length) folien.push({ art: "punkte", zeichen: "haken", ton: STORY_TON.gruen2, etikett: "Das lief gut", punkte: r.gut.slice(0, 4).map((t) => ({ titel: t })) });
  if (r.besser?.length) folien.push({ art: "punkte", zeichen: "achtung", ton: STORY_TON.gelb, etikett: "Das geht besser", punkte: r.besser.slice(0, 4).map((t) => ({ titel: t })) });
  if (r.tipps?.length > 1) folien.push({ art: "punkte", zeichen: "stift", ton: STORY_TON.tuerkis, etikett: "Konkret", punkte: r.tipps.slice(1, 3).map((t) => ({ titel: t, zeichen: "stift" })) });
  folien.push({
    art: "frage", zeichen: "ziel", ton: STORY_TON.marke,
    etikett: woche ? "Fokus für nächste Woche" : "Fokus für den Rest der Woche",
    titel: r.fokus, satz: r.tipps?.[0] && r.tipps[0] !== r.fokus ? r.tipps[0].slice(r.fokus.length).trim() : "",
    anpassen: { id: "fokus-aufgabe", text: "Als Aufgabe merken", zeichen: "haken" },
  });
  folien.push({
    art: "schluss", zeichen: "haken", ton: STORY_TON.marke,
    titel: woche ? "Gute neue Woche" : "Weiter so",
    satz: "Der ganze Rückblick steht unter Bericht.",
    knoepfe: [{ id: "nochmal", text: "Nochmal", zweit: true }, { id: "fertig", text: "Fertig" }],
  });
  return folien;
}

/* ---------- 2. Morgen Check-in ---------- */

const MORGEN_TON = { hoch: STORY_TON.gruen, normal: STORY_TON.marke, reduziert: STORY_TON.gelb, niedrig: STORY_TON.rose, schonen: STORY_TON.rose };
const STUFE_NAME = { hoch: "Hoch", normal: "Normal", reduziert: "Reduziert", niedrig: "Niedrig", schonen: "Schonen" };

/** `r` ist das Ergebnis von `morgenAuswerten`, `datum` ein fertiger Text. */
export function morgenFolien(r, { datum = "", gruss = "Guten Morgen", mitBriefing = true } = {}) {
  if (!r) return [];
  const ton = MORGEN_TON[r.belastbarkeit] ?? STORY_TON.marke;
  const folien = [{ art: "titel", zeichen: "sonne", ton: STORY_TON.marke, etikett: "Morgen Check-in", titel: gruss, unter: datum }];
  folien.push(r.gestrichen
    ? { art: "zahl", zeichen: "bett", ton, etikett: "Heute", zahl: "Ruhetag", unter: "Das Training ist gestrichen.", satz: r.warum }
    : { art: "zahl", zeichen: "blitz", ton, etikett: "Dein Morgenwert", zahl: String(r.wert), einheit: "von 100",
        unter: `Belastbarkeit heute: ${STUFE_NAME[r.belastbarkeit] ?? r.belastbarkeit}`, satz: r.warum });
  if (r.training?.length) {
    folien.push({ art: "punkte", zeichen: "hantel", ton: STORY_TON.violett, etikett: "Training heute",
      punkte: r.training.slice(0, 4).map((t) => ({ titel: t })), anpassen: { id: "plan", text: "Trainingsplan öffnen" } });
  }
  if (r.tipps?.length) {
    folien.push({ art: "punkte", zeichen: "sonne", ton: STORY_TON.tuerkis, etikett: "Für heute", punkte: r.tipps.slice(0, 3).map((t) => ({ titel: t, zeichen: "haken" })) });
  }
  folien.push({
    art: "schluss", zeichen: "sonne", ton: STORY_TON.marke, titel: "Los geht’s",
    satz: mitBriefing ? "Jetzt dein Tag in einer Minute." : "Das ist keine Messung, sondern deine Einschätzung, zusammengefasst.",
    knoepfe: mitBriefing
      ? [{ id: "fertig", text: "Fertig", zweit: true }, { id: "briefing", text: "Tagesbriefing" }]
      : [{ id: "nochmal", text: "Nochmal", zweit: true }, { id: "fertig", text: "Fertig" }],
  });
  return folien;
}

/* ---------- 3. Auswertung ---------- */

/**
 * Eine Karte je Befund, mit einer grossen Zahl und einer Frage. Ein
 * Zusammenhang ist keine Ursache, das sagt jede Karte eines Musters dazu.
 */
export function auswertungFolien({ befunde = [], widersprueche = [], tage = 0 } = {}) {
  const folien = [{
    art: "titel", zeichen: "muster", ton: STORY_TON.marke, etikett: "Auswertung",
    titel: "Was die Zahlen zeigen", unter: tage ? `Aus ${mehrzahl(tage, "Tag", "Tagen")}` : "",
    zeile: widersprueche.length + befunde.length
      ? `${mehrzahl(widersprueche.length + befunde.length, "Punkt", "Punkte")}, jeder mit einer Frage an dich.`
      : "Noch nichts, das sich belegen lässt.",
  }];
  for (const w of widersprueche.slice(0, 5)) {
    folien.push({
      art: "frage", zeichen: "achtung", ton: STORY_TON.gelb, etikett: w.thema,
      zahl: w.zahl ?? null, einheit: w.einheit ?? "",
      titel: w.wirklichkeit, satz: w.anspruch, frage: w.frage,
    });
  }
  for (const b of befunde.slice(0, 4)) {
    const plus = b.r > 0;
    folien.push({
      art: "frage", zeichen: "muster", ton: STORY_TON.violett, etikett: `${b.treiber} und ${b.ziel}`,
      zahl: `${zahlDe(b.oben)} zu ${zahlDe(b.unten)}`, einheit: b.ziel,
      titel: plus ? `Mehr ${b.treiber}, mehr ${b.ziel}.` : `Mehr ${b.treiber}, weniger ${b.ziel}.`,
      satz: b.satz,
      frage: "Passt das zu dem, was du erlebst? Ein Zusammenhang ist noch keine Ursache.",
    });
  }
  if (folien.length === 1) {
    folien[0].zeile = "Für Muster braucht daevo mindestens zehn Tage mit Einträgen. Bis dahin sammelt es nur.";
  }
  folien.push({
    art: "schluss", zeichen: "muster", ton: STORY_TON.marke, titel: "Das war’s",
    satz: "Willst du über einen Punkt reden, frag den Coach.",
    knoepfe: [{ id: "nochmal", text: "Nochmal", zweit: true }, { id: "fertig", text: "Fertig" }],
  });
  return folien;
}

/* ---------- 4. Monatsrückblick ---------- */

const BERICHT_BILD = {
  kalorien: ["blitz", STORY_TON.marke], protein: ["ziel", STORY_TON.gruen], wasser: ["essen", STORY_TON.tuerkis],
  training: ["hantel", STORY_TON.violett], einheiten: ["hantel", STORY_TON.violett], schlaf: ["bett", STORY_TON.violett],
  schlafqualitaet: ["mond", STORY_TON.violett], energie: ["blitz", STORY_TON.gelb], gewicht: ["trend", STORY_TON.rose],
};

/**
 * Wie ein Jahresrückblick, nur für einen Monat: eine Zahl je Karte, der
 * Verlauf als Linie darunter, am Ende ein Bild zum Teilen. Werte, die
 * mangels Abdeckung nicht ausgegeben werden, fehlen auch hier.
 */
export function monatsFolien(b, { name = "Monat", titel = `Dein ${name}`, ende = `Das war dein ${name}`, etikett = "Monatsrückblick" } = {}) {
  if (!b) return [];
  const folien = [{
    art: "titel", zeichen: "kalender", ton: STORY_TON.marke, etikett,
    titel, unter: `${b.tageMitDaten} von ${b.tageGesamt} Tagen eingetragen`,
    zeile: b.tageMitDaten ? "Eine Zahl je Karte. Tipp rechts für die nächste." : "In diesem Monat steht noch nichts.",
  }];
  for (const w of b.werte ?? []) {
    if (!w.zahl || w.zahl === "–") continue;
    const [zeichen, ton] = BERICHT_BILD[w.schluessel] ?? ["muster", STORY_TON.marke];
    folien.push({
      art: "zahl", zeichen, ton, etikett: w.name, zahl: w.zahl, einheit: w.einheit,
      unter: w.zusatz ? `${w.zusatz[0].toUpperCase()}${w.zusatz.slice(1)}` : "",
      trend: w.trend, verlauf: w.verlauf, satz: `Aus ${mehrzahl(w.tage, "Tag", "Tagen")}.`,
    });
  }
  if (b.fazit?.length) folien.push({ art: "punkte", zeichen: "stift", ton: STORY_TON.tuerkis, etikett: "Fazit", punkte: b.fazit.map((t) => ({ titel: t })) });
  folien.push({
    art: "schluss", zeichen: "teilen", ton: STORY_TON.marke, titel: ende,
    satz: "Als Bild für deine Story, ohne Gewicht und ohne Notizen.",
    knoepfe: [{ id: "teilen", text: "Als Story teilen" }, { id: "nochmal", text: "Nochmal", zweit: true }, { id: "fertig", text: "Fertig", zweit: true }],
  });
  return folien;
}

/**
 * Welche Werte auf das Bild zum Teilen kommen. Das Gewicht nicht: wer seinen
 * Monat teilt, will nicht automatisch sein Körpergewicht zeigen.
 */
export function monatsBildWerte(b) {
  return (b?.werte ?? [])
    .filter((w) => w.zahl && w.zahl !== "–" && w.schluessel !== "gewicht")
    .slice(0, 6)
    .map((w) => ({ name: w.name, zahl: w.zahl, einheit: w.einheit, ton: (BERICHT_BILD[w.schluessel] ?? [null, STORY_TON.marke])[1] }));
}

/* ---------- 5. Ende eines Trainingsblocks ---------- */

/** Geschätzte Maximalkraft nach Epley, mit der Reserve zu den Wiederholungen gezählt. */
export function epley(kg, wdh, rir = 0) {
  const n = (Number(wdh) || 0) + (Number(rir) || 0);
  return kg > 0 && n > 0 ? kg * (1 + n / 30) : 0;
}

/**
 * Zahlen eines Blocks aus dem Protokoll: ab `beginn` bis `heute`. `trend`
 * ist `uebungsTrend` aus dem Kern, `name` liefert den Namen einer Übung.
 */
export function blockDaten({ log = [], beginn, heute, wochen, trend, name = (id) => id }) {
  const im = log.filter((e) => e.datum >= beginn && e.datum <= heute && e.saetze?.length);
  const einheiten = new Set(im.map((e) => `${e.datum}|${e.einheit ?? ""}`)).size;
  const saetze = im.reduce((s, e) => s + e.saetze.length, 0);
  const volumenKg = Math.round(im.reduce((s, e) => s + e.saetze.reduce((t, x) => t + (x.kg > 0 ? x.kg * (x.wdh || 0) : 0), 0), 0));
  const ids = [...new Set(im.map((e) => e.uebung))];
  const trends = trend ? ids.map((id) => ({ id, name: name(id), ...trend(id) })).filter((t) => t.prozent != null) : [];
  return {
    wochen, einheiten, saetze, volumenKg,
    besser: trends.filter((t) => t.art === "steigt").sort((a, b) => b.prozent - a.prozent).slice(0, 3),
    fest: trends.filter((t) => t.art !== "steigt").sort((a, b) => a.prozent - b.prozent).slice(0, 3),
  };
}

const prozentText = (p) => `${p > 0 ? "+" : ""}${zahlDe(p)} %`;

/** Nach acht Wochen die Prüfung, nach zwölf das Ende. `getauscht` aus der Prüfung, wenn es eine gab. */
export function blockFolien(d, { titel = "Dein Plan", getauscht = [] } = {}) {
  if (!d) return [];
  const ende = d.wochen >= 12;
  const folien = [{
    art: "titel", zeichen: "fahne", ton: STORY_TON.violett, etikett: ende ? "Trainingsblock geschafft" : "Acht Wochen",
    titel: ende ? "Zwölf Wochen" : "Halbzeit plus", unter: titel,
    zeile: ende ? "Durchgezogen. Genau daran zeigt sich Fortschritt." : "Zeit für die Prüfung: was wächst, bleibt, was steht, wird getauscht.",
  }];
  folien.push({
    art: "zahl", zeichen: "hantel", ton: STORY_TON.violett, etikett: "Trainiert",
    zahl: String(d.einheiten), einheit: d.einheiten === 1 ? "Einheit" : "Einheiten",
    unter: !d.einheiten ? "Im Protokoll steht kein Training aus diesem Block." : d.wochen ? `Im Schnitt ${zahlDe(d.einheiten / d.wochen)} je Woche.` : "",
    zeilen: nurMit([
      d.saetze ? { name: "Sätze", wert: zahlDe(d.saetze, 0) } : null,
      d.volumenKg > 0 ? { name: "Bewegt", wert: `${zahlDe(d.volumenKg / 1000)} t` } : null,
    ]),
  });
  if (d.besser.length) {
    folien.push({ art: "punkte", zeichen: "trend", ton: STORY_TON.gruen, etikett: "Am meisten zugelegt",
      punkte: d.besser.map((t) => ({ titel: t.name, text: `${prozentText(t.prozent)} geschätzte Kraft in ${t.einheiten} Einheiten`, zeichen: "trend" })) });
  }
  if (getauscht.length) {
    folien.push({ art: "punkte", zeichen: "achtung", ton: STORY_TON.gelb, etikett: "Getauscht",
      punkte: getauscht.slice(0, 4).map((g) => ({ titel: `${g.alt} wird ${g.neu}`, text: g.prozent != null ? `${prozentText(g.prozent)} in acht Wochen` : "Acht Wochen ohne Zuwachs" })) });
  } else if (d.fest.length) {
    folien.push({ art: "punkte", zeichen: "achtung", ton: STORY_TON.gelb, etikett: "Steht gerade",
      punkte: d.fest.map((t) => ({ titel: t.name, text: `${prozentText(t.prozent)} in ${t.einheiten} Einheiten` })) });
  }
  folien.push({
    art: "schluss", zeichen: "fahne", ton: STORY_TON.violett,
    titel: ende ? "Der nächste Block" : "Weiter geht’s",
    satz: ende ? "Deine Gewichte bleiben gespeichert, der neue Plan startet mit ihnen." : "Vier Wochen bleiben mit den getauschten Übungen.",
    knoepfe: ende
      ? [{ id: "fertig", text: "Später", zweit: true }, { id: "anpassen", text: "Neuen Plan planen" }]
      : [{ id: "fertig", text: "Fertig", zweit: true }, { id: "plan", text: "Zum Plan" }],
  });
  return folien;
}

/* ---------- 6. Abschluss eines Trainings ---------- */

/**
 * Neue Bestwerte: der beste Satz heute gegen den besten aller früheren
 * Einheiten derselben Übung, nach geschätzter Maximalkraft. Ohne frühere
 * Einheit ist es kein Rekord, sondern ein Anfang.
 */
export function rekorde(heuteEintraege, log, datum) {
  const out = [];
  for (const e of heuteEintraege ?? []) {
    if (e.masse && e.masse.menge && e.masse.menge !== "wdh") continue;
    const heute = Math.max(0, ...(e.saetze ?? []).map((s) => epley(s.kg, s.wdh)));
    if (!heute) continue;
    const frueher = (log ?? []).filter((x) => x.uebung === e.uebung && x.datum < datum);
    if (!frueher.length) continue;
    const vorher = Math.max(0, ...frueher.flatMap((x) => x.saetze ?? []).map((s) => epley(s.kg, s.wdh)));
    if (vorher > 0 && heute > vorher * 1.005) {
      const bester = e.saetze.reduce((b, s) => (epley(s.kg, s.wdh) > epley(b.kg, b.wdh) ? s : b));
      out.push({ uebung: e.uebung, kg: bester.kg, wdh: bester.wdh, prozent: Math.round((heute / vorher - 1) * 1000) / 10 });
    }
  }
  return out.sort((a, b) => b.prozent - a.prozent);
}

/**
 * Drei Karten: Dauer und Volumen, Rekorde, Muskelkarte. `d` aus
 * `abschlussDaten`, `karte` die fertige Muskelkarte als SVG.
 */
export function trainingFolien(d, { rekordListe = [], karte = "", name = (id) => id } = {}) {
  if (!d) return [];
  const folien = [];
  folien.push({
    art: "zahl", zeichen: "hantel", ton: STORY_TON.violett, etikett: d.titel || "Training",
    zahl: d.minuten ? String(d.minuten) : String(d.saetze), einheit: d.minuten ? (d.minuten === 1 ? "Minute" : "Minuten") : (d.saetze === 1 ? "Satz" : "Sätze"),
    unter: "Stark gemacht.",
    zeilen: nurMit([
      { name: "Übungen", wert: String(d.uebungen.length) },
      d.minuten ? { name: "Sätze", wert: String(d.saetze) } : null,
      d.volumenKg > 0 ? { name: "Bewegt", wert: `${zahlDe(d.volumenKg, 0)} kg` } : { name: "Wiederholungen", wert: String(d.wdh) },
    ]),
  });
  folien.push(rekordListe.length
    ? { art: "punkte", zeichen: "krone", ton: STORY_TON.gelb, etikett: rekordListe.length === 1 ? "Neuer Bestwert" : "Neue Bestwerte",
        punkte: rekordListe.slice(0, 4).map((r) => ({ titel: name(r.uebung), text: `${zahlDe(r.kg)} kg × ${r.wdh}, ${prozentText(r.prozent)} geschätzte Kraft`, zeichen: "krone" })) }
    : { art: "zahl", zeichen: "krone", ton: STORY_TON.gelb, etikett: "Bestwerte", zahl: String(d.saetze), einheit: d.saetze === 1 ? "Satz" : "Sätze",
        unter: "Heute kein neuer Rekord.", satz: "Jeder harte Satz zählt trotzdem für den Aufbau. Rekorde kommen aus Wochen, nicht aus einem Tag." });
  const top = (d.partien ?? []).slice(0, 3).map((p) => p.name);
  if (karte) {
    folien.push({ art: "bild", zeichen: "hantel", ton: STORY_TON.marke, etikett: "Getroffen", html: karte,
      satz: top.length ? `Am meisten: ${top.join(", ")}.` : "" });
  }
  folien.push({
    art: "schluss", zeichen: "haken", ton: STORY_TON.violett, titel: "Erledigt",
    satz: "Alles steht im Protokoll und zählt fürs nächste Mal.",
    knoepfe: [{ id: "teilen", text: "Als Bild teilen" }, { id: "details", text: "Alle Übungen", zweit: true }, { id: "fertig", text: "Fertig", zweit: true }],
  });
  return folien;
}

/* ---------- 7. Kopf leeren ---------- */

/** Eine Karte je Schublade, dann genau ein erster Schritt. `e` ist ein `KopfErgebnis`. */
export function kopfFolien(e) {
  if (!e) return [];
  const folien = [{
    art: "titel", zeichen: "wolke", ton: STORY_TON.marke, etikett: "Kopf leeren",
    titel: "Sortiert", zeile: e.kern || "Alles liegt jetzt in vier Schubladen.",
  }];
  if (e.aufgaben?.length) {
    folien.push({ art: "punkte", zeichen: "haken", ton: STORY_TON.gruen2, etikett: `${mehrzahl(e.aufgaben.length, "Aufgabe", "Aufgaben")}`,
      punkte: e.aufgaben.slice(0, 5).map((a) => ({ titel: a.text, text: [a.minuten ? `${a.minuten} min` : "", a.wichtigkeit >= 3 ? "wichtig" : ""].filter(Boolean).join(" · "), zeichen: "haken" })),
      mehr: e.aufgaben.length > 5 ? `und ${e.aufgaben.length - 5} weitere unter Dein Tag` : "Angelegt und sortiert unter Dein Tag.",
      anpassen: { id: "aufgaben", text: "Aufgaben anpassen" } });
  }
  if (e.entscheidungen?.length) {
    folien.push({ art: "punkte", zeichen: "gabel", ton: STORY_TON.tuerkis, etikett: "Zu entscheiden",
      punkte: e.entscheidungen.slice(0, 4).map((t) => ({ titel: t, zeichen: "gabel" })), mehr: "Keine Aufgabe, sondern eine Weggabelung." });
  }
  if (e.sorgen?.length) {
    folien.push({ art: "punkte", zeichen: "wolke", ton: STORY_TON.violett, etikett: "Was dich beschäftigt",
      punkte: e.sorgen.slice(0, 4).map((t) => ({ titel: t, zeichen: "wolke" })), mehr: "Gemerkt, nicht auf der Liste." });
  }
  if (e.nichtBeeinflussbar?.length) {
    folien.push({ art: "punkte", zeichen: "hand", ton: STORY_TON.rose, etikett: "Liegt nicht bei dir",
      punkte: e.nichtBeeinflussbar.slice(0, 4).map((t) => ({ titel: t, zeichen: "hand" })), mehr: "Benannt und beiseitegelegt." });
  }
  if (e.ersterSchritt) {
    folien.push({ art: "frage", zeichen: "ziel", ton: STORY_TON.marke, etikett: "Dein erster Schritt",
      titel: e.ersterSchritt, satz: "Nur das, in den nächsten zehn Minuten. Der Rest wartet.", frage: e.rueckfrage || "" });
  }
  folien.push({
    art: "schluss", zeichen: "wolke", ton: STORY_TON.marke, titel: "Kopf frei",
    satz: e.regelbasiert ? "Ohne KI grob nach Wörtern sortiert. Stimmt etwas nicht, sag es im Chat." : "Fang mit dem ersten Schritt an.",
    knoepfe: [{ id: "nochmal", text: "Nochmal", zweit: true }, { id: "fertig", text: "Los" }],
  });
  return folien;
}

/* ---------- Bild zum Teilen, nur im Browser ---------- */

/**
 * Der Monat als Bild für eine Instagram Story, 1080 mal 1920. Gezeichnet und
 * kein Screenshot, wie beim Training. Höchstens sechs Zahlen, ohne Gewicht.
 */
export async function monatsBild(b, titel) {
  const B = 1080, H = 1920;
  const c = document.createElement("canvas");
  c.width = B; c.height = H;
  const g = c.getContext("2d");
  const verlauf = g.createLinearGradient(0, 0, 0, H);
  verlauf.addColorStop(0, "#0b0d10");
  verlauf.addColorStop(0.6, "#0e1620");
  verlauf.addColorStop(1, "#0f2a3a");
  g.fillStyle = verlauf;
  g.fillRect(0, 0, B, H);
  const schein = g.createRadialGradient(B / 2, 420, 40, B / 2, 420, 700);
  schein.addColorStop(0, "rgba(150,216,240,0.2)");
  schein.addColorStop(1, "rgba(150,216,240,0)");
  g.fillStyle = schein;
  g.fillRect(0, 0, B, H);
  const schrift = (gewicht, groesse, art = "Satoshi, system-ui, -apple-system, sans-serif") => `${gewicht} ${groesse}px ${art}`;
  const serif = "'Instrument Serif', Georgia, serif";
  g.textAlign = "center";
  g.fillStyle = "#96d8f0";
  g.font = schrift(600, 36);
  g.fillText("MONATSRÜCKBLICK", B / 2, 250);
  g.fillStyle = "#ffffff";
  g.font = schrift(400, 132, serif);
  g.fillText(titel.length > 16 ? `${titel.slice(0, 15)}…` : titel, B / 2, 400);
  g.fillStyle = "#8b97a8";
  g.font = schrift(500, 36);
  g.fillText(`${b.tageMitDaten} von ${b.tageGesamt} Tagen eingetragen`, B / 2, 470);
  const werte = monatsBildWerte(b);
  werte.forEach((w, i) => {
    const spalte = i % 2, zeile = Math.floor(i / 2);
    const x = spalte === 0 ? B * 0.28 : B * 0.72;
    const y = 700 + zeile * 330;
    g.fillStyle = w.ton;
    // Eine lange Zahl wie "6 h 57 min" wird kleiner, statt über den Rand zu laufen.
    let groesse = 140;
    g.font = schrift(400, groesse, serif);
    while (groesse > 60 && g.measureText(w.zahl).width > B * 0.38) { groesse -= 6; g.font = schrift(400, groesse, serif); }
    g.fillText(w.zahl, x, y);
    g.fillStyle = "#c9d3df";
    g.font = schrift(500, 38);
    g.fillText(w.einheit ? `${w.einheit}` : " ", x, y + 58);
    g.fillStyle = "#8b97a8";
    g.font = schrift(500, 32);
    g.fillText(w.name.toUpperCase(), x, y + 108);
  });
  try {
    const marke = await new Promise((ok, fehler) => { const i = new Image(); i.onload = () => ok(i); i.onerror = fehler; i.src = "brand/daevo-wordmark-white.svg"; });
    const mh = 64, mb = mh * (marke.width / marke.height || 3.2);
    g.drawImage(marke, (B - mb) / 2, H - 170, mb, mh);
  } catch {
    // Ohne Wortmarke bleibt das Bild ohne Absender, gesetzter Text ersetzt sie nicht.
  }
  return new Promise((ok) => c.toBlob(ok, "image/png"));
}

/** Teilt ein Bild, sonst lädt es herunter. Ein Abbruch im Teilen ist kein Fehler. */
export async function bildTeilen(blob, dateiname, titel) {
  const datei = new File([blob], dateiname, { type: "image/png" });
  if (navigator.canShare?.({ files: [datei] })) {
    try { await navigator.share({ files: [datei], title: titel }); return "geteilt"; } catch (e) { if (e?.name === "AbortError") return "abgebrochen"; }
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = datei.name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  return "gespeichert";
}
