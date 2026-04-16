# Creative Direction Record

This public repo now keeps only public-safe creative-direction summaries.

Boundary:
- detailed private creative direction and internal rationale live in the private Studio OS / ops repository

## 2026-04-15 — Session 45

**No new creative direction this session:** Work focused on recovering and closing out an interrupted refinement tranche. Existing product direction remains unchanged: practical trust-first UX, readable text, PromoGrind-native branding, and no reduction in clarity or accessibility.

---

## 2026-04-16 — Session 52

**No new creative direction this session:** Work focused on operator-state integration, drift intelligence, Studio export cohesion, and closeout truthfulness. Existing direction remains unchanged: trust-first operator UX, PromoGrind-native language, and product surfaces that explain machine guidance instead of inventing certainty.

---

## 2026-04-16 — Session 53

**No new creative direction this session:** Work focused on turning operator state into targeted actions, workflow-history trust surfaces, and state/book-aware personalization. Existing direction remains unchanged: trust-first operator UX, PromoGrind-native language, and recommendation surfaces that stay actionability-aware instead of making generic hypey suggestions.

---

## 2026-04-16 — Session 54

**No new creative direction this session:** Work focused on sync correctness, bundle recovery, and truthful closeout state. Existing direction remains unchanged: trust-first operator UX, PromoGrind-native language, and engineering choices that protect reliability before adding more visible surface area.

---

## 2026-04-16 — Session 55

**No new creative direction this session:** Work focused on finishing the sync compatibility-mirror tranche, deepening shared operating-graph logic, shipping observability/sync-state surfaces, and completing manual closeout truthfully. Existing direction remains unchanged: trust-first operator UX, PromoGrind-native language, and engineering choices that prefer visible correctness over flashy surface area.

---

## 2026-04-14 — Session 39

**Home tab content + text size:** User directed "build all of those at highest quality and expand the size of all menu/page text." Home group expanded to 6 tabs: Dashboard, Daily Brief, Get Started, What's New, Pricing, About. Global text size increase applied across all shared primitives (shared.js, ui.jsx) and App.jsx nav. Text readability is a design non-negotiable for this app — do not reduce text sizes without user direction.

**About page included in nav:** User confirmed About page should be accessible from the Home tab group, not just as a standalone /about/ route. This is the canonical pattern for discovery pages — they should always be in the nav, not buried.

---

## 2026-04-13 — Session 34

**Analytics: Cloudflare Web Analytics over Plausible:** User does not have a Plausible account and rejected it as expensive. Has Studio Hub and Google Analytics available. Chose Cloudflare Web Analytics — already on the stack (Cloudflare manages DNS for promogrind.bet), free forever, no cookies, no GDPR banner. Provisioned via Cloudflare API; beacon added to index.html. Do not suggest paid analytics tools.

---

## 2026-04-13 — Session 33

**Tier naming — "Grinder" rejected:** User flagged that "Grinder" sounds too close to "Grindr" (dating app) and rejected it immediately. Final tier names chosen: Free Agent → Scout → Runner → Closer → The House. These are all sports betting terminology forming a clear aspirational ladder.

**PromoChat removed from free tier:** User directed that PromoChat should require Scout+ minimum — no free access even for signed-in users. Rationale: Anthropic API cost; the free tier's value is the 53 calculators, not AI chat.

**Independent PromoGrind pricing:** User confirmed PromoGrind should have its own pricing completely decoupled from Vault Membership. Vault Membership is a separate product.

**Pricing structure confirmed:** Scout $9.99/mo · Runner $19.99/mo · Closer $34.99/mo · The House $149/mo. Annual discounts: Scout $79/yr · Runner $149/yr · Closer $249/yr.
