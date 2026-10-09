/**
 * Die Übungsdatenbank.
 *
 * 74 verbreitete Übungen, eigenständig verfasst. Namen und Abläufe sind
 * allgemeines Trainingswissen. Übernommen wurde nichts aus der Datenbank einer
 * anderen App, weder Text noch Bild. Die Animationen zeichnet
 * `uebungen-anim.js` selbst.
 *
 * Bezeichner (`id`, `pattern`, `gruppe`, `anim`, `equipment`, `level`) bleiben
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
  "anim": "squat"
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
  "anim": "squat"
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
  "anim": "squat"
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
  "anim": "legpress"
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
  "anim": "split"
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
  "anim": "lunge"
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
  "anim": "lunge"
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
  "anim": "squat"
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
  "anim": "legext"
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
  "anim": "deadlift"
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
  "anim": "hinge"
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
  "anim": "deadlift"
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
  "anim": "deadlift"
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
  "anim": "bridge"
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
  "anim": "bridge"
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
  "anim": "goodmorning"
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
  "anim": "legcurl"
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
  "anim": "legcurl"
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
  "anim": "nordic"
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
  "anim": "calf"
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
  "anim": "calf"
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
  "anim": "legclose"
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
  "anim": "legspread"
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
  "anim": "bench"
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
  "anim": "incline"
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
  "anim": "bench"
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
  "anim": "incline"
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
  "anim": "bench"
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
  "anim": "pushup"
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
  "anim": "dips"
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
  "anim": "benchfly"
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
  "anim": "flycable"
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
  "anim": "flycable"
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
  "anim": "ohp"
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
  "anim": "ohp"
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
  "anim": "ohp"
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
  "anim": "lateral"
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
  "anim": "lateral"
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
  "anim": "lateral"
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
  "anim": "facepull"
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
  "anim": "pullup"
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
  "anim": "pullup"
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
  "anim": "pulldown"
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
  "anim": "pulldown"
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
  "anim": "row"
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
  "anim": "row"
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
  "anim": "seatedrow"
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
  "anim": "row"
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
  "anim": "seatedrow"
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
  "anim": "straightarm"
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
  "anim": "shrug"
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
  "anim": "curl"
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
  "anim": "curl"
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
  "anim": "curl"
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
  "anim": "curl"
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
  "anim": "curl"
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
  "anim": "tripush"
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
  "anim": "tripush"
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
  "anim": "triover"
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
  "anim": "bench"
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
  "anim": "plank"
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
  "anim": "plank"
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
  "anim": "deadbug"
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
  "anim": "abwheel"
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
  "anim": "legraise"
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
  "anim": "crunch"
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
  "anim": "pallof"
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
  "anim": "carry"
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
  "anim": "swing"
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
  "anim": "jump"
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
  "anim": "throw"
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
  "anim": "hang"
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
  "anim": "hyper"
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
  "anim": "rotation"
 }
];
