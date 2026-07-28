import crypto from "node:crypto";
import fs from "node:fs";

const CONTRACT_PATH = "supabase/functions/calc-api/calculator-contract.json";
const FUNCTION_PATH = "supabase/functions/calc-api/index.ts";
const LAUNCH_PATH = "context/LAUNCH_PROOFS.json";
const FLAGS_PATH = "src/launchState.js";

function readJson(path) {
  return JSON.parse(fs.readFileSync(path, "utf8"));
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function coveredCriteria(proof) {
  const covered = new Set((proof?.receipts ?? [])
    .map((receipt) => receipt?.criterionId)
    .filter(Boolean));
  const required = (proof?.criteria ?? [])
    .filter((criterion) => criterion?.required !== false)
    .map((criterion) => criterion.id);
  return required.length > 0 && required.every((id) => covered.has(id));
}

function readDefaultFlag(source, key) {
  const pattern = new RegExp(`${key}:\\s*parseLaunchFlag\\([^,]+,\\s*(true|false)\\)`);
  const match = source.match(pattern);
  if (!match) throw new Error(`Missing fail-closed feature flag source for ${key}`);
  return match[1] === "true";
}

export function buildPublicCapabilityContract() {
  const calculatorSource = fs.readFileSync(FUNCTION_PATH, "utf8");
  const flagSource = fs.readFileSync(FLAGS_PATH, "utf8");
  const calculator = readJson(CONTRACT_PATH);
  const launch = readJson(LAUNCH_PATH);
  const sourceKeys = new Set(
    [...calculatorSource.matchAll(/^\s{2}"([^"]+)":\s*\(b\)/gm)].map((match) => match[1])
  );
  const contractKeys = new Set(calculator.endpoints.map((endpoint) => endpoint.slug));
  if (sourceKeys.size !== contractKeys.size || [...sourceKeys].some((key) => !contractKeys.has(key))) {
    throw new Error("Calculator implementation and public contract endpoints diverge.");
  }

  const deploymentProof = launch.proofs?.supabaseDeployment;
  const deploymentVerified = coveredCriteria(deploymentProof);
  const featureKeys = ["aiScan", "promoAdvisor", "promoChat", "liveScanner", "stackBuilder", "aiActionPlan"];
  const features = featureKeys.map((key) => ({
    id: key,
    availability: readDefaultFlag(flagSource, key) && deploymentVerified ? "available" : "unavailable",
    reason: deploymentVerified
      ? "The production-default feature flag is disabled."
      : "No complete, criterion-addressed production deployment receipt exists.",
  }));
  const calculatorAvailability = deploymentVerified ? "available" : "unverified";

  return {
    schema_version: "1.0",
    as_of: launch.lastUpdated,
    product: "PromoGrind",
    canonical_url: "https://promogrind.bet/",
    truth_basis: {
      policy: "Fail closed: source implementation is not evidence of live availability.",
      sources: [CONTRACT_PATH, FUNCTION_PATH, LAUNCH_PATH, FLAGS_PATH],
      source_digest: sha256([
        fs.readFileSync(CONTRACT_PATH),
        Buffer.from(calculatorSource),
        fs.readFileSync(LAUNCH_PATH),
        Buffer.from(flagSource),
      ].map((value) => sha256(value)).join(":")),
    },
    agent_policy: {
      autonomous_betting: false,
      account_creation: false,
      educational_calculation: true,
      independent_verification_required: true,
    },
    callable_tools: calculatorAvailability === "available"
      ? calculator.endpoints.map((endpoint) => ({
          id: `calculator.${endpoint.slug}`,
          method: "POST",
          url: `${calculator.candidateBaseUrl}${endpoint.path}`,
          input: endpoint.params,
        }))
      : [],
    capabilities: [
      {
        id: "calculator-api",
        availability: calculatorAvailability,
        candidate_base_url: calculator.candidateBaseUrl,
        reason: deploymentVerified
          ? "All required deployment criteria have addressed receipts."
          : "Implementation exists, but no complete criterion-addressed production deployment receipt exists.",
        endpoints: calculator.endpoints.map(({ slug, path, params, aliasFor }) => ({
          slug, path, params, ...(aliasFor ? { alias_for: aliasFor } : {}),
        })),
        disclaimer: calculator.disclaimer,
      },
      ...features,
    ],
  };
}
