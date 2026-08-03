import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const sha256 = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

function fail(message) {
  throw new Error(`visual QA review: ${message}`);
}

export function compileVisualQaReceipt(review, { receiptDir, now = new Date() }) {
  if (!review || review.schemaVersion !== 1) fail('schemaVersion must be 1');
  if (!receiptDir) fail('receiptDir is required');
  if (review.inspection?.renderedPixelsReviewed !== true) fail('renderedPixelsReviewed must be true');
  if (!String(review.inspection?.reviewer || '').trim()) fail('inspection.reviewer is required');
  if (!Array.isArray(review.inspection?.findings) || review.inspection.findings.length === 0) fail('at least one inspection finding is required');
  if (!Array.isArray(review.inspection?.fixesApplied)) fail('inspection.fixesApplied must be an array');
  if ((review.inspection?.blockingDefectsOpen ?? 1) !== 0) fail('blockingDefectsOpen must be 0');

  const base = path.resolve(receiptDir);
  const captures = (review.captures || []).map((capture, index) => {
    const relative = String(capture.file || '').replaceAll('\\', '/');
    if (!relative || path.isAbsolute(relative)) fail(`capture ${index} must use a relative file path`);
    const resolved = path.resolve(base, relative);
    if (resolved !== base && !resolved.startsWith(`${base}${path.sep}`)) fail(`capture ${index} escapes the receipt directory`);
    if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) fail(`capture ${index} is missing: ${relative}`);
    if (!String(capture.page || '').trim()) fail(`capture ${index} page/state is required`);
    if (!['dark', 'light'].includes(capture.theme)) fail(`capture ${index} theme must be dark or light`);
    if (!Number.isFinite(Number(capture.viewport?.width)) || !Number.isFinite(Number(capture.viewport?.height))) fail(`capture ${index} viewport is invalid`);
    return { ...capture, file: relative, sha256: sha256(resolved) };
  });

  const themes = [...new Set((review.themes || []).map(String))];
  for (const theme of ['dark', 'light']) {
    if (!themes.includes(theme)) fail(`themes must include ${theme}`);
    if (!captures.some((capture) => capture.theme === theme && Number(capture.viewport.width) >= 1280)) fail(`${theme} desktop evidence is missing`);
    if (!captures.some((capture) => capture.theme === theme && Number(capture.viewport.width) <= 430)) fail(`${theme} mobile evidence is missing`);
  }

  return {
    schemaVersion: 1,
    capturedAt: now.toISOString(),
    themes,
    captures,
    inspection: review.inspection,
  };
}
