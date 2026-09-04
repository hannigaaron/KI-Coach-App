import { BODY_FAT_LEVELS, figurBild, skala } from "./silhouette.js";

/**
 * Der Anamnesebogen beim ersten Start.
 *
 * Ein Schritt pro Bildschirm. Das ist auf dem Handy angenehmer als ein langes
 * Formular und erlaubt es, jede Antwort sofort zu prüfen. Die Fragen sind so
 * gestellt, dass jede Antwort später wirklich benutzt wird: entweder in der
 * Rechnung, im Erinnerungsplan oder im Gedächtnis des Assistenten. Fragen ohne
 * Verwendung gehören nicht in einen Fragebogen.
 */

export const BEREICHE = [
  { id: "ernaehrung", titel: "Ernährung", text: "Was ich esse, Kalorien, Makros" },
  { id: "kraft", titel: "Krafttraining", text: "Struktur, Fortschritt, dranbleiben" },
  { id: "ausdauer", titel: "Ausdauer", text: "Kondition, Schritte, Bewegung im Alltag" },
  { id: "schlaf", titel: "Schlaf", text: "Früher ins Bett, besser durchschlafen" },
  { id: "stress", titel: "Stress und Kopf", text: "Runterkommen, Grübeln, Druck rausnehmen" },
  { id: "trinken", titel: "Trinken", text: "Genug Wasser über den Tag" },
  { id: "routine", titel: "Routinen", text: "Morgens und abends verlässliche Abläufe" },
  { id: "gewicht", titel: "Gewicht", text: "Auf- oder abnehmen, ohne Jojo" },
];

const ALLERGIE_VORSCHLAEGE = [
  "Laktose", "Gluten", "Nüsse", "Erdnüsse", "Soja", "Eier", "Fisch",
  "Meeresfrüchte", "Histamin", "Fruktose",
];

/** Alle Schritte. `id` ist der Schlüssel in den Antworten. */
export const SCHRITTE = [
  {
    id: "start",
    titel: "Hallo",
    text: "Ich bin daevo. Damit ich dir wirklich helfen kann, brauche ich ein Bild von dir. Neun kurze Schritte, danach reden wir nur noch.",
    felder: [{ art: "text", id: "name", label: "Wie heißt du", platzhalter: "Aaron" }],
  },
  {
    id: "bereiche",
    titel: "Wobei soll ich dich unterstützen",
    text: "Wähle bis zu drei Bereiche. Danach richte ich meine Erinnerungen daran aus.",
    felder: [{ art: "mehrfach", id: "bereiche", optionen: BEREICHE, max: 3 }],
  },
  {
    id: "koerper",
    titel: "Deine Körperdaten",
    text: "Daraus rechne ich deinen Bedarf. Ohne diese vier Werte ist jede Kalorienangabe geraten.",
    felder: [
      { art: "auswahl", id: "sex", label: "Geschlecht", optionen: [
        { id: "male", titel: "männlich" }, { id: "female", titel: "weiblich" }] },
      { art: "zahl", id: "ageYears", label: "Alter", min: 14, max: 100, standard: 25 },
      { art: "zahl", id: "heightCm", label: "Größe in cm", min: 120, max: 230, standard: 178 },
      { art: "zahl", id: "weightKg", label: "Gewicht in kg", min: 35, max: 300, standard: 80, schritt: 0.1 },
    ],
  },
  {
    id: "ziel",
    titel: "Was willst du erreichen",
    text: "Das entscheidet, ob ich dich über oder unter deinen Bedarf steuere.",
    felder: [{ art: "auswahl", id: "goal", optionen: [
      { id: "fat_loss", titel: "Fett verlieren", text: "Etwa 18 Prozent unter deinem Bedarf" },
      { id: "maintain", titel: "Gewicht halten", text: "Auf deinem Bedarf" },
      { id: "lean_bulk", titel: "Muskeln aufbauen", text: "Etwa 10 Prozent über deinem Bedarf" },
    ] }],
  },
  {
    id: "alltag",
    titel: "Dein Alltag",
    text: "Schritte allein sagen nicht alles. Stehen, Tragen und Treppen zählen auch.",
    felder: [
      { art: "zahl", id: "dailySteps", label: "Schritte pro Tag im Schnitt", min: 0, max: 40000, standard: 8000, schritt: 500 },
      { art: "auswahl", id: "occupation", label: "Auf der Arbeit bist du", optionen: [
        { id: "sitzend", titel: "fast nur am Sitzen" },
        { id: "gemischt", titel: "mal sitzend, mal auf den Beinen" },
        { id: "stehend", titel: "überwiegend auf den Beinen" },
        { id: "koerperlich", titel: "körperlich am Arbeiten" },
      ] },
      { art: "auswahl", id: "leisure", label: "In der Freizeit bist du", optionen: [
        { id: "ruhig", titel: "eher ruhig" },
        { id: "gemischt", titel: "gemischt" },
        { id: "aktiv", titel: "viel unterwegs" },
      ] },
    ],
  },
  {
    id: "sport",
    titel: "Sport und Training",
    text: "Danach richtet sich, wie fordernd dein Plan wird.",
    felder: [
      { art: "auswahl", id: "kraftErfahrung", label: "Erfahrung im Krafttraining", optionen: [
        { id: "keine", titel: "keine" },
        { id: "unter1", titel: "unter einem Jahr" },
        { id: "1bis3", titel: "ein bis drei Jahre" },
        { id: "ueber3", titel: "über drei Jahre" },
      ] },
      { art: "zahl", id: "sportProWoche", label: "Sporteinheiten pro Woche", min: 0, max: 14, standard: 3 },
    ],
  },
  {
    id: "koerperfett",
    titel: "Schätz deinen Körperfettanteil",
    text: "Such die Figur, die dir am nächsten kommt. Eine Schätzung nach Augenmaß liegt gut fünf Prozentpunkte daneben, das reicht mir. Bist du schlanker als die erste Figur oder kennst du deinen Wert aus einer Messung, trag ihn unten ein. Du kannst den Schritt auch überspringen.",
    felder: [
      { art: "silhouette", id: "koerperfett" },
      { art: "zahl", id: "koerperfettWert", label: "Oder dein Wert in Prozent, falls du ihn kennst", min: 3, max: 60, schritt: 0.5 },
    ],
    ueberspringbar: true,
  },
  {
    id: "gesundheit",
    titel: "Gibt es etwas zu beachten",
    text: "Alles hier landet in meinem Gedächtnis und fließt in jeden Vorschlag ein.",
    felder: [
      { art: "chips", id: "allergien", label: "Unverträglichkeiten und Allergien", optionen: ALLERGIE_VORSCHLAEGE },
      { art: "text", id: "allergienFrei", label: "Noch etwas, das du nicht verträgst", platzhalter: "Rohe Zwiebeln, Paprika" },
      { art: "textarea", id: "krankheiten", label: "Krankheiten, Verletzungen, Medikamente", platzhalter: "Bandscheibenvorfall 2024, seitdem kein schweres Kreuzheben" },
    ],
    ueberspringbar: true,
  },
  {
    id: "routine",
    titel: "Deine Tagesränder",
    text: "Morgens und abends entscheidet sich der Rest. Daraus baue ich deinen Erinnerungsplan.",
    felder: [
      { art: "zeit", id: "wakeTime", label: "Aufstehen", standard: "07:00" },
      { art: "zeit", id: "sleepTime", label: "Schlafen", standard: "23:00" },
      { art: "zeit", id: "handyAus", label: "Handy abends weg", standard: "22:00" },
      { art: "zeit", id: "handyMorgens", label: "Morgens das erste Mal am Handy", standard: "07:15" },
    ],
  },
];

/* ---------- Bewertung der Antworten ---------- */

const KRAFT_PLAN = {
  keine: {
    titel: "Ganzkörper, zweimal die Woche",
    text: "Kniebeuge, Rudern, Bankdrücken oder Liegestütz, Schulterdrücken, Rumpf. Drei Sätze je Übung, acht bis zwölf Wiederholungen. Technik vor Gewicht.",
  },
  unter1: {
    titel: "Ganzkörper, dreimal die Woche",
    text: "Dieselben Grundübungen, jede Woche etwas mehr Gewicht oder eine Wiederholung mehr. Das ist der ganze Trick am Anfang.",
  },
  "1bis3": {
    titel: "Oberkörper und Unterkörper im Wechsel",
    text: "Vier Einheiten, zwei für oben, zwei für unten. Pro Muskelgruppe zehn bis vierzehn harte Sätze in der Woche.",
  },
  ueber3: {
    titel: "Push, Pull, Beine",
    text: "Drei bis sechs Einheiten. Steuere über die Sätze pro Woche und plane alle sechs bis acht Wochen eine leichtere Woche ein.",
  },
};

/**
 * Baut aus den Antworten das Profil, den Plan und die Notizen fürs Gedächtnis.
 * Reine Funktion, damit sie testbar bleibt und nichts nebenbei speichert.
 */
export function auswerten(antworten) {
  const sessions = trainingsplan(antworten);
  const profile = {
    name: (antworten.name || "").trim(),
    sex: antworten.sex || "male",
    ageYears: Number(antworten.ageYears) || 25,
    heightCm: Number(antworten.heightCm) || 178,
    weightKg: Number(antworten.weightKg) || 80,
    goal: antworten.goal || "maintain",
    dailySteps: Number(antworten.dailySteps) || 8000,
    occupation: antworten.occupation || "sitzend",
    leisure: antworten.leisure || "gemischt",
    // Ein selbst eingetragener Wert schlägt die Figur. Wer seinen Wert kennt,
    // hat ihn gemessen, und eine Messung schlägt eine Schätzung nach Augenmaß.
    bodyFatPercent: gueltigerKoerperfettWert(antworten.koerperfettWert) ?? antworten.koerperfett?.percent ?? null,
    wakeTime: antworten.wakeTime || "07:00",
    sleepTime: antworten.sleepTime || "23:00",
    tdeeOverrideKcal: null,
    sessions,
  };

  const notizen = [];
  const add = (text, art, wichtigkeit, schlagworte = []) => notizen.push({ text, art, wichtigkeit, schlagworte });

  if (profile.name) add(`Heißt ${profile.name}.`, "fakt", 5, ["name"]);
  const zielText = { fat_loss: "Fett verlieren", maintain: "Gewicht halten", lean_bulk: "Muskeln aufbauen" }[profile.goal];
  add(`Ziel ist ${zielText}.`, "ziel", 5, ["ziel"]);

  const bereiche = antworten.bereiche || [];
  if (bereiche.length) {
    const titel = bereiche.map((id) => BEREICHE.find((b) => b.id === id)?.titel).filter(Boolean);
    add(`Will vor allem Unterstützung bei: ${titel.join(", ")}.`, "ziel", 5, ["fokus"]);
  }

  for (const allergie of antworten.allergien || []) {
    add(`Verträgt kein ${allergie}.`, "fakt", 5, ["ernährung", "unverträglichkeit"]);
  }
  if ((antworten.allergienFrei || "").trim()) {
    add(`Verträgt nicht: ${antworten.allergienFrei.trim()}.`, "fakt", 5, ["ernährung", "unverträglichkeit"]);
  }
  if ((antworten.krankheiten || "").trim()) {
    add(`Gesundheit beachten: ${antworten.krankheiten.trim()}.`, "fakt", 5, ["gesundheit"]);
  }

  add(`Steht gegen ${profile.wakeTime} auf und geht gegen ${profile.sleepTime} ins Bett.`, "fakt", 3, ["routine"]);
  if (antworten.handyAus) add(`Legt das Handy abends gegen ${antworten.handyAus} weg.`, "fakt", 3, ["routine", "schlaf"]);
  if (antworten.handyMorgens) add(`Greift morgens gegen ${antworten.handyMorgens} zum ersten Mal zum Handy.`, "fakt", 2, ["routine"]);

  const kraft = KRAFT_PLAN[antworten.kraftErfahrung || "keine"];
  add(`Krafterfahrung: ${{ keine: "keine", unter1: "unter einem Jahr", "1bis3": "ein bis drei Jahre", ueber3: "über drei Jahre" }[antworten.kraftErfahrung || "keine"]}.`, "fakt", 4, ["training"]);
  if (profile.bodyFatPercent) {
    add(`Schätzt den eigenen Körperfettanteil auf etwa ${profile.bodyFatPercent} Prozent.`, "fakt", 3, ["körper"]);
  }

  return { profile, notizen, kraft, sessions, bereiche };
}

/** Nimmt einen selbst eingetragenen Körperfettanteil nur in sinnvollen Grenzen an. */
function gueltigerKoerperfettWert(wert) {
  const zahl = Number(wert);
  return Number.isFinite(zahl) && zahl >= 3 && zahl <= 60 ? Math.round(zahl * 10) / 10 : null;
}

/**
 * Legt Trainingseinheiten in die Woche.
 *
 * Die Zeiten sind ein Vorschlag, kein Diktat: eine Stunde nach dem Aufstehen
 * plus zehn Stunden, also am späten Nachmittag. Der Nutzer verschiebt sie im
 * Profil. Ohne Einheiten im Kalender kann die App nicht vor dem Training
 * erinnern, deshalb legt sie welche an.
 */
function trainingsplan(antworten) {
  const anzahl = Math.min(6, Math.max(0, Number(antworten.sportProWoche) || 0));
  if (anzahl === 0) return [];
  const verteilung = { 1: [2], 2: [1, 4], 3: [1, 3, 5], 4: [1, 2, 4, 5], 5: [1, 2, 3, 4, 5], 6: [1, 2, 3, 4, 5, 6] }[anzahl];
  const start = startzeit(antworten.wakeTime || "07:00");
  return verteilung.map((weekday) => ({
    type: "strength",
    minutes: 60,
    weekday,
    startsAt: start,
  }));
}

function startzeit(wake) {
  const [h, m] = wake.split(":").map(Number);
  const minuten = ((h * 60 + m + 10 * 60) % 1440);
  return `${String(Math.floor(minuten / 60)).padStart(2, "0")}:${String(minuten % 60).padStart(2, "0")}`;
}

export { figurBild, skala, BODY_FAT_LEVELS };
