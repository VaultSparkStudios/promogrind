#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { evaluateInPage, withChromiumPage } from "./lib/chromium-cdp.mjs";

const arg = (name, fallback) => process.argv.find((item) => item.startsWith(`${name}=`))?.slice(name.length + 1) || fallback;
const origin = arg("--origin", "http://127.0.0.1:4173");
const outputDir = path.resolve(arg("--output", "docs/visual-qa/captures"));
const prefix = arg("--prefix", "s127-after");
const cases = [
  { theme: "dark", width: 1440, height: 1000, label: "desktop-dark" },
  { theme: "light", width: 1440, height: 1000, label: "desktop-light" },
  { theme: "dark", width: 390, height: 844, label: "mobile-dark" },
  { theme: "light", width: 390, height: 844, label: "mobile-light" },
];

const now = new Date().toISOString();
const appData = {
  bankroll: "500",
  done: {},
  bets: [
    { id: "risk-1", status: "open", stake: "100", odds: "+120", book: "DraftKings", event: "Chiefs vs Bills", type: "Moneyline", date: now.slice(0, 10) },
    { id: "risk-2", status: "open", stake: "60", odds: "-110", book: "FanDuel", event: "Chiefs vs Bills", type: "Total", date: now.slice(0, 10) },
    { id: "risk-3", status: "open", stake: "30", odds: "+105", book: "Caesars", event: "Chiefs vs Bills", type: "Spread", date: now.slice(0, 10) },
  ],
  ledger: [{ id: "real-visual", date: now.slice(0, 10), book: "FanDuel", type: "Bonus Conversion", profit: "12.50" }],
  _ledgerQuarantine: [{ key: "ledger-demo-visual", reason: "legacy-demo-id", quarantinedAt: now, entry: { id: "ledger-demo-visual", profit: "138.60" } }],
  resultFeedback: [
    { id: "friction-1", status: "skipped", skipReason: "odds_moved", updatedAt: now, promoType: "bonus_bet" },
    { id: "friction-2", status: "skipped", skipReason: "odds_moved", updatedAt: now, promoType: "profit_boost" },
    { id: "friction-3", status: "placed", frictionReason: "timing", updatedAt: now, promoType: "bonus_bet" },
  ],
  workflowInbox: [],
};
const promoText = "Get a $200 Bonus Bet if your first $5 bet loses. Bonus bet expires in 7 days.";
const advisorBody = { personalizationConsent: false, privacyContractVersion: 1, promoText };
const advisorCacheKey = `promo-advisor:v4:${JSON.stringify(advisorBody)}`;
const advisorResult = {
  verdict: "Good offer with terms to verify",
  rating: "good",
  confidence: "high",
  opportunityScore: 82,
  evidenceGrade: "complete",
  analysisSource: "model",
  explanation: "The offer structure is clear enough to model, but current terms and prices still control execution.",
  action: "Verify the live minimum odds and price both sides before placing anything.",
  nextStep: "Open the Bonus Bet Converter with the current book terms.",
  calculatorSlug: "bonus-bet",
  promoType: "bonus_bet",
  missingInputs: [],
  assumptions: ["The pasted expiry and amount are current."],
  sensitivityTriggers: ["Minimum odds or refund format changes."],
  positiveOutcomeProbability: null,
  probabilityBasis: null,
};
const calibrationLedger = Array.from({ length: 4 }, (_, index) => ({
  id: `visual-cal-${index}`,
  source: "promo-advisor",
  predicted: 0.7,
  actual: index % 2,
  occurredAt: Date.now() - ((index + 1) * 86400000),
  resolvedAt: Date.now() - (index * 86400000),
}));
const expiresAt = Math.floor(Date.now() / 1000) + 3600;
const user = { id: "00000000-0000-4000-8000-000000000127", aud: "authenticated", role: "authenticated", email: "visual-qa@promogrind.invalid", user_metadata: { trial_start: now } };
const tokenPart = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
const session = {
  access_token: `${tokenPart({ alg: "HS256", typ: "JWT" })}.${tokenPart({ sub: user.id, aud: "authenticated", role: "authenticated", exp: expiresAt })}.visualqa`,
  refresh_token: "visual-qa-refresh",
  expires_at: expiresAt,
  expires_in: 3600,
  token_type: "bearer",
  user,
};

fs.mkdirSync(outputDir, { recursive: true });

async function seed(pageCdp, theme) {
  const values = {
    pg_theme: theme,
    pg_age_verified: String(Date.now()),
    pg_onboarded_v1: "1",
    pg_onboarding_done: "1",
    pg_starter_pack_done: "1",
    promo_engine_v3: JSON.stringify(appData),
    "sb-fjnpzjjyhnpmunfoycrp-auth-token": JSON.stringify(session),
    pg_ai_calibration_ledger: JSON.stringify(calibrationLedger),
    [advisorCacheKey]: JSON.stringify({ cachedAt: Date.now(), value: advisorResult }),
  };
  await evaluateInPage(pageCdp, `(() => { const values = ${JSON.stringify(values)}; for (const [key, value] of Object.entries(values)) localStorage.setItem(key, value); })()`);
}

async function navigate(pageCdp, route, wait) {
  await pageCdp.send("Page.navigate", { url: `${origin}${route}` });
  await wait(2200);
}

async function capture(pageCdp, wait, item, surface) {
  await navigate(pageCdp, surface.route, wait);
  if (surface.scrollText) {
    await evaluateInPage(pageCdp, `(() => { const needle = ${JSON.stringify(surface.scrollText)}; const node = [...document.querySelectorAll("*")].find((el) => el.children.length === 0 && el.textContent?.includes(needle)); node?.scrollIntoView({ block: "center" }); return Boolean(node); })()`);
    await wait(400);
  }
  const state = await evaluateInPage(pageCdp, `(() => ({ text: document.body.innerText, overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth }))()`);
  if (!state.text.includes(surface.mustInclude)) throw new Error(`${surface.key}/${item.label}: missing ${surface.mustInclude}; body=${state.text.slice(0, 2500)}`);
  if (state.overflowX) throw new Error(`${surface.key}/${item.label}: horizontal viewport overflow`);
  const shot = await pageCdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false, fromSurface: true });
  const filename = `${prefix}-${surface.key}-${item.label}.png`;
  fs.writeFileSync(path.join(outputDir, filename), Buffer.from(shot.data, "base64"));
  return { file: filename, page: surface.page, theme: item.theme, viewport: { width: item.width, height: item.height } };
}

async function captureAdvisor(pageCdp, wait, item) {
  await navigate(pageCdp, "/dashboard", wait);
  const opened = await evaluateInPage(pageCdp, `(() => { const button = [...document.querySelectorAll("button")].find((node) => node.textContent?.trim() === "Advisor"); button?.click(); return Boolean(button); })()`);
  if (!opened) throw new Error(`advisor/${item.label}: trigger missing`);
  await wait(700);
  const filled = await evaluateInPage(pageCdp, `(() => {
    const area = [...document.querySelectorAll("textarea")].find((node) => node.placeholder?.includes("Get a $200 Bonus Bet"));
    if (!area) return false;
    area.focus();
    return true;
  })()`);
  if (!filled) throw new Error(`advisor/${item.label}: input missing`);
  await pageCdp.send("Input.insertText", { text: promoText });
  await wait(250);
  const submitted = await evaluateInPage(pageCdp, `(() => {
    const button = [...document.querySelectorAll("button")].find((node) => node.textContent?.includes("Analyze This Promo"));
    const area = [...document.querySelectorAll("textarea")].find((node) => node.placeholder?.includes("Get a $200 Bonus Bet"));
    button?.click();
    return { ok: Boolean(button), disabled: button?.disabled, areaValue: area?.value, body: document.body.innerText.slice(0, 1800), buttons: [...document.querySelectorAll("button")].map((node) => node.textContent?.trim()).filter(Boolean) };
  })()`);
  if (!submitted?.ok) throw new Error(`advisor/${item.label}: analysis controls missing; ${JSON.stringify(submitted)}`);
  await wait(1000);
  const state = await evaluateInPage(pageCdp, `(() => ({ text: document.body.innerText, overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth }))()`);
  for (const required of ["VERIFY FIRST", "RAW HIGH", "Calibration cold start", "no outcome probability inferred"]) {
    if (!state.text.includes(required)) throw new Error(`advisor/${item.label}: missing ${required}; submitted=${JSON.stringify(submitted)}; tail=${state.text.slice(-3500)}`);
  }
  if (state.overflowX) throw new Error(`advisor/${item.label}: horizontal viewport overflow`);
  const shot = await pageCdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false, fromSurface: true });
  const filename = `${prefix}-advisor-${item.label}.png`;
  fs.writeFileSync(path.join(outputDir, filename), Buffer.from(shot.data, "base64"));
  return { file: filename, page: "/dashboard — calibration-governed Promo Advisor receipt", theme: item.theme, viewport: { width: item.width, height: item.height } };
}

const surfaces = [
  { key: "dashboard", route: "/dashboard", mustInclude: "Exposure is concentrated", page: "/dashboard — concentration radar + friction recovery" },
  { key: "track", route: "/edge-dashboard", mustInclude: "RECOVERY PLAN", scrollText: "RECOVERY PLAN", page: "/edge-dashboard — evidence-thresholded recovery plan" },
  { key: "ledger", route: "/ledger", mustInclude: "synthetic ledger example is quarantined", page: "/ledger — synthetic evidence quarantine" },
  { key: "bet-tracker", route: "/bet-tracker", mustInclude: "EVENT / MATCHUP", page: "/bet-tracker — event metadata capture" },
];

try {
  const captures = await withChromiumPage({ url: `${origin}/dashboard`, commandTimeoutMs: 20_000 }, async ({ pageCdp, wait }) => {
    await pageCdp.send("Page.enable");
    await pageCdp.send("Runtime.enable");
    await wait(1200);
    const rows = [];
    for (const item of cases) {
      await pageCdp.send("Emulation.setDeviceMetricsOverride", { width: item.width, height: item.height, deviceScaleFactor: 1, mobile: item.width <= 430 });
      await seed(pageCdp, item.theme);
      for (const surface of surfaces) rows.push(await capture(pageCdp, wait, item, surface));
      rows.push(await captureAdvisor(pageCdp, wait, item));
    }
    return rows;
  });
  console.log(JSON.stringify({ ok: true, origin, captures }, null, 2));
} catch (error) {
  console.error(`S127 visual capture failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
