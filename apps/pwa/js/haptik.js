/**
 * Spürbare Rückmeldung an den Stellen, an denen etwas passiert ist.
 *
 * In der iPhone App über `HaptikPlugin.swift`, denn `navigator.vibrate` gibt
 * es auf dem iPhone nicht. Auf Android über `navigator.vibrate`, im Browser
 * auf dem Rechner gar nicht. Fehlt beides, passiert nichts, und das ist
 * richtig: eine Rückmeldung ist eine Zugabe und nie die einzige.
 *
 * Sparsam eingesetzt. Wer bei jedem Tippen vibriert, merkt nach einem Tag
 * nicht mehr, wann etwas wichtig war.
 */
import { istNativ } from "./konfig.js";
import { nativAufruf } from "./nativ.js";

const MUSTER = { leicht: 12, erfolg: [18, 60, 28], hinweis: [180, 80, 180] };

/** `art` ist leicht, erfolg oder hinweis. */
export function spueren(art = "leicht") {
  try {
    if (istNativ()) { nativAufruf("Haptik", "spueren", { art }).catch(() => {}); return; }
    globalThis.navigator?.vibrate?.(MUSTER[art] ?? MUSTER.leicht);
  } catch { /* nicht jedes Gerät kann das */ }
}
