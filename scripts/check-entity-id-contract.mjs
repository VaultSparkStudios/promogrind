#!/usr/bin/env node

import fs from "node:fs";

const governed = [
  "src/components/ResultFeedbackCard.jsx",
  "src/components/BetTracker.jsx",
  "src/components/Ledger.jsx",
  "src/app/DashboardActionWidgets.jsx",
  "src/app/CSVImportModal.jsx",
  "src/components/TrackingTools.jsx",
  "src/components/dashboard/PromoExpiryWidget.jsx",
  "src/calculators/BonusBet.jsx",
  "src/components/LiveScanner.jsx",
  "src/lib/trustReceipts.js",
  "src/playbooks/index.js",
];

const findings = [];
for (const file of governed) {
  const source = fs.readFileSync(file, "utf8");
  const patterns = [
    { id: "clock-id", re: /\bid\s*:\s*Date\.now\(\)/g },
    { id: "clock-random-id", re: /\$\{Date\.now\(\)\}[^\n]{0,80}Math\.random\(\)/g },
    { id: "indexed-clock-id", re: /\bid\s*:\s*Date\.now\(\)\s*\+\s*index/g },
  ];
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern.re)) {
      const line = source.slice(0, match.index).split(/\r?\n/).length;
      findings.push({ file, line, rule: pattern.id, sample: match[0] });
    }
  }
}

if (findings.length) {
  console.error(JSON.stringify({ ok: false, findings }, null, 2));
  process.exit(1);
}

console.log(`entity-id contract passed · ${governed.length} governed writers · 0 clock-only IDs`);
