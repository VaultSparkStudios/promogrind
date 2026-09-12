#!/usr/bin/env node
/**
 * Capture script for CANON-041 mobile nav upgrade.
 * Serves the standalone fixture HTML and captures dark+light at mobile+desktop viewports.
 * Uses a fixture instead of the full app because the dist build requires live Supabase
 * credentials to mount (auth gate), which are not present in this repo.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { evaluateInPage, wait, withChromiumPage } from "./lib/chromium-cdp.mjs";

const root = process.cwd();
const fixturesDir = path.join(root, "docs/visual-qa/fixtures");
const outputDir = path.resolve(path.join(root, "docs/visual-qa/captures"));
const prefix = "canon041-mobile-nav";

fs.mkdirSync(outputDir, { recursive: true });

function serveDir(dir, port) {
  const mimeTypes = {
    ".html": "text/html; charset=utf-8",
    ".js": "application/javascript",
    ".css": "text/css",
    ".png": "image/png",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
    ".json": "application/json",
  };
  const server = http.createServer((req, res) => {
    let urlPath = req.url.split("?")[0];
    if (urlPath === "/") urlPath = "/mobile-nav-canon041.html";
    const filePath = path.join(dir, urlPath);
    const ext = path.extname(filePath).toLowerCase();
    const mime = mimeTypes[ext] || "text/plain";
    try {
      const content = fs.readFileSync(filePath);
      res.writeHead(200, { "Content-Type": mime });
      res.end(content);
    } catch {
      res.writeHead(404);
      res.end("Not found");
    }
  });
  return new Promise((resolve, reject) => {
    server.listen(port, "127.0.0.1", () => resolve(server));
    server.on("error", reject);
  });
}

function sha256File(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

const PORT = 14782;
const origin = "http://127.0.0.1:" + PORT;
const fixtureUrl = origin + "/mobile-nav-canon041.html";

const cases = [
  { theme: "dark",  width: 390,  height: 844, label: "mobile-dark",   mobile: true },
  { theme: "light", width: 390,  height: 844, label: "mobile-light",  mobile: true },
  { theme: "dark",  width: 1440, height: 900, label: "desktop-dark",  mobile: false },
  { theme: "light", width: 1440, height: 900, label: "desktop-light", mobile: false },
];

const server = await serveDir(fixturesDir, PORT);
let exitCode = 0;

try {
  const rows = await withChromiumPage(
    { url: fixtureUrl, startupTimeoutMs: 30_000, commandTimeoutMs: 20_000 },
    async ({ pageCdp, wait: w }) => {
      await pageCdp.send("Page.enable");
      await pageCdp.send("Runtime.enable");

      const rows = [];

      for (const item of cases) {
        await pageCdp.send("Emulation.setDeviceMetricsOverride", {
          width: item.width,
          height: item.height,
          deviceScaleFactor: item.mobile ? 2 : 1,
          mobile: item.mobile,
        });

        await pageCdp.send("Page.navigate", { url: fixtureUrl });
        await w(1500);

        // Set theme via data-theme attribute
        await evaluateInPage(
          pageCdp,
          "document.documentElement.setAttribute('data-theme', '" + item.theme + "')"
        );
        await w(300);

        const state = await evaluateInPage(pageCdp, "(" + (function() {
          var nav = document.querySelector(".pg-mobile-nav");
          var buttons = nav ? [].slice.call(nav.querySelectorAll("button")) : [];
          return {
            navPresent: !!nav,
            buttonCount: buttons.length,
            svgIcons: nav ? nav.querySelectorAll("svg").length : 0,
            theme: document.documentElement.getAttribute("data-theme"),
            overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth,
          };
        }).toString() + ")()");

        console.error(
          item.label + " nav=" + state.navPresent +
          " icons=" + state.svgIcons + " buttons=" + state.buttonCount +
          " theme=" + state.theme + " overflow=" + state.overflowX
        );

        if (!state.navPresent) throw new Error(item.label + ": .pg-mobile-nav not found in fixture");
        if (state.svgIcons < 6) throw new Error(item.label + ": expected >=6 SVG icons, got " + state.svgIcons);
        if (state.overflowX) throw new Error(item.label + ": horizontal overflow detected");

        const shot = await pageCdp.send("Page.captureScreenshot", {
          format: "png",
          captureBeyondViewport: false,
          fromSurface: true,
        });
        const file = prefix + "-" + item.label + ".png";
        const filePath = path.join(outputDir, file);
        fs.writeFileSync(filePath, Buffer.from(shot.data, "base64"));
        console.error("  -> captured " + file);
        rows.push({ file, theme: item.theme, viewport: { width: item.width, height: item.height } });
      }
      return rows;
    }
  );

  const captures = rows.map((row) => ({
    file: "captures/" + row.file,
    page: "/fixture — MobileBottomNav with SVG icons (CANON-041)",
    theme: row.theme,
    viewport: row.viewport,
    sha256: sha256File(path.join(outputDir, row.file)),
  }));

  console.log(JSON.stringify({ ok: true, captures }, null, 2));
} catch (err) {
  console.error("FAILED: " + (err instanceof Error ? err.message : String(err)));
  exitCode = 1;
} finally {
  server.close();
  process.exit(exitCode);
}
