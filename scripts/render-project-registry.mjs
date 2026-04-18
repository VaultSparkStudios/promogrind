#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.argv[2] || ".");
const registryPath = path.join(root, "portfolio", "PROJECT_REGISTRY.json");
const outputPath = path.join(root, "portfolio", "PROJECT_REGISTRY.md");

const registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));
const projects = registry.projects ?? [];

const complianceEligible = projects.filter((project) => project.status !== "archived");
const compliant = complianceEligible.filter((project) => project.studioOsApplied);
const nonCompliant = complianceEligible.filter((project) => !project.studioOsApplied);

function title(value) {
  return value
    .split("-")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function osMark(project) {
  if (project.companionTo) {
    return project.studioOsApplied ? "✓" : "○";
  }

  return project.studioOsApplied ? "✓" : "○";
}

function projectName(project) {
  const tags = [];
  if (project.companionTo) tags.push("◆");
  if (project.discoveredBy === "repo-scanner") tags.push("★");
  if (project.status === "archived" && project.renamedTo) tags.push("††");
  return `${project.name}${tags.length ? ` ${tags.join("")}` : ""}`;
}

function stagingBadge(project) {
  const type = project.stagingType ?? "none";
  const badges = {
    hetzner: "🟢 hetzner",
    "github-pages": "🟢 gh-pages",
    "platform-preview": "🟡 preview",
    local: "🟡 local",
    none: "—",
  };
  return badges[type] ?? type;
}

function row(project) {
  const health = title(project.health);
  const priority = title(project.priority ?? "medium");
  const medium = title(project.medium ?? project.type ?? "project");
  const status = title(project.status ?? "active");
  const lifecycle = title(project.lifecycle ?? "building");
  return `| ${projectName(project)} | ${medium} | ${status} | ${lifecycle} | ${priority} | ${health} | ${osMark(project)} | ${stagingBadge(project)} | ${project.owner} | ${project.currentFocus} | ${project.nextMilestone} |`;
}

const lines = [
  "# Project Registry",
  "",
  "<!-- generated-by: scripts/render-project-registry.mjs -->",
  `<!-- generated-at: ${new Date().toISOString().slice(0, 10)} -->`,
  "",
  "## Studio overview",
  "",
  "| Project | Medium | Status | Lifecycle | Priority | Health | OS | Staging | Owner | Current focus | Next milestone |",
  "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |",
  ...projects.map(row),
  "",
  "## Legend",
  "",
  "✓ = Studio OS applied — AGENTS.md + full context/ files confirmed",
  "○ = Not yet applied — follow `docs/STUDIO_EXISTING_PROJECT_MIGRATION.md`",
  "◆ = Companion repo — sub-project of a parent project (lighter enforcement applies)",
  "★ = Newly discovered by Repo Scanner",
  "†† = Archived historical entry",
  "",
  `## Studio OS compliance (as of ${registry.updatedAt})`,
  "",
  `**Compliant: ${compliant.length}/${complianceEligible.length}**`,
  "",
  `### Compliant (${compliant.length})`,
  compliant.map((project) => project.name).join(" · ") || "None",
  "",
  `### Not yet compliant (${nonCompliant.length})`,
  nonCompliant.map((project) => project.name).join(" · ") || "None",
  "",
  "## Rules",
  "",
  "- `portfolio/PROJECT_REGISTRY.json` is the canonical source. This Markdown file is generated from it.",
  "- Detailed truth belongs in each project's own repo.",
  "- Every Hub project must pass `docs/STUDIO_HUB_ONBOARDING.md` before being added to `studioRegistry.js`.",
  "- The Repo Scanner auto-discovers unregistered repos weekly and opens intake issues.",
  "- The Enforcer audits all registered repos daily for compliance.",
  "- If this file is stale, regenerate it instead of editing by hand.",
];

fs.writeFileSync(outputPath, `${lines.join("\n")}\n`, "utf8");
console.log(`Wrote ${path.relative(root, outputPath)}`);
