import { describe, expect, it } from 'vitest';
import { applyStudioFooter, inspectStudioFooter } from '../../scripts/lib/studio-footer-contract.mjs';

describe('studio footer contract', () => {
  it('injects once and is idempotent', () => {
    const first = applyStudioFooter('<html><body><footer>Links</footer></body></html>');
    expect(first.after.ok).toBe(true);
    const second = applyStudioFooter(first.html);
    expect(second.changed).toBe(false);
    expect(inspectStudioFooter(second.html).occurrences).toBe(1);
  });

  it('refuses duplicate legal lines instead of hiding them', () => {
    const text = '© 2026 VaultSpark Studios LLC. All rights reserved.';
    expect(applyStudioFooter(`<body>${text}${text}</body>`).refused).toBe('duplicate-rights-text');
  });
});
