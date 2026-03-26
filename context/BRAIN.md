# Brain

## Mental model

- How this project wins: Free beats paid. The existing tools (ProfitDuel at $99/mo, OddsJam at $199/mo) charge for what PromoGrind gives away. Traffic comes from SEO (knowledge base targeting long-tail keywords) and word-of-mouth (send a friend the link). Monetization happens passively through affiliate commissions on sportsbook signups ($25–$75+ CPA per user) + VaultSparked subscriptions ($24.99/mo or $199/yr).
- What matters most: Calculator accuracy and trust. If a user runs a hedge calculation and the math is wrong, they lose money and never come back. Correctness is the product.
- What tradeoffs we gladly make: Vanilla CSS for tiny bundle and no framework churn. Single App.jsx file for zero build complexity (tradeoff: harder to split when it grows beyond ~6,000 lines). Display-only currency conversion over full multi-currency for zero data migration risk.

## Working heuristics

- Heuristic: Never change calculator math without verifying the formula against a known source.
- When it applies: Any time a PR touches `src/math.js` or the calculator components in `src/App.jsx`.

- Heuristic: Keep the affiliate links in `src/books.js` — don't hardcode them anywhere else.
- When it applies: Every time a sportsbook link, CTA, or referral URL appears in the UI.

- Heuristic: The knowledge base articles are SEO assets. Treat their copy with the same care as calculator logic.
- When it applies: Any time KB content is edited, moved, or restructured.

- Heuristic: `syncAppData(d)` is the only correct way to save from Track components — never call `saveData()` directly.
- When it applies: Any time a Track component needs to persist user data.

- Heuristic: `CurrencyCtx` is display-only. Never use the FX rate for input parsing, storage, or math.
- When it applies: Any time currency conversion logic is touched.

## Current strategic beliefs

- Belief: The free-tool-with-affiliate-links model can generate meaningful recurring revenue once SEO traffic ramps up.
- Evidence: Comparable tools charge $99–$199/month and maintain large user bases. Affiliate CPAs are $25–$75+ per sportsbook signup.
- Confidence: High on model validity. Medium on timeline to meaningful SEO traffic (likely 3–6 months post-launch).

- Belief: The upgrade path (live odds scanner + daily briefing as paid tier) is the long-term revenue ceiling.
- Evidence: The Odds API exists, is affordable, and the free-to-paid funnel is proven in this market.
- Confidence: Medium — depends on sustained traffic from free tier.

- Belief: The biggest unsolved problem is SEO. 48 tools are invisible to Google as a pure SPA.
- Evidence: SEO score of 36/100 as of v8.0 audit. All calculators render client-side — Googlebot sees a blank div.
- Confidence: High on the problem. SSG via Vite SSG plugin or Astro migration would fix it.
- Priority: SSG should be the next major technical initiative after external setup (affiliate links, Stripe, Odds API).

- Belief: DailyDashboard is the highest-retention feature in the product.
- Evidence: Users who open the app daily (vs. only when converting a promo) see much more value. Dashboard drives DAU. Streak/consistency scores reinforce the habit loop.
- Confidence: High. Continue adding to Dashboard before adding new standalone tabs.

## Feature size warning

App.jsx is approaching ~5,000 lines as of session 9. At ~7,000 lines React hot module reload slows meaningfully. At ~8,000 lines the file becomes hard to navigate. Plan for one of:
1. Component extraction into separate files (e.g., `src/components/Ledger.jsx`) — preserves SPA architecture
2. Astro migration for SSG — resolves both the file size and SEO problems simultaneously

This is not urgent now but should be the leading architectural decision for a session 10+ milestone.
