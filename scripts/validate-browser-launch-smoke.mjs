import { createServer } from "node:http";
import { once } from "node:events";
import { existsSync, statSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import net from "node:net";
import path from "node:path";

const PREVIEW_HOST = "127.0.0.1";
const DIST_DIR = path.resolve(process.cwd(), "dist");

async function getAvailablePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, PREVIEW_HOST, () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : null;
      server.close(() => {
        if (!port) reject(new Error("Could not allocate static smoke port"));
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

function contentType(filePath) {
  if (filePath.endsWith(".html")) return "text/html; charset=utf-8";
  if (filePath.endsWith(".js")) return "text/javascript; charset=utf-8";
  if (filePath.endsWith(".css")) return "text/css; charset=utf-8";
  if (filePath.endsWith(".json")) return "application/json; charset=utf-8";
  if (filePath.endsWith(".svg")) return "image/svg+xml";
  if (filePath.endsWith(".png")) return "image/png";
  if (filePath.endsWith(".webp")) return "image/webp";
  if (filePath.endsWith(".avif")) return "image/avif";
  return "application/octet-stream";
}

async function startStaticServer() {
  const port = await getAvailablePort();
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url || "/", `http://${PREVIEW_HOST}:${port}`);
      const cleanPath = decodeURIComponent(url.pathname).replace(/^\/+/, "");
      const candidates = [];
      if (!cleanPath) candidates.push(path.join(DIST_DIR, "index.html"));
      else {
        candidates.push(path.join(DIST_DIR, cleanPath));
        candidates.push(path.join(DIST_DIR, cleanPath, "index.html"));
        candidates.push(path.join(DIST_DIR, "index.html"));
      }
      const filePath = candidates.find((candidate) => {
        const relative = path.relative(DIST_DIR, candidate);
        return relative
          && !relative.startsWith("..")
          && !path.isAbsolute(relative)
          && existsSync(candidate)
          && statSync(candidate).isFile();
      });
      if (!filePath) {
        res.writeHead(404);
        res.end("Not found");
        return;
      }
      const body = await readFile(filePath);
      res.writeHead(200, { "Content-Type": contentType(filePath) });
      res.end(body);
    } catch (error) {
      if (!res.headersSent) res.writeHead(500);
      res.end(error instanceof Error ? error.message : String(error));
    }
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, PREVIEW_HOST, resolve);
  });
  return { server, previewUrl: `http://${PREVIEW_HOST}:${port}` };
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

let server;

try {
  const started = await startStaticServer();
  server = started.server;
  const previewUrl = started.previewUrl;
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
  process.exitCode = 1;
} finally {
  if (server) {
    server.close();
    try { await once(server, "close"); } catch {}
  }
}
