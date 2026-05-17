#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DEFAULT_DIST = path.join(ROOT, "dist");
const MAX_TEXT_BYTES = 1024 * 1024;
const TEXT_EXTENSIONS = new Set([".html", ".js", ".css", ".json", ".txt", ".xml", ".svg", ".webmanifest"]);

const RULES = [
  {
    id: "service_role_like",
    severity: "critical",
    description: "Service-role-like token marker",
    regex: /\bservice[_-]?role\b|\bSUPABASE_SERVICE_ROLE_KEY\b/gi,
  },
  {
    id: "jwt_like",
    severity: "critical",
    description: "JWT-like browser bundle token",
    regex: /\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\b/g,
  },
  {
    id: "env_filename",
    severity: "critical",
    description: "Env filename exposed in built output",
    regex: /(?:^|[^A-Za-z0-9_])\.env(?:\.admin|\.local|\.production)?(?:[^A-Za-z0-9_]|$)/g,
  },
  {
    id: "local_windows_path",
    severity: "critical",
    description: "Absolute Windows user path",
    regex: /[A-Z]:\\Users\\[^\\\r\n]+\\/g,
  },
  {
    id: "private_ops_marker",
    severity: "warning",
    description: "Private Studio Ops marker",
    regex: /\bvaultspark-studio-ops\b|\bprivate Studio OS\b|\bCAPABILITY_MAP\.json\b/gi,
  },
  {
    id: "admin_proof_field",
    severity: "warning",
    description: "Admin-only launch proof field",
    regex: /\b(?:adminOnly|operatorSecret|serviceRole|privateEvidence|rawEvidence)\b/g,
  },
];

function relToPosix(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, "/");
}

function isTextAsset(filePath, stat) {
  return stat.size <= MAX_TEXT_BYTES && TEXT_EXTENSIONS.has(path.extname(filePath).toLowerCase());
}

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

export function scanDistDirectory(distDir = DEFAULT_DIST) {
  const findings = [];
  if (!fs.existsSync(distDir)) {
    return {
      ok: false,
      distDir,
      summary: { critical: 1, warning: 0, total: 1 },
      findings: [{
        severity: "critical",
        rule: "dist_missing",
        file: relToPosix(distDir),
        detail: "dist directory does not exist; run npm run build first.",
      }],
    };
  }

  for (const file of walk(distDir)) {
    const stat = fs.statSync(file);
    if (!isTextAsset(file, stat)) continue;
    const content = fs.readFileSync(file, "utf8");
    for (const rule of RULES) {
      const matches = [...content.matchAll(rule.regex)].slice(0, 3);
      for (const match of matches) {
        findings.push({
          severity: rule.severity,
          rule: rule.id,
          file: relToPosix(file),
          detail: `${rule.description}: ${String(match[0]).slice(0, 90)}`,
        });
      }
    }
  }

  const summary = {
    critical: findings.filter((finding) => finding.severity === "critical").length,
    warning: findings.filter((finding) => finding.severity === "warning").length,
    total: findings.length,
  };
  return { ok: summary.critical === 0, distDir, summary, findings };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  const args = process.argv.slice(2);
  const json = args.includes("--json");
  const dirArgIndex = args.indexOf("--dir");
  const distDir = dirArgIndex >= 0 && args[dirArgIndex + 1]
    ? path.resolve(args[dirArgIndex + 1])
    : DEFAULT_DIST;
  const result = scanDistDirectory(distDir);

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`Public dist exposure gate: ${result.ok ? "PASS" : "FAIL"} (${result.summary.critical} critical, ${result.summary.warning} warning)`);
    for (const finding of result.findings.slice(0, 12)) {
      console.log(`- [${finding.severity}] ${finding.file} :: ${finding.detail}`);
    }
    if (result.findings.length > 12) {
      console.log(`- ... ${result.findings.length - 12} more finding(s)`);
    }
  }

  process.exit(result.ok ? 0 : 1);
}
