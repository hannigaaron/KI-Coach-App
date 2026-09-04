import { energyBreakdown, macroTargets, waterTargetMl } from "@daevo/core";
import { BODY_FAT_LEVELS, SCHRITTE, auswerten, figurBild } from "./anamnese.js";

/**
 * Zeigt den Anamnesebogen an.
 *
 * Ein Schritt pro Bildschirm, mit Fortschrittsbalken. Die Antworten liegen in
 * einem einfachen Objekt, das erst am Ende ausgewertet wird. So kann der
 * Nutzer jederzeit zurück, ohne dass unterwegs etwas gespeichert wird.
 */

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
    const feld = event.target.closest("[data-feld]");
    if (!feld) return;
    const id = feld.dataset.feld;
    this.antworten[id] = feld.type === "number" ? Number(feld.value) : feld.value;
    this.updateWeiter();
  }

  onClick(event) {
    const weiter = event.target.closest("[data-weiter]");
    if (weiter) return this.weiter();
    const zurueck = event.target.closest("[data-zurueck]");
    if (zurueck) return this.zurueck();
    const ueberspringen = event.target.closest("[data-ueberspringen]");
    if (ueberspringen) return this.weiter(true);

    const option = event.target.closest("[data-option]");
    if (option) {
      const { feld, option: wert, art, max } = option.dataset;
      if (art === "auswahl") {
        this.antworten[feld] = wert;
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

  vollstaendig() {
    const s = this.schritt;
    if (s.ueberspringbar) return true;
    return s.felder.every((feld) => {
      const wert = this.antworten[feld.id];
      if (feld.art === "mehrfach") return Array.isArray(wert) && wert.length > 0;
      if (feld.art === "chips") return true;
      if (feld.art === "zahl") return Number.isFinite(wert) && wert >= feld.min && wert <= feld.max;
      if (feld.art === "text") return String(wert || "").trim().length > 0;
      return wert !== undefined && wert !== "";
    });
  }

  updateWeiter() {
    const button = this.el.querySelector("[data-weiter]");
    if (button) button.disabled = !this.vollstaendig();
  }

  weiter(uebersprungen = false) {
    if (!uebersprungen && !this.vollstaendig()) return this.hinweis("Da fehlt noch eine Angabe.");
    if (this.index === SCHRITTE.length - 1) return this.zusammenfassung();
    this.index++;
    this.render();
  }

  zurueck() {
    if (this.zeigtZusammenfassung) {
      this.zeigtZusammenfassung = false;
      return this.render();
    }
    if (this.index === 0) return;
    this.index--;
    this.render();
  }

  render(behalteScroll = false) {
    const scroll = behalteScroll ? this.el.scrollTop : 0;
    const s = this.schritt;
    const nummer = this.index + 1;
    const anteil = Math.round((nummer / (SCHRITTE.length + 1)) * 100);

    this.el.innerHTML = `
      <div class="setup-head">
        <div class="setup-fortschritt"><i style="width:${anteil}%"></i></div>
        <div class="setup-zaehler">Schritt ${nummer} von ${SCHRITTE.length}</div>
      </div>
      <div class="setup-body">
        ${this.index === 0 ? LOCKUP : ""}
        <h1>${escapeHtml(s.titel)}</h1>
        <p class="lead">${escapeHtml(s.text)}</p>
        ${s.felder.map((feld) => this.feldHtml(feld)).join("")}
        <div class="setup-hinweis"></div>
      </div>
      <div class="setup-fuss">
        ${this.index > 0 ? '<button class="ghost" data-zurueck>Zurück</button>' : ""}
        ${s.ueberspringbar ? '<button class="ghost" data-ueberspringen>Überspringen</button>' : ""}
        <button class="primary" data-weiter>${this.index === SCHRITTE.length - 1 ? "Fertig" : "Weiter"}</button>
      </div>`;
    this.updateWeiter();
    this.el.scrollTop = scroll;
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
      return `<div class="field">${label}<input id="f-${feld.id}" data-feld="${feld.id}" type="number"
        inputmode="decimal" min="${feld.min}" max="${feld.max}" step="${feld.schritt ?? 1}" value="${wert ?? ""}"></div>`;
    }
    if (feld.art === "zeit") {
      return `<div class="field">${label}<input id="f-${feld.id}" data-feld="${feld.id}" type="time" value="${wert ?? ""}"></div>`;
    }
    if (feld.art === "auswahl" || feld.art === "mehrfach") {
      const mehrfach = feld.art === "mehrfach";
      const liste = mehrfach ? wert || [] : [];
      const karten = feld.optionen.map((o) => {
        const aktiv = mehrfach ? liste.includes(o.id) : wert === o.id;
        return `<button type="button" class="opt${aktiv ? " on" : ""}" data-option="${o.id}"
          data-feld="${feld.id}" data-art="${feld.art}"${feld.max ? ` data-max="${feld.max}"` : ""}>
          <b>${escapeHtml(o.titel)}</b>${o.text ? `<span>${escapeHtml(o.text)}</span>` : ""}</button>`;
      }).join("");
      const zaehler = mehrfach ? `<div class="opt-zaehler">${liste.length} von ${feld.max} gewählt</div>` : "";
      return `<div class="field">${label}<div class="opts">${karten}</div>${zaehler}</div>`;
    }
    if (feld.art === "chips") {
      const liste = wert || [];
      const chips = feld.optionen.map((o) =>
        `<button type="button" class="pill${liste.includes(o) ? " on" : ""}" data-option="${escapeHtml(o)}"
          data-feld="${feld.id}" data-art="chips">${escapeHtml(o)}</button>`).join("");
      return `<div class="field">${label}<div class="pills">${chips}</div></div>`;
    }
    if (feld.art === "silhouette") {
      const sex = this.antworten.sex === "female" ? "female" : "male";
      const gewaehlt = this.antworten.koerperfett?.step;
      const figuren = BODY_FAT_LEVELS[sex].map((stufe, i) =>
        `<button type="button" class="figur${gewaehlt === i ? " on" : ""}" data-figur="${i}">
          ${figurBild(sex, i)}<b>${stufe.percent} %</b><span>${escapeHtml(stufe.label)}</span></button>`).join("");
      const gewaehltText = gewaehlt === undefined ? "" :
        `<div class="figur-hinweis">${escapeHtml(BODY_FAT_LEVELS[sex][gewaehlt].hint)}</div>`;
      return `<div class="field"><div class="figuren">${figuren}</div>${gewaehltText}</div>`;
    }
    return "";
  }

  zusammenfassung() {
    this.zeigtZusammenfassung = true;
    const ergebnis = auswerten(this.antworten);
    const { profile } = ergebnis;
    const energie = energyBreakdown(profile);
    const ziele = { ...macroTargets(profile), waterMl: waterTargetMl(profile, 0) };
    const schrittziel = Math.max(7000, Math.round((profile.dailySteps + 1500) / 500) * 500);

    this.ergebnis = { ...ergebnis, ziele, energie, schrittziel };

    this.el.innerHTML = `
      <div class="setup-head">
        <div class="setup-fortschritt"><i style="width:100%"></i></div>
        <div class="setup-zaehler">Fertig</div>
      </div>
      <div class="setup-body">
        <h1>Dein Plan steht</h1>
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

        <h2 class="section-title">Trainingsvorschlag</h2>
        <div class="card">
          <h3>${escapeHtml(ergebnis.kraft.titel)}</h3>
          <p>${escapeHtml(ergebnis.kraft.text)}</p>
          <div class="kv"><span>Einheiten im Kalender</span><b>${ergebnis.sessions.length} pro Woche</b></div>
        </div>

        <h2 class="section-title">Was ich mir gemerkt habe</h2>
        <ul class="list">
          ${ergebnis.notizen.map((n) => `<li><div class="li-main"><div class="li-title">${escapeHtml(n.text)}</div></div></li>`).join("")}
        </ul>

        <p class="fineprint">Die Zahlen sind Schätzungen aus Formeln, keine Messwerte. Prüfe sie nach vier Wochen
        gegen deinen Gewichtsverlauf und sag mir Bescheid, dann korrigiere ich sie. Ich bin kein Arzt und stelle
        keine Diagnosen.</p>
      </div>
      <div class="setup-fuss">
        <button class="ghost" data-zurueck>Zurück</button>
        <button class="primary" data-start>Los geht es</button>
      </div>`;

    this.el.querySelector("[data-start]").addEventListener("click", () => this.onFertig(this.ergebnis));
  }
}
