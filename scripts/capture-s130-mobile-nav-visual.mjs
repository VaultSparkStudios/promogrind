#!/usr/bin/env node
/**
 * CANON-053 visual capture — mobile bottom nav icons (S130 / PR #90)
 * Serves the component fixture and captures at mobile viewport in dark
 * and light themes to prove the SVG icon upgrade renders correctly.
 *
 * Uses a self-contained fixture (scripts/fixtures/mobile-nav-fixture.html)
 * rather than the full app shell because the production build embeds empty
 * Supabase credentials (no .env in CI) which causes createClient to throw
 * synchronously, preventing the React bundle from mounting.  The fixture
 * renders the exact SVG icons, CSS custom-property color tokens, active-
 * indicator pill, and spring-scale animation from AppNavigation.jsx.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import net from "node:net";
import path from "node:path";
import { evaluateInPage, withChromiumPage } from "./lib/chromium-cdp.mjs";

const fixtureFile = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  "fixtures/mobile-nav-fixture.html",
);
const outputDir = path.resolve(process.cwd(), "docs/visual-qa/captures");
const prefix = "s130-mobile-nav";

if (!fs.existsSync(fixtureFile)) {
  console.error(`Fixture not found: ${fixtureFile}`);
  process.exit(1);
}

const MIME = {
  html: "text/html",
  js: "application/javascript",
  css: "text/css",
  svg: "image/svg+xml",
  png: "image/png",
  ico: "image/x-icon",
  json: "application/json",
};

function createFixtureServer() {
  return http.createServer((req, res) => {
    const content = fs.readFileSync(fixtureFile);
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(content);
  });
}

function freePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.unref();
    srv.on("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

const cases = [
  { theme: "dark",  width: 390, height: 844, label: "mobile-dark" },
  { theme: "light", width: 390, height: 844, label: "mobile-light" },
];

fs.mkdirSync(outputDir, { recursive: true });

const port = await freePort();
const server = createFixtureServer();
await new Promise((resolve) => server.listen(port, "127.0.0.1", resolve));
const origin = `http://127.0.0.1:${port}`;
console.log(`Fixture server: ${origin}`);

try {
  const rows = await withChromiumPage(
    { url: origin, commandTimeoutMs: 20_000 },
    async ({ pageCdp, wait }) => {
      await pageCdp.send("Page.enable");
      await pageCdp.send("Runtime.enable");
      const results = [];

      for (const c of cases) {
        await pageCdp.send("Emulation.setDeviceMetricsOverride", {
          width: c.width, height: c.height, deviceScaleFactor: 2, mobile: true,
        });

        // Navigate fresh for each theme
        await pageCdp.send("Page.navigate", { url: origin });
        await wait(1200);

        // Set theme, wait for CSS custom props to apply
        await evaluateInPage(pageCdp, `window.setTheme(${JSON.stringify(c.theme)})`);
        await wait(400);

        // Verify fixture is ready and inspect nav
        const navState = await evaluateInPage(pageCdp, `(() => {
          const nav = document.getElementById('pg-nav');
          if (!nav) return { found: false };
          const buttons = [...nav.querySelectorAll('button')];
          const svgs = [...nav.querySelectorAll('svg')];
          const activePill = nav.querySelector('.pg-active-pill');
          const activeBtn = nav.querySelector('[aria-current="page"]');
          const bodyBg = getComputedStyle(document.body).backgroundColor;
          const overflow = document.documentElement.scrollWidth > document.documentElement.clientWidth;
          return {
            found: true,
            buttonCount: buttons.length,
            svgCount: svgs.length,
            hasActivePill: !!activePill,
            activeLabel: activeBtn ? (activeBtn.getAttribute('aria-label') || '') : '',
            overflow,
            bodyBg,
            fixtureReady: !!window.pgFixtureReady,
          };
        })()`);

        console.log(`[${c.label}] nav state:`, JSON.stringify(navState));

        if (!navState.found) throw new Error(`${c.label}: #pg-nav not found — fixture did not load`);
        if (!navState.fixtureReady) throw new Error(`${c.label}: pgFixtureReady not set`);
        if (navState.buttonCount !== 6) throw new Error(`${c.label}: expected 6 nav buttons, got ${navState.buttonCount}`);
        if (navState.svgCount < 6) throw new Error(`${c.label}: expected ≥6 SVG icons, got ${navState.svgCount}`);
        if (!navState.hasActivePill) throw new Error(`${c.label}: active indicator pill not found`);
        if (navState.overflow) throw new Error(`${c.label}: horizontal overflow detected`);

        const shot = await pageCdp.send("Page.captureScreenshot", {
          format: "png", captureBeyondViewport: false, fromSurface: true,
        });
        const buf = Buffer.from(shot.data, "base64");
        const sha256 = crypto.createHash("sha256").update(buf).digest("hex");
        const file = `${prefix}-${c.label}.png`;
        fs.writeFileSync(path.join(outputDir, file), buf);
        results.push({
          file,
          page: `/dashboard — mobile bottom nav (component fixture)`,
          theme: c.theme,
          viewport: { width: c.width, height: c.height },
          sha256,
          navState,
        });
        console.log(`  → ${file} (${buf.length} bytes, sha256: ${sha256.slice(0, 12)}…)`);
      }
      return results;
    },
  );

  console.log(JSON.stringify({ ok: true, origin, captures: rows }, null, 2));
} finally {
  server.close();
}
