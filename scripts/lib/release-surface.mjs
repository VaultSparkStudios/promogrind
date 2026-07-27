import fs from "node:fs";
import path from "node:path";

export function linkKey(link) {
  const raw = typeof link === "string" ? link : (link?.href ?? link?.path ?? link?.url ?? link?.to ?? "");
  let value = String(raw).trim();
  if (!value) return "";
  value = value.replace(/^[a-z][a-z0-9+.-]*:\/\/[^/]+/i, "");
  value = value.replace(/[?#].*$/, "");
  if (value.length > 1) value = value.replace(/\/+$/, "");
  return (value || "/").toLowerCase();
}

export function sourceKey(link) {
  const raw = typeof link === "string" ? link : (link?.href ?? link?.path ?? link?.url ?? link?.to ?? "");
  let value = String(raw).trim();
  if (!value) return "";
  value = value.replace(/^[a-z][a-z0-9+.-]*:\/\/[^/]+/i, "");
  return (value || "/").toLowerCase();
}

function uniqueKeys(links, keyFn) {
  return [...new Set((links || []).map(keyFn).filter(Boolean))];
}

function extractHrefs(content) {
  return [...content.matchAll(/href\s*=\s*["']([^"']+)["']/gi)].map((match) => match[1]);
}

function read(root, relative) {
  try { return fs.readFileSync(path.join(root, relative), "utf8"); } catch { return ""; }
}

export function checkReleaseSurface(root, manifest) {
  const findings = [];
  const header = uniqueKeys(manifest.headerLinks, linkKey);
  const footer = uniqueKeys(manifest.footerLinks, linkKey);
  const footerOnly = uniqueKeys([...(manifest.footerOnly || []), ...(manifest.legalPages || [])], linkKey);
  const requiredFooter = [...new Set([...header, ...footerOnly])];
  const missingFooter = requiredFooter.filter((item) => !footer.includes(item));
  if (missingFooter.length) findings.push({ id: "footer-completeness", missing: missingFooter });

  const headerSourceText = (manifest.headerSources || []).map((file) => read(root, file)).join("\n");
  const footerSourceTexts = (manifest.footerSources || []).map((file) => ({ file, text: read(root, file) }));
  const actualHeader = new Set(uniqueKeys(extractHrefs(headerSourceText), sourceKey));
  const actualFooter = new Set(uniqueKeys(footerSourceTexts.flatMap(({ text }) => extractHrefs(text)), sourceKey));
  const declaredHeader = uniqueKeys(manifest.headerLinks, sourceKey);
  const declaredFooter = uniqueKeys(manifest.footerLinks, sourceKey);
  const absentHeader = declaredHeader.filter((item) => !actualHeader.has(item));
  const absentFooter = declaredFooter.filter((item) => !actualFooter.has(item));
  if (absentHeader.length) findings.push({ id: "manifest-header-source-drift", missing: absentHeader });
  if (absentFooter.length) findings.push({ id: "manifest-footer-source-drift", missing: absentFooter });

  for (const { file, text } of footerSourceTexts) {
    const missingTokens = (manifest.requiredFooterTokens || []).filter((token) => !text.includes(token));
    if (missingTokens.length) findings.push({ id: "footer-legal-copy", file, missing: missingTokens });
  }

  for (const file of manifest.standardFiles || []) {
    const absolute = path.join(root, file);
    if (!fs.existsSync(absolute) || fs.statSync(absolute).size === 0) findings.push({ id: "standard-file", file });
  }

  const rollback = read(root, manifest.rollbackDocument || "");
  const rollbackTokens = ["git revert", "never force-push", "verify:launch-local", "verify:web-live"];
  const missingRollback = rollbackTokens.filter((token) => !rollback.toLowerCase().includes(token.toLowerCase()));
  if (missingRollback.length) findings.push({ id: "rollback-contract", missing: missingRollback });

  const headerIntent = read(root, "public/_headers");
  if (!headerIntent.includes("Strict-Transport-Security") || !headerIntent.includes("Content-Security-Policy")) {
    findings.push({ id: "header-intent", detail: "public/_headers must declare CSP and HSTS even though live delivery is verified separately" });
  }

  return {
    ok: findings.length === 0,
    findings,
    counts: {
      header: header.length,
      footer: footer.length,
      requiredFooter: requiredFooter.length,
      standardFiles: (manifest.standardFiles || []).length,
    },
    liveHeaderDelivery: "external-check-required",
  };
}
