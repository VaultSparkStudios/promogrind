// bounded-fetch.mjs — S168 #3. Generalizes the S167 eval-feed >180s hang fix.
//
// A network call with no timeout is a latent closeout-wedge: a single unbounded
// `await fetch()` against a slow/dead endpoint can stall a doctor probe or the
// closeout autopilot indefinitely, and a stalled closeout blocks the commit gate.
// Every studio fetch should be bounded. This is the canonical bounded wrapper;
// scripts/lint-unbounded-fetch.mjs prevents new raw fetches from regrowing the class.
//
// Usage:
//   import { boundedFetch, BoundedFetchTimeout } from './lib/bounded-fetch.mjs';
//   const res = await boundedFetch(url, { timeoutMs: 8000, headers });
// Distinguish a timeout from a transport error:
//   try { await boundedFetch(url) } catch (e) {
//     if (e instanceof BoundedFetchTimeout) { /* the endpoint stalled */ }
//   }

export class BoundedFetchTimeout extends Error {
  constructor(url, timeoutMs) {
    super(`boundedFetch timed out after ${timeoutMs}ms: ${url}`);
    this.name = 'BoundedFetchTimeout';
    this.url = url;
    this.timeoutMs = timeoutMs;
  }
}

// boundedFetch(url, opts?) — opts is fetch RequestInit plus { timeoutMs }.
// Default timeout 10s. The internal AbortController is ALWAYS cleared in finally
// (no leaked timers, even on a transport error), and a caller-supplied
// opts.signal is honoured alongside the timeout via composition.
export async function boundedFetch(url, { timeoutMs = 10_000, signal: callerSignal, ...opts } = {}) {
  if (typeof fetch !== 'function') throw new Error('global fetch unavailable (Node < 18?)');
  const ctrl = new AbortController();
  const onCallerAbort = () => ctrl.abort(callerSignal?.reason);
  if (callerSignal) {
    if (callerSignal.aborted) ctrl.abort(callerSignal.reason);
    else callerSignal.addEventListener('abort', onCallerAbort, { once: true });
  }
  const timer = setTimeout(() => ctrl.abort('boundedFetch-timeout'), timeoutMs);
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal });
  } catch (err) {
    // A timeout abort surfaces as an AbortError; translate only the timeout case
    // (caller-initiated aborts re-throw as-is so they read as caller intent).
    if (ctrl.signal.aborted && ctrl.signal.reason === 'boundedFetch-timeout') {
      throw new BoundedFetchTimeout(String(url), timeoutMs);
    }
    throw err;
  } finally {
    clearTimeout(timer);
    if (callerSignal) callerSignal.removeEventListener('abort', onCallerAbort);
  }
}

export default boundedFetch;
