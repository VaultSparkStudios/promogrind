import { spawn } from "node:child_process";
import { once } from "node:events";
import { fileURLToPath } from "node:url";

const PREVIEW_PORT = 4173;
const PREVIEW_URL = `http://127.0.0.1:${PREVIEW_PORT}`;
const PREVIEW_BIN = fileURLToPath(new URL("../node_modules/vite/bin/vite.js", import.meta.url));

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

async function assertPath(pathname, checks) {
  const res = await fetch(`${PREVIEW_URL}${pathname}`);
  if (!res.ok) throw new Error(`${pathname} returned ${res.status}`);
  const text = await res.text();
  for (const [needle, label] of checks) {
    if (!text.includes(needle)) {
      throw new Error(`${pathname} missing ${label}`);
    }
  }
}

const preview = spawn(
  process.execPath,
  [PREVIEW_BIN, "preview", "--host", "127.0.0.1", "--port", String(PREVIEW_PORT), "--strictPort"],
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
  await waitForServer(`${PREVIEW_URL}/`);
  await assertPath("/", [["id=\"root\"", "app root"]]);
  await assertPath("/landing/", [["free Vault membership", "landing access copy"], ["beta rollout", "landing beta rollout copy"]]);
  await assertPath("/bonus-bet/", [["Free Vault membership", "trust strip"], ["1-800-GAMBLER", "responsible gambling notice"]]);
  await assertPath("/arb-calculator/", [["Free Vault membership", "trust strip"]]);
  await assertPath("/promogrind-vs-profitduel/", [["beta-gated", "comparison beta language"], ["Start with free Vault membership", "updated CTA"]]);
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
