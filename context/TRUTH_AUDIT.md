<!-- truth-audit-version: 1.1 -->
# Truth Audit

Last reviewed: 2026-05-08 (S83)
Overall status: green
Next action: founder verifies S83 cold-load fix in incognito; then either fix the chronic Deploy Pages workflow red on `Verify production launch` or proceed with the three external manual proofs (`BetMGM` / `bet365` / `BetRivers` tracked URLs, Stripe smoke, friend beta).
Production deploy host: **GitHub Pages** (verified S83 via `x-github-request-id` header + Fastly via Varnish + `public/CNAME`). Cloudflare is DNS-only proxy. SPA fallback handled via `scripts/postbuild-pages.mjs` copying `dist/index.html → dist/404.html`. `_redirects` and `wrangler.toml` are NOT used by the live deploy chain.

---

## Source Hierarchy

1. `context/PROJECT_STATUS.json`
2. `context/LATEST_HANDOFF.md`
3. `context/CURRENT_STATE.md`
4. Generated contracts, runtime pack, startup brief, and other derived status surfaces

---

## Protocol Genome (/25)

| Dimension | Score | Notes |
|---|---|---|
| Schema alignment | 5 | `CURRENT_STATE.md`, `LATEST_HANDOFF.md`, `TASK_BOARD.md`, `LAUNCH_PROOFS.json`, `PROJECT_STATUS.json`, and deploy artifact truth agree that S82 repo-owned work advanced while remaining launch blockers are external proof tasks plus deploy verification of the local dashboard fix. |
| Prompt/template alignment | 4 | Canonical templates are aligned; the public/private repo shim tension is documented instead of treated as product truth drift. |
| Derived-view freshness | 5 | Startup brief, task board, launch proof queue, release plan, post-deploy artifact, and closeout surfaces now describe the same S82 posture. |
| Handoff continuity | 5 | Session 82 handoff reflects shipped repo-local work, deploy verification caveats, and the remaining external blockers. |
| Contradiction density | 4 | The main contradiction left is operational/public-repo policy around generated private-shim files, not product launch truth. |
| **Total** | **23 / 25** | Green-yellow: canonical truth surfaces are coherent; remaining yellow state is due to external launch proofs and public/private ops shim tension. |

---

## Drift Heatmap

| Area | Canonical source | Derived surfaces | Status | Last checked | Action |
|---|---|---|---|---|---|
| Project identity | `context/PROJECT_STATUS.json` | startup brief, contracts, runtime pack | green | 2026-05-01 | PromoGrind status reflects `FORGE`, public-unlaunched, S82 dashboard/runtime launch-hardening, and unchanged external proof blockers. |
| Session continuity | `context/LATEST_HANDOFF.md` + `context/CURRENT_STATE.md` | startup brief, audit JSON, compact handoff | green | 2026-05-01 | S82 write-back aligns state, handoff, task board, work log, release plan, post-deploy artifact, audit, and memory around the same proof-honest launch-hardening tranche. |
| Capability truth | `context/STUDIO_MANIFEST.json` | contracts, runtime pack | green | 2026-04-23 | Manifest remains the source of capability truth; contract generation now reads status via the shared helper. |
| IGNIS truth | `context/PROJECT_STATUS.json` + local IGNIS history | `context/contracts/ignis.json`, startup brief | green | 2026-04-23 | Derived IGNIS surfaces still agree on `47857 FORGE` pending the next refresh cycle. |
| Startup reliability | `scripts/render-startup-brief.mjs` + `scripts/lib/context-parsing.mjs` | `docs/STARTUP_BRIEF.md` | green | 2026-04-24 | Launch gate and UX smoke now give next-session startup a clearer readiness baseline. |
| Launch-proof truth | `context/LAUNCH_PROOFS.json` + `scripts/update-launch-proof.mjs` + `scripts/verify-production-launch.mjs` + live Supabase/GitHub config | `docs/RELEASE_PLAN.md`, `context/TASK_BOARD.md`, handoff docs, deploy artifacts, `launch:status` | yellow | 2026-05-01 | Proof updates remain evidence-gated; deploy artifact confirms infra/billing health, but required sportsbook monetization links, real Stripe smoke, and friend beta remain incomplete. |
| Production dashboard runtime | `npm run smoke:production-dashboard` + `src/App.jsx` | task board, release plan, handoff | yellow | 2026-05-01 | Live bundle currently throws `ReferenceError: syncDiagnostics is not defined`; source fix is local and must be deployed before this row goes green. |
| Public-repo sanitization | `.gitignore` + git tracking | public commits | green | 2026-04-24 | Strict public-repo sanitization reports 0 critical / 0 warning and no longer false-flags public protocol/provenance docs or ignored local ops state. |
| VaultSpark website listing | `context/PROJECT_STATUS.json` + `context/STUDIO_MANIFEST.json` | `vaultsparkstudios.com/projects/promogrind/` | green | 2026-04-24 | Website copy now says deployed/FORGE/public-unlaunched, 53 calculators, beta-gated paid/AI surfaces, and points CTA traffic to `https://promogrind.bet/`. |
| Public trust copy | `src/analytics.js` + public pages | `/privacy/`, `/data-policy/` | green | 2026-04-28 | Privacy/data-policy pages now describe the PostHog/Sentry analytics and diagnostics posture instead of stale Plausible/no-cookie claims. |
| Protocol FAQ cache | `docs/SESSION_PROTOCOL.md` + `AGENTS.md` | `docs/PROTOCOL_FAQ.md`, `ops.mjs ask --list` | green | 2026-04-28 | Cached public-safe protocol Q&A exists and `node scripts/ops.mjs ask --list` returns populated entries. |

---

## Current Contradictions

- Historical startup briefs and genome history snapshots contain template-era values (`0/25`, `0/1000`) that no longer describe the repo accurately.
- `required_launch_monetization` is still red by design because no real approved tracking/referral URLs exist locally for `BetMGM`, `bet365`, and `BetRivers`; docs and verifier must keep saying that until the operator provides them.
- The current live dashboard bundle is red by production smoke until the S82 source fix deploys.
- Full-suite `npm test` passes, but Vitest can still emit non-fatal worker termination warnings after completion.
- Genius List cache can become stale after closeout because status/context files are updated; refresh it at the next `/start` or `/go`.

## Resolved This Session (S82)

- Added `npm run smoke:production-dashboard` to capture live dashboard console/runtime errors through Chrome DevTools Protocol.
- Used the new smoke to capture the founder-reported live dashboard crash (`syncDiagnostics is not defined`) and fixed the source path in `DailyDashboard`.
- Added `npm run launch:status` so local launch gate, production dashboard smoke, artifact ingest, and manual proof guide can be run from one command.
- Extracted profit milestone/goal notifications from `src/App.jsx` into `src/app/useProfitNotifications.js`.
- Re-ingested deploy artifact run `25181776729`; Supabase/VAPID/signup/billing/checkout/customer-portal checks pass, with only affiliate/required monetization checks red.
- Verified `npm run verify:launch-local` green end-to-end (`392/392`, launch smoke, UX route integrity, browser smoke, bundle budget, strict public-repo sanitization).

## Resolved This Session (S80)

- Added `docs/PROTOCOL_FAQ.md` with 10 public-safe session-protocol Q&A entries.
- Restored `node scripts/ops.mjs ask --list` to a populated protocol FAQ output.
- Updated public `/privacy/` and `/data-policy/` copy to match the actual PostHog/Sentry analytics and diagnostics stack.
- Produced the S80 project audit plan covering UI/UX, engagement, AI, security, performance, organization, and API/token efficiency.
- Verified UX route integrity, strict public-repo sanitization, protocol FAQ listing, and Studio doctor.

## Resolved This Session (S79)

- Added `nextStep` and `evidenceRequired` launch-proof metadata for affiliate links, Stripe smoke, and friend beta.
- Added `node scripts/update-launch-proof.mjs --list --guide` so manual proof requirements can be printed without editing JSON.
- Made scanner/community workflow suggestions deterministic with stable IDs/source IDs.
- Hardened workflow upserts so duplicate queued suggestions do not downgrade progressed workflow state.
- Added activation-funnel and required launch-link observability to the dashboard operator readout.
- Routed `Community Promos` to the extracted board component instead of the stale inline `src/App.jsx` implementation.
- Verified targeted tests, isolated calculator tests, production build, launch smoke, UX integrity, bundle budget, and strict public-repo sanitization.

## Resolved This Session (S78)

- Normalized calculator, tracker, and shadow-book sportsbook CTA analytics onto `getBookLinkMeta` / `getBookLinkAnalyticsProps`.
- Added `adaptiveRankingSnapshot` so dashboard ranking decisions expose top promo, reason counts, hot/cold signals, queue pressure, and feedback coverage.
- Extracted checkout-unavailable notification handling into `src/app/AppNotifications.jsx`, reducing `src/App.jsx` shell responsibility.
- Hardened `scripts/update-launch-proof.mjs` with `--list`, status validation, and evidence-required proof completion.
- Verified `npm run verify:launch-local` green with `381/381` tests, launch smoke, UX route integrity, browser smoke, bundle budget, and strict public-repo sanitization.

## Resolved This Session (S77)

- Added `npm run verify:launch-local` as the canonical local readiness gate.
- Added UX route integrity validation for app route slugs, public HTML links, required public pages, responsible-gambling copy, and free-account copy.
- Fixed browser smoke port allocation so stale local preview processes do not create false failures.
- Fixed Stripe readiness fallback and public-repo sanitization behavior for standalone public repo mode.
- Refreshed Missouri legal/SEO copy and release docs to match current facts and `380/380` test truth.
- Synced VaultSpark website PromoGrind project copy/status/CTAs to current deployed/FORGE/public-unlaunched truth and cleared website project-info P1 drift.

## Resolved This Session (S74)

- Added `context/LAUNCH_PROOFS.json` as the canonical machine-readable surface for manual launch blockers.
- Taught `scripts/check-launch-ready.mjs` to treat pending launch proofs as partial readiness instead of reporting PromoGrind as launch-ready while manual blockers remain.
- Tightened `scripts/verify-production-launch.mjs` and `src/books.js` so launch monetization truth now fails on the exact missing books (`BetMGM`, `bet365`, `BetRivers`) and rejects generic partner/signup URLs as fake tracked links.
- Added a deploy-time `launch-verification` artifact path in `.github/workflows/deploy-pages.yml` so post-push verification produces a retained summary instead of local console output only.
- Extracted `AppChrome`/`appText` from `src/App.jsx` and fixed several public-facing mojibake/copy issues without changing the external blocker truth.

## Resolved This Session (S73)

- Patched the GitHub Pages deploy workflow so push rollout now reads both `VITE_VAPID_PUBLIC_KEY` and `VITE_PG_FEATURE_PUSH_ALERTS` from Actions secrets.
- Tuned adaptive mission-control ranking so expiring value outranks non-urgent backlog while hot/cold lane signals and backlog pressure are surfaced explicitly.
- Moved more repo-facing scripts (`render-fast-start`, `render-action-queue`, `render-founder-control`, `generate-project-contracts`, `closeout-autopilot`) onto the shared context parser.
- Refreshed Session 73 repo truth after a green verification pass (`375/375` tests and production build passing).

## Resolved in S72

- Added adaptive dashboard intelligence, richer feedback telemetry, and shared AI response caching while keeping tests/build green.
- Reconciled live Supabase migration history, pushed a live schema-repair migration, and verified PostgREST access to the workflow/entity/feature-flag tables.
- Redeployed browser-invoked billing and beta edge functions with compatible JWT gateway settings; live `create-checkout` now succeeds.
- Wired VAPID truth across local env, GitHub Actions secrets, and Supabase secrets; patched the Pages workflow to consume `VITE_VAPID_PUBLIC_KEY`.
- Refreshed task/release/handoff surfaces so the sole remaining blocker is honest affiliate-link inventory rather than stale production failures.

## Resolved in S69

- Added gamification source modules (`src/lib/mastery.js`, `src/lib/achievements.js`, `src/lib/missions.js`) — new canonical sources for engagement data.
- Added `flagVisit` helper and wired all 4 previously un-completable mission check flags.
- Untracked `docs/CREATIVE_DIRECTION_RECORD.md`, `scripts/rotate-render-key.mjs`, `scripts/soul-interview.mjs` from git; added to `.gitignore`. Public-repo sanitization scan now clean.
- Refreshed handoff, work log, decisions, SIL, and state surfaces to describe S69.
## 2026-04-23 (S75) — runtime + routing truth refresh

- Root-path truth changed: `/` is now the marketing landing surface, not the immediate app shell. App-entry truth for public CTAs is `/dashboard`.
- Runtime truth changed: the missing `ParlayHedge` route was a real boot blocker and is now restored with a concrete calculator module.
- Service-worker truth changed: `public/sw.js` now guards cache writes against consumed/opaque responses, matching the production console failure that previously occurred.
- Remaining noise is honestly classified as non-blocking: browser-extension messages and PostHog remote-config/feature-flag failures are still visible in production but were not the cause of the app failing to boot.
