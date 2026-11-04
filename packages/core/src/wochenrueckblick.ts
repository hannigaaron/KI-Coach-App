/**
 * Der Wochenrückblick wie ein Abschlussgespräch mit einem Coach.
 *
 * Mittwoch ist Zwischenstand, Montag bis heute, mit dem Fokus für den Rest
 * der Woche. Sonntag ist die ganze Woche, Montag bis Sonntag, mit dem Fokus
 * für die nächste. Dieselben Tage wie die beiden Check-ins in checkin.ts.
 *
 * Gerechnet und nicht von einem Modell geschrieben: jede Zahl hängt an einem
 * Eintrag, und der Rückblick kommt auch ohne Schlüssel. Zwei Regeln stehen
 * über allem.
 *
 * Ein Tag ohne Eintrag ist eine Lücke und kein Tag ohne Essen. Er fällt aus
 * jeder Rechnung zur Ernährung heraus und wird nur gezählt.
 *
 * Ein Tag mit Eintrag, aber unter der Hälfte der Kalorien, ist fast immer
 * unvollständig eingetragen. Er fällt aus den Schnitten heraus, und der
 * Rückblick sagt das, statt mit ihm ein Defizit zu erfinden. Wer wirklich so
 * wenig gegessen hat, sagt es, und dann ist das ein eigenes Thema.
 *
 * Die Schwellen sind Regeln der App: Protein gilt ab 90 Prozent des Ziels
 * als gedeckt, Kalorien innerhalb von 10 Prozent als getroffen, Wasser ab 80
 * Prozent. Eine Studie für genau diese Grenzen gibt es nicht.
 */

import type { Goal } from "./types.js";

export interface RueckblickTag {
  /** JJJJ-MM-TT */
  tag: string;
  mahlzeiten: number;
  kcal: number;
  proteinG: number;
  zielKcal: number;
  zielProteinG: number;
  wasserMl: number;
  zielWasserMl: number;
  /** Eingetragene Trainings an diesem Tag. */
  trainings: number;
  /** Laut Profil geplante Einheiten an diesem Tag. */
  geplant: number;
  gewichtKg?: number | null;
  schlafMin?: number | null;
}

export interface Wochenrueckblick {
  art: "zwischenstand" | "woche";
  titel: string;
  /** Eine Zeile für die Mitteilung. */
  kurz: string;
  bilanz: string[];
  gut: string[];
  besser: string[];
  tipps: string[];
  fokus: string;
  text: string;
}

const PROTEIN_GEDECKT = 0.9;
const KCAL_SPANNE = 0.1;
const WASSER_GENUG = 0.8;
const UNVOLLSTAENDIG = 0.5;

const prozent = (x: number) => Math.round(x * 100);

/** Mittwoch oder Sonntag, sonst null. Wochentag nach Date.getDay. */
export function rueckblickArt(tagIso: string): Wochenrueckblick["art"] | null {
  const w = new Date(`${tagIso}T12:00:00`).getDay();
  return w === 3 ? "zwischenstand" : w === 0 ? "woche" : null;
}

/** Der Montag der Woche, in der dieser Tag liegt. */
export function wochenbeginn(tagIso: string): string {
  const d = new Date(`${tagIso}T12:00:00`);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function wochenrueckblick(tage: RueckblickTag[], { art, ziel }: { art: Wochenrueckblick["art"]; ziel?: Goal }): Wochenrueckblick {
  const n = tage.length;
  const mitEssen = tage.filter((t) => t.mahlzeiten > 0);
  const vollstaendig = mitEssen.filter((t) => t.zielKcal > 0 && t.kcal >= t.zielKcal * UNVOLLSTAENDIG);
  const unvollstaendig = mitEssen.length - vollstaendig.length;
  const zeitraum = art === "woche" ? "diese Woche" : "seit Montag";

  const bilanz: string[] = [];
  const gut: string[] = [];
  const besser: string[] = [];
  const tipps: { rang: number; text: string }[] = [];

  bilanz.push(`Ernährung eingetragen an ${mitEssen.length} von ${n} Tagen.`);
  if (unvollstaendig > 0) {
    bilanz.push(`${unvollstaendig} ${unvollstaendig === 1 ? "Tag liegt" : "Tage liegen"} unter der Hälfte deiner Kalorien. Das sieht nach unvollständig eingetragen aus, deshalb ${unvollstaendig === 1 ? "zählt er" : "zählen sie"} unten nicht mit. Hast du da wirklich so wenig gegessen, sag es mir.`);
  }

  // Protein: die wichtigste Zahl, deshalb zuerst.
  let proteinQuote: number | null = null;
  if (vollstaendig.length > 0) {
    const gedeckt = vollstaendig.filter((t) => t.proteinG >= t.zielProteinG * PROTEIN_GEDECKT).length;
    proteinQuote = gedeckt / vollstaendig.length;
    const schnitt = Math.round(vollstaendig.reduce((s, t) => s + t.proteinG, 0) / vollstaendig.length);
    const zielP = Math.round(vollstaendig.reduce((s, t) => s + t.zielProteinG, 0) / vollstaendig.length);
    bilanz.push(`Protein gedeckt an ${gedeckt} von ${vollstaendig.length} gezählten Tagen, im Schnitt ${schnitt} von ${zielP} g.`);
    if (proteinQuote >= 0.7) gut.push(`Dein Protein sitzt: an ${gedeckt} von ${vollstaendig.length} Tagen gedeckt.`);
    else {
      besser.push(`Protein fehlt an ${vollstaendig.length - gedeckt} von ${vollstaendig.length} Tagen, im Schnitt ${Math.max(0, zielP - schnitt)} g zu wenig.`);
      const mahlzeiten = Math.max(3, Math.round(vollstaendig.reduce((s, t) => s + t.mahlzeiten, 0) / vollstaendig.length));
      const je = Math.round(zielP / mahlzeiten / 5) * 5;
      tipps.push({ rang: 10, text: `Plan ${je} g Protein in jede deiner ${mahlzeiten} Mahlzeiten ein, bevor du sie zusammenstellst. 250 g Magerquark bringen rund 30 g, drei Eier rund 20 g.` });
    }

    const kcalSchnitt = Math.round(vollstaendig.reduce((s, t) => s + t.kcal, 0) / vollstaendig.length);
    const kcalZiel = Math.round(vollstaendig.reduce((s, t) => s + t.zielKcal, 0) / vollstaendig.length);
    const getroffen = vollstaendig.filter((t) => Math.abs(t.kcal - t.zielKcal) <= t.zielKcal * KCAL_SPANNE).length;
    const abw = kcalZiel > 0 ? (kcalSchnitt - kcalZiel) / kcalZiel : 0;
    bilanz.push(`Kalorien im Schnitt ${kcalSchnitt} von ${kcalZiel} kcal, getroffen an ${getroffen} von ${vollstaendig.length} Tagen.`);
    if (Math.abs(abw) <= KCAL_SPANNE) gut.push(`Deine Kalorien liegen im Schnitt im Ziel.`);
    else if (abw > 0) {
      besser.push(`Im Schnitt ${kcalSchnitt - kcalZiel} kcal über dem Ziel.`);
      tipps.push({ rang: ziel === "fat_loss" ? 9 : 6, text: `Schau, welche Mahlzeit am meisten über dem Plan liegt, und tausch dort eine Beilage oder Sauce gegen Gemüse oder mageres Eiweiß. Unter Heute zeigt ein Tipp auf den Kalorienring, woher es kommt.` });
    } else {
      besser.push(`Im Schnitt ${kcalZiel - kcalSchnitt} kcal unter dem Ziel.`);
      tipps.push({ rang: ziel === "lean_bulk" ? 9 : 6, text: `Leg eine feste Mahlzeit dazu, die du nicht vergisst, etwa einen Shake mit Haferflocken nach dem Training. Zu wenig essen bremst Training und Regeneration.` });
    }
  } else {
    besser.push(`Zu wenig vollständige Tage für eine Aussage über deine Ernährung.`);
  }

  if (mitEssen.length < Math.ceil(n * 0.7)) {
    tipps.push({ rang: 8, text: `Trag an mindestens ${Math.max(4, Math.ceil(n * 0.7))} Tagen die Hauptmahlzeiten ein. Ein Foto direkt am Teller reicht, die Zahlen rechnet daevo.` });
  } else if (mitEssen.length === n) {
    gut.push(`Jeden Tag eingetragen. Ohne das gäbe es diesen Rückblick nicht.`);
  }

  // Wasser nur an Tagen, an denen Wasser eingetragen ist.
  const mitWasser = tage.filter((t) => t.wasserMl > 0 && t.zielWasserMl > 0);
  if (mitWasser.length > 0) {
    const quote = mitWasser.reduce((s, t) => s + Math.min(1.5, t.wasserMl / t.zielWasserMl), 0) / mitWasser.length;
    if (quote >= WASSER_GENUG) gut.push(`Wasser im Schnitt bei ${prozent(quote)} Prozent deines Ziels.`);
    else {
      besser.push(`Wasser im Schnitt bei ${prozent(quote)} Prozent deines Ziels.`);
      tipps.push({ rang: 4, text: `Stell dir morgens eine volle Flasche hin und trink sie bis zum Mittag leer.` });
    }
  }

  const geplant = tage.reduce((s, t) => s + t.geplant, 0);
  const trainiert = tage.reduce((s, t) => s + t.trainings, 0);
  if (geplant > 0) {
    bilanz.push(`Training: ${trainiert} von ${geplant} geplanten Einheiten eingetragen.`);
    if (trainiert >= geplant) gut.push(`Alle geplanten Trainings gemacht.`);
    else {
      besser.push(`${geplant - trainiert} geplante ${geplant - trainiert === 1 ? "Einheit fehlt" : "Einheiten fehlen"} im Eintrag.`);
      tipps.push({ rang: 7, text: `Leg die nächste Einheit jetzt als Termin in den Kalender. Was dort steht, findet statt, was nur im Kopf steht, rutscht.` });
    }
  } else if (trainiert > 0) {
    bilanz.push(`Training: ${trainiert} ${trainiert === 1 ? "Einheit" : "Einheiten"} eingetragen.`);
  }

  const gewichte = tage.filter((t) => t.gewichtKg != null && Number(t.gewichtKg) > 0);
  if (gewichte.length >= 2) {
    const diff = Math.round((Number(gewichte[gewichte.length - 1]!.gewichtKg) - Number(gewichte[0]!.gewichtKg)) * 10) / 10;
    bilanz.push(`Gewicht: ${diff > 0 ? "+" : ""}${String(diff).replace(".", ",")} kg zwischen erster und letzter Wiegung.`);
    const richtig = ziel === "fat_loss" ? diff < 0 : ziel === "lean_bulk" ? diff > 0 : Math.abs(diff) <= 0.5;
    if (richtig) gut.push(`Das Gewicht bewegt sich in Richtung deines Ziels.`);
    else if (ziel === "lean_bulk" && diff <= -0.3) {
      besser.push(`Das Gewicht ging runter, obwohl Aufbau dein Ziel ist.`);
      tipps.push({ rang: 9, text: `Leg täglich rund 200 kcal drauf, etwa 50 g Haferflocken mit Milch, und schau nach zwei Wochen wieder auf die Waage.` });
    } else if (ziel === "fat_loss" && diff >= 0.3) {
      besser.push(`Das Gewicht ging hoch, obwohl Abnehmen dein Ziel ist.`);
    }
  }

  const mitSchlaf = tage.filter((t) => t.schlafMin != null && Number(t.schlafMin) > 0);
  if (mitSchlaf.length >= 3) {
    const h = mitSchlaf.reduce((s, t) => s + Number(t.schlafMin), 0) / mitSchlaf.length / 60;
    bilanz.push(`Schlaf im Schnitt ${String(Math.round(h * 10) / 10).replace(".", ",")} Stunden laut Apple Health.`);
    if (h < 7) {
      besser.push(`Unter sieben Stunden Schlaf im Schnitt.`);
      tipps.push({ rang: 5, text: `Stell dir eine feste Uhrzeit, ab der das Handy weg ist, und halt sie an fünf Abenden.` });
    }
  }

  const gewaehlt = tipps.sort((a, b) => b.rang - a.rang).slice(0, 3).map((t) => t.text);
  if (gewaehlt.length === 0) gewaehlt.push(`Behalt genau diesen Ablauf bei und steiger im Training eine Übung pro Einheit um eine Wiederholung oder 2,5 kg.`);

  const fokus = gewaehlt[0]!.split(". ")[0]!.replace(/\.$/, "") + ".";
  const fuer = art === "woche" ? "nächste Woche" : "den Rest der Woche";
  const titel = art === "woche" ? "Dein Wochenrückblick" : "Dein Zwischenstand zur Wochenmitte";
  const kurz = proteinQuote === null
    ? `${zeitraum[0]!.toUpperCase()}${zeitraum.slice(1)} ist zu wenig eingetragen für eine Bilanz. Tipp, um zu sehen, was fehlt.`
    : `Protein ${zeitraum} an ${prozent(proteinQuote)} Prozent der gezählten Tage gedeckt. Fokus für ${fuer}: ${fokus}`;

  const block = (kopf: string, zeilen: string[]) => (zeilen.length ? `${kopf}\n${zeilen.map((z) => `- ${z}`).join("\n")}` : "");
  const text = [
    titel,
    block("Die Zahlen", bilanz),
    block("Das lief gut", gut),
    block("Das geht besser", besser),
    block("Konkret", gewaehlt),
    `Fokus für ${fuer}: ${fokus}`,
  ].filter(Boolean).join("\n\n");

  return { art, titel, kurz, bilanz, gut, besser, tipps: gewaehlt, fokus, text };
}
