import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relPath) {
  return fs.readFileSync(path.join(root, relPath), "utf8");
}

function assertIncludes(relPath, needle, label, errors) {
  const text = read(relPath);
  if (!text.includes(needle)) {
    errors.push(`${relPath}: missing ${label}`);
  }
}

function assertNotIncludes(relPath, needle, label, errors) {
  const text = read(relPath);
  if (text.includes(needle)) {
    errors.push(`${relPath}: still contains ${label}`);
  }
}

const errors = [];

const requiredFiles = [
  "docs/LAUNCH_CHECKLIST.md",
  "docs/FEATURE_FLAG_ACTIVATION_MATRIX.md",
  "src/launchState.js",
  "src/App.jsx",
  "public/landing/index.html",
  "public/bonus-bet/index.html",
  "public/arb-calculator/index.html",
  "public/profit-boost/index.html",
  "public/sportsbook-promo/index.html",
  "public/promogrind-vs-profitduel/index.html",
  "public/promogrind-vs-oddsjam/index.html",
  "public/promogrind-vs-betterbet/index.html",
];

for (const relPath of requiredFiles) {
  if (!fs.existsSync(path.join(root, relPath))) {
    errors.push(`${relPath}: file not found`);
  }
}

if (errors.length === 0) {
  assertIncludes("src/App.jsx", "MemberWelcomeCard", "member onboarding card", errors);
  assertIncludes("src/App.jsx", "Free Vault membership", "free membership messaging", errors);
  assertIncludes("src/App.jsx", "Paid checkout is not live yet", "paid checkout beta messaging", errors);

  assertIncludes("docs/LAUNCH_CHECKLIST.md", "Must Have Before Soft Public Launch", "soft-launch checklist section", errors);
  assertIncludes("docs/FEATURE_FLAG_ACTIVATION_MATRIX.md", "VITE_PG_FEATURE_LIVE_SCANNER", "live scanner flag entry", errors);
  assertIncludes("src/launchState.js", "FEATURE_FLAGS", "feature flag map", errors);
  assertIncludes("src/launchState.js", "FEATURE_INFO", "feature info map", errors);

  const trustPages = [
    "public/bonus-bet/index.html",
    "public/arb-calculator/index.html",
    "public/profit-boost/index.html",
    "public/sportsbook-promo/index.html",
  ];

  for (const relPath of trustPages) {
    assertIncludes(relPath, "Free Vault membership", "free Vault membership trust copy", errors);
    assertIncludes(relPath, "1-800-GAMBLER", "responsible gambling notice", errors);
  }

  const comparisonPages = [
    "public/promogrind-vs-profitduel/index.html",
    "public/promogrind-vs-oddsjam/index.html",
    "public/promogrind-vs-betterbet/index.html",
  ];

  for (const relPath of comparisonPages) {
    assertIncludes(relPath, "beta-gated", "beta gating explanation", errors);
    assertIncludes(relPath, "Start with free Vault membership", "updated CTA", errors);
    assertNotIncludes(relPath, "Start for free — no credit card", "old CTA copy", errors);
    assertNotIncludes(relPath, "✅ Pro</span>", "overstated Pro-live badge", errors);
  }

  assertIncludes("public/landing/index.html", "beta rollout", "landing beta rollout messaging", errors);
  assertIncludes("public/landing/index.html", "free Vault membership", "landing access model copy", errors);
}

if (errors.length) {
  console.error("Launch smoke validation failed:\n");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log("Launch smoke validation passed.");
