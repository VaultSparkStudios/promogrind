import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const publicDir = path.join(root, "public");
const appSources = [
  path.join(root, "src", "App.jsx"),
  path.join(root, "src", "app", "appRoutes.js"),
].map((file) => fs.readFileSync(file, "utf8")).join("\n");

const appSlugs = new Set(
  [...appSources.matchAll(/slug:\s*["']([^"']+)["']/g)]
    .map((match) => match[1])
    .filter((slug) => /^[a-z0-9][a-z0-9-]*$/.test(slug)),
);

const requiredAppSlugs = [
  "dashboard",
  "bonus-bet",
  "profit-boost",
  "sportsbooks",
  "bet-tracker",
  "ledger",
  "pricing",
  "upgrade",
];

const requiredPublicPages = [
  "landing",
  "bonus-bet",
  "arb-calculator",
  "promogrind-vs-profitduel",
  "contact",
  "privacy",
  "terms",
  "responsible-gambling",
  "affiliate-disclosure",
  "disclaimer",
  "dmca",
  "data-policy",
  "about",
  "compliance",
];

const requiredPublicFiles = [
  "agents.json",
  ".well-known/llms.txt",
];

function walkHtml(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) walkHtml(abs, files);
    else if (entry.name.endsWith(".html")) files.push(abs);
  }
  return files;
}

function publicPathExists(routePath) {
  const normalized = routePath.replace(/^\/+|\/+$/g, "");
  if (!normalized) return true;
  return fs.existsSync(path.join(publicDir, normalized, "index.html")) ||
    fs.existsSync(path.join(publicDir, normalized));
}

function routeSlug(routePath) {
  return routePath.replace(/^\/+/, "").split(/[?#]/)[0].replace(/\/+$/, "");
}

function isInternalPageRoute(href) {
  if (!href.startsWith("/") || href.startsWith("//")) return false;
  if (href.startsWith("/js/") || href.startsWith("/assets/")) return false;
  if (/\.(?:svg|png|webp|avif|ico|json|xml|txt|js|css)$/i.test(href.split(/[?#]/)[0])) return false;
  return true;
}

const errors = [];

for (const slug of requiredAppSlugs) {
  if (!appSlugs.has(slug)) errors.push(`app route metadata missing required slug: ${slug}`);
}

for (const page of requiredPublicPages) {
  if (!publicPathExists(`/${page}/`)) errors.push(`public page missing: /${page}/`);
}

for (const file of requiredPublicFiles) {
  if (!fs.existsSync(path.join(publicDir, file))) errors.push(`public file missing: /${file}`);
}

const htmlFiles = walkHtml(publicDir);
for (const file of htmlFiles) {
  const rel = path.relative(root, file).replace(/\\/g, "/");
  const html = fs.readFileSync(file, "utf8");
  const hrefs = [...html.matchAll(/\bhref=["']([^"']+)["']/g)].map((match) => match[1]);
  for (const href of hrefs) {
    if (!isInternalPageRoute(href)) continue;
    const slug = routeSlug(href);
    if (!publicPathExists(href) && !appSlugs.has(slug)) {
      errors.push(`${rel}: internal href does not resolve to a public page or app route: ${href}`);
    }
  }
}

const topLaunchPages = [
  "public/landing/index.html",
  "public/bonus-bet/index.html",
  "public/arb-calculator/index.html",
  "public/promogrind-vs-profitduel/index.html",
];

for (const rel of topLaunchPages) {
  const html = fs.readFileSync(path.join(root, rel), "utf8");
  for (const required of ["1-800-GAMBLER", "PromoGrind account"]) {
    if (!html.includes(required)) errors.push(`${rel}: missing ${required}`);
  }
}

if (errors.length) {
  console.error("UX route integrity failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`UX route integrity passed (${appSlugs.size} app routes, ${htmlFiles.length} public HTML files).`);
