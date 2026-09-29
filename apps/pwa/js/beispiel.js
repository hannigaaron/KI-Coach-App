/**
 * Die Beispieldaten für die Fassung für Nutzer.
 *
 * Eine leere App zeigt nichts. Wer daevo zum ersten Mal öffnet, sieht sonst
 * einen Ring auf null, vier leere Balken und einen Verlauf ohne Zeilen, und
 * genau die Ansichten, die das Produkt ausmachen, sagen gar nichts: das
 * Balance Board braucht gebuchte Zeit, die Musteranalyse braucht zehn
 * gemeinsame Tage, der Gewichtstrend vier Wiegungen über zwei Wochen.
 *
 * Deshalb startet die Demo mit vierzehn Tagen einer erfundenen Person.
 *
 * Erfunden, und das ist keine Feinheit. Im Gedächtnis des Betreibers stehen
 * Notizen über Therapie, Familie und Diagnosen. Eine Demo ist eine
 * öffentliche Adresse: wer den Link hat, liest alles. Echte Daten haben hier
 * nichts zu suchen, auch nicht die eigenen.
 *
 * Die Zahlen sind ausgedacht, aber nicht zufällig. Sie zeigen einen Verlauf,
 * der sich lohnt anzusehen: das Gewicht fällt langsam und mit Rauschen, nicht
 * auf einer Geraden. Manche Tage sind gut getroffen, manche nicht. Ein Tag
 * ohne Eintrag ist dabei, denn so sieht Tracken wirklich aus, und eine Demo,
 * in der jeder Tag perfekt ist, verspricht etwas, das die App nicht halten
 * kann.
 */

/**
 * Ein Zufallsgenerator mit Startwert.
 *
 * Damit sieht die Demo bei jedem Aufbau gleich aus. Echter Zufall hiesse:
 * jeder Besucher sieht andere Zahlen, ein Screenshot von gestern passt nicht
 * mehr zu dem von heute, und ein Test kann nichts prüfen.
 * Verfahren: Mulberry32, ein kurzer Generator mit brauchbarer Verteilung.
 */
function wuerfel(startwert) {
  let a = startwert >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Ein Tag als JJJJ-MM-TT, so viele Tage vor heute. */
function tagVor(abstand, heute = new Date()) {
  const d = new Date(heute);
  d.setDate(d.getDate() - abstand);
  return d.toISOString().slice(0, 10);
}

function iso(tag, zeit) {
  return `${tag}T${zeit}:00.000Z`;
}

/** Die Person, die diese Demo zeigt. */
export const DEMO_PROFIL = {
  name: "Jonas",
  sex: "male",
  ageYears: 29,
  heightCm: 181,
  weightKg: 83.4,
  goal: "fat_loss",
  dailySteps: 7500,
  bodyFatPct: 21,
  experience: "fortgeschritten",
  wakeTime: "06:30",
  sleepTime: "22:45",
  randModus: "standard",
  sessions: [
    { weekday: 1, startsAt: "18:00", type: "strength", minutes: 75 },
    { weekday: 3, startsAt: "18:00", type: "strength", minutes: 75 },
    { weekday: 6, startsAt: "10:00", type: "strength", minutes: 90 },
  ],
};

/** Woraus sich die Tage zusammensetzen. Werte je Portion, nicht je 100 g. */
const BAUSTEINE = {
  fruehstueck: [
    [{ name: "Magerquark", quantity: "250 g", kcal: 168, proteinG: 30, fatG: 0.8, carbsG: 10 },
      { name: "Haferflocken", quantity: "60 g", kcal: 227, proteinG: 8, fatG: 4.2, carbsG: 36 },
      { name: "Blaubeeren", quantity: "100 g", kcal: 42, proteinG: 0.7, fatG: 0.3, carbsG: 7 }],
    [{ name: "Rührei aus 3 Eiern", quantity: "165 g", kcal: 234, proteinG: 20, fatG: 16, carbsG: 1 },
      { name: "Vollkornbrot", quantity: "80 g", kcal: 190, proteinG: 7, fatG: 1.6, carbsG: 34 }],
    [{ name: "Skyr", quantity: "300 g", kcal: 189, proteinG: 33, fatG: 0.6, carbsG: 12 },
      { name: "Banane", quantity: "120 g", kcal: 107, proteinG: 1.3, fatG: 0.4, carbsG: 25 }],
  ],
  mittag: [
    [{ name: "Hähnchenbrust", quantity: "200 g", kcal: 220, proteinG: 46, fatG: 2.4, carbsG: 0 },
      { name: "Reis, gekocht", quantity: "250 g", kcal: 325, proteinG: 6.5, fatG: 0.8, carbsG: 70 },
      { name: "Brokkoli", quantity: "200 g", kcal: 68, proteinG: 5.6, fatG: 0.8, carbsG: 7 }],
    [{ name: "Lachsfilet", quantity: "180 g", kcal: 367, proteinG: 36, fatG: 24, carbsG: 0 },
      { name: "Kartoffeln", quantity: "300 g", kcal: 231, proteinG: 6, fatG: 0.3, carbsG: 51 }],
    [{ name: "Rinderhack 5 Prozent", quantity: "200 g", kcal: 274, proteinG: 42, fatG: 10, carbsG: 0 },
      { name: "Vollkornnudeln", quantity: "90 g roh", kcal: 320, proteinG: 12, fatG: 2.5, carbsG: 60 },
      { name: "Tomatensauce", quantity: "150 g", kcal: 60, proteinG: 2, fatG: 1.5, carbsG: 9 }],
  ],
  abend: [
    [{ name: "Putenbrust", quantity: "180 g", kcal: 194, proteinG: 43, fatG: 1.8, carbsG: 0 },
      { name: "Süsskartoffel", quantity: "250 g", kcal: 215, proteinG: 4, fatG: 0.3, carbsG: 48 },
      { name: "Feldsalat mit Öl", quantity: "120 g", kcal: 118, proteinG: 2, fatG: 11, carbsG: 1.5 }],
    [{ name: "Tofu, gebraten", quantity: "200 g", kcal: 290, proteinG: 30, fatG: 17, carbsG: 4 },
      { name: "Basmatireis, gekocht", quantity: "200 g", kcal: 260, proteinG: 5, fatG: 0.6, carbsG: 57 }],
    [{ name: "Omelett aus 4 Eiern", quantity: "220 g", kcal: 312, proteinG: 27, fatG: 21, carbsG: 1.5 },
      { name: "Vollkornbrot", quantity: "80 g", kcal: 190, proteinG: 7, fatG: 1.6, carbsG: 34 }],
  ],
  snack: [
    [{ name: "Whey Shake", quantity: "30 g", kcal: 113, proteinG: 24, fatG: 1.5, carbsG: 1.8 }],
    [{ name: "Handvoll Mandeln", quantity: "30 g", kcal: 174, proteinG: 6.4, fatG: 15, carbsG: 1.3 }],
    [{ name: "Proteinriegel", quantity: "60 g", kcal: 214, proteinG: 20, fatG: 7.2, carbsG: 18 }],
    [{ name: "Apfel", quantity: "180 g", kcal: 94, proteinG: 0.5, fatG: 0.4, carbsG: 21 }],
  ],
};

const MAHLZEITEN = [
  ["fruehstueck", "07:15", "fruehstueck"],
  ["mittag", "12:30", "mittag"],
  ["snack", "16:00", "snack"],
  ["abend", "19:30", "abendessen"],
];

/**
 * Baut die vierzehn Tage.
 *
 * Der Tag mit Abstand 4 bleibt bis auf Wasser leer. Ein lückenloser Verlauf
 * ist keine ehrliche Demo: niemand trackt vierzehn Tage am Stück, und die App
 * kommt mit Lücken zurecht. Das zu zeigen ist mehr wert als eine glatte Reihe.
 */
function tageBauen(heute) {
  const rnd = wuerfel(20260924);
  const days = {};

  for (let abstand = 13; abstand >= 0; abstand--) {
    const tag = tagVor(abstand, heute);
    const wochentag = new Date(`${tag}T12:00:00`).getDay();
    const luecke = abstand === 4;

    const meals = [];
    if (!luecke) {
      for (const [art, zeit, kennung] of MAHLZEITEN) {
        // Der Snack fällt an manchen Tagen aus. Ein Tag, an dem alles nach
        // Plan lief, ist die Ausnahme und nicht die Regel.
        if (art === "snack" && abstand > 0 && rnd() < 0.3) continue;
        const auswahl = BAUSTEINE[art];
        const posten = auswahl[Math.floor(rnd() * auswahl.length)];
        meals.push({
          id: `d${abstand}-${kennung}`,
          text: posten.map((p) => `${p.quantity} ${p.name}`).join(", "),
          at: zeit,
          art: kennung,
          source: rnd() < 0.25 ? "foto" : "text",
          entries: posten.map((p) => ({ ...p })),
          feeling: null,
        });
      }
    }

    // Das Gewicht fällt über vierzehn Tage um gut ein Kilo, mit Rauschen von
    // plus minus 400 Gramm. Eine glatte Gerade gibt es auf keiner Waage, und
    // der Trend im Rechenkern ist genau dafür gebaut.
    const basis = 84.6 - (13 - abstand) * 0.09;
    const gewogen = abstand % 2 === 0 || abstand === 13;
    const weightKg = gewogen ? Math.round((basis + (rnd() - 0.5) * 0.8) * 10) / 10 : null;

    const trainingHeute = DEMO_PROFIL.sessions.find((s) => s.weekday === wochentag);
    const trainings = trainingHeute && !luecke && rnd() < 0.85
      ? [{ id: `t${abstand}`, type: trainingHeute.type, minutes: trainingHeute.minutes, at: trainingHeute.startsAt, note: "" }]
      : [];

    const checkins = [];
    // Der Morgen Check-in. Ohne ihn bleibt die Bereitschaft leer, und genau
    // die Ansicht, die zeigt was die App kann, zeigt dann nichts.
    if (!luecke && rnd() < 0.8) {
      checkins.push({
        kind: "morning",
        at: "07:20",
        note: "",
        energy: 5 + Math.floor(rnd() * 5),
        sleepQuality: 5 + Math.floor(rnd() * 5),
        mood: 5 + Math.floor(rnd() * 5),
      });
    }
    if (!luecke && rnd() < 0.7) {
      checkins.push({
        id: `c${abstand}`,
        at: "14:00",
        art: "mittag",
        energie: 5 + Math.floor(rnd() * 5),
        konzentration: 5 + Math.floor(rnd() * 5),
        saettigung: 4 + Math.floor(rnd() * 6),
        notiz: "",
      });
    }

    // Die Mindeststandards werden je Tag bestätigt. Ohne das steht die Kachel
    // auf null, obwohl drei Standards vereinbart sind, und die Zahl misst
    // dann Datenlage statt Verhalten.
    // Heute läuft es gut. Eine Demo öffnet in einem Zustand, der zeigt, was
    // die App kann, nicht in einem zufälligen. Die dreizehn Tage davor bleiben
    // gemischt, sonst verspricht der Verlauf etwas, das keiner hält.
    const schritte = abstand === 0 ? 9400 : 6000 + Math.floor(rnd() * 5000);
    const standards = luecke ? {} : {
      s1: schritte >= 8000,
      s2: meals.reduce((sum, m) => sum + m.entries.reduce((t, e) => t + e.proteinG, 0), 0) >= 150,
      s3: abstand === 0 ? true : rnd() < 0.7,
    };

    days[tag] = {
      meals,
      waterMl: 500 * (3 + Math.floor(rnd() * 4)),
      checkins,
      steps: schritte,
      standards,
      weightKg,
      trainings,
      verbrauch: null,
    };
  }
  return days;
}

/** Gebuchte Zeit für das Balance Board. Ohne sie behauptet es, er arbeite nur. */
function zeitenBauen(heute) {
  const rnd = wuerfel(771);
  const eintraege = [];
  const muster = [
    ["karriere", 480, "Büro"],
    ["fitness", 75, "Krafttraining"],
    ["beziehung", 90, "Abend mit Lena"],
    ["me_time", 45, "Gelesen"],
    ["wellbeing", 30, "Spaziergang"],
  ];
  for (let abstand = 13; abstand >= 0; abstand--) {
    const tag = tagVor(abstand, heute);
    for (const [bereich, minuten, was] of muster) {
      // Heute bekommt jeder Bereich etwas. Sonst stehen auf der ersten
      // Ansicht, die jemand öffnet, zwei Kacheln auf null, und eine Demo, die
      // leere Kacheln zeigt, wirbt gegen sich selbst. An allen anderen Tagen
      // dürfen Lücken bleiben, denn so sieht ein echter Verlauf aus.
      if (abstand > 0 && rnd() < 0.35) continue;
      eintraege.push({
        tag, bereich, was,
        minuten: Math.round(minuten * (0.8 + rnd() * 0.4)),
        at: iso(tag, "20:00"),
      });
    }
  }
  return eintraege;
}

function aufgabenBauen(heute) {
  const jetzt = (abstand) => iso(tagVor(abstand, heute), "09:00");
  return [
    { id: "a1", text: "Trainingsplan für den nächsten Block schreiben", minuten: 45, wichtigkeit: 3, faellig: tagVor(-2, heute), erledigt: false, erstellt: jetzt(2), quelle: "coach" },
    { id: "a2", text: "Wocheneinkauf erledigen", minuten: 60, wichtigkeit: 2, faellig: tagVor(-1, heute), erledigt: false, erstellt: jetzt(1), quelle: "nutzer" },
    { id: "a3", text: "Termin beim Physio machen", minuten: 10, wichtigkeit: 2, faellig: null, erledigt: false, erstellt: jetzt(3), quelle: "nutzer" },
    { id: "a4", text: "Meal Prep für Montag und Dienstag", minuten: 90, wichtigkeit: 2, faellig: null, erledigt: true, erstellt: jetzt(5), quelle: "coach" },
    { id: "a5", text: "Waage kalibrieren", minuten: 5, wichtigkeit: 1, faellig: null, erledigt: true, erstellt: jetzt(7), quelle: "nutzer" },
  ];
}

/**
 * Was der Coach über diese Person weiss.
 *
 * Ein Muster und ein paar Fakten. Das Muster ist der Teil, der daevo von
 * einem Rechner unterscheidet, deshalb steht es mit Wichtigkeit 5 drin: es
 * beschreibt, woran es bisher gescheitert ist.
 */
function gedaechtnisBauen(heute) {
  const at = (abstand) => iso(tagVor(abstand, heute), "19:00");
  return [
    { id: "m1", at: at(12), kind: "muster", weight: 5, source: "nutzer",
      text: "Sonntagabend esse ich fast immer über das Ziel, meistens vor dem Fernseher und ohne Hunger.",
      tags: ["essverhalten", "sonntag", "abend"] },
    { id: "m2", at: at(12), kind: "muster", weight: 5, source: "nutzer",
      text: "Bisher gescheitert ist es jedes Mal in der dritten Woche, wenn die Arbeit dichter wird und das Training als Erstes ausfällt.",
      tags: ["vorgeschichte", "training", "stress"] },
    { id: "m3", at: at(12), kind: "fakt", weight: 4, source: "nutzer",
      text: "Verträgt keine Laktose, Magerquark und Skyr gehen trotzdem.",
      tags: ["ernaehrung", "unvertraeglichkeit"] },
    { id: "m4", at: at(11), kind: "fakt", weight: 4, source: "nutzer",
      text: "Arbeitet im Büro, sitzt viel, kommt selten über 8000 Schritte ohne bewussten Spaziergang.",
      tags: ["alltag", "schritte"] },
    { id: "m5", at: at(6), kind: "beobachtung", weight: 3, source: "coach",
      text: "An Trainingstagen liegt die Energie am Mittag im Schnitt zwei Punkte höher als an freien Tagen.",
      tags: ["energie", "training"] },
  ];
}

function gespraecheBauen(heute) {
  const at = (abstand, zeit) => iso(tagVor(abstand, heute), zeit);
  return [
    {
      id: "g1", ordner: "ernaehrung", erstellt: at(3, "18:40"), zuletzt: at(3, "18:43"),
      titel: "Was passt heute Abend noch rein",
      nachrichten: [
        { role: "user", text: "Was passt heute Abend noch rein?", at: at(3, "18:40") },
        { role: "assistant", text: "Offen sind 720 kcal und 48 g Protein. Aus deinem Vorrat: 180 g Putenbrust, 250 g Süsskartoffel und ein Feldsalat mit einem Esslöffel Öl. Das sind 527 kcal und 49 g Protein, du hast danach noch knapp 200 kcal Luft für einen Quark.", at: at(3, "18:41") },
        { role: "user", text: "Passt, mach ich", at: at(3, "18:43") },
      ],
    },
    {
      id: "g2", ordner: "training", erstellt: at(6, "20:10"), zuletzt: at(6, "20:14"),
      titel: "Knie zwickt beim Beugen",
      nachrichten: [
        { role: "user", text: "Mein Knie zwickt beim Beugen, soll ich morgen trotzdem Beine machen?", at: at(6, "20:10") },
        { role: "assistant", text: "Ich bin kein Arzt und kann dir nicht sagen, was da los ist. Was ich sagen kann: du hast in den letzten zwei Wochen dreimal Beine trainiert und das Gewicht jedes Mal erhöht. Wenn es unter Last zwickt und nicht nur beim Aufwärmen, ist Weitermachen die schlechtere Wette. Halt morgen das Gewicht, geh nicht tiefer als es schmerzfrei geht, und wenn es in einer Woche noch da ist, lass es ansehen.", at: at(6, "20:12") },
        { role: "user", text: "ok, halte das Gewicht", at: at(6, "20:14") },
      ],
    },
    {
      id: "g3", ordner: "planung", erstellt: at(1, "07:05"), zuletzt: at(1, "07:09"),
      titel: "Wie sieht mein Tag aus",
      nachrichten: [
        { role: "user", text: "Wie sieht mein Tag aus?", at: at(1, "07:05") },
        { role: "assistant", text: "Vier Termine, zusammen fünf Stunden, der längste freie Block liegt von 14:00 bis 16:30. Training steht um 18:00, iss deshalb gegen 16:30 statt erst danach. Auf der Liste stehen drei offene Aufgaben, der Trainingsplan ist die einzige mit Frist.", at: at(1, "07:07") },
      ],
    },
  ];
}

/**
 * Der ganze Datensatz, in der Form, die `store.importAll` erwartet.
 *
 * Bewusst über den Einspielweg und nicht über eigene Schreibaufrufe: der Weg
 * ist getestet, er zieht alte Felder gerade und er ist genau der, über den
 * auch eine echte Sicherung zurückkommt. Ein zweiter Schreibweg wäre eine
 * zweite Stelle, an der dieselbe Form auseinanderlaufen kann.
 */
export function beispieldaten(heute = new Date()) {
  return {
    exportedAt: new Date(heute).toISOString(),
    version: 1,
    profile: DEMO_PROFIL,
    days: tageBauen(heute),
    zeiten: zeitenBauen(heute),
    aufgaben: aufgabenBauen(heute),
    memories: gedaechtnisBauen(heute),
    gespraeche: gespraecheBauen(heute),
    fridge: "Magerquark, Skyr, Eier, Hähnchenbrust, Reis, Haferflocken, Brokkoli, Süsskartoffeln, Mandeln",
    standards: [
      { id: "s1", kind: "schritte", text: "Ich gehe jeden Tag mindestens 8000 Schritte.", kadenz: "taeglich", ziel: 8000, aktiv: true, seit: tagVor(12, heute) },
      { id: "s2", kind: "protein", text: "Ich komme jeden Tag auf mein Proteinziel.", kadenz: "taeglich", ziel: 1, aktiv: true, seit: tagVor(12, heute) },
      { id: "s3", kind: "frei", text: "Ich lege das Handy ab 22:00 weg.", kadenz: "taeglich", ziel: 1, aktiv: true, seit: tagVor(9, heute) },
    ],
  };
}
