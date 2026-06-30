# Implement Plan - PromoGrind S102

Source audit: `docs/AUDIT_2026-06-30-S102.json`

## Sequenced Wave

1. `knowledge-base-route-extraction` - shipped first because it removed the largest reference-content block from `src/App.jsx`.
2. `profit-certificate-route-extraction` - shipped next because it was a self-contained Track route with share/local/Supabase behavior.
3. `leaderboard-route-extraction` - shipped after Profit Certificate because it used the same route-extraction pattern while preserving Supabase fallback behavior.
4. `daily-streak-widget-extraction` - shipped last as a compact shell-widget extraction that removed event-write/milestone logic from the app shell.
5. `external-proof-evidence` - honestly deferred; requires real mailbox/payment/tester/Brevo-routing evidence.

## Verification

- Focused composition test: passed 2/2 after each extraction wave.
- Hook-order guard: passed after each extraction wave.
- Full local launch gate: `npm run verify:launch-local` passed end to end.
