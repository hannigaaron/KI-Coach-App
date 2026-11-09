/**
 * Die Bibliothek im Mahlzeit Editor: zuletzt Gegessenes, die Nährwerttabelle
 * und eigene Rezepte.
 *
 * Kein `document`, kein `window`: das Modul läuft auch in den Tests.
 */
import { foldUmlauts, naehrwerteFuer, portionsVorschlag } from "@daevo/core";
import { FOODS } from "@daevo/coach";
import { BILDER } from "./lebensmittel-bilder.js";

const norm = (t) => foldUmlauts(String(t ?? "").toLowerCase()).replace(/\s+/g, " ").trim();

/**
 * Die zuletzt gegessenen Lebensmittel, jüngstes zuerst, jedes nur einmal.
 *
 * Wer Tofu, Paprika und Ketchup an drei Tagen hintereinander isst, will sie
 * am vierten nicht suchen. Mitgegeben wird die zuletzt gegessene Menge mit
 * ihren Werten: die isst man meistens wieder, und eine Menge, die die App
 * nicht kennt, müsste sie sonst raten. Mahlzeiten aus Apple Health zählen
 * nicht, die hat jemand anderswo eingetragen und sucht sie hier nicht.
 */
export function zuletztGegessen(tage, { anzahl = 15 } = {}) {
  const gesehen = new Set();
  const aus = [];
  const sortiert = [...tage].sort((a, b) => String(b.date).localeCompare(String(a.date)));
  for (const tag of sortiert) {
    const mahlzeiten = [...(tag.meals || [])]
      .filter((m) => m.source !== "health")
      .sort((a, b) => String(b.at || "").localeCompare(String(a.at || "")));
    for (const m of mahlzeiten) {
      for (const e of [...(m.entries || [])].reverse()) {
        const k = norm(e.name);
        if (!k || gesehen.has(k) || !(Number(e.kcal) >= 0)) continue;
        gesehen.add(k);
        aus.push({ ...e });
        if (aus.length >= anzahl) return aus;
      }
    }
  }
  return aus;
}

/**
 * Treffer aus der eigenen Nährwerttabelle, ohne Netz und ohne Wartezeit.
 * Gesucht wird über Name und Synonyme, Wortanfang vor Teilwort: wer "ba"
 * tippt, meint eher Banane als Kebab.
 */
export function tabellenSuche(begriff, { anzahl = 6, tabelle = FOODS } = {}) {
  const q = norm(begriff);
  if (q.length < 2) return [];
  const treffer = [];
  for (const f of tabelle) {
    const namen = [f.label, ...(f.aliases || [])].map(norm);
    let rang = 0;
    if (namen.some((n) => n === q)) rang = 3;
    else if (namen.some((n) => n.startsWith(q) || n.split(" ").some((w) => w.startsWith(q)))) rang = 2;
    // Mitten im Wort zählt erst ab vier Zeichen. "Ei" steckt in Reis und
    // Leberkäse, und wer Ei sucht, will kein Reis. Am Wortende zählt es
    // immer: im Deutschen steht dort das Grundwort, Olivenöl ist ein Öl.
    else if (namen.some((n) => n.split(" ").some((w) => w.endsWith(q)))) rang = 1;
    else if (q.length >= 4 && namen.some((n) => n.includes(q))) rang = 0.5;
    if (rang) treffer.push({ f, rang });
  }
  return treffer
    .sort((a, b) => b.rang - a.rang || a.f.label.length - b.f.label.length)
    .slice(0, anzahl)
    .map(({ f }) => tabellenPosten(f));
}

/**
 * Lebensmittel mit eigenem Foto unter `img/lebensmittel/<key>.jpg`. Nur CC0,
 * Public Domain Mark oder CC BY, Quelle, Urheber und Lizenz je Datei in
 * `img/lebensmittel/NACHWEIS.json`, die Namensnennung steht unter
 * rechtliches/bildnachweis.html. Ohne Foto bleibt der Anfangsbuchstabe auf
 * der Farbe des Hauptmakros.
 */
export const LEBENSMITTEL_BILDER = new Set(BILDER.map((b) => b.key));

const bildFuerKey = (key) => (LEBENSMITTEL_BILDER.has(key) ? `img/lebensmittel/${key}.jpg` : undefined);

// Längere Namen zuerst: "Griechischer Joghurt" vor "Joghurt".
const NAMEN = BILDER
  .flatMap((b) => b.namen.map((n) => ({ n: norm(n), key: b.key })))
  .filter((x) => x.n.length >= 2)
  .sort((x, y) => y.n.length - x.n.length);

/**
 * Das Foto zu einem Posten. Erst der genaue Name, dann ein Name, mit dem der
 * Posten beginnt, auf ganzen Wörtern: "Magerquark 500 g" und "Hähnchenbrust
 * mit Reis" bekommen ein Foto, "Apfelmus" nicht das vom Apfel. Was nicht
 * vorn steht, zählt nicht: ein falsches Foto neben einem Posten ist
 * schlimmer als ein Buchstabe.
 */
export function tabellenBild(name) {
  const q = norm(name);
  if (!q) return undefined;
  const genau = NAMEN.find((x) => x.n === q);
  if (genau) return bildFuerKey(genau.key);
  const vorn = NAMEN.find((x) => q.startsWith(`${x.n} `) || q.startsWith(`${x.n},`));
  return vorn ? bildFuerKey(vorn.key) : undefined;
}

/** Ein Posten aus der Tabelle, mit dem Stückgewicht als Menge, sonst 100 g. */
export function tabellenPosten(f, gramm = f.pieceG ?? 100) {
  const anteil = gramm / 100;
  const r1 = (x) => Math.round(x * anteil * 10) / 10;
  return {
    name: f.label,
    quantity: `${gramm} ${f.fluessig ? "ml" : "g"}`,
    kcal: Math.round(f.per100.kcal * anteil),
    proteinG: r1(f.per100.proteinG),
    fatG: r1(f.per100.fatG),
    carbsG: r1(f.per100.carbsG),
    ...((bildFuerKey(f.key) || tabellenBild(f.label)) ? { bild: bildFuerKey(f.key) || tabellenBild(f.label) } : {}),
  };
}

/* ---------- Eigene Rezepte ---------- */

/**
 * Wie viele eigene Rezepte eine Stufe speichern darf. Eine Entscheidung des
 * Betreibers: Plus fünf, Pro ohne Grenze, ohne Abo keines. Die Testphase
 * zählt wie Plus, damit man die Funktion vor dem Kauf kennt.
 *
 * Ohne eigenen Server gibt es keine Stufe, und die Entwicklerfassung gehört
 * dem Betreiber, also keine Grenze. Geprüft wird auf dem Gerät: die Rezepte
 * liegen dort, und wer die Prüfung umgeht, nimmt niemandem etwas weg.
 */
export const REZEPT_GRENZE = { frei: 0, test: 5, plus: 5, pro: Infinity };

export function rezeptGrenze(settings, konfig) {
  if (!konfig?.chatUrl) return Infinity;
  const stufe = settings?.kontoStufe || "test";
  return REZEPT_GRENZE[stufe] ?? 0;
}

/**
 * Ob der Wochenplan offen ist. Er gehört zu Pro und ist in der Testphase zum
 * Ausprobieren dabei: wer ihn nie gesehen hat, weiss nicht, wofür er Pro
 * nehmen soll. Ohne eigenen Server gibt es keine Grenze, wie bei den Rezepten.
 */
export function essensplanFrei(settings, konfig) {
  if (!konfig?.chatUrl) return true;
  return ["pro", "test"].includes(settings?.kontoStufe || "test");
}

export function eigeneRezepte(settings) {
  return Array.isArray(settings?.eigeneRezepte) ? settings.eigeneRezepte : [];
}

/** Summe der Werte über alle Posten. */
export function summe(posten) {
  return posten.reduce(
    (s, e) => ({
      kcal: s.kcal + (Number(e.kcal) || 0),
      proteinG: s.proteinG + (Number(e.proteinG) || 0),
      fatG: s.fatG + (Number(e.fatG) || 0),
      carbsG: s.carbsG + (Number(e.carbsG) || 0),
    }),
    { kcal: 0, proteinG: 0, fatG: 0, carbsG: 0 },
  );
}

/**
 * Speichert die Posten als Rezept. Ein Rezept mit demselben Namen wird
 * ersetzt und nicht verdoppelt: so ändert man ein Rezept, indem man es
 * einträgt, anpasst und wieder speichert. Ersetzen zählt nicht gegen die
 * Grenze, ein neues schon.
 */
export function rezeptSpeichern(settings, name, posten, { grenze = Infinity, id = () => String(Date.now()) } = {}) {
  const titel = String(name ?? "").trim().slice(0, 60);
  if (!titel) return { fehler: "Gib dem Rezept einen Namen." };
  const sauber = (posten || []).filter((e) => e && e.name).map(({ name: n, quantity, kcal, proteinG, fatG, carbsG, bild }) =>
    ({ name: n, quantity, kcal, proteinG, fatG, carbsG, ...(bild ? { bild } : {}) }));
  if (sauber.length === 0) return { fehler: "Ein Rezept braucht mindestens ein Lebensmittel." };
  const liste = eigeneRezepte(settings);
  const alt = liste.find((r) => norm(r.name) === norm(titel));
  if (!alt && liste.length >= grenze) return { fehler: "grenze", grenze };
  const rezept = { id: alt?.id ?? id(), name: titel, posten: sauber, geaendert: new Date().toISOString() };
  const neu = alt ? liste.map((r) => (r.id === alt.id ? rezept : r)) : [...liste, rezept];
  return { settings: { ...settings, eigeneRezepte: neu }, rezept, ersetzt: Boolean(alt) };
}

export function rezeptLoeschen(settings, id) {
  return { ...settings, eigeneRezepte: eigeneRezepte(settings).filter((r) => r.id !== id) };
}

/**
 * Anteil am Tagesziel in ganzen Prozent, oder null ohne Ziel. Steht neben
 * jedem Posten: "300 kcal" sagt wenig, "11 Prozent deines Tages" sagt, ob
 * es viel war.
 */
export function anteilAmZiel(wert, ziel) {
  const z = Number(ziel);
  if (!(z > 0)) return null;
  return Math.round(((Number(wert) || 0) / z) * 100);
}

/**
 * Welcher Makro trägt die meisten Kalorien. Daran hängt die Farbe des
 * Platzhalters, wenn ein Posten kein Foto hat.
 */
export function hauptMakro(e) {
  const p = (Number(e.proteinG) || 0) * 4;
  const f = (Number(e.fatG) || 0) * 9;
  const k = (Number(e.carbsG) || 0) * 4;
  if (p === 0 && f === 0 && k === 0) return "keiner";
  if (p >= f && p >= k) return "protein";
  return f >= k ? "fett" : "kohlenhydrate";
}

/* ---------- Eigene Lebensmittel ---------- */

/**
 * Lebensmittel, die der Nutzer selbst mit Werten je 100 Gramm angelegt hat.
 *
 * Was keine Tabelle und keine Datenbank kennt, Omas Kuchen oder der
 * Proteinriegel vom Bäcker, kennt danach daevo: im Editor, beim Diktieren
 * und im Gespräch. Ohne Grenze je Abo, das ist Grundausstattung beim
 * Tracken. 500 sind die Grenze für den Speicher, je Eintrag rund 150 Byte.
 */
export const LEBENSMITTEL_GRENZE = 500;

export function eigeneLebensmittel(settings) {
  return Array.isArray(settings?.eigeneLebensmittel) ? settings.eigeneLebensmittel : [];
}

/**
 * Prüft und speichert ein eigenes Lebensmittel. Gleicher Name ersetzt.
 *
 * Abgelehnt wird nur, was nicht stimmen kann: Makros über 100 Gramm je 100
 * Gramm oder mehr als 900 kcal. Passen Kalorien und Makros nicht zusammen,
 * wird gespeichert und ein Hinweis zurückgegeben: auf dem Etikett zählen
 * Ballaststoffe und Zuckeralkohole anders, und der Nutzer hat die Packung
 * vor sich, die App nicht.
 */
export function lebensmittelSpeichern(settings, { name, kcal, proteinG = 0, fatG = 0, carbsG = 0, portionG } = {}, { id = () => String(Date.now()) } = {}) {
  const titel = String(name ?? "").replace(/\s+/g, " ").trim().slice(0, 60);
  if (titel.length < 2) return { fehler: "Gib dem Lebensmittel einen Namen." };
  const z = (v) => (v === "" || v === null || v === undefined ? NaN : Number(String(v).replace(",", ".")));
  const w = { kcal: z(kcal), proteinG: z(proteinG) || 0, fatG: z(fatG) || 0, carbsG: z(carbsG) || 0 };
  if (!Number.isFinite(w.kcal) || w.kcal < 0) return { fehler: "Die Kalorien je 100 g fehlen." };
  if ([w.proteinG, w.fatG, w.carbsG].some((x) => !Number.isFinite(x) || x < 0)) return { fehler: "Eiweiß, Fett und Kohlenhydrate müssen Zahlen sein." };
  if (w.proteinG + w.fatG + w.carbsG > 100) return { fehler: "Eiweiß, Fett und Kohlenhydrate ergeben zusammen mehr als 100 g je 100 g. Prüf die Werte auf der Packung." };
  if (w.kcal > 900) return { fehler: "Mehr als 900 kcal je 100 g gibt es nicht, reines Fett hat 900." };
  const gerechnet = w.proteinG * 4 + w.fatG * 9 + w.carbsG * 4;
  const hinweis = gerechnet > 0 && Math.abs(w.kcal - gerechnet) > Math.max(25, gerechnet * 0.2)
    ? `Aus den Makros ergeben sich etwa ${Math.round(gerechnet)} kcal, eingetragen sind ${Math.round(w.kcal)}. Gespeichert ist, was du eingetragen hast.`
    : "";
  const portion = Number(portionG);
  const liste = eigeneLebensmittel(settings);
  const alt = liste.find((l) => norm(l.name) === norm(titel));
  if (!alt && liste.length >= LEBENSMITTEL_GRENZE) return { fehler: `Mehr als ${LEBENSMITTEL_GRENZE} eigene Lebensmittel passen nicht in den Speicher. Lösch eines, das du nicht mehr brauchst.` };
  const lebensmittel = {
    id: alt?.id ?? id(),
    name: titel,
    per100: { kcal: Math.round(w.kcal), proteinG: r1(w.proteinG), fatG: r1(w.fatG), carbsG: r1(w.carbsG) },
    ...(portion > 0 && portion <= 3000 ? { portionG: Math.round(portion) } : {}),
    geaendert: new Date().toISOString(),
  };
  const neu = alt ? liste.map((l) => (l.id === alt.id ? lebensmittel : l)) : [lebensmittel, ...liste];
  return { settings: { ...settings, eigeneLebensmittel: neu }, lebensmittel, ersetzt: Boolean(alt), hinweis };
}

export function lebensmittelLoeschen(settings, id) {
  return { ...settings, eigeneLebensmittel: eigeneLebensmittel(settings).filter((l) => l.id !== id) };
}

/** Ein Posten aus einem eigenen Lebensmittel, mit der Portion oder 100 g. */
export function eigenerPosten(l, gramm = l.portionG ?? 100) {
  const anteil = gramm / 100;
  return {
    name: l.name,
    quantity: `${Math.round(gramm)} g`,
    kcal: Math.round(l.per100.kcal * anteil),
    proteinG: r1(l.per100.proteinG * anteil),
    fatG: r1(l.per100.fatG * anteil),
    carbsG: r1(l.per100.carbsG * anteil),
    eigen: true,
  };
}

/** Eigene Lebensmittel, deren Name den Suchtext enthält, genaue Treffer zuerst. */
export function eigeneSuche(begriff, settings, { anzahl = 6 } = {}) {
  const q = norm(begriff);
  if (q.length < 2) return [];
  return eigeneLebensmittel(settings)
    .filter((l) => norm(l.name).includes(q) || q.split(" ").every((w) => norm(l.name).includes(w)))
    .sort((a, b) => (norm(a.name) === q ? -1 : 0) - (norm(b.name) === q ? -1 : 0))
    .slice(0, anzahl);
}

/**
 * Das eigene Lebensmittel, das in einem Posten oder Satz gemeint ist.
 * Längster Name zuerst, damit "Omas Kuchen" vor "Kuchen" trifft. Ganze
 * Wörter, sonst steckt "Ei" in "Eis".
 */
export function eigenesIn(text, settings) {
  const t = ` ${norm(text).replace(/[^a-z0-9 ]+/g, " ")} `;
  return [...eigeneLebensmittel(settings)]
    .sort((a, b) => b.name.length - a.name.length)
    .find((l) => {
      const n = norm(l.name).replace(/[^a-z0-9 ]+/g, " ").trim();
      return n.length >= 3 && t.includes(` ${n} `);
    }) ?? null;
}

function r1(x) {
  return Math.round((Number(x) || 0) * 10) / 10;
}

/* ---------- Vorschläge beim Tippen ---------- */

/**
 * Wie gut ein Name zum Getippten passt, 0 heisst gar nicht.
 *
 * Gesucht wird auf Wortanfänge: "ri" trifft "ESN Rice Pudding", "ri pu"
 * ebenso, jedes getippte Wort muss ein Wort im Namen beginnen. Mitten im
 * Wort zählt erst ab drei Zeichen, sonst steckt "ei" in Reis.
 */
export function passung(name, begriff) {
  const q = norm(begriff);
  const n = norm(name);
  if (!q || !n) return 0;
  if (n === q) return 100;
  if (n.startsWith(q)) return 85;
  const nw = n.split(/[^a-z0-9]+/).filter(Boolean);
  const qw = q.split(/[^a-z0-9]+/).filter(Boolean);
  if (qw.length && qw.every((w) => nw.some((x) => x.startsWith(w)))) return nw[0]?.startsWith(qw[0]) ? 75 : 70;
  if (q.length >= 3 && n.includes(q)) return 40;
  return 0;
}

/** Ein gemerktes Produkt von Open Food Facts als Posten, mit seiner Portion oder 100 g. */
export function produktPosten(p) {
  const gramm = portionsVorschlag(p)?.gramm ?? 100;
  const n = naehrwerteFuer(p, gramm);
  return {
    name: [p.marke, p.name].filter(Boolean).join(" ") || "Ohne Namen",
    quantity: `${Math.round(gramm)} g`,
    ...n,
    ...(p.bild ? { bild: p.bild } : {}),
  };
}

/**
 * Was zum Getippten passt, aus allem, was ohne Netz da ist, ab dem ersten
 * Buchstaben.
 *
 * Vorher kamen beim Tippen nur die Nährwerttabelle und die eigenen
 * Lebensmittel, und alles andere erst mit Enter aus dem Netz. Wer den ESN
 * Rice Pudding jede Woche isst, tippte "ri" und bekam Rinderhack. Jetzt
 * zählen fünf Quellen, mit einem Vorsprung für das, was man selbst kennt:
 * schon Gegessenes nach Häufigkeit und Frische, eigene Lebensmittel,
 * gemerkte Produkte, eigene Rezepte, dann die Tabelle. Mit einem Buchstaben
 * nur die eigenen Quellen, die Tabelle erst ab zwei.
 *
 * Jeder Name kommt einmal, mit der Quelle, die am besten passt. Gegessenes
 * bringt die zuletzt gegessene Menge mit, die isst man meistens wieder.
 */
export function vorschlaege(begriff, { tage = [], settings = {}, tabelle = FOODS, anzahl = 12, heute } = {}) {
  const q = norm(begriff);
  if (!q) return [];
  const kandidaten = [];
  const dazu = (name, wert, eintrag) => {
    const p = passung(name, q);
    if (p > 0) kandidaten.push({ ...eintrag, wert: p + wert, schluessel: norm(name) });
  };

  // Schon gegessen, je Name gezählt. Mahlzeiten aus Apple Health zählen
  // nicht, die hat jemand anderswo eingetragen.
  const verlauf = new Map();
  for (const tag of [...tage].sort((a, b) => String(b.date).localeCompare(String(a.date)))) {
    for (const m of tag.meals || []) {
      if (m.source === "health") continue;
      for (const e of m.entries || []) {
        const k = norm(e.name);
        if (!k || !(Number(e.kcal) >= 0)) continue;
        const v = verlauf.get(k);
        if (v) v.anzahl++;
        else verlauf.set(k, { e, anzahl: 1, datum: tag.date });
      }
    }
  }
  const tageHer = (datum) => (heute && datum ? Math.round((Date.parse(heute) - Date.parse(datum)) / 864e5) : 99);
  for (const { e, anzahl: n, datum } of verlauf.values()) {
    const frisch = tageHer(datum) <= 7 ? 8 : 0;
    dazu(e.name, 20 + Math.min(30, n * 5) + frisch, { art: "posten", e: { ...e }, quelle: "zuletzt", anzahl: n });
  }
  for (const l of eigeneLebensmittel(settings)) dazu(l.name, 25, { art: "posten", e: eigenerPosten(l), quelle: "eigen" });
  for (const g of Array.isArray(settings.produkte) ? settings.produkte : []) {
    if (!g?.produkt?.per100) continue;
    const e = produktPosten(g.produkt);
    dazu(e.name, 15, { art: "posten", e, quelle: "produkt" });
  }
  for (const r of eigeneRezepte(settings)) dazu(r.name, 15, { art: "rezept", r, quelle: "rezept" });
  if (q.length >= 2) {
    for (const f of tabelle) {
      const best = Math.max(...[f.label, ...(f.aliases || [])].map((n) => passung(n, q)));
      if (best > 0) kandidaten.push({ art: "posten", e: tabellenPosten(f), quelle: "tabelle", wert: best, schluessel: norm(f.label) });
    }
  }

  const beste = new Map();
  for (const k of kandidaten) {
    const alt = beste.get(k.schluessel);
    if (!alt || k.wert > alt.wert) beste.set(k.schluessel, k);
  }
  return [...beste.values()]
    .sort((a, b) => b.wert - a.wert || a.schluessel.length - b.schluessel.length)
    .slice(0, anzahl)
    .map(({ wert: _w, schluessel: _s, ...v }) => v);
}

/**
 * Merkt ein Produkt aus Suche oder Barcode, damit es beim nächsten Tippen
 * ohne Netz vorn steht. Dieselbe Liste wie beim Nachschlagen im Gespräch,
 * `settings.produkte`, höchstens 300.
 */
export function produktGemerkt(settings, produkt, suche = "") {
  if (!produkt?.per100) return settings;
  const liste = (Array.isArray(settings.produkte) ? settings.produkte : [])
    .filter((x) => !(produkt.barcode && x.produkt?.barcode === produkt.barcode));
  liste.unshift({ suche: norm(suche || [produkt.marke, produkt.name].filter(Boolean).join(" ")), produkt, am: new Date().toISOString().slice(0, 10) });
  return { ...settings, produkte: liste.slice(0, 300) };
}
