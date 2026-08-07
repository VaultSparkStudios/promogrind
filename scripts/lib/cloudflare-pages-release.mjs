import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const CLOUDFLARE_RELEASE_TARGETS = Object.freeze({
  staging: Object.freeze({ project: "promogrind-staging", branch: "main", domain: "staging.promogrind.bet" }),
  production: Object.freeze({ project: "promogrind", branch: "main", domain: "promogrind.bet" }),
});

export const REQUIRED_RELEASE_HEADERS = Object.freeze([
  "content-security-policy",
  "strict-transport-security",
  "x-content-type-options",
  "referrer-policy",
  "x-frame-options",
  "permissions-policy",
]);

export function resolveReleaseTarget(environment) {
  const target = CLOUDFLARE_RELEASE_TARGETS[environment];
  if (!target) throw new Error(`Unknown release environment ${environment || "<missing>"}`);
  return target;
}

export function hashArtifactDirectory(root) {
  const hash = crypto.createHash("sha256");
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const full = path.join(dir, entry.name);
      const relative = path.relative(root, full).replaceAll("\\", "/");
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile()) {
        hash.update(relative);
        hash.update("\0");
        hash.update(fs.readFileSync(full));
        hash.update("\0");
      }
    }
  };
  walk(root);
  return hash.digest("hex");
}

export function prepareCloudflareArtifact(root) {
  const required = ["index.html", "_redirects", "_health"];
  const missing = required.filter((name) => !fs.existsSync(path.join(root, name)));
  if (missing.length) throw new Error(`Cloudflare artifact missing ${missing.join(", ")}`);
  const githubFallback = path.join(root, "404.html");
  if (fs.existsSync(githubFallback)) fs.unlinkSync(githubFallback);
  return { removedGithubFallback: !fs.existsSync(githubFallback), required };
}

export function evaluateReleaseResponse(response) {
  const headers = new Set([...response.headers.keys()].map((name) => name.toLowerCase()));
  const missingHeaders = REQUIRED_RELEASE_HEADERS.filter((name) => !headers.has(name));
  return { ok: response.ok && missingHeaders.length === 0, status: response.status, missingHeaders };
}

const WEB_DNS_RECORD_TYPES = new Set(["A", "AAAA", "CNAME"]);

export function partitionWebDnsRecords(records = []) {
  const web = [];
  const preserved = [];
  for (const record of records) {
    (WEB_DNS_RECORD_TYPES.has(record?.type) ? web : preserved).push(record);
  }
  return { web, preserved };
}
