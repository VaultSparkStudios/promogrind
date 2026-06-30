# S106 Implement Plan

1. `push-control-runtime-integrity` - shipped; fixed missing `FEATURE_FLAGS`/`supabase` imports, stabilized `PushEnableBtn` hook order, and added focused render coverage.
2. `external-proof-evidence` - honestly deferred; real-world launch proof cannot be manufactured.

Verification:
- `npx vitest run src/__tests__/dashboardActionWidgets.test.jsx src/__tests__/appComposition.test.js` passed 2 files / 4 tests.