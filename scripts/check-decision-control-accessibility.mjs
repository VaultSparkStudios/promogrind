import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SRC = path.join(ROOT, "src");
const failures = [];
let labelCount = 0;
let interactiveNodeCount = 0;

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : entry.isFile() && /\.jsx$/.test(entry.name) ? [full] : [];
  });
}

function relative(file) {
  return path.relative(ROOT, file).replaceAll("\\", "/");
}

for (const file of walk(SRC)) {
  const source = fs.readFileSync(file, "utf8");
  const name = relative(file);

  for (const match of source.matchAll(/<label\b([^>]*)>([\s\S]*?)<\/label>/g)) {
    labelCount += 1;
    const [, attributes, body] = match;
    const associated = /\bhtmlFor\s*=/.test(attributes) || /<(?:input|select|textarea)\b/.test(body);
    if (!associated) failures.push(`${name}: visible label is neither bound with htmlFor nor wrapping a form control`);
    if (/&nbsp;|\u00a0/.test(body)) failures.push(`${name}: blank spacer labels are forbidden`);
  }

  for (const match of source.matchAll(/<(div|span)\b([^>]*\bonClick\b[^>]*)>/gs)) {
    interactiveNodeCount += 1;
    // JSX arrow functions contain `=>`, so a plain tag regex can end before
    // attributes that follow onClick. Inspect a bounded source window too.
    const attributes = `${match[2]} ${source.slice(match.index, match.index + 700)}`;
    const explicitBackdrop = /\bdata-(?:backdrop-dismiss|click-shield)\b/.test(attributes);
    const keyboardContract = /\brole\s*=/.test(attributes) && /\btabIndex\s*=/.test(attributes) && /\bonKeyDown\s*=/.test(attributes);
    if (!explicitBackdrop && !keyboardContract) {
      failures.push(`${name}: mouse-only <${match[1]}> click target must become a native control or expose role + tabIndex + onKeyDown`);
    }
  }
}

const requiredContracts = {
  "src/components/BetTracker.jsx": [
    'htmlFor="bet-tracker-date"', 'id="bet-tracker-date"',
    'htmlFor="bet-tracker-book"', 'id="bet-tracker-book"',
    'htmlFor="bet-tracker-type"', 'id="bet-tracker-type"',
    'aria-label={`Status for ${e.book} ${e.type}`}',
    'aria-label={`Delete ${e.book} ${e.type} bet`}',
  ],
  "src/components/Ledger.jsx": [
    'htmlFor="ledger-date"', 'id="ledger-date"',
    'htmlFor="ledger-book"', 'id="ledger-book"',
    'htmlFor="ledger-type"', 'id="ledger-type"',
    'aria-label={`Edit ${e.book} ledger entry`}',
    'aria-label={`Delete ${e.book} ledger entry`}',
  ],
  "src/components/TrackingTools.jsx": [
    'htmlFor="arb-tracker-date"', 'htmlFor="arb-tracker-status"',
    'htmlFor="journal-date"', 'htmlFor="journal-notes"',
    'aria-label={`Remove odds comparison row ${i+1}`}',
  ],
  "src/App.jsx": [
    'aria-label="Go to PromoGrind dashboard"',
    'aria-label={`Unpin ${favItem.n}`}',
    'aria-label={`${isFav?"Unpin":"Pin"} ${t.n}`}',
  ],
};

for (const [name, tokens] of Object.entries(requiredContracts)) {
  const source = fs.readFileSync(path.join(ROOT, name), "utf8");
  for (const token of tokens) {
    if (!source.includes(token)) failures.push(`${name}: missing required accessibility contract token ${token}`);
  }
}

if (failures.length) {
  console.error(`decision-control-accessibility: FAIL (${failures.length})`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`decision-control-accessibility: PASS (${labelCount} labels associated; ${interactiveNodeCount} explicit non-native click nodes governed)`);
