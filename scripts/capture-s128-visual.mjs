#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { evaluateInPage, withChromiumPage } from "./lib/chromium-cdp.mjs";

const arg = (name, fallback) => process.argv.find((item) => item.startsWith(`${name}=`))?.slice(name.length + 1) || fallback;
const origin = arg("--origin", "http://127.0.0.1:4173");
const outputDir = path.resolve(arg("--output", "docs/visual-qa/captures"));
const prefix = arg("--prefix", "s128-after");
const cases = [
  { theme: "dark", width: 1440, height: 1000, label: "desktop-dark" },
  { theme: "light", width: 1440, height: 1000, label: "desktop-light" },
  { theme: "dark", width: 390, height: 844, label: "mobile-dark" },
  { theme: "light", width: 390, height: 844, label: "mobile-light" },
];
const surfaces = [
  { key: "scanner", route: "/arb-scanner", required: ["Live Scanner", "live odds backend is activated", "BETA / SETUP PENDING"], scrollText: "Real-time arb", page: "/arb-scanner — build-capability-closed live state" },
  { key: "referral", route: "/refer-earn", required: ["GIFT 14 DAYS FREE", "returns whether that update persisted"], scrollText: "GIFT 14 DAYS FREE", page: "/refer-earn — bounded gift and delivery truth" },
  { key: "tool-mix", route: "/dashboard", required: ["YOUR TOOL MIX", "local calculator records"], scrollText: "YOUR TOOL MIX", page: "/dashboard — evidence-bounded local tool mix" },
  { key: "arb-3way", route: "/arb-3way", required: ["MODEL SIGNAL", "not a recommendation"], scrollText: "MODEL SIGNAL", page: "/arb-3way — assumption-bound model signal" },
  { key: "sgp", route: "/sgp-estimator", required: ["MODEL SIGNAL", "not a recommendation"], scrollText: "MODEL SIGNAL", setupValue: { from: "+450", to: "+1500" }, page: "/sgp-estimator — assumption-bound model signal" },
  { key: "teaser", route: "/teaser", required: ["MODEL SIGNAL", "not a recommendation"], scrollText: "MODEL SIGNAL", setupValue: { from: "72", to: "75" }, page: "/teaser — assumption-bound model signal" },
];

const now = new Date().toISOString();
const expiresAt = Math.floor(Date.now() / 1000) + 3600;
const user = { id: "00000000-0000-4000-8000-000000000128", aud: "authenticated", role: "authenticated", email: "visual-qa@promogrind.invalid", user_metadata: { trial_start: new Date(Date.now() - 10 * 86400000).toISOString() } };
const tokenPart = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
const session = {
  access_token: `${tokenPart({ alg: "HS256", typ: "JWT" })}.${tokenPart({ sub: user.id, aud: "authenticated", role: "authenticated", exp: expiresAt })}.visualqa`,
  refresh_token: "visual-qa-refresh",
  expires_at: expiresAt,
  expires_in: 3600,
  token_type: "bearer",
  user,
};
const histories = {
  "pg_hist_bonus-bet": Array.from({ length: 4 }, (_, id) => ({ id, savedAt: now })),
  "pg_hist_profit-boost": Array.from({ length: 2 }, (_, id) => ({ id, savedAt: now })),
  "pg_hist_arb-2way": [{ id: 1, savedAt: now }],
};

fs.mkdirSync(outputDir, { recursive: true });

async function seed(pageCdp, theme) {
  const values = {
    pg_theme: theme,
    pg_age_verified: String(Date.now()),
    pg_onboarded_v1: "1",
    pg_onboarding_done: "1",
    pg_starter_pack_done: "1",
    "sb-fjnpzjjyhnpmunfoycrp-auth-token": JSON.stringify(session),
    ...Object.fromEntries(Object.entries(histories).map(([key, value]) => [key, JSON.stringify(value)])),
  };
  await evaluateInPage(pageCdp, `(() => { localStorage.clear(); const values = ${JSON.stringify(values)}; for (const [key, value] of Object.entries(values)) localStorage.setItem(key, value); })()`);
}

async function capture(pageCdp, wait, item, surface) {
  await pageCdp.send("Page.navigate", { url: `${origin}${surface.route}` });
  await wait(2300);
  if (surface.setupValue) {
    const updated = await evaluateInPage(pageCdp, `(() => {
      const input = [...document.querySelectorAll("input")].find((element) => element.value === ${JSON.stringify(surface.setupValue.from)});
      if (!input) return false;
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
      setter.call(input, ${JSON.stringify(surface.setupValue.to)});
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    })()`);
    if (!updated) throw new Error(`${surface.key}/${item.label}: setup input missing`);
    await wait(500);
  }
  const found = await evaluateInPage(pageCdp, `(() => {
    const needle = ${JSON.stringify(surface.scrollText)};
    const node = [...document.querySelectorAll("*")].find((element) => element.children.length === 0 && element.textContent?.includes(needle));
    node?.scrollIntoView({ block: "center" });
    return Boolean(node);
  })()`);
  await wait(350);
  const state = await evaluateInPage(pageCdp, `(() => ({ text: document.body.innerText, overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth }))()`);
  for (const required of surface.required) {
    if (!state.text.includes(required)) throw new Error(`${surface.key}/${item.label}: missing ${required}; scroll=${found}; body=${state.text.slice(0, 3000)}`);
  }
  if (state.overflowX) throw new Error(`${surface.key}/${item.label}: horizontal viewport overflow`);
  const shot = await pageCdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false, fromSurface: true });
  const file = `${prefix}-${surface.key}-${item.label}.png`;
  fs.writeFileSync(path.join(outputDir, file), Buffer.from(shot.data, "base64"));
  return { file, page: surface.page, theme: item.theme, viewport: { width: item.width, height: item.height } };
}

try {
  const captures = await withChromiumPage({ url: `${origin}/dashboard`, commandTimeoutMs: 20_000 }, async ({ pageCdp, wait }) => {
    await pageCdp.send("Page.enable");
    await pageCdp.send("Runtime.enable");
    await wait(1000);
    const rows = [];
    for (const item of cases) {
      await pageCdp.send("Emulation.setDeviceMetricsOverride", { width: item.width, height: item.height, deviceScaleFactor: 1, mobile: item.width <= 430 });
      await pageCdp.send("Page.navigate", { url: `${origin}/dashboard` });
      await wait(1200);
      await seed(pageCdp, item.theme);
      for (const surface of surfaces) rows.push(await capture(pageCdp, wait, item, surface));
    }
    return rows;
  });
  console.log(JSON.stringify({ ok: true, origin, captures }, null, 2));
} catch (error) {
  console.error(`S128 visual capture failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
