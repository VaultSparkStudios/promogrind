# Brain

## Mental model

- How this project wins: Free beats paid. The existing tools (ProfitDuel at $99/mo, OddsJam at $199/mo) charge for what PromoGrind gives away. Traffic comes from SEO (knowledge base targeting long-tail keywords) and word-of-mouth (send a friend the link). Monetization happens passively through affiliate commissions on sportsbook signups.
- What matters most: Calculator accuracy and trust. If a user runs a hedge calculation and the math is wrong, they lose money and never come back. Correctness is the product.
- What tradeoffs we gladly make: No backend complexity in exchange for instant load times and zero hosting cost. No accounts/auth in exchange for zero friction. Vanilla CSS in exchange for a tiny bundle and no framework churn.

## Working heuristics

- Heuristic: Never change calculator math without verifying the formula against a known source.
- When it applies: Any time a PR touches `src/math.js` or the calculator components in `src/App.jsx`.

- Heuristic: Keep the affiliate links in `src/books.js` — don't hardcode them anywhere else.
- When it applies: Every time a sportsbook link, CTA, or referral URL appears in the UI.

- Heuristic: The knowledge base articles are SEO assets. Treat their copy with the same care as calculator logic.
- When it applies: Any time KB content is edited, moved, or restructured.

## Current strategic beliefs

- Belief: The free-tool-with-affiliate-links model can generate meaningful recurring revenue once SEO traffic ramps up.
- Evidence: Comparable tools charge $99–$199/month and maintain large user bases. Affiliate CPAs are $25–$75+ per sportsbook signup.
- Confidence: High on model validity. Medium on timeline to meaningful SEO traffic (likely 3–6 months post-launch).

- Belief: The upgrade path (live odds scanner as paid tier) is the long-term revenue ceiling.
- Evidence: The Odds API exists, is affordable, and the free-to-paid funnel is proven in this market.
- Confidence: Medium — depends on sustained traffic from free tier.
