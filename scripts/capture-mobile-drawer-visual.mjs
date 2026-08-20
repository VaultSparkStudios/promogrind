#!/usr/bin/env node
// CANON-053 rendered-pixel evidence for the CANON-041 mobile drawer sub-nav.
// Captures dark + light at desktop (drawer hidden by media query) and mobile
// (drawer open showing sub-items) so the receipt binds every touched state.
import fs from "node:fs";
import path from "node:path";
import { evaluateInPage, withChromiumPage } from "./lib/chromium-cdp.mjs";

const arg = (name, fallback) => process.argv.find((item) => item.startsWith(`${name}=`))?.slice(name.length + 1) || fallback;
const origin = arg("--origin", "http://127.0.0.1:4173");
const outputDir = path.resolve(arg("--output", "docs/visual-qa/captures"));
const prefix = arg("--prefix", "s130-mobile-drawer");
// dashboard path pushes the app straight into the shell (skipping the /
// landing route) so the mobile bottom rail actually renders.
const appPath = arg("--path", "/bonus-bet");

const cases = [
  // Desktop verifies the drawer + rail are hidden by the min-width media query.
  { theme: "dark",  width: 1440, height: 1000, label: "desktop-dark",  openDrawer: false, expectRail: false },
  { theme: "light", width: 1440, height: 1000, label: "desktop-light", openDrawer: false, expectRail: false },
  // Mobile captures the drawer in its opened state so reviewers can inspect it.
  { theme: "dark",  width: 390,  height: 844,  label: "mobile-dark",   openDrawer: true,  expectRail: true },
  { theme: "light", width: 390,  height: 844,  label: "mobile-light",  openDrawer: true,  expectRail: true },
];

fs.mkdirSync(outputDir, { recursive: true });

try {
  const captures = await withChromiumPage({ url: origin, commandTimeoutMs: 45_000 }, async ({ pageCdp, wait }) => {
    await pageCdp.send("Page.enable");
    await pageCdp.send("Runtime.enable");
    await pageCdp.send("Network.enable");
    // Install an early error trap so we can dig out the boot exception.
    await pageCdp.send("Page.addScriptToEvaluateOnNewDocument", {
      source: `
        window.__pgErrors = [];
        const rec = (kind, msg, stack) => window.__pgErrors.push({ kind, message: String(msg || ''), stack: String(stack || '') });
        window.addEventListener('error', (e) => rec('error', e.message, e.error?.stack));
        window.addEventListener('unhandledrejection', (e) => rec('rej', e.reason?.message || e.reason, e.reason?.stack));
        const origErr = console.error.bind(console);
        console.error = (...args) => {
          const flat = args.map((a) => (a && a.stack) ? a.stack : (typeof a === 'object' ? JSON.stringify(a).slice(0, 400) : String(a))).join(' ');
          rec('console', flat, '');
          origErr(...args);
        };
      `,
    });
    await pageCdp.send("Network.setCacheDisabled", { cacheDisabled: true });
    const rows = [];
    for (const item of cases) {
      const targetUrl = `${origin.replace(/\/$/, "")}${appPath}`;
      await pageCdp.send("Emulation.setDeviceMetricsOverride", { width: item.width, height: item.height, deviceScaleFactor: 1, mobile: item.width <= 430 });
      // Prime the theme before navigation so first paint is correct.
      await pageCdp.send("Page.navigate", { url: `${origin.replace(/\/$/, "")}/` });
      await wait(1200);
      await evaluateInPage(pageCdp, `(() => {
        localStorage.setItem("pg_theme", ${JSON.stringify(item.theme)});
        localStorage.setItem("pg_age_verified", String(Date.now()));
        localStorage.setItem("pg_onboarded_v1", "1");
      })()`);
      await pageCdp.send("Page.navigate", { url: targetUrl });
      await wait(3000);
      // Poll until the mobile rail (or the desktop header) appears, or timeout.
      let ready = false;
      const readyBy = Date.now() + 20_000;
      while (Date.now() < readyBy) {
        const rendered = await evaluateInPage(pageCdp, `(() => {
          const rail = document.querySelector('.pg-mobile-nav');
          const header = document.querySelector('header');
          const bodyText = (document.body?.innerText || '').trim();
          return {
            hasRail: Boolean(rail),
            hasHeader: Boolean(header),
            loading: bodyText === 'Loading PromoGrind…' || bodyText === 'Loading PromoGrind...',
          };
        })()`);
        if ((rendered.hasHeader && !rendered.loading) || rendered.hasRail) { ready = true; break; }
        await wait(500);
      }
      if (!ready) console.error(`[${item.label}] warning: readiness check timed out; capturing anyway`);
      await wait(1200); // let animations settle

      // Optionally open the mobile drawer by tapping the currently-active bottom-rail button.
      const state = await evaluateInPage(pageCdp, `(() => {
        const rail = document.querySelector('.pg-mobile-nav');
        return {
          hasRail: Boolean(rail),
          railTabs: rail ? [...rail.querySelectorAll('button')].map((button) => button.getAttribute('aria-label') || button.textContent.trim().slice(0, 24)) : [],
        };
      })()`);
      if (item.expectRail && !state.hasRail) {
        const debug = await evaluateInPage(pageCdp, `(() => ({
          url: location.href,
          title: document.title,
          textStart: (document.body?.innerText || '').slice(0, 240),
          hasHeader: Boolean(document.querySelector('header')),
          firstButtons: [...document.querySelectorAll('button')].slice(0, 8).map((button) => button.textContent.trim().slice(0, 30)),
          errors: (window.__pgErrors || []).slice(0, 4),
        }))()`);
        throw new Error(`${item.label}: mobile rail did not render — debug=${JSON.stringify(debug)}`);
      }
      if (!item.expectRail && state.hasRail && item.width > 768) {
        // Confirm CSS media query hides the rail on desktop.
        const railVisible = await evaluateInPage(pageCdp, `(() => {
          const rail = document.querySelector('.pg-mobile-nav');
          if (!rail) return false;
          const style = getComputedStyle(rail);
          return style.display !== 'none';
        })()`);
        if (railVisible) throw new Error(`${item.label}: mobile rail should be hidden on desktop but was visible`);
      }
      if (item.openDrawer) {
        const opened = await evaluateInPage(pageCdp, `(() => {
          const rail = document.querySelector('.pg-mobile-nav');
          if (!rail) return { ok: false, reason: 'no rail' };
          const active = rail.querySelector('button[aria-current="page"]') || rail.querySelector('button');
          if (!active) return { ok: false, reason: 'no active tab' };
          active.click();
          return { ok: true };
        })()`);
        if (!opened.ok) throw new Error(`${item.label}: failed to open drawer — ${opened.reason}`);
        await wait(500);
        const drawerState = await evaluateInPage(pageCdp, `(() => {
          const sheet = document.querySelector('.pg-drawer-sheet');
          if (!sheet) return { open: false };
          const items = [...sheet.querySelectorAll('[role="listitem"]')].map((button) => button.textContent.trim().slice(0, 40));
          const focus = document.activeElement?.tagName || null;
          return { open: true, items, focus };
        })()`);
        if (!drawerState.open) throw new Error(`${item.label}: drawer sheet did not mount`);
        if (!drawerState.items.length) throw new Error(`${item.label}: drawer has no sub-items`);
      }

      const shot = await pageCdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false, fromSurface: true });
      const file = `${prefix}-${item.label}.png`;
      fs.writeFileSync(path.join(outputDir, file), Buffer.from(shot.data, "base64"));
      rows.push({
        file: `captures/${file}`,
        page: item.openDrawer
          ? `${appPath} — mobile drawer sub-nav (opened)`
          : `${appPath} — desktop shell (drawer + rail hidden by media query)`,
        theme: item.theme,
        viewport: { width: item.width, height: item.height },
      });
    }
    return rows;
  });
  console.log(JSON.stringify({ ok: true, origin, captures }, null, 2));
} catch (error) {
  console.error(`mobile drawer visual capture failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
