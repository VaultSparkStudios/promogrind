#!/usr/bin/env node
import assert from "node:assert/strict";
import { scanPublicClaimText } from "./lib/public-claims.mjs";

const bad = [
  ["en", "Turn every bonus into guaranteed cash with no effort."],
  ["es", "Convierte el bono en ganancia garantizada y sin riesgo."],
  ["pt", "Use o hedge para garantir lucro sem risco."],
];
for (const [locale, text] of bad) {
  const findings = scanPublicClaimText(text, `${locale}.html`);
  assert(findings.some((finding) => finding.locale === locale), `expected ${locale} finding`);
}

const safe = [
  "PromoGrind does not guarantee a financial outcome.",
  "Las apuestas no garantizan ganancias.",
  "A ferramenta não garante retorno.",
  "A modeled return can change because odds, limits, voids, and eligibility change.",
];
for (const text of safe) assert.equal(scanPublicClaimText(text).length, 0, text);
console.log("public-claims regression: 3 locales blocked; explicit negations and sober modeled language allowed");
