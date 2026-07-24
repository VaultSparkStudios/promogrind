#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const urlIndex = args.indexOf("--url");
const configuredUrl = urlIndex >= 0 ? args[urlIndex + 1] : JSON.parse(fs.readFileSync(path.join(root, "context", "PROJECT_STATUS.json"), "utf8")).liveUrl;
if (!configuredUrl) {
  console.error("usage: node scripts/check-live-web-contract.mjs --url https://example.com");
  process.exit(2);
}
const origin = new URL(configuredUrl).origin;
const requiredHeaders = [
  ["content-security-policy", "CSP"],
  ["strict-transport-security", "HSTS"],
  ["x-content-type-options", "X-Content-Type-Options"],
  ["referrer-policy", "Referrer-Policy"],
  ["x-frame-options", "X-Frame-Options"],
  ["permissions-policy", "Permissions-Policy"],
];
const requiredFiles = ["/.well-known/security.txt", "/favicon.ico", "/robots.txt", "/sitemap.xml", "/agents.json", "/.well-known/llms.txt"];
const rootResponse = await fetch(origin, { redirect: "follow" });
const headers = requiredHeaders.map(([name, label]) => ({ name: label, present: Boolean(rootResponse.headers.get(name)) }));
const files = [];
for (const pathname of requiredFiles) {
  try {
    const response = await fetch(new URL(pathname, origin), { redirect: "follow" });
    files.push({ path: pathname, ok: response.ok, status: response.status });
  } catch (error) {
    files.push({ path: pathname, ok: false, status: null, error: error.message });
  }
}
const missingHeaders = headers.filter((item) => !item.present).map((item) => item.name);
const missingFiles = files.filter((item) => !item.ok).map((item) => item.path);
const result = {
  ok: rootResponse.ok && missingHeaders.length === 0 && missingFiles.length === 0,
  origin,
  rootStatus: rootResponse.status,
  headers,
  files,
  externalBlockers: [
    ...(missingHeaders.length ? [{ type: "edge-header-delivery", missing: missingHeaders, owner: "hosting-edge" }] : []),
    ...(missingFiles.length ? [{ type: "deployed-standard-files", missing: missingFiles, owner: "site-deploy" }] : []),
  ],
};
console.log(JSON.stringify(result, null, 2));
process.exit(result.ok ? 0 : 1);
