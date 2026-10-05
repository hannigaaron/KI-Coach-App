/**
 * Aufgaben aus Todoist.
 *
 * Wer seine Aufgaben schon in Todoist führt, pflegt sie nicht zweimal. Eine
 * zweite Liste in daevo, die neben der echten herläuft, ist nach einer Woche
 * veraltet, und dann plant der Coach mit dem falschen Stand. Deshalb liest
 * daevo die Aufgaben dort, wo sie stehen, und hakt sie dort ab.
 *
 * Todoist erlaubt Aufrufe direkt aus dem Browser, gemessen am Vorabruf: die
 * Antwort trägt `access-control-allow-origin` mit der anfragenden Adresse.
 * Damit braucht es keinen Server, und der Schlüssel des Nutzers verlässt nie
 * sein Gerät. Angemeldet wird mit dem persönlichen Token aus den Todoist
 * Einstellungen unter Integrationen, Entwickler.
 *
 * Abgerufen wird über die Schnittstelle v1, `https://api.todoist.com/api/v1`.
 */
import type { Aufgabe } from "@daevo/core";

const BASIS = "https://api.todoist.com/api/v1";

/**
 * Damit rechnet der Plan, wenn in Todoist keine Dauer steht.
 *
 * Eine Annahme, keine Messung, und der Plan sagt das jedes Mal dazu. Eine
 * belegte Zahl dafür gibt es nicht. Wer genauer planen will, trägt in Todoist
 * eine Dauer ein, und die gewinnt.
 */
export const TODOIST_STANDARD_MINUTEN = 30;

/** Höchstens so viele Seiten. Bei 200 je Seite sind das 1000 offene Aufgaben. */
const MAX_SEITEN = 5;

export interface TodoistOptionen {
  token: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

export class TodoistFehler extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
  }
}

/** Die Kennung, unter der eine Todoist Aufgabe in daevo läuft. */
export function todoistKennung(id: string): string {
  return `todoist:${id}`;
}

/** Die Todoist Kennung aus der daevo Kennung, oder null bei eigenen Aufgaben. */
export function todoistIdVon(kennung: string): string | null {
  return kennung.startsWith("todoist:") ? kennung.slice(8) : null;
}

/**
 * Eine Todoist Aufgabe als daevo Aufgabe.
 *
 * Priorität: Todoist zählt 4 für P1, die dringendste, und 1 für keine
 * Priorität. Ohne Priorität ist eine Aufgabe nicht nebensächlich, sie ist
 * einfach nicht bewertet, deshalb wird daraus die Mitte und nicht die 1.
 * P1 und P2 werden wichtig, P3 und ohne Priorität normal.
 *
 * Frist: die harte Frist in `deadline` schlägt das Datum in `due`. Viele
 * nutzen `due` als "an dem Tag mache ich es", und das ist für die Planung
 * dieselbe Aussage.
 *
 * Dauer: nur Minuten werden übernommen. Eine Dauer in Tagen sagt, dass sich
 * etwas über Tage zieht, nicht wie lange man daran sitzt.
 */
export function aufgabeAusTodoist(roh: unknown, heute: string): Aufgabe | null {
  if (!roh || typeof roh !== "object") return null;
  const t = roh as Record<string, any>;
  const id = t.id === undefined || t.id === null ? "" : String(t.id);
  const text = typeof t.content === "string" ? t.content.trim() : "";
  if (!id || !text) return null;
  if (t.checked === true || t.is_deleted === true) return null;

  const prio = Number(t.priority);
  const wichtigkeit = prio >= 3 ? 3 : 2;

  const datum = (v: unknown) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : null);
  const faellig = datum(t.deadline?.date) ?? datum(t.due?.date);

  const menge = Number(t.duration?.amount);
  const inMinuten = t.duration?.unit === "minute" && Number.isFinite(menge) && menge > 0;

  const erstellt = typeof t.added_at === "string" ? t.added_at : typeof t.created_at === "string" ? t.created_at : `${heute}T00:00:00`;

  return {
    id: todoistKennung(id),
    text,
    minuten: inMinuten ? Math.min(600, Math.round(menge)) : TODOIST_STANDARD_MINUTEN,
    faellig,
    wichtigkeit,
    erledigt: false,
    erstellt,
    quelle: "todoist",
    dauerAngenommen: !inMinuten,
  };
}

/** Alle offenen Aufgaben, über alle Seiten. */
export async function todoistAufgaben(heute: string, o: TodoistOptionen): Promise<Aufgabe[]> {
  const aufgaben: Aufgabe[] = [];
  let cursor: string | null = null;

  for (let seite = 0; seite < MAX_SEITEN; seite++) {
    const url = `${BASIS}/tasks?limit=200${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`;
    const json = await anfrage(url, "GET", o);
    // Die Schnittstelle v1 liefert `{ results, next_cursor }`. Eine blosse Liste
    // wird ebenfalls gelesen, sonst bricht eine kleine Änderung dort die App.
    const liste: unknown[] = Array.isArray(json) ? json : Array.isArray(json?.results) ? json.results : [];
    for (const roh of liste) {
      const a = aufgabeAusTodoist(roh, heute);
      if (a) aufgaben.push(a);
    }
    cursor = !Array.isArray(json) && typeof json?.next_cursor === "string" && json.next_cursor ? json.next_cursor : null;
    if (!cursor) break;
  }
  return aufgaben;
}

/** Hakt eine Aufgabe in Todoist ab. */
export async function todoistAbhaken(todoistId: string, o: TodoistOptionen): Promise<void> {
  await anfrage(`${BASIS}/tasks/${encodeURIComponent(todoistId)}/close`, "POST", o);
}

async function anfrage(url: string, methode: "GET" | "POST", o: TodoistOptionen): Promise<any> {
  const token = o.token.trim();
  if (!token) throw new TodoistFehler("Kein Todoist Token hinterlegt.");
  const holen = o.fetchImpl ?? fetch;
  const abbruch = new AbortController();
  const uhr = setTimeout(() => abbruch.abort(), o.timeoutMs ?? 10000);
  let antwort: Response;
  try {
    antwort = await holen(url, {
      method: methode,
      headers: { Authorization: `Bearer ${token}` },
      signal: abbruch.signal,
    });
  } catch {
    throw new TodoistFehler("Todoist ist gerade nicht erreichbar. Prüf die Verbindung.");
  } finally {
    clearTimeout(uhr);
  }
  if (antwort.status === 401 || antwort.status === 403) {
    throw new TodoistFehler("Todoist hat den Token abgelehnt. Kopier ihn neu aus Todoist, Einstellungen, Integrationen, Entwickler.", antwort.status);
  }
  if (!antwort.ok) throw new TodoistFehler(`Todoist antwortet mit Status ${antwort.status}.`, antwort.status);
  if (antwort.status === 204) return null;
  const typ = antwort.headers.get("content-type") || "";
  return typ.includes("json") ? antwort.json() : null;
}
