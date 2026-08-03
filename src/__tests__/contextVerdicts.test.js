import { describe, expect, it } from 'vitest';
import { chooseContextVerdict, exitForVerdict } from '../../scripts/lib/context-verdicts.mjs';

describe('context verdict priority', () => {
  it('keeps an unreadable gauge dark', () => {
    expect(chooseContextVerdict({ measured: false, pctUsed: 2 })).toBe('UNMEASURED');
  });

  it('prioritizes hard closeout over compaction advice', () => {
    expect(chooseContextVerdict({ measured: true, pctUsed: 0.96, compactImminent: true })).toBe('CLOSEOUT');
  });

  it('prioritizes the warning threshold over soft compaction advice', () => {
    const verdict = chooseContextVerdict({ measured: true, pctUsed: 0.86, compactImminent: true });
    expect(verdict).toBe('CONSIDER_CLOSEOUT');
    expect(exitForVerdict(verdict)).toBe(2);
  });

  it('uses the soft warning only below the protocol threshold', () => {
    expect(chooseContextVerdict({ measured: true, pctUsed: 0.6, compactImminent: true })).toBe('WARN_COMPACT_SOON');
  });
});
