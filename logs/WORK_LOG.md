# Work Log

## 2026-04-14 — Post-S43 Project-Local Auth Rollout

- Added `src/components/AuthDialog.jsx` so PromoGrind owns sign-in/sign-up inside the app.
- Updated `src/auth.js` to support direct PromoGrind sign-up/sign-in against the shared Supabase auth project and to persist shared display name / username metadata.
- Rewired active React auth CTAs away from the Vault member URL and onto PromoGrind-local auth query links.
- Added `src/__tests__/launchState.test.js` for auth URL helper coverage.
- Verified `npm.cmd test`, `npm.cmd run build`, and `npm.cmd run smoke:launch` all pass after the auth UX change.

## 2026-04-14 — S43 Dashboard Extraction + Closeout

- Extracted dashboard derivation logic into `src/dashboard/today.js`.
- Added `src/components/dashboard/TodayDashboardPanel.jsx` and moved `DailyBriefPage` into `src/components/dashboard/DailyBriefPage.jsx`.
- Updated `src/App.jsx` to consume the extracted dashboard model/components and keep next-best-action logic shared.
- Added `src/__tests__/dashboard.test.js`; suite now at 133/133 passing.
- Synced PromoGrind-native account wording across launch smoke-covered public pages and trust-strip template.
- Updated launch smoke validators to current copy expectations; `npm.cmd run smoke:launch` now passes.
- Attempted browser smoke; script is updated but local execution still fails on preview subprocess `spawn EPERM`.
- Attempted Supabase function deploy; blocked because local Supabase auth/access token is not configured.

## 2026-04-14 — S42 Audit Follow-Through

- Added public-safe execution roadmap in `docs/REFINEMENT_ROADMAP.md`.
- Expanded `context/TASK_BOARD.md` with the audit-derived implementation queue: modularization, activation, feedback loop, personalization, observability, and performance controls.
- Added `supabase/functions/_shared/http.ts` and removed wildcard CORS from key edge functions.
- Tightened analytics replay privacy defaults in `src/analytics.js`.
- Updated extension distribution URLs to `promogrind.bet`.
- Replaced generated extension UI string injection with DOM-based rendering in popup + content scripts.
- Refreshed public memory files to S42 state.
- Verified `npm.cmd test` → 127/127 passing.
- Verified `npm.cmd run build` → passing.

## 2026-04-14 — S41 Sprint 1 Closeout

- Completed server-side AI access/quota hardening through shared `supabase/functions/_shared/ai-access.ts`.
- Wired quota/tier enforcement into PromoChat, PromoAdvisor, AI Action Plan, and Stack Builder.
- Added sportsbook CTA click tracking from calculator result CTAs.
- Added Dashboard "Next Best Action" activation card.
- Lazy-loaded PromoChat and PromoAdvisor; split analytics into a separate Vite chunk.
- Updated Wins Wall SQL migration and client publish path to support server upserts.
- Added Stripe smoke checklist.
- Updated public context/task board/decision/truth audit state.
- Verified `npm.cmd test` → 127/127 passing.
- Verified `npm.cmd run build` → passing; main app chunk reduced to ~392 kB.

This public repo no longer carries the detailed internal work log. Internal session-by-session execution detail is maintained privately.
