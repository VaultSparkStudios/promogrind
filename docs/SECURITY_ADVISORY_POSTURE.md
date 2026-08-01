# Security Advisory Posture

## GHSA-qwww-vcr4-c8h2 - monitored, not reachable

`npm audit` reports the React Router advisory **GHSA-qwww-vcr4-c8h2** against `react-router-dom@7.18.2`. The advisory concerns action execution in React Server Components (RSC) mode.

PromoGrind is a Vite-built static single-page application. Its router boundary is the client-only `BrowserRouter` in `src/main.jsx`; server behavior lives in separate Supabase Edge Functions. The application has no React Router RSC server, RSC action endpoint, or affected unstable RSC API import. The vulnerable execution path is therefore not reachable in the current architecture.

This is a narrow risk acceptance, not an audit-green claim:

- `npm audit --audit-level=high` is expected to report two high findings until an upstream stable version resolves this advisory.
- `scripts/check-router-advisory-posture.mjs` runs inside `test:session-invariants` and fails if the pinned version, client-only router boundary, or RSC-free source posture changes.
- Any future RSC adoption must remove this exception and upgrade to a patched compatible router before merge.
- The dependency remains monitored for a stable upstream fix.

The older audit-suggested `react-router-dom@7.11.0` was evaluated and rejected because it reintroduced a broader set of fixed redirect, XSS, and SSR-related advisories. Retaining the newer client-only version minimizes reachable risk.
