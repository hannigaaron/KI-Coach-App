/**
 * Das Briefing als kleine Präsentation: Karten, die von selbst weiterlaufen,
 * oben Balken wie bei einer Story, Tipp rechts weiter, Tipp links zurück,
 * halten pausiert, nach unten wischen schliesst.
 *
 * Vorher stand das Briefing als Textblock auf Dein Tag, mit Abschnitten,
 * Strichen und ganzen Sätzen. Das liest abends niemand. Eine Karte trägt
 * einen Gedanken, eine grosse Zahl oder höchstens fünf Zeilen, und der Rest
 * bleibt im Text für Chat und Mitteilung.
 *
 * Die Karten rechnet der Kern, `briefingFolien` in
 * packages/core/src/tagesbriefing.ts. Hier wird nur gezeichnet. Der Aufbau
 * ist jeden Tag derselbe, damit man weiss, wo was steht, nur der Inhalt
 * wechselt mit Kalender, Aufgaben und Essen.
 *
 * `folieHtml` und `folieDauer` fassen weder `document` noch `window` an,
 * damit sie ohne Browser getestet werden können.
 */

const esc = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/** Linien in einer Stärke mit runden Enden, wie überall in daevo. */
/** Was "Anpassen" auf welcher Karte heisst. Start und Ende haben nichts anzupassen, Essen ändert je Zeile. */
const ANPASSEN = {
  rueckblick: "Essen nachtragen", fokus: "Fokus ändern", tag: "Im Kalender ändern", tun: "Aufgaben anpassen",
  achtung: "Im Kalender ansehen", untergrenze: "Standards anpassen",
};

const ZEICHEN = {
  stift: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
  sonne: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>',
  mond: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
  ziel: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="0.8"/>',
  uhr: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  haken: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  hantel: '<path d="M6.5 8v8M17.5 8v8M3.5 10v4M20.5 10v4M6.5 12h11"/>',
  achtung: '<path d="M12 4l9 15.5H3z"/><path d="M12 10v4M12 16.8v.2"/>',
  essen: '<path d="M7 3v8a2 2 0 0 0 4 0V3M9 11v10M17 3c-1.7 1-3 3.3-3 6.5V13h3v8"/>',
  fahne: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
  geschenk: '<path d="M4 11h16v9H4zM3 7.5h18V11H3zM12 7.5V20M12 7.5c-1.5-3-5-3.5-5-1s3 1 5 1c2 0 5 1.5 5-1s-3.5-2-5 1"/>',
  topf: '<path d="M4 10h16v6a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4zM2.5 10h19M9 6.5c0-1 1-1.5 1-2.5M14 6.5c0-1 1-1.5 1-2.5"/>',
  muster: '<path d="M4 19V9M10 19V5M16 19v-7M22 19H2"/>',
  trend: '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
  blitz: '<path d="M13 2.5L5 13.5h6l-1 8 8-11h-6z"/>',
  bett: '<path d="M3 18V8M3 14h18v4M21 14v-2a3 3 0 0 0-3-3h-7v5"/><circle cx="7" cy="11" r="1.6"/>',
  frage: '<circle cx="12" cy="12" r="8.5"/><path d="M9.6 9.5a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .8-1 1.5v.4M12 16.8v.2"/>',
  krone: '<path d="M4 18h16M4.5 15L3 7l5 3.5L12 5l4 5.5L21 7l-1.5 8z"/>',
  wolke: '<path d="M7 18h10a4 4 0 0 0 .6-8 5.5 5.5 0 0 0-10.6 1.2A3.5 3.5 0 0 0 7 18z"/>',
  gabel: '<path d="M12 21v-7M12 14L6 6M12 14l6-8M6 6v4M6 6h4M18 6v4M18 6h-4"/>',
  hand: '<path d="M8 12V5.5a1.5 1.5 0 0 1 3 0V11M11 10V4.5a1.5 1.5 0 0 1 3 0V11M14 10.5V6a1.5 1.5 0 0 1 3 0v7.5a7 7 0 0 1-7 7h-.5a6 6 0 0 1-5-2.7L3 14.5a1.6 1.6 0 0 1 2.6-1.8L8 15"/>',
  kalender: '<rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  teilen: '<path d="M12 15V3.5M7.5 8L12 3.5 16.5 8M5 13v6a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 19v-6"/>',
};

function zeichen(name, klasse = "bs-zeichen") {
  return `<svg class="${klasse}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ZEICHEN[name] ?? ""}</svg>`;
}

/** Ein Element, das beim Einblenden der Karte gestaffelt hereinkommt. */
const rein = (i) => `class="bs-rein" style="--i:${i}"`;

/** Ein Ring mit Zahl in der Mitte. Über dem Ziel bleibt er voll. */
function ring(wert, ziel, ton, beschriftung, einheit) {
  const r = 46;
  const u = 2 * Math.PI * r;
  const anteil = ziel > 0 ? Math.max(0, Math.min(1, wert / ziel)) : 0;
  return `<figure class="bs-ring" style="--ton:${ton}">
    <svg viewBox="0 0 110 110" aria-hidden="true">
      <circle cx="55" cy="55" r="${r}" class="bs-ring-spur"/>
      <circle cx="55" cy="55" r="${r}" class="bs-ring-wert" style="--voll:${u.toFixed(1)};--rest:${(u * (1 - anteil)).toFixed(1)}" transform="rotate(-90 55 55)"/>
    </svg>
    <div class="bs-ring-zahl"><b>${esc(Math.round(wert))}</b><span>von ${esc(Math.round(ziel))} ${esc(einheit)}</span></div>
    <figcaption>${esc(beschriftung)}</figcaption>
  </figure>`;
}

/** Wie lang eine Karte stehen bleibt. Mehr Zeilen, mehr Zeit: gelesen wird mit etwa drei Zeilen je vier Sekunden. */
export function folieDauer(f) {
  switch (f.art) {
    case "start": return 3800;
    case "rueckblick": return 6000;
    case "fokus": return 6500;
    case "tag": return 4200 + 900 * ((f.termine?.length ?? 0) + (f.frei ? 1 : 0));
    case "tun": return 4000 + 1000 * (f.punkte?.length ?? 0);
    case "achtung": return 4000 + 1500 * (f.punkte?.length ?? 0);
    case "essen": return 4000 + 1000 * (f.mahlzeiten?.length ?? 0);
    case "untergrenze": return 4000 + 1200 * ((f.punkte?.length ?? 0) + (f.geburtstage?.length ? 1 : 0));
    case "feierabend": return 5000 + 1000 * (f.heuteWichtig?.length ?? 0);
    case "abend": return 9000;
    case "ende": return Infinity;
    // Die Karten der übrigen Präsentationen: Rückblick, Morgen, Auswertung,
    // Monat, Planende, Training und Kopf leeren.
    case "titel": return 3800;
    case "zahl": return 5200 + (f.zeilen?.length ?? 0) * 900;
    case "ringe": return 6000;
    case "punkte": return 3800 + 1300 * (f.punkte?.length ?? 0);
    case "frage": return 8000;
    case "bild": return 7000;
    case "schluss": return Infinity;
    default: return 5000;
  }
}

/**
 * Eine kleine Linie ohne Achse. `null` unterbricht sie, statt auf null zu
 * fallen, wie im Bericht: ein Tag ohne Eintrag ist kein Einbruch.
 */
function linie(werte) {
  const zahlen = (werte ?? []).filter((w) => w != null && Number.isFinite(Number(w))).map(Number);
  if (zahlen.length < 3) return "";
  const min = Math.min(...zahlen);
  const max = Math.max(...zahlen);
  const spanne = max - min || 1;
  const n = werte.length;
  const stuecke = [];
  let akt = [];
  werte.forEach((w, i) => {
    if (w == null || !Number.isFinite(Number(w))) { if (akt.length) stuecke.push(akt); akt = []; return; }
    const x = n === 1 ? 150 : (i / (n - 1)) * 300;
    const y = max === min ? 30 : 54 - ((Number(w) - min) / spanne) * 48;
    akt.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  });
  if (akt.length) stuecke.push(akt);
  const wege = stuecke.map((p) => (p.length === 1 ? `<circle cx="${p[0].split(",")[0]}" cy="${p[0].split(",")[1]}" r="2.6"/>` : `<polyline points="${p.join(" ")}"/>`)).join("");
  return `<svg class="bs-linie" viewBox="-4 0 308 60" preserveAspectRatio="none" aria-hidden="true">${wege}</svg>`;
}

/** Die Farbe je Karte, aus den Familien von Makros und Bereichen im dunklen Modus. */
const TON = {
  start: "#96d8f0", rueckblick: "#2ec28c", fokus: "#96d8f0", tag: "#42bad3", tun: "#2ec379",
  achtung: "#e5b55c", essen: "#e694ad", untergrenze: "#b6a0e9", ende: "#96d8f0",
  feierabend: "#2ec28c", abend: "#b6a0e9",
};

/** Eine Karte als HTML. `art` des Briefings entscheidet über morgens oder abends. */
export function folieHtml(f) {
  const ton = TON[f.art] ?? "#96d8f0";
  let innen = "";
  switch (f.art) {
    case "start":
      innen = `
        <div ${rein(0)}>${zeichen(f.morgens ? "sonne" : "mond", "bs-gross-zeichen")}</div>
        <p class="bs-etikett" ${rein(1)}>${f.morgens ? "Tagesbriefing" : "Briefing für morgen"}</p>
        <h2 class="bs-gruss" ${rein(2)}>${esc(f.gruss)}</h2>
        <p class="bs-datum" ${rein(3)}>${esc(f.datum)}</p>
        <p class="bs-zeile" ${rein(4)}>${esc(f.zeile)}</p>`;
      break;
    case "rueckblick":
      innen = `
        <p class="bs-etikett" ${rein(0)}>${zeichen("haken")} So lief heute</p>
        <div class="bs-ringe" ${rein(1)}>
          ${ring(f.kcal, f.zielKcal, "#96d8f0", "Kalorien", "kcal")}
          ${ring(f.proteinG, f.zielProteinG, "#2ec28c", "Protein", "g")}
        </div>
        ${f.erledigt ? `<p class="bs-zahlzeile" ${rein(2)}><b>${esc(f.erledigt)}</b> ${f.erledigt === 1 ? "Aufgabe" : "Aufgaben"} erledigt</p>` : ""}
        <p class="bs-satz" ${rein(3)}>${esc(f.satz)}</p>`;
      break;
    case "fokus":
      innen = `
        <p class="bs-etikett" ${rein(0)}>${zeichen("ziel")} Fokus</p>
        <h2 class="bs-fokus${f.haupt.length > 60 ? " lang" : ""}" ${rein(1)}>${esc(f.haupt)}</h2>
        ${f.um ? `<p class="bs-pille" ${rein(2)}>${zeichen("uhr")} ${esc(f.um)}</p>` : ""}
        <p class="bs-satz" ${rein(3)}>${esc(f.zusatz)}</p>`;
      break;
    case "tag": {
      const zeilen = f.termine.map((t, i) => `
        <li ${rein(2 + i)}><time>${esc(t.um)}</time><span class="bs-punkt"></span><span class="bs-termin">${esc(t.titel)}</span></li>`).join("");
      innen = `
        <p class="bs-etikett" ${rein(0)}>${zeichen("uhr")} ${esc(f.titel)}</p>
        <p class="bs-unter" ${rein(1)}>${f.termine.length ? `${f.termine.length + f.mehr} ${f.termine.length + f.mehr === 1 ? "Termin" : "Termine"}, verplant ${esc(f.belegt)}` : "Keine Termine"}${f.ganztags.length ? ` · ${esc(f.ganztags.join(", "))}` : ""}</p>
        <ol class="bs-zeitleiste">${zeilen}</ol>
        ${f.mehr ? `<p class="bs-mehr" ${rein(8)}>und ${esc(f.mehr)} weitere</p>` : ""}
        ${f.frei ? `<div class="bs-frei" ${rein(9)}><b>Frei ${esc(f.frei.von)} bis ${esc(f.frei.bis)}</b><span>${f.frei.training ? `Darin dein Training um ${esc(f.frei.training)}` : "Dein längster Block am Stück"}</span></div>` : ""}`;
      break;
    }
    case "tun": {
      const zeilen = f.punkte.map((p, i) => `
        <li class="${p.zuerst ? "zuerst" : ""}${p.art === "training" ? " training" : ""}" ${rein(1 + i)}>
          <span class="bs-kreis">${p.art === "training" ? zeichen("hantel") : ""}</span>
          <div><b>${esc(p.text)}</b><small>${[p.um, p.zuerst ? "Zuerst" : "", p.grund].filter(Boolean).map(esc).join(" · ")}</small></div>
        </li>`).join("");
      innen = `
        <p class="bs-etikett" ${rein(0)}>${zeichen("haken")} Zu tun</p>
        ${f.gestrichen ? `<p class="bs-satz" ${rein(1)}>Training ist gestrichen. Der Tag gehört der Erholung.</p>` : ""}
        <ul class="bs-liste">${zeilen}</ul>
        ${f.mehr ? `<p class="bs-mehr" ${rein(7)}>und ${esc(f.mehr)} weitere unter Dein Tag</p>` : ""}
        ${f.feierabend ? `<p class="bs-feierabend" ${rein(8)}>Feierabend ab <b>${esc(f.feierabend)}</b></p>` : ""}`;
      break;
    }
    case "achtung": {
      const bild = { vorkochen: "topf", training: "hantel", frueh: "uhr", voll: "achtung", muster: "muster" };
      const zeilen = f.punkte.map((p, i) => `
        <li ${rein(1 + i)}>${zeichen(bild[p.art] ?? "achtung", "bs-zeichen-rund")}
          <div><b>${esc(p.kurz)}</b>${p.tun ? `<span>${esc(p.tun)}</span>` : ""}</div></li>`).join("");
      innen = `
        <p class="bs-etikett" ${rein(0)}>${zeichen("achtung")} daevo ist aufgefallen</p>
        <h2 class="bs-titel" ${rein(0)}>${esc(f.titel)}</h2>
        <ul class="bs-hinweise">${zeilen}</ul>`;
      break;
    }
    case "essen": {
      // Die ganze Zeile ist ein Knopf: wer etwas anderes isst, tippt auf das Essen.
      const zeilen = f.mahlzeiten.map((m, i) => `
        <li ${rein(2 + i)}><button type="button" class="bs-mahlzeit${m.gewaehlt ? " gewaehlt" : ""}" data-bs-essen="${i}" aria-label="${esc(m.name)} ändern">
          <time>${esc(m.um)}</time>
          <div><b>${esc(m.gericht)}</b><small>${esc([m.name, m.rolle].filter(Boolean).join(", "))}</small></div>
          <span class="bs-kcal">${esc(m.kcal)}<small>kcal</small></span>
          <span class="bs-aendern">${zeichen("stift")} Ändern</span></button></li>`).join("");
      innen = `
        <p class="bs-etikett" ${rein(0)}>${zeichen("essen")} Essen</p>
        <p class="bs-ziel" ${rein(1)}><b>${esc(f.zielKcal)}</b> kcal · <b>${esc(f.zielProteinG)}</b> g Protein</p>
        <ul class="bs-essen">${zeilen}</ul>`;
      break;
    }
    case "untergrenze": {
      const zeilen = f.punkte.map((p, i) => `
        <li ${rein(1 + i)}><b>${esc(p.titel)}</b>${p.stand ? `<span>${esc(p.stand)}</span>` : ""}</li>`).join("");
      innen = `
        <p class="bs-etikett" ${rein(0)}>${zeichen("fahne")} Deine Untergrenze</p>
        <ul class="bs-standards">${zeilen}</ul>
        ${f.geburtstage.length ? `<div class="bs-geburtstag" ${rein(5)}>${zeichen("geschenk")}<span><b>${esc(f.geburtstage.join(", "))}</b> ${f.geburtstage.length === 1 ? "hat" : "haben"} Geburtstag</span></div>` : ""}`;
      break;
    }
    case "feierabend": {
      const wichtig = (f.heuteWichtig ?? []).map((t, i) => `<li ${rein(4 + i)}>${zeichen("achtung", "bs-zeichen-rund")}<div><b>${esc(t)}</b><span>Darf nicht warten</span></div></li>`).join("");
      innen = `
        <p class="bs-etikett" ${rein(0)}>${zeichen("mond")} Feierabend</p>
        <p class="bs-grosszahl" ${rein(1)}><span>ab</span><b>${esc(f.um)}</b></p>
        <p class="bs-zahl-unter" ${rein(2)}>Den hast du dir verdient. Ab jetzt zählt Erholung.</p>
        <p class="bs-satz" ${rein(3)}>${f.wartet ? `${f.wartet} ${f.wartet === 1 ? "Aufgabe wartet" : "Aufgaben warten"} bis morgen, und das ist in Ordnung.` : "Für heute ist nichts mehr offen."}${wichtig ? " Nur das hier noch:" : ""}</p>
        ${wichtig ? `<ul class="bs-hinweise">${wichtig}</ul>` : ""}`;
      break;
    }
    case "abend": {
      // Abends keine Liste zum Abarbeiten. Der Nutzer wollte nach "Gute Nacht"
      // runterkommen und nicht sieben Aufgaben lesen. Eine Uhrzeit trägt die
      // Karte, die Schlafenszeit. Was davor hilft, steht als leise Wörter
      // nebeneinander, ohne Uhrzeit und ohne Haken. Abhaken geht im Blatt.
      const schritte = f.schritte ?? [];
      const handy = schritte.find((s) => /handy/i.test(s.titel));
      const rest = schritte.filter((s) => s !== handy && !/^schlafen$/i.test(s.titel));
      const woerter = rest.map((s) => `<span>${esc(s.kurz ?? s.titel)}</span>`).join("");
      innen = `
        <p class="bs-etikett" ${rein(0)}>${zeichen("mond")} Ruhig runterfahren</p>
        <p class="bs-grosszahl" ${rein(1)}><b>${esc(f.schlafen)}</b><span>ins Bett</span></p>
        <p class="bs-unter" ${rein(2)}>${esc(f.dauer)} Schlaf, Wecker ${esc(f.wecker)}</p>
        ${handy ? `<p class="bs-satz" ${rein(3)}>Ab ${esc(handy.um)} Handy weg. Danach nur, was dir guttut.</p>` : ""}
        ${woerter ? `<p class="bs-woerter" ${rein(4)}>${woerter}</p>` : ""}
        <p class="bs-leise" ${rein(5)}>${zeichen("sonne")} ${esc(f.morgenLicht)}</p>`;
      break;
    }
    case "ende":
      innen = `
        <div ${rein(0)}>${zeichen(f.morgens ? "sonne" : "mond", "bs-gross-zeichen")}</div>
        <h2 class="bs-gruss" ${rein(1)}>${f.morgens ? "Los geht’s" : "Gute Nacht"}</h2>
        <p class="bs-zeile" ${rein(2)}>${esc(f.satz)}</p>
        <div class="bs-knoepfe" ${rein(3)}>
          ${f.morgens ? `<button type="button" class="bs-knopf zweit" data-bs="nochmal">Nochmal</button>` : `<button type="button" class="bs-knopf zweit" data-bs="abend">Abendroutine</button>`}
          <button type="button" class="bs-knopf" data-bs="${f.morgens ? "tag" : "fertig"}">${f.morgens ? "Zu deinem Tag" : "Fertig"}</button>
        </div>`;
      break;
    case "titel":
      innen = `
        <div ${rein(0)}>${zeichen(f.zeichen ?? "sonne", "bs-gross-zeichen")}</div>
        ${f.etikett ? `<p class="bs-etikett" ${rein(1)}>${esc(f.etikett)}</p>` : ""}
        <h2 class="bs-gruss" ${rein(2)}>${esc(f.titel)}</h2>
        ${f.unter ? `<p class="bs-datum" ${rein(3)}>${esc(f.unter)}</p>` : ""}
        ${f.zeile ? `<p class="bs-zeile" ${rein(4)}>${esc(f.zeile)}</p>` : ""}`;
      break;
    case "zahl": {
      const zeilen = (f.zeilen ?? []).map((z, i) => `<li ${rein(5 + i)}><span>${esc(z.name)}</span><b>${esc(z.wert)}</b></li>`).join("");
      innen = `
        <p class="bs-etikett" ${rein(0)}>${zeichen(f.zeichen ?? "muster")} ${esc(f.etikett)}</p>
        <p class="bs-grosszahl${String(f.zahl).length > 6 ? " lang" : ""}" ${rein(1)}><b>${esc(f.zahl)}</b>${f.einheit ? `<span>${esc(f.einheit)}</span>` : ""}</p>
        ${f.unter ? `<p class="bs-zahl-unter" ${rein(2)}>${esc(f.unter)}</p>` : ""}
        ${f.trend ? `<p class="bs-pille" ${rein(3)}>${zeichen("trend")} ${esc(f.trend)}</p>` : ""}
        ${f.verlauf ? `<div ${rein(3)}>${linie(f.verlauf)}</div>` : ""}
        ${f.satz ? `<p class="bs-satz" ${rein(4)}>${esc(f.satz)}</p>` : ""}
        ${zeilen ? `<ul class="bs-werte">${zeilen}</ul>` : ""}`;
      break;
    }
    case "ringe":
      innen = `
        <p class="bs-etikett" ${rein(0)}>${zeichen(f.zeichen ?? "haken")} ${esc(f.etikett)}</p>
        ${f.titel ? `<h2 class="bs-titel" ${rein(0)}>${esc(f.titel)}</h2>` : ""}
        <div class="bs-ringe" ${rein(1)}>${(f.ringe ?? []).map((r) => ring(r.wert, r.ziel, r.ton ?? ton, r.beschriftung, r.einheit)).join("")}</div>
        ${f.satz ? `<p class="bs-satz bs-mitte" ${rein(3)}>${esc(f.satz)}</p>` : ""}`;
      break;
    case "punkte": {
      const zeilen = (f.punkte ?? []).map((p, i) => `
        <li ${rein(1 + i)}>${zeichen(p.zeichen ?? f.zeichen ?? "haken", "bs-zeichen-rund")}
          <div><b>${esc(p.titel)}</b>${p.text ? `<span>${esc(p.text)}</span>` : ""}</div></li>`).join("");
      innen = `
        <p class="bs-etikett" ${rein(0)}>${zeichen(f.zeichen ?? "haken")} ${esc(f.etikett)}</p>
        ${f.titel ? `<h2 class="bs-titel" ${rein(0)}>${esc(f.titel)}</h2>` : ""}
        <ul class="bs-hinweise">${zeilen}</ul>
        ${f.mehr ? `<p class="bs-mehr" ${rein(7)}>${esc(f.mehr)}</p>` : ""}`;
      break;
    }
    case "frage":
      innen = `
        <p class="bs-etikett" ${rein(0)}>${zeichen(f.zeichen ?? "frage")} ${esc(f.etikett)}</p>
        ${f.zahl != null ? `<p class="bs-grosszahl" ${rein(1)}><b>${esc(f.zahl)}</b>${f.einheit ? `<span>${esc(f.einheit)}</span>` : ""}</p>` : ""}
        <h2 class="bs-fokus${String(f.titel ?? "").length > 70 || f.zahl != null ? " lang" : ""}" ${rein(2)}>${esc(f.titel)}</h2>
        ${f.satz ? `<p class="bs-satz" ${rein(3)}>${esc(f.satz)}</p>` : ""}
        ${f.frage ? `<p class="bs-frage" ${rein(4)}>${zeichen("frage")}<span>${esc(f.frage)}</span></p>` : ""}`;
      break;
    case "bild":
      // `html` kommt nie vom Nutzer, sondern aus einer Zeichenfunktion der App.
      innen = `
        <p class="bs-etikett" ${rein(0)}>${zeichen(f.zeichen ?? "hantel")} ${esc(f.etikett)}</p>
        ${f.titel ? `<h2 class="bs-titel" ${rein(0)}>${esc(f.titel)}</h2>` : ""}
        <div class="bs-bild" ${rein(1)}>${f.html ?? ""}</div>
        ${f.satz ? `<p class="bs-satz bs-mitte" ${rein(2)}>${esc(f.satz)}</p>` : ""}`;
      break;
    case "schluss": {
      const knoepfe = (f.knoepfe ?? [{ id: "fertig", text: "Fertig" }]).map((k) => `<button type="button" class="bs-knopf${k.zweit ? " zweit" : ""}" data-bs="${esc(k.id)}">${esc(k.text)}</button>`).join("");
      innen = `
        <div ${rein(0)}>${zeichen(f.zeichen ?? "haken", "bs-gross-zeichen")}</div>
        <h2 class="bs-gruss" ${rein(1)}>${esc(f.titel)}</h2>
        ${f.satz ? `<p class="bs-zeile" ${rein(2)}>${esc(f.satz)}</p>` : ""}
        <div class="bs-knoepfe${(f.knoepfe?.length ?? 1) > 2 ? " drei" : ""}" ${rein(3)}>${knoepfe}</div>`;
      break;
    }
    default:
      innen = "";
  }
  // `bs-f-` vor der Art: `.bs-essen` hiess sonst Karte und Liste zugleich.
  // Jede Karte mit Inhalt lässt sich anpassen. Der Knopf steht unten und
  // klein, die Karte soll gelesen werden und nicht nach Formular aussehen.
  // Die übrigen Präsentationen bringen ihr "Anpassen" an der Karte mit,
  // mit eigener Kennung und eigenem Wort.
  const eigen = f.anpassen && typeof f.anpassen === "object" ? f.anpassen : null;
  const anpassen = eigen ? eigen.text : ANPASSEN[f.art];
  const kennung = eigen ? eigen.id : f.art;
  const knopf = anpassen ? `<button type="button" class="bs-anpassen" data-bs-anpassen="${esc(kennung)}">${zeichen(eigen?.zeichen ?? "stift")} ${esc(anpassen)}</button>` : "";
  return `<section class="bs-folie bs-f-${f.art}" style="--ton:${esc(f.ton ?? ton)}">${innen}${knopf}</section>`;
}

/**
 * Zeigt das Briefing. `briefing` ist das Ergebnis von `tagesbriefingFuer`,
 * `wurzel` das leere Element `#briefingShow`. `aktion` bekommt "tag" oder
 * "fertig" vom letzten Knopf, `anpassen` die Art der Karte und bei einer
 * Mahlzeit deren Zeile. Zurück kommt eine Steuerung: `anhalten`, solange
 * ein Blatt zum Ändern offen ist, und `aktualisieren` mit dem neu
 * gerechneten Briefing, auf derselben Karte.
 */
export function briefingZeigen(briefing, wurzel, { aktion, anpassen, name = "Briefing" } = {}) {
  let folien = (briefing?.folien ?? []).filter(Boolean);
  if (!wurzel || !folien.length) return null;
  const wenigBewegung = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  wurzel.innerHTML = `
    <div class="bs-leisten"></div>
    <button type="button" class="bs-x" aria-label="${esc(name)} schliessen"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
    <div class="bs-buehne" aria-live="polite"></div>
    <p class="bs-hilfe">Tippen für weiter, halten zum Anhalten</p>`;
  const buehne = wurzel.querySelector(".bs-buehne");
  let leisten = [];
  const leistenBauen = () => {
    wurzel.querySelector(".bs-leisten").innerHTML = folien.map(() => "<span><i></i></span>").join("");
    leisten = [...wurzel.querySelectorAll(".bs-leisten i")];
  };
  leistenBauen();
  let index = 0;
  let laeuft = 0;
  let start = 0;
  let pause = false;
  let aussen = false;
  let pauseSeit = 0;
  let bild = 0;

  const zeigen = (i, { ohneAnimation = false } = {}) => {
    index = Math.max(0, Math.min(folien.length - 1, i));
    buehne.innerHTML = folieHtml(folien[index]);
    const f = buehne.firstElementChild;
    // Ein Bild später, damit die Übergänge vom Anfang aus laufen.
    if (ohneAnimation) f?.classList.add("an", "fest");
    else requestAnimationFrame(() => f?.classList.add("an"));
    leisten.forEach((l, j) => { l.style.transform = `scaleX(${j < index ? 1 : 0})`; });
    laeuft = 0;
    start = performance.now();
  };

  const schritt = (jetzt) => {
    bild = requestAnimationFrame(schritt);
    if (pause || aussen || document.hidden) return;
    const dauer = folieDauer(folien[index]);
    laeuft = jetzt - start;
    const anteil = Number.isFinite(dauer) ? Math.min(1, laeuft / dauer) : 1;
    if (leisten[index]) leisten[index].style.transform = `scaleX(${anteil})`;
    if (Number.isFinite(dauer) && laeuft >= dauer && index < folien.length - 1) zeigen(index + 1);
  };

  const schliessen = () => {
    cancelAnimationFrame(bild);
    wurzel.hidden = true;
    wurzel.innerHTML = "";
    document.removeEventListener("keydown", taste);
  };

  const taste = (ev) => {
    if (aussen) return;
    if (ev.key === "Escape") schliessen();
    else if (ev.key === "ArrowRight" || ev.key === " ") zeigen(index + 1);
    else if (ev.key === "ArrowLeft") zeigen(index - 1);
  };

  // Halten pausiert, ein kurzer Tipp blättert, wischen blättert oder schliesst.
  let druck = null;
  wurzel.onpointerdown = (ev) => {
    if (ev.target.closest("button")) return;
    druck = { x: ev.clientX, y: ev.clientY, t: performance.now() };
    pause = true;
    pauseSeit = performance.now();
  };
  const loslassen = (ev) => {
    if (!druck) return;
    const dx = ev.clientX - druck.x;
    const dy = ev.clientY - druck.y;
    const lang = performance.now() - druck.t > 350;
    druck = null;
    pause = false;
    start += performance.now() - pauseSeit;
    if (dy > 90 && Math.abs(dy) > Math.abs(dx)) return schliessen();
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) return zeigen(index + (dx < 0 ? 1 : -1));
    if (lang) return;
    const rand = wurzel.getBoundingClientRect();
    zeigen(index + (ev.clientX - rand.left < rand.width * 0.3 ? -1 : 1));
  };
  wurzel.onpointerup = loslassen;
  wurzel.onpointercancel = () => { druck = null; pause = false; };
  wurzel.onclick = (ev) => {
    const k = ev.target.closest("button");
    if (!k) return;
    if (k.classList.contains("bs-x")) return schliessen();
    // Anpassen hält die Karte an, das Blatt darüber gehört der App.
    if (k.dataset.bsAnpassen || k.dataset.bsEssen !== undefined) {
      const f = folien[index];
      const zeile = k.dataset.bsEssen !== undefined && f.art === "essen" ? f.mahlzeiten[Number(k.dataset.bsEssen)] : null;
      const weiter = anpassen?.(k.dataset.bsAnpassen || "essen", zeile, steuerung);
      if (weiter === "schliessen") schliessen();
      return;
    }
    const was = k.dataset.bs;
    if (was === "nochmal") return zeigen(0);
    // Teilen und ähnliches lassen die Präsentation offen, alles andere schliesst sie.
    if (was && aktion?.(was, steuerung) === "bleiben") return;
    schliessen();
  };
  document.addEventListener("keydown", taste);

  const steuerung = {
    anhalten(an) {
      if (an && !aussen) pauseSeit = performance.now();
      if (!an && aussen) start += performance.now() - pauseSeit;
      aussen = Boolean(an);
    },
    /** Neu gerechnet, zurück auf die Karte derselben Art. */
    aktualisieren(neu) {
      const art = folien[index]?.art;
      folien = (neu?.folien ?? []).filter(Boolean);
      if (!folien.length) return schliessen();
      leistenBauen();
      const i = folien.findIndex((f) => f.art === art);
      zeigen(i >= 0 ? i : Math.min(index, folien.length - 1), { ohneAnimation: true });
    },
    schliessen,
  };

  wurzel.setAttribute("aria-label", name);
  wurzel.classList.toggle("ruhig", Boolean(wenigBewegung));
  wurzel.hidden = false;
  zeigen(0);
  bild = requestAnimationFrame(schritt);
  return steuerung;
}
