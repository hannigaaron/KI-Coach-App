/**
 * Der Menstruationszyklus: Phase, Vorhersage und was daevo daraus macht.
 *
 * Gerechnet wird nur aus den eigenen Einträgen, nichts davon ist eine
 * Messung. Den Eisprung bestimmt nur ein Test oder die Temperatur, die App
 * schätzt ihn aus der Länge der eigenen Zyklen. Zur Verhütung taugt das
 * nicht, und das steht in jeder Ausgabe.
 *
 * Was die Forschung trägt, und was die App deshalb tut:
 *
 * - Nach Phase zu trainieren ist nicht belegt. McNulty und andere, Sports
 *   Medicine 2020, 78 Studien: die Leistung ist in der frühen Follikelphase
 *   höchstens minimal geringer, die Belege sind schwach, die Autoren raten
 *   von allgemeinen Regeln nach Phase ab. Colenso-Semple und andere,
 *   Frontiers in Sports and Active Living 2023: kein belegter Einfluss der
 *   Phase auf Kraft oder Muskelaufbau. Die Phase allein ändert den Plan
 *   deshalb nicht.
 * - Die Beschwerden sind der Hebel. Bruinvels und andere, BJSM 2021, 6812
 *   trainierende Frauen: Stimmung 91 Prozent, Müdigkeit 86, Krämpfe 84, und
 *   die Frauen sagen, dass es ihr Training einschränkt. Gesteuert wird über
 *   die Symptome des Tages, mit denselben Stufen wie beim Morgen Check-in.
 * - Hormonelle Verhütung kennt keine natürlichen Phasen. Elliott-Sale und
 *   andere, Sports Medicine 2020: im Mittel höchstens ein sehr kleiner
 *   Unterschied. Dann zeigt die App keine Phasen, nur Periode und Symptome.
 * - Die Lutealphase hebt den Ruheumsatz leicht, Benton und andere, PLOS ONE
 *   2020, in neueren Studien nicht mehr signifikant. Zu unsicher, um das
 *   Kalorienziel zu ändern. Es gibt nur den Satz, dass mehr Hunger normal
 *   sein kann.
 * - Eine ausbleibende Periode kann ein Zeichen von Energiemangel sein, IOC
 *   Konsens zu REDs 2023. Ab 90 Tagen ohne Periode steht der Weg zum Arzt da:
 *   drei Monate sind die übliche klinische Grenze der sekundären Amenorrhö.
 *   Zyklen im Schnitt unter 21 oder über 35 Tagen liegen ausserhalb des
 *   üblichen Bereichs bei Erwachsenen, auch dann steht der Satz da.
 */

export type ZyklusPhase = "periode" | "follikel" | "eisprung" | "luteal";
export type Verhuetung = "keine" | "hormonell";
export type Blutung = "leicht" | "mittel" | "stark";

export const SYMPTOME = ["kraempfe", "muede", "kopfschmerz", "stimmung", "blaehbauch", "brust", "schlaf"] as const;
export type Symptom = (typeof SYMPTOME)[number];

export const SYMPTOM_NAME: Record<Symptom, string> = {
  kraempfe: "Krämpfe",
  muede: "Müde",
  kopfschmerz: "Kopfschmerz",
  stimmung: "Stimmung",
  blaehbauch: "Blähbauch",
  brust: "Brustspannen",
  schlaf: "Schlecht geschlafen",
};

export const PHASE_NAME: Record<ZyklusPhase, string> = {
  periode: "Periode",
  follikel: "Follikelphase",
  eisprung: "Eisprung, geschätzt",
  luteal: "Lutealphase",
};

export interface Periode {
  /** Erster Tag der Blutung, JJJJ-MM-TT. */
  beginn: string;
  /** Letzter Tag, wenn eingetragen. */
  ende?: string;
}

export interface ZyklusDaten {
  an?: boolean;
  verhuetung?: Verhuetung;
  perioden?: Periode[];
  /** Symptome je Tag. */
  symptome?: Record<string, Symptom[]>;
  /** Stärke der Blutung je Tag. */
  blutung?: Record<string, Blutung>;
}

/** Ohne eigene Daten: 28 Tage Zyklus, 5 Tage Periode. Übliche Lehrbuchwerte. */
export const STANDARD_LAENGE = 28;
export const STANDARD_PERIODE = 5;
/** Die Lutealphase ist bei den meisten Frauen rund 14 Tage lang, daraus der geschätzte Eisprung. */
export const LUTEAL_TAGE = 14;
export const AUSBLEIBEN_TAGE = 90;
export const UEBLICH_MIN = 21;
export const UEBLICH_MAX = 35;

const TAG = 86_400_000;
const ms = (iso: string) => Date.parse(`${iso}T12:00:00Z`);
export const tageZwischen = (von: string, bis: string) => Math.round((ms(bis) - ms(von)) / TAG);
export const tagPlus = (iso: string, n: number) => new Date(ms(iso) + n * TAG).toISOString().slice(0, 10);

/** Perioden sortiert, doppelte und zu nahe Einträge zusammengelegt. */
export function periodenSortiert(perioden: Periode[] = []): Periode[] {
  const gueltig = perioden.filter((p) => /^\d{4}-\d{2}-\d{2}$/.test(p?.beginn ?? ""));
  const sortiert = [...gueltig].sort((a, b) => a.beginn.localeCompare(b.beginn));
  const aus: Periode[] = [];
  for (const p of sortiert) {
    const letzte = aus[aus.length - 1];
    // Zwei Anfänge innerhalb von zehn Tagen sind dieselbe Periode, zweimal
    // getippt. Ein Zyklus unter zehn Tagen ist keiner.
    if (letzte && tageZwischen(letzte.beginn, p.beginn) < 10) continue;
    aus.push(p);
  }
  return aus;
}

export interface ZyklusStand {
  /** Ohne einen einzigen Eintrag gibt es keinen Stand. */
  bekannt: boolean;
  hormonell: boolean;
  /** Tag im Zyklus, 1 ist der erste Tag der Periode. */
  tag: number;
  phase: ZyklusPhase | null;
  laenge: number;
  periodenDauer: number;
  /** Aus wie vielen vollständigen Zyklen der Schnitt stammt. */
  zyklenGezaehlt: number;
  laengen: number[];
  naechste: string | null;
  /** Spanne der Vorhersage in Tagen, aus der Streuung der eigenen Zyklen. */
  spanne: number;
  /** Seit wie vielen Tagen keine Periode, wenn über der Grenze. */
  ausgeblieben: number | null;
  ausserhalbUeblich: boolean;
}

/**
 * Wo im Zyklus heute liegt. Länge und Periodendauer kommen aus den letzten
 * sechs Zyklen, ohne Daten aus den Lehrbuchwerten, und das sagt der Text.
 */
export function zyklusStand(daten: ZyklusDaten, heute: string): ZyklusStand {
  const perioden = periodenSortiert(daten.perioden).filter((p) => p.beginn <= heute);
  const hormonell = daten.verhuetung === "hormonell";
  const leer: ZyklusStand = {
    bekannt: false, hormonell, tag: 0, phase: null, laenge: STANDARD_LAENGE, periodenDauer: STANDARD_PERIODE,
    zyklenGezaehlt: 0, laengen: [], naechste: null, spanne: 0, ausgeblieben: null, ausserhalbUeblich: false,
  };
  const letzte = perioden[perioden.length - 1];
  if (!letzte) return leer;

  const laengen: number[] = [];
  for (let i = 1; i < perioden.length; i++) laengen.push(tageZwischen(perioden[i - 1]!.beginn, perioden[i]!.beginn));
  // Ein Abstand über 60 Tage ist meist eine vergessene Eintragung und kein
  // Zyklus. Er würde den Schnitt um Wochen verschieben.
  const echte = laengen.filter((l) => l <= 60).slice(-6);
  const laenge = echte.length ? Math.round(echte.reduce((s, l) => s + l, 0) / echte.length) : STANDARD_LAENGE;
  const dauern = perioden.filter((p) => p.ende && p.ende >= p.beginn).map((p) => tageZwischen(p.beginn, p.ende as string) + 1).slice(-6);
  const periodenDauer = dauern.length ? Math.round(dauern.reduce((s, d) => s + d, 0) / dauern.length) : STANDARD_PERIODE;

  const tag = tageZwischen(letzte.beginn, heute) + 1;
  const streuung = echte.length >= 2 ? Math.max(...echte) - Math.min(...echte) : 0;
  // Unter drei Zyklen ist die Vorhersage geraten, die Spanne sagt das.
  const spanne = echte.length >= 3 ? Math.min(5, Math.max(1, Math.ceil(streuung / 2))) : 3;

  let phase: ZyklusPhase | null = null;
  if (!hormonell) {
    const eisprung = Math.max(periodenDauer + 2, laenge - LUTEAL_TAGE);
    if (tag <= periodenDauer) phase = "periode";
    else if (tag < eisprung - 1) phase = "follikel";
    else if (tag <= eisprung + 1) phase = "eisprung";
    else phase = "luteal";
  } else if (tag <= periodenDauer) {
    phase = "periode";
  }

  const naechsteTag = tag > laenge ? heute : tagPlus(letzte.beginn, laenge);
  return {
    bekannt: true,
    hormonell,
    tag,
    phase,
    laenge,
    periodenDauer,
    zyklenGezaehlt: echte.length,
    laengen: echte,
    naechste: hormonell ? null : naechsteTag,
    spanne,
    ausgeblieben: tag > AUSBLEIBEN_TAGE ? tag - 1 : null,
    ausserhalbUeblich: echte.length >= 3 && (laenge < UEBLICH_MIN || laenge > UEBLICH_MAX),
  };
}

export type ZyklusStufe = "normal" | "reduziert" | "leicht";

export interface ZyklusEmpfehlung {
  stufe: ZyklusStufe;
  training: string;
  essen?: string;
  hinweis?: string;
  quelle: string;
}

/**
 * Was daevo heute sagt. Die Symptome entscheiden, nicht die Phase.
 *
 * Ein Symptom aus Krämpfe, Müde, Kopfschmerz oder schlechter Schlaf heisst
 * reduziert: drei Viertel der Sätze, eine Wiederholung mehr in Reserve. Zwei
 * davon heissen leicht: die Hälfte der Sätze, zwei mehr in Reserve, und der
 * Satz, dass Aufhören nach dem Aufwärmen kein verlorener Tag ist. Dieselben
 * Stufen wie in `trainingsanpassung.ts`, eine Regel der App und keine
 * Studie. Stimmung, Blähbauch und Brustspannen senken die Stufe nicht, sie
 * stehen als Hinweis da: wer schlecht gelaunt ist, kann trotzdem gut heben.
 */
export function zyklusEmpfehlung(stand: ZyklusStand, symptome: Symptom[] = [], blutung?: Blutung): ZyklusEmpfehlung {
  const belastend = symptome.filter((s) => s === "kraempfe" || s === "muede" || s === "kopfschmerz" || s === "schlaf");
  const stufe: ZyklusStufe = belastend.length >= 2 ? "leicht" : belastend.length === 1 ? "reduziert" : "normal";
  const namen = belastend.map((s) => SYMPTOM_NAME[s].toLowerCase());

  let training: string;
  if (stufe === "leicht") {
    training = `Heute leicht: die Hälfte der Sätze, 3 Wiederholungen in Reserve. Wird es im Aufwärmen schlimmer, hör auf, das ist kein verlorener Tag.`;
  } else if (stufe === "reduziert") {
    training = `Trainiere nach Plan, wegen ${namen[0]} mit drei Vierteln der Sätze und 2 Wiederholungen in Reserve.`;
  } else {
    training = "Trainiere nach Plan. Die Phase allein ist kein Grund, mehr oder weniger zu machen.";
  }
  if (symptome.includes("kraempfe")) training += " Leichte Bewegung lindert Krämpfe bei vielen Frauen.";

  let essen: string | undefined;
  if (blutung === "stark") {
    essen = "Deine Blutung ist stark eingetragen. Plan heute eisenreich: Rind, Linsen oder Hirse, dazu Vitamin C. Hält das über Monate an, lass deinen Eisenwert prüfen.";
  } else if (stand.phase === "luteal" && !stand.hormonell) {
    essen = "In der zweiten Zyklushälfte haben viele mehr Hunger, das ist normal. Dein Ziel bleibt, plan eiweissreiche Snacks ein.";
  }

  let hinweis: string | undefined;
  if (stand.ausgeblieben) {
    hinweis = `Seit ${stand.ausgeblieben} Tagen ist keine Periode eingetragen. Fehlt sie wirklich so lange, gehört das zu einer Ärztin oder einem Arzt. Bei viel Training und wenig Essen kann Energiemangel dahinterstecken.`;
  } else if (stand.ausserhalbUeblich) {
    hinweis = `Deine Zyklen sind im Schnitt ${stand.laenge} Tage lang, üblich sind 21 bis 35. Sprich das bei deiner nächsten Frauenärztin an.`;
  }

  return {
    stufe,
    training,
    ...(essen ? { essen } : {}),
    ...(hinweis ? { hinweis } : {}),
    quelle: stufe === "normal" ? "McNulty 2020, Colenso-Semple 2023" : "Regel von daevo nach deinen Symptomen, Bruinvels 2021",
  };
}

/** Vorhersage als Satz, mit Spanne und dem Hinweis, dass es keine Messung ist. */
export function vorhersageText(stand: ZyklusStand, datumText: (iso: string) => string): string {
  if (!stand.bekannt) return "Trag den ersten Tag deiner letzten Periode ein, dann rechnet daevo mit.";
  if (stand.hormonell) return "Mit hormoneller Verhütung gibt es keine natürlichen Phasen. daevo zeigt deshalb nur Periode und Symptome.";
  if (!stand.naechste) return "";
  const basis = stand.zyklenGezaehlt >= 3 ? "" : ", noch aus Lehrbuchwerten";
  return `Periode etwa am ${datumText(stand.naechste)}, ±${stand.spanne} Tage${basis}`;
}

/** Ein Satz für den Coach und den Regelweg. */
export function zyklusText(daten: ZyklusDaten, heute: string, datumText: (iso: string) => string): string {
  if (!daten.an) return "Die Zyklus Funktion ist nicht eingeschaltet.";
  const stand = zyklusStand(daten, heute);
  if (!stand.bekannt) return "Noch keine Periode eingetragen. Sag mir den ersten Tag deiner letzten Periode.";
  const sym = daten.symptome?.[heute] ?? [];
  const e = zyklusEmpfehlung(stand, sym, daten.blutung?.[heute]);
  const zeilen = [
    `Zyklustag ${stand.tag}${stand.phase ? `, ${PHASE_NAME[stand.phase]}` : ""}.`,
    vorhersageText(stand, datumText) + (stand.naechste ? "." : ""),
    sym.length ? `Heute eingetragen: ${sym.map((s) => SYMPTOM_NAME[s]).join(", ")}.` : "",
    e.training,
    e.essen ?? "",
    e.hinweis ?? "",
    "Eine Vorhersage aus deinen Einträgen, keine Messung, nicht zur Verhütung geeignet.",
  ];
  return zeilen.filter(Boolean).join("\n");
}

/** Trägt den Beginn einer Periode ein. Ein zweiter Eintrag innerhalb von zehn Tagen ersetzt den ersten nicht. */
export function periodeBeginnen(daten: ZyklusDaten, tag: string): ZyklusDaten {
  const perioden = periodenSortiert([...(daten.perioden ?? []), { beginn: tag }]);
  return { ...daten, an: true, perioden: perioden.slice(-24) };
}

/** Setzt das Ende der Periode, die zuletzt vor oder an diesem Tag begann. */
export function periodeBeenden(daten: ZyklusDaten, tag: string): ZyklusDaten {
  const perioden = periodenSortiert(daten.perioden);
  for (let i = perioden.length - 1; i >= 0; i--) {
    const p = perioden[i]!;
    if (p.beginn <= tag && tageZwischen(p.beginn, tag) <= 14) {
      perioden[i] = { ...p, ende: tag };
      break;
    }
  }
  return { ...daten, perioden };
}

/** Schaltet ein Symptom für einen Tag um. Alte Tage über 400 fallen weg. */
export function symptomUmschalten(daten: ZyklusDaten, tag: string, symptom: Symptom | "keine"): ZyklusDaten {
  const alle = { ...(daten.symptome ?? {}) };
  if (symptom === "keine") alle[tag] = [];
  else {
    const jetzt = new Set(alle[tag] ?? []);
    if (jetzt.has(symptom)) jetzt.delete(symptom); else jetzt.add(symptom);
    alle[tag] = [...jetzt];
  }
  const grenze = tagPlus(tag, -400);
  for (const k of Object.keys(alle)) if (k < grenze) delete alle[k];
  return { ...daten, symptome: alle };
}

/** Ob für diese Periode schon ein Ende eingetragen ist, das nicht in der Zukunft liegt. */
export function periodeBeendet(p: Periode | undefined, heute: string): boolean {
  return Boolean(p?.ende && p.ende <= heute);
}

/**
 * Übernimmt die Blutungstage aus Apple Health. Tage mit höchstens einem
 * Tag Abstand gehören zu einer Periode. Was schon eingetragen ist, gewinnt:
 * ein Beginn aus Health innerhalb von zehn Tagen um einen eigenen Beginn ist
 * dieselbe Periode, und eine selbst gewählte Stärke bleibt stehen. Sonst
 * stünde jede Periode doppelt da, einmal getippt und einmal aus der Uhr.
 */
export function zyklusAusHealth(daten: ZyklusDaten, tage: Array<{ tag: string; staerke: Blutung }>, { anschalten = false } = {}): ZyklusDaten {
  const gueltig = tage.filter((t) => /^\d{4}-\d{2}-\d{2}$/.test(t?.tag ?? "") && ["leicht", "mittel", "stark"].includes(t.staerke))
    .sort((a, b) => a.tag.localeCompare(b.tag));
  if (!gueltig.length) return daten;
  const gruppen: Periode[] = [];
  for (const t of gueltig) {
    const letzte = gruppen[gruppen.length - 1];
    if (letzte && tageZwischen(letzte.ende ?? letzte.beginn, t.tag) <= 2) letzte.ende = t.tag;
    else gruppen.push({ beginn: t.tag, ende: t.tag });
  }
  const eigene = periodenSortiert(daten.perioden);
  const neu = [...eigene];
  for (const g of gruppen) {
    const i = neu.findIndex((p) => Math.abs(tageZwischen(p.beginn, g.beginn)) < 10);
    if (i < 0) neu.push(g);
    else if (!neu[i]!.ende) neu[i] = { ...neu[i]!, ende: g.ende };
  }
  const blutung = { ...(daten.blutung ?? {}) };
  for (const t of gueltig) if (!blutung[t.tag]) blutung[t.tag] = t.staerke;
  return { ...daten, ...(anschalten ? { an: true } : {}), perioden: periodenSortiert(neu).slice(-24), blutung };
}
