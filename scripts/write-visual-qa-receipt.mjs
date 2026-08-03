#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { compileVisualQaReceipt } from './lib/visual-qa-receipt.mjs';

const args = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : fallback;
};
const root = process.cwd();
const reviewPath = path.resolve(root, value('--review', 'docs/visual-qa/REVIEW.json'));
const outputPath = path.resolve(root, value('--output', 'docs/visual-qa/LATEST.json'));

try {
  const review = JSON.parse(fs.readFileSync(reviewPath, 'utf8'));
  const receipt = compileVisualQaReceipt(review, { receiptDir: path.dirname(outputPath) });
  const temp = `${outputPath}.${process.pid}.tmp`;
  fs.writeFileSync(temp, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
  fs.renameSync(temp, outputPath);
  console.log(`visual QA receipt · ${receipt.captures.length} hash-bound captures · ${receipt.themes.join(' + ')} · PASS`);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
