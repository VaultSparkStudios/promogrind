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

export const RELEASE_BINDING_FILE = "_release.json";

export function resolveReleaseTarget(environment) {
  const target = CLOUDFLARE_RELEASE_TARGETS[environment];
  if (!target) throw new Error(`Unknown release environment ${environment || "<missing>"}`);
  return target;
}

export function hashArtifactDirectory(root, { excludedPaths = [] } = {}) {
  const hash = crypto.createHash("sha256");
  const excluded = new Set(excludedPaths);
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const full = path.join(dir, entry.name);
      const relative = path.relative(root, full).replaceAll("\\", "/");
      if (excluded.has(relative)) continue;
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

export function prepareReleaseBinding(root, commit) {
  const index = fs.readFileSync(path.join(root, "index.html"));
  const binding = {
    schemaVersion: "1.0",
    commit,
    contentDigest: hashArtifactDirectory(root, { excludedPaths: [RELEASE_BINDING_FILE] }),
    indexSha256: crypto.createHash("sha256").update(index).digest("hex"),
  };
  fs.writeFileSync(path.join(root, RELEASE_BINDING_FILE), `${JSON.stringify(binding, null, 2)}\n`);
  return binding;
}

export function validateStagingReceipt(receipt, { artifactDigest, commit, releaseBinding }) {
  const staging = resolveReleaseTarget("staging");
  const checks = {
    environment: receipt?.environment === "staging",
    project: receipt?.project === staging.project,
    domain: receipt?.domain === staging.domain,
    artifactDigest: receipt?.artifactDigest === artifactDigest,
    commit: receipt?.commit === commit,
    verifiedCustomDomain: receipt?.verification?.ok === true && receipt.verification.origin === `https://${staging.domain}`,
    verifiedRelease: receipt?.verification?.releaseVerified === true,
  };
  for (const key of ["schemaVersion", "commit", "contentDigest", "indexSha256"]) {
    checks[`releaseBinding.${key}`] = receipt?.releaseBinding?.[key] === releaseBinding[key];
  }
  for (const key of ["commit", "contentDigest", "indexSha256"]) {
    checks[`verification.${key}`] = receipt?.verification?.[key] === releaseBinding[key];
  }
  const failed = Object.entries(checks).filter(([, passed]) => !passed).map(([name]) => name);
  if (failed.length) throw new Error(`Production promotion requires a matching verified staging receipt: ${failed.join(", ")}`);
  return { commit, artifactDigest, domain: staging.domain };
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

export async function waitForReleaseOrigin(domain, fallbackOrigin, {
  fetchImpl = fetch,
  sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
  attempts = 18,
  intervalMs = 5_000,
  expectedRelease = null,
} = {}) {
  const origin = `https://${domain}`;
  let primary = { ok: false, origin, status: 0, missingHeaders: [] };
  let fallback = null;
  const probe = async (candidate) => {
    try {
      const response = await fetchImpl(candidate, { redirect: "follow", signal: AbortSignal.timeout(15_000) });
      let result = { origin: candidate, ...evaluateReleaseResponse(response) };
      // A redirected response from another host does not prove this origin serves the release.
      if (response.url && new URL(response.url).origin !== candidate) {
        return { ...result, ok: false, error: "Release origin redirected to another origin" };
      }
      if (result.ok && expectedRelease) {
        result = { ...result, ...await verifyReleaseBinding(candidate, expectedRelease, fetchImpl) };
      }
      return result;
    } catch (error) {
      return { ok: false, origin: candidate, status: 0, missingHeaders: [], error: error.message };
    }
  };
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    primary = await probe(origin);
    if (primary.ok) return primary;
    fallback = await probe(fallbackOrigin);
    if (attempt + 1 < attempts) await sleep(intervalMs);
  }
  // pages.dev is diagnostic only: a healthy fallback must never promote an unhealthy custom domain.
  return { ...primary, ok: false, fallback };
}

async function verifyReleaseBinding(origin, expected, fetchImpl) {
  const request = async (pathname) => {
    const response = await fetchImpl(`${origin}/${pathname}?release=${encodeURIComponent(expected.contentDigest)}`, {
      redirect: "error",
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) throw new Error(`Release binding ${pathname} returned HTTP ${response.status}`);
    if (response.url && new URL(response.url).origin !== origin) throw new Error("Release binding redirected to another origin");
    return response;
  };
  try {
    const marker = await request(RELEASE_BINDING_FILE);
    const observed = await marker.json();
    for (const key of ["schemaVersion", "commit", "contentDigest", "indexSha256"]) {
      if (observed?.[key] !== expected[key]) throw new Error(`Release binding ${key} does not match the uploaded artifact`);
    }
    // Pages canonicalizes /index.html to /; verify the served HTML at its canonical path.
    const index = await request("");
    const indexSha256 = crypto.createHash("sha256").update(Buffer.from(await index.arrayBuffer())).digest("hex");
    if (indexSha256 !== expected.indexSha256) throw new Error("Deployed index does not match the uploaded artifact");
    return { ok: true, releaseVerified: true, commit: observed.commit, contentDigest: observed.contentDigest, indexSha256 };
  } catch (error) {
    return { ok: false, releaseVerified: false, error: error.message };
  }
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
