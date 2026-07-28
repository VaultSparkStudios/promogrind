import fs from "node:fs";
import assert from "node:assert/strict";

const toggle = fs.readFileSync("src/components/AccessibleToggle.jsx", "utf8");
assert.match(toggle, /<button/);
assert.match(toggle, /role="switch"/);
assert.match(toggle, /aria-checked=\{active\}/);
assert.match(toggle, /type="button"/);
assert.match(toggle, /disabled=\{disabled\}/);

for (const path of [
  "src/app/DashboardWidgets.jsx",
  "src/calculators/UtilityCalculators.jsx",
  "src/components/ProfilePanel.jsx",
]) {
  const source = fs.readFileSync(path, "utf8");
  assert.match(source, /AccessibleToggle/);
  assert.doesNotMatch(source, /<div[^>]+role="checkbox"/);
}

console.log("Accessible toggle contract passed (native keyboard activation, switch semantics, no div-checkbox regressions).");
