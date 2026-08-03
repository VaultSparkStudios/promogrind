import { describe, expect, it } from 'vitest';
import { buildStartupSourceReceipt, verifyStartupSourceReceipt } from '../../scripts/lib/startup-source-receipt.mjs';

describe('startup source receipt', () => {
  it('binds the brief, renderer, and adjacent sessions', () => {
    const receipt = buildStartupSourceReceipt({
      body: 'brief', rendererVersion: '3.2', targetSession: 124, sourceSession: 123, sources: {},
    });
    expect(verifyStartupSourceReceipt({ body: 'brief', receipt, rendererVersion: '3.2' }).ok).toBe(true);
  });

  it('fails closed on stale content or incoherent session provenance', () => {
    const receipt = buildStartupSourceReceipt({
      body: 'old', rendererVersion: '3.2', targetSession: 126, sourceSession: 123, sources: {},
    });
    const result = verifyStartupSourceReceipt({ body: 'new', receipt, rendererVersion: '3.2' });
    expect(result.ok).toBe(false);
    expect(result.failures).toContain('brief hash does not match receipt');
    expect(result.failures).toContain('target session is not source session + 1');
  });
});
