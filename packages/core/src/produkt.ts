/**
 * Nährwerte für Markenprodukte.
 *
 * Bis hierher kamen alle Zahlen entweder aus der kleinen Tabelle in
 * `packages/coach/src/foods.ts` oder aus dem Sprachmodell. Beides trägt bei
 * einem konkreten Becher nicht: die Tabelle kennt Grundnahrungsmittel, und das
 * Modell erinnert sich an ein Etikett, das es nie gesehen hat. Eine geratene
 * Zahl auf einem Produkt mit aufgedrucktem Etikett ist der schlimmste Fall,
 * weil sie nach Wissen aussieht.
 *
 * Quelle ist Open Food Facts, eine offene Datenbank mit Barcode. Sie ist von
 * Nutzern gepflegt, also lückenhaft und stellenweise falsch. Deshalb steht an
 * jedem übernommenen Wert, woher er kommt, und deshalb prüft `pruefeProdukt`
 * jedes Ergebnis nach, bevor es in eine Mahlzeit wandert.
 *
 * Dieses Modul rechnet und prüft nur. Der Abruf steht in
 * `packages/coach/src/off.ts`, damit der Rechenkern ohne Netz testbar bleibt.
 */

export interface Naehrwerte {
  kcal: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
}

export interface Produkt {
  /** EAN oder GTIN, wie ihn die Datenbank führt. */
  barcode: string;
  name: string;
  marke: string;
  /** Packungsangabe wie "60g" oder "500 ml", so wie sie auf der Packung steht. */
  menge: string;
  /** Nährwerte je 100 g oder 100 ml. */
  per100: Naehrwerte;
  /** Gewicht einer Portion in Gramm, wenn der Hersteller eine angibt. */
  portionG?: number;
  /** Ballaststoffe je 100 g. Erklaeren die Luecke zwischen Etikett und Makrorechnung. */
  ballaststoffeG?: number;
  /** Kleines Foto der Packung, nur von Open Food Facts selbst. */
  bild?: string;
  /**
   * Woher die Zahlen kommen. Open Food Facts über Barcode oder Suche, "web"
   * aus einer Websuche des Modells mit Quelle, "gemerkt" aus der eigenen
   * Liste schon gefundener Produkte.
   */
  quelle: "openfoodfacts" | "web" | "gemerkt" | "eigen";
  /** Die Seite, von der eine Websuche die Werte hat. */
  quelleUrl?: string;
  /** Wahr, wenn die Kalorien aus den Makros gerechnet sind, weil der Eintrag nicht zusammenpasste. */
  kcalGerechnet?: boolean;
}

/**
 * Liest die Antwort von Open Food Facts in unsere Form.
 *
 * Open Food Facts liefert je Nährwert bis zu fünf Felder, etwa `proteins`,
 * `proteins_100g`, `proteins_value` und `proteins_serving`. Nur `_100g` ist
 * verlässlich auf 100 Gramm bezogen, alles andere haengt daran, welche Einheit
 * der Erfasser gewaehlt hat. Deshalb wird ausschliesslich `_100g` gelesen.
 */
export function produktAusOff(roh: unknown): Produkt | null {
  if (typeof roh !== "object" || roh === null) return null;
  const p = roh as Record<string, unknown>;
  const n = (p.nutriments ?? {}) as Record<string, unknown>;

  const barcode = text(p.code);
  const name = text(p.product_name_de) || text(p.product_name);
  if (!barcode || !name) return null;

  const kcal = zahl(n["energy-kcal_100g"]);
  const proteinG = zahl(n.proteins_100g);
  const fatG = zahl(n.fat_100g);
  const carbsG = zahl(n.carbohydrates_100g);

  // Ohne Energie und ohne ein einziges Makro ist der Eintrag leer. Solche
  // Produkte gibt es in der Datenbank viele, sie tragen nur einen Namen.
  if (kcal === null && proteinG === null && fatG === null && carbsG === null) return null;

  const per100: Naehrwerte = {
    kcal: kcal ?? Math.round((proteinG ?? 0) * 4 + (fatG ?? 0) * 9 + (carbsG ?? 0) * 4),
    proteinG: proteinG ?? 0,
    fatG: fatG ?? 0,
    carbsG: carbsG ?? 0,
  };

  return {
    barcode,
    name,
    // Die neue Suche liefert die Marken als Liste, die alte als Text.
    marke: Array.isArray(p.brands) ? p.brands.map(text).filter(Boolean).join(", ") : text(p.brands),
    menge: text(p.quantity),
    per100,
    portionG: portionInGramm(text(p.serving_size)) ?? undefined,
    ballaststoffeG: zahl(n.fiber_100g) ?? undefined,
    bild: offBild(text(p.image_front_small_url) || text(p.image_small_url)),
    quelle: "openfoodfacts",
  };
}

/**
 * Nimmt eine Bildadresse nur an, wenn sie von Open Food Facts selbst kommt.
 * Das Feld schreiben Freiwillige, und eine fremde Adresse in der App wäre
 * ein Abruf an einen Server, den die Datenschutzerklärung nicht nennt.
 */
export function offBild(url: string): string | undefined {
  return /^https:\/\/images\.openfoodfacts\.org\/[\w./-]+\.(?:jpg|jpeg|png|webp)$/i.test(url) ? url : undefined;
}

/**
 * Prüft ein Produkt, bevor seine Zahlen in eine Mahlzeit wandern.
 *
 * Die Makrorechnung ist die Kontrolle, nicht die Wahrheit: auf dem Etikett
 * steht der Wert des Herstellers, und der zaehlt Ballaststoffe und Zuckeralkohole
 * mit anderen Faktoren als 4 und 9. Beim Grießpudding von More Nutrition sind es
 * 346 kcal deklariert gegen 336 gerechnet, und die Luecke sind genau die
 * 4,1 Gramm Ballaststoffe. Deshalb wird der deklarierte Wert nicht ueberschrieben,
 * sondern nur ab einer Abweichung gemeldet, die kein Naehrstoff mehr erklaert.
 */
export interface Pruefung {
  ok: boolean;
  /** Was gegen die Uebernahme spricht. Leer, wenn nichts dagegen spricht. */
  einwaende: string[];
  /** Die aus den Makros gerechnete Energie, zum Vergleich. */
  gerechnetKcal: number;
}

export function pruefeProdukt(p: Produkt): Pruefung {
  const einwaende: string[] = [];
  const m = p.per100;

  // Ballaststoffe liefern rund 2 kcal je Gramm, weil sie nur teilweise
  // verwertet werden. Quelle der Faktoren: Verordnung (EU) Nr. 1169/2011,
  // Anhang XIV, Umrechnungsfaktoren fuer den Brennwert.
  const gerechnetKcal = Math.round(m.proteinG * 4 + m.fatG * 9 + m.carbsG * 4 + (p.ballaststoffeG ?? 0) * 2);

  if (m.proteinG + m.fatG + m.carbsG > 100) {
    einwaende.push("Die Makros ergeben zusammen mehr als 100 Gramm je 100 Gramm. Der Eintrag ist falsch erfasst.");
  }
  if (m.kcal > 900) {
    einwaende.push(`${m.kcal} kcal je 100 Gramm liegt ueber reinem Fett. Der Eintrag ist falsch erfasst.`);
  }
  if (gerechnetKcal > 0 && Math.abs(m.kcal - gerechnetKcal) > Math.max(25, gerechnetKcal * 0.2)) {
    einwaende.push(
      `Etikett und Makros passen nicht zusammen: ${m.kcal} kcal angegeben, ${gerechnetKcal} kcal gerechnet.`,
    );
  }

  return { ok: einwaende.length === 0, einwaende, gerechnetKcal };
}

/**
 * Macht aus einem Treffer etwas, das sich eintragen lässt, oder verwirft ihn.
 *
 * Makros über 100 Gramm je 100 Gramm sind nicht zu retten, die Zahlen selbst
 * sind falsch. Passen nur die Kalorien nicht zu den Makros, liegt der Fehler
 * fast immer an einem Feld: ESN Whey stand im Betrieb mit 523 kcal da, bei 73
 * Gramm Protein, 5 Fett und 9 Kohlenhydraten, also rund 375. Dann gelten die
 * Makros, die Kalorien werden daraus gerechnet, und der Nutzer bekommt eine
 * Zahl statt einer Bitte, auf seine Dose zu schauen.
 */
export function produktBereinigen(p: Produkt): Produkt | null {
  const m = p.per100;
  if (m.proteinG + m.fatG + m.carbsG > 100) return null;
  const pr = pruefeProdukt(p);
  if (pr.ok) return p;
  if (pr.gerechnetKcal <= 0) return null;
  return { ...p, per100: { ...m, kcal: pr.gerechnetKcal }, kcalGerechnet: true };
}

/** Wörter, die in einer Suche nichts über das Produkt sagen. */
const FUELL = new Set(["und", "mit", "von", "der", "die", "das", "the", "and", "with", "protein", "geschmack", "flavour", "flavor", "pulver"]);

/** Zerlegt einen Namen in vergleichbare Wörter. */
export function suchWoerter(textRoh: string): string[] {
  return textRoh
    .toLowerCase()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 2);
}

export interface Wertung {
  produkt: Produkt;
  /** Anteil der Suchwörter, die im Treffer stehen, 0 bis 1. */
  passung: number;
  /** Ob die Marke aus der Suche beim Treffer steht. */
  markeStimmt: boolean;
}

/**
 * Sortiert Treffer nach der Suche und wirft weg, was nicht gemeint sein kann.
 *
 * Die Suche von Open Food Facts liefert zu "ESN Instant Rice Pudding" als
 * ersten Treffer einen Milchreis von Milsani, weil "Rice Pudding" passt. Ein
 * fremdes Produkt mit echten Werten ist schlimmer als keines: es sieht
 * richtig aus. Deshalb gilt: steht eines der Suchwörter bei irgendeinem
 * Treffer als Marke, ist es die Marke, und nur Treffer dieser Marke bleiben.
 * Danach zählt der Anteil der übrigen Wörter im Namen, mindestens die Hälfte.
 *
 * Gleiche Werte bei mehreren Treffern sind ein gutes Zeichen: ein Produkt,
 * das drei Leute gleich erfasst haben, ist eher richtig erfasst.
 */
export function trefferWerten(suche: string, produkte: Produkt[]): Wertung[] {
  const woerter = suchWoerter(suche);
  if (!woerter.length) return [];
  const markenWoerter = (p: Produkt) => new Set(suchWoerter(p.marke));
  // Die Marke ist das Wort, das bei den meisten Treffern als Marke steht.
  // Nicht jedes: bei "Alpro Skyr" gibt es auch eine Marke namens Skyr, und
  // dann bliebe kein Wort für den Namen übrig.
  const markenZahl = woerter.map((w) => produkte.filter((p) => markenWoerter(p).has(w)).length);
  const top = Math.max(0, ...markenZahl);
  const i = top > 0 ? markenZahl.indexOf(top) : -1;
  const marke: string[] = [];
  const erstes = i >= 0 ? woerter[i] : undefined;
  if (erstes) {
    marke.push(erstes);
    // Zweiteilige Marken wie More Nutrition.
    const zweites = woerter[i + 1];
    if (zweites && produkte.some((p) => markenWoerter(p).has(erstes) && markenWoerter(p).has(zweites))) marke.push(zweites);
  }
  const rest = woerter.filter((w) => !marke.includes(w) && !FUELL.has(w));

  const zaehl = new Map<string, number>();
  const schluessel = (p: Produkt) => `${p.per100.kcal}|${p.per100.proteinG}|${p.per100.fatG}|${p.per100.carbsG}`;
  for (const p of produkte) zaehl.set(schluessel(p), (zaehl.get(schluessel(p)) ?? 0) + 1);

  const gesehen = new Set<string>();
  const liste: Array<Wertung & { rang: number }> = [];
  for (const p of produkte) {
    if (gesehen.has(p.barcode)) continue;
    gesehen.add(p.barcode);
    const mw = markenWoerter(p);
    const markeStimmt = marke.length > 0 && marke.some((w) => mw.has(w));
    if (marke.length && !markeStimmt) continue;
    const namensWoerter = new Set([...suchWoerter(p.name), ...mw]);
    // Ein Wort trifft auch als Anfang: "puddings" findet "pudding".
    const trifft = (w: string) => [...namensWoerter].some((n) => n === w || (w.length >= 4 && (n.startsWith(w) || w.startsWith(n)) && n.length >= 4));
    const treffer = rest.filter(trifft).length;
    const passung = rest.length ? treffer / rest.length : 1;
    if (passung < 0.5) continue;
    const einig = (zaehl.get(schluessel(p)) ?? 1) - 1;
    const sauber = pruefeProdukt(p).ok ? 1 : 0;
    liste.push({ produkt: p, passung, markeStimmt, rang: passung * 10 + sauber * 2 + Math.min(einig, 3) });
  }
  return liste.sort((a, b) => b.rang - a.rang).map(({ rang: _r, ...w }) => w);
}

/** Rechnet die Werte je 100 Gramm auf eine Menge um. */
export function naehrwerteFuer(p: Produkt, gramm: number): Naehrwerte {
  const f = Math.max(0, gramm) / 100;
  return {
    kcal: Math.round(p.per100.kcal * f),
    proteinG: rund1(p.per100.proteinG * f),
    fatG: rund1(p.per100.fatG * f),
    carbsG: rund1(p.per100.carbsG * f),
  };
}

/**
 * Wie viel Gramm gemeint sind, wenn der Nutzer nichts sagt.
 *
 * Erst die Portionsangabe des Herstellers, dann die Packungsgroesse, wenn sie
 * klein genug fuer eine Portion ist. Ein Kilo Haferflocken ist keine Portion,
 * ein 60 Gramm Beutel Griesspudding schon.
 */
export function portionsVorschlag(p: Produkt): { gramm: number; grund: string } | null {
  if (p.portionG && p.portionG > 0) {
    return { gramm: p.portionG, grund: "Portion laut Hersteller" };
  }
  const packung = portionInGramm(p.menge);
  if (packung !== null && packung > 0 && packung <= 400) {
    return { gramm: packung, grund: "ganze Packung" };
  }
  return null;
}

/** Liest "60g", "1 Beutel (60 g)", "500 ml" oder "0,33 l" als Gramm. */
export function portionInGramm(angabe: string): number | null {
  if (!angabe) return null;
  const t = angabe.toLowerCase().replace(",", ".");
  const treffer = t.match(/(\d+(?:\.\d+)?)\s*(kg|g|ml|cl|l)\b/);
  if (!treffer) return null;
  const wert = Number(treffer[1]);
  if (!Number.isFinite(wert) || wert <= 0) return null;
  // Milliliter werden wie Gramm behandelt. Das stimmt fuer Wasser und liegt bei
  // Milch und Getraenken unter zwei Prozent daneben, also unter der Genauigkeit
  // der Naehrwertangabe selbst.
  switch (treffer[2]) {
    case "kg": return wert * 1000;
    case "l": return wert * 1000;
    case "cl": return wert * 10;
    default: return wert;
  }
}

/** Ein Satz fuer den Chat, mit Herkunft und Barcode. */
export function produktText(p: Produkt, gramm?: number): string {
  const kopf = [p.marke, p.name].filter(Boolean).join(" ");
  const zeilen = [
    `${kopf}${p.menge ? `, ${p.menge}` : ""}`,
    `Je 100 g: ${p.per100.kcal} kcal, ${p.per100.proteinG} g Protein, ${p.per100.fatG} g Fett, ${p.per100.carbsG} g Kohlenhydrate.`,
  ];
  if (typeof gramm === "number" && gramm > 0) {
    const w = naehrwerteFuer(p, gramm);
    zeilen.push(`Auf ${rund1(gramm)} g: ${w.kcal} kcal, ${w.proteinG} g Protein, ${w.fatG} g Fett, ${w.carbsG} g Kohlenhydrate.`);
  }
  zeilen.push(quelleSatz(p));
  return zeilen.join("\n");
}

/** Woher die Zahlen kommen, in einem Satz. */
export function quelleSatz(p: Produkt): string {
  const gerechnet = p.kcalGerechnet ? " Die Kalorien sind aus den Makros gerechnet, der Eintrag dort passte nicht zusammen." : "";
  if (p.quelle === "web") return `Quelle: ${p.quelleUrl ? new URL(p.quelleUrl).hostname.replace(/^www\./, "") : "Websuche"}.${gerechnet}`;
  if (p.quelle === "eigen") return "Quelle: dein eigenes Lebensmittel.";
  if (p.quelle === "gemerkt") return `Quelle: schon einmal nachgeschlagen${p.barcode && !p.barcode.startsWith("web-") ? `, Barcode ${p.barcode}` : ""}.${gerechnet}`;
  return `Quelle: Open Food Facts, Barcode ${p.barcode}.${gerechnet}`;
}

function text(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function zahl(v: unknown): number | null {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function rund1(v: number): number {
  return Math.round(v * 10) / 10;
}
