/**
 * Die Einführung nach dem Fragebogen.
 *
 * Die App dunkelt ab, ein Lichtkreis liegt auf genau einem Bedienelement,
 * darunter steht ein Satz. Ein Tipp irgendwo führt weiter, das Kreuz beendet.
 * Ein Satz je Schritt: eine Einführung, die man lesen muss, wird weggetippt.
 *
 * Sie wechselt dafür selbst die Ansichten. Wer nur den Assistenten erklärt
 * bekommt, findet Heute, Übungen und die Planung erst Tage später, und manche
 * nie.
 *
 * Fehlt ein Element oder hat es keine Grösse, etwa eine leere Liste, fällt der
 * Schritt weg. Ein Lichtkreis, der auf nichts zeigt, sieht aus wie ein Fehler.
 */

export const EINFUEHRUNG_SCHRITTE = [
  { ansicht: "assistant", ziel: "orb", text: "Das ist daevo. Tipp auf den Kreis und sprich, ich höre zu.", textOben: true },
  { ansicht: "assistant", ziel: "btnMic", text: "Hier diktierst du. Was du sagst, geht als Nachricht an daevo.", rund: true },
  { ansicht: "assistant", ziel: "btnAnhang", text: "Mit dem Plus fotografierst du Essen oder Etiketten, leerst deinen Kopf oder sprichst freihändig.", rund: true },
  { ansicht: "assistant", ziel: "btnGespraeche", text: "Hier liegen deine Gespräche, nach Themen sortiert und durchsuchbar.", rund: true },
  { ansicht: "assistant", ziel: "btnMenu", text: "Das Menü hat vier Bereiche: Ernährung, Training, Alltag und Fortschritt. Die wichtigsten Seiten zeige ich dir jetzt.", rund: true },
  { ansicht: "heute", ziel: "ringKcal", text: "Heute: dein Tagesziel und wie viel davon noch offen ist." },
  { ansicht: "heute", ziel: "makroGruppe", text: "Protein, Kohlenhydrate und Fett, jeweils gegen dein Ziel." },
  { ansicht: "heute", ziel: "btnErfassenHeute", text: "Hier trägst du Essen ein: per Foto, Sprache, Barcode oder Suche." },
  { ansicht: "rezepte", ziel: "rzKarte", bisZu: "rzAktionen", text: "Rezepte, die in deinen Rest passen und zu deinen Angaben im Fragebogen." },
  { ansicht: "uebungen", ziel: "ueListe", text: "Die Übungsbibliothek: jede Übung mit Foto, Muskeln, Ausführung und Video." },
  { ansicht: "uebungen", ziel: "ueModusPlaene", text: "Hier rechnet daevo dir einen Trainingsplan aus Tagen, Zeit und Ziel." },
  { ansicht: "tag", ziel: "aufgabenHeute", text: "Dein Tag: Aufgaben in einer sinnvollen Reihenfolge, passend zu deinem Kalender." },
  { ansicht: "balance", ziel: "balanceNetz", text: "Das Balance Board zeigt dir, womit du deine Zeit tatsächlich verbringst, im Vergleich zu dem, was du dir vorgenommen hast." },
  { ansicht: "bericht", ziel: "berichtWerte", text: "Der Bericht fasst deine Wochen in Zahlen zusammen, zum Ansehen und Weitergeben." },
  { ansicht: "profil", ziel: "pTarget", text: "Im Profil änderst du Ziele, Gewicht und Einstellungen. Die Einführung findest du dort auch wieder." },
  { ansicht: "assistant", ziel: "chatInput", text: "Das war es. Sag oder schreib daevo einfach, was du gegessen hast." },
];

/** Abstand zwischen Element und Rand des Lichtkreises, in Pixeln. */
const LUFT = 10;

/**
 * Startet die Einführung.
 *
 * `zeigeAnsicht` kommt aus app.js, damit dieses Modul keine Ansicht selbst
 * umschaltet und sich nicht an deren Innenleben bindet.
 */
export function einfuehrungStarten({ zeigeAnsicht, schritte = EINFUEHRUNG_SCHRITTE, beiEnde = () => {} }) {
  if (document.querySelector(".ef-ebene")) return;

  const ebene = document.createElement("div");
  ebene.className = "ef-ebene";
  ebene.setAttribute("role", "dialog");
  ebene.setAttribute("aria-modal", "true");
  ebene.setAttribute("aria-label", "Einführung");
  ebene.innerHTML = `
    <div class="ef-licht"></div>
    <div class="ef-text" aria-live="polite"><p></p>
      <span class="ef-zaehler"></span>
      <button type="button" class="ef-schliessen">Einführung beenden</button>
    </div>`;
  document.body.appendChild(ebene);

  const licht = ebene.querySelector(".ef-licht");
  const textBox = ebene.querySelector(".ef-text");
  let index = -1;
  let ansicht = null;
  let beschaeftigt = false;

  const ende = () => {
    ebene.remove();
    window.removeEventListener("resize", neuMessen);
    zeigeAnsicht("assistant");
    beiEnde();
  };

  const neuMessen = () => {
    const s = schritte[index];
    const el = s && zielElement(document.getElementById(s.ziel));
    if (el) setzen(el, s);
  };

  function setzen(el, s) {
    // Ein zweites Element, das zum Ziel gehört. Die Knöpfe unter der
    // Rezeptkarte ragen in die Karte hinein, und ohne sie schnitt der
    // Lichtkreis die Knöpfe in der Mitte durch.
    let r = el.getBoundingClientRect();
    const dazu = s.bisZu && document.getElementById(s.bisZu)?.getBoundingClientRect();
    if (dazu && dazu.height > 0) {
      const links = Math.min(r.left, dazu.left), oben = Math.min(r.top, dazu.top);
      r = { left: links, top: oben, width: Math.max(r.right, dazu.right) - links, height: Math.max(r.bottom, dazu.bottom) - oben };
    }
    const rund = s.rund || (r.width < 80 && r.height < 80);
    const breite = rund ? Math.max(r.width, r.height) + LUFT * 2 : r.width + LUFT * 2;
    const hoehe = rund ? breite : r.height + LUFT * 2;
    const links = r.left + r.width / 2 - breite / 2;
    const oben = r.top + r.height / 2 - hoehe / 2;
    Object.assign(licht.style, {
      left: `${links}px`, top: `${oben}px`, width: `${breite}px`, height: `${hoehe}px`,
      borderRadius: rund ? "50%" : "22px",
    });
    // Der Text steht dort, wo mehr Platz ist. Unter einem Element am unteren
    // Rand wäre er abgeschnitten, über einem am oberen Rand auch.
    const unten = innerHeight - (oben + hoehe);
    const drueber = s.textOben || unten < oben;
    textBox.classList.toggle("ueber", drueber);
    textBox.style.top = drueber ? "" : `${Math.min(oben + hoehe + 18, innerHeight - 160)}px`;
    textBox.style.bottom = drueber ? `${Math.min(innerHeight - oben + 18, innerHeight - 160)}px` : "";
  }

  async function weiter() {
    if (beschaeftigt) return;
    beschaeftigt = true;
    try {
      for (index++; index < schritte.length; index++) {
        const s = schritte[index];
        if (s.ansicht !== ansicht) {
          zeigeAnsicht(s.ansicht);
          ansicht = s.ansicht;
          // Der Wechsel zwischen Ansichten ist animiert. Gemessen wird erst,
          // wenn die neue Ansicht steht, sonst sitzt der Kreis daneben.
          await warte(320);
        }
        const el = zielElement(document.getElementById(s.ziel));
        if (!el) continue;
        el.scrollIntoView({ block: "center", behavior: "instant" });
        await warte(60);
        const r = el.getBoundingClientRect();
        if (r.width < 4 || r.height < 4) continue;
        setzen(el, s);
        textBox.querySelector("p").textContent = s.text;
        textBox.querySelector(".ef-zaehler").textContent = `${index + 1} von ${schritte.length}`;
        ebene.classList.add("an");
        return;
      }
      ende();
    } finally {
      beschaeftigt = false;
    }
  }

  ebene.addEventListener("click", (event) => {
    if (event.target.closest(".ef-schliessen")) return ende();
    weiter();
  });
  window.addEventListener("resize", neuMessen);
  weiter();
}

/**
 * Ein Bereich, der höher ist als der halbe Bildschirm, wird durch sein erstes
 * Kind vertreten. Eine Liste mit achtzig Übungen ganz anzuleuchten heisst, nichts
 * abzudunkeln, und dann steht der Text ausserhalb des Bildschirms. Das ist
 * beim ersten Durchlauf im Browser genau so passiert.
 */
function zielElement(el) {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.height > innerHeight * 0.5 && el.firstElementChild) return el.firstElementChild;
  return el;
}

function warte(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
