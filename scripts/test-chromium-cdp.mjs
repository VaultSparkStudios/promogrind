#!/usr/bin/env node
import assert from "node:assert/strict";
import { CdpConnection, chromiumCandidates } from "./lib/chromium-cdp.mjs";

class FakeSocket extends EventTarget {
  constructor({ respond = true } = {}) { super(); this.respond = respond; }
  send(raw) {
    if (!this.respond) return;
    const request = JSON.parse(raw);
    queueMicrotask(() => this.dispatchEvent(new MessageEvent("message", { data: JSON.stringify({ id: request.id, result: { echoed: request.method } }) })));
  }
  close() { this.dispatchEvent(new Event("close")); }
}

const success = new CdpConnection(new FakeSocket(), { commandTimeoutMs: 50 });
assert.deepEqual(await success.send("Runtime.enable"), { echoed: "Runtime.enable" });
success.close();

const bounded = new CdpConnection(new FakeSocket({ respond: false }), { commandTimeoutMs: 10 });
await assert.rejects(bounded.send("Page.neverReturns"), /timed out: Page\.neverReturns/);
bounded.close();
assert.ok(chromiumCandidates({}).some((candidate) => /chrome|edge/i.test(candidate)));
console.log("Chromium CDP contract passed · replies routed · command timeout bounded · candidates deterministic");
