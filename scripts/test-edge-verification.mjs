import assert from "node:assert/strict";
import { discoverEdgeVerification } from "./lib/edge-verification.mjs";

const plan = discoverEdgeVerification();
assert.equal(plan.entries.length, 15, "all 15 Edge Function entrypoints must be typechecked");
assert.equal(plan.tests.length, 7, "all seven discovered Edge test files must execute");
assert.ok(plan.tests.includes("supabase/functions/_shared/advisor-privacy_test.ts"));
assert.ok(plan.tests.includes("supabase/functions/_shared/marketing-consent_test.ts"));
assert.ok(plan.tests.includes("supabase/functions/_shared/stack-builder-contract_test.ts"));
assert.ok(plan.tests.includes("supabase/functions/_shared/stripe-boundary_test.ts"));
assert.ok(plan.tests.includes("supabase/functions/__tests__/ai-access.test.ts"));
assert.ok(plan.entries.includes("supabase/functions/calc-api/index.ts"));
assert.equal(new Set(plan.entries).size, plan.entries.length);
assert.equal(new Set(plan.tests).size, plan.tests.length);

console.log(`Edge verification discovery passed (${plan.entries.length} entrypoints, ${plan.tests.length} test files).`);
