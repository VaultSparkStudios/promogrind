#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { compileReleaseParity, prepareReleaseParityArtifacts, renderReleaseParity, writeReleaseParityArtifacts } from './lib/release-parity.mjs';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'pg-parity-'));
try {
  const dir = path.join(root, 'docs', 'visual-qa', 'captures');
  fs.mkdirSync(dir, { recursive: true });
  for (const file of ['dd.png','dl.png','md.png','ml.png']) fs.writeFileSync(path.join(dir, file), file);
  const visual = {
    schemaVersion: 1, capturedAt: '2026-08-03T20:00:00.000Z', themes: ['dark','light'],
    captures: [
      {file:'captures/dd.png',page:'x',theme:'dark',viewport:{width:1440,height:900}},
      {file:'captures/dl.png',page:'x',theme:'light',viewport:{width:1440,height:900}},
      {file:'captures/md.png',page:'x',theme:'dark',viewport:{width:390,height:844}},
      {file:'captures/ml.png',page:'x',theme:'light',viewport:{width:390,height:844}},
    ],
    inspection:{renderedPixelsReviewed:true,reviewer:'test',findings:['reviewed'],fixesApplied:[],blockingDefectsOpen:0},
  };
  fs.writeFileSync(path.join(root, 'capacitor.config.ts'), 'export default {}');
  const payload = compileReleaseParity({ root, visualReceipt: visual, testEvidence:{success:true,files:{passing:2,total:2},assertions:{passing:4,total:4},reportSha256:'abc'} });
  assert.equal(payload.native.state, 'planned-no-native-projects');
  assert.match(renderReleaseParity(payload), /4\/4 assertions/);
  const artifacts = prepareReleaseParityArtifacts({ root, visualReceipt: visual, testEvidence:{success:true,files:{passing:2,total:2},assertions:{passing:4,total:4},reportSha256:'abc'} });
  writeReleaseParityArtifacts(artifacts);
  assert.deepEqual(JSON.parse(fs.readFileSync(artifacts.jsonPath, 'utf8')), artifacts.payload);
  assert.equal(fs.readFileSync(artifacts.mdPath, 'utf8'), artifacts.md);
  visual.inspection.renderedPixelsReviewed = false;
  assert.throws(() => compileReleaseParity({ root, visualReceipt: visual }), /renderedPixelsReviewed/);
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
console.log('release parity compiler: PASS');
