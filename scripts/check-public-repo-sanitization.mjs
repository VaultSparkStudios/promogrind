#!/usr/bin/env node
// check-public-repo-sanitization.mjs
// Scans public-audience projects for common sanitization violations:
// committed env files, private-doc filenames, secret-like credential patterns,
// and absolute local paths that should never appear in public repos.
//
// Usage:
//   node scripts/check-public-repo-sanitization.mjs
//   node scripts/check-public-repo-sanitization.mjs --project <slug>
//   node scripts/check-public-repo-sanitization.mjs --json
//   node scripts/check-public-repo-sanitization.mjs --summary
//   node scripts/check-public-repo-sanitization.mjs --write-report [dir]
//   node scripts/check-public-repo-sanitization.mjs --strict

import fs from 'fs';
import path from 'path';
import { execFileSync } from './lib/safe-spawn.mjs';
import { fileURLToPath } from 'url';
import { loadProjectRegistry } from './lib/project-registry.mjs';
import { classifyCredentialText } from './lib/credential-classifiers.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const allowlistPath = path.join(root, 'audits', 'sanitization', 'allowlist.json');

const registry = loadProjectRegistry();
const allowlist = fs.existsSync(allowlistPath)
  ? JSON.parse(fs.readFileSync(allowlistPath, 'utf8'))
  : { ignoredPathPrefixes: [], findings: [] };
const today = new Date().toISOString().slice(0, 10);
const includeWorktrees = process.argv.includes('--include-worktrees');

const PUBLIC_AUDIENCES = new Set(['public-live', 'public-unlaunched', 'public-traction']);
const TEXT_EXTENSIONS = new Set([
  '.md', '.txt', '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.json',
  '.html', '.css', '.yml', '.yaml', '.sh', '.bash', '.ps1', '.py', '.xml', '.svg',
]);
const MAX_TEXT_BYTES = 512 * 1024;

const FORBIDDEN_PATH_RULES = [
  {
    id: 'env_file',
    severity: 'critical',
    priorityBand: 'confirmed-risk',
    description: 'Committed .env-style file',
    remediation: 'Untrack the file, move any real values to a private/local-only layer, and rotate if it ever held secrets.',
    matches: rel => {
      const base = path.posix.basename(rel).toLowerCase();
      if (!base.startsWith('.env')) return false;
      return !(
        base === '.env.example' ||
        base === '.env.sample' ||
        base === '.env.template' ||
        base.endsWith('.example') ||
        base.endsWith('.sample') ||
        base.endsWith('.template')
      );
    },
  },
  {
    id: 'private_doc',
    severity: 'critical',
    priorityBand: 'confirmed-risk',
    description: 'Private Studio OS document committed to public repo',
    remediation: 'Remove the file from the public repo, preserve the local/private copy, and keep the public-safe Studio OS navigation map intact.',
    matches: rel => {
      const normalized = rel.toLowerCase();
      const base = path.posix.basename(normalized);
      return (
        base === 'innovation_pipeline.md' ||
        base === 'canon.md' ||
        base === 'franchise_bible.md' ||
        base === 'entity_bible.md' ||
        base === 'approval_matrix.md'
      );
    },
  },
];

const CONTENT_RULES = [
  {
    id: 'windows_local_path',
    severity: 'critical',
    priorityBand: 'confirmed-risk',
    description: 'Absolute Windows user path',
    remediation: 'Replace the machine-specific path with a public-safe placeholder or a relative path.',
    regex: /[A-Z]:\\Users\\[^\\\r\n]+\\/g,
  },
  {
    id: 'unix_local_path',
    severity: 'warning',
    priorityBand: 'hygiene',
    description: 'Absolute Unix user path',
    remediation: 'Replace the path with a relative or placeholder example so the repo stays portable.',
    regex: /\/(?:Users|home)\/[^/\r\n]+\/(?:documents|development|projects?)\//gi,
  },
  {
    id: 'stripe_secret',
    severity: 'critical',
    priorityBand: 'confirmed-risk',
    description: 'Stripe secret key pattern',
    remediation: 'Treat as compromised until proven otherwise: rotate the key and remove it from git history.',
    redactMatch: true,
    regex: /\bsk_(?:live|test)_[A-Za-z0-9]{16,}\b/g,
  },
  {
    id: 'stripe_webhook_secret',
    severity: 'critical',
    priorityBand: 'confirmed-risk',
    description: 'Stripe webhook secret pattern',
    remediation: 'Rotate the webhook secret and remove it from tracked files/history.',
    redactMatch: true,
    regex: /\bwhsec_[A-Za-z0-9]{16,}\b/g,
  },
  {
    id: 'github_token',
    severity: 'critical',
    priorityBand: 'confirmed-risk',
    description: 'GitHub personal access token pattern',
    remediation: 'Revoke the token and purge any tracked copy immediately.',
    redactMatch: true,
    regex: /\b(?:ghp|github_pat)_[A-Za-z0-9_]{20,}\b/g,
  },
  {
    id: 'render_key',
    severity: 'critical',
    priorityBand: 'review-required',
    description: 'Render API key pattern',
    remediation: 'Verify whether the match is a real credential or a synthetic fixture, then rotate/remove if real.',
    redactMatch: true,
    regex: /\brnd_[A-Za-z0-9]{16,}\b/g,
  },
  {
    id: 'aws_access_key',
    severity: 'critical',
    priorityBand: 'confirmed-risk',
    description: 'AWS access key pattern',
    remediation: 'Rotate the access key and purge it from the repo and history.',
    redactMatch: true,
    regex: /\bAKIA[0-9A-Z]{16}\b/g,
  },
  {
    id: 'private_key',
    severity: 'critical',
    priorityBand: 'confirmed-risk',
    description: 'Private key block',
    remediation: 'Treat the key as compromised, rotate it, and remove it from the repo and history.',
    redactMatch: true,
    regex: /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/g,
  },
];

function readArgValue(flag) {
  const args = process.argv.slice(2);
  const index = args.indexOf(flag);
  if (index === -1 || index === args.length - 1) return null;
  const value = args[index + 1];
  return value.startsWith('--') ? null : value;
}

function readOptionalArgValue(flag) {
  return readArgValue(flag);
}

function isTextFile(filePath, stat) {
  if (!stat || stat.size > MAX_TEXT_BYTES) return false;
  const ext = path.extname(filePath).toLowerCase();
  return TEXT_EXTENSIONS.has(ext) ||
    /(^|\/)(README|AGENTS|CLAUDE)(\.[^.\/]+)?$/i.test(filePath) ||
    filePath.startsWith('context/') ||
    filePath.startsWith('docs/') ||
    filePath.startsWith('prompts/');
}

function relToPosix(p) {
  return p.replace(/\\/g, '/');
}

function addFinding(findings, finding) {
  const normalized = {
    priorityBand: 'hygiene',
    remediation: 'Review and sanitize this finding.',
    ...finding,
  };
  if (isAllowlistedFinding(normalized)) return;
  findings.push(normalized);
}

function isIgnoredPath(relPath) {
  if (includeWorktrees) return false;
  const normalized = relToPosix(relPath);
  return (allowlist.ignoredPathPrefixes || []).some(prefix => normalized.startsWith(prefix));
}

function isAllowlistedFinding(finding) {
  return (allowlist.findings || []).some(entry => {
    if (entry.slug && entry.slug !== activeProjectSlug) return false;
    if (entry.file && entry.file !== finding.file) return false;
    if (entry.rule && entry.rule !== finding.rule) return false;
    if (entry.type && entry.type !== finding.type) return false;
    if (entry.detailContains && !String(finding.detail || '').includes(entry.detailContains)) return false;
    return true;
  });
}

function dedupeFindings(findings) {
  const seen = new Set();
  return findings.filter(finding => {
    const key = [
      finding.severity,
      finding.priorityBand,
      finding.type,
      finding.rule,
      finding.file,
      finding.detail,
    ].join('|');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function scanFileContent(content, relPath, findings) {
  for (const match of classifyCredentialText(content).slice(0, 3)) {
    addFinding(findings, {
      severity: 'critical',
      type: 'content',
      rule: match.type,
      file: relPath,
      detail: match.label + ' at line ' + match.line + ' (value redacted)',
      priorityBand: 'confirmed-risk',
      remediation: 'Treat the credential as compromised, remove it from the public tree/history, and rotate it through the secrets gateway.',
    });
  }
  for (const rule of CONTENT_RULES) {
    const matches = [...content.matchAll(rule.regex)].slice(0, 3);
    for (const match of matches) {
      addFinding(findings, {
        severity: rule.severity,
        type: 'content',
        rule: rule.id,
        file: relPath,
        detail: `${rule.description}: ${rule.redactMatch ? '(value redacted)' : match[0].slice(0, 80)}`,
        priorityBand: rule.priorityBand,
        remediation: rule.remediation,
      });
    }
  }
}

function getTrackedFiles(localPath) {
  const safeDir = relToPosix(path.resolve(localPath));
  const commands = [
    ['-C', localPath, 'ls-files'],
    ['-c', `safe.directory=${safeDir}`, '-C', localPath, 'ls-files'],
  ];

  for (const args of commands) {
    try {
      const output = execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
      return output.split(/\r?\n/).map(s => s.trim()).filter(Boolean).map(relToPosix);
    } catch {}
  }

  if (fs.existsSync(path.join(localPath, '.git'))) {
    return [];
  }

  {
    const ignoredDirs = new Set([
      '.git', '.claude', 'node_modules', '.next', 'dist', 'dist-cap', 'build', 'coverage',
      '.cache', '.ops-cache', '.turbo', '.vercel', 'vendor', 'tmp', 'temp', 'secrets',
    ]);
    const ignoredFiles = new Set(['.env', '.env.local', '.env.admin', '.beta-codes']);
    const files = [];

    function walk(dir) {
      let entries = [];
      try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
      } catch {
        return;
      }

      for (const entry of entries) {
        const abs = path.join(dir, entry.name);
        const rel = relToPosix(path.relative(localPath, abs));
        if (!rel) continue;
        if (entry.isDirectory()) {
          if (!ignoredDirs.has(entry.name)) {
            walk(abs);
          }
          continue;
        }
        if (ignoredFiles.has(entry.name)) continue;
        files.push(rel);
      }
    }

    walk(localPath);
    return files;
  }
}

function getRepoState(localPath) {
  const lockPath = path.join(localPath, 'context', '.session-lock');
  const state = {
    // Public receipts describe the repo-relative lock boundary; they never
    // serialize the machine-specific checkout path used to perform the scan.
    lockPath: fs.existsSync(lockPath) ? 'context/.session-lock' : null,
    ahead: 0,
    behind: 0,
  };

  try {
    state.ahead = Number(execFileSync('git', ['-C', localPath, 'rev-list', '--count', '@{u}..HEAD'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()) || 0;
  } catch {}
  try {
    state.behind = Number(execFileSync('git', ['-C', localPath, 'rev-list', '--count', 'HEAD..@{u}'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()) || 0;
  } catch {}

  state.status = state.lockPath
    ? 'locked'
    : (state.ahead > 0 || state.behind > 0)
      ? 'diverged'
      : 'clear';
  return state;
}

function scanLocalProject(project) {
  activeProjectSlug = project.slug;
  const findings = [];
  const localPath = project.localPath;
  const trackedFiles = getTrackedFiles(localPath).filter(relPath => !isIgnoredPath(relPath));

  if (!trackedFiles.length) {
    return {
      mode: 'local',
      findings: [],
      repoState: getRepoState(localPath),
    };
  }

  for (const relPath of trackedFiles) {
    for (const rule of FORBIDDEN_PATH_RULES) {
      if (rule.matches(relPath)) {
        addFinding(findings, {
          severity: rule.severity,
          type: 'path',
          rule: rule.id,
          file: relPath,
          detail: rule.description,
          priorityBand: rule.priorityBand,
          remediation: rule.remediation,
        });
      }
    }

    const absPath = path.join(localPath, relPath);
    let stat;
    try {
      stat = fs.statSync(absPath);
    } catch {
      continue;
    }
    if (!isTextFile(relPath, stat)) continue;

    try {
      const content = fs.readFileSync(absPath, 'utf8');
      scanFileContent(content, relPath, findings);
    } catch {
      addFinding(findings, {
        severity: 'warning',
        type: 'meta',
        rule: 'read_failed',
        file: relPath,
        detail: 'Could not read text file during sanitization scan',
        priorityBand: 'review-required',
        remediation: 'Open the file manually and confirm whether it needs sanitization or should be ignored.',
      });
    }
  }

  return {
    mode: 'local',
    findings: dedupeFindings(findings),
    repoState: getRepoState(localPath),
  };
}

function ghApi(apiArgs) {
  return execFileSync('gh', ['api', ...apiArgs], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function searchRepo(orgRepo, query) {
  try {
    const encoded = `q=${encodeURIComponent(`${query} repo:${orgRepo}`)}`;
    const raw = ghApi(['/search/code', '-f', encoded]);
    return JSON.parse(raw);
  } catch {
    return { items: [] };
  }
}

function scanRemoteProject(project) {
  activeProjectSlug = project.slug;
  const findings = [];
  const orgRepo = project.repo;

  let treePaths = [];
  try {
    const rawTree = ghApi([`repos/${orgRepo}/git/trees/HEAD?recursive=1`]);
    const tree = JSON.parse(rawTree);
    treePaths = (tree.tree || [])
      .filter(entry => entry.type === 'blob')
      .map(entry => entry.path)
      .filter(relPath => !isIgnoredPath(relPath));
  } catch {
    return {
      mode: 'remote',
      findings: [{
        severity: 'warning',
        type: 'meta',
        rule: 'scan_unavailable',
        file: null,
        detail: 'Could not read remote git tree via GitHub API',
        priorityBand: 'review-required',
        remediation: 'Run the scan locally in a checked-out repo or restore GitHub API access.',
      }],
      repoState: { status: 'remote', lockPath: null, ahead: 0, behind: 0 },
    };
  }

  for (const relPath of treePaths) {
    for (const rule of FORBIDDEN_PATH_RULES) {
      if (rule.matches(relPath)) {
        addFinding(findings, {
          severity: rule.severity,
          type: 'path',
          rule: rule.id,
          file: relPath,
          detail: rule.description,
          priorityBand: rule.priorityBand,
          remediation: rule.remediation,
        });
      }
    }
  }

  const searchRules = [
    { id: 'windows_local_path', severity: 'critical', priorityBand: 'confirmed-risk', description: 'Absolute Windows user path', remediation: 'Replace with a public-safe placeholder or relative path.', query: '"C:\\\\Users\\\\"' },
    { id: 'stripe_secret', severity: 'critical', priorityBand: 'confirmed-risk', description: 'Stripe secret key pattern', remediation: 'Rotate and purge the secret immediately.', query: '"sk_live_" OR "sk_test_"' },
    { id: 'stripe_webhook_secret', severity: 'critical', priorityBand: 'confirmed-risk', description: 'Stripe webhook secret pattern', remediation: 'Rotate and purge the webhook secret immediately.', query: '"whsec_"' },
    { id: 'github_token', severity: 'critical', priorityBand: 'confirmed-risk', description: 'GitHub personal access token pattern', remediation: 'Revoke the token and purge the file immediately.', query: '"ghp_" OR "github_pat_"' },
    { id: 'render_key', severity: 'critical', priorityBand: 'review-required', description: 'Render API key pattern', remediation: 'Verify whether the match is real or synthetic, then rotate/remove if real.', query: '"rnd_"' },
    { id: 'private_key', severity: 'critical', priorityBand: 'confirmed-risk', description: 'Private key block', remediation: 'Rotate and purge the key immediately.', query: '"BEGIN PRIVATE KEY"' },
  ];

  for (const rule of searchRules) {
    const result = searchRepo(orgRepo, rule.query);
    for (const item of (result.items || []).slice(0, 5)) {
      addFinding(findings, {
        severity: rule.severity,
        type: 'content',
        rule: rule.id,
        file: item.path,
        detail: `${rule.description} (GitHub code search match)`,
        priorityBand: rule.priorityBand,
        remediation: rule.remediation,
      });
    }
  }

  return {
    mode: 'remote',
    findings: dedupeFindings(findings),
    repoState: { status: 'remote', lockPath: null, ahead: 0, behind: 0 },
  };
}

let activeProjectSlug = null;

function summarizeFindings(findings) {
  const summary = {
    critical: 0,
    warning: 0,
    total: findings.length,
    confirmedRisk: 0,
    reviewRequired: 0,
    hygiene: 0,
  };

  for (const finding of findings) {
    if (finding.severity === 'critical') summary.critical++;
    if (finding.severity === 'warning') summary.warning++;
    if (finding.priorityBand === 'confirmed-risk') summary.confirmedRisk++;
    else if (finding.priorityBand === 'review-required') summary.reviewRequired++;
    else summary.hygiene++;
  }

  return summary;
}

function groupByPriority(findings) {
  return {
    confirmedRisk: findings.filter(f => f.priorityBand === 'confirmed-risk'),
    reviewRequired: findings.filter(f => f.priorityBand === 'review-required'),
    hygiene: findings.filter(f => f.priorityBand === 'hygiene'),
  };
}

function makeIssueTitle(result) {
  return `[Sanitization] ${result.name} — ${result.summary.critical} critical / ${result.summary.warning} warning`;
}

function makeIssueBody(result) {
  const grouped = groupByPriority(result.findings);
  const lines = [
    '## Public-repo sanitization follow-up',
    '',
    `**Project:** \`${result.name}\` (\`${result.slug}\`)`,
    `**Repo:** \`${result.repo}\``,
    `**Scan mode:** ${result.scanMode}`,
    `**Repo state:** ${result.repoState.status}`,
    `**Summary:** critical ${result.summary.critical} · warning ${result.summary.warning} · confirmed-risk ${result.summary.confirmedRisk} · review-required ${result.summary.reviewRequired} · hygiene ${result.summary.hygiene}`,
    '',
    '### Priority 1 — confirmed real risk',
  ];

  appendFindingLines(lines, grouped.confirmedRisk, 'No confirmed-risk findings.');
  lines.push('', '### Priority 2 — review-required', '');
  appendFindingLines(lines, grouped.reviewRequired, 'No review-required findings.');
  lines.push('', '### Priority 3 — hygiene cleanup', '');
  appendFindingLines(lines, grouped.hygiene, 'No hygiene findings.');
  lines.push(
    '',
    '### Rules',
    '',
    '- Preserve the public-safe Studio OS map (`PROJECT_BRIEF`, `SOUL`, `CURRENT_STATE`, `TASK_BOARD`, `LATEST_HANDOFF`, `PROJECT_STATUS.json`, `AGENTS.md`, `prompts/start.md`, `prompts/closeout.md`, `logs/WORK_LOG.md`).',
    '- Remove or sanitize sensitive content; do not delete the navigation layer.',
    '- If any real secrets were ever committed, rotate first, then purge history.',
  );

  if (result.repoState.lockPath) {
    lines.push('', `### Session lock`, '', `- Active lock detected: \`${result.repoState.lockPath}\``);
  }

  return lines.join('\n');
}

function appendFindingLines(lines, findings, emptyLine) {
  if (!findings.length) {
    lines.push(`- ${emptyLine}`);
    return;
  }
  for (const finding of findings) {
    const fileLabel = finding.file ? `\`${finding.file}\`` : '`(no file)`';
    lines.push(`- ${fileLabel} — ${finding.detail}`);
    lines.push(`  Fix: ${finding.remediation}`);
  }
}

function writeReports(results, outputDir) {
  fs.mkdirSync(outputDir, { recursive: true });

  const summaryLines = [
    '# Sanitization Report Summary',
    '',
    `Date: ${today}`,
    '',
    '| Project | Critical | Warning | Repo state | Report |',
    '|---|---:|---:|---|---|',
  ];

  const summaryJson = [];

  for (const result of results) {
    const base = path.join(outputDir, result.slug);
    const issueBody = makeIssueBody(result);
    const issue = {
      title: makeIssueTitle(result),
      body: issueBody,
      labels: ['sanitization', result.summary.critical > 0 ? 'security' : 'cleanup'],
      repo: result.repo,
      slug: result.slug,
    };

    fs.writeFileSync(`${base}.json`, JSON.stringify(result, null, 2));
    fs.writeFileSync(`${base}.issue.json`, JSON.stringify(issue, null, 2));
    fs.writeFileSync(`${base}.issue.md`, issueBody);

    summaryLines.push(`| ${result.name} | ${result.summary.critical} | ${result.summary.warning} | ${result.repoState.status} | [${result.slug}.issue.md](./${result.slug}.issue.md) |`);
    summaryJson.push({
      slug: result.slug,
      name: result.name,
      repo: result.repo,
      critical: result.summary.critical,
      warning: result.summary.warning,
      repoState: result.repoState.status,
      issueFile: `${result.slug}.issue.md`,
    });
  }

  fs.writeFileSync(path.join(outputDir, '_summary.md'), summaryLines.join('\n') + '\n');
  fs.writeFileSync(path.join(outputDir, '_summary.json'), JSON.stringify(summaryJson, null, 2));
}

export function getPublicProjects(targetSlug = null) {
  return (registry.projects || [])
    .filter(project => project.status !== 'archived')
    .filter(project => PUBLIC_AUDIENCES.has(project.audience))
    .filter(project => !targetSlug || project.slug === targetSlug);
}

export function scanProject(project) {
  const canScanLocal = project.localPath && fs.existsSync(project.localPath);
  const scan = canScanLocal ? scanLocalProject(project) : scanRemoteProject(project);
  const summary = summarizeFindings(scan.findings);
  return {
    slug: project.slug,
    name: project.name,
    repo: project.repo,
    audience: project.audience,
    // Keep the transport shape stable without leaking a workstation path into
    // tracked JSON reports. The registry remains the private/local path source.
    localPath: scan.mode === 'local' ? '.' : null,
    scanMode: scan.mode,
    repoState: scan.repoState,
    summary,
    findings: scan.findings,
  };
}

export function scanProjects(targetSlug = null, onlyProblematic = false) {
  let results = getPublicProjects(targetSlug).map(scanProject);
  if (onlyProblematic) {
    results = results.filter(result => result.summary.total > 0);
  }
  return results;
}

export { writeReports };

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  const { validateSlug, validateDir } = await import('./lib/validate.mjs');
  const args = process.argv.slice(2);
  const jsonOut = args.includes('--json');
  const summaryOnly = args.includes('--summary');
  const strictMode = args.includes('--strict');
  const onlyProblematic = args.includes('--only-problematic');
  const targetSlug = validateSlug('project', readArgValue('--project'));
  const reportDirRaw = readOptionalArgValue('--write-report');
  const reportDir = args.includes('--write-report')
    ? validateDir('write-report', reportDirRaw || path.join('audits', 'sanitization', today))
    : null;

  const projects = getPublicProjects(targetSlug);
  if (targetSlug && !projects.length) {
    console.error(`No public project found for slug: ${targetSlug}`);
    process.exit(1);
  }

  const results = scanProjects(targetSlug, onlyProblematic);

  if (reportDir) {
    writeReports(results, reportDir);
  }

  if (jsonOut) {
    console.log(JSON.stringify(results, null, 2));
    process.exit(strictMode && results.some(r => r.summary.critical > 0) ? 1 : 0);
  }

  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Public Repo Sanitization Check');
  console.log(`  ${today} · ${results.length} public project(s) scanned`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  let totalCritical = 0;
  let totalWarning = 0;
  let totalConfirmedRisk = 0;
  let totalReviewRequired = 0;
  let totalHygiene = 0;

  for (const result of results) {
    totalCritical += result.summary.critical;
    totalWarning += result.summary.warning;
    totalConfirmedRisk += result.summary.confirmedRisk;
    totalReviewRequired += result.summary.reviewRequired;
    totalHygiene += result.summary.hygiene;

    const status = result.summary.critical > 0
      ? '⛔'
      : result.summary.warning > 0
        ? '⚠'
        : '✓';

    console.log(`${status} ${result.name} [${result.slug}] — critical ${result.summary.critical} · warning ${result.summary.warning} · repo ${result.repoState.status} · mode ${result.scanMode}`);
    if (!summaryOnly) {
      for (const finding of result.findings.slice(0, 8)) {
        const fileLabel = finding.file ? `${finding.file} — ` : '';
        console.log(`   - [${finding.priorityBand}] ${fileLabel}${finding.detail}`);
      }
      if (result.findings.length > 8) {
        console.log(`   - ... ${result.findings.length - 8} more finding(s)`);
      }
    }
  }

  console.log('');
  console.log(`Totals — critical ${totalCritical} · warning ${totalWarning} · confirmed-risk ${totalConfirmedRisk} · review-required ${totalReviewRequired} · hygiene ${totalHygiene}`);
  if (reportDir) {
    console.log(`Reports written to: ${reportDir}`);
  }
  if (totalCritical > 0) {
    console.log('Action: sanitize confirmed-risk items before public commits or visibility changes.');
  }
  console.log('');

  process.exit(strictMode && totalCritical > 0 ? 1 : 0);
}
