// @vitest-environment node
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";

const source = readFileSync(new URL("../../public/sw.js", import.meta.url), "utf8");
const origin = "https://promogrind.bet";

function createWorker({ cached = {}, network = async () => new Response("fresh release") } = {}) {
  const listeners = new Map();
  const entries = new Map(Object.entries(cached).map(([url, body]) => [url, new Response(body)]));
  const cache = {
    match: async (request) => entries.get(request.url)?.clone(),
    put: async (request, response) => entries.set(request.url, response.clone()),
  };
  const fetch = vi.fn(network);
  runInNewContext(source, {
    self: {
      location: new URL(`${origin}/sw.js`),
      addEventListener: (name, listener) => listeners.set(name, listener),
    },
    caches: { open: async () => cache, match: cache.match },
    fetch,
    URL,
    Response,
  });
  return {
    fetch,
    entries,
    request(path, options = {}) {
      let response;
      listeners.get("fetch")({
        request: { url: new URL(path, origin).href, method: "GET", mode: "navigate", ...options },
        respondWith: (value) => { response = value; },
      });
      return response;
    },
  };
}

describe("service worker release freshness", () => {
  it.each(["/dashboard", "/pricing", "/arb-scanner", "/dashboard?tab=today"])(
    "returns deployed HTML before cached HTML for navigation to %s",
    async (path) => {
      const url = `${origin}${path}`;
      const worker = createWorker({ cached: { [url]: "previous release" } });
      const response = await worker.request(path);
      expect(await response.text()).toBe("fresh release");
      expect(await worker.entries.get(url).text()).toBe("fresh release");
      expect(worker.fetch).toHaveBeenCalledTimes(1);
    },
  );

  it("keeps a cached document usable when navigation is offline", async () => {
    const worker = createWorker({
      cached: { [`${origin}/dashboard`]: "offline release" },
      network: async () => { throw new TypeError("offline"); },
    });
    expect(await (await worker.request("/dashboard")).text()).toBe("offline release");
  });

  it("returns a network error when offline and no document is cached", async () => {
    const worker = createWorker({ network: async () => { throw new TypeError("offline"); } });
    const response = await worker.request("/dashboard");
    expect(response.type).toBe("error");
    expect(response.status).toBe(0);
  });

  it.each(["https://other.example/dashboard", "https://promogrind.bet:8443/dashboard"])(
    "leaves cross-origin navigation to the browser: %s",
    (url) => {
      const worker = createWorker();
      expect(worker.request(url)).toBeUndefined();
      expect(worker.fetch).not.toHaveBeenCalled();
    },
  );

  it("preserves stale-while-revalidate for same-origin images", async () => {
    const worker = createWorker({ cached: { [`${origin}/favicon.svg`]: "cached image" } });
    const response = await worker.request("/favicon.svg", { mode: "no-cors" });
    expect(await response.text()).toBe("cached image");
    expect(worker.fetch).toHaveBeenCalledTimes(1);
  });

  it("preserves network-first behavior for script assets", async () => {
    const worker = createWorker({ cached: { [`${origin}/assets/app.js`]: "old script" } });
    const response = await worker.request("/assets/app.js", { mode: "cors" });
    expect(await response.text()).toBe("fresh release");
  });

  it("does not intercept a POST navigation", () => {
    const worker = createWorker();
    expect(worker.request("/dashboard", { method: "POST" })).toBeUndefined();
    expect(worker.fetch).not.toHaveBeenCalled();
  });
});
