import test from "node:test";
import assert from "node:assert/strict";
import { chatHtml, chatSprechbar } from "./chat-format.js";

test("Übungszeilen werden eine Tabelle mit Sätzen, Wiederholungen und RIR", () => {
  const html = chatHtml("Training für heute steht.\n- Bankdrücken: 3 x 6-10, 2 in Reserve. Heute 82,5 kg\n- Dips: 3 x 6-10, 2 in Reserve");
  assert.match(html, /<p class="cp">Training für heute steht.<\/p>/);
  assert.match(html, /ct-training/);
  assert.match(html, /<td class="ct-name">Bankdrücken<span class="ct-zusatz">Heute 82,5 kg<\/span><\/td><td class="ct-zahl">3<\/td><td class="ct-zahl">6-10<\/td><td class="ct-zahl">2<\/td>/);
  assert.doesNotMatch(html, /- Dips/);
});

test("Name und Detail werden zwei Spalten, eine Uhrzeit trennt nicht", () => {
  const html = chatHtml("- 14:00 Kunde: Angebot mitnehmen\n- Einkauf: Quark und Reis");
  assert.match(html, /<th scope="row">14:00 Kunde<\/th><td>Angebot mitnehmen<\/td>/);
  assert.match(html, /<th scope="row">Einkauf<\/th>/);
});

test("Punkte ohne Doppelpunkt werden eine Liste, ein einzelner bleibt Text", () => {
  assert.match(chatHtml("- Wasser trinken\n- früh ins Bett"), /<ul class="cl"><li>Wasser trinken<\/li><li>früh ins Bett<\/li><\/ul>/);
  assert.doesNotMatch(chatHtml("- nur einer"), /<ul/);
});

test("Tabellen mit Strichen werden echte Tabellen und vorgelesen ohne Striche", () => {
  const t = "| Tag | Training |\n|---|---|\n| Montag | Push |\n| Dienstag | Pull |";
  const html = chatHtml(t);
  assert.match(html, /<th>Tag<\/th><th>Training<\/th>/);
  assert.match(html, /<td>Montag<\/td><td>Push<\/td>/);
  assert.equal(chatSprechbar(t), "Tag, Training.\nMontag, Push.\nDienstag, Pull.");
});

test("Text wird maskiert", () => {
  assert.match(chatHtml("<b>x</b>"), /&lt;b&gt;/);
  assert.match(chatHtml("- <i>: a\n- b: c"), /&lt;i&gt;/);
});

test("Sternchen um eine Hervorhebung werden Fettdruck und stehen nie roh da", () => {
  const html = chatHtml("**Vor dem Start:** Iss etwas Schnelles.");
  assert.match(html, /<strong>Vor dem Start:<\/strong>/);
  assert.ok(!html.includes("**"));
  assert.ok(!chatSprechbar("**Achtung** jetzt").includes("*"));
});
