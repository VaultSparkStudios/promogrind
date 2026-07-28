import assert from "node:assert/strict";
import fs from "node:fs";
import { spawnSync } from "./lib/safe-spawn.mjs";

const taskBoard = fs.readFileSync("context/TASK_BOARD.md", "utf8");
const nowSection = taskBoard.match(/## Now\s*\r?\n([\s\S]*?)(?=\r?\n## |$)/)?.[1] ?? "";
const expectedNow = nowSection.split(/\r?\n/)
  .filter((line) => /^- (?:\[ \]\s*)?\S/.test(line)).length;
assert.ok(expectedNow > 0, "fixture requires a populated Now section");

const result = spawnSync(process.execPath, ["scripts/compute-entropy.mjs", "--json"], {
  encoding: "utf8",
});
assert.equal(result.status, 0, result.stderr);
const entropy = JSON.parse(result.stdout);
const nowSignal = entropy.signals.find((signal) => signal.name === "Now bucket");
assert.equal(nowSignal.note, `${expectedNow} open item(s)`);
assert.equal(nowSignal.score, 0);

const doctor = fs.readFileSync("scripts/run-doctor.mjs", "utf8");
assert.match(doctor, /d\.entropy \?\? d\.entropyScore \?\? 0/);

console.log(`Closeout observability regression passed (entropy ${entropy.entropy.toFixed(3)}; Now ${expectedNow}; doctor reads emitted key).`);
