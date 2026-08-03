import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { compileVisualQaReceipt } from '../../scripts/lib/visual-qa-receipt.mjs';

const roots = [];
afterEach(() => {
  for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true });
});

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'pg-visual-qa-'));
  roots.push(root);
  fs.mkdirSync(path.join(root, 'captures'));
  const captures = [];
  for (const [theme, width] of [['dark', 1440], ['dark', 390], ['light', 1440], ['light', 390]]) {
    const file = `captures/${theme}-${width}.png`;
    fs.writeFileSync(path.join(root, file), `${theme}-${width}`);
    captures.push({ file, page: '/fixture', theme, viewport: { width, height: 844 } });
  }
  return {
    root,
    review: {
      schemaVersion: 1,
      themes: ['dark', 'light'],
      captures,
      inspection: { renderedPixelsReviewed: true, reviewer: 'test', findings: ['reviewed'], fixesApplied: [], blockingDefectsOpen: 0 },
    },
  };
}

describe('visual QA receipt compiler', () => {
  it('hash-binds a complete desktop/mobile and dark/light matrix', () => {
    const { root, review } = fixture();
    const receipt = compileVisualQaReceipt(review, { receiptDir: root, now: new Date('2026-08-03T00:00:00Z') });
    expect(receipt.capturedAt).toBe('2026-08-03T00:00:00.000Z');
    expect(receipt.captures).toHaveLength(4);
    expect(receipt.captures.every((capture) => /^[a-f0-9]{64}$/.test(capture.sha256))).toBe(true);
  });

  it('rejects missing theme/viewport coverage and path traversal', () => {
    const { root, review } = fixture();
    review.captures = review.captures.filter((capture) => !(capture.theme === 'light' && capture.viewport.width === 390));
    expect(() => compileVisualQaReceipt(review, { receiptDir: root })).toThrow(/light mobile evidence is missing/);
    review.captures.push({ file: '../escape.png', page: '/fixture', theme: 'light', viewport: { width: 390, height: 844 } });
    expect(() => compileVisualQaReceipt(review, { receiptDir: root })).toThrow(/escapes the receipt directory/);
  });
});
