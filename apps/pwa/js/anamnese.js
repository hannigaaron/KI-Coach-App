import { BODY_FAT_LEVELS, figurBild, skala } from "./silhouette.js";

/**
 * Der Anamnesebogen beim ersten Start.
 *
 * Eine Frage pro Bildschirm. Das ist auf dem Handy angenehmer als ein langes
 * Formular und erlaubt es, jede Antwort sofort zu prüfen. Die Fragen sind so
 * gestellt, dass jede Antwort später wirklich benutzt wird: entweder in der
 * Rechnung, im Erinnerungsplan oder im Gedächtnis des Assistenten. Fragen ohne
 * Verwendung gehören nicht in einen Fragebogen.
 */

export const BEREICHE = [
  { id: "ernaehrung", symbol: "apfel", titel: "Ernährung", text: "Was ich esse, Kalorien, Makros" },
  { id: "kraft", symbol: "hantel", titel: "Krafttraining", text: "Struktur, Fortschritt, dranbleiben" },
  { id: "ausdauer", symbol: "laufen", titel: "Ausdauer", text: "Kondition, Schritte, Bewegung im Alltag" },
  { id: "schlaf", symbol: "mond", titel: "Schlaf", text: "Früher ins Bett, besser durchschlafen" },
  { id: "stress", symbol: "welle", titel: "Stress und Kopf", text: "Runterkommen, Grübeln, Druck rausnehmen" },
  { id: "trinken", symbol: "tropfen", titel: "Trinken", text: "Genug Wasser über den Tag" },
  { id: "routine", symbol: "sonne", titel: "Routinen", text: "Morgens und abends verlässliche Abläufe" },
  { id: "gewicht", symbol: "waage", titel: "Gewicht", text: "Auf- oder abnehmen, ohne Jojo" },
];

/**
 * Die 14 Hauptallergene nach Verordnung (EU) Nr. 1169/2011, Anhang II. Mit
 * Kennzeichnungspflicht, deshalb verlässlich auf jeder Packung zu finden.
 */
export const ALLERGENE_EU = [
  "Gluten", "Krebstiere", "Eier", "Fisch", "Erdnüsse", "Soja", "Milch",
  "Schalenfrüchte", "Sellerie", "Senf", "Sesam", "Sulfite", "Lupinen", "Weichtiere",
];

const UNVERTRAEGLICHKEITEN = ["Laktose", "Histamin", "Fruktose", "Sorbit"];

const AUSSCHLUESSE = [
  "Kein Schweinefleisch", "Kein Rindfleisch", "Kein Alkohol", "Keine Gelatine",
  "Keine Meeresfrüchte", "Keine Innereien",
];

const GERAETE = [
  "Herd", "Backofen", "Mikrowelle", "Airfryer", "Mixer", "Thermomix", "Grill",
  "Toaster", "Reiskocher", "Sandwichmaker",
];

/**
 * Was oft im Kühlschrank liegt. Die Auswahl landet im Vorrat der App und ist
 * damit sofort die Grundlage für "was kann ich daraus machen".
 */
const VORRAT = [
  "Magerquark", "Skyr", "Griechischer Joghurt", "Whey", "Eier", "Haferflocken",
  "Reis", "Nudeln", "Kartoffeln", "Hähnchenbrust", "Thunfisch", "Tiefkühlgemüse",
  "Banane", "Apfel", "Beeren", "Vollkornbrot", "Reiswaffeln", "Erdnussbutter",
  "Käse", "Olivenöl",
];

/**
 * Alle Seiten. `id` ist der Schlüssel in den Antworten.
 *
 * Eine Frage pro Seite. Eine Seite mit vier Feldern liest man quer, eine mit
 * einer Frage beantwortet man. `abschnitt` steht über dem Fortschrittsbalken
 * und sagt, wo im Bogen man gerade ist. `tipp` ist der Kasten unten: ein Satz,
 * der sagt, wozu die Antwort gebraucht wird. Wer weiss, wofür, antwortet
 * ehrlicher.
 *
 * Eine Seite, deren einziges Feld eine Auswahl ist, geht nach dem Antippen von
 * selbst weiter. Ein Weiter Knopf unter einer einzigen Auswahl ist ein
 * zweiter Tipp für dieselbe Entscheidung.
 */
export const SCHRITTE = [
  {
    id: "start",
    abschnitt: "Willkommen",
    titel: "Hallo, ich bin daevo",
    text: "Damit ich dir wirklich helfen kann, brauche ich ein Bild von dir. Jede Frage hat ihre eigene Seite, die meisten sind mit einem Tipp erledigt.",
    felder: [{ art: "text", id: "name", label: "Wie heißt du", platzhalter: "Dein Vorname" }],
    tipp: { symbol: "schild", text: "Schon mal dabei gewesen? Ganz unten spielst du deine Sicherung ein." },
  },
  {
    id: "geschlecht",
    abschnitt: "Über dich",
    titel: "Was ist dein Geschlecht?",
    text: "Damit dein Tagesziel zu deinem Körper passt und nicht zu einem Durchschnitt.",
    felder: [{ art: "auswahl", id: "sex", optionen: [
      { id: "male", titel: "Männlich", symbol: "maennlich" },
      { id: "female", titel: "Weiblich", symbol: "weiblich" },
    ] }],
    tipp: { symbol: "idee", text: "Die Formel für den Grundumsatz rechnet bei Männern und Frauen verschieden. Mehr als diese zwei Werte kennt sie nicht." },
  },
  {
    id: "koerper",
    abschnitt: "Über dich",
    titel: "Wie groß bist du, und wie viel wiegst du?",
    text: "Daraus rechne ich, wie viel dein Körper am Tag braucht.",
    felder: [
      { art: "zahl", id: "heightCm", label: "Größe", einheit: "cm", platzhalter: "z. B. 178", min: 120, max: 230 },
      { art: "zahl", id: "weightKg", label: "Gewicht", einheit: "kg", platzhalter: "z. B. 80", min: 35, max: 300, schritt: 0.1 },
      { art: "zahl", id: "ageYears", label: "Alter", einheit: "Jahre", platzhalter: "z. B. 28", min: 14, max: 100 },
    ],
    tipp: { symbol: "flamme", text: "Das ist nur der Startpunkt. Später reicht ein Satz im Chat, um dein Gewicht nachzutragen." },
  },
  {
    id: "koerperfett",
    abschnitt: "Über dich",
    titel: "Schätz deinen Körperfettanteil",
    text: "Such die Figur, die dir am nächsten kommt. Eine Schätzung nach Augenmaß liegt gut fünf Prozentpunkte daneben, das reicht. Bist du schlanker als die erste Figur oder kennst du deinen Wert aus einer Messung, trag ihn unten ein.",
    felder: [
      { art: "silhouette", id: "koerperfett" },
      { art: "zahl", id: "koerperfettWert", label: "Oder dein Wert, falls du ihn kennst", einheit: "%", min: 3, max: 60, schritt: 0.5 },
    ],
    ueberspringbar: true,
    tipp: { symbol: "idee", text: "Mit diesem Wert rechne ich Protein auf deine fettfreie Masse statt auf dein ganzes Gewicht." },
  },
  {
    id: "bereiche",
    abschnitt: "Dein Ziel",
    titel: "Wobei soll ich dich unterstützen?",
    text: "Wähle bis zu drei Bereiche. Danach richte ich meine Erinnerungen aus.",
    felder: [{ art: "mehrfach", id: "bereiche", optionen: BEREICHE, max: 3 }],
  },
  {
    id: "ziel",
    abschnitt: "Dein Ziel",
    titel: "Was willst du erreichen?",
    text: "Das entscheidet, ob ich dich über oder unter deinen Bedarf steuere.",
    felder: [{ art: "auswahl", id: "goal", optionen: [
      { id: "fat_loss", titel: "Fett verlieren", text: "Etwa 18 Prozent unter deinem Bedarf", symbol: "flamme" },
      { id: "maintain", titel: "Gewicht halten", text: "Auf deinem Bedarf", symbol: "waage" },
      { id: "lean_bulk", titel: "Muskeln aufbauen", text: "Etwa 10 Prozent über deinem Bedarf", symbol: "hantel" },
    ] }],
    tipp: { symbol: "regler", text: "Dein Ziel kannst du jederzeit im Profil ändern. Ich rechne dann neu." },
  },
  {
    id: "arbeit",
    abschnitt: "Dein Alltag",
    titel: "Wie sieht dein Arbeitstag aus?",
    text: "Schritte allein sagen nicht alles. Stehen, Tragen und Treppen zählen auch.",
    felder: [{ art: "auswahl", id: "occupation", optionen: [
      { id: "sitzend", titel: "Fast nur im Sitzen", text: "Büro, Homeoffice, Auto", symbol: "stuhl" },
      { id: "gemischt", titel: "Gemischt", text: "Mal sitzend, mal auf den Beinen", symbol: "gehen" },
      { id: "stehend", titel: "Überwiegend auf den Beinen", text: "Verkauf, Pflege, Training", symbol: "stehen" },
      { id: "koerperlich", titel: "Körperlich am Arbeiten", text: "Bau, Lager, Handwerk", symbol: "kiste" },
    ] }],
  },
  {
    id: "freizeit",
    abschnitt: "Dein Alltag",
    titel: "Und in deiner Freizeit?",
    text: "Sport kommt gleich. Hier geht es um den Rest.",
    felder: [{ art: "auswahl", id: "leisure", optionen: [
      { id: "ruhig", titel: "Eher ruhig", text: "Sofa, Lesen, Serien", symbol: "sofa" },
      { id: "gemischt", titel: "Gemischt", text: "Mal draußen, mal zu Hause", symbol: "gehen" },
      { id: "aktiv", titel: "Viel unterwegs", text: "Spazieren, Rad, Ausflüge", symbol: "laufen" },
    ] }],
  },
  {
    id: "schritte",
    abschnitt: "Dein Alltag",
    titel: "Wie viele Schritte machst du am Tag?",
    text: "Ein Schnitt reicht. Genau muss es nicht sein.",
    felder: [{ art: "zahl", id: "dailySteps", label: "Schritte pro Tag", einheit: "Schritte", platzhalter: "z. B. 8000", min: 0, max: 40000, schritt: 500 }],
    tipp: { symbol: "idee", text: "Die Health App zeigt deinen Schnitt unter Schritte, Ansicht Monat." },
  },
  {
    id: "erfahrung",
    abschnitt: "Dein Training",
    titel: "Wie lange machst du schon Krafttraining?",
    text: "Danach richtet sich, wie fordernd dein Plan wird.",
    felder: [{ art: "auswahl", id: "kraftErfahrung", optionen: [
      { id: "keine", titel: "Noch gar nicht", symbol: "keim" },
      { id: "unter1", titel: "Unter einem Jahr", symbol: "hantel" },
      { id: "1bis3", titel: "Ein bis drei Jahre", symbol: "hantel" },
      { id: "ueber3", titel: "Über drei Jahre", symbol: "hantel" },
    ] }],
  },
  {
    id: "einheiten",
    abschnitt: "Dein Training",
    titel: "Wie oft trainierst du pro Woche?",
    text: "Alles zählt: Kraft, Ausdauer, Mannschaftssport.",
    felder: [{ art: "zahl", id: "sportProWoche", label: "Einheiten pro Woche", einheit: "pro Woche", platzhalter: "z. B. 3", min: 0, max: 14 }],
    tipp: { symbol: "kalender", text: "Ich lege die Einheiten als Vorschlag in deine Woche. Die Tage verschiebst du später im Profil." },
  },
  {
    id: "budget",
    abschnitt: "Dein Plan",
    titel: "Das ist dein Tagesziel",
    text: "Aus deinen Angaben gerechnet, nicht aus einer Tabelle.",
    felder: [{ art: "budget", id: "zielKorrektur" }],
    knopf: "Klingt gut",
    tipp: { symbol: "regler", text: "Dein Ziel ist kein Gesetz. Sobald genug Wiegungen da sind, misst daevo deinen echten Verbrauch und rechnet nach." },
  },
  {
    id: "ernaehrungsform",
    abschnitt: "Dein Geschmack",
    titel: "Wie ernährst du dich?",
    text: "Vorschläge und Rezepte halten sich daran.",
    felder: [{ art: "auswahl", id: "ernaehrungsform", optionen: [
      { id: "omnivor", titel: "Ich esse alles", symbol: "keule" },
      { id: "flexitarisch", titel: "Flexitarisch", text: "Meist pflanzlich, ab und zu Fleisch", symbol: "apfel" },
      { id: "vegetarisch", titel: "Vegetarisch", text: "Kein Fleisch und kein Fisch", symbol: "blatt" },
      { id: "pescetarisch", titel: "Pescetarisch", text: "Fisch, aber kein Fleisch", symbol: "fisch" },
      { id: "vegan", titel: "Vegan", text: "Rein pflanzlich", symbol: "keim" },
    ] }],
    tipp: { symbol: "regler", text: "Das lässt sich jederzeit im Chat ändern, ein Satz reicht." },
  },
  {
    id: "allergien",
    abschnitt: "Dein Geschmack",
    titel: "Allergien oder Unverträglichkeiten?",
    text: "Was davon betroffen ist, schlage ich dir nicht vor.",
    felder: [
      { art: "chips", id: "allergien", label: "Allergene mit Kennzeichnungspflicht in der EU", optionen: ALLERGENE_EU },
      { art: "chips", id: "unvertraeglichkeiten", label: "Unverträglichkeiten", optionen: UNVERTRAEGLICHKEITEN },
      { art: "text", id: "allergienFrei", label: "Noch etwas, das du nicht verträgst", platzhalter: "Rohe Zwiebeln, Paprika", optional: true },
    ],
    knopfLeer: "Hab ich nicht, weiter",
  },
  {
    id: "ausschluesse",
    abschnitt: "Dein Geschmack",
    titel: "Gibt es etwas, das du grundsätzlich nicht isst?",
    text: "Freiwillig. Was du ausschließt, schlage ich dir nicht vor.",
    felder: [
      { art: "chips", id: "ausschluesse", optionen: AUSSCHLUESSE },
      { art: "text", id: "ausschluesseFrei", label: "Sonst noch etwas", platzhalter: "Pilze, Koriander", optional: true },
    ],
    knopfLeer: "Nichts davon, weiter",
  },
  {
    id: "geschmack",
    abschnitt: "Dein Geschmack",
    titel: "Was schmeckt dir?",
    text: "Damit Vorschläge treffen und nicht nur in die Zahlen passen.",
    felder: [
      { art: "chipwahl", id: "fruehstueck", label: "Frühstück", optionen: ["Süß", "Herzhaft", "Beides", "Ich frühstücke nicht"] },
      { art: "chipwahl", id: "mittag", label: "Mittagessen", optionen: ["Leicht", "Herzhaft", "Gemischt"] },
      { art: "chipwahl", id: "abend", label: "Abendessen", optionen: ["Leicht", "Herzhaft", "Deftig", "Gemischt"] },
      { art: "chipwahl", id: "schaerfe", label: "Schärfe", optionen: ["Mild", "Mittel", "Scharf"] },
    ],
    ueberspringbar: true,
  },
  {
    id: "kueche",
    abschnitt: "Dein Geschmack",
    titel: "Was hast du in der Küche?",
    text: "Ein Rezept für den Backofen hilft niemandem, der keinen hat.",
    felder: [
      { art: "chips", id: "geraete", label: "Küchengeräte", optionen: GERAETE },
      { art: "chips", id: "vorrat", label: "Was hast du normalerweise zu Hause", optionen: VORRAT },
    ],
    ueberspringbar: true,
    tipp: { symbol: "idee", text: "Die Lebensmittel landen in deinem Vorrat. Daraus schlage ich dir Mahlzeiten vor, die du ohne Einkauf machen kannst." },
  },
  {
    id: "gesundheit",
    abschnitt: "Deine Gesundheit",
    titel: "Gibt es etwas zu beachten?",
    text: "Krankheiten, Verletzungen, Medikamente. Alles hier fließt in jeden Vorschlag ein.",
    felder: [
      { art: "textarea", id: "krankheiten", label: "Was ich wissen sollte", platzhalter: "Bandscheibenvorfall 2024, seitdem kein schweres Kreuzheben" },
    ],
    ueberspringbar: true,
    tipp: { symbol: "schild", text: "Ich bin kein Arzt und stelle keine Diagnosen. Ich passe nur meine Vorschläge an." },
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
    abschnitt: "Was dich ausmacht",
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
    abschnitt: "Was dich ausmacht",
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
    abschnitt: "Was dich ausmacht",
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
    abschnitt: "Was dich ausmacht",
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
    abschnitt: "Dein Rhythmus",
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
    zielKorrektur: korrekturLesen(antworten.zielKorrektur),
    ernaehrung: {
      form: antworten.ernaehrungsform || undefined,
      allergien: [...(antworten.allergien || [])],
      unvertraeglichkeiten: [...(antworten.unvertraeglichkeiten || [])],
      ausschluesse: [...(antworten.ausschluesse || [])],
    },
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

  // Eine Notiz für alle Allergene statt einer je Allergen. "Verträgt kein
  // Krebstiere" war kein Deutsch, und vierzehn einzelne Notizen verdrängen
  // bei der Suche alles andere.
  if ((antworten.allergien || []).length) {
    add(`Allergie, nie vorschlagen: ${antworten.allergien.join(", ")}.`, "fakt", 5, ["ernährung", "allergie"]);
  }
  if ((antworten.unvertraeglichkeiten || []).length) {
    add(`Unverträglichkeit, meiden: ${antworten.unvertraeglichkeiten.join(", ")}.`, "fakt", 5, ["ernährung", "unverträglichkeit"]);
  }
  if ((antworten.allergienFrei || "").trim()) {
    add(`Verträgt nicht: ${antworten.allergienFrei.trim()}.`, "fakt", 5, ["ernährung", "unverträglichkeit"]);
  }
  const FORM = {
    omnivor: "isst alles", flexitarisch: "isst meist pflanzlich, ab und zu Fleisch",
    vegetarisch: "isst vegetarisch, kein Fleisch und kein Fisch",
    pescetarisch: "isst pescetarisch, Fisch ja, Fleisch nein", vegan: "isst vegan",
  };
  if (FORM[antworten.ernaehrungsform]) {
    add(`Ernährungsform: ${FORM[antworten.ernaehrungsform]}.`, "praeferenz", 5, ["ernährung"]);
  }
  const ausschluss = [...(antworten.ausschluesse || [])];
  if ((antworten.ausschluesseFrei || "").trim()) ausschluss.push(antworten.ausschluesseFrei.trim());
  if (ausschluss.length) add(`Isst grundsätzlich nicht: ${ausschluss.join(", ")}.`, "praeferenz", 5, ["ernährung"]);

  const geschmack = [
    ["Frühstück", antworten.fruehstueck], ["Mittag", antworten.mittag],
    ["Abend", antworten.abend], ["Schärfe", antworten.schaerfe],
  ].filter(([, w]) => w).map(([k, w]) => `${k} ${w.toLowerCase()}`);
  if (geschmack.length) add(`Geschmack: ${geschmack.join(", ")}.`, "praeferenz", 4, ["ernährung", "geschmack"]);
  if ((antworten.geraete || []).length) {
    add(`Küchengeräte: ${antworten.geraete.join(", ")}.`, "fakt", 3, ["ernährung", "küche"]);
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

  return { profile, notizen, kraft, sessions, bereiche, vorrat: [...(antworten.vorrat || [])] };
}

/** Nur Zahlen, alles andere fällt weg. Ohne jede Abweichung gibt es keine Korrektur. */
function korrekturLesen(k) {
  if (!k || typeof k !== "object") return null;
  const raus = {};
  for (const feld of ["kcal", "proteinG", "fatG"]) {
    const z = Number(k[feld]);
    if (Number.isFinite(z) && z !== 0) raus[feld] = Math.round(z);
  }
  return Object.keys(raus).length ? raus : null;
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
