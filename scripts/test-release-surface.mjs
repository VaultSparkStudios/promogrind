#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { checkReleaseSurface, linkKey, sourceKey } from "./lib/release-surface.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "public", "navigation-manifest.json"), "utf8"));
assert.equal(linkKey("https://promogrind.bet/privacy/?x=1#top"), "/privacy");
assert.equal(sourceKey("https://promogrind.bet/#/upgrade"), "/#/upgrade");
const result = checkReleaseSurface(root, manifest);
assert.deepEqual(result.findings, []);
assert.equal(result.ok, true);
const broken = structuredClone(manifest);
broken.footerLinks = broken.footerLinks.filter((link) => sourceKey(link) !== "/contact/");
const brokenResult = checkReleaseSurface(root, broken);
assert.equal(brokenResult.ok, false);
assert.ok(brokenResult.findings.some((finding) => finding.id === "footer-completeness"));
console.log("release surface regression passed · manifest source-backed · rollback and standard files present");
