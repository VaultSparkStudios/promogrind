import { spawn } from "node:child_process";
import { once } from "node:events";
import { readdir, readFile } from "node:fs/promises";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PREVIEW_BIN = fileURLToPath(new URL("../node_modules/vite/bin/vite.js", import.meta.url));
const PREVIEW_HOST = "127.0.0.1";

async function getAvailablePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, PREVIEW_HOST, () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : null;
      server.close(() => {
        if (!port) reject(new Error("Could not allocate preview port"));
        else resolve(port);
      });
    });
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer(url, retries = 40) {
  for (let i = 0; i < retries; i += 1) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {}
    await sleep(500);
  }
  throw new Error(`Preview server did not start at ${url}`);
}

async function assertPath(previewUrl, pathname, checks) {
  const res = await fetch(`${previewUrl}${pathname}`);
  if (!res.ok) throw new Error(`${pathname} returned ${res.status}`);
  const text = await res.text();
  for (const [needle, label] of checks) {
    if (!text.includes(needle)) {
      throw new Error(`${pathname} missing ${label}`);
    }
  }
}

async function fetchPreviewHtml(previewUrl, pathname = "/") {
  const res = await fetch(`${previewUrl}${pathname}`);
  if (!res.ok) throw new Error(`${pathname} returned ${res.status}`);
  return res.text();
}

async function assertBuiltBundleMarkers(markers) {
  const assetsDir = path.resolve(process.cwd(), "dist", "assets");
  const assetFiles = (await readdir(assetsDir)).filter((file) => file.endsWith(".js"));
  if (!assetFiles.length) throw new Error("No built JS assets found");
  const bundleTexts = await Promise.all(assetFiles.map((file) => readFile(path.join(assetsDir, file), "utf8")));
  const bundle = bundleTexts.join("\n");

  for (const [needle, label] of markers) {
    if (!bundle.includes(needle)) throw new Error(`bundle missing ${label}`);
  }
}

const previewPort = await getAvailablePort();
const previewUrl = `http://${PREVIEW_HOST}:${previewPort}`;

const preview = spawn(
  process.execPath,
  [PREVIEW_BIN, "preview", "--host", PREVIEW_HOST, "--port", String(previewPort), "--strictPort"],
  {
    cwd: process.cwd(),
    stdio: ["ignore", "pipe", "pipe"],
  }
);

let stderr = "";
preview.stderr.on("data", (chunk) => {
  stderr += chunk.toString();
});

try {
  await waitForServer(`${previewUrl}/`);
  await assertPath(previewUrl, "/", [["id=\"root\"", "app root"]]);
  await assertPath(previewUrl, "/landing/", [["PromoGrind account", "landing access copy"], ["beta rollout", "landing beta rollout copy"]]);
  await assertPath(previewUrl, "/bonus-bet/", [["Free PromoGrind account", "trust strip"], ["1-800-GAMBLER", "responsible gambling notice"]]);
  await assertPath(previewUrl, "/arb-calculator/", [["Free PromoGrind account", "trust strip"]]);
  await assertPath(previewUrl, "/promogrind-vs-profitduel/", [["beta-gated", "comparison beta language"], ["Start with free PromoGrind account", "updated CTA"]]);
  await assertBuiltBundleMarkers([
    ["PromoGrind is a free sportsbook promo calculator for adults.", "age gate copy"],
    ["Create your PromoGrind account", "project-local auth dialog"],
    ["Choose your edge.", "pricing surface"],
    ["Don't have these books yet? Open accounts to use this promo:", "sportsbook CTA"],
    ["Manage billing", "auth menu billing action"],
    [".pg-mobile-nav", "mobile nav layout hook"],
    ["@media (max-width: 768px)", "mobile breakpoint handling"],
  ]);
  console.log("Browser launch smoke passed.");
} catch (error) {
  console.error("Browser launch smoke failed.");
  console.error(error instanceof Error ? error.message : String(error));
  if (stderr.trim()) console.error(stderr.trim());
  process.exitCode = 1;
} finally {
  preview.kill("SIGTERM");
  try {
    await once(preview, "exit");
  } catch {}
}
