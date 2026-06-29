# Implement Plan - 2026-06-29

1. **risk-radar-dashboard** - shipped. Pure helper in `src/dashboard/today.js`, dashboard card in `TodayDashboardPanel`, focused test coverage.
2. **ai-cache-calibration-wiring** - shipped. Prompt-cache hit/miss accounting wired to Advisor/Chat, advisor workflow saves record AI prediction.
3. **canonical-launch-proof-command-center** - shipped. Launch Command Center now consumes canonical proof-derived blockers and treats nonblocking partial proof as advisory.
4. **external-proof-evidence** - honestly deferred. Real production auth email, Stripe smoke, and friend-beta proof still require real-world execution.

## Session 99 - 2026-06-29

1. **dual-audience-public-files** - shipped. Added `public/agents.json` and `public/.well-known/llms.txt` with product boundaries, rights, policy links, and agent guidance.
2. **contact-surface-hardening** - shipped. App footer and sitemap now expose `/contact/`; sitemap also lists the two agent-facing files.
3. **public-surface-route-guard** - shipped. `scripts/validate-ux-route-integrity.mjs` now requires `/contact/`, `/agents.json`, and `/.well-known/llms.txt`.
4. **brevo-contact-forwarding-proof** - honestly deferred to Studio Ops via Ark cargo `01JSAJMBF321A097D8CE8E12B9`; local `check-secrets --for brevo` is missing, so delivery is not claimed.
