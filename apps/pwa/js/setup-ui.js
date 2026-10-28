import { KORREKTUR_GRENZE, WOCHENTAGE, energyBreakdown, macroTargets, waterTargetMl } from "@daevo/core";
import { BODY_FAT_LEVELS, SCHRITTE, auswerten, figurBild, stufeText } from "./anamnese.js";
import { symbol } from "./symbole.js";
import { planFuer } from "./plaene.js";

/**
 * Zeigt den Anamnesebogen an.
 *
 * Eine Frage pro Bildschirm, mit Fortschrittsbalken. Die Antworten liegen in
 * einem einfachen Objekt, das erst am Ende ausgewertet wird. So kann der
 * Nutzer jederzeit zurück, ohne dass unterwegs etwas gespeichert wird, und
 * findet dort seine Antwort so vor, wie er sie gegeben hat.
 */

/** So lange bleibt der Haken sichtbar, bevor die nächste Seite kommt. */
const AUTO_WEITER_MS = 280;

const escapeHtml = (text) =>
  String(text).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/* Die Wortmarke steht nur auf dem ersten Bildschirm. Danach zaehlt die Frage. */
const LOCKUP = `
  <div class="setup-lockup">
    <img class="only-light" src="./brand/daevo-lockup-deep.svg" alt="daevo, Evolve your daily life" width="230">
    <img class="only-dark" src="./brand/daevo-lockup-dark.svg" alt="daevo, Evolve your daily life" width="230">
  </div>`;

export class SetupFlow {
  constructor(element, { onFertig }) {
    this.el = element;
    this.onFertig = onFertig;
    this.index = 0;
    this.antworten = {};
    for (const schritt of SCHRITTE) {
      for (const feld of schritt.felder) {
        if (feld.standard !== undefined) this.antworten[feld.id] = feld.standard;
        if (feld.art === "mehrfach" || feld.art === "chips") this.antworten[feld.id] = [];
      }
    }
    this.el.addEventListener("click", (event) => this.onClick(event));
    this.el.addEventListener("input", (event) => this.onInput(event));
    this.render();
  }

  get schritt() {
    return SCHRITTE[this.index];
  }

  onInput(event) {
    const wz = event.target.closest("[data-wochenzeit]");
    if (wz) {
      const id = wz.dataset.wochenzeit;
      const tag = wz.dataset.tag;
      const werte = { ...(this.antworten[id] || {}) };
      const eintrag = { ...(werte[tag] || {}) };
      if (wz.value) eintrag[wz.dataset.teil] = wz.value;
      else delete eintrag[wz.dataset.teil];
      // Eine Zeile ohne einen einzigen Wert wird geloescht statt als leeres
      // Objekt gespeichert. Sonst steht im Profil ein Wochentag, der nichts sagt.
      if (Object.keys(eintrag).length === 0) delete werte[tag];
      else werte[tag] = eintrag;
      this.antworten[id] = werte;
      this.updateWeiter();
      return;
    }

    const feld = event.target.closest("[data-feld]");
    if (!feld) return;
    const id = feld.dataset.feld;
    // Ein geleertes Zahlenfeld ist keine Null. Number("") ergibt 0, und dann
    // ginge "0 Schritte am Tag" als Antwort durch, obwohl niemand sie gab.
    if (feld.type === "number") this.antworten[id] = feld.value === "" ? undefined : Number(feld.value.replace(",", "."));
    else this.antworten[id] = feld.value;
    this.updateWeiter();
  }

  onClick(event) {
    const weiter = event.target.closest("[data-weiter]");
    if (weiter) return this.weiter();
    const zurueck = event.target.closest("[data-zurueck]");
    if (zurueck) return this.zurueck();
    const ueberspringen = event.target.closest("[data-ueberspringen]");
    if (ueberspringen) return this.weiter(true);
    if (event.target.closest("[data-kurzweg]")) {
      clearTimeout(this.weiterTimer);
      this.antworten.kurzweg = true;
      return this.zusammenfassung();
    }

    const budget = event.target.closest("[data-budget]");
    if (budget) return this.budgetAendern(budget.dataset.budget, Number(budget.dataset.schritt));
    if (event.target.closest("[data-budget-reset]")) {
      this.antworten.zielKorrektur = null;
      return this.render(true);
    }

    const option = event.target.closest("[data-option]");
    if (option) {
      const { feld, option: wert, art, max } = option.dataset;
      if (art === "auswahl") {
        this.antworten[feld] = wert;
        if (this.autoWeiter()) {
          this.render(true);
          // Erst den Haken zeigen, dann weiter. Ohne die Pause sieht der
          // Nutzer nie, was er gewählt hat, und zweifelt beim Zurückgehen.
          clearTimeout(this.weiterTimer);
          this.weiterTimer = setTimeout(() => this.weiter(), AUTO_WEITER_MS);
          return;
        }
      } else if (art === "chipwahl") {
        // Ein zweiter Tipp nimmt die Wahl zurück. Diese Fragen sind
        // freiwillig, und ohne das gäbe es keinen Weg zurück zu "keine Angabe".
        this.antworten[feld] = this.antworten[feld] === wert ? undefined : wert;
      } else {
        const liste = this.antworten[feld] || [];
        const drin = liste.includes(wert);
        if (drin) this.antworten[feld] = liste.filter((x) => x !== wert);
        else if (!max || liste.length < Number(max)) this.antworten[feld] = [...liste, wert];
        else return this.hinweis(`Mehr als ${max} geht nicht. Nimm zuerst eins weg.`);
      }
      return this.render(true);
    }

    const figur = event.target.closest("[data-figur]");
    if (figur) {
      const step = Number(figur.dataset.figur);
      const sex = this.antworten.sex === "female" ? "female" : "male";
      this.antworten.koerperfett = { step, percent: BODY_FAT_LEVELS[sex][step].percent };
      return this.render(true);
    }
  }

  hinweis(text) {
    const el = this.el.querySelector(".setup-hinweis");
    if (!el) return;
    el.textContent = text;
    clearTimeout(this.hinweisTimer);
    this.hinweisTimer = setTimeout(() => { el.textContent = ""; }, 2600);
  }

  /**
   * Ob ein Feld gerade gezeigt wird.
   *
   * `wennFeld` nennt ein anderes Feld und die Werte, bei denen dieses hier
   * erscheint. Ohne das müsste der Nutzer, der jeden Tag gleich aufsteht, sich
   * durch sieben Wochentage tippen, um zu sagen, dass alle gleich sind.
   */
  sichtbar(feld) {
    if (!feld.wennFeld) return true;
    const wert = this.antworten[feld.wennFeld.id];
    return feld.wennFeld.ist.includes(wert);
  }

  vollstaendig() {
    const s = this.schritt;
    if (s.ueberspringbar) return true;
    return s.felder.filter((f) => this.sichtbar(f) && !f.optional).every((feld) => {
      const wert = this.antworten[feld.id];
      if (feld.art === "mehrfach") return Array.isArray(wert) && wert.length > 0;
      if (["chips", "chipwahl", "hinweis", "budget"].includes(feld.art)) return true;
      if (feld.art === "zahl") return Number.isFinite(wert) && wert >= feld.min && wert <= feld.max;
      if (feld.art === "text") return String(wert || "").trim().length > 0;
      return wert !== undefined && wert !== "";
    });
  }

  updateWeiter() {
    const button = this.el.querySelector("[data-weiter]");
    if (!button) return;
    button.disabled = !this.vollstaendig();
    button.textContent = this.knopfText();
  }

  /**
   * Ob die Seite nach dem Antippen von selbst weitergeht.
   *
   * Nur wenn eine einzige Auswahl darauf steht. Bei zwei Feldern wüsste die
   * App nicht, ob der Nutzer schon fertig ist.
   */
  autoWeiter() {
    const felder = this.schritt.felder.filter((f) => this.sichtbar(f));
    return felder.length === 1 && felder[0].art === "auswahl";
  }

  /** "Hab ich nicht, weiter" sagt, dass eine leere Antwort in Ordnung ist. */
  knopfText() {
    const s = this.schritt;
    if (this.index === SCHRITTE.length - 1) return "Fertig";
    if (s.knopfLeer) {
      const leer = s.felder.every((f) => {
        const w = this.antworten[f.id];
        return Array.isArray(w) ? w.length === 0 : !String(w ?? "").trim();
      });
      if (leer) return s.knopfLeer;
    }
    return s.knopf || "Weiter";
  }

  /**
   * Stellt das Tagesziel nach.
   *
   * Gespeichert wird die Abweichung vom Vorschlag, nicht der Wert. Ändert der
   * Nutzer danach noch einmal sein Gewicht, wandert der Vorschlag mit und
   * seine Korrektur bleibt erhalten. Kohlenhydrate füllen den Rest, damit
   * die Rechnung immer aufgeht. Ihre Knöpfe verschieben deshalb die Kalorien
   * um 4 kcal je Gramm: wer mehr Kohlenhydrate will, will nicht weniger
   * Protein oder Fett, sondern mehr essen.
   */
  budgetAendern(feld, schritt) {
    if (feld === "carbsG") {
      feld = "kcal";
      schritt *= 4;
    }
    const alt = { ...(this.antworten.zielKorrektur || {}) };
    const neu = { ...alt, [feld]: (alt[feld] || 0) + schritt };
    if (Math.abs(neu[feld]) > KORREKTUR_GRENZE[feld]) return this.hinweis("Weiter weg vom Vorschlag geht es hier nicht.");
    const ziele = macroTargets(auswerten({ ...this.antworten, zielKorrektur: neu }).profile);
    if (ziele.carbsG <= 0) return this.hinweis("Dann bleibt für Kohlenhydrate nichts übrig. Nimm zuerst bei Protein oder Fett weg.");
    if (ziele.proteinG < 40 || ziele.fatG < 30) return this.hinweis("Darunter wird es zu wenig. Das ist die Untergrenze.");
    this.antworten.zielKorrektur = neu;
    this.render(true);
  }

  /**
   * Ob eine ganze Seite gezeigt wird. `wenn` hängt sie an eine frühere
   * Antwort: wer bei seinem eigenen Trainingsplan bleibt, braucht keine
   * Fragen, aus denen ein neuer gebaut wird.
   */
  /**
   * Ab Geschmack ist alles da, was Kalorienziel und ersten Plan trägt. Wer
   * jetzt anfangen will, soll nicht durch zwölf weitere Seiten müssen: eine
   * Einrichtung, die zu lang ist, wird abgebrochen, und dann gibt es gar
   * nichts. Was fehlt, fragt der Coach später im Gespräch.
   */
  kurzwegMoeglich() {
    const ab = SCHRITTE.findIndex((x) => x.id === "ernaehrungsform");
    return ab > 0 && this.index >= ab && !this.zeigtZusammenfassung;
  }

  seiteSichtbar(s) {
    if (!s?.wenn) return true;
    const wert = this.antworten[s.wenn.id];
    if (s.wenn.nicht) return !s.wenn.nicht.includes(wert);
    return (s.wenn.ist ?? []).includes(wert);
  }

  weiter(uebersprungen = false) {
    if (!uebersprungen && !this.vollstaendig()) return this.hinweis("Da fehlt noch eine Angabe.");
    let naechste = this.index + 1;
    while (naechste < SCHRITTE.length && !this.seiteSichtbar(SCHRITTE[naechste])) naechste++;
    if (naechste >= SCHRITTE.length) return this.zusammenfassung();
    this.index = naechste;
    this.richtung = "vor";
    this.render();
  }

  zurueck() {
    clearTimeout(this.weiterTimer);
    this.richtung = "zurueck";
    if (this.zeigtZusammenfassung) {
      this.zeigtZusammenfassung = false;
      return this.render();
    }
    if (this.index === 0) return;
    let vorige = this.index - 1;
    while (vorige > 0 && !this.seiteSichtbar(SCHRITTE[vorige])) vorige--;
    this.index = vorige;
    this.render();
  }

  /**
   * Der erste Plan, so wie er gespeichert wird. Gezeigt werden die Einheiten mit
   * ihren Übungen, damit niemand erst suchen muss, was "Ganzkörper A" heisst.
   */
  planHtml(ergebnis) {
    const termine = `<div class="kv"><span>Einheiten im Kalender</span><b>${ergebnis.sessions.length} pro Woche</b></div>`;
    if (!ergebnis.planWunsch) {
      return `<p>Du bleibst bei deinem eigenen Plan. Sag mir im Chat, was du trainierst, dann rechne ich damit.</p>${termine}`;
    }
    const plan = planFuer(ergebnis.planWunsch);
    const einheiten = plan.einheiten.map((e) => `<div class="setup-einheit"><b>${escapeHtml(e.titel)}</b>
      <span>${e.positionen.map((p) => escapeHtml(p.name)).join(", ")}</span></div>`).join("");
    const beschwerde = ergebnis.planWunsch.beschwerden.length || ergebnis.planWunsch.meiden.length
      ? "<p class=\"feld-hilfe\">Übungen, die deine Beschwerden belasten, sind raus.</p>" : "";
    return `${einheiten}${beschwerde}${termine}
      <p class="feld-hilfe">Unter Training, Trainingspläne tauschst du Übungen, änderst Sätze oder baust den Plan neu.</p>`;
  }

  /** Kopf mit Pfeil zurück, Abschnitt, Zähler und Fortschritt. */
  kopfHtml({ abschnitt, nummer, gesamt, zurueck }) {
    const anteil = Math.round((nummer / gesamt) * 100);
    return `
      <div class="setup-head">
        ${zurueck ? `<button type="button" class="setup-zurueck" data-zurueck aria-label="Zurück">${symbol("pfeilLinks")}</button>` : '<span class="setup-zurueck-platz"></span>'}
        <div class="setup-kopf-text">
          <div class="setup-kopf-zeile">
            <span class="setup-abschnitt">${escapeHtml(abschnitt)}</span>
            <span class="setup-zaehler">${nummer} von ${gesamt}</span>
          </div>
          <div class="setup-fortschritt" role="progressbar" aria-valuemin="0" aria-valuemax="${gesamt}" aria-valuenow="${nummer}"><i style="width:${anteil}%"></i></div>
        </div>
      </div>`;
  }

  /**
   * Der Einstieg über eine Sicherung steht nur auf der ersten Seite. Wer schon
   * beim Gewicht ist, hat sich gegen die Sicherung entschieden, und ein
   * zweiter Knopf unter jeder Frage lenkt vom eigentlichen ab.
   */
  sicherungZeigen(an) {
    const block = this.el.closest(".setup")?.querySelector(".setup-sicherung");
    if (block) block.hidden = !an;
  }

  tippHtml(tipp) {
    if (!tipp) return "";
    return `<div class="setup-tipp">${symbol(tipp.symbol || "idee", { groesse: 20 })}<p>${escapeHtml(tipp.text)}</p></div>`;
  }

  render(behalteScroll = false) {
    const body = this.el.querySelector(".setup-body");
    const scroll = behalteScroll && body ? body.scrollTop : 0;
    const s = this.schritt;
    const auto = this.autoWeiter();
    const richtung = behalteScroll ? "" : (this.richtung || "");
    this.richtung = "";

    this.el.innerHTML = `
      ${this.kopfHtml({ abschnitt: s.abschnitt || "", nummer: this.index + 1, gesamt: SCHRITTE.length + 1, zurueck: this.index > 0 })}
      <div class="setup-body${richtung ? ` rein-${richtung}` : ""}">
        ${this.index === 0 ? LOCKUP : ""}
        <h1 class="setup-frage">${escapeHtml(s.titel)}</h1>
        <p class="lead">${escapeHtml(s.text)}</p>
        ${s.felder.filter((feld) => this.sichtbar(feld)).map((feld) => this.feldHtml(feld)).join("")}
        <div class="setup-hinweis" role="status"></div>
        ${this.tippHtml(s.tipp)}
      </div>
      ${auto ? "" : `<div class="setup-fuss">
        <button class="setup-knopf" data-weiter>${escapeHtml(this.knopfText())}</button>
        ${s.ueberspringbar ? '<button type="button" class="setup-link" data-ueberspringen>Überspringen</button>' : ""}
        ${this.kurzwegMoeglich() ? '<button type="button" class="setup-link" data-kurzweg>Den Rest später, jetzt starten</button>' : ""}
      </div>`}
      ${auto && this.kurzwegMoeglich() ? '<div class="setup-fuss"><button type="button" class="setup-link" data-kurzweg>Den Rest später, jetzt starten</button></div>' : ""}`;
    this.updateWeiter();
    this.sicherungZeigen(this.index === 0);
    const neu = this.el.querySelector(".setup-body");
    if (neu) neu.scrollTop = scroll;
  }

  feldHtml(feld) {
    const wert = this.antworten[feld.id];
    const label = feld.label ? `<label for="f-${feld.id}">${escapeHtml(feld.label)}</label>` : "";

    if (feld.art === "text") {
      return `<div class="field">${label}<input id="f-${feld.id}" data-feld="${feld.id}" type="text"
        value="${escapeHtml(wert ?? "")}" placeholder="${escapeHtml(feld.platzhalter ?? "")}"></div>`;
    }
    if (feld.art === "textarea") {
      return `<div class="field">${label}<textarea id="f-${feld.id}" data-feld="${feld.id}" rows="3"
        placeholder="${escapeHtml(feld.platzhalter ?? "")}">${escapeHtml(wert ?? "")}</textarea></div>`;
    }
    if (feld.art === "zahl") {
      // Die Einheit steht im Feld und nicht im Label. "Gewicht in kg" liest
      // man, ein kg rechts neben der Zahl sieht man.
      const zahl = Number.isFinite(wert) && wert !== 0 ? wert : (wert === 0 && feld.min === 0 ? 0 : "");
      return `<div class="field">${label}<div class="zahlfeld">
        <input id="f-${feld.id}" data-feld="${feld.id}" type="number" inputmode="decimal"
          min="${feld.min}" max="${feld.max}" step="${feld.schritt ?? 1}" value="${zahl}"
          placeholder="${escapeHtml(feld.platzhalter ?? "")}">
        ${feld.einheit ? `<span class="zahlfeld-einheit">${escapeHtml(feld.einheit)}</span>` : ""}</div></div>`;
    }
    if (feld.art === "chipwahl") {
      const chips = feld.optionen.map((o) =>
        `<button type="button" class="pill${wert === o ? " on" : ""}" data-option="${escapeHtml(o)}"
          data-feld="${feld.id}" data-art="chipwahl" aria-pressed="${wert === o}">${escapeHtml(o)}</button>`).join("");
      return `<div class="field">${feld.label ? `<div class="feld-titel">${escapeHtml(feld.label)}</div>` : ""}<div class="pills">${chips}</div></div>`;
    }
    if (feld.art === "budget") return this.budgetHtml();
    if (feld.art === "zeit") {
      return `<div class="field">${label}<input id="f-${feld.id}" data-feld="${feld.id}" type="time" value="${wert ?? ""}"></div>`;
    }
    if (feld.art === "auswahl" || feld.art === "mehrfach") {
      const mehrfach = feld.art === "mehrfach";
      const liste = mehrfach ? wert || [] : [];
      const karten = feld.optionen.map((o) => {
        const aktiv = mehrfach ? liste.includes(o.id) : wert === o.id;
        return `<button type="button" class="opt${aktiv ? " on" : ""}${o.symbol ? " mit-symbol" : ""}" data-option="${o.id}"
          data-feld="${feld.id}" data-art="${feld.art}"${feld.max ? ` data-max="${feld.max}"` : ""} aria-pressed="${aktiv}">
          ${o.symbol ? `<span class="opt-symbol">${symbol(o.symbol)}</span>` : ""}
          <span class="opt-text"><b>${escapeHtml(o.titel)}</b>${o.text ? `<span>${escapeHtml(o.text)}</span>` : ""}</span>
          <span class="opt-haken">${symbol("haken", { groesse: 16 })}</span></button>`;
      }).join("");
      const zaehler = mehrfach ? `<div class="opt-zaehler">${liste.length} von ${feld.max} gewählt</div>` : "";
      return `<div class="field">${label}<div class="opts">${karten}</div>${zaehler}</div>`;
    }
    if (feld.art === "hinweis") {
      return `<p class="feld-hilfe">${escapeHtml(feld.text)}</p>`;
    }
    if (feld.art === "wochenzeiten") {
      // Leere Felder sind Absicht. Wer nur Dienstag und Donnerstag anders hat,
      // traegt zwei Zeilen ein und laesst den Rest leer. Was leer bleibt,
      // faellt auf den Standard zurueck.
      const werte = wert || {};
      const zeilen = WOCHENTAGE.map((t) => {
        const e = werte[String(t.nr)] || {};
        return `<div class="wochenzeile">
          <span class="wt-tag">${t.kurz}</span>
          <input type="time" data-wochenzeit="${feld.id}" data-tag="${t.nr}" data-teil="wakeTime"
                 value="${escapeHtml(e.wakeTime ?? "")}" aria-label="${escapeHtml(t.name)} aufstehen">
          <input type="time" data-wochenzeit="${feld.id}" data-tag="${t.nr}" data-teil="sleepTime"
                 value="${escapeHtml(e.sleepTime ?? "")}" aria-label="${escapeHtml(t.name)} schlafen">
        </div>`;
      }).join("");
      return `<div class="field">${label}
        <div class="wochenkopf"><span class="wt-tag"></span><span>Aufstehen</span><span>Schlafen</span></div>
        <div class="wochenzeiten">${zeilen}</div>
        <p class="feld-hilfe">Leer lassen heißt: an dem Tag gilt dein Standard. Einzelne Tage kannst du
        später jederzeit im Chat ändern, etwa wenn du morgen Frühdienst hast.</p></div>`;
    }
    if (feld.art === "chips") {
      const liste = wert || [];
      const chips = feld.optionen.map((o) =>
        `<button type="button" class="pill${liste.includes(o) ? " on" : ""}" data-option="${escapeHtml(o)}"
          data-feld="${feld.id}" data-art="chips">${escapeHtml(o)}</button>`).join("");
      return `<div class="field">${feld.label ? `<div class="feld-titel">${escapeHtml(feld.label)}</div>` : ""}<div class="pills">${chips}</div></div>`;
    }
    if (feld.art === "silhouette") {
      const sex = this.antworten.sex === "female" ? "female" : "male";
      const gewaehlt = this.antworten.koerperfett?.step;
      const figuren = BODY_FAT_LEVELS[sex].map((stufe, i) =>
        `<button type="button" class="figur${gewaehlt === i ? " on" : ""}" data-figur="${i}">
          ${figurBild(sex, i)}<b>${stufeText(stufe)}</b><span>${escapeHtml(stufe.label)}</span></button>`).join("");
      const gewaehltText = gewaehlt === undefined ? "" :
        `<div class="figur-hinweis">${escapeHtml(BODY_FAT_LEVELS[sex][gewaehlt].hint)}</div>`;
      return `<div class="field"><div class="figuren">${figuren}</div>${gewaehltText}</div>`;
    }
    return "";
  }

  /**
   * Die Seite mit dem Tagesziel.
   *
   * Gerechnet mit denselben Funktionen wie später in der App, nicht mit einer
   * eigenen Näherung für den Bogen. Sonst stünde hier 3210 und auf der
   * Tagesansicht 3190, und der Nutzer fragt sich, welche Zahl stimmt.
   */
  budgetHtml() {
    const profil = auswerten(this.antworten).profile;
    const z = macroTargets(profil);
    const k = this.antworten.zielKorrektur || {};
    const anteil = (kcal) => Math.max(2, Math.min(100, Math.round((kcal / Math.max(1, z.kcal)) * 100)));
    const zeile = (name, feld, gramm, kcal, ton, schritt) => `
      <div class="budget-makro" style="--ton: var(${ton})">
        <div class="budget-makro-kopf">
          <span class="budget-punkt"></span><span class="budget-name">${name}</span>
          ${feld ? `<button type="button" class="budget-pm" data-budget="${feld}" data-schritt="-${schritt}" aria-label="${name} weniger">&minus;</button>` : ""}
          <span class="budget-wert">${gramm} g</span>
          ${feld ? `<button type="button" class="budget-pm" data-budget="${feld}" data-schritt="${schritt}" aria-label="${name} mehr">+</button>` : ""}
        </div>
        <div class="budget-spur"><i style="width:${anteil(kcal)}%"></i></div>
      </div>`;
    const geaendert = Object.values(k).some((w) => w);
    return `<div class="budget">
      <div class="budget-kcal">
        <button type="button" class="budget-pm gross" data-budget="kcal" data-schritt="-50" aria-label="50 kcal weniger">&minus;</button>
        <div><b>${z.kcal}</b><span>kcal am Tag</span></div>
        <button type="button" class="budget-pm gross" data-budget="kcal" data-schritt="50" aria-label="50 kcal mehr">+</button>
      </div>
      ${zeile("Protein", "proteinG", z.proteinG, z.proteinG * 4, "--makro-protein", 5)}
      ${zeile("Kohlenhydrate", "carbsG", z.carbsG, z.carbsG * 4, "--makro-kohlenhydrate", 10)}
      ${zeile("Fett", "fatG", z.fatG, z.fatG * 9, "--makro-fett", 5)}
    </div>
    ${geaendert ? '<button type="button" class="setup-link" data-budget-reset>Zurück zum Vorschlag</button>' : ""}`;
  }

  zusammenfassung() {
    this.zeigtZusammenfassung = true;
    const ergebnis = auswerten(this.antworten);
    const { profile } = ergebnis;
    const energie = energyBreakdown(profile);
    const ziele = { ...macroTargets(profile), waterMl: waterTargetMl(profile, 0) };
    const schrittziel = Math.max(7000, Math.round((profile.dailySteps + 1500) / 500) * 500);

    this.ergebnis = { ...ergebnis, ziele, energie, schrittziel, kurzweg: Boolean(this.antworten.kurzweg) };

    this.sicherungZeigen(false);
    this.el.innerHTML = `
      ${this.kopfHtml({ abschnitt: "Startklar", nummer: SCHRITTE.length + 1, gesamt: SCHRITTE.length + 1, zurueck: true })}
      <div class="setup-body rein-vor">
        <h1 class="setup-frage">Dein Plan steht</h1>
        <p class="lead">Alles daraus kannst du später ändern. Ich rechne dann neu.</p>

        <div class="card">
          <div class="kv"><span>Grundumsatz</span><b>${energie.bmrKcal} kcal</b></div>
          <div class="kv"><span>Bedarf mit deinem Alltag</span><b>${energie.tdeeKcal} kcal</b></div>
          <div class="kv"><span>Dein Tagesziel</span><b>${ziele.kcal} kcal</b></div>
          <div class="kv"><span>Protein</span><b>${ziele.proteinG} g</b></div>
          <div class="kv"><span>Fett</span><b>${ziele.fatG} g</b></div>
          <div class="kv"><span>Kohlenhydrate</span><b>${ziele.carbsG} g</b></div>
          <div class="kv"><span>Wasser</span><b>${ziele.waterMl} ml</b></div>
          <div class="kv"><span>Schritte</span><b>${schrittziel}</b></div>
        </div>

        <h2 class="section-title">Dein Trainingsplan</h2>
        <div class="card">${this.planHtml(ergebnis)}</div>

        <h2 class="section-title">Was ich mir gemerkt habe</h2>
        <ul class="list">
          ${ergebnis.notizen.map((n) => `<li><div class="li-main"><div class="li-title">${escapeHtml(n.text)}</div></div></li>`).join("")}
        </ul>

        <p class="fineprint">Die Zahlen sind Schätzungen aus Formeln, keine Messwerte. Prüfe sie nach vier Wochen
        gegen deinen Gewichtsverlauf und sag mir Bescheid, dann korrigiere ich sie. Ich bin kein Arzt und stelle
        keine Diagnosen.</p>
      </div>
      <div class="setup-fuss">
        <button class="setup-knopf" data-start>Los geht es</button>
      </div>`;

    this.el.querySelector("[data-start]").addEventListener("click", () => this.onFertig(this.ergebnis));
  }
}
