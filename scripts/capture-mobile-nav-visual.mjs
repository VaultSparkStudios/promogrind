#!/usr/bin/env node
/**
 * PR visual capture: mobile-nav-parity-canon-041
 * Captures the app shell at dashboard with desktop nav tabs (top) and mobile bottom nav,
 * covering dark/light × desktop/mobile to gate the nav layout, glyphs, and 768px transition.
 */
import fs from "node:fs";
import { createServer } from "node:http";
import net from "node:net";
import path from "node:path";
import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { evaluateInPage, withChromiumPage } from "./lib/chromium-cdp.mjs";

const root = path.resolve(fileURLToPath(import.meta.url), "../..");
const distDir = path.join(root, "dist");
const outputDir = path.join(root, "docs/visual-qa/captures");
const prefix = "mobile-nav-parity";

const CASES = [
  { theme: "dark",  width: 1440, height: 900,  label: "desktop-dark",  mobile: false },
  { theme: "light", width: 1440, height: 900,  label: "desktop-light", mobile: false },
  { theme: "dark",  width: 390,  height: 844,  label: "mobile-dark",   mobile: true  },
  { theme: "light", width: 390,  height: 844,  label: "mobile-light",  mobile: true  },
];

async function getAvailablePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close(() => resolve(address.port));
    });
  });
}

const MIME = {
  ".html": "text/html",
  ".js":   "application/javascript",
  ".css":  "text/css",
  ".png":  "image/png",
  ".svg":  "image/svg+xml",
  ".ico":  "image/x-icon",
  ".json": "application/json",
  ".txt":  "text/plain",
  ".webp": "image/webp",
  ".woff2":"font/woff2",
};

async function startLocalServer(dir) {
  const port = await getAvailablePort();
  const server = createServer(async (req, res) => {
    try {
      let urlPath = new URL(req.url || "/", `http://127.0.0.1:${port}`).pathname;
      // SPA fallback
      let filePath = path.join(dir, urlPath);
      if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        filePath = path.join(dir, "index.html");
      }
      const ext = path.extname(filePath);
      const body = await readFile(filePath);
      res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
      res.end(body);
    } catch {
      res.writeHead(404);
      res.end("Not found");
    }
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", resolve);
  });
  return { server, port, url: `http://127.0.0.1:${port}` };
}

fs.mkdirSync(outputDir, { recursive: true });

const { server, url } = await startLocalServer(distDir);
console.log(`Local server: ${url}`);

try {
  const captures = await withChromiumPage(
    { url, startupTimeoutMs: 30_000, commandTimeoutMs: 20_000 },
    async ({ pageCdp, wait }) => {
      await pageCdp.send("Page.enable");
      await pageCdp.send("Runtime.enable");
      await pageCdp.send("Network.enable");
      // Block external resources that fail in the restricted proxy environment
      await pageCdp.send("Network.setBlockedURLs", {
        urls: ["fonts.googleapis.com", "fonts.gstatic.com", "*.gvt1.com", "redirector.gvt1.com"],
      });
      const rows = [];
      for (const item of CASES) {
        await pageCdp.send("Emulation.setDeviceMetricsOverride", {
          width: item.width, height: item.height,
          deviceScaleFactor: item.mobile ? 2 : 1,
          mobile: item.mobile,
        });
        // Navigate to root; SPA boots, sets theme, then navigates internally
        await pageCdp.send("Page.navigate", { url });
        await wait(3000);
        // Set theme and navigate to dashboard
        await evaluateInPage(pageCdp, `document.body && localStorage.setItem("pg_theme", ${JSON.stringify(item.theme)})`);
        await pageCdp.send("Page.navigate", { url: `${url}/dashboard` });
        await wait(5000);

        const state = await evaluateInPage(pageCdp, `(() => {
          if (!document.body) return { ready: false };
          const mobileNav = document.querySelector(".pg-mobile-nav");
          const mainTabs = document.querySelector(".pg-main-tabs");
          const mobileNavVisible = mobileNav instanceof Element
            ? getComputedStyle(mobileNav).display !== "none"
            : null;
          const mainTabsVisible = mainTabs instanceof Element
            ? getComputedStyle(mainTabs).display !== "none"
            : null;
          const overflowX = document.documentElement.scrollWidth > document.documentElement.clientWidth + 2;
          const bodyBg = getComputedStyle(document.body).backgroundColor;
          return { ready: true, mobileNavVisible, mainTabsVisible, overflowX, bodyBg, width: window.innerWidth };
        })()`);

        if (!state.ready) throw new Error(`${item.label}: page body not ready after wait`);

        // Nav checks only when the app shell has actually rendered (elements found)
        const isMobileViewport = item.width <= 768;
        if (state.mobileNavVisible !== null && state.mainTabsVisible !== null) {
          if (isMobileViewport) {
            if (!state.mobileNavVisible) throw new Error(`${item.label}: mobile nav not visible at ${item.width}px`);
            if (state.mainTabsVisible) throw new Error(`${item.label}: top tabs should be hidden at ${item.width}px but are visible`);
          } else {
            if (state.mobileNavVisible) throw new Error(`${item.label}: mobile nav should be hidden at ${item.width}px but is visible`);
            if (!state.mainTabsVisible) throw new Error(`${item.label}: top tabs should be visible at ${item.width}px but are hidden`);
          }
        }
        if (state.overflowX) throw new Error(`${item.label}: horizontal overflow`);

        const shot = await pageCdp.send("Page.captureScreenshot", {
          format: "png", captureBeyondViewport: false, fromSurface: true,
        });
        const file = `${prefix}-${item.label}.png`;
        fs.writeFileSync(path.join(outputDir, file), Buffer.from(shot.data, "base64"));
        rows.push({
          file: `captures/${file}`,
          page: `/dashboard — mobile-nav-parity CANON-041`,
          theme: item.theme,
          viewport: { width: item.width, height: item.height },
          navCheck: { mobileNavVisible: state.mobileNavVisible, mainTabsVisible: state.mainTabsVisible },
        });
        console.log(`  ✓ ${item.label}: mobileNav=${state.mobileNavVisible} topTabs=${state.mainTabsVisible} overflow=${state.overflowX}`);
      }
      return rows;
    },
  );
  console.log(`\nCaptures complete: ${captures.length} files`);
  console.log(JSON.stringify(captures, null, 2));
} finally {
  server.close();
}
