#!/usr/bin/env node
/** Headless production dashboard smoke using the shared dependency-free Chromium/CDP contract. */
import { evaluateInPage, withChromiumPage } from "./lib/chromium-cdp.mjs";

const targetUrl = process.argv.find((arg) => arg.startsWith("--url="))?.slice(6) || "https://promogrind.bet/dashboard";
const timeoutMs = Number(process.argv.find((arg) => arg.startsWith("--timeout="))?.slice(10) || 25_000);
const allowed = [
  /favicon/i,
  /Failed to load resource: the server responded with a status of 404.*favicon/i,
  /^Failed to load resource: the server responded with a status of 404 \(\)$/i,
];
const allowedMessage = (message) => allowed.some((pattern) => pattern.test(message));
const consoleText = (args = []) => args.map((arg) => arg.value ?? arg.description ?? arg.unserializableValue ?? "").filter(Boolean).join(" ");

try {
  const result = await withChromiumPage({ url: "about:blank", startupTimeoutMs: 20_000, commandTimeoutMs: 15_000, captureStderr: true }, async ({ pageCdp, wait }) => {
    const failures = [];
    let loaded = false;
    pageCdp.socket.addEventListener("message", (event) => {
      const payload = JSON.parse(event.data);
      if (payload.method === "Runtime.consoleAPICalled" && ["error", "assert"].includes(payload.params?.type)) {
        const message = consoleText(payload.params?.args);
        if (!allowedMessage(message)) failures.push(`console.${payload.params.type}: ${message}`);
      }
      if (payload.method === "Runtime.exceptionThrown") failures.push(`exception: ${payload.params?.exceptionDetails?.exception?.description || payload.params?.exceptionDetails?.text || "unknown"}`);
      if (payload.method === "Log.entryAdded" && payload.params?.entry?.level === "error" && !allowedMessage(payload.params.entry.text || "")) failures.push(`log.error: ${payload.params.entry.text}`);
      if (payload.method === "Page.loadEventFired") loaded = true;
    });
    await pageCdp.send("Runtime.enable");
    await pageCdp.send("Log.enable");
    await pageCdp.send("Page.enable");
    await pageCdp.send("Page.navigate", { url: targetUrl });
    const started = Date.now();
    while (!loaded && Date.now() - started < timeoutMs) await wait(100);
    await wait(4000);
    const pageState = await evaluateInPage(pageCdp, `(() => {
      const body = document.body ? document.body.innerText : "";
      const root = document.getElementById("root");
      return { href: location.href, title: document.title, hasRoot: Boolean(root), bodyLength: body.length,
        hasDashboardText: /Dashboard|PromoGrind|Today|calculator/i.test(body), rootText: root ? root.innerText.slice(0, 300) : "" };
    })()`);
    if (!loaded) failures.push(`page load did not complete within ${timeoutMs}ms`);
    if (!pageState.hasRoot) failures.push("missing #root element");
    if (!pageState.hasDashboardText) failures.push(`dashboard text marker missing; root text: ${pageState.rootText || "(empty)"}`);
    const uniqueFailures = [...new Set(failures)];
    return { ok: uniqueFailures.length === 0, url: targetUrl, checkedAt: new Date().toISOString(), pageState, failures: uniqueFailures };
  });
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exitCode = 1;
} catch (error) {
  if (error.browserStderr) console.error(`Browser stderr:\n${error.browserStderr}`);
  console.error("Production dashboard smoke failed.");
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
