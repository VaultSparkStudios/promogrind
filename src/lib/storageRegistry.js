// Canonical client-storage data-rights registry.
//
// This is the single policy surface for browser-held PromoGrind data. A key
// must be registered here before production code may read or write it. The
// source contract in scripts/check-storage-registry.mjs enforces that rule.

const RIGHTS = Object.freeze({
  operator: { exportable: true, restorable: true, clearable: true, retention: "until-operator-clears", sensitivity: "operator" },
  financial: { exportable: true, restorable: true, clearable: true, retention: "until-operator-clears", sensitivity: "financial" },
  preference: { exportable: true, restorable: true, clearable: true, retention: "until-operator-clears", sensitivity: "preference" },
  evidence: { exportable: true, restorable: true, clearable: true, retention: "until-operator-clears", sensitivity: "decision-evidence" },
  engagement: { exportable: true, restorable: true, clearable: true, retention: "until-operator-clears", sensitivity: "engagement" },
  transient: { exportable: false, restorable: false, clearable: true, retention: "ephemeral-or-bounded-cache", sensitivity: "transient" },
  attribution: { exportable: false, restorable: false, clearable: true, retention: "until-conversion-or-clear", sensitivity: "attribution" },
  authority: { exportable: false, restorable: false, clearable: false, retention: "source-authority-controlled", sensitivity: "authorization" },
  internal: { exportable: false, restorable: false, clearable: false, retention: "internal-safety-slot", sensitivity: "internal" },
  session: { exportable: false, restorable: false, clearable: true, retention: "browser-session", sensitivity: "session-telemetry" },
});

function exact(key, label, kind, owner, overrides = {}) {
  return Object.freeze({ match: "exact", key, label, kind, owner, storage: "local", ...RIGHTS[kind], ...overrides });
}

function prefix(value, label, kind, owner, overrides = {}) {
  return Object.freeze({ match: "prefix", prefix: value, label, kind, owner, storage: "local", ...RIGHTS[kind], ...overrides });
}

export const STORAGE_REGISTRY = Object.freeze([
  // Durable operator memory and financial records.
  exact("promo_engine_v3", "Operator workspace", "financial", "storage/sync"),
  exact("pg_bankroll", "Bankroll preference", "financial", "dashboard"),
  exact("pg_usage_log", "Calculator usage log", "operator", "app-shell"),
  exact("pg_user_state", "Jurisdiction preference", "preference", "calculators"),
  exact("pg_calc_favorites", "Calculator favorites", "preference", "app-shell"),
  exact("pg_calc_history", "Calculator history index", "operator", "calculator-prewarm"),
  exact("pg_watchlist", "Game watchlist", "operator", "live-scanner"),
  exact("pg_opp_log", "Opportunity review log", "operator", "live-scanner"),
  exact("pg_profit_goal", "Profit goal", "financial", "ledger"),
  exact("pg_promo_expirations", "Promo-expiry checklist", "operator", "dashboard"),

  // User-supplied observations and integrity evidence.
  exact("pg_promo_observations_v1", "Promo observations", "evidence", "promo-calendar"),
  exact("pg_calendar_prefs_v2", "Verification queue preferences", "preference", "promo-calendar"),
  exact("pg_promo_flagged", "Community-promo flags", "evidence", "community-board"),
  exact("pg_promo_integrity_ledger_v2", "Decision integrity receipts (v2)", "evidence", "provenance"),
  exact("pg_promo_integrity_ledger_v3", "Decision evidence chain (v3)", "evidence", "provenance"),
  exact("pg_ai_calibration_ledger", "AI calibration outcomes", "evidence", "ai-calibration"),
  exact("pg_trust_receipts", "Trust receipts", "evidence", "trust-receipts"),
  exact("pg_trust_receipt_dedupe", "Trust receipt dedupe state", "evidence", "trust-receipts"),
  exact("pg:termsDrift:v1", "Promo terms-change history", "evidence", "terms-drift"),
  exact("pg_wins_wall", "Legacy outcome review cards", "evidence", "outcome-reviews"),
  exact("pg_outcome_review_cards_v1", "Local self-reported outcome review cards", "evidence", "outcome-reviews"),

  // Preferences, onboarding, and sober review progress.
  exact("pg_currency", "Currency preference", "preference", "profile"),
  exact("pg_theme", "Theme preference", "preference", "app-shell"),
  exact("pg_compact", "Compact-mode preference", "preference", "app-shell"),
  exact("pg_alert_prefs", "Legacy alert preferences", "preference", "promo-calendar"),
  exact("pg_display_name", "Local display name", "preference", "user-menu", { sensitivity: "profile" }),
  exact("pg_avatar", "Local avatar", "preference", "user-menu", { sensitivity: "profile" }),
  exact("pg_profile_type", "Operator style profile", "preference", "user-profile"),
  exact("pg_daily_brief", "Daily brief preference", "preference", "service-worker"),
  exact("pg_missions", "Daily review progress", "engagement", "missions"),
  exact("pg_achievements_v2", "Review achievements", "engagement", "achievements"),
  exact("pg_onboarded_v1", "Onboarding completion", "engagement", "onboarding"),
  exact("pg_onboarding_done", "Dashboard onboarding completion", "engagement", "onboarding"),
  exact("pg_onboarding_steps", "Onboarding steps", "engagement", "onboarding"),
  exact("pg_starter_pack_done", "Starter-pack completion", "engagement", "onboarding"),
  exact("pg_referral_shared", "Referral step completion", "engagement", "referrals"),
  exact("pg_milestones_reached", "Legacy outcome milestone state", "engagement", "notifications"),

  // Consent, entitlement, attribution, caches, and one-off presentation state.
  exact("pg_age_verified", "Age-gate acknowledgement", "preference", "age-gate", { exportable: false, restorable: false }),
  exact("pg_pro_status", "Entitlement mirror", "authority", "auth-sync"),
  exact("pg_ref", "Referral attribution", "attribution", "auth"),
  exact("pg_utm_source", "Campaign source", "attribution", "landing"),
  exact("pg_utm_medium", "Campaign medium", "attribution", "landing"),
  exact("pg_utm_campaign", "Campaign name", "attribution", "landing"),
  exact("pg_action_plan_cache", "Action-plan cache", "transient", "ai-action-plan"),
  exact("pg_action_plan_date", "Action-plan generation date", "transient", "ai-action-plan"),
  exact("pg_ai_prompt_cache_stats", "AI prompt-cache counters", "transient", "ai-gateway"),
  exact("pg_ai_spend_ledger", "AI request estimate ledger", "transient", "ai-gateway", { retention: "last-200-request-estimates" }),
  exact("pg_feature_flags_cache", "Feature-flag cache", "transient", "feature-flags", { retention: "five-minutes" }),
  exact("pg_calc_prewarm_state", "Calculator prewarm cache", "transient", "calculator-prewarm"),
  exact("pg_sync_queue", "Offline sync queue", "transient", "sync"),
  exact("pg_sync_pending", "Pending sync marker", "transient", "sync"),
  exact("pg_member_welcome_v1_dismissed", "Welcome-card dismissal", "transient", "dashboard"),
  exact("pg_state_alert_dismissed", "Jurisdiction-alert dismissal", "transient", "state-legal"),
  exact("pg_brief_shown_today", "Daily-brief display marker", "transient", "dashboard"),
  exact("pg_upsell_bb_count", "Bonus-bet upsell counter", "transient", "bonus-bet"),
  exact("pg_upsell_bb_dismissed", "Bonus-bet upsell dismissal", "transient", "bonus-bet"),
  exact("pg_upsell_ledger_dismissed", "Ledger upsell dismissal", "transient", "ledger"),
  exact("_pg_login_day", "Legacy login-day marker", "transient", "sync"),
  exact("pg_vault_backup", "Pre-restore safety snapshot", "internal", "data-controls"),

  // Browser-session-only telemetry.
  exact("pg_session_start", "Session start", "session", "app-shell", { storage: "session" }),
  exact("pg_session_ledger_count", "Session ledger baseline", "session", "app-shell", { storage: "session" }),
  exact("pg_launch_impressions", "Launch-gate impression dedupe", "session", "launch-telemetry", { storage: "session" }),
]);

export const STORAGE_PREFIX_REGISTRY = Object.freeze([
  prefix("pg_ai_prompt_cache:", "AI response cache", "transient", "ai-gateway", { retention: "six-hours" }),
  prefix("pg_chat_uses_", "Daily chat usage counter", "transient", "ai-gateway", { retention: "daily-counter" }),
  prefix("pg_advisor_uses_", "Daily advisor usage counter", "transient", "ai-gateway", { retention: "daily-counter" }),
  prefix("pg_goal_notified_", "Goal-notification dedupe", "transient", "notifications"),
  prefix("pg_trigger_dismissed_", "Contextual-trigger dismissal", "transient", "ui"),
  prefix("pg_calc_", "Calculator draft memory", "operator", "calculators"),
  prefix("pg_hist_", "Calculator history", "operator", "calculators"),
  prefix("pg_used_", "Calculator review flags", "engagement", "missions"),
  prefix("pg_advisor_", "Advisor review flags", "engagement", "missions"),
  prefix("pg_insights_", "Insights review flags", "engagement", "missions"),
  prefix("pg_brief_", "Brief review flags", "engagement", "missions"),
  prefix("pg_book_", "Sportsbook review flags", "engagement", "missions"),
]);

const exactByStorage = new Map(STORAGE_REGISTRY.map((entry) => [`${entry.storage}:${entry.key}`, entry]));

export function classifyStorageKey(key, storage = "local") {
  if (typeof key !== "string" || !key) return null;
  const direct = exactByStorage.get(`${storage}:${key}`);
  if (direct) return direct;
  const match = STORAGE_PREFIX_REGISTRY.find((entry) => entry.storage === storage && key.startsWith(entry.prefix));
  return match ? Object.freeze({ ...match, key }) : null;
}

export function listRegisteredStorage({ storage, exportable, clearable } = {}) {
  return [...STORAGE_REGISTRY, ...STORAGE_PREFIX_REGISTRY].filter((entry) =>
    (storage === undefined || entry.storage === storage)
    && (exportable === undefined || entry.exportable === exportable)
    && (clearable === undefined || entry.clearable === clearable));
}

export function isRestorableStorageKey(key) {
  const entry = classifyStorageKey(key, "local");
  return Boolean(entry?.exportable && entry?.restorable);
}
