/**
 * Die Übungsdatenbank.
 *
 * 80 verbreitete Übungen, eigenständig verfasst. Namen und Abläufe sind
 * allgemeines Trainingswissen. Übernommen wurde nichts aus der Datenbank einer
 * anderen App, weder Text noch Bild. Das Foto je Übung liegt unter
 * `img/uebungen/<id>.jpg` und `img/uebungen/klein/<id>.jpg`. Es ist für daevo
 * erzeugt und gehört daevo.
 *
 * `video` verweist auf ein Erklärvideo auf YouTube. Die Videos gehören ihren
 * Kanälen. daevo verlinkt sie nur und bettet sie nicht ein. Jede Kennung wurde
 * beim Eintragen über YouTube abgerufen. Ein Video kann später gelöscht
 * werden, deshalb gehört die Prüfung der Links in die Pflege.
 *
 * Bezeichner (`id`, `pattern`, `gruppe`, `equipment`, `level`) bleiben
 * ASCII, weil sie gespeichert und verglichen werden. Alles, was der Nutzer
 * liest, steht mit echten Umlauten da.
 *
 * `pattern` ist das Bewegungsmuster. Ein Trainingsplan kann damit je Woche
 * Muster und Muskeln ausbalancieren, statt einzelne Übungen zu zählen.
 * Die Wiederholungsbereiche sind übliche Richtwerte, keine Verordnung.
 */
export const UEBUNGEN = [
 {
  "id": "kniebeuge-langhantel",
  "name": "Kniebeuge (Langhantel)",
  "nameEn": "Barbell Back Squat",
  "pattern": "knee_dominant",
  "primaryMuscles": [
   "Quadrizeps",
   "Gluteus"
  ],
  "secondaryMuscles": [
   "Adduktoren",
   "Rumpf"
  ],
  "equipment": "barbell",
  "level": "intermediate",
  "mechanics": "compound",
  "repRange": "5-10",
  "steps": [
   "Stange auf dem oberen Rücken fixieren, Füße schulterbreit",
   "Bauch anspannen, Brust hoch",
   "Hüfte und Knie gleichzeitig beugen bis mindestens parallel",
   "Mit den Füßen den Boden wegdrücken und aufrichten"
  ],
  "gruppe": "beine",
  "video": {
   "id": "qyN9AdPFYzc",
   "titel": "Das beste KNIEBEUGE TUTORIAL | Richtige Ausführung & Technik mit der Langhantel und Bodyweight",
   "kanal": "Coach Stef",
   "dauer": "9:26"
  }
 },
 {
  "id": "frontkniebeuge",
  "name": "Frontkniebeuge",
  "nameEn": "Front Squat",
  "pattern": "knee_dominant",
  "primaryMuscles": [
   "Quadrizeps"
  ],
  "secondaryMuscles": [
   "Gluteus",
   "Rumpf"
  ],
  "equipment": "barbell",
  "level": "advanced",
  "mechanics": "compound",
  "repRange": "5-8",
  "steps": [
   "Stange auf den vorderen Schultern, Ellbogen zeigen nach vorn",
   "Oberkörper aufrecht halten",
   "Tief in die Hocke, Knie folgen den Zehen",
   "Aus den Fersen und Mittelfuß aufstehen"
  ],
  "gruppe": "beine",
  "video": {
   "id": "UrfBaI0J2xA",
   "titel": "FRONTKNIEBEUGE Anleitung - Technik, Tipps und warum eigentlich?",
   "kanal": "Fitolution",
   "dauer": "6:47"
  }
 },
 {
  "id": "goblet-kniebeuge",
  "name": "Goblet-Kniebeuge",
  "nameEn": "Goblet Squat",
  "pattern": "knee_dominant",
  "primaryMuscles": [
   "Quadrizeps",
   "Gluteus"
  ],
  "secondaryMuscles": [
   "Rumpf"
  ],
  "equipment": "dumbbell",
  "level": "beginner",
  "mechanics": "compound",
  "repRange": "8-15",
  "steps": [
   "Hantel vor der Brust halten",
   "Füße etwas breiter als schulterbreit, Zehen leicht nach außen",
   "Ellbogen zwischen die Knie absenken",
   "Aufrecht hochdrücken"
  ],
  "gruppe": "beine",
  "video": {
   "id": "FQiMMHcWLLM",
   "titel": "Goblet Squat Ausführung | Technik, Form & Typische Fehler",
   "kanal": "Myprotein Deutschland",
   "dauer": "5:43"
  }
 },
 {
  "id": "beinpresse",
  "name": "Beinpresse",
  "nameEn": "Leg Press",
  "pattern": "knee_dominant",
  "primaryMuscles": [
   "Quadrizeps",
   "Gluteus"
  ],
  "secondaryMuscles": [
   "Adduktoren"
  ],
  "equipment": "machine",
  "level": "beginner",
  "mechanics": "compound",
  "repRange": "8-15",
  "steps": [
   "Rücken und Gesäß fest ans Polster",
   "Füße schulterbreit auf die Platte",
   "Kontrolliert beugen, bis die Knie ca. 90 Grad erreichen",
   "Drücken, Knie oben nicht durchstrecken"
  ],
  "gruppe": "beine",
  "video": {
   "id": "1ve7AAEPMnw",
   "titel": "Die richtige Ausführung der Beinpresse - Technikcheck",
   "kanal": "Power & Fitness",
   "dauer": "1:17"
  }
 },
 {
  "id": "bulgarian-split-squat",
  "name": "Bulgarian Split Squat",
  "nameEn": "Bulgarian Split Squat",
  "pattern": "unilateral_legs",
  "primaryMuscles": [
   "Quadrizeps",
   "Gluteus"
  ],
  "secondaryMuscles": [
   "Adduktoren"
  ],
  "equipment": "dumbbell",
  "level": "intermediate",
  "mechanics": "compound",
  "repRange": "8-12",
  "steps": [
   "Hinteren Fuß auf einer Bank ablegen",
   "Vorderer Fuß weit genug vor der Bank",
   "Gerade nach unten senken",
   "Mit dem vorderen Bein hochdrücken"
  ],
  "gruppe": "beine",
  "video": {
   "id": "oZINNA7ljvc",
   "titel": "Bulgarien Split Squats - Darauf solltest DU achten !",
   "kanal": "Quantum Leap Fitness",
   "dauer": "4:09"
  }
 },
 {
  "id": "ausfallschritt",
  "name": "Ausfallschritt",
  "nameEn": "Lunge",
  "pattern": "unilateral_legs",
  "primaryMuscles": [
   "Quadrizeps",
   "Gluteus"
  ],
  "secondaryMuscles": [
   "Hamstrings"
  ],
  "equipment": "dumbbell",
  "level": "beginner",
  "mechanics": "compound",
  "repRange": "8-12",
  "steps": [
   "Aufrecht stehen, großen Schritt nach vorn",
   "Hinteres Knie Richtung Boden senken",
   "Vorderes Knie bleibt über dem Fuß",
   "Mit dem vorderen Bein zurückdrücken"
  ],
  "gruppe": "beine",
  "video": {
   "id": "oqfoPtRkock",
   "titel": "Ausfallschritte lernen (Technik Tutorial) | Richtige Ausführung mit Langhantel und Co.",
   "kanal": "Coach Stef",
   "dauer": "7:40"
  }
 },
 {
  "id": "step-up",
  "name": "Step-up",
  "nameEn": "Step-Up",
  "pattern": "unilateral_legs",
  "primaryMuscles": [
   "Quadrizeps",
   "Gluteus"
  ],
  "secondaryMuscles": [],
  "equipment": "dumbbell",
  "level": "beginner",
  "mechanics": "compound",
  "repRange": "8-12",
  "steps": [
   "Ganzen Fuß auf die Erhöhung stellen",
   "Oberkörper aufrecht",
   "Mit dem vorderen Bein hochsteigen",
   "Kontrolliert absteigen"
  ],
  "gruppe": "beine",
  "video": {
   "id": "WCFCdxzFBa4",
   "titel": "How to do the STEP UP: technique and common mistakes",
   "kanal": "Get Exercise Confident",
   "dauer": "2:52"
  }
 },
 {
  "id": "hackenschmidt-kniebeuge",
  "name": "Hack Squat",
  "nameEn": "Hack Squat",
  "pattern": "knee_dominant",
  "primaryMuscles": [
   "Quadrizeps"
  ],
  "secondaryMuscles": [
   "Gluteus"
  ],
  "equipment": "machine",
  "level": "intermediate",
  "mechanics": "compound",
  "repRange": "8-12",
  "steps": [
   "Rücken fest an die Lehne, Füße schulterbreit",
   "Entriegeln und kontrolliert beugen",
   "Tief gehen, Fersen bleiben am Boden",
   "Hochdrücken ohne Knie durchzustrecken"
  ],
  "gruppe": "beine",
  "video": {
   "id": "qPGHemCz1JM",
   "titel": "Die Königin der Beinübungen! Hackenschmidt!",
   "kanal": "Stefan Kienzl",
   "dauer": "9:18"
  }
 },
 {
  "id": "beinstrecker",
  "name": "Beinstrecker",
  "nameEn": "Leg Extension",
  "pattern": "knee_dominant",
  "primaryMuscles": [
   "Quadrizeps"
  ],
  "secondaryMuscles": [],
  "equipment": "machine",
  "level": "beginner",
  "mechanics": "isolation",
  "repRange": "10-20",
  "steps": [
   "Polster knapp über den Knöcheln einstellen",
   "Rücken an der Lehne",
   "Beine strecken, oben 1 Sekunde halten",
   "Langsam absenken"
  ],
  "gruppe": "beine",
  "video": {
   "id": "ytxKnuWmCdo",
   "titel": "Beinstrecker: Dos & Don'ts – Anleitung für effektives Beintraining 🏋️‍♀️",
   "kanal": "FIT FOR FUN",
   "dauer": "2:55"
  }
 },
 {
  "id": "kreuzheben",
  "name": "Kreuzheben",
  "nameEn": "Conventional Deadlift",
  "pattern": "hip_dominant",
  "primaryMuscles": [
   "Gluteus",
   "Hamstrings",
   "Rückenstrecker"
  ],
  "secondaryMuscles": [
   "Trapez",
   "Unterarme",
   "Rumpf"
  ],
  "equipment": "barbell",
  "level": "advanced",
  "mechanics": "compound",
  "repRange": "3-8",
  "steps": [
   "Stange über dem Mittelfuß, schulterbreiter Griff",
   "Rücken gerade, Brust hoch, Spannung aufbauen",
   "Boden wegdrücken, Stange nah am Körper führen",
   "Oben Hüfte und Knie strecken, kontrolliert ablegen"
  ],
  "gruppe": "beine",
  "video": {
   "id": "RzDwYJWVOmY",
   "titel": "Kreuzheben lernen (Technik Tutorial) | Richtige Ausführung und Tipps",
   "kanal": "Coach Stef",
   "dauer": "4:31"
  }
 },
 {
  "id": "rumaenisches-kreuzheben",
  "name": "Rumänisches Kreuzheben",
  "nameEn": "Romanian Deadlift",
  "pattern": "hip_dominant",
  "primaryMuscles": [
   "Hamstrings",
   "Gluteus"
  ],
  "secondaryMuscles": [
   "Rückenstrecker"
  ],
  "equipment": "barbell",
  "level": "intermediate",
  "mechanics": "compound",
  "repRange": "6-12",
  "steps": [
   "Aufrecht stehen, Stange vor den Oberschenkeln",
   "Knie leicht gebeugt, Hüfte nach hinten schieben",
   "Stange an den Beinen entlang absenken, bis die Hamstrings dehnen",
   "Hüfte nach vorn schieben und aufrichten"
  ],
  "gruppe": "beine",
  "video": {
   "id": "J3AsbKDVfpo",
   "titel": "Technik Tutorial! Wie geht Rumänisches Kreuzheben? - Die beste Übung für den Po 🍑",
   "kanal": "HERO Workout",
   "dauer": "1:26"
  }
 },
 {
  "id": "sumo-kreuzheben",
  "name": "Sumo-Kreuzheben",
  "nameEn": "Sumo Deadlift",
  "pattern": "hip_dominant",
  "primaryMuscles": [
   "Gluteus",
   "Adduktoren",
   "Quadrizeps"
  ],
  "secondaryMuscles": [
   "Rückenstrecker"
  ],
  "equipment": "barbell",
  "level": "advanced",
  "mechanics": "compound",
  "repRange": "3-8",
  "steps": [
   "Breiter Stand, Zehen nach außen",
   "Griff innerhalb der Knie, Brust hoch",
   "Knie nach außen drücken, Boden wegdrücken",
   "Hüfte nach vorn und aufrichten"
  ],
  "gruppe": "beine",
  "video": {
   "id": "_lexc7LnIQc",
   "titel": "SUMO KREUZHEBEN ANLEITUNG - Technik & Tipps | SHERRYPOWER.DE",
   "kanal": "Fitolution",
   "dauer": "5:24"
  }
 },
 {
  "id": "trap-bar-kreuzheben",
  "name": "Trap-Bar-Kreuzheben",
  "nameEn": "Trap Bar Deadlift",
  "pattern": "hip_dominant",
  "primaryMuscles": [
   "Quadrizeps",
   "Gluteus"
  ],
  "secondaryMuscles": [
   "Rückenstrecker",
   "Trapez"
  ],
  "equipment": "trap_bar",
  "level": "beginner",
  "mechanics": "compound",
  "repRange": "5-10",
  "steps": [
   "In die Mitte der Trap Bar stellen, Griffe fassen",
   "Brust hoch, Rücken gerade",
   "Boden wegdrücken",
   "Oben aufrecht stehen, kontrolliert absetzen"
  ],
  "gruppe": "beine",
  "video": {
   "id": "iHnfRkZPLMk",
   "titel": "Trap Bar Deadlift: Richtige Ausführung & Technik erklärt",
   "kanal": "Muscle Man Fitness by Shaun",
   "dauer": "2:19"
  }
 },
 {
  "id": "hip-thrust",
  "name": "Hip Thrust",
  "nameEn": "Barbell Hip Thrust",
  "pattern": "hip_dominant",
  "primaryMuscles": [
   "Gluteus"
  ],
  "secondaryMuscles": [
   "Hamstrings"
  ],
  "equipment": "barbell",
  "level": "intermediate",
  "mechanics": "compound",
  "repRange": "8-12",
  "steps": [
   "Oberer Rücken an der Bank, Stange auf der Hüfte",
   "Füße hüftbreit, Schienbeine oben senkrecht",
   "Hüfte nach oben strecken",
   "Oben Gesäß 1 Sekunde anspannen"
  ],
  "gruppe": "beine",
  "video": {
   "id": "Y0bmWyhsLXQ",
   "titel": "HIP THRUST - Mit der richtigen Technik deinen PO aufbauen (Technik Tutorial und Ausführung)",
   "kanal": "Coach Stef",
   "dauer": "5:38"
  }
 },
 {
  "id": "glute-bridge",
  "name": "Glute Bridge",
  "nameEn": "Glute Bridge",
  "pattern": "hip_dominant",
  "primaryMuscles": [
   "Gluteus"
  ],
  "secondaryMuscles": [
   "Hamstrings"
  ],
  "equipment": "bodyweight",
  "level": "beginner",
  "mechanics": "compound",
  "repRange": "10-20",
  "steps": [
   "Auf dem Rücken, Füße aufgestellt",
   "Bauch anspannen",
   "Hüfte hochdrücken, bis Schultern, Hüfte und Knie eine Linie bilden",
   "Gesäß oben anspannen"
  ],
  "gruppe": "beine",
  "video": {
   "id": "3S7Y7htTdRU",
   "titel": "Hip Thrust & Glute Bridges RICHTIG ausführen - TUTORIAL",
   "kanal": "Salome",
   "dauer": "4:49"
  }
 },
 {
  "id": "good-morning",
  "name": "Good Morning",
  "nameEn": "Good Morning",
  "pattern": "hip_dominant",
  "primaryMuscles": [
   "Hamstrings",
   "Rückenstrecker"
  ],
  "secondaryMuscles": [
   "Gluteus"
  ],
  "equipment": "barbell",
  "level": "advanced",
  "mechanics": "compound",
  "repRange": "8-12",
  "steps": [
   "Stange auf dem oberen Rücken, Knie leicht gebeugt",
   "Hüfte nach hinten schieben",
   "Oberkörper mit geradem Rücken absenken",
   "Mit der Hüfte aufrichten"
  ],
  "gruppe": "beine",
  "video": {
   "id": "dFl7RwTArTs",
   "titel": "Good Mornings Ausführung - Unteren Rücken richtig trainieren",
   "kanal": "Fitness Einfach Erklärt",
   "dauer": "1:09"
  }
 },
 {
  "id": "liegendes-beinbeugen",
  "name": "Liegendes Beinbeugen",
  "nameEn": "Lying Leg Curl",
  "pattern": "knee_flexion",
  "primaryMuscles": [
   "Hamstrings"
  ],
  "secondaryMuscles": [],
  "equipment": "machine",
  "level": "beginner",
  "mechanics": "isolation",
  "repRange": "8-15",
  "steps": [
   "Bauch auf die Bank, Polster über den Fersen",
   "Hüfte bleibt unten",
   "Fersen zum Gesäß ziehen",
   "Langsam zurück"
  ],
  "gruppe": "beine",
  "video": {
   "id": "3sUv_uzVZDE",
   "titel": "Beinbeuger Maschine im Liegen - Ausführung",
   "kanal": "Crimefood",
   "dauer": "0:51"
  }
 },
 {
  "id": "sitzendes-beinbeugen",
  "name": "Sitzendes Beinbeugen",
  "nameEn": "Seated Leg Curl",
  "pattern": "knee_flexion",
  "primaryMuscles": [
   "Hamstrings"
  ],
  "secondaryMuscles": [],
  "equipment": "machine",
  "level": "beginner",
  "mechanics": "isolation",
  "repRange": "8-15",
  "steps": [
   "Oberschenkelpolster fixieren, Rücken anlehnen",
   "Polster über den Fersen",
   "Fersen unter den Sitz ziehen",
   "Langsam zurück in die Dehnung"
  ],
  "gruppe": "beine",
  "video": {
   "id": "-it_EmIE-KY",
   "titel": "Beinbeuger Maschine sitzend - Einstellen und Ausführungen",
   "kanal": "Crimefood",
   "dauer": "0:50"
  }
 },
 {
  "id": "nordic-curl",
  "name": "Nordic Curl",
  "nameEn": "Nordic Hamstring Curl",
  "pattern": "knee_flexion",
  "primaryMuscles": [
   "Hamstrings"
  ],
  "secondaryMuscles": [
   "Gluteus"
  ],
  "equipment": "bodyweight",
  "level": "advanced",
  "mechanics": "isolation",
  "repRange": "3-8",
  "steps": [
   "Knie auf Polster, Füße fixieren",
   "Körper von Knien bis Kopf gerade halten",
   "So weit wie möglich kontrolliert nach vorn sinken",
   "Mit den Händen abfangen und hochdrücken"
  ],
  "gruppe": "beine",
  "video": {
   "id": "o7jQAybwOkI",
   "titel": "Wie du endlich einen NORDIC HAMSTRING CURL schaffst 🦵",
   "kanal": "AthletenFundament",
   "dauer": "2:28"
  }
 },
 {
  "id": "wadenheben-stehend",
  "name": "Wadenheben stehend",
  "nameEn": "Standing Calf Raise",
  "pattern": "calves",
  "primaryMuscles": [
   "Gastrocnemius"
  ],
  "secondaryMuscles": [
   "Soleus"
  ],
  "equipment": "machine",
  "level": "beginner",
  "mechanics": "isolation",
  "repRange": "8-15",
  "steps": [
   "Ballen auf die Kante, Fersen frei",
   "Knie fast gestreckt",
   "Fersen hochdrücken, oben 1 Sekunde halten",
   "Unten tief dehnen"
  ],
  "gruppe": "beine",
  "video": {
   "id": "_wsvpUWe9VA",
   "titel": "Wadenheben stehend richtig ausführen / Waden trainieren | Doc.Mischa",
   "kanal": "Doc.Mischa",
   "dauer": "3:17"
  }
 },
 {
  "id": "wadenheben-sitzend",
  "name": "Wadenheben sitzend",
  "nameEn": "Seated Calf Raise",
  "pattern": "calves",
  "primaryMuscles": [
   "Soleus"
  ],
  "secondaryMuscles": [
   "Gastrocnemius"
  ],
  "equipment": "machine",
  "level": "beginner",
  "mechanics": "isolation",
  "repRange": "10-20",
  "steps": [
   "Polster auf die Oberschenkel, Ballen auf die Kante",
   "Fersen absenken bis zur Dehnung",
   "Hochdrücken, oben halten",
   "Langsam zurück"
  ],
  "gruppe": "beine",
  "video": {
   "id": "Tu8b-g6GBdU",
   "titel": "Sitzendes Wadenheben - Hammer Strength Seated Calf Raise",
   "kanal": "Power & Fitness",
   "dauer": "1:27"
  }
 },
 {
  "id": "adduktorenmaschine",
  "name": "Adduktorenmaschine",
  "nameEn": "Hip Adduction Machine",
  "pattern": "hip_abd_add",
  "primaryMuscles": [
   "Adduktoren"
  ],
  "secondaryMuscles": [],
  "equipment": "machine",
  "level": "beginner",
  "mechanics": "isolation",
  "repRange": "10-15",
  "steps": [
   "Beine an den Polstern, Rücken angelehnt",
   "Aufrecht sitzen",
   "Beine kontrolliert zusammenführen",
   "Langsam öffnen"
  ],
  "gruppe": "beine",
  "video": {
   "id": "Vx8xOogv-og",
   "titel": "Tutorial Adduktoren Maschine",
   "kanal": "Trainingslab",
   "dauer": "0:56"
  }
 },
 {
  "id": "abduktorenmaschine",
  "name": "Abduktorenmaschine",
  "nameEn": "Hip Abduction Machine",
  "pattern": "hip_abd_add",
  "primaryMuscles": [
   "Gluteus medius"
  ],
  "secondaryMuscles": [],
  "equipment": "machine",
  "level": "beginner",
  "mechanics": "isolation",
  "repRange": "12-20",
  "steps": [
   "Rücken angelehnt, Polster außen an den Knien",
   "Becken stabil halten",
   "Beine nach außen drücken",
   "Langsam zurückführen"
  ],
  "gruppe": "beine",
  "video": {
   "id": "POS16oxNSGY",
   "titel": "Nautilus Hip-Abduction - How to use - Hüft-Abduktion an der Maschine",
   "kanal": "adam&eve Fitness",
   "dauer": "1:23"
  }
 },
 {
  "id": "bankdruecken",
  "name": "Bankdrücken",
  "nameEn": "Barbell Bench Press",
  "pattern": "horizontal_push",
  "primaryMuscles": [
   "Brust"
  ],
  "secondaryMuscles": [
   "Trizeps",
   "vordere Schulter"
  ],
  "equipment": "barbell",
  "level": "intermediate",
  "mechanics": "compound",
  "repRange": "5-10",
  "steps": [
   "Schulterblätter zusammen und nach unten, Füße fest am Boden",
   "Stange über der Brust greifen, etwas breiter als schulterbreit",
   "Zur unteren Brust absenken, Ellbogen ca. 45 Grad",
   "Kraftvoll nach oben drücken"
  ],
  "gruppe": "brust",
  "video": {
   "id": "2qOOGrcxuTE",
   "titel": "BANKDRÜCKEN | Richtige Ausführung mit Lang- und Kurzhanteln | Technik Tutorial und Fehlerquellen",
   "kanal": "Coach Stef",
   "dauer": "7:55"
  }
 },
 {
  "id": "schraegbankdruecken",
  "name": "Schrägbankdrücken",
  "nameEn": "Incline Bench Press",
  "pattern": "incline_push",
  "primaryMuscles": [
   "obere Brust"
  ],
  "secondaryMuscles": [
   "Trizeps",
   "vordere Schulter"
  ],
  "equipment": "barbell",
  "level": "intermediate",
  "mechanics": "compound",
  "repRange": "6-10",
  "steps": [
   "Bank auf ca. 30 Grad, Schulterblätter zusammen",
   "Stange zur oberen Brust absenken",
   "Ellbogen nicht zu weit nach außen",
   "Nach oben drücken"
  ],
  "gruppe": "brust",
  "video": {
   "id": "SzLK0Rr1P4w",
   "titel": "Positives Bankdrücken (Technik Tutorial) | Schrägbank mit Kurzhantel und Langhantel | Obere Brust",
   "kanal": "Coach Stef",
   "dauer": "8:20"
  }
 },
 {
  "id": "kurzhantel-bankdruecken",
  "name": "Kurzhantel-Bankdrücken",
  "nameEn": "Dumbbell Bench Press",
  "pattern": "horizontal_push",
  "primaryMuscles": [
   "Brust"
  ],
  "secondaryMuscles": [
   "Trizeps",
   "vordere Schulter"
  ],
  "equipment": "dumbbell",
  "level": "beginner",
  "mechanics": "compound",
  "repRange": "8-12",
  "steps": [
   "Hanteln über der Brust, Schulterblätter zusammen",
   "Kontrolliert tief absenken bis zur Dehnung",
   "Ellbogen ca. 45 Grad zum Körper",
   "Nach oben drücken"
  ],
  "gruppe": "brust",
  "video": {
   "id": "m_lhdbLuU1w",
   "titel": "Kurzhantel-Bankdrücken – Ausführung und Technik",
   "kanal": "Crimefood",
   "dauer": "1:12"
  }
 },
 {
  "id": "kurzhantel-schraegbankdruecken",
  "name": "Kurzhantel-Schrägbankdrücken",
  "nameEn": "Incline Dumbbell Press",
  "pattern": "incline_push",
  "primaryMuscles": [
   "obere Brust"
  ],
  "secondaryMuscles": [
   "Trizeps",
   "vordere Schulter"
  ],
  "equipment": "dumbbell",
  "level": "beginner",
  "mechanics": "compound",
  "repRange": "8-12",
  "steps": [
   "Bank auf ca. 30 Grad",
   "Hanteln über der oberen Brust",
   "Kontrolliert absenken",
   "Zur Mitte hochdrücken"
  ],
  "gruppe": "brust",
  "video": {
   "id": "fw9VGqMXBmg",
   "titel": "Kurzhantel Schrägbankdrücken - die richtige Ausführung",
   "kanal": "Crimefood",
   "dauer": "0:57"
  }
 },
 {
  "id": "brustpresse",
  "name": "Brustpresse",
  "nameEn": "Machine Chest Press",
  "pattern": "horizontal_push",
  "primaryMuscles": [
   "Brust"
  ],
  "secondaryMuscles": [
   "Trizeps"
  ],
  "equipment": "machine",
  "level": "beginner",
  "mechanics": "compound",
  "repRange": "8-15",
  "steps": [
   "Sitz so einstellen, dass Griffe auf Brusthöhe liegen",
   "Schulterblätter an die Lehne",
   "Nach vorn drücken",
   "Kontrolliert zurückführen"
  ],
  "gruppe": "brust",
  "video": {
   "id": "lzStaoQuFG8",
   "titel": "Brustpresse - Einstellung und Ausführung",
   "kanal": "Crimefood",
   "dauer": "0:58"
  }
 },
 {
  "id": "liegestuetz",
  "name": "Liegestütz",
  "nameEn": "Push-Up",
  "pattern": "horizontal_push",
  "primaryMuscles": [
   "Brust"
  ],
  "secondaryMuscles": [
   "Trizeps",
   "vordere Schulter",
   "Rumpf"
  ],
  "equipment": "bodyweight",
  "level": "beginner",
  "mechanics": "compound",
  "repRange": "8-20",
  "steps": [
   "Hände etwas breiter als schulterbreit",
   "Körper in einer Linie, Bauch und Gesäß fest",
   "Brust zum Boden absenken",
   "Wegdrücken"
  ],
  "gruppe": "brust",
  "video": {
   "id": "H6Pq6i7xAv4",
   "titel": "Liegestütz richtige Ausführung – Lernen für Anfänger",
   "kanal": "Kraftschule.TV",
   "dauer": "2:57"
  }
 },
 {
  "id": "dips",
  "name": "Dips",
  "nameEn": "Dips",
  "pattern": "horizontal_push",
  "primaryMuscles": [
   "Brust",
   "Trizeps"
  ],
  "secondaryMuscles": [
   "vordere Schulter"
  ],
  "equipment": "bodyweight",
  "level": "intermediate",
  "mechanics": "compound",
  "repRange": "6-12",
  "steps": [
   "Stützen, Schultern tief halten",
   "Leicht nach vorn lehnen",
   "Ellbogen beugen bis ca. 90 Grad",
   "Hochdrücken"
  ],
  "gruppe": "brust",
  "video": {
   "id": "G7UrORTh_FA",
   "titel": "DIPS für Brust oder Trizeps - Welche Variante? Korrekte Ausführung und Technik Tutorial",
   "kanal": "Coach Stef",
   "dauer": "5:13"
  }
 },
 {
  "id": "fliegende-kurzhantel",
  "name": "Fliegende (Kurzhantel)",
  "nameEn": "Dumbbell Fly",
  "pattern": "chest_isolation",
  "primaryMuscles": [
   "Brust"
  ],
  "secondaryMuscles": [],
  "equipment": "dumbbell",
  "level": "intermediate",
  "mechanics": "isolation",
  "repRange": "10-15",
  "steps": [
   "Hanteln über der Brust, Ellbogen leicht gebeugt",
   "Arme in einem Bogen öffnen",
   "Bis zur Dehnung absenken",
   "Bogen zurück zusammenführen"
  ],
  "gruppe": "brust",
  "video": {
   "id": "Hj7PUaz6YAc",
   "titel": "Fliegende mit der Kurzhantel: Ausführung - richtige Technik und Übungsausführung",
   "kanal": "Fitshop ",
   "dauer": "1:05"
  }
 },
 {
  "id": "cable-crossover",
  "name": "Cable Crossover",
  "nameEn": "Cable Crossover",
  "pattern": "chest_isolation",
  "primaryMuscles": [
   "Brust"
  ],
  "secondaryMuscles": [],
  "equipment": "cable",
  "level": "beginner",
  "mechanics": "isolation",
  "repRange": "10-15",
  "steps": [
   "Seile hoch einstellen, ein Fuß vor",
   "Leichte Beugung der Ellbogen",
   "Arme in einem Bogen vor der Brust zusammenführen",
   "Kontrolliert öffnen"
  ],
  "gruppe": "brust",
  "video": {
   "id": "0jI4CH6taEs",
   "titel": "CABLE CROSS richtige Ausführung (Technik Tutorial) | So triffst du deine BRUST richtig!",
   "kanal": "Coach Stef",
   "dauer": "5:35"
  }
 },
 {
  "id": "butterfly-maschine",
  "name": "Butterfly-Maschine",
  "nameEn": "Pec Deck",
  "pattern": "chest_isolation",
  "primaryMuscles": [
   "Brust"
  ],
  "secondaryMuscles": [],
  "equipment": "machine",
  "level": "beginner",
  "mechanics": "isolation",
  "repRange": "10-15",
  "steps": [
   "Sitzhöhe: Griffe auf Brusthöhe",
   "Schultern nach hinten unten",
   "Arme zusammenführen",
   "Langsam öffnen"
  ],
  "gruppe": "brust",
  "video": {
   "id": "y5Z4V_cBDoE",
   "titel": "Die richtige Haltung bei Butterfly (Fly) an der Maschine - Technikcheck",
   "kanal": "Power & Fitness",
   "dauer": "1:00"
  }
 },
 {
  "id": "schulterdruecken-langhantel",
  "name": "Schulterdrücken (Langhantel)",
  "nameEn": "Overhead Press",
  "pattern": "vertical_push",
  "primaryMuscles": [
   "vordere Schulter",
   "seitliche Schulter"
  ],
  "secondaryMuscles": [
   "Trizeps",
   "Rumpf"
  ],
  "equipment": "barbell",
  "level": "intermediate",
  "mechanics": "compound",
  "repRange": "5-10",
  "steps": [
   "Stange auf Schulterhöhe, Gesäß und Bauch fest",
   "Stange senkrecht über dem Mittelfuß hochdrücken",
   "Kopf nach hinten bewegen, oben wieder nach vorn",
   "Kontrolliert zurück"
  ],
  "gruppe": "schultern",
  "video": {
   "id": "uaHATAcsd6k",
   "titel": "Schulterdrücken | Überkopfdrücken | Military Press - richtige Ausführung & Technik!",
   "kanal": "BroSep",
   "dauer": "8:41"
  }
 },
 {
  "id": "schulterdruecken-kurzhantel",
  "name": "Schulterdrücken (Kurzhantel)",
  "nameEn": "Dumbbell Shoulder Press",
  "pattern": "vertical_push",
  "primaryMuscles": [
   "vordere Schulter",
   "seitliche Schulter"
  ],
  "secondaryMuscles": [
   "Trizeps"
  ],
  "equipment": "dumbbell",
  "level": "beginner",
  "mechanics": "compound",
  "repRange": "8-12",
  "steps": [
   "Hanteln auf Schulterhöhe, Unterarme senkrecht",
   "Bauch anspannen",
   "Über dem Kopf zusammenführen",
   "Kontrolliert absenken"
  ],
  "gruppe": "schultern",
  "video": {
   "id": "rvPefutmJ4g",
   "titel": "Schulterdrücken mit Kurzhanteln - Ausführung im Sitzen",
   "kanal": "Crimefood",
   "dauer": "1:26"
  }
 },
 {
  "id": "arnold-press",
  "name": "Arnold Press",
  "nameEn": "Arnold Press",
  "pattern": "vertical_push",
  "primaryMuscles": [
   "Schulter"
  ],
  "secondaryMuscles": [
   "Trizeps"
  ],
  "equipment": "dumbbell",
  "level": "intermediate",
  "mechanics": "compound",
  "repRange": "8-12",
  "steps": [
   "Hanteln vor der Brust, Handflächen zu dir",
   "Beim Hochdrücken nach außen drehen",
   "Oben Arme strecken",
   "Rückwärts drehen und absenken"
  ],
  "gruppe": "schultern",
  "video": {
   "id": "NHxcbTp6fWA",
   "titel": "Arnold Press - richtige Technik",
   "kanal": "BODY IP by Simon Teichmann",
   "dauer": "5:58"
  }
 },
 {
  "id": "seitheben",
  "name": "Seitheben",
  "nameEn": "Lateral Raise",
  "pattern": "shoulder_isolation",
  "primaryMuscles": [
   "seitliche Schulter"
  ],
  "secondaryMuscles": [],
  "equipment": "dumbbell",
  "level": "beginner",
  "mechanics": "isolation",
  "repRange": "10-20",
  "steps": [
   "Leichte Beugung der Ellbogen",
   "Ellbogen führen die Bewegung",
   "Bis Schulterhöhe heben",
   "Langsam absenken"
  ],
  "gruppe": "schultern",
  "video": {
   "id": "iT--Sq-G06M",
   "titel": "Seitheben (Technik Tutorial) | Richtige Ausführung und Fehlerquellen | Seitliche Schulter trainieren",
   "kanal": "Coach Stef",
   "dauer": "7:07"
  }
 },
 {
  "id": "seitheben-kabel",
  "name": "Seitheben am Kabel",
  "nameEn": "Cable Lateral Raise",
  "pattern": "shoulder_isolation",
  "primaryMuscles": [
   "seitliche Schulter"
  ],
  "secondaryMuscles": [],
  "equipment": "cable",
  "level": "intermediate",
  "mechanics": "isolation",
  "repRange": "10-20",
  "steps": [
   "Seil seitlich tief einstellen",
   "Arm leicht gebeugt",
   "Seitlich bis Schulterhöhe heben",
   "Langsam zurück"
  ],
  "gruppe": "schultern",
  "video": {
   "id": "pwMrkJwjevw",
   "titel": "Einarmiges Seitheben am Kabelzug - Ausführung",
   "kanal": "Crimefood",
   "dauer": "0:55"
  }
 },
 {
  "id": "reverse-fly",
  "name": "Reverse Fly",
  "nameEn": "Reverse Fly",
  "pattern": "shoulder_isolation",
  "primaryMuscles": [
   "hintere Schulter"
  ],
  "secondaryMuscles": [
   "Rhomboiden",
   "Trapez"
  ],
  "equipment": "dumbbell",
  "level": "beginner",
  "mechanics": "isolation",
  "repRange": "12-20",
  "steps": [
   "Oberkörper vorgebeugt, Rücken gerade",
   "Arme leicht gebeugt",
   "Seitlich nach oben öffnen",
   "Schulterblätter zusammen, langsam zurück"
  ],
  "gruppe": "schultern",
  "video": {
   "id": "uXFjLXgIcYc",
   "titel": "Butterfly Reverse (Technik Tutorial) | Hintere Schulter trainieren | Richtige Ausführung",
   "kanal": "Coach Stef",
   "dauer": "3:25"
  }
 },
 {
  "id": "face-pull",
  "name": "Face Pull",
  "nameEn": "Face Pull",
  "pattern": "horizontal_pull",
  "primaryMuscles": [
   "hintere Schulter",
   "Trapez"
  ],
  "secondaryMuscles": [
   "Rotatorenmanschette"
  ],
  "equipment": "cable",
  "level": "beginner",
  "mechanics": "compound",
  "repRange": "12-20",
  "steps": [
   "Seil auf Gesichtshöhe, Griff übereinander",
   "Ellbogen hoch",
   "Seil zur Stirn ziehen, Enden auseinander",
   "Kontrolliert zurück"
  ],
  "gruppe": "ruecken",
  "video": {
   "id": "_7SE2TTXmvQ",
   "titel": "How-To: Face Pulls am Kabelzug  I #6",
   "kanal": "Fitness First Germany",
   "dauer": "1:35"
  }
 },
 {
  "id": "klimmzug",
  "name": "Klimmzug",
  "nameEn": "Pull-Up",
  "pattern": "vertical_pull",
  "primaryMuscles": [
   "Latissimus"
  ],
  "secondaryMuscles": [
   "Bizeps",
   "Rhomboiden"
  ],
  "equipment": "bodyweight",
  "level": "intermediate",
  "mechanics": "compound",
  "repRange": "5-12",
  "steps": [
   "Griff etwas breiter als schulterbreit",
   "Schulterblätter nach unten ziehen",
   "Brust zur Stange ziehen",
   "Kontrolliert absenken"
  ],
  "gruppe": "ruecken",
  "video": {
   "id": "Fo93XyyqGhQ",
   "titel": "Klimmzug Technik – Klimmzüge richtig machen – Lernen für Anfänger",
   "kanal": "Kraftschule.TV",
   "dauer": "4:30"
  }
 },
 {
  "id": "klimmzug-untergriff",
  "name": "Klimmzug Untergriff",
  "nameEn": "Chin-Up",
  "pattern": "vertical_pull",
  "primaryMuscles": [
   "Latissimus",
   "Bizeps"
  ],
  "secondaryMuscles": [
   "Rhomboiden"
  ],
  "equipment": "bodyweight",
  "level": "intermediate",
  "mechanics": "compound",
  "repRange": "5-12",
  "steps": [
   "Untergriff schulterbreit",
   "Schulterblätter nach unten",
   "Kinn über die Stange",
   "Langsam absenken"
  ],
  "gruppe": "ruecken",
  "video": {
   "id": "eACIyl9jTK8",
   "titel": "Tutorial: Klimmzüge für Anfänger - richtige Ausführung & Technik 💪",
   "kanal": "FIT FOR FUN",
   "dauer": "1:23"
  }
 },
 {
  "id": "klimmzug-breit",
  "name": "Klimmzug breit",
  "nameEn": "Wide-Grip Pull-Up",
  "pattern": "vertical_pull",
  "primaryMuscles": [
   "Latissimus"
  ],
  "secondaryMuscles": [
   "Rhomboiden",
   "Bizeps",
   "Trapez"
  ],
  "equipment": "bodyweight",
  "level": "advanced",
  "mechanics": "compound",
  "repRange": "4-10",
  "steps": [
   "Obergriff deutlich breiter als schulterbreit, Daumen um die Stange",
   "Schulterblätter zuerst nach unten ziehen, Rumpf anspannen",
   "Brust zur Stange ziehen, Ellbogen zeigen nach unten",
   "Kontrolliert bis zu gestreckten Armen absenken"
  ],
  "gruppe": "ruecken",
  "video": {
   "id": "ORrfqAMrv4Y",
   "titel": "Welcher GRIFF beim KLIMMZUG für welchen MUSKEL?",
   "kanal": "Coach Stef",
   "dauer": "5:20"
  }
 },
 {
  "id": "klimmzug-eng",
  "name": "Klimmzug eng",
  "nameEn": "Close-Grip Pull-Up",
  "pattern": "vertical_pull",
  "primaryMuscles": [
   "Latissimus",
   "Bizeps"
  ],
  "secondaryMuscles": [
   "Rhomboiden",
   "Unterarme"
  ],
  "equipment": "bodyweight",
  "level": "advanced",
  "mechanics": "compound",
  "repRange": "4-10",
  "steps": [
   "Enger Griff, die Hände etwa eine Handbreit auseinander, Handflächen zueinander",
   "Schulterblätter nach unten ziehen, Rumpf anspannen",
   "Ellbogen nah am Körper nach unten ziehen, bis das Kinn über den Händen ist",
   "Langsam absenken"
  ],
  "gruppe": "ruecken",
  "video": {
   "id": "kzW0g9BsJt8",
   "titel": "Klimmzug - enger Griff - neutral",
   "kanal": "INandGo Personal Training",
   "dauer": "0:17"
  }
 },
 {
  "id": "klimmzug-breit-maschine",
  "name": "Klimmzug breit mit Unterstützung (Maschine)",
  "nameEn": "Assisted Wide-Grip Pull-Up (Machine)",
  "pattern": "vertical_pull",
  "primaryMuscles": [
   "Latissimus"
  ],
  "secondaryMuscles": [
   "Rhomboiden",
   "Bizeps"
  ],
  "equipment": "machine",
  "level": "beginner",
  "mechanics": "compound",
  "repRange": "8-12",
  "steps": [
   "Gewicht so wählen, dass du acht saubere Wiederholungen schaffst",
   "Knie auf die Plattform, breiter Obergriff",
   "Schulterblätter nach unten, Brust zu den Griffen ziehen",
   "Kontrolliert strecken, ohne in die Schultern zu hängen"
  ],
  "gruppe": "ruecken",
  "video": {
   "id": "2xWqH_nmcCo",
   "titel": "Übungspool A: Rücken Klimmzug am Gravitron mit breitem Griff",
   "kanal": "Jörg Jensen",
   "dauer": "3:55"
  }
 },
 {
  "id": "klimmzug-eng-maschine",
  "name": "Klimmzug eng mit Unterstützung (Maschine)",
  "nameEn": "Assisted Close-Grip Pull-Up (Machine)",
  "pattern": "vertical_pull",
  "primaryMuscles": [
   "Latissimus",
   "Bizeps"
  ],
  "secondaryMuscles": [
   "Rhomboiden",
   "Unterarme"
  ],
  "equipment": "machine",
  "level": "beginner",
  "mechanics": "compound",
  "repRange": "8-12",
  "steps": [
   "Gewicht so wählen, dass du acht saubere Wiederholungen schaffst",
   "Knie auf die Plattform, enger Griff an den schmalen Griffen",
   "Ellbogen nah am Körper nach unten ziehen",
   "Kontrolliert strecken, ohne in die Schultern zu hängen"
  ],
  "gruppe": "ruecken",
  "video": {
   "id": "gx0RWT7WbmA",
   "titel": "How To PROPERLY Use The Assisted Pull Up Machine (DO MORE PULL UPS)",
   "kanal": "Colossus Fitness",
   "dauer": "2:54"
  }
 },
 {
  "id": "klimmzug-breit-band",
  "name": "Klimmzug breit mit Unterstützung (Band)",
  "nameEn": "Band-Assisted Wide-Grip Pull-Up",
  "pattern": "vertical_pull",
  "primaryMuscles": [
   "Latissimus"
  ],
  "secondaryMuscles": [
   "Rhomboiden",
   "Bizeps",
   "Trapez"
  ],
  "equipment": "resistance_band",
  "level": "intermediate",
  "mechanics": "compound",
  "repRange": "6-10",
  "steps": [
   "Band fest um die Stange schlingen, Fuß in die Schlaufe stellen",
   "Breiter Obergriff, Schulterblätter nach unten ziehen",
   "Brust zur Stange ziehen, Ellbogen nach unten",
   "Kontrolliert absenken, nicht im Band abfedern"
  ],
  "gruppe": "ruecken",
  "video": {
   "id": "nbqmasmjBNU",
   "titel": "Die 2 BESTEN Mehoden | Klimmzüge mit einem Widerstandsband lernen",
   "kanal": "Marcus Mohs - Calisthenics & Fitness",
   "dauer": "4:45"
  }
 },
 {
  "id": "klimmzug-eng-band",
  "name": "Klimmzug eng mit Unterstützung (Band)",
  "nameEn": "Band-Assisted Close-Grip Pull-Up",
  "pattern": "vertical_pull",
  "primaryMuscles": [
   "Latissimus",
   "Bizeps"
  ],
  "secondaryMuscles": [
   "Rhomboiden",
   "Unterarme"
  ],
  "equipment": "resistance_band",
  "level": "intermediate",
  "mechanics": "compound",
  "repRange": "6-10",
  "steps": [
   "Band fest um die Stange schlingen, Knie in die Schlaufe stellen",
   "Enger Griff, Schulterblätter nach unten ziehen",
   "Ellbogen nah am Körper nach unten ziehen",
   "Kontrolliert absenken, nicht im Band abfedern"
  ],
  "gruppe": "ruecken",
  "video": {
   "id": "0W0tKv6HaiY",
   "titel": "Darauf solltest du achten, wenn du Klimmzüge mit Resistance Bändern trainierst!",
   "kanal": "Flex Calisthenics",
   "dauer": "6:45"
  }
 },
 {
  "id": "latzug",
  "name": "Latzug",
  "nameEn": "Lat Pulldown",
  "pattern": "vertical_pull",
  "primaryMuscles": [
   "Latissimus"
  ],
  "secondaryMuscles": [
   "Bizeps",
   "Rhomboiden"
  ],
  "equipment": "cable",
  "level": "beginner",
  "mechanics": "compound",
  "repRange": "8-12",
  "steps": [
   "Oberschenkel unter das Polster, Brust hoch",
   "Stange breit greifen",
   "Zur oberen Brust ziehen",
   "Kontrolliert zurück"
  ],
  "gruppe": "ruecken",
  "video": {
   "id": "JUruRn5Y6Zc",
   "titel": "Latzug (Technik Tutorial) | Richtige Ausführung | Häufige Fehler | Oberen Rücken trainieren",
   "kanal": "Coach Stef",
   "dauer": "3:57"
  }
 },
 {
  "id": "latzug-enger-griff",
  "name": "Latzug enger Griff",
  "nameEn": "Close-Grip Pulldown",
  "pattern": "vertical_pull",
  "primaryMuscles": [
   "Latissimus"
  ],
  "secondaryMuscles": [
   "Bizeps"
  ],
  "equipment": "cable",
  "level": "beginner",
  "mechanics": "compound",
  "repRange": "8-12",
  "steps": [
   "Enger Griff, Brust hoch",
   "Leicht zurücklehnen",
   "Ellbogen nah am Körper nach unten ziehen",
   "Langsam zurück"
  ],
  "gruppe": "ruecken",
  "video": {
   "id": "cVm1lvIalxA",
   "titel": "Latzug enger Griff! Die richtige Ausführung? Breiter Rücken mit diesem Latzug Tutorial",
   "kanal": "HERO Workout",
   "dauer": "0:48"
  }
 },
 {
  "id": "rudern-langhantel",
  "name": "Rudern vorgebeugt (Langhantel)",
  "nameEn": "Barbell Row",
  "pattern": "horizontal_pull",
  "primaryMuscles": [
   "Latissimus",
   "Rhomboiden",
   "Trapez"
  ],
  "secondaryMuscles": [
   "Bizeps",
   "Rückenstrecker"
  ],
  "equipment": "barbell",
  "level": "intermediate",
  "mechanics": "compound",
  "repRange": "6-10",
  "steps": [
   "Oberkörper vorgebeugt, Rücken gerade",
   "Stange hängt unter den Schultern",
   "Zum Bauchnabel ziehen",
   "Kontrolliert absenken"
  ],
  "gruppe": "ruecken",
  "video": {
   "id": "uBbrwcr92Hw",
   "titel": "Langhantel Rudern (Technik Tutorial) | Verschiedene Griffe und häufige Fehler",
   "kanal": "Coach Stef",
   "dauer": "4:53"
  }
 },
 {
  "id": "rudern-kurzhantel",
  "name": "Einarmiges Kurzhantelrudern",
  "nameEn": "One-Arm Dumbbell Row",
  "pattern": "horizontal_pull",
  "primaryMuscles": [
   "Latissimus"
  ],
  "secondaryMuscles": [
   "Rhomboiden",
   "Bizeps"
  ],
  "equipment": "dumbbell",
  "level": "beginner",
  "mechanics": "compound",
  "repRange": "8-12",
  "steps": [
   "Eine Hand und ein Knie auf die Bank",
   "Rücken gerade",
   "Ellbogen zur Hüfte ziehen",
   "Langsam absenken"
  ],
  "gruppe": "ruecken",
  "video": {
   "id": "Ccs4xNjkxdA",
   "titel": "Einarmiges Kurzhantel Rudern (Technik Tutorial) | Richtige Ausführung und häufige Fehler",
   "kanal": "Coach Stef",
   "dauer": "3:11"
  }
 },
 {
  "id": "rudern-kabel",
  "name": "Rudern am Kabel (sitzend)",
  "nameEn": "Seated Cable Row",
  "pattern": "horizontal_pull",
  "primaryMuscles": [
   "Latissimus",
   "Rhomboiden"
  ],
  "secondaryMuscles": [
   "Bizeps"
  ],
  "equipment": "cable",
  "level": "beginner",
  "mechanics": "compound",
  "repRange": "8-12",
  "steps": [
   "Aufrecht sitzen, Brust hoch",
   "Griff zum Bauch ziehen",
   "Schulterblätter zusammen",
   "Arme langsam strecken"
  ],
  "gruppe": "ruecken",
  "video": {
   "id": "bq0Siy5s5WY",
   "titel": "Ruderzug (Technik Tutorial) | Am Kabelzug mit engem Griff | Oberen Rücken trainieren | Rudern",
   "kanal": "Coach Stef",
   "dauer": "2:48"
  }
 },
 {
  "id": "t-bar-rudern",
  "name": "T-Bar-Rudern",
  "nameEn": "T-Bar Row",
  "pattern": "horizontal_pull",
  "primaryMuscles": [
   "Latissimus",
   "Rhomboiden"
  ],
  "secondaryMuscles": [
   "Bizeps",
   "Trapez"
  ],
  "equipment": "machine",
  "level": "intermediate",
  "mechanics": "compound",
  "repRange": "8-12",
  "steps": [
   "Brust auf das Polster oder leicht vorgebeugt",
   "Rücken gerade",
   "Zum Oberkörper ziehen",
   "Kontrolliert zurück"
  ],
  "gruppe": "ruecken",
  "video": {
   "id": "I9fjj29fLWQ",
   "titel": "T-Bar Rudern aufgelegt für einen starken Rücken! | Ausführung & Technik | Doc.Mischa",
   "kanal": "Doc.Mischa",
   "dauer": "6:59"
  }
 },
 {
  "id": "brustgestuetztes-rudern",
  "name": "Brustgestütztes Rudern",
  "nameEn": "Chest-Supported Row",
  "pattern": "horizontal_pull",
  "primaryMuscles": [
   "Rhomboiden",
   "Latissimus"
  ],
  "secondaryMuscles": [
   "Bizeps"
  ],
  "equipment": "machine",
  "level": "beginner",
  "mechanics": "compound",
  "repRange": "8-12",
  "steps": [
   "Brust ans Polster, Griffe fassen",
   "Schulterblätter zusammenziehen",
   "Ellbogen nach hinten ziehen",
   "Langsam strecken"
  ],
  "gruppe": "ruecken",
  "video": {
   "id": "qPiF6y_HOBs",
   "titel": "Rudermaschine, richtige Ausführung und Technik (Tutorial) Muskel richtig treffen und ansteuern",
   "kanal": "Muscle Man Fitness by Shaun",
   "dauer": "1:31"
  }
 },
 {
  "id": "straight-arm-pulldown",
  "name": "Straight-Arm Pulldown",
  "nameEn": "Straight-Arm Pulldown",
  "pattern": "vertical_pull",
  "primaryMuscles": [
   "Latissimus"
  ],
  "secondaryMuscles": [],
  "equipment": "cable",
  "level": "intermediate",
  "mechanics": "isolation",
  "repRange": "10-15",
  "steps": [
   "Seil hoch, Arme fast gestreckt",
   "Leicht vorgebeugt",
   "Mit gestreckten Armen zur Hüfte ziehen",
   "Langsam zurück"
  ],
  "gruppe": "ruecken",
  "video": {
   "id": "G9uNaXGTJ4w",
   "titel": "Straight Arm Pulldown",
   "kanal": "Renaissance Periodization",
   "dauer": "0:12"
  }
 },
 {
  "id": "kurzhantel-shrug",
  "name": "Shrugs",
  "nameEn": "Dumbbell Shrug",
  "pattern": "shoulder_isolation",
  "primaryMuscles": [
   "Trapez"
  ],
  "secondaryMuscles": [],
  "equipment": "dumbbell",
  "level": "beginner",
  "mechanics": "isolation",
  "repRange": "10-15",
  "steps": [
   "Hanteln seitlich halten",
   "Schultern gerade nach oben ziehen",
   "Oben kurz halten",
   "Langsam absenken"
  ],
  "gruppe": "schultern",
  "video": {
   "id": "A-Xfh_JzB9s",
   "titel": "Kurzhantel Shrugs richtig ausführen | Form & Technik",
   "kanal": "Myprotein Deutschland",
   "dauer": "4:04"
  }
 },
 {
  "id": "langhantel-curl",
  "name": "Langhantel-Curl",
  "nameEn": "Barbell Curl",
  "pattern": "elbow_flexion",
  "primaryMuscles": [
   "Bizeps"
  ],
  "secondaryMuscles": [
   "Unterarme"
  ],
  "equipment": "barbell",
  "level": "beginner",
  "mechanics": "isolation",
  "repRange": "8-12",
  "steps": [
   "Aufrecht, Ellbogen am Körper",
   "Stange zur Schulter curlen",
   "Oben anspannen",
   "Langsam absenken"
  ],
  "gruppe": "arme",
  "video": {
   "id": "NFk2iaEW0JI",
   "titel": "Langhantel Curls - Diese Fehler solltest du vermeiden!",
   "kanal": "Flavio Simonetti",
   "dauer": "3:42"
  }
 },
 {
  "id": "kurzhantel-curl",
  "name": "Kurzhantel-Curl",
  "nameEn": "Dumbbell Curl",
  "pattern": "elbow_flexion",
  "primaryMuscles": [
   "Bizeps"
  ],
  "secondaryMuscles": [
   "Unterarme"
  ],
  "equipment": "dumbbell",
  "level": "beginner",
  "mechanics": "isolation",
  "repRange": "8-12",
  "steps": [
   "Aufrecht, Hanteln seitlich",
   "Ellbogen fest am Körper",
   "Zur Schulter curlen",
   "Langsam absenken"
  ],
  "gruppe": "arme",
  "video": {
   "id": "UyYWfZ5ifKg",
   "titel": "Bizeps Curls richtig machen (Technik Tutorial) | Häufige Fehler vermeiden",
   "kanal": "Coach Stef",
   "dauer": "7:20"
  }
 },
 {
  "id": "hammer-curl",
  "name": "Hammer-Curl",
  "nameEn": "Hammer Curl",
  "pattern": "elbow_flexion",
  "primaryMuscles": [
   "Brachialis",
   "Bizeps"
  ],
  "secondaryMuscles": [
   "Unterarme"
  ],
  "equipment": "dumbbell",
  "level": "beginner",
  "mechanics": "isolation",
  "repRange": "8-12",
  "steps": [
   "Neutraler Griff, Daumen oben",
   "Ellbogen vorne am Körper",
   "Zur Schulter curlen",
   "Kontrolliert absenken"
  ],
  "gruppe": "arme",
  "video": {
   "id": "1Nl_iBxPxbo",
   "titel": "Hammer Curls - Anleitung durch Personal Trainer #bizeps",
   "kanal": "Elite Body",
   "dauer": "0:39"
  }
 },
 {
  "id": "incline-curl",
  "name": "Curl auf der Schrägbank",
  "nameEn": "Incline Dumbbell Curl",
  "pattern": "elbow_flexion",
  "primaryMuscles": [
   "Bizeps"
  ],
  "secondaryMuscles": [],
  "equipment": "dumbbell",
  "level": "intermediate",
  "mechanics": "isolation",
  "repRange": "8-12",
  "steps": [
   "Rücken auf Bank (ca. 60 Grad), Arme hängen",
   "Ellbogen bleiben hinter dem Körper",
   "Hanteln hochcurlen",
   "Langsam absenken"
  ],
  "gruppe": "arme",
  "video": {
   "id": "BNSVMkI5m6Y",
   "titel": "Bizeps Curls auf der Schrägbank, richtige Ausführung und Technik (Tutorial)",
   "kanal": "Muscle Man Fitness by Shaun",
   "dauer": "1:14"
  }
 },
 {
  "id": "preacher-curl",
  "name": "Preacher Curl",
  "nameEn": "Preacher Curl",
  "pattern": "elbow_flexion",
  "primaryMuscles": [
   "Bizeps"
  ],
  "secondaryMuscles": [],
  "equipment": "machine",
  "level": "beginner",
  "mechanics": "isolation",
  "repRange": "8-12",
  "steps": [
   "Oberarme fest aufs Polster",
   "Griff schulterbreit",
   "Hochcurlen",
   "Langsam fast strecken"
  ],
  "gruppe": "arme",
  "video": {
   "id": "U_4PDmcGZQs",
   "titel": "Für einen massiven Bizeps | Preacher Curls",
   "kanal": "Jan Saffe",
   "dauer": "4:42"
  }
 },
 {
  "id": "trizeps-druecken-kabel",
  "name": "Trizepsdrücken am Kabel",
  "nameEn": "Cable Triceps Pushdown",
  "pattern": "elbow_extension",
  "primaryMuscles": [
   "Trizeps"
  ],
  "secondaryMuscles": [],
  "equipment": "cable",
  "level": "beginner",
  "mechanics": "isolation",
  "repRange": "10-15",
  "steps": [
   "Ellbogen fest am Körper",
   "Oberkörper leicht vorgebeugt",
   "Arme nach unten strecken",
   "Kontrolliert zurück"
  ],
  "gruppe": "arme",
  "video": {
   "id": "yk6VdVwww5k",
   "titel": "Trizepsdrücken am Kabel (Technik Tutorial) | Mit dem Seil | Überkopf | Hinteren Trizeps trainieren",
   "kanal": "Coach Stef",
   "dauer": "3:00"
  }
 },
 {
  "id": "french-press",
  "name": "French Press (SZ-Stange)",
  "nameEn": "Skull Crusher",
  "pattern": "elbow_extension",
  "primaryMuscles": [
   "Trizeps"
  ],
  "secondaryMuscles": [],
  "equipment": "barbell",
  "level": "intermediate",
  "mechanics": "isolation",
  "repRange": "8-12",
  "steps": [
   "Liegen, Stange über der Stirn",
   "Oberarme senkrecht",
   "Ellbogen beugen, Stange zur Stirn",
   "Strecken"
  ],
  "gruppe": "arme",
  "video": {
   "id": "8sHAThzVJhA",
   "titel": "French Press mit SZ-Stange - Ausführung",
   "kanal": "Crimefood",
   "dauer": "0:55"
  }
 },
 {
  "id": "overhead-trizeps",
  "name": "Trizepsstrecken über Kopf",
  "nameEn": "Overhead Triceps Extension",
  "pattern": "elbow_extension",
  "primaryMuscles": [
   "Trizeps (langer Kopf)"
  ],
  "secondaryMuscles": [],
  "equipment": "cable",
  "level": "intermediate",
  "mechanics": "isolation",
  "repRange": "10-15",
  "steps": [
   "Seil hinter dem Kopf, Ellbogen nah am Kopf",
   "Aufrecht stehen",
   "Arme nach vorn oben strecken",
   "Kontrolliert zurück"
  ],
  "gruppe": "arme",
  "video": {
   "id": "uapI6ZiE4Sg",
   "titel": "Überkopf-Trizepsdrücken mit dem Seil richtige Ausführung am Kabelzug",
   "kanal": "Peter Burianek",
   "dauer": "1:03"
  }
 },
 {
  "id": "enges-bankdruecken",
  "name": "Enges Bankdrücken",
  "nameEn": "Close-Grip Bench Press",
  "pattern": "horizontal_push",
  "primaryMuscles": [
   "Trizeps",
   "Brust"
  ],
  "secondaryMuscles": [
   "vordere Schulter"
  ],
  "equipment": "barbell",
  "level": "intermediate",
  "mechanics": "compound",
  "repRange": "6-10",
  "steps": [
   "Griff schulterbreit",
   "Ellbogen nah am Körper",
   "Zur unteren Brust absenken",
   "Hochdrücken"
  ],
  "gruppe": "arme",
  "video": {
   "id": "NSdt0lWEhKM",
   "titel": "Enges Bankdrücken richtig ausführen / Engbankdrücken lernen | Doc.Mischa",
   "kanal": "Doc.Mischa",
   "dauer": "6:57"
  }
 },
 {
  "id": "plank",
  "name": "Plank",
  "nameEn": "Plank",
  "pattern": "core_anti_extension",
  "primaryMuscles": [
   "Rumpf"
  ],
  "secondaryMuscles": [
   "Schulter",
   "Gluteus"
  ],
  "equipment": "bodyweight",
  "level": "beginner",
  "mechanics": "isometric",
  "repRange": "20-60s",
  "steps": [
   "Unterarme auf den Boden, Ellbogen unter den Schultern",
   "Körper bildet eine Linie",
   "Bauch und Gesäß anspannen",
   "Atmen und halten"
  ],
  "gruppe": "rumpf",
  "video": {
   "id": "HjzrTRYfOtc",
   "titel": "Tutorial: So geht Plank richtig | InForm by SWR Sport",
   "kanal": "SWR Sport",
   "dauer": "1:01"
  }
 },
 {
  "id": "side-plank",
  "name": "Seitstütz",
  "nameEn": "Side Plank",
  "pattern": "core_anti_lateral",
  "primaryMuscles": [
   "Seitliche Bauchmuskeln"
  ],
  "secondaryMuscles": [
   "Gluteus medius"
  ],
  "equipment": "bodyweight",
  "level": "beginner",
  "mechanics": "isometric",
  "repRange": "20-45s",
  "steps": [
   "Seitlich auf einen Unterarm stützen",
   "Hüfte hochdrücken",
   "Körper in einer Linie halten",
   "Atmen und halten"
  ],
  "gruppe": "rumpf",
  "video": {
   "id": "ZRYKTCGI7BY",
   "titel": "Side Plank: Seitstütz richtig ausführen | Core-Workout für zuhause | AOK",
   "kanal": "AOK - Der Gesundheitskanal",
   "dauer": "0:46"
  }
 },
 {
  "id": "dead-bug",
  "name": "Dead Bug",
  "nameEn": "Dead Bug",
  "pattern": "core_anti_extension",
  "primaryMuscles": [
   "Rumpf"
  ],
  "secondaryMuscles": [
   "Hüftbeuger"
  ],
  "equipment": "bodyweight",
  "level": "beginner",
  "mechanics": "isolation",
  "repRange": "8-12",
  "steps": [
   "Rückenlage, Arme nach oben, Knie 90 Grad",
   "Unterer Rücken am Boden",
   "Gegenüberliegenden Arm und Bein strecken",
   "Zurück, Seite wechseln"
  ],
  "gruppe": "rumpf",
  "video": {
   "id": "6BUVunRfJig",
   "titel": "Der Käfer / Dead Bug für das Training Deiner Bauchmuskeln",
   "kanal": "Matthias von HNL Physiotherapie",
   "dauer": "2:04"
  }
 },
 {
  "id": "ab-wheel",
  "name": "Ab Wheel",
  "nameEn": "Ab Wheel Rollout",
  "pattern": "core_anti_extension",
  "primaryMuscles": [
   "Rumpf"
  ],
  "secondaryMuscles": [
   "Latissimus",
   "Schulter"
  ],
  "equipment": "equipment",
  "level": "advanced",
  "mechanics": "isolation",
  "repRange": "6-12",
  "steps": [
   "Knien, Rad unter den Schultern",
   "Becken leicht kippen",
   "Langsam nach vorn rollen",
   "Mit dem Bauch zurückziehen"
  ],
  "gruppe": "rumpf",
  "video": {
   "id": "DlJhhW_rKCk",
   "titel": "Ab Wheel Rollouts | Richtige Ausführung & Häufige Fehler | Core (Antistreckung)",
   "kanal": "greengymberlin",
   "dauer": "4:35"
  }
 },
 {
  "id": "haengendes-beinheben",
  "name": "Hängendes Beinheben",
  "nameEn": "Hanging Leg Raise",
  "pattern": "core_flexion",
  "primaryMuscles": [
   "Bauch",
   "Hüftbeuger"
  ],
  "secondaryMuscles": [
   "Unterarme"
  ],
  "equipment": "bodyweight",
  "level": "intermediate",
  "mechanics": "isolation",
  "repRange": "8-15",
  "steps": [
   "An der Stange hängen, Schultern aktiv",
   "Becken leicht kippen",
   "Beine gestreckt oder gebeugt heben",
   "Langsam absenken"
  ],
  "gruppe": "rumpf",
  "video": {
   "id": "UNTdIGM_EJI",
   "titel": "Hängendes Beinheben - Hanging Leg Raises - Korrigiere deine Technik",
   "kanal": "Machbar Training",
   "dauer": "3:08"
  }
 },
 {
  "id": "cable-crunch",
  "name": "Cable Crunch",
  "nameEn": "Cable Crunch",
  "pattern": "core_flexion",
  "primaryMuscles": [
   "Bauch"
  ],
  "secondaryMuscles": [],
  "equipment": "cable",
  "level": "intermediate",
  "mechanics": "isolation",
  "repRange": "10-20",
  "steps": [
   "Knien, Seil am Kopf",
   "Hüfte bleibt fix",
   "Wirbelsäule einrollen",
   "Langsam zurück"
  ],
  "gruppe": "rumpf",
  "video": {
   "id": "HhJjrqdcyVE",
   "titel": "⚡ Maximaler Core-Effekt – Crunches am Kabelzug kniend",
   "kanal": "LuFit Coaching",
   "dauer": "2:22"
  }
 },
 {
  "id": "pallof-press",
  "name": "Pallof Press",
  "nameEn": "Pallof Press",
  "pattern": "core_anti_rotation",
  "primaryMuscles": [
   "Rumpf"
  ],
  "secondaryMuscles": [
   "Schulter"
  ],
  "equipment": "cable",
  "level": "beginner",
  "mechanics": "isolation",
  "repRange": "10-15 pro Seite",
  "steps": [
   "Seitlich zum Kabel stehen, Griff vor der Brust",
   "Fest stehen",
   "Arme nach vorn strecken",
   "Gegen den Zug stabil bleiben, zurück"
  ],
  "gruppe": "rumpf",
  "video": {
   "id": "TyknsCFvJNQ",
   "titel": "PALLOF PRESS - Ausführung und Anatomie",
   "kanal": "Fitness Einfach Erklärt",
   "dauer": "6:21"
  }
 },
 {
  "id": "farmers-walk",
  "name": "Farmer's Walk",
  "nameEn": "Farmer's Carry",
  "pattern": "carry",
  "primaryMuscles": [
   "Unterarme",
   "Trapez",
   "Rumpf"
  ],
  "secondaryMuscles": [
   "Gluteus"
  ],
  "equipment": "dumbbell",
  "level": "beginner",
  "mechanics": "compound",
  "repRange": "20-40m",
  "steps": [
   "Schwere Hanteln greifen",
   "Aufrecht stehen, Schultern tief",
   "Kleine feste Schritte gehen",
   "Rumpf angespannt halten"
  ],
  "gruppe": "ganzkoerper",
  "video": {
   "id": "NH7Xv-7NQNQ",
   "titel": "How To Perform Farmer Walks Exercise Tutorial",
   "kanal": "Buff Dudes Workouts",
   "dauer": "1:30"
  }
 },
 {
  "id": "kettlebell-swing",
  "name": "Kettlebell Swing",
  "nameEn": "Kettlebell Swing",
  "pattern": "hip_dominant",
  "primaryMuscles": [
   "Gluteus",
   "Hamstrings"
  ],
  "secondaryMuscles": [
   "Rückenstrecker",
   "Rumpf"
  ],
  "equipment": "kettlebell",
  "level": "intermediate",
  "mechanics": "compound",
  "repRange": "10-20",
  "steps": [
   "Füße schulterbreit, Kettlebell vor dir",
   "Hüfte nach hinten schieben",
   "Hüfte explosiv nach vorn strecken",
   "Arme nur halten, Gewicht schwingt bis Brusthöhe"
  ],
  "gruppe": "beine",
  "video": {
   "id": "HlMCVnPoG9k",
   "titel": "Kettlebell Swing Tutorial | Richtige Ausführung, Technik und Fehlerquellen (deutsch)",
   "kanal": "Coach Stef",
   "dauer": "4:53"
  }
 },
 {
  "id": "box-jump",
  "name": "Box Jump",
  "nameEn": "Box Jump",
  "pattern": "plyometric",
  "primaryMuscles": [
   "Quadrizeps",
   "Gluteus"
  ],
  "secondaryMuscles": [
   "Waden"
  ],
  "equipment": "bodyweight",
  "level": "intermediate",
  "mechanics": "compound",
  "repRange": "3-6",
  "steps": [
   "Kniebeugenstellung vor der Box",
   "Arme schwingen",
   "Explosiv hochspringen",
   "Weich landen und aufrichten"
  ],
  "gruppe": "ganzkoerper",
  "video": {
   "id": "OHU8goUTjh4",
   "titel": "Box Jumps - Anleitung durch Personal Trainer #boxjumps",
   "kanal": "Elite Body",
   "dauer": "1:08"
  }
 },
 {
  "id": "medizinball-wurf",
  "name": "Medizinball-Wurf",
  "nameEn": "Medicine Ball Throw",
  "pattern": "plyometric",
  "primaryMuscles": [
   "Ganzkörper"
  ],
  "secondaryMuscles": [
   "Rumpf",
   "Schulter"
  ],
  "equipment": "medicine_ball",
  "level": "intermediate",
  "mechanics": "compound",
  "repRange": "3-6",
  "steps": [
   "Ball vor der Brust",
   "Aus der Hüfte rotieren oder strecken",
   "Explosiv werfen",
   "Kontrolliert auffangen"
  ],
  "gruppe": "ganzkoerper",
  "video": {
   "id": "MX-vq60zAk8",
   "titel": "Allgemeines Kraft- und Wurftraining mit dem Medizinball",
   "kanal": "Dominic Ullrich - Athletics and more",
   "dauer": "4:06"
  }
 },
 {
  "id": "hanging-hold",
  "name": "Hang (Klimmzugstange)",
  "nameEn": "Dead Hang",
  "pattern": "grip",
  "primaryMuscles": [
   "Unterarme"
  ],
  "secondaryMuscles": [
   "Latissimus"
  ],
  "equipment": "bodyweight",
  "level": "beginner",
  "mechanics": "isometric",
  "repRange": "20-60s",
  "steps": [
   "Stange fassen, Schultern aktiv",
   "Körper ruhig halten",
   "Greifen und halten",
   "Kontrolliert absetzen"
  ],
  "gruppe": "ganzkoerper",
  "video": {
   "id": "lWsXawaX4U0",
   "titel": "Aushängen an der Klimmzugstange - Dein Rücken wird es Dir danken | Ausführung und Technik!",
   "kanal": "TOLYMP - Outdoor-Fitnessgeräte",
   "dauer": "1:32"
  }
 },
 {
  "id": "rueckenstrecker-hyperextension",
  "name": "Rückenstrecker (Hyperextension)",
  "nameEn": "Back Extension",
  "pattern": "hip_dominant",
  "primaryMuscles": [
   "Rückenstrecker",
   "Gluteus"
  ],
  "secondaryMuscles": [
   "Hamstrings"
  ],
  "equipment": "machine",
  "level": "beginner",
  "mechanics": "isolation",
  "repRange": "10-15",
  "steps": [
   "Polster auf der Hüfte, Fersen fixiert",
   "Körper in einer Linie",
   "Oberkörper absenken",
   "Bis zur Neutralstellung aufrichten"
  ],
  "gruppe": "ruecken",
  "video": {
   "id": "qHocwF43NbY",
   "titel": "Backextensions/Hyperextensions - Die richtige Technik beim Rückenstrecker |  Tutorial | Kernfit",
   "kanal": "Kern-Fit",
   "dauer": "4:04"
  }
 },
 {
  "id": "rotator-aussenrotation",
  "name": "Außenrotation am Kabel",
  "nameEn": "Cable External Rotation",
  "pattern": "shoulder_isolation",
  "primaryMuscles": [
   "Rotatorenmanschette"
  ],
  "secondaryMuscles": [],
  "equipment": "cable",
  "level": "beginner",
  "mechanics": "isolation",
  "repRange": "12-20",
  "steps": [
   "Ellbogen am Körper, 90 Grad gebeugt",
   "Leichtes Gewicht",
   "Hand nach außen drehen",
   "Langsam zurück"
  ],
  "gruppe": "schultern",
  "video": {
   "id": "UjEl8lb8sbU",
   "titel": "Außenrotation am Kabelzug (horizontal)",
   "kanal": "Nico Airone",
   "dauer": "0:48"
  }
 }
];
