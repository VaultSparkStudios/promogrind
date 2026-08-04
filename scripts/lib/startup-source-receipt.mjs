import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

export function hashStartupBrief(body) {
  return createHash('sha256').update(String(body), 'utf8').digest('hex');
}

export function buildStartupSourceReceipt(input) {
  return {
    schemaVersion: '1.0',
    generatedAt: new Date().toISOString(),
    artifact: 'docs/STARTUP_BRIEF.md',
    briefSha256: hashStartupBrief(input.body),
    rendererVersion: input.rendererVersion,
    targetSession: input.targetSession,
    sourceSession: input.sourceSession,
    sources: input.sources,
    claims: input.claims || [],
  };
}

export function writeStartupSourceReceipt(root, receipt) {
  const target = path.join(root, 'audits', 'startup-source-latest.json');
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, JSON.stringify(receipt, null, 2) + '\n', 'utf8');
  return target;
}

export function verifyStartupSourceReceipt({ body, receipt, rendererVersion }) {
  const failures = [];
  if (!receipt || typeof receipt !== 'object') failures.push('receipt missing or unreadable');
  if (receipt?.briefSha256 !== hashStartupBrief(body)) failures.push('brief hash does not match receipt');
  if (receipt?.rendererVersion !== rendererVersion) failures.push('renderer version does not match canonical version');
  if (!Number.isInteger(receipt?.targetSession) || !Number.isInteger(receipt?.sourceSession)) failures.push('session provenance is incomplete');
  if (receipt?.targetSession !== receipt?.sourceSession + 1) failures.push('target session is not source session + 1');
  for (const claim of receipt?.claims || []) {
    if (!claim?.id || !claim?.rendered) failures.push('semantic claim is incomplete');
    else if (!String(body).includes(String(claim.rendered))) failures.push(`semantic claim missing from brief: ${claim.id}`);
  }
  return { ok: failures.length === 0, failures };
}
