import type { Anhang, CoachProvider } from "./provider.js";

/**
 * Kopf leeren.
 *
 * Der Nutzer redet alles raus, was ihm im Kopf herumgeht, in einem Stück und
 * ungeordnet. Zurück kommt eine geordnete Liste: was davon eine Aufgabe ist,
 * was eine Entscheidung, was eine Sorge ohne Handlung, und womit er in den
 * nächsten zehn Minuten anfängt.
 *
 * Der Wert liegt in der Trennung. Was im Kopf gleich schwer wiegt, ist es auf
 * Papier nicht: "Angebot schreiben" sind vierzig Minuten, "wird meine
 * Schwester je alleine leben können" ist keine Aufgabe und gehört nicht in
 * eine To Do Liste, sondern in ein Gespräch. Wer beides in dieselbe Liste
 * schreibt, arbeitet die Liste nie ab und hält sich für undiszipliniert.
 *
 * Drei Regeln stehen im Prompt und im Schema:
 *
 * Eine Aufgabe ist eine Handlung mit einem sichtbaren Ende. "Mehr Struktur"
 * ist keine Aufgabe. "Montag früh 30 Minuten Wochenplan schreiben" schon.
 *
 * Was er nicht beeinflussen kann, kommt nicht in die Liste. Es wird benannt
 * und beiseite gelegt, sonst trägt er es weiter mit sich herum.
 *
 * Genau eine Sache kommt zuerst. Eine Liste ohne erste Zeile ist wieder nur
 * ein Haufen.
 */

export interface KopfAufgabe {
  text: string;
  /** Geschätzter Aufwand in Minuten. */
  minuten: number;
  /** 1 nebensächlich, 2 normal, 3 wichtig. */
  wichtigkeit: number;
  /** Warum genau diese Einstufung. Ein Halbsatz. */
  warum: string;
}

export interface KopfErgebnis {
  /** Was eigentlich los ist, in ein bis zwei Sätzen. */
  kern: string;
  /** Die Aufgaben, sortiert. Die erste ist die, mit der er anfängt. */
  aufgaben: KopfAufgabe[];
  /** Entscheidungen, die anstehen. Keine Aufgaben, sondern Weggabelungen. */
  entscheidungen: string[];
  /** Was ihn belastet, aber keine Handlung ist. */
  sorgen: string[];
  /** Was er nicht beeinflussen kann. Wird benannt und beiseite gelegt. */
  nichtBeeinflussbar: string[];
  /** Womit er in den nächsten zehn Minuten anfängt. */
  ersterSchritt: string;
  /** Höchstens eine Rückfrage. Leer, wenn keine nötig ist. */
  rueckfrage: string;
  /** Ohne Modell entstanden, also grob. */
  regelbasiert?: boolean;
}

export const KOPF_SYSTEM = `Du bekommst gleich alles, was einem Menschen gerade im Kopf herumgeht.
Ungeordnet, mitten im Satz abbrechend, durcheinander. Deine Aufgabe ist, daraus Ordnung zu machen.

So gehst du vor:

Lies zuerst das Ganze und sag in ein bis zwei Sätzen, was eigentlich los ist. Nicht zusammenfassen,
was er gesagt hat, sondern benennen, was darunter liegt. Meistens ist es eine Sache, die alles
andere schwer macht.

Dann sortierst du jedes Stück in genau eine von vier Schubladen:

Aufgabe. Eine Handlung mit einem sichtbaren Ende, die er selbst tun kann. Schreib sie als Handlung,
beginnend mit einem Verb. "Mehr Struktur" ist keine Aufgabe. "Sonntag 30 Minuten Wochenplan
schreiben" ist eine. Schätz den Aufwand in Minuten realistisch, eher zu grosszügig. Setz die
Wichtigkeit auf 3 nur für das, was wirklich etwas verändert, sonst auf 2, und auf 1 für Kleinkram.

Entscheidung. Eine Weggabelung, an der noch nichts zu tun ist, weil er sich erst entscheiden muss.
Formulier sie als Frage mit zwei Möglichkeiten.

Sorge. Etwas, das ihn belastet, aber keine Handlung ist. Die gehört nicht in eine Aufgabenliste.
Sie wird benannt, damit sie nicht als unerledigte Aufgabe weiterläuft.

Nicht beeinflussbar. Was von anderen abhängt oder schon passiert ist. Wird benannt und beiseite
gelegt.

Zum Schluss nennst du genau eine Sache, mit der er in den nächsten zehn Minuten anfängt. Die
kleinste, die etwas löst, nicht die grösste. Wenn er festhängt, ist die richtige erste Sache oft
nicht die wichtigste, sondern die, die den Kopf frei macht.

Regeln:

Erfinde nichts dazu. Was er nicht gesagt hat, kommt nicht in die Liste.
Sortier lieber in Sorge als in Aufgabe, wenn du unsicher bist. Eine falsche Aufgabe erzeugt
schlechtes Gewissen, eine benannte Sorge nicht.
Zwischen fünf und zwölf Aufgaben. Mehr kann niemand ansehen, ohne sich schlechter zu fühlen als vorher.
Höchstens eine Rückfrage, und nur, wenn ohne die Antwort die halbe Liste geraten wäre.
Keine Beruhigung, keine Motivationssätze, keine Floskeln. Er will Ordnung, keinen Zuspruch.`;

const KOPF_SCHEMA = {
  type: "object",
  properties: {
    kern: { type: "string", description: "Was eigentlich los ist, ein bis zwei Sätze." },
    aufgaben: {
      type: "array",
      description: "Fünf bis zwölf Handlungen, die wichtigste zuerst.",
      items: {
        type: "object",
        properties: {
          text: { type: "string", description: "Die Handlung, beginnend mit einem Verb." },
          minuten: { type: "number", description: "Geschätzter Aufwand, 5 bis 480." },
          wichtigkeit: { type: "number", description: "1, 2 oder 3." },
          warum: { type: "string", description: "Ein Halbsatz zur Einstufung." },
        },
        required: ["text", "minuten", "wichtigkeit", "warum"],
      },
    },
    entscheidungen: {
      type: "array",
      items: { type: "string" },
      description: "Weggabelungen als Frage mit zwei Möglichkeiten.",
    },
    sorgen: {
      type: "array",
      items: { type: "string" },
      description: "Was belastet, aber keine Handlung ist.",
    },
    nichtBeeinflussbar: {
      type: "array",
      items: { type: "string" },
      description: "Was von anderen abhängt oder schon passiert ist.",
    },
    ersterSchritt: { type: "string", description: "Die eine Sache für die nächsten zehn Minuten." },
    rueckfrage: { type: "string", description: "Höchstens eine. Sonst leer." },
  },
  required: ["kern", "aufgaben", "entscheidungen", "sorgen", "nichtBeeinflussbar", "ersterSchritt", "rueckfrage"],
} as const;

/** Wie viele Aufgaben höchstens zurückkommen. Mehr hilft niemandem. */
const MAX_AUFGABEN = 12;

export async function kopfLeeren(
  provider: CoachProvider,
  text: string,
  zusatz: { zeit?: string; kalender?: string; anhaenge?: Anhang[]; modell?: string } = {},
): Promise<KopfErgebnis> {
  if (!provider.available) return regelKopf(text);

  const rahmen = [
    zusatz.zeit ? `Aktueller Zeitpunkt: ${zusatz.zeit}` : "",
    zusatz.kalender ? `Sein Kalender heute:\n${zusatz.kalender}` : "",
    "",
    "Das ist, was ihm im Kopf herumgeht:",
    text,
  ].filter(Boolean).join("\n");

  try {
    const roh = await provider.generateJson<Partial<KopfErgebnis>>({
      system: KOPF_SYSTEM,
      user: rahmen,
      anhaenge: zusatz.anhaenge,
      schema: KOPF_SCHEMA as unknown as Record<string, unknown>,
      schemaName: "kopf_leeren",
      maxTokens: 4096,
      modell: zusatz.modell,
    });
    return saeubern(roh);
  } catch {
    // Lieber eine grobe Ordnung als gar keine. Der Nutzer erfährt, dass sie
    // grob ist, damit er sie nicht für die Arbeit des Modells hält.
    return regelKopf(text);
  }
}

function saeubern(roh: Partial<KopfErgebnis>): KopfErgebnis {
  const aufgaben = (Array.isArray(roh.aufgaben) ? roh.aufgaben : [])
    .map((a) => ({
      text: String(a?.text ?? "").trim(),
      minuten: Math.max(5, Math.min(480, Math.round(Number(a?.minuten) || 30))),
      wichtigkeit: Math.max(1, Math.min(3, Math.round(Number(a?.wichtigkeit) || 2))),
      warum: String(a?.warum ?? "").trim(),
    }))
    .filter((a) => a.text.length >= 3)
    .slice(0, MAX_AUFGABEN);

  return {
    kern: String(roh.kern ?? "").trim(),
    aufgaben,
    entscheidungen: liste(roh.entscheidungen),
    sorgen: liste(roh.sorgen),
    nichtBeeinflussbar: liste(roh.nichtBeeinflussbar),
    ersterSchritt: String(roh.ersterSchritt ?? "").trim() || (aufgaben[0]?.text ?? ""),
    rueckfrage: String(roh.rueckfrage ?? "").trim(),
  };
}

function liste(wert: unknown): string[] {
  if (!Array.isArray(wert)) return [];
  return wert
    .map((x) => String(x ?? "").trim())
    .filter((x) => x.length >= 3)
    .slice(0, 8);
}

/* ---------- Ohne Modell ---------- */

/** Wortgruppen, an denen ein regelbasierter Durchgang eine Handlung erkennt. */
const HANDLUNG = /\b(muss|müsste|musste|sollte|soll|will|wollte|möchte|mochte|brauche|anrufen|schreiben|machen|erledigen|planen|buchen|fertig|abgeben|melden|schicken|kaufen|aufräumen|aufraeumen|vorbereiten|klären|klaeren|nachfragen|absagen|zusagen)\b/i;
const SORGE = /\b(angst|sorge|sorgen|schuld|scham|schäme|schame|traurig|müde|mude|überfordert|ueberfordert|stress|druck|weiss nicht|weiß nicht|keine ahnung|hoffe|hoffentlich)\b/i;
const ENTSCHEIDUNG = /\b(oder|entweder|entscheiden|entscheidung|soll ich|ob ich)\b/i;
const FREMD = /\b(er |sie |die anderen|mein chef|david|antwortet nicht|meldet sich nicht|wartet auf|liegt nicht an mir)\b/i;

/**
 * Der Weg ohne Schlüssel.
 *
 * Er versteht nichts, er sortiert nur. Sätze mit einem Handlungswort werden
 * Aufgaben, Sätze mit einem Gefühlswort werden Sorgen, der Rest fällt weg.
 * Das ist grob, und genau das steht auch in der Antwort. Besser als eine leere
 * Seite ist es trotzdem: die Trennung von Aufgabe und Sorge ist der halbe
 * Nutzen, und dafür braucht es kein Modell.
 */
export function regelKopf(text: string): KopfErgebnis {
  const stuecke = text
    .split(/(?:[.!?\n]+|\bund dann\b|\baußerdem\b|\bausserdem\b|\bund noch\b)/i)
    .map((s) => s.trim())
    .filter((s) => s.length >= 8);

  const aufgaben: KopfAufgabe[] = [];
  const sorgen: string[] = [];
  const entscheidungen: string[] = [];
  const fremd: string[] = [];

  for (const stueck of stuecke) {
    const kurz = stueck.length > 120 ? `${stueck.slice(0, 117)}...` : stueck;
    if (FREMD.test(stueck) && !HANDLUNG.test(stueck)) { fremd.push(kurz); continue; }
    if (SORGE.test(stueck) && !HANDLUNG.test(stueck)) { sorgen.push(kurz); continue; }
    if (ENTSCHEIDUNG.test(stueck) && !HANDLUNG.test(stueck)) { entscheidungen.push(kurz); continue; }
    if (HANDLUNG.test(stueck)) {
      aufgaben.push({
        text: kurz,
        minuten: schaetzeMinuten(stueck),
        wichtigkeit: 2,
        warum: "aus deinem Text übernommen, nicht bewertet",
      });
    }
  }

  return {
    kern: aufgaben.length
      ? `${aufgaben.length} Handlungen und ${sorgen.length} Dinge, die dich belasten, ohne dass es dafür eine Aufgabe gibt.`
      : "Aus deinem Text konnte ich ohne Modell keine klare Handlung herauslesen.",
    aufgaben: aufgaben.slice(0, MAX_AUFGABEN),
    entscheidungen: entscheidungen.slice(0, 8),
    sorgen: sorgen.slice(0, 8),
    nichtBeeinflussbar: fremd.slice(0, 8),
    ersterSchritt: aufgaben[0]?.text ?? "",
    rueckfrage: "",
    regelbasiert: true,
  };
}

/** Grobe Schätzung nach Schlüsselwörtern. Im Zweifel eher zu lang. */
function schaetzeMinuten(text: string): number {
  const t = text.toLowerCase();
  if (/\b(anrufen|melden|schicken|antworten|absagen|zusagen|nachfragen)\b/.test(t)) return 15;
  if (/\b(konzept|plan|strategie|website|video|dreh|vorbereiten)\b/.test(t)) return 120;
  if (/\b(schreiben|angebot|rechnung|mail)\b/.test(t)) return 45;
  return 30;
}

/** Das Ergebnis in Worten. Die Reihenfolge ist Absicht: erst der Kern, dann die erste Sache. */
export function kopfText(e: KopfErgebnis): string {
  const zeilen: string[] = [];
  if (e.kern) zeilen.push(e.kern, "");
  if (e.ersterSchritt) zeilen.push(`Fang hiermit an: ${e.ersterSchritt}`, "");

  if (e.aufgaben.length) {
    zeilen.push("Aufgaben, sortiert:");
    for (const a of e.aufgaben) zeilen.push(`- ${a.text} (${a.minuten} Minuten, ${a.warum})`);
  }
  if (e.entscheidungen.length) {
    zeilen.push("", "Das sind keine Aufgaben, sondern Entscheidungen:");
    for (const d of e.entscheidungen) zeilen.push(`- ${d}`);
  }
  if (e.sorgen.length) {
    zeilen.push("", "Das belastet dich, ist aber keine Aufgabe. Es gehört nicht auf eine Liste:");
    for (const s of e.sorgen) zeilen.push(`- ${s}`);
  }
  if (e.nichtBeeinflussbar.length) {
    zeilen.push("", "Das hängt nicht an dir. Leg es weg:");
    for (const n of e.nichtBeeinflussbar) zeilen.push(`- ${n}`);
  }
  if (e.rueckfrage) zeilen.push("", e.rueckfrage);
  if (e.regelbasiert) {
    zeilen.push("", "Das ist ohne KI Schlüssel entstanden und deshalb grob sortiert, nicht verstanden.");
  }
  return zeilen.join("\n");
}
