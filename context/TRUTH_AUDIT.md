<!-- truth-audit-version: 1.1 -->
# Truth Audit

Last reviewed: 2026-04-24 (S78)
Overall status: yellow
Next action: inspect the next deploy artifact after push, keep affiliate-link truth honest until real URLs exist, keep `npm run verify:launch-local` green as the canonical local launch gate, and use `context/LAUNCH_PROOFS.json` / `scripts/update-launch-proof.mjs --list` as the canonical manual blocker surface.

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
| Schema alignment | 5 | `CURRENT_STATE.md`, `LATEST_HANDOFF.md`, `TASK_BOARD.md`, `RELEASE_PLAN.md`, `LAUNCH_PROOFS.json`, and `PROJECT_STATUS.json` now agree that repo-owned work advanced while the only remaining launch blockers are external affiliate/verification tasks. |
| Prompt/template alignment | 4 | Canonical templates are aligned; the public/private repo shim tension is documented instead of treated as product truth drift. |
| Derived-view freshness | 5 | Startup brief, task board, release truth, launch checklist, and proof queue now describe the same S78 posture. |
| Handoff continuity | 5 | Session 78 handoff reflects shipped repo-local work, green verification, and the remaining external blockers. |
| Contradiction density | 4 | The main contradiction left is operational/public-repo policy around generated private-shim files, not product launch truth. |
| **Total** | **23 / 25** | Green-yellow: canonical truth surfaces are coherent; remaining yellow state is due to external launch proofs and public/private ops shim tension. |

---

## Drift Heatmap

| Area | Canonical source | Derived surfaces | Status | Last checked | Action |
|---|---|---|---|---|---|
| Project identity | `context/PROJECT_STATUS.json` | startup brief, contracts, runtime pack | green | 2026-04-24 | PromoGrind status now reflects `FORGE`, public-unlaunched, `381/381` tests, green local launch gate, S78 repo improvements, and unchanged external blockers. |
| Session continuity | `context/LATEST_HANDOFF.md` + `context/CURRENT_STATE.md` | startup brief, audit JSON, compact handoff | green | 2026-04-24 | S78 write-back aligns state, handoff, task board, work log, release docs, and audit around the same proof-honest launch-hardening tranche. |
| Capability truth | `context/STUDIO_MANIFEST.json` | contracts, runtime pack | green | 2026-04-23 | Manifest remains the source of capability truth; contract generation now reads status via the shared helper. |
| IGNIS truth | `context/PROJECT_STATUS.json` + local IGNIS history | `context/contracts/ignis.json`, startup brief | green | 2026-04-23 | Derived IGNIS surfaces still agree on `47857 FORGE` pending the next refresh cycle. |
| Startup reliability | `scripts/render-startup-brief.mjs` + `scripts/lib/context-parsing.mjs` | `docs/STARTUP_BRIEF.md` | green | 2026-04-24 | Launch gate and UX smoke now give next-session startup a clearer readiness baseline. |
| Launch-proof truth | `context/LAUNCH_PROOFS.json` + `scripts/update-launch-proof.mjs` + `scripts/verify-production-launch.mjs` + live Supabase/GitHub config | `docs/RELEASE_PLAN.md`, `context/TASK_BOARD.md`, handoff docs, deploy artifacts | yellow | 2026-04-24 | Local launch gate is green and proof updates are evidence-gated, but required sportsbook monetization links, real Stripe smoke, and friend beta remain incomplete. |
| Public-repo sanitization | `.gitignore` + git tracking | public commits | green | 2026-04-24 | Strict public-repo sanitization reports 0 critical / 0 warning and no longer false-flags public protocol/provenance docs or ignored local ops state. |
| VaultSpark website listing | `context/PROJECT_STATUS.json` + `context/STUDIO_MANIFEST.json` | `vaultsparkstudios.com/projects/promogrind/` | green | 2026-04-24 | Website copy now says deployed/FORGE/public-unlaunched, 53 calculators, beta-gated paid/AI surfaces, and points CTA traffic to `https://promogrind.bet/`. |

---

## Current Contradictions

- Historical startup briefs and genome history snapshots contain template-era values (`0/25`, `0/1000`) that no longer describe the repo accurately.
- `required_launch_monetization` is still red by design because no real approved tracking/referral URLs exist locally for `BetMGM`, `bet365`, and `BetRivers`; docs and verifier must keep saying that until the operator provides them.
- The deploy-time verification artifact needs to be checked after this push/deploy cycle completes.

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
