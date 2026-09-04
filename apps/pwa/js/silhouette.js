/**
 * Körperfiguren zur Schätzung des Körperfettanteils.
 *
 * Die Figuren sind Fotos einer Vergleichsreihe, freigestellt und als WebP
 * abgelegt in `apps/pwa/img/koerperfett`. Der Hintergrund ist durchsichtig,
 * damit sie im hellen wie im dunklen Modus stehen.
 *
 * Vor dem kommerziellen Start zu klären: die Bilder stammen aus einer fremden
 * Vorlage. Für einen privaten Test ist das eine Sache, für eine App im Store
 * eine andere. Vor der Veröffentlichung braucht es entweder eine Lizenz für
 * genau diese Reihe oder eigene Aufnahmen. Siehe docs/ROADMAP.md.
 *
 * Die Vorlage deckt vier Stufen je Geschlecht ab, beim Mann 20 bis 35 Prozent,
 * bei der Frau 30 bis 45. Der schlanke Bereich fehlt darin. Wer darunter liegt,
 * trägt seinen Wert über das Feld daneben ein. Eine Figur zu erfinden, die es
 * in der Vorlage nicht gibt, wäre eine Behauptung über einen Körper.
 *
 * Die Prozentwerte sind Richtwerte für eine Schätzung nach Augenmaß. Eine
 * solche Schätzung liegt selbst bei geübten Trainern gut fünf Prozentpunkte
 * daneben. Sie ersetzt keine Messung per Caliper, DEXA oder BIA. Die App nutzt
 * den Wert nur, um die Proteinmenge auf die fettfreie Masse zu beziehen.
 */

export const BODY_FAT_LEVELS = {
  male: [
    { percent: 20, label: "schlank", hint: "Flacher Bauch, Bauchmuskeln angedeutet, Schultern zeichnen sich ab." },
    { percent: 25, label: "leichter Bauch", hint: "Der Bauch steht leicht über den Gürtel, die Taille ist noch abgesetzt." },
    { percent: 30, label: "deutlicher Bauch", hint: "Runder Bauch, Taille etwa so breit wie die Brust." },
    { percent: 35, label: "stark", hint: "Der Bauch bestimmt die Form, die Taille ist breiter als die Schultern." },
  ],
  female: [
    { percent: 30, label: "schlank", hint: "Straffe Taille, flacher Bauch, Hüfte deutlich abgesetzt." },
    { percent: 35, label: "normal", hint: "Weiche Taille, gerundeter Unterbauch." },
    { percent: 40, label: "deutliche Rundung", hint: "Taille kaum abgesetzt, Oberschenkel kräftiger." },
    { percent: 45, label: "stark", hint: "Bauch und Hüfte bestimmen die Form." },
  ],
};

/** Kleinster und grösster Wert, für den es ein Bild gibt. */
export function skala(sex) {
  const stufen = BODY_FAT_LEVELS[sex === "female" ? "female" : "male"];
  return { min: stufen[0].percent, max: stufen[stufen.length - 1].percent };
}

function stufeVon(sex, step) {
  const geschlecht = sex === "female" ? "female" : "male";
  const stufen = BODY_FAT_LEVELS[geschlecht];
  const index = Math.max(0, Math.min(stufen.length - 1, Math.round(Number(step) || 0)));
  return { geschlecht, stufe: stufen[index] };
}

/**
 * Liefert das Bild einer Stufe.
 *
 * Kein SVG mehr, sondern ein img. Die Höhe kommt aus dem Stylesheet, die
 * Breite ergibt sich. Ohne width und height im Markup springt die Auswahl
 * beim Laden, deshalb stehen die Maße der Vorlage mit drin.
 */
export function figurBild(sex, step) {
  const { geschlecht, stufe } = stufeVon(sex, step);
  return (
    `<img class="figur-bild" src="./img/koerperfett/${geschlecht}-${stufe.percent}.webp" ` +
    `width="190" height="520" loading="lazy" decoding="async" ` +
    `alt="Körper mit etwa ${stufe.percent} Prozent Körperfett, ${stufe.label}">`
  );
}

/**
 * Der Dateiname zu einer Stufe. Getrennt von der Anzeige, damit sich prüfen
 * lässt, dass zu jeder Stufe wirklich eine Datei existiert.
 */
export function figurDatei(sex, step) {
  const { geschlecht, stufe } = stufeVon(sex, step);
  return `${geschlecht}-${stufe.percent}.webp`;
}
