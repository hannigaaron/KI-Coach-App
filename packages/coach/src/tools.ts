import type { ToolDefinition } from "./provider.js";

/**
 * Die Werkzeuge, die der Assistent im Gespräch benutzen darf.
 *
 * Sie sind bewusst eng geschnitten. Der Assistent soll Dinge tun können,
 * nicht über Dinge reden, die er tun könnte. Jede Beschreibung sagt auch,
 * wann das Werkzeug NICHT zu nehmen ist, weil Modelle sonst zu Werkzeugen
 * greifen, wo eine Antwort genügt.
 */
export const AGENT_TOOLS: ToolDefinition[] = [
  {
    name: "mahlzeit_erfassen",
    description:
      "Trägt eine gegessene Mahlzeit ein und rechnet Kalorien und Makros aus. " +
      "Nur nehmen, wenn der Nutzer sagt, dass er etwas gegessen oder getrunken hat, das Kalorien liefert. " +
      "Nicht nehmen für Pläne oder Fragen wie was soll ich essen.",
    input_schema: {
      type: "object",
      properties: {
        beschreibung: {
          type: "string",
          description: "Was gegessen wurde, so wörtlich wie möglich, inklusive Mengen.",
        },
      },
      required: ["beschreibung"],
    },
  },
  {
    name: "wasser_eintragen",
    description: "Trägt getrunkenes Wasser in Millilitern ein. Ein Glas sind 250 ml, eine Flasche 500 ml.",
    input_schema: {
      type: "object",
      properties: { ml: { type: "number", description: "Menge in Millilitern, 1 bis 5000." } },
      required: ["ml"],
    },
  },
  {
    name: "tagesstand_abrufen",
    description:
      "Liefert die Zahlen von heute: Kalorien, Makros, Wasser, Restbudget, Trainingseinheiten. " +
      "Vor jeder Aussage über Zahlen aufrufen. Nie Zahlen schätzen.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "mahlzeit_vorschlagen",
    description:
      "Baut aus dem hinterlegten Vorrat und dem Restbudget eine passende Mahlzeit. " +
      "Nehmen, wenn der Nutzer fragt, was er essen soll oder was noch reinpasst.",
    input_schema: {
      type: "object",
      properties: {
        wunsch: { type: "string", description: "Optionale Vorgabe, etwa schnell, warm, viel Protein." },
      },
    },
  },
  {
    name: "checkin_speichern",
    description:
      "Hält Befinden fest: Energie, Schlafqualität, Stimmung, freie Notiz. " +
      "Nehmen, wenn der Nutzer erzählt, wie es ihm geht oder wie er geschlafen hat.",
    input_schema: {
      type: "object",
      properties: {
        energie: { type: "number", description: "1 bis 10, weglassen wenn unbekannt." },
        schlaf: { type: "number", description: "1 bis 10, weglassen wenn unbekannt." },
        stimmung: { type: "number", description: "1 bis 10, weglassen wenn unbekannt." },
        notiz: { type: "string", description: "Was der Nutzer gesagt hat, kurz gefasst." },
        herausforderung: {
          type: "string",
          description:
            "Die grösste Herausforderung des Tages, wenn er sie nennt. Wird getrennt gespeichert, " +
            "damit die Frage am Nachmittag nicht noch einmal kommt. " +
            "Nennt er eine, gehst du danach darauf ein und schlägst genau eine Sache vor, die hilft.",
        },
      },
      required: ["notiz"],
    },
  },
  {
    name: "merken",
    description:
      "Legt etwas dauerhaft im Gedächtnis ab. Nehmen für alles, was auch in vier Wochen noch gilt: " +
      "Unverträglichkeiten, Vorlieben, Ziele, Verletzungen, Lebensumstände, wiederkehrende Muster. " +
      "Nicht nehmen für den heutigen Tagesablauf, dafür gibt es die anderen Werkzeuge.",
    input_schema: {
      type: "object",
      properties: {
        text: { type: "string", description: "Die Aussage in einem Satz, aus Sicht des Coaches formuliert." },
        art: {
          type: "string",
          enum: ["fakt", "praeferenz", "ziel", "ereignis", "reflexion", "hinweis"],
          description: "Kategorie der Notiz.",
        },
        wichtigkeit: { type: "number", description: "1 bis 5. 5 nur für Dinge, die immer mitgedacht werden müssen." },
        schlagworte: { type: "array", items: { type: "string" }, description: "Wenige Stichworte zum Wiederfinden." },
      },
      required: ["text", "art", "wichtigkeit"],
    },
  },
  {
    name: "foto_als_mahlzeit_erfassen",
    description:
      "Wertet das Bild aus, das der Nutzer gerade mitgeschickt hat, als Mahlzeit aus und trägt sie ein. " +
      "Schätzt Mengen anhand von Bezugsgrössen im Bild und rechnet die Nährwerte aus. " +
      "Nur nehmen, wenn wirklich ein Bild mitgeschickt wurde und darauf Essen zu sehen ist. " +
      "Nicht nehmen für einen Kühlschrank oder einen Einkauf, dafür gibt es foto_als_vorrat_lesen.",
    input_schema: {
      type: "object",
      properties: {
        hinweis: {
          type: "string",
          description:
            "Was der Nutzer selbst dazu gesagt hat, etwa eine Menge oder eine Zutat, die man nicht sieht. " +
            "Hilft beim Schätzen. Leer lassen, wenn er nichts gesagt hat.",
        },
      },
    },
  },
  {
    name: "foto_als_vorrat_lesen",
    description:
      "Liest aus dem mitgeschickten Bild eines Kühlschranks, Vorrats oder Einkaufs die Lebensmittel " +
      "und speichert sie als Vorrat. Danach kann mahlzeit_vorschlagen damit arbeiten. " +
      "Nur nehmen, wenn wirklich ein Bild mitgeschickt wurde.",
    input_schema: {
      type: "object",
      properties: {
        hinweis: { type: "string", description: "Was der Nutzer dazu gesagt hat. Leer lassen, wenn nichts." },
      },
    },
  },
  {
    name: "verlauf_abrufen",
    description:
      "Liefert den Verlauf über mehrere Wochen: Gewichtstrend in kg je Woche, durchschnittliche Aufnahme, " +
      "den daraus gemessenen tatsächlichen Kalorienverbrauch und ob das Tagesziel noch passt. " +
      "Nehmen, wenn der Nutzer fragt ob sein Ziel stimmt, wenn er sagt dass sich nichts tut, " +
      "wenn er über Fortschritt oder Stillstand redet, oder wenn du über mehr als den heutigen Tag sprichst. " +
      "Nicht nehmen für die Zahlen von heute, dafür gibt es tagesstand_abrufen.",
    input_schema: {
      type: "object",
      properties: {
        tage: { type: "number", description: "Zeitraum in Tagen, 7 bis 120. Ohne Angabe 28." },
      },
    },
  },
  {
    name: "kalender_abrufen",
    description:
      "Liefert die Termine aus dem Kalender des Nutzers für die nächsten Tage, mit Uhrzeiten, " +
      "verplanter Zeit je Tag, erkannten Trainings und den längsten freien Blöcken. " +
      "Nehmen, sobald es um Zeit geht: wann er was macht, ob etwas in die Woche passt, " +
      "wann er trainieren oder essen soll, warum er nichts geschafft hat, oder wenn er nach seinem Plan fragt. " +
      "Für die genaue Auswertung eines einzelnen Tages gibt es tagesablauf_planen.",
    input_schema: {
      type: "object",
      properties: {
        tage: { type: "number", description: "Wie viele Tage ab heute, 1 bis 14. Ohne Angabe 7." },
      },
    },
  },
  {
    name: "tagesablauf_planen",
    description:
      "Wertet einen einzelnen Tag aus: Termine, verplante Minuten, freie Blöcke, Vorschlag für die Zeitpunkte " +
      "der Mahlzeiten mit Kalorien und Protein je Mahlzeit, und was am Tag auffällt, etwa ein Termin vor der " +
      "Aufstehzeit oder kein Platz für eine Mittagsmahlzeit. " +
      "Nehmen, wenn der Nutzer seinen Tag plant, fragt wann er essen soll, oder wenn du den Tag beurteilen willst. " +
      "Die Zeiten aus dieser Antwort übernimmst du, du denkst dir keine eigenen aus.",
    input_schema: {
      type: "object",
      properties: {
        tag: { type: "string", description: "Datum als JJJJ-MM-TT. Ohne Angabe heute." },
      },
    },
  },
  {
    name: "aufgabe_anlegen",
    description:
      "Legt eine Aufgabe an. Nehmen, sobald der Nutzer sagt, dass er etwas zu tun hat, etwas vergessen " +
      "könnte oder sich etwas vornimmt. Auch nebenbei genannt, etwa ich muss noch das Angebot schreiben. " +
      "Nicht nehmen für Dinge, die er gerade erledigt hat, und nicht für Termine mit Uhrzeit, " +
      "die gehören in den Kalender.",
    input_schema: {
      type: "object",
      properties: {
        text: { type: "string", description: "Was zu tun ist, in seinen Worten, als Handlung formuliert." },
        minuten: { type: "number", description: "Geschätzter Aufwand in Minuten, 5 bis 480. Ohne Angabe 30." },
        faellig: { type: "string", description: "Frist als JJJJ-MM-TT. Weglassen, wenn es keine gibt." },
        wichtigkeit: { type: "number", description: "1 nebensächlich, 2 normal, 3 wichtig. Ohne Angabe 2." },
      },
      required: ["text"],
    },
  },
  {
    name: "aufgabe_abhaken",
    description: "Hakt eine Aufgabe ab. Nehmen, wenn der Nutzer sagt, dass er etwas erledigt hat.",
    input_schema: {
      type: "object",
      properties: {
        text: { type: "string", description: "Die Aufgabe, so wie er sie nennt. Wird über Wortähnlichkeit gefunden." },
      },
      required: ["text"],
    },
  },
  {
    name: "aufgaben_priorisieren",
    description:
      "Sortiert die offenen Aufgaben nach Frist und Wichtigkeit, legt sie in die Zeit, die laut Kalender " +
      "heute noch frei ist, und sagt, was bis morgen warten kann. " +
      "Nehmen, wenn der Nutzer fragt, was er zuerst machen soll, wenn er sich überfordert fühlt, " +
      "wenn er nach seinem Rest des Tages fragt, und immer am Nachmittag. " +
      "Die Aufteilung aus dieser Antwort übernimmst du, du sortierst nicht selbst um.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "mittagscheck_speichern",
    description:
      "Hält den Mittags Check-in fest: Energie, Konzentration und Sättigung nach dem Essen, je 1 bis 10. " +
      "Liefert zurück, was die Zahlen im Zusammenhang mit der erfassten Mahlzeit bedeuten und was an der " +
      "nächsten Mahlzeit anders sein sollte, in Gramm. " +
      "Nehmen, sobald der Nutzer nach dem Mittag sagt, wie es ihm geht. " +
      "Sind die Werte schlecht, schlägst du danach mit mahlzeit_vorschlagen eine konkrete Alternative vor.",
    input_schema: {
      type: "object",
      properties: {
        energie: { type: "number", description: "1 bis 10." },
        konzentration: { type: "number", description: "1 bis 10." },
        saettigung: { type: "number", description: "1 hungrig, 5 angenehm, 10 übervoll." },
        notiz: { type: "string", description: "Was er sonst dazu gesagt hat." },
      },
      required: ["energie", "konzentration", "saettigung"],
    },
  },
  {
    name: "briefing_erstellen",
    description:
      "Baut das Morgenbriefing oder den Tagesabschluss aus Kalender, Zielen, Aufgaben und Mindeststandards. " +
      "Nehmen, wenn der Nutzer morgens fragt, wie sein Tag aussieht, oder abends den Tag abschliessen will.",
    input_schema: {
      type: "object",
      properties: {
        art: { type: "string", enum: ["morgen", "abend"], description: "Welcher der beiden Texte." },
      },
      required: ["art"],
    },
  },
  {
    name: "muster_erkennen",
    description:
      "Sucht Zusammenhänge über mehrere Wochen: was hängt bei diesem Nutzer wirklich mit seiner Energie, " +
      "Konzentration und Stimmung zusammen. Rechnet Korrelationen über Schlaf, Kalorien, Protein, Wasser, " +
      "Training und die im Kalender verplante Zeit. " +
      "Nehmen, wenn er fragt, warum er ständig müde oder unkonzentriert ist, wenn er über ein Muster redet, " +
      "oder wenn du eine Vermutung über Wochen prüfen willst. " +
      "Die Antwort nennt Zusammenhänge, keine Ursachen. Genau so gibst du sie auch weiter.",
    input_schema: {
      type: "object",
      properties: {
        tage: { type: "number", description: "Zeitraum in Tagen, 14 bis 180. Ohne Angabe 60." },
      },
    },
  },
  {
    name: "widersprueche_pruefen",
    description:
      "Vergleicht, was sich der Nutzer vornimmt, mit dem, was seine Daten zeigen: Ziele gegen Durchschnitt, " +
      "Trainingsplan gegen eingetragene Einheiten, wichtige Aufgaben gegen ihr Alter, " +
      "Kundenarbeit gegen Zeit für den Aufbau. " +
      "Nehmen, wenn er über Fortschritt, Disziplin oder seine Ziele redet, wenn er sich fertigmacht, " +
      "oder wenn er wissen will, woran es liegt. " +
      "Jeder Punkt ist eine anstehende Entscheidung, kein Vorwurf. Manchmal ist die Antwort, das Ziel zu ändern.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "gewicht_eintragen",
    description:
      "Trägt eine Wiegung ein. Nehmen, sobald der Nutzer ein Gewicht nennt, auch nebenbei. " +
      "Ohne regelmässige Wiegungen kann der Verlauf nichts messen und jede Zielkorrektur bleibt geraten.",
    input_schema: {
      type: "object",
      properties: {
        kg: { type: "number", description: "Gewicht in Kilogramm, 30 bis 300." },
      },
      required: ["kg"],
    },
  },
  {
    name: "training_eintragen",
    description:
      "Hält eine absolvierte Trainingseinheit fest. Nehmen, wenn der Nutzer von einem Training erzählt, " +
      "das schon stattgefunden hat. Nicht nehmen für geplante Einheiten im Kalender.",
    input_schema: {
      type: "object",
      properties: {
        art: {
          type: "string",
          enum: ["strength", "team_sport", "cardio", "mobility"],
          description: "Art der Einheit.",
        },
        minuten: { type: "number", description: "Dauer in Minuten, 5 bis 480." },
        notiz: { type: "string", description: "Was gemacht wurde, wie es lief, kurz gefasst." },
      },
      required: ["art", "minuten"],
    },
  },
  {
    name: "profil_aendern",
    description:
      "Ändert dauerhafte Angaben im Profil. Nehmen, wenn sich etwas wirklich geändert hat: " +
      "neues Ziel, neue Schlafenszeit, andere Schrittzahl im Alltag, anderer Job. " +
      "Nicht nehmen für eine einzelne Wiegung, dafür gibt es gewicht_eintragen. " +
      "Nur die Felder mitgeben, die sich ändern.",
    input_schema: {
      type: "object",
      properties: {
        ziel: { type: "string", enum: ["fat_loss", "maintain", "lean_bulk"], description: "Neues Ziel." },
        gewichtKg: { type: "number", description: "Neues Ausgangsgewicht für die Rechnung." },
        schritte: { type: "number", description: "Durchschnittliche Schritte am Tag." },
        aufstehen: { type: "string", description: "Neue Aufstehzeit im Format HH:MM." },
        schlafen: { type: "string", description: "Neue Schlafenszeit im Format HH:MM." },
        verbrauch: {
          type: "number",
          description:
            "Der gemessene tatsächliche Kalorienverbrauch am Tag. Ersetzt die Schätzung aus der Formel. " +
            "Das Tagesziel rechnet die App daraus selbst, je nach Ziel des Nutzers. " +
            "Nur nach verlauf_abrufen setzen und nur mit dem Wert, der dort als gemessener Verbrauch steht.",
        },
      },
    },
  },
  {
    name: "einkaufsliste_erstellen",
    description:
      "Rechnet aus den Tageszielen eine Einkaufsliste und speichert sie. " +
      "Nehmen, wenn der Nutzer einkaufen geht, nach einer Liste fragt oder sagt, sein Kühlschrank sei leer. " +
      "Nicht nehmen, wenn er nur wissen will, was er jetzt essen soll, dafür gibt es mahlzeit_vorschlagen.",
    input_schema: {
      type: "object",
      properties: {
        tage: { type: "number", description: "Für wie viele Tage eingekauft wird, 1 bis 14. Ohne Angabe 7." },
        meiden: {
          type: "array",
          items: { type: "string" },
          description: "Lebensmittel, die nicht auf die Liste dürfen. Unverträglichkeiten aus dem Gedächtnis gehören hier rein.",
        },
      },
    },
  },
  {
    name: "einkaufsliste_abrufen",
    description:
      "Liest die gespeicherte Einkaufsliste mit dem Stand jedes Postens. " +
      "Nehmen, bevor du über die Liste sprichst, und wenn der Nutzer im Laden steht.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "einkaufsliste_abhaken",
    description:
      "Setzt den Stand eines Postens auf der Einkaufsliste. " +
      "gekauft, wenn er im Wagen liegt. zuhause, wenn der Nutzer sagt, dass er es noch hat. offen macht das rückgängig.",
    input_schema: {
      type: "object",
      properties: {
        posten: { type: "string", description: "Name des Postens, so wie er auf der Liste steht." },
        stand: { type: "string", enum: ["gekauft", "zuhause", "offen"], description: "Neuer Stand." },
      },
      required: ["posten", "stand"],
    },
  },
  {
    name: "standards_abrufen",
    description:
      "Liefert die vereinbarten Mindeststandards und wie gut sie zuletzt gehalten wurden. " +
      "Vor jeder Aussage über Standards aufrufen. Nehmen, wenn der Nutzer unzufrieden mit sich ist, " +
      "wenn er eine schlechte Woche hatte oder wenn er fragt, wie er dasteht.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "standard_setzen",
    description:
      "Legt einen neuen Mindeststandard an oder ändert einen bestehenden. " +
      "Ein Mindeststandard ist die Untergrenze, nicht das Ziel. Er muss auch in einer schlechten Woche zu halten sein. " +
      "Nehmen, wenn der Nutzer sich auf etwas festlegt, das ab jetzt immer gelten soll.",
    input_schema: {
      type: "object",
      properties: {
        text: { type: "string", description: "Der Standard als ein Satz aus Sicht des Nutzers, beginnend mit Ich." },
        kadenz: { type: "string", enum: ["taeglich", "woechentlich"], description: "Gilt er je Tag oder je Woche." },
        art: {
          type: "string",
          enum: ["protein", "wasser", "training", "schritte", "erfassen", "schlafenszeit", "handy_aus", "frei"],
          description: "Woran der Standard gemessen wird. frei, wenn die App ihn nicht selbst messen kann.",
        },
        ziel: { type: "number", description: "Der Mindestwert. Bei frei die Anzahl der Tage oder Male." },
        id: { type: "string", description: "Nur setzen, wenn ein bestehender Standard geändert wird." },
      },
      required: ["text", "kadenz", "art", "ziel"],
    },
  },
  {
    name: "standard_bestaetigen",
    description:
      "Hält fest, dass ein Standard heute gehalten wurde, den die App nicht selbst messen kann, " +
      "etwa Schlafenszeit oder Handy weglegen. Nehmen, wenn der Nutzer das von sich aus sagt oder auf Nachfrage bejaht.",
    input_schema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Kennung des Standards aus standards_abrufen." },
        gehalten: { type: "boolean", description: "true wenn gehalten, false wenn nicht." },
      },
      required: ["id", "gehalten"],
    },
  },
  {
    name: "gedaechtnis_durchsuchen",
    description:
      "Sucht in frühreren Notizen. Nehmen, wenn der Nutzer sich auf etwas Früheres bezieht " +
      "oder wenn eine Antwort von seiner Vorgeschichte abhängt.",
    input_schema: {
      type: "object",
      properties: { frage: { type: "string", description: "Wonach gesucht wird." } },
      required: ["frage"],
    },
  },
];
