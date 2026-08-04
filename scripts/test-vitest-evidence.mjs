#!/usr/bin/env node
import assert from 'node:assert/strict';
import { summarizeVitestReport, applyVitestEvidence } from './lib/vitest-evidence.mjs';

const report = { success: true, numTotalTests: 4, numPassedTests: 4, testResults: [{status:'passed'}, {status:'passed'}] };
const green = summarizeVitestReport(report, { exitCode: 0, generatedAt: '2026-08-03T20:00:00.000Z', commitSha: 'abc1234' });
assert.equal(green.success, true);
assert.deepEqual(green.files, { passing: 2, total: 2 });
assert.deepEqual(green.assertions, { passing: 4, total: 4 });
const status = applyVitestEvidence({}, green);
assert.equal(status.testsPassing, 2);
assert.equal(status.testsAssertionsPassing, 4);
const red = summarizeVitestReport({ ...report, success: false, numPassedTests: 3 }, { exitCode: 1 });
assert.equal(applyVitestEvidence(status, red).testsLatestRunState, 'red');
assert.throws(() => summarizeVitestReport({}), /testResults/);
console.log('typed Vitest evidence: PASS');
