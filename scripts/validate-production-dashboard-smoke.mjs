#!/usr/bin/env node
/**
 * Headless production dashboard smoke.
 *
 * Uses an installed Chromium-family browser through the Chrome DevTools
 * Protocol so production runtime errors and console failures are captured
 * without adding a Playwright/Puppeteer dependency.
 */

import { spawn } from "./lib/safe-spawn.mjs";
import { execFileSync } from "./lib/safe-spawn.mjs";
import fs from "node:fs";
import http from "node:http";
import net from "node:net";
import os from "node:os";
import path from "node:path";

const DEFAULT_URL = "https://promogrind.bet/dashboard";
const TARGET_URL = process.argv.find((arg) => arg.startsWith("--url="))?.slice("--url=".length) || DEFAULT_URL;
const TIMEOUT_MS = Number(process.argv.find((arg) => arg.startsWith("--timeout="))?.slice("--timeout=".length) || 25000);
const ALLOWED_CONSOLE_PATTERNS = [
  /favicon/i,
  /Failed to load resource: the server responded with a status of 404.*favicon/i,
  // GitHub Pages serves SPA fallback routes with a 404 status while still
  // returning index.html. The dashboard smoke validates hydration separately.
  /^Failed to load resource: the server responded with a status of 404 \(\)$/i,
];

function findBrowser() {
  const envPath = process.env.CHROME_PATH || process.env.EDGE_PATH;
  const candidates = [
    envPath,
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/usr/bin/microsoft-edge",
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }

  for (const command of process.platform === "win32" ? ["chrome.exe", "msedge.exe"] : ["google-chrome", "chromium", "chromium-browser", "microsoft-edge"]) {
    try {
      const found = execFileSync(process.platform === "win32" ? "where.exe" : "which", [command], { encoding: "utf8" })
        .split(/\r?\n/)
        .map((line) => line.trim())
        .find(Boolean);
      if (found && fs.existsSync(found)) return found;
    } catch {}
  }

  return null;
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getAvailablePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : null;
      server.close(() => {
        if (!port) reject(new Error("Could not allocate a DevTools port."));
        else resolve(port);
      });
    });
  });
}

async function fetchJson(url, timeoutMs = 1000) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => { body += chunk; });
      res.on("end", () => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(`${url} returned ${res.statusCode}`));
          return;
        }
        try {
          resolve(JSON.parse(body));
        } catch (error) {
          reject(error);
        }
      });
    });
    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error(`${url} timed out after ${timeoutMs}ms`));
    });
    req.on("error", reject);
  });
}

async function waitForDevTools(port, timeoutMs) {
  const endpoint = `http://127.0.0.1:${port}/json/version`;
  const started = Date.now();
  let lastError = null;
  while (Date.now() - started < timeoutMs) {
    try {
      const payload = await fetchJson(endpoint, 1000);
      if (payload.webSocketDebuggerUrl) return payload.webSocketDebuggerUrl;
    } catch (error) {
      lastError = error;
    }
    await wait(150);
  }
  throw new Error(`Timed out waiting for browser DevTools endpoint. ${lastError?.message || ""}`.trim());
}

class Cdp {
  constructor(ws) {
    this.ws = ws;
    this.nextId = 1;
    this.pending = new Map();
    this.events = [];
    ws.addEventListener("message", (event) => {
      const payload = JSON.parse(event.data);
      if (payload.id && this.pending.has(payload.id)) {
        const { resolve, reject } = this.pending.get(payload.id);
        this.pending.delete(payload.id);
        if (payload.error) reject(new Error(payload.error.message || JSON.stringify(payload.error)));
        else resolve(payload.result || {});
        return;
      }
      this.events.push(payload);
    });
  }

  send(method, params = {}) {
    const id = this.nextId++;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
    });
  }

  close() {
    this.ws.close();
  }
}

async function connect(wsUrl) {
  const ws = new WebSocket(wsUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve, { once: true });
    ws.addEventListener("error", () => reject(new Error(`Could not connect to ${wsUrl}`)), { once: true });
  });
  return new Cdp(ws);
}

function normalizeConsoleArgs(args = []) {
  return args
    .map((arg) => arg.value ?? arg.description ?? arg.unserializableValue ?? "")
    .filter(Boolean)
    .join(" ");
}

function isAllowed(message) {
  return ALLOWED_CONSOLE_PATTERNS.some((pattern) => pattern.test(message));
}

async function run() {
  if (typeof WebSocket === "undefined") {
    throw new Error("This Node runtime does not expose WebSocket; use Node 20+ for CDP smoke.");
  }

  const browser = findBrowser();
  if (!browser) {
    throw new Error("No Chrome/Edge/Chromium executable found. Set CHROME_PATH to run production dashboard smoke.");
  }

  const devtoolsPort = await getAvailablePort();
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "pg-prod-smoke-"));
  const stderrChunks = [];
  const headlessMode = process.env.PG_CHROME_HEADLESS || "new";
  const proc = spawn(browser, [
    `--headless=${headlessMode}`,
    "--disable-gpu",
    "--disable-dev-shm-usage",
    "--no-sandbox",
    "--no-first-run",
    "--no-default-browser-check",
    "--remote-allow-origins=*",
    "--remote-debugging-address=127.0.0.1",
    `--remote-debugging-port=${devtoolsPort}`,
    `--user-data-dir=${userDataDir}`,
    "about:blank",
  ], {
    stdio: ["ignore", "ignore", "pipe"],
  });

  proc.stderr.on("data", (chunk) => stderrChunks.push(chunk.toString()));

  let browserCdp;
  let pageCdp;
  try {
    const browserWs = await waitForDevTools(devtoolsPort, 20000);
    browserCdp = await connect(browserWs);
    const { targetId } = await browserCdp.send("Target.createTarget", { url: "about:blank" });
    const targets = await fetchJson(`http://127.0.0.1:${devtoolsPort}/json/list`, 3000);
    const page = targets.find((target) => target.id === targetId) || targets.find((target) => target.type === "page");
    if (!page?.webSocketDebuggerUrl) throw new Error("Could not resolve page DevTools endpoint.");

    pageCdp = await connect(page.webSocketDebuggerUrl);
    const failures = [];
    let loaded = false;

    pageCdp.ws.addEventListener("message", (event) => {
      const payload = JSON.parse(event.data);
      if (payload.method === "Runtime.consoleAPICalled") {
        const type = payload.params?.type;
        if (["error", "assert"].includes(type)) {
          const message = normalizeConsoleArgs(payload.params?.args);
          if (!isAllowed(message)) failures.push(`console.${type}: ${message}`);
        }
      }
      if (payload.method === "Runtime.exceptionThrown") {
        const detail = payload.params?.exceptionDetails;
        failures.push(`exception: ${detail?.text || detail?.exception?.description || "unknown runtime exception"}`);
      }
      if (payload.method === "Log.entryAdded") {
        const entry = payload.params?.entry;
        if (entry?.level === "error" && !isAllowed(entry.text || "")) failures.push(`log.error: ${entry.text}`);
      }
      if (payload.method === "Page.loadEventFired") loaded = true;
    });

    await pageCdp.send("Runtime.enable");
    await pageCdp.send("Log.enable");
    await pageCdp.send("Page.enable");
    await pageCdp.send("Page.navigate", { url: TARGET_URL });

    const started = Date.now();
    while (!loaded && Date.now() - started < TIMEOUT_MS) await wait(100);
    await wait(4000);

    const evalResult = await pageCdp.send("Runtime.evaluate", {
      expression: `(() => {
        const body = document.body ? document.body.innerText : "";
        const root = document.getElementById("root");
        return {
          href: location.href,
          title: document.title,
          hasRoot: Boolean(root),
          bodyLength: body.length,
          hasDashboardText: /Dashboard|PromoGrind|Today|calculator/i.test(body),
          rootText: root ? root.innerText.slice(0, 300) : ""
        };
      })()`,
      returnByValue: true,
    });
    const pageState = evalResult.result?.value || {};

    if (!loaded) failures.push(`page load did not complete within ${TIMEOUT_MS}ms`);
    if (!pageState.hasRoot) failures.push("missing #root element");
    if (!pageState.hasDashboardText) failures.push(`dashboard text marker missing; root text: ${pageState.rootText || "(empty)"}`);

    const uniqueFailures = [...new Set(failures)];
    const payload = {
      ok: uniqueFailures.length === 0,
      url: TARGET_URL,
      checkedAt: new Date().toISOString(),
      pageState,
      failures: uniqueFailures,
    };

    console.log(JSON.stringify(payload, null, 2));
    if (uniqueFailures.length) process.exitCode = 1;
  } catch (error) {
    const stderr = stderrChunks.join("").trim();
    if (stderr) console.error(`Browser stderr:\n${stderr}`);
    throw error;
  } finally {
    try { pageCdp?.close(); } catch {}
    try { browserCdp?.close(); } catch {}
    try { proc.stderr?.destroy(); } catch {}
    try { proc.kill("SIGTERM"); } catch {}
    if (process.platform === "win32" && proc.pid) {
      try {
        execFileSync("taskkill.exe", ["/PID", String(proc.pid), "/T", "/F"], { stdio: "ignore", timeout: 5000 });
      } catch {}
    }
    await wait(500);
    try { fs.rmSync(userDataDir, { recursive: true, force: true }); } catch {}
  }
}

run()
  .catch((error) => {
    console.error("Production dashboard smoke failed.");
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
