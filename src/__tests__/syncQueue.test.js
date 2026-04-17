import { describe, it, expect, beforeEach } from 'vitest';

const _store = {};
global.localStorage = {
  getItem:    (k)    => (Object.prototype.hasOwnProperty.call(_store, k) ? _store[k] : null),
  setItem:    (k, v) => { _store[k] = String(v); },
  removeItem: (k)    => { delete _store[k]; },
  clear:      ()     => { Object.keys(_store).forEach((k) => delete _store[k]); },
};

import { enqueueWrite, getQueueDepthSync, loadQueue, saveQueue, __resetForTests } from '../lib/sync-queue.js';

beforeEach(() => {
  localStorage.clear();
  __resetForTests();
});

describe('sync-queue', () => {
  it('falls back to a localStorage mirror when IndexedDB is absent', async () => {
    expect(typeof indexedDB === 'undefined' || indexedDB === null).toBe(true);
    await enqueueWrite({ data: { ledger: [{ id: 'a' }] } });
    const queue = JSON.parse(localStorage.getItem('pg_sync_queue'));
    expect(queue).toHaveLength(1);
    expect(queue[0].data.ledger).toHaveLength(1);
    expect(typeof queue[0].queuedAt).toBe('number');
  });

  it('reports queue depth synchronously for diagnostics', async () => {
    expect(getQueueDepthSync()).toBe(0);
    await enqueueWrite({ data: { ledger: [{ id: '1' }] } });
    await enqueueWrite({ data: { ledger: [{ id: '2' }] } });
    expect(getQueueDepthSync()).toBe(2);
  });

  it('caps the queue at 20 retained items', async () => {
    const items = Array.from({ length: 25 }, (_, i) => ({ data: { n: i } }));
    await saveQueue(items);
    const loaded = await loadQueue();
    expect(loaded).toHaveLength(20);
    expect(loaded[0].data.n).toBe(5);
    expect(loaded[19].data.n).toBe(24);
  });
});
