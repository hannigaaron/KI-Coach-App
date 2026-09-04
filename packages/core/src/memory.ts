/**
 * Das Gedaechtnis der App.
 *
 * Ziel ist ein eigenes Gehirn: alles, was der Nutzer erzaehlt, bleibt in der
 * App und steht spaeter wieder zur Verfuegung. Der Coach soll sich an eine
 * Verletzung von vor drei Wochen erinnern, ohne dass jemand danach sucht.
 *
 * Bewusst ohne Einbettungen und ohne Vektordatenbank. Die Suche laeuft ueber
 * Wortueberlappung mit inverser Dokumenthaeufigkeit. Das ist nachvollziehbar,
 * braucht kein Modell, laeuft offline und ist schnell genug fuer die Menge an
 * Notizen, die ein einzelner Mensch in Jahren erzeugt. Fuer eine bessere Suche
 * waeren Einbettungen der naechste Schritt, siehe docs/ROADMAP.md.
 */

export type MemoryKind =
  | "fakt"        // stabile Tatsache, etwa eine Unvertraeglichkeit
  | "praeferenz"  // Vorliebe oder Abneigung
  | "ziel"        // was der Nutzer erreichen will
  | "ereignis"    // etwas Datiertes, etwa eine Verletzung
  | "reflexion"   // eigene Gedanken des Nutzers
  | "hinweis";    // Beobachtung des Coaches

export interface MemoryEntry {
  id: string;
  /** Zeitpunkt der Aufnahme, ISO 8601. */
  at: string;
  kind: MemoryKind;
  text: string;
  tags: string[];
  /** Wichtigkeit von 1 bis 5. Steuert das Ranking, nicht die Wahrheit. */
  weight: number;
  source: "nutzer" | "coach";
}

const STOPWORDS = new Set([
  "und", "oder", "aber", "dass", "das", "der", "die", "den", "dem", "des", "ein",
  "eine", "einen", "einem", "einer", "eines", "ich", "du", "er", "sie", "es",
  "wir", "ihr", "mir", "mich", "dir", "dich", "sich", "mein", "meine", "meinen",
  "dein", "deine", "ist", "sind", "war", "waren", "bin", "bist", "habe", "hab",
  "hat", "haben", "hatte", "hatten", "wird", "werden", "wurde", "kann", "koennen",
  "will", "willst", "wollen", "soll", "sollen", "muss", "muessen", "nicht", "kein",
  "keine", "noch", "schon", "auch", "sehr", "mehr", "wenig", "viel", "immer", "nie",
  "heute", "gestern", "morgen", "jetzt", "dann", "wenn", "weil", "fuer", "mit",
  "ohne", "von", "vom", "zum", "zur", "auf", "aus", "bei", "nach", "vor", "ueber",
  "unter", "durch", "gegen", "um", "an", "am", "im", "in", "zu", "so", "wie", "was",
  "wer", "wo", "warum", "sich", "man", "als", "am", "the", "and", "for", "with",
]);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((t) => t.length >= 3 && !STOPWORDS.has(t));
}

/** Inverse Dokumenthaeufigkeit ueber alle Eintraege. Seltene Woerter wiegen mehr. */
function buildIdf(entries: MemoryEntry[]): Map<string, number> {
  const df = new Map<string, number>();
  for (const entry of entries) {
    for (const token of new Set(tokenize(`${entry.text} ${entry.tags.join(" ")}`))) {
      df.set(token, (df.get(token) ?? 0) + 1);
    }
  }
  const idf = new Map<string, number>();
  const total = Math.max(1, entries.length);
  for (const [token, count] of df) {
    idf.set(token, Math.log(1 + total / count));
  }
  return idf;
}

const HALF_LIFE_DAYS = 60;

/** Neuere Eintraege bekommen einen Bonus, alte verschwinden nicht. */
function recencyBoost(at: string, now: Date): number {
  const ageDays = (now.getTime() - new Date(at).getTime()) / 86_400_000;
  if (!Number.isFinite(ageDays) || ageDays < 0) return 1;
  return 0.5 ** (ageDays / HALF_LIFE_DAYS);
}

export interface ScoredMemory {
  entry: MemoryEntry;
  score: number;
}

/**
 * Sucht die passendsten Erinnerungen zu einer Frage.
 * Ein Eintrag ohne ein einziges gemeinsames Wort wird nie zurueckgegeben.
 */
export function searchMemories(
  entries: MemoryEntry[],
  query: string,
  options: { limit?: number; now?: Date } = {},
): ScoredMemory[] {
  const limit = options.limit ?? 6;
  const now = options.now ?? new Date();
  const queryTokens = new Set(tokenize(query));
  if (queryTokens.size === 0 || entries.length === 0) return [];

  const idf = buildIdf(entries);
  const scored: ScoredMemory[] = [];
  for (const entry of entries) {
    const entryTokens = new Set(tokenize(`${entry.text} ${entry.tags.join(" ")}`));
    let overlap = 0;
    for (const token of queryTokens) {
      if (entryTokens.has(token)) overlap += idf.get(token) ?? 1;
    }
    if (overlap === 0) continue;
    const score = overlap * (1 + 0.15 * entry.weight) * (0.6 + 0.4 * recencyBoost(entry.at, now));
    scored.push({ entry, score: Math.round(score * 1000) / 1000 });
  }
  return scored.sort((a, b) => b.score - a.score || b.entry.at.localeCompare(a.entry.at)).slice(0, limit);
}

/** Die wichtigsten Eintraege ohne Suchbegriff, fuer den Einstieg ins Gespraech. */
export function coreMemories(entries: MemoryEntry[], limit = 8, now = new Date()): MemoryEntry[] {
  return [...entries]
    .sort((a, b) => {
      const byWeight = b.weight - a.weight;
      if (byWeight !== 0) return byWeight;
      return recencyBoost(b.at, now) - recencyBoost(a.at, now);
    })
    .slice(0, limit);
}

const DUPLICATE_THRESHOLD = 0.72;

/** Anteil gemeinsamer Woerter, unabhaengig von der Reihenfolge. */
export function similarity(a: string, b: string): number {
  const setA = new Set(tokenize(a));
  const setB = new Set(tokenize(b));
  if (setA.size === 0 || setB.size === 0) return 0;
  let shared = 0;
  for (const token of setA) if (setB.has(token)) shared++;
  return shared / Math.min(setA.size, setB.size);
}

export interface UpsertResult {
  entries: MemoryEntry[];
  action: "hinzugefuegt" | "aktualisiert" | "verworfen";
  entry: MemoryEntry | null;
}

/**
 * Nimmt einen neuen Eintrag auf.
 *
 * Sagt der Nutzer zweimal fast dasselbe, entsteht kein zweiter Eintrag. Der
 * bestehende wird aufgefrischt und seine Wichtigkeit steigt. Sonst waere das
 * Gedaechtnis nach wenigen Wochen voller Dubletten.
 */
export function upsertMemory(
  entries: MemoryEntry[],
  candidate: Omit<MemoryEntry, "id" | "at"> & { id?: string; at?: string },
): UpsertResult {
  const text = candidate.text.trim();
  if (text.length < 4) return { entries, action: "verworfen", entry: null };

  const at = candidate.at ?? new Date().toISOString();
  const existingIndex = entries.findIndex(
    (e) => e.kind === candidate.kind && similarity(e.text, text) >= DUPLICATE_THRESHOLD,
  );

  if (existingIndex >= 0) {
    const existing = entries[existingIndex] as MemoryEntry;
    const merged: MemoryEntry = {
      ...existing,
      text: text.length > existing.text.length ? text : existing.text,
      at,
      weight: Math.min(5, Math.max(existing.weight, candidate.weight)),
      tags: [...new Set([...existing.tags, ...candidate.tags])],
    };
    const next = [...entries];
    next[existingIndex] = merged;
    return { entries: next, action: "aktualisiert", entry: merged };
  }

  const entry: MemoryEntry = {
    id: candidate.id ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    at,
    kind: candidate.kind,
    text,
    tags: candidate.tags,
    weight: Math.min(5, Math.max(1, Math.round(candidate.weight))),
    source: candidate.source,
  };
  return { entries: [...entries, entry], action: "hinzugefuegt", entry };
}

/** Verdichtet Erinnerungen zu einem Block fuer den Systemprompt. */
export function memoriesToPrompt(entries: MemoryEntry[]): string {
  if (entries.length === 0) return "Noch keine Notizen ueber diesen Nutzer.";
  return entries
    .map((e) => `- [${e.kind}, ${e.at.slice(0, 10)}] ${e.text}`)
    .join("\n");
}
