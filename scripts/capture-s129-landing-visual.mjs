#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { evaluateInPage, withChromiumPage } from "./lib/chromium-cdp.mjs";

const arg = (name, fallback) => process.argv.find((item) => item.startsWith(`${name}=`))?.slice(name.length + 1) || fallback;
const origin = arg("--origin", "https://staging.promogrind.bet");
const outputDir = path.resolve(arg("--output", "docs/visual-qa/captures"));
const prefix = arg("--prefix", "s129-after-landing");
const cases = [
  { theme: "dark", width: 1440, height: 1000, label: "desktop-dark" },
  { theme: "light", width: 1440, height: 1000, label: "desktop-light" },
  { theme: "dark", width: 390, height: 844, label: "mobile-dark" },
  { theme: "light", width: 390, height: 844, label: "mobile-light" },
];

fs.mkdirSync(outputDir, { recursive: true });

try {
  const captures = await withChromiumPage({ url: origin, commandTimeoutMs: 20_000 }, async ({ pageCdp, wait }) => {
    await pageCdp.send("Page.enable");
    await pageCdp.send("Runtime.enable");
    await pageCdp.send("Network.enable");
    await pageCdp.send("Network.setCacheDisabled", { cacheDisabled: true });
    await pageCdp.send("Network.setBypassServiceWorker", { bypass: true });
    await pageCdp.send("Storage.clearDataForOrigin", { origin, storageTypes: "all" });
    const rows = [];
    for (const item of cases) {
      await pageCdp.send("Emulation.setDeviceMetricsOverride", { width: item.width, height: item.height, deviceScaleFactor: 1, mobile: item.width <= 430 });
      await pageCdp.send("Page.navigate", { url: origin });
      await wait(1200);
      await evaluateInPage(pageCdp, `(() => { localStorage.setItem("pg_theme", ${JSON.stringify(item.theme)}); })()`);
      await pageCdp.send("Page.navigate", { url: origin });
      await wait(5000);
      const themeState = await evaluateInPage(pageCdp, `(() => ({
        label: document.querySelector('button[aria-label*="landing page"]')?.getAttribute("aria-label") || "",
        bodyBackground: getComputedStyle(document.body).backgroundColor,
        buttons: [...document.querySelectorAll("button")].map((button) => button.getAttribute("aria-label") || button.textContent.trim()).slice(0, 12),
        text: document.body.innerText.slice(0, 500)
      }))()`);
      const expectedToggle = item.theme === "dark" ? "light theme" : "dark theme";
      if (!themeState.label.includes(expectedToggle)) throw new Error(`${item.label}: theme toggle did not reflect ${item.theme}; observed=${themeState.label || "<missing>"}; buttons=${JSON.stringify(themeState.buttons)}; body=${themeState.text}`);
      await evaluateInPage(pageCdp, `(() => { document.querySelector("footer")?.scrollIntoView({ block: "center" }); })()`);
      await wait(450);
      const state = await evaluateInPage(pageCdp, `(() => {
        const text = document.body.innerText;
        const links = [...document.querySelectorAll("footer a")];
        return {
          text,
          footer: Boolean(document.querySelector("footer")),
          overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth,
          undersizedFooterLinks: links.filter((link) => {
            const rect = link.getBoundingClientRect();
            return rect.width < 44 || rect.height < 44;
          }).map((link) => link.textContent.trim()),
        };
      })()`);
      for (const required of ["VaultSpark Studios LLC", "All rights reserved", "Privacy", "Terms", "Contact"]) {
        if (!state.text.includes(required)) throw new Error(`${item.label}: missing ${required}`);
      }
      if (!state.footer) throw new Error(`${item.label}: semantic footer missing`);
      if (state.overflowX) throw new Error(`${item.label}: horizontal overflow`);
      if (state.undersizedFooterLinks.length) throw new Error(`${item.label}: undersized footer links ${state.undersizedFooterLinks.join(", ")}`);
      const shot = await pageCdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false, fromSurface: true });
      const file = `${prefix}-${item.label}.png`;
      fs.writeFileSync(path.join(outputDir, file), Buffer.from(shot.data, "base64"));
      rows.push({ file, page: "/ — branded landing footer", theme: item.theme, viewport: { width: item.width, height: item.height }, bodyBackground: themeState.bodyBackground });
    }
    return rows;
  });
  console.log(JSON.stringify({ ok: true, origin, captures }, null, 2));
} catch (error) {
  console.error(`S129 landing visual capture failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
