export const ONBOARDING_STEPS = [
  { id: "calc", label: "Run your first calculator", icon: "🧮", slug: "/bonus-bet" },
  { id: "book", label: "Add a sportsbook to your vault", icon: "📚", slug: "/sportsbooks" },
  { id: "bet", label: "Log your first bet or promo", icon: "📝", slug: "/bet-tracker" },
  { id: "trial", label: "Start your 7-day free trial", icon: "⚡", slug: "/upgrade" },
  { id: "invite", label: "Invite a friend", icon: "👥", slug: "/about" },
];

export const PROMO_PASSPORT_STEPS = [
  { id: "account", label: "Create your account", slug: "/dashboard" },
  { id: "calc", label: "Run a calculator", slug: "/bonus-bet" },
  { id: "book", label: "Track a sportsbook", slug: "/sportsbooks" },
  { id: "bet", label: "Log the first promo or bet", slug: "/bet-tracker" },
  { id: "settled", label: "Settle one result", slug: "/ledger" },
  { id: "passport", label: "Export your operator passport", slug: "/dashboard" },
];

const COMPLETED_KEY = "pg_onboarding_steps";

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readJson(key, fallback) {
  if (!canUseStorage()) return fallback;
  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export function loadCompletedOnboardingSteps() {
  const value = readJson(COMPLETED_KEY, []);
  return Array.isArray(value) ? value.filter((step) => typeof step === "string") : [];
}

export function saveCompletedOnboardingSteps(steps) {
  const next = [...new Set((Array.isArray(steps) ? steps : []).filter((step) => typeof step === "string"))];
  writeJson(COMPLETED_KEY, next);
  return next;
}

export function markOnboardingStepComplete(stepId) {
  if (!stepId) return loadCompletedOnboardingSteps();
  return saveCompletedOnboardingSteps([...loadCompletedOnboardingSteps(), stepId]);
}

export function getOnboardingProgress({ appData = {}, isProActive = false } = {}) {
  const inferred = [];
  const usageLog = readJson("pg_usage_log", {});
  const hasUsage = usageLog && typeof usageLog === "object" && Object.keys(usageLog).length > 0;
  const hasBooks = Object.values(appData?.done || {}).some(Boolean) || (appData?.sportsbooks || []).length > 0;
  const hasBetHistory = (appData?.bets || []).length > 0 || (appData?.ledger || []).length > 0;

  if (hasUsage) inferred.push("calc");
  if (hasBooks) inferred.push("book");
  if (hasBetHistory) inferred.push("bet");
  if (isProActive) inferred.push("trial");
  if (canUseStorage() && window.localStorage.getItem("pg_referral_shared")) inferred.push("invite");

  const completed = saveCompletedOnboardingSteps([...loadCompletedOnboardingSteps(), ...inferred]);
  const ordered = ONBOARDING_STEPS.map((step) => ({
    ...step,
    done: completed.includes(step.id),
  }));
  const doneCount = ordered.filter((step) => step.done).length;
  return {
    steps: ordered,
    doneCount,
    totalCount: ordered.length,
    pct: Math.round((doneCount / ordered.length) * 100),
    remaining: ordered.filter((step) => !step.done),
  };
}

export function getPromoPassportOnboardingPlan({ appData = {}, user = null, trustReceipts = [], disciplineScore = null } = {}) {
  const usageLog = readJson("pg_usage_log", {});
  const hasUsage = usageLog && typeof usageLog === "object" && Object.keys(usageLog).length > 0;
  const bets = Array.isArray(appData?.bets) ? appData.bets : [];
  const ledger = Array.isArray(appData?.ledger) ? appData.ledger : [];
  const settledBets = bets.filter((bet) => ["won", "lost", "void"].includes(String(bet?.status || "").toLowerCase()));
  const hasBooks = Object.values(appData?.done || {}).some(Boolean) || (appData?.sportsbooks || []).length > 0;
  const hasBet = bets.length > 0 || ledger.length > 0;
  const hasSettled = settledBets.length > 0 || ledger.some((entry) => Number(entry?.profit ?? entry?.pnl ?? entry?.amount) !== 0);
  const hasPassportReceipt = Array.isArray(trustReceipts) && trustReceipts.some((receipt) => /passport/i.test(`${receipt?.type || ""} ${receipt?.title || ""} ${receipt?.summary || ""}`));

  const done = new Set();
  if (user || appData?.userId || appData?.accountCreated) done.add("account");
  if (hasUsage) done.add("calc");
  if (hasBooks) done.add("book");
  if (hasBet) done.add("bet");
  if (hasSettled) done.add("settled");
  if (hasPassportReceipt || (Number(disciplineScore) >= 70 && hasSettled)) done.add("passport");

  const steps = PROMO_PASSPORT_STEPS.map((step) => ({ ...step, done: done.has(step.id) }));
  const doneCount = steps.filter((step) => step.done).length;
  const next = steps.find((step) => !step.done) || null;
  return {
    steps,
    next,
    doneCount,
    totalCount: steps.length,
    pct: Math.round((doneCount / steps.length) * 100),
    complete: doneCount === steps.length,
  };
}
