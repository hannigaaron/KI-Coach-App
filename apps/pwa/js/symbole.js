/**
 * Linien Symbole für den Anamnesebogen und die Einführung.
 *
 * Alle auf einem Raster von 24 mit derselben Strichstärke und runden Enden,
 * dieselbe Rundung wie am d der Wortmarke. Keine Emoji: die sehen auf jedem
 * Gerät anders aus und tragen eine fremde Farbigkeit in die Palette.
 *
 * Die Farbe kommt über `currentColor` aus dem Stylesheet. Ein Symbol mit fest
 * eingetragener Farbe stimmt in einem der beiden Farbmodi nicht.
 */

const PFADE = {
  pfeilLinks: '<path d="M19 12H5"/><path d="M11 6l-6 6 6 6"/>',
  haken: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  schild: '<path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z"/><path d="M9 12l2 2 4-4"/>',
  idee: '<path d="M9 18h6"/><path d="M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>',
  regler: '<path d="M4 7h10"/><path d="M18 7h2"/><circle cx="16" cy="7" r="2"/><path d="M4 17h2"/><path d="M10 17h10"/><circle cx="8" cy="17" r="2"/>',

  maennlich: '<circle cx="10" cy="14" r="5"/><path d="M14 10l6-6"/><path d="M15 4h5v5"/>',
  weiblich: '<circle cx="12" cy="9" r="5"/><path d="M12 14v7"/><path d="M9 18h6"/>',

  flamme: '<path d="M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2.5 1.5-4 2.5-5 .3 1.6 1 2.5 2 3 .5-3-.5-5.5.5-8z"/>',
  waage: '<path d="M12 4v16"/><path d="M8 20h8"/><path d="M5 8h14"/><path d="M5 8l-2.5 6a2.5 2.5 0 0 0 5 0z"/><path d="M19 8l-2.5 6a2.5 2.5 0 0 0 5 0z"/>',
  hantel: '<path d="M7 12h10"/><path d="M5 8v8"/><path d="M19 8v8"/><path d="M2.5 10v4"/><path d="M21.5 10v4"/>',

  stuhl: '<path d="M7 3v9h10"/><path d="M7 12v9"/><path d="M17 12v9"/><path d="M7 16h10"/>',
  gehen: '<circle cx="13" cy="4.5" r="1.5"/><path d="M11 21l2-6-2.5-2.5 1-5 3 2.5 2.5 1"/><path d="M8.5 11.5l2-4"/><path d="M13 15l2.5 6"/>',
  stehen: '<circle cx="12" cy="4.5" r="1.5"/><path d="M12 8v7"/><path d="M9 21l3-6 3 6"/><path d="M8 11h8"/>',
  kiste: '<path d="M4 8l8-4 8 4v8l-8 4-8-4z"/><path d="M4 8l8 4 8-4"/><path d="M12 12v8"/>',
  sofa: '<path d="M5 11V8a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v3"/><path d="M3 13a2 2 0 0 1 4 0v2h10v-2a2 2 0 0 1 4 0v5H3z"/><path d="M5 18v2"/><path d="M19 18v2"/>',
  laufen: '<circle cx="15" cy="4.5" r="1.5"/><path d="M5 21l4-5 3 1 2-4"/><path d="M8 10l4-3 3 2 1 3 3 1"/><path d="M14 13l3 3-1 5"/>',

  keim: '<path d="M12 21v-9"/><path d="M12 12c0-4-3-6-7-6 0 4 3 6 7 6z"/><path d="M12 14c0-3.5 2.5-5.5 6-5.5 0 3.5-2.5 5.5-6 5.5z"/>',
  keule: '<path d="M14.5 4a5.5 5.5 0 0 1 2.4 10.5L12 19.5"/><path d="M14.5 4a5.5 5.5 0 0 0-5.3 7L4.5 15.7"/><path d="M4.5 15.7a2 2 0 1 0 2.8 2.8 2 2 0 1 0 2.8 2.8L12 19.5"/>',
  apfel: '<path d="M12 7c-2-1.5-6-1-6 4 0 4 3 9 6 8 3 1 6-4 6-8 0-5-4-5.5-6-4z"/><path d="M12 7c0-2 1-3.5 3-4"/>',
  blatt: '<path d="M5 19c0-8 5-14 14-14 0 9-6 14-14 14z"/><path d="M5 19l8-8"/>',
  fisch: '<path d="M3 12c3-4 7-5 11-5 3 0 5 2.5 6 5-1 2.5-3 5-6 5-4 0-8-1-11-5z"/><path d="M3 12l-1-3"/><path d="M3 12l-1 3"/><circle cx="16" cy="11" r="0.6"/>',

  wiederholen: '<path d="M4 11a8 8 0 0 1 14-4.5L20 8"/><path d="M20 4v4h-4"/><path d="M20 13a8 8 0 0 1-14 4.5L4 16"/><path d="M4 20v-4h4"/>',
  kalender: '<rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17"/><path d="M8 3v4"/><path d="M16 3v4"/>',
  wechsel: '<path d="M4 7h11l-3-3"/><path d="M20 17H9l3 3"/><path d="M15 7l3 3"/><path d="M9 17l-3-3"/>',

  mond: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
  welle: '<path d="M3 12c2-3 4-3 6 0s4 3 6 0 4-3 6 0"/><path d="M3 17c2-3 4-3 6 0s4 3 6 0 4-3 6 0"/><path d="M3 7c2-3 4-3 6 0s4 3 6 0 4-3 6 0"/>',
  tropfen: '<path d="M12 3c3 4 6 7.5 6 11a6 6 0 0 1-12 0c0-3.5 3-7 6-11z"/>',
  sonne: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2"/><path d="M12 19.5v2"/><path d="M2.5 12h2"/><path d="M19.5 12h2"/><path d="M5.3 5.3l1.4 1.4"/><path d="M17.3 17.3l1.4 1.4"/><path d="M5.3 18.7l1.4-1.4"/><path d="M17.3 6.7l1.4-1.4"/>',
};

/**
 * Ein Symbol als SVG. Unbekannte Namen ergeben einen leeren String statt
 * eines Fehlers: ein fehlendes Symbol ist ein Schönheitsfehler, ein Absturz
 * im Fragebogen ist eine leere App.
 */
export function symbol(name, { groesse = 24, klasse = "sym" } = {}) {
  const pfad = PFADE[name];
  if (!pfad) return "";
  return `<svg class="${klasse}" width="${groesse}" height="${groesse}" viewBox="0 0 24 24" fill="none" `
    + `stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${pfad}</svg>`;
}

export const SYMBOLNAMEN = Object.keys(PFADE);
