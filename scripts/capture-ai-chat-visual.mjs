#!/usr/bin/env node
/** Example: node scripts/capture-ai-chat-visual.mjs --url=http://127.0.0.1:4173/dashboard --prefix=chat-after */
import fs from "node:fs";
import path from "node:path";
import { evaluateInPage, withChromiumPage } from "./lib/chromium-cdp.mjs";

const arg = (name, fallback) => process.argv.find((item) => item.startsWith(`${name}=`))?.slice(name.length + 1) || fallback;
const targetUrl = arg("--url", "http://127.0.0.1:4173/dashboard");
const prefix = arg("--prefix", "chat-after");
const outputDir = path.resolve(arg("--output", "docs/visual-qa/captures"));
const cases = [
  { theme: "dark", width: 1440, height: 1000, label: "desktop-dark" },
  { theme: "light", width: 1440, height: 1000, label: "desktop-light" },
  { theme: "dark", width: 390, height: 844, label: "mobile-dark" },
  { theme: "light", width: 390, height: 844, label: "mobile-light" },
];

fs.mkdirSync(outputDir, { recursive: true });
const expiresAt = Math.floor(Date.now() / 1000) + 3600;
const user = { id: "00000000-0000-4000-8000-000000000125", aud: "authenticated", role: "authenticated", email: "visual-qa@promogrind.invalid", user_metadata: { trial_start: new Date().toISOString() } };
const tokenPart = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
const accessToken = `${tokenPart({ alg: "HS256", typ: "JWT" })}.${tokenPart({ sub: user.id, aud: "authenticated", role: "authenticated", exp: expiresAt })}.visualqa`;
const session = { access_token: accessToken, refresh_token: "visual-qa-refresh", expires_at: expiresAt, expires_in: 3600, token_type: "bearer", user };

try {
  const captures = await withChromiumPage({ url: targetUrl, commandTimeoutMs: 15_000 }, async ({ pageCdp, wait }) => {
    await pageCdp.send("Page.enable");
    await pageCdp.send("Runtime.enable");
    await wait(1200);
    const rows = [];
    for (const item of cases) {
      await pageCdp.send("Emulation.setDeviceMetricsOverride", { width: item.width, height: item.height, deviceScaleFactor: 1, mobile: item.width <= 430 });
      await evaluateInPage(pageCdp, `(() => {
        localStorage.setItem("pg_theme", ${JSON.stringify(item.theme)});
        localStorage.setItem("pg_age_verified", String(Date.now()));
        localStorage.setItem("pg_onboarded_v1", "1");
        localStorage.setItem("pg_onboarding_done", "1");
        localStorage.setItem("pg_starter_pack_done", "1");
        localStorage.setItem("promo_engine_v3", JSON.stringify({ bankroll: 625, done: {} }));
        localStorage.setItem("sb-fjnpzjjyhnpmunfoycrp-auth-token", ${JSON.stringify(JSON.stringify(session))});
      })()`);
      await pageCdp.send("Page.reload", { ignoreCache: true });
      await wait(1800);
      const opened = await evaluateInPage(pageCdp, `(() => {
        const trigger = [...document.querySelectorAll("button")].find((button) => button.title?.startsWith("PromoGrind AI"));
        if (!trigger) return { ok: false, body: document.body.innerText.slice(0, 500) };
        trigger.click(); return { ok: true };
      })()`);
      if (!opened?.ok) throw new Error(`${item.label}: chat trigger missing; ${opened?.body || "no page text"}`);
      await wait(900);
      const state = await evaluateInPage(pageCdp, `(() => ({
        disclosure: document.body.innerText.includes("only those named fields leave this browser"),
        unchecked: document.querySelector("#pg-chat-personalize")?.checked === false,
        overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth
      }))()`);
      if (!state.disclosure || !state.unchecked || state.overflowX) throw new Error(`${item.label}: visual state contract failed ${JSON.stringify(state)}`);
      const shot = await pageCdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false, fromSurface: true });
      const filename = `${prefix}-${item.label}.png`;
      fs.writeFileSync(path.join(outputDir, filename), Buffer.from(shot.data, "base64"));
      rows.push({ file: filename, theme: item.theme, viewport: { width: item.width, height: item.height } });
    }
    return rows;
  });
  console.log(JSON.stringify({ ok: true, targetUrl, captures }, null, 2));
} catch (error) {
  console.error(`AI Chat visual capture failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
