import { appleJwsPruefen, APPLE_ROOT_G3_SHA256 } from "./apple-jws.js";
import { stufeSetzen, type Konto } from "./konto.js";
import type { KVNamespace } from "./umgebung.js";

/**
 * Abos aus dem App Store und von Stripe setzen die Stufe eines Kontos.
 *
 * Die Testphase ist ein Teil des Abos und keine Stufe ohne Abo: wer sie
 * startet, schliesst das Abo ab, und der erste Monat kostet erst ab Tag 8.
 * Bei Apple heisst das Einführungsangebot "kostenlos, 1 Woche", bei Stripe
 * "trial_period_days: 7". Beides richtet der Betreiber dort ein, hier kommt
 * nur an, was daraus folgt: die Stufe und bis wann sie gilt.
 *
 * Ein Tag Kulanz über das Ende hinaus. Eine Verlängerung meldet Apple oder
 * Stripe manchmal Stunden später, und wer in dieser Lücke schreibt, soll
 * nicht vor einer Bezahlschranke stehen.
 */

const KULANZ_TAGE = 1;

function tagAus(ms: number, plusTage = 0): string {
  return new Date(ms + plusTage * 86_400_000).toISOString().slice(0, 10);
}

/** Welche Stufe ein Produkt oder Preis bedeutet. Eine Liste schlägt den Namen. */
export function stufeAusProdukt(kennung: string, liste = ""): "plus" | "pro" | null {
  for (const paar of liste.split(",")) {
    const [k, s] = paar.split(":").map((x) => x.trim());
    if (k && k === kennung && (s === "plus" || s === "pro")) return s;
  }
  const t = String(kennung || "").toLowerCase();
  if (/(^|[._-])pro([._-]|$)/.test(t)) return "pro";
  if (/(^|[._-])plus([._-]|$)/.test(t)) return "plus";
  return null;
}

/* ---------- App Store ---------- */

export interface AppleTransaktion {
  productId?: string;
  bundleId?: string;
  originalTransactionId?: string;
  expiresDate?: number;
  revocationDate?: number;
  offerType?: number;
  environment?: string;
}

/**
 * Wendet eine geprüfte Transaktion an. Ein Abo gehört zu genau einem Konto:
 * dieselbe Apple ID kann sonst ein Abo auf beliebig viele Konten verteilen.
 * Wer das Handy wechselt, meldet sich mit Apple an und bekommt sein Konto,
 * dann passt die Zuordnung wieder.
 */
export async function appleAnwenden(
  kv: KVNamespace,
  t: AppleTransaktion,
  { kontoId, bundleId = "de.daevo.app", produkte = "", jetzt = Date.now() }: { kontoId?: string; bundleId?: string; produkte?: string; jetzt?: number },
): Promise<{ konto?: Konto | null; fehler?: string; status: number }> {
  if (t.bundleId !== bundleId) return { fehler: "Das Abo gehört zu einer anderen App.", status: 400 };
  if (!t.originalTransactionId) return { fehler: "Transaktion ohne Kennung.", status: 400 };
  const stufe = stufeAusProdukt(String(t.productId || ""), produkte);
  if (!stufe) return { fehler: `Unbekanntes Produkt ${t.productId}.`, status: 400 };
  const zuordnung = `appstore.orig.${t.originalTransactionId}`;
  const bekannt = await kv.get(zuordnung);
  if (kontoId && bekannt && bekannt !== kontoId) {
    return { fehler: "Dieses Abo gehört zu einem anderen Konto. Melde dich mit Apple an, dann kommt es zurück.", status: 409 };
  }
  const ziel = bekannt || kontoId;
  if (!ziel) return { fehler: "Kein Konto zu diesem Abo.", status: 404 };
  if (!bekannt) await kv.put(zuordnung, ziel);
  const vorbei = t.revocationDate || !t.expiresDate || t.expiresDate < jetzt;
  const konto = vorbei
    ? await stufeSetzen(kv, ziel, "frei", undefined, "appstore")
    : await stufeSetzen(kv, ziel, stufe, tagAus(t.expiresDate!, KULANZ_TAGE), "appstore");
  return { konto, status: konto ? 200 : 404 };
}

export async function appleJwsAnwenden(
  kv: KVNamespace,
  jws: string,
  o: { kontoId?: string; bundleId?: string; produkte?: string; wurzel?: string; jetzt?: number },
): Promise<{ konto?: Konto | null; fehler?: string; status: number }> {
  const p = await appleJwsPruefen(jws, { wurzel: o.wurzel ?? APPLE_ROOT_G3_SHA256 });
  if ("fehler" in p) return { fehler: p.fehler, status: 401 };
  return appleAnwenden(kv, p.inhalt as AppleTransaktion, o);
}

/**
 * App Store Server Notifications, Fassung 2. Apple meldet Verlängerung,
 * Kündigung, Rückerstattung und Ablauf. Die Meldung ist selbst eine JWS, und
 * die Transaktion darin noch einmal.
 */
export async function appleMeldung(
  kv: KVNamespace,
  signedPayload: string,
  o: { bundleId?: string; produkte?: string; wurzel?: string; jetzt?: number },
): Promise<{ status: number; fehler?: string }> {
  const aussen = await appleJwsPruefen(signedPayload, { wurzel: o.wurzel ?? APPLE_ROOT_G3_SHA256 });
  if ("fehler" in aussen) return { status: 401, fehler: aussen.fehler };
  const daten = (aussen.inhalt as { data?: { signedTransactionInfo?: string } }).data;
  if (!daten?.signedTransactionInfo) return { status: 200 };
  const r = await appleJwsAnwenden(kv, daten.signedTransactionInfo, o);
  // Ein Abo ohne bekanntes Konto ist kein Fehler für Apple. Sonst stellt
  // Apple dieselbe Meldung tagelang neu zu.
  return { status: r.status === 401 ? 401 : 200, ...(r.fehler ? { fehler: r.fehler } : {}) };
}

/* ---------- Stripe ---------- */

/**
 * Prüft die Signatur eines Stripe Webhooks: HMAC SHA-256 über
 * "Zeitstempel.Inhalt" mit dem Geheimnis des Endpunkts, höchstens fünf
 * Minuten alt. So beschrieben in der Stripe Dokumentation unter "Verify
 * webhook signatures manually".
 */
export async function stripeSignaturPruefen(roh: string, kopf: string, geheimnis: string, jetzt = Date.now()): Promise<boolean> {
  if (!geheimnis || !kopf) return false;
  const teile = Object.fromEntries(kopf.split(",").map((p) => p.split("=") as [string, string]).filter((p) => p.length === 2)) as Record<string, string>;
  const signaturen = kopf.split(",").filter((p) => p.startsWith("v1=")).map((p) => p.slice(3));
  const t = Number(teile.t);
  if (!Number.isFinite(t) || Math.abs(jetzt / 1000 - t) > 300 || signaturen.length === 0) return false;
  const schluessel = await crypto.subtle.importKey("raw", new TextEncoder().encode(geheimnis), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", schluessel, new TextEncoder().encode(`${t}.${roh}`)));
  const erwartet = [...mac].map((b) => b.toString(16).padStart(2, "0")).join("");
  // Vergleich in fester Zeit, damit die Laufzeit nichts über die Signatur verrät.
  return signaturen.some((s) => {
    if (s.length !== erwartet.length) return false;
    let unterschied = 0;
    for (let i = 0; i < s.length; i++) unterschied |= s.charCodeAt(i) ^ erwartet.charCodeAt(i);
    return unterschied === 0;
  });
}

interface StripeAbo {
  id: string;
  status: string;
  current_period_end?: number;
  trial_end?: number | null;
  items?: { data?: Array<{ current_period_end?: number; price?: { id?: string; lookup_key?: string | null; metadata?: Record<string, string> } }> };
}

async function stripeAboAnwenden(kv: KVNamespace, abo: StripeAbo, preise: string): Promise<void> {
  await kv.put(`stripe.zustand.${abo.id}`, JSON.stringify(abo), { expirationTtl: 60 * 60 * 24 * 400 });
  const kontoId = await kv.get(`stripe.abo.${abo.id}`);
  if (!kontoId) return;
  const preis = abo.items?.data?.[0]?.price;
  const stufe = (preis?.metadata?.stufe === "plus" || preis?.metadata?.stufe === "pro")
    ? preis.metadata.stufe
    : stufeAusProdukt(String(preis?.lookup_key || preis?.id || ""), preise);
  const ende = abo.current_period_end ?? abo.items?.data?.[0]?.current_period_end ?? abo.trial_end ?? null;
  const laeuft = ["trialing", "active", "past_due"].includes(abo.status);
  if (laeuft && stufe && ende) await stufeSetzen(kv, kontoId, stufe, tagAus(ende * 1000, KULANZ_TAGE), "stripe");
  else if (!laeuft) await stufeSetzen(kv, kontoId, "frei", undefined, "stripe");
}

/**
 * Verarbeitet ein geprüftes Stripe Ereignis. Der Kauf über einen Payment
 * Link trägt die Kontokennung als `client_reference_id` im Checkout, die
 * Stufe steht am Abo. Beide Ereignisse kommen in keiner festen Reihenfolge,
 * deshalb wird der Stand des Abos gemerkt und angewendet, sobald die
 * Zuordnung da ist.
 */
export async function stripeEreignis(kv: KVNamespace, ereignis: { type?: string; data?: { object?: Record<string, unknown> } }, preise = ""): Promise<void> {
  const o = ereignis.data?.object ?? {};
  if (ereignis.type === "checkout.session.completed") {
    const kontoId = String(o.client_reference_id || "");
    const aboId = String(o.subscription || "");
    if (!kontoId || !aboId) return;
    await kv.put(`stripe.abo.${aboId}`, kontoId);
    const gemerkt = await kv.get(`stripe.zustand.${aboId}`);
    if (gemerkt) await stripeAboAnwenden(kv, JSON.parse(gemerkt) as StripeAbo, preise);
    return;
  }
  if (ereignis.type?.startsWith("customer.subscription.")) {
    await stripeAboAnwenden(kv, o as unknown as StripeAbo, preise);
  }
}
