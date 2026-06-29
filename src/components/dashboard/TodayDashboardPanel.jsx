import React from "react";
import { AppDataCtx, useToast } from "../../contexts.jsx";
import { K, S, f, font, fontD } from "../../lib/shared.js";
import { buildRiskRadarSummary, getBankrollPosture, getNextBestAction, getUnfinishedWork } from "../../dashboard/today.js";
import { getOnboardingProgress, getPromoPassportOnboardingPlan } from "../../onboarding.js";
import { matchPlaybooks, playbookToWorkflows } from "../../playbooks/index.js";
// matchPlaybooks is called here as a fallback when snapshot.topPlaybook is not pre-computed
import ObservabilityPanel from "./ObservabilityPanel.jsx";
import WorkflowInboxPanel from "./WorkflowInboxPanel.jsx";
import PromoExpiryWidget from "./PromoExpiryWidget.jsx";
import { appendWorkflows } from "../../workflows/store.js";
import { getWorkflowActionSlug } from "../../workflows/actionGraph.js";
import { computeTiltState } from "../../lib/tiltGuard.js";
import { buildTwinForecast } from "../../ai/operatorTwin.js";
import { buildCounterfactualPnL } from "../../lib/counterfactualPnL.js";
import { buildDecisionJournal } from "../../lib/decisionJournal.js";
import { computeDisciplineScore } from "../../lib/discipline.js";
import { assertShareCardPiiSafe, buildShareCardData, renderShareCardCanvas } from "../../lib/shareCard.js";
import { readTrustReceipts } from "../../lib/trustReceipts.js";

function OperatorTwinCard({ forecast }) {
  if (!forecast) return null;
  const tone = forecast.tone === "elite" ? K.gn : forecast.tone === "watch" ? K.yl : K.ac;
  return (
    <div style={{ padding: "10px 12px", background: `${tone}08`, border: `1px solid ${tone}30`, borderRadius: 8, marginBottom: 12 }}>
      <div style={{ fontSize: 10, color: tone, textTransform: "uppercase", letterSpacing: "1.2px", fontWeight: 800, marginBottom: 4 }}>
        Operator Twin · {forecast.recent}% recent / {forecast.baseline}% baseline
      </div>
      <div style={{ fontSize: 12, color: K.tx, fontWeight: 700, marginBottom: 2 }}>{forecast.headline}</div>
      <div style={{ fontSize: 10, color: K.mt, lineHeight: 1.6 }}>{forecast.detail}</div>
    </div>
  );
}

function RiskRadarCard({ radar, navigate }) {
  if (!radar?.show) return null;
  const tone = radar.stressPreview || radar.preMortem?.triggered ? K.yl : K.ac;
  const exposureCopy = radar.exposurePct === null ? `$${f(radar.exposure)} open exposure` : `$${f(radar.exposure)} open · ${radar.exposurePct}% bankroll`;
  const leader = radar.twinBattle?.leaderboard?.[0];
  return (
    <div style={{ padding: "12px", background: `${tone}08`, border: `1px solid ${tone}30`, borderRadius: 8, marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 10, color: tone, textTransform: "uppercase", letterSpacing: "1.2px", fontWeight: 800, marginBottom: 5 }}>Risk Radar</div>
          <div style={{ fontFamily: fontD, fontSize: 16, fontWeight: 800, color: K.tx }}>{radar.headline}</div>
          <div style={{ fontSize: 10, color: K.mt, marginTop: 4 }}>{exposureCopy}</div>
        </div>
        <button onClick={() => navigate("/bet-tracker")} style={{ padding: "8px 12px", background: "transparent", border: `1px solid ${tone}45`, borderRadius: 8, color: tone, fontSize: 10, fontWeight: 800, cursor: "pointer", fontFamily: font }}>
          Review exposure →
        </button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 8 }}>
        <InsightChip label="Stress P10" value={`$${f(radar.stress?.results?.p10 || 0)}`} tone={radar.stressPreview ? K.yl : K.ac} />
        <InsightChip label="Stress P50" value={`$${f(radar.stress?.results?.p50 || 0)}`} tone={K.ac} />
        <InsightChip label="Worst case" value={`$${f(radar.stress?.worstCase || 0)}`} tone={radar.stress?.worstCase < 0 ? K.rd : K.yl} />
        <InsightChip label="Twin leader" value={leader ? `${leader.name} $${f(Math.abs(leader.pnl))}` : "No sample"} tone={leader?.name === "you" ? K.gn : K.yl} />
      </div>
      {radar.preMortem?.triggered && (
        <div style={{ marginTop: 10, padding: "9px 10px", borderRadius: 8, background: `${K.yl}10`, border: `1px solid ${K.yl}35`, fontSize: 10, color: K.dm, lineHeight: 1.6 }}>
          {radar.preMortem.copy.body} {radar.preMortem.scenarios?.[0]?.detail || "No similar prior loss is recorded yet, so keep the stake intentional."}
        </div>
      )}
    </div>
  );
}
function TiltBreakerBanner({ state }) {
  if (!state?.tripped) return null;
  return (
    <div style={{ padding: "10px 12px", background: `${K.yl}10`, border: `1px solid ${K.yl}55`, borderRadius: 8, marginBottom: 12 }}>
      <div style={{ fontSize: 10, color: K.yl, textTransform: "uppercase", letterSpacing: "1.2px", fontWeight: 800, marginBottom: 4 }}>
        Tilt circuit breaker · {state.cooldownMinutes}m
      </div>
      <div style={{ fontSize: 12, color: K.tx, fontWeight: 700, marginBottom: 4 }}>{state.nextAction}</div>
      <div style={{ fontSize: 10, color: K.mt, lineHeight: 1.6 }}>
        {state.signals.map((s) => s.label).join(" · ")}
      </div>
    </div>
  );
}

function OperatorCommandRibbon({ counterfactual, journal, onShare }) {
  const hasCounterfactual = counterfactual?.hasSignal;
  const hasJournal = journal?.hasActivity;
  if (!hasCounterfactual && !hasJournal) {
    return (
      <div style={{ padding: "10px 12px", background: K.s2, border: `1px solid ${K.bd}`, borderRadius: 8, marginBottom: 12 }}>
        <div style={{ fontSize: 10, color: K.mt, textTransform: "uppercase", letterSpacing: "1.2px", fontWeight: 800, marginBottom: 4 }}>Operator Briefing</div>
        <div style={{ fontSize: 11, color: K.dm, lineHeight: 1.6 }}>Log three settled outcomes to unlock the counterfactual P&L ribbon and yesterday recap.</div>
      </div>
    );
  }
  const aiTone = counterfactual.deltaAiTop >= 0 ? K.gn : K.yl;
  const redTone = counterfactual.deltaSkipRed >= 0 ? K.gn : K.yl;
  const money = (value) => `${value >= 0 ? "+" : "-"}$${Math.abs(value).toFixed(2)}`;
  return (
    <div style={{ padding: "12px", background: `${K.ac}08`, border: `1px solid ${K.ac}30`, borderRadius: 8, marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 10, color: K.ac, textTransform: "uppercase", letterSpacing: "1.2px", fontWeight: 800, marginBottom: 4 }}>Operator Briefing</div>
          {hasJournal ? <div style={{ fontSize: 12, color: K.tx, fontWeight: 800 }}>{journal.lines[0]}</div> : null}
          {hasJournal ? <div style={{ fontSize: 10, color: K.mt, marginTop: 3 }}>{journal.lines[1]}</div> : null}
        </div>
        <button onClick={onShare} style={{ padding: "7px 10px", background: `${K.gn}12`, border: `1px solid ${K.gn}40`, borderRadius: 8, color: K.gn, fontSize: 10, fontWeight: 800, cursor: "pointer", fontFamily: font }}>
          Share briefing
        </button>
      </div>
      {hasCounterfactual ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 8 }}>
          <InsightChip label="Actual 7d" value={money(counterfactual.actual)} tone={counterfactual.actual >= 0 ? K.gn : K.rd} />
          <InsightChip label="AI #1 delta" value={money(counterfactual.deltaAiTop)} tone={aiTone} />
          <InsightChip label="Skip red delta" value={money(counterfactual.deltaSkipRed)} tone={redTone} />
        </div>
      ) : null}
    </div>
  );
}

const TONE = {
  healthy: K.gn,
  positive: K.gn,
  watch: K.yl,
  risk: K.rd,
  missing: K.ac,
  info: K.ac,
};

function InsightChip({ label, value, tone = K.ac }) {
  return (
    <div style={{ padding: "8px 10px", background: `${tone}10`, border: `1px solid ${tone}30`, borderRadius: 999 }}>
      <span style={{ fontSize: 9, color: K.mt, textTransform: "uppercase", letterSpacing: "1.1px", marginRight: 6 }}>{label}</span>
      <span style={{ fontSize: 11, color: tone, fontWeight: 700 }}>{value}</span>
    </div>
  );
}

function AdaptiveFocusCard({ title, body, badge, tone = K.ac }) {
  return (
    <div style={{ padding: "12px", background: K.s1, border: `1px solid ${tone}30`, borderRadius: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", marginBottom: 6 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: K.tx }}>{title}</div>
        {badge ? <span style={{ padding: "2px 8px", borderRadius: 999, background: `${tone}18`, color: tone, fontSize: 9, fontWeight: 800, letterSpacing: "0.8px" }}>{badge}</span> : null}
      </div>
      <div style={{ fontSize: 10, color: K.mt, lineHeight: 1.7 }}>{body}</div>
    </div>
  );
}

function OperatorAutopilotCard({ decision, topWorkflow, navigate }) {
  const hasWorkflow = Boolean(topWorkflow);
  const targetSlug = hasWorkflow ? getWorkflowActionSlug(topWorkflow) : decision.slug;
  const targetPath = String(targetSlug || "dashboard").startsWith("/") ? targetSlug : `/${targetSlug || "dashboard"}`;
  const tone = hasWorkflow ? K.gn : (TONE[decision.tone] || K.ac);
  const completionCopy = hasWorkflow
    ? "Run the workflow, then record placed, skipped, or settled so the ranking engine learns from the outcome."
    : "Complete this action, then return to the dashboard so the next recommendation can update from the new state.";

  return (
    <div style={{ padding: "12px", background: `${tone}08`, border: `1px solid ${tone}30`, borderRadius: 8, marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
        <div style={{ maxWidth: 780 }}>
          <div style={{ fontSize: 10, color: tone, textTransform: "uppercase", letterSpacing: "1.2px", marginBottom: 6, fontWeight: 800 }}>Operator Autopilot</div>
          <div style={{ fontFamily: fontD, fontSize: 18, fontWeight: 800, color: K.tx, marginBottom: 4 }}>
            {hasWorkflow ? topWorkflow.title : decision.title}
          </div>
          <div style={{ fontSize: 11, color: K.dm, lineHeight: 1.7, marginBottom: 8 }}>
            {hasWorkflow ? topWorkflow.scoreSummary || topWorkflow.summary || "Your highest-ranked workflow is ready for execution." : decision.body}
          </div>
          <div style={{ fontSize: 10, color: K.mt, lineHeight: 1.6 }}>{completionCopy}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 180 }}>
          <button
            onClick={() => navigate(targetPath)}
            style={{ padding: "9px 12px", background: tone, border: "none", borderRadius: 8, color: K.bg, fontSize: 11, fontWeight: 800, cursor: "pointer", fontFamily: font }}
          >
            {hasWorkflow ? "Open workflow →" : `${decision.cta || "Open action"} →`}
          </button>
          <button
            onClick={() => navigate(hasWorkflow ? "/edge-dashboard" : "/dashboard")}
            style={{ padding: "8px 12px", background: "transparent", border: `1px solid ${tone}35`, borderRadius: 8, color: tone, fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: font }}
          >
            {hasWorkflow ? "Record outcome →" : "Refresh plan →"}
          </button>
        </div>
      </div>
    </div>
  );
}

function PromoPassportOnboardingCard({ plan, discipline, navigate }) {
  const tone = plan.complete ? K.gn : K.ac;
  return (
    <div style={{ padding: "12px", background: `${tone}08`, border: `1px solid ${tone}30`, borderRadius: 8, marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-start", marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 10, color: tone, textTransform: "uppercase", letterSpacing: "1.2px", fontWeight: 800, marginBottom: 5 }}>Promo Passport Path</div>
          <div style={{ fontFamily: fontD, fontSize: 16, fontWeight: 800, color: K.tx }}>
            {plan.complete ? "First operating loop complete" : `Next: ${plan.next?.label || "Keep logging clean outcomes"}`}
          </div>
          <div style={{ fontSize: 10, color: K.mt, marginTop: 4 }}>
            Discipline {discipline.score} · {plan.doneCount}/{plan.totalCount} proof steps complete
          </div>
        </div>
        <button
          onClick={() => navigate(plan.next?.slug || "/dashboard")}
          style={{ padding: "8px 12px", background: tone, border: "none", borderRadius: 8, color: K.bg, fontSize: 11, fontWeight: 800, cursor: "pointer", fontFamily: font }}
        >
          {plan.complete ? "Review dashboard" : "Open next step"} →
        </button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 6 }}>
        {plan.steps.map((step) => (
          <div key={step.id} style={{ padding: "7px 8px", borderRadius: 8, background: step.done ? `${K.gn}12` : K.s1, border: `1px solid ${step.done ? K.gn : K.bd}30`, fontSize: 10, color: step.done ? K.gn : K.mt, fontWeight: 700 }}>
            {step.done ? "Done" : "Next"} · {step.label}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function TodayDashboardPanel({ snapshot, navigate, appData = {}, isProActive = false, syncDiagnostics = {}, usageLog = {} }) {
  const posture = getBankrollPosture(snapshot);
  const unfinished = getUnfinishedWork(snapshot);
  const onboarding = getOnboardingProgress({ appData, isProActive });
  const tone = TONE[posture.tone] || K.ac;
  const recentTone = snapshot.recentSettledProfit >= 0 ? K.gn : K.rd;
  const adaptivePlan = snapshot.adaptivePlan || {};
  const rankingSnapshot = snapshot.adaptiveRankingSnapshot || {};
  const calibration = adaptivePlan.calibration || snapshot.trackInsights?.selfCalibration || {};
  const toast = useToast();
  const { syncAppData, user } = React.useContext(AppDataCtx) || {};
  const counterfactual = React.useMemo(() => buildCounterfactualPnL(appData), [appData]);
  const journal = React.useMemo(() => buildDecisionJournal(appData), [appData]);
  const discipline = React.useMemo(() => computeDisciplineScore(appData), [appData]);
  const riskRadar = React.useMemo(() => buildRiskRadarSummary(appData, snapshot), [appData, snapshot]);
  const passportPlan = React.useMemo(() => getPromoPassportOnboardingPlan({
    appData,
    user,
    disciplineScore: discipline.score,
    trustReceipts: readTrustReceipts(),
  }), [appData, discipline.score, user]);
  const shareBriefing = React.useCallback(() => {
    try {
      const card = buildShareCardData({
        disciplineScore: discipline.score,
        topLane: adaptivePlan.topLane?.key,
        edgeDelta14d: journal.stats?.edgeDelta || 0,
        headline: journal.lines?.[0] || counterfactual.summary,
      });
      assertShareCardPiiSafe(card);
      const canvas = renderShareCardCanvas(card);
      if (canvas?.toBlob && navigator?.clipboard?.write && typeof ClipboardItem !== "undefined") {
        canvas.toBlob(async (blob) => {
          if (!blob) return;
          try {
            await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
            if (toast) toast("Briefing card copied.", K.gn);
          } catch {
            if (toast) toast("Briefing card ready; clipboard image copy is unavailable in this browser.", K.yl);
          }
        });
      } else if (toast) {
        toast("Briefing card needs a browser canvas.", K.yl);
      }
    } catch {
      if (toast) toast("Briefing card could not be generated.", K.rd);
    }
  }, [adaptivePlan.topLane?.key, counterfactual.summary, discipline.score, journal.lines, journal.stats?.edgeDelta, toast]);
  const playbookResults = React.useMemo(
    () => snapshot?.topPlaybook
      ? { top: [snapshot.topPlaybook], matches: [snapshot.topPlaybook] }
      : matchPlaybooks(appData, { bankroll: snapshot?.bankroll }),
    [snapshot?.topPlaybook, appData, snapshot?.bankroll],
  );
  const nextAction = React.useMemo(() => getNextBestAction({
    usageLog,
    bankroll: snapshot?.bankroll ?? "",
    totalProfit: snapshot?.totalProfit || 0,
    openBets: snapshot?.openBets || [],
    booksComplete: snapshot?.booksComplete || 0,
    openWorkflowCount: snapshot?.openWorkflowCount || 0,
    topWorkflow: snapshot?.topWorkflow || null,
    userState: appData?.userState || "",
    done: appData?.done || {},
    bookStatus: appData?.bookStatus || {},
    recommendedBooks: snapshot?.recommendedBooks || [],
    topPlaybook: snapshot?.topPlaybook || null,
  }), [usageLog, snapshot, appData]);

  const queuePlaybook = (playbook) => {
    if (!syncAppData) return;
    const steps = playbookToWorkflows(playbook, {});
    syncAppData(appendWorkflows(appData || {}, steps));
    if (toast) toast(`Queued ${steps.length} playbook steps: ${playbook.name}`, K.gn);
  };

  return (
    <div style={{ ...S.card, border: `1px solid ${K.ac}35`, marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 11, color: K.ac, fontWeight: 700, letterSpacing: "1.4px", textTransform: "uppercase", marginBottom: 5 }}>
            Today Dashboard
          </div>
          <div style={{ fontFamily: fontD, fontSize: 18, fontWeight: 800, color: K.tx, marginBottom: 4 }}>
            What needs attention right now
          </div>
          <div style={{ fontSize: 12, color: K.dm, lineHeight: 1.6, maxWidth: 760 }}>
            Focus on expiring promos, unfinished work, bankroll posture, and recent settled profit before adding more volume.
          </div>
        </div>
        <div style={{ padding: "10px 12px", background: K.s2, border: `1px solid ${K.bd}`, borderRadius: 8, minWidth: 150 }}>
          <div style={{ fontSize: 9, color: K.mt, textTransform: "uppercase", letterSpacing: "1.2px" }}>Recent Settled Profit</div>
          <div style={{ fontFamily: fontD, fontSize: 24, fontWeight: 800, color: recentTone }}>
            {snapshot.recentSettledProfit >= 0 ? "+" : "-"}${f(Math.abs(snapshot.recentSettledProfit))}
          </div>
          <div style={{ fontSize: 10, color: K.mt }}>
            Last 7 days · {snapshot.recentSettledCount} entr{snapshot.recentSettledCount === 1 ? "y" : "ies"}
          </div>
        </div>
      </div>

      <TiltBreakerBanner state={computeTiltState(appData)} />
      <OperatorTwinCard forecast={buildTwinForecast(appData)} />
      <RiskRadarCard radar={riskRadar} navigate={navigate} />
      <OperatorCommandRibbon counterfactual={counterfactual} journal={journal} onShare={shareBriefing} />

      <OperatorAutopilotCard decision={nextAction} topWorkflow={snapshot.topWorkflow} navigate={navigate} />

      <PromoPassportOnboardingCard plan={passportPlan} discipline={discipline} navigate={navigate} />

      <PromoExpiryWidget />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10, marginBottom: 12 }}>
        <div style={{ padding: "12px", background: K.s2, border: `1px solid ${onboarding.doneCount === onboarding.totalCount ? K.gn : K.ac}35`, borderRadius: 8 }}>
          <div style={{ fontSize: 10, color: K.mt, textTransform: "uppercase", letterSpacing: "1.2px", marginBottom: 8 }}>Onboarding</div>
          <div style={{ fontFamily: fontD, fontSize: 24, fontWeight: 800, color: onboarding.doneCount === onboarding.totalCount ? K.gn : K.ac, marginBottom: 6 }}>
            {onboarding.doneCount}/{onboarding.totalCount}
          </div>
          <div style={{ height: 6, background: K.s1, borderRadius: 999, overflow: "hidden", marginBottom: 10 }}>
            <div style={{ width: `${onboarding.pct}%`, height: "100%", background: onboarding.doneCount === onboarding.totalCount ? K.gn : K.ac, borderRadius: 999 }} />
          </div>
          <div style={{ fontSize: 11, color: K.dm, lineHeight: 1.6, marginBottom: 10 }}>
            {onboarding.remaining[0]
              ? `Next: ${onboarding.remaining[0].label}.`
              : "Core launch setup is complete for this account."}
          </div>
          <button onClick={() => navigate("/get-started")} style={{ padding: "6px 12px", background: "transparent", border: `1px solid ${K.bd2}`, borderRadius: 6, color: K.ac, fontSize: 11, cursor: "pointer", fontFamily: font }}>
            Open setup guide →
          </button>
        </div>

        <div style={{ padding: "12px", background: K.s2, border: `1px solid ${snapshot.expiringBooks.length ? K.yl : K.bd}`, borderRadius: 8 }}>
          <div style={{ fontSize: 10, color: K.mt, textTransform: "uppercase", letterSpacing: "1.2px", marginBottom: 8 }}>Expiring Promos</div>
          {snapshot.expiringBooks.length ? (
            <>
              <div style={{ fontFamily: fontD, fontSize: 24, fontWeight: 800, color: K.yl, marginBottom: 6 }}>{snapshot.expiringBooks.length}</div>
              <div style={{ fontSize: 11, color: K.dm, lineHeight: 1.6, marginBottom: 10 }}>
                {snapshot.expiringBooks.map((book) => `${book.name} (${book.bonus})`).join(", ")}
              </div>
              <button onClick={() => navigate("/sportsbooks")} style={{ padding: "6px 12px", background: "transparent", border: `1px solid ${K.bd2}`, borderRadius: 6, color: K.ac, fontSize: 11, cursor: "pointer", fontFamily: font }}>
                Review books →
              </button>
            </>
          ) : (
            <div style={{ fontSize: 11, color: K.gn, lineHeight: 1.6 }}>No tracked welcome offers are expiring in the next 72 hours.</div>
          )}
        </div>

        <div style={{ padding: "12px", background: K.s2, border: `1px solid ${tone}35`, borderRadius: 8 }}>
          <div style={{ fontSize: 10, color: K.mt, textTransform: "uppercase", letterSpacing: "1.2px", marginBottom: 8 }}>Bankroll Posture</div>
          <div style={{ fontFamily: fontD, fontSize: 18, fontWeight: 800, color: tone, marginBottom: 6 }}>{posture.title}</div>
          <div style={{ fontSize: 11, color: K.dm, lineHeight: 1.6 }}>{posture.body}</div>
        </div>

        <div style={{ padding: "12px", background: K.s2, border: `1px solid ${K.bd}`, borderRadius: 8 }}>
          <div style={{ fontSize: 10, color: K.mt, textTransform: "uppercase", letterSpacing: "1.2px", marginBottom: 8 }}>Today&apos;s Promo Volume</div>
          <div style={{ fontFamily: fontD, fontSize: 24, fontWeight: 800, color: K.gn, marginBottom: 6 }}>{snapshot.todayPromos.length}</div>
          <div style={{ fontSize: 11, color: K.dm, lineHeight: 1.6, marginBottom: 10 }}>
            {snapshot.todayPromos.length ? "Recurring promos match today’s schedule." : "No recurring promos matched today’s schedule."}
          </div>
          <button onClick={() => navigate("/promo-calendar")} style={{ padding: "6px 12px", background: "transparent", border: `1px solid ${K.bd2}`, borderRadius: 6, color: K.ac, fontSize: 11, cursor: "pointer", fontFamily: font }}>
            Open promo calendar →
          </button>
        </div>
      </div>

      <div style={{ padding: "12px", background: K.s2, border: `1px solid ${tone}35`, borderRadius: 8, marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 10, color: tone, textTransform: "uppercase", letterSpacing: "1.2px", marginBottom: 6 }}>
              Mission Control
            </div>
            <div style={{ fontFamily: fontD, fontSize: 18, fontWeight: 800, color: K.tx, marginBottom: 4 }}>
              {adaptivePlan.headline || "Build today’s operating edge"}
            </div>
            <div style={{ fontSize: 11, color: K.dm, lineHeight: 1.7, maxWidth: 760 }}>
              {adaptivePlan.detail || "Convert the highest-value promos, settle active workflows, and feed outcomes back into the system."}
            </div>
          </div>
          <div style={{ padding: "10px 12px", background: K.s1, border: `1px solid ${K.bd}`, borderRadius: 8, minWidth: 170 }}>
            <div style={{ fontSize: 9, color: K.mt, textTransform: "uppercase", letterSpacing: "1.2px" }}>Operating Mode</div>
            <div style={{ fontFamily: fontD, fontSize: 20, fontWeight: 800, color: tone, textTransform: "capitalize" }}>
              {adaptivePlan.mode || "build"}
            </div>
            <div style={{ fontSize: 10, color: K.mt }}>
              Queue pressure {adaptivePlan.workflowBacklog || 0} · feedback coverage {Math.round(adaptivePlan.feedbackCoverage || 0)}%
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <InsightChip label="Calibration" value={calibration.averageDrift == null ? "No settled baseline" : `${calibration.averageDrift >= 0 ? "+" : ""}$${calibration.averageDrift.toFixed(2)}/settled`} tone={calibration.averageDrift == null ? K.ac : calibration.averageDrift >= 0 ? K.gn : K.yl} />
          <InsightChip label="Accuracy" value={calibration.accuracyRate == null ? "No sample" : `${Math.round(calibration.accuracyRate)}%`} tone={calibration.accuracyRate >= 75 ? K.gn : calibration.accuracyRate >= 55 ? K.ac : K.yl} />
          <InsightChip label="Execution" value={calibration.averageExecutionMinutes == null ? "Not tracked" : `~${Math.round(calibration.averageExecutionMinutes)}m`} tone={K.ac} />
          <InsightChip label="Repeat Rate" value={calibration.repeatRate == null ? "No vote" : `${Math.round(calibration.repeatRate)}%`} tone={calibration.repeatRate >= 65 ? K.gn : calibration.repeatRate >= 40 ? K.ac : K.yl} />
          <InsightChip label="Rank Signals" value={`${rankingSnapshot.rankedCount || 0} ranked · ${Object.keys(rankingSnapshot.reasonCounts || {}).length} reasons`} tone={K.ac} />
        </div>
      </div>

      <div style={{ padding: "12px", background: K.s2, border: `1px solid ${K.bd}`, borderRadius: 8 }}>
        <div style={{ fontSize: 10, color: K.mt, textTransform: "uppercase", letterSpacing: "1.2px", marginBottom: 8 }}>Unfinished Work</div>
        {unfinished.length ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 8 }}>
            {unfinished.map((item) => (
              <button
                key={item.key}
                onClick={() => navigate(`/${item.slug}`)}
                style={{ textAlign: "left", padding: "10px 12px", background: K.s1, border: `1px solid ${K.bd}`, borderRadius: 8, cursor: "pointer", fontFamily: font }}
              >
                <div style={{ fontSize: 12, fontWeight: 700, color: K.tx, marginBottom: 4 }}>{item.title}</div>
                <div style={{ fontSize: 10, color: K.mt, lineHeight: 1.6 }}>{item.detail}</div>
              </button>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: 11, color: K.gn }}>No urgent unfinished work is surfaced from your current tracker and ledger state.</div>
        )}
      </div>

      <div style={{ marginTop: 12, padding: "12px", background: K.s2, border: `1px solid ${K.bd}`, borderRadius: 8 }}>
        <div style={{ fontSize: 10, color: K.mt, textTransform: "uppercase", letterSpacing: "1.2px", marginBottom: 8 }}>Adaptive Edge</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 8, marginBottom: adaptivePlan.topPromos?.length ? 10 : 0 }}>
          <AdaptiveFocusCard
            title={adaptivePlan.topLane ? `${adaptivePlan.topLane.label} is converting` : "No strong winning lane yet"}
            body={adaptivePlan.topLane
              ? `${adaptivePlan.topLane.settled} settled workflows · ${Math.round(adaptivePlan.topLane.hitRate || 0)}% hit rate · ${adaptivePlan.topLane.averageExecutionMinutes ? `~${Math.round(adaptivePlan.topLane.averageExecutionMinutes)}m to execute.` : "Keep settling results to sharpen the model."}`
              : "You need more settled outcomes before PromoGrind can identify your best lane with confidence."}
            badge={adaptivePlan.topLane ? "PRESS" : "LEARN"}
            tone={adaptivePlan.topLane ? K.gn : K.ac}
          />
          <AdaptiveFocusCard
            title={adaptivePlan.coldLane ? `${adaptivePlan.coldLane.label} needs caution` : "No cold lane surfaced"}
            body={adaptivePlan.coldLane
              ? adaptivePlan.coldLane.summary
              : "No major negative drift alert is currently strong enough to down-rank a lane or book."}
            badge={adaptivePlan.coldLane ? "PROTECT" : "CLEAR"}
            tone={adaptivePlan.coldLane ? K.yl : K.gn}
          />
          <AdaptiveFocusCard
            title={adaptivePlan.hotBookLane ? `${adaptivePlan.hotBookLane.label} is active` : "No hot-book cluster yet"}
            body={adaptivePlan.hotBookLane
              ? `${adaptivePlan.hotBookLane.badge} · ${snapshot.hotLanes?.hotBooks?.length || 1} book cluster(s) feeding recent wins.`
              : calibration.label || "Keep logging real outcomes so PromoGrind can detect which books are actually paying off for you."}
            badge={adaptivePlan.hotBookLane ? "ATTACK" : "CALIBRATE"}
            tone={adaptivePlan.hotBookLane ? K.ac : K.ac}
          />
        </div>
        {adaptivePlan.topPromos?.length ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 8 }}>
            {adaptivePlan.topPromos.slice(0, 3).map((promo) => (
              <button
                key={`${promo.book}-${promo.promo}`}
                onClick={() => navigate("/promo-calendar")}
                style={{ textAlign: "left", padding: "10px 12px", background: K.s1, border: `1px solid ${K.bd}`, borderRadius: 8, cursor: "pointer", fontFamily: font }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 4, alignItems: "baseline" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: K.tx }}>{promo.book}</div>
                  <div style={{ fontSize: 10, color: promo.score >= 5 ? K.gn : promo.score >= 3 ? K.ac : K.yl, fontWeight: 800 }}>
                    score {promo.score}
                  </div>
                </div>
                <div style={{ fontSize: 10, color: K.dm, lineHeight: 1.6, marginBottom: 6 }}>{promo.promo}</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {promo.reasons.length
                    ? promo.reasons.slice(0, 2).map((reason) => (
                        <span key={reason} style={{ padding: "2px 8px", borderRadius: 999, background: `${reason.includes("cold") || reason.includes("limit") ? K.yl : K.gn}15`, border: `1px solid ${(reason.includes("cold") || reason.includes("limit") ? K.yl : K.gn)}35`, fontSize: 9, color: reason.includes("cold") || reason.includes("limit") ? K.yl : K.gn, fontWeight: 700 }}>
                          {reason}
                        </span>
                      ))
                    : <span style={{ fontSize: 9, color: K.mt }}>baseline ranked</span>}
                </div>
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {playbookResults.top.length > 0 && (
        <div style={{ marginTop: 12, padding: "12px", background: K.s2, border: `1px solid ${K.bd}`, borderRadius: 8 }}>
          <div style={{ fontSize: 10, color: K.mt, textTransform: "uppercase", letterSpacing: "1.2px", marginBottom: 8 }}>Matching Playbooks</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 8 }}>
            {playbookResults.top.map(({ playbook, fitScore, reasons }) => (
              <div key={playbook.id} style={{ padding: "10px 12px", background: K.s1, border: `1px solid ${K.bd}`, borderRadius: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: K.tx }}>{playbook.name}</div>
                  <div style={{ fontSize: 10, color: K.ac, fontFamily: fontD, fontWeight: 700 }}>{fitScore}</div>
                </div>
                <div style={{ fontSize: 10, color: K.mt, lineHeight: 1.6, marginBottom: 6 }}>{playbook.summary}</div>
                <div style={{ fontSize: 10, color: K.dm, marginBottom: 8 }}>{reasons.slice(0, 2).map((r) => r.text).join(" · ")}</div>
                <button
                  onClick={() => queuePlaybook(playbook)}
                  disabled={!syncAppData}
                  style={{ padding: "6px 10px", background: K.gn, border: "none", borderRadius: 6, color: K.bg, fontWeight: 700, fontSize: 11, cursor: syncAppData ? "pointer" : "default", fontFamily: font }}
                >
                  Queue {playbook.steps.length} steps →
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <ObservabilityPanel appData={appData} snapshot={snapshot} syncDiagnostics={syncDiagnostics} usageLog={usageLog} />

      <div style={{ marginTop: 12 }}>
        <WorkflowInboxPanel appData={appData} navigate={navigate} bankroll={snapshot.bankroll ?? ""} />
      </div>
    </div>
  );
}
