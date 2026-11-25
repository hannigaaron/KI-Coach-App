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
const ZEICHEN = {
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
    case "ende": return Infinity;
    default: return 5000;
  }
}

/** Die Farbe je Karte, aus den Familien von Makros und Bereichen im dunklen Modus. */
const TON = {
  start: "#96d8f0", rueckblick: "#2ec28c", fokus: "#96d8f0", tag: "#42bad3", tun: "#2ec379",
  achtung: "#e5b55c", essen: "#e694ad", untergrenze: "#b6a0e9", ende: "#96d8f0",
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
      const zeilen = f.mahlzeiten.map((m, i) => `
        <li ${rein(2 + i)}><time>${esc(m.um)}</time>
          <div><b>${esc(m.gericht)}</b><small>${esc([m.name, m.rolle].filter(Boolean).join(", "))}</small></div>
          <span class="bs-kcal">${esc(m.kcal)}<small>kcal</small></span></li>`).join("");
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
    case "ende":
      innen = `
        <div ${rein(0)}>${zeichen(f.morgens ? "sonne" : "mond", "bs-gross-zeichen")}</div>
        <h2 class="bs-gruss" ${rein(1)}>${f.morgens ? "Los geht’s" : "Gute Nacht"}</h2>
        <p class="bs-zeile" ${rein(2)}>${esc(f.satz)}</p>
        <div class="bs-knoepfe" ${rein(3)}>
          <button type="button" class="bs-knopf zweit" data-bs="nochmal">Nochmal</button>
          <button type="button" class="bs-knopf" data-bs="${f.morgens ? "tag" : "fertig"}">${f.morgens ? "Zu deinem Tag" : "Fertig"}</button>
        </div>`;
      break;
    default:
      innen = "";
  }
  // `bs-f-` vor der Art: `.bs-essen` hiess sonst Karte und Liste zugleich.
  return `<section class="bs-folie bs-f-${f.art}" style="--ton:${ton}">${innen}</section>`;
}

/**
 * Zeigt das Briefing. `briefing` ist das Ergebnis von `tagesbriefingFuer`,
 * `wurzel` das leere Element `#briefingShow`. `aktion` bekommt "tag" oder
 * "fertig" vom letzten Knopf.
 */
export function briefingZeigen(briefing, wurzel, { aktion } = {}) {
  const folien = (briefing?.folien ?? []).filter(Boolean);
  if (!wurzel || !folien.length) return;
  const wenigBewegung = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  wurzel.innerHTML = `
    <div class="bs-leisten">${folien.map(() => '<span><i></i></span>').join("")}</div>
    <button type="button" class="bs-x" aria-label="Briefing schliessen"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
    <div class="bs-buehne" aria-live="polite"></div>
    <p class="bs-hilfe">Tippen für weiter, halten zum Anhalten</p>`;
  const buehne = wurzel.querySelector(".bs-buehne");
  const leisten = [...wurzel.querySelectorAll(".bs-leisten i")];
  let index = 0;
  let laeuft = 0;
  let start = 0;
  let pause = false;
  let pauseSeit = 0;
  let bild = 0;

  const zeigen = (i) => {
    index = Math.max(0, Math.min(folien.length - 1, i));
    buehne.innerHTML = folieHtml(folien[index]);
    const f = buehne.firstElementChild;
    // Ein Bild später, damit die Übergänge vom Anfang aus laufen.
    requestAnimationFrame(() => f?.classList.add("an"));
    leisten.forEach((l, j) => { l.style.transform = `scaleX(${j < index ? 1 : 0})`; });
    laeuft = 0;
    start = performance.now();
  };

  const schritt = (jetzt) => {
    bild = requestAnimationFrame(schritt);
    if (pause || document.hidden) return;
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
    const was = k.dataset.bs;
    if (was === "nochmal") return zeigen(0);
    schliessen();
    if (was && aktion) aktion(was);
  };
  document.addEventListener("keydown", taste);

  wurzel.classList.toggle("ruhig", Boolean(wenigBewegung));
  wurzel.hidden = false;
  zeigen(0);
  bild = requestAnimationFrame(schritt);
}
