# Product Requirements

## Goal

- User outcome: User inputs their sportsbook promotion details and immediately knows the exact hedge stake, guaranteed profit, and conversion rate — with zero guesswork.
- Business outcome: Each user who signs up at a sportsbook through the embedded affiliate links generates $25–$75+ in CPA commission. SEO traffic converts passively.

## Requirements

### Calculator accuracy

- Requirement: All calculator outputs must be mathematically correct for the stated scenario.
- Reason: Users stake real money based on these outputs. An error costs them money and destroys trust instantly.
- Acceptance signal: Each calculator result verified against a known reference case. Hedge math for bonus bets, first-bet offers, and arbitrage must match manual calculation.

### Zero-friction access

- Requirement: No sign-up, no account, no paywall to access any calculator.
- Reason: The free tool is the product. Friction kills conversion. Users must be able to paste in odds and get a result in under 30 seconds.
- Acceptance signal: New user can complete a hedge calculation on first visit in under 60 seconds.

### Mobile-friendly UI

- Requirement: All calculators must be fully usable on a smartphone screen.
- Reason: Most users will be at a sportsbook on their phone, needing the calculation right now.
- Acceptance signal: All inputs and outputs render correctly on 375px wide viewport.

### Affiliate link integrity

- Requirement: All sportsbook links must pass through the operator's affiliate/referral tracking URL.
- Reason: This is the primary revenue mechanism.
- Acceptance signal: Clicking any sportsbook CTA in the app routes through the configured link in `src/books.js`.

### Data persistence

- Requirement: P/L ledger and sportsbook tracker entries persist across browser sessions via localStorage.
- Reason: Users return to update records — losing data on refresh would make the tracker useless.
- Acceptance signal: Add an entry, close and reopen the tab, entry is still present.

### Legal compliance copy

- Requirement: App must display affiliate disclosure and 21+ / responsible gambling notice.
- Reason: FTC affiliate disclosure is legally required. Responsible gambling language is required in most US regulated states.
- Acceptance signal: Visible disclosure text present before launch.
