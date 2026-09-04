import { AnthropicProvider, Coach } from "@daevo/coach";
import { createApp } from "./app.js";
import { openDb } from "./db.js";
import { ConsoleNotifier } from "./notifier.js";
import { runSchedulerTick } from "./scheduler.js";

const port = Number(process.env.PORT ?? 8787);
const databasePath = process.env.DATABASE_PATH ?? "./data/coach.sqlite";
const model = process.env.COACH_MODEL ?? "claude-sonnet-5";

const db = openDb(databasePath);
const provider = new AnthropicProvider({ apiKey: process.env.ANTHROPIC_API_KEY, model });
const coach = new Coach(provider);
const notifier = new ConsoleNotifier();

const server = createApp({ db, coach });

server.listen(port, () => {
  console.log(`API läuft auf http://localhost:${port}`);
  console.log(`Datenbank: ${databasePath}`);
  console.log(
    provider.available
      ? `Coach Modell: ${model}`
      : "Kein ANTHROPIC_API_KEY gesetzt. Der Coach läuft im Offline Modus mit der internen Referenztabelle.",
  );
});

const SCHEDULER_INTERVAL_MS = 60_000;
const timer = setInterval(() => {
  runSchedulerTick({ db, coach, notifier }).catch((error) => console.error("Scheduler Fehler", error));
}, SCHEDULER_INTERVAL_MS);

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    clearInterval(timer);
    server.close(() => {
      db.close();
      process.exit(0);
    });
  });
}
