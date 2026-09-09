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
  /*
   * Die vier Schritte hier sind der Unterschied zwischen einem Rechner und
   * einem Coach.
   *
   * Alles davor sind Zahlen: Gewicht, Größe, Schritte, Trainingstage. Damit
   * lässt sich ein Kalorienziel ausrechnen und sonst nichts. Was tatsächlich
   * darüber entscheidet, ob jemand sein Ziel erreicht, steht hier: wann er
   * isst, obwohl er keinen Hunger hat, was ihn bisher jedes Mal gestoppt hat,
   * und wer in seinem Umfeld dagegen arbeitet.
   *
   * Alle vier sind überspringbar. Ein Bogen, der zu Antworten über Scham
   * zwingt, bekommt erfundene Antworten, und eine erfundene Antwort ist
   * schlechter als eine fehlende: die App rechnet damit weiter.
   */
  {
    id: "essverhalten",
    titel: "Wie du wirklich isst",
    text: "Nicht was auf dem Plan steht, sondern was passiert. Je ehrlicher hier, desto brauchbarer alles danach.",
    felder: [
      {
        art: "mehrfach",
        id: "essMuster",
        label: "Was davon kennst du",
        max: 6,
        optionen: [
          { id: "stress", titel: "Stressessen", text: "Wenn der Druck steigt, esse ich mehr." },
          { id: "langeweile", titel: "Aus Langeweile", text: "Nicht Hunger, einfach da." },
          { id: "abends", titel: "Abends kippt es", text: "Tagsüber gut, abends kommt alles." },
          { id: "nachts", titel: "Nachts", text: "Ich stehe auf und esse." },
          { id: "belohnung", titel: "Als Belohnung", text: "Harter Tag, also darf ich." },
          { id: "sozial", titel: "In Gesellschaft", text: "Mit anderen esse ich deutlich mehr." },
          { id: "anfaelle", titel: "Essanfälle", text: "Es geht los und hört nicht auf." },
          { id: "vergessen", titel: "Ich vergesse Essen", text: "Erst abends merke ich, dass ich nichts hatte." },
          { id: "nichts", titel: "Nichts davon", text: "Ich esse ziemlich gleichmäßig." },
        ],
      },
      {
        art: "textarea",
        id: "heisshungerWann",
        label: "Wann genau kommt der Heißhunger",
        platzhalter: "Sonntagabend, wenn die Woche vor mir liegt. Oder nach einem Kundentag ohne Pause.",
      },
      {
        art: "textarea",
        id: "triggerLebensmittel",
        label: "Wovon kannst du nicht die Finger lassen",
        platzhalter: "Schokolade, Chips, Erdnussbutter direkt aus dem Glas",
      },
      {
        art: "auswahl",
        id: "essTempo",
        label: "Wie isst du",
        optionen: [
          { id: "schnell", titel: "Schnell und nebenbei", text: "Meist zwischen zwei Terminen." },
          { id: "normal", titel: "Normal", text: "Ich nehme mir Zeit, wenn es geht." },
          { id: "bewusst", titel: "Bewusst", text: "Ich setze mich hin und esse ohne Ablenkung." },
        ],
      },
    ],
    ueberspringbar: true,
  },
  {
    id: "vorgeschichte",
    titel: "Was du schon versucht hast",
    text: "Was bisher gescheitert ist, sagt mehr über den richtigen Weg als jedes Ziel.",
    felder: [
      {
        art: "textarea",
        id: "versuche",
        label: "Was hast du schon probiert",
        platzhalter: "Zwei Jahre Kalorien getrackt, dann aufgehört. Low Carb dreimal, jedes Mal nach vier Wochen abgebrochen.",
      },
      {
        art: "textarea",
        id: "warumGescheitert",
        label: "Woran ist es jedes Mal gescheitert",
        platzhalter: "Sobald eine Woche stressig war, ist alles gekippt und ich habe es nicht wieder aufgenommen.",
      },
      {
        art: "auswahl",
        id: "gewichtsVerlauf",
        label: "Wie war dein Gewicht in den letzten Jahren",
        optionen: [
          { id: "stabil", titel: "Ziemlich stabil" },
          { id: "hoch", titel: "Langsam nach oben" },
          { id: "runter", titel: "Langsam nach unten" },
          { id: "jojo", titel: "Auf und ab", text: "Immer wieder rauf und runter." },
        ],
      },
      {
        art: "textarea",
        id: "warumJetzt",
        label: "Warum gerade jetzt",
        platzhalter: "Was ist passiert, dass du es diesmal angehst",
      },
    ],
    ueberspringbar: true,
  },
  {
    id: "umfeld",
    titel: "Dein Umfeld",
    text: "Wer mitisst, mitkocht und mitredet, entscheidet mit. Das gehört zur Planung.",
    felder: [
      {
        art: "auswahl",
        id: "kochen",
        label: "Wer kocht bei dir",
        optionen: [
          { id: "selbst", titel: "Ich selbst" },
          { id: "geteilt", titel: "Mal ich, mal jemand anders" },
          { id: "andere", titel: "Jemand anders" },
          { id: "kaum", titel: "Es wird kaum gekocht", text: "Meist unterwegs oder fertig." },
        ],
      },
      {
        art: "auswahl",
        id: "auswaerts",
        label: "Wie oft isst du auswärts oder unterwegs",
        optionen: [
          { id: "selten", titel: "Selten", text: "Ein bis zwei Mal die Woche." },
          { id: "oft", titel: "Oft", text: "Drei bis fünf Mal die Woche." },
          { id: "taeglich", titel: "Fast täglich" },
        ],
      },
      {
        art: "mehrfach",
        id: "unterstuetzung",
        label: "Was trifft zu",
        max: 4,
        optionen: [
          { id: "rueckhalt", titel: "Mein Umfeld unterstützt mich" },
          { id: "gleichgueltig", titel: "Es interessiert niemanden" },
          { id: "gegenwind", titel: "Es gibt Gegenwind", text: "Kommentare, Druck, Sabotage." },
          { id: "allein", titel: "Ich mache das allein" },
          { id: "vorbild", titel: "Andere schauen auf mich", text: "Ich will kein schlechtes Beispiel sein." },
        ],
      },
      {
        art: "textarea",
        id: "umfeldFrei",
        label: "Etwas, das ich über dein Umfeld wissen sollte",
        platzhalter: "Meine Freundin kocht abends, und da esse ich mit, egal was drin ist.",
      },
    ],
    ueberspringbar: true,
  },
  {
    id: "antrieb",
    titel: "Was dich antreibt und was dich stoppt",
    text: "Der Teil, den die meisten Apps auslassen, und genau der entscheidet nach der dritten Woche.",
    felder: [
      {
        art: "textarea",
        id: "warumWichtig",
        label: "Warum ist dir dein Ziel wirklich wichtig",
        platzhalter: "Nicht die Zahl auf der Waage. Was ändert sich in deinem Leben, wenn du es erreichst",
      },
      {
        art: "textarea",
        id: "wennNichts",
        label: "Was passiert, wenn sich nichts ändert",
        platzhalter: "In zwei Jahren stehe ich genau hier, nur müder",
      },
      {
        art: "mehrfach",
        id: "stopper",
        label: "Was bringt dich am ehesten aus dem Takt",
        max: 4,
        optionen: [
          { id: "stress", titel: "Stressphasen" },
          { id: "schlaf", titel: "Zu wenig Schlaf" },
          { id: "reisen", titel: "Unterwegs sein" },
          { id: "verletzung", titel: "Verletzung oder Krankheit" },
          { id: "motivation", titel: "Wenn die Lust weg ist" },
          { id: "ergebnisse", titel: "Wenn nichts passiert", text: "Keine sichtbaren Fortschritte." },
          { id: "sozial", titel: "Feiern und Einladungen" },
          { id: "alleinsein", titel: "Wenn ich allein bin" },
        ],
      },
      {
        art: "auswahl",
        id: "tonfall",
        label: "Wie soll ich mit dir reden, wenn es nicht läuft",
        optionen: [
          { id: "direkt", titel: "Direkt", text: "Sag mir klar, was Sache ist." },
          { id: "sachlich", titel: "Sachlich", text: "Zahlen und nächster Schritt, ohne Bewertung." },
          { id: "sanft", titel: "Behutsam", text: "Ich mache mir selbst schon genug Druck." },
        ],
      },
    ],
    ueberspringbar: true,
  },
  {
    id: "routine",
    titel: "Deine Tagesränder",
    text: "Morgens und abends entscheidet sich der Rest. Daraus baue ich deinen Erinnerungsplan.",
    felder: [
      {
        art: "auswahl",
        id: "randModus",
        label: "Wie sehen deine Tage aus",
        standard: "gleich",
        optionen: [
          { id: "gleich", titel: "Ähnlich jeden Tag", text: "Du stehst meistens zur gleichen Zeit auf." },
          { id: "wochentag", titel: "Je nach Wochentag", text: "Montags anders als samstags, aber die Woche wiederholt sich." },
          { id: "wechselnd", titel: "Wechselnd oder Schichtdienst", text: "Kein Tag wie der andere. Du trägst die Zeiten ein, wenn du sie kennst." },
        ],
      },
      { art: "zeit", id: "wakeTime", label: "Aufstehen, im Schnitt", standard: "07:00" },
      { art: "zeit", id: "sleepTime", label: "Schlafen, im Schnitt", standard: "23:00" },
      {
        art: "wochenzeiten",
        id: "wochenraender",
        label: "Deine Woche",
        wennFeld: { id: "randModus", ist: ["wochentag"] },
      },
      {
        art: "hinweis",
        id: "randHinweis",
        text: "Deine Zeiten oben gelten dann als Schnitt. Sag mir im Chat, wann du an einem Tag "
          + "wirklich aufstehst, etwa morgen um 5 raus. Diesen Tag rechne ich dann damit, alles andere "
          + "bleibt unberührt.",
        wennFeld: { id: "randModus", ist: ["wechselnd"] },
      },
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
    handyAus: antworten.handyAus || undefined,
    handyMorgens: antworten.handyMorgens || undefined,
    // "wechselnd" wird als "gleich" gespeichert: es gibt keine Wochenzeiten,
    // die Standardwerte gelten als Schätzung, und jeder einzelne Tag lässt sich
    // überschreiben. Der Unterschied liegt nur darin, dass der Coach bei
    // wechselnden Tagen aktiv nach der Schicht fragt, statt sie anzunehmen.
    randModus: antworten.randModus === "wochentag" ? "wochentag" : "gleich",
    wechselndeZeiten: antworten.randModus === "wechselnd",
    wochenraender: antworten.randModus === "wochentag" ? (antworten.wochenraender || {}) : undefined,
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

  /*
   * Die Antworten aus den vier tiefen Schritten.
   *
   * Sie kommen mit Wichtigkeit 5 ins Gedächtnis, also der höchsten Stufe. Ein
   * Nutzer, der einmal aufschreibt, dass er sonntagabends die Kontrolle
   * verliert, erwartet, dass der Coach das kennt, und zwar in vier Monaten
   * genauso wie morgen. Eine Notiz mit Wichtigkeit 2 fällt bei der Suche unten
   * durch, und dann fragt der Coach dieselbe Frage nochmal.
   */
  const ESS_MUSTER = {
    stress: "isst mehr, wenn der Druck steigt",
    langeweile: "isst aus Langeweile, ohne Hunger",
    abends: "hält tagsüber gut durch, abends kippt es",
    nachts: "steht nachts auf und isst",
    belohnung: "isst als Belohnung nach harten Tagen",
    sozial: "isst in Gesellschaft deutlich mehr",
    anfaelle: "kennt Essanfälle, bei denen es nicht mehr aufhört",
    vergessen: "vergisst zu essen und merkt es erst abends",
  };
  const muster = (antworten.essMuster || []).filter((m) => m !== "nichts").map((m) => ESS_MUSTER[m]).filter(Boolean);
  if (muster.length) add(`Essverhalten: ${muster.join(", ")}.`, "muster", 5, ["ernährung", "verhalten"]);

  if ((antworten.heisshungerWann || "").trim()) {
    add(`Heißhunger kommt: ${antworten.heisshungerWann.trim()}`, "muster", 5, ["ernährung", "heißhunger"]);
  }
  if ((antworten.triggerLebensmittel || "").trim()) {
    add(`Kann bei diesen Lebensmitteln schlecht aufhören: ${antworten.triggerLebensmittel.trim()}`,
      "muster", 5, ["ernährung", "heißhunger"]);
  }
  if (antworten.essTempo === "schnell") {
    add("Isst meist schnell und nebenbei, zwischen Terminen.", "muster", 4, ["ernährung", "verhalten"]);
  }

  if ((antworten.versuche || "").trim()) {
    add(`Hat schon versucht: ${antworten.versuche.trim()}`, "fakt", 5, ["vorgeschichte"]);
  }
  if ((antworten.warumGescheitert || "").trim()) {
    // Der wichtigste Satz im ganzen Bogen. Was jemanden bisher jedes Mal
    // gestoppt hat, stoppt ihn mit hoher Wahrscheinlichkeit wieder.
    add(`Gescheitert ist es bisher daran: ${antworten.warumGescheitert.trim()}`, "muster", 5,
      ["vorgeschichte", "hindernis"]);
  }
  if (antworten.gewichtsVerlauf === "jojo") {
    add("Gewicht ging in den letzten Jahren immer wieder rauf und runter.", "fakt", 4, ["gewicht", "vorgeschichte"]);
  }
  if ((antworten.warumJetzt || "").trim()) {
    add(`Geht es gerade jetzt an, weil: ${antworten.warumJetzt.trim()}`, "ziel", 5, ["motivation"]);
  }

  const KOCHEN = {
    selbst: "kocht selbst", geteilt: "kocht mal selbst, mal jemand anders",
    andere: "jemand anders kocht", kaum: "bei ihm wird kaum gekocht, meist unterwegs oder fertig",
  };
  if (antworten.kochen) add(`Zu Hause: ${KOCHEN[antworten.kochen]}.`, "fakt", 4, ["ernährung", "umfeld"]);
  if (antworten.auswaerts === "taeglich") {
    add("Isst fast täglich auswärts oder unterwegs.", "fakt", 5, ["ernährung", "umfeld"]);
  } else if (antworten.auswaerts === "oft") {
    add("Isst drei bis fünf Mal die Woche auswärts oder unterwegs.", "fakt", 4, ["ernährung", "umfeld"]);
  }
  const UMFELD = {
    rueckhalt: "hat Rückhalt im Umfeld",
    gleichgueltig: "im Umfeld interessiert es niemanden",
    gegenwind: "bekommt Gegenwind aus dem Umfeld, Kommentare und Druck",
    allein: "macht das allein",
    vorbild: "andere schauen auf ihn, er will kein schlechtes Beispiel sein",
  };
  for (const u of antworten.unterstuetzung || []) {
    if (UMFELD[u]) add(`Umfeld: ${UMFELD[u]}.`, "fakt", u === "gegenwind" ? 5 : 4, ["umfeld"]);
  }
  if ((antworten.umfeldFrei || "").trim()) {
    add(`Zum Umfeld: ${antworten.umfeldFrei.trim()}`, "fakt", 4, ["umfeld"]);
  }

  if ((antworten.warumWichtig || "").trim()) {
    add(`Das Ziel ist wichtig, weil: ${antworten.warumWichtig.trim()}`, "ziel", 5, ["motivation"]);
  }
  if ((antworten.wennNichts || "").trim()) {
    add(`Fürchtet, wenn sich nichts ändert: ${antworten.wennNichts.trim()}`, "ziel", 5, ["motivation"]);
  }
  const STOPPER = {
    stress: "Stressphasen", schlaf: "zu wenig Schlaf", reisen: "unterwegs sein",
    verletzung: "Verletzung oder Krankheit", motivation: "wenn die Lust weg ist",
    ergebnisse: "wenn keine Fortschritte sichtbar sind", sozial: "Feiern und Einladungen",
    alleinsein: "wenn er allein ist",
  };
  const stopper = (antworten.stopper || []).map((x) => STOPPER[x]).filter(Boolean);
  if (stopper.length) {
    add(`Bringt ihn am ehesten aus dem Takt: ${stopper.join(", ")}.`, "muster", 5, ["hindernis"]);
  }
  if (antworten.tonfall) {
    const TON = {
      direkt: "will klare Ansagen, auch wenn sie unbequem sind",
      sachlich: "will Zahlen und den nächsten Schritt, ohne Bewertung",
      sanft: "macht sich selbst genug Druck, will behutsame Ansprache",
    };
    add(`Ansprache: ${TON[antworten.tonfall]}.`, "praeferenz", 5, ["ton", "kommunikation"]);
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
