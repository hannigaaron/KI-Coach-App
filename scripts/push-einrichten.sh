#!/usr/bin/env bash
#
# Richtet den Push Versand in einem Durchgang ein.
#
# Der Weg von Hand hat sechs Schritte und eine Reihenfolge, die nicht
# offensichtlich ist: der Worker muss stehen, bevor er Geheimnisse annimmt.
# Wer an der falschen Stelle abbricht, steht ohne beides da. Deshalb dieses
# Skript.
#
# Aufruf aus der Projektwurzel:
#   bash scripts/push-einrichten.sh
#
# Ein zweiter Aufruf ist unschädlich. Die Schlüssel werden nur einmal erzeugt
# und danach aus .push-geheim.json gelesen. Neue Schlüssel würden jedes
# angemeldete Gerät ungültig machen.
set -euo pipefail

GEHEIM=".push-geheim.json"
TOML="workers/push/wrangler.toml"
# Für den Test austauschbar. Im Betrieb immer npx wrangler.
WRANGLER=${WRANGLER_CMD:-"npx --yes wrangler"}

schritt() { printf "\n\033[1m==> %s\033[0m\n" "$1"; }
fehler()  { printf "\n\033[31mAbbruch: %s\033[0m\n" "$1" >&2; exit 1; }

LOG_ERSTER=$(mktemp)
LOG_ZWEITER=$(mktemp)

# Rollt aus, zeigt die Ausgabe und schreibt sie zusätzlich in eine Datei. Der
# Rückgabewert ist der von wrangler, nicht der von tee: dafür sorgt pipefail.
ausrollen() { $WRANGLER deploy 2>&1 | tee "$1"; }

[ -f package.json ] || fehler "Bitte aus dem Projektordner starten, also aus KI-Coach-App."
[ -f "$TOML" ] || fehler "workers/push fehlt. Erst 'git pull' ausführen."

schritt "1 von 6: Projekt bauen"
npm install
npm run build

schritt "2 von 6: Bei Cloudflare anmelden"
if $WRANGLER whoami >/dev/null 2>&1; then
  echo "schon angemeldet"
else
  $WRANGLER login
fi

schritt "3 von 6: Speicher für die Geräte"
if grep -q "HIER_DIE_KENNUNG_EINTRAGEN" "$TOML"; then
  AUSGABE=$(cd workers/push && $WRANGLER kv namespace create ABOS 2>&1) || {
    printf '%s\n' "$AUSGABE"; fehler "Der Speicher liess sich nicht anlegen."
  }
  # Die Kennung ist die einzige zweiunddreissigstellige Hexzahl in der Ausgabe.
  KENNUNG=$(printf '%s' "$AUSGABE" | grep -oE '[0-9a-f]{32}' | head -n 1)
  [ -n "$KENNUNG" ] || { printf '%s\n' "$AUSGABE"; fehler "In der Ausgabe steht keine Kennung."; }
  # macOS verlangt hinter -i ein leeres Argument, GNU sed verträgt es nicht.
  sed -i '' "s/HIER_DIE_KENNUNG_EINTRAGEN/$KENNUNG/" "$TOML" 2>/dev/null \
    || sed -i "s/HIER_DIE_KENNUNG_EINTRAGEN/$KENNUNG/" "$TOML"
  echo "angelegt: $KENNUNG"
else
  echo "steht schon in wrangler.toml"
fi

schritt "4 von 6: Schlüssel"
if [ -f "$GEHEIM" ]; then
  echo "schon vorhanden, werden weiterverwendet"
else
  # Ein einziger Lauf. Zwei Läufe ergäben zwei Paare, und der öffentliche
  # Schlüssel des einen passt nicht zum privaten des anderen.
  ROH=$(node scripts/push-schluessel.mjs)
  OEFFENTLICH=$(printf '%s\n' "$ROH" | sed -n '2p')
  PRIVAT=$(printf '%s\n' "$ROH" | sed -n '5p')
  [ ${#OEFFENTLICH} -gt 80 ] || fehler "Der öffentliche Schlüssel sieht falsch aus."
  [ ${#PRIVAT} -gt 40 ] || fehler "Der private Schlüssel sieht falsch aus."

  # Ein Wort aus Zufallszeichen. Ein selbst gewähltes wird sonst das, das
  # überall sonst auch benutzt wird.
  # Über node und nicht über tr mit head: head schliesst die Leitung, tr
  # bekommt dadurch ein Signal, und mit pipefail bricht das ganze Skript ab.
  WORT=$(node -e "process.stdout.write(require('crypto').randomBytes(15).toString('base64url'))")
  printf '{\n  "oeffentlich": "%s",\n  "privat": "%s",\n  "wort": "%s"\n}\n' \
    "$OEFFENTLICH" "$PRIVAT" "$WORT" > "$GEHEIM"
  chmod 600 "$GEHEIM"
  echo "erzeugt und in $GEHEIM abgelegt"
fi

lies() {
  node -e "const f=require('fs');process.stdout.write(JSON.parse(f.readFileSync('$GEHEIM','utf8')).$1)"
}
OEFFENTLICH=$(lies oeffentlich)
PRIVAT=$(lies privat)
WORT=$(lies wort)

schritt "5 von 6: Worker anlegen"
# Erst ausrollen, dann die Geheimnisse. Andersherum fragt wrangler mitten im
# Ablauf, ob es einen Worker anlegen soll, der noch keinen Code trägt.
cd workers/push
# Die Ausgabe läuft mit und wird nebenbei mitgeschrieben.
#
# Vorher stand sie in einer Variablen. Das hat den Fehler verschluckt: bricht
# deploy ab, beendet set -e das Skript, bevor die Variable gedruckt wird, und
# der Nutzer sieht eine abgeschnittene Ausgabe ohne jeden Hinweis. Genau das
# ist passiert. Eine Rückfrage von wrangler wäre ebenso unsichtbar gewesen.
ausrollen "$LOG_ERSTER" || fehler "Das Ausrollen ist fehlgeschlagen. Die Meldung steht darüber."

schritt "6 von 6: Geheimnisse hinterlegen"
# Ohne die Meldung bricht set -e hier still ab, und der letzte sichtbare
# Punkt wäre die Überschrift darüber.
printf '%s' "$OEFFENTLICH" | $WRANGLER secret put VAPID_PUBLIC  || fehler "VAPID_PUBLIC liess sich nicht hinterlegen."
printf '%s' "$PRIVAT"      | $WRANGLER secret put VAPID_PRIVATE || fehler "VAPID_PRIVATE liess sich nicht hinterlegen."
printf '%s' "$WORT"        | $WRANGLER secret put ANMELDE_WORT  || fehler "ANMELDE_WORT liess sich nicht hinterlegen."
# Noch einmal ausrollen, damit der Worker die Geheimnisse sieht.
ausrollen "$LOG_ZWEITER" || fehler "Das zweite Ausrollen ist fehlgeschlagen. Die Meldung steht darüber."
cd ../..

ADRESSE=$(cat "$LOG_ERSTER" "$LOG_ZWEITER" \
  | grep -oE 'https://[A-Za-z0-9.-]+\.workers\.dev' | head -n 1 || true)
rm -f "$LOG_ERSTER" "$LOG_ZWEITER"

printf "\n\033[1m================ FERTIG ================\033[0m\n\n"
if [ -n "$ADRESSE" ]; then
  echo "Adresse des Workers:  $ADRESSE"
else
  echo "Adresse des Workers:  steht oben in der Ausgabe, sie endet auf .workers.dev"
fi
echo "Anmeldewort:          $WORT"
printf "\nBeides trägst du in der App ein: Menü, Profil, Benachrichtigungen.\n"
printf "Auf dem iPhone muss die App vom Home Bildschirm gestartet sein.\n\n"
printf "Beide Werte stehen auch in %s, falls du sie später brauchst.\n" "$GEHEIM"
