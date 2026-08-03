import { describe, expect, it } from 'vitest';
import {
  classifyRuntimeOverlay,
  summarizeRuntimeOverlayPlan,
} from '../../scripts/lib/runtime-overlay-contract.mjs';

describe('consumer-owned runtime overlay reconciliation', () => {
  it('restores only a byte-identical canonical overwrite', () => {
    const entry = classifyRuntimeOverlay({
      file: 'scripts/context-meter.mjs',
      current: 'upstream',
      upstream: 'upstream',
      committed: 'promogrind-overlay',
    });
    expect(entry.action).toBe('restore-committed');
  });

  it('preserves the committed overlay and refuses possible founder work', () => {
    expect(classifyRuntimeOverlay({
      file: 'a', current: 'local', upstream: 'upstream', committed: 'local',
    }).action).toBe('preserve');
    expect(classifyRuntimeOverlay({
      file: 'b', current: 'founder-wip', upstream: 'upstream', committed: 'local',
    }).action).toBe('refuse-user-edit');
  });

  it('summarizes repairable propagation without calling it blocked', () => {
    const summary = summarizeRuntimeOverlayPlan([
      classifyRuntimeOverlay({ file: 'a', current: 'upstream', upstream: 'upstream', committed: 'local' }),
      classifyRuntimeOverlay({ file: 'b', current: 'local', upstream: 'upstream', committed: 'local' }),
    ]);
    expect(summary).toMatchObject({ ok: true, needsApply: true });
    expect(summary.counts['restore-committed']).toBe(1);
  });
});
