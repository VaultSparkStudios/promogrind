#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "docs", "AI_USAGE_LEDGER.md");
const JSON_MODE = process.argv.includes("--json");
const DAYS_ARG_INDEX = process.argv.indexOf("--days");
const DAYS = DAYS_ARG_INDEX >= 0 ? Number.parseInt(process.argv[DAYS_ARG_INDEX + 1] || "14", 10) : 14;
const OFFLINE = process.argv.includes("--offline");
const AI_FEATURES = new Set(["promo_advisor", "promo_chat", "ai_action_plan", "stack_builder"]);

function readEnvFile(filePath) {
  try {
    return Object.fromEntries(
      fs.readFileSync(filePath, "utf8")
        .split(/\r?\n/)
        .filter((line) => line && !line.trim().startsWith("#"))
        .map((line) => {
          const [key, value = ""] = line.split(/=(.*)/s).slice(0, 2);
          return [key.trim(), value.trim()];
        }),
    );
  } catch {
    return {};
  }
}

function num(value) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function summarize(events = [], days = DAYS) {
  const rows = events.filter((event) => AI_FEATURES.has(String(event.event_type || "")));
  const byFeature = {};
  let totalCalls = 0;
  let modelCalls = 0;
  let ruleEngineCalls = 0;
  let estimatedInputTokens = 0;
  let estimatedOutputTokens = 0;
  let estimatedTokensSaved = 0;

  for (const event of rows) {
    const feature = String(event.event_type || "unknown");
    const metadata = event.metadata || {};
    const source = String(metadata.analysis_source || metadata.analysisSource || metadata.source || "ai");
    if (!byFeature[feature]) {
      byFeature[feature] = {
        feature,
        calls: 0,
        modelCalls: 0,
        ruleEngineCalls: 0,
        inputTokens: 0,
        outputTokens: 0,
        tokensSaved: 0,
      };
    }
    const row = byFeature[feature];
    row.calls += 1;
    totalCalls += 1;
    if (source === "rule_engine") {
      row.ruleEngineCalls += 1;
      ruleEngineCalls += 1;
    } else {
      row.modelCalls += 1;
      modelCalls += 1;
    }
    const inputTokens = num(metadata.input_tokens);
    const outputTokens = num(metadata.output_tokens);
    const tokensSaved = num(metadata.estimated_tokens_saved);
    row.inputTokens += inputTokens;
    row.outputTokens += outputTokens;
    row.tokensSaved += tokensSaved;
    estimatedInputTokens += inputTokens;
    estimatedOutputTokens += outputTokens;
    estimatedTokensSaved += tokensSaved;
  }

  return {
    generatedAt: new Date().toISOString(),
    windowDays: days,
    totalCalls,
    modelCalls,
    ruleEngineCalls,
    estimatedInputTokens,
    estimatedOutputTokens,
    estimatedTokensSaved,
    ruleEngineRate: totalCalls ? Math.round((ruleEngineCalls / totalCalls) * 100) : 0,
    byFeature: Object.values(byFeature).sort((a, b) => b.calls - a.calls || a.feature.localeCompare(b.feature)),
  };
}

function renderMarkdown(summary, sourceNote) {
  const lines = [
    "<!-- generated-by: scripts/render-ai-usage-ledger.mjs -->",
    `<!-- generated-at: ${summary.generatedAt} -->`,
    "",
    "# AI Usage Ledger",
    "",
    `Source: ${sourceNote}`,
    "",
    `- Window: ${summary.windowDays} days`,
    `- Total AI feature events: ${summary.totalCalls}`,
    `- Model-backed calls: ${summary.modelCalls}`,
    `- Rule-engine wins: ${summary.ruleEngineCalls} (${summary.ruleEngineRate}%)`,
    `- Estimated input tokens: ${summary.estimatedInputTokens}`,
    `- Estimated output tokens: ${summary.estimatedOutputTokens}`,
    `- Estimated tokens saved: ${summary.estimatedTokensSaved}`,
    "",
    "| Feature | Calls | Model | Rule | Input tok | Output tok | Saved tok |",
    "|---|---:|---:|---:|---:|---:|---:|",
    ...summary.byFeature.map((row) => `| ${row.feature} | ${row.calls} | ${row.modelCalls} | ${row.ruleEngineCalls} | ${row.inputTokens} | ${row.outputTokens} | ${row.tokensSaved} |`),
    "",
    "## Measurement Plan",
    "",
    "- Treat rule-engine wins as avoided model calls only when metadata includes `analysis_source=rule_engine`.",
    "- Track cache hits client-side as trust receipts and server-side where the feature function records cache metadata.",
    "- Target: grow rule-engine/cache-resolved Promo Advisor responses to at least 50% of recognizable offers without reducing confidence or calculator-routing quality.",
    "",
  ];
  return lines.join("\n");
}

async function fetchEvents() {
  if (OFFLINE) return { events: [], sourceNote: "offline verification mode; wrote empty local ledger" };
  const adminEnv = readEnvFile(path.join(ROOT, ".env.admin"));
  const url = adminEnv.SUPABASE_URL || process.env.SUPABASE_URL;
  const key = adminEnv.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return { events: [], sourceNote: "no Supabase admin env found; wrote empty local ledger" };

  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const since = new Date(Date.now() - DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("vault_events")
    .select("event_type, created_at, metadata")
    .gte("created_at", since)
    .in("event_type", [...AI_FEATURES])
    .order("created_at", { ascending: false })
    .limit(2000);
  if (error) throw error;
  return { events: data || [], sourceNote: `Supabase vault_events since ${since}` };
}

const { events, sourceNote } = await fetchEvents();
const summary = summarize(events);
if (JSON_MODE) {
  console.log(JSON.stringify(summary, null, 2));
} else {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, renderMarkdown(summary, sourceNote));
  console.log(`AI usage ledger → ${path.relative(ROOT, OUT).replace(/\\/g, "/")}`);
}
