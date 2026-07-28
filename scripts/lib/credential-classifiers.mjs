/**
 * Public-safe credential classifiers shared by working-tree, history, and
 * sanitization gates. Findings expose locations and classes only; raw values
 * never leave this module.
 */

const POSTGRES_URI = /\bpostgres(?:ql)?:\/\/[^:\s/"']+:([^@\s/"']+)@[^\s"']+/gi;
const SECRET_ASSIGNMENT = /\b(PGPASSWORD|POSTGRES_PASSWORD|DATABASE_PASSWORD|JWT_SECRET|SERVICE_ROLE_KEY)\s*[:=]\s*["']?([A-Za-z0-9_+./=@:-]{8,})["']?/gi;
const JWT = /\beyJ[A-Za-z0-9_-]{8,}\.eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{16,}\b/g;

const PRIVILEGED_JWT_ROLES = new Set([
  "service_role",
  "supabase_admin",
  "admin",
]);

function isPlaceholder(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return true;
  if (/^(?:example|placeholder|changeme|replace[-_]?me|your[-_])/.test(normalized)) return true;
  if (/^[a-z]$/.test(normalized)) return true;
  if (/^(.)\1{7,}$/.test(normalized)) return true;
  if (/^\$\{[^}]+\}$/.test(normalized) || /^<[^>]+>$/.test(normalized)) return true;
  if (/^(?:process|deno)\.env/.test(normalized)) return true;
  return false;
}

function decodeJwtRole(token) {
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"));
    return typeof payload?.role === "string" ? payload.role : null;
  } catch {
    return null;
  }
}

function lineAndColumn(content, index) {
  const prefix = content.slice(0, index);
  const lines = prefix.split(/\r?\n/);
  return { line: lines.length, column: lines.at(-1).length + 1 };
}

function pushFinding(findings, seen, content, index, type, label) {
  const location = lineAndColumn(content, index);
  const key = `${type}:${location.line}:${location.column}`;
  if (seen.has(key)) return;
  seen.add(key);
  findings.push({
    type,
    label,
    line: location.line,
    column: location.column,
    redacted: `<redacted:${type}>`,
  });
}

export function classifyCredentialText(content) {
  const text = String(content || "");
  const findings = [];
  const seen = new Set();

  POSTGRES_URI.lastIndex = 0;
  for (const match of text.matchAll(POSTGRES_URI)) {
    if (!isPlaceholder(match[1])) {
      pushFinding(findings, seen, text, match.index, "postgres-credential-uri", "PostgreSQL URI with embedded credential");
    }
  }

  SECRET_ASSIGNMENT.lastIndex = 0;
  for (const match of text.matchAll(SECRET_ASSIGNMENT)) {
    if (!isPlaceholder(match[2])) {
      pushFinding(findings, seen, text, match.index, "secret-assignment", `Credential assignment (${match[1]})`);
    }
  }

  JWT.lastIndex = 0;
  for (const match of text.matchAll(JWT)) {
    const role = decodeJwtRole(match[0]);
    if (role && PRIVILEGED_JWT_ROLES.has(role)) {
      pushFinding(findings, seen, text, match.index, "privileged-jwt", `Privileged JSON Web Token (${role})`);
    }
  }

  return findings;
}

export function classifyCredentialLine(line) {
  return classifyCredentialText(line);
}

export const credentialClassifierMeta = Object.freeze({
  schemaVersion: "1.0",
  redaction: "class-and-location-only",
  classes: ["postgres-credential-uri", "secret-assignment", "privileged-jwt"],
});
