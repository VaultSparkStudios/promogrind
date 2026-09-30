#!/usr/bin/env node
/**
 * Target-bound Cloudflare Pages deployer for PromoGrind.
 * One commit-bound Direct Upload artifact passes stable staging before production.
 * Rollbacks use a forward revert through the same staging verification.
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "./lib/safe-spawn.mjs";
import { envForSpawn, redact } from "./lib/secrets.mjs";
import {
  hashArtifactDirectory,
  prepareReleaseBinding,
  validateStagingReceipt,
  resolveReleaseTarget,
  waitForReleaseOrigin,
  partitionWebDnsRecords,
} from "./lib/cloudflare-pages-release.mjs";

const args = process.argv.slice(2);
const value = (flag) => { const index = args.indexOf(flag); return index >= 0 ? args[index + 1] : null; };
const environment = value("--environment") || "staging";
const target = resolveReleaseTarget(environment);
const apply = args.includes("--apply");
const probe = args.includes("--probe");
const dist = path.resolve(value("--dist") || "dist");
const allowDnsCutover = args.includes("--allow-dns-cutover");
const stagingReceiptPath = value("--staging-receipt");
if (args.includes("--help")) {
  console.log("Usage: node scripts/deploy-cloudflare-pages.mjs --environment staging|production [--probe|--apply] [--dist dist] [--commit <sha>] [--staging-receipt <path>]\nProduction --apply requires a verified staging receipt for the same commit and artifact.");
  process.exit(0);
}
if (!probe && !apply) {
  console.error("deploy-cloudflare-pages: choose --probe or --apply");
  process.exit(2);
}

const authority = envForSpawn("cloudflare.deploy", ["CLOUDFLARE_DNS_TOKEN", "CLOUDFLARE_ZONE_ID"]);
const accountId = authority.CLOUDFLARE_ACCOUNT_ID;
const tokens = [...new Set([authority.CLOUDFLARE_API_TOKEN, authority.CLOUDFLARE_STUDIO_TOKEN].filter(Boolean))];
if (!accountId || !tokens.length) throw new Error("cloudflare.deploy did not yield account and API authority");
const api = `https://api.cloudflare.com/client/v4/accounts/${accountId}/pages/projects`;
let activeToken = null;

let project = await cf(`/` + target.project, { allow404: true });
if (probe) {
  const domains = project ? await cf(`/${target.project}/domains`) : [];
  const dnsAuthority = await resolveDnsAuthority();
  const dnsRecords = await readDnsRecords(dnsAuthority);
  const customDomain = domains.find((entry) => entry.name === target.domain);
  const zoneMatchesCustomDomain = !customDomain?.zone_tag || customDomain.zone_tag === dnsAuthority.zoneId;
  console.log(redact(JSON.stringify({ environment, target, projectExists: Boolean(project), productionBranch: project?.production_branch || null, domains, dnsRecords, zoneMatchesCustomDomain }, null, 2)));
  process.exit(0);
}
if (args.includes("--dns-only")) {
  const dnsReceipt = await reconcileDns();
  const dnsRecords = await readDnsRecords();
  console.log(redact(JSON.stringify({ environment, target, dnsReceipt, dnsRecords }, null, 2)));
  process.exit(0);
}
if (!fs.existsSync(path.join(dist, "index.html"))) throw new Error(`Build artifact missing: ${path.join(dist, "index.html")}`);
const commit = value("--commit") || process.env.GITHUB_SHA || "working-tree";
const releaseBinding = prepareReleaseBinding(dist, commit);
const artifactDigest = hashArtifactDirectory(dist);
let stagingReceipt = null;
if (environment === "production") {
  if (!stagingReceiptPath) throw new Error("Production promotion requires --staging-receipt <path> from this artifact's verified staging deployment");
  const staged = JSON.parse(fs.readFileSync(path.resolve(stagingReceiptPath), "utf8"));
  stagingReceipt = {
    path: stagingReceiptPath.replaceAll("\\", "/"),
    ...validateStagingReceipt(staged, { artifactDigest, commit, releaseBinding }),
  };
  // Local receipts are action records, not signed attestations. Recheck the staging origin now.
  const stagingTarget = resolveReleaseTarget("staging");
  const stagingVerification = await waitForReleaseOrigin(stagingTarget.domain, `https://${stagingTarget.project}.pages.dev`, { expectedRelease: releaseBinding });
  if (!stagingVerification.ok) throw new Error(`Staging no longer serves the approved release: ${stagingVerification.error || "origin verification failed"}`);
}
if (!project) {
  project = await cf("", { method: "POST", body: { name: target.project, production_branch: target.branch } });
}
const wranglerArgs = [
  "pages", "deploy", dist,
  "--project-name", target.project,
  "--branch", target.branch,
  "--commit-hash", commit,
  "--commit-message", `PromoGrind ${environment} ${artifactDigest.slice(0, 12)}`,
  "--commit-dirty", "true",
];
const executable = process.platform === "win32" ? "cmd.exe" : "wrangler";
const executableArgs = process.platform === "win32" ? ["/d", "/s", "/c", "wrangler", ...wranglerArgs] : wranglerArgs;
const deploy = spawnSync(executable, executableArgs, {
  cwd: process.cwd(),
  env: { ...authority, CLOUDFLARE_API_TOKEN: activeToken, WRANGLER_SEND_METRICS: "false" },
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"],
});
if (deploy.status !== 0 || deploy.error) throw new Error(redact(`Wrangler deploy failed (${deploy.status ?? "spawn"}): ${deploy.error?.message || deploy.stderr || deploy.stdout}`));

let domains = await cf(`/${target.project}/domains`);
if (!domains.some((entry) => entry.name === target.domain)) {
  await cf(`/${target.project}/domains`, { method: "POST", body: { name: target.domain } });
}
const dnsReceipt = await reconcileDns();

const pagesOrigin = `https://${target.project}.pages.dev`;
const verification = await waitForReleaseOrigin(target.domain, pagesOrigin, { expectedRelease: releaseBinding });
const receipt = {
  schemaVersion: "1.0",
  environment,
  project: target.project,
  domain: target.domain,
  pagesOrigin,
  artifactDigest,
  releaseBinding,
  ...(stagingReceipt ? { stagingReceipt } : {}),
  commit,
  deployedAt: new Date().toISOString(),
  dnsReceipt,
  verification,
  rollbackStrategy: "forward-revert-through-staging",
};
const out = path.join("artifacts", "cloudflare-pages", `${environment}-${receipt.deployedAt.replace(/[:.]/g, "-")}.json`);
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, `${JSON.stringify(receipt, null, 2)}\n`);
console.log(redact(JSON.stringify({ ok: verification.ok, receipt: out.replaceAll("\\", "/"), ...receipt }, null, 2)));
if (!verification.ok) process.exit(1);

async function cf(suffix, options = {}) {
  let last;
  const candidates = activeToken ? [activeToken, ...tokens.filter((token) => token !== activeToken)] : tokens;
  for (const token of candidates) {
    const response = await fetch(`${api}${suffix}`, {
      method: options.method || "GET",
      headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: AbortSignal.timeout(20_000),
    });
    if (options.allow404 && response.status === 404) return null;
    const payload = await response.json().catch(() => ({}));
    if (response.ok && payload.success !== false) {
      activeToken = token;
      return payload.result;
    }
    last = new Error(`Cloudflare API ${options.method || "GET"} ${suffix || "/"} returned ${response.status}: ${(payload.errors || []).map((entry) => entry.message).join(" · ") || "request failed"}`);
    if (![401, 403].includes(response.status)) break;
  }
  throw last;
}

async function reconcileDns() {
  const { zoneId, token } = await resolveDnsAuthority();
  const dnsApi = `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records`;
  const request = async (suffix = "", options = {}) => {
    const response = await fetch(`${dnsApi}${suffix}`, {
      method: options.method || "GET",
      headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: AbortSignal.timeout(20_000),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.success === false) throw new Error(`Cloudflare DNS ${options.method || "GET"} returned ${response.status}: ${(payload.errors || []).map((entry) => entry.message).join(" · ") || "request failed"}`);
    return payload.result;
  };
  const current = await request(`?name=${encodeURIComponent(target.domain)}`);
  const { web: webCurrent, preserved } = partitionWebDnsRecords(current);
  const desiredContent = `${target.project}.pages.dev`;
  const safeCurrent = current.map((entry) => ({ id: entry.id, type: entry.type, name: entry.name, content: entry.content, proxied: entry.proxied, ttl: entry.ttl }));
  const safePreserved = preserved.map((entry) => ({ id: entry.id, type: entry.type, name: entry.name, content: entry.content, proxied: entry.proxied, ttl: entry.ttl }));
  const rollbackPath = path.join("artifacts", "cloudflare-pages", `${environment}-dns-before-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
  fs.mkdirSync(path.dirname(rollbackPath), { recursive: true });
  fs.writeFileSync(rollbackPath, `${JSON.stringify({ environment, domain: target.domain, records: safeCurrent }, null, 2)}\n`);
  if (webCurrent.length === 1 && webCurrent[0].type === "CNAME" && webCurrent[0].content === desiredContent && webCurrent[0].proxied === true) {
    return { changed: false, desiredContent, preserved: safePreserved, rollbackPath: rollbackPath.replaceAll("\\", "/") };
  }
  if (environment === "production" && !allowDnsCutover) {
    throw new Error(`Production DNS differs from ${desiredContent}; rerun with --allow-dns-cutover after staging verification`);
  }
  for (const entry of webCurrent) await request(`/${entry.id}`, { method: "DELETE" });
  await request("", { method: "POST", body: { type: "CNAME", name: target.domain, content: desiredContent, ttl: 1, proxied: true } });
  return { changed: true, desiredContent, replaced: webCurrent.map((entry) => safeCurrent.find((safe) => safe.id === entry.id)), preserved: safePreserved, rollbackPath: rollbackPath.replaceAll("\\", "/") };
}

async function readDnsRecords(resolvedAuthority = null) {
  const { zoneId, token } = resolvedAuthority || await resolveDnsAuthority();
  const response = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records?name=${encodeURIComponent(target.domain)}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(20_000),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.success === false) throw new Error(`Cloudflare DNS GET returned ${response.status}`);
  return (payload.result || []).map((entry) => ({ id: entry.id, type: entry.type, name: entry.name, content: entry.content, proxied: entry.proxied, ttl: entry.ttl }));
}

async function resolveDnsAuthority() {
  const pageDomains = project ? await cf(`/${target.project}/domains`) : [];
  const matchingZone = pageDomains.find((entry) => entry.name === target.domain)?.zone_tag;
  const tokenCandidates = [...new Set([authority.CLOUDFLARE_DNS_TOKEN, activeToken, ...tokens].filter(Boolean))];
  const zoneName = target.domain.split(".").slice(-2).join(".");
  const discoveredActiveZoneIds = [];
  for (const token of tokenCandidates) {
    const response = await fetch(`https://api.cloudflare.com/client/v4/zones?name=${encodeURIComponent(zoneName)}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(20_000),
    });
    const payload = await response.json().catch(() => ({}));
    if (response.ok && payload.success !== false) {
      for (const zone of payload.result || []) {
        if (zone.name === zoneName && zone.status === "active") discoveredActiveZoneIds.push(zone.id);
      }
    }
  }
  const zoneIds = [...new Set([...discoveredActiveZoneIds, authority.CLOUDFLARE_ZONE_ID, matchingZone].filter(Boolean))];
  for (const zoneId of zoneIds) {
    for (const token of tokenCandidates) {
      const response = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records?name=${encodeURIComponent(target.domain)}`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(20_000),
      });
      const payload = await response.json().catch(() => ({}));
      if (response.ok && payload.success !== false) return { zoneId, token };
    }
  }
  throw new Error(`No Cloudflare token can read DNS for ${target.domain} in the target-bound zone`);
}
