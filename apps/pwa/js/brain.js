import { coreMemories, memoriesToPrompt, searchMemories, upsertMemory } from "@daevo/core";
import { store } from "./storage.js";

/**
 * Das Gedächtnis der App, so wie die Oberfläche es benutzt.
 *
 * Die Logik steckt in @daevo/core und ist dort getestet. Hier liegt nur die
 * Verbindung zum Speicher und die Aufbereitung für den Assistenten.
 */

export const brain = {
  all() {
    return store.getMemories();
  },

  add({ text, art = "fakt", wichtigkeit = 3, schlagworte = [], quelle = "nutzer" }) {
    const result = upsertMemory(store.getMemories(), {
      kind: art,
      text,
      tags: schlagworte,
      weight: wichtigkeit,
      source: quelle === "coach" ? "coach" : "nutzer",
    });
    store.setMemories(result.entries);
    return result;
  },

  remove(id) {
    store.setMemories(store.getMemories().filter((e) => e.id !== id));
  },

  search(query, limit = 6) {
    return searchMemories(store.getMemories(), query, { limit });
  },

  /**
   * Baut den Gedächtnisblock für den Systemprompt.
   * Die wichtigsten Notizen kommen immer mit, dazu das, was zur Frage passt.
   */
  /**
   * Was der Coach über den Nutzer wissen muss, passend zur Frage.
   *
   * `anzahl` begrenzt, wie viele Notizen mitgehen. Beim reinen Erfassen einer
   * Mahlzeit braucht niemand zehn Notizen über Familie und Ziele im Prompt.
   * Die kosten dort nur Geld und lenken das Modell von der Menge ab.
   */
  contextFor(query, anzahl = 10) {
    const entries = store.getMemories();
    if (entries.length === 0) return "Noch keine Notizen über diesen Nutzer.";
    const halbe = Math.max(2, Math.ceil(anzahl * 0.6));
    const relevant = searchMemories(entries, query, { limit: halbe }).map((h) => h.entry);
    const core = coreMemories(entries, halbe);
    const seen = new Set();
    const merged = [];
    for (const entry of [...relevant, ...core]) {
      if (seen.has(entry.id)) continue;
      seen.add(entry.id);
      merged.push(entry);
    }
    return memoriesToPrompt(merged.slice(0, anzahl));
  },
};
