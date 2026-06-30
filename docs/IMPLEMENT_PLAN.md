# Implementation Plan - 2026-06-30 S100

## Sequenced Wave

1. app-navigation-extraction - shipped; extracted mobile/search/quick-calc shell widgets from `src/App.jsx` into `src/app/AppNavigation.jsx`.
2. csv-import-parser-extraction - shipped; extracted `CSVImportModal` and pure `parseBetCsvRows` with focused tests.
3. state-legal-source-truth - shipped; moved state-legal alert truth to `src/lib/stateLegal.jsx`, fixed Missouri launched status, and imported `US_BOOK_STATES` explicitly.
4. app-composition-regression-gate - shipped; added App composition ownership and line-count guard.
5. external-proof-evidence - honest deferral; real mailbox/payment/tester/Brevo evidence still required.

## Validation

- Focused Vitest: passed 8/8.
- Full `npm test`: passed 508/508.
- `npm run verify:launch-local`: passed end to end.
