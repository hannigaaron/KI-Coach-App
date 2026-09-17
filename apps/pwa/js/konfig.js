/**
 * Was der Betreiber einstellt, und was der Nutzer einstellt.
 *
 * In der Entwicklerfassung trägt der Nutzer alles selbst ein: Schlüssel,
 * Adresse des Push Workers, Anmeldewort, Coaching Angebot, Trainingspläne.
 * Das ist richtig, solange der Nutzer und der Betreiber dieselbe Person sind.
 *
 * Für jeden anderen ist es falsch. Wer die App aus einem Store lädt, hat
 * keinen Anthropic Schlüssel, kennt keinen Cloudflare Worker und will keinen
 * Buchungslink eintragen, sondern den Coach dahinter buchen. Diese Felder sind
 * für ihn kein Angebot, sondern eine Hürde vor dem Produkt.
 *
 * Deshalb zwei Fassungen aus einer Quelle. `build:demo` schreibt diese Datei
 * neu und setzt `DEMO` auf wahr. Danach sind die Betreiberfelder weg und ihre
 * Werte eingebaut.
 *
 * Kein Schlüssel steht hier. Eine statische Web App liefert ihren Code an
 * jeden Besucher aus, ein eingebauter Schlüssel wäre öffentlich. Die
 * Modellanfragen laufen in der Demo über den Push Worker, der ihn als
 * Geheimnis hält, siehe workers/push/src/chat.ts.
 */

export const KONFIG = {
  /** Wahr in der Fassung für Nutzer. Blendet alles aus, was der Betreiber setzt. */
  DEMO: false,

  /**
   * Adresse des eigenen Servers für die Modellanfragen. Gesetzt heisst: die
   * App braucht keinen Schlüssel und zeigt das Feld dafür nicht an.
   */
  chatUrl: "",

  /** Adresse des Push Workers für die Tagesimpulse. */
  pushUrl: "",

  /** Das Coaching Angebot des Betreibers. */
  angebot: null,
};

/** Kurz und lesbar an den Stellen, die sich danach richten. */
export const istDemo = () => KONFIG.DEMO === true;
