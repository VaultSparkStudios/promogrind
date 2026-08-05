#!/usr/bin/env node
import assert from "node:assert/strict";
import { scanPublicClaimDocument, scanPublicClaimText } from "./lib/public-claims.mjs";

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
  ["en", "Matched betting and promo conversion are legal in states with online betting."],
  ["en", "All gambling winnings are taxable ordinary income."],
  ["en", "Live right now for members — members are scanning these right now."],
  ["en", "Gift sent to friend@example.com. They'll get an email with 14-day access."],
  ["en", "You excel at promo conversion. Use this for maximum bankroll growth."],
  ["en", "EXCELLENT PLAY — Promo quality score 92."],
  ["en", "You both get 30 days free. No limit on referrals."],
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

const structuralBad = [
  '<section class="testimonials"><q>I made $400.</q><span class="testimonial-name">— Pat</span></section>',
  'Live Activity: 2m ago<script>setInterval(next, 1000)</script>',
  'Is PromoGrind legal? Yes. It is a calculator.',
  'Is this legal in my state? Yes, if online betting is legal where you live.',
  'OddsJam costs $99/mo for this feature.',
  'const count=((new Date().getHours()*7+new Date().getMinutes())%8)+2; return `${count} arb opportunities`;',
];
for (const text of structuralBad) assert.ok(scanPublicClaimDocument(text).length > 0, text);
assert.equal(scanPublicClaimDocument('Eligibility and local law vary by jurisdiction. PromoGrind is not legal advice.').length, 0);
assert.equal(scanPublicClaimDocument('Is this legal in my state? PromoGrind cannot determine that. Rules vary by jurisdiction; verify official regulator guidance. This is not legal advice.').length, 0);
assert.equal(scanPublicClaimText('Tax treatment can depend on current rules and individual facts.').length, 0);
console.log("public-claims regression: legal/outcome certainty, synthetic proof/liveness, delivery, usage-performance, play grades, referral limits, and stale prices blocked");
