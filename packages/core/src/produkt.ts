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
  quelle: "openfoodfacts";
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
    marke: text(p.brands),
    menge: text(p.quantity),
    per100,
    portionG: portionInGramm(text(p.serving_size)) ?? undefined,
    ballaststoffeG: zahl(n.fiber_100g) ?? undefined,
    quelle: "openfoodfacts",
  };
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
  zeilen.push(`Quelle: Open Food Facts, Barcode ${p.barcode}. Von Nutzern gepflegt, also gegen die Packung prüfen.`);
  return zeilen.join("\n");
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
