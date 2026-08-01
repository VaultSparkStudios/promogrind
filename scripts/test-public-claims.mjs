#!/usr/bin/env node
import assert from "node:assert/strict";
import { scanPublicClaimText } from "./lib/public-claims.mjs";

const bad = [
  ["en", "Turn every bonus into guaranteed cash with no effort."],
  ["es", "Convierte el bono en ganancia garantizada y sin riesgo."],
  ["pt", "Use o hedge para garantir lucro sem risco."],
  ["en", "Most beginners earn £500–£1,500 in their first month."],
  ["es", "La mayoría de usuarios generan $150–400 por mes en ganancias."],
  ["pt", "Promoções podem gerar R$ 200 a R$ 1.000 por mês em lucro adicional."],
  ["multi", "Hedging turns the offer into pure profit."],
  ["en", "Regardless of which side wins, you pocket the return."],
  ["en", "Recurring profit is $300–$900/month for disciplined users."],
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
console.log("public-claims regression: multilingual certainty, typical earnings, and risk erasure blocked; sober modeled language allowed");
