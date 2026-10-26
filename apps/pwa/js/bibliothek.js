/**
 * Die Bibliothek im Mahlzeit Editor: zuletzt Gegessenes, die Nährwerttabelle
 * und eigene Rezepte.
 *
 * Kein `document`, kein `window`: das Modul läuft auch in den Tests.
 */
import { foldUmlauts } from "@daevo/core";
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
    else if (namen.some((n) => n.includes(q))) rang = 1;
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
