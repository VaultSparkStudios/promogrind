import fs from "node:fs";
import path from "node:path";

const inputPath = process.argv[2];
const outputPath = process.argv[3];

if (!inputPath || !outputPath) {
  console.error("Usage: node scripts/render-launch-verification-summary.mjs <input.json> <output.md>");
  process.exit(1);
}

const payload = JSON.parse(fs.readFileSync(inputPath, "utf8"));
const dashboardSmokePath = path.join(path.dirname(inputPath), "production-dashboard-smoke.json");
let dashboardSmoke = null;
if (fs.existsSync(dashboardSmokePath)) {
  try {
    const raw = fs.readFileSync(dashboardSmokePath, "utf8").trim();
    dashboardSmoke = raw ? JSON.parse(raw) : { ok: false, failures: ["production dashboard smoke did not emit JSON"] };
  } catch (error) {
    dashboardSmoke = { ok: false, failures: [`could not parse production dashboard smoke JSON: ${error.message}`] };
  }
}
const failed = Array.isArray(payload.results) ? payload.results.filter((item) => !item.ok) : [];
const blockingFailed = failed.filter((item) => item.severity !== "advisory");
const advisoryFailed = failed.filter((item) => item.severity === "advisory");
const passing = Array.isArray(payload.results) ? payload.results.filter((item) => item.ok) : [];

const lines = [
  "# Launch Verification Summary",
  "",
  `- Deploy health: ${payload.ok ? "PASS" : "FAIL"}`,
  `- Checks passed: ${passing.length}`,
  `- Blocking checks failed: ${blockingFailed.length}`,
  `- Advisory launch checks failed: ${advisoryFailed.length}`,
  "",
  "## Blocking Failed Checks",
  "",
  ...(blockingFailed.length
    ? blockingFailed.map((item) => `- \`${item.name}\`: ${item.detail}`)
    : ["- None"]),
  "",
  "## Advisory Launch Gaps",
  "",
  ...(advisoryFailed.length
    ? advisoryFailed.map((item) => `- \`${item.name}\`: ${item.detail}`)
    : ["- None"]),
  "",
  "## Production Dashboard Smoke",
  "",
  ...(dashboardSmoke
    ? [
        `- Status: ${dashboardSmoke.ok ? "PASS" : "FAIL"}`,
        `- URL: ${dashboardSmoke.url || "not reported"}`,
        ...(Array.isArray(dashboardSmoke.failures) && dashboardSmoke.failures.length
          ? dashboardSmoke.failures.map((failure) => `- Failure: ${failure}`)
          : ["- Failures: None"]),
      ]
    : ["- Not run"]),
  "",
  "## Passing Checks",
  "",
  ...(passing.length
    ? passing.map((item) => `- \`${item.name}\`: ${item.detail}`)
    : ["- None"]),
  "",
];

fs.writeFileSync(outputPath, lines.join("\n"));
