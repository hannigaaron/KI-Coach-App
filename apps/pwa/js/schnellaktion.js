/**
 * Knöpfe an einer Mitteilung, die ohne die App etwas tun: Wasser dazu, ein
 * Training verschieben. Die Knöpfe stehen in `MitteilungenPlugin.swift`, auf
 * der Apple Watch zeigt watchOS dieselben.
 *
 * Ohne Fenster, deshalb muss jede Aktion eine Rückmeldung geben: wer auf
 * "+ 0,5 l" tippt und nichts sieht, tippt nochmal. Die App schickt dafür eine
 * Mitteilung mit dem Ergebnis, wenn sie nicht vorn liegt.
 *
 * Kein `document`, kein `window`: das Modul läuft auch in den Tests.
 */

/** Milliliter je Knopf, wie in `MitteilungenPlugin.swift`. */
export const WASSER_AKTIONEN = { wasser_250: 250, wasser_500: 500, wasser_1000: 1000 };

const liter = (ml) => `${(ml / 1000).toLocaleString("de-DE", { maximumFractionDigits: 2 })} l`;

const tagVon = (ms) => {
  const d = new Date(Number(ms) || Date.now());
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/**
 * Bucht das Wasser auf den Tag, an dem getippt wurde, nicht auf den, an dem
 * die App danach öffnet. Liegt der Tipp Stunden zurück, weil daevo beendet
 * war, zählt es trotzdem am richtigen Tag. Gibt den Satz für die Rückmeldung
 * zurück, oder null, wenn es keine Wasseraktion war.
 */
export function wasserAusAktion(eintrag, store) {
  const ml = WASSER_AKTIONEN[eintrag?.aktion];
  if (!ml) return null;
  const tag = tagVon(eintrag.at);
  store.addWater(tag, ml);
  return `+ ${liter(ml)} Wasser, an diesem Tag jetzt ${liter(store.getDay(tag).waterMl || 0)}.`;
}
