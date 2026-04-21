<!-- truth-audit-version: 1.1 -->
# Truth Audit

Overall status: green
Last reviewed: 2026-04-21 (S66 deterministic promo parsing, shared operator surfaces, public-safe doctor hardening — 296/296 tests, build green, doctor 12/12, bundle 337.73KB/425KB)
Key source-of-truth changes this session:
- `src/lib/promoParse.js` and `supabase/functions/_shared/promo-parse.ts` are now the deterministic source of truth for recognizable promo-offer classification before LLM escalation.
- `supabase/functions/promo-advisor/index.ts` now uses the deterministic parser as a fast path and only calls Anthropic for ambiguous cases; `PromoAdvisorPanel.jsx` surfaces the result source as `INSTANT`.
- `src/auth.js` is now the client source of truth for checkout attribution forwarding (`pg_ref` + UTMs) and emits `paid_checkout_started`; `supabase/functions/create-checkout/index.ts` is the server source of truth for copying attribution into Stripe subscription metadata.
- `src/dashboard/operatorSurfaces.js` is now the shared source of truth for bankroll lookup, dashboard/studio snapshot assembly, alert-plan generation, and workflow routing used by both Daily Brief and Launch Command Center.
- `scripts/generate-project-contracts.mjs` now derives contract summaries and live surfaces from repo truth instead of emitting placeholder contract content.
- `scripts/lib/project-registry.mjs` is now the public-safe fallback source of project truth for validator scripts when the private portfolio registry is absent.
- Public-safe template shims now exist at `docs/templates/project-system/START_PROMPT.template.md`, `CLOSEOUT_PROMPT.template.md`, and `TRUTH_AUDIT.template.md` so prompt-version/compliance checks do not fail on missing private templates.
- `scripts/run-doctor.mjs` now treats local public-repo mode as first-class: genome strings like `green` are parsed correctly, launch JSON arrays are handled correctly, revenue freshness can read `docs/REVENUE_SIGNALS.md`, and local doctor checks no longer depend on nested Node subprocesses that fail in this environment.
- `docs/REVENUE_SIGNALS.md` is now a real generated surface for this public repo; revenue freshness reads from it when no portfolio-wide file exists.
Public-safe summary only. Sensitive verification notes are maintained privately.
