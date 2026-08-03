import fs from "node:fs";
import http from "node:http";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { execFileSync, spawn } from "./safe-spawn.mjs";

export const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

export function chromiumCandidates(env = process.env) {
  return [
    env.CHROME_PATH,
    env.EDGE_PATH,
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
}

export function findChromium() {
  for (const candidate of chromiumCandidates()) if (fs.existsSync(candidate)) return candidate;
  return null;
}

function availablePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : null;
      server.close(() => port ? resolve(port) : reject(new Error("Could not allocate a DevTools port")));
    });
  });
}

export function fetchLocalJson(url, timeoutMs = 1500) {
  return new Promise((resolve, reject) => {
    const request = http.get(url, (response) => {
      let body = "";
      response.setEncoding("utf8");
      response.on("data", (chunk) => { body += chunk; });
      response.on("end", () => {
        if ((response.statusCode || 500) >= 300) return reject(new Error(`${url} returned ${response.statusCode}`));
        try { resolve(JSON.parse(body)); } catch (error) { reject(error); }
      });
    });
    request.setTimeout(timeoutMs, () => request.destroy(new Error(`${url} timed out`)));
    request.on("error", reject);
  });
}

async function waitForDevTools(port, timeoutMs) {
  const started = Date.now();
  let lastError;
  while (Date.now() - started < timeoutMs) {
    try {
      const version = await fetchLocalJson(`http://127.0.0.1:${port}/json/version`);
      if (version.webSocketDebuggerUrl) return version.webSocketDebuggerUrl;
    } catch (error) { lastError = error; }
    await wait(150);
  }
  throw new Error(`Chromium DevTools endpoint did not become ready: ${lastError?.message || "timeout"}`);
}

export class CdpConnection {
  constructor(socket, { commandTimeoutMs = 10_000 } = {}) {
    this.socket = socket;
    this.commandTimeoutMs = commandTimeoutMs;
    this.nextId = 0;
    this.pending = new Map();
    socket.addEventListener("message", (event) => {
      const payload = JSON.parse(event.data);
      const pending = payload.id ? this.pending.get(payload.id) : null;
      if (!pending) return;
      clearTimeout(pending.timer);
      this.pending.delete(payload.id);
      payload.error ? pending.reject(new Error(payload.error.message || "DevTools command failed")) : pending.resolve(payload.result || {});
    });
    const rejectPending = () => {
      for (const { reject, timer } of this.pending.values()) {
        clearTimeout(timer);
        reject(new Error("DevTools connection closed before command completion"));
      }
      this.pending.clear();
    };
    socket.addEventListener("close", rejectPending);
    socket.addEventListener("error", rejectPending);
  }

  static async connect(url, options) {
    const socket = new WebSocket(url);
    await new Promise((resolve, reject) => {
      socket.addEventListener("open", resolve, { once: true });
      socket.addEventListener("error", () => reject(new Error(`Could not connect to ${url}`)), { once: true });
    });
    return new CdpConnection(socket, options);
  }

  send(method, params = {}) {
    const id = ++this.nextId;
    this.socket.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`DevTools command timed out: ${method}`));
      }, this.commandTimeoutMs);
      this.pending.set(id, { resolve, reject, timer });
    });
  }

  close() { try { this.socket.close(); } catch {} }
}

export async function evaluateInPage(cdp, expression) {
  const result = await cdp.send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text || "Browser evaluation failed");
  return result.result?.value;
}

export async function withChromiumPage({
  url = "about:blank",
  startupTimeoutMs = 20_000,
  commandTimeoutMs = 10_000,
  headlessMode = process.env.PG_CHROME_HEADLESS || "new",
  captureStderr = false,
} = {}, callback) {
  if (typeof WebSocket === "undefined") throw new Error("Node 20+ WebSocket support is required");
  const browser = findChromium();
  if (!browser) throw new Error("No installed Chromium-family browser found");
  const port = await availablePort();
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "pg-chromium-cdp-"));
  const stderr = [];
  const child = spawn(browser, [
    `--headless=${headlessMode}`, "--disable-gpu", "--disable-dev-shm-usage", "--no-sandbox",
    "--no-first-run", "--no-default-browser-check", "--remote-allow-origins=*",
    "--remote-debugging-address=127.0.0.1", `--remote-debugging-port=${port}`,
    `--user-data-dir=${profile}`, "about:blank",
  ], { stdio: ["ignore", "ignore", captureStderr ? "pipe" : "ignore"] });
  if (captureStderr) child.stderr?.on("data", (chunk) => stderr.push(chunk.toString()));
  let browserCdp;
  let pageCdp;
  try {
    browserCdp = await CdpConnection.connect(await waitForDevTools(port, startupTimeoutMs), { commandTimeoutMs });
    const { targetId } = await browserCdp.send("Target.createTarget", { url });
    const targets = await fetchLocalJson(`http://127.0.0.1:${port}/json/list`, 3000);
    const page = targets.find((target) => target.id === targetId);
    if (!page?.webSocketDebuggerUrl) throw new Error("Could not bind the Chromium page target");
    pageCdp = await CdpConnection.connect(page.webSocketDebuggerUrl, { commandTimeoutMs });
    return await callback({ pageCdp, browserCdp, targetId, wait });
  } catch (error) {
    if (captureStderr && stderr.length) error.browserStderr = stderr.join("").trim();
    throw error;
  } finally {
    pageCdp?.close();
    browserCdp?.close();
    try { child.kill("SIGTERM"); } catch {}
    if (process.platform === "win32" && child.pid) {
      try { execFileSync("taskkill.exe", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore", timeout: 5000 }); } catch {}
    }
    await wait(300);
    try { fs.rmSync(profile, { recursive: true, force: true }); } catch {}
  }
}
