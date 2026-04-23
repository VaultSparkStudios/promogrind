import fs from "node:fs";

const inputPath = process.argv[2];
const outputPath = process.argv[3];

if (!inputPath || !outputPath) {
  console.error("Usage: node scripts/render-launch-verification-summary.mjs <input.json> <output.md>");
  process.exit(1);
}

const payload = JSON.parse(fs.readFileSync(inputPath, "utf8"));
const failed = Array.isArray(payload.results) ? payload.results.filter((item) => !item.ok) : [];
const passing = Array.isArray(payload.results) ? payload.results.filter((item) => item.ok) : [];

const lines = [
  "# Launch Verification Summary",
  "",
  `- Overall: ${payload.ok ? "PASS" : "FAIL"}`,
  `- Checks passed: ${passing.length}`,
  `- Checks failed: ${failed.length}`,
  "",
  "## Failed Checks",
  "",
  ...(failed.length
    ? failed.map((item) => `- \`${item.name}\`: ${item.detail}`)
    : ["- None"]),
  "",
  "## Passing Checks",
  "",
  ...(passing.length
    ? passing.map((item) => `- \`${item.name}\`: ${item.detail}`)
    : ["- None"]),
  "",
];

fs.writeFileSync(outputPath, lines.join("\n"));
