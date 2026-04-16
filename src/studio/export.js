import { BOOKS, getConfiguredAffiliateCount, getConfiguredMonetizationCount } from "../books.js";
import { getLaunchCommandCenter, resolveLaunchValidation } from "../launchState.js";
import { buildTrackInsights } from "../track/insights.js";
import { buildWorkflowInbox } from "../workflows/inbox.js";

export function buildStudioSnapshot(appData = {}, options = {}) {
  const validation = resolveLaunchValidation();
  const configuredAffiliateCount = getConfiguredAffiliateCount();
  const configuredMonetizationCount = getConfiguredMonetizationCount();
  const commandCenter = getLaunchCommandCenter({
    configuredAffiliateCount,
    configuredMonetizationCount,
    totalBooks: BOOKS.length,
    validation,
  });
  const insights = buildTrackInsights(appData, options.now || new Date());
  const inbox = buildWorkflowInbox(appData, {
    now: options.now || new Date(),
    bankroll: options.bankroll ?? appData.bankroll ?? "",
  });

  return {
    project: "promogrind",
    generatedAt: new Date().toISOString(),
    launch: {
      readinessScore: commandCenter.readinessScore,
      posture: commandCenter.posture,
      unresolvedBlockers: commandCenter.unresolvedBlockerCount,
      monetizedBooks: configuredMonetizationCount,
      affiliateBooks: configuredAffiliateCount,
      totalBooks: BOOKS.length,
      validation,
    },
    growth: {
      totalProfit: insights.totalProfit,
      monthProfit: insights.monthProfit,
      recent7Profit: insights.recent7Profit,
      settledCount: insights.settledCount,
      hitRate: insights.hitRate,
      accuracyRate: insights.accuracyRate,
    },
    workflows: {
      openCount: inbox.open.length,
      queuedCount: inbox.queuedCount,
      waitingCount: inbox.waitingCount,
      top: inbox.top.map((workflow) => ({
        id: workflow.id,
        title: workflow.title,
        status: workflow.status,
        score: workflow.score,
        promoType: workflow.promoType,
        calculatorSlug: workflow.calculatorSlug,
        expectedProfit: workflow.expectedProfit,
        book: workflow.book,
        source: workflow.source,
      })),
    },
    intelligence: {
      topSkipReasons: insights.skipReasonRows.slice(0, 3),
      topFrictionReasons: insights.frictionReasonRows.slice(0, 3),
      strongestLane: insights.biggestPositiveDrift?.label || null,
      coldestLane: insights.biggestNegativeDrift?.label || null,
    },
  };
}
